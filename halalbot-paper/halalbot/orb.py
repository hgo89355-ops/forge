"""
Intraday 5-minute Opening Range Breakout, long and short (Zarattini & Aziz 2023 style).

Rules (per day, per stock):
  * 'Stocks in play': yesterday's 14-day ATR >= $0.50, price >= $5, and today's first 5-minute
    volume is among the top `top_n` of the universe relative to its own 14-day average first-5-min
    volume (relative volume >= 1). Only data up to 9:35 ET is used to pick them.
  * First 5-minute candle green -> buy-stop at its high; red -> sell-stop at its low (short).
    Doji (open == close) -> no trade.
  * Stop: stop_atr_frac x 14-day ATR away from entry (default 10% of ATR, as in the paper).
  * Exit: stop, optional R target, otherwise at the 15:55 bar close (never held overnight).
Bars must be 5-minute bars stamped with their START time in America/New_York, regular hours.
"""
import numpy as np
import pandas as pd


def orb_trades(bars5, daily, top_n=20, stop_atr_frac=0.10, r_target=None, min_price=5.0, min_atr=0.5, which="both"):
    first = {}
    for sym, b in bars5.items():
        b = b.between_time("09:30", "15:55")
        f = b[b.index.time == pd.Timestamp("09:30").time()]
        first[sym] = f.set_index(f.index.normalize())
    fvol = pd.DataFrame({s: f["volume"] for s, f in first.items()})
    rvol = fvol / fvol.rolling(14, min_periods=14).mean().shift(1)
    out = []
    for day in rvol.index:
        row = rvol.loc[day].dropna()
        cands = []
        for sym, rv in row.items():
            d = daily.get(sym)
            if d is None:
                continue
            prev = d.index[d.index < day]
            if len(prev) < 15:
                continue
            pdate = prev[-1]
            a, pc = d.at[pdate, "atr14"], d.at[pdate, "close"]
            if np.isnan(a) or a < min_atr or pc < min_price or rv < 1:
                continue
            cands.append((rv, sym, pdate, a))
        for rv, sym, pdate, a in sorted(cands, reverse=True)[:top_n]:
            f = first[sym].loc[day]
            side = 1 if f["close"] > f["open"] else (-1 if f["close"] < f["open"] else 0)
            if side == 0 or (which == "long" and side < 0) or (which == "short" and side > 0):
                continue
            b = bars5[sym]
            b = b[(b.index.normalize() == day)].between_time("09:35", "15:55")
            if b.empty:
                continue
            H, L, O, C = (b[k].to_numpy() for k in ("high", "low", "open", "close"))
            trig = f["high"] if side > 0 else f["low"]
            hit = np.flatnonzero(H >= trig) if side > 0 else np.flatnonzero(L <= trig)
            if not len(hit):
                continue
            k = hit[0]
            entry = max(trig, O[k]) if side > 0 else min(trig, O[k])
            stop = entry - side * stop_atr_frac * a
            tgt = entry + side * r_target * abs(entry - stop) if r_target else None
            xp, why = C[-1], "eod"
            for j in range(k, len(b)):
                if side > 0:
                    if j > k and O[j] <= stop:
                        xp, why = O[j], "stop"; break
                    if L[j] <= stop:
                        xp, why = stop, "stop"; break
                    if tgt is not None and H[j] >= tgt:
                        xp, why = tgt, "target"; break
                else:
                    if j > k and O[j] >= stop:
                        xp, why = O[j], "stop"; break
                    if H[j] >= stop:
                        xp, why = stop, "stop"; break
                    if tgt is not None and L[j] <= tgt:
                        xp, why = tgt, "target"; break
            out.append(dict(symbol=sym, engine=f"orb5_{which}", side=side, signal_date=pdate, entry_date=day,
                            entry_px=float(entry), stop=float(stop), exit_date=day, exit_px=float(xp),
                            reason=why, bars=1, ret=float(side * (xp / entry - 1)), score=float(rv),
                            risk_pct=float(abs(entry - stop) / entry)))
    return out
