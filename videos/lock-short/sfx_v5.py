import numpy as np, soundfile as sf, json, sys
exec(open('sfx.py').read().split("# key slides")[0].replace("DUR = 39.0", "DUR = 40.0"))
E = json.load(open('assets/audio/v5_events.json')); A = E['A']; DUR = E['DUR']
out = np.zeros(int(SR * (DUR + 0.5)))
def add(sig, at, g=1.0):
    i = int(at * SR); j = min(len(out), i + len(sig))
    if 0 <= i < len(out): out[i:j] += sig[:j - i] * g
cuts = E['cuts']
def jingle():
    s = np.zeros(int(SR * 0.6))
    for k in range(6):
        c = metal_tick(2200 + rng.uniform(-500, 900), 0.15) * 0.6; o = int(rng.uniform(0, 0.3) * SR); s[o:o+len(c)] += c[:len(s)-o]
    return s
for k, ct in enumerate(cuts): add(whoosh(0.22 + 0.06 * (k % 3)), ct - 0.1, 0.28 + 0.06 * (k % 2))
add(scrape(cuts[0]), 0.0, 0.9)
for c in E['hookClicks']: add(metal_tick(2900 + (int(c * 1000) % 7) * 90), c + 1 / 30, 0.5)
add(boing(), A['springs'][0], 1.2)
add(clack(), A['block'][0], 0.8)
for k in range(3): add(clack(), A['cylinder'][0] + 0.12 * k, 0.5)
add(jingle(), cuts[2] + 0.05, 0.5)
add(scrape(0.55, 1.2), cuts[3], 0.9)
for c in E['wrongClicks']: add(metal_tick(3000), c + 1 / 30, 0.5)
add(metal_tick(3400), cuts[3] + 0.56, 0.7)
add(buzz(0.4), A['jams'][0], 1.0)
for k in range(4): add(clack(), cuts[4] + 0.1 + 0.18 * k, 0.6)
add(jingle(), cuts[5] + 0.05, 0.45)
add(scrape(0.9, 1.1), cuts[6], 0.9)
for c in E['rightClicks']: add(metal_tick(3100), c + 1 / 30, 0.5)
for k in range(5): add(pop(), A['gap'][0] + 0.12 * k, 0.45)
add(click_big(), A['click'][0], 1.1); add(turn(0.4), A['click'][0] + 0.03, 1.0)
add(thud(70, 0.5, 0.6), A['open'][0] - 0.2, 0.6); add(whoosh(0.5), A['open'][0] - 0.25, 0.5)
t = A['heights'][0] - 0.3
while t < cuts[11]: add(metal_tick(2400, 0.06), t, 0.18); t += 0.12
for k in range(0, 28, 3): add(pop(), cuts[11] + 0.03 * k, 0.35)
add(scrape(DUR - cuts[13]), cuts[13], 0.9)
for c in E['loopClicks']: add(metal_tick(2900), c + 1 / 30, 0.5)
out = out[:int(SR * DUR)]
out = out / np.abs(out).max() * 0.5
sf.write('assets/audio/sfx_v5.wav', np.stack([out, out], 1), SR); print('sfx ok', round(len(out) / SR, 2))
