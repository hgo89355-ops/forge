"""
Halalbot paper trader. Run once a day after the US close and the crypto daily close
(00:30 UK time). Every run:
  1. downloads fresh daily candles (yfinance) and drops any unfinished candle,
  2. rebuilds every strategy signal exactly as the backtest does,
  3. replays the paper account from PAPER_START with the backtest's money rules
     (70/30 buckets, monthly move of main-bucket profit, 50% cap, 1% / 3% risk, no borrowing,
     -3% day pause, one trade per market, fresh setups only),
  4. applies the learn-from-mistakes rule (strategy_status.json),
  5. writes the report files into paper/ for both setups.
Nothing here places real orders.
"""
import json, os, sys, warnings, datetime as dt
warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import numpy as np, pandas as pd

from halalbot import config, engines, live_signals as L
from halalbot.portfolio import RiskRules, simulate

PAPER_START = pd.Timestamp(os.environ.get("PAPER_START", "2026-10-26"))
START_CASH = 10_000.0
OUT = os.environ.get("PAPER_OUT", os.path.join(HERE, "paper"))
STATUS_FILE = os.path.join(OUT, "strategy_status.json")
TEN_R = {"Crypto trend", "Dip after bull flag", "Bull flag", "52-week high", "Turtle breakout",
         "Squeeze breakout", "Pullback in trend", "Breakout-retest", "PB tech", "PB rest", "TU fin", "TU rest"}
TECH = set("AAPL MSFT NVDA GOOGL GOOG META AVGO ADBE CRM AMD INTC CSCO ORCL IBM QCOM TXN ADI AMAT LRCX KLAC MU SNPS CDNS INTU NOW".split())
FIN = set("BRK-B JPM V MA BAC WFC C GS MS BLK".split())


# ----------------------------------------------------------------------------- data
def download(cache_dir):
    import yfinance as yf
    os.makedirs(cache_dir, exist_ok=True)
    syms = config.STOCKS + config.ETFS + config.FUTURES + config.CRYPTO
    today = pd.Timestamp.utcnow().tz_localize(None).normalize()
    data, bad = {}, []
    for s in syms:
        d = None
        for _ in range(3):
            try:
                d = yf.download(s, start="2015-01-01", interval="1d", progress=False, auto_adjust=True)
                if len(d): break
            except Exception:
                d = None
        if d is None or not len(d):
            bad.append(s); continue
        if isinstance(d.columns, pd.MultiIndex): d.columns = d.columns.get_level_values(0)
        d.columns = [c.lower() for c in d.columns]
        d.index = pd.to_datetime(d.index).tz_localize(None).normalize()
        d = d[d.index < today]                       # drop today's unfinished candle
        d = d[["open", "high", "low", "close", "volume"]].dropna()
        d = d[~d.index.duplicated()].sort_index()
        if len(d) > 300:
            data[s] = d
    return data, bad


def add_next_bar(raw):
    """Append a placeholder candle for the next session so signals from the last close become
    orders for the next open (priced at the last close until the real open is known)."""
    out = {}
    for s, d in raw.items():
        last = d.index[-1]
        nxt = last + pd.Timedelta(days=1)
        if not s.endswith("-USD"):
            while nxt.weekday() >= 5: nxt += pd.Timedelta(days=1)
        c = d["close"].iat[-1]
        row = pd.DataFrame({"open": [c], "high": [c], "low": [c], "close": [c], "volume": [d["volume"].iat[-1]]}, index=[nxt])
        out[s] = engines.prepare(pd.concat([d, row]))
    return out


