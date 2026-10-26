"""
Builds tonight's page for the "Trading Log" Google Doc from paper/latest.json.

Prints JSON: {"heading": "...", "requests": [...]}.
The requests insert the new page at the very top of the document (index 1, newest day first),
style it, and end it with a page break. Because everything goes in at index 1, the positions
never depend on what is already in the document.

Usage: python3 doc_entry.py [path/to/latest.json]
"""
import json, os, sys, datetime as dt

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "paper", "latest.json")


def money(x, sign=True):
    x = float(x or 0)
    s = f"${abs(x):,.2f}"
    if not sign:
        return s
    return ("+" if x > 0 else "-" if x < 0 else "") + s


def u16(s):
    return len(s.encode("utf-16-le")) // 2


def build(summary):
    setups = summary["setups"]
    day = max(v["day"]["date"] for v in setups.values())
    d = dt.date.fromisoformat(day)
    heading = d.strftime("%A %-d %B %Y")
    paras = []                       # (text, style, bullet)
    paras.append((heading, "HEADING_1", False))
    m, s5 = setups.get("main"), setups.get("setup5")
    overall = "Overall paper P&L: " + ", ".join(
        f"{label} {money(v['total_profit'])} ({v['total_return_pct']:+.2f}%)"
        for label, v in (("Main setup", m), ("Setup 5", s5)) if v)
    paras.append((overall + ".", "NORMAL_TEXT", False))
    for name, label in (("main", "Main setup"), ("setup5", "Setup 5 (comparison)")):
        v = setups.get(name)
        if not v:
            continue
        dd = v["day"]
        paras.append((label, "HEADING_2", False))
        for line in (
            f"Account value: {money(v['account_value'], sign=False)}",
            f"Day's result (open and closed trades): {money(v['last_day_pnl'])}",
            f"Profit from trades closed today: {money(dd['profit_from_winners'])}",
            f"Loss from trades closed today: {money(dd['loss_from_losers'])}",
            f"Money left on the table today: {money(dd['left_on_table'], sign=False)}",
            f"Overall P&L since {summary['paper_start']}: {money(v['total_profit'])} ({v['total_return_pct']:+.2f}%)",
            f"Open trades: {v['open_trades']}; trades closed so far: {v['closed_trades_total']} ({v['wins']} wins); "
            f"money left on the table so far: {money(v['left_on_table_total'], sign=False)}",
        ):
            paras.append((line, "NORMAL_TEXT", True))
        paras.append(("Trades today:", "NORMAL_TEXT", False))
        trades = []
        for b in dd["bought"]:
            trades.append(f"Bought {b['symbol']} ({b['strategy']})" + (f" at {b['price']:,}" if b.get("price") else ""))
        for x in dd["sold"]:
            trades.append(f"Sold {x['symbol']} ({x['strategy']}, {x['reason']}): {money(x['pnl_usd'])}, "
                          f"left on the table {money(x['left_on_table_usd'], sign=False)}")
        if trades:
            paras += [(t, "NORMAL_TEXT", True) for t in trades]
        else:
            paras.append(("No trades today.", "NORMAL_TEXT", True))
        orders = v.get("orders_next_open") or []
        if orders:
            paras.append(("Orders for the next open: " + "; ".join(
                f"{'buy' if o['status'].startswith('BUY') else 'sell'} {o['symbol']} ({o['strategy']})" for o in orders) + ".",
                "NORMAL_TEXT", False))
        for n in v.get("learn_from_mistakes") or []:
            paras.append(("Review: " + n, "NORMAL_TEXT", False))
    if summary.get("markets_missing"):
        paras.append(("Markets missing from tonight's download: " + ", ".join(summary["markets_missing"]) + ".", "NORMAL_TEXT", False))
    paras.append(("", "NORMAL_TEXT", False))          # holds the page break

    text = "".join(p[0] + "\n" for p in paras)
    reqs = [{"insertText": {"location": {"index": 1}, "text": text}}]
    pos, ranges = 1, []
    for t, style, bullet in paras:
        n = u16(t) + 1
        ranges.append((pos, pos + n, t, style, bullet))
        pos += n
    for a, b, t, style, bullet in ranges:
        ps = {"namedStyleType": style}
        fields = "namedStyleType"
        if style.startswith("HEADING"):
            ps["keepWithNext"] = True
            fields += ",keepWithNext"
        reqs.append({"updateParagraphStyle": {"range": {"startIndex": a, "endIndex": b}, "paragraphStyle": ps, "fields": fields}})
        if not style.startswith("HEADING") and b - 1 > a:
            reqs.append({"updateTextStyle": {"range": {"startIndex": a, "endIndex": b - 1}, "textStyle": {}, "fields": "bold,italic"}})
    # bullets, one request per run of bullet paragraphs
    run = None
    for a, b, t, style, bullet in ranges + [(None, None, None, None, False)]:
        if bullet:
            run = (run[0], b) if run else (a, b)
        elif run:
            reqs.append({"createParagraphBullets": {"range": {"startIndex": run[0], "endIndex": run[1] - 1},
                                                    "bulletPreset": "BULLET_DISC_CIRCLE_SQUARE"}})
            run = None
    # bold labels for the overall line
    a = ranges[1][0]
    reqs.append({"updateTextStyle": {"range": {"startIndex": a, "endIndex": a + u16("Overall paper P&L:")},
                                     "textStyle": {"bold": True}, "fields": "bold"}})
    # page break in the last (empty) paragraph, so the older days start on the next page
    reqs.append({"insertPageBreak": {"location": {"index": ranges[-1][0]}}})
    return {"heading": heading, "requests": reqs}


if __name__ == "__main__":
    print(json.dumps(build(json.load(open(SRC))), ensure_ascii=False))
