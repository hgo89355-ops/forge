exec(open("/tmp/claude-0/-home-claude/f597dba2-d1d4-5c2b-b2cc-f209ee8f8f77/scratchpad/sweep.py").read().split("rows=[]")[0])
def mret2(keys,risk,slots,start,maxpos):
    tr=[dict(t,engine=k) for k in keys for t in pool[k] if t["symbol"] in data]
    r=RiskRules(capital=10000,risk_per_trade=risk,max_positions=slots,max_open_risk=min(0.9,slots*risk),max_gross=1.0,max_pos_pct=maxpos,
        stock_slip_bps=10,crypto_slip_bps=10,crypto_fee_bps=5,dd_kill=1.01)
    eq=simulate(tr,data,r,pd.Timestamp(start),None)["equity"]; return eq.resample("ME").last().pct_change().dropna()
CR=["Crypto trend [1 ATR stop, 10R target]"]; HR=CR+["Dip after bull flag [1 ATR stop, 10R target]","Bull flag [1 ATR stop, 10R target]"]
rows=[]
for start in ("2018-01-30","2024-01-01"):
    base=mret(list(pool),30,1.0,start); s=mret(SAFE,30,1.0,start)
    for lab,keys,risk,slots in (("Crypto trend only, 3% risk",CR,0.03,5),("Crypto trend only, 5% risk",CR,0.05,5),
                                ("Top 3 high-reward, 2% risk",HR,0.02,10),("Top 3 high-reward, 3% risk",HR,0.03,10)):
        k=mret2(keys,risk,slots,start,1.0); idx=s.index.intersection(k.index).intersection(base.index)
        for cf in (0.7,):
            core=10000*cf; sat=10000-core; b0=core; vals=[]; 
            for m in idx:
                core*=1+s[m]; sat*=1+k[m]
                if core>b0: sat+=core-b0; core=b0
                vals.append(core+sat)
            v=pd.Series(vals,index=idx); yrs=len(v)/12
            sv=10000*np.cumprod(1+k[idx])
            rows.append(dict(period=start[:4]+"-2026",setup=f"70% small-win bucket, profits fed into: {lab}",end_from_10000=round(v.iloc[-1]),
                per_year=round((v.iloc[-1]/1e4)**(1/yrs)-1,3),worst_drop=round((v/v.cummax()-1).min(),3),
                high_reward_bucket_alone_per_year=round((sv.iloc[-1]/1e4)**(1/yrs)-1,3),high_reward_bucket_worst_drop=round((sv/sv.cummax()-1).min(),3)))
            print(rows[-1],flush=True)
    v=10000*np.cumprod(1+base); yrs=len(v)/12
    rows.append(dict(period=start[:4]+"-2026",setup="All 11 together (recommended)",end_from_10000=round(v.iloc[-1]),per_year=round((v.iloc[-1]/1e4)**(1/yrs)-1,3),worst_drop=round((v/v.cummax()-1).min(),3)))
    print(rows[-1])
pd.DataFrame(rows).to_csv("/home/claude/results/high_reward_sweep.csv",index=False)
