"""
Forecast accuracy for Kronos and /trader-timemachine.

Input: a table with columns date, symbol, p_up  (probability the close `horizon` bars later is
above the close on `date`). For Kronos, p_up = share of sampled forecast paths that end above
today's close. For timemachine, p_up = its stated odds of the setup working.

What we measure, all on data the forecaster was NOT tuned on:
  * hit rate of the up/down call vs. the naive baselines (always "up", and 50%)
  * Brier score vs. the always-base-rate forecast (skill score > 0 means real information)
  * calibration: when it says 60%, how often is it actually right?
  * walk-forward calibration: we learn the mapping stated-probability -> real frequency on past
    data only, and use the CALIBRATED probability (p_up_cal) in the strategy filters.
"""
import numpy as np
import pandas as pd
from scipy import stats as st


def attach_outcomes(fc, data, horizon=5):
    rows = []
    for sym, g in fc.groupby("symbol"):
        if sym not in data:
            continue
        c = data[sym]["close"]
        fut = c.shift(-horizon)
        g = g.copy()
        g["close0"] = c.reindex(g["date"]).to_numpy()
        g["close_h"] = fut.reindex(g["date"]).to_numpy()
        rows.append(g)
    out = pd.concat(rows).dropna(subset=["close0", "close_h"])
    out["up"] = (out["close_h"] > out["close0"]).astype(int)
    return out


def score(df, p="p_up"):
    y, q = df["up"].to_numpy(), df[p].clip(0, 1).to_numpy()
    n = len(y)
    call = (q >= 0.5).astype(int)
    hits = int((call == y).sum())
    base = y.mean()
    brier = np.mean((q - y) ** 2)
    brier_base = np.mean((base - y) ** 2)
    naive = max(base, 1 - base)
    bins = pd.cut(q, [0, .3, .4, .45, .5, .55, .6, .7, 1.0], include_lowest=True)
    cal = pd.DataFrame({"said": q, "actual": y, "bin": bins}).groupby("bin", observed=True).agg(
        n=("actual", "size"), said=("said", "mean"), actual=("actual", "mean"))
    return dict(n=n, hit_rate=hits / n, always_up_hit_rate=naive,
                p_beats_coin=st.binomtest(hits, n, 0.5, alternative="greater").pvalue,
                p_beats_always_up=st.binomtest(hits, n, naive, alternative="greater").pvalue,
                brier=brier, brier_skill=1 - brier / brier_base if brier_base > 0 else np.nan,
                calibration=cal)


def walk_forward_calibrate(df, p="p_up", min_train=250, bins=10, gap_days=9, k=30.0):
    """Map stated probabilities to observed frequencies using ONLY forecasts whose outcome was
    already known (dated at least `gap_days` earlier). Binned, and shrunk towards the past base rate."""
    df = df.sort_values("date").reset_index(drop=True)
    edges = np.linspace(0, 1, bins + 1)
    b = np.clip(np.digitize(df[p].clip(0, 1), edges) - 1, 0, bins - 1)
    y = df["up"].to_numpy()
    d = df["date"].to_numpy()
    cut = np.searchsorted(d, d - np.timedelta64(gap_days, "D"), side="left")  # rows [0, cut) are usable
    cum_n = np.zeros((len(df) + 1, bins))
    cum_k = np.zeros((len(df) + 1, bins))
    for i in range(len(df)):
        cum_n[i + 1], cum_k[i + 1] = cum_n[i], cum_k[i]
        cum_n[i + 1, b[i]] += 1
        cum_k[i + 1, b[i]] += y[i]
    out = np.full(len(df), np.nan)
    for i in range(len(df)):
        m = cut[i]
        tot = cum_n[m].sum()
        if tot < min_train:
            continue
        base = cum_k[m].sum() / tot
        out[i] = (cum_k[m, b[i]] + k * base) / (cum_n[m, b[i]] + k)
    df[p + "_cal"] = out
    return df
