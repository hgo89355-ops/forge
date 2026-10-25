# halalbot – strategy research engine

Long and short stocks/ETFs, micro index futures (MNQ/MES), major crypto. Excluded: meme coins, prediction markets.
Margin account under $10k: 2x gross cap, borrow fees, margin interest, PDT rule (3 stock day trades per 5 sessions).

## Run order (on the linked computer for steps 1–2)
1. `pip install yfinance alpaca-py pandas numpy scipy statsmodels`
   `python halalbot/fetch_data.py --out data`  (set ALPACA_API_KEY / ALPACA_SECRET_KEY for 5-min bars)
2. Kronos: `git clone https://github.com/shiyu-coder/Kronos && pip install -r Kronos/requirements.txt`
   `python halalbot/kronos_forecast.py --kronos ./Kronos --data data/daily --out kronos_forecasts.csv`
3. `python -m halalbot.run --data data/daily --intraday data/intraday5 --forecasts kronos_forecasts.csv [--odds timemachine_odds.csv] --out results`

## What the search does
- Engines (each long, short and both): RSI(2) reversion, IBS reversion, channel fade, 20-day breakout/breakdown (2R and trailing),
  triple MA; plus bull flag, momentum (long and long-short), ETF and crypto rotation, two-sided and long-only pairs,
  5-min ORB on stocks in play, and 5-min ORB on QQQ/SPY traded as MNQ/MES.
- Filters: market regime, momentum leaders, low volatility, Kronos, timemachine odds; "first pullback after a breakout".
- Blends of the best ones in one account, and a core (momentum) + satellite (swing) split.
- Ranked on the first 60% of history only; judged on the last 40%.
- A finalist passes only if: time-shifted coin-flip p < 0.05, out-of-sample Sharpe > 0.5, and deflated Sharpe > 0.95
  (which penalises the number of combinations tried).
- Kronos / timemachine are used as filters ONLY if they beat "always say up" out of sample (Brier skill > 0).

## Validation on synthetic data
- Pure random-walk data, 223 combinations tried (long+short version): in-sample "winners" had Sharpe up to 1.8 and NONE passed.
- Data with an injected short-term-reversal edge: the mean-reversion engines were found and passed; trend engines were correctly rejected.
