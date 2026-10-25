exec(open("/tmp/claude-0/-home-claude/f597dba2-d1d4-5c2b-b2cc-f209ee8f8f77/scratchpad/sweep2.py").read().split("\nrows=[]")[0])
CORE10=[k for k in pool if "Crypto" not in k]
out=[]; monthly={}
for start in ("2018-01-30","2024-01-01"):
    k=mret2(CR,0.03,5,start,1.0)
    for lab,core_keys in (("Final: 10 strategies in main bucket (70%), profits fed into Crypto trend (3% risk)",CORE10),
                          ("Small-win 3 in main bucket (70%), profits fed into Crypto trend (3% risk)",SAFE)):
        s=mret(core_keys,30,1.0,start); idx=s.index.intersection(k.index)
        core=7000; sat=3000; vals=[]; cs=[]; ss=[]
        for m in idx:
            core*=1+s[m]; sat*=1+k[m]
            if core>7000: sat+=core-7000; core=7000
            vals.append(core+sat); cs.append(core); ss.append(sat)
        v=pd.Series(vals,index=idx); mr=v.pct_change(); mr.iloc[0]=v.iloc[0]/1e4-1; yrs=len(v)/12
        row=dict(period=start[:4]+"-2026",setup=lab,end_from_10000=round(v.iloc[-1]),per_year=(v.iloc[-1]/1e4)**(1/yrs)-1,worst_drop=(v/v.cummax()-1).min(),
                 typical_month=mr.median(),avg_month=mr.mean(),bad_month_1in10=mr.quantile(.1),good_month_1in10=mr.quantile(.9),losing_months=(mr<0).mean(),
                 worst_month=mr.min(),best_month=mr.max(),crypto_bucket_share_at_end=ss[-1]/vals[-1])
        out.append(row); print({a:(round(b,3) if isinstance(b,float) else b) for a,b in row.items()},flush=True)
        if start=="2018-01-30" and lab.startswith("Final"): monthly["final"]=mr
pd.DataFrame(out).to_csv("/home/claude/results/final_setup.csv",index=False)
pd.DataFrame(monthly).to_csv("/home/claude/results/final_setup_monthly.csv")
# trade counts per strategy per month 2018+, 2024+
for k_,tr in pool.items():
    n18=sum(t["entry_date"]>=pd.Timestamp("2018-01-30") for t in tr)/104.7; n24=sum(t["entry_date"]>=pd.Timestamp("2024-01-01") for t in tr)/33.7
    hold=np.median([t["bars"] for t in tr if t["entry_date"]>=pd.Timestamp("2018-01-30")])
    print(f"{k_[:45]:45s} signals/month 18+ {n18:5.1f} 24+ {n24:5.1f} median hold {hold:.0f} days")
