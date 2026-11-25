#!/usr/bin/env python3
"""Replace parts of a rendered video with re-rendered segments (frame-exact), keeping the base audio.
usage: splice.py base.mp4 out.mp4 START_FRAME:seg.mp4 [START_FRAME:seg.mp4 ...]   (30 fps)
Each segment replaces base frames [start, start + its frame count)."""
import subprocess, sys, json
def nframes(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', p], capture_output=True, text=True, check=True)
    return int(r.stdout.strip())
base, out, segs = sys.argv[1], sys.argv[2], sorted(((int(a.split(':', 1)[0]), a.split(':', 1)[1]) for a in sys.argv[3:]))
total = nframes(base)
inputs, parts, cur = ['-i', base], [], 0
for k, (start, path) in enumerate(segs, start=1):
    n = nframes(path); inputs += ['-i', path]
    if start > cur: parts.append(f'[0:v]trim=start_frame={cur}:end_frame={start},setpts=PTS-STARTPTS[p{len(parts)}]')
    parts.append(f'[{k}:v]trim=start_frame=0:end_frame={n},setpts=PTS-STARTPTS[p{len(parts)}]')
    cur = start + n
if cur < total: parts.append(f'[0:v]trim=start_frame={cur}:end_frame={total},setpts=PTS-STARTPTS[p{len(parts)}]')
fc = ';'.join(parts) + ';' + ''.join(f'[p{i}]' for i in range(len(parts))) + f'concat=n={len(parts)}:v=1:a=0[v]'
cmd = ['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', fc, '-map', '[v]', '-map', '0:a?', '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'copy', out]
subprocess.run(cmd, check=True)
print(json.dumps({'base_frames': total, 'out_frames': nframes(out), 'segments': [[s, p] for s, p in segs]}))
