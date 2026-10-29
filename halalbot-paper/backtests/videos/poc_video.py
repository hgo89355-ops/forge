"""'Consolidation -> manipulation -> distribution -> pullback to POC' (Hamilton Rigby video), made mechanical on
QQQ 15-minute bars built from the checked 1-minute data (2014-01 to 2024-01), regular hours, one day at a time.
Rules (long only, mirror of the video's example):
  consolidation: 8 bars (2 hours) whose high-low range is <= 1.2 x the 14-day average 15-min bar range x 3
  POC: price with the most 1-minute volume inside the consolidation (0.02% price buckets)
  manipulation: within the next 6 bars price trades below the range low, then a bar closes back inside the range
  distribution: within 6 bars after that, a bar closes above the range high
  entry: limit buy at the POC within the next 12 bars (no fill = no trade)
  stop: below the manipulation low (minus 0.02%); target: variants 1.5R / 2R / 3R / range-high retest; flat at 15:59
Cost 0.005% per side (Alpaca, QQQ). Random baseline: same entries' stops/targets at random times.
"""
import numpy as np, pandas as pd

COST = 0.00005
d = pd.read_parquet("/home/claude/halalbot/data/intraday_dl/qqq_1m.parquet")
d["t"] = pd.to_datetime(d.Timestamp); d = d.set_index("t")[["Open", "High", "Low", "Close", "Volume"]]
d.columns = ["o", "h", "l", "c", "v"]; d = d.between_time("09:30", "15:59")
days = {k: g for k, g in d.groupby(d.index.date) if len(g) >= 350}
dates = sorted(days)


def b15(g):
    return g.resample("15min", label="left", closed="left", origin="start_day", offset="30min").agg(
        {"o": "first", "h": "max", "l": "min", "c": "last", "v": "sum"}).dropna()


def poc(g1):
    if not len(g1): return np.nan
    step = g1.c.mean() * 0.0002
    bins = (g1.c / step).round()
    return float(g1.groupby(bins).v.sum().idxmax() * step)


def run(tgt="2R", rng_mult=1.2, rnd=None):
    out = []; ranges = []
    for dt in dates:
        g = days[dt]; b = b15(g)
        avg = np.mean(ranges[-14:]) if len(ranges) >= 14 else None
        ranges.append((b.h - b.l).mean())
        if avg is None: continue
        i = 8
        while i < len(b) - 4:
            w = b.iloc[i - 8:i]; hi, lo = w.h.max(), w.l.min()
            if hi - lo > rng_mult * avg * 3: i += 1; continue
            p = poc(g[(g.index >= w.index[0]) & (g.index < b.index[i])])
            j = i; swept = None
            while j < min(i + 6, len(b)):
                if b.l.iat[j] < lo and swept is None: swept = j
                if swept is not None and lo <= b.c.iat[j] <= hi: break
                j += 1
            else:
                i += 1; continue
            if swept is None or j >= len(b): i += 1; continue
            man_low = b.l.iloc[swept:j + 1].min()
            k = j + 1
            while k < min(j + 7, len(b)) and b.c.iat[k] <= hi: k += 1
            if k >= min(j + 7, len(b)): i = j + 1; continue
            stop = man_low * (1 - 0.0002); risk = p - stop
            if risk <= 0 or p >= b.c.iat[k]: i = k + 1; continue
            target = {"1.5R": p + 1.5 * risk, "2R": p + 2 * risk, "3R": p + 3 * risk, "range": hi + (hi - lo)}[tgt]
            m = g[g.index >= b.index[k] + pd.Timedelta(minutes=15)]
            if rnd is not None:                      # random baseline: enter at a random later minute instead
                if len(m) < 5: break
                s = rnd.integers(0, len(m) - 1); e = m.c.iat[s]; m = m.iloc[s + 1:]
                stop_r, tgt_r = e - risk, e + (target - p)
                px = m.c.iat[-1] if len(m) else e
                for _, r in m.iterrows():
                    if r.l <= stop_r: px = stop_r; break
                    if r.h >= tgt_r: px = tgt_r; break
                out.append(dict(date=pd.Timestamp(dt), R=((px / e - 1) - 2 * COST) / (risk / e))); break
            fill = None
            for idx, r in m.iloc[:180].iterrows():
                if r.l <= p: fill = idx; break
            if fill is None: i = k + 1; continue
            after = m[m.index > fill]; px = after.c.iat[-1] if len(after) else p
            if m.loc[fill].l <= stop: px = stop
            else:
                for _, r in after.iterrows():
                    if r.l <= stop: px = stop; break
                    if r.h >= target: px = target; break
            out.append(dict(date=pd.Timestamp(dt), R=((px / p - 1) - 2 * COST) / (risk / p), ret=(px / p - 1) - 2 * COST))
            break                                    # one trade a day
    return pd.DataFrame(out)


if __name__ == "__main__":
    rows = []
    for tgt in ("1.5R", "2R", "3R", "range"):
        t = run(tgt)
        h1, h2 = t[t.date < "2019"], t[t.date >= "2019"]
        rows.append(dict(test=f"POC pullback, target {tgt}", trades=len(t), win=round(100 * (t.R > 0).mean(), 1),
                         avg_R=round(t.R.mean(), 3), avg_pct=round(100 * t.ret.mean(), 3), total_R=round(t.R.sum(), 1),
                         avg_R_2014_18=round(h1.R.mean(), 3), avg_R_2019_24=round(h2.R.mean(), 3)))
        print(rows[-1], flush=True)
    rr = [run("2R", rnd=np.random.default_rng(s)).R.mean() for s in range(5)]
    print("random entries, same stops/targets, avg R over 5 runs:", np.round(np.mean(rr), 3), np.round(np.percentile(rr, [5, 95]), 3))
    pd.DataFrame(rows).to_csv("/home/claude/halalbot/results/video_poc_test.csv", index=False)
