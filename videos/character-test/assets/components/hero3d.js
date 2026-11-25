/* Hero3D — THE channel character, rendered as a 3D toon figure (Three.js r158, all code, no AI).
 * Locked DESIGN (owner model sheet): pure white skin, messy black hair (no hat), small black oval eyes, expressive
 * brows, electric-blue t-shirt with a small white gear emblem, dark navy jeans, white sneakers, ~18-year-old build.
 * RENDER: cel/toon shading (3 tones) + thin dark outline (inverted hull), lit by the scene's lights, soft contact shadow.
 * Units: cm (≈172 cm tall). Feet on y = 0, faces +z.
 *
 *   const h = Hero3D.create(THREE);  scene.add(h.root);
 *   h.pose(state)               // body + face (state below)
 *   h.reach('R', worldVec3, w)  // IK the hand grip onto a point, blended by w (0..1)
 *   Hero3D.ANIM.<clip>(t, ...)  // pure functions of time → state (seek-safe): idle, walk, point, reach, turnKey,
 *                               // jumpBack, celebrate, think
 * state: { x,y,z, face, lean, side, twist, crouch, bob, breathe, head:[nod,turn,tilt],
 *          armL/armR:{fwd,out,twist,bend,wrist}, legL/legR:{fwd,out,bend}, handL/handR: open|fist|point|hold,
 *          expr: neutral|curious|oops|shocked|confident|amazed|scared|proud|confused, blink: 0|1, gaze:[x,y] }
 */
