"""Turn the paper account's results into the JSON files the Halalbot Paper Account dashboard reads.
Writes paper/dashboard/{account,positions,closed,signals,alerts}.json (row objects)."""
import json, os
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, "paper")
OUT = os.path.join(P, "dashboard")
LABEL = {"main": "Main setup", "setup5": "Setup 5"}


def rows(df):
    return json.loads(df.to_json(orient="records", date_format="iso"))


def main():
    os.makedirs(OUT, exist_ok=True)
    summ = json.load(open(os.path.join(P, "latest.json")))
    start = pd.Timestamp(summ["paper_start"]) - pd.Timedelta(days=1)
    acct, pos, closed = [], [], []
    for key, label in LABEL.items():
        d = os.path.join(P, key)
        a = pd.read_csv(os.path.join(d, "account_value.csv"))
        a.columns = ["date", "main_bucket", "high_reward_bucket", "account"]
        a = pd.concat([pd.DataFrame([{"date": str(start.date()), "main_bucket": 7000.0, "high_reward_bucket": 3000.0, "account": 10000.0}]), a])
        a = a.drop_duplicates("date", keep="last")
        a["date"] = pd.to_datetime(a["date"]).dt.strftime("%Y-%m-%d")
        a["setup"] = label
        a["pnl_since_start"] = (a["account"] - 10000).round(2)
        acct.append(a)
        f = os.path.join(d, "positions_and_orders.csv")
        if os.path.exists(f) and os.path.getsize(f) > 5:
            p = pd.read_csv(f); p["setup"] = label
            p["id"] = label + " " + p["symbol"] + " " + p["strategy"] + " " + p["status"]
            pos.append(p)
        f = os.path.join(d, "closed_trades.csv")
        if os.path.exists(f) and os.path.getsize(f) > 5:
            c = pd.read_csv(f); c["setup"] = label
            c["id"] = label + " " + c["symbol"] + " " + c["engine"] + " " + c["entry_date"].astype(str)
            closed.append(c)
    json.dump(rows(pd.concat(acct)[["date", "setup", "account", "pnl_since_start", "main_bucket", "high_reward_bucket"]]), open(os.path.join(OUT, "account.json"), "w"))
    cols = ["id", "setup", "symbol", "strategy", "status", "entry_date", "entry_price", "quantity", "value_usd", "stop_loss", "take_profit", "last_price", "unrealised_pnl_usd", "risk_usd"]
    pdf = pd.concat(pos) if pos else pd.DataFrame(columns=cols)
    json.dump(rows(pdf.reindex(columns=cols)), open(os.path.join(OUT, "positions.json"), "w"))
    ccols = ["id", "setup", "symbol", "engine", "entry_date", "exit_date", "reason", "pnl_usd", "r_multiple", "left_on_table_usd"]
    cdf = pd.concat(closed) if closed else pd.DataFrame(columns=ccols)
    json.dump(rows(cdf.reindex(columns=ccols)), open(os.path.join(OUT, "closed.json"), "w"))
    sig = os.path.join(P, "signals_log.csv")
    if os.path.exists(sig):
        s = pd.read_csv(sig)
        s["id"] = s["date"].astype(str) + " " + s["market"] + " " + s["strategy"] + " " + s["source"]
        s = s.drop_duplicates("id").sort_values("date", ascending=False).head(400)
        json.dump(rows(s), open(os.path.join(OUT, "signals.json"), "w"))
    al = json.load(open(os.path.join(P, "alerts.json"))) if os.path.exists(os.path.join(P, "alerts.json")) else {"alerts": [], "date": ""}
    json.dump([{"n": i + 1, "date": al.get("date", ""), "alert": a} for i, a in enumerate(al.get("alerts", []))],
              open(os.path.join(OUT, "alerts.json"), "w"))
    print("dashboard files written to", OUT)


if __name__ == "__main__":
    main()
