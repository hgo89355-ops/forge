"""
Nightly record-keeping and alerts for halalbot (paper trading only, places no orders).

Every night it:
  1. saves daily candles for ALL Liquid / Hyperliquid markets (all dexes) into data/hl_daily/,
     so we build our own backtestable history for the markets the backtests never covered;
  2. logs every strategy signal of the day into paper/signals_log.csv: the bot's own signals
     (bought or skipped, and why) and "shadow" signals, which apply the same entry rules to every
     Liquid market the bot doesn't trade yet;
  3. follows up every logged signal for 60 trading days (stop hit? target hit? best and current gain),
     so we can see what happened even to trades we didn't take;
  4. writes paper/market_scan/<date>.csv: one row per market with the day's move, volume and which
     entry rules fired;
  5. raises alerts (paper/alerts.json): very unusual moves or volume, and "pattern watch" candidates:
     a rule whose shadow signals on new markets have done clearly better than its backtest after at
     least 30 finished signals. A candidate is only a lead: it still needs the full backtest
     (every candle, fees, coin-flip test, both halves) before it can join the bot.
"""
import json, os, time
import numpy as np, pandas as pd, requests

HERE = os.path.dirname(os.path.abspath(__file__))
API = "https://api.hyperliquid.xyz/info"
HL_DIR = os.path.join(HERE, "data", "hl_daily")
LOG = os.path.join(HERE, "paper", "signals_log.csv")
SCAN_DIR = os.path.join(HERE, "paper", "market_scan")
ALERTS = os.path.join(HERE, "paper", "alerts.json")
FOLLOW_DAYS = 60
MEME = set("DOGE kPEPE WIF BONK kSHIB FARTCOIN PENGU TRUMP POPCAT MEW BRETT MOODENG PNUT GOAT kFLOKI TURBO NEIRO "
           "NEIROETH SPX MELANIA kBONK CHILLGUY MOG kNEIRO PEOPLE BOME MEME BABY GRIFFAIN FWOG HPOS SHIA kLUNC "
           "BANANA AIXBT ZEREBRO VINE PURR LAUNCHCOIN".split())


def _post(body, tries=3):
    for k in range(tries):
        try:
            r = requests.post(API, json=body, timeout=30)
            if r.status_code == 200:
                return r.json()
        except Exception:
            pass
        time.sleep(1.5 * (k + 1))
    return None


def hl_markets():
    out = []
    dexes = _post({"type": "perpDexs"}) or [None]
    for d in dexes:
        name = d["name"] if d else ""
        meta = _post({"type": "meta", "dex": name} if name else {"type": "meta"})
        if not meta:
            continue
        for a in meta.get("universe", []):
            if a.get("isDelisted"):
                continue
            n = a["name"]
            kind = "crypto" if not name else ("crypto index" if n.split(":")[-1] in ("TOTAL2", "OTHERS", "BTCD") else "stock/index/commodity")
            out.append(dict(market=n, dex=name or "main", kind=kind, meme=n in MEME))
    return pd.DataFrame(out)


def hl_daily(coin):
    r = _post({"type": "candleSnapshot", "req": {"coin": coin, "interval": "1d", "startTime": 0, "endTime": int(time.time() * 1000)}})
    if not r:
        return None
    d = pd.DataFrame(r)
    d["date"] = pd.to_datetime(d["t"], unit="ms").dt.normalize()
    d = d.rename(columns={"o": "open", "h": "high", "l": "low", "c": "close", "v": "volume"}).set_index("date")
    d = d[["open", "high", "low", "close", "volume"]].astype(float)
    today = pd.Timestamp.utcnow().tz_localize(None).normalize()
    return d[d.index < today]                     # finished candles only


