"""
Prospects: setups that are NOT in the bot yet, watched every night on every market (paper only, no orders).

Each prospect is a fixed rule, written down before any testing. For each one we keep:
  * a backtest on the bot's 110 markets, 2018 onwards, with the bot's standard exit
    (stop 1 ATR below entry, target 10 ATR above, sell after 60 days; 0.2% round-trip cost),
    compared with RANDOM entries in the same markets and years with the same exit (the coin-flip check);
  * a live log: every time a prospect fires on any market (the 110 bot markets + every non-meme Liquid market),
    it is logged and followed for 60 trading days with the same exit.

Only NEW trades count: a prospect that fires within 3 days of a bot signal in the same market adds nothing new
(the bot already buys it). In the 2018-26 backtest 55-82% of prospect trades overlapped the bot's, and the
overlapping ones carried all the profit.
Status:
  READY        backtest NEW trades: >= 50, avg R beats random entries by >= 0.15R; and live NEW trades:
               >= 20 finished with avg R >= 0. Bring to Mohamed with the backtest and ideas.
  PROMISING    the backtest part of READY holds; waiting for live results.
  BOOSTER IDEA new trades don't beat random, but when it fires together with a bot signal those trades did
               >= 0.3R better than the bot's average (could be a reason to size those bot trades up).
  WATCHING     anything else with a positive backtest; WEAK if not.

python3 prospects.py --backtest   rebuild backtests/prospects_backtest.csv from data/yahoo_daily (slow, rarely)
python3 prospects.py              nightly: fetch prices, log today's prospects, follow up old ones, write the summary
Outputs: paper/prospects/log.csv, paper/prospects/summary.csv, paper/prospects/summary.md
"""
import glob, json, os, sys
import numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "paper", "prospects")
LOG = os.path.join(OUT, "log.csv")
BT = os.path.join(HERE, "backtests", "prospects_backtest.csv")
YAHOO_DIR = os.path.join(HERE, "data", "yahoo_daily")
HL_DIR = os.path.join(HERE, "data", "hl_daily")
FOLLOW = 60
COST = 0.002
MEME = set("DOGE kPEPE WIF BONK kSHIB FARTCOIN PENGU TRUMP POPCAT MEW BRETT MOODENG PNUT GOAT kFLOKI TURBO NEIRO "
           "NEIROETH SPX MELANIA kBONK CHILLGUY MOG kNEIRO PEOPLE BOME MEME BABY GRIFFAIN FWOG HPOS SHIA kLUNC "
           "BANANA AIXBT ZEREBRO VINE PURR LAUNCHCOIN".split())

PROSPECTS = {
    "Gap and go": "Opens 3%+ above yesterday's high, closes at or above its open, volume 2x+ normal, above the 50-day average",
    "Big jump on volume": "Closes up 5%+ on 3x+ normal volume while above the 200-day average (like a strong earnings reaction)",
    "Strong on a red day": "The S&P 500 falls 1%+ but this market rises 1%+, while above its 50-day average",
    "Inside-day breakout": "After an inside day, closes above the bar before it, in an uptrend (50-day above 200-day)",
    "Quiet then breakout": "5-day volume under 60% of normal, then a close above the 20-day high on 1.5x+ volume",
    "Drop bounce in uptrend": "Falls 3+ ATR in a day while above the 200-day average, then the next day closes green",
}


def prep(d):
    d = d[["open", "high", "low", "close", "volume"]].astype(float).dropna()
    d = d[~d.index.duplicated()].sort_index()
    pc = d["close"].shift(1)
    tr = pd.concat([d["high"] - d["low"], (d["high"] - pc).abs(), (d["low"] - pc).abs()], axis=1).max(axis=1)
    d["atr"] = tr.rolling(14, min_periods=14).mean()
    d["sma50"] = d["close"].rolling(50, min_periods=50).mean()
    d["sma200"] = d["close"].rolling(200, min_periods=200).mean()
    d["vavg"] = d["volume"].rolling(20, min_periods=20).mean().shift(1)
    return d


