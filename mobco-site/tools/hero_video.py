#!/usr/bin/env python3
"""tools/hero_video.py: turn the home hero videos into the web frame sequences the page plays.

  python3 tools/hero_video.py --src <folder with orbit-1.mp4 ... orbit-N.mp4 (or orbit.mp4) and dive.mp4>
  Options: --orbit-frames 360  --dive-frames 180  --width 1920  --mobile-width 720  --quality 55
           --format avif|webp  --no-mobile  --spacing-mix 0.7  --junction 6  --workers N  --diag DIR

The orbit clips are keyframed segments of one drone circle (each ends where the next starts). They are decoded,
lightly denoised, joined end to end and closed into a loop: at every join (and at the loop seam) the camera jump
between the two clips is measured (ORB features, similarity transform) and spread over --junction frames on each
side, with the exposure matched the same way, so dragging past a join shows no jump. Output frames are spaced
evenly in measured sideways motion (mixed with time), so the building turns at an even rate.

The dive (one continuous push-in from the building to the man at his desk) is lightly stabilised and sampled
evenly in time. Its chapters in video.json are kept from the previous file (they may be edited by hand).

Writes, under --out (default assets/img/hero):
  orbit/f-NNN.<ext>, dive/f-NNN.<ext>   desktop frames, 16:9
  orbit/m-NNN.<ext>, dive/m-NNN.<ext>   phone frames, a 3:4 crop round the centre (unless --no-mobile)
  video.json                            the manifest home-hero.js reads
"""
import argparse, glob, json, math, os, shutil, subprocess, sys, tempfile, time
from concurrent.futures import ProcessPoolExecutor

import numpy as np
from PIL import Image

try:
    import cv2
except ImportError:  # pragma: no cover
    sys.exit('needs OpenCV: pip install opencv-python-headless')

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_CHAPTERS = [
    {'at': 0, 'label': {'en': 'Eastmain, New Cairo', 'ar': 'إيست مين، القاهرة الجديدة'}},
    {'at': 0.3, 'label': {'en': 'Glass corner and shops', 'ar': 'الركن الزجاجي والمحلات'}},
    {'at': 0.55, 'label': {'en': 'Through the glass', 'ar': 'عبر الزجاج'}},
    {'at': 0.75, 'label': {'en': 'A desk by the window', 'ar': 'مكتب بجوار النافذة'}},
]


def log(*a):
    print('[hero_video]', *a, flush=True)


def ss5(x):
    x = min(1.0, max(0.0, x))
    return x * x * x * (x * (x * 6 - 15) + 10)


# ------------------------------------------------------------------ decode
def probe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                          'stream=width,height,r_frame_rate', '-of', 'json', path], capture_output=True, text=True).stdout
    s = json.loads(out)['streams'][0]
    num, den = s['r_frame_rate'].split('/')
    return int(s['width']), int(s['height']), float(num) / float(den)


def decode(path, work, name, stabilise):
    """All frames of a video as a uint8 memmap (n, h, w, 3), lightly denoised (and stabilised)."""
    w, h, fps = probe(path)
    vf = ['hqdn3d=1.5:1.5:3:3']
    if stabilise:
        trf = os.path.join(work, f'{name}.trf')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-vf', f'vidstabdetect=shakiness=4:accuracy=15:result={trf}',
                        '-f', 'null', '-'], check=True)
        vf.insert(0, f'vidstabtransform=input={trf}:smoothing=12:zoom=1:optzoom=0:interpol=bicubic')
    raw = os.path.join(work, f'{name}.u8')
    with open(raw, 'wb') as f:
        subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', ','.join(vf), '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'],
                       stdout=f, check=True)
    n = os.path.getsize(raw) // (w * h * 3)
    return np.memmap(raw, dtype=np.uint8, mode='r+', shape=(n, h, w, 3)), fps


def gray_small(img, width=480):
    h, w = img.shape[:2]
    return cv2.cvtColor(cv2.resize(img, (width, round(h * width / w)), interpolation=cv2.INTER_AREA), cv2.COLOR_RGB2GRAY).astype(np.float32)


