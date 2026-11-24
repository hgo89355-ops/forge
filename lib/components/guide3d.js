/* Guide3D — the channel guide as a real 3D character, built entirely in code (Three.js r158). Style v5.
 * Adult proportions (~178 cm, ~7.5 heads), stylised-realistic: skin, messy black hair, blue tee with the white
 * gear logo, navy jeans, white sneakers. Units: cm. Feet on y = 0, faces +z (rotate root.rotation.y to turn).
 *
 *   const g = Guide3D.create(THREE, { skin: '#E3AE8D' });  scene.add(g.root);
 *   g.pose(stateObject)            // body + face, see POSES / defaults below
 *   g.reach('R', worldVec3, pole)  // two-bone IK: put the right/left hand's grip point on a world position
 *   g.handGrip('R')                // world position of the grip point (after pose/reach)
 * State: { x,y,z, face (radians, root yaw), lean, side, twist, crouch, bob, head:[nod,turn,tilt],
 *          armL/armR: { fwd, out, twist, bend }, legL/legR: { fwd, out, bend }, handL/handR: open|fist|grip|point,
 *          eyes: open|wide|happy|squint|closed, gaze:[x,y], brows: neutral|raised|worried|angry|confident,
 *          mouth: smile|grin|open|shocked|o|frown|flat|strain, sweat: 0..1 }
 */