def signals(d, spy_ret):
    """Boolean frame, one column per prospect, True on the signal day's close."""
    o, h, l, c, v = d["open"], d["high"], d["low"], d["close"], d["volume"]
    has_vol = d["vavg"] > 0
    ret = c.pct_change()
    s = pd.DataFrame(index=d.index)
    s["Gap and go"] = (o >= h.shift(1) * 1.03) & (c >= o) & has_vol & (v >= 2 * d["vavg"]) & (c > d["sma50"])
    s["Big jump on volume"] = (ret >= 0.05) & has_vol & (v >= 3 * d["vavg"]) & (c > d["sma200"])
    sr = spy_ret.reindex(d.index)
    s["Strong on a red day"] = (sr <= -0.01) & (ret >= 0.01) & (c > d["sma50"])
    inside = (h.shift(1) < h.shift(2)) & (l.shift(1) > l.shift(2))
    s["Inside-day breakout"] = inside & (c > h.shift(2)) & (d["sma50"] > d["sma200"])
    quiet = d["volume"].rolling(5).mean().shift(1) < 0.6 * d["volume"].rolling(50).mean().shift(1)
    s["Quiet then breakout"] = quiet & has_vol & (c > h.rolling(20).max().shift(1)) & (v >= 1.5 * d["vavg"])
    drop = (c.shift(1) - c.shift(2) <= -3 * d["atr"].shift(2)) & (c.shift(1) > d["sma200"].shift(1))
    s["Drop bounce in uptrend"] = drop & (c > o) & (c > c.shift(1))
    return s.fillna(False)


def walk(d, i):
    """Bot-standard exit for a signal on bar i: buy bar i+1 open, stop 1 ATR, target 10 ATR, 60 bars.
    Returns (finished, R, days, why)."""
    if i + 1 >= len(d) or not d["atr"].iat[i] > 0:
        return False, np.nan, 0, "waiting for entry"
    e = d["open"].iat[i + 1]; a = d["atr"].iat[i]; stop, tgt = e - a, e + 10 * a
    risk = max(a / e, 0.0025)
    last = min(len(d) - 1, i + FOLLOW)
    for j in range(i + 1, last + 1):
        lo, hi = d["low"].iat[j], d["high"].iat[j]
        if lo <= stop:
            px = min(stop, d["open"].iat[j]) if j > i + 1 else stop
            return True, ((px / e - 1) - COST) / risk, j - i, "stop"
        if hi >= tgt:
            return True, ((tgt / e - 1) - COST) / risk, j - i, "target"
    px = d["close"].iat[last]
    done = last == i + FOLLOW
    return done, ((px / e - 1) - COST) / risk, last - i, "60 days" if done else "open"


# ----------------------------------------------------------------------------- backtest
def overlap(t, bot_dates):
    """True where the bot itself signalled the same market within 3 calendar days."""
    out = []
    for m, d in zip(t["market"], t["date"]):
        ds = bot_dates.get(m.replace("liquid:xyz_", "").replace("liquid:", ""))
        out.append(ds is not None and len(ds) > 0 and bool((np.abs((ds - np.datetime64(d)) / np.timedelta64(1, "D")) <= 3).any()))
    return out


def load_yahoo():
    out = {}
    for f in sorted(glob.glob(os.path.join(YAHOO_DIR, "*.csv"))):
        d = pd.read_csv(f, parse_dates=["date"], index_col="date")
        d.columns = [x.lower() for x in d.columns]
        if len(d) > 300:
            out[os.path.basename(f)[:-4]] = prep(d)
    return out


