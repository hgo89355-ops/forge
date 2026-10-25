exec(open("/tmp/claude-0/-home-claude/f597dba2-d1d4-5c2b-b2cc-f209ee8f8f77/scratchpad/final.py").read().split("\nout=[]")[0])
ALL=pickle.load(open("results/all_strategies_trades.pkl","rb"))
TECH=set("AAPL MSFT NVDA GOOGL GOOG META AVGO ADBE CRM AMD INTC CSCO ORCL IBM QCOM TXN ADI AMAT LRCX KLAC MU SNPS CDNS INTU NOW".split())
FIN=set("BRK-B JPM V MA BAC WFC C GS MS BLK".split())
EXTRA={"Engulfing":ALL["Engulfing candle (long)"],"Hammer":ALL["Hammer / long shadow (long)"],"MA cross 20/60":ALL["PDF P2 MA crossover 20/60 + 100 trend (long)"],
       "Stochastic reversal":ALL["PDF P1 Momentum reversal (stochastics + S/R) (long)"],"Swing contraction":ALL["PDF P4 Swing: contraction then breakout (long)"],
       "RSI2 momentum":ALL["PDF P9 RSI(2) momentum (buy >90, sell <10) (long)"],"Heikin Ashi reversal":ALL["PDF P3 Heikin-Ashi reversal + stochastic (long)"],
       "20-day breakout + volume":ALL["base breakout_long"],"IBS on index futures":[t for t in ALL["base ibs_long"] if t["symbol"] in ("NQ=F","ES=F")]}
for k,v in EXTRA.items(): pool["X "+k]=v
pool["X Engulfing tech"]=[t for t in EXTRA["Engulfing"] if t["symbol"] in TECH]; pool["X Hammer tech"]=[t for t in EXTRA["Hammer"] if t["symbol"] in TECH]
PB="Pullback in trend [1 ATR stop, 10R target]"; TU="Turtle breakout [1 ATR stop, 10R target]"
pool["PB tech"]=[t for t in pool[PB] if t["symbol"] in TECH]; pool["PB rest"]=[t for t in pool[PB] if t["symbol"] not in TECH]
pool["TU fin"]=[t for t in pool[TU] if t["symbol"] in FIN]; pool["TU rest"]=[t for t in pool[TU] if t["symbol"] not in FIN]
def mretw(keys,start,prio={},risk={}):
    tr=[dict(t,engine=k) for k in keys for t in pool[k] if t["symbol"] in data]
    r=RiskRules(capital=10000,risk_per_trade=0.01,max_positions=30,max_open_risk=0.30,max_gross=1.0,max_pos_pct=0.10,engine_priority=prio,engine_risk=risk,
        stock_slip_bps=10,crypto_slip_bps=10,crypto_fee_bps=5,dd_kill=1.01)
    eq=simulate(tr,data,r,pd.Timestamp(start),None); return eq["equity"].resample("ME").last().pct_change().dropna(), len(eq["taken"])
def final(core_keys,start,prio={},risk={}):
    k=mret2(CR,0.03,5,start,1.0); s,nt=mretw(core_keys,start,prio,risk); idx=s.index.intersection(k.index)
    core=7000; sat=3000; base=7000; vals=[]
    for m in idx:
        core*=1+s[m]; sat*=1+k[m]
        if core>base: sat+=core-base; core=base
        tot=core+sat
        if sat>0.5*tot: core+=sat-0.5*tot; sat=0.5*tot; base=core
        vals.append(core+sat)
    v=pd.Series(vals,index=idx); yrs=len(v)/12; mr=v.pct_change().fillna(v.iloc[0]/1e4-1)
    return dict(end_from_10000=round(v.iloc[-1]),per_year=round((v.iloc[-1]/1e4)**(1/yrs)-1,3),worst_drop=round((v/v.cummax()-1).min(),3),
                typical_month=round(mr.median(),4),losing_months=round((mr<0).mean(),2),main_bucket_trades_per_month=round(nt/len(idx),1))
XK=["X "+k for k in EXTRA]
core_tilt=[k for k in CORE10 if k not in (PB,TU)]+["PB tech","PB rest","TU fin","TU rest"]
tilt_risk={"PB tech":1.5,"TU fin":1.5,"X Engulfing tech":1.5,"X Hammer tech":1.5}
setups=[("1. Current setup",CORE10,{},{}),
        ("2. + all 9 extra strategies, same size",CORE10+XK,{},{}),
        ("3. + all 9 extra as fill-ins (only empty slots, half size)",CORE10+XK,{k:-1 for k in XK},{k:0.5 for k in XK}),
        ("4. Company-type tilt: Engulfing+Hammer tech only, 1.5x size on Pullback-tech, Turtle-financials, Engulfing/Hammer-tech",core_tilt+["X Engulfing tech","X Hammer tech"],{},tilt_risk),
        ("5. Tilt + other extras as fill-ins",core_tilt+["X Engulfing tech","X Hammer tech"]+[k for k in XK if k not in ("X Engulfing","X Hammer")],
            {k:-1 for k in XK},dict(tilt_risk,**{k:0.5 for k in XK}))]
rows=[]
for lab,keys,pr,rk in setups:
    for st in ("2018-01-30","2024-01-01"):
        r=final(keys,st,pr,rk); r.update(setup=lab,period=st[:4]+"-2026"); rows.append(r); print(r,flush=True)
pd.DataFrame(rows).to_csv("results/add_more_strategies.csv",index=False)
