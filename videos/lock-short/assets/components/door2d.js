/* Door2D — the lock Short's OUTSIDE scenes as flat 2D cartoon. Pure function of t → SVG string (full 1080×1920 frame).
 *   Door2D.render(name, t, info) — name ∈ hookIn | hookJam | dive | doorOpen | lockedOut | loop
 *   info = { S: {shotName: start}, A: {word: start}, DUR }
 * Owner 2026-11-26: "completely 2D, customised with our character, completely flexible".
 * Owner 2026-11-28: camera sees the door FROM THE SIDE (3/4 angle); he starts farther away and takes three steps.
 *
 * World: a flat oblique projection. xw runs along the house wall (to the right = away from camera), y is up (negative),
 * z comes out of the wall toward the yard (screen-left). The door is in the wall; the key sticks out toward him (along z).
 * Story: hides in a bush, peeks, three sneaky steps to the door, key in, keeps trying to twist it (it won't), freezes,
 * deadpan stare, points at the keyhole → camera dives into the keyhole (cut to the 3D cutaway). Right key → door swings
 * in, he jumps and cheers. Ending: wrong key again → yank → key pops → pratfall → deadpan stare → back in the bush (loop).
 * Timings match the sound effects (sfx_v13.py): hook clacks at S.hookJam+0.1+0.2k (k<6), lockedOut clacks at
 * S.lockedOut+0.08+0.2k (k<5), pop/thud at A.out, door thud at S.doorOpen+0.05, steps from stepTimes().
 */
