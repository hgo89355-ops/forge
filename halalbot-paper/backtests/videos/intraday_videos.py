"""Backtests of two intraday strategies from Mohamed's Instagram videos, on QQQ 1-minute data 2014-01 to 2024-01
(Hugging Face Maxim37/timeseries-1m-QQQ-10y, checked against Yahoo daily: all 2,523 days present, daily-return
correlation 0.9993). Regular hours only (09:30-16:00 New York). Cost 0.02% per side (spread + slippage on QQQ).

1. ORB (QuantLab video): range = first 15 minutes. Entry = first bar (5-min bars) that CLOSES outside the range,
   at that bar's close. Stop = other side of the range. Target = 2x risk. Anything still open sells at 15:59.
   Variants: target 1R/1.5R/2R/3R/close-only, stop at mid-range, 15-min bars, long-only.
2. Noise Band (QuantLab video; Zarattini, Aziz & Barbon 2024, "Beat the Market"): sigma(t) = 14-day average of
   |price at time t / today's open - 1|. Upper band = max(open, yesterday close) x (1 + sigma(t)),
   lower = min(open, yesterday close) x (1 - sigma(t)). Checked every 30 minutes from 10:00: above upper -> long,
   below lower -> short; trailing stop = the band or VWAP, whichever is tighter; flat at the close. No leverage.
Random entries: same day, a random 5-minute bar between 09:45 and 15:00, long, stop/target = same risk distance
as that day's ORB range and same target multiple (1,000 random runs of the whole period).
"""
import numpy as np, pandas as pd, sys

COST = 0.0002
d = pd.read_parquet("/home/claude/halalbot/data/intraday_dl/qqq_1m.parquet")
d["t"] = pd.to_datetime(d.Timestamp); d = d.set_index("t")[["Open", "High", "Low", "Close", "Volume"]]
d.columns = ["o", "h", "l", "c", "v"]
d = d.between_time("09:30", "15:59")
days = {k: g for k, g in d.groupby(d.index.date) if len(g) >= 350}
dates = sorted(days)


def bars(g, mins):
    return g.resample(f"{mins}min", label="left", closed="left", origin="start_day", offset="30min").agg(
        {"o": "first", "h": "max", "l": "min", "c": "last", "v": "sum"}).dropna()


def orb_day(g, tgt=2.0, bar=5, stop_mode="other", side="both", rng_min=15):
    rng = g.iloc[:rng_min]; hi, lo = rng.h.max(), rng.l.min()
    rest = g.iloc[rng_min:]
    b = bars(rest, bar)
    for i in range(len(b)):
        c = b.c.iat[i]
        s = 1 if c > hi else (-1 if c < lo else 0)
        if s == 0: continue
        if side == "long" and s < 0: return None
        e = c
        stop = (lo if s > 0 else hi) if stop_mode == "other" else (hi + lo) / 2
        risk = abs(e - stop)
        if risk <= 0: return None
        target = e + s * tgt * risk if tgt else None
        t_enter = b.index[i] + pd.Timedelta(minutes=bar)
        after = g[g.index >= t_enter]
        for _, r in after.iterrows():
            if (s > 0 and r.l <= stop) or (s < 0 and r.h >= stop):
                px = stop; break
            if target is not None and ((s > 0 and r.h >= target) or (s < 0 and r.l <= target)):
                px = target; break
        else:
            px = after.c.iat[-1] if len(after) else e
        ret = s * (px / e - 1) - 2 * COST
        return dict(side=s, ret=ret, R=ret / (risk / e))
    return None


def run_orb(**kw):
    out = []
    for dt in dates:
        r = orb_day(days[dt], **kw)
        if r: out.append(dict(date=pd.Timestamp(dt), **r))
    return pd.DataFrame(out)


def random_runs(n_runs=1000, tgt=2.0, seed=1):
    """Random long entries with the same day's ORB risk distance."""
    rs = np.random.default_rng(seed)
    pre = []
    for dt in dates:
        g = days[dt]; rng = g.iloc[:15]; risk_pct = (rng.h.max() - rng.l.min()) / g.c.iat[14]
        pre.append((g.c.to_numpy(), g.h.to_numpy(), g.l.to_numpy(), risk_pct))
    totals = []
    for k in range(n_runs):
        tot = 0.0
        for c, h, l, rp in pre:
            i = rs.integers(15, 330); e = c[i]; stop = e * (1 - rp); target = e * (1 + tgt * rp)
            px = c[-1]
            for j in range(i + 1, len(c)):
                if l[j] <= stop: px = stop; break
                if h[j] >= target: px = target; break
            tot += ((px / e - 1) - 2 * COST) / rp
        totals.append(tot)
    return np.array(totals)


