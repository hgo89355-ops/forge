/* Guide v2 — the channel's cartoon guide (style v4) as a code rig. SVG string renderer.
 * Human silhouette: shaped torso with shoulders and waist, tapered limbs, hands with fingers, jaw + ear,
 * layered messy black hair, blue tee with the white gear logo, navy jeans, white sneakers. One shadow tone.
 *
 * Guide.draw(state) -> svg string. state:
 *   x, y      feet (ground contact) in stage px;  h: total height in px (default 420)
 *   face      1 = turned to screen-right, -1 = screen-left (3/4 view)
 *   lean      body lean deg (+ = toward screen-right); bob: px up; crouch 0..1
 *   armL/armR [shoulder, elbow] deg — screen-left / screen-right arm. 0 = hanging, + = outward/up
 *   legL/legR [hip, knee] deg (0 = straight down, + = outward)
 *   head      tilt deg; eyes: open|wide|happy|squint|closed|half; gaze [-1..1, -1..1]
 *   brows     neutral|raised|worried|angry|confident ; mouth: o|smile|grin|open|shocked|flat|frown|strain|wavy
 *   lines     0..1 surprise motion lines; sweat 0..1; handL/handR: open|fist|point|grip
 * Guide.POSES: idle, curious, oops, shocked, confident, point, wave, cheer, push, struggle
 * Guide.handPos(state, 'L'|'R') -> [px,py]; Guide.rig(state) -> joints (shL, shR, armL, armR, …)
 */
