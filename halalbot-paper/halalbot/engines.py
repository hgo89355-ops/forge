"""
Strategy engines, long and short.

Every engine returns a list of trade dicts. Rules that apply to all of them:
  * Signals are computed on bar t's close. Entry is at bar t+1's OPEN.
  * side = +1 (long) or -1 (short). For shorts the stop is ABOVE entry and the target BELOW.
  * Stops and targets are checked bar by bar from the entry bar on. If a bar opens through the
    level we fill at the open (gap). If stop and target are both touched in one bar, the stop wins.
  * "Signal exits" fill at the NEXT bar's open. Time stops fill at that bar's close.
  * ret = side x (exit / entry - 1), before costs. Costs, borrow fees and sizing live in portfolio.py.
"""
import numpy as np
import pandas as pd

from .indicators import atr, ibs, momentum_12_1, realized_vol, rsi, sma

LONG, SHORT = 1, -1


# ----------------------------------------------------------------------------- prep
def prepare(df):
    df = df.copy()
    c = df["close"]
    df["sma3"], df["sma5"], df["sma10"], df["sma21"] = sma(c, 3), sma(c, 5), sma(c, 10), sma(c, 21)
    df["sma50"], df["sma100"], df["sma200"] = sma(c, 50), sma(c, 100), sma(c, 200)
    df["rsi2"] = rsi(c, 2)
    df["atr14"] = atr(df, 14)
    df["ibs"] = ibs(df)
    df["mom12_1"] = momentum_12_1(c)
    df["vol63"] = realized_vol(c, 63)
    df["vavg20"] = df["volume"].rolling(20, min_periods=20).mean()
    df["hh20"] = df["high"].rolling(20, min_periods=20).max().shift(1)
    df["ll20"] = df["low"].rolling(20, min_periods=20).min().shift(1)
    return df


# ----------------------------------------------------------------------------- exit path
def _walk(df, ie, entry_px, stop, side=LONG, target=None, max_bars=None, exit_sig=None, trail_atr=None):
    o, h, l, c = (df[k].to_numpy() for k in ("open", "high", "low", "close"))
    a = df["atr14"].to_numpy()
    sig = exit_sig.to_numpy() if exit_sig is not None else None
    n = len(df)
    best = entry_px
    for j in range(ie, n):
        if trail_atr is not None and j > ie and not np.isnan(a[j - 1]):
            if side == LONG:
                best = max(best, c[j - 1]); stop = max(stop, best - trail_atr * a[j - 1])
            else:
                best = min(best, c[j - 1]); stop = min(stop, best + trail_atr * a[j - 1])
        if side == LONG:
            if j > ie and o[j] <= stop:
                return j, o[j], "stop_gap"
            if l[j] <= stop:
                return j, stop, "stop"
            if target is not None:
                if j > ie and o[j] >= target:
                    return j, o[j], "target_gap"
                if h[j] >= target:
                    return j, target, "target"
        else:
            if j > ie and o[j] >= stop:
                return j, o[j], "stop_gap"
            if h[j] >= stop:
                return j, stop, "stop"
            if target is not None:
                if j > ie and o[j] <= target:
                    return j, o[j], "target_gap"
                if l[j] <= target:
                    return j, target, "target"
        if max_bars is not None and j - ie + 1 >= max_bars:
            return j, c[j], "time"
        if sig is not None and sig[j] and j + 1 < n:
            return j + 1, o[j + 1], "signal"
    return n - 1, c[n - 1], "end_of_data"


def _trade(sym, eng, df, i_sig, entry_px, stop, side, xi, xpx, why, score=0.0, **extra):
    idx = df.index
    return dict(symbol=sym, engine=eng, side=int(side), signal_date=idx[i_sig], entry_date=idx[i_sig + 1],
                entry_px=float(entry_px), stop=float(stop), exit_date=idx[xi], exit_px=float(xpx),
                reason=why, bars=int(xi - i_sig), ret=float(side * (xpx / entry_px - 1)), score=float(score),
                risk_pct=float(abs(entry_px - stop) / entry_px), **extra)


def _engine(data, eng, rules, sides):
    """rules: {side: (entry_fn(df)->bool Series, exit_fn(df, i, px)->(stop, target, max_bars, exit_sig, trail, score))}.
    One open trade per symbol per engine at a time."""
    out = []
    for sym, df in data.items():
        conds = {s: rules[s][0](df).fillna(False).to_numpy() for s in sides if s in rules}
        o = df["open"].to_numpy()
        i, n = 0, len(df)
        while i < n - 1:
            fired = next((s for s in conds if conds[s][i]), None)
            if fired is None:
                i += 1
                continue
            ie = i + 1
            stop, target, max_bars, sig, trail, score = rules[fired][1](df, i, o[ie])
            if (fired == LONG and stop >= o[ie]) or (fired == SHORT and stop <= o[ie]):
                i += 1
                continue
            xi, xpx, why = _walk(df, ie, o[ie], stop, fired, target, max_bars, sig, trail)
            out.append(_trade(sym, eng, df, i, o[ie], stop, fired, xi, xpx, why, score))
            i = xi + 1
    return out


