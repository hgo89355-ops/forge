"""
Portfolio simulator for a small (< $10k) margin account trading stocks/ETFs (long and short),
micro index futures (MNQ / MES) and crypto majors (long and short via perps).

Sizing
  * Stocks, ETFs, crypto: units = risk_per_trade x equity / |entry - stop|, capped at
    max_pos_pct of equity (fractional units allowed if `fractional`).
  * Futures: whole contracts only: floor(risk budget / (|entry - stop| x multiplier)). If even
    1 contract risks more than the budget, the trade is SKIPPED (reported), never forced.
  * Pairs: both legs together (dollar-neutral), each leg pair_leg_pct of equity, or none at all.
Account limits
  * gross stock/crypto exposure <= max_gross x equity (Reg T style 2x); futures margin in use
    <= max_margin_use x equity; max open positions; max total open stop-risk.
  * after a day losing >= daily_loss_pause, no new trades the next day; drawdown >= dd_half_size
    halves risk; drawdown >= dd_kill stops new trades.
  * US pattern-day-trader rule if equity < $25k: at most 3 stock/ETF day trades per rolling
    5 sessions. Intraday engines (bars == 1) are blocked when the quota is used up; swing trades
    that happen to stop out on day 1 are counted and any breach is reported.
Costs
  * stocks/ETFs: slippage bps per side + SEC fee on sells; short borrow fee (annual, daily accrual)
  * crypto: slippage bps + exchange fee bps per side; shorts pay funding (annual rate)
  * futures: commission per contract per side + slippage in ticks
  * margin interest on negative cash
"""
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

FUTURES = {   # data symbol -> contract spec (micro contracts)
    "NQ=F": dict(name="MNQ", multiplier=2.0, tick=0.25, commission=0.62, slip_ticks=1, margin=0.06),
    "ES=F": dict(name="MES", multiplier=5.0, tick=0.25, commission=0.62, slip_ticks=1, margin=0.06),
}


def asset_class(sym):
    if sym in FUTURES:
        return "future"
    if sym.endswith("-USD"):
        return "crypto"
    return "stock"


@dataclass
class RiskRules:
    capital: float = 5_000.0
    risk_per_trade: float = 0.01
    max_pos_pct: float = 0.25
    max_positions: int = 6
    max_open_risk: float = 0.06
    max_gross: float = 2.0
    max_margin_use: float = 0.5
    pair_leg_pct: float = 0.20
    daily_loss_pause: float = 0.03
    dd_half_size: float = 0.10
    dd_kill: float = 0.20
    allow_short: bool = True
    pdt_rule: bool = True
    stock_slip_bps: float = 5.0
    crypto_slip_bps: float = 10.0
    crypto_fee_bps: float = 5.0
    sec_fee_rate: float = 0.0000278
    borrow_fee_annual: float = 0.005
    crypto_funding_annual: float = 0.10
    margin_rate_annual: float = 0.07
    fractional: bool = True
    min_order: float = 5.0
    engine_priority: dict = field(default_factory=dict)
    engine_risk: dict = field(default_factory=dict)   # per-strategy multiplier on risk_per_trade
    adaptive: bool = False            # each month: scale a strategy up/down by its last-60-day win rate vs its usual
    adaptive_base: dict = field(default_factory=dict) # strategy -> usual (in-sample) win rate
    adaptive_up: float = 1.5
    adaptive_down: float = 0.5


def _px_cost(sym, side_open, px, rules):
    """Fill price after slippage for opening (side_open=+1 buy / -1 sell)."""
    c = asset_class(sym)
    if c == "future":
        f = FUTURES[sym]
        return px + side_open * f["slip_ticks"] * f["tick"]
    bps = rules.stock_slip_bps if c == "stock" else rules.crypto_slip_bps + rules.crypto_fee_bps
    return px * (1 + side_open * bps / 1e4)


