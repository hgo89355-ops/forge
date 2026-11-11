// assets/js/pages/home-hero.js: HOME hero, Eastmain as one continuous camera: turn round the building, then dive in.
//
// HOW IT WORKS (video mode, the default)
// · assets/img/hero/video.json (written by tools/hero_video.py) describes two frame sequences cut from two videos:
//   ORBIT, a full 360 degree drone orbit that starts and ends on the front view (it loops), and DIVE, one continuous
//   push-in from the whole building (same front view) to the man working at his desk.
// · A 2D canvas draws the current frame with cover fit (device pixel ratio capped at 2, and never more pixels than
//   the frames have). Between two frames it crossfades, so a slow turn or a slow scroll never steps.
// · DIVE: the section is tall and the picture is pinned (position: sticky). Scroll progress maps to the dive frame;
//   the view follows with a critically damped spring, so wheel ticks, flicks and jumps become one smooth move.
//   Scrolling up plays it backwards; after the last frame the page continues. The headline fades out as the dive
//   starts; a slim line shows how deep the dive is. + and - scroll by a step, the reset button goes back to the top.
// · ORBIT: at the top, dragging sideways (mouse or touch), the arrow keys and the two round buttons turn the building
//   through the orbit frames, looping round, with momentum after release (gentle friction). Until the visitor does
//   anything the building turns very slowly by itself (about 1 degree per second). Scrolling down while turned first
//   turns back to the front the short way round (about 0.6 s); the dive starts from the front frame, and its first
//   frames crossfade from the orbit's front frame.
// · Loading: the page's <img> is the poster. Then every 4th frame of the orbit and the dive, then every 2nd, then
//   the rest (the sequence in use first, and the frames near the view before anything else). Frames are kept as
//   compressed blobs; only the frames near the view are decoded (a capped cache), so memory stays low. A missing
//   frame is drawn from the nearest loaded ones.
// · Reduced motion: no pinning, no idle turn, no momentum; the poster, and the buttons step through a few key
//   frames (8 angles, the dive chapters) with a short fade. ?qa=1: the static poster, no pinning.
// · Without video.json the still-stage version (home-hero-stills.js) runs instead.

import { t, onLang } from '../core/i18n.js';
import { $, clamp, isQA, prefersReducedMotion } from '../core/utils.js';
import { whenLoaded } from '../core/preloader.js';
import { scrollTo as scrollPage } from '../core/motion.js';

const BASE = 'assets/img/hero/';
const OMEGA = 8.5;            // dive spring (per second, critically damped)
const HOLD = [0.012, 0.06];   // share of the scroll held at the top (orbit) and after the last dive frame
const EASE = 0.4;             // the dive eases in and out over the scroll (0: linear)
const IDLE_DEG = 1;           // idle turn, degrees per second
const FRICTION = 2.2;         // orbit momentum decay, per second
const TURN_MAX = 240;         // fastest turn, degrees per second
const KICK_DEG = 30;          // a turn button coasts this far
const KEY_DEG = 9;            // one arrow key press coasts this far
const HANDOVER = 3;           // dive frames over which the orbit's front frame crossfades into the dive
// decoded frames kept (both sequences); fewer on touch devices, which crop the 16:9 frames and have less memory
const CACHE = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches ? 28 : 48;
const FETCHES = 6, DECODES = 3;

const S = {
  view: { en: 'Eastmain, New Cairo. Drag sideways to turn round the building, scroll to go inside.', ar: 'إيست مين، القاهرة الجديدة. اسحب جانبيًا للدوران حول المبنى، ومرّر الصفحة للدخول إليه.' },
  angle: { en: 'Turned {d} degrees', ar: 'دوران {d} درجة' },
  front: { en: 'Front view', ar: 'المنظر الأمامي' },
};
const fmt = (v, o) => t(v).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const ss5 = (x) => { const c = clamp(x, 0, 1); return c * c * c * (c * (c * 6 - 15) + 10); };
const mod = (a, n) => ((a % n) + n) % n;

