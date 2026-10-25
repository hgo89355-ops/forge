"""
Ten new strategies, all designed BEFORE looking at their results, long-only unless noted.
Several aim for a low win rate with big winners (trailing stops, no profit cap).
"""
import numpy as np
import pandas as pd

from .engines import LONG, _engine, _trade, _walk, bull_flag, pairs
from .indicators import ema, sma


def _flag_recent(data, flags, window=20):
    """Boolean series per symbol: a bull-flag breakout happened within the previous `window` bars."""
    out = {}
    by = {}
    for t in flags:
        by.setdefault(t["symbol"], []).append(t["signal_date"])
    for s, d in data.items():
        z = pd.Series(0.0, index=d.index)
        for dt in by.get(s, []):
            if dt in z.index:
                z.at[dt] = 1.0
        out[s] = z.rolling(window, min_periods=1).max().shift(1).fillna(0) > 0
    return out


# 1. the winner's entry + a trend-riding exit
def dip_after_flag_trail(data, flags, window=20):
    fr = _flag_recent(data, flags, window)
    r = {LONG: (lambda d: (d["close"] > d["sma200"]) & (d["rsi2"] < 10) & fr[d.attrs["sym"]],
                lambda d, i, px: (px - 2.5 * d["atr14"].iat[i], None, 40, None, 3.0, 0.0))}
    for s, d in data.items():
        d.attrs["sym"] = s
    return _engine(data, "N1_dip_after_flag_trail", r, (LONG,))


# 2. bull flag, but let the winners run (trailing stop, no 2R cap)
def flag_trail_v2(data):
    from . import engines
    trades = []
    for sym, df in data.items():
        for t in engines.bull_flag({sym: df}, r_target=1000.0, max_bars=1):    # get entries only
            i = df.index.get_loc(t["signal_date"])
            xi, xpx, why = _walk(df, i + 1, t["entry_px"], t["stop"], LONG, None, 60, None, 3.0)
            trades.append(_trade(sym, "N2_flag_trail", df, i, t["entry_px"], t["stop"], LONG, xi, xpx, why, t["score"]))
    # one position per symbol at a time
    trades.sort(key=lambda t: (t["symbol"], t["entry_date"]))
    out, last_exit = [], {}
    for t in trades:
        if t["symbol"] in last_exit and t["entry_date"] <= last_exit[t["symbol"]]:
            continue
        out.append(t)
        last_exit[t["symbol"]] = t["exit_date"]
    return out


# 3. Turtle-style 55/20 breakout (classic trend following: low win rate, big winners)
def turtle(data):
    def ent(d):
        hh55 = d["high"].rolling(55, min_periods=55).max().shift(1)
        return d["close"] > hh55
    def ex(d, i, px):
        ll20 = d["low"].rolling(20, min_periods=20).min().shift(1)
        return px - 2.0 * d["atr14"].iat[i], None, None, d["close"] < ll20, None, 0.0
    return _engine(data, "N3_turtle_55_20", {LONG: (ent, ex)}, (LONG,))


# 4. new 52-week high (George & Hwang 52-week-high momentum) with a trailing stop
def high52(data):
    def ent(d):
        hh = d["high"].rolling(252, min_periods=252).max().shift(1)
        return (d["close"] > hh) & (d["close"] > d["sma50"])
    return _engine(data, "N4_52wk_high_trail",
                   {LONG: (ent, lambda d, i, px: (px - 2.0 * d["atr14"].iat[i], None, 120, None, 3.0, 0.0))}, (LONG,))


# 5. volatility squeeze breakout (quiet market, then a break out of the bands)
def squeeze(data):
    def ent(d):
        sd = d["close"].rolling(20).std()
        width = 4 * sd / d["sma21"]
        rank = width.rolling(252, min_periods=126).apply(lambda x: (x[-1] <= x).mean(), raw=True)
        return (rank <= 0.10).shift(1).fillna(False).astype(bool) & (d["close"] > d["sma21"] + 2 * sd) & (d["close"] > d["sma200"])
    return _engine(data, "N5_squeeze_breakout",
                   {LONG: (ent, lambda d, i, px: (px - 1.5 * d["atr14"].iat[i], None, 60, None, 3.0, 0.0))}, (LONG,))