# ------------------------------------------------------------------ geometry
def similarity(a, b):
    """2x3 similarity matrix taking frame a's pixels onto frame b, from ORB matches (None if unreliable)."""
    ga = cv2.cvtColor(a, cv2.COLOR_RGB2GRAY)
    gb = cv2.cvtColor(b, cv2.COLOR_RGB2GRAY)
    orb = cv2.ORB_create(4000)
    ka, da = orb.detectAndCompute(ga, None)
    kb, db = orb.detectAndCompute(gb, None)
    if da is None or db is None:
        return None, 0
    m = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True).match(da, db)
    if len(m) < 30:
        return None, len(m)
    pa = np.float32([ka[x.queryIdx].pt for x in m])
    pb = np.float32([kb[x.trainIdx].pt for x in m])
    M, inl = cv2.estimateAffinePartial2D(pa, pb, method=cv2.RANSAC, ransacReprojThreshold=2.5, maxIters=5000)
    if M is None or inl is None or inl.sum() < 40:
        return None, int(inl.sum()) if inl is not None else 0
    return M, int(inl.sum())


def mfrac(M, t):
    """The fraction t (may be negative) of a similarity transform about the image origin."""
    s = math.hypot(M[0, 0], M[1, 0])
    ang = math.atan2(M[1, 0], M[0, 0])
    st, at = s ** t, ang * t
    c, si = st * math.cos(at), st * math.sin(at)
    return np.float32([[c, -si, M[0, 2] * t], [si, c, M[1, 2] * t]])


def warp(img, M):
    h, w = img.shape[:2]
    return cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)


def hshift(a, b):
    """Horizontal motion from a to b as a share of the width (phase correlation on small grey frames)."""
    (dx, _), _ = cv2.phaseCorrelate(a, b)
    return dx / a.shape[1]


# ------------------------------------------------------------------ orbit
class Orbit:
    def __init__(self, clips, junction):
        self.clips = clips                    # list of (name, frames memmap)
        self.J = junction
        self.items = []                       # (clip index, frame index) in play order, loop closes at the end
        self.junctions = []
        for k, (name, fr) in enumerate(clips):
            start = 0
            if k > 0:
                prev = clips[k - 1][1]
                d = float(np.abs(gray_small(prev[-1]) - gray_small(fr[0])).mean())
                if d < 1.5:                  # the next clip starts on the previous clip's last frame
                    start = 1
            self.items += [(k, i) for i in range(start, len(fr))]
        # the last clip ends on the front view the first clip starts on: drop that duplicate
        last_k, last_i = self.items[-1]
        if float(np.abs(gray_small(clips[last_k][1][last_i]) - gray_small(clips[0][1][0])).mean()) < 4:
            self.items.pop()
        self.n = len(self.items)
        self.warps = [None] * self.n          # 2x3 warp per item (junction easing)
        self.gains = np.ones((self.n, 3), np.float32)

    def frame(self, j):
        k, i = self.items[j % self.n]
        return self.clips[k][1][i]

    def ease_joins(self):
        # joins between clips, plus the loop seam (last clip -> first clip)
        starts = [j for j in range(self.n) if j == 0 or self.items[j][0] != self.items[j - 1][0]]
        for s in starts:
            a_j, b_j = (s - 1) % self.n, s
            A, B = self.frame(a_j), self.frame(b_j)
            M, inl = similarity(A, B)                       # A's pixels onto B
            ma = A.reshape(-1, 3).mean(0) + 1e-3
            mb = B.reshape(-1, 3).mean(0) + 1e-3
            before = float(np.abs(gray_small(A) - gray_small(B)).mean())
            rec = {'between': f'{self.clips[self.items[a_j][0]][0]} > {self.clips[self.items[b_j][0]][0]}',
                   'jumpBefore': round(before, 2), 'inliers': inl, 'aligned': M is not None}
            for d in range(self.J):
                w = 0.5 * ss5(1 - d / self.J)               # half the jump on each side, eased away from the join
                ja, jb = (a_j - d) % self.n, (b_j + d) % self.n
                if M is not None:
                    self.warps[ja] = mfrac(M, w)
                    self.warps[jb] = mfrac(cv2.invertAffineTransform(M), w)
                g = (mb / ma) ** w
                self.gains[ja] *= g
                self.gains[jb] *= (ma / mb) ** w
            if M is not None:
                rec['scale'] = round(float(math.hypot(M[0, 0], M[1, 0])), 4)
                rec['shiftPx'] = [round(float(M[0, 2]), 1), round(float(M[1, 2]), 1)]
                A2 = warp(A, mfrac(M, 0.5))
                B2 = warp(B, mfrac(cv2.invertAffineTransform(M), 0.5))
                rec['jumpAfter'] = round(float(np.abs(gray_small(A2) - gray_small(B2)).mean()), 2)
            self.junctions.append(rec)
            log('join', rec)

    def motion(self):
        g = [gray_small(self.frame(j)) for j in range(self.n)]
        steps = np.array([hshift(g[j], g[(j + 1) % self.n]) for j in range(self.n)])
        return steps

    def cuts(self, fps):
        """Crossfades inside a clip: a frame that differs from its neighbours much more than they from each other."""
        out = []
        for k, (name, fr) in enumerate(self.clips):
            g = [gray_small(fr[i], 240) for i in range(len(fr))]
            d = np.array([np.abs(g[i + 1] - g[i]).mean() for i in range(len(g) - 1)])
            med = np.median(d) + 1e-3
            for i in range(2, len(g) - 2):
                bridge = np.abs(g[i + 2] - g[i - 2]).mean()
                via = np.abs(g[i] - g[i - 2]).mean() + np.abs(g[i + 2] - g[i]).mean()
                if via > 3.2 * med * 2 and via > 1.6 * bridge:
                    out.append({'kind': 'jump', 'at': f'{name} {i / fps:.2f} s (frame {i})'})
        return out


