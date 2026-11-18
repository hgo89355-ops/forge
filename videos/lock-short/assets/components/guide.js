/* Guide — the channel's cartoon guide (style v4) as a code rig. SVG string renderer.
 * Messy black hair, white skin + black outline, blue tee with a white gear logo, navy jeans, white sneakers.
 *
 * Guide.draw(state) -> svg string. state:
 *   x, y      feet (ground contact) in stage px;  h: total height in px (default 420)
 *   face      1 = turned to screen-right, -1 = screen-left (3/4 view)
 *   lean      body lean deg (+ = toward screen-right); bob: px up
 *   armL/armR [shoulder, elbow] deg — screen-left / screen-right arm. 0 = hanging, + = outward/up
 *   legL/legR [hip, knee] deg (0 = straight down, + = outward); crouch 0..1
 *   head      tilt deg; eyes: open|wide|happy|squint|closed; gaze [-1..1, -1..1]
 *   brows     neutral|raised|worried|angry|confident ; mouth: o|smile|grin|open|shocked|flat|frown|strain|wavy
 *   lines     0..1 surprise motion lines; sweat 0..1; hand: 'fist'|'open'|'point' per side via handL/handR
 * Guide.POSES: curious, oops, shocked, confident, point, push, wave, cheer, struggle, idle
 * Guide.handPos(state, 'L'|'R') -> [px,py]
 */
