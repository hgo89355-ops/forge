"""Tweaks to the video strategies, long only, Alpaca costs (0.005% per side), QQQ 1-minute 2014-01..2024-01.
Honest split: every variant is ranked on 2014-2018 ONLY ("train"); 2019-2024 ("test") is never used for choosing.
Noise Band decisions are hourly (10:00, 11:00, ... 15:00) because the scheduled tasks can run at most hourly.
"""
import itertools, numpy as np, pandas as pd

COST = 0.00005
d = pd.read_parquet("/home/claude/halalbot/data/intraday_dl/qqq_1m.parquet")
d["t"] = pd.to_datetime(d.Timestamp); d = d.set_index("t")[["Open", "High", "Low", "Close", "Volume"]]
d.columns = ["o", "h", "l", "c", "v"]; d = d.between_time("09:30", "15:59")
days = [(k, g) for k, g in d.groupby(d.index.date) if len(g) >= 390]
D = [pd.Timestamp(k) for k, _ in days]
O = np.array([g.o.to_numpy()[:390] for _, g in days]); H = np.array([g.h.to_numpy()[:390] for _, g in days])
L = np.array([g.l.to_numpy()[:390] for _, g in days]); C = np.array([g.c.to_numpy()[:390] for _, g in days])
V = np.array([g.v.to_numpy()[:390] for _, g in days]).astype(float)
op = O[:, 0]; pc = np.r_[np.nan, C[:-1, -1]]
close_d = pd.Series(C[:, -1], index=D)
MOVE = np.abs(C / op[:, None] - 1)
VWAP = np.cumsum(C * V, 1) / np.maximum(np.cumsum(V, 1), 1)
sma = {n: close_d.rolling(n).mean().shift(1).to_numpy() for n in (20, 50, 200)}
trend_up = {n: (close_d.shift(1).to_numpy() > sma[n]) for n in (20, 50, 200)}
gap = op / pc - 1
TRAIN = np.array([t.year <= 2018 for t in D]); TEST = ~TRAIN


def stats(r, mask):
    r = r[mask]; eq = np.cumprod(1 + r); yrs = mask.sum() / 252
    tr = r[r != 0]
    return dict(trades=int(len(tr)), win=round(100 * (tr > 0).mean(), 1) if len(tr) else 0,
                per_year=round(100 * (eq[-1] ** (1 / yrs) - 1), 2), worst=round(100 * (eq / np.maximum.accumulate(eq) - 1).min(), 1))


def noise(k=1.0, look=14, start=30, every=60, stop="vwap", trend=None, gap_rule=None, max_entries=1):
    sig = np.full(MOVE.shape, np.nan)
    for i in range(look, len(D)): sig[i] = MOVE[i - look:i].mean(0)
    out = np.zeros(len(D))
    for i in range(look + 1, len(D)):
        if trend and not trend_up[trend][i]: continue
        if gap_rule == "up" and not gap[i] > 0: continue
        if gap_rule == "notdown" and gap[i] < -0.003: continue
        ub0 = max(op[i], pc[i]); pos = 0; r = 0.0; n_in = 0
        for m in range(start, 390, every):
            ub = ub0 * (1 + k * sig[i, m]); c = C[i, m]
            if pos:
                lvl = {"vwap": max(ub, VWAP[i, m]), "band": ub, "none": -1, "vwap_only": VWAP[i, m]}[stop]
                if c < lvl: r += c / e - 1 - 2 * COST; pos = 0
            if not pos and n_in < max_entries and m < 389 and c > ub: pos, e = 1, c; n_in += 1
        if pos: r += C[i, -1] / e - 1 - 2 * COST
        out[i] = r
    return out


def orb(rng=15, bar=5, tgt=2.0, trend=None, gap_rule=None, narrow=None, latest=120, exit_mode="target"):
    out = np.zeros(len(D)); rr = H[:, :rng].max(1) - L[:, :rng].min(1)
    med = pd.Series(rr / op).rolling(20).median().shift(1).to_numpy()
    for i in range(1, len(D)):
        if trend and not trend_up[trend][i]: continue
        if gap_rule == "up" and not gap[i] > 0: continue
        if narrow and not (rr[i] / op[i] < narrow * med[i]): continue
        hi, lo = H[i, :rng].max(), L[i, :rng].min()
        for m in range(rng + bar - 1, min(rng + latest, 389), bar):
            if C[i, m] > hi:
                e = C[i, m]; risk = e - lo; t = e + tgt * risk if exit_mode == "target" else None
                px = C[i, -1]
                for j in range(m + 1, 390):
                    if L[i, j] <= lo: px = lo; break
                    if exit_mode == "trail" and C[i, j] < VWAP[i, j]: px = C[i, j]; break
                    if t is not None and H[i, j] >= t: px = t; break
                out[i] = px / e - 1 - 2 * COST; break
            if C[i, m] < lo: break           # broke down first: no long trade today
    return out


if __name__ == "__main__":
    rows = []
    grid = dict(k=[0.75, 1.0, 1.25, 1.5], look=[10, 14, 20], start=[30, 60], stop=["vwap", "band", "none"],
                trend=[None, 50, 200], gap_rule=[None, "notdown"])
    for vals in itertools.product(*grid.values()):
        kw = dict(zip(grid.keys(), vals)); r = noise(**kw)
        rows.append(dict(strategy="Noise Band", **{k: str(v) for k, v in kw.items()},
                         **{f"train_{a}": b for a, b in stats(r, TRAIN).items()}, **{f"test_{a}": b for a, b in stats(r, TEST).items()}))
    print("noise done", flush=True)
    og = dict(rng=[15, 30], tgt=[1.5, 2.0, 3.0], trend=[None, 50, 200], gap_rule=[None, "up"], narrow=[None, 0.8],
              exit_mode=["target", "trail", "close"])
    for vals in itertools.product(*og.values()):
        kw = dict(zip(og.keys(), vals)); r = orb(**kw)
        rows.append(dict(strategy="ORB", **{k: str(v) for k, v in kw.items()},
                         **{f"train_{a}": b for a, b in stats(r, TRAIN).items()}, **{f"test_{a}": b for a, b in stats(r, TEST).items()}))
    T = pd.DataFrame(rows); T.to_csv("/home/claude/halalbot/results/tune_intraday.csv", index=False)
    for s in ("Noise Band", "ORB"):
        t = T[(T.strategy == s) & (T.train_trades >= 100)].sort_values("train_per_year", ascending=False)
        print(f"\n== {s}: top 10 by TRAIN (2014-18), with untouched TEST (2019-24)")
        print(t.head(10).drop(columns="strategy").to_string())
        print(f"{s} variants positive in test: {(t.test_per_year > 0).mean():.0%} of {len(t)}")
