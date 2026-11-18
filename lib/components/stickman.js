/* Stickman — the channel's reusable sidekick rig (SVG string renderer).
 * Swap-in point: replace Stickman.draw with your own drawing; keep the same state keys.
 *
 * state = {
 *   x, y        feet position in stage px (y = ground)
 *   s           scale (1 => ~190 px tall)
 *   face        1 = facing right, -1 = facing left
 *   lean        body lean in degrees (positive = toward face)
 *   crouch      0..1 knees bend / hip drop
 *   squash      vertical squash (0 = none, 0.15 = landing)
 *   armF, armB  [shoulderDeg, elbowDeg] front/back arm; 0 = hanging down, + = rotate forward/up
 *   legF, legB  [hipDeg, kneeDeg]
 *   head        head tilt deg; eyes: normal|wide|happy|squint|closed; gaze [gx,gy] -1..1
 *   brows       neutral|raised|worried|angry|determined|sad; mouth: smile|flat|o|O|grin|frown|strain|wavy
 *   sweat       0..1; t: time (for the 12 fps line boil)
 * }
 * Stickman.handPos(state, 'F'|'B') -> [px,py] ; Stickman.aim(state, 'F', [px,py]) -> shoulderDeg to point at a target
 */
const Stickman = (function () {
  const INK = '#1E1F24', HEAD = '#FBF9F4', SWEAT = '#5AB4F0';
  const rad = (d) => (d * Math.PI) / 180;
  function mulberry(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const D = { x: 0, y: 0, s: 1, face: 1, lean: 0, crouch: 0, squash: 0, armF: [20, 10], armB: [-15, -10], legF: [8, 0], legB: [-8, 0], head: 0, eyes: 'normal', gaze: [0.4, 0], brows: 'neutral', mouth: 'smile', sweat: 0, t: 0, alpha: 1 };

  function skeleton(st) {
    const s = st.s, fc = st.face;
    const legL = 44 * s;
    const hipDrop = st.crouch * 30 * s;
    const sq = 1 - st.squash;
    const hip = [st.x, st.y - (2 * legL - hipDrop) * sq];
    const L = rad(st.lean) * fc;
    const torso = 72 * s * sq;
    const sh = [hip[0] + Math.sin(L) * torso, hip[1] - Math.cos(L) * torso];
    const neck = [hip[0] + Math.sin(L) * (torso + 10 * s), hip[1] - Math.cos(L) * (torso + 10 * s)];
    const hr = 30 * s;
    const head = [neck[0] + Math.sin(L + rad(st.head) * fc) * hr, neck[1] - Math.cos(L + rad(st.head) * fc) * hr];
    const limb = (root, a1, a2, l1, l2) => {
      // angle 0 = straight down; positive rotates toward facing direction (forward/up)
      const d1 = [Math.sin(rad(a1)) * fc, Math.cos(rad(a1))];
      const j = [root[0] + d1[0] * l1, root[1] + d1[1] * l1];
      const d2 = [Math.sin(rad(a1 + a2)) * fc, Math.cos(rad(a1 + a2))];
      return [root, j, [j[0] + d2[0] * l2, j[1] + d2[1] * l2]];
    };
    const armF = limb(sh, st.armF[0], st.armF[1], 36 * s, 34 * s);
    const armB = limb(sh, st.armB[0], st.armB[1], 36 * s, 34 * s);
    // legs: knees bend forward with crouch
    const kneeA = st.crouch * 50;
    const legF = limb(hip, st.legF[0] + kneeA * 0.5, st.legF[1] - kneeA, legL, legL);
    const legB = limb(hip, st.legB[0] + kneeA * 0.5, st.legB[1] - kneeA, legL, legL);
    return { hip, sh, neck, head, hr, armF, armB, legF, legB };
  }
  function handPos(st, which) { const k = skeleton(Object.assign({}, D, st)); return (which === 'B' ? k.armB : k.armF)[2]; }
  function aim(st, which, target) {
    const k = skeleton(Object.assign({}, D, st));
    const dx = (target[0] - k.sh[0]) * (st.face ?? 1), dy = target[1] - k.sh[1];
    return (Math.atan2(dx, dy) * 180) / Math.PI;
  }

  function draw(stIn) {
    const st = Object.assign({}, D, stIn);
    if (st.alpha <= 0) return '';
    const k = skeleton(st);
    const rnd = mulberry(Math.floor(st.t * 12) * 7919 + 13);
    const j = (p) => [p[0] + (rnd() - 0.5) * 1.6 * st.s, p[1] + (rnd() - 0.5) * 1.6 * st.s];
    const w = (7 * st.s).toFixed(2);
    const path = (pts) => 'M' + pts.map((p) => j(p).map((v) => v.toFixed(1)).join(',')).join('L');
    let out = `<g opacity="${st.alpha}" stroke-linecap="round" stroke-linejoin="round">`;
    // contact shadow
    out += `<ellipse cx="${st.x.toFixed(1)}" cy="${(st.y + 3).toFixed(1)}" rx="${(34 * st.s).toFixed(1)}" ry="${(6 * st.s).toFixed(1)}" fill="${INK}" opacity="0.12"/>`;
    out += `<path d="${path(k.legB)}" stroke="${INK}" stroke-width="${w}" fill="none"/>`;
    out += `<path d="${path(k.armB)}" stroke="${INK}" stroke-width="${w}" fill="none"/>`;
    out += `<path d="${path([k.hip, k.neck])}" stroke="${INK}" stroke-width="${w}" fill="none"/>`;
    out += `<path d="${path(k.legF)}" stroke="${INK}" stroke-width="${w}" fill="none"/>`;
    // head
    const [hx, hy] = j(k.head), r = k.hr;
    out += `<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${r.toFixed(1)}" fill="${HEAD}" stroke="${INK}" stroke-width="${w}"/>`;
    // face (looks toward face direction + gaze)
    const fc = st.face, gx = st.gaze[0] * fc, gy = st.gaze[1];
    const ex = hx + fc * r * 0.18 + gx * r * 0.16, ey = hy - r * 0.05 + gy * r * 0.14;
    const sep = r * 0.36;
    let erx = r * 0.11, ery = r * 0.17;
    if (st.eyes === 'wide') { erx *= 1.3; ery *= 1.35; }
    for (const side of [-1, 1]) {
      const cx = ex + side * sep, cy = ey;
      if (st.eyes === 'happy') out += `<path d="M${(cx - erx * 1.3).toFixed(1)},${(cy + 2).toFixed(1)} Q${cx.toFixed(1)},${(cy - ery * 1.4).toFixed(1)} ${(cx + erx * 1.3).toFixed(1)},${(cy + 2).toFixed(1)}" stroke="${INK}" stroke-width="${(4.5 * st.s).toFixed(1)}" fill="none"/>`;
      else if (st.eyes === 'squint' || st.eyes === 'closed') out += `<path d="M${(cx - erx * 1.4).toFixed(1)},${cy.toFixed(1)} L${(cx + erx * 1.4).toFixed(1)},${cy.toFixed(1)}" stroke="${INK}" stroke-width="${(4.5 * st.s).toFixed(1)}"/>`;
      else {
        out += `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${erx.toFixed(1)}" ry="${ery.toFixed(1)}" fill="${INK}"/>`;
        out += `<circle cx="${(cx + erx * 0.35).toFixed(1)}" cy="${(cy - ery * 0.4).toFixed(1)}" r="${(erx * 0.32).toFixed(1)}" fill="${HEAD}"/>`;
      }
    }
    // brows
    const by = ey - ery - r * 0.2;
    for (const side of [-1, 1]) {
      const cx = ex + side * sep;
      let inner = 0, outer = 0; // y offsets (negative = up)
      switch (st.brows) {
        case 'raised': inner = outer = -r * 0.14; break;
        case 'worried': case 'sad': inner = -r * 0.16; outer = r * 0.04; break;
        case 'angry': case 'determined': inner = r * 0.1; outer = -r * 0.08; break;
      }
      const ix = cx - side * r * 0.14, ox = cx + side * r * 0.16;
      out += `<path d="M${ix.toFixed(1)},${(by + inner).toFixed(1)} L${ox.toFixed(1)},${(by + outer).toFixed(1)}" stroke="${INK}" stroke-width="${(5 * st.s).toFixed(1)}"/>`;
    }
    // mouth
    const mx = hx + fc * r * 0.2 + gx * r * 0.1, my = hy + r * 0.45;
    const mw = r * 0.32;
    switch (st.mouth) {
      case 'smile': out += `<path d="M${(mx - mw).toFixed(1)},${(my - 3).toFixed(1)} Q${mx.toFixed(1)},${(my + mw * 0.9).toFixed(1)} ${(mx + mw).toFixed(1)},${(my - 3).toFixed(1)}" stroke="${INK}" stroke-width="${(4.5 * st.s).toFixed(1)}" fill="none"/>`; break;
      case 'grin': out += `<path d="M${(mx - mw * 1.2).toFixed(1)},${(my - 4).toFixed(1)} Q${mx.toFixed(1)},${(my + mw * 1.5).toFixed(1)} ${(mx + mw * 1.2).toFixed(1)},${(my - 4).toFixed(1)} Z" fill="${INK}"/>`; break;
      case 'frown': out += `<path d="M${(mx - mw).toFixed(1)},${(my + 5).toFixed(1)} Q${mx.toFixed(1)},${(my - mw * 0.7).toFixed(1)} ${(mx + mw).toFixed(1)},${(my + 5).toFixed(1)}" stroke="${INK}" stroke-width="${(4.5 * st.s).toFixed(1)}" fill="none"/>`; break;
      case 'o': out += `<ellipse cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" rx="${(mw * 0.35).toFixed(1)}" ry="${(mw * 0.45).toFixed(1)}" fill="${INK}"/>`; break;
      case 'O': out += `<ellipse cx="${mx.toFixed(1)}" cy="${(my + 2).toFixed(1)}" rx="${(mw * 0.6).toFixed(1)}" ry="${(mw * 0.8).toFixed(1)}" fill="${INK}"/>`; break;
      case 'strain': out += `<path d="M${(mx - mw).toFixed(1)},${my.toFixed(1)} L${(mx + mw).toFixed(1)},${my.toFixed(1)} M${(mx - mw * 0.5).toFixed(1)},${(my - 4).toFixed(1)} L${(mx - mw * 0.5).toFixed(1)},${(my + 4).toFixed(1)} M${(mx + mw * 0.1).toFixed(1)},${(my - 4).toFixed(1)} L${(mx + mw * 0.1).toFixed(1)},${(my + 4).toFixed(1)}" stroke="${INK}" stroke-width="${(3.5 * st.s).toFixed(1)}"/>`; break;
      case 'wavy': out += `<path d="M${(mx - mw).toFixed(1)},${my.toFixed(1)} q${(mw / 2).toFixed(1)},-5 ${mw.toFixed(1)},0 t${mw.toFixed(1)},0" stroke="${INK}" stroke-width="${(4 * st.s).toFixed(1)}" fill="none"/>`; break;
      default: out += `<path d="M${(mx - mw * 0.8).toFixed(1)},${my.toFixed(1)} L${(mx + mw * 0.8).toFixed(1)},${my.toFixed(1)}" stroke="${INK}" stroke-width="${(4.5 * st.s).toFixed(1)}"/>`;
    }
    if (st.sweat > 0) {
      const sx = hx - fc * r * 0.95, sy = hy - r * 0.55 + (1 - st.sweat) * -8;
      out += `<path d="M${sx.toFixed(1)},${(sy - 14 * st.s).toFixed(1)} Q${(sx + 9 * st.s).toFixed(1)},${(sy + 4).toFixed(1)} ${sx.toFixed(1)},${(sy + 8 * st.s).toFixed(1)} Q${(sx - 9 * st.s).toFixed(1)},${(sy + 4).toFixed(1)} ${sx.toFixed(1)},${(sy - 14 * st.s).toFixed(1)}Z" fill="${SWEAT}" stroke="${INK}" stroke-width="2.5" opacity="${st.sweat}"/>`;
    }
    out += `<path d="${path(k.armF)}" stroke="${INK}" stroke-width="${w}" fill="none"/>`;
    out += `</g>`;
    return out;
  }
  return { draw, handPos, aim, skeleton, defaults: D };
})();
if (typeof window !== 'undefined') window.Stickman = Stickman;