const Hero3D = (function () {
  const EXPRS = ['neutral', 'curious', 'oops', 'shocked', 'confident', 'amazed', 'scared', 'proud', 'confused', 'determined', 'worried', 'panic', 'joy'];
  const D = {
    x: 0, y: 0, z: 0, face: 0, lean: 0, side: 0, twist: 0, crouch: 0, bob: 0, breathe: 0, head: [0, 0, 0],
    armL: { fwd: 0, out: 0.1, twist: 0, bend: 0.18, wrist: 0 }, armR: { fwd: 0, out: 0.1, twist: 0, bend: 0.18, wrist: 0 },
    legL: { fwd: 0, out: 0.04, bend: 0 }, legR: { fwd: 0, out: 0.04, bend: 0 },
    handL: 'open', handR: 'open', expr: 'neutral', blink: 0, gaze: [0, 0],
  };

  // ---------- face textures (drawn in code; swapped per expression) ----------
  // canvas spans the front of the head: 150° wide × 110° tall; drawn in "cm" around the head centre.
  const FACE = { W: 1024, H: 512, sx: 44.3, sy: 22.5 };
  function drawFace(ctx, ex, blink) {
    const { W, H, sx, sy } = FACE;
    ctx.clearRect(0, 0, W, H);
    const G = 1.5; ctx.save(); ctx.setTransform(sx * G, 0, 0, sy * G, W / 2, H / 2);
    const INK = '#121317';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const P = Object.assign({ eyes: 'open', eyeS: 1, browL: [0, 0], browR: [0, 0], mouth: 'smile', look: [0, 0] }, ex);
    // eyes (centres at ±2.55 cm, +0.7 cm)
    for (const s of [-1, 1]) {
      const cx = s * 2.3 + P.look[0] * 0.3, cy = -0.55 - P.look[1] * 0.25, e = blink ? 'closed' : P.eyes;
      ctx.fillStyle = INK; ctx.strokeStyle = INK;
      if (e === 'open' || e === 'wide' || e === 'small') {
        const k = e === 'wide' ? 1.3 : e === 'small' ? 0.75 : 1;
        ctx.beginPath(); ctx.ellipse(cx, cy, 0.55 * k * P.eyeS, 0.95 * k * P.eyeS, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(cx + 0.18 * k, cy - 0.38 * k, 0.17 * k, 0.24 * k, 0, 0, Math.PI * 2); ctx.fill();
      } else if (e === 'happy') {
        ctx.lineWidth = 0.32; ctx.beginPath(); ctx.moveTo(cx - 0.75, cy + 0.25); ctx.quadraticCurveTo(cx, cy - 0.85, cx + 0.75, cy + 0.25); ctx.stroke();
      } else if (e === 'half') {
        ctx.beginPath(); ctx.ellipse(cx, cy + 0.25, 0.55, 0.6, 0, 0, Math.PI); ctx.fill();
        ctx.lineWidth = 0.28; ctx.beginPath(); ctx.moveTo(cx - 0.75, cy + 0.2); ctx.lineTo(cx + 0.75, cy + 0.2); ctx.stroke();
      } else { // closed
        ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(cx - 0.7, cy + 0.1); ctx.quadraticCurveTo(cx, cy + 0.55, cx + 0.7, cy + 0.1); ctx.stroke();
      }
    }
    // brows: [lift (cm), angle (rad, + = inner end up)]
    ctx.strokeStyle = INK; ctx.lineWidth = 0.4;
    for (const s of [-1, 1]) {
      const [lift, ang] = s < 0 ? P.browR : P.browL;   // character's right brow is on screen-left
      const cx = s * 2.3, cy = -2.35 - lift * 0.8, L = 1.0;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      // inner end (toward the nose) is at -s
      const ix = cx - s * L * ca, iy = cy - L * sa, ox = cx + s * L * ca, oy = cy + L * sa;
      ctx.beginPath(); ctx.moveTo(ix, iy); ctx.quadraticCurveTo(cx, cy - 0.35, ox, oy); ctx.stroke();
    }
    // mouth (centre at 0, +3.9 cm)
    const my = 2.9;
    ctx.translate(0, my); ctx.scale(1.3, 1.3); ctx.translate(0, -my);
    ctx.lineWidth = 0.3; ctx.strokeStyle = INK;
    const openMouth = (w, h, teeth, tongue, shape) => {
      ctx.beginPath();
      if (shape === 'D') { ctx.moveTo(-w, my - h * 0.35); ctx.quadraticCurveTo(0, my - h * 0.55, w, my - h * 0.35); ctx.quadraticCurveTo(w * 0.85, my + h, 0, my + h); ctx.quadraticCurveTo(-w * 0.85, my + h, -w, my - h * 0.35); }
      else ctx.ellipse(0, my + h * 0.15, w, h * 0.7, 0, 0, Math.PI * 2);
      ctx.closePath(); ctx.fillStyle = '#5C1622'; ctx.fill();
      ctx.save(); ctx.clip();
      if (tongue) { ctx.fillStyle = '#E2707F'; ctx.beginPath(); ctx.ellipse(0, my + h * 0.85, w * 0.55, h * 0.45, 0, 0, Math.PI * 2); ctx.fill(); }
      if (teeth) { ctx.fillStyle = '#fff'; ctx.fillRect(-w, my - h * 0.7, w * 2, h * 0.42); }
      ctx.restore(); ctx.stroke();
    };
    switch (P.mouth) {
      case 'smile': ctx.beginPath(); ctx.moveTo(-1.1, my); ctx.quadraticCurveTo(0, my + 0.9, 1.1, my - 0.05); ctx.stroke(); break;
      case 'smirk': ctx.beginPath(); ctx.moveTo(-0.9, my + 0.25); ctx.quadraticCurveTo(0.3, my + 0.55, 1.15, my - 0.35); ctx.stroke(); break;
      case 'flat': ctx.beginPath(); ctx.moveTo(-0.8, my + 0.2); ctx.lineTo(0.8, my + 0.15); ctx.stroke(); break;
      case 'frown': ctx.beginPath(); ctx.moveTo(-0.9, my + 0.5); ctx.quadraticCurveTo(0, my - 0.3, 0.9, my + 0.5); ctx.stroke(); break;
      case 'wavy': ctx.beginPath(); ctx.moveTo(-1.1, my + 0.2); for (let i = 1; i <= 6; i++) ctx.quadraticCurveTo(-1.1 + (i - 0.5) * 0.37, my + (i % 2 ? -0.25 : 0.55), -1.1 + i * 0.37, my + 0.2); ctx.stroke(); break;
      case 'o': openMouth(0.42, 0.75, false, false, 'O'); break;
      case 'O': openMouth(0.7, 1.4, false, true, 'O'); break;
      case 'grin': openMouth(1.35, 0.95, true, false, 'D'); break;
      case 'bigGrin': openMouth(1.5, 1.45, true, true, 'D'); break;
      case 'scream': openMouth(0.95, 1.9, true, true, 'O'); break;
      case 'teeth': { ctx.beginPath(); ctx.roundRect(-1.35, my - 0.45, 2.7, 1.1, 0.45); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-1.35, my + 0.1); ctx.lineTo(1.35, my + 0.1); for (const x of [-0.7, 0, 0.7]) { ctx.moveTo(x, my - 0.45); ctx.lineTo(x, my + 0.65); } ctx.lineWidth = 0.14; ctx.stroke(); break; }
      case 'sideO': ctx.save(); ctx.translate(0.6, 0); openMouth(0.4, 0.6, false, false, 'O'); ctx.restore(); break;
      default: ctx.beginPath(); ctx.moveTo(-1.1, my); ctx.quadraticCurveTo(0, my + 0.9, 1.1, my - 0.05); ctx.stroke();
    }
    ctx.restore();
  }
  // the 8 approved expression designs (+ neutral)
  const EX = {
    neutral: { eyes: 'open', browL: [0, 0], browR: [0, 0], mouth: 'smile' },
    curious: { eyes: 'open', browL: [0.55, 0.1], browR: [-0.05, -0.05], mouth: 'sideO', look: [0.6, 0.4] },
    oops: { eyes: 'happy', browL: [0.45, 0.35], browR: [0.45, 0.35], mouth: 'grin' },
    shocked: { eyes: 'wide', browL: [0.9, 0.1], browR: [0.9, 0.1], mouth: 'O' },
    confident: { eyes: 'half', browL: [0.15, -0.25], browR: [0.35, 0.05], mouth: 'smirk' },
    amazed: { eyes: 'wide', eyeS: 1.05, browL: [0.75, 0.2], browR: [0.75, 0.2], mouth: 'bigGrin', look: [0, 0.5] },
    scared: { eyes: 'small', browL: [0.6, 0.55], browR: [0.6, 0.55], mouth: 'wavy' },
    proud: { eyes: 'happy', browL: [0.2, -0.1], browR: [0.2, -0.1], mouth: 'bigGrin' },
    confused: { eyes: 'open', browL: [0.7, 0.15], browR: [-0.15, -0.35], mouth: 'wavy', look: [-0.4, 0.3] },
    determined: { eyes: 'open', eyeS: 0.9, browL: [-0.25, -0.45], browR: [-0.25, -0.45], mouth: 'teeth' },
    worried: { eyes: 'open', browL: [0.55, 0.5], browR: [0.55, 0.5], mouth: 'wavy' },
    panic: { eyes: 'wide', eyeS: 1.1, browL: [1.0, 0.45], browR: [1.0, 0.45], mouth: 'scream' },
    joy: { eyes: 'happy', browL: [0.6, 0.15], browR: [0.6, 0.15], mouth: 'bigGrin' },
  };

  function create(THREE, opts = {}) {
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    // 3-tone ramp for cel shading
    const ramp = new THREE.DataTexture(new Uint8Array([120, 120, 120, 255, 200, 200, 200, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
    ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.generateMipmaps = false; ramp.needsUpdate = true;
    const toon = (c) => new THREE.MeshToonMaterial({ color: c, gradientMap: ramp });
    const M = {
      skin: toon('#FFFFFF'), tee: toon('#1E5BFF'), teeDark: toon('#1746D0'), jeans: toon('#25304A'), jeansDark: toon('#1C2538'),
      hair: toon('#17181C'), shoe: toon('#FFFFFF'), phone: toon('#23262E'), cup: toon('#1E5BFF'), yellow: toon('#F2C230'), sole: toon('#C9CED6'), lace: toon('#A4ACB8'), white: toon('#FFFFFF'),
    };
    const INK = 0x14151a;
    const outline = (w) => { const m = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }); m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${w.toFixed(2)};`); }; return m; };
    const OL = { s: outline(opts.build === 'stick' ? 0.36 : 0.26), m: outline(opts.build === 'stick' ? 0.6 : 0.4) };
    const mesh = (g, m, parent, p, r, ol = 'm') => {
      const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true;
      if (p) o.position.copy(p); if (r) o.rotation.set(r[0], r[1], r[2]);
      parent.add(o);
      if (ol) { const h = new THREE.Mesh(g, OL[ol]); h.castShadow = false; o.add(h); }
      return o;
    };
    const group = (parent, p) => { const g = new THREE.Group(); if (p) g.position.copy(p); parent.add(g); return g; };
    const limb = (r0, r1, len, seg = 40) => {   // smooth tapered limb pointing down −y, rounded ends
      const pts = [];
      for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(a) * r0, Math.cos(a) * r0 * 0.8)); }
      for (let i = 1; i < 16; i++) { const u = i / 16, r = r0 + (r1 - r0) * u + Math.sin(u * Math.PI) * 0.06 * r0; pts.push(new THREE.Vector2(r, -len * u)); }
      for (let i = 0; i <= 12; i++) { const a = Math.PI / 2 - (i / 12) * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(a) * r1, -len - Math.cos(a) * r1 * 0.8)); }
      pts.reverse(); return new THREE.LatheGeometry(pts, seg);
    };
    const scaled = (g, sx, sy, sz) => { g.scale(sx, sy, sz); return g; };

    const root = new THREE.Group(); root.name = 'hero3d';
    // build: 'hero' (default, ~18-year-old proportions) or 'stick' (stickman: big round head, simple body, even, normal-thickness limbs)
    const STICK = opts.build === 'stick';
    const B = STICK
      ? { H: 74, TH: 30, SH: 29, UA: 22, FA: 20, faceS: 1.72, faceY: 16.6, ts: [0.7, 0.72, 0.78], ua: [2.9, 2.9], fa: [2.9, 2.9], el: 2.9, th: [3.6, 3.6], sh: [3.6, 3.6], kn: 3.6, mitt: [3.1, 3.1, 3.1], mittY: -2.6, hipX: 4.0, sl: 0.66, shoeS: 0.82 }
      : { H: 90, TH: 39, SH: 37, UA: 27, FA: 24, faceS: 1.16, faceY: 13.2, ts: [1, 1, 1], ua: [4.1, 3.6], fa: [3.6, 2.8], el: 3.6, th: [6.6, 5.2], sh: [5.1, 4.6], kn: 5.2, mitt: [2.0, 4.6, 3.6], mittY: -4.4, hipX: 6.4, sl: 1, shoeS: 1 };
    const H = B.H, TS = B.ts;
    const hips = group(root, V(0, H, 0));
    // jeans: seat / hips
    mesh(scaled(new THREE.SphereGeometry(1, 28, 18), 11.8 * TS[0], 7.0, 7.4 * TS[2]), M.jeans, hips, V(0, -6.2, -0.4), null, null);
    const spine = group(hips), chest = group(spine);
    // t-shirt torso (rounded), hem, collar, gear emblem
    { if (STICK) {   // egg/bean body wearing the tee (stickman look)
        const bean = [[0, -9.5], [7.5, -9.3], [11.0, -7.2], [12.6, -3], [13.0, 3], [12.5, 10], [11.2, 17], [9.6, 23], [7.8, 28], [5.6, 31.6], [3.9, 33.0], [3.4, 33.2]];
        const g = new THREE.LatheGeometry(bean.map(([r, y]) => new THREE.Vector2(r, y)), 72); g.scale(1, 1, 0.82);
        mesh(g, M.tee, chest);
        const hem = new THREE.TorusGeometry(11.6, 0.5, 8, 48); hem.rotateX(Math.PI / 2); hem.scale(1, 1, 0.82);
        mesh(hem, M.teeDark, chest, V(0, -6.6, 0), null, null);
      } else {
        const prof = [[13.6, -8], [13.4, -4], [12.6, 6], [13.0, 16], [14.4, 26], [15.0, 33], [14.4, 39], [12.0, 43], [8.0, 45.4], [5.2, 46.1], [4.6, 46.2]];
        const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 72); g.scale(1.1 * TS[0], TS[1], 0.66 * TS[2]);
        mesh(g, M.tee, chest);
        const hem = new THREE.TorusGeometry(13.6, 0.55, 8, 48); hem.rotateX(Math.PI / 2); hem.scale(1.1 * TS[0], 1, 0.66 * TS[2]);
        mesh(hem, M.teeDark, chest, V(0, -7.6 * TS[1], 0), null, null);
      }
      const col = new THREE.TorusGeometry(5.0, 0.7, 8, 32); col.rotateX(Math.PI / 2 - 0.12); col.scale(1.05, 1, 0.8);
      mesh(col, M.teeDark, chest, V(0, 45.8 * TS[1], 0.2), null, 's');
      const gs = new THREE.Shape(), n = 8;
      for (let i = 0; i < n * 4; i++) { const a = (i / (n * 4)) * Math.PI * 2, rr = (i % 4 < 2) ? 2.0 : 1.55; i ? gs.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : gs.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      const hole = new THREE.Path(); hole.absarc(0, 0, 0.7, 0, Math.PI * 2, true); gs.holes.push(hole);
      const gear = mesh(new THREE.ExtrudeGeometry(gs, { depth: 0.12, bevelEnabled: false }), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), chest, STICK ? V(4.4, 19, 9.25) : V(5.6 * TS[0], 31 * TS[1], 9.7 * TS[2]), [0, STICK ? 0.42 : 0.33, 0], null);
      gear.castShadow = false;
    }
    // neck + head
    const neck = group(chest, V(0, 45 * TS[1], -0.3));
    if (STICK) mesh(limb(2.6, 2.6, 4), M.skin, neck, V(0, 4.5, 0), null, 's'); else mesh(limb(3.6, 4.0, 7), M.skin, neck, V(0, 6.5, 0), null, 's');
    const head = group(neck, V(0, 4.6, 0.4));
    const face = group(head, V(0, B.faceY, 0.6)); face.scale.setScalar(B.faceS);
    const R = 10.6;
    const deform = (g, rr) => {   // rounded head with a slightly longer jaw
      const pos = g.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i); const k = rr / R; let x = v.x / k, y = v.y / k, z = v.z / k;
        const t = STICK ? 0 : Math.max(0, Math.min(1, (-y - 1.0) / 8.5));
        x *= 1 - 0.2 * t * t; if (z > 0) z = z * (1 - 0.12 * t) + 0.7 * t * t * (z / R);
        y -= 0.9 * t * t;                                    // slightly longer jaw
        pos.setXYZ(i, x * (STICK ? 1 : 0.97) * k, y * (STICK ? 1.02 : 1.08) * k, z * (STICK ? 0.98 : 0.97) * k);
      }
      g.computeVertexNormals(); return g;
    };
    mesh(deform(new THREE.SphereGeometry(R, 64, 48), R), M.skin, face);
    // face shell with swappable expression textures
    const faceCanvas = document.createElement('canvas'); faceCanvas.width = FACE.W; faceCanvas.height = FACE.H;
    const faceTex = new THREE.CanvasTexture(faceCanvas); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 4;
    const fl = (150 * Math.PI) / 180, tl = (110 * Math.PI) / 180;
    const faceG = deform(new THREE.SphereGeometry(R * 1.004, 64, 48, Math.PI / 2 - fl / 2, fl, (35 * Math.PI) / 180, tl), R * 1.004);
    // phi in three.js runs so that u grows toward −x; flip u so canvas-left = screen-left
    { const uv = faceG.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i)); }
    const faceMesh = new THREE.Mesh(faceG, new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    faceMesh.renderOrder = 2; face.add(faceMesh);
    let faceKey = '';
    const setFace = (expr, blink, look) => {
      const k = expr + (blink ? ':b' : '') + ':' + (look ? look.map((v) => v.toFixed(2)).join(',') : '');
      if (k === faceKey) return; faceKey = k;
      const ex = Object.assign({}, EX[expr] || EX.neutral); if (look && (look[0] || look[1])) ex.look = look;
      drawFace(faceCanvas.getContext('2d'), ex, blink); faceTex.needsUpdate = true;
    };
    // ears (small, white)
    if (!STICK) for (const s of [-1, 1]) mesh(scaled(new THREE.SphereGeometry(1.5, 24, 16), 0.5, 1.0, 0.75), M.skin, face, V(s * 9.35, -0.6, -0.6), [0, s * 0.3, 0], 's');
    if (STICK) {   // smooth sculpted hair: one shell with a swept quiff + a few long smooth locks
      const hair = group(face);
      const g = new THREE.SphereGeometry(R, 96, 64, 0, Math.PI * 2, 0, Math.PI * 0.64), pos = g.attributes.position, n = new THREE.Vector3();
      const sm = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
      for (let i = 0; i < pos.count; i++) {
        n.fromBufferAttribute(pos, i).normalize();
        const side = Math.atan2(n.x, n.z);                                         // 0 = front
        const hy = n.z > 0 ? 0.34 + 0.16 * n.z - 0.12 * Math.max(0, n.x) : 0.1 + 0.4 * n.z;   // side part, lower on one side
        const m = sm(hy - 0.03, hy + 0.08, n.y);
        const quiff = 0.12 * Math.exp(-((n.z - 0.45) ** 2 / 0.12 + (n.y - 0.8) ** 2 / 0.08));
        const sweep = 0.05 * Math.sin(side * 6 + n.y * 3) * m;
        const r = R * (0.9 + m * (0.17 + 0.08 * Math.max(0, n.y) + quiff + sweep * 0.4));
        pos.setXYZ(i, n.x * r, n.y * r * 1.02, n.z * r * 0.98);
      }
      g.computeVertexNormals(); mesh(g, M.hair, hair);
      // curls: round blobs spread over the hair + a few spiral curls falling over the forehead
      const blob = new THREE.SphereGeometry(1, 20, 14);
      const N = 70, ga = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 1.3, rr = Math.sqrt(Math.max(0, 1 - y * y)), th = i * ga;
        const d = V(Math.cos(th) * rr, y, Math.sin(th) * rr);
        const hy = d.z > 0 ? 0.34 + 0.16 * d.z : 0.1 + 0.4 * d.z;
        if (d.y < hy + 0.04) continue;
        const rad = R * (1.03 + 0.08 * Math.max(0, d.y)), sz = 1.9 + 0.9 * ((i * 37) % 7) / 6;
        const c = mesh(blob, M.hair, hair, V(d.x * rad, d.y * rad * 1.02, d.z * rad * 0.98), null, 's');
        c.scale.set(sz, sz * 0.9, sz);
      }
      const spiral = (turns, r0, len) => { const pts = []; for (let k = 0; k <= 40; k++) { const u = k / 40, a = u * turns * Math.PI * 2; pts.push(V(Math.cos(a) * r0 * (1 - 0.35 * u), -u * len, Math.sin(a) * r0 * (1 - 0.35 * u))); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.75, 10); };
      for (const [x, y, z, rz, t, r0, l] of [[-4.2, 9.0, 8.4, 0.25, 1.6, 1.5, 5.0], [-0.6, 10.0, 8.6, -0.05, 1.8, 1.6, 5.6], [3.2, 9.4, 8.2, -0.3, 1.5, 1.4, 4.6], [6.6, 7.6, 6.4, -0.6, 1.3, 1.3, 4.0]]) {
        mesh(spiral(t, r0, l), M.hair, hair, V(x, y, z), [0.35, 0, rz], 's');
      }
      // headphones (signature): band over the hair, blue cups with a yellow ring
      const band = new THREE.TorusGeometry(R * 1.13, 0.95, 12, 64, Math.PI);
      const hp = group(face, V(0, 0.4, -0.6)); hp.rotation.z = 0;
      mesh(band, M.phone, hp);
      for (const s2 of [-1, 1]) {
        const cup = group(hp, V(s2 * R * 1.08, -0.2, 0)); cup.rotation.z = Math.PI / 2;
        const shell = new THREE.CylinderGeometry(3.6, 3.9, 2.6, 40); mesh(shell, M.cup, cup);
        const ring = new THREE.TorusGeometry(3.7, 0.42, 10, 40); ring.rotateX(Math.PI / 2); mesh(ring, M.yellow, cup, V(0, s2 * 1.35, 0), null, null);
        mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.5, 32), M.phone, cup, V(0, s2 * 1.6, 0), null, null);
        mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.0, 16), M.phone, hp, V(s2 * R * 1.11, 2.6, 0), null, 's');
      }
    } else {
    // hair: cap shell + chunky stylised clumps swept up and to one side (messy)
    { const hair = group(face);
      const g = new THREE.SphereGeometry(R, 72, 48, 0, Math.PI * 2, 0, Math.PI * 0.62), pos = g.attributes.position, n = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        n.fromBufferAttribute(pos, i).normalize();
        const hy = n.z > 0 ? 0.36 + 0.1 * n.z : 0.22 + 0.45 * n.z;
        const m = Math.max(0, Math.min(1, (n.y - hy + 0.06) / 0.14));
        const r = R * (0.9 + m * 0.17);
        pos.setXYZ(i, n.x * r * 0.97, n.y * r * 1.08 + 0.3, n.z * r * 0.97);
      }
      g.computeVertexNormals(); mesh(g, M.hair, hair);
      const clumpG = new THREE.LatheGeometry([[0, 0], [1.0, 0.12], [1.05, 0.32], [0.78, 0.58], [0.42, 0.82], [0.12, 0.97], [0, 1]].map(([r, y]) => new THREE.Vector2(r, y)), 16);
      // chunky swept clumps: [theta from top (+front/−back), phi (+ = character's left), width, length, sweep]
      const C = [[0.85, -0.45, 3.4, 6.5, [0.75, -0.1, 0.65]], [0.9, -0.05, 3.6, 7.0, [0.8, -0.05, 0.6]], [0.85, 0.35, 3.3, 6.5, [0.85, 0.0, 0.5]],
                 [0.55, -0.6, 3.2, 6.0, [0.6, 0.35, 0.35]], [0.5, 0.0, 3.8, 7.0, [0.55, 0.45, 0.4]], [0.5, 0.55, 3.2, 6.0, [0.8, 0.35, 0.25]],
                 [0.15, -0.35, 3.6, 6.0, [0.35, 0.6, -0.2]], [0.15, 0.35, 3.6, 6.0, [0.6, 0.55, -0.2]], [-0.3, 0.0, 3.8, 5.5, [0.2, 0.3, -0.85]], [1.0, 0.75, 2.6, 5.0, [0.9, -0.2, 0.3]]];
      for (const [th, ph, sz, len, sw] of C) {
        const dn = V(Math.sin(ph) * Math.cos(th * 0.5), Math.cos(th) * Math.cos(ph), Math.sin(th) * Math.cos(ph)).normalize();
        const p = V(dn.x * R * 0.97 * 0.97, dn.y * R * 1.08 * 0.97 + 0.3, dn.z * R * 0.97 * 0.97);
        const c = mesh(clumpG, M.hair, hair, p);
        c.quaternion.setFromUnitVectors(V(0, 1, 0), dn.clone().multiplyScalar(0.7).add(V(sw[0], sw[1], sw[2])).normalize());
        c.scale.set(sz, len, sz * 0.6);
      }
    }
    }
    // arms (white, tapered) with sleeves that follow the upper arm
    const UA = B.UA, FA = B.FA;
    const arms = {};
    for (const [side, s] of [['L', 1], ['R', -1]]) {
      const sh = group(chest, STICK ? V(s * 9.0, 27.5, -0.2) : V(s * 15.2 * TS[0], 40.5 * TS[1], -0.4));
      mesh(scaled(new THREE.SphereGeometry(5.6 * B.sl, 40, 28), 1, 0.95, 0.92), M.tee, sh, V(-s * 0.8 * B.sl, 0.6, 0));                  // shoulder
      const sl = mesh(limb(5.7 * B.sl, 5.2 * B.sl, 9.5 * (STICK ? 0.8 : 1)), M.tee, sh, V(0, 0.8, 0));                                                          // sleeve
      const slHem = new THREE.TorusGeometry(5.25 * B.sl, 0.45, 8, 28); slHem.rotateX(Math.PI / 2);
      mesh(slHem, M.teeDark, sh, V(0, STICK ? -7.4 : -9.2, 0), null, null);
      mesh(limb(B.ua[0], B.ua[1], UA - 1.5), M.skin, sh, V(0, -1.5, 0));
      const el = group(sh, V(0, -UA, 0));
      mesh(new THREE.SphereGeometry(B.el, 32, 20), M.skin, el, null, null, null);
      mesh(limb(B.fa[0], B.fa[1], FA), M.skin, el);
      const wr = group(el, V(0, -FA, 0));
      const hand = group(wr);
      // mitt: palm block + thumb + optional index finger
      const mitt = mesh(scaled(new THREE.SphereGeometry(1, 40, 28), B.mitt[0], B.mitt[1], B.mitt[2]), M.skin, hand, V(0, B.mittY, 0.2), null, 's');
      const thumb = group(hand, V(-s * 0.6, -2.2, 2.9)); mesh(limb(1.25, 1.05, 3.0, 12), M.skin, thumb, null, null, 's');
      const index = group(hand, V(0, -7.0, 1.6)); mesh(limb(1.05, 0.95, 4.2, 12), M.skin, index, null, null, 's');
      arms[side] = { s, sh, el, wr, hand, mitt, thumb, index };
    }
    // legs (navy jeans, tapered) + rounded white sneakers
    const TH = B.TH, SH = B.SH;
    const legs = {};
    for (const [side, s] of [['L', 1], ['R', -1]]) {
      const hp = group(hips, V(s * B.hipX, -8, 0));
      mesh(limb(B.th[0], B.th[1], TH), M.jeans, hp);
      const kn = group(hp, V(0, -TH, 0));
      mesh(new THREE.SphereGeometry(B.kn, 32, 20), M.jeans, kn, null, null, null);
      mesh(limb(B.sh[0], B.sh[1], SH - 2.5), M.jeans, kn);
      const cuff = new THREE.TorusGeometry(STICK ? 3.7 : 4.9, 0.6, 8, 24); cuff.rotateX(Math.PI / 2);
      mesh(cuff, M.jeansDark, kn, V(0, -SH + 3.0, 0), null, null);
      const an = group(kn, V(0, -SH, 0));
      const foot = group(an); foot.scale.setScalar(B.shoeS);
      const sp = new THREE.Shape();
      sp.moveTo(-6.4, 0); sp.lineTo(17.5, 0); sp.quadraticCurveTo(21.6, 0.2, 21.4, 3.6); sp.quadraticCurveTo(20.6, 6.6, 15.5, 7.4);
      sp.quadraticCurveTo(9, 8.6, 5.5, 10.2); sp.quadraticCurveTo(2.2, 11.6, -3.5, 11.2); sp.quadraticCurveTo(-7.2, 10.6, -7.3, 6.4); sp.lineTo(-7.3, 2.2); sp.quadraticCurveTo(-7.2, 0, -6.4, 0);
      const shoeG = new THREE.ExtrudeGeometry(sp, { depth: 6.0, bevelEnabled: true, bevelThickness: 2.4, bevelSize: 2.0, bevelSegments: 8, curveSegments: 28 });
      shoeG.rotateY(-Math.PI / 2); shoeG.translate(3.0, -6.0, 0); shoeG.computeVertexNormals();
      mesh(shoeG, M.shoe, foot);
      const ss = new THREE.Shape(); ss.moveTo(-7.8, -0.6); ss.lineTo(18.5, -0.6); ss.quadraticCurveTo(23.2, -0.4, 22.9, 2.0); ss.lineTo(-8.0, 2.0); ss.lineTo(-7.8, -0.6);
      const soleG = new THREE.ExtrudeGeometry(ss, { depth: 10.2, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6, bevelSegments: 4, curveSegments: 24 }); soleG.rotateY(-Math.PI / 2); soleG.translate(5.1, -6.3, 0);
      mesh(soleG, M.sole, foot, null, null, 's');
      for (let i = 0; i < 3; i++) mesh(new THREE.BoxGeometry(4.2, 0.45, 0.9), M.lace, foot, V(0, 3.4 - i * 0.95, 6.4 + i * 2.1), [-0.5, 0, 0], null);
      legs[side] = { s, hp, kn, an, foot };
    }
    // soft contact shadow (in addition to real shadows)
    const blob = new THREE.Mesh(new THREE.CircleGeometry(22, 40), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.15; blob.scale.set(1, 0.62, 1); blob.renderOrder = 1; root.add(blob);

    // ---------- pose ----------
    let state = Object.assign({}, D);
    function handShape(A, kind) {
      A.index.visible = kind === 'point';
      if (STICK) { A.mitt.scale.set(1, 1, 1); A.thumb.visible = false; A.index.rotation.set(0.25, 0, 0); return; }
      if (kind === 'open') { A.mitt.scale.set(1, 1.1, 1.08); A.thumb.rotation.set(1.05, 0, -A.s * 0.25); }
      else if (kind === 'point') { A.mitt.scale.set(1.1, 0.72, 1.0); A.thumb.rotation.set(0.6, 0, A.s * 0.35); A.index.rotation.set(0.25, 0, 0); }
      else if (kind === 'hold') { A.mitt.scale.set(1.15, 0.78, 1.02); A.thumb.rotation.set(0.25, 0, A.s * 0.5); }
      else { A.mitt.scale.set(1.15, 0.72, 0.98); A.thumb.rotation.set(0.45, 0, A.s * 0.55); }   // fist
    }
    function setArm(A, a) { A.sh.rotation.set(-a.fwd, A.s * (a.twist || 0), A.s * a.out, 'ZXY'); A.el.rotation.set(-(a.bend || 0), 0, 0); A.wr.rotation.set(0, a.wrist || 0, 0); }
    function setLeg(L, l, crouch) {
      L.hp.rotation.set(-(l.fwd || 0) - crouch * 0.9, 0, L.s * (l.out || 0));
      L.kn.rotation.set((l.bend || 0) + crouch * 1.75, 0, 0);
      L.an.rotation.set(-((l.fwd || 0) + (l.bend || 0)) * 0.35 - crouch * 0.85 + crouch * 0.9, 0, -L.s * (l.out || 0));
    }
    function pose(st) {
      const s = state = Object.assign({}, D, st);
      root.position.set(s.x, s.y, s.z); root.rotation.set(0, s.face, 0);
      hips.position.y = H - s.crouch * 20 + s.bob;
      spine.rotation.set(s.lean * 0.6 + s.crouch * 0.3, s.twist * 0.5, s.side);
      chest.rotation.set(s.lean * 0.4, s.twist * 0.5, 0);
      chest.scale.set(1 + s.breathe * 0.015, 1 + s.breathe * 0.01, 1 + s.breathe * 0.025);
      neck.rotation.set(s.head[0] * 0.4, s.head[1] * 0.4, s.head[2] * 0.4);
      head.rotation.set(s.head[0] * 0.6 - s.lean * 0.45, s.head[1] * 0.6, s.head[2] * 0.6);
      setArm(arms.L, Object.assign({}, D.armL, s.armL)); setArm(arms.R, Object.assign({}, D.armR, s.armR));
      setLeg(legs.L, Object.assign({}, D.legL, s.legL), s.crouch); setLeg(legs.R, Object.assign({}, D.legR, s.legR), s.crouch);
      handShape(arms.L, s.handL); handShape(arms.R, s.handR);
      setFace(s.expr, s.blink > 0.5, s.gaze);
      blob.scale.set(1 + s.crouch * 0.2 - Math.max(0, s.bob) * 0.008, 0.62, 1); blob.material.opacity = 0.16 * Math.max(0.3, 1 - Math.max(0, s.bob) * 0.03);
      root.updateMatrixWorld(true);
    }
    // ---------- two-bone IK, blended ----------
    const gripLocal = V(0, -4.4, 0.6), DOWN = V(0, -1, 0), tq = new THREE.Quaternion();
    function aim(bone, targetW) {
      bone.updateMatrixWorld(true);
      const dir = targetW.clone().sub(bone.getWorldPosition(new THREE.Vector3())).normalize();
      bone.parent.getWorldQuaternion(tq); dir.applyQuaternion(tq.clone().invert());
      return new THREE.Quaternion().setFromUnitVectors(DOWN, dir);
    }
    function reach(side, targetW, w = 1, poleW) {
      if (w <= 0) return;
      const A = arms[side]; root.updateMatrixWorld(true);
      const S = A.sh.getWorldPosition(new THREE.Vector3()), L1 = UA, L2 = FA + 4.4;
      const toT = targetW.clone().sub(S); let d = toT.length();
      d = Math.min(Math.max(d, Math.abs(L1 - L2) + 0.5), L1 + L2 - 0.3);
      const u = toT.normalize();
      const pole = (poleW || S.clone().add(V(A.s * 25, -40, -15).applyQuaternion(root.quaternion))).clone().sub(S);
      const wv = pole.sub(u.clone().multiplyScalar(pole.dot(u))).normalize();
      const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
      const E = S.clone().add(u.clone().multiplyScalar(a)).add(wv.multiplyScalar(h)), T = S.clone().add(u.multiplyScalar(d));
      const q0 = A.sh.quaternion.clone(), e0 = A.el.quaternion.clone();
      A.sh.quaternion.slerp(aim(A.sh, E), w); A.sh.updateMatrixWorld(true);
      const qe = (() => { A.el.quaternion.set(0, 0, 0, 1); const q = aim(A.el, T); return q; })();
      A.el.quaternion.copy(e0).slerp(qe, w); A.el.updateMatrixWorld(true);
      void q0;
    }
    function handGrip(side) { const A = arms[side]; A.hand.updateMatrixWorld(true); return A.hand.localToWorld(gripLocal.clone()); }
    pose({});
    return { root, pose, reach, handGrip, arms, legs, EXPRS, state: () => state };
  }

  // ---------- animation library: pure functions of time (seek-safe) ----------
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const ease = {
    io: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    out: (u) => 1 - Math.pow(1 - u, 3),
    backOut: (u, k = 1.7) => 1 + (k + 1) * Math.pow(u - 1, 3) + k * Math.pow(u - 1, 2),
    backIn: (u, k = 1.7) => (k + 1) * u * u * u - k * u * u,
    spring: (u, w = 14, d = 6) => 1 - Math.exp(-d * u) * Math.cos(w * u),   // overshoot + settle (follow-through)
  };
  function mix(a, b, u) {   // blend two partial states
    if (u <= 0) return a; if (u >= 1) return b;
    const out = Array.isArray(a) ? [] : {};
    const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    for (const k of keys) {
      const x = a ? a[k] : undefined, y = b ? b[k] : undefined;
      if (typeof x === 'number' && typeof y === 'number') out[k] = lerp(x, y, u);
      else if (x && y && typeof x === 'object') out[k] = mix(x, y, u);
      else if (y !== undefined && (x === undefined || u >= 0.5)) out[k] = y; else out[k] = x;
    }
    return out;
  }
  const blinkAt = (t, off = 0) => (((t + off) % 3.1) < 0.11 ? 1 : 0);
  const ANIM = {
    idle(t) { const b = Math.sin(t * 2 * Math.PI * 0.28); return { breathe: b, bob: b * 0.35, armL: { fwd: 0.02 * b, out: 0.1, bend: 0.2 }, armR: { fwd: -0.02 * b, out: 0.1, bend: 0.2 }, head: [0.02 * b, 0, 0], blink: blinkAt(t) }; },
    walk(t, f = 1.7) {   // in place; caller moves x/z by ~ 70 cm × f per second
      const p = Math.sin(t * Math.PI * f * 2), q = Math.cos(t * Math.PI * f * 2);
      const p2 = Math.sin(t * Math.PI * f * 2 - 0.5);   // arms lag the legs slightly
      return { bob: Math.abs(q) * 2.4 - 1, lean: 0.07 + 0.015 * Math.abs(q), side: 0.035 * p, twist: -0.1 * p,
        legL: { fwd: 0.42 * p, bend: Math.max(0, -p) * 0.8 + 0.1 * Math.abs(q) }, legR: { fwd: -0.42 * p, bend: Math.max(0, p) * 0.8 + 0.1 * Math.abs(q) },
        armL: { fwd: -0.34 * p2, out: 0.12, bend: 0.3 + 0.18 * Math.max(0, -p2) }, armR: { fwd: 0.34 * p2, out: 0.12, bend: 0.3 + 0.18 * Math.max(0, p2) },
        head: [-0.03 * Math.abs(q), 0.05 * p, -0.02 * p], blink: blinkAt(t, 0.7) };
    },
    point(u, side = 'R') {   // u 0..1: anticipation (pull back) → snap to point with overshoot → settle
      const a = clamp01(u / 0.25), b = clamp01((u - 0.25) / 0.75), sg = side === 'R' ? -1 : 1;
      const back = { ['arm' + side]: { fwd: -0.35, out: 0.2, bend: 0.9 }, lean: -0.04 };
      const hit = { ['arm' + side]: { fwd: 0.45, out: 1.3, bend: 0.06 }, lean: 0.04, side: -0.03 * sg, ['hand' + side]: 'point', expr: 'confident', head: [0, 0.35 * sg, 0] };
      return mix(mix({}, back, ease.io(a)), hit, ease.spring(b));
    },
    reach(u) { return { lean: lerp(-0.05, 0.12, ease.backOut(clamp01(u))), crouch: 0.08 * Math.sin(Math.PI * clamp01(u)), handR: u > 0.6 ? 'hold' : 'open' }; },
    turnKey(u, side = 'R') { const k = ease.spring(clamp01(u), 16, 7); return { ['arm' + side]: { wrist: -1.3 * k }, twist: 0.08 * k, ['hand' + side]: 'hold', expr: u > 0.7 ? 'amazed' : 'confident' }; },
    jumpBack(u) {   // crouch (anticipation) → hop back and up → land with squash → settle
      const c = clamp01(u / 0.2), j = clamp01((u - 0.2) / 0.4), l = clamp01((u - 0.6) / 0.4);
      const air = Math.sin(Math.PI * j);
      return { z: -32 * ease.out(j), bob: 22 * air, crouch: 0.35 * Math.sin(Math.PI * c) * (j === 0 ? 1 : 0) + 0.3 * Math.sin(Math.PI * Math.min(1, l * 1.6)) * (1 - l),
        lean: -0.22 * air, armL: { fwd: 0.6 * air, out: 1.1 * air + 0.1, bend: 0.4 }, armR: { fwd: 0.6 * air, out: 1.1 * air + 0.1, bend: 0.4 },
        legL: { fwd: 0.3 * air, bend: 0.7 * air }, legR: { fwd: -0.15 * air, bend: 0.9 * air }, handL: 'open', handR: 'open', expr: u > 0.12 ? 'shocked' : 'scared' };
    },
    celebrate(t) {   // two hops with fist pumps
      const ph = (t % 0.6) / 0.6, air = Math.max(0, Math.sin(Math.PI * Math.min(1, ph * 1.4)));
      return { bob: 14 * air, crouch: 0.18 * Math.max(0, Math.sin(Math.PI * (ph * 1.4 - 1))), armL: { fwd: 0.2, out: 2.6 + 0.2 * air, bend: 0.3 }, armR: { fwd: 0.2, out: 2.6 + 0.2 * air, bend: 0.3 },
        handL: 'fist', handR: 'fist', expr: 'proud', head: [-0.15, 0, 0.08 * Math.sin(t * 9)] };
    },
    think(t) { const s = Math.sin(t * 2.2); return { armR: { fwd: 0.55, out: 0.15, twist: -0.95, bend: 2.3 }, handR: 'fist', armL: { fwd: 0.3, out: 0.05, twist: -0.9, bend: 1.5 }, head: [-0.1, 0.12 * s, 0.14], expr: 'curious', gaze: [0.4 * s, 0.6], blink: blinkAt(t, 1.3) }; },
  };
  // smooth deterministic noise (sum of incommensurate sines) for micro-motion
  const wob = (t, s = 0) => 0.5 * Math.sin(t * 1.13 + s) + 0.3 * Math.sin(t * 2.71 + s * 1.7) + 0.2 * Math.sin(t * 4.39 + s * 2.9);
  // human layer: breathing, weight shift, head micro-looks, relaxed fingers — so he is never frozen
  function human(t, st, amt = 1) {
    const o = mix({}, st, 1); const k = amt;
    o.breathe = (o.breathe || 0) + Math.sin(t * 2 * Math.PI * 0.27) * k;
    o.side = (o.side || 0) + 0.018 * wob(t * 0.6, 1) * k;
    o.twist = (o.twist || 0) + 0.03 * wob(t * 0.5, 4) * k;
    o.bob = (o.bob || 0) + 0.4 * Math.sin(t * 2 * Math.PI * 0.27) * k;
    const h = o.head || [0, 0, 0]; o.head = [h[0] + 0.035 * wob(t * 0.9, 2) * k, h[1] + 0.06 * wob(t * 0.7, 7) * k, h[2] + 0.035 * wob(t * 0.8, 3) * k];
    for (const a of ['armL', 'armR']) if (o[a]) o[a] = Object.assign({}, o[a], { fwd: (o[a].fwd || 0) + 0.035 * wob(t * 0.8, a === 'armL' ? 5 : 6) * k, bend: (o[a].bend || 0) + 0.05 * wob(t * 0.9, a === 'armL' ? 8 : 9) * k });
    return o;
  }
  // overlapping action: distal parts follow the body a few frames late (follow-through), deterministic
  function lagged(fn, t, lags = { head: 0.07, arm: 0.1 }) {
    const now = fn(t), h = fn(t - lags.head), a = fn(t - lags.arm), o = Object.assign({}, now);
    if (h.head) o.head = h.head;
    for (const k of ['armL', 'armR']) if (a[k] && now[k] && !now[k].noLag) o[k] = mix(now[k], a[k], 0.65);
    return o;
  }
  const POSES = {
    idle: {},
    confident: { armL: { fwd: -0.15, out: 0.75, twist: -1.35, bend: 1.75 }, armR: { fwd: -0.15, out: 0.75, twist: -1.35, bend: 1.75 }, handL: 'fist', handR: 'fist', expr: 'confident' },
    struggle: { armL: { fwd: 0.9, out: 0.3, bend: 1.0 }, handL: 'fist', lean: -0.1, expr: 'determined' },
    panic: { armL: { fwd: 0.4, out: 1.3, twist: 1.3, bend: 2.3 }, armR: { fwd: 0.4, out: 1.3, twist: 1.3, bend: 2.3 }, handL: 'open', handR: 'open', expr: 'panic' },
    shocked: { armL: { fwd: 0.1, out: 0.95, twist: 1.45, bend: 1.7 }, armR: { fwd: 0.1, out: 0.95, twist: 1.45, bend: 1.7 }, handL: 'open', handR: 'open', lean: -0.08, expr: 'shocked' },
    cheer: { armL: { fwd: 0.2, out: 2.75, bend: 0.25 }, armR: { fwd: 0.2, out: 2.75, bend: 0.25 }, handL: 'fist', handR: 'fist', expr: 'joy', head: [-0.15, 0, 0] },
    oops: { armR: { fwd: -0.2, out: 2.55, twist: 1.2, bend: 2.1 }, handR: 'open', armL: { fwd: 0.1, out: 0.25, bend: 0.4 }, head: [0.05, 0.25, -0.15], expr: 'oops' },
  };
  return { create, ANIM, ease, mix, human, lagged, wob, POSES, EXPRS, EX, drawFace, defaults: D };
})();
if (typeof window !== 'undefined') window.Hero3D = Hero3D;
if (typeof module !== 'undefined') module.exports = Hero3D;