def _sides(which):
    return {"long": (LONG,), "short": (SHORT,), "both": (LONG, SHORT)}[which]


# ----------------------------------------------------------------------------- engines
def rsi2_reversion(data, which="both", lo=10, hi=90, atr_stop=2.5, max_bars=7):
    """Connors-style: buy oversold dips in uptrends; short overbought pops in downtrends."""
    r = {
        LONG: (lambda d: (d["close"] > d["sma200"]) & (d["rsi2"] < lo),
               lambda d, i, px: (px - atr_stop * d["atr14"].iat[i], None, max_bars, d["close"] > d["sma5"], None, -d["rsi2"].iat[i])),
        SHORT: (lambda d: (d["close"] < d["sma200"]) & (d["rsi2"] > hi),
                lambda d, i, px: (px + atr_stop * d["atr14"].iat[i], None, max_bars, d["close"] < d["sma5"], None, d["rsi2"].iat[i] - 100)),
    }
    return _engine(data, f"rsi2_{which}", r, _sides(which))


def ibs_reversion(data, which="both", lo=0.2, hi=0.8, atr_stop=2.5, max_bars=5):
    """Paper 4.4 Internal Bar Strength."""
    r = {
        LONG: (lambda d: (d["ibs"] < lo) & (d["close"] > d["sma200"]) & (d["close"] < d["close"].shift(1)),
               lambda d, i, px: (px - atr_stop * d["atr14"].iat[i], None, max_bars, d["ibs"] > 0.7, None, -d["ibs"].iat[i])),
        SHORT: (lambda d: (d["ibs"] > hi) & (d["close"] < d["sma200"]) & (d["close"] > d["close"].shift(1)),
                lambda d, i, px: (px + atr_stop * d["atr14"].iat[i], None, max_bars, d["ibs"] < 0.3, None, d["ibs"].iat[i] - 1)),
    }
    return _engine(data, f"ibs_{which}", r, _sides(which))


def channel_fade(data, which="both", atr_stop=2.0, max_bars=10):
    """Paper 3.15 Donchian: fade a touch of the 20-day floor/ceiling that closes back inside, with the trend."""
    r = {
        LONG: (lambda d: (d["low"] <= d["ll20"]) & (d["close"] > d["ll20"]) & (d["close"] > d["sma200"]),
               lambda d, i, px: (px - atr_stop * d["atr14"].iat[i], None, max_bars, d["close"] > d["sma21"], None, 0.0)),
        SHORT: (lambda d: (d["high"] >= d["hh20"]) & (d["close"] < d["hh20"]) & (d["close"] < d["sma200"]),
                lambda d, i, px: (px + atr_stop * d["atr14"].iat[i], None, max_bars, d["close"] < d["sma21"], None, 0.0)),
    }
    return _engine(data, f"channel_{which}", r, _sides(which))


def breakout20(data, which="both", vol_mult=1.5, atr_stop=1.5, r_target=2.0, max_bars=15, trail=None):
    """/trader-scanner 20-day breakout (and breakdown) + /trader-exit 2R target, trend and volume confirmed."""
    def ex(side):
        def f(d, i, px):
            stop = px - side * atr_stop * d["atr14"].iat[i]
            tgt = None if r_target is None else px + side * r_target * abs(px - stop)
            return stop, tgt, max_bars, None, trail, d["volume"].iat[i] / d["vavg20"].iat[i]
        return f
    r = {
        LONG: (lambda d: (d["close"] > d["hh20"]) & (d["volume"] > vol_mult * d["vavg20"]) &
               (d["close"] > d["sma50"]) & (d["sma50"] > d["sma200"]), ex(LONG)),
        SHORT: (lambda d: (d["close"] < d["ll20"]) & (d["volume"] > vol_mult * d["vavg20"]) &
                (d["close"] < d["sma50"]) & (d["sma50"] < d["sma200"]), ex(SHORT)),
    }
    return _engine(data, f"breakout{'_trail' if trail else ''}_{which}", r, _sides(which))


