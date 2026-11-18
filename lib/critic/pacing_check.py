"""Pacing checks for Shorts (automatic fails). Usage:
   python3 pacing_check.py VIDEO.mp4 [--voice VOICE.wav] [--json out.json]
Fails: duration > 35 s · any silence > 0.3 s (voice track if given, else the mix) · any 1.5 s window with no
visual change · no motion in the first second · static end card > 0.5 s.
Also reports cuts per 10 s and total silence, for the timing chart."""
import json, subprocess, sys, re
import numpy as np

def run(cmd): return subprocess.run(cmd, capture_output=True, text=True)

def duration(path):
    return float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]).stdout.strip())

def silences(path, dur, noise='-38dB', d=0.3):
    err = run(['ffmpeg', '-hide_banner', '-i', path, '-af', f'silencedetect=noise={noise}:d={d}', '-f', 'null', '-']).stderr
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', err)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', err)]
    out = []
    for i, s in enumerate(starts):
        e = ends[i] if i < len(ends) else dur
        out.append((round(s, 2), round(e, 2)))
    return out

def frame_diffs(path, fps=10, w=96):
    h = int(w * 16 / 9)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'fps={fps},scale={w}:{h},format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
    d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))
    return d, fps

def main():
    a = sys.argv[1:]
    path = a[0]
    voice = a[a.index('--voice') + 1] if '--voice' in a else None
    dur = duration(path)
    sil = silences(voice or path, duration(voice) if voice else dur)
    # only count silences inside the spoken part (ignore a lead-in of < 0.1 s handled by frame-1 rule)
    long_sil = [s for s in sil if s[1] - s[0] > 0.3]
    total_sil = round(sum(e - s for s, e in sil), 2)
    d, fps = frame_diffs(path)
    MOVE = 0.35      # mean abs grey-level change per 0.1 s that counts as "something changed"
    CUT = 18.0       # a jump this big between two samples is a cut
    moving = d > MOVE
    win = int(1.5 * fps)
    dead = []
    i = 0
    while i + win <= len(moving):
        if not moving[i:i + win].any():
            j = i + win
            while j < len(moving) and not moving[j]: j += 1
            dead.append((round(i / fps, 1), round(j / fps, 1)))
            i = j
        else:
            i += 1
    first_motion = bool(moving[:fps].any())
    tail = 0
    for v in moving[::-1]:
        if v: break
        tail += 1
    end_card = round(tail / fps, 2)
    cuts = int((d > CUT).sum())
    res = {
        'duration_s': round(dur, 2), 'cuts': cuts, 'cuts_per_10s': round(cuts / dur * 10, 1),
        'total_silence_s': total_sil, 'silences_over_0.3s': long_sil, 'dead_windows_1.5s': dead,
        'motion_in_first_second': first_motion, 'static_end_s': end_card,
    }
    fails = []
    if dur > 35: fails.append(f'longer than 35 s ({dur:.1f} s)')
    if long_sil: fails.append(f'{len(long_sil)} silence(s) over 0.3 s')
    if dead: fails.append(f'{len(dead)} stretch(es) of 1.5 s+ with no visual change')
    if not first_motion: fails.append('no motion in the first second')
    if end_card > 0.5: fails.append(f'end card {end_card} s (> 0.5 s)')
    res['fails'] = fails
    res['pass'] = not fails
    if '--json' in a: json.dump(res, open(a[a.index('--json') + 1], 'w'), indent=1)
    print(json.dumps(res, indent=1))

if __name__ == '__main__':
    main()
