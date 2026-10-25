#!/usr/bin/env python3
"""
Search for the best strategy system (long/short stocks & ETFs, micro index futures, major crypto).

  python -m halalbot.run --data data/daily --out results [--forecasts kronos.csv] [--odds timemachine.csv]

Steps
  1. Generate every engine's trades on the whole history (signals use only past data).
  2. Build candidates: each engine alone, engine + filter(s), "confluence" combos, then blends of
     the best ones in one shared account, plus a core (momentum) + satellite (swing) split.
  3. Rank candidates on the IN-SAMPLE years only. Take the finalists to the OUT-OF-SAMPLE years.
  4. For finalists: coin-flip test, win-rate vs break-even test, deflated Sharpe (penalises us for
     how many combinations we tried), and year-by-year results.
"""
import argparse
import itertools
import json
import os

import numpy as np
import pandas as pd

from . import config, engines, filters
from .portfolio import RiskRules, simulate, asset_class
from .stats import by_year, coin_flip_test, deflated_sharpe, equity_metrics, trade_metrics


def load_dir(path):
    data = {}
    for f in sorted(os.listdir(path)):
        if not f.endswith(".csv"):
            continue
        df = pd.read_csv(os.path.join(path, f), parse_dates=["date"], index_col="date").sort_index()
        df.columns = [c.lower() for c in df.columns]
        df = df[["open", "high", "low", "close", "volume"]].dropna()
        df = df[~df.index.duplicated()]
        if len(df) > 300:
            data[f[:-4]] = engines.prepare(df)
    return data


def load_forecasts(path, data, col, out_dir, label, horizon=5):
    """Score a forecaster honestly, then add walk-forward calibrated probabilities (col + '_cal')."""
    from .forecasts import attach_outcomes, score, walk_forward_calibrate
    fc = pd.read_csv(path, parse_dates=["date"])
    fc = attach_outcomes(fc.rename(columns={col: "p_up"}), data, horizon)
    raw = score(fc, "p_up")
    fc = walk_forward_calibrate(fc, "p_up")
    calib = score(fc.dropna(subset=["p_up_cal"]), "p_up_cal")
    with open(os.path.join(out_dir, f"{label}_accuracy.txt"), "w") as f:
        for nm, r in (("raw", raw), ("calibrated", calib)):
            f.write(f"== {label} {nm} ==\n")
            f.write("\n".join(f"{k}: {v}" for k, v in r.items() if k != "calibration") + "\n")
            f.write(r["calibration"].to_string() + "\n\n")
    print(f"{label}: hit rate {raw['hit_rate']:.3f} vs always-up {raw['always_up_hit_rate']:.3f}, "
          f"Brier skill {raw['brier_skill']:.3f}, p(beats always-up) {raw['p_beats_always_up']:.3g}")
    passed = raw["p_beats_always_up"] < 0.05 and raw["brier_skill"] > 0
    print(f"{label}: {'PASSES - used as a filter' if passed else 'NO REAL SKILL - not used as a filter'}")
    fc = fc.rename(columns={"p_up_cal": "p_up_cal" if col == "p_up" else "p_win_cal"})
    return fc.set_index(["date", "symbol"]) if passed else None


def score_odds(path, all_trades, out_dir):
    """/trader-timemachine odds CSV: signal_date, symbol, engine, p_win. Scored against the
    backtested outcome of exactly that trade, then calibrated walk-forward."""
    from .forecasts import score, walk_forward_calibrate
    od = pd.read_csv(path, parse_dates=["signal_date"])
    tr = pd.DataFrame(all_trades)[["signal_date", "symbol", "engine", "ret"]]
    m = od.merge(tr, on=["signal_date", "symbol", "engine"], how="inner")
    m["up"] = (m["ret"] > 0).astype(int)
    m = m.rename(columns={"signal_date": "date", "p_win": "p_up"})
    raw = score(m, "p_up")
    m = walk_forward_calibrate(m, "p_up")
    with open(os.path.join(out_dir, "timemachine_accuracy.txt"), "w") as f:
        f.write("\n".join(f"{k}: {v}" for k, v in raw.items() if k != "calibration") + "\n")
        f.write(raw["calibration"].to_string() + "\n")
    passed = raw["p_beats_coin"] < 0.05 and raw["brier_skill"] > 0
    print(f"timemachine: hit {raw['hit_rate']:.3f}, Brier skill {raw['brier_skill']:.3f} -> "
          f"{'PASSES' if passed else 'NO REAL SKILL - not used'}")
    if not passed:
        return None
    return m.rename(columns={"p_up_cal": "p_win_cal"}).set_index(["date", "symbol"])


