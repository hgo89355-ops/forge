/* Stick3D — the channel guide as a 3D stickman in the signature look (owner decision 2026-11-24).
 * Round glossy white head with a simple ink face, black stick limbs with ink outlines, signature blue tee with the
 * white gear logo + yellow sleeve trim, signature cap (blue crown, gear logo, yellow brim), white sneakers.
 * Built entirely in code (Three.js r158). Units: cm. Feet on y = 0, faces +z. Same API as Guide3D:
 *   const g = Stick3D.create(THREE, { cap: 'forward' | 'back' });  scene.add(g.root);
 *   g.pose(state); g.reach('R', worldVec3); g.handGrip('R')
 * State: { x,y,z, face, lean, side, twist, crouch, bob, head:[nod,turn,tilt], armL/armR:{fwd,out,twist,bend},
 *          legL/legR:{fwd,out,bend}, handL/handR: open|fist|grip|point, eyes: open|wide|happy|squint|closed,
 *          gaze:[x,y], brows: neutral|raised|worried|angry|confident, mouth: smile|grin|open|shocked|o|frown|flat|strain, sweat }
 */
const Stick3D = (function () {
  const D = {
    x: 0, y: 0, z: 0, face: 0, lean: 0, side: 0, twist: 0, crouch: 0, bob: 0, head: [0, 0, 0],
    armL: { fwd: 0, out: 0.12, twist: 0, bend: 0.15 }, armR: { fwd: 0, out: 0.12, twist: 0, bend: 0.15 },
    legL: { fwd: 0, out: 0.05, bend: 0 }, legR: { fwd: 0, out: 0.05, bend: 0 },
    handL: 'fist', handR: 'fist', eyes: 'open', gaze: [0, 0], brows: 'neutral', mouth: 'smile', sweat: 0,
  };
  const POSES = {
    idle: {},
    sad: { armL: { out: 0.05, bend: 0.1 }, armR: { out: 0.05, bend: 0.1 }, head: [0.25, 0, 0.05], eyes: 'sad', brows: 'sad', mouth: 'sad', lean: 0.08 },
    panic: { armL: { fwd: 0.4, out: 1.3, twist: 1.3, bend: 2.3 }, armR: { fwd: 0.4, out: 1.3, twist: 1.3, bend: 2.3 }, handL: 'open', handR: 'open', eyes: 'panic', brows: 'surprised', mouth: 'scream', sweat: 1 },
    smug: { armL: { fwd: -0.15, out: 0.75, twist: -1.35, bend: 1.75 }, eyes: 'smug', brows: ['confident', 'raised'], mouth: 'smirk', head: [-0.08, 0.15, 0.1] },
    curious: { armR: { fwd: 0.55, out: 0.15, twist: 0.9, bend: 2.35 }, armL: { fwd: 0.25, out: 0.1, twist: 0.8, bend: 1.5 }, head: [0.12, 0, 0.15], mouth: 'o', brows: 'raised', gaze: [0.3, 0.4] },
    oops: { armR: { fwd: -0.2, out: 2.55, twist: 1.2, bend: 2.1 }, handR: 'open', armL: { fwd: 0.1, out: 0.25, bend: 0.4 }, head: [0.05, 0.25, -0.15], mouth: 'grin', eyes: 'happy', brows: 'worried', sweat: 1, blush: 1 },
    shocked: { armL: { fwd: 0.1, out: 0.95, twist: 1.45, bend: 1.7 }, armR: { fwd: 0.1, out: 0.95, twist: 1.45, bend: 1.7 }, handL: 'open', handR: 'open', lean: -0.08, head: [-0.12, 0, 0], eyes: 'panic', brows: 'surprised', mouth: 'scream' },
    confident: { armL: { fwd: -0.15, out: 0.75, twist: -1.35, bend: 1.75 }, armR: { fwd: -0.15, out: 0.75, twist: -1.35, bend: 1.75 }, mouth: 'smirk', eyes: 'smug', brows: ['confident', 'raised'], head: [-0.05, 0, 0] },
    point: { armR: { fwd: 1.2, out: 0.35, twist: 0, bend: 0.1 }, handR: 'point', mouth: 'open', brows: 'raised' },
    wave: { armR: { fwd: 0.1, out: 2.5, twist: 0.3, bend: 0.5 }, handR: 'open', mouth: 'grin', eyes: 'happy', brows: 'raised' },
    cheer: { armL: { fwd: 0.2, out: 2.75, bend: 0.25 }, armR: { fwd: 0.2, out: 2.75, bend: 0.25 }, mouth: 'bigGrin', eyes: 'happy', brows: 'raised', blush: 0.7, head: [-0.15, 0, 0] },
    push: { armL: { fwd: 1.45, out: 0.2, bend: 0.3 }, armR: { fwd: 1.45, out: 0.2, bend: 0.3 }, handL: 'open', handR: 'open', lean: 0.25, legL: { fwd: 0.35, bend: 0.35 }, legR: { fwd: -0.3, bend: 0.1 }, mouth: 'strain', eyes: 'squint', brows: 'angry' },
    struggle: { armL: { fwd: 1.0, out: 0.25, bend: 0.9 }, lean: -0.12, mouth: 'teeth', eyes: 'angry', brows: 'angry', sweat: 1 },
  };

  function create(THREE, opts = {}) {
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const std = (c, r = 0.5, m = 0, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: m }, extra));
    const INK = 0x15171c;
    const M = {
      ink: std(INK, 0.45), head: std('#F7F7F4', 0.28, 0, { envMapIntensity: 0.9 }), tee: std('#1F4FE0', 0.6), teeDark: std('#1840B8', 0.65),
      yellow: std('#F2C230', 0.45), white: std('#FFFFFF', 0.4), shoe: std('#F4F5F7', 0.45), sole: std('#C6CBD3', 0.6), lace: std('#9AA2AE', 0.6),
      cavity: std('#5A1420', 0.8), tongue: std('#E06A7A', 0.6), teeth: std('#FFFFFF', 0.3), glint: new THREE.MeshBasicMaterial({ color: '#FFFFFF' }),
      sweat: std('#8FD0FA', 0.1, 0, { transparent: true, opacity: 0.9 }), blush: std('#FF8FA0', 0.6, 0, { transparent: true, opacity: 0.75 }), pants: std('#2E3A55', 0.85), pantsDark: std('#242E44', 0.9),
    };
    // ink outline: inverted hull pushed out along the normals
    const outlineMat = (w) => {
      const m = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
      m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${w.toFixed(2)};`); };
      return m;
    };
    const OL = { thin: outlineMat(0.35), mid: outlineMat(0.55) };
    const mesh = (g, m, parent, p, r, s, ol) => {
      const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true;
      if (p) o.position.copy(p); if (r) o.rotation.set(r[0], r[1], r[2]); if (s) o.scale.set(s[0], s[1], s[2]);
      parent.add(o);
      if (ol) { const h = new THREE.Mesh(g, OL[ol]); h.castShadow = false; o.add(h); }
      return o;
    };
    const group = (parent, p) => { const g = new THREE.Group(); if (p) g.position.copy(p); parent.add(g); return g; };
    const stick = (r0, r1, len, seg = 16) => {     // rounded stick pointing down −y
      const pts = [];
      for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(a) * r0, Math.cos(a) * r0)); }
      for (let i = 1; i < 6; i++) { const u = i / 6; pts.push(new THREE.Vector2(r0 + (r1 - r0) * u, -len * u)); }
      for (let i = 0; i <= 6; i++) { const a = Math.PI / 2 - (i / 6) * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(a) * r1, -len - Math.cos(a) * r1)); }
      pts.reverse(); return new THREE.LatheGeometry(pts, seg);
    };
    const gearShape = (R, r, hole) => {
      const s = new THREE.Shape(), n = 8;
      for (let i = 0; i < n * 4; i++) { const a = (i / (n * 4)) * Math.PI * 2, rr = (i % 4 < 2) ? R : r; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? s.lineTo(x, y) : s.moveTo(x, y); }
      const h = new THREE.Path(); h.absarc(0, 0, hole, 0, Math.PI * 2, true); s.holes.push(h); return s;
    };

    const root = new THREE.Group(); root.name = 'stick3d';
    const H = 80;
    const hips = group(root, V(0, H, 0));
    const spine = group(hips);
    const chest = group(spine);
    // body stick (under the shirt) + signature tee
    mesh(stick(2.4, 2.4, 36), M.ink, chest, V(0, 38, 0));
    { const prof = [[10.6, -6], [10.2, -2], [9.6, 8], [10.2, 18], [11.2, 28], [11.4, 33], [10.4, 37.5], [7.2, 40.2], [4.2, 41], [3.6, 41.1]];
      const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 40);
      mesh(g, M.tee, chest, null, null, [1.08, 1, 0.72], 'mid');
      mesh(new THREE.TorusGeometry(10.6, 0.6, 8, 40), M.yellow, chest, V(0, -5.6, 0), [Math.PI / 2, 0, 0], [1.08, 0.72, 1]);
      mesh(new THREE.TorusGeometry(4.0, 0.55, 8, 24), M.teeDark, chest, V(0, 40.8, 0.1), [Math.PI / 2 - 0.1, 0, 0], [1.05, 0.8, 1]);
      const gear = mesh(new THREE.ExtrudeGeometry(gearShape(2.4, 1.85, 0.8), { depth: 0.15, bevelEnabled: false }), M.white, chest, V(4.2, 27, 8.25), [0, 0.42, 0]);
      gear.castShadow = false;
    }
    // neck + head
    const neck = group(chest, V(0, 40.5, 0));
    mesh(stick(2.2, 2.2, 5), M.ink, neck, V(0, 6, 0));
    const head = group(neck, V(0, 4, 0));
    const face = group(head, V(0, 14.2, 0.5)); face.scale.setScalar(1.12);
    const HR = 13.5;
    mesh(new THREE.SphereGeometry(HR, 48, 36), M.head, face, null, null, [1, 1.04, 0.98], 'mid');
    // eyes: ink ovals (open/half), white eyes with pupils (wide/panic), arcs (happy), lines (squint/closed), lids
    const eyes = [];
    for (const s of [-1, 1]) {
      const g = group(face, V(s * 4.4, 0.6, 12.55)); g.rotation.set(-0.05, s * 0.33, 0);
      const oval = mesh(new THREE.SphereGeometry(1.7, 20, 16), M.ink, g, null, null, [1, 1.45, 0.45]);
      const gl = mesh(new THREE.SphereGeometry(0.5, 10, 8), M.glint, oval, V(0.5, 0.6, 0.85)); gl.castShadow = false;
      const white = mesh(new THREE.SphereGeometry(2.5, 22, 16), M.white, g, V(0, 0.2, -0.2), null, [1, 1.2, 0.5], 'thin');
      const pupil = mesh(new THREE.SphereGeometry(1.0, 16, 12), M.ink, white, V(0, 0, 2.3), null, [1, 1, 0.5]);
      const pg = mesh(new THREE.SphereGeometry(0.3, 8, 6), M.glint, pupil, V(0.35, 0.4, 0.6)); pg.castShadow = false;
      const happy = mesh(new THREE.TorusGeometry(1.7, 0.45, 8, 18, Math.PI), M.ink, g, V(0, -0.6, 0.3));
      const sad = mesh(new THREE.TorusGeometry(1.7, 0.45, 8, 18, Math.PI), M.ink, g, V(0, 1.0, 0.3), [0, 0, Math.PI]);
      const line = mesh(new THREE.TorusGeometry(2.2, 0.45, 8, 18, Math.PI * 0.5), M.ink, g, V(0, 1.4, 0.3), [0, 0, Math.PI * 1.25]);
      const lid = mesh(new THREE.BoxGeometry(4.0, 0.7, 0.6), M.ink, g, V(0, 1.1, 0.5));   // flat lid line for half/smug/angry
      eyes.push({ g, oval, white, pupil, happy, sad, line, lid, s });
    }
    const brows = [];
    for (const s of [-1, 1]) {
      const b = group(face, V(s * 4.5, 4.6, 12.0)); b.rotation.set(-0.36, s * 0.34, 0);
      const bar = mesh(stick(0.72, 0.62, 4.0, 8), M.ink, b, V(-2.0 * s, 0, 0), [0, 0, s * Math.PI / 2]);
      brows.push({ b, s });
    }
    // mouth
    const mouth = group(face, V(0, -5.4, 12.35));
    mouth.rotation.x = 0.42;
    const tube = (pts, r = 0.5) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 8);
    const curve = (bend, w) => tube([V(-w, bend, 0), V(-w * 0.5, -bend * 0.2, 0.4), V(0, -bend * 0.45, 0.55), V(w * 0.5, -bend * 0.2, 0.4), V(w, bend, 0)]);
    const wavy = []; for (let i = 0; i <= 8; i++) { const x = -3 + i * 0.75; wavy.push(V(x, 0.55 * Math.sin(i * Math.PI / 2), 0.4 - Math.abs(x) * 0.08)); }
    const lips = {
      smile: mesh(curve(1.3, 3.4), M.ink, mouth), flat: mesh(curve(0.05, 2.6), M.ink, mouth), frown: mesh(curve(-1.0, 2.8), M.ink, mouth),
      sad: mesh(curve(-1.6, 3.0), M.ink, mouth), wavy: mesh(tube(wavy), M.ink, mouth),
      smirk: mesh(tube([V(-2.2, 0.1, 0.3), V(0, -0.15, 0.55), V(1.8, 0.4, 0.4), V(3.0, 1.4, 0.1)]), M.ink, mouth),
    };
    const cav = mesh(new THREE.SphereGeometry(1, 24, 16), M.cavity, mouth, V(0, -0.4, 0), null, null);
    const cavRim = mesh(new THREE.TorusGeometry(1, 0.34, 8, 30), M.ink, mouth, V(0, -0.4, 0.25));
    const teeth = mesh(new THREE.BoxGeometry(3.4, 0.9, 0.8), M.teeth, mouth, V(0, 0.3, 0.3));
    const teethLo = mesh(new THREE.BoxGeometry(3.0, 0.8, 0.8), M.teeth, mouth, V(0, -1.1, 0.3));
    const grit = [-1, 0, 1].map((k) => mesh(new THREE.BoxGeometry(0.18, 1.6, 0.9), M.ink, mouth, V(k * 1.1, -0.4, 0.35)));
    const tongue = mesh(new THREE.SphereGeometry(1, 16, 10), M.tongue, mouth, V(0, -1.2, 0.3));
    // cheeks (blush) + extra sweat drop
    const blush = [-1, 1].map((s) => { const c = mesh(new THREE.SphereGeometry(1.7, 16, 10), M.blush, face, V(s * 7.6, -2.6, 10.6), [0, s * 0.6, 0], [1, 0.62, 0.3]); c.castShadow = false; return c; });
    const sweat2 = mesh(new THREE.SphereGeometry(0.75, 12, 8), M.sweat, face, V(-11.0, 6.5, 5.5), null, [1, 1.5, 1], 'thin');
    const sweat = mesh(new THREE.SphereGeometry(0.95, 14, 10), M.sweat, face, V(10.5, 4.5, 7.5), null, [1, 1.5, 1], 'thin');
    // messy hair tufts peeking out under the cap
    { const tuft = new THREE.ConeGeometry(1.6, 4.6, 8);
      for (const [x, y, z, rz, rx] of [[-12.6, 3.5, 2, 1.9, 0], [-12.9, 1.0, -2, 2.1, 0.2], [12.6, 3.5, 2, -1.9, 0], [12.9, 1.0, -2, -2.1, 0.2], [-7, 3, -11.5, 2.6, -0.6], [0, 2.5, -13.4, 3.1, -0.7], [7, 3, -11.5, -2.6, -0.6]]) {
        mesh(tuft, M.ink, face, V(x, y, z), [rx, 0, rz], [1, 1, 0.7]);
      } }
    // signature cap: a normal six-panel baseball cap (blue), small gear logo, yellow pre-curved brim
    const cap = group(face, V(0, 3.4, -0.6)); cap.rotation.x = -0.32;
    { const R = HR + 0.6;
      mesh(new THREE.SphereGeometry(R, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.5), M.tee, cap, V(0, 1.2, 0), null, [1.0, 1.0, 1.04], 'mid');
      for (let i = 0; i < 6; i++) {               // panel seams
        const a = i * Math.PI / 3 + Math.PI / 6, pts = [];
        for (let k = 1; k <= 12; k++) { const th = (k / 12) * Math.PI * 0.5; pts.push(V(Math.sin(th) * Math.sin(a) * (R + 0.08), Math.cos(th) * (R + 0.08) + 1.2, Math.sin(th) * Math.cos(a) * (R + 0.08) * 1.04)); }
        mesh(tube(pts, 0.16), M.teeDark, cap).castShadow = false;
      }
      mesh(new THREE.SphereGeometry(1.0, 14, 10), M.tee, cap, V(0, 1.2 + R, 0), null, [1, 0.55, 1], 'thin');   // button
      const el = 0.62, g = mesh(new THREE.ExtrudeGeometry(gearShape(1.9, 1.45, 0.6), { depth: 0.15, bevelEnabled: false }), M.white, cap, V(0, 1.2 + Math.sin(el) * R, Math.cos(el) * R * 1.04 + 0.05), [-el, 0, 0]);
      g.castShadow = false;
      const bs = new THREE.Shape(); bs.moveTo(-10.5, 0); bs.quadraticCurveTo(-10.8, 12.5, 0, 13.5); bs.quadraticCurveTo(10.8, 12.5, 10.5, 0); bs.quadraticCurveTo(0, 2.2, -10.5, 0);
      const bg = new THREE.ExtrudeGeometry(bs, { depth: 0.7, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.25, bevelSegments: 2, curveSegments: 20 });
      const pos = bg.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i); pos.setZ(i, pos.getZ(i) + 0.03 * x * x); } bg.computeVertexNormals();
      bg.rotateX(Math.PI / 2);
      mesh(bg, M.yellow, cap, V(0, 1.4, R * 1.04 - 2.4), [0.3, 0, 0], null, 'thin');
      if (opts.cap === 'back') cap.rotation.set(0.2, Math.PI, 0);
    }
    // arms
    const UA = 25, FA = 24;
    const arms = {};
    for (const [side, s] of [['L', 1], ['R', -1]]) {
      const sh = group(chest, V(s * 11.4, 35, 0));
      mesh(stick(4.6, 4.3, 7, 20), M.tee, sh, V(0, 2.6, 0), null, null, 'mid');                       // sleeve
      mesh(new THREE.TorusGeometry(4.35, 0.55, 8, 24), M.yellow, sh, V(0, -6.0, 0), [Math.PI / 2, 0, 0]);  // signature trim
      mesh(stick(2.1, 2.1, UA), M.ink, sh);
      const el = group(sh, V(0, -UA, 0));
      mesh(stick(2.1, 2.0, FA), M.ink, el);
      const wr = group(el, V(0, -FA, 0));
      const hand = group(wr);
      const palm = mesh(new THREE.SphereGeometry(3.2, 20, 14), M.ink, hand, V(0, -2.6, 0));
      const thumb = group(hand, V(0, -1.2, 2.2)); mesh(stick(1.2, 1.1, 2.4, 10), M.ink, thumb); thumb.rotation.set(0.9, 0, 0);
      const index = group(hand, V(0, -4.8, 1.2)); mesh(stick(1.15, 1.0, 4.2, 10), M.ink, index);
      arms[side] = { s, sh, el, wr, hand, palm, thumb, index };
    }
    // legs + sneakers
    const TH = 34, SH = 33;
    const legs = {};
    mesh(new THREE.SphereGeometry(1, 24, 16).scale(10.8, 7.0, 7.4), M.pants, hips, V(0, -3.5, 0), null, null, 'mid');   // seat / hips of the pants
    for (const [side, s] of [['L', 1], ['R', -1]]) {
      const hp = group(hips, V(s * 5.2, -4, 0));
      mesh(stick(2.3, 2.3, TH), M.ink, hp);
      mesh(stick(5.4, 5.0, TH, 20), M.pants, hp, V(0, 1.5, 0), null, null, 'mid');                      // loose pant leg (thigh)
      mesh(new THREE.TorusGeometry(5.0, 0.35, 6, 20, 2.2), M.pantsDark, hp, V(0, -TH * 0.55, 0.6), [Math.PI / 2 - 0.25, 0, 2.2]);
      const kn = group(hp, V(0, -TH, 0));
      mesh(stick(2.3, 2.2, SH), M.ink, kn);
      mesh(stick(5.0, 5.6, SH - 3.5, 20), M.pants, kn, null, null, null, 'mid');                        // loose pant leg (shin)
      mesh(new THREE.TorusGeometry(5.3, 0.4, 6, 22, 2.6), M.pantsDark, kn, V(0, -SH * 0.62, 0.5), [Math.PI / 2 + 0.2, 0, 1.9]);
      mesh(new THREE.TorusGeometry(5.6, 0.75, 8, 24), M.pantsDark, kn, V(0, -SH + 3.2, 0), [Math.PI / 2, 0, 0]);  // hem cuff
      const an = group(kn, V(0, -SH, 0));
      const foot = group(an);
      const sp = new THREE.Shape();
      sp.moveTo(-5.5, 0); sp.lineTo(17.5, 0); sp.quadraticCurveTo(20, 0.3, 19.8, 2.7); sp.quadraticCurveTo(19, 4.8, 15, 5.6);
      sp.lineTo(8, 7.2); sp.quadraticCurveTo(4.2, 9.8, 2, 10); sp.lineTo(-4, 9.8); sp.quadraticCurveTo(-6.2, 9.3, -6.2, 6); sp.lineTo(-6.2, 1.4); sp.quadraticCurveTo(-6.1, 0, -5.5, 0);
      const shoeG = new THREE.ExtrudeGeometry(sp, { depth: 7.6, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.8, bevelSegments: 3, curveSegments: 12 });
      shoeG.rotateY(-Math.PI / 2); shoeG.translate(3.8, -6.3, 0);
      mesh(shoeG, M.shoe, foot, null, null, null, 'thin');
      const soleS = new THREE.Shape(); soleS.moveTo(-6.4, -0.4); soleS.lineTo(18, -0.4); soleS.quadraticCurveTo(20.6, 0, 20.3, 1.9); soleS.lineTo(-6.6, 1.9); soleS.lineTo(-6.4, -0.4);
      const soleG = new THREE.ExtrudeGeometry(soleS, { depth: 9.0, bevelEnabled: false }); soleG.rotateY(-Math.PI / 2); soleG.translate(4.5, -6.5, 0);
      mesh(soleG, M.sole, foot);
      for (let i = 0; i < 3; i++) mesh(new THREE.BoxGeometry(4.4, 0.4, 0.7), M.lace, foot, V(0, 1.6 - i * 0.9, 5.4 + i * 2.0), [-0.45, 0, 0]);
      legs[side] = { s, hp, kn, an, foot };
    }

    // ---------- pose
    let state = Object.assign({}, D);
    function handShape(A, kind) {
      A.index.visible = kind === 'point';
      A.index.rotation.set(0.15, 0, 0);
      A.palm.scale.set(kind === 'open' ? 0.75 : 1, kind === 'open' ? 1.25 : 1, kind === 'open' ? 1.15 : 1);
      A.thumb.rotation.set(kind === 'open' ? 1.25 : 0.7, 0, 0);
    }
    function setArm(A, a) { A.sh.rotation.set(-a.fwd, A.s * (a.twist || 0), A.s * a.out, 'ZXY'); A.el.rotation.set(-(a.bend || 0), 0, 0); A.wr.rotation.set(0, 0, 0); }
    function setLeg(L, l, crouch) {
      L.hp.rotation.set(-(l.fwd || 0) - crouch * 0.9, 0, L.s * (l.out || 0));
      L.kn.rotation.set((l.bend || 0) + crouch * 1.7, 0, 0);
      L.an.rotation.set(-((l.fwd || 0) + (l.bend || 0)) * 0.3 + crouch * 0.1, 0, -L.s * (l.out || 0));
    }
    function pose(st) {
      state = Object.assign({}, D, st);
      const s = state;
      root.position.set(s.x, s.y, s.z); root.rotation.set(0, s.face, 0);
      hips.position.y = H - s.crouch * 20 + s.bob;
      spine.rotation.set(s.lean * 0.6 + s.crouch * 0.35, s.twist * 0.5, s.side);
      chest.rotation.set(s.lean * 0.4, s.twist * 0.5, 0);
      neck.rotation.set(s.head[0] * 0.4, s.head[1] * 0.4, s.head[2] * 0.4);
      head.rotation.set(s.head[0] * 0.6 - s.lean * 0.5, s.head[1] * 0.6, s.head[2] * 0.6);
      setArm(arms.L, Object.assign({}, D.armL, s.armL)); setArm(arms.R, Object.assign({}, D.armR, s.armR));
      setLeg(legs.L, Object.assign({}, D.legL, s.legL), s.crouch); setLeg(legs.R, Object.assign({}, D.legR, s.legR), s.crouch);
      handShape(arms.L, s.handL); handShape(arms.R, s.handR);
      const E = s.eyes;
      eyes.forEach((e) => {
        e.oval.visible = E === 'open' || E === 'half' || E === 'smug' || E === 'angry' || E === 'sad';
        e.white.visible = E === 'wide' || E === 'panic';
        e.happy.visible = E === 'happy';
        e.line.visible = E === 'squint' || E === 'closed';
        e.sad.visible = false;
        e.lid.visible = E === 'half' || E === 'smug' || E === 'angry' || E === 'sad';
        e.oval.scale.set(1, 1.45 * (E === 'half' || E === 'smug' ? 0.7 : 1), 0.45);
        e.oval.position.set(s.gaze[0] * 0.9, s.gaze[1] * 0.9 - (E === 'half' || E === 'smug' ? 0.5 : 0), 0);
        e.white.scale.set(E === 'panic' ? 1.15 : 1, E === 'panic' ? 1.35 : 1.2, 0.5);
        e.pupil.scale.set(E === 'panic' ? 0.55 : 1, E === 'panic' ? 0.55 : 1, 0.5);
        e.pupil.position.set(s.gaze[0] * 0.9, s.gaze[1] * 0.9, 2.3);
        e.lid.rotation.z = E === 'angry' ? e.s * 0.45 : E === 'sad' ? -e.s * 0.4 : 0;
        e.lid.position.y = E === 'half' || E === 'smug' ? 0.55 : 1.6;
      });
      const BR = { neutral: [0, 0], raised: [1.2, 0.0], surprised: [1.9, 0.08], worried: [0.8, -0.38], sad: [0.4, -0.5], angry: [-0.6, 0.45], confident: [0.2, 0.18], determined: [-0.3, 0.3] };
      const bl = Array.isArray(s.brows) ? s.brows : [s.brows, s.brows];
      brows.forEach(({ b, s: sd }, i) => { const v = BR[bl[i]] || BR.neutral; b.position.y = 4.6 + v[0]; b.rotation.z = sd * v[1]; });
      for (const k in lips) { lips[k].visible = false; lips[k].scale.set(1, 1, 1); }
      cav.visible = cavRim.visible = teeth.visible = teethLo.visible = tongue.visible = false; grit.forEach((g) => (g.visible = false));
      const openM = (w, h, t, tg, lo) => { cav.visible = cavRim.visible = true; cav.scale.set(w, h, 0.6); cavRim.scale.set(w, h, 1); teeth.visible = t; teeth.scale.x = w / 2.1; teeth.position.y = -0.4 + h * 0.55; teethLo.visible = !!lo; teethLo.scale.x = w / 2.3; teethLo.position.y = -0.4 - h * 0.55; tongue.visible = tg; tongue.scale.set(w * 0.55, h * 0.38, 0.5); tongue.position.y = -0.4 - h * 0.45; };
      switch (s.mouth) {
        case 'smile': lips.smile.visible = true; break;
        case 'flat': lips.flat.visible = true; break;
        case 'frown': lips.frown.visible = true; break;
        case 'sad': lips.sad.visible = true; break;
        case 'wavy': lips.wavy.visible = true; break;
        case 'smirk': lips.smirk.visible = true; break;
        case 'grin': openM(3.2, 1.6, true, false); break;
        case 'bigGrin': openM(4.2, 2.4, true, true); break;
        case 'open': openM(2.9, 2.2, true, true); break;
        case 'shocked': openM(1.9, 2.8, false, true); break;
        case 'scream': openM(2.6, 3.4, true, true, true); break;
        case 'o': openM(1.2, 1.5, false, false); break;
        case 'strain': case 'teeth': openM(3.6, 1.25, true, true, false); teeth.scale.y = 1.6; teeth.position.y = -0.4; grit.forEach((g) => (g.visible = true)); break;
        default: lips.smile.visible = true;
      }
      if (s.mouth !== 'strain' && s.mouth !== 'teeth') teeth.scale.y = 1;
      sweat.visible = s.sweat > 0.01; sweat2.visible = s.sweat > 0.6;
      blush.forEach((c) => { c.visible = (s.blush || 0) > 0.01; c.material.opacity = 0.75 * Math.min(1, s.blush || 0); });
      root.updateMatrixWorld(true);
    }

    // ---------- two-bone IK
    const gripLocal = V(0, -2.6, 0);
    const tmpQ = new THREE.Quaternion(), DOWN = V(0, -1, 0);
    function aim(bone, targetW) {
      bone.updateMatrixWorld(true);
      const bp = bone.getWorldPosition(new THREE.Vector3());
      const dir = targetW.clone().sub(bp).normalize();
      bone.parent.getWorldQuaternion(tmpQ); dir.applyQuaternion(tmpQ.clone().invert());
      bone.quaternion.setFromUnitVectors(DOWN, dir); bone.updateMatrixWorld(true);
    }
    function reach(side, targetW, poleW) {
      const A = arms[side];
      root.updateMatrixWorld(true);
      const S = A.sh.getWorldPosition(new THREE.Vector3());
      const L1 = UA, L2 = FA + 2.6;
      const toT = targetW.clone().sub(S); let d = toT.length();
      d = Math.min(Math.max(d, Math.abs(L1 - L2) + 0.5), L1 + L2 - 0.3);
      const u = toT.normalize();
      const pole = (poleW || S.clone().add(V(A.s * 25, -40, -15).applyQuaternion(root.quaternion))).clone().sub(S);
      const w = pole.sub(u.clone().multiplyScalar(pole.dot(u))).normalize();
      const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
      const E = S.clone().add(u.clone().multiplyScalar(a)).add(w.multiplyScalar(h));
      const T = S.clone().add(u.multiplyScalar(d));
      A.sh.rotation.set(0, 0, 0); A.el.rotation.set(0, 0, 0);
      aim(A.sh, E); aim(A.el, T);
    }
    function handGrip(side) { const A = arms[side]; A.hand.updateMatrixWorld(true); return A.hand.localToWorld(gripLocal.clone()); }
    pose({});
    return { root, pose, reach, handGrip, arms, legs, POSES, state: () => state };
  }
  return { create, POSES, defaults: D };
})();
if (typeof window !== 'undefined') window.Stick3D = Stick3D;
if (typeof module !== 'undefined') module.exports = Stick3D;