def save_hl_history(markets):
    os.makedirs(HL_DIR, exist_ok=True)
    data = {}
    for m in markets["market"]:
        d = hl_daily(m)
        if d is None or not len(d):
            continue
        f = os.path.join(HL_DIR, m.replace(":", "_") + ".csv")
        if os.path.exists(f):                      # keep anything older that the API no longer returns
            old = pd.read_csv(f, index_col=0, parse_dates=True)
            d = pd.concat([old[~old.index.isin(d.index)], d]).sort_index()
        d.round(8).to_csv(f)
        data[m] = d
        time.sleep(0.15)
    return data


# ----------------------------------------------------------------------------- entry rules (same as the bot)
def _sma(s, n): return s.rolling(n, min_periods=n).mean()


def _atr(d, n=14):
    pc = d["close"].shift(1)
    tr = pd.concat([d["high"] - d["low"], (d["high"] - pc).abs(), (d["low"] - pc).abs()], axis=1).max(axis=1)
    return tr.rolling(n, min_periods=n).mean()


def _rsi2(c):
    d = c.diff(); up = d.clip(lower=0).ewm(alpha=0.5, adjust=False).mean(); dn = (-d.clip(upper=0)).ewm(alpha=0.5, adjust=False).mean()
    return 100 - 100 / (1 + up / dn.replace(0, np.nan))


def entry_rules(d, regime_up, btc_up=None, is_crypto=False):
    """Today's value of each long entry rule used by the bot (True/False)."""
    if len(d) < 60:
        return {}
    c, h, l, o = d["close"], d["high"], d["low"], d["open"]
    s21, s50, s200 = _sma(c, 21), _sma(c, 50), _sma(c, 200)
    e20 = c.ewm(span=20, adjust=False).mean()
    reg = bool(regime_up)
    r = {}
    r["Turtle breakout"] = bool(c.iat[-1] > h.rolling(55).max().shift(1).iat[-1]) and reg
    r["52-week high"] = len(d) > 252 and bool(c.iat[-1] > h.rolling(252).max().shift(1).iat[-1] and c.iat[-1] > s50.iat[-1]) and reg
    sd = c.rolling(20).std(); width = 4 * sd / s21
    rank = width.rolling(252, min_periods=126).apply(lambda x: (x[-1] <= x).mean(), raw=True)
    r["Squeeze breakout"] = bool((rank.shift(1).iat[-1] <= 0.10) and c.iat[-1] > s21.iat[-1] + 2 * sd.iat[-1] and c.iat[-1] > s200.iat[-1])
    r["Pullback in trend"] = bool(c.iat[-1] > s50.iat[-1] and s50.iat[-1] > s200.iat[-1] and l.iat[-1] <= e20.iat[-1] and c.iat[-1] > e20.iat[-1]
                                  and c.iat[-1] > o.iat[-1] and s50.iat[-1] > s50.shift(20).iat[-1])
    # bull flag: pole >= 10% in 10 days, 3-8 day tight flag, close above flag high and the 50-day average
    flag = False
    for fl in range(3, 9):
        i = len(c) - 1; fs, ps = i - fl, i - fl - 10
        if ps < 0: break
        if c.iat[fs - 1] / c.iat[ps] - 1 < 0.10: continue
        fh, flo = h.iloc[fs:i].max(), l.iloc[fs:i].min(); ph = c.iat[fs - 1] - c.iat[ps]
        if (fh - flo) > 0.5 * ph or (c.iat[fs - 1] - flo) > 0.5 * ph: continue
        if c.iat[i] > fh and c.iat[i] > s50.iat[i]: flag = True
        break
    r["Bull flag"] = flag
    r["Dip (RSI2 < 10, uptrend)"] = bool(_rsi2(c).iat[-1] < 10 and c.iat[-1] > s200.iat[-1]) and reg
    if is_crypto:
        r["Crypto trend"] = bool(c.iat[-1] > h.rolling(20).max().shift(1).iat[-1]) and bool(btc_up)
    return r