def triple_ma(data, which="both", atr_stop=3.0):
    """Paper 3.13: MA(3) > MA(10) > MA(21) long (mirror for short); exit when MA(3) crosses MA(10)."""
    r = {
        LONG: (lambda d: (d["sma3"] > d["sma10"]) & (d["sma10"] > d["sma21"]) & (d["close"] > d["sma200"]),
               lambda d, i, px: (px - atr_stop * d["atr14"].iat[i], None, None, d["sma3"] <= d["sma10"], None, 0.0)),
        SHORT: (lambda d: (d["sma3"] < d["sma10"]) & (d["sma10"] < d["sma21"]) & (d["close"] < d["sma200"]),
                lambda d, i, px: (px + atr_stop * d["atr14"].iat[i], None, None, d["sma3"] >= d["sma10"], None, 0.0)),
    }
    return _engine(data, f"triple_ma_{which}", r, _sides(which))


def bull_flag(data, pole_ret=0.10, pole_len=10, flag_min=3, flag_max=8, r_target=2.0, max_bars=15):
    """/trader-scanner bull flag: strong pole, tight shallow pause, break of the flag high. Long only."""
    out = []
    for sym, df in data.items():
        c, h, l, o = (df[k].to_numpy() for k in ("close", "high", "low", "open"))
        s50 = df["sma50"].to_numpy()
        n, i = len(df), pole_len + flag_max + 1
        while i < n - 1:
            hit = False
            for fl in range(flag_min, flag_max + 1):
                fs, ps = i - fl, i - fl - pole_len
                if ps < 0:
                    break
                if c[fs - 1] / c[ps] - 1 < pole_ret:
                    continue
                fh, flo = h[fs:i].max(), l[fs:i].min()
                ph = c[fs - 1] - c[ps]
                if (fh - flo) > 0.5 * ph or (c[fs - 1] - flo) > 0.5 * ph:
                    continue
                if c[i] > fh and c[i] > s50[i] and flo < o[i + 1]:
                    ie = i + 1
                    tgt = o[ie] + r_target * (o[ie] - flo)
                    xi, xpx, why = _walk(df, ie, o[ie], flo, LONG, tgt, max_bars)
                    out.append(_trade(sym, "bull_flag", df, i, o[ie], flo, LONG, xi, xpx, why, c[fs - 1] / c[ps] - 1))
                    i, hit = xi + 1, True
                break
            if not hit:
                i += 1
    return out


def momentum_rotation(data, market, top_k=5, short_k=0, ma_len=200, cat_stop_atr=4.0, name="momentum"):
    """
    Paper 3.1 / 4.1 / 4.1.2. Each month: long the top_k names by 12-1 momentum that are above their
    200-day MA, while the market is above its 200-day MA. If short_k > 0, also short the bottom
    short_k names that are below their 200-day MA (paper's long-short version). Held names are kept.
    """
    data = {s: d.reindex(market.index) for s, d in data.items()}   # one shared calendar
    syms = list(data)
    mom = pd.DataFrame({s: data[s]["mom12_1"] for s in syms})
    above = pd.DataFrame({s: data[s]["close"] > data[s][f"sma{ma_len}"] for s in syms})
    idx = mom.index
    mkt_ok = (market["close"] > sma(market["close"], ma_len)).reindex(idx).fillna(False).to_numpy()
    month = idx.to_period("M")
    rebal = np.flatnonzero(np.r_[False, month[1:] != month[:-1]])
    held, out = {}, []

    def stop_of(s, side, si, ie):
        d = data[s]
        return d["open"].iat[ie] - side * cat_stop_atr * d["atr14"].iat[si]

    def close_pos(s, xi, px, why):
        side, si, ie = held.pop(s)
        d = data[s]
        out.append(_trade(s, name, d, si, d["open"].iat[ie], stop_of(s, side, si, ie), side, xi, px, why,
                          float(mom[s].iat[si])))

    for k, r in enumerate(rebal):
        si = r - 1
        if si < 252:
            continue
        m = mom.iloc[si]
        longs = set(m[above.iloc[si] & m.notna()].sort_values(ascending=False).index[:top_k]) if mkt_ok[si] else set()
        shorts = set(m[(~above.iloc[si]) & m.notna() & (m < 0)].sort_values().index[:short_k]) if short_k else set()
        want = {**{s: LONG for s in longs}, **{s: SHORT for s in shorts}}
        for s in list(held):
            if want.get(s) != held[s][0]:
                close_pos(s, r, data[s]["open"].iat[r], "rebalance")
        for s, side in want.items():
            if s not in held and not np.isnan(data[s]["open"].iat[r]):
                held[s] = (side, si, r)
        nxt = rebal[k + 1] if k + 1 < len(rebal) else len(idx)
        for s in list(held):
            side, si0, ie = held[s]
            d = data[s]
            st = stop_of(s, side, si0, ie)
            seg = (d["low"] if side == LONG else d["high"]).to_numpy()[r:nxt]
            hit = np.flatnonzero(seg <= st) if side == LONG else np.flatnonzero(seg >= st)
            if len(hit):
                j = r + hit[0]
                op = d["open"].iat[j]
                px = (min(op, st) if side == LONG else max(op, st)) if j > ie else st
                close_pos(s, j, px, "stop")
    for s in list(held):
        close_pos(s, len(idx) - 1, data[s]["close"].iat[-1], "end_of_data")
    return out


