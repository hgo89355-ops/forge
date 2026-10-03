/**
 * MOBCO 3D Project Studio — model "mixed-use"
 * ------------------------------------------------------------------
 * An ILLUSTRATIVE massing model inspired by the Eastmain (New Cairo) render:
 * a glazed office block (5 office levels) over a double-height retail podium
 * with a shaded arcade and shopfronts, a frameless glass corner volume,
 * a single-storey café pavilion, and a landscaped plaza with a reflecting
 * pool, fountain jets, palms and café terraces.
 *
 * It is NOT a replica: proportions, heights and layout are artistic and
 * carry no claim about the real project's specifications.
 *
 * Module contract: imports nothing; THREE is injected into build().
 * World units = metres, ground at y = 0, +Z = model front (plaza side).
 */

/* ================================================================== */
/*  META                                                              */
/* ================================================================== */

export const meta = {
  id: 'mixed-use',
  name: { en: 'Mixed-use Office & Retail', ar: 'مبنى متعدد الاستخدامات — مكاتب وتجزئة' },
  projectSlug: 'eastmain',
  tagline: {
    en: 'A glazed office block over a retail arcade, opening onto a landscaped plaza.',
    ar: 'كتلة مكتبية زجاجية فوق رواق تجاري، تنفتح على ساحة منسّقة بالمسطحات الخضراء.',
  },
  descriptors: [
    { label: { en: 'Typology', ar: 'النوع' },
      value: { en: 'Mixed-use · retail, office & clinic', ar: 'متعدد الاستخدامات · تجزئة ومكاتب وعيادات' } },
    { label: { en: 'Massing', ar: 'الكتلة' },
      value: { en: 'Glazed office floors over a double-height podium', ar: 'طوابق مكتبية زجاجية فوق منصة مزدوجة الارتفاع' } },
    { label: { en: 'Public realm', ar: 'الفضاء العام' },
      value: { en: 'Plaza, reflecting pool, palms & café terraces', ar: 'ساحة وحوض عاكس ونخيل وجلسات مقاهٍ' } },
    { label: { en: 'Model', ar: 'النموذج' },
      value: { en: 'Illustrative massing — not to specification', ar: 'نموذج كتلي توضيحي — ليس وفق المواصفات' } },
  ],
  camera: {
    target: [-2, 9, -8],
    aerial: [-92, 66, 98],
    street: [-36, 1.7, 24],
    top: [-2, 205, -7.9],
    front: [0, 12, 96],
  },
  hotspots: [
    { id: 'retail', position: [-16, 4.2, -17.2],
      title: { en: 'Retail arcade', ar: 'الرواق التجاري' },
      text: { en: 'Double-height shopfronts set back behind a stone colonnade, giving shade to the café terraces in front.',
              ar: 'واجهات محلات مزدوجة الارتفاع خلف رواق حجري، توفّر الظل لجلسات المقاهي أمامها.' } },
    { id: 'offices', position: [-22, 19, -16.6],
      title: { en: 'Office floors', ar: 'الطوابق المكتبية' },
      text: { en: 'Open-plan office levels wrapped in a curtain wall, framed by stone portals and slim vertical fins.',
              ar: 'طوابق مكتبية مفتوحة بواجهات زجاجية، تؤطرها بوابات حجرية وزعانف رأسية رفيعة.' } },
    { id: 'corner', position: [47.2, 18, -14.8],
      title: { en: 'Glass corner volume', ar: 'الكتلة الزجاجية الركنية' },
      text: { en: 'A frameless glazed volume marks the corner and the main office lobby beneath it.',
              ar: 'كتلة زجاجية بلا إطار تميّز الركن وتعلو مدخل الردهة المكتبية الرئيسية.' } },
    { id: 'plaza', position: [-4, 1.6, 13],
      title: { en: 'Plaza & reflecting pool', ar: 'الساحة والحوض العاكس' },
      text: { en: 'A shallow reflecting pool with fountain jets anchors a palm-lined pedestrian plaza.',
              ar: 'حوض عاكس ضحل بنوافير يتوسط ساحة مشاة تحفّها أشجار النخيل.' } },
    { id: 'pavilion', position: [46, 5.8, 1.5],
      title: { en: 'Café pavilion', ar: 'جناح المقهى' },
      text: { en: 'A light single-storey glass pavilion with a deep roof overhang and outdoor seating.',
              ar: 'جناح زجاجي خفيف من طابق واحد بسقف بارز وجلسات خارجية.' } },
  ],
  // Key-light direction. Convention assumed by this model's harness:
  // dir = (sin(az)·cos(el), sin(el), cos(az)·cos(el)) — azimuth measured from +Z (model front) towards +X.
  sun: { azimuth: -38, elevation: 40 },
};

/* ================================================================== */
/*  BUILD                                                             */
/* ================================================================== */