# ----------------------------------------------------------------------------- strategies
def strategy_sets(P):
    core10 = [k for k in L.CORE_ORDER if k != "Crypto trend"]
    P = dict(P)
    P["PB tech"] = [dict(t, engine="PB tech") for t in P["Pullback in trend"] if t["symbol"] in TECH]
    P["PB rest"] = [dict(t, engine="PB rest") for t in P["Pullback in trend"] if t["symbol"] not in TECH]
    P["TU fin"] = [dict(t, engine="TU fin") for t in P["Turtle breakout"] if t["symbol"] in FIN]
    P["TU rest"] = [dict(t, engine="TU rest") for t in P["Turtle breakout"] if t["symbol"] not in FIN]
    xk = [k for k in P if k.startswith("X ") and k not in ("X Engulfing tech", "X Hammer tech")]
    tilt = [k for k in core10 if k not in ("Pullback in trend", "Turtle breakout")] + ["PB tech", "PB rest", "TU fin", "TU rest"]
    tilt_risk = {"PB tech": 1.5, "TU fin": 1.5, "X Engulfing tech": 1.5, "X Hammer tech": 1.5}
    setups = {
        "main": dict(keys=core10, prio={}, risk={}),
        "setup5": dict(keys=tilt + ["X Engulfing tech", "X Hammer tech"] + xk,
                       prio={k: -1 for k in xk}, risk=dict(tilt_risk, **{k: 0.5 for k in xk})),
    }
    return P, setups


# ----------------------------------------------------------------------------- learn from mistakes
def reference_stats(P, data):
    """Backtest expectation per strategy, 2018 onwards, in R after 0.2% round-trip cost."""
    ref = {}
    for k, tr in P.items():
        R = [(t["ret"] - 0.002) / max(t["risk_pct"], 1e-6) for t in tr
             if pd.Timestamp("2018-01-01") <= t["entry_date"] < PAPER_START and t["reason"] != "end_of_data"]
        if len(R) >= 20:
            ref[k] = dict(mean=float(np.mean(R)), std=float(np.std(R)), n=len(R))
    return ref


def load_status():
    if os.path.exists(STATUS_FILE):
        return json.load(open(STATUS_FILE))
    return {}


def apply_status(trades, status, setup):
    """Trades entered after a strategy was cut get half size; after a pause they are dropped."""
    st = status.get(setup, {})
    out = []
    for t in trades:
        s = st.get(t["engine"])
        if s:
            if s.get("paused_on") and t["entry_date"] >= pd.Timestamp(s["paused_on"]):
                continue
            if s.get("halved_on") and t["entry_date"] >= pd.Timestamp(s["halved_on"]):
                t = dict(t, size_mult=0.5 * float(t.get("size_mult", 1.0) or 1.0))
        out.append(t)
    return out


def review(closed, ref, status, setup, today):
    """Every block of 30 closed paper trades (60 for the low-win-rate 10R strategies) compare the
    strategy's average with its backtest. Far below (more than 2 standard errors) -> halve its risk;
    still far below after the next block -> pause it. A paused strategy only comes back after a
    fresh re-test on new data passes (done by hand in the quarterly re-test)."""
    st = status.setdefault(setup, {})
    notes = []
    if closed is None or not len(closed):
        return notes
    for eng, g in closed.groupby("engine"):
        if eng not in ref: continue
        block = 60 if eng in TEN_R else 30
        s = st.setdefault(eng, {"reviewed": 0})
        n = len(g)
        while n >= s["reviewed"] + block:
            lo, hi = s["reviewed"], s["reviewed"] + block
            r = g.sort_values("exit_date")["r_multiple"].iloc[lo:hi].mean()
            limit = ref[eng]["mean"] - 2 * ref[eng]["std"] / np.sqrt(block)
            s["reviewed"] = hi
            if r < limit:
                if s.get("halved_on") and not s.get("paused_on"):
                    s["paused_on"] = today; notes.append(f"{eng}: still far below its backtest after {hi} trades, PAUSED")
                elif not s.get("halved_on"):
                    s["halved_on"] = today; notes.append(f"{eng}: far below its backtest after {hi} trades, risk HALVED")
            else:
                notes.append(f"{eng}: {hi} trades checked, within the normal range")
    return notes