# 6. your Box method on daily bars: hammer in the lower half of yesterday's range
def daily_box(data):
    def ent(d):
        ph, pl, po, pc = d["high"].shift(1), d["low"].shift(1), d["open"].shift(1), d["close"].shift(1)
        mid = (ph + pl) / 2
        range_day = (pc - po).abs() <= 0.8 * (ph - pl)
        body = (d["close"] - d["open"]).abs()
        lower_wick = d[["open", "close"]].min(axis=1) - d["low"]
        hammer = (d["close"] > d["open"]) & (lower_wick >= 2 * body) & (body > 0)
        in_lower = (d["low"] <= mid) & (d["low"] >= pl * 0.99) & (d["close"] <= mid)
        return range_day & hammer & in_lower & (d["close"] > d["sma200"])
    def ex(d, i, px):
        stop = min(d["low"].iat[i], d["low"].iat[i - 1]) * 0.9995
        target = d["high"].iat[i - 1]
        if target <= px:
            target = px + 1.5 * (px - stop)
        return stop, target, 3, None, None, 0.0
    return _engine(data, "N6_daily_box", {LONG: (ent, ex)}, (LONG,))


# 7. turn-of-the-month (index ETFs): buy before the last trading day, sell after the 3rd day
def turn_of_month(data, symbols=("SPY", "QQQ")):
    out = []
    for s in symbols:
        if s not in data:
            continue
        d = data[s]
        idx = d.index
        m = idx.to_period("M")
        last = np.flatnonzero(np.r_[m[1:] != m[:-1], False])          # last bar of each month
        for L in last:
            si = L - 2                                                 # signal close two bars before month end
            ie = si + 1
            xi = L + 3                                                 # close of the 3rd trading day of next month
            if si < 200 or xi >= len(idx):
                continue
            stop = d["open"].iat[ie] - 3 * d["atr14"].iat[si]
            lows = d["low"].to_numpy()[ie:xi + 1]
            hit = np.flatnonzero(lows <= stop)
            if len(hit):
                j = ie + hit[0]
                xpx, xj, why = (stop if j == ie else min(stop, d["open"].iat[j])), j, "stop"
            else:
                xpx, xj, why = d["close"].iat[xi], xi, "time"
            out.append(_trade(s, "N7_turn_of_month", d, si, d["open"].iat[ie], stop, LONG, xj, xpx, why))
    return out


# 8. crypto trend: 20-day breakout while BTC is above its 200-day average, trailing stop
def crypto_trend(data, btc):
    ok = btc["close"] > sma(btc["close"], 200)
    def ent(d):
        return (d["close"] > d["hh20"]) & ok.reindex(d.index).fillna(False)
    return _engine(data, "N8_crypto_trend",
                   {LONG: (ent, lambda d, i, px: (px - 2.0 * d["atr14"].iat[i], None, 90, None, 3.0, 0.0))}, (LONG,))


# 9. twin-company pairs only (near-identical businesses), stricter entry
def twin_pairs(data, two_sided=True):
    tw = [("V", "MA"), ("FDX", "UPS"), ("HD", "LOW")]
    tr = pairs(data, tw, two_sided=two_sided, z_entry=2.5, z_exit=0.0, z_stop=4.0, max_bars=40)
    for t in tr:
        t["engine"] = "N9_twin_pairs" + ("" if two_sided else "_long")
    return tr


# 10. pullback in a strong trend: touch of the 20-day EMA, bullish close, ride with a trailing stop
def trend_pullback(data):
    def ent(d):
        e20 = ema(d["close"], 20)
        return ((d["close"] > d["sma50"]) & (d["sma50"] > d["sma200"]) & (d["low"] <= e20) &
                (d["close"] > e20) & (d["close"] > d["open"]) & (d["sma50"] > d["sma50"].shift(20)))
    return _engine(data, "N10_trend_pullback",
                   {LONG: (ent, lambda d, i, px: (px - 2.0 * d["atr14"].iat[i], None, 60, None, 3.0, 0.0))}, (LONG,))
