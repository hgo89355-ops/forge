"""
Support/resistance strategies and the stop-loss / take-profit structure test.
"""
import numpy as np
import pandas as pd

from .engines import LONG, _engine, _trade, _walk


# ----------------------------------------------------------------------------- support & resistance
def sr_pivot(data):
    """Paper 3.14 pivot points: C = (H+L+C)/3 of yesterday, R1 = 2C - L, S1 = 2C - H.
    Buy at the open when it opens above C; target R1, stop S1; flat at the close (1 day)."""
    out = []
    for s, d in data.items():
        C = (d["high"] + d["low"] + d["close"]) / 3
        R1, S1 = 2 * C - d["low"], 2 * C - d["high"]
        o, h, l, c = (d[k].to_numpy() for k in ("open", "high", "low", "close"))
        sma200 = d["sma200"].to_numpy()
        for i in range(200, len(d) - 1):
            ie = i + 1
            if not (o[ie] > C.iat[i] and c[i] > sma200[i]):
                continue
            stop, tgt = S1.iat[i], R1.iat[i]
            if not (stop < o[ie] < tgt):
                continue
            if l[ie] <= stop:
                xp, why = stop, "stop"
            elif h[ie] >= tgt:
                xp, why = tgt, "target"
            else:
                xp, why = c[ie], "close"
            out.append(_trade(s, "SR1_pivot_points", d, i, o[ie], stop, LONG, ie, xp, why))
    return out


def _swing_levels(d, k=3, lookback=60):
    """Swing lows/highs: a bar whose low (high) is the lowest (highest) of k bars on each side.
    A level only becomes known k bars after it formed (no look-ahead)."""
    lo, hi = d["low"], d["high"]
    is_sl = (lo == lo.rolling(2 * k + 1, center=True).min())
    is_sh = (hi == hi.rolling(2 * k + 1, center=True).max())
    sl = lo.where(is_sl).shift(k)        # known k bars later
    sh = hi.where(is_sh).shift(k)
    last_sl = sl.ffill(limit=lookback)
    last_sh = sh.ffill(limit=lookback)
    return last_sl, last_sh


def sr_support_bounce(data, tol=0.01):
    """Buy a test of the last swing low (support) that closes back above it with a bullish candle,
    in an uptrend. Stop just under support; target the last swing high (resistance)."""
    def ent(d):
        sup, res = _swing_levels(d)
        d["_sup"], d["_res"] = sup, res
        touch = (d["low"] <= sup * (1 + tol)) & (d["close"] > sup) & (d["close"] > d["open"])
        return touch & (d["close"] > d["sma200"]) & (res > d["close"] * 1.02)
    def ex(d, i, px):
        stop = d["_sup"].iat[i] - 0.25 * d["atr14"].iat[i]
        return stop, d["_res"].iat[i], 20, None, None, 0.0
    return _engine(data, "SR2_support_bounce", {LONG: (ent, ex)}, (LONG,))


def sr_breakout_retest(data, tol=0.01, within=10):
    """Old resistance becomes new support: price broke above the last swing high in the past
    `within` bars, then comes back to that level and closes above it. Stop 1 ATR under the level;
    ride with a 3-ATR trailing stop."""
    def ent(d):
        _, res = _swing_levels(d)
        broke = d["close"] > res.shift(1)
        lvl = res.shift(1).where(broke).ffill(limit=within)
        recent_break = broke.rolling(within, min_periods=1).max().shift(1).fillna(0) > 0
        d["_lvl"] = lvl
        retest = (d["low"] <= lvl * (1 + tol)) & (d["close"] > lvl) & ~broke
        return recent_break & retest & (d["close"] > d["sma200"])
    def ex(d, i, px):
        return d["_lvl"].iat[i] - 1.0 * d["atr14"].iat[i], None, 60, None, 3.0, 0.0
    return _engine(data, "SR3_breakout_retest", {LONG: (ent, ex)}, (LONG,))


# ----------------------------------------------------------------------------- stop / target structure test
def restructure(trades, data, stop_atr, target_r=None, trail_atr=None, max_bars=60, name=None):
    """Keep each trade's ENTRY, replace its exit: stop = stop_atr x ATR below entry; target =
    target_r x the stop distance above entry (None = no cap); optional trailing stop. One open
    position per symbol at a time."""
    out, busy = [], {}
    for t in sorted(trades, key=lambda x: (x["entry_date"], x["symbol"])):
        s = t["symbol"]
        if s in busy and t["entry_date"] <= busy[s]:
            continue
        d = data[s]
        i = d.index.get_loc(t["signal_date"])
        px = d["open"].iat[i + 1]
        a = d["atr14"].iat[i]
        if np.isnan(a):
            continue
        stop = px - stop_atr * a
        tgt = px + target_r * (px - stop) if target_r else None
        xi, xpx, why = _walk(d, i + 1, px, stop, LONG, tgt, max_bars, None, trail_atr)
        tr = _trade(s, name or t["engine"], d, i, px, stop, LONG, xi, xpx, why)
        out.append(tr)
        busy[s] = tr["exit_date"]
    return out


def r_stats(trades, slip_bps=5.0):
    if not trades:
        return dict(n=0)
    s = slip_bps / 1e4
    net = np.array([t["ret"] - 2 * s for t in trades])
    risk = np.array([max(t["risk_pct"], 1e-6) for t in trades])
    R = net / risk
    yrs = max((max(t["exit_date"] for t in trades) - min(t["entry_date"] for t in trades)).days / 365.25, 0.5)
    w, l = R[R > 0], R[R <= 0]
    return dict(n=len(R), per_year=len(R) / yrs, win_rate=(R > 0).mean(), avg_win_R=w.mean() if len(w) else 0,
                avg_loss_R=l.mean() if len(l) else 0, expectancy_R=R.mean(),
                R_per_year=R.mean() * len(R) / yrs, avg_hold=np.mean([t["bars"] for t in trades]),
                biggest_win_R=R.max())
