import sys, warnings, pickle; warnings.filterwarnings("ignore"); sys.path.insert(0,"/home/claude")
import numpy as np, pandas as pd
from halalbot.run import load_dir
data=load_dir("data/daily"); rng=np.random.default_rng(4)
G={"Tech & semis":"AAPL MSFT NVDA GOOGL GOOG META AVGO ADBE CRM AMD INTC CSCO ORCL IBM QCOM TXN ADI AMAT LRCX KLAC MU SNPS CDNS INTU NOW",
   "Consumer & internet":"AMZN TSLA NFLX DIS MCD SBUX NKE HD LOW COST WMT UBER GM F PYPL PG PEP KO",
   "Financials":"BRK-B JPM V MA BAC WFC C GS MS BLK",
   "Healthcare":"LLY UNH JNJ MRK ABBV PFE BMY ABT MDT TMO DHR ISRG",
   "Energy":"XOM CVX COP EOG SLB",
   "Industrials & telecom":"BA CAT DE HON GE UPS FDX LIN T VZ",
   "Index & sector funds":"SPY QQQ IWM DIA XLK XLF XLE XLV XLY XLP XLI XLU XLB XLC XLRE EFA EEM",
   "Gold & bonds":"GLD TLT IEF",
   "Futures":"NQ=F ES=F",
   "Crypto":"BTC-USD ETH-USD SOL-USD BNB-USD XRP-USD ADA-USD AVAX-USD LINK-USD"}
grp={s:g for g,v in G.items() for s in v.split()}
S=pickle.load(open("results/all_strategies_trades.pkl","rb"))
FEE=0.002; A=pd.Timestamp("2018-01-30"); M=pd.Timestamp("2022-07-01")
cache={s:(d.open.to_numpy(),d.high.to_numpy(),d.low.to_numpy(),d.close.to_numpy(),len(d)) for s,d in data.items()}
def rand_ret(t):
    s=t["symbol"]; O,H,L,C,n=cache[s]; b=max(1,int(t["bars"])); side=t.get("side",1)
    k=rng.integers(200,max(201,n-b-2)); px=O[k]; st=px*(1-side*max(t["risk_pct"],1e-4))
    for j in range(k,min(n,k+b)):
        if (side==1 and L[j]<=st) or (side==-1 and H[j]>=st): return side*(st/px-1)-FEE
    return side*(C[min(n-1,k+b)]/px-1)-FEE
rows=[]
for name,tr in S.items():
    t=[x for x in tr if x["entry_date"]>=A and x["symbol"] in grp and x["symbol"] in cache]
    if len(t)<50: continue
    df=pd.DataFrame(dict(g=[grp[x["symbol"]] for x in t],sym=[x["symbol"] for x in t],half=["2018-22" if x["entry_date"]<M else "2022-26" for x in t],
        ret=[x["ret"]-FEE for x in t],R=[np.clip((x["ret"]-FEE)/max(x["risk_pct"],1e-3),-10,50) for x in t]))
    df["rand"]=[rand_ret(x) for x in t]
    for (g,h),z in df.groupby(["g","half"]):
        rows.append(dict(strategy=name,group=g,half=h,trades=len(z),win_rate=(z.ret>0).mean(),avg_pct=100*z.ret.mean(),avg_R=z.R.mean(),
                         random_avg_pct=100*z.rand.mean(),edge_vs_random_pct=100*(z.ret.mean()-z.rand.mean()),
                         t_stat=(z.ret-z.rand).mean()/((z.ret-z.rand).std(ddof=1)/np.sqrt(len(z))) if len(z)>2 else np.nan))
    for g,z in df.groupby("g"):
        rows.append(dict(strategy=name,group=g,half="2018-26",trades=len(z),win_rate=(z.ret>0).mean(),avg_pct=100*z.ret.mean(),avg_R=z.R.mean(),
                         random_avg_pct=100*z.rand.mean(),edge_vs_random_pct=100*(z.ret.mean()-z.rand.mean()),
                         t_stat=(z.ret-z.rand).mean()/((z.ret-z.rand).std(ddof=1)/np.sqrt(len(z))) if len(z)>2 else np.nan))
    allz=df; rows.append(dict(strategy=name,group="ALL",half="2018-26",trades=len(allz),win_rate=(allz.ret>0).mean(),avg_pct=100*allz.ret.mean(),avg_R=allz.R.mean(),
        random_avg_pct=100*allz.rand.mean(),edge_vs_random_pct=100*(allz.ret.mean()-allz.rand.mean()),t_stat=np.nan))
R=pd.DataFrame(rows); R.to_csv("results/strategies_by_group_long.csv",index=False)
# wide: per strategy x group with both halves
w=R[R.half!="2018-26"].pivot_table(index=["strategy","group"],columns="half",values=["trades","avg_pct","edge_vs_random_pct","t_stat","win_rate"])
w.columns=[f"{a}_{b}" for a,b in w.columns]; w=w.reset_index()
full=R[R.half=="2018-26"][["strategy","group","trades","win_rate","avg_pct","avg_R","edge_vs_random_pct"]].rename(columns=lambda c: c if c in("strategy","group") else c+"_all")
w=w.merge(full,on=["strategy","group"]).merge(R[R.group=="ALL"][["strategy","avg_pct","win_rate"]].rename(columns={"avg_pct":"strategy_overall_avg_pct","win_rate":"strategy_overall_win"}),on="strategy")
w["holds_both_halves"]=(w["avg_pct_2018-22"]>0)&(w["avg_pct_2022-26"]>0)&(w["edge_vs_random_pct_2018-22"]>0)&(w["edge_vs_random_pct_2022-26"]>0)&(w["t_stat_2018-22"]>1.5)&(w["t_stat_2022-26"]>1.5)&(w["trades_2018-22"]>=30)&(w["trades_2022-26"]>=30)
w.to_csv("results/strategies_by_group.csv",index=False)
pd.set_option("display.width",250); pd.set_option("display.max_rows",300)
c=["strategy","group","trades_all","win_rate_all","avg_pct_all","strategy_overall_avg_pct","avg_pct_2018-22","avg_pct_2022-26","t_stat_2018-22","t_stat_2022-26"]
# hidden gems: strategy overall weak/negative, but a group holds in both halves
gem=w[w.holds_both_halves & (w.strategy_overall_avg_pct<0.3)]
print("HIDDEN EDGES (weak or losing overall, strong in one group in both halves):"); print(gem[c].round(2).to_string(index=False))
bad=w[(w["avg_pct_2018-22"]<0)&(w["avg_pct_2022-26"]<0)&(w.strategy.isin(list(pickle.load(open('results/pool.pkl','rb')))))]
print("\nBOT STRATEGIES THAT LOSE IN A GROUP IN BOTH HALVES:"); print(bad[c].round(2).to_string(index=False))
print("\ncounts: groups tested", len(w), "pass both halves", int(w.holds_both_halves.sum()))
