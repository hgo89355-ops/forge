"""The 9 strategies from 'My Learnings - Profitable Trading Strategies' (HumbleTraders), made mechanical.
Long and short. Daily bars. Entry next open after the signal; stops/targets checked bar by bar."""
import numpy as np
import pandas as pd

from .engines import LONG, SHORT, _engine


def stoch(d, n=14, k=3):
    lo, hi = d["low"].rolling(n).min(), d["high"].rolling(n).max()
    return (100 * (d["close"] - lo) / (hi - lo).replace(0, np.nan)).rolling(k).mean()


def heikin(d):
    hc = (d["open"] + d["high"] + d["low"] + d["close"]) / 4
    ho = hc.copy()
    o, c = d["open"].to_numpy(), d["close"].to_numpy()
    hov = np.empty(len(d)); hov[0] = (o[0] + c[0]) / 2
    hcv = hc.to_numpy()
    for i in range(1, len(d)):
        hov[i] = (hov[i - 1] + hcv[i - 1]) / 2
    return pd.Series(hov, index=d.index), hc


def _both(long_fn, short_fn, exit_long, exit_short):
    return {LONG: (long_fn, exit_long), SHORT: (short_fn, exit_short)}


def momentum_reversal(data):
    """#1 Stochastic daily AND weekly (70-day) overbought after a rally near resistance -> short;
    oversold after a fall near support -> long. Stop 1.5 ATR, target 3R, max 20 days."""
    def lf(d):
        sd, sw = stoch(d), stoch(d, 70, 3)
        return (sd < 30) & (sw < 30) & (d["close"] <= d["low"].rolling(60).min() * 1.03) & (d["close"] < d["close"].shift(10))
    def sf(d):
        sd, sw = stoch(d), stoch(d, 70, 3)
        return (sd > 70) & (sw > 70) & (d["close"] >= d["high"].rolling(60).max() * 0.97) & (d["close"] > d["close"].shift(10))
    ex = lambda side: (lambda d, i, px: (px - side * 1.5 * d["atr14"].iat[i], px + side * 4.5 * d["atr14"].iat[i], 20, None, None, 0.0))
    return lambda which: _engine(data, f"P1_momentum_reversal_{which}", _both(lf, sf, ex(LONG), ex(SHORT)), _sides(which))


def ma_cross_20_60_100(data):
    """#2 Buy when the 20 MA crosses above the 60 MA (trend: price above 100 MA); sell short on the opposite.
    Exit when they cross back."""
    def lf(d):
        f, s, t = d["close"].rolling(20).mean(), d["close"].rolling(60).mean(), d["close"].rolling(100).mean()
        return (f > s) & (f.shift(1) <= s.shift(1)) & (d["close"] > t)
    def sf(d):
        f, s, t = d["close"].rolling(20).mean(), d["close"].rolling(60).mean(), d["close"].rolling(100).mean()
        return (f < s) & (f.shift(1) >= s.shift(1)) & (d["close"] < t)
    def ex(side):
        def g(d, i, px):
            f, s = d["close"].rolling(20).mean(), d["close"].rolling(60).mean()
            back = (f < s) if side > 0 else (f > s)
            return px - side * 3 * d["atr14"].iat[i], None, None, back, None, 0.0
        return g
    return lambda which: _engine(data, f"P2_ma_cross_{which}", _both(lf, sf, ex(LONG), ex(SHORT)), _sides(which))


def heikin_ashi(data):
    """#3 Two green Heikin-Ashi candles after 3+ red ones while stochastic was oversold (<30) -> long;
    mirror for short. Stop 2 ATR, break-even after +1R handled by trailing 3 ATR; exit on the opposite pattern."""
    def parts(d):
        ho, hc = heikin(d)
        g = hc > ho
        st = stoch(d, 14, 7)
        return g, st
    def lf(d):
        g, st = parts(d)
        red_run = (~g).shift(2).rolling(3).sum() == 3
        return g & g.shift(1).fillna(False) & red_run & (st.rolling(5).min() < 30)
    def sf(d):
        g, st = parts(d)
        green_run = g.shift(2).rolling(3).sum() == 3
        return (~g) & (~g.shift(1).fillna(True)) & green_run & (st.rolling(5).max() > 70)
    def ex(side):
        def f(d, i, px):
            g, _ = parts(d)
            opp = ((~g) & (~g.shift(1).fillna(True))) if side > 0 else (g & g.shift(1).fillna(False))
            return px - side * 2 * d["atr14"].iat[i], None, 60, opp, 3.0, 0.0
        return f
    return lambda which: _engine(data, f"P3_heikin_ashi_{which}", _both(lf, sf, ex(LONG), ex(SHORT)), _sides(which))


def swing_contraction(data):
    """#4 In a trend, a correction where candles overlap (6-bar range < 2.5 ATR) then a break of that range
    in the trend direction. Stop at the other side of the range; trail 3 ATR."""
    def lf(d):
        hh, ll = d["high"].rolling(6).max().shift(1), d["low"].rolling(6).min().shift(1)
        return (d["close"] > d["sma50"]) & (d["sma50"] > d["sma200"]) & ((hh - ll) < 2.5 * d["atr14"]) & (d["close"] > hh)
    def sf(d):
        hh, ll = d["high"].rolling(6).max().shift(1), d["low"].rolling(6).min().shift(1)
        return (d["close"] < d["sma50"]) & (d["sma50"] < d["sma200"]) & ((hh - ll) < 2.5 * d["atr14"]) & (d["close"] < ll)
    def ex(side):
        def f(d, i, px):
            lvl = d["low"].rolling(6).min().iat[i] if side > 0 else d["high"].rolling(6).max().iat[i]
            return lvl, None, 60, None, 3.0, 0.0
        return f
    return lambda which: _engine(data, f"P4_swing_contraction_{which}", _both(lf, sf, ex(LONG), ex(SHORT)), _sides(which))