export function initHero() {
  const root = $('[data-hx]');
  if (!root) return;
  fetch(`${BASE}video.json`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then((man) => {
      if (!(man?.orbit?.count > 1 && man?.dive?.count > 1)) return false;
      return (man.sets?.desktop?.ext === 'avif' ? avifOk() : Promise.resolve(true)).then((ok) => ok && (setupVideo(root, man), true));
    })
    .then((ok) => { if (!ok) import('./home-hero-stills.js').then((m) => m.initStills(root)); });
}

// AVIF frames need a browser that decodes AVIF (Safari 16+, Chrome 85+, Firefox 93+); others keep the still photo
const AVIF_2PX = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADrbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAETAAAAHgAAAChpaW5mAAAAAAABAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAABqaXBycAAAAEtpcGNvAAAAFGlzcGUAAAAAAAAAAgAAAAIAAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBAAwAAAAAE2NvbHJuY2x4AAEADQAGgAAAABdpcG1hAAAAAAAAAAEAAQQBAoMEAAAAJm1kYXQSAAoIGAA2iAhoNCAyEB7Hh4VZ3///4sAAAJA1l/A=';
function avifOk() {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img.naturalWidth === 2);
    img.onerror = () => res(false);
    img.src = AVIF_2PX;
  });
}