# ------------------------------------------------------------------ output
def even_positions(steps, count, mix, loop):
    """count positions along the frames, spaced evenly in motion (mix) and time (1 - mix)."""
    mag = np.abs(steps) if loop else np.abs(steps[:-1])
    mag = np.maximum(mag, np.median(mag) * 0.15)
    mag = mix * mag / mag.sum() + (1 - mix) / len(mag)
    cum = np.concatenate([[0], np.cumsum(mag)])
    targets = np.arange(count) / count if loop else np.linspace(0, 1, count)
    return np.interp(targets, cum / cum[-1], np.arange(len(cum)))


def crop_to(im, aspect, fx=0.5):
    h, w = im.shape[:2]
    if w / h > aspect:
        nw = round(h * aspect)
        x0 = int(round(min(max(fx * w - nw / 2, 0), w - nw)))
        return im[:, x0:x0 + nw]
    nh = round(w / aspect)
    y0 = (h - nh) // 2
    return im[y0:y0 + nh]


def save(im, path, q, fmt):
    pil = Image.fromarray(im)
    if fmt == 'avif':
        pil.save(path, 'AVIF', quality=q, speed=6, subsampling='4:2:0')
    else:
        pil.save(path, 'WEBP', quality=q, method=6)
    return os.path.getsize(path)


