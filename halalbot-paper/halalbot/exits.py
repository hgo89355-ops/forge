"""
Dip-tolerant exits. Every rule starts with the same fixed maximum loss: an initial stop of
`init_atr` x ATR below entry (that is the amount you agree to lose; position size turns it into
0.5% or 1% of the account). The rules differ only in how they decide a dip is 'just a dip'.
All decisions use information up to the current bar only.
"""
import numpy as np

from .engines import LONG, _trade


def walk(d, ie, e, a0, mode, init_atr=1.5, max_bars=120):
    o, h, l, c = (d[k].to_numpy() for k in ("open", "high", "low", "close"))
    a = d["atr14"].to_numpy()
    n = len(d)
    R = init_atr * a0
    stop = e - R
    peak = e
    below = 0
    left, realized = 1.0, 0.0            # for partial exits
    hit = set()
    ema20 = d["close"].ewm(span=20, adjust=False).mean().to_numpy()
    last = min(n - 1, ie + max_bars - 1)
    if mode == "hindsight":              # sell at the exact best price in the next 60 bars: impossible in reality
        j = ie + int(np.argmax(h[ie:min(n, ie + 60)]))
        return j, h[j], "perfect_peak"
    for j in range(ie, last + 1):
        # 1) the stop (never moves down) can be hit inside the bar
        if j > ie and o[j] <= stop:
            return j, realized + left * o[j] if mode == "partial" else o[j], "stop"
        if l[j] <= stop:
            px = stop
            return j, (realized + left * px) if mode == "partial" else px, "stop"
        # partial profit taking inside the bar
        if mode == "partial":
            for lvl, frac in ((2, 1 / 3), (4, 1 / 3)):
                tgt = e + lvl * R
                if h[j] >= tgt and lvl not in hit:
                    hit.add(lvl)
                    realized += frac * tgt
                    left -= frac
        # 2) end-of-bar updates (used from the next bar on)
        peak = max(peak, c[j])
        aj = a[j] if not np.isnan(a[j]) else a0
        gain_R = (peak - e) / R
        if mode == "chandelier3":                      # stop = highest close - 3 ATR
            stop = max(stop, peak - 3 * aj)
        elif mode == "close_confirm":                  # only sell after 2 CLOSES below (peak - 2 ATR)
            below = below + 1 if c[j] < peak - 2 * aj else 0
            if below >= 2 and j + 1 < n:
                return j + 1, o[j + 1], "2_closes_below"
        elif mode == "trend_break":                    # once +1R in profit, sell only on a close below the 20-day EMA
            if gain_R >= 1 and c[j] < ema20[j] and j + 1 < n:
                return j + 1, o[j + 1], "trend_break"
        elif mode == "ratchet":                        # +1R -> stop to break-even; +2R -> trail 3 ATR
            if gain_R >= 1:
                stop = max(stop, e)
            if gain_R >= 2:
                stop = max(stop, peak - 3 * aj)
        elif mode == "partial":                        # 1/3 at +2R, 1/3 at +4R, last 1/3 trails 3 ATR; break-even after +2R
            if gain_R >= 2:
                stop = max(stop, e, peak - 3 * aj)
        elif mode == "breathing":                      # first 5 bars: only the max-loss stop; then trail 2 ATR on closes
            if j - ie >= 5:
                stop = max(stop, peak - 2 * aj)
        elif mode == "swing_low":                      # stop = lowest low of the last 10 bars (ignores dips above it)
            if j - ie >= 3:
                stop = max(stop, l[max(ie, j - 9):j + 1].min())
        elif mode == "low20":                          # Turtle exit: close below the 20-day low
            lo20 = l[max(0, j - 20):j].min() if j > 0 else l[j]
            if j - ie >= 1 and c[j] < lo20 and j + 1 < n:
                return j + 1, o[j + 1], "20_day_low"
    px = c[last]
    return last, (realized + left * px) if mode == "partial" else px, "time"


def reexit(trades, data, mode, init_atr=1.5):
    out, busy = [], {}
    for t in sorted(trades, key=lambda x: (x["entry_date"], x["symbol"])):
        s = t["symbol"]
        if s in busy and t["entry_date"] <= busy[s]:
            continue
        d = data[s]
        i = d.index.get_loc(t["signal_date"])
        if i + 1 >= len(d):
            continue
        e = d["open"].iat[i + 1]
        a0 = d["atr14"].iat[i]
        if np.isnan(a0) or a0 <= 0:
            continue
        xi, xp, why = walk(d, i + 1, e, a0, mode, init_atr)
        tr = _trade(s, t["engine"], d, i, e, e - init_atr * a0, LONG, xi, xp, why)
        out.append(tr)
        busy[s] = tr["exit_date"]
    return out
