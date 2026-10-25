"""Rebuilds the 11 strategies of the final setup (and setup 5 extras) exactly as the backtest did:
original engine picks the entries, then the 10R exit is applied with one open trade per market."""
import numpy as np, pandas as pd
from . import config, engines, new_engines, filters, sr_and_rr, pdf_engines
from .engines import LONG

CORE_ORDER=["Crypto trend","Dip after bull flag","Bull flag","52-week high","Turtle breakout","Squeeze breakout",
            "Pullback in trend","Breakout-retest","Momentum 12-1","Triple MA","Dip after bull flag, quick exit"]

def universe(data):
    pick=lambda names:{s:d for s,d in data.items() if s in names}
    return pick(config.STOCKS),pick(config.ETFS),pick(config.CRYPTO),pick(config.FUTURES)

def tenR(tr,data,name): return sr_and_rr.restructure(tr,data,1.0,10.0,None,60,name)

def build(data, extras=False):
    stocks,etfs,crypto,futs=universe(data); swing={**stocks,**etfs,**crypto,**futs}; market=data["SPY"]
    P={}
    flags=engines.bull_flag(swing)
    rsi=engines.rsi2_reversion(swing,"long")
    dip=filters.regime(filters.after_recent(rsi,flags,20),market)
    P["Crypto trend"]=tenR(new_engines.crypto_trend(crypto,data["BTC-USD"]),data,"Crypto trend")
    P["Dip after bull flag"]=tenR(dip,data,"Dip after bull flag")
    P["Bull flag"]=tenR(flags,data,"Bull flag")
    P["52-week high"]=tenR(filters.regime(new_engines.high52(swing),market),data,"52-week high")
    P["Turtle breakout"]=tenR(filters.regime(new_engines.turtle(swing),market),data,"Turtle breakout")
    P["Squeeze breakout"]=tenR(new_engines.squeeze(swing),data,"Squeeze breakout")
    P["Pullback in trend"]=tenR(new_engines.trend_pullback(swing),data,"Pullback in trend")
    P["Breakout-retest"]=tenR(filters.regime(sr_and_rr.sr_breakout_retest(swing),market),data,"Breakout-retest")
    P["Momentum 12-1"]=engines.momentum_rotation(stocks,market,top_k=5,name="Momentum 12-1")
    P["Triple MA"]=engines.triple_ma(swing,"long")
    P["Dip after bull flag, quick exit"]=dip
    if extras:
        TECH=set("AAPL MSFT NVDA GOOGL GOOG META AVGO ADBE CRM AMD INTC CSCO ORCL IBM QCOM TXN ADI AMAT LRCX KLAC MU SNPS CDNS INTU NOW".split())
        X={"MA cross 20/60":pdf_engines.ma_cross_20_60_100(swing)("long"),
           "Stochastic reversal":pdf_engines.momentum_reversal(swing)("long"),
           "Swing contraction":pdf_engines.swing_contraction(swing)("long"),
           "RSI2 momentum":pdf_engines.rsi2_momentum(swing)("long"),
           "Heikin Ashi reversal":pdf_engines.heikin_ashi(swing)("long"),
           "20-day breakout + volume":engines.breakout20(swing,"long"),
           "IBS on index futures":[t for t in engines.ibs_reversion(swing,"long") if t["symbol"] in ("NQ=F","ES=F")]}
        P.update({"X "+k:v for k,v in X.items()})
        P["X Engulfing tech"]=[t for t in pdf_engines.engulfing(swing)("long") if t["symbol"] in TECH]
        P["X Hammer tech"]=[t for t in pdf_engines.hammer(swing)("long") if t["symbol"] in TECH]
    for k,v in P.items():
        for t in v: t["engine"]=k
    return P