def render(job):
    img_path, M, gain, out_d, out_m, sz_d, sz_m, q, fmt = job
    im = np.load(img_path)
    if M is not None:
        im = warp(im, M)
    if gain is not None:
        im = np.clip(im.astype(np.float32) * gain[None, None, :] + 0.5, 0, 255).astype(np.uint8)
    sizes = []
    d = cv2.resize(crop_to(im, sz_d[0] / sz_d[1]), tuple(sz_d), interpolation=cv2.INTER_AREA)
    sizes.append(save(d, out_d, q, fmt))
    if out_m:
        m = cv2.resize(crop_to(im, sz_m[0] / sz_m[1]), tuple(sz_m), interpolation=cv2.INTER_AREA)
        sizes.append(save(m, out_m, q, fmt))
    return sizes


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--src', required=True)
    ap.add_argument('--out', default=os.path.join(SITE, 'assets/img/hero'))
    ap.add_argument('--orbit-frames', type=int, default=360)
    ap.add_argument('--dive-frames', type=int, default=180)
    ap.add_argument('--width', type=int, default=1920)
    ap.add_argument('--mobile-width', type=int, default=720)
    ap.add_argument('--quality', type=int, default=55)
    ap.add_argument('--format', choices=['avif', 'webp'], default='avif')
    ap.add_argument('--no-mobile', action='store_true')
    ap.add_argument('--spacing-mix', type=float, default=0.7)
    ap.add_argument('--junction', type=int, default=6)
    ap.add_argument('--workers', type=int, default=max(1, (os.cpu_count() or 2)))
    ap.add_argument('--diag', default=None)
    a = ap.parse_args()
    t0 = time.time()
    src = os.path.abspath(a.src)
    paths = sorted(glob.glob(os.path.join(src, 'orbit-*.mp4')), key=lambda p: int(p.rsplit('-', 1)[1].split('.')[0])) \
        or [os.path.join(src, 'orbit.mp4')]
    dive_path = os.path.join(src, 'dive.mp4')
    work = tempfile.mkdtemp(prefix='hero_video_')
    try:
        clips = []
        for p in paths:
            fr, fps = decode(p, work, os.path.basename(p)[:-4], False)
            clips.append((os.path.basename(p), fr))
            log(f'{os.path.basename(p)}: {len(fr)} frames, {fps:g} fps')
        dive, dfps = decode(dive_path, work, 'dive', True)
        log(f'dive.mp4: {len(dive)} frames (stabilised)')

        orbit = Orbit(clips, a.junction)
        log(f'orbit: {orbit.n} frames in the loop')
        orbit.ease_joins()
        steps = orbit.motion()
        turn = -1 if np.median(steps) < 0 else 1
        cuts = orbit.cuts(fps)
        if cuts:
            log('possible cuts or crossfades:', cuts)

        sz_d = (a.width, round(a.width * 9 / 16))
        sz_m = (a.mobile_width, round(a.mobile_width * 4 / 3))
        mob = not a.no_mobile
        out = os.path.abspath(a.out)
        stage = os.path.join(work, 'out')
        jobs = []
        for name in ('orbit', 'dive'):
            os.makedirs(os.path.join(stage, name))
        pos_o = even_positions(steps, a.orbit_frames, a.spacing_mix, True)
        for i, p in enumerate(pos_o):
            j = int(round(p)) % orbit.n
            f = os.path.join(work, f'o{i}.npy')
            np.save(f, np.asarray(orbit.frame(j)))
            jobs.append((f, orbit.warps[j], orbit.gains[j], os.path.join(stage, 'orbit', f'f-{i:03d}.{a.format}'),
                         os.path.join(stage, 'orbit', f'm-{i:03d}.{a.format}') if mob else None, sz_d, sz_m, a.quality, a.format))
        pos_d = np.linspace(0, len(dive) - 1, a.dive_frames)
        for i, p in enumerate(pos_d):
            f = os.path.join(work, f'd{i}.npy')
            np.save(f, np.asarray(dive[int(round(p))]))
            jobs.append((f, None, None, os.path.join(stage, 'dive', f'f-{i:03d}.{a.format}'),
                         os.path.join(stage, 'dive', f'm-{i:03d}.{a.format}') if mob else None, sz_d, sz_m, a.quality, a.format))
        log(f'rendering {len(jobs)} frames ({sz_d[0]} x {sz_d[1]}' + (f', phone {sz_m[0]} x {sz_m[1]}' if mob else '') +
            f', {a.format} q {a.quality}) on {a.workers} workers')
        t1 = time.time()
        with ProcessPoolExecutor(max_workers=a.workers) as ex:
            sizes = list(ex.map(render, jobs, chunksize=2))
        log(f'rendered in {time.time() - t1:.0f} s')
        no = a.orbit_frames
        b_o = [sum(s[0] for s in sizes[:no]), sum(s[1] for s in sizes[:no]) if mob else 0]
        b_d = [sum(s[0] for s in sizes[no:]), sum(s[1] for s in sizes[no:]) if mob else 0]

        for name in ('orbit', 'dive'):
            dst = os.path.join(out, name)
            shutil.rmtree(dst, ignore_errors=True)
            shutil.move(os.path.join(stage, name), dst)

        mpath = os.path.join(out, 'video.json')
        old = {}
        if os.path.exists(mpath):
            try:
                old = json.load(open(mpath))
            except Exception:  # noqa: BLE001
                old = {}
        g0 = gray_small(orbit.frame(0))
        dsteps = [np.abs(gray_small(dive[i]) - gray_small(dive[i + 1])).mean() for i in range(0, len(dive) - 1, max(1, len(dive) // 40))]
        handover = float(np.abs(g0 - gray_small(dive[0])).mean()) / (np.median(dsteps) * (len(dive) - 1) / max(1, a.dive_frames - 1) + 1e-6)
        secs = orbit.n / fps
        crop_w = (sz_m[0] / sz_m[1]) / (clips[0][1].shape[2] / clips[0][1].shape[1])
        man = {
            'version': 1,
            'generated': time.strftime('%Y-%m-%dT%H:%M:%S'),
            'note': 'written by tools/hero_video.py; dive.chapters may be edited by hand (kept), the rest is rewritten',
            'placeholder': {'orbit': False, 'dive': False},
            'sets': {
                'desktop': {'prefix': 'f-', 'ext': a.format, 'size': list(sz_d), 'quality': a.quality},
                **({'mobile': {'prefix': 'm-', 'ext': a.format, 'size': list(sz_m), 'quality': a.quality, 'use': 'portrait viewports',
                               'crop': {'x': round(0.5 - crop_w / 2, 4), 'y': 0, 'w': round(crop_w, 4), 'h': 1}}} if mob else {}),
            },
            'poster': {'desktop': f'orbit/f-000.{a.format}', **({'mobile': f'orbit/m-000.{a.format}'} if mob else {})},
            'progressive': [8, 4, 2, 1] if no >= 240 else [4, 2, 1],
            'orbit': {
                'dir': 'orbit/', 'count': no, 'loop': True, 'fps': round(no / secs, 3), 'degPerFrame': round(360 / no, 4),
                'turn': turn, 'shift': round(float(np.abs(steps).sum()) / no, 5),
                'junctions': orbit.junctions, 'cuts': cuts,
                'bytes': {'desktop': b_o[0], 'mobile': b_o[1]},
            },
            'dive': {
                'dir': 'dive/', 'count': a.dive_frames, 'loop': False, 'fps': round(a.dive_frames / (len(dive) / dfps), 3),
                'chapters': (old.get('dive') or {}).get('chapters') or DEFAULT_CHAPTERS,
                'handover': round(handover, 3), 'cuts': [],
                'bytes': {'desktop': b_d[0], 'mobile': b_d[1]},
            },
            'bytes': {'desktop': b_o[0] + b_d[0], 'mobile': b_o[1] + b_d[1]},
            'source': {'orbit': [os.path.basename(p) for p in paths], 'dive': 'dive.mp4'},
        }
        with open(mpath, 'w') as f:
            json.dump(man, f, ensure_ascii=False, indent=2, default=lambda o: o.item() if hasattr(o, 'item') else str(o))
            f.write('\n')
        log(f'desktop {man["bytes"]["desktop"] / 1e6:.1f} MB, phone {man["bytes"]["mobile"] / 1e6:.1f} MB, '
            f'turn {turn}, shift {man["orbit"]["shift"]}, handover {man["dive"]["handover"]}')
        if a.diag:
            os.makedirs(a.diag, exist_ok=True)
            for name, n in (('orbit', no), ('dive', a.dive_frames)):
                ims = [Image.open(os.path.join(out, name, f'f-{i:03d}.{a.format}')).convert('RGB').resize((240, 135))
                       for i in range(0, n, max(1, n // 32))]
                sheet = Image.new('RGB', (240 * 8, 135 * math.ceil(len(ims) / 8)))
                for k, im in enumerate(ims):
                    sheet.paste(im, ((k % 8) * 240, (k // 8) * 135))
                sheet.save(os.path.join(a.diag, f'contact-{name}.jpg'), quality=85)
        log(f'done in {time.time() - t0:.0f} s')
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == '__main__':
    main()