export function build(THREE, ctx = {}) {
  const HIGH = ctx.quality !== 'low';

  /* ---------- resource tracking (for dispose) ---------------------- */
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const instancedMeshes = [];
  const G = (g) => (geometries.add(g), g);
  const std = (name, p) => { const m = new THREE.MeshStandardMaterial(p); m.name = name; materials.add(m); return m; };
  const phys = (name, p) => { const m = new THREE.MeshPhysicalMaterial(p); m.name = name; materials.add(m); return m; };

  /* ---------- deterministic RNG ------------------------------------ */
  let seed = 20240917;
  const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rr = (a, b) => a + (b - a) * rnd();

  /* ---------- procedural textures ---------------------------------- */
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // Stone paving: 1.5 m joints, 6 m bands. One tile = 12 m.
  function pavingTexture() {
    const c = canvas(512, 512), g = c.getContext('2d');
    g.fillStyle = '#e6e1d7'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1400; i++) {            // faint mottling
      g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '120,110,95'},${rr(0.02, 0.05)})`;
      g.fillRect(rr(0, 512), rr(0, 512), rr(4, 22), rr(4, 22));
    }
    g.fillStyle = 'rgba(110,100,88,0.16)';
    for (let k = 0; k < 512; k += 64) { g.fillRect(k, 0, 1, 512); g.fillRect(0, k, 512, 1); }
    g.fillStyle = 'rgba(150,138,120,0.45)';
    for (let k = 0; k < 512; k += 256) { g.fillRect(k, 0, 4, 512); g.fillRect(0, k, 512, 4); }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    textures.add(t); return t;
  }

  // Small tiling ripple normal map for the reflecting pool.
  function rippleNormalTexture() {
    const N = 128, c = canvas(N, N), g = c.getContext('2d'), img = g.createImageData(N, N);
    const hgt = (x, y) => {
      const u = (x / N) * Math.PI * 2, v = (y / N) * Math.PI * 2;
      return Math.sin(u * 3 + Math.sin(v * 2) * 1.3) * 0.5 + Math.sin(v * 5 + u * 2) * 0.3 + Math.sin((u - v) * 7) * 0.15;
    };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = hgt(x + 1, y) - hgt(x - 1, y), dy = hgt(x, y + 1) - hgt(x, y - 1);
      let nx = -dx, ny = -dy, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const i = (y * N + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255; img.data[i + 1] = (ny * 0.5 + 0.5) * 255; img.data[i + 2] = (nz * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; textures.add(t); return t;
  }

  /* ---------- palette & materials ---------------------------------- */
  // White / stone / glass presentation palette; MOBCO teal only as small accents.
  const TEAL = 0x6fd1c5;
  const ripple = rippleNormalTexture();
  const paveTex = pavingTexture();

  const M = {
    stone:     std('stone', { color: 0xefebe3, roughness: 0.72 }),
    frame:     std('stone-frame', { color: 0xd3cabb, roughness: 0.7 }),
    stoneWarm: std('stone-warm', { color: 0xe2dacd, roughness: 0.78 }),
    core:      std('interior-core', { color: 0xa9aba8, roughness: 0.9, emissive: 0x9a6d40, emissiveIntensity: 0 }),
    furniture: std('furniture', { color: 0xdedad2, roughness: 0.85 }),
    metal:     std('metal-graphite', { color: 0x3a4148, roughness: 0.38, metalness: 0.65 }),
    metalLight:std('metal-light', { color: 0xcfd2d2, roughness: 0.4, metalness: 0.5 }),
    spandrel:  std('spandrel-glass', { color: 0x26343e, roughness: 0.18, metalness: 0.35, envMapIntensity: 1.2 }),
    glass: phys('glass', { color: 0x4d6e82, metalness: 0.1, roughness: 0.05, transmission: 0, transparent: true,
      opacity: 0.46, envMapIntensity: 1.2, depthWrite: false }),  // FrontSide: thin boxes → exactly one layer
    glassShop: phys('glass-shopfront', { color: 0x7d9cab, metalness: 0.1, roughness: 0.05, transparent: true,
      opacity: 0.38, envMapIntensity: 1.2, depthWrite: false }),
    deck:      std('timber-deck', { color: 0xb38d68, roughness: 0.8 }),
    asphalt:   std('asphalt', { color: 0x575c62, roughness: 0.95 }),
    marking:   std('road-marking', { color: 0xf1f0ea, roughness: 0.8 }),
    paving:    std('paving', { color: 0xffffff, map: paveTex, roughness: 0.85 }),
    kerb:      std('kerb', { color: 0xd3cdc2, roughness: 0.8 }),
    grass:     std('grass', { color: 0x8ea374, roughness: 1 }),
    sedum:     std('green-roof', { color: 0x9aa97a, roughness: 1 }),
    hedge:     std('hedge', { color: 0x5f7d55, roughness: 0.95 }),
    foliage:   std('foliage', { color: 0x6f8c5b, roughness: 0.9 }),
    foliageLight: std('foliage-light', { color: 0x87a06e, roughness: 0.9 }),
    frond:     std('palm-frond', { color: 0x5b7d48, roughness: 0.85, side: THREE.DoubleSide }),
    trunk:     std('palm-trunk', { color: 0x9a8670, roughness: 0.95 }),
    bark:      std('tree-trunk', { color: 0x7d6e5e, roughness: 0.95 }),
    fabric:    std('parasol-fabric', { color: 0xf7f4ee, roughness: 0.9, side: THREE.DoubleSide }),
    figure:    std('scale-figure', { color: 0xf6f6f3, roughness: 0.7 }),
    carWhite:  std('car-white', { color: 0xf2f2ef, roughness: 0.35, metalness: 0.3 }),
    carSilver: std('car-silver', { color: 0xb9bec3, roughness: 0.32, metalness: 0.5 }),
    carDark:   std('car-dark', { color: 0x2c3540, roughness: 0.3, metalness: 0.5 }),
    carGlass:  std('car-glass', { color: 0x1e262d, roughness: 0.15, metalness: 0.3 }),
    tyre:      std('tyre', { color: 0x202326, roughness: 0.9 }),
    // ---- night-ramped (emissiveIntensity 0 → 1) ----
    ceiling:   std('office-ceiling', { color: 0xc9cbcb, roughness: 0.85, emissive: 0xc8965c, emissiveIntensity: 0 }),
    floorFin:  std('office-floor', { color: 0xb9b7b1, roughness: 0.8, emissive: 0x7a5634, emissiveIntensity: 0 }),
    strip:     std('light-strip', { color: 0xf4f4f0, roughness: 0.5, emissive: 0xfff0d8, emissiveIntensity: 0 }),
    shop:      std('shop-interior', { color: 0xe6dccd, roughness: 0.85, emissive: 0xe0a35e, emissiveIntensity: 0 }),
    lampHead:  std('lamp-head', { color: 0xf3f2ee, roughness: 0.4, emissive: 0xffe2a8, emissiveIntensity: 0 }),
    sign:      std('signage', { color: 0xf8f8f6, roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0 }),
    signTeal:  std('signage-teal', { color: TEAL, roughness: 0.4, emissive: TEAL, emissiveIntensity: 0 }),
    water: phys('pool-water', { color: 0x2a5c68, roughness: 0.06, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05,
      normalMap: ripple, normalScale: new THREE.Vector2(0.18, 0.18), envMapIntensity: 1.4, emissive: 0x156a70, emissiveIntensity: 0 }),
    jet: std('fountain-jet', { color: 0xffffff, roughness: 0.2, transparent: true, opacity: 0.42, depthWrite: false,
      emissive: 0xbfeeff, emissiveIntensity: 0 }),
  };
  ripple.repeat.set(5, 1.2);
  // HDR emissive peaks (linear, > 1) so lit interiors still read warmly through the tinted glass at night.
  M.ceiling.emissive.setRGB(1.8, 0.9, 0.34);
  M.floorFin.emissive.setRGB(0.55, 0.36, 0.2);
  M.core.emissive.setRGB(0.7, 0.46, 0.26);
  M.strip.emissive.setRGB(3.2, 2.8, 2.2);
  M.shop.emissive.setRGB(1.9, 1.05, 0.42);
  const nightMaterials = [M.ceiling, M.floorFin, M.core, M.strip, M.shop, M.lampHead, M.sign, M.signTeal, M.water, M.jet];

  /* ---------- shared geometries ------------------------------------ */
  const UNIT_BOX = G(new THREE.BoxGeometry(1, 1, 1));

  /* ---------- scene graph ------------------------------------------ */
  const root = new THREE.Group(); root.name = 'mixed-use';
  const building = new THREE.Group(); building.name = 'building'; root.add(building);
  const site = new THREE.Group(); site.name = 'site'; root.add(site);

  /* ================================================================ */
  /*  PARAMETERS (metres)                                             */
  /* ================================================================ */
  const P = {
    podiumH: 8,              // double-height retail
    floorH: 4,               // office floor-to-floor
    slab: 0.5,               // expressed slab edge
    offices: 5,
    arcade: 3,               // shopfront set-back behind the colonnade
    wingA: { x0: -40, x1: 26, z0: -38, z1: -18 },           // main office bar
    cube:  { x0: 26, x1: 47, z0: -38, z1: -15 },            // frameless glass corner volume
    wingB: { x0: -60, x1: -40, z0: -38, z1: 4, levels: 3 }, // lower west wing
    pav:   { x0: 36, x1: 56, z0: -5, z1: 8, h: 4.6, over: 1.8 },
    pool:  { cx: -4, cz: 13, len: 44, wid: 10 },
  };
  const levelY = (n) => (n === 0 ? 0 : P.podiumH + (n - 1) * P.floorH);
  const ROOF_Y = levelY(P.offices + 1);           // 28
  const ROOF_B = levelY(P.wingB.levels + 1);      // 20

  /* ---------- floors ------------------------------------------------ */
  const floors = [];
  const floorLabel = (n) => {
    if (n === 0) return { en: 'Retail podium & pavilion', ar: 'المنصة التجارية والجناح' };
    if (n === P.offices + 1) return { en: 'Roof & plant', ar: 'السطح والمعدات' };
    if (n === P.wingB.levels + 1) return { en: `Office level ${n} · roof terrace`, ar: `الطابق المكتبي ${n} · تراس السطح` };
    return { en: `Office level ${n}`, ar: `الطابق المكتبي ${n}` };
  };
  for (let n = 0; n <= P.offices + 1; n++) {
    const g = new THREE.Group(); g.name = n === 0 ? 'L0-podium' : n === P.offices + 1 ? 'L6-roof' : `L${n}-office`;
    g.userData = { level: n, label: floorLabel(n), buildingId: 'eastmain-main' };
    building.add(g); floors.push(g);
  }

  /* ================================================================ */
  /*  INSTANCING KIT — every boxy element is an instance of UNIT_BOX  */
  /* ================================================================ */
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
  const _e = new THREE.Euler(), Y_AXIS = new THREE.Vector3(0, 1, 0);

  /**
   * Collects box instances; finish() emits ONE InstancedMesh per material into `parent`
   * (keeps draw calls low). `key` names the architectural part; the mesh is named
   * `<prefix>-<material>` and lists its parts in userData.parts.
   */
  function makeKit(parent, prefix) {
    const buckets = new Map();
    return {
      /** centre (x,y,z), size (sx,sy,sz), optional rotation about Y */
      box(key, mat, x, y, z, sx, sy, sz, ry = 0) {
        if (sx <= 0 || sy <= 0 || sz <= 0) return;
        let b = buckets.get(mat); if (!b) { b = { mat, parts: new Set(), list: [] }; buckets.set(mat, b); }
        b.parts.add(key); b.list.push(x, y, z, sx, sy, sz, ry);
      },
      /** axis-aligned box from min/max corners */
      span(key, mat, x0, y0, z0, x1, y1, z1) {
        this.box(key, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
      },
      finish(opts = {}) {
        for (const b of buckets.values()) {
          const n = b.list.length / 7;
          const mesh = new THREE.InstancedMesh(UNIT_BOX, b.mat, n);
          for (let i = 0; i < n; i++) {
            const o = i * 7;
            _p.set(b.list[o], b.list[o + 1], b.list[o + 2]);
            _s.set(b.list[o + 3], b.list[o + 4], b.list[o + 5]);
            _q.setFromAxisAngle(Y_AXIS, b.list[o + 6]);
            mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
          }
          mesh.instanceMatrix.needsUpdate = true;
          mesh.computeBoundingSphere();
          mesh.name = `${prefix}-${b.mat.name}`;
          mesh.userData.parts = [...b.parts];
          const clear = b.mat.transparent;
          mesh.castShadow = !clear && opts.cast !== false;
          mesh.receiveShadow = !clear;
          parent.add(mesh); instancedMeshes.push(mesh);
        }
        buckets.clear();
      },
    };
  }

  /** Instanced mesh from explicit matrices (trees, palms, figures, cars…). */
  function instanced(parent, name, geo, mat, matrices, { cast = true, receive = true } = {}) {
    if (!matrices.length) return null;
    const mesh = new THREE.InstancedMesh(geo, mat, matrices.length);
    matrices.forEach((mx, i) => mesh.setMatrixAt(i, mx));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.name = name; mesh.castShadow = cast; mesh.receiveShadow = receive;
    parent.add(mesh); instancedMeshes.push(mesh);
    return mesh;
  }
  const mtx = (x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) =>
    new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(_e.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

  /** Plain mesh helper. */
  function mesh(parent, name, geo, mat, { cast = true, receive = true } = {}) {
    const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = cast; m.receiveShadow = receive; parent.add(m); return m;
  }

  /* ================================================================ */
  /*  FACADE HELPERS                                                  */
  /* ================================================================ */
  /**
   * A straight facade run on plan. axis 'x': runs along X at z = c with outward normal side·Z;
   * axis 'z': runs along Z at x = c with outward normal side·X. a0 < a1 are the run extents.
   */
  const run = (axis, c, a0, a1, side) => ({ axis, c, a0, a1, side });

  /** Place a box in run-local coords: a = along centre, o = outward offset of centre, y = centre height. */
  function put(kit, key, mat, r, a, o, y, la, lo, h) {
    if (r.axis === 'x') kit.box(key, mat, a, y, r.c + r.side * o, la, h, lo);
    else kit.box(key, mat, r.c + r.side * o, y, a, lo, h, la);
  }
  /** Evenly divide a run into modules close to `module` metres; returns positions of interior divisions. */
  function divisions(a0, a1, module) {
    const n = Math.max(1, Math.round((a1 - a0) / module)), m = (a1 - a0) / n, out = [];
    for (let i = 1; i < n; i++) out.push({ a: a0 + i * m, i, n });
    return { list: out, step: m, n };
  }

  /**
   * Office facade for one floor.
   * style 'framed'  — glazing set back behind the slab edge, slim mullions and proud stone fins.
   * style 'curtain' — frameless flush curtain wall with dark spandrel bands (corner volume).
   */
  function officeFacade(kit, r, y0, h, s) {
    const L = r.a1 - r.a0, mid = (r.a0 + r.a1) / 2;
    const { list, step } = divisions(r.a0, r.a1, s.module || 1.5);
    if (s.style === 'framed') {
      const inset = 0.55, gy0 = y0 + P.slab, gh = h - P.slab;
      put(kit, 'glass', M.glass, r, mid, -inset, gy0 + gh / 2, L, 0.05, gh);
      put(kit, 'sill', M.metal, r, mid, -inset + 0.05, gy0 + 0.06, L, 0.16, 0.12);       // base transom
      for (const d of list) {
        if (s.finEvery && d.i % s.finEvery === 0) {
          put(kit, 'fins', M.stone, r, d.a, (s.finProud - inset) / 2, y0 + h / 2, 0.34, s.finProud + inset, h);
        } else {
          put(kit, 'mullions', M.metal, r, d.a, -inset + 0.11, gy0 + gh / 2, 0.07, 0.18, gh);
        }
      }
      if (s.louvres) {                                    // vertical louvre crown
        const blades = divisions(r.a0, r.a1, 0.6).list;
        for (const d of blades) put(kit, 'louvres', M.metalLight, r, d.a, -0.28, gy0 + gh / 2, 0.06, 0.42, gh - 0.05);
      }
    } else {                                              // 'curtain'
      put(kit, 'glass', M.glass, r, mid, 0.05, y0 + h / 2, L, 0.05, h);
      put(kit, 'spandrel', M.spandrel, r, mid, -0.12, y0 + 0.45, L, 0.1, 0.9);
      put(kit, 'transoms', M.metal, r, mid, 0.13, y0 + 0.04, L, 0.12, 0.08);
      put(kit, 'transoms', M.metal, r, mid, 0.13, y0 + 0.9, L, 0.1, 0.05);
      for (const d of list) put(kit, 'mullions', M.metal, r, d.a, 0.15, y0 + h / 2, 0.06, 0.16, h);
    }
    return step;
  }

  /** Office interior for one floor and one wing rectangle: slab, ceiling, light strips, core, desks. */
  function officeInterior(kit, rect, y0, h, o) {
    const ins = o.slabInset || { n: 0, s: 0, e: 0, w: 0 };       // per-side inset of the slab (curtain sides)
    const x0 = rect.x0 + ins.w, x1 = rect.x1 - ins.e, z0 = rect.z0 + ins.n, z1 = rect.z1 - ins.s;
    kit.span('slab', M.stone, x0, y0, z0, x1, y0 + P.slab, z1);
    const ci = 0.7;                                               // ceiling set back behind glass line
    const cx0 = rect.x0 + (o.open?.w ? 0 : ci), cx1 = rect.x1 - (o.open?.e ? 0 : ci);
    const cz0 = rect.z0 + (o.open?.n ? 0 : ci), cz1 = rect.z1 - (o.open?.s ? 0 : ci);
    kit.span('ceiling', M.ceiling, cx0, y0 + h - 0.12, cz0, cx1, y0 + h - 0.04, cz1);
    kit.span('floor-finish', M.floorFin, cx0, y0 + P.slab, cz0, cx1, y0 + P.slab + 0.04, cz1);
    // light strips along the long axis
    const alongX = (cx1 - cx0) >= (cz1 - cz0);
    const across0 = alongX ? cz0 : cx0, across1 = alongX ? cz1 : cx1;
    for (let t = across0 + 1.4; t < across1 - 1.0; t += 2.6) {
      if (alongX) kit.span('strips', M.strip, cx0 + 0.6, y0 + h - 0.16, t - 0.12, cx1 - 0.6, y0 + h - 0.12, t + 0.12);
      else kit.span('strips', M.strip, t - 0.12, y0 + h - 0.16, cz0 + 0.6, t + 0.12, y0 + h - 0.12, cz1 - 0.6);
    }
    const c = o.core;
    kit.span('core', M.core, c.x0, y0 + P.slab, c.z0, c.x1, y0 + h - 0.16, c.z1);
    if (HIGH) {                                                   // desk clusters (read in section cuts)
      for (let x = x0 + 3; x < x1 - 2.5; x += 3.4) for (let z = z0 + 3; z < z1 - 2.5; z += 3.2) {
        if (x > c.x0 - 2.5 && x < c.x1 + 2.5 && z > c.z0 - 2.5 && z < c.z1 + 2.5) continue;
        kit.box('desks', M.furniture, x, y0 + P.slab + 0.41, z, 1.6, 0.74, 1.4);
      }
    }
  }

  /**
   * Podium shopfront along a run: recessed double-height glazing with transom, fascia, signage,
   * colonnade piers + lintel on the facade line, arcade downlights.
   */
  function shopfront(kit, r, o) {
    const rec = o.recess ?? P.arcade, top = P.podiumH, mid = (r.a0 + r.a1) / 2, L = r.a1 - r.a0;
    const gTop = o.fascia === false ? top - 0.4 : 6.2;
    put(kit, 'shop-glass', M.glassShop, r, mid, -rec, 0.15 + (gTop - 0.15) / 2, L, 0.05, gTop - 0.15);
    put(kit, 'shop-frame', M.metal, r, mid, -rec, gTop - 0.06, L, 0.14, 0.12);
    if (o.transom !== false) put(kit, 'shop-frame', M.metal, r, mid, -rec, 3.6, L, 0.12, 0.1);
    const { list } = divisions(r.a0, r.a1, o.module || 3);
    for (const d of list) put(kit, 'shop-mullions', M.metal, r, d.a, -rec + 0.03, 0.15 + (gTop - 0.15) / 2, 0.09, 0.16, gTop - 0.15);
    // fascia band with signage
    const fH = top - gTop;
    put(kit, o.fascia === false ? 'shop-frame' : 'fascia', M.metal, r, mid, -rec + 0.25, gTop + fH / 2, L, 0.5, fH);
    if (o.signs) {
      const shops = divisions(r.a0, r.a1, o.signs);
      const centres = [r.a0 + shops.step / 2]; for (const d of shops.list) centres.push(d.a + shops.step / 2);
      centres.forEach((a, k) => put(kit, (k + o.tealOffset) % 4 === 0 ? 'signs-teal' : 'signs',
        (k + o.tealOffset) % 4 === 0 ? M.signTeal : M.sign, r, a, -rec + 0.53, gTop + fH / 2, Math.min(4.2, shops.step * 0.4), 0.06, 0.42));
    }
    // colonnade on the facade line (piers + lintel) and arcade downlights
    if (rec > 0.5 && o.piers) {
      for (const a of o.piers) put(kit, 'piers', M.stone, r, a, -0.5, 0.15 + (top - 0.15) / 2, 1.0, 1.0, top - 0.15);
      put(kit, 'lintel', M.stone, r, mid, -0.5, top - 0.55, L, 1.0, 1.1);
      for (let a = r.a0 + 3; a < r.a1 - 1; a += 6) put(kit, 'downlights', M.lampHead, r, a, -rec / 2 - 0.2, top - 0.03, 0.5, 0.5, 0.05);
    }
  }

  /** Solid stone service wall along a run for the podium (with dark service doors). */
  function serviceWall(kit, r, doors = []) {
    const mid = (r.a0 + r.a1) / 2;
    put(kit, 'service-wall', M.stoneWarm, r, mid, -0.2, 0.15 + (P.podiumH - 0.15) / 2, r.a1 - r.a0, 0.4, P.podiumH - 0.15);
    put(kit, 'service-band', M.metal, r, mid, 0.03, 6.6, r.a1 - r.a0, 0.08, 0.9);   // high-level ribbon window
    for (const a of doors) put(kit, 'service-doors', M.metal, r, a, 0.03, 2.3, 4.5, 0.08, 4.3);
  }

  /** Parapet ring segments (list of runs) at height y. */
  function parapet(kit, runs, y, h = 1.0, t = 0.35) {
    for (const r of runs) put(kit, 'parapet', M.stone, r, (r.a0 + r.a1) / 2, -t / 2, y + h / 2, r.a1 - r.a0, t, h);
  }

  /* ================================================================ */
  /*  BUILDING                                                        */
  /* ================================================================ */
  const { wingA: A, cube: C, wingB: B } = P;
  const kits = floors.map((g) => makeKit(g, g.name));

  /* ---------- Level 0: retail podium + lobby + café pavilion -------- */
  {
    const k = kits[0];
    // ground slabs
    k.span('floor', M.stoneWarm, B.x0, 0, B.z0, B.x1, 0.15, B.z1);
    k.span('floor', M.stoneWarm, A.x0, 0, A.z0, A.x1, 0.15, A.z1);
    k.span('floor', M.stoneWarm, C.x0, 0, C.z0, C.x1, 0.15, C.z1);

    // Wing A front: shops behind colonnade (piers every 6 m on the structural grid)
    const piersA = []; for (let x = A.x0 + 6; x < A.x1; x += 6) piersA.push(x);
    piersA.push(A.x1 - 0.5);
    shopfront(k, run('x', A.z1, -43, A.x1, +1), { piers: piersA, signs: 12, tealOffset: 2 });
    // Wing B east + south shopfronts (arcade wraps the corner)
    shopfront(k, run('z', B.x1, B.z1 - 25, B.z1 - P.arcade, +1), { piers: [-18.5, -11, -3.5, 3.5], signs: 11, tealOffset: 1, recess: P.arcade });
    shopfront(k, run('x', B.z1, B.x0, B.x1 - P.arcade, +1), { piers: [B.x0 + 0.5, -53, -46.5], signs: 8.5, tealOffset: 3 });
    k.span('lintel', M.stone, B.x1 - 1, P.podiumH - 1.1, B.z1 - 1, B.x1, P.podiumH, B.z1);   // corner lintel
    // Corner volume: double-height office lobby (glass, no fascia)
    shopfront(k, run('x', C.z1, C.x0, C.x1 - P.arcade, +1), { piers: [C.x0 + 0.5, 33.5, 40.2, C.x1 - 0.5], fascia: false, transom: false, module: 3 });
    shopfront(k, run('z', C.x1, C.z0, C.z1 - P.arcade, +1), { piers: [-22, -30, C.z0 + 0.5], fascia: false, transom: false, module: 3 });
    shopfront(k, run('z', C.x0, A.z1 - P.arcade, C.z1 - P.arcade, -1), { recess: 0, fascia: false, transom: false, module: 3 }); // return
    k.box('signs-teal', M.signTeal, (C.x0 + C.x1) / 2 - 1.5, P.podiumH - 0.55, C.z1 + 0.03, 6.5, 0.32, 0.06);  // lobby sign on lintel
    // service facades
    serviceWall(k, run('x', A.z0, A.x0, A.x1, -1), [-30, -6, 14]);
    serviceWall(k, run('x', C.z0, C.x0, C.x1, -1), [36]);
    serviceWall(k, run('x', B.z0, B.x0, B.x1, -1), []);
    serviceWall(k, run('z', B.x0, B.z0, B.z1, -1), [-28, -10]);

    // shop interiors: lit back-of-house wall, shop ceilings, party walls
    const ceil = (x0, z0, x1, z1) => k.span('shop-ceiling', M.ceiling, x0, 7.5, z0, x1, 7.62, z1);
    k.span('shop-back', M.shop, -52, 0.15, A.z0 + 0.4, A.x1, 7.5, -30);
    k.span('shop-back', M.shop, B.x0 + 0.4, 0.15, -30, -52, 7.5, -8);
    ceil(-43, -30, A.x1, A.z1 - P.arcade);
    ceil(B.x0 + 0.4, -30, -43, B.z1 - P.arcade);
    ceil(-52, A.z0 + 0.4, -43, -30);
    for (let x = -31; x < A.x1 - 2; x += 12) k.span('party-walls', M.stoneWarm, x - 0.1, 0.15, -30, x + 0.1, 7.5, A.z1 - P.arcade - 0.05);
    for (const z of [-10]) k.span('party-walls', M.stoneWarm, -52, 0.15, z - 0.1, B.x1 - P.arcade - 0.05, 7.5, z + 0.1);
    k.span('party-walls', M.stoneWarm, -51.6, 0.15, -8, -51.4, 7.5, B.z1 - P.arcade - 0.05);
    if (HIGH) {                                       // display plinths inside the shops
      for (let x = -40; x < A.x1 - 3; x += 4) k.box('displays', M.furniture, x, 0.6, -25.5 + (x % 8 === 0 ? 1.2 : -1.2), 1.8, 0.9, 1.0);
    }
    // lobby: lift core, reception desk, ceiling
    ceil(C.x0, C.z0 + 0.4, C.x1 - P.arcade, C.z1 - P.arcade);
    k.span('lobby-core', M.stone, 31, 0.15, -34, 39, 7.5, -27);
    k.span('reception', M.stoneWarm, 32.5, 0.15, -23.4, 37.5, 1.2, -22.6);

    // ---- café pavilion (single storey glass box with deep roof overhang) ----
    const V = P.pav;
    k.span('pavilion-floor', M.stoneWarm, V.x0, 0, V.z0, V.x1, 0.2, V.z1);
    const pr = [run('x', V.z1, V.x0, V.x1, +1), run('x', V.z0, V.x0, V.x1, -1), run('z', V.x1, V.z0, V.z1, +1), run('z', V.x0, V.z0, V.z1, -1)];
    for (const r of pr) {
      const mid = (r.a0 + r.a1) / 2;
      put(k, 'pavilion-glass', M.glassShop, r, mid, 0, 0.2 + (V.h - 0.2) / 2, r.a1 - r.a0, 0.05, V.h - 0.2);
      for (const d of divisions(r.a0, r.a1, 2.5).list) put(k, 'pavilion-mullions', M.metal, r, d.a, 0.04, 0.2 + (V.h - 0.2) / 2, 0.08, 0.14, V.h - 0.2);
    }
    for (const [x, z] of [[V.x0, V.z0], [V.x1, V.z0], [V.x0, V.z1], [V.x1, V.z1]]) k.box('pavilion-mullions', M.metal, x, V.h / 2 + 0.1, z, 0.16, V.h - 0.2, 0.16);
    k.span('pavilion-roof', M.stone, V.x0 - V.over, V.h, V.z0 - V.over, V.x1 + V.over, V.h + 0.7, V.z1 + V.over);
    // thin teal reveal under the roof edge (small brand accent)
    k.span('pavilion-reveal', M.signTeal, V.x0 - V.over + 0.2, V.h - 0.06, V.z1 + V.over - 0.25, V.x1 + V.over - 0.2, V.h, V.z1 + V.over - 0.15);
    k.span('shop-ceiling', M.ceiling, V.x0 + 0.2, V.h - 0.12, V.z0 + 0.2, V.x1 - 0.2, V.h - 0.02, V.z1 - 0.2);
    k.span('pavilion-back', M.shop, V.x1 - 6, 0.2, V.z0 + 0.6, V.x1 - 0.6, V.h - 0.12, V.z0 + 5);
    k.span('pavilion-counter', M.stoneWarm, V.x0 + 4, 0.2, V.z0 + 3, V.x1 - 8, 1.25, V.z0 + 4);
    k.finish();
  }

  /* ---------- Office levels 1..5 ----------------------------------- */
  for (let n = 1; n <= P.offices; n++) {
    const k = kits[n], y0 = levelY(n), h = P.floorH;
    const top = n === P.offices;
    // Wing A
    officeFacade(k, run('x', A.z1, A.x0, A.x1, +1), y0, h, { style: 'framed', module: 1.5, finEvery: 4, finProud: 0.5, louvres: top });
    officeFacade(k, run('x', A.z0, A.x0, A.x1, -1), y0, h, { style: 'framed', module: 1.5, finEvery: 4, finProud: 0.5 });
    if (n > B.levels) officeFacade(k, run('z', A.x0, A.z0, A.z1, -1), y0, h, { style: 'framed', module: 1.5, finEvery: 4, finProud: 0.5 });
    officeInterior(k, A, y0, h, { core: { x0: -14, x1: -2, z0: -32, z1: -24 }, open: { e: true, w: n <= B.levels } });
    // stone portal frames on the front facade (columns per floor; beams at podium and roof)
    for (const x of [A.x0 + 0.7, -4, A.x1 - 0.7]) k.box('portal', M.frame, x, y0 + h / 2, A.z1 + 0.2, 1.4, h, 1.6);
    // Corner volume (frameless curtain wall)
    officeFacade(k, run('x', C.z1, C.x0, C.x1, +1), y0, h, { style: 'curtain', module: 1.5 });
    officeFacade(k, run('z', C.x1, C.z0, C.z1, +1), y0, h, { style: 'curtain', module: 1.53 });
    officeFacade(k, run('x', C.z0, C.x0, C.x1, -1), y0, h, { style: 'curtain', module: 1.5 });
    officeFacade(k, run('z', C.x0, A.z1, C.z1, -1), y0, h, { style: 'curtain', module: 1.5 });
    for (const [x, z] of [[C.x1, C.z1], [C.x1, C.z0], [C.x0, C.z1]]) k.box('corner-posts', M.metal, x, y0 + h / 2, z, 0.22, h, 0.22);
    officeInterior(k, C, y0, h, { core: { x0: 31, x1: 39, z0: -34, z1: -27 }, slabInset: { n: 0.35, s: 0.35, e: 0.35, w: 0 }, open: { w: true } });
    // Wing B (lower)
    if (n <= B.levels) {
      officeFacade(k, run('z', B.x1, A.z1, B.z1, +1), y0, h, { style: 'framed', module: 1.5, finEvery: 2, finProud: 0.6 });
      officeFacade(k, run('x', B.z1, B.x0, B.x1, +1), y0, h, { style: 'framed', module: 1.5, finEvery: 2, finProud: 0.6 });
      officeFacade(k, run('z', B.x0, B.z0, B.z1, -1), y0, h, { style: 'framed', module: 1.5, finEvery: 4, finProud: 0.5 });
      officeFacade(k, run('x', B.z0, B.x0, B.x1, -1), y0, h, { style: 'framed', module: 1.5, finEvery: 4, finProud: 0.5 });
      officeInterior(k, B, y0, h, { core: { x0: -55, x1: -47, z0: -26, z1: -18 }, open: { e: true } });
    }
    k.finish();
  }

  /* ---------- Wing B roof terrace (lives on level 4) ---------------- */
  {
    const k = kits[B.levels + 1], y = ROOF_B;
    k.span('roof-slab', M.stone, B.x0, y, B.z0, B.x1, y + 0.6, B.z1);
    parapet(k, [run('x', B.z1, B.x0, B.x1, +1), run('z', B.x0, B.z0, B.z1, -1), run('x', B.z0, B.x0, B.x1, -1), run('z', B.x1, A.z1, B.z1, +1)], y + 0.6, 1.0);
    k.span('green-roof', M.sedum, B.x0 + 0.6, y + 0.6, B.z0 + 0.6, B.x1 - 0.6, y + 0.72, -16);
    k.span('deck', M.deck, B.x0 + 1.5, y + 0.6, -14, B.x1 - 1.5, y + 0.74, B.z1 - 1.5);
    for (const [x, z] of [[-57, -12], [-43, -12], [-57, 0], [-43, 0], [-50, -6]]) k.span('planters', M.stoneWarm, x - 1, y + 0.6, z - 1, x + 1, y + 1.3, z + 1);
    // pergola: posts + slender beams
    for (const x of [-56, -50, -44]) for (const z of [-10, -2]) k.box('pergola', M.metalLight, x, y + 2.2, z, 0.18, 3.0, 0.18);
    for (const z of [-10, -2]) k.box('pergola', M.metalLight, -50, y + 3.75, z, 12.4, 0.18, 0.18);
    for (let x = -56; x <= -44; x += 0.8) k.box('pergola-slats', M.metalLight, x, y + 3.92, -6, 0.08, 0.16, 9.2);
    k.box('roof-core', M.stone, -51, y + 2.0, -22, 6, 2.8, 5);
    k.finish();
    // shrubs in planters
    const sh = []; for (const [x, z] of [[-57, -12], [-43, -12], [-57, 0], [-43, 0], [-50, -6]]) sh.push(mtx(x, y + 1.7, z, 1.0, 0.8, 1.0));
    instanced(floors[B.levels + 1], 'roof-shrubs', G(new THREE.IcosahedronGeometry(1, HIGH ? 1 : 0)), M.foliage, sh);
  }

  /* ---------- Main roof (level 6) ---------------------------------- */
  {
    const k = kits[P.offices + 1], y = ROOF_Y;
    // Wing A roof slab, parapets, portal top beam
    k.span('roof-slab', M.stone, A.x0, y, A.z0, A.x1, y + 0.5, A.z1);
    parapet(k, [run('x', A.z0, A.x0, A.x1, -1), run('z', A.x0, A.z0, A.z1, -1)], y + 0.5, 1.0);
    k.span('portal', M.frame, A.x0, y, A.z1 - 0.6, A.x1, y + 1.9, A.z1 + 1.0);
    // podium-level portal base beam is the colonnade lintel (L0); this crowns the frame.
    // plant enclosure (louvred screen) + lift overrun + PV array
    k.span('roof-overrun', M.stone, -14, y + 0.5, -32, -4, y + 3.6, -24);
    k.span('plant-screen', M.metal, 4, y + 0.5, -34, 18, y + 2.6, -24);
    for (const d of divisions(4, 18, 0.5).list) { k.box('plant-louvres', M.metalLight, d.a, y + 1.55, -23.9, 0.06, 2.1, 0.2); k.box('plant-louvres', M.metalLight, d.a, y + 1.55, -34.1, 0.06, 2.1, 0.2); }
    for (let x = -36; x < -18; x += 2.3) k.box('pv-panels', M.spandrel, x, y + 0.85, -28, 2.0, 0.08, 12, 0);
    // Corner volume roof: inset slab, glass parapet continuing the curtain wall, roof garden
    k.span('roof-slab', M.stone, C.x0, y, C.z0 + 0.35, C.x1 - 0.35, y + 0.5, C.z1 - 0.35);
    const cr = [run('x', C.z1, C.x0, C.x1, +1), run('z', C.x1, C.z0, C.z1, +1), run('x', C.z0, C.x0, C.x1, -1), run('z', C.x0, A.z1, C.z1, -1)];
    for (const r of cr) {
      const mid = (r.a0 + r.a1) / 2, L = r.a1 - r.a0;
      put(k, 'glass-parapet', M.glass, r, mid, 0.05, y + 0.9, L, 0.05, 1.8);
      put(k, 'parapet-cap', M.metal, r, mid, 0.05, y + 1.83, L, 0.2, 0.08);
      put(k, 'spandrel', M.spandrel, r, mid, -0.12, y + 0.45, L, 0.1, 0.9);
      for (const d of divisions(r.a0, r.a1, 1.5).list) put(k, 'mullions', M.metal, r, d.a, 0.15, y + 0.9, 0.06, 0.16, 1.8);
    }
    for (const [x, z] of [[C.x1, C.z1], [C.x1, C.z0], [C.x0, C.z1]]) k.box('corner-posts', M.metal, x, y + 0.92, z, 0.22, 1.84, 0.22);
    k.span('deck', M.deck, C.x0 + 1.5, y + 0.5, -26, C.x1 - 2, y + 0.62, C.z1 - 2);
    k.span('roof-overrun', M.stone, 31, y + 0.5, -34, 39, y + 3.6, -28);
    for (const [x, z] of [[30, -18.5], [36, -18.5], [42, -18.5], [43.5, -23]]) k.span('planters', M.stoneWarm, x - 1.2, y + 0.5, z - 0.8, x + 1.2, y + 1.2, z + 0.8);
    k.finish();
    const sh = []; for (const [x, z] of [[30, -18.5], [36, -18.5], [42, -18.5], [43.5, -23]]) sh.push(mtx(x, y + 1.6, z, 1.1, 0.75, 0.8));
    instanced(floors[P.offices + 1], 'roof-shrubs', G(new THREE.IcosahedronGeometry(1, HIGH ? 1 : 0)), M.foliage, sh);
  }

  /* ================================================================ */
  /*  SITE / LANDSCAPE                                                */
  /* ================================================================ */
  const sk = makeKit(site, 'site');
  // ground planes (thin slabs on top of the engine's ground)
  {
    const pav = G(new THREE.BoxGeometry(136, 0.12, 92));
    const uv = pav.attributes.uv;                       // scale UVs so one texture tile = 12 m on the top face
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 136 / 12, uv.getY(i) * 92 / 12);
    const pm = mesh(site, 'plaza-paving', pav, M.paving, { cast: false });
    pm.position.set(0, 0.06, -6);                       // x[-68,68] z[-52,40]
    const foot = G(new THREE.BoxGeometry(136, 0.12, 4));
    const fu = foot.attributes.uv; for (let i = 0; i < fu.count; i++) fu.setXY(i, fu.getX(i) * 136 / 12, fu.getY(i) * 4 / 12);
    const fm = mesh(site, 'far-footpath', foot, M.paving, { cast: false }); fm.position.set(0, 0.06, 60);
  }
  sk.span('road', M.asphalt, -68, 0, 45.3, 68, 0.06, 58);              // front boulevard
  sk.span('road', M.asphalt, -68, 0, -62, 68, 0.06, -52);              // service road
  sk.span('kerb', M.kerb, -68, 0, 45, 68, 0.2, 45.3);
  sk.span('kerb', M.kerb, -68, 0, 57.8, 68, 0.2, 58.1);
  for (let x = -66; x < 68; x += 6) { sk.span('markings', M.marking, x, 0.06, 51.55, x + 3, 0.085, 51.75); sk.span('markings', M.marking, x, 0.06, -57.1, x + 3, 0.085, -56.9); }
  // pedestrian crossing
  for (let x = -2.4; x <= 2.4; x += 1.2) sk.span('markings', M.marking, x - 0.3, 0.06, 46, x + 0.3, 0.085, 57.4);

  // verge: lawns with low hedges between the plaza and the boulevard (breaks for paths)
  for (const [x0, x1] of [[-68, -6], [6, 68]]) {
    sk.span('lawn', M.grass, x0, 0, 40, x1, 0.24, 45);
    sk.span('hedges', M.hedge, x0 + 0.5, 0.24, 40.2, x1 - 0.5, 0.95, 41.0);
  }
  // raised garden beds (front-left lawn, right bed)
  function bed(x0, z0, x1, z1, hedge = true) {
    const t = 0.35, h = 0.55;
    sk.span('bed-curbs', M.stoneWarm, x0, 0, z0, x1, h, z0 + t); sk.span('bed-curbs', M.stoneWarm, x0, 0, z1 - t, x1, h, z1);
    sk.span('bed-curbs', M.stoneWarm, x0, 0, z0 + t, x0 + t, h, z1 - t); sk.span('bed-curbs', M.stoneWarm, x1 - t, 0, z0 + t, x1, h, z1 - t);
    sk.span('lawn', M.grass, x0 + t, 0, z0 + t, x1 - t, h - 0.08, z1 - t);
    if (hedge) sk.span('hedges', M.hedge, x0 + t + 0.3, h - 0.08, z1 - t - 1.2, x1 - t - 0.3, h + 0.7, z1 - t - 0.3);
  }
  bed(-66, 12, -42, 22); bed(-66, 26, -42, 36); bed(52, 18, 66, 36); bed(-30, 26, -12, 34, false); bed(4, 26, 22, 34, false);
  // back planting strip along the service road
  sk.span('lawn', M.grass, -68, 0, -51.5, 68, 0.24, -45);

  /* ---------- reflecting pool (stadium plan) + fountain jets ------- */
  const PL = P.pool;
  function stadium(len, wid, cx = 0, cz = 0) {
    const s = new THREE.Shape(), r = wid / 2, hx = len / 2 - r;
    s.moveTo(cx - hx, cz - r); s.lineTo(cx + hx, cz - r);
    s.absarc(cx + hx, cz, r, -Math.PI / 2, Math.PI / 2, false);
    s.lineTo(cx - hx, cz + r);
    s.absarc(cx - hx, cz, r, Math.PI / 2, Math.PI * 1.5, false);
    return s;
  }
  {
    const ring = stadium(PL.len + 1.4, PL.wid + 1.4);
    const holeShape = stadium(PL.len, PL.wid);
    ring.holes.push(new THREE.Path(holeShape.getPoints(24)));
    const cop = G(new THREE.ExtrudeGeometry(ring, { depth: 0.48, bevelEnabled: false, curveSegments: 24 }));
    cop.rotateX(-Math.PI / 2);
    const cm = mesh(site, 'pool-coping', cop, M.stone); cm.position.set(PL.cx, 0.08, PL.cz);
    const wg = G(new THREE.ShapeGeometry(stadium(PL.len + 0.1, PL.wid + 0.1), 24)); wg.rotateX(-Math.PI / 2);
    const wm = mesh(site, 'pool-water', wg, M.water, { cast: false }); wm.position.set(PL.cx, 0.44, PL.cz);
    // planting island in the right half + submerged lighting strip
    sk.span('pool-uplights', M.lampHead, PL.cx - PL.len / 2 + 5, 0.42, PL.cz - 0.06, PL.cx + PL.len / 2 - 5, 0.445, PL.cz + 0.06);
  }
  const jetGeo = G(new THREE.CylinderGeometry(0.012, 0.05, 1, 6, 1, true)); jetGeo.translate(0, 0.5, 0);
  const jets = [];
  for (let x = PL.cx - PL.len / 2 + 6; x <= PL.cx + PL.len / 2 - 6; x += 2.25) jets.push({ x, z: PL.cz - 2.6, h: 1.1 }, { x, z: PL.cz + 2.6, h: 1.1 });
  jets.push({ x: PL.cx - PL.len / 2 + 5, z: PL.cz, h: 2.4 }, { x: PL.cx + PL.len / 2 - 5, z: PL.cz, h: 2.4 });
  const jetMesh = instanced(site, 'fountain-jets', jetGeo, M.jet, jets.map((j) => mtx(j.x, 0.44, j.z, 1, j.h, 1)), { cast: false, receive: false });

  /* ---------- café terraces ---------------------------------------- */
  const umbGeo = G(new THREE.ConeGeometry(1.75, 0.5, 4, 1, true)); umbGeo.rotateY(Math.PI / 4);
  const poleGeo = G(new THREE.CylinderGeometry(0.035, 0.035, 1, 5));
  const tableGeo = G(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 12));
  const umbs = [], poles = [], tables = [], chairs = [];
  function cafeSet(x, z, umbrella = true) {
    tables.push(mtx(x, 0.76, z)); poles.push(mtx(x, 0.12 + 0.37, z, 1, 0.74, 1));
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.3; chairs.push(mtx(x + Math.cos(a) * 0.85, 0.35, z + Math.sin(a) * 0.85, 0.46, 0.46, 0.46, 0, -a)); }
    if (umbrella) { umbs.push(mtx(x, 2.75, z)); poles.push(mtx(x, 0.12 + 1.35, z, 1, 2.7, 1)); }
  }
  for (let x = -36; x <= 22; x += 4.5) { if (Math.abs(((x + 36) / 4.5) % 3 - 1) < 0.01) continue; cafeSet(x, -13.2 + ((x / 4.5) & 1 ? 1.4 : 0)); }
  for (let z = -15; z <= -2; z += 4.2) cafeSet(-35.6, z + 0.5);          // along wing B arcade
  for (let x = 38; x <= 55; x += 4.2) cafeSet(x, 12.2);                   // pavilion terrace
  for (const [x, z] of [[58.6, -2], [58.6, 3.5]]) cafeSet(x, z);
  for (let x = 39; x <= 53; x += 4.5) cafeSet(x, 1.2, false);             // inside the pavilion
  instanced(site, 'cafe-parasols', umbGeo, M.fabric, umbs);
  instanced(site, 'cafe-poles', poleGeo, M.metal, poles);
  instanced(site, 'cafe-tables', tableGeo, M.stone, tables);
  instanced(site, 'cafe-chairs', UNIT_BOX, M.metalLight, chairs);

  /* ---------- benches, bollards, light poles ----------------------- */
  for (const x of [-20, -9, 2, 13]) { sk.box('benches', M.stoneWarm, x, 0.35, PL.cz + PL.wid / 2 + 3.2, 4.2, 0.46, 0.8); sk.box('benches', M.stoneWarm, x, 0.35, PL.cz - PL.wid / 2 - 3.2, 4.2, 0.46, 0.8); }
  for (const z of [17, 31]) sk.box('benches', M.stoneWarm, -40.5, 0.35, z, 0.8, 0.46, 3.6);
  const bollards = [];
  for (let x = PL.cx - PL.len / 2 + 2; x <= PL.cx + PL.len / 2 - 2; x += 7.3) bollards.push([x, PL.cz - PL.wid / 2 - 1.6], [x, PL.cz + PL.wid / 2 + 1.6]);
  for (const [x, z] of bollards) { sk.box('bollards', M.metalLight, x, 0.5, z, 0.18, 0.76, 0.18); sk.box('bollard-heads', M.lampHead, x, 0.92, z, 0.2, 0.08, 0.2); }
  const poleSpots = [];
  for (let x = -60; x <= 62; x += 15.25) poleSpots.push([x, 38.6]);
  for (let x = -54; x <= 60; x += 19) poleSpots.push([x, -44]);
  poleSpots.push([30, 20], [-34, 9], [30, 4]);
  for (const [x, z] of poleSpots) {
    sk.box('light-poles', M.metal, x, 3.1, z, 0.14, 6.0, 0.14);
    sk.box('light-arms', M.metal, x, 6.0, z, 1.4, 0.1, 0.12);
    sk.box('lamp-heads', M.lampHead, x + 0.55, 5.92, z, 0.45, 0.1, 0.26);
    sk.box('lamp-heads', M.lampHead, x - 0.55, 5.92, z, 0.45, 0.1, 0.26);
  }
  // tree planters in front of the café terraces
  const treeSpots = [[-31.5, -6.5], [-18, -6.5], [-4.5, -6.5], [9, -6.5], [22, -6.5]];
  for (const [x, z] of treeSpots) { sk.box('tree-planters', M.stoneWarm, x, 0.32, z, 3.0, 0.64, 3.0); sk.box('planter-soil', M.hedge, x, 0.6, z, 2.6, 0.1, 2.6); }
  sk.finish();

  /* ---------- vegetation: palms + broadleaf trees ------------------ */
  // Palm frond: a drooping, tapered, slightly V-folded ribbon along +X.
  function frondGeometry(len = 3.3, width = 0.62, seg = HIGH ? 7 : 4) {
    const pos = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, x = t * len, y = 0.85 * t * len * 0.45 - 1.3 * t * t * len * 0.45;
      const w = width * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05 + 0.04)), 0.7), fold = w * 0.35;
      pos.push(x, y - fold, -w, x, y, 0, x, y - fold, w);
    }
    for (let i = 0; i < seg; i++) { const a = i * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return G(g);
  }
  const palmTrunkGeo = G(new THREE.CylinderGeometry(0.17, 0.27, 1, HIGH ? 8 : 6, 3)); palmTrunkGeo.translate(0, 0.5, 0);
  const frondGeo = frondGeometry();
  const palmSpots = [];
  for (let x = -64; x <= 64; x += 8) if (Math.abs(x) > 6) palmSpots.push([x, 42.6, 0.24]);
  for (let x = PL.cx - 18; x <= PL.cx + 18; x += 9) palmSpots.push([x, 23.5, 0.12]);
  palmSpots.push([-60, 17, 0.47], [-49, 16, 0.47], [-62, 31, 0.47], [-52, 30, 0.47], [-46, 33, 0.47], [33.5, 13.5, 0.12], [60.5, 9.5, 0.12], [60.5, -9.5, 0.12], [31, -9.5, 0.12]);
  const trunks = [], fronds = [];
  const qLean = new THREE.Quaternion(), qF = new THREE.Quaternion(), vTop = new THREE.Vector3();
  for (const [x, z, gy] of palmSpots) {
    const h = rr(7.5, 11), lean = rr(0, 0.09), la = rr(0, Math.PI * 2);
    qLean.setFromEuler(_e.set(Math.cos(la) * lean, 0, Math.sin(la) * lean));
    trunks.push(new THREE.Matrix4().compose(new THREE.Vector3(x, gy, z), qLean.clone(), new THREE.Vector3(1, h, 1)));
    vTop.set(0, h, 0).applyQuaternion(qLean).add(new THREE.Vector3(x, gy, z));
    const nf = HIGH ? 11 : 7, rot0 = rr(0, 6.28);
    for (let j = 0; j < nf; j++) {
      const tilt = j % 2 ? rr(0.15, 0.45) : rr(-0.25, 0.1), s = rr(0.85, 1.15);
      qF.setFromEuler(_e.set(0, rot0 + (j / nf) * Math.PI * 2 + rr(-0.15, 0.15), tilt, 'YZX'));
      fronds.push(new THREE.Matrix4().compose(vTop.clone(), qLean.clone().multiply(qF), new THREE.Vector3(s, s, s)));
    }
  }
  _e.set(0, 0, 0, 'XYZ');
  instanced(site, 'palm-trunks', palmTrunkGeo, M.trunk, trunks);
  instanced(site, 'palm-fronds', frondGeo, M.frond, fronds);

  const crownGeo = G(new THREE.IcosahedronGeometry(1, HIGH ? 1 : 0));
  const treeTrunkGeo = G(new THREE.CylinderGeometry(0.11, 0.18, 1, 6)); treeTrunkGeo.translate(0, 0.5, 0);
  const broadleaf = treeSpots.map(([x, z]) => [x, z, 0.62]);
  for (const [x, z] of [[55, 22], [62, 26], [57, 32], [-24, 30], [-17, 30], [10, 30], [17, 30]]) broadleaf.push([x, z, 0.47]);
  for (let x = -62; x <= 62; x += 10.5) broadleaf.push([x + rr(-1, 1), -48.5, 0.24]);
  // two foliage tones as two instanced meshes (no instanceColor, so engine material swaps stay pure)
  const tTr = [], tCr = [[], []];
  for (const [x, z, gy] of broadleaf) {
    const s = rr(0.85, 1.2), ry = rr(0, 6.28);
    tTr.push(mtx(x, gy, z, s, 4.6 * s, s));
    // irregular crown from 4 overlapping lobes
    const lobes = [[0, 4.5, 0, 1.9, 1.5], [1.0, 5.2, 0.5, 1.4, 1.2], [-0.9, 5.0, -0.4, 1.45, 1.2], [0.1, 5.9, -0.2, 1.2, 1.0]];
    const tone = rnd() < 0.5 ? 0 : 1;
    for (const [ox, oy, oz, r, ry2] of lobes) {
      const ca = Math.cos(ry), sa = Math.sin(ry);
      tCr[tone].push(mtx(x + (ox * ca + oz * sa) * s, gy + oy * s, z + (-ox * sa + oz * ca) * s, r * s, ry2 * s, r * s, 0, ry + rnd()));
    }
  }
  instanced(site, 'tree-trunks', treeTrunkGeo, M.bark, tTr);
  instanced(site, 'tree-crowns', crownGeo, M.foliage, tCr[0]);
  instanced(site, 'tree-crowns-light', crownGeo, M.foliageLight, tCr[1]);
  // roadside shrubs on the verge
  const shrubs = [];
  for (let x = -66; x <= 66; x += 2.6) if (Math.abs(x) > 7) shrubs.push(mtx(x + rr(-0.4, 0.4), 0.7, 43.6 + rr(-0.5, 0.5), rr(0.6, 0.9), rr(0.45, 0.65), rr(0.6, 0.9)));
  instanced(site, 'verge-shrubs', crownGeo, M.hedge, shrubs);

  /* ---------- scale figures ---------------------------------------- */
  // abstract white scale figure: lathe silhouette (legs → torso → shoulders → head)
  const figProfile = [[0, 0], [0.13, 0], [0.12, 0.45], [0.15, 0.9], [0.2, 1.25], [0.21, 1.38], [0.12, 1.47], [0.06, 1.5], [0.1, 1.56], [0.105, 1.66], [0.07, 1.74], [0, 1.76]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const figGeo = G(new THREE.LatheGeometry(figProfile, HIGH ? 8 : 6));
  const figs = [];
  const blocked = (x, z) => (x > PL.cx - PL.len / 2 - 2 && x < PL.cx + PL.len / 2 + 2 && z > PL.cz - PL.wid / 2 - 2 && z < PL.cz + PL.wid / 2 + 2)
    || (x > P.pav.x0 - 1 && x < P.pav.x1 + 1 && z > P.pav.z0 - 1 && z < P.pav.z1 + 1)
    || (z > 25 && z < 35 && ((x > -31 && x < -11) || (x > 3 && x < 23))) || (x < -41 && z > 11);
  let tries = 0;
  while (figs.length < (HIGH ? 70 : 34) && tries++ < 800) {
    const x = rr(-38, 60), z = rr(-17, 38);
    if (blocked(x, z) || Math.hypot(x - meta.camera.street[0], z - meta.camera.street[2]) < 9) continue;
    figs.push(mtx(x, 0.12, z, 1, rr(0.92, 1.08), 1));
  }
  instanced(site, 'scale-figures', figGeo, M.figure, figs);

  /* ---------- cars -------------------------------------------------- */
  const carMats = [M.carWhite, M.carSilver, M.carDark];
  const bodies = [[], [], []], cabins = [], tyres = [];
  function car(x, z, ry) {
    const c = Math.cos(ry), s = Math.sin(ry), off = (d) => [x + c * d, z - s * d];
    bodies[Math.floor(rnd() * 3)].push(mtx(x, 0.62, z, 4.4, 0.62, 1.82, 0, ry));
    const [cx, cz] = off(-0.25); cabins.push(mtx(cx, 1.18, cz, 2.3, 0.52, 1.6, 0, ry));
    tyres.push(mtx(x, 0.32, z, 3.6, 0.44, 1.7, 0, ry));
  }
  for (const x of [-58, -41, -22, 18, 37, 55]) car(x + rr(-2, 2), 48.6, 0);
  for (const x of [-49, -30, 9, 28, 47]) car(x + rr(-2, 2), 54.6, Math.PI);
  for (let x = -60; x <= 60; x += 12.5) if (rnd() < 0.6) car(x, -54.5, rnd() < 0.5 ? 0 : Math.PI);
  bodies.forEach((list, i) => instanced(site, `car-bodies-${i}`, UNIT_BOX, carMats[i], list));
  instanced(site, 'car-cabins', UNIT_BOX, M.carGlass, cabins);
  instanced(site, 'car-tyres', UNIT_BOX, M.tyre, tyres);

  /* ================================================================ */
  /*  NIGHT LAMPS (≤ 8, intensity 0 until the engine switches them on) */
  /* ================================================================ */
  const lamps = [];
  function lamp(name, x, y, z, color, nightIntensity, distance) {
    const l = new THREE.PointLight(color, 0, distance, 2); l.name = name; l.position.set(x, y, z);
    l.castShadow = false; l.userData.nightIntensity = nightIntensity; site.add(l); lamps.push(l);
  }
  lamp('lamp-pool', PL.cx, 1.6, PL.cz, 0x8fe3d9, 70, 34);
  lamp('lamp-cafe-w', -30, 3.4, -12, 0xffc98a, 55, 20);
  lamp('lamp-cafe-c', -6, 3.4, -12, 0xffc98a, 55, 20);
  lamp('lamp-cafe-e', 16, 3.4, -12, 0xffc98a, 55, 20);
  lamp('lamp-lobby', 36, 5.0, -16, 0xffd6a0, 60, 20);
  lamp('lamp-pavilion', 46, 3.8, 12, 0xffc98a, 60, 22);
  lamp('lamp-garden', -54, 4.5, 24, 0xffd6a0, 55, 24);
  lamp('lamp-plaza-e', 36, 5.5, 28, 0xffd6a0, 55, 24);

  /* ================================================================ */
  /*  ANIMATION + DISPOSE                                             */
  /* ================================================================ */
  function update(dt, t) {
    ripple.offset.set((t * 0.012) % 1, (t * 0.02) % 1);
    if (jetMesh) {
      for (let i = 0; i < jets.length; i++) {
        const j = jets[i], k = 1 + 0.12 * Math.sin(t * 2.2 + i * 0.7);
        _p.set(j.x, 0.44, j.z); _q.identity(); _s.set(1, j.h * k, 1);
        jetMesh.setMatrixAt(i, _m.compose(_p, _q, _s));
      }
      jetMesh.instanceMatrix.needsUpdate = true;
    }
  }

  function dispose() {
    for (const m of instancedMeshes) m.dispose();         // frees instance attribute buffers
    for (const g of geometries) g.dispose();
    for (const t of textures) t.dispose();
    for (const m of materials) m.dispose();
    instancedMeshes.length = 0; geometries.clear(); textures.clear(); materials.clear();
    root.removeFromParent();
  }

  return { root, floors, site, nightMaterials, lamps, update, dispose };
}
