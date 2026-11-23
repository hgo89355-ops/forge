#!/usr/bin/env python3
"""Shorten every pause in a voice track to at most --keep seconds (default 0.18).
usage: trim_pauses.py in.(mp3|wav) out.wav [--keep 0.18] [--db -38] [--min 0.2]
Leading silence is cut to 0.03 s, trailing to 0.05 s. Cuts use 10 ms fades (no clicks)."""
import subprocess, sys, re, argparse, wave
import numpy as np
ap = argparse.ArgumentParser(); ap.add_argument('inp'); ap.add_argument('out')
ap.add_argument('--keep', type=float, default=0.18); ap.add_argument('--db', type=float, default=-38); ap.add_argument('--min', type=float, default=0.2)
a = ap.parse_args(); SR = 44100
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', a.inp, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32).copy()
log = subprocess.run(['ffmpeg', '-hide_banner', '-i', a.inp, '-af', f'silencedetect=n={a.db}dB:d={a.min}', '-f', 'null', '-'], capture_output=True).stderr.decode('utf8', 'replace')
st = [float(v) for v in re.findall(r'silence_start: ([\d.]+)', log)]; en = [float(v) for v in re.findall(r'silence_end: ([\d.]+)', log)]
dur = len(x) / SR
if len(en) < len(st): en.append(dur)
segs, pos, removed = [], 0, 0.0
F = int(0.01 * SR)
for s, e in zip(st, en):
    keep = 0.03 if s < 0.01 else (0.05 if e >= dur - 0.01 else a.keep)
    if e - s <= keep: continue
    half = keep / 2
    cut0, cut1 = int((s + half) * SR) if s > 0.01 else 0, int((e - half) * SR) if e < dur - 0.01 else int((s + keep) * SR)
    if s < 0.01: cut1 = int((e - keep) * SR)
    segs.append(x[pos:cut0]); pos = cut1; removed += (cut1 - cut0) / SR
segs.append(x[pos:] if pos < len(x) else np.zeros(0, np.float32))
out = []
for i, sg in enumerate(segs):
    sg = sg.copy()
    if len(sg) > 2 * F:
        if i > 0: sg[:F] *= np.linspace(0, 1, F)
        if i < len(segs) - 1: sg[-F:] *= np.linspace(1, 0, F)
    out.append(sg)
y = np.concatenate(out)
pcm = (np.clip(y, -1, 1) * 32767).astype('<i2')
with wave.open(a.out, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f'{dur:.2f}s -> {len(y)/SR:.2f}s (removed {removed:.2f}s in {len(st)} pauses)')