# ----------------------------------------------------------------------------- account replay
def run_bucket(trades, data, risk, slots, max_open_risk, max_pos_pct, prio, eng_risk):
    r = RiskRules(capital=10_000, risk_per_trade=risk, max_positions=slots, max_open_risk=max_open_risk,
                  max_gross=1.0, max_pos_pct=max_pos_pct, engine_priority=prio, engine_risk=eng_risk,
                  stock_slip_bps=10, crypto_slip_bps=10, crypto_fee_bps=5, dd_kill=1.01)
    tr = []
    for t in trades:
        if t["entry_date"] < PAPER_START: continue
        if t["reason"] == "end_of_data":              # still open: keep it open, don't close at the last candle
            t = dict(t, exit_date=pd.Timestamp("2100-01-01"))
        tr.append(t)
    if not tr:
        idx = pd.DatetimeIndex(sorted(set().union(*[set(d.index) for d in data.values()])))
        idx = idx[idx >= PAPER_START]
        return dict(equity=pd.Series(10_000.0, index=idx), gross=pd.Series(0.0, index=idx), open_positions=[], taken=pd.DataFrame())
    return simulate(tr, data, r, PAPER_START, None)


def combine(main, crypto):
    """Daily account value with the monthly move and the 50% cap (same rules as the backtest)."""
    rm = main["equity"].pct_change().fillna(main["equity"].iloc[0] / 10_000 - 1)
    rc = crypto["equity"].pct_change().fillna(crypto["equity"].iloc[0] / 10_000 - 1)
    idx = rm.index.union(rc.index)
    rm, rc = rm.reindex(idx).fillna(0), rc.reindex(idx).fillna(0)
    core, sat, base, cur, rows = 0.7 * START_CASH, 0.3 * START_CASH, 0.7 * START_CASH, None, []
    for d in idx:
        if cur is not None and d.month != cur:
            if core > base: sat += core - base; core = base
            tot = core + sat
            if sat > 0.5 * tot: core += sat - 0.5 * tot; sat = 0.5 * tot; base = core
        cur = d.month
        core *= 1 + rm[d]; sat *= 1 + rc[d]
        rows.append((d, core, sat, core + sat))
    return pd.DataFrame(rows, columns=["date", "main_bucket", "high_reward_bucket", "account"]).set_index("date")


def positions_table(sim, data, scale):
    rows = []
    for p in sim["open_positions"]:
        r = p["row"]; d = data[p["sym"]]
        px = d["close"].iat[-2]                       # last finished candle
        is_order = r["entry_date"] >= d.index[-1]     # enters at the next open
        stop = r["stop"]
        tp = r["entry_px"] + 10 * (r["entry_px"] - stop) if r["engine"] in TEN_R else None
        rows.append(dict(symbol=p["sym"], strategy=r["engine"], status="BUY AT NEXT OPEN" if is_order else "open",
                         entry_date=r["entry_date"].date(), entry_price=round(p["entry_fill"], 4),
                         quantity=round(p["qty"] * scale, 6), value_usd=round(p["qty"] * scale * px, 2),
                         stop_loss=round(stop, 4), take_profit=round(tp, 4) if tp else None, last_price=round(px, 4),
                         unrealised_pnl_usd=0.0 if is_order else round(p["qty"] * scale * (px - p["entry_fill"]), 2),
                         risk_usd=round(p["qty"] * scale * (p["entry_fill"] - stop), 2)))
    t = sim["taken"]                                   # positions the rules sell at the next open
    if t is not None and len(t):
        for _, r in t.iterrows():
            if r["exit_date"] >= data[r["symbol"]].index[-1]:
                rows.append(dict(symbol=r["symbol"], strategy=r["engine"], status="SELL AT NEXT OPEN", entry_date=r["entry_date"].date(),
                                 quantity=round(r["qty"] * scale, 6), last_price=round(data[r["symbol"]]["close"].iat[-2], 4)))
    return pd.DataFrame(rows)


def closed_table(sim, data, scale):
    t = sim["taken"]
    if t is None or not len(t): return pd.DataFrame()
    t = t[[r["exit_date"] < data[r["symbol"]].index[-1] for _, r in t.iterrows()]].copy()
    if not len(t): return t
    t["pnl_usd"] = (t["pnl"] * scale).round(2)
    left = []
    for _, r in t.iterrows():                        # money left on the table: best price while held vs exit
        d = data[r["symbol"]].loc[r["entry_date"]:r["exit_date"]]
        left.append(max(0.0, d["high"].max() - d["close"].iat[-1]) * r["qty"] * scale if len(d) else 0.0)
    t["left_on_table_usd"] = np.round(left, 2)
    return t[["symbol", "engine", "entry_date", "exit_date", "reason", "pnl_usd", "r_multiple", "left_on_table_usd"]]


