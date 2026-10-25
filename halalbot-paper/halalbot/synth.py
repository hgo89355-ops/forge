"""Synthetic daily data for testing the pipeline (NOT market data)."""
import os

import numpy as np
import pandas as pd


def make(symbols, years=10, seed=1, mean_revert=0.0, out_dir=None):
    """Random-walk stocks with a shared market factor. mean_revert > 0 injects short-term reversal
    (an edge the RSI2/IBS engines should find); 0 means no edge exists anywhere."""
    rng = np.random.default_rng(seed)
    idx = pd.bdate_range("2015-01-02", periods=252 * years)
    n = len(idx)
    mkt = rng.normal(0.0004, 0.01, n)
    data = {}
    for k, s in enumerate(symbols):
        beta = rng.uniform(0.6, 1.4)
        idio = rng.normal(0, rng.uniform(0.008, 0.02), n)
        r = beta * mkt + idio
        if mean_revert:
            for t in range(3, n):
                r[t] -= mean_revert * r[t - 3:t].sum()
        close = 50 * np.exp(np.cumsum(r)) * rng.uniform(0.5, 4)
        gap = rng.normal(0, 0.003, n)
        open_ = np.r_[close[0], close[:-1]] * np.exp(gap)
        hi = np.maximum(open_, close) * np.exp(np.abs(rng.normal(0, 0.006, n)))
        lo = np.minimum(open_, close) * np.exp(-np.abs(rng.normal(0, 0.006, n)))
        vol = rng.lognormal(14, 0.4, n) * (1 + 3 * np.abs(r) / 0.02)
        df = pd.DataFrame(dict(open=open_, high=hi, low=lo, close=close, volume=vol), index=idx)
        df.index.name = "date"
        data[s] = df
        if out_dir:
            os.makedirs(out_dir, exist_ok=True)
            df.to_csv(os.path.join(out_dir, f"{s}.csv"))
    return data