def index_orb_as_futures(bars5_index, data):
    """Model MNQ/MES day trades with 5-min QQQ/SPY bars: run the ORB on the ETF every day, then
    rescale prices to the futures level using the previous day's futures/ETF price ratio."""
    from .orb import orb_trades
    out = []
    for fut, etf in config.INDEX_PROXY.items():
        if etf not in bars5_index or fut not in data or etf not in data:
            continue
        tr = orb_trades({etf: bars5_index[etf]}, {etf: data[etf]}, top_n=1, min_atr=0.0)
        ratio = (data[fut]["close"] / data[etf]["close"]).dropna()
        for t in tr:
            if t["signal_date"] not in ratio.index:
                continue
            r = ratio.at[t["signal_date"]]
            t = dict(t, symbol=fut, engine="orb5_index_futures", entry_px=t["entry_px"] * r,
                     exit_px=t["exit_px"] * r, stop=t["stop"] * r)
            out.append(t)
    return out


def build_candidates(data, market, fc=None, intraday=None, index_orb=None):
    pick = lambda names: {s: d for s, d in data.items() if s in names}
    stocks, etfs, crypto, futs = pick(config.STOCKS), pick(config.ETFS), pick(config.CRYPTO), pick(config.FUTURES)
    swing = {**stocks, **etfs, **crypto, **futs}
    base = {}
    for name, fn in engines.ENGINE_SET().items():
        base[name] = fn(swing)
    base["momentum_long"] = engines.momentum_rotation(stocks, market, top_k=5, name="momentum_long")
    base["momentum_ls"] = engines.momentum_rotation(stocks, market, top_k=4, short_k=4, name="momentum_ls")
    if len(etfs) >= 4:
        base["etf_rotation"] = engines.momentum_rotation(etfs, market, top_k=2, name="etf_rotation")
    if len(crypto) >= 3:
        base["crypto_rotation"] = engines.momentum_rotation(crypto, crypto.get("BTC-USD", market), top_k=2,
                                                            name="crypto_rotation")
    base["pairs_2sided"] = engines.pairs(data, config.PAIRS, two_sided=True)
    base["pairs_long"] = engines.pairs(data, config.PAIRS, two_sided=False)
    if intraday:
        for w in ("long", "short", "both"):
            base[f"orb5_{w}"] = [t for t in intraday if w == "both" or (t["side"] > 0) == (w == "long")]
    if index_orb:
        base["orb5_index_futures"] = index_orb
    base = {k: v for k, v in base.items() if len(v) >= 10}

    cands = dict(base)
    fl = {
        "regime": lambda t: filters.regime(t, market),
        "leaders": lambda t: filters.momentum_leaders(t, swing, 0.5),
        "lowvol": lambda t: filters.low_volatility(t, swing, 0.5),
    }
    if fc is not None:
        fl["kronos"] = lambda t: filters.forecast_agrees(t, fc, 0.55)
    rotation = ("momentum_long", "momentum_ls", "etf_rotation", "crypto_rotation")
    for k, v in base.items():
        if k in rotation:
            continue
        for f1, g1 in fl.items():
            a = g1(v)
            cands[f"{k}+{f1}"] = a
            for f2, g2 in fl.items():
                if f2 > f1:
                    cands[f"{k}+{f1}+{f2}"] = g2(a)
    # confluence: the first pullback after a breakout / bull flag, in the breakout's direction
    for mr in ("rsi2_both", "ibs_both", "channel_both"):
        for trig in ("breakout_both", "bull_flag"):
            if mr in base and trig in base:
                same_dir = [t for t in filters.after_recent(base[mr], base[trig], 20)]
                trig_side = {}
                for o in base[trig]:
                    trig_side.setdefault(o["symbol"], []).append((o["signal_date"], o["side"]))
                keep = []
                for t in same_dir:
                    prior = [s for d, s in trig_side.get(t["symbol"], []) if d < t["signal_date"]]
                    if prior and prior[-1] == t["side"]:
                        keep.append(t)
                cands[f"{mr}_after_{trig}"] = keep
                cands[f"{mr}_after_{trig}+regime"] = filters.regime(keep, market)
    return base, {k: v for k, v in cands.items() if len(v) >= 10}


