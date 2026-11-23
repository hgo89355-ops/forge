"""v6 sound effects, all synthesized in code, anchored to words + lock physics (assets/audio/v6_events.json)."""
import numpy as np, soundfile as sf, json
exec(open('sfx.py').read().split("# key slides")[0].replace("DUR = 39.0", "DUR = 40.0"))
E = json.load(open('assets/audio/v6_events.json')); A = {k: v[0] for k, v in E['A'].items()}; S = E['shots']; DUR = E['DUR']
out = np.zeros(int(SR * (DUR + 0.5)))
def add(sig, at, g=1.0):
    i = int(at * SR); j = min(len(out), i + len(sig))
    if 0 <= i < len(out): out[i:j] += sig[:j - i] * g
F = 1 / 30
# whoosh on every cut (alternating size)
for k, ct in enumerate(sorted(S.values())): add(whoosh(0.22 + 0.06 * (k % 3)), ct - 0.12, 0.26 + 0.06 * (k % 2))
# hook: key slides into the front-door lock, then jams and rattles
add(scrape(1.25, 1.1), 0.0, 0.9)
add(metal_tick(2600), S['hookJam'] - 0.15 + F, 0.7)
for k in range(6): add(clack(), S['hookJam'] + 0.1 + 0.2 * k, 0.55)
add(buzz(0.4), A['wont'], 0.9)
add(whoosh(0.9), S['reveal'] - 0.75, 0.7)                      # dive into the lock
add(scrape(S['pinsA'] - S['reveal'] - 0.1), S['reveal'], 0.8)
for c in E['revealClicks']: add(metal_tick(2900 + (int(c * 1000) % 7) * 90), c + F, 0.5)
add(pop(), A['pins'], 0.5)
add(pop(), A['pairs'], 0.5)
add(boing(), A['springs'], 1.1)
add(clack(), A['block'], 0.8)
for k in range(3): add(clack(), A['cylinder'] + 0.12 * k, 0.5)
add(scrape(1.0, 1.1), A['right'] - 0.12, 0.85)
for c in E['rightClicks']: add(metal_tick(3100), c + F, 0.5)
add(metal_tick(3600, 0.2), A['height'], 0.5)
for k in range(5): add(pop(), A['gap'] + 0.12 * k, 0.45)
add(metal_tick(4200, 0.25), A['line'], 0.45)
add(click_big(), A['click'], 1.1); add(turn(0.4), A['click'] + 0.03, 1.0)
add(thud(70, 0.5, 0.6), S['doorOpen'] + 0.05, 0.6); add(whoosh(0.5), S['doorOpen'], 0.5)
add(scrape(0.55, 1.2), S['wrongIn'], 0.85)
for c in E['wrongClicks']: add(metal_tick(3000), c + F, 0.5)
add(buzz(0.35), A['less'], 0.8)
for k in range(4): add(clack(), A['pin'] + 0.12 * k, 0.5)
for k in range(5): add(clack(), S['lockedOut'] + 0.08 + 0.2 * k, 0.5)
add(thud(120, 0.25, 0.8), A['out'], 0.5)
add(scrape(DUR - S['loop'], 1.1), S['loop'], 0.8)   # loops into the hook's key slide
out = out[:int(SR * DUR)]
out = out / np.abs(out).max() * 0.5
sf.write('assets/audio/sfx_v6.wav', np.stack([out, out], 1), SR); print('sfx ok', round(len(out) / SR, 2))
