"""
Sends the main setup's orders to Mohamed's Alpaca PAPER account (paper-api.alpaca.markets only).

The API keys are never in this code or the repo: the cloud environment's network secret adds the
APCA-API-KEY-ID / APCA-API-SECRET-KEY headers to requests for paper-api.alpaca.markets.
(For a local run you may instead set the environment variables APCA_API_KEY_ID / APCA_API_SECRET_KEY.)

What it does, after paper.py has written paper/main/positions_and_orders.csv:
  * BUY AT NEXT OPEN  -> a whole-share market order for the next open with its stop loss and take profit
                         attached (Alpaca "bracket" order). Size = the bot's quantity scaled by
                         Alpaca equity / bot account value, so a $100,000 Alpaca account trades 10x a $10,000 bot.
  * SELL AT NEXT OPEN -> cancels that market's open stop/target orders and closes the position at the open.
  * crypto            -> spot market order (Alpaca has no bracket orders for crypto); stops are checked
                         each night by the bot and closed with a SELL.
  * markets Alpaca doesn't list (index futures, BNB) are skipped and logged.
Every order carries a fixed client_order_id, so running it twice the same night can't double an order.
Writes paper/alpaca/latest.json (account, positions, what was sent) for the report and dashboard.

python3 alpaca_trader.py --check   read the account only (proves the keys work)
python3 alpaca_trader.py --test    send one 1-share SPY limit order at $1 (can't fill), then cancel it
python3 alpaca_trader.py           send tonight's orders
"""
import json, math, os, sys, datetime as dt
import pandas as pd, requests

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "https://paper-api.alpaca.markets/v2"          # paper only: this file never talks to a live account
OUT = os.path.join(HERE, "paper", "alpaca")
NOT_ON_ALPACA = {"NQ=F", "ES=F", "BNB-USD"}


def headers():
    h = {"Content-Type": "application/json"}
    if os.environ.get("APCA_API_KEY_ID") and os.environ.get("APCA_API_SECRET_KEY"):
        h["APCA-API-KEY-ID"] = os.environ["APCA_API_KEY_ID"]; h["APCA-API-SECRET-KEY"] = os.environ["APCA_API_SECRET_KEY"]
    return h


def api(method, path, **kw):
    r = requests.request(method, BASE + path, headers=headers(), timeout=30, **kw)
    if r.status_code >= 400:
        raise RuntimeError(f"{method} {path} -> {r.status_code}: {r.text[:300]}")
    return r.json() if r.text else {}


def alpaca_symbol(sym):
    return sym.replace("-USD", "/USD") if sym.endswith("-USD") else sym.replace("-", ".")   # BRK-B -> BRK.B


def snapshot():
    acct = api("GET", "/account")
    pos = api("GET", "/positions")
    return acct, pos


