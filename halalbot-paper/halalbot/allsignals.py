"""Every-signal versions of the 8 big-target entries (Horizon-style): one position per market,
re-entry allowed from the exit day's close. Exit = 1 ATR stop, 10 ATR target, 60-candle time exit."""
import numpy as np, pandas as pd
from .engines import _trade, LONG
from .indicators import ema, sma
from . import config

def _flag_signal(d, pole_ret=0.10, pole_len=10, flag_min=3, flag_max=8):
    c, h, l = (d[k].to_numpy() for k in ("close", "high", "low")); s50 = d["sma50"].to_numpy(); n = len(c)
    sig = np.zeros(n, bool)
    for i in range(pole_len + flag_max + 1, n):
        for fl in range(flag_min, flag_max + 1):
            fs, ps = i - fl, i - fl - pole_len
            if ps < 0 or c[fs - 1] / c[ps] - 1 < pole_ret: continue
            fh, flo = h[fs:i].max(), l[fs:i].min(); ph = c[fs - 1] - c[ps]
            if (fh - flo) > 0.5 * ph or (c[fs - 1] - flo) > 0.5 * ph: continue
            if c[i] > fh and c[i] > s50[i]: sig[i] = True; break
    return pd.Series(sig, index=d.index)

def _swing_high_level(d, k=3):
    hi = d["high"]; is_sh = (hi == hi.rolling(2 * k + 1, center=True).max())
    return hi.where(is_sh).shift(k).ffill(limit=60)

def entries(data, market):
    up = (market["close"] > sma(market["close"], 200))
    pick = lambda names: {s: d for s, d in data.items() if s in names}
    swing = {**pick(config.STOCKS), **pick(config.ETFS), **pick(config.CRYPTO), **pick(config.FUTURES)}
    crypto = pick(config.CRYPTO); btc_ok = data["BTC-USD"]["close"] > sma(data["BTC-USD"]["close"], 200)
    out = {k: {} for k in ("Crypto trend", "Turtle breakout", "52-week high", "Squeeze breakout", "Pullback in trend",
                           "Breakout-retest (S/R)", "Bull flag", "Dip after bull flag")}
    for s, d in crypto.items():
        out["Crypto trend"][s] = (d["close"] > d["hh20"]) & btc_ok.reindex(d.index).fillna(False)
    for s, d in swing.items():
        reg = up.reindex(d.index).fillna(False)
        out["Turtle breakout"][s] = (d["close"] > d["high"].rolling(55).max().shift(1)) & reg
        out["52-week high"][s] = (d["close"] > d["high"].rolling(252).max().shift(1)) & (d["close"] > d["sma50"]) & reg
        sd = d["close"].rolling(20).std(); width = 4 * sd / d["sma21"]
        rank = width.rolling(252, min_periods=126).apply(lambda x: (x[-1] <= x).mean(), raw=True)
        out["Squeeze breakout"][s] = (rank <= 0.10).shift(1).fillna(False).astype(bool) & (d["close"] > d["sma21"] + 2 * sd) & (d["close"] > d["sma200"])
        e20 = ema(d["close"], 20)
        out["Pullback in trend"][s] = ((d["close"] > d["sma50"]) & (d["sma50"] > d["sma200"]) & (d["low"] <= e20) & (d["close"] > e20) &
                                       (d["close"] > d["open"]) & (d["sma50"] > d["sma50"].shift(20)))
        lvl = _swing_high_level(d); broke = d["close"] > lvl.shift(1)
        lv = lvl.shift(1).where(broke).ffill(limit=10); recent = broke.rolling(10, min_periods=1).max().shift(1).fillna(0) > 0
        out["Breakout-retest (S/R)"][s] = recent & (d["low"] <= lv * 1.01) & (d["close"] > lv) & ~broke & (d["close"] > d["sma200"]) & reg
        fl = _flag_signal(d); out["Bull flag"][s] = fl
        fl_recent = fl.astype(float).rolling(20, min_periods=1).max().shift(1).fillna(0) > 0
        out["Dip after bull flag"][s] = (d["rsi2"] < 10) & (d["close"] > d["sma200"]) & fl_recent & reg
    return out

def walk_10r(data, sigs, name, stop_atr=1.0, tgt_atr=10.0, max_bars=60):
    trades = []
    for s, sig in sigs.items():
        d = data[s]; sg = sig.reindex(d.index).fillna(False).to_numpy()
        o, h, l, c, a = (d[k].to_numpy() for k in ("open", "high", "low", "close", "atr14")); n = len(o); i = 0
        while i < n - 1:
            if not sg[i] or np.isnan(a[i]): i += 1; continue
            ie = i + 1; px = o[ie]; stop = px - stop_atr * a[i]; tgt = px + tgt_atr * a[i]
            xi, xp, why = None, None, None
            for j in range(ie, min(n, ie + max_bars)):
                if l[j] <= stop: xi, xp, why = j, (min(o[j], stop) if j > ie else stop), "stop"; break
                if h[j] >= tgt: xi, xp, why = j, (max(o[j], tgt) if j > ie else tgt), "target"; break
            if xi is None: xi = min(n - 1, ie + max_bars - 1); xp, why = c[xi], "time"
            trades.append(_trade(s, name, d, i, px, stop, LONG, xi, xp, why)); i = xi   # signal on exit day may re-enter
    return trades
