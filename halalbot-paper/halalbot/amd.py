import glob, os, numpy as np, pandas as pd
rng=np.random.default_rng(5); FEE=2*10/1e4
def load(folder):
    out={}
    for f in glob.glob(f"/home/claude/data/{folder}/*.csv"):
        d=pd.read_csv(f,parse_dates=["date"]).set_index("date").sort_index().dropna()
        d=d[(d[["open","high","low","close"]]>0).all(axis=1)]
        if len(d)>100: out[os.path.basename(f)[:-4]]=d
    return out
def exit_walk(H,L,C,j,px,stop,tgt,side,end):
    for k in range(j+1,end):
        if side==1:
            if L[k]<=stop: return stop
            if tgt and H[k]>=tgt: return tgt
        else:
            if H[k]>=stop: return stop
            if tgt and L[k]<=tgt: return tgt
    return C[end-1]
def amd_day(day, acc_n, last_entry, rr):
    O,H,L,C=(day[c].to_numpy() for c in ("open","high","low","close")); n=len(day)
    if n<acc_n+4: return None
    ah,al=H[:acc_n].max(),L[:acc_n].min()
    side=0; m=None
    for j in range(acc_n,min(n,last_entry)):
        if L[j]<al: side,m=1,j; break        # swept the low -> look for longs
        if H[j]>ah: side,m=-1,j; break       # swept the high -> look for shorts
    if not side: return None
    gaps=[]
    for k in range(max(m,2),min(n,last_entry)):
        if side==1:
            if H[k]<L[k-2]: gaps.append(L[k-2])                     # bearish FVG during the sweep, its top
            ext=L[m:k+1].min()
            hit=[g for g in gaps if C[k]>g]
            if hit and k>m:
                px=C[k]; stop=ext*(1-0.0005)
                if px<=stop: return None
                tgt=px+rr*(px-stop) if rr else None
                xp=exit_walk(H,L,C,k,px,stop,tgt,1,n); return dict(side=1,j=k,px=px,risk=(px-stop)/px,ret=xp/px-1)
        else:
            if L[k]>H[k-2]: gaps.append(H[k-2])                     # bullish FVG during the sweep up, its bottom
            ext=H[m:k+1].max()
            hit=[g for g in gaps if C[k]<g]
            if hit and k>m:
                px=C[k]; stop=ext*(1+0.0005)
                if px>=stop: return None
                tgt=px-rr*(stop-px) if rr else None
                xp=exit_walk(H,L,C,k,px,stop,tgt,-1,n); return dict(side=-1,j=k,px=px,risk=(stop-px)/px,ret=-(xp/px-1))
    return None
def null_day(day,t,rr,acc_n,last_entry):
    H,L,C=(day[c].to_numpy() for c in ("high","low","close")); n=len(day)
    j=rng.integers(acc_n,max(acc_n+1,min(n-1,last_entry))); px=C[j]; s=t["side"]
    stop=px*(1-s*t["risk"]); tgt=px+s*rr*abs(px-stop) if rr else None
    xp=exit_walk(H,L,C,j,px,stop,tgt,s,n); return s*(xp/px-1)
def sessions(d, kind):
    if kind=="stock":
        d=d.between_time("09:30","15:59"); return [g for _,g in d.groupby(d.index.normalize())]
    # fx/crypto/gold (New York time): day = 20:00 prev day .. 16:00
    key=(d.index+pd.Timedelta(hours=4)).normalize()
    return [g[(g.index.hour>=20)|(g.index.hour<16)] for _,g in d.groupby(key)]
rows=[]
def run(name, data, kind, bar_minutes, rr_list=(2.0,3.0,None)):
    acc_n = int(60/bar_minutes) if kind=="stock" else int(240/bar_minutes)       # stocks: first hour; others: Asia 20:00-00:00
    last_entry = int(270/bar_minutes) if kind=="stock" else int((15*60)/bar_minutes)  # stocks until 14:00; others until 11:00 NY
    for rr in rr_list:
        T=[];N=[]
        for s,d in data.items():
            for day in sessions(d,kind):
                t=amd_day(day,acc_n,last_entry,rr)
                if t and t["risk"]>0:
                    t["date"]=day.index[0]; T.append(t)
                    N.append([null_day(day,t,rr,acc_n,last_entry) for _ in range(20)])
        if not T: continue
        risk=np.array([t["risk"] for t in T]); g=np.array([t["ret"] for t in T])
        R=np.clip((g-FEE)/risk,-5,20); Rg=np.clip(g/risk,-5,20)
        Nn=np.clip((np.array(N)-FEE)/risk[:,None],-5,20); nm=Nn.mean(axis=0)
        days=sum(len(sessions(d,kind)) for d in data.values())/len(data)
        rows.append(dict(test=name,target=("hold to session end" if rr is None else f"{rr:.0f}R"),trades=len(T),trades_per_day=len(T)/days,
                         win_rate=(R>0).mean(),avg_R_before_fees=Rg.mean(),avg_R_after_fees=R.mean(),random_entry_avg_R=nm.mean(),
                         coin_flip_p=(nm>=R.mean()).mean(),median_stop_pct=100*np.median(risk)))
        print({k:(round(v,3) if isinstance(v,float) else v) for k,v in rows[-1].items()},flush=True)
run("1-hour, forex/gold/BTC/ETH (2024-2026)", load("fx60"), "fx", 60)
run("15-min, forex/gold/BTC/ETH (Aug-Oct 2026)", load("fx15"), "fx", 15)
run("1-hour, 100 stocks (Nov 2023-2026)", load("intra60"), "stock", 60)
run("15-min, 100 stocks (Jul-Oct 2026)", load("intra15"), "stock", 15)
pd.DataFrame(rows).to_csv("/home/claude/results/amd_ifg.csv",index=False)
