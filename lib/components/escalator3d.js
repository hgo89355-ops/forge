/* Escalator3D — reusable, physically-driven escalator cutaway (Three.js, style v4). Units: cm.
 * Each step: front "step wheels" ride the drive track (on the step chain), rear "trailer wheels" ride the
 * trailer track. On the working side the trailer track is the drive track shifted by a constant offset, so the
 * tread stays level (incline included). Around the top/bottom sprockets the offset rotates with the chain, so the
 * step flips and returns underneath upside down. Works in any frame size (camera is the caller's).
 *
 *   const esc = Escalator3D.build(THREE, scene, { rise: 300, angle: 30 });
 *   esc.update(t, { speed: 50, highlightStep: 7 });   // t seconds, speed cm/s (≈0.5 m/s)
 *   esc.points.*  -> named world points for labels (driveGear, motor, track1, track2, stepWheel, trailerWheel, comb)
 */
const Escalator3D = (function () {
  function build(THREE, scene, opts = {}) {
    const rise = opts.rise ?? 300, ang = ((opts.angle ?? 30) * Math.PI) / 180, R = 34, LAND = 110, FILLET = 140, DROP = 2 * R;
    const run = rise / Math.tan(ang);
    const X1 = 0, X2 = run, XT = run + LAND; // incline from X1 to X2; top sprocket at XT
    const XB = -LAND;                         // bottom sprocket
    // working-side profile with smooth fillets (y of the drive track)
    function prof(x) {
      const f = FILLET;
      if (x <= X1 - f / 2) return 0;
      if (x >= X2 + f / 2) return rise;
      if (x < X1 + f / 2) { const u = (x - (X1 - f / 2)) / f; return Math.tan(ang) * f * u * u / 2; }
      if (x > X2 - f / 2) { const u = (X2 + f / 2 - x) / f; return rise - Math.tan(ang) * f * u * u / 2; }
      return Math.tan(ang) * (x - X1);
    }
    // sample the closed drive loop: working (XB→XT), top arc, return (XT→XB, below by DROP), bottom arc
    const pts = [], ori = []; // ori: step flip angle along the loop (0 = upright, PI = upside down)
    const N = 1600;
    for (let i = 0; i <= N; i++) { const x = XB + ((XT - XB) * i) / N; pts.push([x, prof(x)]); ori.push(0); }
    for (let i = 1; i <= 60; i++) { const a = Math.PI / 2 - (Math.PI * i) / 60; pts.push([XT + R * Math.cos(a), rise - R + R * Math.sin(a)]); ori.push((Math.PI * i) / 60); }
    for (let i = 1; i <= N; i++) { const x = XT - ((XT - XB) * i) / N; pts.push([x, prof(x) - DROP]); ori.push(Math.PI); }
    for (let i = 1; i < 60; i++) { const a = -Math.PI / 2 - (Math.PI * i) / 60; pts.push([XB + R * Math.cos(a), -R + R * Math.sin(a)]); ori.push(Math.PI + (Math.PI * i) / 60); }
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const LOOP = cum[cum.length - 1] + Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
    function at(s) {
      s = ((s % LOOP) + LOOP) % LOOP;
      let lo = 0, hi = cum.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
      const a = pts[lo], b = pts[hi] || pts[0], u = (s - cum[lo]) / Math.max(1e-6, (cum[hi] ?? LOOP) - cum[lo]);
      const oa = ori[lo], ob = ori[hi] ?? 2 * Math.PI;
      return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, flip: oa + (ob - oa) * u };
    }
    const TREAD = 40, GAP = 0.6, PITCH = TREAD + GAP, NSTEP = Math.floor(LOOP / PITCH);
    const V0 = [-30, -9]; // trailer-wheel axle relative to the step-wheel axle, when upright
    const rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];

    const std = (c, m, r, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, metalness: m, roughness: r }, extra));
    const M = {
      alu: std(0xc9ced4, 0.85, 0.32), aluDark: std(0x9aa1aa, 0.8, 0.4), steel: std(0x8e959e, 0.85, 0.4), frame: std(0xb3b9c1, 0.6, 0.5),
      yellow: std(0xf2c230, 0.2, 0.45), blue: std(0x1f4fe0, 0.3, 0.35), lightBlue: std(0x4fa3e8, 0.3, 0.35), red: std(0xd7262b, 0.35, 0.35),
      orange: std(0xf08a24, 0.4, 0.35), rubber: std(0x1b1d22, 0.0, 0.6), glass: new THREE.MeshStandardMaterial({ color: 0xdff0ff, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
      chain: std(0x5d636c, 0.9, 0.35),
    };
    const root = new THREE.Group(); scene.add(root);
    const Z = 50; // half width (steps 100 cm wide)

    // ---- steps
    function stepMesh() {
      const g = new THREE.Group();
      // tread with cleats (grooves)
      const tread = new THREE.Mesh(new THREE.BoxGeometry(TREAD - 1, 3, 2 * Z - 4), M.alu); tread.position.set(-TREAD / 2 + 1, 10, 0); g.add(tread);
      for (let k = 0; k < 18; k++) { const c = new THREE.Mesh(new THREE.BoxGeometry(TREAD - 3, 1.2, 1.6), M.aluDark); c.position.set(-TREAD / 2 + 1, 12, -Z + 6 + k * 5.2); g.add(c); }
      const edgeF = new THREE.Mesh(new THREE.BoxGeometry(3, 3.4, 2 * Z - 4), M.yellow); edgeF.position.set(-0.5, 10.2, 0); g.add(edgeF);
      for (const zz of [-Z + 3, Z - 3]) { const e = new THREE.Mesh(new THREE.BoxGeometry(TREAD - 1, 3.4, 3), M.yellow); e.position.set(-TREAD / 2 + 1, 10.2, zz); g.add(e); }
      // riser (front, curved-ish) and side brackets
      const riser = new THREE.Mesh(new THREE.BoxGeometry(2, 22, 2 * Z - 6), M.aluDark); riser.position.set(0.5, -1, 0); g.add(riser);
      for (const zz of [-Z + 4, Z - 4]) { const br = new THREE.Mesh(new THREE.BoxGeometry(TREAD - 4, 14, 2), M.steel); br.position.set(-TREAD / 2 + 2, 2, zz); g.add(br); }
      // wheels: step wheels (blue, outer) on the chain axle; trailer wheels (light blue, inner)
      const wheel = (mat, x, y, z) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 3, 24), mat); w.rotation.x = Math.PI / 2; w.position.set(x, y, z); g.add(w); };
      wheel(M.blue, 0, 0, -Z - 2); wheel(M.blue, 0, 0, Z + 2); wheel(M.lightBlue, V0[0], V0[1], -Z + 6); wheel(M.lightBlue, V0[0], V0[1], Z - 6);
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2 * Z + 6, 10), M.steel); axle.rotation.x = Math.PI / 2; g.add(axle);
      g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      return g;
    }
    const steps = [];
    for (let i = 0; i < NSTEP; i++) { const m = stepMesh(); root.add(m); steps.push(m); }

    // ---- tracks (tubes along the loop) — drive track (blue) and trailer track (light blue)
    function tube(points, r, mat, z) {
      const curve = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, z)), true);
      const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(1200, points.length), r, 8, true), mat); m.castShadow = true; root.add(m); return m;
    }
    const driveP = [], trailP = [];
    for (let s = 0; s < LOOP; s += 6) {
      const p = at(s); const d = rot([0, -6.5], -p.flip); driveP.push([p.x + d[0], p.y + d[1]]);
      const o = rot([V0[0], V0[1] - 6.5], -p.flip); trailP.push([p.x + o[0], p.y + o[1]]);
    }
    tube(driveP, 2.2, M.blue, -Z - 2); tube(trailP, 2.2, M.lightBlue, -Z + 6);
    // chain (dark) along the drive loop on the far side
    const chainP = []; for (let s = 0; s < LOOP; s += 6) { const p = at(s); chainP.push([p.x, p.y]); }
    tube(chainP, 1.2, M.chain, -Z - 6);

    // ---- sprockets: drive gear (red, top) + bottom sprocket (blue), motor (orange)
    function gear(r, teeth, mat) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.86, r * 0.86, 6, 48), mat); body.rotation.x = Math.PI / 2; g.add(body);
      for (let k = 0; k < teeth; k++) { const a = (k / teeth) * Math.PI * 2; const tth = new THREE.Mesh(new THREE.BoxGeometry(r * 0.22, r * 0.2, 6), mat); tth.position.set(Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93, 0); tth.rotation.z = a; g.add(tth); }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.25, r * 0.25, 8, 24), M.steel); hub.rotation.x = Math.PI / 2; g.add(hub);
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      return g;
    }
    const topGear = gear(R + 2, 18, M.red); topGear.position.set(XT, rise - R, -Z - 6); root.add(topGear);
    const botGear = gear(R + 2, 18, M.blue); botGear.position.set(XB, -R, -Z - 6); root.add(botGear);
    const motor = new THREE.Group(); motor.position.set(XT + 75, rise - R - 10, -Z - 20); root.add(motor);
    { const body = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 52, 40), M.orange); body.rotation.z = Math.PI / 2; motor.add(body);
      for (let k = 0; k < 10; k++) { const fin = new THREE.Mesh(new THREE.CylinderGeometry(23.5, 23.5, 1.4, 40), M.orange); fin.rotation.z = Math.PI / 2; fin.position.x = -20 + k * 4.4; motor.add(fin); }
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 6, 32), M.steel); cap.rotation.z = Math.PI / 2; cap.position.x = 29; motor.add(cap);
      motor.traverse((o) => { if (o.isMesh) o.castShadow = true; }); }

    // ---- truss / frame (far side wall + floor), comb plates, balustrade glass + handrail
    const frameShape = new THREE.Shape();
    frameShape.moveTo(XB - 60, -DROP - 60); frameShape.lineTo(XT + 140, rise - DROP - 60); frameShape.lineTo(XT + 140, rise + 30);
    frameShape.lineTo(X2 + 40, rise + 30); frameShape.lineTo(X1 - 40, 30); frameShape.lineTo(XB - 60, 30); frameShape.closePath();
    const wall = new THREE.Mesh(new THREE.ExtrudeGeometry(frameShape, { depth: 4, bevelEnabled: false }), M.frame); wall.position.z = -Z - 30; wall.receiveShadow = true; root.add(wall);
    const floorB = new THREE.Mesh(new THREE.BoxGeometry(LAND + 40, 4, 2 * Z + 60), M.steel); floorB.position.set(XB - 20, 12, 0); root.add(floorB);
    const floorT = new THREE.Mesh(new THREE.BoxGeometry(LAND + 120, 4, 2 * Z + 60), M.steel); floorT.position.set(XT + 40, rise + 12, 0); root.add(floorT);
    const comb = (x, y, dir) => { const c = new THREE.Mesh(new THREE.BoxGeometry(14, 3, 2 * Z - 4), M.yellow); c.position.set(x, y, 0); root.add(c);
      for (let k = 0; k < 18; k++) { const tth = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 1.2), M.yellow); tth.position.set(x + dir * 9, y - 0.6, -Z + 6 + k * 5.2); root.add(tth); } return c; };
    const combB = comb(XB + 20, 14, 1), combT = comb(XT - 20, rise + 14, -1);
    floorB.position.x = XB - 20 - LAND / 2 + 30; floorT.position.x = XT + 70;
    // glass balustrade (near side removed for the cutaway, far side kept) + handrail
    const glassShape = new THREE.Shape();
    glassShape.moveTo(X1 - 60, 22); glassShape.lineTo(X2 + 60, rise + 22); glassShape.lineTo(X2 + 60, rise + 110); glassShape.lineTo(X1 - 60, 110); glassShape.closePath();
    const glass = new THREE.Mesh(new THREE.ShapeGeometry(glassShape), M.glass); glass.position.z = -Z - 10; root.add(glass);
    const hr = []; for (let x = X1 - 120; x <= X2 + 120; x += 8) hr.push(new THREE.Vector3(x, prof(x) + 105, -Z - 10));
    const handrail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hr), 200, 4.5, 10, false), M.rubber); handrail.castShadow = true; root.add(handrail);

    const P = (x, y, z) => new THREE.Vector3(x, y, z);
    const api = {
      root, steps, LOOP, NSTEP, PITCH, at, rise, run, XT, XB, R,
      points: {
        driveGear: P(XT, rise - R, -Z - 6), motor: P(XT + 75, rise - R + 14, -Z - 20), bottomGear: P(XB, -R, -Z - 6),
        track1: P(run * 0.55, prof(run * 0.55) - 6.5, -Z - 2), track2: P(run * 0.45 - 30, prof(run * 0.45) - 15.5, -Z + 6),
        comb: P(XT - 20, rise + 14, 0), handrail: P(run * 0.5, prof(run * 0.5) + 105, -Z - 10),
      },
      // stepPose(i, t, speed) -> {x, y, flip}; the caller may read it to follow a step with the camera
      stepPose(i, t, speed) { return at(i * PITCH + t * speed); },
      update(t, o = {}) {
        const v = o.speed ?? 50;
        steps.forEach((m, i) => {
          const p = at(i * PITCH + t * v);
          m.position.set(p.x, p.y, 0); m.rotation.set(0, 0, -p.flip);
          m.visible = !(o.hideReturn && Math.cos(p.flip) < 0.5);
        });
        const gearAng = -(t * v) / R;
        topGear.rotation.z = gearAng; botGear.rotation.z = gearAng;
        if (o.highlightStep !== undefined) steps.forEach((m, i) => { m.userData.hl = i === o.highlightStep; });
      },
    };
    return api;
  }
  return { build };
})();
if (typeof window !== 'undefined') window.Escalator3D = Escalator3D;
