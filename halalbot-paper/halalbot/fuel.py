import glob, os, numpy as np, pandas as pd
rng = np.random.default_rng(11); FEE = 2*10/1e4
def load(folder):
    out={}
    for f in glob.glob(f"/home/claude/data/{folder}/*.csv"):
        d=pd.read_csv(f,parse_dates=["date"]).set_index("date").dropna()
        d=d[(d[["open","high","low","close"]]>0).all(axis=1)]
        if len(d)>300:
            pc=d["close"].shift(1); trr=pd.concat([d.high-d.low,(d.high-pc).abs(),(d.low-pc).abs()],axis=1).max(axis=1)
            d["atr"]=trr.rolling(14).mean(); d["sma"]=d.close.rolling(200).mean(); out[os.path.basename(f)[:-4]]=d
    return out
def walk(o,h,l,c,a,j,px,stop,tp,trail,maxb):
    n=len(o); hh=h[j]
    for k in range(j,min(n,j+maxb)):
        if l[k]<=stop: return k,(min(stop,o[k]) if k>j else stop)
        if k>j and tp is not None and h[k]>=tp: return k,max(tp,o[k])
        if trail: hh=max(hh,h[k]); stop=max(stop,hh-trail*a[k])
    k=min(n-1,j+maxb-1); return k,c[k]
def fuel(d, tol=0.25, look=30, wait=15, tp_r=3.0, trail=None, maxb=60, trend=True):
    o,h,l,c,a,s=(d[x].to_numpy() for x in ("open","high","low","close","atr","sma"))
    n=len(o); tr=[]; busy=-1
    sh=[i for i in range(2,n-2) if h[i]>=max(h[i-2:i]) and h[i]>=max(h[i+1:i+3])]   # swing highs, known 2 bars later
    for i in range(look+5,n-2):
        if i<=busy or np.isnan(a[i]): continue
        body=c[i]-o[i]
        if body < 1.0*a[i]: continue                                    # strong bullish breakout candle
        if trend and not c[i]>s[i]: continue
        rec=[k for k in sh if i-look<=k<=i-3]
        eq=None
        for x in range(len(rec)):
            for y in range(x+1,len(rec)):
                if abs(h[rec[x]]-h[rec[y]])<=tol*a[i]: eq=max(h[rec[x]],h[rec[y]])
        if eq is None or not (c[i]>eq and h[i-1]<=eq*1.001): continue    # equal highs taken by this candle
        ob=next((k for k in range(i-1,max(i-10,0),-1) if c[k]<o[k]),None)
        if ob is None: continue
        top,stop=h[ob],l[ob]-0.1*a[i]
        for j in range(i+1,min(n,i+1+wait)):
            if l[j]<=top:
                px=min(o[j],top)
                if px<=stop: break
                tp=px+tp_r*(px-stop) if tp_r else None
                x,xp=walk(o,h,l,c,a,j,px,stop,tp,trail,maxb); risk=(px-stop)/px
                tr.append(dict(date=d.index[j],R=((xp/px-1)-FEE)/risk,risk=risk,j=j)); busy=x; break
    return tr
def null(d,trades,tp_r,trail,maxb):
    o,h,l,c,a=(d[x].to_numpy() for x in ("open","high","low","close","atr")); out=[]
    for t in trades:
        j=rng.integers(201,len(o)-2); px=o[j]; stop=px*(1-t["risk"]); tp=px+tp_r*(px-stop) if tp_r else None
        x,xp=walk(o,h,l,c,a,j,px,stop,tp,trail,maxb); out.append(((xp/px-1)-FEE)/t["risk"])
    return out
rows=[]
def run(name,data,a,b,**kw):
    allt={s:[t for t in fuel(d,**kw) if a<=t["date"]<b] for s,d in data.items()}
    R=np.clip(np.array([t["R"] for v in allt.values() for t in v]),-5,30)
    nulls=[np.clip(np.array([z for s,v in allt.items() if v for z in null(data[s],v,kw.get("tp_r",3.0),kw.get("trail"),kw.get("maxb",60))]),-5,30).mean() for _ in range(30)]
    yrs=(b-a).days/365.25
    row=dict(test=name,trades=len(R),trades_per_year=len(R)/yrs,win_rate=(R>0).mean(),avg_R_after_fees=R.mean(),
             random_entry_avg_R=np.mean(nulls),coin_flip_p=(np.array(nulls)>=R.mean()).mean(),median_stop_pct=100*np.median([t["risk"] for v in allt.values() for t in v]))
    rows.append(row); print({k:(round(v,3) if isinstance(v,float) else v) for k,v in row.items()},flush=True)
T=pd.Timestamp
D=load("daily"); H=load("intra60")
for lab,a,b in (("2006-2017",T("2006-01-01"),T("2018-01-30")),("2018-2026",T("2018-01-30"),T("2026-12-31"))):
    run(f"Daily {lab}, 3R target",D,a,b)
    run(f"Daily {lab}, let it run (3 ATR trailing stop)",D,a,b,tp_r=None,trail=3.0,maxb=120)
run("Daily 2018-2026, 3R target, no trend filter",D,T("2018-01-30"),T("2026-12-31"),trend=False)
run("1-hour 2023-2026, 3R target",H,T("2023-01-01"),T("2026-12-31"),trend=False,wait=20,maxb=70)
run("1-hour 2023-2026, let it run",H,T("2023-01-01"),T("2026-12-31"),trend=False,wait=20,tp_r=None,trail=3.0,maxb=140)
pd.DataFrame(rows).to_csv("/home/claude/results/fuel_liquidity_ob.csv",index=False)