def day_detail(pos, closed, cl_today, last_day):
    """Everything that happened on the last market day, for the daily log."""
    ld = last_day.date()
    bought = []
    if len(pos):
        for _, p in pos[(pos["status"] == "open") & (pd.to_datetime(pos["entry_date"]).dt.date == ld)].iterrows():
            bought.append(dict(symbol=p["symbol"], strategy=p["strategy"], price=p["entry_price"], value_usd=p["value_usd"]))
    if len(closed):
        for _, c in closed[pd.to_datetime(closed["entry_date"]).dt.date == ld].iterrows():
            bought.append(dict(symbol=c["symbol"], strategy=c["engine"], price=None, value_usd=None))
    sold = [dict(symbol=c["symbol"], strategy=c["engine"], reason=c["reason"], pnl_usd=float(c["pnl_usd"]),
                 left_on_table_usd=float(c["left_on_table_usd"])) for _, c in cl_today.iterrows()] if len(cl_today) else []
    return dict(date=str(ld), bought=bought, sold=sold,
                profit_from_winners=round(sum(s["pnl_usd"] for s in sold if s["pnl_usd"] > 0), 2),
                loss_from_losers=round(sum(s["pnl_usd"] for s in sold if s["pnl_usd"] <= 0), 2),
                left_on_table=round(sum(s["left_on_table_usd"] for s in sold), 2))


def main():
    os.makedirs(OUT, exist_ok=True)
    raw, bad = download(os.path.join(HERE, ".cache"))
    last_real = max(d.index[-1] for s, d in raw.items() if not s.endswith("-USD"))
    last_crypto = max(d.index[-1] for s, d in raw.items() if s.endswith("-USD"))
    data = add_next_bar(raw)
    P = L.build(data, extras=True)
    P, setups = strategy_sets(P)
    ref = reference_stats(P, data)
    status = load_status()
    today = str(dt.date.today())
    summary = dict(run_time_utc=dt.datetime.utcnow().strftime("%Y-%m-%d %H:%M"), paper_start=str(PAPER_START.date()),
                   last_stock_candle=str(last_real.date()), last_crypto_candle=str(last_crypto.date()),
                   markets_missing=bad, setups={})
    for name, cfg in setups.items():
        core_tr = apply_status([t for k in cfg["keys"] for t in P[k]], status, name)
        cr_tr = apply_status(list(P["Crypto trend"]), status, name)
        m = run_bucket(core_tr, data, 0.01, 30, 0.30, 0.10, cfg["prio"], cfg["risk"])
        c = run_bucket(cr_tr, data, 0.03, 5, 0.15, 1.0, {}, {})
        acct = combine(m, c)
        real = acct[acct.index <= max(last_real, last_crypto)]
        if not len(real):
            real = pd.DataFrame([[0.7 * START_CASH, 0.3 * START_CASH, START_CASH]], index=[PAPER_START - pd.Timedelta(days=1)], columns=acct.columns)
        sm = real["main_bucket"].iat[-1] / m["equity"].reindex(real.index).ffill().fillna(10_000).iat[-1]
        sc = real["high_reward_bucket"].iat[-1] / c["equity"].reindex(real.index).ffill().fillna(10_000).iat[-1]
        pos = pd.concat([positions_table(m, data, sm), positions_table(c, data, sc)], ignore_index=True)
        closed = pd.concat([closed_table(m, data, sm), closed_table(c, data, sc)], ignore_index=True)
        notes = review(closed, ref, status, name, today)
        sd = os.path.join(OUT, name); os.makedirs(sd, exist_ok=True)
        real.round(2).to_csv(os.path.join(sd, "account_value.csv"))
        pos.to_csv(os.path.join(sd, "positions_and_orders.csv"), index=False)
        closed.to_csv(os.path.join(sd, "closed_trades.csv"), index=False)
        val = float(real["account"].iat[-1]); prev = float(real["account"].iat[-2]) if len(real) > 1 else START_CASH
        last_day = real.index[-1]
        cl_today = closed[pd.to_datetime(closed["exit_date"]) == last_day] if len(closed) else closed
        summary["setups"][name] = dict(
            account_value=round(val, 2), total_profit=round(val - START_CASH, 2), total_return_pct=round(100 * (val / START_CASH - 1), 2),
            last_day=str(last_day.date()), last_day_pnl=round(val - prev, 2),
            main_bucket=round(float(real["main_bucket"].iat[-1]), 2), high_reward_bucket=round(float(real["high_reward_bucket"].iat[-1]), 2),
            worst_drop_pct=round(100 * float((real["account"] / real["account"].cummax() - 1).min()), 2),
            open_trades=int((pos["status"] == "open").sum()) if len(pos) else 0,
            orders_next_open=pos[pos["status"] != "open"][["status", "symbol", "strategy", "quantity", "stop_loss", "take_profit"]].fillna("").to_dict("records") if len(pos) else [],
            closed_trades_total=int(len(closed)), wins=int((closed["pnl_usd"] > 0).sum()) if len(closed) else 0,
            closed_last_day=cl_today[["symbol", "engine", "reason", "pnl_usd"]].to_dict("records") if len(cl_today) else [],
            left_on_table_total=round(float(closed["left_on_table_usd"].sum()), 2) if len(closed) else 0.0,
            learn_from_mistakes=notes,
            day=day_detail(pos, closed, cl_today, last_day))
    json.dump(status, open(STATUS_FILE, "w"), indent=1, default=str)
    json.dump(summary, open(os.path.join(OUT, "latest.json"), "w"), indent=1, default=str)
    write_report(summary)
    print(open(os.path.join(OUT, "latest_report.md")).read())


