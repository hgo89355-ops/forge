# Halalbot paper trader

Paper trading only. No real orders are ever placed by this code.

- Runs once a day at 00:40 UTC (after the US close and the crypto daily close) as a Claude scheduled task.
- `python3 paper.py` downloads fresh daily candles, rebuilds the 11 strategies exactly as the backtest,
  replays both paper accounts from 2026-10-26 ($10,000 each) and writes the results.
- Results: `paper/latest_report.md` (short report), `paper/latest.json` (for Maus bot / dashboards),
  `paper/<setup>/account_value.csv`, `positions_and_orders.csv`, `closed_trades.csv`, `paper/reports/` (one per day).
- Setups: `main` (final setup: 10 strategies in a 70% main bucket at 1% risk + Crypto trend in a 30% bucket at 3% risk,
  monthly move, 50% cap) and `setup5` (company-type tilt + extras as half-size fill-ins), for comparison.
- Learn-from-mistakes: every 30 closed trades (60 for the 10R strategies) a strategy far below its backtest gets its risk
  halved, then paused if it stays below. State in `paper/strategy_status.json`.