def noise_band(side="both"):
    tod = {}  # minute-of-day -> list of |move from open|
    hist = []
    out = []
    prev_close = None
    mats = []
    for dt in dates:
        g = days[dt]
        op = g.o.iat[0]
        mv = (g.c / op - 1).abs().to_numpy()
        mats.append(mv[:390] if len(mv) >= 390 else np.pad(mv, (0, 390 - len(mv)), constant_values=np.nan))
    mats = np.array(mats)
    for k, dt in enumerate(dates):
        g = days[dt]
        if k < 14:
            prev_close = g.c.iat[-1]; continue
        sigma = np.nanmean(mats[k - 14:k], axis=0)
        op = g.o.iat[0]
        ub_base, lb_base = max(op, prev_close), min(op, prev_close)
        c = g.c.to_numpy(); h = g.h.to_numpy(); l = g.l.to_numpy(); v = g.v.to_numpy().astype(float)
        vwap = np.cumsum(c * v) / np.maximum(np.cumsum(v), 1)
        pos, entry, day_ret = 0, None, 0.0
        n = min(len(c), 390)
        for i in range(30, n):
            ub = ub_base * (1 + sigma[i]); lb = lb_base * (1 - sigma[i])
            if pos != 0:                                   # trailing stop checked every minute
                if pos > 0 and c[i] < max(ub, vwap[i]):
                    day_ret += c[i] / entry - 1 - 2 * COST; pos = 0
                elif pos < 0 and c[i] > min(lb, vwap[i]):
                    day_ret += 1 - c[i] / entry - 2 * COST; pos = 0
            if pos == 0 and i % 30 == 0 and i < n - 1:     # decisions at 10:00, 10:30, ...
                if c[i] > ub: pos, entry = 1, c[i]
                elif c[i] < lb and side == "both": pos, entry = -1, c[i]
        if pos > 0: day_ret += c[n - 1] / entry - 1 - 2 * COST
        if pos < 0: day_ret += 1 - c[n - 1] / entry - 2 * COST
        out.append(dict(date=pd.Timestamp(dt), ret=day_ret, traded=day_ret != 0))
        prev_close = g.c.iat[-1]
    return pd.DataFrame(out)


def summ(t, col="ret"):
    eq = (1 + t.set_index("date")[col]).cumprod()
    yrs = (eq.index[-1] - eq.index[0]).days / 365.25
    out = dict(trades=int(len(t)), win=round(100 * (t[col] > 0).mean(), 1), avg_pct=round(100 * t[col].mean(), 3),
               per_year=round(100 * (eq.iloc[-1] ** (1 / yrs) - 1), 1), worst_drop=round(100 * (eq / eq.cummax() - 1).min(), 1))
    if "R" in t: out["total_R"] = round(t.R.sum(), 1)
    for lab, a, b in (("2014-18", "2014", "2019"), ("2019-24", "2019", "2025")):
        s = t[(t.date >= a) & (t.date < b)]
        out[f"avg_pct_{lab}"] = round(100 * s[col].mean(), 3)
    return out


if __name__ == "__main__":
    rows = []
    for lab, kw in [("ORB as in video (5-min, 2R, long+short)", {}),
                    ("ORB long only", dict(side="long")),
                    ("ORB 1R target", dict(tgt=1.0)), ("ORB 1.5R", dict(tgt=1.5)), ("ORB 3R", dict(tgt=3.0)),
                    ("ORB no target (hold to close)", dict(tgt=None)),
                    ("ORB stop at mid-range", dict(stop_mode="mid")),
                    ("ORB 15-min candles", dict(bar=15)),
                    ("ORB long only, no target", dict(side="long", tgt=None))]:
        t = run_orb(**kw); rows.append(dict(test=lab, **summ(t))); print(rows[-1], flush=True)
    for lab, side in (("Noise Band as in video (long+short, no leverage)", "both"), ("Noise Band long only", "long")):
        t = noise_band(side); tt = t[t.traded]
        r = summ(t); r.update(trades=int(len(tt)), win=round(100 * (tt.ret > 0).mean(), 1), avg_pct=round(100 * tt.ret.mean(), 3))
        rows.append(dict(test=lab, **r)); print(rows[-1], flush=True)
    q = pd.DataFrame([dict(date=pd.Timestamp(dt), ret=days[dt].c.iat[-1] / days[dates[i - 1]].c.iat[-1] - 1)
                      for i, dt in enumerate(dates) if i])
    rows.append(dict(test="Buy and hold QQQ", **summ(q))); print(rows[-1])
    rnd = random_runs(200)
    orb = run_orb(side="long")
    print("random long entries total R: median", np.median(rnd).round(1), "5-95%", np.percentile(rnd, [5, 95]).round(1),
          "| ORB long-only total R", orb.R.sum().round(1), "beats", (orb.R.sum() > rnd).mean())
    pd.DataFrame(rows).to_csv("/home/claude/halalbot/results/video_intraday_tests.csv", index=False)
