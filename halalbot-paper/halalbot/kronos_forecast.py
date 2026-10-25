#!/usr/bin/env python3
"""
Run on YOUR computer. Produces walk-forward Kronos forecasts for the accuracy test.

  git clone https://github.com/shiyu-coder/Kronos && pip install -r Kronos/requirements.txt
  python kronos_forecast.py --kronos ./Kronos --data data/daily --out kronos_forecasts.csv

For each symbol and each forecast date (every `--every` trading days), Kronos sees ONLY the
previous `--context` daily bars and predicts the next `--horizon` bars. We draw `--samples`
independent forecast paths; p_up = share of paths whose final close is above today's close.
Output columns: date, symbol, p_up, pred_ret (mean predicted return).

NOTE: check the Kronos README once the repo is cloned; if the predictor's arguments have changed,
adjust `run_one` (it is the only place that calls Kronos).
"""
import argparse
import os
import sys

import numpy as np
import pandas as pd


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kronos", required=True, help="path to the cloned Kronos repo")
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", default="kronos_forecasts.csv")
    ap.add_argument("--model", default="NeoQuasar/Kronos-small")
    ap.add_argument("--tokenizer", default="NeoQuasar/Kronos-Tokenizer-base")
    ap.add_argument("--context", type=int, default=400)
    ap.add_argument("--horizon", type=int, default=5)
    ap.add_argument("--samples", type=int, default=10)
    ap.add_argument("--every", type=int, default=5, help="forecast every N trading days")
    ap.add_argument("--start", default="2016-01-01")
    ap.add_argument("--symbols", default="", help="comma list; default = all files")
    a = ap.parse_args()

    sys.path.insert(0, a.kronos)
    import torch
    from model import Kronos, KronosPredictor, KronosTokenizer

    dev = "mps" if torch.backends.mps.is_available() else ("cuda:0" if torch.cuda.is_available() else "cpu")
    tok = KronosTokenizer.from_pretrained(a.tokenizer)
    mdl = Kronos.from_pretrained(a.model)
    pred = KronosPredictor(mdl, tok, device=dev, max_context=512)
    print("device:", dev)

    def run_one(hist):
        x = hist[["open", "high", "low", "close", "volume"]].reset_index(drop=True)
        x_ts = pd.Series(hist.index)
        y_ts = pd.Series(pd.bdate_range(hist.index[-1] + pd.Timedelta(days=1), periods=a.horizon))
        finals = []
        for _ in range(a.samples):
            p = pred.predict(df=x, x_timestamp=x_ts, y_timestamp=y_ts, pred_len=a.horizon,
                             T=1.0, top_p=0.9, sample_count=1, verbose=False)
            finals.append(float(p["close"].iloc[-1]))
        return np.array(finals)

    files = sorted(f for f in os.listdir(a.data) if f.endswith(".csv"))
    want = set(a.symbols.split(",")) if a.symbols else None
    done = set()
    if os.path.exists(a.out):
        prev = pd.read_csv(a.out)
        done = set(zip(prev["date"], prev["symbol"]))
    for f in files:
        sym = f[:-4]
        if want and sym not in want:
            continue
        df = pd.read_csv(os.path.join(a.data, f), parse_dates=["date"], index_col="date").sort_index()
        dates = df.index[(df.index >= a.start)]
        rows = []
        for i, d in enumerate(dates[::a.every]):
            if (str(d.date()), sym) in done:
                continue
            hist = df[df.index <= d].tail(a.context)
            if len(hist) < a.context:
                continue
            finals = run_one(hist)
            c0 = hist["close"].iloc[-1]
            rows.append(dict(date=d.date(), symbol=sym, p_up=float((finals > c0).mean()),
                             pred_ret=float(finals.mean() / c0 - 1)))
            if len(rows) % 25 == 0:
                pd.DataFrame(rows).to_csv(a.out, mode="a", header=not os.path.exists(a.out), index=False)
                print(f"  {sym} {d.date()} ({len(rows)} saved)")
                rows = []
        if rows:
            pd.DataFrame(rows).to_csv(a.out, mode="a", header=not os.path.exists(a.out), index=False)
        print("done", sym)


if __name__ == "__main__":
    main()