const Guide = (function () {
  const INK = '#15171C', SKIN = '#FFFFFF', SKIN_SH = '#E9EDF2', TEE = '#1F4FE0', TEE_SH = '#1A43C2',
    JEANS = '#2A3347', JEANS_SH = '#222A3B', SHOE = '#FFFFFF', LACE = '#9AA2AE', HAIR = '#15171C', MOUTH = '#7A1F2B';
  const rad = (d) => (d * Math.PI) / 180;
  const D = { x: 0, y: 0, h: 420, face: 1, lean: 0, bob: 0, crouch: 0, armL: [12, -8], armR: [12, -8], legL: [3, 0], legR: [3, 0],
    head: 0, eyes: 'open', gaze: [0.3, 0], brows: 'neutral', mouth: 'smile', lines: 0, sweat: 0, handL: 'open', handR: 'open', t: 0, alpha: 1 };

  // base units: total height 700
  function rig(st) {
    const k = st.h / 700, f = st.face;
    const L = (v) => v * k;
    const hipDrop = st.crouch * 70;
    const hip = [st.x, st.y - L(392 - hipDrop) - st.bob];
    const lean = rad(st.lean);
    const up = (p, len, ang) => [p[0] + Math.sin(ang) * L(len), p[1] - Math.cos(ang) * L(len)];
    const shoulderC = up(hip, 168, lean);
    const neckTop = up(shoulderC, 26, lean);
    const headC = up(neckTop, 60, lean + rad(st.head) * 0.6);
    const limb = (root, side, a, e, l1, l2) => {
      const d1 = [side * Math.sin(rad(a)), Math.cos(rad(a))];
      const j = [root[0] + d1[0] * L(l1), root[1] + d1[1] * L(l1)];
      const d2 = [side * Math.sin(rad(a + e)), Math.cos(rad(a + e))];
      return [root, j, [j[0] + d2[0] * L(l2), j[1] + d2[1] * L(l2)]];
    };
    const shW = 58;
    const shL = [shoulderC[0] - Math.cos(lean) * L(shW), shoulderC[1] - Math.sin(lean) * L(shW) + L(8)];
    const shR = [shoulderC[0] + Math.cos(lean) * L(shW), shoulderC[1] + Math.sin(lean) * L(shW) + L(8)];
    const armL = limb(shL, -1, st.armL[0], st.armL[1], 112, 104);
    const armR = limb(shR, 1, st.armR[0], st.armR[1], 112, 104);
    const hipL = [hip[0] - L(25), hip[1]], hipR = [hip[0] + L(25), hip[1]];
    const kneeBend = st.crouch * 70;
    const legL = limb(hipL, -1, st.legL[0] + kneeBend * 0.35, st.legL[1] - kneeBend, 196, 196);
    const legR = limb(hipR, 1, st.legR[0] + kneeBend * 0.35, st.legR[1] - kneeBend, 196, 196);
    return { k, f, L, hip, shoulderC, neckTop, headC, shL, shR, armL, armR, legL, legR, lean };
  }
  function handPos(st, side) { const r = rig(Object.assign({}, D, st)); return (side === 'L' ? r.armL : r.armR)[2]; }

  function tube(pts, wIn, colIn, wOut) {
    const d = 'M' + pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join('L');
    return `<path d="${d}" stroke="${INK}" stroke-width="${wOut.toFixed(1)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${d}" stroke="${colIn}" stroke-width="${wIn.toFixed(1)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  const lerpP = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];

  function shoe(foot, knee, f, k) {
    const dir = f; // toes point to the facing side
    const x = foot[0], y = foot[1];
    const w = 92 * k, h = 40 * k;
    const x0 = x - w * (dir > 0 ? 0.32 : 0.68), x1 = x0 + w;
    const toe = dir > 0 ? x1 : x0, heel = dir > 0 ? x0 : x1;
    const d = `M${heel.toFixed(1)},${(y + 2 * k).toFixed(1)} L${heel.toFixed(1)},${(y - h * 0.85).toFixed(1)} Q${x.toFixed(1)},${(y - h * 1.15).toFixed(1)} ${(toe - dir * w * 0.22).toFixed(1)},${(y - h * 0.55).toFixed(1)} Q${(toe + dir * 2 * k).toFixed(1)},${(y - h * 0.4).toFixed(1)} ${toe.toFixed(1)},${(y - 2 * k).toFixed(1)} L${toe.toFixed(1)},${(y + 2 * k).toFixed(1)} Z`;
    let s = `<path d="${d}" fill="${SHOE}" stroke="${INK}" stroke-width="${(5 * k).toFixed(1)}" stroke-linejoin="round"/>`;
    s += `<path d="M${(heel).toFixed(1)},${(y - 6 * k).toFixed(1)} L${toe.toFixed(1)},${(y - 6 * k).toFixed(1)}" stroke="${INK}" stroke-width="${(3 * k).toFixed(1)}"/>`;
    for (let i = 0; i < 3; i++) { const lx = x + dir * (4 + i * 9) * k; s += `<path d="M${(lx - 5 * k).toFixed(1)},${(y - h * 0.95 + i * 4 * k).toFixed(1)} L${(lx + 5 * k).toFixed(1)},${(y - h * 0.75 + i * 4 * k).toFixed(1)}" stroke="${LACE}" stroke-width="${(3 * k).toFixed(1)}" stroke-linecap="round"/>`; }
    return s;
  }

  function hand(p, prev, kind, k) {
    const ang = Math.atan2(p[1] - prev[1], p[0] - prev[0]);
    const r = 17 * k;
    const c = [p[0] + Math.cos(ang) * r * 0.6, p[1] + Math.sin(ang) * r * 0.6];
    let s = `<ellipse cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" rx="${(r * 1.05).toFixed(1)}" ry="${(r * 0.85).toFixed(1)}" transform="rotate(${((ang * 180) / Math.PI).toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)})" fill="${SKIN}" stroke="${INK}" stroke-width="${(5 * k).toFixed(1)}"/>`;
    if (kind === 'point') {
      const tip = [c[0] + Math.cos(ang) * r * 2.3, c[1] + Math.sin(ang) * r * 2.3];
      s += tube([c, tip], 9 * k, SKIN, 18 * k);
    } else if (kind === 'open') {
      const big = [c[0] + Math.cos(ang) * r * 0.5, c[1] + Math.sin(ang) * r * 0.5];
      s += `<ellipse cx="${big[0].toFixed(1)}" cy="${big[1].toFixed(1)}" rx="${(r * 1.35).toFixed(1)}" ry="${(r * 1.0).toFixed(1)}" transform="rotate(${((ang * 180) / Math.PI).toFixed(1)} ${big[0].toFixed(1)} ${big[1].toFixed(1)})" fill="${SKIN}" stroke="${INK}" stroke-width="${(5 * k).toFixed(1)}"/>`;
      const th = [c[0] + Math.cos(ang - 1.2) * r * 1.3, c[1] + Math.sin(ang - 1.2) * r * 1.3];
      s += tube([c, th], 8 * k, SKIN, 17 * k);
      for (const dd of [-0.35, 0.05, 0.45]) { const a0 = [big[0] + Math.cos(ang + dd) * r * 0.4, big[1] + Math.sin(ang + dd) * r * 0.4], a1 = [big[0] + Math.cos(ang + dd) * r * 1.25, big[1] + Math.sin(ang + dd) * r * 1.25]; s += `<path d="M${a0[0].toFixed(1)},${a0[1].toFixed(1)} L${a1[0].toFixed(1)},${a1[1].toFixed(1)}" stroke="${INK}" stroke-width="${(3 * k).toFixed(1)}" stroke-linecap="round"/>`; }
    }
    return s;
  }

  function gear(cx, cy, r, k) {
    let d = '';
    const n = 8;
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2;
      const rr = i % 2 ? r * 0.78 : r;
      const a0 = a - Math.PI / (n * 2) * 0.55, a1 = a + Math.PI / (n * 2) * 0.55;
      d += `${i ? 'L' : 'M'}${(cx + Math.cos(a0) * rr).toFixed(1)},${(cy + Math.sin(a0) * rr).toFixed(1)}L${(cx + Math.cos(a1) * rr).toFixed(1)},${(cy + Math.sin(a1) * rr).toFixed(1)}`;
    }
    return `<path d="${d}Z" fill="#FFFFFF"/><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r * 0.36).toFixed(1)}" fill="${TEE}"/>`;
  }

  function headSvg(r, st) {
    const { k, f, headC } = r;
    const [hx, hy] = headC;
    const tilt = st.head * f;
    const rx = 54 * k, ry = 68 * k;
    let s = `<g transform="rotate(${tilt.toFixed(1)} ${hx.toFixed(1)} ${(hy + ry * 0.7).toFixed(1)})">`;
    // ear (back side)
    const ex = hx - f * rx * 0.78, ey = hy + 6 * k;
    s += `<ellipse cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" rx="${(12 * k).toFixed(1)}" ry="${(17 * k).toFixed(1)}" fill="${SKIN}" stroke="${INK}" stroke-width="${(5 * k).toFixed(1)}"/>`;
    // head: rounded with a longer jaw toward the facing side
    const jx = hx + f * rx * 0.35;
    const hd = `M${(hx - f * rx * 0.95).toFixed(1)},${(hy - ry * 0.15).toFixed(1)}
      C${(hx - f * rx * 1.0).toFixed(1)},${(hy - ry * 1.05).toFixed(1)} ${(hx + f * rx * 1.05).toFixed(1)},${(hy - ry * 1.1).toFixed(1)} ${(hx + f * rx * 1.0).toFixed(1)},${(hy - ry * 0.1).toFixed(1)}
      C${(hx + f * rx * 1.02).toFixed(1)},${(hy + ry * 0.55).toFixed(1)} ${(jx + f * rx * 0.25).toFixed(1)},${(hy + ry * 1.02).toFixed(1)} ${jx.toFixed(1)},${(hy + ry * 1.0).toFixed(1)}
      C${(hx - f * rx * 0.35).toFixed(1)},${(hy + ry * 0.98).toFixed(1)} ${(hx - f * rx * 0.9).toFixed(1)},${(hy + ry * 0.5).toFixed(1)} ${(hx - f * rx * 0.95).toFixed(1)},${(hy - ry * 0.15).toFixed(1)}Z`;
    s += `<path d="${hd}" fill="${SKIN}" stroke="${INK}" stroke-width="${(5.5 * k).toFixed(1)}" stroke-linejoin="round"/>`;
    // hair: messy swept cap
    const P = (u, v) => [(hx + f * u * rx).toFixed(1), (hy + v * ry).toFixed(1)].join(',');
    const hair = `M${P(-1.05, 0.05)} C${P(-1.3, -0.45)} ${P(-1.15, -1.05)} ${P(-0.55, -1.22)} C${P(-0.45, -1.42)} ${P(-0.1, -1.42)} ${P(0.05, -1.28)} C${P(0.25, -1.45)} ${P(0.6, -1.4)} ${P(0.68, -1.18)} C${P(0.95, -1.2)} ${P(1.12, -0.95)} ${P(1.02, -0.72)} C${P(1.12, -0.55)} ${P(1.08, -0.4)} ${P(0.98, -0.32)} C${P(0.86, -0.52)} ${P(0.62, -0.6)} ${P(0.42, -0.5)} C${P(0.46, -0.66)} ${P(0.36, -0.78)} ${P(0.2, -0.78)} C${P(0.1, -0.6)} ${P(-0.12, -0.55)} ${P(-0.32, -0.6)} C${P(-0.45, -0.45)} ${P(-0.55, -0.2)} ${P(-0.58, 0.12)} C${P(-0.72, 0.0)} ${P(-0.85, 0.1)} ${P(-1.05, 0.05)}Z`;
    s += `<path d="${hair}" fill="${HAIR}" stroke="${INK}" stroke-width="${(4 * k).toFixed(1)}" stroke-linejoin="round"/>`;
    // face
    const gx = st.gaze[0] * f, gy = st.gaze[1];
    const fx = hx + f * rx * 0.3, fy = hy - ry * 0.05;
    const eyeSep = 27 * k;
    let erx = 6.5 * k, ery = 10.5 * k;
    if (st.eyes === 'wide') { erx *= 1.35; ery *= 1.3; }
    const eyes = [[fx - eyeSep * 0.55, fy], [fx + eyeSep * 0.55, fy - 1 * k]];
    eyes.forEach(([x, y], i) => {
      const ox = x + gx * 3.5 * k, oy = y + gy * 3 * k;
      if (st.eyes === 'happy') s += `<path d="M${(x - 9 * k).toFixed(1)},${(y + 3 * k).toFixed(1)} Q${x.toFixed(1)},${(y - 9 * k).toFixed(1)} ${(x + 9 * k).toFixed(1)},${(y + 3 * k).toFixed(1)}" stroke="${INK}" stroke-width="${(5 * k).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
      else if (st.eyes === 'squint' || st.eyes === 'closed') s += `<path d="M${(x - 9 * k).toFixed(1)},${y.toFixed(1)} L${(x + 9 * k).toFixed(1)},${(y + (i ? -2 : 2) * k).toFixed(1)}" stroke="${INK}" stroke-width="${(5 * k).toFixed(1)}" stroke-linecap="round"/>`;
      else {
        if (st.eyes === 'wide') s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(erx * 1.5).toFixed(1)}" ry="${(ery * 1.3).toFixed(1)}" fill="#fff" stroke="${INK}" stroke-width="${(3.5 * k).toFixed(1)}"/>`;
        s += `<ellipse cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" rx="${erx.toFixed(1)}" ry="${ery.toFixed(1)}" fill="${INK}"/>`;
      }
    });
    // brows
    const by = fy - 20 * k;
    const browSet = { neutral: [0, 0], raised: [-7, -7], worried: [-9, 2], angry: [5, -5], confident: [4, -6] }[st.brows] || [0, 0];
    eyes.forEach(([x], i) => {
      const inner = i === 0 ? x + 9 * k : x - 9 * k, outer = i === 0 ? x - 10 * k : x + 10 * k;
      s += `<path d="M${outer.toFixed(1)},${(by + browSet[1] * k).toFixed(1)} Q${x.toFixed(1)},${(by - 4 * k + Math.min(browSet[0], browSet[1]) * k).toFixed(1)} ${inner.toFixed(1)},${(by + browSet[0] * k).toFixed(1)}" stroke="${INK}" stroke-width="${(5.5 * k).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
    });
    // nose (small hook toward facing side)
    s += `<path d="M${(fx + f * 3 * k).toFixed(1)},${(fy + 8 * k).toFixed(1)} q${(f * 5 * k).toFixed(1)},${(7 * k).toFixed(1)} 0,${(10 * k).toFixed(1)}" stroke="${INK}" stroke-width="${(4 * k).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
    // mouth
    const mx = fx + f * 2 * k, my = fy + 36 * k, mw = 19 * k;
    const sw = (4.5 * k).toFixed(1);
    switch (st.mouth) {
      case 'o': s += `<ellipse cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" rx="${(5 * k).toFixed(1)}" ry="${(6.5 * k).toFixed(1)}" fill="${INK}"/>`; break;
      case 'shocked': s += `<path d="M${(mx - mw * 0.8).toFixed(1)},${(my - 4 * k).toFixed(1)} Q${mx.toFixed(1)},${(my - 9 * k).toFixed(1)} ${(mx + mw * 0.8).toFixed(1)},${(my - 4 * k).toFixed(1)} Q${(mx + mw * 0.7).toFixed(1)},${(my + 16 * k).toFixed(1)} ${mx.toFixed(1)},${(my + 16 * k).toFixed(1)} Q${(mx - mw * 0.7).toFixed(1)},${(my + 16 * k).toFixed(1)} ${(mx - mw * 0.8).toFixed(1)},${(my - 4 * k).toFixed(1)}Z" fill="${MOUTH}" stroke="${INK}" stroke-width="${sw}"/><path d="M${(mx - mw * 0.55).toFixed(1)},${(my - 3 * k).toFixed(1)} L${(mx + mw * 0.55).toFixed(1)},${(my - 3 * k).toFixed(1)}" stroke="#fff" stroke-width="${(4 * k).toFixed(1)}"/>`; break;
      case 'open': case 'grin': {
        const big = st.mouth === 'open' ? 1.0 : 0.75;
        s += `<path d="M${(mx - mw).toFixed(1)},${(my - 3 * k).toFixed(1)} Q${mx.toFixed(1)},${(my - 1 * k).toFixed(1)} ${(mx + mw).toFixed(1)},${(my - 5 * k).toFixed(1)} Q${(mx + mw * 0.6).toFixed(1)},${(my + 14 * k * big).toFixed(1)} ${(mx - mw * 0.2).toFixed(1)},${(my + 12 * k * big).toFixed(1)} Q${(mx - mw * 0.8).toFixed(1)},${(my + 8 * k * big).toFixed(1)} ${(mx - mw).toFixed(1)},${(my - 3 * k).toFixed(1)}Z" fill="${MOUTH}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`;
        s += `<path d="M${(mx - mw * 0.75).toFixed(1)},${(my - 1.5 * k).toFixed(1)} Q${mx.toFixed(1)},${(my + 1 * k).toFixed(1)} ${(mx + mw * 0.75).toFixed(1)},${(my - 3.5 * k).toFixed(1)}" stroke="#fff" stroke-width="${(4 * k).toFixed(1)}" fill="none"/>`;
        break;
      }
      case 'smile': s += `<path d="M${(mx - mw).toFixed(1)},${(my - 2 * k).toFixed(1)} Q${mx.toFixed(1)},${(my + 10 * k).toFixed(1)} ${(mx + mw).toFixed(1)},${(my - 4 * k).toFixed(1)}" stroke="${INK}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`; break;
      case 'frown': s += `<path d="M${(mx - mw * 0.8).toFixed(1)},${(my + 4 * k).toFixed(1)} Q${mx.toFixed(1)},${(my - 6 * k).toFixed(1)} ${(mx + mw * 0.8).toFixed(1)},${(my + 3 * k).toFixed(1)}" stroke="${INK}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`; break;
      case 'strain': s += `<rect x="${(mx - mw).toFixed(1)}" y="${(my - 6 * k).toFixed(1)}" width="${(mw * 2).toFixed(1)}" height="${(12 * k).toFixed(1)}" rx="${(4 * k).toFixed(1)}" fill="#fff" stroke="${INK}" stroke-width="${sw}"/><path d="M${(mx - mw).toFixed(1)},${my.toFixed(1)} L${(mx + mw).toFixed(1)},${my.toFixed(1)}" stroke="${INK}" stroke-width="${(3 * k).toFixed(1)}"/>`; break;
      case 'wavy': s += `<path d="M${(mx - mw).toFixed(1)},${my.toFixed(1)} q${(mw / 2).toFixed(1)},${(-6 * k).toFixed(1)} ${mw.toFixed(1)},0 t${mw.toFixed(1)},0" stroke="${INK}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`; break;
      default: s += `<path d="M${(mx - mw * 0.7).toFixed(1)},${my.toFixed(1)} L${(mx + mw * 0.7).toFixed(1)},${(my - 1 * k).toFixed(1)}" stroke="${INK}" stroke-width="${sw}" stroke-linecap="round"/>`;
    }
    if (st.sweat > 0) s += `<path d="M${(hx - f * rx * 0.9).toFixed(1)},${(hy - ry * 0.55).toFixed(1)} q${(8 * k).toFixed(1)},${(14 * k).toFixed(1)} 0,${(20 * k).toFixed(1)} q${(-8 * k).toFixed(1)},${(-6 * k).toFixed(1)} 0,${(-20 * k).toFixed(1)}Z" fill="#7CC4F4" stroke="${INK}" stroke-width="${(3 * k).toFixed(1)}" opacity="${st.sweat}"/>`;
    s += `</g>`;
    if (st.lines > 0) {
      for (let i = 0; i < 3; i++) {
        const a = rad(-60 + i * 30) + (f < 0 ? Math.PI : 0) * 0;
        const side = f;
        const cx = hx + side * rx * 1.25, cy = hy - ry * 0.9;
        const ang = rad(-150 + i * 35);
        const r0 = 14 * k, r1 = (14 + 26 * st.lines) * k;
        s += `<path d="M${(cx + side * Math.cos(ang) * -r0).toFixed(1)},${(cy + Math.sin(ang) * r0).toFixed(1)} L${(cx + side * Math.cos(ang) * -r1).toFixed(1)},${(cy + Math.sin(ang) * r1).toFixed(1)}" stroke="${INK}" stroke-width="${(5 * k).toFixed(1)}" stroke-linecap="round" opacity="${Math.min(1, st.lines * 1.5)}"/>`;
      }
    }
    return s;
  }

  function draw(stIn) {
    const st = Object.assign({}, D, stIn);
    if (st.alpha <= 0) return '';
    const r = rig(st), k = r.k, f = st.face;
    let s = `<g opacity="${st.alpha}">`;
    s += `<ellipse cx="${st.x.toFixed(1)}" cy="${(st.y + 3).toFixed(1)}" rx="${(80 * k).toFixed(1)}" ry="${(10 * k).toFixed(1)}" fill="#000" opacity="0.13"/>`;
    // back arm first when it crosses the torso: draw arms whose hand is behind? keep simple: both arms after torso unless 'behind'
    const legs = [r.legL, r.legR];
    // jeans legs
    for (const lg of legs) { const ank = lerpP(lg[1], lg[2], 0.86); s += tube([lg[0], lg[1], ank], 40 * k, JEANS, 50 * k); const h0 = lerpP(lg[1], lg[2], 0.8); s += `<path d="M${h0[0].toFixed(1)},${h0[1].toFixed(1)} L${ank[0].toFixed(1)},${ank[1].toFixed(1)}" stroke="${JEANS_SH}" stroke-width="${(38 * k).toFixed(1)}"/>`; }
    // hip block
    s += tube([[r.hip[0] - 24 * k, r.hip[1] + 2 * k], [r.hip[0] + 24 * k, r.hip[1] + 2 * k]], 46 * k, JEANS, 56 * k);
    // shoes
    s += shoe(r.legL[2], r.legL[1], f, k) + shoe(r.legR[2], r.legR[1], f, k);
    // torso (tee)
    const lean = r.lean, c = Math.cos(lean), sn = Math.sin(lean);
    const T = (u, v) => { const x = r.hip[0] + u * k * c + v * k * sn; const y = r.hip[1] + u * k * sn - v * k * c; return x.toFixed(1) + ',' + y.toFixed(1); };
    const tee = `M${T(-56, -14)} L${T(-60, 120)} Q${T(-66, 166)} ${T(-34, 176)} L${T(-13, 182)} Q${T(0, 175)} ${T(13, 182)} L${T(34, 176)} Q${T(66, 166)} ${T(60, 120)} L${T(56, -14)} Q${T(0, -22)} ${T(-56, -14)}Z`;
    s += `<path d="${tee}" fill="${TEE}" stroke="${INK}" stroke-width="${(5.5 * k).toFixed(1)}" stroke-linejoin="round"/>`;
    // neck
    s += tube([r.shoulderC, r.neckTop], 26 * k, SKIN, 36 * k);
    s += `<path d="M${T(-15, 180)} Q${T(0, 164)} ${T(15, 180)}" stroke="${INK}" stroke-width="${(4.5 * k).toFixed(1)}" fill="none"/>`;
    // gear logo on the chest (facing side)
    { const gp = T(f * 24, 128).split(',').map(Number); s += gear(gp[0], gp[1], 13 * k, k); }
    // arms: sleeve on the upper arm, skin below
    const armSvg = (arm, handKind) => {
      const sleeveEnd = lerpP(arm[0], arm[1], 0.42);
      let a = tube([arm[0], arm[1], arm[2]], 20 * k, SKIN, 30 * k);
      const ax = arm[1][0] - arm[0][0], ay = arm[1][1] - arm[0][1], al = Math.hypot(ax, ay) || 1, nx = -ay / al, ny = ax / al;
      const s0 = lerpP(arm[0], arm[1], -0.15), w0 = 27 * k, w1 = 20 * k;
      const sl = [[s0[0] + nx * w0, s0[1] + ny * w0], [sleeveEnd[0] + nx * w1, sleeveEnd[1] + ny * w1], [sleeveEnd[0] - nx * w1, sleeveEnd[1] - ny * w1], [s0[0] - nx * w0, s0[1] - ny * w0]];
      a += `<path d="M${sl.map((q) => q.map((v) => v.toFixed(1)).join(',')).join('L')}Z" fill="${TEE}" stroke="${INK}" stroke-width="${(5 * k).toFixed(1)}" stroke-linejoin="round"/>`;
      a += hand(arm[2], arm[1], handKind, k);
      return a;
    };
    s += armSvg(r.armL, st.handL) + armSvg(r.armR, st.handR);
    s += headSvg(r, st);
    s += `</g>`;
    return s;
  }

  const POSES = {
    idle: { armL: [10, -8], armR: [10, -8], mouth: 'smile', brows: 'neutral', eyes: 'open' },
    curious: { armL: [-40, -100], armR: [-12, -158], handR: 'fist', mouth: 'o', brows: 'raised', eyes: 'open', gaze: [0.4, -0.6], head: 6 },
    oops: { armL: [168, -150], armR: [48, -55], handL: 'open', handR: 'open', mouth: 'open', brows: 'worried', eyes: 'open', gaze: [0.6, 0], head: -6 },
    shocked: { armL: [40, 95], armR: [40, 95], handL: 'open', handR: 'open', mouth: 'shocked', brows: 'raised', eyes: 'wide', lines: 1, head: -4 },
    confident: { armL: [42, -105], armR: [42, -105], handL: 'fist', handR: 'fist', mouth: 'grin', brows: 'confident', eyes: 'open', gaze: [0.6, 0] },
    point: { armL: [10, -8], armR: [92, 2], handR: 'point', mouth: 'open', brows: 'raised', eyes: 'open', gaze: [1, 0] },
    wave: { armL: [10, -8], armR: [150, 25], handR: 'open', mouth: 'grin', brows: 'raised', eyes: 'happy' },
    cheer: { armL: [160, 10], armR: [160, 10], handL: 'fist', handR: 'fist', mouth: 'open', brows: 'raised', eyes: 'happy' },
    push: { armL: [70, 10], armR: [80, 5], handL: 'open', handR: 'open', mouth: 'strain', brows: 'angry', eyes: 'squint', lean: 14 },
    struggle: { armL: [85, -10], armR: [95, -15], handL: 'fist', handR: 'fist', mouth: 'strain', brows: 'angry', eyes: 'squint', lean: -10, sweat: 1 },
  };
  return { draw, handPos, rig, POSES, defaults: D };
})();
if (typeof window !== 'undefined') window.Guide = Guide;
if (typeof module !== 'undefined') module.exports = Guide;