def write_report(s):
    L_ = [f"# Paper trading report — {s['run_time_utc']} UTC", "",
          f"Paper start: {s['paper_start']} with $10,000 per setup. Last stock candle: {s['last_stock_candle']}, last crypto candle: {s['last_crypto_candle']}.", ""]
    if s["markets_missing"]: L_ += [f"Markets that failed to download: {', '.join(s['markets_missing'])}", ""]
    for name, v in s["setups"].items():
        L_ += [f"## {'Main setup' if name == 'main' else 'Setup 5 (comparison)'}", "",
               f"- Account: ${v['account_value']:,.2f} ({v['total_return_pct']:+.2f}% since start)",
               f"- Last day ({v['last_day']}): {v['last_day_pnl']:+,.2f} USD",
               f"- Main bucket ${v['main_bucket']:,.2f}, high-reward bucket ${v['high_reward_bucket']:,.2f}",
               f"- Open trades: {v['open_trades']}; closed so far: {v['closed_trades_total']} ({v['wins']} wins)",
               f"- Worst drop so far: {v['worst_drop_pct']}%; left on the table (closed trades): ${v['left_on_table_total']:,.2f}"]
        if v["closed_last_day"]:
            L_ += ["- Closed last day: " + "; ".join(f"{c['symbol']} ({c['engine']}, {c['reason']}) {c['pnl_usd']:+.2f}" for c in v["closed_last_day"])]
        if v["orders_next_open"]:
            L_ += ["- Orders for the next open: " + "; ".join(f"{o['status'].split()[0]} {o['symbol']} ({o['strategy']})" + (f", stop {o['stop_loss']}" if o['stop_loss'] != '' else "") for o in v["orders_next_open"])]
        for n in v["learn_from_mistakes"]: L_ += [f"- Review: {n}"]
        L_ += [""]
    open(os.path.join(OUT, "latest_report.md"), "w").write("\n".join(L_))
    os.makedirs(os.path.join(OUT, "reports"), exist_ok=True)
    open(os.path.join(OUT, "reports", s["run_time_utc"][:10] + ".md"), "w").write("\n".join(L_))


if __name__ == "__main__":
    main()