const Guide = (function () {
  const INK = '#15171C', SKIN = '#FFFFFF', SKIN_SH = '#E3E8EF', TEE = '#1F4FE0', TEE_SH = '#1840B8', TEE_HI = '#3C68F0',
    JEANS = '#2A3347', JEANS_SH = '#1E2535', SHOE = '#FFFFFF', SOLE = '#D9DDE3', LACE = '#9AA2AE', HAIR = '#15171C', MOUTH = '#7A1F2B', TONGUE = '#E06A7A';
  const rad = (d) => (d * Math.PI) / 180;
  const D = { x: 0, y: 0, h: 420, face: 1, lean: 0, bob: 0, crouch: 0, armL: [12, -8], armR: [12, -8], legL: [3, 0], legR: [3, 0],
    head: 0, eyes: 'open', gaze: [0.3, 0], brows: 'neutral', mouth: 'smile', lines: 0, sweat: 0, handL: 'open', handR: 'open', t: 0, alpha: 1 };
  const f = (n) => n.toFixed(1);

  // ---------- skeleton (units: total height 700)
  function rig(st) {
    const k = st.h / 700;
    const L = (v) => v * k;
    const hipDrop = st.crouch * 70;
    const hip = [st.x, st.y - L(385 - hipDrop) - st.bob];
    const lean = rad(st.lean);
    const up = (p, len, ang) => [p[0] + Math.sin(ang) * L(len), p[1] - Math.cos(ang) * L(len)];
    const chest = up(hip, 120, lean);
    const shoulderC = up(hip, 172, lean);
    const neckTop = up(shoulderC, 30, lean);
    const headC = up(neckTop, 58, lean + rad(st.head) * 0.5);
    const limb = (root, side, a, e, l1, l2) => {
      const d1 = [side * Math.sin(rad(a)), Math.cos(rad(a))];
      const j = [root[0] + d1[0] * L(l1), root[1] + d1[1] * L(l1)];
      const d2 = [side * Math.sin(rad(a + e)), Math.cos(rad(a + e))];
      return [root, j, [j[0] + d2[0] * L(l2), j[1] + d2[1] * L(l2)]];
    };
    const shW = 60;
    const shL = [shoulderC[0] - Math.cos(lean) * L(shW), shoulderC[1] - Math.sin(lean) * L(shW) + L(10)];
    const shR = [shoulderC[0] + Math.cos(lean) * L(shW), shoulderC[1] + Math.sin(lean) * L(shW) + L(10)];
    const armL = limb(shL, -1, st.armL[0], st.armL[1], 112, 102);
    const armR = limb(shR, 1, st.armR[0], st.armR[1], 112, 102);
    const hipL = [hip[0] - L(24), hip[1]], hipR = [hip[0] + L(24), hip[1]];
    const kneeBend = st.crouch * 70;
    const legL = limb(hipL, -1, st.legL[0] + kneeBend * 0.35, st.legL[1] - kneeBend, 180, 178);
    const legR = limb(hipR, 1, st.legR[0] + kneeBend * 0.35, st.legR[1] - kneeBend, 180, 178);
    return { k, L, hip, chest, shoulderC, neckTop, headC, shL, shR, armL, armR, legL, legR, lean };
  }
  function handPos(st, side) { const r = rig(Object.assign({}, D, st)); return (side === 'L' ? r.armL : r.armR)[2]; }

  // ---------- drawing helpers
  // tapered tube through points with per-point half-widths; returns [outline, fill] path strings
  function taper(pts, ws) {
    const left = [], right = [], n = pts.length - 1;
    const dir = (i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
    for (let i = 0; i <= n; i++) { const [dx, dy] = dir(i); left.push([pts[i][0] - dy * ws[i], pts[i][1] + dx * ws[i]]); right.push([pts[i][0] + dy * ws[i], pts[i][1] - dx * ws[i]]); }
    const cap = (c, d, w, sgn) => { const out = []; const a0 = Math.atan2(d[1], d[0]); for (let j = 1; j < 8; j++) { const a = a0 + sgn * (Math.PI / 2 - (j / 8) * Math.PI); out.push([c[0] + Math.cos(a) * w, c[1] + Math.sin(a) * w]); } return out; };
    const P = (p) => `${f(p[0])},${f(p[1])}`;
    const dEnd = dir(n), d0 = dir(0);
    const ring = [...left, ...cap(pts[n], dEnd, ws[n], 1), ...right.reverse(), ...cap(pts[0], [-d0[0], -d0[1]], ws[0], 1)];
    return 'M' + ring.map(P).join('L') + 'Z';
  }
  const lerpP = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  const seg = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => lerpP(a, b, i / n));
  function limbPath(j, w0, w1, w2) {
    const pts = [...seg(j[0], j[1], 3), ...seg(j[1], j[2], 3).slice(1)];
    const ws = pts.map((_, i) => (i <= 3 ? w0 + (w1 - w0) * (i / 3) : w1 + (w2 - w1) * ((i - 3) / 3)));
    return taper(pts, ws);
  }
  const fillPath = (d, fill, stroke, sw) => `<path d="${d}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${f(sw)}" stroke-linejoin="round"` : ''}/>`;

  function hand(p, prev, kind, k, side) {
    const ang = Math.atan2(p[1] - prev[1], p[0] - prev[0]);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const T = (u, v) => [p[0] + ca * u * k - sa * v * k * side, p[1] + sa * u * k + ca * v * k * side];
    const sw = f(4.5 * k);
    const blob = (pts, ws) => taper(pts, ws.map((w) => w * k));
    const shapes = [];
    if (kind === 'point') {
      shapes.push(blob([T(4, 0), T(12, 0), T(19, 1)], [11, 12.5, 11]));       // fist
      shapes.push(blob([T(18, -6), T(30, -7), T(40, -7)], [5, 4.8, 4.5]));    // index finger
      shapes.push(blob([T(8, -10), T(15, -15)], [5, 4.6]));                    // thumb
    } else if (kind === 'open') {
      shapes.push(blob([T(4, 0), T(16, 0), T(30, 0)], [11, 13, 12]));          // flat mitten
      shapes.push(blob([T(8, -11), T(18, -21)], [5, 4.6]));                    // thumb out
    } else { // fist / grip
      shapes.push(blob([T(4, 0), T(12, 0), T(19, 1)], [11, 13, 12]));
      shapes.push(blob([T(9, -11), T(17, -12)], [5, 4.6]));
    }
    let o = shapes.map((d) => `<path d="${d}" fill="${INK}" stroke="${INK}" stroke-width="${f(9 * k)}" stroke-linejoin="round"/>`).join('');
    o += shapes.map((d) => `<path d="${d}" fill="${SKIN}"/>`).join('');
    // finger separation lines
    if (kind === 'open') for (const v of [-4, 4]) { const a = T(20, v), b = T(41, v * 1.1); o += `<path d="M${f(a[0])},${f(a[1])} L${f(b[0])},${f(b[1])}" stroke="${INK}" stroke-width="${sw}" stroke-linecap="round"/>`; }
    else for (const v of [-3, 5]) { const a = T(15, v), b = T(26, v); o += `<path d="M${f(a[0])},${f(a[1])} L${f(b[0])},${f(b[1])}" stroke="${INK}" stroke-width="${f(3.5 * k)}" stroke-linecap="round"/>`; }
    return o;
  }

  function gear(cx, cy, r) {
    let d = '';
    const n = 8;
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r * 0.76 : r;
      const a0 = a - (Math.PI / (n * 2)) * 0.55, a1 = a + (Math.PI / (n * 2)) * 0.55;
      d += `${i ? 'L' : 'M'}${f(cx + Math.cos(a0) * rr)},${f(cy + Math.sin(a0) * rr)}L${f(cx + Math.cos(a1) * rr)},${f(cy + Math.sin(a1) * rr)}`;
    }
    return `<path d="${d}Z" fill="#FFFFFF"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.34)}" fill="${TEE}"/>`;
  }

  function shoe(foot, knee, fc, k) {
    const x = foot[0], y = foot[1];
    const len = 96 * k, hgt = 38 * k, dir = fc;
    const heel = x - dir * len * 0.3, toe = x + dir * len * 0.7;
    const Q = (u, v) => `${f(heel + dir * u * len)},${f(y - v * hgt)}`;
    let s = `<path d="M${Q(0, 0)} L${Q(0, 0.75)} Q${Q(0.05, 1.0)} ${Q(0.3, 1.02)} L${Q(0.48, 0.95)} Q${Q(0.75, 0.78)} ${Q(0.92, 0.55)} Q${Q(1.04, 0.38)} ${Q(1.0, 0.12)} L${Q(1.0, 0)} Z" fill="${SHOE}" stroke="${INK}" stroke-width="${f(5 * k)}" stroke-linejoin="round"/>`;
    s += `<path d="M${Q(0, 0.18)} L${Q(1.0, 0.18)}" stroke="${INK}" stroke-width="${f(3 * k)}"/><path d="M${Q(0.005, 0.1)} L${Q(0.995, 0.1)}" stroke="${SOLE}" stroke-width="${f(6 * k)}"/>`;
    for (let i = 0; i < 3; i++) s += `<path d="M${Q(0.34 + i * 0.1, 0.9 - i * 0.07)} L${Q(0.42 + i * 0.1, 0.72 - i * 0.07)}" stroke="${LACE}" stroke-width="${f(3.2 * k)}" stroke-linecap="round"/>`;
    return s;
  }

  function headSvg(r, st) {
    const { k, headC } = r, fc = st.face;
    const [hx, hy] = headC;
    const rx = 52 * k, ry = 62 * k;
    let s = `<g transform="rotate(${f(st.head * fc)} ${f(hx)} ${f(hy + ry * 0.8)})">`;
    const P = (u, v) => `${f(hx + fc * u * rx)},${f(hy + v * ry)}`;
    // hair back layer (behind the head)
    s += `<path d="M${P(-0.98, 0.25)} C${P(-1.22, -0.2)} ${P(-1.18, -0.85)} ${P(-0.7, -1.12)} L${P(-0.25, -1.2)} L${P(-0.6, -0.6)} Z" fill="${HAIR}" stroke="${INK}" stroke-width="${f(4 * k)}" stroke-linejoin="round"/>`;
    // ear (back side)
    s += `<path d="M${P(-0.82, -0.12)} C${P(-1.12, -0.25)} ${P(-1.16, 0.32)} ${P(-0.8, 0.34)}" fill="${SKIN}" stroke="${INK}" stroke-width="${f(5 * k)}" stroke-linejoin="round"/>`;
    s += `<path d="M${P(-0.88, -0.02)} C${P(-1.0, 0.0)} ${P(-0.98, 0.18)} ${P(-0.86, 0.2)}" fill="none" stroke="${INK}" stroke-width="${f(3 * k)}"/>`;
    // skull + jaw (3/4 view: jaw and chin toward the facing side)
    const head = `M${P(-0.92, -0.2)} C${P(-0.98, -1.02)} ${P(0.86, -1.12)} ${P(0.98, -0.28)} C${P(1.04, 0.12)} ${P(1.0, 0.42)} ${P(0.86, 0.66)} C${P(0.7, 0.98)} ${P(0.36, 1.08)} ${P(0.12, 1.02)} C${P(-0.3, 0.94)} ${P(-0.72, 0.68)} ${P(-0.88, 0.38)} C${P(-0.96, 0.18)} ${P(-0.96, 0.0)} ${P(-0.92, -0.2)}Z`;
    s += `<path d="${head}" fill="${SKIN}" stroke="${INK}" stroke-width="${f(5.5 * k)}" stroke-linejoin="round"/>`;
    // cheek shadow tone under the hairline / jaw back
    s += `<path d="M${P(-0.85, 0.42)} C${P(-0.6, 0.78)} ${P(-0.2, 0.96)} ${P(0.1, 0.98)} C${P(-0.25, 0.86)} ${P(-0.6, 0.62)} ${P(-0.74, 0.3)}Z" fill="${SKIN_SH}"/>`;
    // hair front: messy swept mass with locks over the forehead
    const hair = `M${P(-0.96, -0.1)} C${P(-1.08, -0.7)} ${P(-0.55, -1.32)} ${P(0.05, -1.24)} L${P(-0.05, -1.48)} L${P(0.3, -1.22)} L${P(0.42, -1.44)} L${P(0.62, -1.08)} C${P(0.9, -1.06)} ${P(1.08, -0.82)} ${P(1.04, -0.52)} L${P(1.18, -0.42)} L${P(0.94, -0.32)} C${P(0.84, -0.5)} ${P(0.66, -0.56)} ${P(0.52, -0.46)} L${P(0.6, -0.26)} L${P(0.36, -0.44)} C${P(0.2, -0.52)} ${P(0.06, -0.52)} ${P(-0.06, -0.44)} L${P(0.0, -0.22)} L${P(-0.22, -0.42)} C${P(-0.4, -0.38)} ${P(-0.52, -0.22)} ${P(-0.56, 0.0)} L${P(-0.66, 0.22)} L${P(-0.76, -0.02)} Z`;
    s += `<path d="${hair}" fill="${HAIR}" stroke="${INK}" stroke-width="${f(4 * k)}" stroke-linejoin="round"/>`;
    s += `<path d="M${P(-0.3, -0.98)} Q${P(0.1, -1.06)} ${P(0.38, -0.86)}" fill="none" stroke="#3A3E47" stroke-width="${f(3 * k)}" stroke-linecap="round"/>`;
    // face
    const gx = st.gaze[0] * fc, gy = st.gaze[1];
    const fx = hx + fc * rx * 0.34, fy = hy - ry * 0.02;
    const eyes = [[fx - fc * 26 * k * 0.62, fy + 1 * k, 0.86], [fx + fc * 26 * k * 0.55, fy, 1.0]];
    for (const [x, y, sc] of eyes) {
      let erx = 7.2 * k * sc, ery = 11 * k;
      if (st.eyes === 'wide') { erx *= 1.3; ery *= 1.25; }
      const ox = x + gx * 3.4 * k, oy = y + gy * 3 * k;
      if (st.eyes === 'happy') s += `<path d="M${f(x - 10 * k * sc)},${f(y + 3 * k)} Q${f(x)},${f(y - 10 * k)} ${f(x + 10 * k * sc)},${f(y + 3 * k)}" stroke="${INK}" stroke-width="${f(5.5 * k)}" fill="none" stroke-linecap="round"/>`;
      else if (st.eyes === 'squint' || st.eyes === 'closed') s += `<path d="M${f(x - 10 * k * sc)},${f(y - 2 * k)} Q${f(x)},${f(y + 3 * k)} ${f(x + 10 * k * sc)},${f(y - 2 * k)}" stroke="${INK}" stroke-width="${f(5.5 * k)}" fill="none" stroke-linecap="round"/>`;
      else {
        if (st.eyes === 'wide') s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(erx * 1.55)}" ry="${f(ery * 1.3)}" fill="#fff" stroke="${INK}" stroke-width="${f(3.5 * k)}"/>`;
        s += `<ellipse cx="${f(ox)}" cy="${f(oy)}" rx="${f(erx)}" ry="${f(ery)}" fill="${INK}"/><circle cx="${f(ox + erx * 0.3)}" cy="${f(oy - ery * 0.38)}" r="${f(erx * 0.34)}" fill="#fff"/>`;
        if (st.eyes === 'half') s += `<path d="M${f(x - 10 * k * sc)},${f(y - 3 * k)} L${f(x + 10 * k * sc)},${f(y - 3 * k)}" stroke="${INK}" stroke-width="${f(6 * k)}"/>`;
      }
    }
    // brows
    const B = { neutral: [0, 0], raised: [-8, -8], worried: [-10, 3], angry: [6, -6], confident: [5, -7] }[st.brows] || [0, 0];
    eyes.forEach(([x, y, sc], i) => {
      const inner = x + (i === 0 ? fc : -fc) * 9 * k * sc, outer = x - (i === 0 ? fc : -fc) * 11 * k * sc;
      const by = y - 21 * k;
      s += `<path d="M${f(outer)},${f(by + B[1] * k)} Q${f(x)},${f(by - 5 * k + Math.min(B[0], B[1]) * k)} ${f(inner)},${f(by + B[0] * k)}" stroke="${INK}" stroke-width="${f(6.5 * k)}" fill="none" stroke-linecap="round"/>`;
    });
    // nose
    s += `<path d="M${f(fx + fc * 6 * k)},${f(fy + 6 * k)} q${f(fc * 7 * k)},${f(10 * k)} ${f(-fc * 1 * k)},${f(14 * k)}" stroke="${INK}" stroke-width="${f(4 * k)}" fill="none" stroke-linecap="round"/>`;
    // mouth
    const mx = fx + fc * 3 * k, my = fy + 38 * k, mw = 19 * k, sw = f(4.5 * k);
    const openMouth = (depth, teeth) => {
      let m = `<path d="M${f(mx - mw)},${f(my - 3 * k)} Q${f(mx)},${f(my + 1 * k)} ${f(mx + mw)},${f(my - 5 * k)} Q${f(mx + mw * 0.6)},${f(my + depth * k)} ${f(mx - mw * 0.1)},${f(my + (depth - 2) * k)} Q${f(mx - mw * 0.8)},${f(my + (depth - 6) * k)} ${f(mx - mw)},${f(my - 3 * k)}Z" fill="${MOUTH}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      m += `<ellipse cx="${f(mx)}" cy="${f(my + (depth - 5) * k)}" rx="${f(mw * 0.45)}" ry="${f(4 * k)}" fill="${TONGUE}"/>`;
      if (teeth) m += `<path d="M${f(mx - mw * 0.75)},${f(my - 1.5 * k)} Q${f(mx)},${f(my + 1.5 * k)} ${f(mx + mw * 0.75)},${f(my - 3.5 * k)}" stroke="#fff" stroke-width="${f(4.5 * k)}" fill="none"/>`;
      return m;
    };
    switch (st.mouth) {
      case 'o': s += `<ellipse cx="${f(mx)}" cy="${f(my)}" rx="${f(5.5 * k)}" ry="${f(7 * k)}" fill="${MOUTH}" stroke="${INK}" stroke-width="${f(3.5 * k)}"/>`; break;
      case 'shocked': s += `<ellipse cx="${f(mx)}" cy="${f(my + 4 * k)}" rx="${f(mw * 0.62)}" ry="${f(12 * k)}" fill="${MOUTH}" stroke="${INK}" stroke-width="${sw}"/><ellipse cx="${f(mx)}" cy="${f(my + 10 * k)}" rx="${f(mw * 0.35)}" ry="${f(4 * k)}" fill="${TONGUE}"/><path d="M${f(mx - mw * 0.45)},${f(my - 5 * k)} L${f(mx + mw * 0.45)},${f(my - 5 * k)}" stroke="#fff" stroke-width="${f(4 * k)}"/>`; break;
      case 'open': s += openMouth(16, true); break;
      case 'grin': s += openMouth(12, true); break;
      case 'smile': s += `<path d="M${f(mx - mw)},${f(my - 2 * k)} Q${f(mx)},${f(my + 11 * k)} ${f(mx + mw)},${f(my - 4 * k)}" stroke="${INK}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`; break;
      case 'frown': s += `<path d="M${f(mx - mw * 0.8)},${f(my + 4 * k)} Q${f(mx)},${f(my - 6 * k)} ${f(mx + mw * 0.8)},${f(my + 3 * k)}" stroke="${INK}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`; break;
      case 'strain': s += `<rect x="${f(mx - mw)}" y="${f(my - 6 * k)}" width="${f(mw * 2)}" height="${f(12 * k)}" rx="${f(4 * k)}" fill="#fff" stroke="${INK}" stroke-width="${sw}"/><path d="M${f(mx - mw)},${f(my)} L${f(mx + mw)},${f(my)}" stroke="${INK}" stroke-width="${f(3 * k)}"/>`; break;
      case 'wavy': s += `<path d="M${f(mx - mw)},${f(my)} q${f(mw / 2)},${f(-6 * k)} ${f(mw)},0 t${f(mw)},0" stroke="${INK}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`; break;
      default: s += `<path d="M${f(mx - mw * 0.7)},${f(my)} L${f(mx + mw * 0.7)},${f(my - 1 * k)}" stroke="${INK}" stroke-width="${sw}" stroke-linecap="round"/>`;
    }
    if (st.sweat > 0) s += `<path d="M${P(-0.95, -0.5)} q${f(8 * k)},${f(14 * k)} 0,${f(20 * k)} q${f(-8 * k)},${f(-6 * k)} 0,${f(-20 * k)}Z" fill="#7CC4F4" stroke="${INK}" stroke-width="${f(3 * k)}" opacity="${st.sweat}"/>`;
    s += `</g>`;
    if (st.lines > 0) for (let i = 0; i < 3; i++) {
      const ang = rad(-150 + i * 35), cx = hx + fc * rx * 1.3, cy = hy - ry * 0.95, r0 = 14 * k, r1 = (14 + 26 * st.lines) * k;
      s += `<path d="M${f(cx - fc * Math.cos(ang) * r0)},${f(cy + Math.sin(ang) * r0)} L${f(cx - fc * Math.cos(ang) * r1)},${f(cy + Math.sin(ang) * r1)}" stroke="${INK}" stroke-width="${f(5 * k)}" stroke-linecap="round" opacity="${Math.min(1, st.lines * 1.5)}"/>`;
    }
    return s;
  }

  function draw(stIn) {
    const st = Object.assign({}, D, stIn);
    if (st.alpha <= 0) return '';
    const r = rig(st), k = r.k, fc = st.face, ow = 5.5 * k;
    let s = `<g opacity="${st.alpha}">`;
    s += `<ellipse cx="${f(st.x)}" cy="${f(st.y + 3)}" rx="${f(90 * k)}" ry="${f(11 * k)}" fill="#000" opacity="0.14"/>`;
    // legs (jeans): outline pass, then fill, back leg darker
    const legs = [[r.legL, fc > 0 ? JEANS_SH : JEANS], [r.legR, fc > 0 ? JEANS : JEANS_SH]];
    for (const [lg] of legs) s += fillPath(limbPath([lg[0], lg[1], lerpP(lg[1], lg[2], 0.9)], 23 * k, 19 * k, 16 * k), INK, INK, ow * 2);
    for (const [lg, col] of legs) {
      s += fillPath(limbPath([lg[0], lg[1], lerpP(lg[1], lg[2], 0.9)], 23 * k, 19 * k, 16 * k), col);
      const h0 = lerpP(lg[1], lg[2], 0.8), h1 = lerpP(lg[1], lg[2], 0.9);
      s += `<path d="M${f(h0[0] - 15 * k)},${f(h0[1])} L${f(h1[0] + 15 * k)},${f(h0[1] + 2 * k)}" stroke="${INK}" stroke-width="${f(2.5 * k)}" opacity="0.6"/>`;
    }
    s += shoe(r.legL[2], r.legL[1], fc, k) + shoe(r.legR[2], r.legR[1], fc, k);
    // pelvis / jeans top with belt line
    const c = Math.cos(r.lean), sn = Math.sin(r.lean);
    const T = (u, v) => [r.hip[0] + u * k * c + v * k * sn, r.hip[1] + u * k * sn - v * k * c];
    const PT = (u, v) => T(u, v).map(f).join(',');
    s += `<path d="M${PT(-52, 26)} L${PT(52, 26)} L${PT(50, -22)} Q${PT(0, -34)} ${PT(-50, -22)} Z" fill="${JEANS}" stroke="${INK}" stroke-width="${f(ow)}" stroke-linejoin="round"/>`;
    s += `<path d="M${PT(fc * 4, 20)} L${PT(fc * 6, -18)}" stroke="${INK}" stroke-width="${f(2.5 * k)}" opacity="0.6"/>`;
    // torso (tee): shoulders, waist, slight flare at the hem
    const tee = `M${PT(-24, 196)} Q${PT(0, 186)} ${PT(24, 196)} L${PT(56, 186)} Q${PT(74, 182)} ${PT(76, 164)} L${PT(64, 92)} Q${PT(58, 56)} ${PT(60, 28)} Q${PT(62, 12)} ${PT(56, 6)} Q${PT(0, -4)} ${PT(-56, 6)} Q${PT(-62, 12)} ${PT(-60, 28)} Q${PT(-58, 56)} ${PT(-64, 92)} L${PT(-76, 164)} Q${PT(-74, 182)} ${PT(-56, 186)} Z`;
    // shirt = torso + both sleeves + neck, outlined together (two passes) so the sleeves grow out of the shirt
    const sleeve = (arm) => { const s0 = lerpP(arm[0], r.shoulderC, 0.15), s1 = lerpP(arm[0], arm[1], 0.46); return [s0, lerpP(s0, s1, 0.5), s1]; };
    const slL = sleeve(r.armL), slR = sleeve(r.armR), SLW = [27 * k, 25 * k, 21 * k];
    const neck = taper([r.shoulderC, lerpP(r.shoulderC, r.neckTop, 0.5), r.neckTop], [15 * k, 14 * k, 14 * k]);
    for (const d of [tee, taper(slL, SLW), taper(slR, SLW), neck]) s += fillPath(d, INK, INK, ow * 2);
    s += fillPath(neck, SKIN) + `<path d="${tee}" fill="${TEE}"/>`;
    // shading on the back side + a fold
    s += `<path d="M${PT(-fc * 60, 30)} Q${PT(-fc * 58, 60)} ${PT(-fc * 64, 92)} L${PT(-fc * 72, 160)} Q${PT(-fc * 52, 120)} ${PT(-fc * 46, 70)} Q${PT(-fc * 44, 40)} ${PT(-fc * 48, 12)} Z" fill="${TEE_SH}"/>`;
    s += `<path d="M${PT(fc * 10, 60)} Q${PT(fc * 22, 40)} ${PT(fc * 36, 34)}" stroke="${TEE_SH}" stroke-width="${f(3.5 * k)}" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M${PT(-24, 196)} Q${PT(0, 176)} ${PT(24, 196)}" stroke="${TEE_SH}" stroke-width="${f(7 * k)}" fill="none"/><path d="M${PT(-24, 196)} Q${PT(0, 176)} ${PT(24, 196)}" stroke="${INK}" stroke-width="${f(3 * k)}" fill="none"/>`;
    { const g = T(fc * 26, 148); s += gear(g[0], g[1], 13 * k); }
    // arms (skin, own outline, in front of the shirt), then sleeve fill on top + hem line, then hands
    const arm = (a, sl, kind, side) => {
      const limb = limbPath([lerpP(a[0], a[1], 0.3), a[1], a[2]], 13 * k, 11 * k, 9 * k);
      let o = fillPath(limb, INK, INK, ow * 2) + fillPath(limb, SKIN);
      o += `<path d="${taper([a[0], sl[1], sl[2]], [20 * k, SLW[1], SLW[2]])}" fill="${TEE}"/>`;
      const e = sl[2], d = [sl[2][0] - sl[1][0], sl[2][1] - sl[1][1]], l = Math.hypot(d[0], d[1]) || 1, w = SLW[2];
      const pts = []; const a0 = Math.atan2(d[1], d[0]); for (let j = 0; j <= 8; j++) { const aa = a0 - Math.PI / 2 + (j / 8) * Math.PI; pts.push(`${f(e[0] + Math.cos(aa) * w)},${f(e[1] + Math.sin(aa) * w)}`); }
      o += `<path d="M${pts.join('L')}" fill="none" stroke="${INK}" stroke-width="${f(ow)}" stroke-linecap="round" stroke-linejoin="round"/>`;
      o += `<path d="M${f(e[0] - d[1] / l * w * 0.9 - d[0] / l * 6 * k)},${f(e[1] + d[0] / l * w * 0.9 - d[1] / l * 6 * k)} L${f(e[0] + d[1] / l * w * 0.9 - d[0] / l * 6 * k)},${f(e[1] - d[0] / l * w * 0.9 - d[1] / l * 6 * k)}" stroke="${TEE_SH}" stroke-width="${f(3 * k)}"/>`;
      o += hand(a[2], a[1], kind, k, side);
      return o;
    };
    s += arm(r.armL, slL, st.handL, -1) + arm(r.armR, slR, st.handR, 1);
    s += headSvg(r, st);
    s += `</g>`;
    return s;
  }

  const POSES = {
    idle: { armL: [10, -8], armR: [10, -8], mouth: 'smile', brows: 'neutral', eyes: 'open' },
    curious: { armL: [-40, -100], armR: [-12, -158], handR: 'fist', handL: 'grip', mouth: 'o', brows: 'raised', eyes: 'open', gaze: [0.4, -0.6], head: 6 },
    oops: { armL: [168, -150], armR: [48, -55], handL: 'open', handR: 'open', mouth: 'grin', brows: 'worried', eyes: 'open', gaze: [0.6, 0], head: -6 },
    shocked: { armL: [40, 95], armR: [40, 95], handL: 'open', handR: 'open', mouth: 'shocked', brows: 'raised', eyes: 'wide', lines: 1, head: -4 },
    confident: { armL: [42, -105], armR: [42, -105], handL: 'fist', handR: 'fist', mouth: 'grin', brows: 'confident', eyes: 'open', gaze: [0.6, 0] },
    point: { armL: [10, -8], armR: [92, 2], handR: 'point', mouth: 'open', brows: 'raised', eyes: 'open', gaze: [1, 0] },
    wave: { armL: [10, -8], armR: [150, 25], handR: 'open', mouth: 'grin', brows: 'raised', eyes: 'happy' },
    cheer: { armL: [160, 10], armR: [160, 10], handL: 'fist', handR: 'fist', mouth: 'open', brows: 'raised', eyes: 'happy' },
    push: { armL: [70, 10], armR: [80, 5], handL: 'open', handR: 'open', mouth: 'strain', brows: 'angry', eyes: 'squint', lean: 14 },
    struggle: { armL: [85, -10], armR: [95, -15], handL: 'grip', handR: 'grip', mouth: 'strain', brows: 'angry', eyes: 'squint', lean: -10, sweat: 1 },
  };
  return { draw, handPos, rig, POSES, defaults: D };
})();
if (typeof window !== 'undefined') window.Guide = Guide;
if (typeof module !== 'undefined') module.exports = Guide;