def pairs(data, pair_list, two_sided=True, formation=252, z_win=60, z_entry=2.0, z_exit=0.5, z_stop=3.5,
          max_bars=30, retest=63, adf_p=0.05):
    """
    Paper 3.8 pairs trading. Pairs are re-tested for cointegration every `retest` bars on the
    previous `formation` bars; untested or broken pairs are not traded.
    two_sided=True : classic dollar-neutral trade, short the rich leg AND buy the cheap leg.
    two_sided=False: buy the cheap leg only.
    Both legs are emitted as separate trades sharing a pair_id so the simulator sizes them together.
    """
    from statsmodels.tsa.stattools import adfuller
    out, pid = [], 0
    for a, b in pair_list:
        if a not in data or b not in data:
            continue
        px = pd.concat([data[a]["close"], data[b]["close"]], axis=1, keys=[a, b]).dropna()
        la, lb = np.log(px[a]), np.log(px[b])
        n = len(px)
        beta, ok = np.full(n, np.nan), np.zeros(n, bool)
        for t0 in range(formation, n, retest):
            ya, yb = la.iloc[t0 - formation:t0].to_numpy(), lb.iloc[t0 - formation:t0].to_numpy()
            bt = np.polyfit(yb, ya, 1)[0]
            p = adfuller(ya - bt * yb, maxlag=1, autolag=None)[1]
            beta[t0:t0 + retest], ok[t0:t0 + retest] = bt, p < adf_p
        spread = la - pd.Series(beta, index=px.index) * lb
        z = ((spread - spread.rolling(z_win).mean()) / spread.rolling(z_win).std()).to_numpy()
        da, db = data[a].reindex(px.index), data[b].reindex(px.index)
        i = formation + z_win
        while i < n - 1:
            if not (ok[i] and not np.isnan(z[i]) and abs(z[i]) >= z_entry):
                i += 1
                continue
            sgn = np.sign(z[i])                      # +: a rich / b cheap ; -: a cheap / b rich
            ie, j, xi, why = i + 1, i + 1, None, "time"
            while j < n:
                if j > ie and not ok[j]:
                    xi, why = j, "pair_broke"; break
                if sgn * z[j] <= z_exit:
                    xi, why = j, "converged"; break
                if sgn * z[j] >= z_stop:
                    xi, why = j, "z_stop"; break
                if j - ie + 1 >= max_bars:
                    xi, why = j, "time"; break
                j += 1
            if xi is None:
                xi, why = n - 1, "end_of_data"
            exit_next = why in ("converged", "z_stop") and xi + 1 < n
            legs = [(b, LONG, db), (a, SHORT, da)] if sgn > 0 else [(a, LONG, da), (b, SHORT, db)]
            if not two_sided:
                legs = legs[:1]
            pid += 1
            for sym, side, d in legs:
                ent = d["open"].iat[ie]
                xpx = d["open"].iat[xi + 1] if exit_next else d["close"].iat[xi]
                xk = xi + 1 if exit_next else xi
                stop = ent - side * 2.0 * d["atr14"].iat[i]      # sizing proxy; real exit is the z-stop
                out.append(_trade(sym, "pairs_2sided" if two_sided else "pairs_long", d, i, ent, stop, side,
                                  xk, xpx, why, abs(z[i]), pair=f"{a}/{b}", pair_id=pid, pair_legs=len(legs)))
            i = (xi + 1 if exit_next else xi) + 1
    return out


def ENGINE_SET(which_sides=("long", "short", "both")):
    """All single-symbol engines in every direction variant."""
    e = {}
    for w in which_sides:
        e[f"rsi2_{w}"] = lambda d, w=w: rsi2_reversion(d, w)
        e[f"ibs_{w}"] = lambda d, w=w: ibs_reversion(d, w)
        e[f"channel_{w}"] = lambda d, w=w: channel_fade(d, w)
        e[f"breakout_{w}"] = lambda d, w=w: breakout20(d, w)
        e[f"breakout_trail_{w}"] = lambda d, w=w: breakout20(d, w, r_target=None, trail=3.0, max_bars=60)
        e[f"triple_ma_{w}"] = lambda d, w=w: triple_ma(d, w)
    e["bull_flag"] = bull_flag
    return e