def main():
    os.makedirs(OUT, exist_ok=True)
    mode = sys.argv[1] if len(sys.argv) > 1 else "--trade"
    stamp = dt.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    try:
        acct, pos = snapshot()
    except Exception as e:                     # record why, so the repo shows what happened
        json.dump(dict(at=stamp, mode=mode, ok=False, error=str(e)[:500]), open(os.path.join(OUT, "check.json"), "w"), indent=1)
        print("ALPACA ERROR:", str(e)[:500]); sys.exit(1)
    json.dump(dict(at=stamp, mode=mode, ok=True, equity=float(acct["equity"]), positions=len(pos)),
              open(os.path.join(OUT, "check.json"), "w"), indent=1)
    print(f"Alpaca paper account {acct.get('account_number')}: equity ${float(acct['equity']):,.2f}, cash ${float(acct['cash']):,.2f}, {len(pos)} positions")
    if mode == "--check":
        return
    if mode == "--test":
        o = api("POST", "/orders", json={"symbol": "SPY", "qty": "1", "side": "buy", "type": "limit", "limit_price": "1",
                                         "time_in_force": "day", "client_order_id": "hb-test-" + dt.datetime.utcnow().strftime("%Y%m%d%H%M%S")})
        print("test order accepted:", o["id"], o["status"])
        api("DELETE", f"/orders/{o['id']}")
        print("test order cancelled")
        return

    summ = json.load(open(os.path.join(HERE, "paper", "latest.json")))
    if not summ.get("data_ok", True):
        msg = (f"NOT TRADING: stock prices are stale (last candle {summ.get('last_stock_candle')}, "
               f"expected {summ.get('expected_stock_candle')}). No orders sent.")
        print(msg)
        json.dump(dict(at=dt.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"), equity=float(acct["equity"]),
                       cash=float(acct["cash"]), last_equity=float(acct.get("last_equity", acct["equity"])),
                       sent=[], skipped=[dict(symbol="all", why=msg)]), open(os.path.join(OUT, "latest.json"), "w"), indent=1)
        return
    bot_value = float(summ["setups"]["main"]["account_value"])
    scale = float(acct["equity"]) / bot_value
    f = os.path.join(HERE, "paper", "main", "positions_and_orders.csv")
    orders = pd.read_csv(f) if os.path.exists(f) and os.path.getsize(f) > 5 else pd.DataFrame()
    held = {p["symbol"]: p for p in pos}
    sent, skipped = [], []
    tag = summ["setups"]["main"]["last_day"].replace("-", "")
    if len(orders):
        for _, r in orders[orders["status"].str.startswith("SELL")].iterrows():
            sym = alpaca_symbol(r["symbol"]); key = sym.replace("/", "")
            if key not in held:
                skipped.append(dict(symbol=r["symbol"], why="no Alpaca position to sell")); continue
            for o in api("GET", "/orders", params={"status": "open", "symbols": sym}):
                api("DELETE", f"/orders/{o['id']}")
            res = api("DELETE", f"/positions/{key}")
            sent.append(dict(symbol=r["symbol"], action="sell (close at next open)", strategy=r["strategy"], order=res.get("id")))
        for _, r in orders[orders["status"].str.startswith("BUY")].iterrows():
            s = r["symbol"]
            if s in NOT_ON_ALPACA:
                skipped.append(dict(symbol=s, why="not listed on Alpaca")); continue
            sym = alpaca_symbol(s)
            if sym.replace("/", "") in held:
                skipped.append(dict(symbol=s, why="already holding it")); continue
            cid = f"hb-{tag}-{s}-{r['strategy']}".replace(" ", "")[:120]
            if s.endswith("-USD"):
                notional = round(float(r["quantity"]) * scale * float(r["last_price"]), 2)
                body = {"symbol": sym, "notional": str(notional), "side": "buy", "type": "market", "time_in_force": "gtc", "client_order_id": cid}
            else:
                qty = math.floor(float(r["quantity"]) * scale)
                if qty < 1:
                    skipped.append(dict(symbol=s, why="less than one share at this size")); continue
                body = {"symbol": sym, "qty": str(qty), "side": "buy", "type": "market", "time_in_force": "day", "client_order_id": cid}
                if pd.notna(r.get("stop_loss")):
                    body["stop_loss"] = {"stop_price": str(round(float(r["stop_loss"]), 2))}
                    tp = r.get("take_profit")
                    if pd.notna(tp):                      # stop + target
                        body["order_class"] = "bracket"; body["take_profit"] = {"limit_price": str(round(float(tp), 2))}
                    else:                                 # stop only (strategies that exit on a signal)
                        body["order_class"] = "oto"
            try:
                o = api("POST", "/orders", json=body)
                sent.append(dict(symbol=s, action="buy at next open", strategy=r["strategy"], qty=body.get("qty"), notional=body.get("notional"),
                                 stop=body.get("stop_loss", {}).get("stop_price"), target=body.get("take_profit", {}).get("limit_price"), order=o.get("id")))
            except RuntimeError as e:
                if "client_order_id must be unique" in str(e):
                    skipped.append(dict(symbol=s, why="already sent tonight"))
                else:
                    skipped.append(dict(symbol=s, why=str(e)[:200]))
    acct, pos = snapshot()
    out = dict(at=dt.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"), account_number=acct.get("account_number"),
               equity=float(acct["equity"]), cash=float(acct["cash"]), last_equity=float(acct.get("last_equity", acct["equity"])),
               scale_vs_bot=round(scale, 3),
               positions=[dict(symbol=p["symbol"], qty=float(p["qty"]), avg_entry=float(p["avg_entry_price"]), price=float(p["current_price"]),
                               unrealised=float(p["unrealized_pl"])) for p in pos],
               sent=sent, skipped=skipped)
    json.dump(out, open(os.path.join(OUT, "latest.json"), "w"), indent=1)
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
