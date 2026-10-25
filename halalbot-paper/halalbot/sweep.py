import sys, pickle, warnings; warnings.filterwarnings("ignore")
sys.path.insert(0, "/home/claude")
import pandas as pd, numpy as np
from halalbot.run import load_dir
from halalbot.portfolio import RiskRules, simulate
data=load_dir("data/daily"); pool=pickle.load(open("results/pool.pkl","rb"))
SAFE=["Dip after bull flag (original exits)","Triple MA (original)","Momentum 12-1 (original)"]
RISKY=[k for k in pool if k not in SAFE]
def mret(keys,slots,gross,start):
    tr=[dict(t,engine=k) for k in keys for t in pool[k] if t["symbol"] in data]
    r=RiskRules(capital=10000,risk_per_trade=0.01,max_positions=slots,max_open_risk=0.30,max_gross=gross,max_pos_pct=0.10,
        engine_risk={k:2.0 for k in keys if "Crypto" in k},stock_slip_bps=10,crypto_slip_bps=10,crypto_fee_bps=5,dd_kill=1.01)
    eq=simulate(tr,data,r,pd.Timestamp(start),None)["equity"]; return eq.resample("ME").last().pct_change().dropna()
rows=[]
for start in ("2018-01-30","2024-01-01"):
    s=mret(SAFE,30,1.0,start); k=mret(RISKY,30,1.0,start); allm=mret(list(pool),30,1.0,start)
    idx=s.index.intersection(k.index).intersection(allm.index); s,k,allm=s[idx],k[idx],allm[idx]
    def path(core_frac,sweep):
        core=10000*core_frac; sat=10000-core; base=core; vals=[]
        for m in idx:
            core*=1+s[m]; sat*=1+k[m]
            if sweep and core>base: sat+=core-base; core=base
            vals.append(core+sat)
        v=pd.Series(vals,index=idx); yrs=len(v)/12
        return v.iloc[-1], (v.iloc[-1]/10000)**(1/yrs)-1, (v/v.cummax()-1).min(), v.pct_change().fillna(v.iloc[0]/10000-1).median()
    for lab,cf,sw in (("All 11 together, no borrowing",None,None),("Your idea: 80% safe bucket, its profits moved to risky bucket each month",0.8,True),
                      ("Your idea with 50% safe bucket",0.5,True),("80% safe / 20% risky, no moving",0.8,False)):
        if cf is None:
            v=10000*np.cumprod(1+allm); yrs=len(v)/12; res=(v.iloc[-1],(v.iloc[-1]/10000)**(1/yrs)-1,(v/v.cummax()-1).min(),allm.median())
        else: res=path(cf,sw)
        rows.append(dict(period=start[:4]+"-2026",setup=lab,end_from_10000=round(res[0]),per_year=round(res[1],3),worst_drop=round(res[2],3),typical_month=round(res[3],4)))
        print(rows[-1],flush=True)
    print("safe bucket alone: typical month %.2f%%, risky bucket alone %.2f%%"%(100*s.median(),100*k.median()))
pd.DataFrame(rows).to_csv("/home/claude/results/profit_sweep.csv",index=False)
