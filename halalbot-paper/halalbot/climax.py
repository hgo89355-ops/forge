import glob, os, numpy as np, pandas as pd
rng=np.random.default_rng(9)
def load(folder, need_vol=True):
    out={}
    for f in glob.glob(f"/home/claude/data/{folder}/*.csv"):
        d=pd.read_csv(f,parse_dates=["date"]).set_index("date").sort_index().dropna()
        d=d[(d[["open","high","low","close"]]>0).all(axis=1)]
        if need_vol and (d["volume"]<=0).mean()>0.2: continue
        if len(d)>200:
            pc=d.close.shift(1); tr=pd.concat([d.high-d.low,(d.high-pc).abs(),(d.low-pc).abs()],axis=1).max(axis=1)
            d["atr"]=tr.rolling(14).mean().shift(1); d["vavg"]=d.volume.rolling(20).mean().shift(1)
            out[os.path.basename(f)[:-4]]=d
    return out
def run_sym(sym,d,kind,bars_2h,size_mult=3.0,vol_mult=3.0,use_vol=True,run_n=8,fee=0.001):
    O,H,L,C,A,V,VA=(d[c].to_numpy() for c in ("open","high","low","close","atr","volume","vavg"))
    day=d.index.normalize().to_numpy(); n=len(O); out=[]; i=run_n+1
    while i<n-3:
        if np.isnan(A[i]) or A[i]<=0: i+=1; continue
        big=(H[i]-L[i])>=size_mult*A[i]; vol_ok=(not use_vol) or (VA[i]>0 and V[i]>=vol_mult*VA[i])
        side=0
        if big and vol_ok:
            if C[i]<O[i] and C[i-1]>C[i-1-run_n]: side=-1          # bearish climax after a bullish run -> short
            if C[i]>O[i] and C[i-1]<C[i-1-run_n]: side=1           # bullish climax after a bearish run -> long
        if not side: i+=1; continue
        c=i+1                                                       # confirmation candle
        if day[c]!=day[i] and kind=="stock": i+=1; continue
        if not ((side==-1 and C[c]<O[c]) or (side==1 and C[c]>O[c])): i+=1; continue
        trig=L[c] if side==-1 else H[c]; stop=max(H[i],H[c]) if side==-1 else min(L[i],L[c])
        ent=None
        for j in range(c+1,min(n,c+1+bars_2h)):                    # pending order valid ~2 hours
            if kind=="stock" and day[j]!=day[c]: break
            if (side==-1 and L[j]<=trig) or (side==1 and H[j]>=trig):
                px=min(O[j],trig) if side==-1 else max(O[j],trig); ent=j; break
        if ent is None: i=c+1; continue
        risk=abs(stop-px)
        if risk<=0: i=c+1; continue
        tgt=px+side*1.5*risk; xp=None; last=min(n-1,ent+bars_2h)
        for k in range(ent,last+1):
            if kind=="stock" and day[k]!=day[ent]: xp=C[k-1]; break
            hs=(H[k]>=stop) if side==-1 else (L[k]<=stop); ht=(L[k]<=tgt) if side==-1 else (H[k]>=tgt)
            if hs: xp=stop; break
            if ht and k>ent: xp=tgt; break
            if k==last: xp=C[k]
        g=side*(xp/px-1); rp=risk/px
        out.append(dict(symbol=sym,climax_bar=d.index[i],entry_time=d.index[ent],side="short" if side<0 else "long",entry=round(px,4),stop=round(stop,4),
                        target=round(tgt,4),exit=round(xp,4),R_before_fees=g/rp,R_after_fees=(g-2*fee)/rp,R_low_cost=(g-2*0.0002)/rp,stop_pct=100*rp))
        i=ent+1
    return out
def null(d,t,kind,bars_2h,fee=0.001):
    H,L,C=(d[c].to_numpy() for c in ("high","low","close")); n=len(C); s=1 if t["side"]=="long" else -1
    j=rng.integers(50,n-bars_2h-2); px=C[j]; risk=px*t["stop_pct"]/100; stop=px-s*risk; tgt=px+s*1.5*risk
    for k in range(j+1,j+1+bars_2h):
        if (s==1 and L[k]<=stop) or (s==-1 and H[k]>=stop): return (-risk/px-2*fee)/(risk/px)
        if (s==1 and H[k]>=tgt) or (s==-1 and L[k]<=tgt): return (1.5*risk/px-2*fee)/(risk/px)
    return (s*(C[j+bars_2h]/px-1)-2*fee)/(risk/px)
rows=[]; alltr=[]
def test(name,data,kind,bars_2h,**kw):
    T=[];N=[]
    for s,d in data.items():
        tt=run_sym(s,d,kind,bars_2h,**kw); T+=tt
        N+=[[null(d,t,kind,bars_2h) for _ in range(20)] for t in tt]
    if not T: print(name,"no trades"); return
    df=pd.DataFrame(T); nm=np.clip(np.array(N),-5,5).mean(axis=0)
    r=np.clip(df.R_after_fees,-5,5)
    row=dict(test=name,trades=len(df),win_rate=(df.R_before_fees>0).mean(),avg_R_before_fees=df.R_before_fees.clip(-5,5).mean(),
             avg_R_low_cost_0p02pct=df.R_low_cost.clip(-5,5).mean(),avg_R_Liquid_fees=r.mean(),random_entry_avg_R=nm.mean(),
             coin_flip_p=(nm>=r.mean()).mean(),median_stop_pct=df.stop_pct.median())
    rows.append(row); print({k:(round(v,3) if isinstance(v,float) else v) for k,v in row.items()},flush=True)
    df.insert(0,"test",name); alltr.append(df)
S15=load("intra15"); S60=load("intra60"); F15=load("fx15"); F60=load("fx60"); FX15=load("fx15",need_vol=False); FX60=load("fx60",need_vol=False)
print("15m stock symbols",len(S15),"15m crypto/gold with volume",list(F15),"1h with volume",list(F60))
test("15-min, 100 stocks, exact rules (3x ATR candle + 3x volume)",S15,"stock",8)
test("15-min, 100 stocks, looser (2x ATR + 2x volume)",S15,"stock",8,size_mult=2,vol_mult=2)
test("15-min, BTC/ETH/gold, exact rules",F15,"fx",8)
test("15-min, BTC/ETH/gold, looser (2x + 2x)",F15,"fx",8,size_mult=2,vol_mult=2)
test("15-min, forex + gold + crypto, candle size only (forex has no volume data)",FX15,"fx",8,use_vol=False)
test("1-hour, 100 stocks (Nov 2023-2026), exact rules",S60,"stock",2)
test("1-hour, 100 stocks, looser (2x + 2x)",S60,"stock",2,size_mult=2,vol_mult=2)
test("1-hour, BTC/ETH/gold (2024-2026), exact rules",F60,"fx",2)
test("1-hour, forex + gold + crypto (2024-2026), candle size only",FX60,"fx",2,use_vol=False)
pd.DataFrame(rows).to_csv("/home/claude/results/climax_volume_reversal.csv",index=False)
pd.concat(alltr).to_csv("/home/claude/results/climax_volume_reversal_trades.csv",index=False)
