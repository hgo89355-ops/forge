"""Noise Band (QuantLab video; Zarattini, Aziz & Barbon 2024), long only, QQQ, paper-tracked each night.

Rule (tested on QQQ 1-minute data 2014-2024: +5.6% a year, worst drop -5.5%, positive every year; checked again
on hourly data 2024-2026: +5.3% a year, worst drop -4.2%):
  sigma(t) = average over the last 14 days of |price at time t / that day's open - 1|
  upper band(t) = max(today's open, yesterday's close) x (1 + sigma(t))
  checks once an hour, at 10:00, 11:00, ... 15:00 New York time:
    holding and price < max(upper band, VWAP)  -> sell
    flat and price > upper band                -> buy (100% of this part's money, no leverage)
  anything still held is sold at the 16:00 close. Never held overnight. Cost 0.005% per side.

Each night it rebuilds the last trading days from Yahoo 5-minute bars (Yahoo keeps 60 days) and keeps a running
record in paper/noise_band/: trades.csv (one row per trade) and account.csv (a $10,000 paper account).
"""
import os, json
import numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "paper", "noise_band")
START = pd.Timestamp("2026-10-26")          # same start as the bot's paper account
COST, LOOK = 0.00005, 14
CHECKS = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00"]


def load():
    import yfinance as yf
    h = yf.Ticker("QQQ").history(period="60d", interval="5m", auto_adjust=True, prepost=False)
    h.index = h.index.tz_convert("America/New_York").tz_localize(None)
    h.columns = [c.lower() for c in h.columns]
    return h[["open", "high", "low", "close", "volume"]].dropna()


def day_table(h):
    """Per day: open, close, and at each check time the last price, VWAP and move from open."""
    rows = {}
    for dt, g in h.groupby(h.index.date):
        g = g.between_time("09:30", "15:59")
        if len(g) < 70:                       # a short or broken day
            continue
        op = g.open.iat[0]
        tp = (g.high + g.low + g.close) / 3
        vwap = (tp * g.volume).cumsum() / g.volume.cumsum().replace(0, np.nan)
        r = dict(open=op, close=g.close.iat[-1], last_bar=str(g.index[-1].time()))
        for t in CHECKS:                      # the bar that ENDS at time t starts 5 minutes earlier
            hh, mm = map(int, t.split(":")); cut = pd.Timestamp(dt) + pd.Timedelta(hours=hh, minutes=mm - 5)
            gg = g[g.index <= cut]
            r[f"px_{t}"] = gg.close.iat[-1]; r[f"vwap_{t}"] = vwap[gg.index[-1]]
            r[f"move_{t}"] = abs(gg.close.iat[-1] / op - 1)
        rows[pd.Timestamp(dt)] = r
    return pd.DataFrame.from_dict(rows, orient="index").sort_index()


def simulate(T):
    trades = []
    for k in range(LOOK + 1, len(T)):
        dt = T.index[k]
        if dt < START: continue
        row, prev = T.iloc[k], T.iloc[k - 1]
        ub0 = max(row.open, prev.close)
        pos, entry, t_in = 0, None, None
        for t in CHECKS:
            sigma = T[f"move_{t}"].iloc[k - LOOK:k].mean()
            ub = ub0 * (1 + sigma); px = row[f"px_{t}"]
            if pos and px < max(ub, row[f"vwap_{t}"]):
                trades.append(dict(date=dt.date(), bought=t_in, buy_price=round(entry, 2), sold=t, sell_price=round(px, 2),
                                   ret_pct=round(100 * (px / entry - 1 - 2 * COST), 3), why="fell below band/VWAP")); pos = 0
            if not pos and px > ub:
                pos, entry, t_in = 1, px, t
        if pos:
            trades.append(dict(date=dt.date(), bought=t_in, buy_price=round(entry, 2), sold="16:00 close",
                               sell_price=round(row.close, 2), ret_pct=round(100 * (row.close / entry - 1 - 2 * COST), 3),
                               why="close"))
    return pd.DataFrame(trades, columns=["date", "bought", "buy_price", "sold", "sell_price", "ret_pct", "why"])


def main():
    os.makedirs(OUT, exist_ok=True)
    T = day_table(load())
    tr = simulate(T)
    # keep earlier records (Yahoo only keeps 60 days): merge with what's saved, newest wins
    f = os.path.join(OUT, "trades.csv")
    if os.path.exists(f) and os.path.getsize(f) > 5:
        old = pd.read_csv(f, dtype={"date": str}); tr["date"] = tr["date"].astype(str)
        tr = pd.concat([old[~old.date.isin(tr.date)], tr]).sort_values(["date", "bought"])
    tr.to_csv(f, index=False)
    days = [d for d in T.index if d >= START]
    acc, val = [], 10_000.0
    for d in days:
        r = tr[tr.date.astype(str) == str(d.date())]
        for x in r.ret_pct: val *= 1 + x / 100
        acc.append(dict(date=str(d.date()), account=round(val, 2), trades=len(r), day_pct=round(r.ret_pct.sum(), 3)))
    pd.DataFrame(acc).to_csv(os.path.join(OUT, "account.csv"), index=False)
    s = dict(account=round(val, 2), pnl=round(val - 10_000, 2), trades=int(len(tr)),
             wins=int((tr.ret_pct > 0).sum()), last_day=str(days[-1].date()) if days else None,
             today=tr[tr.date.astype(str) == (str(days[-1].date()) if days else "")].to_dict("records"))
    json.dump(s, open(os.path.join(OUT, "latest.json"), "w"), indent=1, default=str)
    print(json.dumps(s, indent=1, default=str))


if __name__ == "__main__":
    main()
