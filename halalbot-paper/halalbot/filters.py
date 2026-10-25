"""
Filters turn single engines into combinations. Every filter only looks at information
available at the trade's signal_date close (no look-ahead).
"""
import numpy as np
import pandas as pd

from .indicators import sma


def regime(trades, market, ma_len=200):
    """Trade WITH the market: longs only while the market is above its 200-day MA, shorts only below it."""
    up = market["close"] > sma(market["close"], ma_len)
    out = []
    for t in trades:
        if t["signal_date"] not in up.index:
            continue
        u = bool(up.at[t["signal_date"]])
        if (t.get("side", 1) > 0) == u:
            out.append(t)
    return out


def _xs_rank(data, col):
    panel = pd.DataFrame({s: d[col] for s, d in data.items()})
    return panel.rank(axis=1, pct=True)


def momentum_leaders(trades, data, top=0.5):
    """Longs only in the strongest `top` share of the universe by 12-1 momentum; shorts only in the weakest."""
    r = _xs_rank(data, "mom12_1")
    out = []
    for t in trades:
        if t["signal_date"] not in r.index or t["symbol"] not in r.columns:
            continue
        v = r.at[t["signal_date"], t["symbol"]]
        if np.isnan(v):
            continue
        if (t.get("side", 1) > 0 and v >= 1 - top) or (t.get("side", 1) < 0 and v <= top):
            out.append(t)
    return out


def low_volatility(trades, data, keep=0.5):
    """Paper 3.4 low-volatility anomaly as a filter: keep the calmer half of the universe."""
    r = _xs_rank(data, "vol63")
    return [t for t in trades if t["signal_date"] in r.index and t["symbol"] in r.columns
            and not np.isnan(r.at[t["signal_date"], t["symbol"]]) and r.at[t["signal_date"], t["symbol"]] <= keep]


def after_recent(trades, other, window=20):
    """Keep a trade only if `other` engine signalled on the same symbol within `window` bars before.
    Example: an RSI(2) dip that comes within 20 days of a 20-day breakout = 'buy the first pullback'."""
    by_sym = {}
    for o in other:
        by_sym.setdefault(o["symbol"], []).append(o["signal_date"])
    out = []
    for t in trades:
        ds = by_sym.get(t["symbol"], [])
        lim = t["signal_date"] - pd.Timedelta(days=int(window * 1.45))
        if any(lim <= d < t["signal_date"] for d in ds):
            out.append(t)
    return out


def forecast_agrees(trades, forecasts, threshold=0.55, col="p_up_cal"):
    """
    Keep trades whose forecast probability of going up (calibrated, see forecasts.py) is at least
    `threshold` on the signal date. `forecasts` is indexed by (date, symbol).
    """
    out = []
    for t in trades:
        key = (t["signal_date"], t["symbol"])
        if key not in forecasts.index:
            continue
        p = forecasts.at[key, col]
        if (t.get("side", 1) > 0 and p >= threshold) or (t.get("side", 1) < 0 and p <= 1 - threshold):
            out.append(t)
    return out


def odds_at_least(trades, odds, threshold=0.55):
    """/trader-timemachine gives the odds that THIS setup wins (already direction-aware), calibrated in 'p_win_cal'."""
    out = []
    for t in trades:
        key = (t["signal_date"], t["symbol"])
        if key in odds.index and odds.at[key, "p_win_cal"] >= threshold:
            out.append(t)
    return out
