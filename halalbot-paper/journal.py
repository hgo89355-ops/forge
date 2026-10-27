"""Trade journal for the Trading Log. Run after paper.py.
Writes paper/journal/:
  trades.csv      every paper trade (open and closed) with its strategy, entry, stop, target, exit, P&L, R, won
  scoreboard.csv  per strategy: live closed trades, live wins, live win rate, backtest win rate (2018-2026),
                  updated win rate (backtest + live combined), live avg R vs backtest avg R
  days.csv        per day and setup: account, day P&L, winning day
  log_tables.md   the same three tables as Markdown, ready to paste into the Trading Log
"""
import os
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, "paper")
OUT = os.path.join(P, "journal")
LABEL = {"main": "Main setup", "setup5": "Setup 5"}


def read(path):
    return pd.read_csv(path) if os.path.exists(path) and os.path.getsize(path) > 5 else pd.DataFrame()


def main():
    os.makedirs(OUT, exist_ok=True)
    trades, days = [], []
    for key, label in LABEL.items():
        d = os.path.join(P, key)
        pos = read(os.path.join(d, "positions_and_orders.csv"))
        for _, r in pos.iterrows():
            trades.append(dict(setup=label, strategy=r["strategy"], market=r["symbol"],
                               status="open" if r["status"] == "open" else r["status"].lower(),
                               entry_date=r["entry_date"], entry_price=round(r["entry_price"], 2),
                               stop=round(r["stop_loss"], 2),
                               target=round(r["take_profit"], 2) if pd.notna(r.get("take_profit")) else None,
                               exit_date=None, exit_reason=None,
                               pnl_usd=round(r["unrealised_pnl_usd"], 2), R=None, won=None, left_on_table_usd=None))
        cl = read(os.path.join(d, "closed_trades.csv"))
        for _, r in cl.iterrows():
            trades.append(dict(setup=label, strategy=r["engine"], market=r["symbol"], status="closed",
                               entry_date=r["entry_date"], entry_price=round(r.get("entry_price", float("nan")), 2) if "entry_price" in r else None,
                               stop=None, target=None, exit_date=r["exit_date"], exit_reason=r["reason"],
                               pnl_usd=round(r["pnl_usd"], 2), R=round(r["r_multiple"], 2) if pd.notna(r.get("r_multiple")) else None,
                               won="yes" if r["pnl_usd"] > 0 else "no", left_on_table_usd=r.get("left_on_table_usd")))
        a = read(os.path.join(d, "account_value.csv"))
        if len(a):
            a.columns = ["date", "main_bucket", "high_reward_bucket", "account"]
            prev = pd.concat([pd.Series([10_000.0]), a["account"].iloc[:-1]], ignore_index=True)
            for (_, r), p in zip(a.iterrows(), prev):
                days.append(dict(date=r["date"], setup=label, account=round(r["account"], 2),
                                 day_pnl=round(r["account"] - p, 2), winning_day="yes" if r["account"] > p else "no"))
    T = pd.DataFrame(trades, columns=["setup", "strategy", "market", "status", "entry_date", "entry_price", "stop", "target",
                                      "exit_date", "exit_reason", "pnl_usd", "R", "won", "left_on_table_usd"])
    T = T.sort_values(["setup", "entry_date", "strategy"], ascending=[True, False, True])
    T.to_csv(os.path.join(OUT, "trades.csv"), index=False)

    bt = read(os.path.join(HERE, "backtests", "strategy_stats.csv"))
    bt = bt[bt["period"] == "All 2018–2026"].set_index("strategy") if len(bt) else pd.DataFrame()
    rows = []
    for strat in sorted(set(T["strategy"]) | set(bt.index if len(bt) else [])):
        live = T[(T["strategy"] == strat) & (T["status"] == "closed") & (T["setup"] == "Setup 5" if strat.startswith("X ") else T["setup"] == "Main setup")]
        if strat in ("PB tech", "PB rest", "TU fin", "TU rest"):
            continue
        n, w = len(live), int((live["won"] == "yes").sum())
        bn = int(bt.loc[strat, "trades"]) if strat in bt.index else 0
        bw = round(bn * bt.loc[strat, "win_rate"] / 100) if bn else 0
        rows.append(dict(strategy=strat, open_now=int(((T["strategy"] == strat) & (T["status"] == "open")).sum()),
                         live_closed=n, live_wins=w, live_win_rate=round(100 * w / n, 1) if n else None,
                         backtest_trades=bn, backtest_win_rate=round(bt.loc[strat, "win_rate"], 1) if bn else None,
                         updated_win_rate=round(100 * (bw + w) / (bn + n), 1) if bn + n else None,
                         live_avg_R=round(live["R"].astype(float).mean(), 2) if n else None,
                         backtest_avg_R=round(bt.loc[strat, "avg_R"], 2) if bn else None))
    S = pd.DataFrame(rows)
    S.to_csv(os.path.join(OUT, "scoreboard.csv"), index=False)
    D = pd.DataFrame(days).sort_values(["date", "setup"], ascending=[False, True])
    D.to_csv(os.path.join(OUT, "days.csv"), index=False)

    def md(df):
        df = df.fillna("–")
        return "| " + " | ".join(df.columns) + " |\n| " + " | ".join("---" for _ in df.columns) + " |\n" + \
               "\n".join("| " + " | ".join(str(v) for v in r) + " |" for r in df.values)
    with open(os.path.join(OUT, "log_tables.md"), "w") as f:
        f.write("### Trades\n\n" + md(T) + "\n\n### Strategy scoreboard\n\n" + md(S) + "\n\n### Days\n\n" + md(D) + "\n")
    print(open(os.path.join(OUT, "log_tables.md")).read())


if __name__ == "__main__":
    main()
