import numpy as np, soundfile as sf, json
SR = 48000; DUR = 39.0
out = np.zeros(int(SR * DUR)); rng = np.random.default_rng(7)
def t_(d): return np.arange(int(SR * d)) / SR
def add(sig, at, g=1.0):
    i = int(at * SR); j = min(len(out), i + len(sig))
    if i < len(out): out[i:j] += sig[:j - i] * g
def env(d, a=0.002, dec=8.0): t = t_(d); return np.minimum(1, t / a) * np.exp(-t * dec)
def lp(x, n): return np.convolve(x, np.ones(n) / n, 'same')
def metal_tick(f=3200, d=0.12):
    t = t_(d); s = sum(np.sin(2*np.pi*f*m*t)/(i+1) for i, m in enumerate([1, 2.3, 3.9]))
    return (s * 0.6 + rng.standard_normal(len(t)) * np.exp(-t*120) * 0.8) * env(d, 0.0005, 45)
def scrape(d, bright=1.0):
    t = t_(d); n = rng.standard_normal(len(t)); n = n - lp(n, 6)  # high-pass-ish
    am = 0.6 + 0.4 * np.sin(2*np.pi*31*t + 1.3) * np.sin(2*np.pi*7*t)
    return n * am * np.minimum(1, t/0.05) * np.minimum(1, (d - t)/0.08) * 0.25 * bright
def thud(f=90, d=0.3, noise=0.6):
    t = t_(d); return (np.sin(2*np.pi*f*t*(1-0.35*t)) + noise*lp(rng.standard_normal(len(t)), 8)*np.exp(-t*35)) * env(d, 0.002, 14)
def clack(): s = thud(170, 0.18, 1.2) * 0.7; c = metal_tick(1800, 0.1); s[:len(c)] += c * 0.6; return s
def click_big():
    s = metal_tick(2600, 0.15) * 1.4; c = metal_tick(4200, 0.08); s[:len(c)] += c * 0.8
    th = thud(140, 0.15, 0.8); s[:len(th)] += th * 0.5; return s
def turn(d=0.55):
    t = t_(d); n = lp(rng.standard_normal(len(t)), 3); gr = (np.sin(2*np.pi*60*t) > 0.6).astype(float)
    return (n * 0.15 + gr * lp(rng.standard_normal(len(t)), 2) * 0.12) * np.minimum(1, t/0.05) * np.minimum(1, (d-t)/0.05)
def whoosh(d=0.35):
    t = t_(d); n = lp(rng.standard_normal(len(t)), 30) * 5; return n * np.sin(np.pi * t / d) ** 2 * 0.5
def buzz(d=0.45):
    t = t_(d); sq = np.sign(np.sin(2*np.pi*110*t)) * 0.5 + np.sign(np.sin(2*np.pi*116*t)) * 0.5
    return lp(sq, 12) * 0.35 * np.minimum(1, t/0.01) * np.minimum(1, (d-t)/0.04)
def pop(): t = t_(0.08); return np.sin(2*np.pi*(900 - 3000*t)*t) * env(0.08, 0.001, 50) * 0.5
def wood(d=0.5):
    t = t_(d); n = lp(rng.standard_normal(len(t)), 14) * 2.2; return n * (0.5 + 0.5*np.sin(2*np.pi*13*t)) * np.minimum(1, t/0.04) * np.minimum(1, (d-t)/0.06) * 0.35
def knock(): return thud(210, 0.2, 1.0) * 0.8
def boing():
    t = t_(0.5); return np.sin(2*np.pi*(380 + 60*np.sin(2*np.pi*9*t))*t) * env(0.5, 0.003, 7) * 0.12
# key slides
add(scrape(2.05), 11.92, 0.9); add(scrape(0.82), 20.85, 0.9); add(scrape(0.16, 1.4), 20.47, 1.0)
for c in json.load(open('assets/audio/clicks.json')): add(metal_tick(2900 + rng.uniform(-400, 400)), c + 1/30, 0.5)
add(metal_tick(3400), 13.96, 0.7); add(metal_tick(3000), 21.66, 0.7)
add(boing(), 6.55, 1.0)
for at in (9.72, 10.0, 10.28): add(clack(), at, 0.7)
add(thud(80, 0.45, 0.9), 10.7, 0.9)
add(click_big(), 19.03, 1.0); add(turn(0.55), 19.06, 1.0); add(thud(120, 0.25, 0.7), 19.62, 0.6)
add(turn(0.12), 20.4, 0.8)
add(buzz(), 23.17, 1.0)
for at in (23.35, 23.6, 23.85, 24.1): add(clack(), at, 0.55)
for at in (11.83, 14.27, 19.13, 20.58, 21.83, 23.2, 24.53): add(whoosh(0.3), at - 0.12, 0.35)
for at in (26.95, 29.25, 34.95): add(whoosh(0.4), at - 0.2, 0.6)
for i in range(0, 24, 3): add(pop(), 26.8 + i * (1.5 / 24), 0.5)
add(metal_tick(1500, 0.2) * 1.5 + 0, 28.1, 0.8); add(thud(300, 0.15, 0.4), 28.1, 0.5)
add(wood(0.55), 32.1, 1.0); add(knock(), 33.0, 0.8); add(wood(0.6), 33.36, 1.0); add(knock(), 33.96, 0.7)
peak = np.abs(out).max(); out = out / peak * 0.5
sf.write('assets/audio/sfx.wav', np.stack([out, out], 1), SR); print('ok')