def evaluate(trades, data, rules, start, end):
    sim = simulate(trades, data, rules, start, end)
    em = equity_metrics(sim["equity"])
    tm = trade_metrics(sim["taken"]["ret"]) if len(sim["taken"]) else dict(trades=0)
    longs = sim["taken"][sim["taken"]["side"] > 0] if len(sim["taken"]) else []
    shorts = sim["taken"][sim["taken"]["side"] < 0] if len(sim["taken"]) else []
    return sim, {**em, **{f"t_{k}": v for k, v in tm.items()},
                 "long_win_rate": (longs["pnl"] > 0).mean() if len(longs) else np.nan,
                 "short_win_rate": (shorts["pnl"] > 0).mean() if len(shorts) else np.nan,
                 "n_short": len(shorts), "pdt_breaches": sim["pdt_breaches"],
                 "skipped_too_big": sim["skipped"].get("size", 0) if isinstance(sim["skipped"], dict) else 0}


def core_satellite(core, sat, data, rules, start, end, core_w=0.5):
    r1 = RiskRules(**{**rules.__dict__, "capital": rules.capital * core_w, "risk_per_trade": 0.02,
                      "max_positions": 8, "max_pos_pct": 0.25, "max_open_risk": 0.16})
    r2 = RiskRules(**{**rules.__dict__, "capital": rules.capital * (1 - core_w)})
    s1, s2 = simulate(core, data, r1, start, end), simulate(sat, data, r2, start, end)
    eq = pd.concat([s1["equity"], s2["equity"]], axis=1).ffill().fillna(0).sum(axis=1)
    taken = pd.concat([s1["taken"], s2["taken"]], ignore_index=True)
    em = equity_metrics(eq)
    tm = trade_metrics(taken["ret"]) if len(taken) else dict(trades=0)
    return dict(equity=eq, taken=taken), {**em, **{f"t_{k}": v for k, v in tm.items()}}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", default="results")
    ap.add_argument("--forecasts", help="Kronos CSV: date, symbol, p_up")
    ap.add_argument("--odds", help="timemachine CSV: signal_date, symbol, engine, p_win")
    ap.add_argument("--intraday", help="folder of 5-minute bar CSVs (stocks + QQQ/SPY)")
    ap.add_argument("--capital", type=float, default=5000)
    ap.add_argument("--finalists", type=int, default=15)
    ap.add_argument("--sims", type=int, default=1000)
    ap.add_argument("--no-kill", action="store_true", help="research mode: disable the 20%% drawdown kill switch")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    data = load_dir(args.data)
    mkey = next((k for k in (config.MARKET, "SPUS") if k in data), next(iter(data)))
    market = data[mkey]
    fc = load_forecasts(args.forecasts, data, "p_up", args.out, "kronos") if args.forecasts else None
    intraday, index_orb = [], []
    if args.intraday:
        from .orb import orb_trades
        bars5 = {f[:-4]: pd.read_csv(os.path.join(args.intraday, f), parse_dates=["date"], index_col="date")
                 for f in os.listdir(args.intraday) if f.endswith(".csv")}
        intraday = orb_trades({s: b for s, b in bars5.items() if s in config.STOCKS}, data)
        index_orb = index_orb_as_futures(bars5, data)
        print(f"ORB: {len(intraday)} stock day-trades, {len(index_orb)} index-futures day-trades")

    dates = market.index
    split = dates[int(len(dates) * config.IN_SAMPLE_FRACTION)]
    first = dates[260]
    rules = RiskRules(capital=args.capital, dd_kill=1.01 if args.no_kill else 0.20)
    print(f"{len(data)} symbols | in-sample {first.date()} -> {split.date()} | out-of-sample {split.date()} -> {dates[-1].date()}")

    base, cands = build_candidates(data, market, fc, intraday, index_orb)
    if args.odds:
        odds = score_odds(args.odds, sum(base.values(), []), args.out)
        if odds is not None:
            for k, v in list(base.items()):
                c = filters.odds_at_least(v, odds, 0.55)
                if len(c) >= 10:
                    cands[f"{k}+odds"] = c
    print(f"{len(cands)} single/filtered candidates")

    rows = {name: evaluate(tr, data, rules, first, split)[1] for name, tr in cands.items()}
    is_tab = pd.DataFrame(rows).T
    good = is_tab[(is_tab["t_trades"] >= 30)].sort_values("sharpe", ascending=False)
    seeds, seen = [], set()
    for n in good.index:
        eng = n.split("+")[0].split("_after_")[0].replace("_long", "").replace("_short", "").replace("_both", "")
        if eng not in seen:
            seeds.append(n)
            seen.add(eng)
        if len(seeds) == 7:
            break
    for k in (2, 3):
        for combo in itertools.combinations(seeds, k):
            name = " & ".join(combo)
            cands[name] = sum((cands[c] for c in combo), [])
            rows[name] = evaluate(cands[name], data, rules, first, split)[1]
    # ENSEMBLE: every sleeve that worked in-sample, all at once, smaller risk each (chosen on in-sample only)
    ok = [n for n in base if n in rows and rows[n].get("t_trades", 0) >= 30 and (rows[n].get("sharpe") or 0) > 0.3]
    if len(ok) >= 3:
        er = RiskRules(**{**rules.__dict__, "risk_per_trade": 0.005, "max_positions": 10, "max_open_risk": 0.06})
        name = "ENSEMBLE(" + ",".join(ok) + ")"
        cands[name] = sum((base[n] for n in ok), [])
        rows[name] = evaluate(cands[name], data, er, first, split)[1]
        ens_rules = (name, er)
    else:
        ens_rules = (None, None)
    core = base.get("momentum_long") or base.get("momentum_ls")
    if core:
        for sat in seeds[:4]:
            if sat.startswith("momentum"):
                continue
            name = f"CORE momentum | SAT {sat}"
            rows[name] = core_satellite(core, cands[sat], data, rules, first, split)[1]
            cands[name] = ("core_sat", sat)
    n_trials = len(rows)
    is_tab = pd.DataFrame(rows).T
    is_tab.to_csv(os.path.join(args.out, "in_sample_all.csv"))
    fin = is_tab[(is_tab["t_trades"] >= 30)].sort_values("sharpe", ascending=False).head(args.finalists)
    if ens_rules[0] and ens_rules[0] not in fin.index:
        fin = pd.concat([fin, is_tab.loc[[ens_rules[0]]]])
    print(f"{n_trials} candidates tried in-sample; {len(fin)} finalists go out-of-sample")

    report = []
    for name in fin.index:
        c = cands[name]
        if isinstance(c, tuple):
            sim, m = core_satellite(core, cands[c[1]], data, rules, split, None)
            trades_oos = [t for t in core + cands[c[1]] if t["entry_date"] >= split]
        else:
            r_use = ens_rules[1] if name == ens_rules[0] else rules
            sim, m = evaluate(c, data, r_use, split, None)
            trades_oos = [t for t in c if t["entry_date"] >= split]
        cf = coin_flip_test(trades_oos, data, n_sims=args.sims) if trades_oos else {}
        daily = sim["equity"].pct_change().dropna()
        sr_d = daily.mean() / daily.std() if daily.std() > 0 else 0
        dsr = deflated_sharpe(sr_d, len(daily), len(fin), daily.skew(), daily.kurt() + 3)
        report.append(dict(candidate=name, is_sharpe=fin.at[name, "sharpe"], **{f"oos_{k}": v for k, v in m.items()},
                           coin_p=cf.get("p_value"), coin_real_avg=cf.get("real_avg_trade"),
                           coin_random_avg=cf.get("random_avg_trade"), deflated_sharpe_prob=dsr))
        by_year(sim["taken"]).to_csv(os.path.join(args.out, f"by_year_{len(report):02d}.csv"))
        sim["equity"].to_csv(os.path.join(args.out, f"equity_{len(report):02d}.csv"))
        sim["taken"].to_csv(os.path.join(args.out, f"trades_{len(report):02d}.csv"), index=False)
    rep = pd.DataFrame(report)
    rep["passes"] = (rep["coin_p"] < 0.05) & (rep["oos_sharpe"] > 0.5) & (rep["deflated_sharpe_prob"] > 0.95)
    rep.to_csv(os.path.join(args.out, "finalists_out_of_sample.csv"), index=False)
    cols = ["candidate", "is_sharpe", "oos_sharpe", "oos_cagr", "oos_max_drawdown", "oos_t_trades",
            "oos_t_win_rate", "oos_t_breakeven_win_rate", "oos_t_profit_factor", "coin_p", "deflated_sharpe_prob", "passes"]
    with pd.option_context("display.width", 250, "display.max_colwidth", 70):
        print(rep[[c for c in cols if c in rep]].round(3).to_string(index=False))
    json.dump(dict(n_trials=n_trials, split=str(split.date())), open(os.path.join(args.out, "meta.json"), "w"))


if __name__ == "__main__":
    main()
