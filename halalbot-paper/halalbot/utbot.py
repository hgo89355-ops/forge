import glob, os, numpy as np, pandas as pd
rng=np.random.default_rng(21); FEE=0.001
def load(folder, resample=None):
    out={}
    for f in glob.glob(f"/home/claude/data/{folder}/*.csv"):
        d=pd.read_csv(f,parse_dates=["date"]).set_index("date").sort_index().dropna()
        if resample:
            d=d.between_time("09:30","15:59").resample(resample,offset="0min").agg({"open":"first","high":"max","low":"min","close":"last","volume":"sum"}).dropna()
        d=d[(d[["open","high","low","close"]]>0).all(axis=1)]
        if len(d)>150: out[os.path.basename(f)[:-4]]=d
    return out
def indicators(d, key=2.0):
    O,H,L,C=(d[c].to_numpy() for c in ("open","high","low","close")); n=len(C)
    hc=(O+H+L+C)/4; ho=np.empty(n); ho[0]=(O[0]+C[0])/2
    for i in range(1,n): ho[i]=(ho[i-1]+hc[i-1])/2
    hh=np.maximum.reduce([H,ho,hc]); hl=np.minimum.reduce([L,ho,hc])
    pc=np.r_[hc[0],hc[:-1]]; tr=np.maximum.reduce([hh-hl,np.abs(hh-pc),np.abs(hl-pc)]); loss=key*tr   # ATR period 1
    st=np.zeros(n); st[0]=hc[0]
    for i in range(1,n):
        p=st[i-1]
        if hc[i]>p and hc[i-1]>p: st[i]=max(p,hc[i]-loss[i])
        elif hc[i]<p and hc[i-1]<p: st[i]=min(p,hc[i]+loss[i])
        elif hc[i]>p: st[i]=hc[i]-loss[i]
        else: st[i]=hc[i]+loss[i]
    buy=np.r_[False,(hc[1:]>st[1:])&(hc[:-1]<=st[:-1])]; sell=np.r_[False,(hc[1:]<st[1:])&(hc[:-1]>=st[:-1])]
    white=pd.Series(hc).ewm(span=10,adjust=False).mean().to_numpy()
    return dict(O=O,H=H,L=L,C=C,hc=hc,buy=buy,sell=sell,white=white)
def trades(d, both=False, fake=False):
    x=indicators(d); O,H,L,C,hc=x["O"],x["H"],x["L"],x["C"],x["hc"]; n=len(C); out=[]; i=20
    while i<n-2:
        side=1 if x["buy"][i] else (-1 if (both and x["sell"][i]) else 0)
        if not side: i+=1; continue
        px=hc[i] if fake else O[i+1]
        stop=x["white"][i]*(1-0.001*side)
        if (px-stop)*side<=0: i+=1; continue
        j=i+1; xp=None
        while j<n:
            if not fake and ((side==1 and L[j]<=stop) or (side==-1 and H[j]>=stop)):
                xp=stop if ((side==1 and O[j]>stop) or (side==-1 and O[j]<stop)) else O[j]; break
            if fake and ((side==1 and hc[j]<=stop) or (side==-1 and hc[j]>=stop)): xp=stop; break
            if (side==1 and x["sell"][j]) or (side==-1 and x["buy"][j]):
                xp=(hc[j] if fake else (O[j+1] if j+1<n else C[j])); break
            j+=1
        if xp is None: xp=C[-1]; j=n-1
        risk=abs(px-stop)/px; g=side*(xp/px-1)
        out.append(dict(symbol=None,time=d.index[i],side=side,entry=px,stop=stop,exit=xp,bars=j-i,risk=risk,g=g))
        i=j if (not both) else j   # next signal from exit bar on
    return out
def null(d,t):
    O,H,L,C=(d[c].to_numpy() for c in ("open","high","low","close")); n=len(C)
    k=rng.integers(20,max(21,n-t["bars"]-2)); px=O[k]; s=t["side"]; stop=px*(1-s*t["risk"])
    for j in range(k,min(n,k+max(1,t["bars"]))):
        if (s==1 and L[j]<=stop) or (s==-1 and H[j]>=stop): return (-t["risk"]-2*FEE)/t["risk"]
    return (s*(C[min(n-1,k+max(1,t["bars"]))]/px-1)-2*FEE)/t["risk"]
rows=[]; keep=[]
def test(name,data,both=False,fake=False):
    T=[];N=[]
    for s,d in data.items():
        tt=trades(d,both,fake)
        for t in tt: t["symbol"]=s
        T+=tt
        if not fake: N+=[[null(d,t) for _ in range(20)] for t in tt]
    df=pd.DataFrame(T); fee=0 if fake else FEE
    R=((df.g-2*FEE)/df.risk).clip(-5,20); Rg=(df.g/df.risk).clip(-5,20); pct=(df.g-2*FEE)
    row=dict(test=name,trades=len(df),trades_per_market_per_week=len(df)/len(data)/(np.mean([(d.index[-1]-d.index[0]).days for d in data.values()])/7),
             win_rate=(df.g>2*FEE).mean(),avg_move_per_trade_pct=100*df.g.mean(),avg_pct_after_fees=100*pct.mean(),avg_R_before_fees=Rg.mean(),avg_R_after_fees=R.mean(),
             median_stop_pct=100*df.risk.median(),median_hold_bars=df.bars.median())
    if N:
        nm=np.clip((np.array(N)),-5,20).mean(axis=0); row.update(random_entry_avg_R=nm.mean(),coin_flip_p=(nm>=R.mean()).mean())
    rows.append(row); print({k:(round(v,3) if isinstance(v,float) else v) for k,v in row.items()},flush=True)
    df.insert(0,"test",name); keep.append(df)
HL=load("hl30"); CR={k:v for k,v in HL.items() if not k.startswith("xyz")}; XS={k:v for k,v in HL.items() if k.startswith("xyz")}
S30=load("intra15",resample="30min"); S60=load("intra60"); H60=load("hl60")
test("What TradingView shows: fills at Heikin Ashi prices, no fees (Liquid crypto 30-min)",CR,fake=True)
test("Real fills, Liquid crypto 30-min (28 coins, ~104 days), long only",CR)
test("Real fills, Liquid crypto 30-min, long and short",CR,both=True)
test("Real fills, Liquid stocks/indices/gold 30-min (20 markets, ~104 days), long only",XS)
test("Real fills, Liquid stocks/indices/gold 30-min, long and short",XS,both=True)
test("Real fills, 100 US stocks 30-min (Jul-Oct 2026), long only",S30)
test("Real fills, 100 US stocks 1-hour (Nov 2023-2026), long only",S60)
test("Real fills, Liquid crypto 1-hour (~208 days), long only",H60)
pd.DataFrame(rows).to_csv("/home/claude/results/ut_bot_linreg.csv",index=False)
pd.concat(keep).to_csv("/home/claude/results/ut_bot_linreg_trades.csv",index=False)