def backtest():
    data = load_yahoo(); spy_ret = data["SPY"]["close"].pct_change()
    rng = np.random.default_rng(7)
    rows = []
    for sym, d in data.items():
        if sym in ("NQ=F", "ES=F"): continue
        sig = signals(d, spy_ret)
        idx = np.where(d.index >= "2018-01-01")[0]
        for name in PROSPECTS:
            busy = -1
            for i in np.where(sig[name].to_numpy())[0]:
                if i < idx[0] or i <= busy: continue
                done, R, n, why = walk(d, i)
                if done:
                    rows.append(dict(prospect=name, market=sym, date=d.index[i], R=R, days=n, why=why)); busy = i + n
        for i in rng.choice(idx, size=min(len(idx), 150), replace=False):
            done, R, n, why = walk(d, i)
            if done: rows.append(dict(prospect="Random entry", market=sym, date=d.index[i], R=R, days=n, why=why))
    t = pd.DataFrame(rows)
    bot = pd.read_csv(os.path.join(HERE, "backtests", "all_backtest_trades.csv"), parse_dates=["signal_date"])
    bot = bot[~bot.strategy.str.startswith("X ")]
    t["bot_also"] = overlap(t, bot.groupby("symbol")["signal_date"].apply(lambda x: x.to_numpy()).to_dict())
    t.loc[t.prospect == "Random entry", "bot_also"] = False
    bot_avg_R = bot[bot.entry_date >= "2018-01-01"].R.mean()
    t.to_csv(os.path.join(HERE, "backtests", "prospects_backtest_trades.csv"), index=False)
    out = []
    for p, g in t.groupby("prospect"):
        row = dict(prospect=p, trades=len(g), win_rate=round(100 * (g.R > 0).mean(), 1), avg_R=round(g.R.mean(), 2))
        for lab, a, b in (("2018_21", "2018", "2022"), ("2022_26", "2022", "2027")):
            gg = g[(g.date >= a) & (g.date < b)]; rr = t[(t.prospect == "Random entry") & (t.date >= a) & (t.date < b)]
            row[f"trades_{lab}"] = len(gg); row[f"avg_R_{lab}"] = round(gg.R.mean(), 2)
            row[f"edge_vs_random_{lab}"] = round(gg.R.mean() - rr.R.mean(), 2)
        rnd = t[t.prospect == "Random entry"].R.mean()
        nw, ov = g[~g.bot_also.astype(bool)], g[g.bot_also.astype(bool)]
        row.update(overlap_pct=round(100 * len(ov) / len(g), 0), new_trades=len(nw),
                   new_avg_R=round(nw.R.mean(), 2) if len(nw) else None,
                   new_edge_vs_random=round(nw.R.mean() - rnd, 2) if len(nw) else None,
                   with_bot_avg_R=round(ov.R.mean(), 2) if len(ov) else None, bot_avg_R=round(bot_avg_R, 2))
        out.append(row)
    s = pd.DataFrame(out).sort_values("avg_R", ascending=False)
    s.to_csv(BT, index=False); print(s.to_string())


# ----------------------------------------------------------------------------- nightly
def fetch_nightly():
    """Fresh daily candles: Yahoo for the bot's 110 markets (2 years), saved Liquid candles for the rest."""
    import yfinance as yf
    names = sorted(os.path.basename(f)[:-4] for f in glob.glob(os.path.join(YAHOO_DIR, "*.csv")))
    data = {}
    raw = yf.download(names, period="2y", interval="1d", group_by="ticker", auto_adjust=True, progress=False, threads=True)
    for s in names:
        try:
            d = raw[s].dropna(); d.columns = [x.lower() for x in d.columns]
            if len(d) > 250: data[s] = prep(d)
        except Exception:
            pass
    have = {s.replace("-USD", "") for s in data} | set(data)
    for f in glob.glob(os.path.join(HL_DIR, "*.csv")):
        m = os.path.basename(f)[:-4]
        base = m.split("_")[-1] if "_" in m else m
        if base in MEME or base in have: continue
        d = pd.read_csv(f, parse_dates=["date"], index_col="date")
        if len(d) > 250: data["liquid:" + m] = prep(d)
    return data