def engulfing(data):
    """#5a Bullish engulfing (green body engulfs the prior red body) -> buy next open, stop at its low, trail 3 ATR."""
    def lf(d):
        o, c = d["open"], d["close"]
        return (c > o) & (c.shift(1) < o.shift(1)) & (c >= o.shift(1)) & (o <= c.shift(1))
    def sf(d):
        o, c = d["open"], d["close"]
        return (c < o) & (c.shift(1) > o.shift(1)) & (c <= o.shift(1)) & (o >= c.shift(1))
    ex = lambda side: (lambda d, i, px: ((d["low"] if side > 0 else d["high"]).iat[i], None, 60, None, 3.0, 0.0))
    return lambda which: _engine(data, f"P5_engulfing_{which}", _both(lf, sf, ex(LONG), ex(SHORT)), _sides(which))


def hammer(data):
    """#5b Long shadow / hammer: shadow >= 2x body -> trade the next open in the shadow's rejection direction,
    stop at the shadow's extreme, trail 3 ATR."""
    def lf(d):
        body = (d["close"] - d["open"]).abs(); lw = d[["open", "close"]].min(axis=1) - d["low"]
        return (lw >= 2 * body) & (body > 0)
    def sf(d):
        body = (d["close"] - d["open"]).abs(); uw = d["high"] - d[["open", "close"]].max(axis=1)
        return (uw >= 2 * body) & (body > 0)
    ex = lambda side: (lambda d, i, px: ((d["low"] if side > 0 else d["high"]).iat[i], None, 60, None, 3.0, 0.0))
    return lambda which: _engine(data, f"P5_hammer_{which}", _both(lf, sf, ex(LONG), ex(SHORT)), _sides(which))


def bb_squeeze(data):
    """#7 Bollinger band width in its lowest 10% of the last 6 months, then a full candle above the 20 MA
    (low > MA) -> long; full candle below (high < MA) -> short. Stop at the prior candle's extreme; trail 3 ATR."""
    def width(d):
        sd = d["close"].rolling(20).std(); w = 4 * sd / d["sma21"]
        return w.rolling(126, min_periods=60).apply(lambda x: (x[-1] <= x).mean(), raw=True)
    def lf(d):
        return (width(d) <= 0.10) & (d["low"] > d["sma21"]) & (d["low"].shift(1) <= d["sma21"].shift(1))
    def sf(d):
        return (width(d) <= 0.10) & (d["high"] < d["sma21"]) & (d["high"].shift(1) >= d["sma21"].shift(1))
    ex = lambda side: (lambda d, i, px: ((d["low"] if side > 0 else d["high"]).iat[i - 1], None, 60, None, 3.0, 0.0))
    return lambda which: _engine(data, f"P7_bb_squeeze_{which}", _both(lf, sf, ex(LONG), ex(SHORT)), _sides(which))


def nr7(data):
    """#8 Narrowest range of the last 7 days -> next day buy above its high (sell below its low).
    Approximated on daily bars: signal on the NR7 close, enter next open in the direction of the close vs the
    NR7 midpoint, stop at the other side of the NR7 bar, trail 3 ATR."""
    def base(d):
        r = d["high"] - d["low"]
        return r <= r.rolling(7).min()
    def lf(d):
        return base(d) & (d["close"] > (d["high"] + d["low"]) / 2) & (d["close"] > d["sma50"])
    def sf(d):
        return base(d) & (d["close"] < (d["high"] + d["low"]) / 2) & (d["close"] < d["sma50"])
    ex = lambda side: (lambda d, i, px: ((d["low"] if side > 0 else d["high"]).iat[i], None, 60, None, 3.0, 0.0))
    return lambda which: _engine(data, f"P8_nr7_{which}", _both(lf, sf, ex(LONG), ex(SHORT)), _sides(which))


def rsi2_momentum(data):
    """#9 (their version, the opposite of Connors): BUY when RSI(2) goes above 90, SELL when it goes below 10;
    close on the opposite signal. Stop 3 ATR."""
    lf = lambda d: (d["rsi2"] > 90) & (d["rsi2"].shift(1) <= 90)
    sf = lambda d: (d["rsi2"] < 10) & (d["rsi2"].shift(1) >= 10)
    ex = lambda side: (lambda d, i, px: (px - side * 3 * d["atr14"].iat[i], None, 60, (d["rsi2"] < 10) if side > 0 else (d["rsi2"] > 90), None, 0.0))
    return lambda which: _engine(data, f"P9_rsi2_momentum_{which}", _both(lf, sf, ex(LONG), ex(SHORT)), _sides(which))


def _sides(which):
    return {"long": (LONG,), "short": (SHORT,), "both": (LONG, SHORT)}[which]


ALL = {"P1 Momentum reversal (stochastics + S/R)": momentum_reversal, "P2 MA crossover 20/60 + 100 trend": ma_cross_20_60_100,
       "P3 Heikin-Ashi reversal + stochastic": heikin_ashi, "P4 Swing: contraction then breakout": swing_contraction,
       "P5a Engulfing candle": engulfing, "P5b Hammer / long shadow": hammer, "P7 Bollinger squeeze": bb_squeeze,
       "P8 Narrow range (NR7)": nr7, "P9 RSI(2) momentum (buy >90, sell <10)": rsi2_momentum}
