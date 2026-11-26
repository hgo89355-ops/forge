/* Door2D — the lock Short's OUTSIDE scenes as flat 2D cartoon (owner, 2026-11-26: "make the beginning completely 2D,
 * customised with our character, make him completely flexible"). Pure function of t → SVG string (full 1080×1920 frame).
 *   Door2D.render(name, t, info) — name ∈ hookIn | hookJam | dive | doorOpen | lockedOut | loop
 *   info = { S: {shotName: start}, A: {word: start}, DUR }
 * Story: hides in a bush, peeks, sneaks to the door, puts the key in and keeps trying to twist it (it won't),
 * freezes, deadpan stare → points at the keyhole → camera dives into the keyhole (cut to the 3D cutaway).
 * Later: right key → door swings open, he cheers. Ending: wrong key again → yank → key pops → pratfall → deadpan.
 * Timings match the existing sound effects (sfx_v6.py): hook clacks at S.hookJam+0.1+0.2k (k<6), lockedOut clacks at
 * S.lockedOut+0.08+0.2k (k<5), pop/thud at A.out, door thud at S.doorOpen+0.05.
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
  const sp = (u, k = 1) => (u <= 0 ? 0 : 1 - Math.exp(-6 * u) * Math.cos(11 * k * u)); // springy overshoot (u in 0..1+)
  const bump = (t, a, b) => (t <= a || t >= b ? 0 : Math.sin(((t - a) / (b - a)) * Math.PI));
  // deterministic noise
  const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
  const noise = (t, seed) => { const i = Math.floor(t), fr = t - i, a = hash(i + seed * 17.3), b = hash(i + 1 + seed * 17.3), u = fr * fr * (3 - 2 * fr); return a + (b - a) * u - 0.5; };

  // ---------- world layout (units ≈ px at zoom 1; ground at y = 0, up is negative)
  const S_CHAR = 1.15;
  const DOOR = { x0: 0, x1: 260, top: -600 };
  const LK = [222, -282];                         // lock cylinder (keyhole) centre
  const LEVER = [222, -226];
  const BUSH = { cx: -430, by: 34, w: 400, h: 275 };
  const STAND_X = 95;                             // where he stands to use the lock

  // ---------- background pieces
  function sky() { return ''; }
  function wall() {
    let o = `<rect x="-2200" y="-1500" width="4400" height="1500" fill="#F0E4C6"/>`;
    for (let y = -1480; y < 0; y += 38) o += `<path d="M-2200,${y} L2200,${y}" stroke="#D9C9A2" stroke-width="3.5"/>`;
    // eave / roof edge
    o += `<rect x="-2200" y="-1290" width="4400" height="46" fill="#FFFFFF" stroke="${INK}" stroke-width="6"/><rect x="-2200" y="-1500" width="4400" height="212" fill="#5A4B47"/>`;
    // foundation strip
    o += `<rect x="-2200" y="-34" width="4400" height="34" fill="#C9C2B4"/><path d="M-2200,-34 L2200,-34" stroke="${INK}" stroke-width="5"/>`;
    return o;
  }
  function windowAt(x0, y0, w, h) {
    let o = `<rect x="${x0 - 22}" y="${y0 - 22}" width="${w + 44}" height="${h + 44}" rx="6" fill="#FFFFFF" stroke="${INK}" stroke-width="6"/>`;
    o += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#BFE2F4" stroke="${INK}" stroke-width="5"/>`;
    o += `<path d="M${x0 + w * 0.12},${y0 + h * 0.75} L${x0 + w * 0.5},${y0 + h * 0.12}" stroke="#E6F5FC" stroke-width="16" stroke-linecap="round"/><path d="M${x0 + w * 0.3},${y0 + h * 0.85} L${x0 + w * 0.62},${y0 + h * 0.3}" stroke="#E6F5FC" stroke-width="8" stroke-linecap="round"/>`;
    o += `<path d="M${x0 + w / 2},${y0} L${x0 + w / 2},${y0 + h} M${x0},${y0 + h / 2} L${x0 + w},${y0 + h / 2}" stroke="#FFFFFF" stroke-width="12"/><path d="M${x0 + w / 2},${y0} L${x0 + w / 2},${y0 + h} M${x0},${y0 + h / 2} L${x0 + w},${y0 + h / 2}" stroke="${INK}" stroke-width="3" opacity="0.5"/>`;
    // flower box
    const by = y0 + h + 22;
    o += `<rect x="${x0 - 30}" y="${by}" width="${w + 60}" height="44" rx="6" fill="#B5703F" stroke="${INK}" stroke-width="6"/>`;
    for (let i = 0; i < 6; i++) {
      const fx = x0 - 8 + i * ((w + 16) / 5), fy = by - 14 - (i % 2) * 10;
      o += `<circle cx="${f(fx)}" cy="${f(fy + 12)}" r="17" fill="#4E9E45" stroke="${INK}" stroke-width="5"/>`;
      o += `<circle cx="${f(fx)}" cy="${f(fy)}" r="11" fill="${i % 2 ? '#F2C230' : '#E0393E'}" stroke="${INK}" stroke-width="4.5"/><circle cx="${f(fx)}" cy="${f(fy)}" r="4" fill="#FFF3C2"/>`;
    }
    return o;
  }
  function lamp(x, y) {
    return `<rect x="${x - 6}" y="${y - 6}" width="12" height="70" rx="5" fill="#2A2C31" stroke="${INK}" stroke-width="4"/>` +
      `<circle cx="${x}" cy="${y + 20}" r="70" fill="#FFE9A6" opacity="0.35"/>` +
      `<path d="M${x - 26},${y - 10} L${x + 26},${y - 10} L${x + 20},${y + 50} L${x - 20},${y + 50} Z" fill="#FFE07A" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>` +
      `<path d="M${x - 34},${y - 12} L${x + 34},${y - 12} L${x},${y - 40} Z" fill="#2A2C31" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>` +
      `<rect x="${x - 24}" y="${y + 48}" width="48" height="12" rx="4" fill="#2A2C31" stroke="${INK}" stroke-width="5"/>`;
  }
  function ground() {
    let o = `<rect x="-2200" y="0" width="4400" height="1400" fill="#86C25E"/>`;
    o += `<path d="M-2200,3 L2200,3" stroke="${INK}" stroke-width="6"/>`;
    // stone path from the porch toward the viewer
    o += `<path d="M${DOOR.x0 + 30},40 L${DOOR.x1 - 30},40 L${DOOR.x1 + 120},1400 L${DOOR.x0 - 120},1400 Z" fill="#DCD3C3" stroke="${INK}" stroke-width="6"/>`;
    for (let i = 0; i < 6; i++) { const y = 90 + i * i * 22 + i * 60; const sp_ = (y - 40) / 1360; o += `<path d="M${f(DOOR.x0 + 30 - 150 * sp_)},${y} L${f(DOOR.x1 - 30 + 150 * sp_)},${y}" stroke="#BDB3A1" stroke-width="5"/>`; }
    // grass tufts
    for (let i = 0; i < 26; i++) { const x = -1500 + i * 127 + hash(i) * 60, y = 60 + hash(i + 9) * 460; if (x > DOOR.x0 - 160 && x < DOOR.x1 + 160) continue; o += `<path d="M${f(x - 12)},${f(y)} L${f(x - 4)},${f(y - 20)} L${f(x + 2)},${f(y - 4)} L${f(x + 10)},${f(y - 22)} L${f(x + 14)},${f(y)}" fill="none" stroke="#5E9E43" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`; }
    // porch deck (front face)
    o += `<rect x="${DOOR.x0 - 130}" y="-2" width="${DOOR.x1 - DOOR.x0 + 260}" height="44" fill="#B98250" stroke="${INK}" stroke-width="6"/>`;
    o += `<path d="M${DOOR.x0 - 130},19 L${DOOR.x1 + 130},19" stroke="#94612F" stroke-width="4"/>`;
    for (let x = DOOR.x0 - 70; x < DOOR.x1 + 130; x += 90) o += `<path d="M${x},-2 L${x},40" stroke="#94612F" stroke-width="3.5"/>`;
    return o;
  }
  // flat cartoon bush: overlapping leaf-balls merged into one outlined mass
  function bush(cx, by, w, h, wob, seed) {
    const C = [];
    const n = 11;
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
  // the front door: green, 4 panels, white trim; `open` 0..1 swings it inward around the hinge (left edge)
  function door(open) {
    const { x0, x1, top } = DOOR, w = x1 - x0;
    let o = `<rect x="${x0 - 30}" y="${top - 30}" width="${w + 60}" height="${-top + 30}" fill="#FFFFFF" stroke="${INK}" stroke-width="6"/>`;
    o += `<rect x="${x0}" y="${top}" width="${w}" height="${-top}" fill="#2A211E"/>`;   // dark doorway behind
    if (open > 0.001) {   // warm interior: hallway light + floor
      o += `<rect x="${x0}" y="${top}" width="${w}" height="${-top}" fill="#F3D9A4"/><rect x="${x0}" y="${f(top * 0.18)}" width="${w}" height="${f(-top * 0.18)}" fill="#C9935A"/>`;
      o += `<rect x="${x0 + w * 0.55}" y="${top + 120}" width="70" height="110" fill="#FFFFFF" stroke="${INK}" stroke-width="5"/><rect x="${x0 + w * 0.55 + 10}" y="${top + 130}" width="50" height="90" fill="#E0393E"/>`;
    }
    const a = open * 1.32, c = Math.cos(a), dz = Math.sin(a) * 40;   // far edge shrinks + recedes
    const ex = x0 + w * c;
    o += `<path d="M${x0},${top} L${f(ex)},${f(top + dz)} L${f(ex)},${f(-dz * 0.3)} L${x0},0 Z" fill="#2E7258" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
    if (c > 0.25) {
      const P = (u, v) => `${f(x0 + w * c * u)},${f(top + (-top) * v + dz * (1 - u) * 0 + dz * u * (1 - v) - dz * 0.3 * u * v)}`;
      for (const [u0, u1, v0, v1] of [[0.12, 0.45, 0.07, 0.42], [0.55, 0.88, 0.07, 0.42], [0.12, 0.45, 0.56, 0.93], [0.55, 0.88, 0.56, 0.93]]) {
        o += `<path d="M${P(u0, v0)} L${P(u1, v0)} L${P(u1, v1)} L${P(u0, v1)} Z" fill="#276550" stroke="#1D4B3B" stroke-width="5" stroke-linejoin="round"/>`;
      }
    }
    if (open < 0.02) {
      // lever handle + brass lock cylinder with keyhole
      o += `<rect x="${LEVER[0] - 14}" y="${LEVER[1] - 14}" width="28" height="28" rx="8" fill="#C7CDD4" stroke="${INK}" stroke-width="5"/>`;
      o += `<rect x="${LEVER[0] - 72}" y="${LEVER[1] - 8}" width="72" height="16" rx="8" fill="#DDE2E8" stroke="${INK}" stroke-width="5"/>`;
      o += lockFace();
    }
    // house number + mat
    o += `<rect x="${x1 + 52}" y="${top + 40}" width="54" height="70" rx="8" fill="#2A2C31" stroke="${INK}" stroke-width="5"/><text x="${x1 + 79}" y="${top + 94}" font-family="Inter" font-weight="900" font-size="52" text-anchor="middle" fill="#FFFFFF">7</text>`;
    return o;
  }
  function lockFace() {
    const [x, y] = LK;
    return `<circle cx="${x}" cy="${y}" r="22" fill="#D8AD4F" stroke="${INK}" stroke-width="5"/>` +
      `<circle cx="${x}" cy="${y}" r="15" fill="#E9C979"/>` +
      `<path d="M${x - 9},${y - 8} A10,10 0 0 1 ${x + 3},${y - 15}" stroke="#FFF1C4" stroke-width="3" fill="none" stroke-linecap="round"/>` +
      `<path d="M${x},${y - 10} L${x},${y + 10}" stroke="#1A1209" stroke-width="5.5" stroke-linecap="round"/>` +
      `<path d="M${x - 2.6},${y + 6} L${x + 2.6},${y + 6}" stroke="#1A1209" stroke-width="3" stroke-linecap="round"/>`;
  }
  // key seen from the front, stuck in the lock: bow sticks out, rotated `deg` (clockwise) around the keyhole
  function keyInLock(deg, tag, swing, alpha) {
    const [x, y] = LK;
    let o = `<g transform="rotate(${f(deg)} ${x} ${y})">`;
    o += `<rect x="${x - 4}" y="${y - 22}" width="8" height="26" rx="3" fill="#C9D0D8" stroke="${INK}" stroke-width="4"/>`;
    o += `<circle cx="${x}" cy="${y - 34}" r="16" fill="#D3D9E0" stroke="${INK}" stroke-width="4.5"/><circle cx="${x}" cy="${y - 39}" r="4.5" fill="#F0E4C6" stroke="${INK}" stroke-width="3"/>`;
    o += `<path d="M${x - 8},${y - 39} A9,9 0 0 1 ${x - 1},${y - 46}" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    o += `</g>`;
    if (tag) {
      const r = (deg * Math.PI) / 180, hx = x + Math.sin(r) * 40, hy = y - Math.cos(r) * 40;
      o += tagAt(hx, hy, swing);
    }
    return `<g opacity="${alpha == null ? 1 : alpha}">${o}</g>`;
  }
  function tagAt(hx, hy, swing) {
    const a = 18 + swing;   // hangs down-right, swings
    return `<g transform="rotate(${f(a)} ${f(hx)} ${f(hy)})"><circle cx="${f(hx)}" cy="${f(hy + 9)}" r="9" fill="none" stroke="#9AA3AD" stroke-width="4"/>` +
      `<rect x="${f(hx - 14)}" y="${f(hy + 16)}" width="28" height="38" rx="6" fill="#E0393E" stroke="${INK}" stroke-width="4.5"/><circle cx="${f(hx)}" cy="${f(hy + 25)}" r="3.5" fill="#F0E4C6" stroke="${INK}" stroke-width="2"/>` +
      `<path d="M${f(hx - 6)},${f(hy + 34)} L${f(hx + 6)},${f(hy + 46)} M${f(hx + 6)},${f(hy + 34)} L${f(hx - 6)},${f(hy + 46)}" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/></g>`;
  }
  // whole key seen from the side (in his hand / flying): bow at (x,y), blade along `deg`
  function keyFull(x, y, deg, tag, swing) {
    let o = `<g transform="rotate(${f(deg)} ${f(x)} ${f(y)})">`;
    o += `<path d="M${f(x + 14)},${f(y - 7)} L${f(x + 78)},${f(y - 7)} L${f(x + 86)},${f(y)} L${f(x + 78)},${f(y + 5)} L${f(x + 72)},${f(y + 12)} L${f(x + 64)},${f(y + 5)} L${f(x + 56)},${f(y + 14)} L${f(x + 48)},${f(y + 5)} L${f(x + 40)},${f(y + 11)} L${f(x + 32)},${f(y + 5)} L${f(x + 14)},${f(y + 7)} Z" fill="#D3D9E0" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>`;
    o += `<circle cx="${f(x)}" cy="${f(y)}" r="19" fill="#D3D9E0" stroke="${INK}" stroke-width="5"/><circle cx="${f(x - 6)}" cy="${f(y)}" r="5" fill="#F0E4C6" stroke="${INK}" stroke-width="3.5"/>`;
    o += `</g>`;
    if (tag) { const r = (deg * Math.PI) / 180; o += tagAt(x - Math.cos(r) * 8, y - Math.sin(r) * 8, swing); }
    return o;
  }
  // effects
  function twistLines(a) {   // little motion arcs around the key while he twists
    if (a <= 0.02) return '';
    const [x, y] = LK;
    return `<g opacity="${f(clamp01(a))}" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"><path d="M${x + 30},${y - 56} A48,48 0 0 1 ${x + 50},${y - 22}"/><path d="M${x + 40},${y - 70} A64,64 0 0 1 ${x + 66},${y - 26}"/></g>`;
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

  // ---------- poses
  const BASE = { s: S_CHAR, y: 0, dir: 1, face: 0.35, expr: 'neutral' };
  const P = (o) => Object.assign({}, BASE, o);
  const blinkAt = (t, list) => list.some((b) => t >= b && t < b + 0.09);
  const breathe = (t) => Math.sin(t * 3.4) * 2.2;
  // tiptoe sneak (rubber-hose): big knee lifts, paws up, head forward, eyes darting
  function sneak(x, phase, t) {
    const legs = {};
    for (const [k, off] of [['legL', 0], ['legR', Math.PI]]) {
      const p = phase + off, lift = Math.pow(Math.max(0, Math.sin(p)), 1.3);
      legs[k] = { x: -46 * Math.cos(p), y: 150 - 62 * lift, bend: -0.25 - 0.55 * lift, rot: -0.35 * lift };
    }
    const sw = Math.sin(phase);
    return P(Object.assign(legs, {
      x, crouch: 0.55, bob: 8 * Math.abs(Math.sin(phase)), lean: 0.22, headDX: 10, headTilt: 0.06 * sw, expr: 'suspicious',
      armR: { x: 44 + 10 * sw, y: 18, bend: -0.75 }, handR: 'open', handRotR: 1.2,
      armL: { x: 22 - 10 * sw, y: 26, bend: 0.75 }, handL: 'open', handRotL: 1.0,
      face: 0.55, look: [1, 0.2],
    }));
  }
  // standing at the lock; `gripR`/`gripL` 0..1 blend the hands onto the key bow at angle `deg`
  function keyBow(deg) { const r = (deg * Math.PI) / 180; return [LK[0] + Math.sin(r) * 33, LK[1] - Math.cos(r) * 33]; }
  function withGrip(pose, side, target, u) {
    if (u <= 0) return pose;
    const k = side === 'R' ? 'armR' : 'armL';
    const base = Object.assign({}, G.defaults[k], pose[k]);
    const r = G.reach(pose, side, target);
    pose[k] = { x: lerp(base.x, r.x, u), y: lerp(base.y, r.y, u), bend: lerp(base.bend, side === 'R' ? 0.3 : 0.38, u) };
    if (u > 0.5) pose[side === 'R' ? 'handR' : 'handL'] = 'grip';
    return pose;
  }
  // the key-twist rhythm: each attempt winds up to the clack time, then snaps back (blocked by the pins)
  function twistAt(t, clacks) {
    let v = 0;
    for (const c of clacks) {
      if (t > c - 0.14 && t <= c) v = Math.max(v, i2(win(t, c - 0.14, c)));
      else if (t > c && t < c + 0.1) v = Math.max(v, 1 - sp(win(t, c, c + 0.1), 0.6) * 1.0);
    }
    return v;
  }

  // ---------- one function per shot → { cam, pose, keyLock, keyHand, fx, bushWob, open }
  function hookPeek(t, rise, lookSeq) {   // crouched behind the bush; rise 0 = hidden, 1 = eyes over the top
    const look = lookSeq;
    return P({
      x: BUSH.cx + 10, y: lerp(150, 0, rise), crouch: 1, expr: 'suspicious', face: look * 0.6, look: [look, 0.15], headDX: 4,
      armL: { x: 8, y: 34, bend: 0.8 }, armR: { x: 40, y: 22, bend: -0.8 }, handR: 'fist',
      legL: { x: -30, y: 150, bend: 0.4 }, legR: { x: 30, y: 150, bend: -0.4 }, headTilt: -0.04 * look, clip: true,
    });
  }
  const CAM_WIDE = { cx: -190, cy: -330, z: 1.2 }, CAM_MED = { cx: 140, cy: -300, z: 1.75 };
  const camMix = (a, b, u) => ({ cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), z: a.z * Math.pow(b.z / a.z, u) });

  function shot(name, t, info) {
    const S = info.S, A = info.A;
    const R = { cam: CAM_MED, pose: null, keyLock: null, keyHand: null, fx: '', bushWob: 0, open: 0, front: '' };
    if (name === 'loop') {
      const t0 = S.loop, T = info.DUR;
      R.cam = camMix({ cx: -175, cy: -320, z: 1.12 }, CAM_WIDE, io(win(t, t0, T)));
      const rise = o3(win(t, t0 + 0.38, T - 0.18));
      R.bushWob = bump(t, t0 + 0.05, t0 + 0.45) * 0.8;
      R.pose = hookPeek(t, rise, 1);
      R.pose.blink = blinkAt(t, [t0 + 0.2]);
      R.keyHand = { side: 'R', deg: -20, tag: true };
      return R;
    }
    if (name === 'hookIn') {
      // 0–0.36 peek (eyes dart left, snap back to the door) → 0.36–0.5 duck + spring out → sneak → 1.12 arrive → key in at the tick
      const tick = S.hookJam - 0.15 + 1 / 30;
      const look = t < 0.1 ? 1 : t < 0.14 ? lerp(1, -1, o3(win(t, 0.1, 0.14))) : t < 0.27 ? -1 : lerp(-1, 1, o3(win(t, 0.27, 0.31)));
      const xs = BUSH.cx + 10, xe = STAND_X;
      const tS = 0.42, tE = 1.1;
      if (t < 0.36) {
        R.pose = hookPeek(t, 1, look); R.pose.blink = blinkAt(t, [0.19]);
        if (t > 0.3) R.pose.expr = 'confident';
      } else if (t < tS) {
        R.pose = hookPeek(t, 1 - 0.25 * bump(t, 0.36, tS) , 1); R.pose.expr = 'confident';
      } else {
        const u = win(t, tS, tE), ue = io(u) * 0.88 + u * 0.12;
        const x = lerp(xs, xe, ue);
        const ph = ((x - xs) / 108) * Math.PI;
        const sn = sneak(x, ph, t);
        if (t < tS + 0.1) {   // spring up out of the crouch (overshoot)
          const k = sp(win(t, tS, tS + 0.1));
          Object.assign(sn, { crouch: lerp(1, 0.55, k), y: 0 });
        }
        // head snaps: glance back at the camera mid-sneak (sneaky), then forward
        if (t > 0.66 && t < 0.82) { sn.face = lerp(0.55, -0.1, bump(t, 0.66, 0.82) * 1.4 > 1 ? 1 : bump(t, 0.66, 0.82) * 1.4); sn.look = [-0.6, 0]; }
        R.pose = sn;
        if (t >= tE) {   // arrive: plant, rise, reach the key to the lock
          const a = win(t, tE, tE + 0.12);
          const stand = P({ x: xe, crouch: lerp(0.55, 0.1, o3(a)), lean: lerp(0.22, 0.08, a), expr: 'confident', face: 0.45, look: [1, -0.2],
            legL: { x: -30, y: 150, bend: 0.1 }, legR: { x: 36, y: 150, bend: -0.12 }, armL: { x: -20, y: 80, bend: 0.4 }, handL: 'open' });
          R.pose = stand;
          const reachU = io(win(t, tE, tick));
          // key in the right hand travels to the keyhole
          const hand0 = G.handPos(Object.assign({}, stand, { armR: { x: 44, y: 18, bend: -0.75 } }), 'R');
          const tgt = [lerp(hand0[0], LK[0] - 6, reachU), lerp(hand0[1], LK[1], reachU)];
          if (t < tick) {
            withGrip(stand, 'R', tgt, 1); stand.handR = 'fist';
            R.keyHand = { at: [tgt[0] + 2, tgt[1] + 2], deg: lerp(-20, 0, reachU), tag: true, front: true };
          } else {
            withGrip(stand, 'R', keyBow(0), 1);
            R.keyLock = { deg: 0, tag: true, swing: 14 * Math.sin((t - tick) * 26) * Math.exp(-(t - tick) * 6) };
            R.fx += impact(LK[0], LK[1], 1 - win(t, tick, tick + 0.12), 30);
          }
        } else R.keyHand = { side: 'R', deg: -20, tag: true, front: true };
      }
      // camera: wide on the bush → pans with him → settles medium at the door
      const cu = io(win(t, 0.4, 1.3));
      R.cam = camMix(CAM_WIDE, CAM_MED, cu);
      R.bushWob = bump(t, 0.36, 0.62) * 0.9;
      return R;
    }
    if (name === 'hookJam' || name === 'lockedOut') {
      const t0 = name === 'hookJam' ? S.hookJam : S.lockedOut;
      const n = name === 'hookJam' ? 6 : 5, c0 = name === 'hookJam' ? t0 + 0.1 : t0 + 0.08;
      const clacks = Array.from({ length: n }, (_, k) => c0 + 0.2 * k);
      const last = clacks[n - 1];
      const twistEnd = name === 'hookJam' ? last + 0.1 : last + 0.06;
      const tw = twistAt(t, clacks);
      const effort = win(t, t0, last);                    // gets more desperate each try
      const amp = 12 + 10 * effort;                       // degrees the key manages to move
      const deg = tw * amp;
      const both = name === 'hookJam' ? io(win(t, A.wont.start - 0.02, A.wont.start + 0.12)) : io(win(t, clacks[2] - 0.05, clacks[2] + 0.1));
      const footUp = name === 'hookJam' ? o3(win(t, clacks[3] - 0.08, clacks[3] + 0.04)) : o3(win(t, clacks[3] - 0.08, clacks[3] + 0.04));
      const shake = (noise(t * 40, 3) * 2) * (0.4 + effort) * (t < twistEnd + 0.05 ? 1 : 0);
      const pose = P({
        x: STAND_X - 6 * footUp, crouch: 0.12 + 0.12 * tw, lean: 0.06 + 0.05 * tw - 0.24 * footUp, squash: 1 - 0.05 * tw + 0.02 * footUp,
        headTilt: -0.07 * tw + 0.05 * footUp, headDX: 4 * tw, face: 0.5, look: [1, -0.3],
        expr: effort < 0.3 ? 'determined' : 'strain', bob: shake,
        legL: { x: -36 - 14 * footUp, y: 150, bend: 0.12 + 0.2 * footUp }, legR: { x: lerp(34, 92, footUp), y: lerp(150, 50, footUp), bend: lerp(-0.12, -0.55, footUp), rot: -0.9 * footUp },
        armL: { x: -24, y: 84, bend: 0.4 }, handL: 'open',
      });
      withGrip(pose, 'R', keyBow(deg), 1);
      pose.handRotR = (deg * Math.PI) / 180;
      const bowL = keyBow(deg); withGrip(pose, 'L', [bowL[0] - 12, bowL[1] + 14], both);
      R.keyLock = { deg, tag: name === 'lockedOut' || true, swing: -deg * 1.6 + 8 * Math.sin(t * 19) * effort };
      R.fx += twistLines(tw * 0.9);
      for (const c of clacks) R.fx += impact(LK[0], LK[1], 1 - win(t, c, c + 0.12), 28);
      R.fx += sweat(pose.x + 60, -560 + 50 * win(t, clacks[2], clacks[2] + 0.3), bump(t, clacks[2], clacks[2] + 0.35));
      R.fx += sweat(pose.x - 36, -580 + 50 * win(t, clacks[4], clacks[4] + 0.3), bump(t, clacks[4], clacks[4] + 0.35));
      R.cam = { cx: lerp(150, 165, win(t, t0, twistEnd)), cy: -320, z: lerp(1.75, 1.95, io(win(t, t0, twistEnd + 0.4))) };
      R.cam.cx += noise(t * 30, 7) * 3 * tw; R.cam.cy += noise(t * 30, 8) * 3 * tw;
      R.pose = pose;
      if (name === 'hookJam') {
        // freeze (0.12 s) in the yank pose → slow head turn to the camera → deadpan hold
        const fz = twistEnd + 0.1;
        if (t > twistEnd) {
          pose.bob = 0; pose.expr = 'strain';
          const turn = io(win(t, fz, fz + 0.26));
          pose.face = lerp(0.5, 0, turn); pose.look = [lerp(1, 0, turn), lerp(-0.3, 0, turn)]; pose.headTilt = lerp(pose.headTilt, 0, turn);
          if (turn > 0.35) pose.expr = 'deadpan';
          pose.blink = blinkAt(t, [fz + 0.36]);
        }
        return R;
      }
      // lockedOut: big yank → key pops at popT → flies back → lands on his backside at A.out → deadpan stare
      const popT = A.out.start - 0.1;
      if (t >= twistEnd && t < popT) {
        const yank = io(win(t, twistEnd, popT));
        pose.lean = -0.24 - 0.2 * yank; pose.expr = 'strain'; pose.bob = noise(t * 50, 4) * 3;
        pose.x = STAND_X - 6 - 14 * yank;
        withGrip(pose, 'R', keyBow(0), 1); withGrip(pose, 'L', [keyBow(0)[0] - 12, keyBow(0)[1] + 14], 1);
        R.keyLock = { deg: 0, tag: true, swing: 10 * Math.sin(t * 30) };
        R.fx = sweat(pose.x + 64, -560 + 40 * yank, 0.9);
      }
      if (t >= popT) {
        const fl = win(t, popT, A.out.start), land = win(t, A.out.start, A.out.start + 0.25);
        const x = lerp(STAND_X - 20, -40, o3(fl));
        const air = Math.sin(fl * Math.PI) * 70;
        const p2 = P({
          x, y: -air, sit: o3(fl), squash: 1 - 0.18 * bump(t, A.out.start, A.out.start + 0.16), lean: lerp(-0.5, -0.05, sp(land)), crouch: 0,
          expr: fl < 1 ? 'shocked' : 'shocked', face: lerp(0.4, 0.2, fl), look: [0.6, -0.4],
          legL: { x: lerp(-30, 70, o3(fl)), y: lerp(150, 120 - 60 * (1 - land), fl), bend: 0.3, rot: -0.9 * fl },
          legR: { x: lerp(60, 110, o3(fl)), y: lerp(100, 110 - 70 * (1 - land), fl), bend: -0.3, rot: -1.1 * fl },
          armL: { x: lerp(60, -70, o3(fl)), y: lerp(-10, 40, o3(fl)), bend: 0.4 }, handL: 'open',
          armR: { x: lerp(80, 70, o3(fl)), y: lerp(-20, -60, o3(fl)), bend: -0.4 }, handR: 'fist',
        });
        if (land > 0) {
          const st = win(t, A.out.start + 0.14, A.out.start + 0.4);
          const turn = io(win(t, A.out.start + 0.18, A.out.start + 0.38));
          p2.armR = { x: lerp(70, 58, st), y: lerp(-60, 36, io(st)), bend: -0.5 };
          p2.armL = { x: lerp(-70, -54, st), y: lerp(40, 66, st), bend: 0.5 };
          p2.legL = { x: lerp(70, 84, sp(land)), y: lerp(90, 150, o3(land)), bend: 0.35, rot: lerp(-0.9, -0.35, land) };
          p2.legR = { x: lerp(110, 126, sp(land)), y: lerp(40, 146, o3(land)), bend: 0.2, rot: lerp(-1.1, -0.45, land) };
          p2.face = lerp(0.2, 0, turn); p2.look = [lerp(0.6, 0, turn), lerp(-0.4, 0, turn)];
          p2.expr = turn > 0.4 ? 'deadpan' : 'shocked';
          p2.blink = blinkAt(t, [A.out.start + 0.3]);
        }
        R.pose = p2;
        const hp = G.handPos(p2, 'R');
        R.keyLock = null;
        R.keyHand = { at: [hp[0] + 4, hp[1] - 6], deg: lerp(0, -120, o3(fl)) + (land > 0 ? -10 * win(t, A.out.start, A.out.start + 0.3) : 0), tag: true, swing: 20 * Math.sin(t * 22) * Math.exp(-(t - popT) * 3) };
        R.fx = impact(LK[0], LK[1], 1 - win(t, popT, popT + 0.14), 30) + impact(x, -60, 1 - win(t, A.out.start, A.out.start + 0.16), 60);
        R.cam = camMix({ cx: 165, cy: -320, z: 1.95 }, { cx: 60, cy: -230, z: 1.5 }, io(win(t, popT, A.out.start + 0.2)));
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
      const pose = P({
        x: STAND_X - 6 + 6 * drop, crouch: 0.12, lean: lerp(-0.18, 0.02, drop), expr: t < t0 + 0.12 ? 'deadpan' : 'annoyed', face: 0.05, look: [0.2, 0],
        legL: { x: lerp(-50, -34, drop), y: 150, bend: 0.12 }, legR: { x: lerp(92, 30, drop), y: lerp(50, 150, drop), bend: lerp(-0.55, -0.12, drop), rot: -0.9 * (1 - drop) },
        armL: { x: -34, y: 70, bend: 0.5 }, handL: 'open', bob: breathe(t),
      });
      const pR = G.reach(pose, 'R', [LK[0] - 52, LK[1] + 30]);
      pose.armR = { x: lerp(56, pR.x, pt), y: lerp(-20, pR.y, pt), bend: lerp(-0.35, -0.1, pt) };
      pose.handR = pt > 0.4 ? 'point' : 'grip'; pose.handRotR = lerp(0, -0.35, pt);
      pose.blink = blinkAt(t, [t0 + 0.3]);
      R.pose = pose;
      R.keyLock = { deg: 0, tag: true, swing: lerp(4 * Math.sin(t * 9), 38, io(win(t, t0 + 0.25, tZ + 0.2))) };
      // camera: slow push → exponential dive into the keyway beside the key shaft
      const push = io(win(t, t0, tZ));
      const c1 = { cx: lerp(165, 200, push), cy: lerp(-320, -330, push), z: lerp(1.95, 2.3, push) };
      const zu = win(t, tZ, T1);
      const ze = zu * zu * (1.2 - 0.2 * zu);
      R.cam = { cx: lerp(c1.cx, LK[0], o3(Math.min(1, zu * 1.6))), cy: lerp(c1.cy, LK[1] + 7, o3(Math.min(1, zu * 1.6))), z: c1.z * Math.pow(95 / c1.z, ze) };
      R.dark = win(t, T1 - 0.16, T1 - 0.02);
      return R;
    }
    if (name === 'doorOpen') {
      const t0 = S.doorOpen, T1 = S.wrongIn;
      const op = sp(win(t, t0 + 0.04, t0 + 0.5), 0.55);
      R.open = Math.min(1, op);
      R.keyLock = { deg: 90, tag: false, swing: 0 };
      const ant = bump(t, t0, t0 + 0.14), jump = win(t, t0 + 0.1, t0 + 0.42), land = win(t, t0 + 0.42, T1);
      const air = Math.sin(clamp01(jump) * Math.PI) * 110 * (jump > 0 && jump < 1 ? 1 : 0);
      const up = io(win(t, t0 + 0.06, t0 + 0.2));
      const pose = P({
        x: 20, y: -air, crouch: 0.5 * ant + 0.35 * bump(t, t0 + 0.42, t0 + 0.6), squash: 1 + 0.12 * bump(t, t0 + 0.1, t0 + 0.3) - 0.12 * bump(t, t0 + 0.42, t0 + 0.56),
        expr: t < t0 + 0.08 ? 'shocked' : 'joy', face: 0.1, look: [0, -0.3],
        armL: { x: lerp(-30, -96, up), y: lerp(80, -96, up), bend: 0.45 }, armR: { x: lerp(30, 96, up), y: lerp(80, -96, up), bend: -0.45 }, handL: 'fist', handR: 'fist',
        legL: { x: lerp(-26, -46, bump(t, t0 + 0.14, t0 + 0.42)), y: 150 - 40 * bump(t, t0 + 0.14, t0 + 0.42), bend: 0.3 }, legR: { x: lerp(26, 52, bump(t, t0 + 0.14, t0 + 0.42)), y: 150 - 60 * bump(t, t0 + 0.14, t0 + 0.42), bend: -0.4 },
      });
      if (land > 0) { const pump = Math.sin(land * Math.PI * 3) * 0.5 + 0.5; pose.armR.y = -96 + 30 * pump; pose.expr = land > 0.5 ? 'proud' : 'joy'; }
      R.pose = pose;
      R.cam = { cx: 150, cy: -380, z: lerp(1.32, 1.42, io(win(t, t0, T1))) };
      R.fx = impact(pose.x + 4, -560 - air, bump(t, t0 + 0.2, t0 + 0.4), 90);
      return R;
    }
    return R;
  }

  // ---------- frame
  function render(name, t, info) {
    const R = shot(name, t, info);
    const cam = R.cam;
    let w = '';
    w += wall();
    w += windowAt(-300, -560, 200, 230);
    w += lamp(DOOR.x1 + 80, -470);
    w += ground();
    w += door(R.open);
    w += bush(DOOR.x1 + 260, 40, 250, 190, 0, 7);
    if (R.keyLock && !R.open) w += keyInLock(R.keyLock.deg, R.keyLock.tag, R.keyLock.swing || 0);
    if (R.open > 0) {   // turned right key rides with the door
      const c = Math.cos(R.open * 1.32), kx = DOOR.x0 + (LK[0] - DOOR.x0) * c;
      if (c > 0.3) w += `<g transform="translate(${f(kx - LK[0])} 0)">${keyInLock(90, false, 0)}</g>`;
    }
    if (R.pose) w += R.pose.clip ? `<g clip-path="url(#d2-above)">${G.draw(R.pose)}</g>` : G.draw(R.pose);
    if (R.keyHand && R.pose) {
      let at = R.keyHand.at;
      if (!at) { const hp = G.handPos(R.pose, R.keyHand.side || 'R'); at = [hp[0] + 2, hp[1] + 2]; }
      w += keyFull(at[0] - 6, at[1], R.keyHand.deg, R.keyHand.tag, R.keyHand.swing || 0);
      // fingers over the bow
      w += `<ellipse cx="${f(at[0] - 2)}" cy="${f(at[1])}" rx="14" ry="12" fill="#FFFFFF" stroke="${INK}" stroke-width="6"/>`;
    }
    w += bush(BUSH.cx, BUSH.by, BUSH.w, BUSH.h, R.bushWob, 1);
    w += R.fx;
    const tf = `translate(540 960) scale(${cam.z.toFixed(4)}) translate(${f(-cam.cx)} ${f(-cam.cy)})`;
    let o = `<defs><clipPath id="d2-above"><rect x="-3000" y="-3000" width="6000" height="3030"/></clipPath></defs><rect x="0" y="0" width="1080" height="1920" fill="#F0E4C6"/><g transform="${tf}">${w}</g>`;
    if (R.dark > 0) o += `<rect x="0" y="0" width="1080" height="1920" fill="#0B0906" opacity="${f(R.dark)}"/>`;
    return o;
  }
  return { render, LK, shot };
})();
if (typeof window !== 'undefined') window.Door2D = Door2D;
if (typeof module !== 'undefined') module.exports = Door2D;