def nightly():
    os.makedirs(OUT, exist_ok=True)
    data = fetch_nightly()
    spy_ret = data["SPY"]["close"].pct_change()
    last_day = data["SPY"].index[-1]
    log = pd.read_csv(LOG, parse_dates=["date"]) if os.path.exists(LOG) else pd.DataFrame(
        columns=["date", "market", "prospect", "close", "atr", "status", "days", "R", "why"])
    log["date"] = pd.to_datetime(log["date"])
    keys = set(zip(log["date"].dt.strftime("%Y-%m-%d"), log["market"], log["prospect"]))
    new = []
    for m, d in data.items():
        sig = signals(d, spy_ret)
        for k in range(1, 4):                                   # the last 3 bars, so a missed night is caught up
            if len(d) <= k: continue
            dt_ = d.index[-k]
            if (last_day - dt_).days > 6: continue
            for p in PROSPECTS:
                if sig[p].iat[-k] and (dt_.strftime("%Y-%m-%d"), m, p) not in keys:
                    new.append(dict(date=dt_, market=m, prospect=p, close=round(d["close"].iat[-k], 4),
                                    atr=round(d["atr"].iat[-k], 4), status="open", days=0, R=np.nan, why=""))
    if new:
        log = pd.concat([log, pd.DataFrame(new)], ignore_index=True)
    for i, r in log.iterrows():                                 # follow up every unfinished prospect
        if r["status"] == "finished" or r["market"] not in data: continue
        d = data[r["market"]]
        if r["date"] not in d.index: continue
        done, R, n, why = walk(d, d.index.get_loc(r["date"]))
        log.loc[i, ["status", "days", "R", "why"]] = ["finished" if done else "open", n, round(R, 3) if R == R else np.nan, why]
    sl = os.path.join(HERE, "paper", "signals_log.csv")
    if os.path.exists(sl):
        b = pd.read_csv(sl, parse_dates=["date"]); b = b[b.source == "bot"]
        log["bot_also"] = overlap(log, b.groupby("market")["date"].apply(lambda x: x.to_numpy()).to_dict())
    else:
        log["bot_also"] = False
    log.sort_values(["date", "prospect", "market"]).to_csv(LOG, index=False, date_format="%Y-%m-%d")

    bt = pd.read_csv(BT).set_index("prospect") if os.path.exists(BT) else pd.DataFrame()
    rows = []
    for p, rule in PROSPECTS.items():
        g = log[log.prospect == p]; f = g[(g.status == "finished") & ~g.bot_also.astype(bool)]
        b = bt.loc[p] if p in bt.index else None
        bt_ok = b is not None and b["new_trades"] >= 50 and b["new_edge_vs_random"] >= 0.15
        live_ok = len(f) >= 20 and f["R"].mean() >= 0
        booster = b is not None and pd.notna(b["with_bot_avg_R"]) and b["with_bot_avg_R"] - b["bot_avg_R"] >= 0.3
        status = ("READY" if bt_ok and live_ok else "PROMISING" if bt_ok else "BOOSTER IDEA" if booster
                  else "WATCHING" if b is not None and b["new_avg_R"] > 0 else "WEAK")
        rows.append(dict(prospect=p, rule=rule, status=status, seen_today=int((g.date == last_day).sum()),
                         live_logged=len(g), live_new=int((~g.bot_also.astype(bool)).sum()), live_finished=len(f), live_open=int((g.status == "open").sum()),
                         live_win_rate=round(100 * (f.R > 0).mean(), 1) if len(f) else None,
                         live_avg_R=round(f.R.mean(), 2) if len(f) else None,
                         live_open_avg_R=round(g[g.status == "open"].R.mean(), 2) if (g.status == "open").any() and g[g.status == "open"].R.notna().any() else None,
                         bt_trades=int(b["trades"]) if b is not None else None, bt_win_rate=b["win_rate"] if b is not None else None,
                         bt_avg_R=b["avg_R"] if b is not None else None,
                         bt_edge_2018_21=b["edge_vs_random_2018_21"] if b is not None else None,
                         bt_edge_2022_26=b["edge_vs_random_2022_26"] if b is not None else None,
                         bt_overlap_pct=b["overlap_pct"] if b is not None else None,
                         bt_new_trades=int(b["new_trades"]) if b is not None else None,
                         bt_new_avg_R=b["new_avg_R"] if b is not None else None,
                         bt_with_bot_avg_R=b["with_bot_avg_R"] if b is not None else None,
                         bot_avg_R=b["bot_avg_R"] if b is not None else None))
    S = pd.DataFrame(rows)
    S.to_csv(os.path.join(OUT, "summary.csv"), index=False)
    today = log[log.date == last_day]
    lines = [f"Prospects on {last_day.date()}: {len(today)} new across {today.market.nunique()} markets; "
             f"{int((log.status == 'open').sum())} being followed; {int((log.status == 'finished').sum())} finished."]
    for r in rows:
        if r["status"] == "READY":
            lines.append(f"READY FOR REVIEW: {r['prospect']} - backtest new trades {r['bt_new_trades']}, avg {r['bt_new_avg_R']}R; "
                         f"live new trades {r['live_finished']} finished, {r['live_win_rate']}% won, avg {r['live_avg_R']}R")
    open(os.path.join(OUT, "summary.md"), "w").write("\n".join(lines) + "\n")
    print("\n".join(lines)); print(S.drop(columns="rule").to_string())


if __name__ == "__main__":
    backtest() if "--backtest" in sys.argv else nightly()