def simulate(trades, data, rules=RiskRules(), start=None, end=None):
    if not trades:
        return dict(equity=pd.Series(dtype=float), taken=pd.DataFrame(), skipped={}, pdt_breaches=0)
    tr = pd.DataFrame(trades)
    if "pair_id" not in tr:
        tr["pair_id"] = np.nan
    if not rules.allow_short:
        tr = tr[tr["side"] > 0]
    if start is not None:
        tr = tr[tr["entry_date"] >= pd.Timestamp(start)]
    if end is not None:
        tr = tr[tr["entry_date"] < pd.Timestamp(end)]
    tr = tr.assign(prio=tr["engine"].map(rules.engine_priority).fillna(0))
    tr = tr.sort_values(["entry_date", "prio", "score"], ascending=[True, False, False])

    dates = pd.DatetimeIndex(sorted(set().union(*[set(d.index) for d in data.values()])))
    if start is not None:
        dates = dates[dates >= pd.Timestamp(start)]
    if end is not None:
        dates = dates[dates < pd.Timestamp(end)]
    closes = pd.DataFrame({s: d["close"] for s, d in data.items()}).reindex(dates).ffill()
    by_entry = {d: g for d, g in tr.groupby("entry_date")}

    cash = rules.capital
    pos = []          # sym, cls, side, qty, mult, entry_fill, risk_usd, exit_date, exit_px, row, margin
    taken = []
    skipped = dict(full=0, risk=0, size=0, paused=0, pdt=0, exposure=0, dup=0)
    day_trades, pdt_breaches = [], 0
    eq_hist, peak, prev_eq, pause = [], rules.capital, rules.capital, False
    expo_hist = []
    di = {d: k for k, d in enumerate(dates)}
    adapt, last_month = {}, None

    def mark(sym, d):
        v = closes.at[d, sym] if sym in closes.columns else np.nan
        return v

    def pos_value(p, d):
        px = mark(p["sym"], d)
        if np.isnan(px):
            px = p["entry_fill"]
        if p["cls"] == "future":
            return p["side"] * p["qty"] * p["mult"] * (px - p["entry_fill"])
        return p["side"] * p["qty"] * px

    def exposures(d_ref):
        gross = sum(abs(p["qty"] * p["mult"] * p["entry_fill"]) for p in pos if p["cls"] != "future")
        marg = sum(p["margin"] for p in pos)
        return gross, marg

    def open_one(t, d, equity_ref, risk_mult, notional_override=None):
        nonlocal cash
        sym, side, cls = t["symbol"], int(t["side"]), asset_class(t["symbol"])
        fill = _px_cost(sym, side, t["entry_px"], rules)
        mult = FUTURES[sym]["multiplier"] if cls == "future" else 1.0
        per_unit_risk = max(abs(fill - t["stop"]) * mult, 1e-9)
        if notional_override is not None:
            qty = notional_override / fill
        else:
            sm = float(t["size_mult"]) if "size_mult" in t.index and not pd.isna(t["size_mult"]) else 1.0
            am = adapt.get(t["engine"], 1.0)
            budget = min(rules.risk_per_trade * risk_mult * rules.engine_risk.get(t["engine"], 1.0) * sm * am * equity_ref,
                         rules.max_open_risk * equity_ref - sum(p["risk_usd"] for p in pos))
            if budget <= 0:
                skipped["risk"] += 1
                return None
            qty = budget / per_unit_risk
            if cls == "future":
                qty = np.floor(qty)
                if qty < 1:
                    skipped["size"] += 1
                    return None
            else:
                qty = min(qty, rules.max_pos_pct * equity_ref / fill)
                if not rules.fractional:
                    qty = np.floor(qty)
        gross, marg = exposures(d)
        if cls == "future":
            m = FUTURES[sym]["margin"] * qty * mult * fill
            if marg + m > rules.max_margin_use * equity_ref:
                skipped["exposure"] += 1
                return None
        else:
            hc = bool(t["hi_conf"]) if "hi_conf" in t.index and not pd.isna(t["hi_conf"]) else False
            room = (rules.max_gross + (getattr(rules, "reserve_gross", 0.0) if hc else 0.0)) * equity_ref - gross
            qty = min(qty, max(room, 0) / fill)
            m = 0.0
            if qty * fill < rules.min_order:
                skipped["exposure" if room < rules.min_order else "size"] += 1
                return None
        if cls == "future":
            cash -= FUTURES[sym]["commission"] * qty
        else:
            cash -= side * qty * fill
        p = dict(sym=sym, cls=cls, side=side, qty=qty, mult=mult, entry_fill=fill,
                 risk_usd=qty * per_unit_risk, exit_date=t["exit_date"], exit_px=t["exit_px"], row=t, margin=m)
        pos.append(p)
        return p

    for d in dates:
        k = di[d]
        if rules.adaptive and (last_month is None or d.month != last_month):
            last_month = d.month
            lo = d - pd.Timedelta(days=60)
            recent = [x for x in taken if lo <= x["exit_date"] < d]
            adapt = {}
            for eng, base in rules.adaptive_base.items():
                rr = [x["pnl"] > 0 for x in recent if x["engine"] == eng]
                if len(rr) >= 8:
                    wr = np.mean(rr)
                    adapt[eng] = rules.adaptive_up if wr > base + 0.05 else (rules.adaptive_down if wr < base - 0.05 else 1.0)
        # daily carrying costs on yesterday's book
        for p in pos:
            if p["side"] < 0 and p["cls"] != "future":
                rate = rules.borrow_fee_annual if p["cls"] == "stock" else rules.crypto_funding_annual
                px = mark(p["sym"], d)
                cash -= rate / 365 * p["qty"] * (px if not np.isnan(px) else p["entry_fill"])
        if cash < 0:
            cash += cash * rules.margin_rate_annual / 365

        dd = 1 - prev_eq / peak if peak > 0 else 0
        risk_mult = 0.5 if dd >= rules.dd_half_size else 1.0
        can_open = (not pause) and dd < rules.dd_kill
        if d in by_entry:
            if not can_open:
                skipped["paused"] += len(by_entry[d])
            else:
                grp = by_entry[d]
                done_pairs = set()
                recent_dt = sum(1 for x in day_trades if k - x < 5)
                for _, t in grp.iterrows():
                    hc = bool(t["hi_conf"]) if "hi_conf" in t.index and not pd.isna(t["hi_conf"]) else False
                    if len(pos) >= rules.max_positions + (getattr(rules, "reserve_slots", 0) if hc else 0):
                        skipped["full"] += 1
                        continue
                    if any(p["sym"] == t["symbol"] for p in pos) and not (hc and getattr(rules, "reserve_add", False)):
                        skipped["dup"] += 1
                        continue
                    cls = asset_class(t["symbol"])
                    if rules.pdt_rule and prev_eq < 25_000 and cls == "stock" and t["bars"] == 1 and recent_dt >= 3:
                        skipped["pdt"] += 1
                        continue
                    if not np.isnan(t["pair_id"]):
                        if t["pair_id"] in done_pairs:
                            continue
                        done_pairs.add(t["pair_id"])
                        legs = grp[grp["pair_id"] == t["pair_id"]]
                        if len(pos) + len(legs) > rules.max_positions or any(p["sym"] in set(legs["symbol"]) for p in pos):
                            skipped["full"] += 1
                            continue
                        for _, lg in legs.iterrows():
                            open_one(lg, d, prev_eq, risk_mult, notional_override=rules.pair_leg_pct * risk_mult * prev_eq)
                        continue
                    p_new = open_one(t, d, prev_eq, risk_mult)
                    if p_new is not None and cls == "stock" and t["bars"] == 1:
                        recent_dt += 1            # an intraday trade uses up a day trade now

        still = []
        for p in pos:
            if p["exit_date"] <= d:
                sym, side = p["sym"], p["side"]
                fill = _px_cost(sym, -side, p["exit_px"], rules)
                if p["cls"] == "future":
                    f = FUTURES[sym]
                    pnl_gross = side * p["qty"] * p["mult"] * (fill - p["entry_fill"])
                    cash += pnl_gross - f["commission"] * p["qty"]
                    pnl = pnl_gross - 2 * f["commission"] * p["qty"]
                    basis = p["margin"] or 1.0
                else:
                    cash += side * p["qty"] * fill
                    fee = rules.sec_fee_rate * p["qty"] * fill if (p["cls"] == "stock" and side > 0) else 0.0
                    cash -= fee
                    pnl = side * p["qty"] * (fill - p["entry_fill"]) - fee
                    basis = p["qty"] * p["entry_fill"]
                r = p["row"]
                if r["entry_date"] == d and p["cls"] == "stock":
                    day_trades.append(k)
                    if rules.pdt_rule and prev_eq < 25_000 and sum(1 for x in day_trades if k - x < 5) > 3:
                        pdt_breaches += 1
                taken.append(dict(symbol=sym, engine=r["engine"], side=side, entry_date=r["entry_date"], exit_date=d,
                                  qty=p["qty"], pnl=pnl, ret=pnl / basis if basis else np.nan,
                                  r_multiple=pnl / p["risk_usd"] if p["risk_usd"] > 0 else np.nan,
                                  reason=r["reason"], pair=r.get("pair", None)))
            else:
                still.append(p)
        pos = still

        eq = cash + sum(pos_value(p, d) for p in pos)
        pause = prev_eq > 0 and (eq / prev_eq - 1) <= -rules.daily_loss_pause
        peak = max(peak, eq)
        prev_eq = eq
        eq_hist.append(eq)
        g_now = sum(abs(p["qty"] * p["mult"] * mark(p["sym"], d)) for p in pos if p["cls"] != "future" and not np.isnan(mark(p["sym"], d)))
        expo_hist.append(g_now / eq if eq > 0 else 0)
        if eq <= 0:
            eq_hist += [0.0] * (len(dates) - len(eq_hist))
            break

    return dict(equity=pd.Series(eq_hist, index=dates[:len(eq_hist)]), taken=pd.DataFrame(taken),
                skipped=skipped, pdt_breaches=pdt_breaches, exposure=pd.Series(expo_hist, index=dates[:len(expo_hist)]))
