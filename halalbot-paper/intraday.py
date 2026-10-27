"""Midday check (paper trading only, places no orders).
Prices the paper accounts with live prices during the US session and rewrites the dashboard's
account.json and positions.json. The nightly run (paper.py) stays the official record and
replaces these numbers with closing prices.

- open trades: valued at the live price; a stop or target touched today is shown as hit
- orders for today's open: shown as bought at today's real open price (+0.1% cost, as the bot assumes)
"""
import json, os, time, datetime as dt
import pandas as pd, requests

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, "paper")
OUT = os.path.join(P, "dashboard")
LABEL = {"main": "Main setup", "setup5": "Setup 5"}
COST = 0.001


def today_bars(sym):
    """Today's open, high, low and last price."""
    if sym.endswith("-USD"):
        try:
            now = int(time.time() * 1000); day0 = now - now % 86_400_000
            r = requests.post("https://api.hyperliquid.xyz/info", timeout=30, json={"type": "candleSnapshot",
                "req": {"coin": sym[:-4], "interval": "5m", "startTime": day0, "endTime": now}}).json()
            d = pd.DataFrame(r).astype({"o": float, "h": float, "l": float, "c": float})
            return dict(open=d["o"].iat[0], high=d["h"].max(), low=d["l"].min(), last=d["c"].iat[-1], date=str(pd.Timestamp(day0, unit="ms").date()))
        except Exception:
            return None
    import yfinance as yf
    for k in range(3):
        try:
            d = yf.Ticker(sym).history(period="1d", interval="5m", auto_adjust=False)
            if len(d):
                return dict(open=float(d["Open"].iat[0]), high=float(d["High"].max()), low=float(d["Low"].min()),
                            last=float(d["Close"].iat[-1]), date=str(d.index[-1].date()))
        except Exception:
            pass
        time.sleep(5 * (k + 1))
    return None


def main():
    os.makedirs(OUT, exist_ok=True)
    now = dt.datetime.now(dt.timezone.utc)
    stamp = now.strftime("%Y-%m-%d %H:%M UTC")
    acct_rows, pos_rows = [], []
    cache = {}
    for key, label in LABEL.items():
        d = os.path.join(P, key)
        a = pd.read_csv(os.path.join(d, "account_value.csv"))
        a.columns = ["date", "main_bucket", "high_reward_bucket", "account"]
        last_val = float(a["account"].iat[-1])
        f = os.path.join(d, "positions_and_orders.csv")
        pos = pd.read_csv(f) if os.path.exists(f) and os.path.getsize(f) > 5 else pd.DataFrame()
        change, live_day = 0.0, None
        for _, r in pos.iterrows():
            s = r["symbol"]
            b = cache.get(s) or today_bars(s); cache[s] = b
            row = {k: (None if pd.isna(v) else v) for k, v in r.items()}
            row["setup"] = label
            if b is None:
                row["id"] = f"{label} {s} {r['strategy']} {r['status']}"; pos_rows.append(row); continue
            if b["date"] <= str(a["date"].iat[-1])[:10]:      # market hasn't traded since the nightly run
                row["id"] = f"{label} {s} {r['strategy']} {r['status']}"; pos_rows.append(row); continue
            live_day = live_day or b["date"]
            stop, tgt = r.get("stop_loss"), r.get("take_profit")
            if r["status"] == "open":
                entry_ref, qty = float(r["last_price"]), float(r["quantity"])
            elif str(r["status"]).startswith("BUY"):
                fill = b["open"] * (1 + COST); qty = float(r["value_usd"]) / fill if r.get("value_usd") == r.get("value_usd") else float(r["quantity"])
                entry_ref = fill
                row.update(status="open", entry_date=b["date"], entry_price=round(fill, 4), quantity=round(qty, 6))
            else:                                             # a sell at today's open
                qty = float(r["quantity"]); change += qty * (b["open"] * (1 - COST) - float(r["last_price"]))
                row.update(status="sold at today's open", last_price=round(b["open"], 4))
                row["id"] = f"{label} {s} {r['strategy']} sold"; pos_rows.append(row); continue
            price = b["last"]
            if stop == stop and stop is not None and b["low"] <= float(stop):
                price = float(stop); row["status"] = "stop hit today"
            elif tgt == tgt and tgt is not None and b["high"] >= float(tgt):
                price = float(tgt); row["status"] = "target hit today"
            change += qty * (price - entry_ref)
            entry_price = float(row["entry_price"])
            row.update(last_price=round(price, 4), unrealised_pnl_usd=round(qty * (price - entry_price), 2),
                       value_usd=round(qty * price, 2))
            row["id"] = f"{label} {s} {r['strategy']} {row['status']}"
            pos_rows.append(row)
        hist = a.copy(); hist["setup"] = label
        start = pd.DataFrame([{"date": (pd.Timestamp(a["date"].iat[0]) - pd.Timedelta(days=1)).strftime("%Y-%m-%d"),
                               "main_bucket": 7000.0, "high_reward_bucket": 3000.0, "account": 10000.0, "setup": label}])
        hist = pd.concat([start, hist]).drop_duplicates("date", keep="last")
        hist["date"] = pd.to_datetime(hist["date"]).dt.strftime("%Y-%m-%d")
        hist["as_of"] = "close"
        if live_day and live_day > hist["date"].iat[-1]:
            hist = pd.concat([hist, pd.DataFrame([{"date": live_day, "main_bucket": None, "high_reward_bucket": None,
                                                   "account": round(last_val + change, 2), "setup": label, "as_of": "live " + stamp}])])
        hist["pnl_since_start"] = (hist["account"] - 10000).round(2)
        acct_rows.append(hist)
    acct = pd.concat(acct_rows)[["date", "setup", "account", "pnl_since_start", "main_bucket", "high_reward_bucket", "as_of"]]
    json.dump(json.loads(acct.to_json(orient="records")), open(os.path.join(OUT, "account.json"), "w"))
    cols = ["id", "setup", "symbol", "strategy", "status", "entry_date", "entry_price", "quantity", "value_usd", "stop_loss", "take_profit", "last_price", "unrealised_pnl_usd", "risk_usd"]
    json.dump(json.loads(pd.DataFrame(pos_rows).reindex(columns=cols).to_json(orient="records")), open(os.path.join(OUT, "positions.json"), "w"))
    for _, r in acct.groupby("setup").tail(1).iterrows():
        print(f"{r['setup']}: ${r['account']:,.2f} ({r['pnl_since_start']:+,.2f} since start) {r['as_of']}")


if __name__ == "__main__":
    main()
