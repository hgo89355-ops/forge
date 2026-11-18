/* LockCutaway — reusable, physically-driven pin-tumbler lock cutaway (SVG).
 * Works in any frame size: create(group, {ox, oy, k, inset}) maps lock millimetres to stage pixels.
 * Geometry is Schlage-style (see SOURCES.md). The plug can only turn when every key-pin/driver-pin
 * gap sits on the shear line (|gap - shear| < TOL); otherwise the requested turn is clamped to play.
 *
 * Usage:
 *   const lock = LockCutaway.create(svgGroup, { ox: 540, oy: 820, k: 18, inset: {cx: 850, cy: 470, k: 11} });
 *   lock.render(state);              // state documented in DEFAULTS below
 *   lock.toStage(xmm, ymm, state)    // -> [px, py] for pointing / attaching characters
 */
const LockCutaway = (function () {
  const C = {
    ink: '#1E1F24', bg: '#F6F3EC', cavity: '#EDEAE2', housing: '#D9DCE1', plug: '#C3C8D0',
    hatchA: '#AEB3BC', hatchB: '#9FA5AF', keyPin: '#F08A24', keyPinDark: '#B85E0E', driver: '#4C525E',
    key: '#D3D8DE', keyShade: '#B9BFC7', ok: '#1E9E57', bad: '#E0393E', spring: '#3A3E47',
  };
  const G = {
    R: 6.35, shear: 6.35, chamberTop: 16.2, housingTop: 17.6, housingBot: -9.6, plugLen: 28.5,
    housingL: -0.6, housingR: 30.4,
    pinX: [5.84, 9.8, 13.76, 17.72, 21.68], pinW: 2.9, chW: 3.25,
    bladeBot: -5.6, keywayTop: 3.35, depth0: 8.51, step: 0.381, rootHalf: 0.4, flank: 0.84,
    tipStart: 24.4, tipLen: 26.8, driverLen: 6.6, restBottom: -3.3,
    correct: [4, 6, 2, 7, 3], TOL: 0.05,
  };
  // key-pin lengths: correct key puts every key-pin top exactly on the shear line
  const KEYPIN_LEN = G.correct.map((d) => G.shear - (G.bladeBot + (G.depth0 - d * G.step)));

  function keyHeight(u, bit) {
    if (u < 0 || u > G.tipLen) return null;
    let h = G.depth0;
    for (let i = 0; i < bit.length; i++) {
      const hi = G.depth0 - bit[i] * G.step;
      const d = Math.max(0, Math.abs(u - G.pinX[i]) - G.rootHalf);
      h = Math.min(h, hi + d * G.flank);
    }
    if (u > G.tipStart) h = Math.min(h, G.depth0 - (u - G.tipStart) * 1.55);
    return h;
  }

  // physical pin stacks for a key pulled out by s mm (s = 0 fully inserted); no key => key = null
  function stacks(key) {
    return G.pinX.map((x, i) => {
      let kb = G.keywayTop + 0.6 - KEYPIN_LEN[i]; // pin hangs into the keyway, top just inside the plug bore
      if (key) {
        const h = keyHeight(x + key.s, key.bitting);
        if (h !== null) kb = Math.max(kb, G.bladeBot + h);
      }
      const kt = kb + KEYPIN_LEN[i];
      return { i, x, kb, kt, db: kt, dt: kt + G.driverLen, gap: kt - G.shear };
    });
  }
  function canTurn(st) {
    return !!st.key && Math.abs(st.key.s) < 0.02 && st._stacks.every((p) => Math.abs(p.gap) < G.TOL);
  }

  const DEFAULTS = {
    view: null,               // {cx, cy, zoom} in mm; null = base
    key: null,                // {s, bitting:[..5], tag:null|'#hex', codes:0..1, alpha:1}
    turn: 0,                  // requested plug turn, degrees (0..90). Physics clamps it.
    showShear: 0,             // 0..1 draw-on of the shear line
    shearState: 'neutral',    // neutral | ok | bad
    crossMarks: 0,            // 0..1 red marks where drivers cross the shear line
    gapOk: [0, 0, 0, 0, 0],   // 0..1 per pin: green gap ring
    pinFlash: [0, 0, 0, 0, 0],// 0..1 per pin: outline emphasis
    springPush: 0,            // 0..1 down-arrows on springs
    plugFlash: 0,             // 0..1 plug outline emphasis
    measure: null,            // {pin, a:0..1, text}
    labels: [],               // [{text, ax, ay (mm anchor), tx, ty (stage px), a, color, align}]
    inset: 0,                 // 0..1 end-view alpha
    alpha: 1,
  };

  function create(group, opts) {
    const inst = { group, opts: Object.assign({ ox: 540, oy: 820, k: 18, cx: 7, cy: 4, inset: null }, opts) };
    const svg = group.ownerSVGElement;
    const uid = 'lc' + Math.floor(Math.abs(opts.ox * 7 + opts.oy * 13 + opts.k * 17)) ;
    if (svg && !svg.querySelector('#' + uid + '-hA')) {
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.innerHTML =
        `<pattern id="${uid}-hA" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)"><rect width="14" height="14" fill="${C.housing}"/><line x1="0" y1="0" x2="0" y2="14" stroke="${C.hatchA}" stroke-width="2"/></pattern>` +
        `<pattern id="${uid}-hB" patternUnits="userSpaceOnUse" width="11" height="11" patternTransform="rotate(-45)"><rect width="11" height="11" fill="${C.plug}"/><line x1="0" y1="0" x2="0" y2="11" stroke="${C.hatchB}" stroke-width="1.6"/></pattern>`;
      svg.insertBefore(defs, svg.firstChild);
    }
    inst.uid = uid;

    inst.mapper = function (st) {
      const o = inst.opts, v = st.view || {};
      const cx = v.cx ?? o.cx, cy = v.cy ?? o.cy, z = v.zoom ?? 1, k = o.k * z;
      return { k, z, P: (x, y) => [o.ox + (x - cx) * k, o.oy - (y - cy) * k] };
    };
    inst.toStage = function (x, y, st) { return inst.mapper(Object.assign({}, DEFAULTS, st)).P(x, y); };
    inst.stacks = function (st) { return stacks(st.key); };
    inst.geometry = G;
    inst.colors = C;

    inst.render = function (stIn) {
      const st = Object.assign({}, DEFAULTS, stIn);
      st._stacks = stacks(st.key);
      const turnable = canTurn(st);
      // physics: a blocked plug only shows ~2 degrees of play
      const turn = turnable ? st.turn : Math.max(-2.2, Math.min(2.2, st.turn));
      st._turnActual = turn;
      st._turnable = turnable;
      inst.lastTurnActual = turn; inst.lastTurnable = turnable;
      const { k, z, P } = inst.mapper(st);
      const lw = (w) => (w * Math.sqrt(Math.min(z, 3))).toFixed(2);
      const f = (n) => n.toFixed(1);
      const rect = (x0, y0, x1, y1) => { const a = P(x0, y1), b = P(x1, y0); return [a[0], a[1], b[0] - a[0], b[1] - a[1]]; };
      const cosT = Math.cos((turn * Math.PI) / 180);
      // plug-attached features are projected: y -> y*cos(turn)
      const Pp = (x, y) => P(x, y * cosT);
      let s = '';

      // ---- housing (with chamber cavities)
      {
        const [x, y, w, h] = rect(G.housingL, G.housingBot, G.housingR, G.housingTop);
        s += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(1.2 * k)}" fill="url(#${uid}-hA)" stroke="${C.ink}" stroke-width="${lw(4)}"/>`;
      }
      // ---- plug body
      {
        const [x, y, w, h] = rect(0, -G.R, G.plugLen, G.R);
        s += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="url(#${uid}-hB)" stroke="${C.ink}" stroke-width="${lw(st.plugFlash > 0 ? 4 + 4 * st.plugFlash : 3)}"/>`;
        // cylinder shading band shows rotation
        if (Math.abs(turn) > 0.01) {
          const yy = Math.sin((turn * Math.PI) / 180) * G.R * 0.8;
          const [bx, by, bw] = rect(0, yy - 0.6, G.plugLen, yy + 0.6);
          s += `<rect x="${f(bx)}" y="${f(by)}" width="${f(bw)}" height="${f(1.2 * k)}" fill="#ffffff" opacity="0.35"/>`;
        }
        // keyway cavity (plug-attached)
        const a = Pp(0, G.keywayTop), b = Pp(G.plugLen - 1.2, G.bladeBot - 0.35);
        s += `<rect x="${f(a[0])}" y="${f(a[1])}" width="${f(b[0] - a[0])}" height="${f(b[1] - a[1])}" fill="${C.cavity}" stroke="${C.ink}" stroke-width="${lw(1.5)}"/>`;
      }
      // ---- chambers: housing part (fixed) and plug part (rotates)
      for (const x of G.pinX) {
        const [hx, hy, hw, hh] = rect(x - G.chW / 2, G.shear, x + G.chW / 2, G.chamberTop);
        s += `<rect x="${f(hx)}" y="${f(hy)}" width="${f(hw)}" height="${f(hh)}" fill="${C.cavity}" stroke="${C.ink}" stroke-width="${lw(1.5)}"/>`;
        const a = Pp(x - G.chW / 2, G.shear), b = Pp(x + G.chW / 2, G.keywayTop);
        s += `<rect x="${f(a[0])}" y="${f(a[1])}" width="${f(b[0] - a[0])}" height="${f(b[1] - a[1])}" fill="${C.cavity}"/>`;
      }
      // re-stroke the shear boundary (plug top edge)
      { const a = P(0, G.shear), b = P(G.plugLen, G.shear); s += `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="${C.ink}" stroke-width="${lw(2)}"/>`; }

      // ---- key (plug-attached when inside; bow outside also foreshortens)
      if (st.key) {
        const kk = st.key, sx = -kk.s;
        const top = [];
        for (let u = 0; u <= G.tipLen + 1e-6; u += 0.1) top.push([u, G.bladeBot + keyHeight(u, kk.bitting)]);
        let d = `M${Pp(sx + 0, G.bladeBot).map(f).join(',')}`;
        for (const [u, y] of top) d += `L${Pp(sx + u, y).map(f).join(',')}`;
        d += `L${Pp(sx + G.tipLen, G.bladeBot + 1.2).map(f).join(',')}L${Pp(sx + G.tipLen - 1.2, G.bladeBot).map(f).join(',')}Z`;
        const op = kk.alpha ?? 1;
        // bow + shoulder
        const bow = (u0, y0, u1, y1, r) => { const a = Pp(sx + u0, y1), b = Pp(sx + u1, y0); const h = Math.abs(b[1] - a[1]); return `<rect x="${f(a[0])}" y="${f(Math.min(a[1], b[1]))}" width="${f(b[0] - a[0])}" height="${f(Math.max(h, 2))}" rx="${f(Math.min(r * k, h / 2))}" fill="${C.key}" stroke="${C.ink}" stroke-width="${lw(3)}"/>`; };
        s += `<g opacity="${op}">`;
        s += bow(-15.5, -8.6, -2.4, 7.6, 4.2);
        s += bow(-2.6, -6.6, 0.15, 3.9, 0.4);
        const hc = Pp(sx - 12.2, 3.6);
        s += `<ellipse cx="${f(hc[0])}" cy="${f(hc[1])}" rx="${f(1.7 * k)}" ry="${f(Math.max(1.7 * k * Math.abs(cosT), 1))}" fill="${C.bg}" stroke="${C.ink}" stroke-width="${lw(2.5)}"/>`;
        if (kk.tag) {
          const tg = Pp(sx - 13.4, -5.2);
          s += `<rect x="${f(tg[0] - 0.9 * k)}" y="${f(tg[1] - 1.6 * k * Math.abs(cosT))}" width="${f(5.2 * k)}" height="${f(Math.max(3.2 * k * Math.abs(cosT), 2))}" rx="${f(0.6 * k)}" fill="${kk.tag}" stroke="${C.ink}" stroke-width="${lw(2.5)}"/>`;
        }
        s += `<path d="${d}" fill="${C.key}" stroke="${C.ink}" stroke-width="${lw(3)}" stroke-linejoin="round"/>`;
        const g1 = Pp(sx + 0.4, G.bladeBot + 2.2), g2 = Pp(sx + G.tipLen - 2.0, G.bladeBot + 2.2);
        s += `<line x1="${f(g1[0])}" y1="${f(g1[1])}" x2="${f(g2[0])}" y2="${f(g2[1])}" stroke="${C.keyShade}" stroke-width="${lw(5)}" stroke-linecap="round"/>`;
        if ((kk.codes || 0) > 0) {
          kk.bitting.forEach((dpt, i) => {
            const a = Math.max(0, Math.min(1, kk.codes * 5 - i));
            if (a <= 0) return;
            const p = Pp(sx + G.pinX[i], G.bladeBot + G.depth0 + 2.6);
            const sc = 0.6 + 0.4 * a;
            s += `<text x="${f(p[0])}" y="${f(p[1])}" font-family="Inter" font-weight="900" font-size="${f(46 * sc)}" text-anchor="middle" fill="${C.keyPinDark}" opacity="${a}">${dpt}</text>`;
          });
        }
        s += `</g>`;
      }

      // ---- pins + springs
      st._stacks.forEach((p, i) => {
        const half = G.pinW / 2;
        // spring (housing, fixed): from driver top to chamber top
        const top = G.chamberTop, bot = p.dt;
        const coils = 7, sw = 1.25;
        let sd = '';
        for (let c = 0; c <= coils * 2; c++) {
          const y = bot + ((top - bot) * c) / (coils * 2);
          const x = p.x + (c === 0 || c === coils * 2 ? 0 : c % 2 ? sw : -sw);
          const q = P(x, y); sd += (c ? 'L' : 'M') + f(q[0]) + ',' + f(q[1]);
        }
        s += `<path d="${sd}" fill="none" stroke="${C.spring}" stroke-width="${lw(3)}" stroke-linejoin="round"/>`;
        if (st.springPush > 0) {
          const q = P(p.x, top - 1.2), L = 26 * st.springPush;
          s += `<path d="M${f(q[0])},${f(q[1] - L)}L${f(q[0])},${f(q[1])}M${f(q[0] - 9)},${f(q[1] - 10)}L${f(q[0])},${f(q[1])}L${f(q[0] + 9)},${f(q[1] - 10)}" stroke="${C.ink}" stroke-width="5" fill="none" stroke-linecap="round" opacity="${st.springPush}"/>`;
        }
        // driver pin: rests on the plug surface if the plug has turned away
        let db = p.db, dt = p.dt;
        if (Math.abs(turn) > 2.3) { db = Math.max(db, G.shear); dt = db + G.driverLen; }
        {
          const [x, y, w, h] = rect(p.x - half, db, p.x + half, dt);
          const fl = st.pinFlash[i] || 0;
          s += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(0.35 * k)}" fill="${C.driver}" stroke="${C.ink}" stroke-width="${lw(2.5 + 3 * fl)}"/>`;
        }
        // key pin (plug-attached, pointed tip)
        {
          const ch = 0.9;
          const pts = [[p.x - half, p.kt], [p.x + half, p.kt], [p.x + half, p.kb + ch], [p.x + 0.35, p.kb], [p.x - 0.35, p.kb], [p.x - half, p.kb + ch]]
            .map(([x, y]) => Pp(x, y).map(f).join(',')).join(' ');
          const fl = st.pinFlash[i] || 0;
          s += `<polygon points="${pts}" fill="${C.keyPin}" stroke="${C.ink}" stroke-width="${lw(2.5 + 3 * fl)}" stroke-linejoin="round"/>`;
        }
      });

      // ---- shear line
      if (st.showShear > 0) {
        const col = st.shearState === 'ok' ? C.ok : st.shearState === 'bad' ? C.bad : C.ink;
        const x0 = -1.2, x1 = x0 + (G.housingR + 1.0 - x0) * Math.min(1, st.showShear);
        const a = P(x0, G.shear), b = P(x1, G.shear);
        const dash = st.shearState === 'ok' ? '' : `stroke-dasharray="${f(16)} ${f(10)}"`;
        s += `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="${col}" stroke-width="${st.shearState === 'ok' ? 9 : 6}" ${dash} stroke-linecap="round"/>`;
      }
      // red marks where a driver (or key pin) crosses the shear line
      if (st.crossMarks > 0) {
        st._stacks.forEach((p) => {
          const crosses = Math.abs(p.gap) >= G.TOL;
          if (!crosses) return;
          const q = P(p.x, G.shear), r = 16 * st.crossMarks * Math.sqrt(Math.min(z, 3));
          s += `<g stroke="${C.bad}" stroke-width="7" stroke-linecap="round" opacity="${Math.min(1, st.crossMarks)}"><line x1="${f(q[0] - r)}" y1="${f(q[1] - r)}" x2="${f(q[0] + r)}" y2="${f(q[1] + r)}"/><line x1="${f(q[0] + r)}" y1="${f(q[1] - r)}" x2="${f(q[0] - r)}" y2="${f(q[1] + r)}"/></g>`;
        });
      }
      // green gap rings
      st._stacks.forEach((p, i) => {
        const a = st.gapOk[i] || 0;
        if (a <= 0) return;
        const ok = Math.abs(p.gap) < G.TOL;
        const q = Pp(p.x, p.kt);
        const r = (G.pinW * 0.5 + 0.9) * k;
        s += `<ellipse cx="${f(q[0])}" cy="${f(q[1])}" rx="${f(r * (0.6 + 0.4 * a))}" ry="${f(r * 0.45 * (0.6 + 0.4 * a))}" fill="none" stroke="${ok ? C.ok : C.bad}" stroke-width="6" opacity="${Math.min(1, a)}"/>`;
      });
      // measurement callout (gap between key-pin top and shear line)
      if (st.measure && st.measure.a > 0) {
        const p = st._stacks[st.measure.pin], a = st.measure.a;
        const xr = p.x + G.pinW / 2 + 0.55;
        const q1 = P(xr, p.kt), q2 = P(xr, G.shear);
        const tick = 12;
        s += `<g opacity="${a}" stroke="${C.bad}" stroke-width="5" stroke-linecap="round"><line x1="${f(q1[0])}" y1="${f(q1[1])}" x2="${f(q2[0])}" y2="${f(q2[1])}"/><line x1="${f(q1[0] - tick)}" y1="${f(q1[1])}" x2="${f(q1[0] + tick)}" y2="${f(q1[1])}"/><line x1="${f(q2[0] - tick)}" y1="${f(q2[1])}" x2="${f(q2[0] + tick)}" y2="${f(q2[1])}"/></g>`;
        const tx = q1[0] + 26, ty = (q1[1] + q2[1]) / 2 + 16;
        s += `<text x="${f(tx)}" y="${f(ty)}" font-family="Inter" font-weight="900" font-size="54" fill="${C.bad}" stroke="${C.bg}" stroke-width="10" paint-order="stroke" opacity="${a}">${st.measure.text}</text>`;
      }
      // labels with leader lines
      for (const L of st.labels) {
        if (!L.a || L.a <= 0) continue;
        const an = Pp(L.ax, L.ay);
        const col = L.color || C.ink;
        const fs = L.size || 40;
        const anchor = L.align || 'start';
        const tx = L.tx, ty = L.ty;
        // leader from text baseline edge to anchor
        const lx = anchor === 'end' ? tx + 10 : anchor === 'middle' ? tx : tx - 10;
        const ly = ty - fs * 0.35;
        const pr = Math.min(1, L.a * 1.6);
        const ex = lx + (an[0] - lx) * pr, ey = ly + (an[1] - ly) * pr;
        s += `<g opacity="${Math.min(1, L.a)}"><line x1="${f(lx)}" y1="${f(ly)}" x2="${f(ex)}" y2="${f(ey)}" stroke="${col}" stroke-width="4" stroke-linecap="round"/><circle cx="${f(an[0])}" cy="${f(an[1])}" r="${f(8 * pr)}" fill="${col}" stroke="${C.bg}" stroke-width="3"/>`;
        s += `<text x="${f(tx)}" y="${f(ty)}" font-family="Inter" font-weight="800" font-size="${fs}" letter-spacing="1" text-anchor="${anchor}" fill="${col}" stroke="${C.bg}" stroke-width="9" paint-order="stroke">${L.text}</text></g>`;
      }

      // ---- end-view inset (face of the lock, X-ray of the focus pin stack)
      if (inst.opts.inset && st.inset > 0) {
        const I = inst.opts.inset, ki = I.k, cx = I.cx, cy = I.cy;
        const fp = st._stacks[st.insetPin ?? 2];
        const Q = (x, y) => [cx + x * ki, cy - y * ki];
        let t = `<g opacity="${st.inset}">`;
        // housing face: circle + bible
        t += `<path d="M${f(cx - 11 * ki)},${f(cy)} A${f(11 * ki)},${f(11 * ki)} 0 0 0 ${f(cx + 11 * ki)},${f(cy)} L${f(cx + 4.4 * ki)},${f(cy - 18.2 * ki)} L${f(cx - 4.4 * ki)},${f(cy - 18.2 * ki)} Z" fill="${C.housing}" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"/>`;
        // fixed bible bore with spring + driver
        { const a = Q(-G.chW / 2, G.chamberTop), b = Q(G.chW / 2, G.shear); t += `<rect x="${f(a[0])}" y="${f(a[1])}" width="${f(b[0] - a[0])}" height="${f(b[1] - a[1])}" fill="${C.cavity}" stroke="${C.ink}" stroke-width="2"/>`; }
        let ddb = fp.db; if (Math.abs(turn) > 2.3) ddb = Math.max(ddb, G.shear);
        { const a = Q(-G.pinW / 2, ddb + G.driverLen), b = Q(G.pinW / 2, ddb); t += `<rect x="${f(a[0])}" y="${f(a[1])}" width="${f(b[0] - a[0])}" height="${f(b[1] - a[1])}" rx="3" fill="${C.driver}" stroke="${C.ink}" stroke-width="2.5"/>`; }
        // rotating plug
        t += `<g transform="rotate(${f(turn)} ${f(cx)} ${f(cy)})">`;
        t += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(G.R * ki)}" fill="${C.plug}" stroke="${C.ink}" stroke-width="4"/>`;
        // keyway profile (warded slot)
        const kw = [[-0.9, 4.2], [0.9, 4.2], [0.9, 1.2], [0.3, 0.6], [1.0, -0.8], [0.4, -2.0], [0.9, -5.8], [-0.9, -5.8], [-0.4, -2.6], [-1.0, -1.4], [-0.3, 0.0], [-0.9, 1.6]];
        t += `<polygon points="${kw.map(([x, y]) => Q(x, y).map(f).join(',')).join(' ')}" fill="${st.key && st.key.s < 26 ? C.key : C.cavity}" stroke="${C.ink}" stroke-width="2.5" stroke-linejoin="round"/>`;
        // plug bore + key pin of the focus stack
        { const a = Q(-G.chW / 2, G.shear), b = Q(G.chW / 2, G.keywayTop); t += `<rect x="${f(a[0])}" y="${f(a[1])}" width="${f(b[0] - a[0])}" height="${f(b[1] - a[1])}" fill="${C.cavity}" stroke="${C.ink}" stroke-width="2"/>`; }
        { const a = Q(-G.pinW / 2, fp.kt), b = Q(G.pinW / 2, Math.max(fp.kb, G.keywayTop - 0.2)); t += `<rect x="${f(a[0])}" y="${f(a[1])}" width="${f(b[0] - a[0])}" height="${f(b[1] - a[1])}" rx="3" fill="${C.keyPin}" stroke="${C.ink}" stroke-width="2.5"/>`; }
        t += `</g>`;
        // shear circle
        if (st.showShear > 0) {
          const col = st.shearState === 'ok' ? C.ok : st.shearState === 'bad' ? C.bad : C.ink;
          t += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(G.R * ki)}" fill="none" stroke="${col}" stroke-width="${st.shearState === 'ok' ? 7 : 5}" ${st.shearState === 'ok' ? '' : 'stroke-dasharray="12 8"'}/>`;
        }
        // turn arrow
        if (st.insetArrow > 0) {
          const r = 13.6 * ki, a0 = -120, a1 = a0 + 70 * st.insetArrow;
          const pa = (deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
          const p0 = pa(a0), p1 = pa(a1);
          const col = st.insetArrowColor || C.ink;
          t += `<path d="M${f(p0[0])},${f(p0[1])} A${f(r)},${f(r)} 0 0 1 ${f(p1[0])},${f(p1[1])}" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round"/>`;
          const ah = a1 * Math.PI / 180, tx = -Math.sin(ah), ty = Math.cos(ah);
          t += `<path d="M${f(p1[0] - tx * 4 + ty * 16)},${f(p1[1] - ty * 4 - tx * 16)} L${f(p1[0] + tx * 18)},${f(p1[1] + ty * 18)} L${f(p1[0] - tx * 4 - ty * 16)},${f(p1[1] - ty * 4 + tx * 16)}" fill="${col}"/>`;
        }
        if (st.insetLabel) t += `<text x="${f(cx)}" y="${f(cy + 11 * ki + 52)}" font-family="Inter" font-weight="800" font-size="34" text-anchor="middle" fill="${C.ink}">${st.insetLabel}</text>`;
        t += `</g>`;
        s += t;
      }
      group.setAttribute('opacity', st.alpha);
      group.innerHTML = s;
      return { turnActual: turn, turnable, stacks: st._stacks };
    };
    return inst;
  }
  return { create, geometry: G, colors: C, keyHeight, stacks: (key) => stacks(key), KEYPIN_LEN };
})();
if (typeof window !== 'undefined') window.LockCutaway = LockCutaway;
