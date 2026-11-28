/* Guide2D — THE character as a flat 2D cartoon (SVG), rubber-hose limbs so he can bend anywhere.
 * Look (owner, 2026-11-26): big round white head + thick black outline, curly-top hair, blue headphones with yellow
 * rings, bold eyebrows, egg body in the electric-blue gear tee, white bendy arms + mitten hands, thick black bendy legs,
 * white sneakers. Style: flat colours + thick outlines (Rick's-Clips-like), customised.
 *
 *   Guide2D.draw(pose) -> SVG string. Local units: feet at y = 0, up is negative; the rig is ~430 units tall.
 * pose: { x, y, s, dir (±1 facing), bob, crouch 0..1, lean (rad), squash (1 = normal), headTilt (rad), headDX,
 *         face (−1..1: turn toward screen-left/right), expr, blink, look:[x,y],
 *         armL/armR: { x, y, bend } hand position relative to the shoulder (y down), bend = elbow curve (−1..1),
 *         handL/handR: 'open' | 'fist' | 'point' | 'grip' | 'wave', handRotL/handRotR (rad),
 *         legL/legR: { x, y, bend } foot position relative to the hip, sit (0..1), alpha }
 */
const Guide2D = (function () {
  const INK = '#121317', TEE = '#1E5BFF', TEE_D = '#1746D0', HAIR = '#2B2E36', HAIR_L = '#4A4E58', PHONE = '#23262E', CUP = '#1E5BFF', YEL = '#F2C230', W = '#FFFFFF';
  const f = (n) => (Math.round(n * 10) / 10).toString();
  // proportions (owner 2026-11-28: a bit taller, less fat): hip height, body half-height / half-width, shoulder offset
  const LEG = 188, BRY = 66, BRX = 35, CROUCH = 60;
  const shoulderX = (st) => 25 * (1 - 0.45 * Math.min(1, Math.abs(st.face)));
  const D = {
    x: 540, y: 1500, s: 1, dir: 1, bob: 0, crouch: 0, lean: 0, squash: 1, headTilt: 0, headDX: 0, face: 0.35, expr: 'neutral', blink: 0, look: [0, 0],
    armL: { x: -28, y: 112, bend: 0.25 }, armR: { x: 28, y: 112, bend: -0.25 }, handL: 'open', handR: 'open', handRotL: 0, handRotR: 0,
    legL: { x: -26, y: 150, bend: 0.12 }, legR: { x: 26, y: 150, bend: -0.12 }, alpha: 1,
  };
  // ---------- faces
  const EX = {
    neutral: { eyes: 'open', brow: [[0, 0], [0, 0]], mouth: 'smile' },
    suspicious: { eyes: 'half', brow: [[6, -0.25], [-4, 0.35]], mouth: 'flat', look: [1, 0] },
    deadpan: { eyes: 'half', brow: [[0, 0], [0, 0]], mouth: 'flat' },
    annoyed: { eyes: 'half', brow: [[-4, 0.45], [-4, 0.45]], mouth: 'frown' },
    determined: { eyes: 'open', brow: [[-6, 0.5], [-6, 0.5]], mouth: 'tight' },
    strain: { eyes: 'squint', brow: [[-8, 0.55], [-8, 0.55]], mouth: 'teeth' },
    worried: { eyes: 'open', brow: [[8, -0.45], [8, -0.45]], mouth: 'wavy' },
    shocked: { eyes: 'wide', brow: [[16, -0.1], [16, -0.1]], mouth: 'O' },
    panic: { eyes: 'wide', brow: [[18, -0.4], [18, -0.4]], mouth: 'scream' },
    confident: { eyes: 'half', brow: [[2, 0.2], [8, -0.1]], mouth: 'smirk' },
    proud: { eyes: 'happy', brow: [[8, -0.1], [8, -0.1]], mouth: 'bigGrin' },
    joy: { eyes: 'happy', brow: [[12, -0.1], [12, -0.1]], mouth: 'bigGrin' },
    oops: { eyes: 'happy', brow: [[10, -0.4], [10, -0.4]], mouth: 'grin' },
    curious: { eyes: 'open', brow: [[12, -0.1], [-2, 0.1]], mouth: 'o', look: [0.6, -0.4] },
    starstruck: { eyes: 'star', brow: [[16, -0.1], [16, -0.1]], mouth: 'bigGrin' },
    // grown-up reactions (owner 2026-11-28: less childish): narrowed eyes, small mouths
    effort: { eyes: 'half', brow: [[-7, 0.55], [-7, 0.55]], mouth: 'tight' },
    maxEffort: { eyes: 'squint', brow: [[-11, 0.62], [-11, 0.62]], mouth: 'teeth' },   // pulling with everything he has
    surprised: { eyes: 'wide', brow: [[14, -0.05], [14, -0.05]], mouth: 'o' },
    bugeyed: { eyes: 'bug', brow: [[20, -0.3], [20, -0.3]], mouth: 'O' },
  };
  function face(cx, cy, st) {
    const ex = Object.assign({ look: [0, 0] }, EX[st.expr] || EX.neutral);
    const fx = st.face, lk = [st.look[0] || ex.look[0], st.look[1] || ex.look[1]];
    let o = '';
    const eyes = [[-24, 0], [24, 0]];
    eyes.forEach(([ex0], i) => {
      const x = cx + ex0 * (1 - 0.22 * Math.abs(fx)) + Math.sin(fx * 0.75) * 40 + lk[0] * 5, y = cy - 6 + lk[1] * 4;
      const kind = st.blink ? 'closed' : ex.eyes;
      if (kind === 'star') {   // 4-point yellow stars (over-the-top joy)
        const r1 = 19, r2 = 7; let d = '';
        for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 - Math.PI / 2, r = k % 2 ? r2 : r1; d += `${k ? 'L' : 'M'}${f(x + Math.cos(a) * r)},${f(y + Math.sin(a) * r)}`; }
        o += `<path d="${d}Z" fill="#FFD21F" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>`;
      } else if (kind === 'bug') {   // huge white eyes with tiny pupils (shock)
        o += `<ellipse cx="${f(x)}" cy="${f(y - 4)}" rx="20" ry="25" fill="${W}" stroke="${INK}" stroke-width="5"/><circle cx="${f(x + lk[0] * 6)}" cy="${f(y - 4 + lk[1] * 6)}" r="6" fill="${INK}"/>`;
      } else if (kind === 'open' || kind === 'wide') {
        const k = kind === 'wide' ? 1.18 : 1;   // smaller, calmer eyes read more mature
        o += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(8 * k)}" ry="${f(11.5 * k)}" fill="${INK}"/><ellipse cx="${f(x + 2.6 * k)}" cy="${f(y - 4 * k)}" rx="${f(2.2 * k)}" ry="${f(2.8 * k)}" fill="${W}"/>`;
      } else if (kind === 'half') {
        o += `<path d="M${f(x - 11)},${f(y - 1)} A11,11 0 0 0 ${f(x + 11)},${f(y - 1)} Z" fill="${INK}"/><path d="M${f(x - 14)},${f(y - 2)} L${f(x + 14)},${f(y - 2)}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
      } else if (kind === 'happy') {
        o += `<path d="M${f(x - 12)},${f(y + 4)} Q${f(x)},${f(y - 13)} ${f(x + 12)},${f(y + 4)}" stroke="${INK}" stroke-width="6.5" fill="none" stroke-linecap="round"/>`;
      } else if (kind === 'squint') {
        o += `<path d="M${f(x - 12)},${f(y - 3)} L${f(x + 10)},${f(y + 1)} L${f(x - 12)},${f(y + 5)}" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="${i ? `scale(-1,1) translate(${f(-2 * x)},0)` : ''}"/>`;
      } else {
        o += `<path d="M${f(x - 12)},${f(y)} Q${f(x)},${f(y + 7)} ${f(x + 12)},${f(y)}" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
      }
      // bold straight brows: [lift px, angle] (+angle = inner end down = angry)
      const [lift, ang] = ex.brow[i];
      const bx = x, by = cy - 34 - lift, L = 15, inner = i === 0 ? 1 : -1;
      const dy = Math.tan(ang) * L;
      o += `<path d="M${f(bx - inner * L)},${f(by - dy)} L${f(bx + inner * L)},${f(by + dy)}" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>`;
    });
    const mx = cx + Math.sin(fx * 0.75) * 44, my = cy + 30;
    const M = (d, fill) => `<path d="${d}" fill="${fill || 'none'}" stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
    switch (ex.mouth) {
      case 'smile': o += M(`M${f(mx - 16)},${f(my - 2)} Q${f(mx)},${f(my + 12)} ${f(mx + 16)},${f(my - 4)}`); break;
      case 'smirk': o += M(`M${f(mx - 12)},${f(my + 3)} Q${f(mx + 4)},${f(my + 8)} ${f(mx + 17)},${f(my - 6)}`); break;
      case 'flat': o += M(`M${f(mx - 13)},${f(my + 2)} L${f(mx + 13)},${f(my + 1)}`); break;
      case 'tight': o += M(`M${f(mx - 11)},${f(my + 3)} Q${f(mx)},${f(my - 1)} ${f(mx + 11)},${f(my + 4)}`); break;
      case 'frown': o += M(`M${f(mx - 14)},${f(my + 7)} Q${f(mx)},${f(my - 5)} ${f(mx + 14)},${f(my + 7)}`); break;
      case 'wavy': o += M(`M${f(mx - 17)},${f(my + 2)} q4,-6 8,0 t8,0 t8,0 t8,0`); break;
      case 'o': o += `<ellipse cx="${f(mx)}" cy="${f(my + 2)}" rx="6" ry="8" fill="#5C1622" stroke="${INK}" stroke-width="5"/>`; break;
      case 'O': o += `<ellipse cx="${f(mx)}" cy="${f(my + 4)}" rx="11" ry="15" fill="#5C1622" stroke="${INK}" stroke-width="5.5"/><ellipse cx="${f(mx)}" cy="${f(my + 11)}" rx="6" ry="4" fill="#E2707F"/>`; break;
      case 'scream': o += `<path d="M${f(mx - 15)},${f(my - 4)} Q${f(mx)},${f(my - 8)} ${f(mx + 15)},${f(my - 4)} Q${f(mx + 14)},${f(my + 26)} ${f(mx)},${f(my + 26)} Q${f(mx - 14)},${f(my + 26)} ${f(mx - 15)},${f(my - 4)}Z" fill="#5C1622" stroke="${INK}" stroke-width="5.5"/><path d="M${f(mx - 11)},${f(my - 2)} L${f(mx + 11)},${f(my - 2)}" stroke="${W}" stroke-width="5"/><ellipse cx="${f(mx)}" cy="${f(my + 18)}" rx="8" ry="5" fill="#E2707F"/>`; break;
      case 'grin': case 'bigGrin': { const h = ex.mouth === 'bigGrin' ? 24 : 16; o += `<path d="M${f(mx - 20)},${f(my - 4)} Q${f(mx)},${f(my - 7)} ${f(mx + 20)},${f(my - 4)} Q${f(mx + 17)},${f(my + h)} ${f(mx)},${f(my + h)} Q${f(mx - 17)},${f(my + h)} ${f(mx - 20)},${f(my - 4)}Z" fill="#5C1622" stroke="${INK}" stroke-width="5.5"/><path d="M${f(mx - 15)},${f(my - 1)} L${f(mx + 15)},${f(my - 1)}" stroke="${W}" stroke-width="5"/>${h > 20 ? `<ellipse cx="${f(mx)}" cy="${f(my + h - 6)}" rx="9" ry="5" fill="#E2707F"/>` : ''}`; break; }
      case 'teeth': o += `<rect x="${f(mx - 18)}" y="${f(my - 6)}" width="36" height="15" rx="6" fill="${W}" stroke="${INK}" stroke-width="5"/><path d="M${f(mx - 18)},${f(my + 1.5)} L${f(mx + 18)},${f(my + 1.5)} M${f(mx - 6)},${f(my - 6)} L${f(mx - 6)},${f(my + 9)} M${f(mx + 6)},${f(my - 6)} L${f(mx + 6)},${f(my + 9)}" stroke="${INK}" stroke-width="2.5"/>`; break;
      default: o += M(`M${f(mx - 16)},${f(my - 2)} Q${f(mx)},${f(my + 12)} ${f(mx + 16)},${f(my - 4)}`);
    }
    return o;
  }
  // ---------- parts
  // rubber-hose limb: quadratic curve from a to b, bent sideways by `bend` × length; outline + fill strokes
  function hose(a, b, bend, wOut, wIn, col) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
    const cx = mx - dy * bend, cy = my + dx * bend;
    const d = `M${f(a[0])},${f(a[1])} Q${f(cx)},${f(cy)} ${f(b[0])},${f(b[1])}`;
    return `<path d="${d}" stroke="${INK}" stroke-width="${wOut}" fill="none" stroke-linecap="round"/>` + (wIn ? `<path d="${d}" stroke="${col}" stroke-width="${wIn}" fill="none" stroke-linecap="round"/>` : '');
  }
  function hand(p, from, kind, rot) {
    const ang = Math.atan2(p[1] - from[1], p[0] - from[0]) + (rot || 0), c = Math.cos(ang), s = Math.sin(ang);
    const T = (u, v) => [p[0] + c * u - s * v, p[1] + s * u + c * v];
    let o = '';
    const blob = (q, rx, ry, a) => `<ellipse cx="${f(q[0])}" cy="${f(q[1])}" rx="${rx}" ry="${ry}" transform="rotate(${f((a * 180) / Math.PI)} ${f(q[0])} ${f(q[1])})" fill="${W}" stroke="${INK}" stroke-width="6"/>`;
    if (kind === 'open' || kind === 'wave') { o += blob(T(10, 0), 17, 14, ang); o += blob(T(4, -14), 7, 5, ang - 0.7); }
    else if (kind === 'point') { o += `<path d="M${f(T(8, 0)[0])},${f(T(8, 0)[1])} L${f(T(34, 0)[0])},${f(T(34, 0)[1])}" stroke="${INK}" stroke-width="14" stroke-linecap="round"/><path d="M${f(T(8, 0)[0])},${f(T(8, 0)[1])} L${f(T(34, 0)[0])},${f(T(34, 0)[1])}" stroke="${W}" stroke-width="6" stroke-linecap="round"/>`; o += blob(T(6, 0), 13, 13, ang); }
    else { o += blob(T(7, 0), 14, 13, ang); o += blob(T(9, -10), 6, 5, ang); }
    return o;
  }
  function shoe(p, dir, rot) {
    const d = dir, x = p[0], y = p[1];
    const P = (u, v) => `${f(x + u * d)},${f(y + v)}`;
    return `<g transform="rotate(${f(((rot || 0) * 180) / Math.PI * d)} ${f(x)} ${f(y - 12)})"><path d="M${P(-20, 0)} L${P(30, 0)} Q${P(42, 0)} ${P(42, -11)} Q${P(40, -24)} ${P(16, -26)} L${P(-14, -26)} Q${P(-22, -26)} ${P(-22, -15)} Z" fill="${W}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><path d="M${P(-20, -7)} L${P(40, -7)}" stroke="#C9CED6" stroke-width="4"/></g>`;
  }
  function hair(cx, cy, r, fx) {
    // curly top: overlapping curls merged into one outlined mass, plus a few curl swirls and fringe curls
    const C = [];
    for (let i = 0; i < 15; i++) { const a = Math.PI * (1.06 + (i / 14) * 0.88), rr = r * (0.9 + ((i * 37) % 7) / 40); C.push([cx + Math.cos(a) * rr * 0.98 + fx * 6, cy + Math.sin(a) * rr * 0.95 - 8, 19 + ((i * 53) % 5) * 2]); }
    for (let i = 0; i < 6; i++) C.push([cx - r * 0.55 + i * r * 0.22 + fx * 10, cy - r * 0.95 - 6 - ((i * 29) % 3) * 6, 21]);
    for (let i = 0; i < 4; i++) C.push([cx - r * 0.5 + i * r * 0.33 + fx * 14, cy - r * 0.62 + ((i * 17) % 2) * 5, 14]);   // fringe curls
    let o = C.map(([x, y, rr]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr + 5)}" fill="${INK}"/>`).join('');
    o += C.map(([x, y, rr]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="${HAIR}"/>`).join('');
    o += C.filter((_, i) => i % 2 === 0).map(([x, y, rr]) => `<path d="M${f(x - rr * 0.45)},${f(y + rr * 0.1)} a${f(rr * 0.42)},${f(rr * 0.42)} 0 1 1 ${f(rr * 0.6)},${f(rr * 0.25)}" stroke="${HAIR_L}" stroke-width="3" fill="none" stroke-linecap="round"/>`).join('');
    return o;
  }
  // headphones: cups sit on the ears; when the head turns, the far cup slides behind the head (drawn in the 'back' layer)
  function phones(cx, cy, r, fx, layer) {
    const th = fx * 0.75, cL = cx - r * Math.cos(th) * 1.0 + r * Math.sin(th) * 0.0, cR = cx + r * Math.cos(th);
    const backL = fx < -0.18, backR = fx > 0.18;
    const cup = (x, k) => `<ellipse cx="${f(x)}" cy="${f(cy + 2)}" rx="${f(17 * k)}" ry="27" fill="${CUP}" stroke="${INK}" stroke-width="6"/><ellipse cx="${f(x)}" cy="${f(cy + 2)}" rx="${f(10 * k)}" ry="19" fill="none" stroke="${YEL}" stroke-width="4"/>`;
    const xl = cL + (backL ? 0 : Math.max(0, fx) * 8), xr = cR + (backR ? 0 : Math.min(0, fx) * 8);
    if (layer === 'back') return (backL ? cup(cx - r * Math.cos(th) - 6, 0.9) : '') + (backR ? cup(cx + r * Math.cos(th) + 6, 0.9) : '');
    const yl = backL ? cy - r * 0.62 : cy - 8, yr = backR ? cy - r * 0.62 : cy - 8;   // band tucks into the hair on the far side
    const xl2 = backL ? cx - r * 0.75 : xl, xr2 = backR ? cx + r * 0.75 : xr;
    const band = `M${f(xl2)},${f(yl)} C${f(xl2 - 6)},${f(cy - r * 1.75)} ${f(xr2 + 6)},${f(cy - r * 1.75)} ${f(xr2)},${f(yr)}`;
    let o = `<path d="${band}" stroke="${INK}" stroke-width="20" fill="none" stroke-linecap="round"/><path d="${band}" stroke="${PHONE}" stroke-width="10" fill="none" stroke-linecap="round"/>`;
    if (!backL) o += cup(xl, 1 - Math.max(0, fx) * 0.3);
    if (!backR) o += cup(xr, 1 + Math.min(0, fx) * 0.3);
    return o;
  }
  function gear(cx, cy, r) {
    let d = ''; const n = 8;
    for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r * 0.74 : r, a0 = a - Math.PI / (n * 2) * 0.55, a1 = a + Math.PI / (n * 2) * 0.55; d += `${i ? 'L' : 'M'}${f(cx + Math.cos(a0) * rr)},${f(cy + Math.sin(a0) * rr)}L${f(cx + Math.cos(a1) * rr)},${f(cy + Math.sin(a1) * rr)}`; }
    return `<path d="${d}Z" fill="${W}"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.33)}" fill="${TEE}"/>`;
  }

  function draw(pin) {
    const st = Object.assign({}, D, pin);
    st.armL = Object.assign({}, D.armL, pin.armL); st.armR = Object.assign({}, D.armR, pin.armR);
    st.legL = Object.assign({}, D.legL, pin.legL); st.legR = Object.assign({}, D.legR, pin.legR);
    if (st.alpha <= 0) return '';
    const d = st.dir;
    const hipY = -LEG + st.crouch * CROUCH - st.bob + (st.sit || 0) * (LEG - 42);
    const hip = [0, hipY];
    // lower body: legs (thick black hoses) + shoes, in local space (not leaned)
    const legs = [['legL', -1], ['legR', 1]];
    let lower = '';
    for (const [k, sgn] of legs) {
      const L = st[k];
      const root = [hip[0] + sgn * 13, hip[1] + 4];
      // feet are in ground space (y = L.y − 150; 150 = on the floor), so crouch / bob / sit move the hip, not the feet
      const foot = [hip[0] + L.x, L.y - 150];
      const ankle = [foot[0] - d * 4, foot[1] - 16];
      lower += hose(root, ankle, L.bend + st.crouch * 0.35 * -sgn * d, 21, 0, INK);
      lower += shoe(foot, d, L.rot || 0);
    }
    // upper body group, leaned around the hip
    const sq = st.squash, bodyRy = BRY * sq, bodyRx = BRX / Math.sqrt(sq);
    const bodyC = [0, hipY - bodyRy + 8];
    const sx = shoulderX(st), shL = [bodyC[0] - sx, bodyC[1] - bodyRy * 0.58], shR = [bodyC[0] + sx, bodyC[1] - bodyRy * 0.58];
    const headR = 66, headC = [st.headDX + d * 4, bodyC[1] - bodyRy - headR + 18];
    let up = '';
    // arms behind/in front: back arm first
    const arm = (k, sh, hk, rk) => { const A = st[k]; const h = [sh[0] + A.x, sh[1] + A.y]; return hose(sh, h, A.bend, 19, 9, W) + hand(h, sh, st[hk], st[rk]); };
    const backArm = d > 0 ? ['armL', shL, 'handL', 'handRotL'] : ['armR', shR, 'handR', 'handRotR'];
    const frontArm = d > 0 ? ['armR', shR, 'handR', 'handRotR'] : ['armL', shL, 'handL', 'handRotL'];
    up += arm(...backArm);
    // body: egg tee with hem + gear
    up += `<ellipse cx="${f(bodyC[0])}" cy="${f(bodyC[1])}" rx="${f(bodyRx)}" ry="${f(bodyRy)}" fill="${TEE}" stroke="${INK}" stroke-width="7"/>`;
    up += `<path d="M${f(bodyC[0] - bodyRx * 0.82)},${f(bodyC[1] + bodyRy * 0.62)} Q${f(bodyC[0])},${f(bodyC[1] + bodyRy * 0.86)} ${f(bodyC[0] + bodyRx * 0.82)},${f(bodyC[1] + bodyRy * 0.62)}" stroke="${TEE_D}" stroke-width="5" fill="none"/>`;
    up += gear(bodyC[0] + d * 14 + st.face * 6, bodyC[1] - bodyRy * 0.25, 10);
    // head (tilted)
    let head = phones(headC[0], headC[1], headR, st.face, 'back') + `<circle cx="${f(headC[0])}" cy="${f(headC[1])}" r="${headR}" fill="${W}" stroke="${INK}" stroke-width="8"/>`;
    head += face(headC[0], headC[1], st);
    head += hair(headC[0], headC[1], headR, st.face);
    head += phones(headC[0], headC[1], headR, st.face, 'front');
    up += `<g transform="rotate(${f((st.headTilt * 180) / Math.PI)} ${f(headC[0])} ${f(headC[1] + headR * 0.8)})">${head}</g>`;
    up += arm(...frontArm);
    const upper = `<g transform="rotate(${f((st.lean * 180) / Math.PI * d)} ${f(hip[0])} ${f(hip[1])})">${up}</g>`;
    return `<g transform="translate(${f(st.x)} ${f(st.y)}) scale(${f(st.s)})" opacity="${st.alpha}">` +
      `<ellipse cx="0" cy="2" rx="58" ry="11" fill="#000" opacity="0.18"/>` + lower + upper + `</g>`;
  }
  // ---------- geometry helpers (world space), so hands can grab exact points (keys, handles)
  function frame(pin) {
    const st = Object.assign({}, D, pin);
    const hipY = -LEG + st.crouch * CROUCH - st.bob + (st.sit || 0) * (LEG - 42), sq = st.squash, bodyRy = BRY * sq;
    const bodyCy = hipY - bodyRy + 8, shY = bodyCy - bodyRy * 0.58, sx = shoulderX(st);
    const ang = st.lean * st.dir, c = Math.cos(ang), sn = Math.sin(ang);
    const toW = (lx, ly) => { const dx = lx, dy = ly - hipY; return [st.x + st.s * (dx * c - dy * sn), st.y + st.s * (hipY + dx * sn + dy * c)]; };
    const toL = (wx, wy) => { const lx = (wx - st.x) / st.s, ly = (wy - st.y) / st.s - hipY; return [lx * c + ly * sn, hipY - lx * sn + ly * c]; };
    return { st, hipY, shL: [-sx, shY], shR: [sx, shY], toW, toL };
  }
  // world position of a hand
  function handPos(pin, side) { const F = frame(pin), sh = side === 'L' ? F.shL : F.shR, A = Object.assign({}, side === 'L' ? D.armL : D.armR, pin[side === 'L' ? 'armL' : 'armR']); return F.toW(sh[0] + A.x, sh[1] + A.y); }
  // arm offset {x,y} that puts the hand on a world point
  function reach(pin, side, wp) { const F = frame(pin), sh = side === 'L' ? F.shL : F.shR, l = F.toL(wp[0], wp[1]); return { x: l[0] - sh[0], y: l[1] - sh[1] }; }
  return { draw, EX, defaults: D, handPos, reach };
})();
if (typeof window !== 'undefined') window.Guide2D = Guide2D;
if (typeof module !== 'undefined') module.exports = Guide2D;
