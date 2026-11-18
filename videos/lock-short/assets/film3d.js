/* Style v4 renderer for the lock Short: Three.js 3D cutaway + SVG overlay (labels, title tag, guide).
 * Film3D.mount(canvas, svg) -> { renderAt(t) }. Everything is a pure function of t.
 * Physics comes from LockCutaway (pin stacks, turn permission); timing from FilmScript.
 */
const Film3D = (function () {
  let W = 1080, H = 1920;
  const COL = { steel: 0xa9b1bb, steelBore: 0x7c848e, steelCut: 0xc4cad2, brass: 0xd8ad4f, brassBore: 0xc69a45, brassCut: 0xead08c,
    keyPin: 0x1f4fe0, driver: 0xd7262b, spring: 0xb4bac2, key: 0xd3d9e0, yellow: 0xf2c230, ok: 0x1e9e57, bad: 0xe0393e,
    wood: 0xb07a45, woodL: 0xd6a66c, woodD: 0x7d522a, ground: 0xdfe3e8 };
  const INK = '#15171C', BLUE = '#1F4FE0', RED = '#E0393E', GREEN = '#1E9E57';
  const K = FilmScript.K, E = FilmScript.E;
  const G = LockCutaway.geometry;
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const ramp = (t, a, b) => clamp01((t - a) / (b - a));
  const f1 = (n) => n.toFixed(1);

  // ---------------- camera keyframes: [t, [tx,ty,tz, dist, azDeg, elDeg], ease]
  const CAM = [
    [0, [-2, -1.8, 0, 232, 24, 13]], [2.7, [-2, -1.8, 0, 224, 24, 13], 'lin'], [3.4, [13.4, 3.5, 0, 96, 24, 13], 'io'],
    [7.3, [13.4, 3.5, 0, 90, 20, 12], 'lin'], [7.95, [12, -1.8, 0, 176, 30, 15], 'io'], [11.45, [12, -1.8, 0, 170, 27, 14], 'lin'],
    [11.85, [-9, -1.8, 0, 212, 22, 13], 'io'], [13.75, [-5, -1.8, 0, 200, 21, 13], 'lin'], [14.3, [13.6, 1.5, 0, 86, 20, 10], 'io'],
    [18.9, [13.6, 1.5, 0, 82, 16, 9], 'lin'], [19.15, [10, -1.8, 0, 172, 40, 17], 'o3'], [20.35, [10, -1.8, 0, 166, 44, 18], 'lin'],
    [20.6, [-9, -1.8, 0, 212, 22, 13], 'io'], [21.25, [-6, -1.8, 0, 204, 21, 13], 'lin'], [21.85, [13.76, 4.6, 0, 58, 16, 7], 'io'],
    [22.95, [13.76, 4.6, 0, 54, 14, 6], 'lin'], [23.2, [-5, -1.8, 0, 205, 26, 14], 'o3'], [24.3, [-4, -1.8, 0, 198, 25, 14], 'lin'],
    [24.55, [12, 1.0, 0, 120, 22, 11], 'io'], [26.6, [12, 1.0, 0, 112, 18, 10], 'lin'],
    [26.95, [312, 26, 0, 250, 0, 4], 'io'], [28.9, [312, 26, 0, 240, 0, 4], 'lin'],
    [29.25, [612, 4, 0, 205, 16, 9], 'io'], [34.6, [612, 4, 0, 195, 20, 10], 'lin'],
    [34.95, [12, -1.8, 0, 178, 40, 17], 'io'], [39, [12, -1.8, 0, 170, 46, 19], 'lin'],
  ];
  // the two big moves that cross worlds use a whip (fast eased) handled by CAM eases above

  function camAt(t) {
    const v = K(t, CAM);
    const [tx, ty, tz, d, az, el] = v;
    const a = (az * Math.PI) / 180, e = (el * Math.PI) / 180;
    return { pos: [tx + d * Math.sin(a) * Math.cos(e), ty + d * Math.sin(e), tz + d * Math.cos(a) * Math.cos(e)], tgt: [tx, ty, tz] };
  }

  function mount(canvas, svg, opts) {
    if (opts && opts.w) { W = opts.w; H = opts.h; }
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1); renderer.setSize(W, H, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    // studio environment for reflections
    {
      const env = new THREE.Scene();
      const room = new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100), new THREE.MeshBasicMaterial({ color: 0x9aa1aa, side: THREE.BackSide }));
      env.add(room);
      const soft = (w, h, x, y, z, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
      soft(60, 30, -30, 40, 20, 0xffffff); soft(40, 40, 45, 10, 30, 0xe9eef5); soft(80, 10, 0, -45, 0, 0x5a6068); soft(30, 60, 0, 10, -48, 0xd0d6de);
      const pm = new THREE.PMREMGenerator(renderer);
      scene.environment = pm.fromScene(env, 0.02).texture;
    }
    const camera = new THREE.PerspectiveCamera(30, W / H, 1, 4000);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9099, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-60, 120, 120); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 10, far: 400 });
    key.shadow.bias = -0.0005; key.shadow.normalBias = 0.05; key.shadow.radius = 4;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xdfe8ff, 0.9); rim.position.set(80, 60, -90); scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffffff, 0.6); fill.position.set(90, 20, 80); scene.add(fill);

    const std = (c, m, r, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, metalness: m, roughness: r }, extra));
    const M = {
      steel: std(COL.steel, 0.85, 0.32), steelBore: std(COL.steelBore, 0.8, 0.5), steelCut: std(COL.steelCut, 0.15, 0.62),
      brass: std(COL.brass, 0.9, 0.3), brassBore: std(COL.brassBore, 0.85, 0.45), brassCut: std(COL.brassCut, 0.35, 0.5),
      keyPin: std(COL.keyPin, 0.35, 0.3), driver: std(COL.driver, 0.35, 0.32), spring: std(COL.spring, 1.0, 0.22), key: std(COL.key, 0.95, 0.26), keyBright: std(0xe4e9ef, 0.6, 0.3),
      tag: std(COL.bad, 0.1, 0.5), yellow: std(COL.yellow, 0.1, 0.4, { emissive: COL.yellow, emissiveIntensity: 0.35 }),
      ok: std(COL.ok, 0.1, 0.4, { emissive: COL.ok, emissiveIntensity: 0.35 }), bad: std(COL.bad, 0.1, 0.4, { emissive: COL.bad, emissiveIntensity: 0.35 }),
      wood: std(COL.wood, 0.0, 0.75), woodL: std(COL.woodL, 0.0, 0.7), woodD: std(COL.woodD, 0.0, 0.75),
    };
    // ground shadow catcher
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.ShadowMaterial({ opacity: 0.16 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -11.6; ground.receiveShadow = true; scene.add(ground);

    const loader = new THREE.BufferGeometryLoader();
    const fromGeo = (name, matMap) => {
      const g = loader.parse(window.LOCK_GEO[name].json);
      const mats = window.LOCK_GEO[name].mats.map((n) => matMap[n]);
      const mesh = new THREE.Mesh(g, mats); mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
    };
    const lockRoot = new THREE.Group(); scene.add(lockRoot);
    const housing = fromGeo('housing', { body: M.steel, bore: M.steelBore, cut: M.steelCut }); lockRoot.add(housing);
    const plugG = new THREE.Group(); lockRoot.add(plugG);
    const plug = fromGeo('plug', { body: M.brass, bore: M.brassBore, cut: M.brassCut }); plugG.add(plug);
    { const cam = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 2, 32), M.brass); cam.rotation.z = Math.PI / 2; cam.position.set(29.5, 0, 0); plugG.add(cam);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 8, 1.2), M.brass); tail.position.set(30.3, -3, 0); plugG.add(tail); }

    // pins
    const keyPins = [], drivers = [], springs = [];
    LockCutaway.KEYPIN_LEN.forEach((L, i) => {
      const prof = [new THREE.Vector2(0, 0), new THREE.Vector2(0.35, 0), new THREE.Vector2(1.45, 0.9), new THREE.Vector2(1.45, L - 0.15), new THREE.Vector2(1.3, L), new THREE.Vector2(0, L)];
      const kp = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), M.keyPin); kp.castShadow = true; plugG.add(kp); keyPins.push(kp);
      const dp = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, G.driverLen, 32), M.driver); dp.castShadow = true; lockRoot.add(dp); drivers.push(dp);
      const pts = []; for (let j = 0; j <= 240; j++) { const a = (j / 240) * Math.PI * 2 * 8; pts.push(new THREE.Vector3(Math.cos(a) * 1.2, j / 240, Math.sin(a) * 1.2)); }
      const sp = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 480, 0.16, 6), M.spring); lockRoot.add(sp); springs.push(sp);
    });
    // shear line strip on the cut face + gap rings
    const shear = new THREE.Mesh(new THREE.BoxGeometry(1, 0.32, 0.2), M.yellow); shear.position.set(0, G.shear, 0.12); lockRoot.add(shear);
    const rings = G.pinX.map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.18, 10, 40), M.ok); r.rotation.x = Math.PI / 2; lockRoot.add(r); return r; });

    // keys
    const keyGeoCache = {};
    function keyGeometry(bit) {
      const id = bit.join('');
      if (keyGeoCache[id]) return keyGeoCache[id];
      const s = new THREE.Shape();
      s.moveTo(-15.5 + 4, -8.6); s.lineTo(-2.6, -8.6); s.quadraticCurveTo(-2.4, -8.6, -2.4, -7.6); s.lineTo(-2.4, -6.6); s.lineTo(0, -6.6); s.lineTo(0, G.bladeBot);
      s.lineTo(G.tipLen - 1.2, G.bladeBot); s.lineTo(G.tipLen, G.bladeBot + 1.2);
      for (let u = G.tipLen; u >= 0; u -= 0.1) s.lineTo(u, G.bladeBot + LockCutaway.keyHeight(Math.max(0, u), bit));
      s.lineTo(0, 3.9); s.lineTo(-2.4, 3.9); s.lineTo(-2.4, 6.6); s.quadraticCurveTo(-2.4, 7.6, -3.4, 7.6); s.lineTo(-15.5 + 4, 7.6);
      s.quadraticCurveTo(-15.5, 7.6, -15.5, 3.6); s.lineTo(-15.5, -4.6); s.quadraticCurveTo(-15.5, -8.6, -15.5 + 4, -8.6);
      const hole = new THREE.Path(); hole.absarc(-12.2, 3.6, 1.7, 0, Math.PI * 2, true); s.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(s, { depth: 1.7, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.2, bevelSegments: 2, curveSegments: 24 });
      g.translate(0, 0, -0.85);
      keyGeoCache[id] = g; return g;
    }
    const keyMesh = new THREE.Mesh(keyGeometry(FilmScript.RIGHT), M.key); keyMesh.castShadow = true; plugG.add(keyMesh);
    const tag = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.4, 2.4), M.tag); tag.position.set(-11.6, -5.2, 0); keyMesh.add(tag);

    // key grid for "tens of thousands" (world x ~ 312)
    const grid = new THREE.Group(); grid.position.set(312, 0, 0); scene.add(grid);
    const rnd = (() => { let a = 42; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
    const gridKeys = [];
    for (let i = 0; i < 24; i++) {
      const bit = Array.from({ length: 5 }, () => Math.floor(rnd() * 10));
      const m = new THREE.Mesh(keyGeometry(bit), M.keyBright); m.castShadow = true;
      const col = i % 3, row = Math.floor(i / 3);
      m.userData.home = [-27 + col * 22, 76 - row * 8.2, 0];
      m.scale.setScalar(0.46); grid.add(m); gridKeys.push(m);
    }
    const bonkKey = new THREE.Mesh(keyGeometry([3, 7, 1, 5, 8]), M.key); bonkKey.castShadow = true; grid.add(bonkKey);

    // ancient wooden pin lock (world x ~ 612), sectioned at z = 0
    const old = new THREE.Group(); old.position.set(612, 0, 0); scene.add(old);
    const wbox = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; return b; };
    const oldPinsX = [-8, 0, 8];
    old.add(wbox(70, 52, 2, 0, 4, -9, M.woodL)); // door plank behind
    const housingO = new THREE.Group(); old.add(housingO);
    housingO.add(wbox(32, 3, 8, 0, 21.5, -4, M.wood)); // top
    housingO.add(wbox(32, 20, 2, 0, 11, -7, M.wood)); // back
    for (const x of [-14.5, -4, 4, 14.5]) housingO.add(wbox(x === -14.5 || x === 14.5 ? 3 : 4.2, 20, 8, x, 11, -4, M.wood));
    const bolt = new THREE.Group(); old.add(bolt);
    // bolt top bar with pin holes (segments), channel, bottom bar, back
    const segs = [[-30, -11], [-5, -3], [3, 5], [11, 34]];
    for (const [a, b] of segs) bolt.add(wbox(b - a, 3, 8, (a + b) / 2, -0.5, -4, M.woodL));
    bolt.add(wbox(64, 3, 8, 2, -11.5, -4, M.woodL));
    bolt.add(wbox(64, 13, 2, 2, -6, -7, M.woodL));
    bolt.add(wbox(3, 13, 8, 32.5, -6, -4, M.woodL));
    const oldPins = oldPinsX.map((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 16, 24), M.keyPin); p.position.set(x, 0, -3.2); p.castShadow = true; old.add(p); return p; });
    const oldKey = new THREE.Group(); old.add(oldKey);
    oldKey.add(wbox(40, 3, 5, -6, -8.5, -3.5, M.woodD));
    for (const x of oldPinsX) oldKey.add(wbox(3, 3, 5, x, -5.5, -3.5, M.woodD));
    oldKey.add(wbox(8, 9, 6, -30, -7, -3.5, M.woodD));
    const oldLine = new THREE.Mesh(new THREE.BoxGeometry(70, 0.5, 0.3), M.ok); oldLine.position.set(0, 1.0, 0.2); old.add(oldLine);

    // ---------- overlay helpers
    const vtmp = new THREE.Vector3();
    const project = (x, y, z) => { vtmp.set(x, y, z).project(camera); return [(vtmp.x * 0.5 + 0.5) * W, (-vtmp.y * 0.5 + 0.5) * H]; };
    const pxPerMm = (x, y, z) => { const a = project(x, y, z), b = project(x, y + 1, z); return Math.hypot(a[0] - b[0], a[1] - b[1]); };
    function labelBox(text, bx, by, anchor, a, opt = {}) {
      if (a <= 0.01) return '';
      const fs = opt.size || 40, padX = 22, h = fs + 26;
      const w = text.length * fs * 0.6 + padX * 2;
      const x0 = opt.align === 'right' ? bx - w : opt.align === 'center' ? bx - w / 2 : bx;
      const y0 = by - h / 2;
      const p = clamp01(a * 1.4);
      const cx = x0 + (anchor[0] < x0 ? 0 : anchor[0] > x0 + w ? w : w / 2), cy = anchor[1] < y0 ? y0 : anchor[1] > y0 + h ? y0 + h : by;
      const ex = cx + (anchor[0] - cx) * p, ey = cy + (anchor[1] - cy) * p;
      const sc = 0.85 + 0.15 * E.sp(clamp01(a));
      let s = `<g opacity="${clamp01(a * 2).toFixed(2)}">`;
      s += `<line x1="${f1(cx)}" y1="${f1(cy)}" x2="${f1(ex)}" y2="${f1(ey)}" stroke="${INK}" stroke-width="4"/>`;
      s += `<circle cx="${f1(anchor[0])}" cy="${f1(anchor[1])}" r="${f1(9 * p)}" fill="#fff" stroke="${INK}" stroke-width="4"/>`;
      s += `<g transform="translate(${f1(x0 + w / 2)} ${f1(by)}) scale(${sc.toFixed(3)}) translate(${f1(-(x0 + w / 2))} ${f1(-by)})">`;
      s += `<rect x="${f1(x0 + 3)}" y="${f1(y0 + 5)}" width="${f1(w)}" height="${h}" rx="14" fill="#000" opacity="0.10"/>`;
      s += `<rect x="${f1(x0)}" y="${f1(y0)}" width="${f1(w)}" height="${h}" rx="14" fill="#fff" stroke="${opt.color || '#D6DAE0'}" stroke-width="${opt.color ? 5 : 2}"/>`;
      s += `<text x="${f1(x0 + w / 2)}" y="${f1(by + fs * 0.36)}" font-family="Inter" font-weight="800" font-size="${fs}" text-anchor="middle" fill="${opt.color || INK}">${text}</text></g></g>`;
      return s;
    }
    function titleTag(text, a) {
      if (a <= 0.01) return '';
      const fs = 52, w = text.length * fs * 0.6 + 70, x = 48 - (1 - E.o3(clamp01(a))) * 60, y = 196;
      return `<g opacity="${clamp01(a * 2).toFixed(2)}"><rect x="${f1(x + 4)}" y="${y + 6}" width="${f1(w)}" height="92" rx="12" fill="#000" opacity="0.10"/><rect x="${f1(x)}" y="${y}" width="${f1(w)}" height="92" rx="12" fill="#fff"/><rect x="${f1(x)}" y="${y}" width="16" height="92" rx="6" fill="${BLUE}"/><text x="${f1(x + 42)}" y="${y + 64}" font-family="Inter" font-weight="900" font-size="${fs}" fill="${INK}" letter-spacing="-1">${text}</text></g>`;
    }
    const TITLES = [[0, 'How a Lock Knows Your Key'], [2.85, 'Pins & Springs'], [7.55, 'Locked Tight'], [11.7, 'The Right Key'], [19.0, 'Click!'], [20.5, 'The Wrong Key'], [24.4, 'So Many Keys'], [29.05, 'An Ancient Idea'], [34.85, 'Hidden Engineering']];

    function renderAt(t) {
      const ls = FilmScript.stateAt(t).lock;
      const c = camAt(t);
      camera.position.set(...c.pos); camera.lookAt(...c.tgt); camera.updateMatrixWorld();
      // key + physics
      let keySt = ls.key;
      let morph = null;
      if (t >= 24.3 && t < 26.95) {
        // "several heights each": a fully-inserted key whose cuts change every 0.14 s
        const seq = [[4, 6, 2, 7, 3], [1, 8, 5, 0, 6], [7, 2, 9, 4, 1], [3, 5, 0, 8, 7], [9, 1, 6, 2, 4], [0, 7, 3, 6, 9], [5, 9, 1, 3, 0], [8, 4, 7, 5, 2]];
        const n = t < 25.5 ? 0 : Math.floor((t - 25.5) / 0.14) % seq.length;
        morph = seq[n];
        keySt = { s: 0, bitting: morph, tag: null };
      }
      const stacks = LockCutaway.stacks(keySt);
      const aligned = Math.abs(keySt.s) < 0.02 && stacks.every((p) => Math.abs(p.gap) < G.TOL) && !morph;
      const turn = aligned ? ls.turn : Math.max(-2.2, Math.min(2.2, ls.turn));
      plugG.rotation.x = (-turn * Math.PI) / 180;
      keyMesh.geometry = keyGeometry(keySt.bitting);
      keyMesh.position.x = -keySt.s;
      tag.visible = !!keySt.tag;
      const cosT = Math.cos((turn * Math.PI) / 180);
      stacks.forEach((p, i) => {
        keyPins[i].position.set(p.x, p.kb, 0);
        let db = p.db; if (Math.abs(turn) > 2.3) db = Math.max(db, G.shear);
        drivers[i].position.set(p.x, db + G.driverLen / 2, 0);
        const dt = db + G.driverLen;
        springs[i].position.set(p.x, dt, 0); springs[i].scale.set(1, Math.max(0.3, G.chamberTop - dt), 1);
        const gr = rings[i]; const ga = (ls.gapOk[i] || 0);
        gr.visible = ga > 0.01 && !morph; gr.position.set(p.x, p.kt * cosT, 0); gr.scale.setScalar(0.6 + 0.4 * ga);
        gr.material = Math.abs(p.gap) < G.TOL ? M.ok : M.bad;
      });
      const sa = morph ? 0 : ls.showShear;
      shear.visible = sa > 0.01;
      const shearLen = 32 * Math.min(1, sa);
      shear.scale.x = Math.max(0.01, shearLen); shear.position.x = -1.2 + shearLen / 2;
      shear.material = ls.shearState === 'ok' ? M.ok : ls.shearState === 'bad' ? M.bad : M.yellow;
      // grid keys
      const gridA = K(t, [[26.8, 0], [28.3, 1, 'lin']]);
      gridKeys.forEach((m, i) => {
        const a = clamp01((gridA * 24 - i) / 1.5);
        m.visible = a > 0.01 && t > 26.5 && t < 29.4;
        const s = a < 1 ? 1 - Math.exp(-6 * a) * Math.cos(9 * a) : 1;
        m.scale.setScalar(0.46 * Math.max(0.01, s));
        m.position.set(...m.userData.home);
      });
      // the key that bonks the guide (falls onto his head at 28.1 s, then bounces off)
      {
        const head = [312 - 22, 2 + 24, 6];
        bonkKey.visible = t > 27.75 && t < 28.9;
        if (bonkKey.visible) {
          if (t < 28.1) { const u = (t - 27.75) / 0.35; bonkKey.position.set(head[0] - 6, 120 - (120 - head[1] - 2) * u * u, 0); bonkKey.rotation.z = 0.4; }
          else { const u = (t - 28.1) / 0.8; bonkKey.position.set(head[0] - 6 + 40 * u, head[1] + 2 + 30 * Math.sin(Math.min(1, u * 1.4) * Math.PI) - 60 * u * u, 0); bonkKey.rotation.z = 0.4 + u * 6; }
        }
      }
      // ancient lock
      const kx = K(t, [[29.0, -40], [32.1, -40], [32.65, 0, 'io']]), lift = K(t, [[32.7, 0], [33.0, 3, 'sp8']]);
      const bx = K(t, [[33.36, 0], [33.95, 12, 'io']]);
      bolt.position.x = bx; oldKey.position.set(kx + bx, lift, 0);
      oldPins.forEach((p, i) => {
        // pins rest 3 units into the bolt; the key pegs push them up to the bolt top (y = 1)
        let bottom = -2.0; const pegTop = -4.0 + lift + 0; const pegX = oldPinsX[i] + kx + bx;
        if (Math.abs(pegX - oldPinsX[i]) < 2.2 && kx > -0.5) bottom = Math.max(bottom, pegTop + 3.0);
        p.position.y = bottom + 8;
      });
      oldLine.visible = t > 32.95; oldLine.scale.x = Math.max(0.01, K(t, [[32.95, 0], [33.2, 1, 'o3']]));
      renderer.render(scene, camera);

      // ---------- overlay
      let o = '';
      const lab = (text, anchorMm, bx, by, a, opt) => { o += labelBox(text, bx, by, project(...anchorMm), a, opt); };
      lab('KEY PINS', [5.84, 1.5, 1.45], 70, 1120, K(t, [[3.95, 0], [4.25, 1, 'o3'], [7.3, 1], [7.55, 0]]), { color: BLUE });
      lab('DRIVER PINS', [9.8, 9.0, 1.45], 70, 560, K(t, [[4.75, 0], [5.05, 1, 'o3'], [7.3, 1], [7.55, 0]]), { color: '#C21F25' });
      lab('SPRINGS', [17.72, 14.6, 1.2], 1010, 520, K(t, [[6.4, 0], [6.7, 1, 'o3'], [7.3, 1], [7.55, 0]]), { align: 'right' });
      lab('SHEAR LINE', [27, G.shear, 0.2], 1010, 700, K(t, [[8.65, 0], [8.95, 1, 'o3'], [11.5, 1], [11.75, 0]]), { align: 'right', color: '#B88A00' });
      lab('CYLINDER', [20, -3.5, 1], 1010, 1110, K(t, [[9.2, 0], [9.5, 1, 'o3'], [11.5, 1], [11.75, 0]]), { align: 'right' });
      lab('SHEAR LINE', [24, G.shear, 0.2], 1010, 640, K(t, [[17.95, 0], [18.25, 1, 'o3'], [18.95, 1], [19.1, 0]]), { align: 'right', color: GREEN });
      lab('5 PINS', [13.76, 9, 1.45], 1010, 520, K(t, [[24.6, 0], [24.9, 1, 'o3'], [26.6, 1], [26.85, 0]]), { align: 'right', color: BLUE });
      lab('10 HEIGHTS EACH', [9.8, 2.5, 1.45], 70, 1110, K(t, [[25.5, 0], [25.8, 1, 'o3'], [26.6, 1], [26.85, 0]]), {});
      // red crosses where a driver crosses the shear line
      const cross = ls.crossMarks;
      if (cross > 0 && !morph) stacks.forEach((p) => {
        if (Math.abs(p.gap) < G.TOL) return;
        const q = project(p.x, G.shear, 1.6), r = 18 * Math.min(cross, 1);
        o += `<g stroke="${RED}" stroke-width="8" stroke-linecap="round"><line x1="${f1(q[0] - r)}" y1="${f1(q[1] - r)}" x2="${f1(q[0] + r)}" y2="${f1(q[1] + r)}"/><line x1="${f1(q[0] + r)}" y1="${f1(q[1] - r)}" x2="${f1(q[0] - r)}" y2="${f1(q[1] + r)}"/></g>`;
      });
      // measurement callout
      if (ls.measure.a > 0) {
        const p = stacks[2], a = ls.measure.a;
        const q1 = project(p.x + 2.0, p.kt, 1.4), q2 = project(p.x + 2.0, G.shear, 1.4);
        o += `<g opacity="${a.toFixed(2)}" stroke="${RED}" stroke-width="6" stroke-linecap="round"><line x1="${f1(q1[0])}" y1="${f1(q1[1])}" x2="${f1(q2[0])}" y2="${f1(q2[1])}"/><line x1="${f1(q1[0] - 16)}" y1="${f1(q1[1])}" x2="${f1(q1[0] + 16)}" y2="${f1(q1[1])}"/><line x1="${f1(q2[0] - 16)}" y1="${f1(q2[1])}" x2="${f1(q2[0] + 16)}" y2="${f1(q2[1])}"/></g>`;
        o += labelBox('0.76 mm', q1[0] + 40, (q1[1] + q2[1]) / 2, [q1[0] + 4, (q1[1] + q2[1]) / 2], a, { color: RED, size: 54 });
      }
      // ancient lock labels
      {
        const la = K(t, [[29.6, 0], [29.9, 1, 'o3'], [34.6, 1], [34.75, 0]]);
        lab('WOODEN PINS', [612 - 8, 6, -1], 70, 1060, la, { color: BLUE });
        lab('BOLT', [612 + 26 + bx, -6, 0], 1010, 1120, la, { align: 'right' });
        lab('KEY', [612 - 30 + kx + bx, -7 + lift, 0], 300, 1150, K(t, [[32.15, 0], [32.45, 1, 'o3'], [34.6, 1], [34.75, 0]]), {});
        if (t > 33.05 && t < 34.75) lab('SAME SHEAR LINE', [612 + 30, 1, 0.3], 1010, 700, K(t, [[33.05, 0], [33.35, 1, 'o3']]), { align: 'right', color: GREEN });
      }
      // counter
      if (t > 26.7 && t < 29.2) {
        const a = K(t, [[26.75, 0], [27.0, 1, 'sp']]);
        const count = Math.round(79666 * E.o3(ramp(t, 26.8, 28.25)));
        o += `<g opacity="${clamp01(a).toFixed(2)}"><rect x="140" y="${f1(330 + 20 * (1 - a))}" width="800" height="210" rx="22" fill="#fff"/><rect x="140" y="${f1(330 + 20 * (1 - a))}" width="16" height="210" rx="6" fill="${BLUE}"/>`;
        o += `<text x="548" y="${f1(462 + 20 * (1 - a))}" font-family="Inter" font-weight="900" font-size="132" text-anchor="middle" fill="${INK}" letter-spacing="-3">${count.toLocaleString('en-US')}</text>`;
        o += `<text x="548" y="${f1(518 + 20 * (1 - a))}" font-family="Inter" font-weight="800" font-size="36" text-anchor="middle" fill="#5A6270">different keys for one 5-pin lock</text></g>`;
      }
      // title tag (one at a time, swaps with a slide)
      let ti = 0; for (let i = 0; i < TITLES.length; i++) if (t >= TITLES[i][0]) ti = i;
      const tIn = ramp(t, TITLES[ti][0], TITLES[ti][0] + 0.35);
      const nextT = ti + 1 < TITLES.length ? TITLES[ti + 1][0] : 99;
      const tOut = 1 - ramp(t, nextT - 0.15, nextT);
      o += titleTag(TITLES[ti][1], Math.min(tIn, tOut));

      // guide
      o += guideAt(t, project, pxPerMm, stacks, ls, keySt);
      svg.innerHTML = o;
    }
    return { renderAt, project, camera };
  }

  // ---------- guide choreography (anchored to world points)
  function guideAt(t, project, pxPerMm, stacks, ls, keySt) {
    const P = Guide.POSES;
    const pose = (name, extra) => Object.assign({}, P[name], extra || {});
    const place = (wx, wy, wz, hMm, st) => {
      const p = project(wx, wy, wz), k = pxPerMm(wx, wy, wz);
      return Guide.draw(Object.assign({ x: p[0], y: p[1], h: hMm * k, t }, st));
    };
    const TOP = 18.9, FLOOR = -11.6, H = 14;
    const walk = (extra) => Object.assign({ legL: [8 + 14 * Math.sin(t * 13), 0], legR: [8 - 14 * Math.sin(t * 13), 0] }, extra);
    // hook: on top of the lock, points back at the key ("your key is a password")
    if (t < 2.75) return place(22, TOP, 0, H, t < 0.8 ? pose('curious', { face: -1 }) : pose('point', { face: -1, armL: [K(t, [[0.8, 20], [1.1, 100, 'sp']]), 0], handL: 'point', armR: [10, -8], handR: 'open', mouth: t > 1.2 ? 'grin' : 'open' }));
    // pins close-up: off camera
    if (t < 7.6) return '';
    // locked: on top, tries to twist (stomps), then oops
    if (t < 11.6) {
      if (t < 9.5) return place(22, TOP, 0, H, pose('curious', { face: -1 }));
      if (t < 10.6) return place(22, TOP, 0, H, pose('struggle', { face: -1, lean: 8 * Math.sin(t * 40), armL: [85 + 8 * Math.sin(t * 38), -10], armR: [95 + 8 * Math.sin(t * 31), -15] }));
      return place(22, TOP, 0, H, pose('oops', { face: -1 }));
    }
    // pushes the key in from the floor
    if (t < 14.3) return place(-15.5 - keySt.s - 2.4, FLOOR, 4, H, pose('push', walk({ face: 1 })));
    if (t < 19.0) return '';
    // click: on top, confident then cheer
    if (t < 20.5) return place(22, TOP, 0, H, t < 19.6 ? pose('confident', { face: -1 }) : pose('cheer', { face: -1, bob: Math.max(0, Math.sin(((t - 19.6) / 0.35) * Math.PI)) * 26 }));
    // wrong key: pushes it in, (close-up), then struggles to turn it
    if (t < 24.3) {
      const bx = -15.5 - keySt.s - 2.4;
      if (t < 21.7) return place(bx, FLOOR, 4, H, pose('push', walk({ face: 1 })));
      if (t < 23.15) return '';
      return place(bx, FLOOR, 4, H, pose('struggle', { face: 1, lean: -8 + 7 * Math.sin(t * 36), armL: [85 + 6 * Math.sin(t * 33), -12], armR: [95 + 6 * Math.sin(t * 29), -8] }));
    }
    // many keys: shocked, then bonked by a falling key
    if (t < 29.0) {
      if (t < 26.9) return '';
      const bonk = t > 28.1;
      return place(312 - 22, 2, 6, 24, bonk ? pose('oops', { face: -1, eyes: 'squint', mouth: 'wavy' }) : pose('shocked', { face: -1 }));
    }
    // ancient lock: stands on the floor at the left, curious then confident
    if (t < 34.75) return place(612 + 9, 23, -4, 17, t < 33.4 ? pose('curious', { face: 1 }) : pose('confident', { face: 1 }));
    // outro: on top, waves, then points up at "Follow"
    return place(22, TOP, 0, H, t < 35.5 ? pose('wave', { face: -1, armR: [150 + Math.sin(t * 9) * 18, 25] }) : pose('point', { face: -1, armR: [K(t, [[35.5, 120], [35.8, 172, 'sp']]), 0], handR: 'point', gaze: [0.2, -1] }));
  }
  return { mount, camAt };
})();
if (typeof window !== 'undefined') window.Film3D = Film3D;
