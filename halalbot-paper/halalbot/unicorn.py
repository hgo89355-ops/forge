import glob, os, numpy as np, pandas as pd
rng = np.random.default_rng(7)
FEE = 2*10/1e4
def load(folder):
    out = {}
    for f in glob.glob(f"/home/claude/data/{folder}/*.csv"):
        d = pd.read_csv(f, parse_dates=["date"]).set_index("date").dropna()
        d = d[(d[["open","high","low","close"]] > 0).all(axis=1)]
        if len(d) > 300: out[os.path.basename(f)[:-4]] = d
    return out
def walk(o,h,l,c,j,px,stop,tp,maxb):
    n=len(o)
    for k in range(j, min(n, j+maxb)):
        if l[k] <= stop: return k, min(stop, o[k]) if k>j else stop
        if k>j and h[k] >= tp: return k, max(tp, o[k])
    k=min(n-1, j+maxb-1); return k, c[k]
def unicorn(d, wait=20, maxb=60, trend=True):
    o,h,l,c = (d[x].to_numpy() for x in ("open","high","low","close"))
    sma = d["close"].rolling(200).mean().to_numpy()
    tr=[]; busy=-1; n=len(o)
    for i in range(3, n-2):
        if i <= busy: continue
        if not (l[i] > h[i-2] and c[i-1] > o[i-1]): continue          # bullish fair value gap
        if trend and not (c[i] > sma[i]): continue
        ob = next((k for k in range(i-2, max(i-8,0), -1) if c[k] < o[k]), None)   # last down candle = order block
        if ob is None: continue
        top, bot = min(h[ob], l[i]), max(l[ob], h[i-2])
        if top <= bot: continue                                       # no overlap
        stop = h[i-2] - 0.1*(h[i-2]-l[ob]+1e-9) if h[i-2] > l[ob] else l[ob]*0.999
        stop = min(stop, bot*0.999)
        hi = h[i]
        for j in range(i+1, min(n, i+1+wait)):
            if l[j] <= top:
                px = min(o[j], top)
                if px <= stop: break
                tp = hi
                if tp <= px*1.002: break
                x, xp = walk(o,h,l,c,j,px,stop,tp,maxb)
                risk = (px-stop)/px
                tr.append(dict(date=d.index[j], R=((xp/px-1)-FEE)/risk, win=xp>px, risk=risk, tp_r=(tp-px)/(px-stop), bars=x-j, j=j))
                busy = x; break
            hi = max(hi, h[j])
    return tr
def random_null(d, trades, maxb=60):
    o,h,l,c = (d[x].to_numpy() for x in ("open","high","low","close")); out=[]
    for t in trades:
        j = rng.integers(201, len(o)-2); px=o[j]; stop=px*(1-t["risk"]); tp=px*(1+t["risk"]*t["tp_r"])
        x,xp = walk(o,h,l,c,j,px,stop,tp,maxb); out.append(((xp/px-1)-FEE)/t["risk"])
    return out
def summary(name, data, periods, **kw):
    rows=[]
    allt = {s: unicorn(d, **kw) for s,d in data.items()}
    for lab,a,b in periods:
        R=[]; nulls=[]
        for s,tl in allt.items():
            sel=[t for t in tl if a<=t["date"]<b]; R += [t["R"] for t in sel]
        R=np.clip(np.array(R),-5,20)
        for rep in range(30):
            z=[]
            for s,tl in allt.items():
                sel=[t for t in tl if a<=t["date"]<b]
                if sel: z += random_null(data[s], sel)
            nulls.append(np.clip(np.array(z),-5,20).mean())
        p=(np.array(nulls)>=R.mean()).mean()
        yrs=(min(b,max(d.index[-1] for d in data.values()))-max(a,min(d.index[0] for d in data.values()))).days/365.25
        rows.append(dict(test=name, period=lab, trades=len(R), trades_per_year=len(R)/yrs, win_rate=(R>0).mean(), avg_R=R.mean(),
                         random_entry_avg_R=np.mean(nulls), coin_flip_p=p, R_per_year=R.sum()/yrs))
        print({k:(round(v,3) if isinstance(v,float) else v) for k,v in rows[-1].items()}, flush=True)
    return rows
T=pd.Timestamp; rows=[]
daily = {s:d for s,d in load("daily").items()}
rows += summary("Unicorn, daily bars, uptrend only", daily, [("2006-2017",T("2006-01-01"),T("2018-01-30")),("2018-2026",T("2018-01-30"),T("2026-12-31"))])
rows += summary("Unicorn, daily bars, no trend filter", daily, [("2018-2026",T("2018-01-30"),T("2026-12-31"))], trend=False)
h1 = load("intra60")
rows += summary("Unicorn, 1-hour bars (2023-2026)", h1, [("2023-2026",T("2023-01-01"),T("2026-12-31"))], wait=30, maxb=70, trend=False)
pd.DataFrame(rows).to_csv("/home/claude/results/unicorn_model.csv", index=False)
