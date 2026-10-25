exec(open("/tmp/claude-0/-home-claude/f597dba2-d1d4-5c2b-b2cc-f209ee8f8f77/scratchpad/final.py").read().split("\nout=[]")[0])
rows=[]
for start in ("2018-01-30","2024-01-01"):
    k=mret2(CR,0.03,5,start,1.0); s=mret(CORE10,30,1.0,start); idx=s.index.intersection(k.index)
    for cap in (None,0.6,0.5,0.4):
        core=7000; sat=3000; base=7000; vals=[]
        for m in idx:
            core*=1+s[m]; sat*=1+k[m]
            if core>base: sat+=core-base; core=base
            tot=core+sat
            if cap and sat>cap*tot: core+=sat-cap*tot; sat=cap*tot; base=core   # move excess back, main bucket keeps it
            vals.append(core+sat)
        v=pd.Series(vals,index=idx); mr=v.pct_change(); mr.iloc[0]=v.iloc[0]/1e4-1; yrs=len(v)/12
        row=dict(period=start[:4]+"-2026",crypto_cap=("none" if cap is None else f"{cap:.0%}"),end_from_10000=round(v.iloc[-1]),per_year=(v.iloc[-1]/1e4)**(1/yrs)-1,
                 worst_drop=(v/v.cummax()-1).min(),typical_month=mr.median(),avg_month=mr.mean(),bad_month_1in10=mr.quantile(.1),good_month_1in10=mr.quantile(.9),
                 losing_months=(mr<0).mean(),worst_month=mr.min(),best_month=mr.max())
        rows.append(row); print({a:(round(b,3) if isinstance(b,float) else b) for a,b in row.items()},flush=True)
pd.DataFrame(rows).to_csv("/home/claude/results/final_setup_caps.csv",index=False)
