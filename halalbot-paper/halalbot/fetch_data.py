#!/usr/bin/env python3
"""
Run on YOUR computer (it has internet access). Downloads:
  * daily OHLCV (split/dividend adjusted) for the stock, ETF, index-futures (NQ=F, ES=F continuous
    front month) and major-crypto universe via yfinance, since 2005.
  * optional 5-minute bars from Alpaca (free with your paper keys) for the intraday ORB engine:
    set ALPACA_API_KEY and ALPACA_SECRET_KEY in the environment.

  pip install yfinance alpaca-py pandas
  python fetch_data.py --out data
"""
import argparse
import os
import sys
import time

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from halalbot import config  # noqa: E402


def daily(symbols, out, start="2005-01-01"):
    import yfinance as yf
    os.makedirs(out, exist_ok=True)
    for s in symbols:
        try:
            df = yf.download(s, start=start, auto_adjust=True, progress=False, multi_level_index=False)
        except TypeError:
            df = yf.download(s, start=start, auto_adjust=True, progress=False)
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)
        if df is None or df.empty:
            print("  no data:", s)
            continue
        df = df.rename(columns=str.lower)[["open", "high", "low", "close", "volume"]]
        df.index.name = "date"
        df.to_csv(os.path.join(out, f"{s}.csv"))
        print(f"  {s}: {len(df)} days {df.index[0].date()} -> {df.index[-1].date()}")
        time.sleep(0.3)


def intraday_alpaca(symbols, out, start="2016-01-01"):
    from alpaca.data.historical import StockHistoricalDataClient
    from alpaca.data.requests import StockBarsRequest
    from alpaca.data.timeframe import TimeFrame, TimeFrameUnit
    key, sec = os.environ.get("ALPACA_API_KEY"), os.environ.get("ALPACA_SECRET_KEY")
    if not key:
        print("ALPACA_API_KEY not set; skipping 5-minute data")
        return
    cli = StockHistoricalDataClient(key, sec)
    os.makedirs(out, exist_ok=True)
    for s in symbols:
        req = StockBarsRequest(symbol_or_symbols=s, timeframe=TimeFrame(5, TimeFrameUnit.Minute),
                               start=pd.Timestamp(start, tz="UTC"), adjustment="all", feed="iex")
        try:
            df = cli.get_stock_bars(req).df
        except Exception as e:  # noqa: BLE001
            print("  failed", s, e)
            continue
        if df.empty:
            continue
        df = df.reset_index().set_index("timestamp")
        df.index = df.index.tz_convert("America/New_York").tz_localize(None)
        df = df[["open", "high", "low", "close", "volume"]].between_time("09:30", "15:55")
        df.index.name = "date"
        df.to_csv(os.path.join(out, f"{s}.csv"))
        print(f"  {s}: {len(df)} 5-min bars")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data")
    ap.add_argument("--no-intraday", action="store_true")
    a = ap.parse_args()
    syms = list(dict.fromkeys(config.STOCKS + config.ETFS + config.FUTURES + config.CRYPTO))
    print("Daily bars ...")
    daily(syms, os.path.join(a.out, "daily"))
    if not a.no_intraday:
        print("5-minute bars (Alpaca) ...")
        intraday_alpaca(config.STOCKS + list(config.INDEX_PROXY.values()), os.path.join(a.out, "intraday5"))
