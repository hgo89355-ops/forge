"""ICT 'Asian range -> London sweep (Judas swing) -> reversal' as described in our earlier chat.
Times are New York. Asian range = 20:00-24:00 the evening before. Sweep must happen 02:00-05:00.
After the sweep, the first bar that CLOSES back inside the Asian range triggers an entry at the next
bar's open, in the reversal direction. Stop = beyond the sweep extreme (+10% of the Asian range);
target = the opposite side of the Asian range. Flat by 16:00."""
import numpy as np
import pandas as pd


def ict_trades(d, entry_start="02:00", entry_end="11:00", min_rr=0.0):
    out = []
    d = d.sort_index()
    t = d.index
    dates = sorted(set(t.normalize()))
    for D in dates:
        a0, a1 = D - pd.Timedelta(hours=4), D
        asia = d[(t >= a0) & (t < a1)]
        if len(asia) < 2:
            continue
        ah, al = asia["high"].max(), asia["low"].min()
        rng = ah - al
        if rng <= 0:
            continue
        day = d[(t >= D + pd.Timedelta("2h")) & (t < D + pd.Timedelta("16h"))]
        if len(day) < 4:
            continue
        O, H, L, C = (day[c].to_numpy() for c in ("open", "high", "low", "close"))
        tm = day.index
        lon_end = D + pd.Timedelta("5h")
        es, ee = D + pd.Timedelta(entry_start + ":00"), D + pd.Timedelta(entry_end + ":00")
        side, k = 0, None
        for j in range(len(day)):
            if tm[j] >= lon_end:
                break
            if L[j] < al and H[j] <= ah:
                side, k = 1, j; break
            if H[j] > ah and L[j] >= al:
                side, k = -1, j; break
        if not side:
            continue
        ext = L[k] if side > 0 else H[k]
        for j in range(k, len(day) - 1):
            ext = min(ext, L[j]) if side > 0 else max(ext, H[j])
            back = C[j] > al if side > 0 else C[j] < ah
            if back and es <= tm[j] < ee:
                e = O[j + 1]
                stop = ext - 0.1 * rng if side > 0 else ext + 0.1 * rng
                tgt = ah if side > 0 else al
                risk = abs(e - stop)
                if risk <= 0 or (side > 0 and (e >= tgt or e <= stop)) or (side < 0 and (e <= tgt or e >= stop)):
                    break
                if abs(tgt - e) < min_rr * risk:
                    break
                xp, why = C[-1], "close"
                for m in range(j + 1, len(day)):
                    if side > 0:
                        if L[m] <= stop: xp, why = min(O[m], stop) if m > j + 1 else stop, "stop"; break
                        if H[m] >= tgt: xp, why = max(O[m], tgt) if m > j + 1 else tgt, "target"; break
                    else:
                        if H[m] >= stop: xp, why = max(O[m], stop) if m > j + 1 else stop, "stop"; break
                        if L[m] <= tgt: xp, why = min(O[m], tgt) if m > j + 1 else tgt, "target"; break
                out.append(dict(day=D, side=side, entry=e, stop=stop, target=tgt, exit=xp, why=why,
                                ret=side * (xp / e - 1), risk=risk / e))
                break
    return pd.DataFrame(out)
