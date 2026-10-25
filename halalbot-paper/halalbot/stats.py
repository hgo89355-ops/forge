"""
Evaluation: metrics, the coin-flip test, win-rate significance, and multiple-testing control.
"""
import math

import numpy as np
import pandas as pd
from scipy import stats as st


def trade_metrics(rets):
    r = np.asarray(rets, float)
    if len(r) == 0:
        return dict(trades=0)
    w, l = r[r > 0], r[r <= 0]
    avg_w = w.mean() if len(w) else 0.0
    avg_l = -l.mean() if len(l) else 0.0
    be = avg_l / (avg_w + avg_l) if (avg_w + avg_l) > 0 else np.nan   # win rate needed to break even
    k, n = len(w), len(r)
    z = 1.96
    centre = (k + z * z / 2) / (n + z * z)
    half = z * math.sqrt(k * (n - k) / n + z * z / 4) / (n + z * z)
    p_wr = st.binomtest(k, n, be, alternative="greater").pvalue if 0 < be < 1 else np.nan
    return dict(trades=n, win_rate=k / n, win_rate_lo=centre - half, win_rate_hi=centre + half,
                breakeven_win_rate=be, p_winrate_beats_breakeven=p_wr,
                avg_trade=r.mean(), avg_win=avg_w, avg_loss=-avg_l,
                profit_factor=w.sum() / -l.sum() if l.sum() < 0 else np.inf,
                expectancy_t=r.mean() / (r.std(ddof=1) / math.sqrt(n)) if n > 1 and r.std() > 0 else np.nan)


def equity_metrics(eq):
    if len(eq) < 2:
        return {}
    r = eq.pct_change().dropna()
    yrs = (eq.index[-1] - eq.index[0]).days / 365.25
    cagr = (eq.iloc[-1] / eq.iloc[0]) ** (1 / yrs) - 1 if yrs > 0 else np.nan
    dd = eq / eq.cummax() - 1
    sharpe = r.mean() / r.std() * np.sqrt(252) if r.std() > 0 else np.nan
    downside = r[r < 0].std()
    return dict(start=eq.index[0].date(), end=eq.index[-1].date(), final_equity=eq.iloc[-1],
                cagr=cagr, sharpe=sharpe,
                sortino=r.mean() / downside * np.sqrt(252) if downside > 0 else np.nan,
                max_drawdown=dd.min(), calmar=cagr / -dd.min() if dd.min() < 0 else np.nan,
                worst_day=r.min(), pct_days_invested=np.nan)


def net_trade_returns(trades, slippage_bps=5.0):
    s = slippage_bps / 1e4
    out = []
    for t in trades:
        side = t.get("side", 1)
        gross = side * (t["exit_px"] / t["entry_px"] - 1)
        out.append(gross - 2 * s)
    return np.array(out)


def coin_flip_test(trades, data, n_sims=1000, slippage_bps=5.0, seed=0, warmup=200):
    """
    'Does it survive a coin flip?' For every real trade we draw a random trade in the SAME stock,
    in the SAME period, held for the SAME number of bars, entered at a random bar's open and exited
    at the close of the matching bar (same costs). If the real strategy's average net trade is not
    above ~95% of these random versions, its entry signal adds nothing over luck.
    Returns the p-value (share of random runs >= real) and the random distribution summary.
    """
    rng = np.random.default_rng(seed)
    real = net_trade_returns(trades, slippage_bps)
    if len(real) == 0:
        return dict(p_value=np.nan)
    s = slippage_bps / 1e4
    sym_arrays = {sym: (d["open"].to_numpy(), d["close"].to_numpy(), d.index) for sym, d in data.items()}
    lo_d, hi_d = min(t["entry_date"] for t in trades), max(t["exit_date"] for t in trades)
    plans = []
    for t in trades:
        o, c, idx = sym_arrays[t["symbol"]]
        lo = max(warmup, idx.searchsorted(lo_d))
        hold = max(int(t["bars"]), 1)
        hi = min(len(idx), idx.searchsorted(hi_d, side="right")) - hold
        if hi <= lo:
            continue
        e = int(np.clip(idx.searchsorted(t["entry_date"]), lo, hi - 1))
        plans.append((o, c, lo, hi, hold, e, t.get("side", 1)))
    # Null = the SAME trades shifted in time by one common random offset (wrapping around the
    # period). This keeps how trades cluster together (e.g. many breakouts in the same rally), so
    # the random runs are as 'lumpy' as the real ones. Independent random dates would make the
    # test far too easy to pass for any strategy whose trades bunch up.
    means = np.empty(n_sims)
    wins = np.empty(n_sims)
    for k in range(n_sims):
        frac = rng.uniform(0.05, 0.95)
        rs = np.empty(len(plans))
        for m, (o, c, lo, hi, hold, e, side) in enumerate(plans):
            width = hi - lo
            i = lo + (e - lo + int(frac * width)) % width
            rs[m] = side * (c[i + hold - 1] / o[i] - 1) - 2 * s
        means[k], wins[k] = rs.mean(), (rs > 0).mean()
    return dict(p_value=float((means >= real.mean()).mean()),
                real_avg_trade=float(real.mean()), random_avg_trade=float(means.mean()),
                random_95pct=float(np.quantile(means, 0.95)),
                real_win_rate=float((real > 0).mean()), random_win_rate=float(wins.mean()))


def deflated_sharpe(sharpe_obs_daily, n_obs, n_trials, skew=0.0, kurt=3.0, trial_sharpes_var=None):
    """
    Bailey & Lopez de Prado deflated Sharpe ratio: the probability that the observed (daily) Sharpe
    is above what the BEST of `n_trials` random strategies would show by luck. Use it because we are
    deliberately trying many combinations: the more we try, the higher the bar.
    """
    if n_trials < 1 or n_obs < 3:
        return np.nan
    v = trial_sharpes_var if trial_sharpes_var is not None else 1.0 / n_obs
    emc = 0.5772156649
    sr0 = math.sqrt(v) * ((1 - emc) * st.norm.ppf(1 - 1 / n_trials) + emc * st.norm.ppf(1 - 1 / (n_trials * math.e))) \
        if n_trials > 1 else 0.0
    num = (sharpe_obs_daily - sr0) * math.sqrt(n_obs - 1)
    den = math.sqrt(1 - skew * sharpe_obs_daily + (kurt - 1) / 4 * sharpe_obs_daily ** 2)
    return float(st.norm.cdf(num / den))


def by_year(taken):
    if taken is None or len(taken) == 0:
        return pd.DataFrame()
    t = taken.copy()
    t["year"] = pd.to_datetime(t["exit_date"]).dt.year
    return t.groupby("year").agg(trades=("pnl", "size"), win_rate=("pnl", lambda x: (x > 0).mean()),
                                 pnl=("pnl", "sum"))