const Door2D = (function () {
  const G = (typeof window !== 'undefined' && window.Guide2D) || (typeof require !== 'undefined' ? require('./guide2d.js') : null);
  const INK = '#121317';
  const f = (n) => (Math.round(n * 10) / 10).toString();
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const win = (t, a, b) => clamp01((t - a) / (b - a));
  const lerp = (a, b, u) => a + (b - a) * u;
  const io = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const o3 = (u) => 1 - Math.pow(1 - u, 3);
  const i2 = (u) => u * u;
  const sp = (u, k = 1) => (u <= 0 ? 0 : 1 - Math.exp(-6 * u) * Math.cos(11 * k * u)); // springy overshoot
  const bump = (t, a, b) => (t <= a || t >= b ? 0 : Math.sin(((t - a) / (b - a)) * Math.PI));
  const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
  const noise = (t, seed) => { const i = Math.floor(t), fr = t - i, a = hash(i + seed * 17.3), b = hash(i + 1 + seed * 17.3), u = fr * fr * (3 - 2 * fr); return a + (b - a) * u - 0.5; };

  // ---------- projection (oblique 3/4 side view)
  const KX = 1, KY = 0, ZX = -0.2, ZY = 0.3;   // owner 2026-11-28: low camera, house front facing us, between the bush and the door
  const P3 = (xw, y, z) => [xw * KX + z * ZX, y + xw * KY + z * ZY];
  const XD = [KX, KY], UP = [0, -1], ZD = [ZX, ZY];
  const ZN = Math.hypot(ZX, ZY), ZDN = [ZX / ZN, ZY / ZN];
  const pts = (arr) => arr.map((p) => `${f(p[0])},${f(p[1])}`).join(' ');
  const poly = (arr, fill, sw = 6, extra = '') => `<polygon points="${pts(arr)}" fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round" ${extra}/>`;
  const wallQuad = (x0, x1, y0, y1, z = 0) => [P3(x0, y0, z), P3(x1, y0, z), P3(x1, y1, z), P3(x0, y1, z)];
  const groundQuad = (x0, x1, z0, z1, y = 0) => [P3(x0, y, z0), P3(x1, y, z0), P3(x1, y, z1), P3(x0, y, z1)];
  const line = (a, b, col, w) => `<path d="M${f(a[0])},${f(a[1])} L${f(b[0])},${f(b[1])}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
  // ellipse = circle of radius r in the plane spanned by unit vectors u, v around c
  const ring = (c, u, v, r, n = 28) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [c[0] + r * (Math.cos(a) * u[0] + Math.sin(a) * v[0]), c[1] + r * (Math.cos(a) * u[1] + Math.sin(a) * v[1])]; });

  // ---------- world layout
  const S_CHAR = 1.15;
  const DOOR = { x0: 0, x1: 240, top: -720 };   // x0 = latch side (near camera), x1 = hinge side (far)
  const LKW = [36, -300];                       // lock cylinder on the wall (xw, y)
  const LK0 = P3(LKW[0], LKW[1], 7);            // front face of the cylinder (screen)
  const LK = LK0;
  const W_STAND = [-62, 175], W_HIDE = [-610, 205], W_BUSH = [-650, 410];   // (xw, z) on the ground
  const gpos = (w) => P3(w[0], 0, w[1]);
  const STAND = gpos(W_STAND), HIDE = gpos(W_HIDE);
  const walkAt = (s) => [lerp(HIDE[0], STAND[0], s), lerp(HIDE[1], STAND[1], s)];   // s = 0 (bush) … 1 (door), linear on screen

  // ---------- scenery
  function wall() {
    let o = poly(wallQuad(-3000, 3000, -1400, 0), '#F0E4C6', 0);
    for (let y = -1380; y < 0; y += 38) o += line(P3(-3000, y, 0), P3(3000, y, 0), '#D9C9A2', 3.5);
    o += poly(wallQuad(-3000, 3000, -1300, -1254), '#FFFFFF', 6) + poly(wallQuad(-3000, 3000, -1600, -1300), '#5A4B47', 0);
    o += poly(wallQuad(-3000, 3000, -34, 0), '#C9C2B4', 0) + line(P3(-3000, -34, 0), P3(3000, -34, 0), INK, 5);
    return o;
  }
  function windowAt(x0, x1, y0, y1) {
    let o = poly(wallQuad(x0 - 22, x1 + 22, y0 - 22, y1 + 22), '#FFFFFF', 6);
    o += poly(wallQuad(x0, x1, y0, y1), '#BFE2F4', 5);
    const w = x1 - x0, h = y1 - y0;
    o += line(P3(x0 + w * 0.15, y0 + h * 0.8, 0), P3(x0 + w * 0.5, y0 + h * 0.12, 0), '#E6F5FC', 14);
    o += line(P3(x0 + w / 2, y0, 0), P3(x0 + w / 2, y1, 0), '#FFFFFF', 12) + line(P3(x0, y0 + h / 2, 0), P3(x1, y0 + h / 2, 0), '#FFFFFF', 12);
    // flower box sticking out of the wall
    const by = y1 + 24, bz = 34;
    o += poly([P3(x0 - 26, by, 0), P3(x1 + 26, by, 0), P3(x1 + 26, by, bz), P3(x0 - 26, by, bz)], '#94612F', 5);
    o += poly([P3(x0 - 26, by, bz), P3(x1 + 26, by, bz), P3(x1 + 26, by + 40, bz), P3(x0 - 26, by + 40, bz)], '#B5703F', 5);
    for (let i = 0; i < 6; i++) {
      const q = P3(x0 - 6 + i * ((w + 12) / 5), by - 10 - (i % 2) * 10, bz * 0.5);
      o += `<circle cx="${f(q[0])}" cy="${f(q[1] + 12)}" r="16" fill="#4E9E45" stroke="${INK}" stroke-width="5"/><circle cx="${f(q[0])}" cy="${f(q[1])}" r="10" fill="${i % 2 ? '#F2C230' : '#E0393E'}" stroke="${INK}" stroke-width="4.5"/>`;
    }
    return o;
  }
  function lamp(xw, y) {
    const b = P3(xw, y, 0), q = P3(xw, y, 30);
    return line(b, q, INK, 14) + line(b, q, '#2A2C31', 7) + `<circle cx="${f(q[0])}" cy="${f(q[1] + 20)}" r="66" fill="#FFE9A6" opacity="0.35"/>` +
      `<path d="M${f(q[0] - 24)},${f(q[1] - 8)} L${f(q[0] + 24)},${f(q[1] - 8)} L${f(q[0] + 18)},${f(q[1] + 50)} L${f(q[0] - 18)},${f(q[1] + 50)} Z" fill="#FFE07A" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>` +
      `<path d="M${f(q[0] - 32)},${f(q[1] - 10)} L${f(q[0] + 32)},${f(q[1] - 10)} L${f(q[0])},${f(q[1] - 38)} Z" fill="#2A2C31" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>` +
      `<rect x="${f(q[0] - 22)}" y="${f(q[1] + 48)}" width="44" height="12" rx="4" fill="#2A2C31" stroke="${INK}" stroke-width="5"/>`;
  }
  function plaque(xw, y) {
    const q = wallQuad(xw - 26, xw + 26, y - 36, y + 36);
    const c = P3(xw, y + 20, 0);
    return poly(q, '#2A2C31', 5) + `<text x="${f(c[0])}" y="${f(c[1])}" font-family="Inter" font-weight="900" font-size="50" text-anchor="middle" fill="#FFFFFF" transform="skewY(${f((Math.atan2(KY, KX) * 180) / Math.PI)}) " transform-origin="${f(c[0])} ${f(c[1])}">7</text>`;
  }
  function ground() {
    let o = poly([P3(-3000, 0, 0), P3(3000, 0, 0), [6000, 6000], [-6000, 6000]], '#86C25E', 0);
    // walkway along the house front (wide concrete slabs)
    o += poly(groundQuad(-3000, 3000, 0, 330), '#DCD6CB', 6);
    for (let x = -3000; x < 3000; x += 170) o += line(P3(x, 0, 0), P3(x, 0, 330), '#BDB4A5', 4);
    o += line(P3(-3000, 0, 165), P3(3000, 0, 165), '#C9C1B3', 3);
    // front step at the door
    o += poly(groundQuad(-40, 280, 0, 110, -16), '#EAE5DC', 5) + poly([P3(-40, -16, 110), P3(280, -16, 110), P3(280, 0, 110), P3(-40, 0, 110)], '#BDB6A8', 5);
    o += poly(groundQuad(30, 210, 18, 92, -16), '#7A4E3A', 4);   // doormat
    // grass tufts on the lawn
    for (let i = 0; i < 60; i++) {
      const xw = -2400 + hash(i) * 4800, z = 380 + hash(i + 9) * 1600, q = P3(xw, 0, z);
      o += `<path d="M${f(q[0] - 12)},${f(q[1])} L${f(q[0] - 4)},${f(q[1] - 20)} L${f(q[0] + 2)},${f(q[1] - 4)} L${f(q[0] + 10)},${f(q[1] - 22)} L${f(q[0] + 14)},${f(q[1])}" fill="none" stroke="#5E9E43" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`;
    }
    return o;
  }
  function bush(c, w, h, wob, seed) {   // flat cartoon bush: leaf-balls merged into one outlined mass; c = base centre (screen)
    const C = [], cx = c[0], by = c[1], n = 11;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (1 + i / (n - 1)), r = w * (0.17 + hash(i + seed) * 0.05);
      const wx = Math.sin(wob * 30 + i) * wob * 8;
      C.push([cx + Math.cos(a) * (w / 2 - r * 0.7) + wx, by + Math.sin(a) * (h - r * 0.9) - r * 0.15, r]);
    }
    for (let i = 0; i < 4; i++) C.push([cx - w * 0.3 + i * w * 0.2, by - h * 0.35 + hash(i + seed + 3) * 20, w * 0.2]);
    let o = C.map(([x, y, r]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r + 7)}" fill="${INK}"/>`).join('');
    o += `<rect x="${f(cx - w / 2 + 8)}" y="${f(by - h * 0.45)}" width="${f(w - 16)}" height="${f(h * 0.45)}" fill="${INK}"/>`;
    o += C.map(([x, y, r]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#4FA548"/>`).join('');
    o += `<rect x="${f(cx - w / 2 + 14)}" y="${f(by - h * 0.45)}" width="${f(w - 28)}" height="${f(h * 0.45 - 6)}" fill="#4FA548"/>`;
    o += C.filter((_, i) => i % 2 === 0).map(([x, y, r]) => `<circle cx="${f(x - r * 0.22)}" cy="${f(y - r * 0.25)}" r="${f(r * 0.55)}" fill="#6CC05C"/>`).join('');
    o += C.filter((_, i) => i % 3 === 1).map(([x, y, r]) => `<path d="M${f(x - r * 0.3)},${f(y + r * 0.2)} q${f(r * 0.3)},${f(-r * 0.3)} ${f(r * 0.6)},0" stroke="#3A8636" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('');
    return o;
  }
  // the front door (in the wall), `open` 0..1 swings it inward around the far (hinge) side
  function door(open) {
    const { x0, x1, top } = DOOR, w = x1 - x0;
    let o = poly(wallQuad(x0 - 28, x1 + 28, top - 28, 0), '#FFFFFF', 6);
    o += poly(wallQuad(x0, x1, top, 0), '#2A211E', 5);
    if (open > 0.001) {   // warm hallway inside
      o += poly(wallQuad(x0, x1, top, 0), '#F3D9A4', 5) + poly(wallQuad(x0, x1, top * 0.16, 0), '#C9935A', 0);
      o += poly(wallQuad(x0 + 120, x1 - 20, top + 130, top + 250, -200), '#FFFFFF', 5) + poly(wallQuad(x0 + 130, x1 - 30, top + 140, top + 240, -200), '#E0393E', 0);
    }
    const th = open * 1.35, c = Math.cos(th), s = Math.sin(th);
    // panel point: sx from latch edge (0) to hinge (1), v from top (0) to bottom (1)
    const PP = (sx, v) => P3(x1 - w * (1 - sx) * c, top * (1 - v), -w * (1 - sx) * s);
    o += poly([PP(0, 0), PP(1, 0), PP(1, 1), PP(0, 1)], '#2E7258', 6);
    for (const [u0, u1, v0, v1] of [[0.12, 0.45, 0.07, 0.42], [0.55, 0.88, 0.07, 0.42], [0.12, 0.45, 0.56, 0.93], [0.55, 0.88, 0.56, 0.93]]) {
      o += `<polygon points="${pts([PP(u0, v0), PP(u1, v0), PP(u1, v1), PP(u0, v1)])}" fill="#276550" stroke="#1D4B3B" stroke-width="5" stroke-linejoin="round"/>`;
    }
    if (open < 0.02) o += lever() + lockFace();
    return o;
  }
  function lever() {
    const b = P3(LKW[0], LKW[1] + 58, 0), p = P3(LKW[0], LKW[1] + 58, 16), e = P3(LKW[0] + 70, LKW[1] + 58, 16);
    return poly(ring(b, XD, UP, 14, 16), '#C7CDD4', 5) + line(b, p, INK, 18) + line(b, p, '#DDE2E8', 9) + line(p, e, INK, 19) + line(p, e, '#DDE2E8', 10);
  }
  function lockFace() {
    const back = P3(LKW[0], LKW[1], 0);
    let o = poly(ring(back, XD, UP, 23), '#B8902F', 5);
    o += poly(ring(LK0, XD, UP, 23), '#D8AD4F', 5) + poly(ring(LK0, XD, UP, 15), '#E9C979', 0);
    o += line([LK0[0], LK0[1] - 10], [LK0[0], LK0[1] + 10], '#1A1209', 5.5);
    return o;
  }
  // key stuck in the lock, seen from the side: short stem out of the cylinder, bow in the plane (z, v); twisting turns v
  const rotK = (deg, dx, dy) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s_ = Math.sin(a); return [LK0[0] + dx * c - dy * s_, LK0[1] + dx * s_ + dy * c]; };
  function keyBow(deg = 0) { return rotK(deg, 0, -34); }
  function keyInLock(deg, tag, swing) {
    const st = rotK(deg, 0, -20), C = keyBow(deg), hole = rotK(deg, 0, -40);
    let o = line([LK0[0], LK0[1] - 2], st, INK, 15) + line([LK0[0], LK0[1] - 2], st, '#C9D0D8', 7);
    o += `<circle cx="${f(C[0])}" cy="${f(C[1])}" r="17" fill="#D3D9E0" stroke="${INK}" stroke-width="5"/>`;
    o += `<circle cx="${f(hole[0])}" cy="${f(hole[1])}" r="4.5" fill="#F0E4C6" stroke="${INK}" stroke-width="3"/>`;
    if (tag) o += tagAt(hole[0], hole[1], swing);
    return o;
  }
  function tagAt(hx, hy, swing) {
    const a = 8 + swing;
    return `<g transform="rotate(${f(a)} ${f(hx)} ${f(hy)})"><circle cx="${f(hx)}" cy="${f(hy + 9)}" r="9" fill="none" stroke="#9AA3AD" stroke-width="4"/>` +
      `<rect x="${f(hx - 14)}" y="${f(hy + 16)}" width="28" height="38" rx="6" fill="#E0393E" stroke="${INK}" stroke-width="4.5"/><circle cx="${f(hx)}" cy="${f(hy + 25)}" r="3.5" fill="#F0E4C6" stroke="${INK}" stroke-width="2"/>` +
      `<path d="M${f(hx - 6)},${f(hy + 34)} L${f(hx + 6)},${f(hy + 46)} M${f(hx + 6)},${f(hy + 34)} L${f(hx - 6)},${f(hy + 46)}" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/></g>`;
  }
  // whole key seen from the side: bow at (x,y), blade along `deg` (0 = pointing right, at the door)
  function keyFull(x, y, deg, tag, swing) {
    let o = `<g transform="rotate(${f(deg)} ${f(x)} ${f(y)})">`;
    o += `<path d="M${f(x + 14)},${f(y - 7)} L${f(x + 78)},${f(y - 7)} L${f(x + 86)},${f(y)} L${f(x + 78)},${f(y + 5)} L${f(x + 72)},${f(y + 12)} L${f(x + 64)},${f(y + 5)} L${f(x + 56)},${f(y + 14)} L${f(x + 48)},${f(y + 5)} L${f(x + 40)},${f(y + 11)} L${f(x + 32)},${f(y + 5)} L${f(x + 14)},${f(y + 7)} Z" fill="#D3D9E0" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>`;
    o += `<circle cx="${f(x)}" cy="${f(y)}" r="18" fill="#D3D9E0" stroke="${INK}" stroke-width="5"/><circle cx="${f(x - 7)}" cy="${f(y)}" r="4.5" fill="#F0E4C6" stroke="${INK}" stroke-width="3.5"/>`;
    o += `</g>`;
    if (tag) { const r = (deg * Math.PI) / 180; o += tagAt(x - Math.cos(r) * 11, y - Math.sin(r) * 11 + 3, swing); }
    return o;
  }
  // effects
  function twistLines(a) {   // motion arcs beside the key while he twists
    if (a <= 0.02) return '';
    const [x, y] = LK0;
    return `<g opacity="${f(clamp01(a))}" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"><path d="M${f(x + 28)},${f(y - 50)} A46,46 0 0 1 ${f(x + 46)},${f(y - 18)}"/><path d="M${f(x + 38)},${f(y - 62)} A60,60 0 0 1 ${f(x + 60)},${f(y - 22)}"/></g>`;
  }
  function impact(x, y, a, r0) {
    if (a <= 0.02) return '';
    let o = `<g stroke="${INK}" stroke-width="5" stroke-linecap="round" opacity="${f(clamp01(a * 1.5))}">`;
    for (let i = 0; i < 6; i++) { const ang = -Math.PI / 2 + (i - 2.5) * 0.42, r1 = r0 + 10 * (1 - a), r2 = r0 + 18 + 26 * (1 - a); o += `<line x1="${f(x + Math.cos(ang) * r1)}" y1="${f(y + Math.sin(ang) * r1)}" x2="${f(x + Math.cos(ang) * r2)}" y2="${f(y + Math.sin(ang) * r2)}"/>`; }
    return o + '</g>';
  }
  function sweat(x, y, a) {
    if (a <= 0.02) return '';
    return `<path d="M${f(x)},${f(y - 16)} Q${f(x + 11)},${f(y)} ${f(x)},${f(y + 6)} Q${f(x - 11)},${f(y)} ${f(x)},${f(y - 16)} Z" fill="#8FD3FF" stroke="${INK}" stroke-width="3.5" opacity="${f(a)}"/>`;
  }

  // ---------- poses (he faces right, toward the door, seen side-on)
  const BASE = { s: S_CHAR, dir: 1, face: 0.85, expr: 'neutral', look: [1, 0] };
  const P = (o) => Object.assign({}, BASE, o);
  const blinkAt = (t, list) => list.some((b) => t >= b && t < b + 0.09);
  const breathe = (t) => Math.sin(t * 3.4) * 2.2;
  function withGrip(pose, side, target, u) {
    if (u <= 0) return pose;
    const k = side === 'R' ? 'armR' : 'armL';
    const base = Object.assign({}, G.defaults[k], pose[k]);
    const r = G.reach(pose, side, target);
    pose[k] = { x: lerp(base.x, r.x, u), y: lerp(base.y, r.y, u), bend: lerp(base.bend, side === 'R' ? 0.3 : 0.38, u) };
    if (u > 0.5) pose[side === 'R' ? 'handR' : 'handL'] = 'grip';
    return pose;
  }
  const footAt = (pose, wp) => ({ x: (wp[0] - pose.x) / pose.s, y: 150 + (wp[1] - pose.y) / pose.s });
  // three sneaky tiptoe steps: step – pause rhythm, big knee lift on the stepping leg only, body rises on each step
  const STEP_T0 = 0.3, STEP_DUR = 0.19, STEP_PAUSE = 0.03;
  function stepTimes() { return [0, 1, 2].map((k) => STEP_T0 + k * (STEP_DUR + STEP_PAUSE) + STEP_DUR); }   // foot plants (for SFX)
  const STEP_END = STEP_T0 + 3 * (STEP_DUR + STEP_PAUSE) - STEP_PAUSE;
  // three big sneaky steps along the walk line; feet are tracked in world space so the planted foot never slides
  function sneakSteps(t) {
    let k = Math.floor((t - STEP_T0) / (STEP_DUR + STEP_PAUSE)); k = Math.max(0, Math.min(2, k));
    const ts = STEP_T0 + k * (STEP_DUR + STEP_PAUSE), u = win(t, ts, ts + STEP_DUR), e = io(u);
    const body = walkAt((k + e) / 3), lift = Math.sin(Math.PI * u);
    const movW = walkAt((k - 0.5 + 2 * e) / 3), plW = walkAt((k + 0.5) / 3);
    const sw = k % 2 === 0 ? 1 : -1;
    const pose = P({
      x: body[0], y: body[1], crouch: 0.22 - 0.1 * lift, bob: 0, lean: 0.12 + 0.03 * lift, headDX: 6, headTilt: 0.02 * sw * lift, expr: 'suspicious',
      armR: { x: 34 + 16 * sw * (2 * e - 1), y: 92, bend: -0.25 }, handR: 'fist',
      armL: { x: -14 - 18 * sw * (2 * e - 1), y: 104, bend: 0.25 }, handL: 'open',
      face: 0.85, look: [1, 0.1],
    });
    const moving = Object.assign(footAt(pose, movW), { bend: -0.15 - 0.5 * lift, rot: -0.3 * lift }); moving.y -= 48 * lift;
    const planted = Object.assign(footAt(pose, plW), { bend: -0.12 });
    Object.assign(pose, k % 2 === 0 ? { legR: moving, legL: planted } : { legL: moving, legR: planted });
    // in the pauses his eyes dart: pause 1 → glance back at the camera, pause 2 → up at the door
    return { pose };
  }
  // the key-twist rhythm: each attempt winds up to the clack, then snaps back (the pins block it)
  function twistAt(t, clacks) {
    let v = 0;
    for (const c of clacks) {
      if (t > c - 0.14 && t <= c) v = Math.max(v, i2(win(t, c - 0.14, c)));
      else if (t > c && t < c + 0.1) v = Math.max(v, 1 - sp(win(t, c, c + 0.1), 0.6) * 1.0);
    }
    return v;
  }
  function hookPeek(t, rise, look) {   // crouched behind the bush; rise 0 = hidden, 1 = eyes over the top
    const g = HIDE;
    return P({
      x: g[0], y: g[1] + lerp(220, 80, rise), groundY: g[1], crouch: 1, expr: 'suspicious', face: look * 0.85, look: [look, 0.15], headDX: 6,
      armL: { x: 14, y: 30, bend: 0.8 }, armR: { x: 40, y: 20, bend: -0.8 }, handR: 'fist',
      legL: { x: -34, y: 150, bend: 0.4 }, legR: { x: 30, y: 150, bend: -0.4 }, headTilt: -0.04 * look,
    });
  }
  const CAM_WIDE = { cx: -330, cy: -250, z: 1.22 }, CAM_MED = { cx: -40, cy: -262, z: 1.75 };
  const camMix = (a, b, u) => ({ cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), z: a.z * Math.pow(b.z / a.z, u) });
  const standPose = (o) => P(Object.assign({ x: STAND[0], y: STAND[1], legL: { x: -30, y: 150, bend: 0.1 }, legR: { x: 30, y: 150, bend: -0.12 } }, o));

  function shot(name, t, info) {
    const S = info.S, A = info.A;
    const R = { cam: CAM_MED, pose: null, keyLock: null, keyHand: null, fx: '', bushWob: 0, open: 0 };
    if (name === 'loop') {
      const t0 = S.loop, T = info.DUR;
      R.cam = camMix({ cx: -330, cy: -245, z: 1.15 }, CAM_WIDE, io(win(t, t0, T)));
      R.bushWob = bump(t, t0 + 0.05, t0 + 0.45) * 0.8;
      R.pose = hookPeek(t, o3(win(t, t0 + 0.38, T - 0.18)), 1);
      R.pose.blink = blinkAt(t, [t0 + 0.2]);
      R.keyHand = { side: 'R', deg: -20, tag: true };
      return R;
    }
    if (name === 'hookIn') {
      // peek over the bush → rise out → a few steps to the door → stop, glance sideways (anyone watching?) → key to the lock
      const tick = S.hookJam;
      const look = t < 0.1 ? 1 : t < 0.13 ? lerp(1, -1, o3(win(t, 0.1, 0.13))) : t < 0.19 ? -1 : 1;
      R.cam = camMix(CAM_WIDE, CAM_MED, io(win(t, 0.3, 1.2)));
      R.bushWob = bump(t, 0.2, 0.42) * 0.8;
      if (t < 0.22) { R.pose = hookPeek(t, 1, look); R.keyHand = { side: 'R', deg: -20, tag: true }; return R; }
      if (t < STEP_T0) {   // rises out from behind the bush
        const u = win(t, 0.22, STEP_T0);
        const p = hookPeek(t, 1, 1); p.y = lerp(HIDE[1] + 80, HIDE[1], o3(u)); p.crouch = lerp(1, 0.22, o3(u)); p.expr = 'suspicious';
        R.pose = p; R.keyHand = { side: 'R', deg: -20, tag: true }; return R;
      }
      if (t < STEP_END) { R.pose = sneakSteps(t).pose; R.keyHand = { side: 'R', deg: 10, tag: true }; return R; }
      // stop at the door: feet settle, glance back over his shoulder, then a look to the camera, then at the lock
      const a = win(t, STEP_END, STEP_END + 0.12);
      const last = sneakSteps(STEP_END - 0.001).pose;
      const gl = win(t, STEP_END + 0.04, STEP_END + 0.12), gr = win(t, STEP_END + 0.16, STEP_END + 0.22), gd = win(t, STEP_END + 0.26, STEP_END + 0.32);
      const face = gd > 0 ? lerp(0.05, 0.85, o3(gd)) : gr > 0 ? lerp(-0.6, 0.05, o3(gr)) : lerp(0.85, -0.6, o3(gl));
      const stand = standPose({ crouch: lerp(0.22, 0.06, o3(a)), lean: lerp(0.12, 0.04, a), expr: 'suspicious', face, look: [face < 0 ? -1 : face < 0.3 ? 0 : 1, 0],
        headTilt: face < 0 ? 0.05 : 0,
        legL: { x: lerp(last.legL.x, -28, o3(a)), y: 150, bend: 0.1 }, legR: { x: lerp(last.legR.x, 30, o3(a)), y: 150, bend: -0.12 },
        armL: { x: -12, y: 104, bend: 0.25 }, handL: 'open' });
      R.pose = stand;
      const reachU = io(win(t, STEP_END + 0.3, tick));
      const hand0 = G.handPos(Object.assign({}, stand, { armR: { x: 34, y: 92 } }), 'R');
      const bow = keyBow(0);
      const tgt = [lerp(hand0[0], bow[0], reachU), lerp(hand0[1], bow[1] - 30 * (1 - win(t, tick - 0.08, tick)), reachU)];
      withGrip(stand, 'R', tgt, 1); stand.handR = 'fist';
      R.keyHand = { at: tgt, deg: lerp(10, 90, reachU), tag: true };
      return R;
    }
    if (name === 'hookJam' || name === 'lockedOut') {
      const t0 = name === 'hookJam' ? S.hookJam : S.lockedOut;
      const n = 5, c0 = name === 'hookJam' ? t0 + 0.2 : t0 + 0.08;
      const clacks = Array.from({ length: n }, (_, k) => c0 + 0.2 * k);
      const last = clacks[n - 1];
      const twistEnd = name === 'hookJam' ? last + 0.1 : last + 0.06;
      const tw = twistAt(t, clacks);
      const effort = win(t, t0, last);                      // more desperate each try
      const deg = tw * (16 + 12 * effort);
      const both = name === 'hookJam' ? io(win(t, A.wont.start - 0.02, A.wont.start + 0.12)) : io(win(t, clacks[2] - 0.05, clacks[2] + 0.1));
      const footUp = o3(win(t, clacks[3] - 0.08, clacks[3] + 0.04));
      const shake = noise(t * 40, 3) * 2 * (0.4 + effort) * (t < twistEnd + 0.05 ? 1 : 0);
      const pose = standPose({
        x: STAND[0] - 10 * footUp, crouch: 0.1 + 0.12 * tw, lean: 0.06 + 0.05 * tw - 0.26 * footUp, squash: 1 - 0.05 * tw + 0.02 * footUp,
        headTilt: -0.07 * tw + 0.05 * footUp, headDX: 4 * tw, look: [1, 0.1],
        expr: effort < 0.35 ? 'determined' : effort < 0.7 ? 'annoyed' : 'effort', bob: shake,
        legL: { x: -34 - 14 * footUp, y: 150, bend: 0.12 + 0.2 * footUp },
        armL: { x: -12, y: 96, bend: 0.4 }, handL: 'open',
      });
      // planted foot against the door
      const fd = footAt(pose, P3(LKW[0] - 6, -120, 0));
      pose.legR = { x: lerp(30, fd.x, footUp), y: lerp(150, fd.y, footUp), bend: lerp(-0.12, -0.6, footUp), rot: -1.2 * footUp };
      const bow = keyBow(deg);
      withGrip(pose, 'R', bow, 1); pose.handRotR = (deg * Math.PI) / 180 * 0.8;
      withGrip(pose, 'L', [bow[0] - 20, bow[1] + 10], both);
      R.keyLock = { deg, tag: true, swing: -deg * 1.2 + 8 * Math.sin(t * 19) * effort };
      R.fx += twistLines(tw * 0.9);
      for (const c of clacks) R.fx += impact(LK0[0] + 4, LK0[1], 1 - win(t, c, c + 0.12), 28);
      if (name === 'hookJam') R.fx += impact(LK0[0], LK0[1], 1 - win(t, t0, t0 + 0.12), 26);   // key goes in
      R.cam = { cx: lerp(-40, -25, win(t, t0, twistEnd)), cy: -262, z: lerp(1.75, 1.9, io(win(t, t0, twistEnd + 0.4))) };
      R.cam.cx += noise(t * 30, 7) * 3 * tw; R.cam.cy += noise(t * 30, 8) * 3 * tw;
      R.pose = pose;
      if (name === 'hookJam') {   // freeze (0.1 s) in the yank pose → slow head turn to camera → deadpan hold
        const fz = twistEnd + 0.1;
        if (t > twistEnd) {
          pose.bob = 0; pose.expr = 'effort';
          const turn = io(win(t, fz, fz + 0.26));
          pose.face = lerp(0.85, 0, turn); pose.look = [lerp(1, 0, turn), lerp(0.1, 0, turn)]; pose.headTilt = lerp(pose.headTilt, 0, turn);
          if (turn > 0.35) pose.expr = 'deadpan';
          pose.blink = blinkAt(t, [fz + 0.36]);
        }
        return R;
      }
      // lockedOut: big yank → key pops at popT → he flies back into the yard → lands on his backside at A.out → deadpan
      const popT = A.out.start - 0.1;
      if (t >= twistEnd && t < popT) {
        const yank = io(win(t, twistEnd, popT));
        pose.lean = -0.26 - 0.2 * yank; pose.expr = 'effort'; pose.bob = noise(t * 50, 4) * 3;
        pose.x = STAND[0] - 10 - 14 * yank;
        const b0 = keyBow(0); withGrip(pose, 'R', b0, 1); withGrip(pose, 'L', [b0[0] - 20, b0[1] + 10], 1);
        R.keyLock = { deg: 0, tag: true, swing: 10 * Math.sin(t * 30) };
        R.fx = '';
      }
      if (t >= popT) {
        const fl = win(t, popT, A.out.start), land = win(t, A.out.start, A.out.start + 0.25);
        const g = gpos([lerp(W_STAND[0] - 10, W_STAND[0] - 190, o3(fl)), W_STAND[1] + 20 * o3(fl)]);
        const air = Math.sin(fl * Math.PI) * 80;
        const p2 = P({
          x: g[0], y: g[1] - air, sit: o3(fl), squash: 1 - 0.18 * bump(t, A.out.start, A.out.start + 0.16), lean: lerp(-0.5, -0.05, sp(land)), crouch: 0,
          expr: 'surprised', face: lerp(0.85, 0.3, fl), look: [0.6, -0.4],
          legL: { x: lerp(-30, 70, o3(fl)), y: lerp(150, 90, fl), bend: 0.3, rot: -0.9 * fl },
          legR: { x: lerp(60, 110, o3(fl)), y: lerp(100, 40, fl), bend: -0.3, rot: -1.1 * fl },
          armL: { x: lerp(60, -70, o3(fl)), y: lerp(-10, 40, o3(fl)), bend: 0.4 }, handL: 'open',
          armR: { x: lerp(80, 70, o3(fl)), y: lerp(-20, -60, o3(fl)), bend: -0.4 }, handR: 'fist',
        });
        if (land > 0) {
          const st = win(t, A.out.start + 0.14, A.out.start + 0.4);
          const turn = io(win(t, A.out.start + 0.18, A.out.start + 0.38));
          p2.armR = { x: lerp(70, 58, st), y: lerp(-60, 50, io(st)), bend: -0.5 };
          p2.armL = { x: lerp(-70, -50, st), y: lerp(40, 80, st), bend: 0.5 };
          p2.legL = { x: lerp(70, 92, sp(land)), y: lerp(90, 150, o3(land)), bend: 0.35, rot: lerp(-0.9, -0.35, land) };
          p2.legR = { x: lerp(110, 132, sp(land)), y: lerp(40, 146, o3(land)), bend: 0.2, rot: lerp(-1.1, -0.45, land) };
          p2.face = lerp(0.3, 0, turn); p2.look = [lerp(0.6, 0, turn), lerp(-0.4, 0, turn)];
          p2.expr = turn > 0.4 ? 'deadpan' : 'surprised';
          p2.blink = blinkAt(t, [A.out.start + 0.3]);
        }
        R.pose = p2;
        const hp = G.handPos(p2, 'R');
        R.keyLock = null;
        R.keyHand = { at: [hp[0] + 4, hp[1] - 6], deg: lerp(0, -120, o3(fl)) + (land > 0 ? -10 * win(t, A.out.start, A.out.start + 0.3) : 0), tag: true, swing: 20 * Math.sin(t * 22) * Math.exp(-(t - popT) * 3) };
        R.fx = impact(LK0[0] + 4, LK0[1], 1 - win(t, popT, popT + 0.14), 30) + impact(g[0], g[1] - 70, 1 - win(t, A.out.start, A.out.start + 0.16), 60);
        R.cam = camMix({ cx: -25, cy: -262, z: 1.9 }, { cx: -150, cy: -200, z: 1.55 }, o3(win(t, popT, A.out.start + 0.05)));
        const sh = (1 - win(t, A.out.start, A.out.start + 0.25)) * (t >= A.out.start ? 1 : 0);
        R.cam.cx += noise(t * 60, 9) * 14 * sh; R.cam.cy += noise(t * 60, 10) * 14 * sh;
      }
      return R;
    }
    if (name === 'dive') {
      // he drops the yank pose, points at the keyhole looking at camera ("the reason…"), then we dive into the keyhole
      const t0 = S.dive, tZ = t0 + 0.42, T1 = S.reveal;
      const drop = sp(win(t, t0, t0 + 0.14));
      const pt = io(win(t, t0 + 0.1, t0 + 0.26));
      const pose = standPose({
        x: STAND[0] - 10 + 10 * drop, crouch: 0.1, lean: lerp(-0.2, 0.02, drop), expr: t < t0 + 0.12 ? 'deadpan' : 'annoyed', face: 0.1, look: [0.2, 0],
        legL: { x: lerp(-48, -30, drop), y: 150, bend: 0.12 }, armL: { x: -24, y: 90, bend: 0.5 }, handL: 'open', bob: breathe(t),
      });
      const fd = footAt(pose, P3(LKW[0] - 6, -120, 0));
      pose.legR = { x: lerp(fd.x, 30, drop), y: lerp(fd.y, 150, drop), bend: lerp(-0.6, -0.12, drop), rot: -1.2 * (1 - drop) };
      const pR = G.reach(pose, 'R', [LK0[0] - 44, LK0[1] + 24]);
      const g0 = G.reach(pose, 'R', keyBow(0));
      pose.armR = { x: lerp(g0.x, pR.x, pt), y: lerp(g0.y, pR.y, pt), bend: lerp(0.3, 0.1, pt) };
      pose.handR = pt > 0.4 ? 'point' : 'grip'; pose.handRotR = lerp(0, -0.3, pt);
      pose.blink = blinkAt(t, [t0 + 0.3]);
      R.pose = pose;
      R.keyLock = { deg: 0, tag: true, swing: lerp(4 * Math.sin(t * 9), 40, io(win(t, t0 + 0.25, tZ + 0.2))) };
      // camera: slow push → exponential dive into the keyway beside the key stem
      const push = io(win(t, t0, tZ));
      const c1 = { cx: lerp(-25, 0, push), cy: lerp(-262, -285, push), z: lerp(1.9, 2.3, push) };
      const zu = win(t, tZ, T1), ze = zu * zu * (1.2 - 0.2 * zu), cu = o3(Math.min(1, zu * 1.6));
      R.cam = { cx: lerp(c1.cx, LK0[0], cu), cy: lerp(c1.cy, LK0[1] + 6, cu), z: c1.z * Math.pow(95 / c1.z, ze) };
      R.dark = win(t, T1 - 0.16, T1 - 0.02);
      return R;
    }
    if (name === 'doorOpen') {
      const t0 = S.doorOpen, T1 = S.wrongIn;
      R.open = Math.min(1, sp(win(t, t0 + 0.04, t0 + 0.5), 0.55));
      R.keyLock = R.open < 0.02 ? { deg: 90, tag: false, swing: 0 } : null;
      const look = io(win(t, t0 + 0.08, t0 + 0.24));          // eyes go to the camera: told you
      const pump = sp(win(t, t0 + 0.2, t0 + 0.42), 0.8);       // one small fist pump at the hip
      const pose = standPose({
        crouch: 0.06 + 0.1 * bump(t, t0 + 0.2, t0 + 0.36), lean: 0.04 - 0.05 * look, headTilt: 0.06 * look,
        expr: t < t0 + 0.1 ? 'surprised' : 'confident', face: lerp(0.85, 0.3, look), look: [lerp(1, 0.2, look), 0],
        armL: { x: -12, y: 104, bend: 0.25 }, handL: 'open',
        armR: { x: lerp(34, 40, look), y: lerp(92, 20, look) + 40 * pump, bend: lerp(-0.25, -0.9, look) }, handR: 'fist', handRotR: -0.6 * look,
        bob: breathe(t),
      });
      pose.blink = blinkAt(t, [t0 + 0.5]);
      R.pose = pose;
      R.cam = { cx: lerp(10, 30, io(win(t, t0, T1))), cy: -300, z: lerp(1.42, 1.5, io(win(t, t0, T1))) };
      return R;
    }
    return R;
  }

  // ---------- frame
  function render(name, t, info) {
    const R = shot(name, t, info);
    const cam = R.cam;
    let w = wall();
    w += windowAt(-560, -330, -600, -360) + windowAt(440, 660, -600, -360);
    w += plaque(330, -640) + lamp(330, -500);
    w += ground();
    w += door(R.open);
    w += bush(P3(DOOR.x1 + 330, 0, 30), 230, 170, 0, 7);
    if (R.keyLock) w += keyInLock(R.keyLock.deg, R.keyLock.tag, R.keyLock.swing || 0);
    if (R.pose) {
      const gy = R.pose.groundY;
      w += gy != null ? `<g clip-path="url(#d2-above)">${G.draw(R.pose)}</g>` : G.draw(R.pose);
      if (gy != null) w = `<defs><clipPath id="d2-above"><rect x="-4000" y="-4000" width="8000" height="${f(4000 + gy + 6)}"/></clipPath></defs>` + w;
    }
    if (R.keyHand && R.pose) {
      let at = R.keyHand.at;
      if (!at) { const hp = G.handPos(R.pose, R.keyHand.side || 'R'); at = [hp[0] + 2, hp[1] + 2]; }
      let k = keyFull(at[0], at[1], R.keyHand.deg, R.keyHand.tag, R.keyHand.swing || 0);
      if (R.keyHand.clipX != null) k = `<defs><clipPath id="d2-keyclip"><rect x="-4000" y="-4000" width="${f(4000 + R.keyHand.clipX)}" height="8000"/></clipPath></defs><g clip-path="url(#d2-keyclip)">${k}</g>`;
      w += k + `<ellipse cx="${f(at[0] - 2)}" cy="${f(at[1])}" rx="14" ry="12" fill="#FFFFFF" stroke="${INK}" stroke-width="6"/>`;
    }
    w += bush(gpos(W_BUSH), 400, 330, R.bushWob, 1);
    w += R.fx;
    const tf = `translate(540 960) scale(${cam.z.toFixed(4)}) translate(${f(-cam.cx)} ${f(-cam.cy)})`;
    let o = `<rect x="0" y="0" width="1080" height="1920" fill="#F0E4C6"/><g transform="${tf}">${w}</g>`;
    if (R.dark > 0) o += `<rect x="0" y="0" width="1080" height="1920" fill="#0B0906" opacity="${f(R.dark)}"/>`;
    return o;
  }
  return { render, shot, stepTimes, LK };
})();
if (typeof window !== 'undefined') window.Door2D = Door2D;
if (typeof module !== 'undefined') module.exports = Door2D;
