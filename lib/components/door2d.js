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
  const W_STAND = [-62, 175], W_HIDE = [-1000, 205], W_BUSH = [-1040, 410];   // (xw, z) on the ground
  const gpos = (w) => P3(w[0], 0, w[1]);
  const STAND = gpos(W_STAND), HIDE = gpos(W_HIDE);
  const walkAt = (s) => [lerp(HIDE[0], STAND[0], s), lerp(HIDE[1], STAND[1], s)];   // s = 0 (bush) … 1 (door), linear on screen

  // ---------- palette: night (owner 2026-11-28) — muted, cool, lit by the porch lamp; set window.DOOR2D_DAY = true for day
  const DAY = typeof window !== 'undefined' && window.DOOR2D_DAY;
  const C = DAY ? { wall: '#F0E4C6', siding: '#D9C9A2', trim: '#FFFFFF', roof: '#5A4B47', base: '#C9C2B4', glass: '#BFE2F4', lawn: '#86C25E', tuft: '#5E9E43',
    deck: '#C99460', plank: '#A9733F', deckFace: '#94612F', door: '#2E7258', panel: '#276550', panelLine: '#1D4B3B', hole: '#F0E4C6', bg: '#F0E4C6', leaf: '#4FA548', leafHi: '#6CC05C', leafLine: '#3A8636' }
    : { wall: '#323A52', siding: '#283046', trim: '#A3ABBA', roof: '#1A1D27', base: '#2C303C', glass: '#F2C46A', lawn: '#2C4632', tuft: '#203527',
    deck: '#5C4636', plank: '#4A382B', deckFace: '#3B2C22', door: '#1E4539', panel: '#1A3C32', panelLine: '#132E26', hole: '#2A2F3A', bg: '#1B2030', leaf: '#3D6E44', leafHi: '#4E8655', leafLine: '#2A4F30' };
  const PAL = C;   // (bush() has its own local C)
  // ---------- scenery
  function wall() {
    let o = poly(wallQuad(-3000, 3000, -1400, 0), C.wall, 0);
    for (let y = -1380; y < 0; y += 38) o += line(P3(-3000, y, 0), P3(3000, y, 0), C.siding, 3.5);
    o += poly(wallQuad(-3000, 3000, -1300, -1254), C.trim, 6) + poly(wallQuad(-3000, 3000, -1600, -1300), C.roof, 0);
    o += poly(wallQuad(-3000, 3000, -34, 0), C.base, 0) + line(P3(-3000, -34, 0), P3(3000, -34, 0), INK, 5);
    return o;
  }
  function windowAt(x0, x1, y0, y1) {
    let o = poly(wallQuad(x0 - 22, x1 + 22, y0 - 22, y1 + 22), C.trim, 6);
    o += poly(wallQuad(x0, x1, y0, y1), C.glass, 5);
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
    return line(b, q, INK, 14) + line(b, q, '#2A2C31', 7) + (DAY ? `<circle cx="${f(q[0])}" cy="${f(q[1] + 20)}" r="66" fill="#FFE9A6" opacity="0.35"/>` : `<circle cx="${f(q[0])}" cy="${f(q[1] + 20)}" r="90" fill="#FFD27A" opacity="0.10"/><circle cx="${f(q[0])}" cy="${f(q[1] + 20)}" r="52" fill="#FFD27A" opacity="0.16"/>`) +
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
    let o = poly([P3(-3000, 0, 0), P3(3000, 0, 0), [6000, 6000], [-6000, 6000]], C.lawn, 0);
    for (let i = 0; i < 60; i++) {
      const xw = -2400 + hash(i) * 4800, z = 300 + hash(i + 9) * 1600, q = P3(xw, 0, z);
      o += `<path d="M${f(q[0] - 12)},${f(q[1])} L${f(q[0] - 4)},${f(q[1] - 20)} L${f(q[0] + 2)},${f(q[1] - 4)} L${f(q[0] + 10)},${f(q[1] - 22)} L${f(q[0] + 14)},${f(q[1])}" fill="none" stroke="${C.tuft}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`;
    }
    // wooden porch deck in front of the door (he stands on it)
    const x0 = -520, x1 = 520, z1 = 280;
    o += poly(groundQuad(x0, x1, 0, z1), C.deck, 5);
    for (let z = 40; z < z1; z += 40) o += line(P3(x0, 0, z), P3(x1, 0, z), C.plank, 3.5);
    o += poly([P3(x0, 0, z1), P3(x1, 0, z1), P3(x1, 26, z1), P3(x0, 26, z1)], C.deckFace, 5);
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
    o += C.map(([x, y, r]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${PAL.leaf}"/>`).join('');
    o += `<rect x="${f(cx - w / 2 + 14)}" y="${f(by - h * 0.45)}" width="${f(w - 28)}" height="${f(h * 0.45 - 6)}" fill="${PAL.leaf}"/>`;
    o += C.filter((_, i) => i % 2 === 0).map(([x, y, r]) => `<circle cx="${f(x - r * 0.22)}" cy="${f(y - r * 0.25)}" r="${f(r * 0.55)}" fill="${PAL.leafHi}"/>`).join('');
    o += C.filter((_, i) => i % 3 === 1).map(([x, y, r]) => `<path d="M${f(x - r * 0.3)},${f(y + r * 0.2)} q${f(r * 0.3)},${f(-r * 0.3)} ${f(r * 0.6)},0" stroke="${PAL.leafLine}" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('');
    return o;
  }
  // the front door (in the wall), `open` 0..1 swings it inward around the far (hinge) side
  function door(open) {
    const { x0, x1, top } = DOOR, w = x1 - x0;
    let o = poly(wallQuad(x0 - 28, x1 + 28, top - 28, 0), C.trim, 6);
    o += poly(wallQuad(x0, x1, top, 0), '#2A211E', 5);
    if (open > 0.001) {   // warm hallway inside
      o += poly(wallQuad(x0, x1, top, 0), '#F3D9A4', 5) + poly(wallQuad(x0, x1, top * 0.16, 0), '#C9935A', 0);
      o += poly(wallQuad(x0 + 120, x1 - 20, top + 130, top + 250, -200), '#FFFFFF', 5) + poly(wallQuad(x0 + 130, x1 - 30, top + 140, top + 240, -200), '#E0393E', 0);
    }
    const th = open * 1.35, c = Math.cos(th), s = Math.sin(th);
    // panel point: sx from latch edge (0) to hinge (1), v from top (0) to bottom (1)
    const PP = (sx, v) => P3(x1 - w * (1 - sx) * c, top * (1 - v), -w * (1 - sx) * s);
    o += poly([PP(0, 0), PP(1, 0), PP(1, 1), PP(0, 1)], C.door, 6);
    for (const [u0, u1, v0, v1] of [[0.12, 0.45, 0.07, 0.42], [0.55, 0.88, 0.07, 0.42], [0.12, 0.45, 0.56, 0.93], [0.55, 0.88, 0.56, 0.93]]) {
      o += `<polygon points="${pts([PP(u0, v0), PP(u1, v0), PP(u1, v1), PP(u0, v1)])}" fill="${C.panel}" stroke="${C.panelLine}" stroke-width="5" stroke-linejoin="round"/>`;
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
    o += `<circle cx="${f(hole[0])}" cy="${f(hole[1])}" r="4.5" fill="${C.hole}" stroke="${INK}" stroke-width="3"/>`;
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
  // the approach (owner 2026-11-28: "a few quick steps whilst looking around for someone"): short bursts of quick,
  // light steps, stopping between bursts to check left, right, and over his shoulder. Feet tracked in world space.
  const QSTEP = 0.17;
  const STEP_STARTS = [0.42, 0.59, 0.76, 1.46, 1.63, 1.8, 1.99, 2.16];   // burst of 3 → freeze (a sound!) → 3 + 2
  const N_STEPS = STEP_STARTS.length, STEP_T0 = STEP_STARTS[0], STEP_END = STEP_STARTS[N_STEPS - 1] + QSTEP;
  function stepTimes() { return STEP_STARTS.map((s) => +(s + QSTEP * 0.9).toFixed(3)); }
  // where his eyes/head go in the pauses: [time, face, lookX]
  const LOOKS = [[0.0, 0.85, 1], [0.97, 0.85, 1], [1.02, -0.6, -1], [1.3, -0.6, -1], [1.42, 0.85, 1], [9, 0.85, 1]];
  function lookAt(t) {
    for (let i = 0; i < LOOKS.length - 1; i++) { const [a, fa, la] = LOOKS[i], [b, fb, lb] = LOOKS[i + 1]; if (t >= a && t <= b) { const u = o3(win(t, a, b)); return [lerp(fa, fb, u), lerp(la, lb, u)]; } }
    return [0.85, 1];
  }
  function sneakSteps(t) {
    let k = 0; for (let i = 0; i < N_STEPS; i++) if (t >= STEP_STARTS[i]) k = i;
    const u = win(t, STEP_STARTS[k], STEP_STARTS[k] + QSTEP), e = io(u);
    const body = walkAt((k + e) / N_STEPS), lift = Math.sin(Math.PI * u);
    const movW = walkAt((k - 0.5 + 2 * e) / N_STEPS), plW = walkAt((k + 0.5) / N_STEPS);
    const sw = k % 2 === 0 ? 1 : -1, moving_ = u > 0 && u < 1;
    const [face, lx] = lookAt(t);
    const pose = P({
      x: body[0], y: body[1], crouch: 0.66 - 0.1 * lift, bob: 5 * lift, lean: 0.3 + 0.04 * lift, headDX: 14, headTilt: 0.03 * sw * lift, expr: 'suspicious',
      armR: { x: 42 + 6 * sw * (2 * e - 1), y: 28, bend: -0.8 }, handR: 'fist',
      armL: { x: 24 - 6 * sw * (2 * e - 1), y: 36, bend: 0.8 }, handL: 'open', handRotL: 1.1,
      face, look: [lx, 0.15],
    });
    if (!moving_) { pose.bob = 0; pose.crouch = 0.66; }
    // the freeze: a sound behind him → head snaps round, eyes wide, holds… then a wary look and on he goes
    if (t > 0.97 && t < 1.46) { const sn = win(t, 0.97, 1.02); pose.expr = t < 1.3 ? 'surprised' : 'worried'; pose.crouch = 0.66 + 0.12 * sn; pose.headTilt = 0.06 * sn; pose.lean = 0.3 - 0.1 * sn * (t < 1.3 ? 1 : 0); }
    const moving = Object.assign(footAt(pose, movW), { bend: -0.3 - 0.45 * lift, rot: 0.35 - 0.2 * lift }); moving.y -= 30 * lift;   // tiptoe (toes down)
    const planted = Object.assign(footAt(pose, plW), { bend: -0.12 });
    Object.assign(pose, k % 2 === 0 ? { legR: moving, legL: planted } : { legL: moving, legR: planted });
    return { pose };
  }
  // a REAL struggle (owner: "real but not too comical"): turn blocked → other way blocked → jiggle → both hands, hard
  // turn → lets go. Each entry: [start, end, target degrees, kind]; returns the key angle and how hard he's pushing.
  function struggle(t, t0, plan) {
    let deg = 0, push = 0;
    for (const [a, b, d, kind] of plan) {
      const s = t0 + a, e = t0 + b;
      if (t < s || t > e + 0.14) continue;
      if (kind === 'jiggle') { const u = win(t, s, e); deg += Math.sin(u * Math.PI * 6) * d * (1 - u * 0.3); push = Math.max(push, 0.5); continue; }
      if (t <= e) { const u = win(t, s, e); deg += d * (kind === 'hard' ? o3(u) : io(u)); push = Math.max(push, kind === 'hard' ? 1 : 0.6); }
      else deg += d * (1 - sp(win(t, e, e + 0.14), 0.7));   // springs back: the pins block it
    }
    return { deg, push };
  }
  const HOOK_PLAN_F = [[0.07, 0.2, 13, 'turn'], [0.25, 0.35, -11, 'turn'], [0.39, 0.55, 5, 'jiggle'], [0.6, 0.86, 17, 'hard']];   // × shot length
  const scalePlan = (plan, d) => plan.map(([a, b, x, k]) => [a * d, b * d, x, k]);
  const OUT_PLAN = [[0.06, 0.2, 13, 'turn'], [0.26, 0.38, -11, 'turn'], [0.42, 0.62, 5, 'jiggle'], [0.66, 0.9, 17, 'hard']];
  // contact clicks for the sound effects (stops of each turn, jiggle ticks)
  function struggleClicks(t0, plan) {
    const out = [];
    for (const [a, b, d, kind] of plan) {
      if (kind === 'jiggle') for (let i = 1; i <= 3; i++) out.push(+(t0 + a + (b - a) * (i - 0.75) / 3).toFixed(3));
      else out.push(+(t0 + b).toFixed(3));
    }
    return out;
  }
  const YANK_P = 0.24;   // one yank every 0.24 s: sharp pull back, short relax
  function yankAt(t, t0) { const ph = ((t - t0) % YANK_P) / YANK_P; return ph < 0.35 ? o3(ph / 0.35) : 1 - io((ph - 0.35) / 0.65); }
  function hookPeek(t, rise, look) {   // crouched behind the bush; rise 0 = hidden, 1 = eyes over the top
    const g = HIDE;
    return P({
      x: g[0], y: g[1] + lerp(220, 80, rise), groundY: g[1], crouch: 1, expr: 'suspicious', face: look * 0.85, look: [look, 0.15], headDX: 6,
      armL: { x: 14, y: 30, bend: 0.8 }, armR: { x: 40, y: 20, bend: -0.8 }, handR: 'fist',
      legL: { x: -34, y: 150, bend: 0.4 }, legR: { x: 30, y: 150, bend: -0.4 }, headTilt: -0.04 * look,
    });
  }
  // cameras: close and low (owner); follow him on the walk, settle on him + the lock at the door
  const CAM_BUSH = { cx: HIDE[0] + 120, cy: -250, z: 1.9 }, CAM_DOOR = { cx: -50, cy: -265, z: 2.15 };
  const camMix = (a, b, u) => ({ cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), z: a.z * Math.pow(b.z / a.z, u) });
  const camFollow = (x) => ({ cx: Math.min(CAM_DOOR.cx, x + 110), cy: -255, z: 2.0 });
  const standPose = (o) => P(Object.assign({ x: STAND[0], y: STAND[1], legL: { x: -30, y: 150, bend: 0.1 }, legR: { x: 30, y: 150, bend: -0.12 } }, o));
  // shared "at the lock, trying" pose
  function tryPose(t, deg, push, both, o) {
    const pose = standPose(Object.assign({
      crouch: 0.08 + 0.08 * push, lean: 0.05 + 0.09 * push, headDX: 4 * push, headTilt: -0.04 * push, look: [1, 0.15],
      expr: push > 0.9 ? 'effort' : push > 0.5 ? 'determined' : 'determined', bob: noise(t * 34, 3) * 2.2 * (push > 0.9 ? 1 : 0),
      armL: { x: -12, y: 104, bend: 0.25 }, handL: 'open',
      legL: { x: -38 - 8 * push, y: 150, bend: 0.12 }, legR: { x: 30, y: 150, bend: -0.12 },
    }, o || {}));
    const bow = keyBow(deg);
    withGrip(pose, 'R', bow, 1); pose.handRotR = (deg * Math.PI) / 180 * 0.8;
    // second hand braces flat on the door above the lock while he forces the turn (real, not slapstick)
    withGrip(pose, 'L', [LK0[0] + 58, LK0[1] - 16], both); if (both > 0.5) pose.handL = 'open';
    return pose;
  }

  function shot(name, t, info) {
    const S = info.S, A = info.A;
    const R = { cam: CAM_DOOR, pose: null, keyLock: null, keyHand: null, fx: '', bushWob: 0, open: 0 };
    if (name === 'loop') {   // back behind the bush, slowly rises to peek again (loops into the start)
      const t0 = S.loop, T = info.DUR;
      R.cam = camMix({ cx: CAM_BUSH.cx, cy: -240, z: 1.75 }, CAM_BUSH, io(win(t, t0, T)));
      R.bushWob = bump(t, t0 + 0.05, t0 + 0.45) * 0.6;
      R.pose = hookPeek(t, o3(win(t, t0 + 0.38, T - 0.18)), 1);
      R.pose.blink = blinkAt(t, [t0 + 0.2]);
      R.keyHand = { side: 'R', deg: -20, tag: true };
      return R;
    }
    if (name === 'hookIn') {
      // peek → rise out of the bush → six careful steps (glance back halfway) → stop, look around → key to the lock
      const tick = S.hookJam;
      const look = t < 0.12 ? 1 : t < 0.15 ? lerp(1, -1, o3(win(t, 0.12, 0.15))) : t < 0.24 ? -1 : 1;
      R.bushWob = bump(t, 0.24, 0.5) * 0.6;
      if (t < 0.26) { R.pose = hookPeek(t, 1, look); R.keyHand = { side: 'R', deg: -20, tag: true }; R.cam = CAM_BUSH; return R; }
      if (t < STEP_T0) {
        const u = win(t, 0.26, STEP_T0);
        const p = hookPeek(t, 1, 1); p.y = lerp(HIDE[1] + 80, HIDE[1], o3(u)); p.crouch = lerp(1, 0.2, o3(u)); p.expr = 'suspicious';
        R.pose = p; R.keyHand = { side: 'R', deg: -20, tag: true }; R.cam = CAM_BUSH; return R;
      }
      if (t < STEP_END) {
        R.pose = sneakSteps(t).pose; R.keyHand = { side: 'R', deg: 10, tag: true };
        R.cam = camMix(CAM_BUSH, camFollow(R.pose.x), io(win(t, STEP_T0, STEP_T0 + 0.5)));
        return R;
      }
      const a = win(t, STEP_END, STEP_END + 0.12);
      const last = sneakSteps(STEP_END - 0.001).pose;
      const gl = win(t, STEP_END + 0.12, STEP_END + 0.2), gd = win(t, STEP_END + 0.42, STEP_END + 0.5);
      const face = gd > 0 ? lerp(-0.5, 0.85, o3(gd)) : lerp(0.85, -0.5, o3(gl));   // one last check behind him
      const stand = standPose({ crouch: lerp(0.66, 0.2, o3(a)), lean: lerp(0.3, 0.08, a), expr: 'suspicious', face, look: [face < 0.3 ? -1 : 1, 0],
        legL: { x: lerp(last.legL.x, -28, o3(a)), y: 150, bend: 0.1 }, legR: { x: lerp(last.legR.x, 30, o3(a)), y: 150, bend: -0.12 },
        armL: { x: -12, y: 104, bend: 0.25 }, handL: 'open' });
      R.pose = stand;
      const reachU = io(win(t, Math.min(STEP_END + 0.28, tick - 0.2), tick));
      const hand0 = G.handPos(Object.assign({}, stand, { armR: { x: 30, y: 94 } }), 'R');
      const bow = keyBow(0);
      const tgt = [lerp(hand0[0], bow[0], reachU), lerp(hand0[1], bow[1] - 30 * (1 - win(t, tick - 0.08, tick)), reachU)];
      withGrip(stand, 'R', tgt, 1); stand.handR = 'fist';
      R.keyHand = { at: tgt, deg: lerp(10, 90, reachU), tag: true };
      R.cam = camMix(camFollow(STAND[0]), CAM_DOOR, io(win(t, STEP_END - 0.3, tick)));
      return R;
    }
    if (name === 'hookJam' || name === 'dive') {
      // key goes in → one turn: blocked → eyes go wide → grabs it with both hands and fights it with his whole body
      // (braced legs, leaning back, rhythmic yanks, shaking) → the camera pushes in and dives into the keyhole
      const t0 = S.hookJam, tW = t0 + 0.2, tP = t0 + 0.36, T1 = S.reveal, tZ = T1 - 0.78;
      const turn = struggle(t, t0, [[0.04, 0.18, 14, 'turn']]);
      let pose;
      if (t < tP) {
        pose = tryPose(t, turn.deg, turn.push, 0);
        if (t >= tW) { const w = win(t, tW, tW + 0.06); pose.expr = 'surprised'; pose.lean = 0.05 - 0.06 * w; pose.headTilt = -0.05 * w; pose.face = 0.7; }
        R.keyLock = { deg: turn.deg, tag: true, swing: -turn.deg };
      } else {
        const ramp = o3(win(t, tP, tP + 0.16)), k = yankAt(t, tP), shake = noise(t * 45, 4) * (2.5 + 2 * k);
        pose = standPose({
          x: STAND[0] - 10 * ramp - 12 * k, crouch: 0.22 * ramp + 0.06 * k, lean: lerp(0.05, -0.24, ramp) - 0.14 * k, squash: 1 + 0.03 * k,
          headTilt: 0.04 + 0.08 * k, headDX: -6 * k, face: 0.75, look: [1, 0.1], expr: 'effort', bob: shake,
          legL: { x: lerp(-30, -78, ramp), y: 150, bend: 0.06 }, legR: { x: lerp(30, 48, ramp), y: 150, bend: lerp(-0.12, -0.45, ramp) },
        });
        const bow = keyBow(4 * Math.sin(t * 40) * ramp);
        withGrip(pose, 'R', bow, 1); withGrip(pose, 'L', [bow[0] - 6, bow[1] + 20], ramp);
        R.keyLock = { deg: 4 * Math.sin(t * 40) * ramp, tag: true, swing: 10 * Math.sin(t * 23) * ramp + (t > tZ - 0.2 ? 40 * io(win(t, tZ - 0.2, tZ + 0.2)) : 0) };
      }
      R.pose = pose;
      const push = io(win(t, t0 + 0.3, tZ));
      const c1 = { cx: lerp(-50, -20, push), cy: lerp(-265, -280, push), z: lerp(2.15, 2.55, push) };
      c1.cx += noise(t * 30, 7) * 3 * (t > tP ? 1 : 0); c1.cy += noise(t * 30, 8) * 3 * (t > tP ? 1 : 0);
      const zu = win(t, tZ, T1), ze = zu * zu * (1.2 - 0.2 * zu), cu = o3(Math.min(1, zu * 1.6));
      R.cam = { cx: lerp(c1.cx, LK0[0], cu), cy: lerp(c1.cy, LK0[1] + 6, cu), z: c1.z * Math.pow(95 / c1.z, ze) };
      R.dark = win(t, T1 - 0.16, T1 - 0.02);
      return R;
    }
    if (name === 'lockedOut') {
      // same real struggle with the wrong key → pulls hard to get it out → it pops → stumbles back, sits down → deadpan
      const t0 = S.lockedOut, popT = A.out.start - 0.1;
      const { deg, push } = struggle(t, t0, OUT_PLAN);
      const both = io(win(t, t0 + 0.66, t0 + 0.74));
      const pose = tryPose(t, deg, push, both);
      R.keyLock = { deg, tag: true, swing: -deg * 1.1 };
      R.cam = { cx: -45, cy: -265, z: lerp(2.15, 2.25, io(win(t, t0, popT))) };
      if (t >= t0 + 1.0 && t < popT) {   // pull: leans back, hands on the key
        const y = io(win(t, t0 + 1.0, popT));
        pose.lean = 0.05 - 0.28 * y; pose.x = STAND[0] - 12 * y; pose.expr = 'effort'; pose.bob = noise(t * 40, 4) * 2.4;
        pose.legL = { x: -44 - 16 * y, y: 150, bend: 0.2 }; pose.legR = { x: 34, y: 150, bend: -0.2 };
        const b0 = keyBow(0); withGrip(pose, 'R', b0, 1); withGrip(pose, 'L', [b0[0] - 6, b0[1] + 22], 1); pose.handRotR = 0;
        R.keyLock = { deg: 0, tag: true, swing: 6 * Math.sin(t * 24) };
      }
      R.pose = pose;
      if (t >= popT) {   // key comes free: two stumbling steps back, sits down hard on the porch, then the stare
        const fl = win(t, popT, A.out.start + 0.04), land = win(t, A.out.start, A.out.start + 0.25);
        const g = gpos([lerp(W_STAND[0] - 12, W_STAND[0] - 150, o3(fl)), W_STAND[1] + 10 * o3(fl)]);
        const p2 = P({
          x: g[0], y: g[1] - Math.sin(fl * Math.PI) * 22, sit: o3(fl), squash: 1 - 0.1 * bump(t, A.out.start, A.out.start + 0.14), lean: lerp(-0.4, -0.05, sp(land)), crouch: 0,
          expr: 'surprised', face: lerp(0.85, 0.35, fl), look: [0.8, -0.2],
          legL: { x: lerp(-40, 80, o3(fl)), y: lerp(150, 130, fl), bend: 0.3, rot: -0.6 * fl },
          legR: { x: lerp(40, 112, o3(fl)), y: lerp(150, 120, fl), bend: -0.3, rot: -0.7 * fl },
          armL: { x: lerp(40, -64, o3(fl)), y: lerp(10, 60, o3(fl)), bend: 0.4 }, handL: 'open',
          armR: { x: lerp(70, 64, o3(fl)), y: lerp(-10, -20, o3(fl)), bend: -0.4 }, handR: 'fist',
        });
        if (land > 0) {
          const st = win(t, A.out.start + 0.12, A.out.start + 0.36), turn = io(win(t, A.out.start + 0.3, A.out.start + 0.55));
          p2.armR = { x: lerp(64, 56, st), y: lerp(-20, 56, io(st)), bend: -0.5 };
          p2.armL = { x: -56, y: lerp(60, 84, st), bend: 0.5 };
          p2.legL = { x: lerp(80, 94, sp(land)), y: 150, bend: 0.35, rot: lerp(-0.6, -0.3, land) };
          p2.legR = { x: lerp(112, 128, sp(land)), y: 146, bend: 0.2, rot: lerp(-0.7, -0.4, land) };
          p2.face = lerp(0.35, 0, turn); p2.look = [lerp(0.8, 0, turn), lerp(-0.2, 0, turn)];
          p2.expr = turn > 0.45 ? 'deadpan' : 'surprised';
          p2.blink = blinkAt(t, [A.out.start + 0.62]);
        }
        R.pose = p2; R.keyLock = null;
        const hp = G.handPos(p2, 'R');
        R.keyHand = { at: [hp[0] + 4, hp[1] - 6], deg: lerp(0, -100, o3(fl)) - 8 * land, tag: true, swing: 16 * Math.sin(t * 20) * Math.exp(-(t - popT) * 3) };
        R.cam = camMix({ cx: -45, cy: -265, z: 2.25 }, { cx: -150, cy: -215, z: 1.95 }, o3(win(t, popT, A.out.start + 0.1)));
        const sh = (1 - win(t, A.out.start, A.out.start + 0.2)) * (t >= A.out.start ? 1 : 0);
        R.cam.cx += noise(t * 60, 9) * 8 * sh; R.cam.cy += noise(t * 60, 10) * 8 * sh;
      }
      return R;
    }
    if (name === 'doorOpen') {
      const t0 = S.doorOpen, T1 = S.wrongIn;
      R.open = Math.min(1, sp(win(t, t0 + 0.04, t0 + 0.5), 0.55));
      R.keyLock = R.open < 0.02 ? { deg: 90, tag: false, swing: 0 } : null;
      const look = io(win(t, t0 + 0.08, t0 + 0.24));
      const pump = sp(win(t, t0 + 0.2, t0 + 0.42), 0.8);
      const pose = standPose({
        crouch: 0.06 + 0.1 * bump(t, t0 + 0.2, t0 + 0.36), lean: 0.04 - 0.05 * look, headTilt: 0.06 * look,
        expr: t < t0 + 0.1 ? 'surprised' : 'confident', face: lerp(0.85, 0.3, look), look: [lerp(1, 0.2, look), 0],
        armL: { x: -12, y: 104, bend: 0.25 }, handL: 'open',
        armR: { x: lerp(34, 40, look), y: lerp(92, 20, look) + 40 * pump, bend: lerp(-0.25, -0.9, look) }, handR: 'fist', handRotR: -0.6 * look,
        bob: breathe(t),
      });
      pose.blink = blinkAt(t, [t0 + 0.5]);
      R.pose = pose;
      R.cam = { cx: lerp(-10, 10, io(win(t, t0, T1))), cy: -290, z: lerp(1.85, 1.95, io(win(t, t0, T1))) };
      return R;
    }
    return R;
  }
  function events(info) {   // for the sound effects
    const t0 = info.S.hookJam, tP = t0 + 0.36, yanks = [];
    for (let y = tP + YANK_P * 0.3; y < info.S.reveal - 0.5; y += YANK_P) yanks.push(+y.toFixed(3));
    return { steps: stepTimes(), hook: [t0, t0 + 0.18].concat(yanks), out: struggleClicks(info.S.lockedOut, OUT_PLAN) };
  }

  // ---------- frame
  function render(name, t, info) {
    const R = shot(name, t, info);
    const cam = info.cam || R.cam;
    let w = wall();
    w += windowAt(-720, -500, -600, -360) + windowAt(440, 660, -600, -360);
    w += plaque(330, -640) + lamp(-120, -610);
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
    let o = `<rect x="0" y="0" width="1080" height="1920" fill="${C.bg}"/><g transform="${tf}">${w}</g>`;
    if (!DAY) {   // night: darkness everywhere except pools of warm light (porch lamp, lit window)
      const lights = [[P3(-115, -540, 30), 640, 0.78], [P3(-610, -470, 20), 420, 0.5], [P3(-1000, -300, 400), 420, 0.3]];   // lamp, window, a little moonlight on the bush
      const sc = (p) => [540 + (p[0] - cam.cx) * cam.z, 960 + (p[1] - cam.cy) * cam.z];
      let defs = `<radialGradient id="d2n-hole"><stop offset="0" stop-color="#000"/><stop offset="0.45" stop-color="#000" stop-opacity="0.75"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`;
      let mask = `<rect x="0" y="0" width="1080" height="1920" fill="#fff"/>`, warm = '';
      lights.forEach(([p, r0, k], i) => {
        const [x, y] = sc(p), r = r0 * cam.z * 0.55 * Math.pow(1.9 / cam.z, 0.25);
        mask += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 1.5)}" fill="url(#d2n-hole)" opacity="${k}"/>`;
        defs += `<radialGradient id="d2n-w${i}" gradientUnits="userSpaceOnUse" cx="${f(x)}" cy="${f(y)}" r="${f(r)}"><stop offset="0" stop-color="#FFB45C" stop-opacity="${f(0.75 * k)}"/><stop offset="0.45" stop-color="#FF9E45" stop-opacity="${f(0.3 * k)}"/><stop offset="1" stop-color="#FF9E45" stop-opacity="0"/></radialGradient>`;
        warm += `<rect x="0" y="0" width="1080" height="1920" fill="url(#d2n-w${i})" style="mix-blend-mode:overlay"/>`;
      });
      o += `<defs>${defs}<mask id="d2n-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1080" height="1920">${mask}</mask></defs>`;
      o += `<rect x="0" y="0" width="1080" height="1920" fill="#03050D" opacity="0.6" mask="url(#d2n-mask)"/>` + warm;
    }
    if (R.dark > 0) o += `<rect x="0" y="0" width="1080" height="1920" fill="#0B0906" opacity="${f(R.dark)}"/>`;
    return o;
  }
  return { render, shot, stepTimes, events, LK };
})();
if (typeof window !== 'undefined') window.Door2D = Door2D;
if (typeof module !== 'undefined') module.exports = Door2D;
