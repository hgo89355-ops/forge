/* Style v4 lock Short — v5 cut (fast pacing, mini-story). Film5.mount(canvas, svg) -> { renderAt, DUR }.
 * Every shot is anchored to a spoken word (window.V5_WORDS from the voice's word timings), so swapping the voice
 * re-times the whole film automatically. Physics from LockCutaway; pure function of t.
 */
const Film5 = (function () {
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
  const lerp = (a, b, u) => a + (b - a) * u;
  const mix = (u) => 0.65 * u + 0.35 * E.io(clamp01(u)); // never fully stops: camera keeps moving
  const RIGHT = FilmScript.RIGHT, WRONG = FilmScript.WRONG;

  // ---------- word anchors (sequential search, robust to number formatting)
  const ORDER = ['your', 'metal', 'inside', 'pin', 'pairs', 'springs', 'and', 'top', 'block', 'cylinder', 'wrong', 'one', 'short', 'line', 'and', 'jams',
    'right', 'lifts', 'exactly', 'height', 'so', 'gap', 'lines', 'line', 'click', 'door', 'open', 'five', 'heights', 'almost', 'possible', 'keys', 'only', 'yours', 'fits', 'which', 'why'];
  function anchors(words) {
    const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
    const A = {}, seen = {};
    let i = 0, last = { start: 0, end: 0.3 };
    for (const w of ORDER) {
      let j = i; while (j < words.length && norm(words[j].text) !== w) j++;
      const key = seen[w] ? w + (seen[w] + 1) : w; seen[w] = (seen[w] || 0) + 1;
      if (j < words.length) { A[key] = words[j]; last = words[j]; i = j + 1; }
      else A[key] = { start: last.end + 0.3, end: last.end + 0.6 };
    }
    return A;
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
    for (let i = 0; i < 28; i++) {
      const bit = Array.from({ length: 5 }, () => Math.floor(rnd() * 10));
      const m = new THREE.Mesh(keyGeometry(bit), i % 3 === 1 ? M.brass : M.keyBright); m.castShadow = true;
      const col = i % 4, row = Math.floor(i / 4);
      m.userData.home = [-33 + col * 20 + (row % 2) * 6, 70 - row * 11, -((i * 37) % 5) * 6];
      m.scale.setScalar(0.5); grid.add(m); gridKeys.push(m);
    }
    const bonkKey = new THREE.Mesh(keyGeometry([3, 7, 1, 5, 8]), M.key); bonkKey.castShadow = true; grid.add(bonkKey);


    // ---------- front door set (world x ~ 2000, 1 unit = 1 cm, floor at y = -11.6)
    const X0 = 2000, FL = -11.6;
    const doorSet = new THREE.Group(); scene.add(doorSet);
    const mbox = (w, h, d, x, y, z, m, parent) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.receiveShadow = true; (parent || doorSet).add(b); return b; };
    const wallM = std(0xe9e4da, 0.0, 0.9), trimM = std(0xf7f5f0, 0.0, 0.6), doorM = std(0x2f5d4e, 0.1, 0.55), panelM = std(0x2a5345, 0.1, 0.6);
    const inside = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
    mbox(150, 260, 8, X0 - 121, FL + 130, -4, wallM); mbox(150, 260, 8, X0 + 121, FL + 130, -4, wallM); mbox(92, 54, 8, X0, FL + 233, -4, wallM);
    mbox(6, 212, 10, X0 - 49, FL + 106, -3, trimM); mbox(6, 212, 10, X0 + 49, FL + 106, -3, trimM); mbox(104, 6, 10, X0, FL + 209, -3, trimM);
    mbox(92, 206, 2, X0, FL + 103, -40, inside); // warm room light seen through the opening
    mbox(70, 1, 36, X0 + 4, FL + 0.5, 26, std(0x4a4a4a, 0, 0.95)); // doormat
    const hinge = new THREE.Group(); hinge.position.set(X0 - 46, FL, 0); doorSet.add(hinge);
    mbox(92, 204, 4.5, 46, 102, 0, doorM, hinge);
    for (const [px, py, ph] of [[24, 150, 70], [68, 150, 70], [24, 52, 70], [68, 52, 70]]) mbox(32, ph, 1.2, px, py, 2.6, panelM, hinge);
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 1.2, 32), M.steel); rose.rotation.x = Math.PI / 2; rose.position.set(80, 92, 2.9); hinge.add(rose);
    mbox(13, 2.2, 2.2, 74, 92, 4.6, M.steel, hinge);
    const cylFace = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 1.4, 40), M.brass); cylFace.rotation.x = Math.PI / 2; cylFace.position.set(80, 106, 3.0); hinge.add(cylFace);
    mbox(0.5, 2.0, 0.3, 80, 106, 3.8, new THREE.MeshBasicMaterial({ color: 0x222222 }), hinge);
    const doorKey = new THREE.Mesh(keyGeometry(RIGHT), M.key); doorKey.scale.setScalar(0.17); doorKey.rotation.y = Math.PI / 2; hinge.add(doorKey);
    const doorTag = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.4, 2.4), M.tag); doorTag.position.set(-11.6, -5.2, 0); doorKey.add(doorTag);
    const LOCKFACE = [X0 - 46 + 80, FL + 106, 3.8];
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

    const WORDS = window.V5_WORDS;
    const A = anchors(WORDS);
    const c = (w, d = 0.06) => Math.max(0, A[w].start - d);
    const DUR = Math.round((A.why.end + 0.3) * 30) / 30;
    const SHOTS = [
      ['hook', 0, c('inside')], ['pins', c('inside'), c('and')], ['block', c('and'), c('wrong')],
      ['doorWrong', c('wrong'), c('one')], ['wrongIn', c('one'), c('and2')], ['jam', c('and2'), c('right', 0.22)],
      ['doorRight', c('right', 0.22), c('lifts')], ['rightIn', c('lifts'), c('so')], ['align', c('so'), c('click')],
      ['click', c('click'), c('door', 0.2)], ['doorOpen', c('door', 0.2), c('five')], ['count', c('five'), c('possible')],
      ['grid', c('possible'), c('only', 0.22)], ['proud', c('only', 0.22), c('which')], ['loop', c('which'), DUR + 0.01],
    ];
    const shotAt = (t) => { for (const s of SHOTS) if (t >= s[1] && t < s[2]) return s; return SHOTS[SHOTS.length - 1]; };

    const setCam = (tx, ty, tz, d, az, el) => {
      const a = (az * Math.PI) / 180, e = (el * Math.PI) / 180;
      camera.position.set(tx + d * Math.sin(a) * Math.cos(e), ty + d * Math.sin(e), tz + d * Math.cos(a) * Math.cos(e));
      camera.lookAt(tx, ty, tz); camera.updateMatrixWorld();
    };
    const camLerp = (u, a, b) => setCam(...a.map((v, i) => lerp(v, b[i], mix(u))));
    const tipX = (s) => G.tipLen - s;
    const hookCam = (s, u) => [tipX(s) - 3, 5.5, 0, lerp(44, 38, u), lerp(36, 28, u), 9];

    function renderAt(t) {
      const [name, t0, t1] = shotAt(t);
      const u = clamp01((t - t0) / Math.max(0.01, t1 - t0));
      // defaults
      let keySt = null, turnReq = 0, showShear = 0, shearState = 'neutral', crossA = 0, gap = [0, 0, 0, 0, 0], morph = null, springPush = 0;
      let measureA = 0, door = 0, doorKeyZ = null, doorKeyBit = RIGHT, doorKeyTag = false, doorShake = 0, count = null, gridA = 0;
      const labels = [];
      const L = (text, mm, bx, by, a, opt) => labels.push([text, mm, bx, by, a, opt || {}]);
      const pulse = (a, d = 0.5) => (t >= a && t < a + d ? Math.sin(((t - a) / d) * Math.PI) : 0);
      switch (name) {
        case 'hook': case 'loop': {
          const s = name === 'hook' ? lerp(24, 8, u) : lerp(30, 24, u);
          keySt = { s, bitting: RIGHT };
          setCam(...hookCam(s, name === 'hook' ? u : 0));
          break;
        }
        case 'pins':
          camLerp(u, [13.6, 8.5, 0, 102, 38, 13], [13.6, 8.0, 0, 84, 16, 9]);
          L('KEY PINS', [5.84, 1.5, 1.45], 70, 1080, ramp(t, A.pin.start - 0.05, A.pin.start + 0.2), { color: BLUE });
          L('DRIVER PINS', [9.8, 8.0, 1.45], 70, 470, ramp(t, A.pairs.start - 0.05, A.pairs.start + 0.2), { color: '#C21F25' });
          L('SPRINGS', [17.72, 14.6, 1.2], 1010, 420, ramp(t, A.springs.start - 0.05, A.springs.start + 0.2), { align: 'right' });
          springPush = ramp(t, A.springs.start, A.springs.start + 0.2);
          break;
        case 'block':
          camLerp(u, [13.6, 6.6, 0, 64, 12, 8], [13.6, 6.4, 0, 48, 26, 7]);
          showShear = ramp(t, t0, t0 + 0.35); crossA = ramp(t, A.block.start - 0.05, A.block.start + 0.15);
          shearState = t > A.block.start ? 'bad' : 'neutral';
          turnReq = t > A.cylinder.start ? 20 * Math.sin((t - A.cylinder.start) * 26) : 0;
          L('SHEAR LINE', [24, G.shear, 0.2], 1010, 470, ramp(t, t0 + 0.1, t0 + 0.35), { align: 'right', color: '#B88A00' });
          break;
        case 'wrongIn': {
          const s = K(t, [[t0, 18], [t0 + 0.55, 0, 'o3']]);
          keySt = { s, bitting: WRONG, tag: true };
          camLerp(u, [10, 4.5, 0, 74, 26, 9], [13.76, 5.6, 0, 40, 12, 5]);
          showShear = 1; shearState = t > A.line.start ? 'bad' : 'neutral';
          gap = [0, 0, ramp(t, A.short.start - 0.05, A.short.start + 0.2), 0, 0];
          measureA = ramp(t, A.short.start, A.short.start + 0.2);
          break;
        }
        case 'rightIn': {
          const s = K(t, [[t0, 20], [t0 + 0.9, 0, 'o3']]);
          keySt = { s, bitting: RIGHT };
          const tx = Math.min(tipX(s) - 4, 13.6);
          camLerp(u, [tx, 4.5, 0, 70, 28, 9], [13.6, 5.8, 0, 58, 16, 7]);
          setCam(lerp(tx, 13.6, ramp(t, t0 + 0.9, t1)), lerp(4.5, 5.8, mix(u)), 0, lerp(70, 58, mix(u)), lerp(28, 16, mix(u)), lerp(9, 7, mix(u)));
          break;
        }
        case 'align':
          keySt = { s: 0, bitting: RIGHT };
          camLerp(u, [13.6, 6.4, 0, 60, 8, 6], [13.6, 6.35, 0, 44, 20, 5]);
          showShear = 1; shearState = t > A.line2.start ? 'ok' : 'neutral';
          gap = [0, 1, 2, 3, 4].map((i) => ramp(t, A.gap.start + i * 0.12, A.gap.start + 0.15 + i * 0.12));
          L('SHEAR LINE', [24, G.shear, 0.2], 1010, 470, ramp(t, A.line2.start - 0.05, A.line2.start + 0.15), { align: 'right', color: GREEN });
          break;
        case 'click':
          keySt = { s: 0, bitting: RIGHT };
          turnReq = K(t, [[A.click.start, 0], [A.click.start + 0.4, 72, 'sp8']]);
          camLerp(u, [12, 2, 0, 84, 30, 14], [12, 2, 0, 96, 52, 20]);
          showShear = 1; shearState = 'ok'; gap = [1, 1, 1, 1, 1];
          break;
        case 'count': {
          const seq = [[4, 6, 2, 7, 3], [1, 8, 5, 0, 6], [7, 2, 9, 4, 1], [3, 5, 0, 8, 7], [9, 1, 6, 2, 4], [0, 7, 3, 6, 9], [5, 9, 1, 3, 0], [8, 4, 7, 5, 2]];
          morph = seq[Math.floor(Math.max(0, t - A.heights.start + 0.3) / 0.12) % seq.length];
          keySt = { s: 0, bitting: morph };
          camLerp(u, [13.6, 6.5, 0, 96, 30, 12], [13.6, 6.0, 0, 80, 14, 9]);
          L('5 PINS', [13.76, 9, 1.45], 1010, 420, ramp(t, A.five.start - 0.05, A.five.start + 0.15), { align: 'right', color: BLUE });
          L('10 HEIGHTS EACH', [9.8, 2.5, 1.45], 70, 1080, ramp(t, A.heights.start - 0.05, A.heights.start + 0.15), {});
          count = ramp(t, A.almost.start, A.keys.end + 0.3);
          break;
        }
        case 'grid':
          setCam(...[312, 22, 0, 0, 0, 4].map((v, i) => i === 3 ? lerp(220, 175, mix(u)) : i === 4 ? lerp(-8, 8, mix(u)) : v));
          gridA = ramp(t, t0, t0 + 0.9); count = 1;
          break;
        case 'doorWrong': case 'jam': case 'doorRight': case 'doorOpen': case 'proud': {
          door = 1;
          if (name === 'doorWrong') { doorKeyBit = WRONG; doorKeyTag = true; doorKeyZ = K(t, [[t0, 16], [t1, 6, 'io']]); camLerp(u, [X0 + 12, 86, 10, 380, -24, 4], [X0 + 14, 88, 10, 340, -16, 3]); }
          if (name === 'jam') { doorKeyBit = WRONG; doorKeyTag = true; doorKeyZ = 3.6; doorShake = t < t1 - 0.25 ? 1 : 0; camLerp(u, [X0 + 18, 92, 10, 330, -12, 3], [X0 + 20, 94, 10, 290, -6, 3]); }
          if (name === 'doorRight') { doorKeyZ = K(t, [[t0, 18], [t1, 4.5, 'io']]); camLerp(u, [X0 + 16, 90, 10, 350, 14, 4], [X0 + 16, 90, 10, 310, 6, 3]); }
          if (name === 'doorOpen') { doorKeyZ = 3.6; camLerp(u, [X0 + 4, 90, 10, 390, -20, 4], [X0 + 2, 92, 0, 340, -8, 4]); }
          if (name === 'proud') { doorKeyZ = null; camLerp(u, [X0 - 6, 96, 20, 330, 18, 3], [X0 - 6, 98, 20, 290, 10, 3]); }
          break;
        }
      }
      // ---- apply lock state
      lockRoot.visible = !door && name !== 'grid';
      grid.visible = name === 'grid';
      doorSet.visible = !!door;
      const ks = keySt || { s: 60, bitting: RIGHT };
      const stacks = LockCutaway.stacks(keySt);
      const aligned = !!keySt && Math.abs(ks.s) < 0.02 && stacks.every((p) => Math.abs(p.gap) < G.TOL) && !morph;
      const turn = aligned ? turnReq : Math.max(-2.2, Math.min(2.2, turnReq));
      plugG.rotation.x = (-turn * Math.PI) / 180;
      keyMesh.visible = !!keySt; keyMesh.geometry = keyGeometry(ks.bitting); keyMesh.position.x = -ks.s; tag.visible = !!ks.tag;
      const cosT = Math.cos((turn * Math.PI) / 180);
      stacks.forEach((p, i) => {
        keyPins[i].position.set(p.x, p.kb, 0);
        let db = p.db; if (Math.abs(turn) > 2.3) db = Math.max(db, G.shear);
        drivers[i].position.set(p.x, db + G.driverLen / 2, 0);
        const dt = db + G.driverLen;
        springs[i].position.set(p.x, dt, 0); springs[i].scale.set(1, Math.max(0.3, (G.chamberTop - dt) * (1 - 0.12 * springPush * Math.sin(t * 30) ** 2)), 1);
        const ga = gap[i] || 0; rings[i].visible = ga > 0.01; rings[i].position.set(p.x, p.kt * cosT, 0); rings[i].scale.setScalar(0.6 + 0.4 * ga);
        rings[i].material = Math.abs(p.gap) < G.TOL ? M.ok : M.bad;
      });
      shear.visible = showShear > 0.01; const sl = 32 * Math.min(1, showShear); shear.scale.x = Math.max(0.01, sl); shear.position.x = -1.2 + sl / 2;
      shear.material = shearState === 'ok' ? M.ok : shearState === 'bad' ? M.bad : M.yellow;
      // grid keys fly in
      gridKeys.forEach((m, i) => {
        const a = clamp01(gridA * 1.6 - (i % 7) * 0.08 - Math.floor(i / 7) * 0.12);
        const s2 = a < 1 ? 1 - Math.exp(-6 * a) * Math.cos(9 * a) : 1;
        m.visible = a > 0.01; m.scale.setScalar(0.5 * Math.max(0.01, s2));
        const h = m.userData.home; m.position.set(h[0], h[1] + (1 - a) * 30, h[2]); m.rotation.z = (1 - a) * 1.2;
      });
      bonkKey.visible = false;
      // door
      if (door) {
        const open = name === 'doorOpen' ? K(t, [[A.open.start - 0.25, 0], [A.open.start + 0.45, 1, 'sp8']]) : name === 'proud' ? 1 : 0;
        hinge.rotation.y = -open * 1.35 + (doorShake ? Math.sin(t * 55) * 0.006 : 0);
        doorKey.visible = doorKeyZ !== null;
        if (doorKey.visible) { doorKey.geometry = keyGeometry(doorKeyBit); doorKey.position.set(80, 106, doorKeyZ); doorTag.visible = doorKeyTag; doorKey.rotation.z = name === 'jam' ? Math.sin(t * 40) * 0.05 : 0; }
      }
      renderer.render(scene, camera);

      // ---- overlay
      let o = '';
      for (const [text, mm, bx, by, a, opt] of labels) o += labelBox(text, bx, by, project(...mm), a, opt);
      if (crossA > 0) stacks.forEach((p) => {
        if (Math.abs(p.gap) < G.TOL) return;
        const q = project(p.x, G.shear, 1.6), r = 22 * crossA;
        o += `<g stroke="${RED}" stroke-width="9" stroke-linecap="round"><line x1="${f1(q[0] - r)}" y1="${f1(q[1] - r)}" x2="${f1(q[0] + r)}" y2="${f1(q[1] + r)}"/><line x1="${f1(q[0] + r)}" y1="${f1(q[1] - r)}" x2="${f1(q[0] - r)}" y2="${f1(q[1] + r)}"/></g>`;
      });
      if (measureA > 0) {
        const p = stacks[2];
        const q1 = project(p.x + 2.0, p.kt, 1.4), q2 = project(p.x + 2.0, G.shear, 1.4);
        o += `<g opacity="${measureA.toFixed(2)}" stroke="${RED}" stroke-width="7" stroke-linecap="round"><line x1="${f1(q1[0])}" y1="${f1(q1[1])}" x2="${f1(q2[0])}" y2="${f1(q2[1])}"/><line x1="${f1(q1[0] - 18)}" y1="${f1(q1[1])}" x2="${f1(q1[0] + 18)}" y2="${f1(q1[1])}"/><line x1="${f1(q2[0] - 18)}" y1="${f1(q2[1])}" x2="${f1(q2[0] + 18)}" y2="${f1(q2[1])}"/></g>`;
        o += labelBox('0.76 mm', q1[0] + 44, (q1[1] + q2[1]) / 2, [q1[0] + 4, (q1[1] + q2[1]) / 2], measureA, { color: RED, size: 60 });
      }
      if (count !== null) {
        const a = clamp01(count * 4);
        const n = Math.round(79666 * E.o3(clamp01(count)));
        o += `<g opacity="${a.toFixed(2)}"><rect x="120" y="300" width="840" height="230" rx="24" fill="#fff"/><rect x="120" y="300" width="18" height="230" rx="6" fill="${BLUE}"/>`;
        o += `<text x="549" y="448" font-family="Inter" font-weight="900" font-size="150" text-anchor="middle" fill="${INK}" letter-spacing="-4">${n.toLocaleString('en-US')}</text>`;
        o += `<text x="549" y="506" font-family="Inter" font-weight="800" font-size="38" text-anchor="middle" fill="#5A6270">possible keys · 5-pin lock</text></g>`;
      }
      if (name === 'hook') o += titleTag('How a lock knows your key', 1 - ramp(t, t1 - 0.2, t1));
      o += guide5(name, t, t0, t1, u);
      svg.innerHTML = o;
    }

    function guide5(name, t, t0, t1, u) {
      if (!['doorWrong', 'jam', 'doorRight', 'doorOpen', 'proud'].includes(name)) return '';
      const P = Guide.POSES;
      const place = (wx, wy, wz, hCm, st) => { const p = project(wx, wy, wz), k = pxPerMm(wx, wy, wz); return Guide.draw(Object.assign({ x: p[0], y: p[1], h: hCm * k, t }, st)); };
      const at = [X0 + 2, FL, 30];
      const reach = (st) => { const hp = project(...LOCKFACE); const base = Object.assign({ x: 0, y: 0, h: 168 * pxPerMm(...at), face: 1 }, st); const pf = project(...at); base.x = pf[0]; base.y = pf[1]; const sh = Guide.rig(Object.assign({}, Guide.defaults, base)).shR; const ang = Math.atan2(hp[0] - sh[0], hp[1] - sh[1]) * 180 / Math.PI; return Object.assign(st, { armR: [ang, 0] }); };
      if (name === 'doorWrong') return place(...at, 168, reach(Object.assign({}, P.confident, { face: 1, handR: 'fist', armL: [42, -105], mouth: 'grin', brows: 'confident', bob: Math.abs(Math.sin(t * 8)) * 4 })));
      if (name === 'jam') {
        const late = t > t1 - 0.4;
        return place(...at, 168, late ? Object.assign({}, P.shocked, { face: 1 }) : reach(Object.assign({}, P.struggle, { face: 1, armL: [70 + 6 * Math.sin(t * 29), 10], lean: -8 + 6 * Math.sin(t * 31) })));
      }
      if (name === 'doorRight') return place(...at, 168, reach(Object.assign({}, P.curious, { face: 1, handR: 'fist', armL: [-40, -100], mouth: 'smile', brows: 'raised', gaze: [1, 0] })));
      if (name === 'doorOpen') {
        const cheer = t > A.open.start;
        return place(X0 - 18, FL, 40, 168, cheer ? Object.assign({}, P.cheer, { face: 1, bob: Math.max(0, Math.sin(((t - A.open.start) / 0.35) * Math.PI)) * 30 }) : Object.assign({}, P.shocked, { face: 1, lines: 0 }));
      }
      return place(X0 - 20, FL, 46, 168, Object.assign({}, P.wave, { face: 1, eyes: 'happy', mouth: 'grin', armR: [150, 25], handR: 'fist' }));
    }
    return { renderAt, project, camera, DUR, SHOTS };
  }
  return { mount, anchors };
})();
if (typeof window !== 'undefined') window.Film5 = Film5;
