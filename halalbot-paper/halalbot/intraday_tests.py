"""Intraday tests on 15-minute / 1-hour bars: the user's ORB and the user's Box method, as described in chat."""
import numpy as np
import pandas as pd


def load(path):
    import os
    out = {}
    for f in os.listdir(path):
        if f.endswith(".csv"):
            d = pd.read_csv(os.path.join(path, f), parse_dates=["date"], index_col="date").sort_index()
            d = d[(d.index.time >= pd.Timestamp("09:30").time()) & (d.index.time < pd.Timestamp("16:00").time())]
            out[f[:-4]] = d
    return out


def _days(d):
    return {k: g for k, g in d.groupby(d.index.normalize())}


def orb(bars, stop_mode="mid", target_mult=1.0, need_box_break=False, side_mode="long", n_or=2):
    """First n_or candles = opening range. A candle CLOSING above the range high -> buy at the next
    candle's open (short mirror if side_mode allows). Stop at the range midpoint ('mid') or the other
    side ('far'). Target = entry + target_mult x range height (None = hold to close). Flat at the close.
    need_box_break: also require price above yesterday's high (your 'box top')."""
    out = []
    for s, d in bars.items():
        days = _days(d)
        keys = sorted(days)
        for k, day in enumerate(keys):
            g = days[day]
            if len(g) < n_or + 2:
                continue
            prev = days[keys[k - 1]] if k else None
            orh, orl = g["high"].iloc[:n_or].max(), g["low"].iloc[:n_or].min()
            rng = orh - orl
            if rng <= 0:
                continue
            mid = (orh + orl) / 2
            C, O, H, L = (g[c].to_numpy() for c in ("close", "open", "high", "low"))
            for j in range(n_or, len(g) - 1):
                side = 1 if C[j] > orh else (-1 if C[j] < orl else 0)
                if side == 0 or (side < 0 and side_mode == "long"):
                    continue
                if need_box_break and (prev is None or (side > 0 and C[j] <= prev["high"].max()) or (side < 0 and C[j] >= prev["low"].min())):
                    continue
                e = O[j + 1]
                stop = mid if stop_mode == "mid" else (orl if side > 0 else orh)
                if (side > 0 and stop >= e) or (side < 0 and stop <= e):
                    break
                tgt = e + side * target_mult * rng if target_mult else None
                xp, why = C[-1], "close"
                for m in range(j + 1, len(g)):
                    if side > 0:
                        if L[m] <= stop: xp, why = (min(O[m], stop) if m > j + 1 else stop), "stop"; break
                        if tgt and H[m] >= tgt: xp, why = max(O[m], tgt) if m > j + 1 else tgt, "target"; break
                    else:
                        if H[m] >= stop: xp, why = (max(O[m], stop) if m > j + 1 else stop), "stop"; break
                        if tgt and L[m] <= tgt: xp, why = min(O[m], tgt) if m > j + 1 else tgt, "target"; break
                out.append(dict(symbol=s, day=day, side=side, entry=e, stop=stop, exit=xp, why=why,
                                ret=side * (xp / e - 1), risk=abs(e - stop) / e))
                break
    return pd.DataFrame(out)


def box_method(bars):
    """The Box method exactly as written in our earlier chat (long only, intraday):
    yesterday's high/low/mid = the box; skip if yesterday was a trend day (body > 80% of range) or fell
    > 2%; a hammer (lower wick >= 2x body, closes in the top part) whose low is in the LOWER half of the
    box; buy when the next candle closes above the hammer's high; stop = hammer low - 0.05%; only if
    (mid - entry) >= 1.5 x (entry - stop); sell half at the midpoint and move the stop to entry; sell
    the rest at the box top; flat at the close. One trade per stock per day."""
    out = []
    for s, d in bars.items():
        days = _days(d)
        keys = sorted(days)
        for k in range(1, len(keys)):
            p, g = days[keys[k - 1]], days[keys[k]]
            ph, pl, po, pc = p["high"].max(), p["low"].min(), p["open"].iloc[0], p["close"].iloc[-1]
            if ph <= pl or abs(pc - po) > 0.8 * (ph - pl) or pc < po * 0.98:
                continue
            mid = (ph + pl) / 2
            O, H, L, C = (g[c].to_numpy() for c in ("open", "high", "low", "close"))
            done = False
            for j in range(len(g) - 2):
                body = abs(C[j] - O[j])
                lw = min(O[j], C[j]) - L[j]
                rngj = H[j] - L[j]
                hammer = rngj > 0 and body > 0 and lw >= 2 * body and (H[j] - max(O[j], C[j])) <= 0.3 * rngj
                if not (hammer and pl <= L[j] <= mid):
                    continue
                if C[j + 1] <= H[j]:
                    continue
                e = C[j + 1]
                stop = L[j] * (1 - 0.0005)
                if e <= stop or (mid - e) < 1.5 * (e - stop):
                    continue
                half_done, stp, pnl, why = False, stop, 0.0, "close"
                for m in range(j + 2, len(g)):
                    if L[m] <= stp:
                        px = min(O[m], stp)
                        pnl += (0.5 if half_done else 1.0) * (px / e - 1)
                        why = "breakeven" if half_done else "stop"
                        break
                    if not half_done and H[m] >= mid:
                        pnl += 0.5 * (mid / e - 1); half_done, stp = True, e
                    if half_done and H[m] >= ph:
                        pnl += 0.5 * (ph / e - 1); why = "top"; break
                else:
                    pnl += (0.5 if half_done else 1.0) * (C[-1] / e - 1)
                out.append(dict(symbol=s, day=keys[k], side=1, entry=e, stop=stop, exit=np.nan, why=why,
                                ret=pnl, risk=(e - stop) / e))
                done = True
                break
    return pd.DataFrame(out)


def summarize(df, slip_bps=5.0, capital=5000, risk=0.005):
    if df is None or df.empty:
        return dict(trades=0)
    net = df["ret"] - 2 * slip_bps / 1e4
    R = net / df["risk"].clip(lower=1e-4)
    w, l = R[R > 0], R[R <= 0]
    be = -l.mean() / (w.mean() - l.mean()) if len(w) and len(l) else np.nan
    days = df["day"].nunique()
    # dollars: each trade risks `risk` of the starting capital (no compounding, positions capped at 25%)
    pos = np.minimum(capital * risk / df["risk"].clip(lower=1e-4), capital * 0.25)
    dollars = (pos * net).sum()
    return dict(trades=len(df), trading_days=days, win_rate=(net > 0).mean(), breakeven_win_rate=be,
                avg_win_R=w.mean(), avg_loss_R=l.mean(), profit_per_trade_R=R.mean(),
                t_stat=R.mean() / (R.std() / np.sqrt(len(R))) if len(R) > 2 else np.nan,
                profit_dollars=dollars, avg_trade_pct=net.mean())