# ----------------------------------------------------------------------------- main entry point
def run(day_summary, bot_data, bot_signals, taken_keys, report_date):
    """bot_data: {symbol: prepared daily df incl. placeholder next bar}; bot_signals: list of
    (symbol, strategy, entry_ref, stop) fired at the last finished candle; taken_keys: set of
    (symbol, strategy) the paper account actually bought."""
    os.makedirs(SCAN_DIR, exist_ok=True)
    notes = []
    mk = hl_markets()
    hl = save_hl_history(mk) if len(mk) else {}
    spy = bot_data["SPY"]["close"].iloc[:-1]; reg_up = spy.iat[-1] > spy.rolling(200).mean().iat[-1]
    btc = bot_data["BTC-USD"]["close"].iloc[:-1]; btc_up = btc.iat[-1] > btc.rolling(200).mean().iat[-1]

    # ---- 1. today's signals: bot (taken / skipped) + shadow signals on Liquid markets
    rows = []
    for sym, strat, ref, stop in bot_signals:
        rows.append(dict(date=report_date, market=sym, source="bot", strategy=strat, ref_price=ref, stop=stop,
                         target=ref + 10 * (ref - stop) if stop and stop < ref else np.nan,
                         status="bought" if (sym, strat) in taken_keys else "skipped (no free slot/cash or rule limit)"))
    scan = []
    for _, m in mk.iterrows():
        d = hl.get(m["market"])
        if d is None or len(d) < 2:
            continue
        ch = d["close"].pct_change()
        vol20 = d["volume"].rolling(20).mean().shift(1)
        z = ch.iat[-1] / ch.rolling(60, min_periods=20).std().shift(1).iat[-1] if len(d) > 25 else np.nan
        rules = entry_rules(d, reg_up, btc_up, is_crypto=m["kind"] == "crypto")
        fired = [k for k, v in rules.items() if v]
        a = _atr(d).iat[-1]
        scan.append(dict(date=str(d.index[-1].date()), market=m["market"], kind=m["kind"], meme=m["meme"],
                         close=d["close"].iat[-1], change_pct=round(100 * ch.iat[-1], 2) if len(d) > 1 else np.nan,
                         move_size_vs_normal=round(z, 2) if z == z else np.nan,
                         volume_vs_20day=round(d["volume"].iat[-1] / vol20.iat[-1], 2) if len(d) > 21 and vol20.iat[-1] else np.nan,
                         days_of_history=len(d), rules_fired="; ".join(fired)))
        if not m["meme"] and a == a:
            for f in fired:
                rows.append(dict(date=str(d.index[-1].date()), market=m["market"], source="shadow (Liquid market)", strategy=f,
                                 ref_price=d["close"].iat[-1], stop=d["close"].iat[-1] - a, target=d["close"].iat[-1] + 10 * a, status="not traded (shadow)"))
    scan = pd.DataFrame(scan)
    if len(scan):
        scan.to_csv(os.path.join(SCAN_DIR, f"{report_date}.csv"), index=False)

    log = pd.read_csv(LOG) if os.path.exists(LOG) else pd.DataFrame()
    new = pd.DataFrame(rows)
    if len(new):
        if len(log):
            key = set(zip(log["date"].astype(str), log["market"], log["strategy"], log["source"]))
            new = new[[(str(a), b, c, e) not in key for a, b, c, e in zip(new["date"], new["market"], new["strategy"], new["source"])]]
        log = pd.concat([log, new], ignore_index=True)

    # ---- 2. follow up every open signal
    def series(mkt):
        if mkt in hl: return hl[mkt]
        if mkt in bot_data: return bot_data[mkt].iloc[:-1]
        return None
    if len(log):
        for col in ("days_followed", "best_gain_pct", "now_gain_pct", "result", "R"):
            if col not in log: log[col] = np.nan
        log["result"] = log["result"].astype(object)
        for i, r in log.iterrows():
            if isinstance(r["result"], str) and r["result"] in ("stop hit", "target hit", "60 days up", "60 days down"):
                continue
            d = series(r["market"])
            if d is None: continue
            after = d[d.index > pd.Timestamp(r["date"])].iloc[:FOLLOW_DAYS]
            if not len(after): continue
            ref, stop, tgt = r["ref_price"], r["stop"], r["target"]
            res, exitp = None, after["close"].iat[-1]
            for _, b in after.iterrows():
                if stop == stop and b["low"] <= stop: res, exitp = "stop hit", min(b["open"], stop); break
                if tgt == tgt and b["high"] >= tgt: res, exitp = "target hit", max(b["open"], tgt); break
            if res is None:
                res = ("60 days up" if exitp > ref else "60 days down") if len(after) >= FOLLOW_DAYS else "open"
            log.at[i, "days_followed"] = len(after)
            log.at[i, "best_gain_pct"] = round(100 * (after["high"].max() / ref - 1), 2)
            log.at[i, "now_gain_pct"] = round(100 * (exitp / ref - 1), 2)
            log.at[i, "result"] = res
            log.at[i, "R"] = round((exitp - ref) / (ref - stop), 2) if stop == stop and ref > stop else np.nan
        log.to_csv(LOG, index=False)

    # ---- 3. alerts
    alerts = []
    if len(scan):
        big = scan[(scan["move_size_vs_normal"].abs() >= 4) & (~scan["meme"])]
        for _, r in big.sort_values("move_size_vs_normal", key=abs, ascending=False).head(10).iterrows():
            alerts.append(f"Unusual move: {r['market']} {r['change_pct']:+.1f}% ({abs(r['move_size_vs_normal']):.1f}x its normal daily move)")
        vol = scan[(scan["volume_vs_20day"] >= 4) & (~scan["meme"])]
        for _, r in vol.sort_values("volume_vs_20day", ascending=False).head(10).iterrows():
            alerts.append(f"Volume spike: {r['market']} traded {r['volume_vs_20day']:.1f}x its usual volume ({r['change_pct']:+.1f}%)")
    skipped = new[new["status"].str.startswith("skipped")] if len(new) else new
    for _, r in skipped[~skipped["strategy"].str.startswith("X ")].iterrows():   # fill-in extras are logged, not alerted
        alerts.append(f"Signal skipped: {r['market']} ({r['strategy']}); its outcome will be tracked")
    # pattern watch: shadow signals that finished, per strategy, vs the bot's backtest average
    ref_R = {"Turtle breakout": 0.49, "52-week high": 0.51, "Squeeze breakout": 0.48, "Pullback in trend": 0.39,
             "Bull flag": 0.61, "Crypto trend": 1.42, "Dip (RSI2 < 10, uptrend)": 0.67}
    if len(log):
        done = log[(log["source"] != "bot") & log["result"].isin(["stop hit", "target hit", "60 days up", "60 days down"])]
        for (strat, kind), g in done.assign(kind=done["market"].str.contains(":").map({True: "Liquid stock markets", False: "Liquid crypto"})).groupby(["strategy", "kind"]):
            if len(g) >= 30:
                m_, se = g["R"].mean(), g["R"].std() / np.sqrt(len(g))
                if m_ - 2 * se > ref_R.get(strat, 0.5):
                    alerts.append(f"PATTERN WATCH: {strat} on {kind}: {len(g)} finished signals, average {m_:+.2f}R, "
                                  f"win {100 * (g['R'] > 0).mean():.0f}% vs backtest {ref_R.get(strat, 0.5):+.2f}R. Needs the full backtest before use.")
    out = dict(date=report_date, markets_recorded=len(hl), signals_today=int(len(new)),
               bot_signals=int((new["source"] == "bot").sum()) if len(new) else 0,
               shadow_signals=int((new["source"] != "bot").sum()) if len(new) else 0, alerts=alerts)
    json.dump(out, open(ALERTS, "w"), indent=1, default=str)
    return out