function setupVideo(root, man) {
  const pin = $('[data-hx-pin]', root) || root;
  const stage = $('[data-hx-stage]', root);
  const view = $('[data-hx-view]', root);
  const poster = $('[data-hx-poster]', root);
  const label = $('[data-hx-label]', root);
  const live = $('[data-hx-live]', root);
  const progress = $('[data-hx-progress]', root);
  const btn = {
    zin: $('[data-hx-zoom="in"]', root),
    zout: $('[data-hx-zoom="out"]', root),
    reset: $('[data-hx-reset]', root),
    left: $('[data-hx-turn="left"]', root),
    right: $('[data-hx-turn="right"]', root),
  };
  // the still version's controls are not used here
  $('[data-hx-above]', root)?.remove();
  $('[data-hx-depth]', root)?.remove();
  $('[data-hx-turns]', root)?.removeAttribute('hidden');
  progress?.removeAttribute('hidden');

  const qa = isQA();
  const reduced = prefersReducedMotion() || qa;
  root.classList.add('is-video');
  const scrollMode = !reduced && getComputedStyle(root).getPropertyValue('--hx-scroll').trim() === '1';
  root.classList.toggle('is-scroll', scrollMode);

  const O = { name: 'orbit', n: man.orbit.count, loop: true, dir: man.orbit.dir || 'orbit/' };
  const D = { name: 'dive', n: man.dive.count, loop: false, dir: man.dive.dir || 'dive/' };
  const SEQ = [O, D];
  const degPer = 360 / O.n;
  const TURN = man.orbit.turn === -1 ? -1 : 1;
  const chapters = (man.dive.chapters || []).slice().sort((a, b) => a.at - b.at);

  let W = 1, H = 1, setKey = '', set = null;
  let canvas = null, ctx = null, cw = 1, ch = 1;
  let visible = true, raf = 0, last = 0, drawn = false;
  // orbit (frames, looping), dive (frames)
  const orb = { pos: 0, vel: 0, idle: !reduced, tween: null };
  let dCur = 0, dVel = 0, dF = 0, dT = 0;
  let shownChapter = -1;

  const announce = (msg) => { if (live) { live.textContent = ''; requestAnimationFrame(() => { live.textContent = msg; }); } };

  /* ---------------------------------------------------------------- frames: fetch, decode, cache */
  function resetSeq(q) {
    q.blob = new Array(q.n).fill(null);
    q.fetching = new Set();
    q.bm = new Map();
    q.decoding = new Set();
  }
  SEQ.forEach(resetSeq);
  const url = (q, i) => `${BASE}${q.dir}${set.prefix}${String(i).padStart(3, '0')}.${set.ext || 'webp'}`;
  let fetchesOn = 0, decodesOn = 0, gen = 0;
  let focus = O;              // the sequence in use
  let loadAll = !reduced;     // reduced motion and QA only load key frames
  let started = false;        // nothing loads before the page itself has
  const wanted = [];          // key frames asked for in reduced motion

  // slow or data saving connections stop after every 2nd frame (the blend between frames covers the gaps)
  const conn = navigator.connection;
  const lean = !!conn && (conn.saveData || /(^|-)2g|3g/.test(conn.effectiveType || ''));
  function passes(q) {
    const out = [];
    const seen = new Set();
    const steps = man.progressive || [4, 2, 1];
    for (const step of lean ? steps.filter((x) => x > 1) : steps) {
      for (let i = 0; i < q.n; i += step) if (!seen.has(i)) { seen.add(i); out.push(i); }
    }
    return out;
  }
  const plan = { orbit: [], dive: [] };
  function nextFetch() {
    const cand = (q, i) => i >= 0 && i < q.n && !q.blob[i] && !q.fetching.has(i);
    // frames near the view first
    const near = focus === O ? O : D;
    const p = near === O ? orb.pos : dCur;
    const ahead = near === O ? (Math.sign(orb.vel) || 1) : (Math.sign(dT - dCur) || 1);
    for (let d = 0; d <= 6; d++) {
      for (const s of [ahead, -ahead]) {
        let i = Math.round(p) + s * d;
        if (near.loop) i = mod(i, near.n);
        if (cand(near, i)) return [near, i];
      }
    }
    if (D.blob[0] === null && cand(D, 0)) return [D, 0];
    for (const w of wanted) if (cand(w[0], w[1])) return w;
    if (!loadAll) return null;
    const first = focus, second = focus === O ? D : O;
    const pa = plan[first.name], pb = plan[second.name];
    // the sequence in use: coarse pass, then the other one's coarse pass, then the rest of both
    const coarse = (q, arr) => arr.slice(0, Math.ceil(q.n / 4));
    for (const [q, arr] of [[first, coarse(first, pa)], [second, coarse(second, pb)], [first, pa], [second, pb]]) {
      for (const i of arr) if (cand(q, i)) return [q, i];
    }
    return null;
  }
  function pumpFetch() {
    while (started && fetchesOn < FETCHES && set) {
      const nx = nextFetch();
      if (!nx) return;
      const [q, i] = nx;
      const g = gen;
      q.fetching.add(i);
      fetchesOn++;
      fetch(url(q, i))
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`${r.status}`))))
        .then((b) => { if (g === gen) q.blob[i] = b; })
        .catch((err) => { if (g === gen) console.warn('[hero] frame failed', q.name, i, err.message); })
        .finally(() => { fetchesOn--; if (g === gen) { q.fetching.delete(i); pumpDecode(); pumpFetch(); } });
    }
  }
  async function decodeBlob(b) {
    if ('createImageBitmap' in window) return createImageBitmap(b);
    const img = new Image();
    const u = URL.createObjectURL(b);
    img.src = u;
    try { await img.decode(); } finally { URL.revokeObjectURL(u); }
    return img;
  }
  // frames worth having decoded now: around each sequence's position (the one in use gets the wider window)
  function decodeWants() {
    const out = [];
    const add = (q, center, r, dir) => {
      for (let d = 0; d <= r; d++) {
        for (const s of (d ? [dir, -dir] : [1])) {
          let i = Math.round(center) + s * d;
          if (q.loop) i = mod(i, q.n);
          else if (i < 0 || i >= q.n) continue;
          out.push([q, i]);
        }
      }
    };
    if (reduced) { for (const w of wanted) out.push(w); add(O, orb.pos, 1, 1); add(D, dCur, 1, 1); return out; }
    if (focus === O) { add(O, orb.pos, 7, Math.sign(orb.vel) || 1); add(D, 0, HANDOVER + 1, 1); }
    else { add(D, dCur, 8, Math.sign(dT - dCur) || 1); add(O, 0, 1, 1); }
    return out;
  }
  function pumpDecode() {
    if (!set) return;
    for (const [q, i] of decodeWants()) {
      if (decodesOn >= DECODES) return;
      if (q.bm.has(i) || q.decoding.has(i) || !q.blob[i]) continue;
      const g = gen;
      q.decoding.add(i);
      decodesOn++;
      decodeBlob(q.blob[i])
        .then((bmp) => {
          if (g !== gen) { bmp.close?.(); return; }
          q.bm.set(i, bmp);
          evict();
          request();
        })
        .catch((err) => console.warn('[hero] decode failed', q.name, i, err))
        .finally(() => { decodesOn--; if (g === gen) q.decoding.delete(i); pumpDecode(); });
    }
  }
  function evict() {
    let total = O.bm.size + D.bm.size;
    if (total <= CACHE) return;
    const dist = (q, i) => {
      const p = q === O ? orb.pos : dCur;
      let d = Math.abs(i - p);
      if (q.loop) d = Math.min(d, q.n - d);
      if (q !== focus) d += q === O ? (i === 0 ? 0 : 40) : (i <= HANDOVER ? 0 : 40);
      return i % 4 === 0 ? d / 2 : d;
    };
    const all = [];
    for (const q of SEQ) for (const i of q.bm.keys()) all.push([dist(q, i), q, i]);
    all.sort((a, b) => b[0] - a[0]);
    for (const [, q, i] of all) {
      if (total <= CACHE) break;
      q.bm.get(i)?.close?.();
      q.bm.delete(i);
      total--;
    }
  }
  // the two decoded frames around position p, and the blend between them
  function pick(q, p) {
    const n = q.n;
    const i0 = Math.floor(p), f = p - i0;
    let lo = null, hi = null, dl = 0, dh = 0;
    for (let d = 0; d < n; d++) {
      const j = q.loop ? mod(i0 - d, n) : i0 - d;
      if (j < 0) break;
      if (q.bm.has(j)) { lo = j; dl = d; break; }
    }
    for (let d = 1; d <= n; d++) {
      const j = q.loop ? mod(i0 + d, n) : i0 + d;
      if (j >= n) break;
      if (q.bm.has(j)) { hi = j; dh = d; break; }
    }
    if (lo === null && hi === null) return null;
    if (lo === null) return { a: hi, b: hi, w: 0 };
    if (hi === null || hi === lo) return { a: lo, b: lo, w: 0 };
    const w = (dl + f) / (dl + dh);
    // neighbours: a short crossfade in the middle of the step; far apart (still loading): a plain blend
    return { a: lo, b: hi, w: dl + dh === 1 ? ss5((w - 0.08) / 0.84) : w };
  }

  /* ---------------------------------------------------------------- canvas */
  function chooseSet() {
    const key = W < H * 0.95 && man.sets?.mobile ? 'mobile' : 'desktop';
    if (key === setKey) return;
    setKey = key;
    set = { prefix: 'f-', size: [1600, 900], ...(man.sets?.[key] || {}) };
    gen++;
    for (const q of SEQ) { for (const b of q.bm.values()) b.close?.(); resetSeq(q); }
    fetchesOn = 0; decodesOn = 0;
    plan.orbit = passes(O);
    plan.dive = passes(D);
    drawn = false;
    root.classList.remove('is-live');
    if (started) pumpFetch();
  }
  function layout() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    chooseSet();
    if (!canvas) return;
    const [fw, fh] = set.size;
    const cover = Math.max(W / fw, H / fh);
    // device pixels, capped at 2 and at the frame's own pixels (more would only upscale)
    const dpr = clamp(Math.min(window.devicePixelRatio || 1, 2), 0.5, Math.max(0.5, 1 / cover));
    cw = Math.max(1, Math.round(W * dpr));
    ch = Math.max(1, Math.round(H * dpr));
    canvas.width = cw;
    canvas.height = ch;
    ctx.imageSmoothingQuality = 'high';
  }
  function draw(img, alpha) {
    if (!img || alpha <= 0.002) return;
    const fw = img.width, fh = img.height;
    const s = Math.max(cw / fw, ch / fh);
    const sw = cw / s, sh = ch / s;
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(img, (fw - sw) / 2, (fh - sh) / 2, sw, sh, 0, 0, cw, ch);
  }
  function drawSeq(q, pk, alpha) {
    if (!pk) return false;
    draw(q.bm.get(pk.a), alpha);
    if (pk.w > 0.002 && pk.b !== pk.a) draw(q.bm.get(pk.b), alpha * pk.w);
    return true;
  }
  function paint() {
    if (!ctx) return;
    const h = clamp(dCur / HANDOVER, 0, 1);
    const po = h < 1 ? pick(O, orb.pos) : null;
    const pd = h > 0 || !po ? pick(D, Math.max(0, dCur)) : null;
    if (!po && !pd) return;
    ctx.globalAlpha = 1;
    let ok = false;
    if (po) ok = drawSeq(O, po, 1);
    if (pd && (h > 0 || !ok)) ok = drawSeq(D, pd, ok ? ss5(h) : 1) || ok;
    ctx.globalAlpha = 1;
    if (ok && !drawn) { drawn = true; requestAnimationFrame(() => root.classList.add('is-live')); }
  }

  /* ---------------------------------------------------------------- scroll and dive */
  const span = 1 - HOLD[0] - HOLD[1];
  const easeU = (u) => u - EASE * Math.sin(2 * Math.PI * u) / (2 * Math.PI);
  function diveOfP(p) {
    const u = clamp((p - HOLD[0]) / span, 0, 1);
    return (D.n - 1) * easeU(u);
  }
  function pOfDive(f) {
    const v = clamp(f / (D.n - 1), 0, 1);
    let lo = 0, hi = 1;
    for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (easeU(m) < v) lo = m; else hi = m; }
    return f <= 0 ? 0 : HOLD[0] + span * (lo + hi) / 2;
  }
  const runPx = () => Math.max(0, root.offsetHeight - pin.offsetHeight);
  function scrollP() {
    const run = runPx();
    return run > 1 ? clamp(-root.getBoundingClientRect().top / run, 0, 1) : 0;
  }
  function scrollToDive(f, immediate = false) {
    const y = window.scrollY + root.getBoundingClientRect().top + pOfDive(f) * runPx();
    scrollPage(Math.round(y), { immediate });
  }

  /* ---------------------------------------------------------------- orbit */
  const atTop = () => dCur < 0.01 && dT < 0.01;
  const shortest = (to) => { let d = mod(to - orb.pos, O.n); if (d > O.n / 2) d -= O.n; return d; };
  function turnTo(to, secs) {
    const d = shortest(to);
    orb.vel = 0;
    if (Math.abs(d) < 1e-3) { orb.tween = null; orb.pos = mod(to, O.n); return; }
    orb.tween = { from: orb.pos, d, t0: performance.now(), dur: secs ?? clamp(0.45 + Math.abs(d) * degPer / 400, 0.45, 0.9) };
    request();
  }
  function stopIdle() { orb.idle = false; }
  // a push that coasts about `deg` degrees under the friction
  function kick(deg) {
    stopIdle();
    orb.tween = null;
    const maxV = TURN_MAX / degPer;
    orb.vel = clamp(orb.vel + (deg / degPer) * FRICTION, -maxV, maxV);
    request();
  }
  // a drag across this many pixels turns framesPerWidth() frames (phones count as 640 px, so a thumb swipe
  // does not spin the building)
  const dragW = () => Math.max(W, 640);
  const framesPerWidth = () => {
    const sh = man.orbit.shift > 0 ? 1 / man.orbit.shift : O.n / 4;
    return clamp(sh, O.n / 8, O.n / 2.6);
  };

  /* ---------------------------------------------------------------- loop */
  function tick(now) {
    raf = 0;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    let moving = false;
    // dive target from the scroll; held at the front until the orbit is back there
    if (scrollMode) dT = diveOfP(scrollP());
    const wantsDive = dT > 0.01;
    if (wantsDive) {
      if (focus !== D) { focus = D; pumpFetch(); }
      if (!orb.tween && (Math.abs(shortest(0)) > 1e-3 || Math.abs(orb.vel) > 0)) { stopIdle(); turnTo(0); }
    } else if (dCur < 0.5 && focus !== O) { focus = O; pumpFetch(); }
    // orbit: tween, momentum or idle
    if (orb.tween) {
      const tw = orb.tween;
      const k = clamp((now - tw.t0) / 1000 / tw.dur, 0, 1);
      orb.pos = mod(tw.from + tw.d * ss5(k), O.n);
      if (k >= 1) { orb.tween = null; orb.pos = mod(Math.round(orb.pos * 1e4) / 1e4, O.n); }
      moving = true;
    } else if (!drag && Math.abs(orb.vel) > 0.02) {
      orb.pos = mod(orb.pos + orb.vel * dt, O.n);
      orb.vel *= Math.exp(-FRICTION * dt);
      moving = true;
    } else if (!drag) {
      orb.vel = 0;
      if (orb.idle && !reduced && atTop() && visible && drawn) {
        orb.pos = mod(orb.pos + (IDLE_DEG / degPer) * dt, O.n);
        moving = true;
      }
    }
    // dive: follows its target with a critically damped spring; waits at the front while the orbit turns back
    const gate = orb.tween || Math.abs(shortest(0)) > 1e-3 ? 0 : D.n - 1;
    const want = Math.min(dT, gate);
    const vmax = D.n * 0.9;
    dF += clamp(want - dF, -vmax * dt, vmax * dt);
    const x = dCur - dF;
    if (reduced || (dF === want && Math.abs(x) < 1e-3 && Math.abs(dVel) < 1e-2)) {
      if (dCur !== want) moving = true;
      dCur = dF = want;
      dVel = 0;
    } else {
      const e = Math.exp(-OMEGA * dt);
      const j = (dVel + OMEGA * x) * dt;
      dCur = dF + (x + j) * e;
      dVel = (dVel - OMEGA * j) * e;
      moving = true;
    }
    paint();
    syncUI();
    pumpDecode();
    if (moving) request(); else last = 0;
  }
  function request() { if (!raf && visible) raf = requestAnimationFrame(tick); }

  /* ---------------------------------------------------------------- UI state */
  function chapterAt(f) {
    const v = f / Math.max(1, D.n - 1);
    let k = 0;
    chapters.forEach((c, i) => { if (v >= c.at - 1e-4) k = i; });
    return k;
  }
  function syncUI() {
    const out = clamp(dCur / Math.max(1, D.n * 0.06), 0, 1);
    root.style.setProperty('--hx-out', out.toFixed(3));
    root.style.setProperty('--hx-p', (dCur / Math.max(1, D.n - 1)).toFixed(4));
    root.classList.toggle('is-zoomed', out > 0.98);
    const end = scrollMode ? dT : dCur;
    if (btn.zin) btn.zin.disabled = end >= D.n - 1.5;
    if (btn.zout) btn.zout.disabled = end <= 0.01;
    const turning = !atTop() && !reduced;
    if (btn.left) btn.left.disabled = turning;
    if (btn.right) btn.right.disabled = turning;
    if (chapters.length) {
      const k = chapterAt(dCur);
      if (k !== shownChapter) { shownChapter = k; if (label) label.textContent = t(chapters[k].label); }
    }
  }

  /* ---------------------------------------------------------------- reduced motion: key frames */
  const keysO = Array.from({ length: 8 }, (_, i) => Math.round(i * O.n / 8) % O.n);
  const keysD = [...new Set([0, ...chapters.map((c) => Math.round(c.at * (D.n - 1))), D.n - 1])].sort((a, b) => a - b);
  async function ensureFrame(q, i) {
    if (!wanted.some((w) => w[0] === q && w[1] === i)) wanted.push([q, i]);
    pumpFetch();
    const g = gen;
    const t0 = performance.now();
    while (!q.bm.has(i) && g === gen && performance.now() - t0 < 6000) {
      pumpDecode();
      await new Promise((r) => setTimeout(r, 40));
    }
  }
  let jumping = false;
  async function jumpTo(o, d) {
    if (jumping) return;
    jumping = true;
    await Promise.all([o !== null ? ensureFrame(O, o) : null, d !== null ? ensureFrame(D, d) : null]);
    const apply = () => {
      if (o !== null) { orb.pos = o; orb.vel = 0; orb.tween = null; }
      if (d !== null) { dT = dCur = dF = d; dVel = 0; }
      paint();
      syncUI();
    };
    if (qa || !drawn) apply();
    else {
      root.classList.add('is-jump');
      await new Promise((r) => setTimeout(r, 140));
      apply();
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('is-jump')));
    }
    jumping = false;
  }

  /* ---------------------------------------------------------------- actions */
  function stepDive(dir) {
    stopIdle();
    if (reduced) {
      const cur = dCur;
      const to = dir > 0 ? keysD.find((k) => k > cur + 0.5) : [...keysD].reverse().find((k) => k < cur - 0.5);
      if (to === undefined) return;
      jumpTo(to > 0 ? 0 : null, to);
      announce(t(chapters[chapterAt(to)]?.label || S.front));
      return;
    }
    const step = (D.n - 1) / 6;
    const base = scrollMode ? dT : dCur;
    const to = clamp(dir > 0 ? Math.floor(base / step + 0.05) * step + step : Math.ceil(base / step - 0.05) * step - step, 0, D.n - 1);
    if (scrollMode) scrollToDive(to);
    else { dT = to; request(); }
    announce(t(chapters[chapterAt(to)]?.label || S.front));
  }
  function turn(dir) {
    if (reduced) {
      stopIdle();
      const cur = Math.round(orb.pos / (O.n / 8));
      const to = keysO[mod(cur + dir * TURN, 8)];
      jumpTo(to, dCur > 0 ? 0 : null);
      announce(to === 0 ? t(S.front) : fmt(S.angle, { d: Math.round(to * degPer) }));
      return;
    }
    if (!atTop()) return;
    // the button names say which way the building moves on screen
    kick(dir * TURN * KICK_DEG);
  }
  function reset() {
    stopIdle();
    if (reduced) { jumpTo(0, 0); announce(t(S.front)); return; }
    if (scrollMode && dT > 0.01) scrollToDive(0);
    turnTo(0);
    announce(t(S.front));
  }
  btn.zin?.addEventListener('click', () => stepDive(1));
  btn.zout?.addEventListener('click', () => stepDive(-1));
  btn.reset?.addEventListener('click', reset);
  btn.left?.addEventListener('click', () => turn(-1));
  btn.right?.addEventListener('click', () => turn(1));

  /* ---------------------------------------------------------------- input: drag with momentum */
  let drag = null;
  const pts = new Set();
  view.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    pts.add(e.pointerId);
    if (pts.size > 1) { drag = null; root.classList.remove('is-dragging'); return; }
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, mode: e.pointerType === 'mouse' ? 'turn' : null, hist: [[performance.now(), e.clientX]] };
    if (drag.mode) start(e);
  });
  function start(e) {
    if (reduced || !atTop()) { drag = null; return; }
    stopIdle();
    orb.tween = null;
    orb.vel = 0;
    root.classList.add('is-dragging');
    try { view.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }
  view.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.mode) {
      // touch: a mostly sideways move turns; an upward or downward one scrolls the page (touch-action: pan-y)
      const tx = e.clientX - drag.x0, ty = e.clientY - drag.y0;
      if (Math.abs(tx) > 8 && Math.abs(tx) > Math.abs(ty) * 1.2) { drag.mode = 'turn'; start(e); if (!drag) return; }
      else if (Math.abs(ty) > 8) { drag = null; return; }
      else return;
    }
    const dx = e.clientX - drag.x;
    drag.x = e.clientX;
    const now = performance.now();
    drag.hist.push([now, e.clientX]);
    while (drag.hist.length > 2 && now - drag.hist[0][0] > 90) drag.hist.shift();
    orb.pos = mod(orb.pos + (dx / dragW()) * framesPerWidth() * TURN, O.n);
    request();
  });
  const endPointer = (e) => {
    pts.delete(e.pointerId);
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.mode === 'turn' && e.type === 'pointerup') {
      const h = drag.hist;
      const now = performance.now();
      const [t0, x0] = h[0];
      const dtv = (now - t0) / 1000;
      // momentum from the last ~90 ms of the drag (none if the pointer rested before release)
      if (dtv > 0.008 && now - h[h.length - 1][0] < 60) {
        const vpx = (h[h.length - 1][1] - x0) / dtv;
        const maxV = TURN_MAX / degPer;
        orb.vel = clamp((vpx / dragW()) * framesPerWidth() * TURN, -maxV, maxV);
      }
    }
    drag = null;
    root.classList.remove('is-dragging');
    request();
  };
  view.addEventListener('pointerup', endPointer);
  view.addEventListener('pointercancel', endPointer);
  view.addEventListener('keydown', (e) => {
    const k = e.key;
    let used = true;
    if (k === 'ArrowLeft') { if (reduced) turn(-1); else if (atTop()) kick(-TURN * KEY_DEG); }
    else if (k === 'ArrowRight') { if (reduced) turn(1); else if (atTop()) kick(TURN * KEY_DEG); }
    else if (k === '+' || k === '=') stepDive(1);
    else if (k === '-' || k === '_') stepDive(-1);
    else if (k === '0') reset();
    else used = false;
    if (used) e.preventDefault();
  });

  /* ---------------------------------------------------------------- lifecycle */
  function paintText() {
    view.setAttribute('aria-label', t(S.view));
    if (label && chapters.length && shownChapter >= 0) label.textContent = t(chapters[shownChapter].label);
  }
  view.tabIndex = 0;
  view.setAttribute('role', 'application');
  view.setAttribute('aria-describedby', 'hx-help');
  view.style.touchAction = 'pan-y';
  root.hxState = () => ({
    mode: 'video', reduced, scroll: scrollMode, set: setKey, frames: { orbit: O.n, dive: D.n },
    orbit: orb.pos, deg: orb.pos * degPer, vel: orb.vel, idle: orb.idle, turning: !!orb.tween,
    dive: dCur, target: dT, run: runPx(), live: drawn,
    loaded: { orbit: O.blob.filter(Boolean).length, dive: D.blob.filter(Boolean).length },
    decoded: { orbit: O.bm.size, dive: D.bm.size },
    chapter: shownChapter,
  });
  root.hxScrollForDive = (f) => pOfDive(f);
  root.hxSetOrbit = (f) => { stopIdle(); orb.tween = null; orb.vel = 0; orb.pos = mod(f, O.n); request(); };

  if (!reduced || !qa) {
    try {
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('no 2d context');
      view.append(canvas);
    } catch (err) {
      console.warn('[hero] canvas unavailable, the photo stays still', err);
      canvas = null; ctx = null;
    }
  }
  if (qa) {
    // static poster; the buttons still work (they draw on a canvas made on first use)
    loadAll = false;
  }
  function ensureCanvas() {
    if (ctx) return;
    canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    ctx = canvas.getContext('2d', { alpha: false });
    view.append(canvas);
    layout();
  }
  if (qa) for (const b of [btn.zin, btn.zout, btn.reset, btn.left, btn.right]) b?.addEventListener('pointerdown', ensureCanvas, { once: true });
  layout();
  syncUI();
  paintText();

  if ('ResizeObserver' in window) {
    let pending = 0;
    new ResizeObserver(() => { cancelAnimationFrame(pending); pending = requestAnimationFrame(() => { layout(); paint(); request(); }); }).observe(stage);
  } else window.addEventListener('resize', () => { layout(); paint(); request(); });
  if (scrollMode) window.addEventListener('scroll', request, { passive: true });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) request(); }).observe(root);
  }
  onLang(() => { paintText(); const k = shownChapter; shownChapter = -1; if (k >= 0) syncUI(); });

  whenLoaded().then(() => {
    root.classList.add('is-ready');
    started = true;
    if (qa) return;
    if (reduced) {
      // only the key frames, after the page is idle
      const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 600));
      idle(() => { for (const i of keysO) wanted.push([O, i]); for (const i of keysD) wanted.push([D, i]); pumpFetch(); }, { timeout: 3000 });
      return;
    }
    if (scrollMode) { dT = dCur = dF = diveOfP(scrollP()); if (dT > 0.01) focus = D; }
    pumpFetch();
    request();
  });
}