const Guide3D = (function () {
  const D = {
    x: 0, y: 0, z: 0, face: 0, lean: 0, side: 0, twist: 0, crouch: 0, bob: 0, head: [0, 0, 0],
    armL: { fwd: 0, out: 0.1, twist: 0, bend: 0.15 }, armR: { fwd: 0, out: 0.1, twist: 0, bend: 0.15 },
    legL: { fwd: 0, out: 0.03, bend: 0 }, legR: { fwd: 0, out: 0.03, bend: 0 },
    handL: 'open', handR: 'open', eyes: 'open', gaze: [0, 0], brows: 'neutral', mouth: 'smile', sweat: 0,
  };
  const POSES = {
    idle: {},
    curious: { armR: { fwd: 0.55, out: 0.15, twist: 0.9, bend: 2.35 }, handR: 'fist', armL: { fwd: 0.25, out: 0.1, twist: 0.8, bend: 1.5 }, head: [0.12, 0, 0.12], mouth: 'o', brows: 'raised', gaze: [0.3, 0.4] },
    oops: { armR: { fwd: -0.2, out: 2.55, twist: 1.2, bend: 2.1 }, handR: 'open', armL: { fwd: 0.1, out: 0.25, bend: 0.4 }, head: [0.05, 0.25, -0.12], mouth: 'grin', brows: 'worried', sweat: 1 },
    shocked: { armL: { fwd: 0.1, out: 0.95, twist: 1.45, bend: 1.7 }, armR: { fwd: 0.1, out: 0.95, twist: 1.45, bend: 1.7 }, lean: -0.08, head: [-0.12, 0, 0], eyes: 'wide', brows: 'raised', mouth: 'shocked' },
    confident: { armL: { fwd: -0.15, out: 0.75, twist: -1.35, bend: 1.75 }, armR: { fwd: -0.15, out: 0.75, twist: -1.35, bend: 1.75 }, handL: 'fist', handR: 'fist', mouth: 'grin', brows: 'confident', head: [-0.05, 0, 0] },
    point: { armR: { fwd: 1.2, out: 0.35, twist: 0, bend: 0.1 }, handR: 'point', mouth: 'open', brows: 'raised' },
    wave: { armR: { fwd: 0.1, out: 2.5, twist: 0.3, bend: 0.5 }, handR: 'open', mouth: 'grin', eyes: 'happy', brows: 'raised' },
    cheer: { armL: { fwd: 0.2, out: 2.75, bend: 0.25 }, armR: { fwd: 0.2, out: 2.75, bend: 0.25 }, handL: 'fist', handR: 'fist', mouth: 'open', eyes: 'happy', brows: 'raised', head: [-0.15, 0, 0] },
    push: { armL: { fwd: 1.45, out: 0.2, bend: 0.3 }, armR: { fwd: 1.45, out: 0.2, bend: 0.3 }, lean: 0.25, legL: { fwd: 0.35, bend: 0.35 }, legR: { fwd: -0.3, bend: 0.1 }, mouth: 'strain', eyes: 'squint', brows: 'angry' },
    struggle: { armL: { fwd: 1.0, out: 0.25, bend: 0.9 }, handL: 'fist', lean: -0.12, mouth: 'strain', eyes: 'squint', brows: 'angry', sweat: 1 },
  };

  function create(THREE, opts = {}) {
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const std = (c, r = 0.6, m = 0, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: m }, extra));
    const M = {
      skin: std(opts.skin || '#E3AE8D', 0.55), skinSh: std(opts.skin || '#E3AE8D', 0.6),
      tee: std('#1F4FE0', 0.78), teeDark: std('#1840B8', 0.8), jeans: std('#2A3347', 0.86), jeansSeam: std('#3A4560', 0.9),
      hair: std('#16171B', 0.48, 0.0), shoe: std('#F3F4F6', 0.55), sole: std('#C6CBD3', 0.7), lace: std('#9AA2AE', 0.7),
      white: std('#FFFFFF', 0.5), lip: std('#A35A57', 0.55), cavity: std('#3A1016', 0.9), teeth: std('#F6F3EC', 0.35),
      tongue: std('#D7707C', 0.6), eyeW: std('#F4F2EC', 0.25), iris: std('#4B3222', 0.3), pupil: std('#0B0B0D', 0.2),
      glint: new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), sweat: std('#8FD0FA', 0.1, 0, { transparent: true, opacity: 0.85 }),
      brow: std('#16171B', 0.7),
    };
    const mesh = (g, m, parent, p, r, s) => { const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; if (p) o.position.copy(p); if (r) o.rotation.set(r[0], r[1], r[2]); if (s) o.scale.set(s[0], s[1], s[2]); parent.add(o); return o; };
    const group = (parent, p) => { const g = new THREE.Group(); if (p) g.position.copy(p); parent.add(g); return g; };
    // tapered limb pointing down -y with rounded ends (lathe)
    const limbGeo = (r0, r1, len, seg = 20) => {
      const pts = [];
      for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(a) * r0, Math.cos(a) * r0 * 0.7)); }
      for (let i = 1; i < 8; i++) { const u = i / 8; pts.push(new THREE.Vector2(r0 + (r1 - r0) * u, -len * u)); }
      for (let i = 0; i <= 6; i++) { const a = Math.PI / 2 - (i / 6) * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(a) * r1, -len - Math.cos(a) * r1 * 0.7)); }
      pts.reverse(); return new THREE.LatheGeometry(pts, seg);
    };

    const root = new THREE.Group(); root.name = 'guide3d';
    const H = 98;
    const hips = group(root, V(0, H, 0));
    // pelvis / jeans top
    { const p = [[0, -12], [11.5, -12], [13.0, -8], [13.2, -4], [12.8, -1], [0, -1]].map(([r, y]) => new THREE.Vector2(r, y));
      const g = new THREE.LatheGeometry(p, 28); mesh(g, M.jeans, hips, null, null, [1.05, 1, 0.6]); }
    // torso (tee) on a spine joint
    const spine = group(hips, V(0, 0, 0));
    const chest = group(spine, V(0, 0, 0));
    { const prof = [[14.5, -10], [14.1, -5], [13.4, 8], [14.2, 18], [15.9, 29], [16.8, 37], [16.6, 42], [14.6, 46], [10, 48.6], [6.2, 49.4], [5.4, 49.6]];
      const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 40);
      const torso = mesh(g, M.tee, chest, null, null, [1.1, 1, 0.62]);
      mesh(new THREE.TorusGeometry(14.4, 0.6, 8, 40), M.teeDark, chest, V(0, -9.5, 0), [Math.PI / 2, 0, 0], [1.1, 0.62, 1]);
      mesh(new THREE.TorusGeometry(5.7, 0.75, 8, 28), M.teeDark, chest, V(0, 49.2, 0.3), [Math.PI / 2 - 0.12, 0, 0], [1.05, 0.78, 1]);
      // fold lines
      mesh(new THREE.TorusGeometry(9, 0.22, 6, 20, 1.1), M.teeDark, chest, V(-2.5, 20, 7.6), [0.05, 0.2, 2.2]);
      // gear logo on the left chest
      const gs = new THREE.Shape(); const n = 8, R = 2.3, r = 1.75;
      for (let i = 0; i < n * 4; i++) { const a = (i / (n * 4)) * Math.PI * 2, rr = (i % 4 < 2) ? R : r; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? gs.lineTo(x, y) : gs.moveTo(x, y); }
      const hole = new THREE.Path(); hole.absarc(0, 0, 0.75, 0, Math.PI * 2, true); gs.holes.push(hole);
      const gear = mesh(new THREE.ExtrudeGeometry(gs, { depth: 0.12, bevelEnabled: false }), M.white, chest, V(6.2, 33, 9.95), [0, 0.36, 0]);
      gear.castShadow = false;
    }
    // neck + head
    const neck = group(chest, V(0, 48.5, -0.4));
    mesh(new THREE.CylinderGeometry(4.3, 4.8, 8, 20), M.skin, neck, V(0, 3.0, 0));
    const head = group(neck, V(0, 4.6, 0.6));
    const face = group(head, V(0, 11.5, 0.6));
    { const g = new THREE.SphereGeometry(10.1, 56, 44), pos = g.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        let { x, y, z } = v;
        const t = Math.max(0, Math.min(1, (-y - 1.5) / 7.5));         // jaw taper below the cheekbones
        x *= 1 - 0.26 * t * t; if (z > 0) z = z * (1 - 0.18 * t) + 1.1 * t * t * (z / 10.1);
        if (y < -7) y -= 0.6 * (z > 0 ? 1 : 0.3);                      // chin
        if (z < 0 && y > -2) z *= 1.06;                                 // back of the skull
        if (z > 6 && Math.abs(x) < 3 && y > -2 && y < 4) z += 0.3;      // brow ridge / nose bridge
        pos.setXYZ(i, x * 0.84, y * 1.13, z);
      }
      g.computeVertexNormals(); mesh(g, M.skin, face); }
    // ears
    for (const s of [-1, 1]) {
      const ear = mesh(new THREE.SphereGeometry(1.6, 16, 12), M.skin, face, V(s * 8.35, 0.2, -0.8), [0, s * 0.35, 0], [0.42, 1.0, 0.8]);
      mesh(new THREE.TorusGeometry(0.9, 0.22, 6, 14, 4.4), M.skinSh, ear, V(s * 0.6, 0, 0.1), [0, s * Math.PI / 2, 1.6], [1, 1.2, 1]);
    }
    // nose
    mesh(new THREE.SphereGeometry(1.0, 18, 14), M.skin, face, V(0, -1.6, 9.85), [0.35, 0, 0], [0.95, 1.55, 1.1]);
    for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.62, 12, 10), M.skin, face, V(s * 0.95, -2.75, 9.45), null, [1, 0.8, 0.9]);
    // eyes (eyeball + iris + pupil + glint) with lids
    const eyes = [];
    for (const s of [-1, 1]) {
      const sock = group(face, V(s * 3.3, 1.2, 8.35));
      const ball = group(sock);
      mesh(new THREE.SphereGeometry(1.28, 24, 18), M.eyeW, ball);
      mesh(new THREE.SphereGeometry(0.68, 20, 14), M.iris, ball, V(0, 0, 1.02), null, [1, 1, 0.42]);
      mesh(new THREE.SphereGeometry(0.36, 14, 10), M.pupil, ball, V(0, 0, 1.22), null, [1, 1, 0.35]);
      const gl = mesh(new THREE.SphereGeometry(0.14, 8, 6), M.glint, ball, V(0.24, 0.28, 1.36)); gl.castShadow = false;
      const lidG = new THREE.SphereGeometry(1.42, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      const up = group(sock); mesh(lidG, M.skin, up);
      const lo = group(sock); mesh(lidG, M.skin, lo, null, [Math.PI, 0, 0]);
      // lash line on the upper lid
      mesh(new THREE.TorusGeometry(1.42, 0.16, 6, 24, Math.PI), M.brow, up, null, [0, 0, 0]);
      eyes.push({ sock, ball, up, lo, s });
    }
    // brows
    const brows = [];
    for (const s of [-1, 1]) {
      const curve = new THREE.CatmullRomCurve3([V(-1.9, -0.2, 0), V(-0.4, 0.35, 0.25), V(1.2, 0.25, 0.1), V(2.2, -0.35, -0.3)].map((p) => V(p.x * s, p.y, p.z)));
      const b = group(face, V(s * 3.3, 3.9, 8.9));
      mesh(new THREE.TubeGeometry(curve, 16, 0.48, 8), M.brow, b, null, null, [1, 1, 1]);
      brows.push({ b, s });
    }
    // mouth: lip curves for closed shapes, cavity/teeth/tongue for open shapes
    const mouth = group(face, V(0, -5.2, 8.75));
    const lipCurve = (bend, w = 2.6) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-w, bend * 0.9, -0.5), V(-w * 0.5, -bend * 0.15, 0.05), V(0, -bend * 0.35, 0.25), V(w * 0.5, -bend * 0.15, 0.05), V(w, bend * 0.9, -0.5)]), 20, 0.32, 8);
    const lips = { smile: mesh(lipCurve(0.9), M.lip, mouth), flat: mesh(lipCurve(0.05, 2.2), M.lip, mouth), frown: mesh(lipCurve(-0.7, 2.2), M.lip, mouth) };
    const cav = mesh(new THREE.SphereGeometry(1, 24, 16), M.cavity, mouth, V(0, -0.3, -0.1));
    const teeth = mesh(new THREE.BoxGeometry(3.6, 0.75, 0.6), M.teeth, mouth, V(0, 0.35, 0.2));
    const teethLo = mesh(new THREE.BoxGeometry(3.2, 0.55, 0.6), M.teeth, mouth, V(0, -0.9, 0.1));
    const tongue = mesh(new THREE.SphereGeometry(1, 16, 10), M.tongue, mouth, V(0, -0.9, 0.15));
    const openLip = mesh(new THREE.TorusGeometry(1, 0.26, 8, 30), M.lip, mouth, V(0, -0.3, 0.15));
    // sweat drop
    const sweat = mesh(new THREE.SphereGeometry(0.75, 14, 10), M.sweat, face, V(7.2, 5.5, 3.5), null, [1, 1.5, 1]);
    // hair: cap + messy swept clumps (deterministic)
    { // sculpted hair: one shell around the skull, hairline mask, swept-up quiff and clumped strands
      const hair = group(face, V(0, 0, 0));
      const g = new THREE.SphereGeometry(10.1, 96, 64, 0, Math.PI * 2, 0, Math.PI * 0.66), pos = g.attributes.position, n = new THREE.Vector3();
      const sm = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
      for (let i = 0; i < pos.count; i++) {
        n.fromBufferAttribute(pos, i).normalize();
        const hy = n.z > 0 ? 0.0 + 0.5 * n.z : 0.0 + 0.62 * n.z;                // hairline height: high on the forehead, low at the nape
        const m = sm(hy - 0.04, hy + 0.1, n.y);                                    // 0 below the hairline, 1 above
        const ang = Math.atan2(n.x, n.z);
        const strands = 0.045 * Math.sin(ang * 13 + n.y * 7) + 0.03 * Math.sin(ang * 29 - n.y * 11);
        const quiff = 0.26 * Math.exp(-((n.z - 0.62) ** 2 + (n.y - 0.72) ** 2) / 0.07) * (1 + 0.5 * Math.sin(ang * 9));
        const top = 0.1 * Math.max(0, n.y);
        const r = 10.1 * (0.86 + m * (0.2 + top + quiff + strands * m));
        pos.setXYZ(i, n.x * r * 0.84, n.y * r * 1.13, n.z * r);
      }
      g.computeVertexNormals();
      mesh(g, M.hair, hair);
      // a few loose tufts on the quiff for the messy look
      let seed = 5; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      const tuft = new THREE.ConeGeometry(1.7, 5.5, 9);
      for (let i = 0; i < 9; i++) {
        const ang = (rnd() - 0.5) * 1.6, el = 0.55 + rnd() * 0.35;
        const d = V(Math.sin(ang) * Math.cos(el), Math.sin(el), Math.cos(ang) * Math.cos(el) * 0.9).normalize();
        const c = mesh(tuft, M.hair, hair, V(d.x * 11.3 * 0.84, d.y * 11.3 * 1.13 + 0.5, d.z * 11.0));
        c.quaternion.setFromUnitVectors(V(0, 1, 0), V(d.x * 0.6, 0.75, 0.55 + 0.2 * rnd()).normalize());
        c.scale.set(1, 0.8 + rnd() * 0.5, 0.6);
      }
      for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.9, 3.8, 2.2), M.hair, hair, V(s * 8.2, 1.8, 1.6), [0, 0, s * 0.08]);
    }
    // arms: shoulder → upper arm → elbow → forearm → wrist → hand
    const UA = 28, FA = 25.5;
    const arms = {};
    for (const [side, s] of [['L', 1], ['R', -1]]) {
      const sh = group(chest, V(s * 17.2, 43.5, -0.6));
      mesh(new THREE.SphereGeometry(5.3, 20, 14), M.tee, sh, V(-s * 1.6, 0.2, 0), null, [1, 0.9, 0.95]);   // shoulder cap
      mesh(limbGeo(5.3, 5.0, 11), M.tee, sh, V(0, 0.5, 0));                                                    // sleeve
      mesh(new THREE.TorusGeometry(5.2, 0.45, 8, 24), M.teeDark, sh, V(0, -10.6, 0), [Math.PI / 2, 0, 0]);
      mesh(limbGeo(4.8, 4.0, UA - 2), M.skin, sh, V(0, -2, 0));
      const el = group(sh, V(0, -UA, 0));
      mesh(new THREE.SphereGeometry(4.0, 16, 12), M.skin, el);
      mesh(limbGeo(4.0, 2.75, FA - 1.5), M.skin, el);
      const wr = group(el, V(0, -FA, 0));
      // hand: palm faces the body (−s·x), thumb forward (+z); fingers in 2 segments
      const hand = group(wr);
      mesh(new THREE.SphereGeometry(1, 18, 12), M.skin, hand, V(0, -4.3, 0.2), null, [1.55, 4.5, 3.9]);
      const fingers = [];
      [[-2.55, 3.0, 2.2], [-0.85, 3.5, 2.6], [0.85, 3.35, 2.5], [2.45, 2.7, 2.0]].forEach(([zz, l1, l2], i) => {
        const f0 = group(hand, V(0, -8.3, -zz * 0.92 + 0.3));
        mesh(limbGeo(0.86, 0.78, l1 - 0.6, 10), M.skin, f0);
        const f1 = group(f0, V(0, -l1, 0));
        mesh(limbGeo(0.78, 0.66, l2 - 0.5, 10), M.skin, f1);
        fingers.push([f0, f1, i]);
      });
      const th0 = group(hand, V(-s * 0.4, -3.0, 3.0)); th0.rotation.set(0.75, 0, 0);
      mesh(limbGeo(1.05, 0.9, 2.6, 10), M.skin, th0);
      const th1 = group(th0, V(0, -3.0, 0)); mesh(limbGeo(0.9, 0.78, 2.1, 10), M.skin, th1);
      arms[side] = { s, sh, el, wr, hand, fingers, th0, th1 };
    }
    // legs
    const TH = 42, SH = 40;
    const legs = {};
    for (const [side, s] of [['L', 1], ['R', -1]]) {
      const hp = group(hips, V(s * 8.4, -10, 0));
      mesh(limbGeo(7.3, 5.6, TH), M.jeans, hp);
      const kn = group(hp, V(0, -TH, 0));
      mesh(new THREE.SphereGeometry(5.5, 16, 12), M.jeans, kn);
      mesh(limbGeo(5.4, 4.6, SH - 2), M.jeans, kn);
      mesh(new THREE.CylinderGeometry(5.0, 5.2, 3.2, 20), M.jeans, kn, V(0, -SH + 3.6, 0));                 // hem
      const an = group(kn, V(0, -SH, 0));
      // sneaker: side profile extruded across the foot
      const sp = new THREE.Shape();
      sp.moveTo(-6.5, 0); sp.lineTo(20.5, 0); sp.quadraticCurveTo(23.2, 0.3, 23, 3.0); sp.quadraticCurveTo(22.2, 5.4, 17.5, 6.4);
      sp.lineTo(9.5, 8.2); sp.quadraticCurveTo(5, 11.2, 2.4, 11.4); sp.lineTo(-4.6, 11.2); sp.quadraticCurveTo(-7.2, 10.6, -7.2, 7); sp.lineTo(-7.2, 1.6); sp.quadraticCurveTo(-7.1, 0, -6.5, 0);
      const shoeG = new THREE.ExtrudeGeometry(sp, { depth: 8.6, bevelEnabled: true, bevelThickness: 0.9, bevelSize: 0.9, bevelSegments: 3, curveSegments: 12 });
      shoeG.rotateY(-Math.PI / 2); shoeG.translate(4.3, -7.2, 0);
      const foot = group(an);
      mesh(shoeG, M.shoe, foot);
      const soleS = new THREE.Shape(); soleS.moveTo(-7.4, -0.4); soleS.lineTo(21, -0.4); soleS.quadraticCurveTo(23.9, 0, 23.6, 2.2); soleS.lineTo(-7.6, 2.2); soleS.lineTo(-7.4, -0.4);
      const soleG = new THREE.ExtrudeGeometry(soleS, { depth: 10.2, bevelEnabled: false }); soleG.rotateY(-Math.PI / 2); soleG.translate(5.1, -7.4, 0);
      mesh(soleG, M.sole, foot);
      for (let i = 0; i < 3; i++) mesh(new THREE.BoxGeometry(5.0, 0.45, 0.8), M.lace, foot, V(0, 1.3 - i * 1.0 - 7.2 + 8.6, 6.0 + i * 2.2), [-0.45, 0, 0]);
      legs[side] = { s, hp, kn, an, foot };
    }

    // ---------- pose
    let state = Object.assign({}, D);
    const fingerPose = (A, kind) => {
      const curl = { open: [0.08, 0.1], fist: [1.5, 1.45], grip: [1.2, 1.1], point: [1.5, 1.45] }[kind] || [0.1, 0.1];
      A.fingers.forEach(([f0, f1, i]) => {
        const c = kind === 'point' && i === 0 ? [0.05, 0.05] : curl;   // index = the front finger (i 0, nearest the thumb)
        const sp = kind === 'open' ? (i - 1.5) * 0.08 : 0;
        f0.rotation.set(sp, 0, -A.s * -c[0]); f1.rotation.set(0, 0, -A.s * -c[1]);
      });
      const tc = kind === 'open' ? [0.75, 0.1] : kind === 'point' ? [0.35, 0.9] : [0.25, 1.0];
      A.th0.rotation.set(tc[0], 0, A.s * 0.35 * (kind === 'open' ? 0 : 1)); A.th1.rotation.set(tc[1] * 0.4, 0, A.s * tc[1] * 0.6);
    };
    // index finger sits at the thumb side (+z): flip the finger order so i=0 is front
    for (const A of Object.values(arms)) A.fingers.sort((a, b) => b[0].position.z - a[0].position.z).forEach((f, i) => (f[2] = i));

    function setArm(A, a) {
      // fwd: raise forward, out: raise to the side, twist: rotate the arm about its own axis, bend: elbow
      A.sh.rotation.set(-a.fwd, A.s * (a.twist || 0), A.s * a.out, 'ZXY');
      A.el.rotation.set(-(a.bend || 0), 0, 0);
      A.wr.rotation.set(0, 0, 0);
    }
    function setLeg(L, l, crouch) {
      L.hp.rotation.set(-(l.fwd || 0) - crouch * 0.9, 0, L.s * (l.out || 0));
      L.kn.rotation.set((l.bend || 0) + crouch * 1.7, 0, 0);
      L.an.rotation.set(-((l.fwd || 0) + (l.bend || 0)) * 0.3 - crouch * 0.8 + crouch * 0.9, 0, -L.s * (l.out || 0));
    }
    function pose(st) {
      state = Object.assign({}, D, st);
      const s = state;
      root.position.set(s.x, s.y, s.z); root.rotation.set(0, s.face, 0);
      hips.position.y = H - s.crouch * 22 + s.bob;
      spine.rotation.set(s.lean * 0.6 + s.crouch * 0.35, s.twist * 0.5, s.side);
      chest.rotation.set(s.lean * 0.4, s.twist * 0.5, 0);
      neck.rotation.set(s.head[0] * 0.4, s.head[1] * 0.4, s.head[2] * 0.4);
      head.rotation.set(s.head[0] * 0.6 - s.lean * 0.5, s.head[1] * 0.6, s.head[2] * 0.6);
      setArm(arms.L, Object.assign({}, D.armL, s.armL)); setArm(arms.R, Object.assign({}, D.armR, s.armR));
      setLeg(legs.L, Object.assign({}, D.legL, s.legL), s.crouch); setLeg(legs.R, Object.assign({}, D.legR, s.legR), s.crouch);
      fingerPose(arms.L, s.handL); fingerPose(arms.R, s.handR);
      // eyes
      const lid = { open: [-0.95, 0.95], wide: [-1.35, 1.3], happy: [0.05, 0.55], squint: [-0.15, 0.6], closed: [0.25, 0.5], half: [-0.4, 0.9] }[s.eyes] || [-0.95, 0.95];
      eyes.forEach((e) => {
        e.ball.rotation.set(-s.gaze[1] * 0.35, s.gaze[0] * 0.45, 0);
        e.up.rotation.set(lid[0], 0, 0); e.lo.rotation.set(lid[1], 0, 0);
        const sc = s.eyes === 'wide' ? 1.12 : 1; e.sock.scale.setScalar(sc);
      });
      const B = { neutral: [0, 0], raised: [0.9, 0.05], worried: [0.4, -0.32], angry: [-0.55, 0.38], confident: [-0.1, 0.18] }[s.brows] || [0, 0];
      brows.forEach(({ b, s: sd }) => { b.position.y = 3.9 + B[0]; b.rotation.z = sd * B[1]; });
      // mouth
      for (const k in lips) lips[k].visible = false;
      cav.visible = teeth.visible = teethLo.visible = tongue.visible = openLip.visible = false;
      const openM = (w, h, t, tl, tg) => { cav.visible = openLip.visible = true; cav.scale.set(w, h, 0.7); openLip.scale.set(w, h, 1); teeth.visible = t; teethLo.visible = tl; tongue.visible = tg; tongue.scale.set(w * 0.6, h * 0.4, 0.6); tongue.position.y = -0.3 - h * 0.45; teethLo.position.y = -0.3 - h * 0.55; teeth.position.set(0, -0.3 + h * 0.5, -0.05); teeth.scale.x = w / 2.6; };
      switch (s.mouth) {
        case 'smile': lips.smile.visible = true; break;
        case 'flat': lips.flat.visible = true; break;
        case 'frown': lips.frown.visible = true; break;
        case 'grin': openM(2.5, 1.05, true, false, false); break;
        case 'open': openM(2.3, 1.6, true, false, true); break;
        case 'shocked': openM(1.55, 2.2, true, false, true); break;
        case 'o': openM(0.95, 1.2, false, false, false); break;
        case 'strain': openM(2.6, 0.85, true, true, false); break;
        default: lips.smile.visible = true;
      }
      sweat.visible = s.sweat > 0.01;
      root.updateMatrixWorld(true);
    }

    // ---------- two-bone IK (hand grip point onto a world target)
    const gripLocal = V(0, -8.6, 1.0);
    const tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), DOWN = V(0, -1, 0);
    function aim(bone, targetW) {
      bone.updateMatrixWorld(true);
      const bp = bone.getWorldPosition(new THREE.Vector3());
      const dir = targetW.clone().sub(bp).normalize();
      bone.parent.getWorldQuaternion(tmpQ); dir.applyQuaternion(tmpQ.clone().invert());
      bone.quaternion.setFromUnitVectors(DOWN, dir);
      bone.updateMatrixWorld(true);
    }
    function reach(side, targetW, poleW) {
      const A = arms[side];
      root.updateMatrixWorld(true);
      const S = A.sh.getWorldPosition(new THREE.Vector3());
      const L1 = UA, L2 = FA + gripLocal.length() * 0.92;
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
      // twist the wrist so the thumb points up-ish
      A.wr.rotation.set(0, A.s * 0.6, 0); A.wr.updateMatrixWorld(true);
    }
    function handGrip(side) { const A = arms[side]; A.hand.updateMatrixWorld(true); return A.hand.localToWorld(gripLocal.clone()); }
    function headTop() { face.updateMatrixWorld(true); return face.localToWorld(V(0, 12, 0)); }
    pose({});
    return { root, pose, reach, handGrip, headTop, arms, legs, POSES, state: () => state };
  }
  return { create, POSES, defaults: D };
})();
if (typeof window !== 'undefined') window.Guide3D = Guide3D;
if (typeof module !== 'undefined') module.exports = Guide3D;
