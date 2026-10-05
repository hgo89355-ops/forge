/**
 * MOBCO Explore in 3D · model "mixed-use" (Eastmain, Golden Square, New Cairo)
 * ------------------------------------------------------------------
 * A detailed model built from the Eastmain renders: a glass office box on the corner
 * (curtain wall with dark aluminium frames and offset panels), a stone-framed office wing and a
 * dark-framed block along the street, all over a double-height retail arcade with a dark fascia,
 * timber soffit and lit shopfronts; a dark cladding core, a single-storey entrance pavilion with
 * a deep canopy, and a plaza with a tiled pool, fountain jets, palms, trees, parasols and seating.
 * Every office floor has a real fit-out (desks, chairs, screens, partitions, ceiling lights, core);
 * the shops have shelving, counters and warm lighting, so a close camera sees through the glass.
 *
 * It is an illustrative model: proportions and layout follow the renders, not survey data.
 *
 * Module contract: imports nothing; THREE is injected into build().
 * World units = metres, ground at y = 0, +Z = plaza side (front), +X = east (pavilion side).
 */

/* ================================================================== */
/*  META                                                              */
/* ================================================================== */

export const meta = {
  id: 'mixed-use',
  name: { en: 'Mixed-use Office & Retail', ar: 'مبنى مكاتب وتجزئة متعدد الاستخدامات' },
  projectSlug: 'eastmain',
  tagline: {
    en: 'Glass offices over shops, facing a plaza with a pool.',
    ar: 'مكاتب زجاجية فوق محلات، تطل على ساحة ببركة ماء.',
  },
  descriptors: [
    { label: { en: 'Typology', ar: 'النوع' },
      value: { en: 'Mixed-use · retail, office & clinic', ar: 'متعدد الاستخدامات · تجزئة ومكاتب وعيادات' } },
    { label: { en: 'Massing', ar: 'الكتلة' },
      value: { en: 'Glazed office floors over a double-height retail podium', ar: 'طوابق مكتبية زجاجية فوق منصة تجارية مزدوجة الارتفاع' } },
    { label: { en: 'Public realm', ar: 'الفضاء العام' },
      value: { en: 'Plaza, pool, palms & café terraces', ar: 'ساحة وبركة ونخيل وجلسات مقاهٍ' } },
  ],
  camera: {
    target: [-6, 9, -10],
    aerial: [62, 46, 84],
    street: [40, 1.7, 30],
    top: [-6, 190, -9.9],
    front: [-6, 12, 96],
  },
  hotspots: [
    { id: 'offices', position: [11, 15.2, 0.4],
      title: { en: 'Offices and clinics', ar: 'مكاتب وعيادات' },
      text: { en: 'The glazed upper floors hold office and clinic spaces.', ar: 'تضم الطوابق الزجاجية العليا مساحات للمكاتب والعيادات.' } },
    { id: 'shops', position: [-14, 3.2, -1.6],
      title: { en: 'Shops', ar: 'المحلات' },
      text: { en: 'Retail opens straight onto the plaza at street level.', ar: 'تنفتح المحلات مباشرة على الساحة في مستوى الشارع.' } },
    { id: 'plaza', position: [6, 0.9, 16],
      title: { en: 'Plaza and pool', ar: 'الساحة والبركة' },
      text: { en: 'A shallow pool with small fountains runs through the plaza.', ar: 'بركة ماء ضحلة بنوافير صغيرة تمتد عبر الساحة.' } },
    { id: 'roof', position: [10, 23.2, -12],
      title: { en: 'Roof terrace', ar: 'تراس السطح' },
      text: { en: 'A planted terrace sits on the roof of the glass offices.', ar: 'تراس مزروع على سطح المكاتب الزجاجية.' } },
  ],
  // Key-light direction: azimuth from +Z (plaza side) towards +X, elevation above the horizon.
  sun: { azimuth: 52, elevation: 40 },
  // a city around the plaza: the engine draws a hazy distant skyline
  skyline: true,
};

/* ================================================================== */
/*  BUILD                                                             */
/* ================================================================== */

export function build(THREE, ctx = {}) {
  const HIGH = ctx.quality !== 'low';

  /* ---------- resource tracking ------------------------------------ */
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const instancedMeshes = [];
  const temps = [];
  const G = (g) => (geometries.add(g), g);
  const T = (g) => (temps.push(g), g);
  const reg = (m, name, night) => {
    m.name = name;
    materials.add(m);
    if (night !== undefined) { m.userData.__nightMax = night; nightMaterials.push(m); }
    return m;
  };
  const nightMaterials = [];
  const std = (name, p, night) => reg(new THREE.MeshStandardMaterial(p), name, night);
  const phys = (name, p, night) => reg(new THREE.MeshPhysicalMaterial(p), name, night);

  /* ---------- deterministic RNG ------------------------------------ */
  let seed = 20261005;
  const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rr = (a, b) => a + (b - a) * rnd();
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const hash = (a, b, c = 0) => { let h = Math.imul(a * 73856093 ^ b * 19349663 ^ c * 83492791, 2654435761); h ^= h >>> 13; h = Math.imul(h, 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

  /* ================================================================ */
  /*  PROCEDURAL TEXTURES                                             */
  /* ================================================================ */
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const tex = (c, { srgb = true, repeat = true, aniso = 8 } = {}) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = aniso;
    textures.add(t);
    return t;
  };

  // Plaza paving: large-format stone, 1.2 x 0.6 m running bond. One tile of the texture = 9.6 m.
  function pavingTexture() {
    const S = 1024, c = canvas(S, S), g = c.getContext('2d');
    const px = S / 9.6;
    g.fillStyle = '#8f887c'; g.fillRect(0, 0, S, S); // joint colour
    for (let r = 0; r < 16; r++) {
      const off = r % 2 ? 0.6 * px : 0;
      for (let k = -1; k < 9; k++) {
        const x = k * 1.2 * px + off, y = r * 0.6 * px;
        const v = rr(-9, 9), warm = rr(-4, 4);
        g.fillStyle = `rgb(${206 + v + warm},${199 + v},${186 + v - warm})`;
        g.fillRect(x + 1.5, y + 1.5, 1.2 * px - 3, 0.6 * px - 3);
      }
    }
    for (let i = 0; i < 9000; i++) { // speckle
      g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(70,62,52,0.06)';
      const s = rr(1, 3); g.fillRect(rr(0, S), rr(0, S), s, s);
    }
    return tex(c);
  }
  // Pool mosaic: small deep-blue tiles with pale grout. One tile of the texture = 0.6 m.
  function mosaicTexture() {
    const S = 256, c = canvas(S, S), g = c.getContext('2d'), n = 24, s = S / n;
    g.fillStyle = '#b9c6cc'; g.fillRect(0, 0, S, S);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = rr(-14, 14);
      g.fillStyle = `rgb(${16 + v * 0.3},${52 + v * 0.8},${104 + v})`;
      g.fillRect(x * s + 1, y * s + 1, s - 2, s - 2);
    }
    return tex(c);
  }
  // Leaf cluster card (alpha): small ovate leaves on a transparent ground.
  function leavesTexture() {
    const S = 256, c = canvas(S, S), g = c.getContext('2d');
    g.clearRect(0, 0, S, S);
    for (let i = 0; i < 260; i++) {
      const a = rr(0, Math.PI * 2), r = Math.sqrt(rnd()) * S * 0.44;
      const x = S / 2 + Math.cos(a) * r, y = S / 2 + Math.sin(a) * r;
      const v = rr(-18, 18);
      g.fillStyle = `rgb(${78 + v},${104 + v},${58 + v * 0.6})`;
      g.save(); g.translate(x, y); g.rotate(rr(0, Math.PI * 2));
      g.beginPath(); g.ellipse(0, 0, rr(5, 9), rr(2.5, 4.5), 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
    return tex(c, { repeat: false, aniso: 4 });
  }
  // Abstract sign marks (no readable text): four cells, white on transparent, used as emissive maps.
  function signTexture() {
    const W = 512, H = 128, c = canvas(W, H), g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#ffffff';
    for (let k = 0; k < 4; k++) {
      const x0 = k * 128 + 14, cy = H / 2;
      // a small emblem then a row of short bars of different lengths
      if (k % 2) { g.beginPath(); g.arc(x0 + 12, cy, 10, 0, Math.PI * 2); g.fill(); }
      else g.fillRect(x0 + 2, cy - 10, 20, 20);
      let x = x0 + 32;
      while (x < k * 128 + 116) {
        const w = rr(5, 14); g.fillRect(x, cy - 7, Math.min(w, k * 128 + 116 - x), 14); x += w + rr(2, 4);
      }
    }
    return tex(c, { repeat: false, aniso: 4 });
  }
  // Geometric lattice screen (alpha) for the dark-framed block's crown.
  function screenTexture() {
    const S = 256, c = canvas(S, S), g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = 'destination-out';
    const n = 4, s = S / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const cx = x * s + s / 2, cy = y * s + s / 2;
      g.beginPath();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8, r = s * 0.36; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      g.closePath(); g.fill();
      g.beginPath(); g.arc(x * s, y * s, s * 0.12, 0, Math.PI * 2); g.fill();
    }
    return tex(c, { aniso: 4 });
  }
  // Small tiling ripple normal map for the pool.
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
    return tex(c, { srgb: false, aniso: 4 });
  }

  const paveTex = pavingTexture();
  const mosaicTex = mosaicTexture();
  const leafTex = leavesTexture();
  const signTex = signTexture();
  const screenTex = screenTexture();
  const ripple = rippleNormalTexture();
  ripple.repeat.set(6, 1.6);

  /* ================================================================ */
  /*  MATERIALS                                                       */
  /* ================================================================ */
  const warm = (hex, k) => new THREE.Color(hex).multiplyScalar(k);
  const M = {
    // shell
    alu:        std('metal-alu-dark', { color: 0x2a2e33, roughness: 0.34, metalness: 0.7 }),
    aluMid:     std('metal-alu', { color: 0x4a4f55, roughness: 0.38, metalness: 0.65 }),
    cladding:   std('metal-cladding', { color: 0x30353b, roughness: 0.42, metalness: 0.55 }),
    stone:      std('stone-frame', { color: 0xd9d2c5, roughness: 0.78 }),
    stoneLight: std('stone-light', { color: 0xddd7cc, roughness: 0.74 }),
    render:     std('render-wall', { color: 0xb8b1a5, roughness: 0.86 }),
    concrete:   std('concrete-slab', { color: 0x8d8c88, roughness: 0.9 }),
    spandrel:   std('spandrel-dark', { color: 0x24303c, roughness: 0.06, metalness: 0.55, envMapIntensity: 2.4 }),
    plenum:     std('plenum-band', { color: 0x15181c, roughness: 0.9 }),
    soffit:     std('timber-soffit', { color: 0x9a6e48, roughness: 0.62 }),
    timberDeck: std('timber-deck', { color: 0x8e6a4a, roughness: 0.72 }),
    gravel:     std('roof-gravel', { color: 0x9b968c, roughness: 1 }),
    screen:     std('metal-screen', { color: 0x2b2f35, roughness: 0.45, metalness: 0.6, map: screenTex, alphaTest: 0.5, side: THREE.DoubleSide }),
    // glazing (physically shaped: reflections on top of a tinted, partly transparent body)
    glassClear: std('glass-curtain-clear', { color: 0x203440, roughness: 0.03, metalness: 0.04, transparent: true, opacity: 0.1, depthWrite: false, envMapIntensity: 2.0 }),
    glassRefl:  std('glass-curtain-reflective', { color: 0x9db6d2, roughness: 0.02, metalness: 0.65, transparent: true, opacity: 0.62, depthWrite: false, envMapIntensity: 3.0 }),
    glassShop:  std('glass-shopfront', { color: 0x30383c, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.06, depthWrite: false, envMapIntensity: 1.5 }),
    glassInt:   std('glass-partition', { color: 0xc8d4d8, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.16, depthWrite: false, envMapIntensity: 0.8 }),
    glassRail:  std('glass-balustrade', { color: 0x2c3c44, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.18, depthWrite: false, envMapIntensity: 1.6 }),
    // interiors (warm 3000 K glow after dusk: emissive ramps with the engine's night factor)
    floorOffice: std('interior-floor-office', { color: 0x9a948a, roughness: 0.7, emissive: 0xffffff, emissiveIntensity: 0 }, 1),
    floorShop:  std('interior-floor-stone', { color: 0xd9d2c4, roughness: 0.32, emissive: 0xffffff, emissiveIntensity: 0 }, 1),
    ceiling:    std('interior-ceiling', { color: 0xe9e7e2, roughness: 0.9, emissive: 0xffffff, emissiveIntensity: 0 }, 1),
    intWall:    std('interior-partition', { color: 0xd7d1c6, roughness: 0.85, emissive: 0xffffff, emissiveIntensity: 0 }, 1),
    coreWall:   std('interior-core', { color: 0xa79f92, roughness: 0.8, emissive: 0xffffff, emissiveIntensity: 0 }, 1),
    shopBack:   std('interior-shop-wall', { color: 0xe8dccb, roughness: 0.8, emissive: 0xffffff, emissiveIntensity: 0 }, 1),
    furniture:  std('interior-furniture', { color: 0xffffff, roughness: 0.6, vertexColors: true, emissive: 0xffffff, emissiveIntensity: 0 }, 1),
    goods:      std('interior-goods', { color: 0xffffff, roughness: 0.7, emissive: 0xffffff, emissiveIntensity: 0 }, 1),
    screens:    std('interior-screens', { color: 0x10141a, roughness: 0.25, emissive: 0xffffff, emissiveIntensity: 0 }, 1),
    downlight:  std('light-downlight', { color: 0xf4f2ec, roughness: 0.5, emissive: 0xffffff, emissiveIntensity: 0 }, 1),
    pendant:    std('light-pendant', { color: 0xe8e0d0, roughness: 0.5, emissive: 0xffffff, emissiveIntensity: 0 }, 1),
    lampHead:   std('light-lamp-head', { color: 0xe9e6de, roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0 }, 1),
    sign:       std('light-sign', { color: 0x30353b, roughness: 0.5, emissive: 0xffffff, emissiveMap: signTex, alphaMap: signTex, transparent: true, depthWrite: false, emissiveIntensity: 0 }, 1),
    // site
    paving:     std('plaza-paving', { color: 0xffffff, map: paveTex, roughness: 0.48, envMapIntensity: 1 }),
    pavingDark: std('paving-band-dark', { color: 0x6c6862, roughness: 0.5 }),
    kerb:       std('kerb-stone', { color: 0xb5afa4, roughness: 0.8 }),
    asphalt:    std('asphalt', { color: 0x3b3e42, roughness: 0.92 }),
    marking:    std('road-marking', { color: 0xe8e6df, roughness: 0.8 }),
    poolTile:   std('pool-tile', { color: 0xffffff, map: mosaicTex, roughness: 0.25, emissive: 0x3f9fd8, emissiveMap: mosaicTex, emissiveIntensity: 0 }, 0.4),
    poolEdge:   std('pool-coping-stone', { color: 0x2c3a52, roughness: 0.35 }),
    water:      std('pool-water', { color: 0x0f3a56, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.45, depthWrite: false,
      normalMap: ripple, normalScale: new THREE.Vector2(0.22, 0.22), envMapIntensity: 2.4 }),
    jet:        std('fountain-jet', { color: 0xffffff, roughness: 0.2, transparent: true, opacity: 0.4, depthWrite: false, emissive: 0xbfeeff, emissiveIntensity: 0 }, 1.2),
    lawn:       std('lawn', { color: 0x5f7448, roughness: 1 }),
    soil:       std('planter-soil', { color: 0x3d3329, roughness: 1 }),
    shrub:      std('shrub-foliage', { color: 0x4e6a3c, roughness: 0.92 }),
    leaves:     std('tree-leaves', { color: 0xffffff, map: leafTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 }),
    bark:       std('tree-bark', { color: 0x5d5046, roughness: 0.95 }),
    palmTrunk:  std('palm-trunk', { color: 0x8a7a66, roughness: 0.96 }),
    frond:      std('palm-frond', { color: 0x6a8a46, roughness: 0.8, side: THREE.DoubleSide }),
    frondDry:   std('palm-frond-dry', { color: 0x7c6a48, roughness: 0.9, side: THREE.DoubleSide }),
    fabric:     std('parasol-fabric', { color: 0xf1ede4, roughness: 0.92, side: THREE.DoubleSide }),
    siteObj:    std('site-furniture', { color: 0xffffff, roughness: 0.6, vertexColors: true }),
    people:     std('people', { color: 0xffffff, roughness: 0.8 }),
    carBody:    std('car-paint', { color: 0xffffff, roughness: 0.28, metalness: 0.55, vertexColors: true }),
    carLight:   std('car-lights', { color: 0xffffff, roughness: 0.3, vertexColors: true, emissive: 0xffffff, emissiveIntensity: 0 }, 1),
  };
  // HDR emissive colours (linear, can exceed 1): warm 3000 K interiors, cooler screens
  M.floorOffice.emissive.copy(warm(0xffc890, 0.3));
  M.floorShop.emissive.copy(warm(0xffc58a, 0.85));
  M.ceiling.emissive.copy(warm(0xffd2a0, 0.5));
  M.intWall.emissive.copy(warm(0xffc890, 0.45));
  M.coreWall.emissive.copy(warm(0xffc890, 0.4));
  M.shopBack.emissive.copy(warm(0xffbf80, 1.3));
  M.furniture.emissive.copy(warm(0xffcf9a, 0.38));
  M.goods.emissive.copy(warm(0xffd0a0, 0.8));
  M.screens.emissive.copy(warm(0x9fbde8, 0.16));
  M.downlight.emissive.copy(warm(0xffe2bc, 6));
  M.pendant.emissive.copy(warm(0xffc27a, 4.5));
  M.lampHead.emissive.copy(warm(0xffd9a6, 5));
  M.sign.emissive.copy(warm(0xfff3e2, 2.4));
  M.carLight.emissive.copy(new THREE.Color(1, 1, 1));
  // interior glow follows the surface colour (a cheap stand-in for light bouncing around a lit room), so dark
  // chairs stay dark and white desks read white after dusk
  for (const m of [M.floorOffice, M.floorShop, M.intWall, M.coreWall, M.shopBack, M.furniture, M.goods]) {
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance *= diffuseColor.rgb;');
    };
    m.customProgramCacheKey = () => 'eastmain-albedo-glow';
  }
  // the plaza is a stone, not a lawn: keep the realism module on its paving branch
  M.paving.userData.realism = 'paving';
  // glazing uses the physically shaped glass of the realism module (reflection added over the tinted body)
  for (const g of [M.glassClear, M.glassRefl, M.glassShop, M.glassRail, M.water]) g.userData.physicalGlass = true;
  M.glassRefl.userData.baseEnvMapIntensity = 3.0;
  M.glassClear.userData.baseEnvMapIntensity = 2.0;
  // interior pieces never cast sun shadows (the facade does); keeps the shadow pass short
  for (const m of [M.floorOffice, M.floorShop, M.ceiling, M.intWall, M.coreWall, M.shopBack, M.furniture, M.goods, M.screens, M.downlight, M.pendant, M.sign, M.glassInt, M.plenum])
    m.userData.noCast = true;

  /* ================================================================ */
  /*  GEOMETRY HELPERS                                                */
  /* ================================================================ */
  const UNIT_BOX = G(new THREE.BoxGeometry(1, 1, 1));
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
  const _e = new THREE.Euler(), Y_AXIS = new THREE.Vector3(0, 1, 0);
  const mtx = (x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) =>
    new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(_e.set(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz));

  /** Merge parts into one non-indexed geometry with vertex colours. part = { g, c, m } */
  function merge(parts, { colors = true } = {}) {
    const list = [];
    let total = 0;
    for (const p of parts) {
      const g = p.g.index ? p.g.toNonIndexed() : p.g.clone();
      if (p.m) g.applyMatrix4(p.m);
      list.push([g, new THREE.Color(p.c ?? 0xffffff)]);
      total += g.attributes.position.count;
    }
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2);
    const col = colors ? new Float32Array(total * 3) : null;
    let o = 0;
    for (const [g, c] of list) {
      const n = g.attributes.position.count;
      pos.set(g.attributes.position.array, o * 3);
      if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
      if (col) for (let i = 0; i < n; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; }
      o += n;
      g.dispose();
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.computeBoundingSphere();
    return G(out);
  }
  const bx = (w, h, d, x, y, z, c, ry = 0) => ({ g: UNIT_BOX, c, m: mtx(x, y, z, w, h, d, 0, ry) });
  const cy = (r0, r1, h, seg, x, y, z, c, rx = 0, rz = 0) => ({ g: T(new THREE.CylinderGeometry(r0, r1, h, seg)), c, m: mtx(x, y, z, 1, 1, 1, rx, 0, rz) });

  /**
   * Box kit: collects box instances per material and emits ONE InstancedMesh per material into `parent`.
   */
  function makeKit(parent, prefix) {
    const buckets = new Map();
    return {
      box(mat, x, y, z, sx, sy, sz, ry = 0) {
        if (sx <= 0 || sy <= 0 || sz <= 0) return;
        let b = buckets.get(mat); if (!b) { b = []; buckets.set(mat, b); }
        b.push(x, y, z, sx, sy, sz, ry);
      },
      span(mat, x0, y0, z0, x1, y1, z1) {
        this.box(mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
      },
      finish() {
        for (const [mat, list] of buckets) {
          const n = list.length / 7;
          const mesh = new THREE.InstancedMesh(UNIT_BOX, mat, n);
          for (let i = 0; i < n; i++) {
            const o = i * 7;
            _p.set(list[o], list[o + 1], list[o + 2]);
            _s.set(list[o + 3], list[o + 4], list[o + 5]);
            _q.setFromAxisAngle(Y_AXIS, list[o + 6]);
            mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
          }
          mesh.instanceMatrix.needsUpdate = true;
          mesh.computeBoundingSphere();
          mesh.name = `${prefix}-${mat.name}`;
          mesh.castShadow = !mat.transparent && !mat.userData.noCast;
          mesh.receiveShadow = !mat.transparent;
          parent.add(mesh); instancedMeshes.push(mesh);
        }
        buckets.clear();
      },
    };
  }

  /** InstancedMesh from matrices (optional per-instance colours). */
  function instanced(parent, name, geo, mat, matrices, { cast = true, receive = true, colors = null } = {}) {
    if (!matrices.length) return null;
    const mesh = new THREE.InstancedMesh(geo, mat, matrices.length);
    matrices.forEach((mx, i) => mesh.setMatrixAt(i, mx));
    if (colors) colors.forEach((c, i) => mesh.setColorAt(i, c));
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.name = name;
    mesh.castShadow = cast && !mat.transparent && !mat.userData.noCast;
    mesh.receiveShadow = receive;
    parent.add(mesh); instancedMeshes.push(mesh);
    return mesh;
  }
  function mesh(parent, name, geo, mat, { cast = true, receive = true } = {}) {
    const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = cast && !mat.transparent; m.receiveShadow = receive; parent.add(m); return m;
  }

  /* A straight facade run on plan. axis 'x': along X at z = c, outward normal side * Z.
     axis 'z': along Z at x = c, outward normal side * X. */
  const run = (axis, c, a0, a1, side) => ({ axis, c, a0, a1, side });
  /** Box in run-local coordinates: a = along, o = outward offset, y = centre height; la/lo/h = sizes. */
  function put(kit, mat, r, a, o, y, la, lo, h) {
    if (r.axis === 'x') kit.box(mat, a, y, r.c + r.side * o, la, h, lo);
    else kit.box(mat, r.c + r.side * o, y, a, lo, h, la);
  }
  const divide = (a0, a1, module) => { const n = Math.max(1, Math.round((a1 - a0) / module)); return { n, step: (a1 - a0) / n }; };

  /* ================================================================ */
  /*  REUSABLE FURNITURE GEOMETRY (vertex coloured, one draw each)    */
  /* ================================================================ */
  const C_ALU = 0x3a3d42, C_WHITE = 0xebe8e2, C_OAK = 0xb08a62, C_FABRIC = 0x2f3238, C_TEAL = 0x5d8f94, C_SAND = 0xb2aa8a;
  const deskGeo = merge([
    bx(1.6, 0.03, 0.8, 0, 0.735, 0, C_WHITE),
    bx(0.04, 0.72, 0.7, -0.76, 0.36, 0, C_ALU), bx(0.04, 0.72, 0.7, 0.76, 0.36, 0, C_ALU),
    bx(1.5, 0.35, 0.02, 0, 0.5, -0.36, C_ALU),
    bx(1.5, 0.32, 0.03, 0, 0.9, -0.39, 0x6f7a74), // low screen between facing desks
  ]);
  const chairGeo = merge([
    bx(0.5, 0.08, 0.48, 0, 0.47, 0, C_FABRIC),
    bx(0.47, 0.5, 0.06, 0, 0.78, 0.23, C_FABRIC, 0),
    cy(0.025, 0.025, 0.38, 6, 0, 0.26, 0, C_ALU),
    bx(0.6, 0.03, 0.05, 0, 0.06, 0, C_ALU), bx(0.05, 0.03, 0.6, 0, 0.06, 0, C_ALU),
  ]);
  const monitorGeo = merge([
    bx(0.56, 0.34, 0.03, 0, 1.07, 0, 0x1b1d21), bx(0.05, 0.22, 0.04, 0, 0.86, -0.04, C_ALU), bx(0.22, 0.015, 0.16, 0, 0.75, -0.06, C_ALU),
  ]);
  const screenGeo = G(new THREE.PlaneGeometry(0.52, 0.3));
  const discGeo = G(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 8, 1));
  const plantGeo = merge([
    cy(0.22, 0.17, 0.45, 10, 0, 0.225, 0, 0xd6d0c4),
    { g: T(new THREE.IcosahedronGeometry(0.42, 1)), c: 0x4c6b3a, m: mtx(0, 0.86, 0, 1, 1.25, 1) },
  ]);
  const shelfGeo = merge([
    bx(0.04, 2.3, 0.45, -0.98, 1.15, 0, 0x2c2c2e), bx(0.04, 2.3, 0.45, 0.98, 1.15, 0, 0x2c2c2e),
    bx(2.0, 2.3, 0.03, 0, 1.15, -0.21, 0xd8c8b0),
    ...[0.25, 0.7, 1.15, 1.6, 2.05].map((y) => bx(1.96, 0.03, 0.42, 0, y, 0, 0xe2d6c2)),
  ]);
  const goodsGeo = UNIT_BOX;
  const counterGeo = merge([bx(2.6, 1.0, 0.7, 0, 0.5, 0, 0x3a3631), bx(2.7, 0.05, 0.8, 0, 1.02, 0, 0xd8d0c2)]);
  const tableGeo = merge([bx(1.8, 0.05, 0.9, 0, 0.9, 0, 0xcfc4b2), bx(1.6, 0.85, 0.7, 0, 0.43, 0, 0x5a524a)]);
  const cafeTableGeo = merge([cy(0.38, 0.38, 0.04, 14, 0, 0.74, 0, 0xe3ddd2), cy(0.03, 0.03, 0.72, 6, 0, 0.37, 0, C_ALU), cy(0.22, 0.22, 0.03, 10, 0, 0.015, 0, C_ALU)]);
  const cafeChairGeo = merge([bx(0.42, 0.05, 0.42, 0, 0.46, 0, 0x6a5848), bx(0.42, 0.42, 0.04, 0, 0.7, 0.2, 0x6a5848), bx(0.03, 0.46, 0.03, -0.18, 0.23, -0.18, C_ALU), bx(0.03, 0.46, 0.03, 0.18, 0.23, -0.18, C_ALU), bx(0.03, 0.46, 0.03, -0.18, 0.23, 0.18, C_ALU), bx(0.03, 0.46, 0.03, 0.18, 0.23, 0.18, C_ALU)]);
  const pendantGeo = merge([cy(0.005, 0.005, 1.2, 4, 0, 0.6, 0, 0x222222), cy(0.08, 0.22, 0.22, 12, 0, 0.0, 0, 0xffffff)]);

  /* ================================================================ */
  /*  PARAMETERS (metres)                                             */
  /* ================================================================ */
  const GF = 6;            // double-height retail floor
  const FH = 4;            // office floor to floor
  const NL = 4;            // office levels
  const lvY = (n) => (n === 0 ? 0 : GF + (n - 1) * FH);
  const ROOF = lvY(NL + 1); // 22
  const SOFFIT = 5.0;      // underside of the arcade soffit
  const REC = 2.4;         // shopfront set-back behind the facade line (arcade depth)
  const C = { x0: 0, x1: 22, z0: -26, z1: 0 };       // glass box (corner)
  const F = { x0: -32, x1: 0, z0: -22, z1: 0 };      // stone-framed wing
  const W = { x0: -58, x1: -36, z0: -22, z1: 0 };    // dark-framed block
  const K = { x0: 22, x1: 25.4, z0: -26, z1: -19.5 }; // dark core on the east face
  const P = { x0: 31, x1: 49, z0: -19, z1: -8, h: 4.4 }; // entrance pavilion
  const POOL = { x0: -24, x1: 34, z0: 9, z1: 18 };

  /* ---------- scene graph + floors --------------------------------- */
  const root = new THREE.Group(); root.name = 'mixed-use';
  const building = new THREE.Group(); building.name = 'building'; root.add(building);
  const site = new THREE.Group(); site.name = 'site'; root.add(site);
  const floors = [];
  const floorLabel = (n) => {
    if (n === 0) return { en: 'Shops, lobby and pavilion', ar: 'المحلات والردهة والجناح' };
    if (n === NL + 1) return { en: 'Roof terrace and plant', ar: 'تراس السطح والمعدات' };
    return { en: `Office level ${n}`, ar: `الطابق المكتبي ${n}` };
  };
  for (let n = 0; n <= NL + 1; n++) {
    const g = new THREE.Group();
    g.name = n === 0 ? 'L0-retail' : n === NL + 1 ? `L${n}-roof` : `L${n}-office`;
    g.userData = { level: n, label: floorLabel(n), buildingId: 'eastmain' };
    building.add(g); floors.push(g);
  }
  const kits = floors.map((g) => makeKit(g, g.name));
  // per-floor instanced furniture collectors
  const furn = floors.map(() => ({ desks: [], chairs: [], monitors: [], screens: [], discs: [], plants: [], shelves: [], goods: [], goodsCol: [], counters: [], tables: [], cafeT: [], cafeC: [], pendants: [] }));

  /* ================================================================ */
  /*  CURTAIN WALL (glass box): offset panels, dark frames            */
  /* ================================================================ */
  const TONE = { clear: 0, refl: 1, dark: 2 };
  function curtainRun(k, r, y0, y1, rowH, faceId, { offsetPanels = true } = {}) {
    const { n, step } = divide(r.a0, r.a1, 1.55);
    let row = 0;
    for (let y = y0; y < y1 - 0.01; y += rowH, row++) {
      const h = Math.min(rowH, y1 - y);
      for (let i = 0; i < n; i++) {
        const a = r.a0 + step * (i + 0.5);
        // clustered tones: slow pattern + noise so reflective patches read like the render
        const hv = hash(faceId, i, row), hb = hash(faceId + 7, Math.floor(i / 3), Math.floor(row / 2));
        let tone = TONE.clear;
        if (hb > 0.62 || hv > 0.86) tone = TONE.refl;
        if (hv < 0.07 || (hb < 0.08 && hv < 0.5)) tone = TONE.dark;
        const off = offsetPanels ? [0, 0, 0, 0.14, 0.28][Math.floor(hash(faceId + 3, i, row) * 5)] : 0;
        const o = 0.05 + off;
        const mat = tone === TONE.dark ? M.spandrel : tone === TONE.refl ? M.glassRefl : M.glassClear;
        put(k, mat, r, a, o, y + h / 2, step - 0.03, tone === TONE.dark ? 0.05 : 0.025, h - 0.03);
        // frame around the panel (follows the panel's offset)
        put(k, M.alu, r, a - step / 2 + 0.022, o + 0.02, y + h / 2, 0.045, 0.1, h);
        put(k, M.alu, r, a, o + 0.02, y + 0.022, step, 0.1, 0.045);
        if (off > 0) { // returns of a proud panel
          put(k, M.alu, r, a + step / 2 - 0.022, o / 2 + 0.02, y + h / 2, 0.045, o + 0.04, h);
          put(k, M.alu, r, a, o / 2 + 0.02, y + h - 0.022, step, o + 0.04, 0.045);
        }
      }
      // closing frame at the run end
      put(k, M.alu, r, r.a1 - 0.022, 0.07, y + h / 2, 0.045, 0.1, h);
    }
  }

  /* ================================================================ */
  /*  OFFICE INTERIOR (one floor of one volume)                      */
  /* ================================================================ */
  /**
   * rect: interior extents; core: {x0,x1,z0,z1}; seed decides the fit-out (open plan / clinic rooms).
   */
  function officeInterior(n, rect, core, { clinic = false, glassFaces = [] } = {}) {
    const k = kits[n], f = furn[n], y0 = lvY(n);
    const { x0, x1, z0, z1 } = rect;
    k.span(M.concrete, x0, y0 - 0.35, z0, x1, y0, z1);                 // structural slab
    k.span(M.floorOffice, x0 + 0.05, y0, z0 + 0.05, x1 - 0.05, y0 + 0.04, z1 - 0.05);
    k.span(M.ceiling, x0 + 0.05, y0 + 3.2, z0 + 0.05, x1 - 0.05, y0 + 3.26, z1 - 0.05);
    // dark plenum / slab band seen through the glass between floors
    for (const r of glassFaces) put(k, M.plenum, r, (r.a0 + r.a1) / 2, -0.35, y0 + 3.7, r.a1 - r.a0, 0.1, 1.05);
    // core: walls, lift doors on the open side
    k.span(M.coreWall, core.x0, y0 + 0.04, core.z0, core.x1, y0 + 3.2, core.z1);
    const doorZ = core.z1 + 0.02;
    for (let x = core.x0 + 1.4; x < core.x1 - 1; x += 1.8) k.box(M.aluMid, x, y0 + 1.15, doorZ, 1.1, 2.2, 0.04);
    // ceiling lights: round downlights on a 2.4 m grid, avoiding the core
    for (let x = x0 + 1.5; x < x1 - 1; x += 2.4) for (let z = z0 + 1.5; z < z1 - 1; z += 2.4) {
      if (x > core.x0 - 0.5 && x < core.x1 + 0.5 && z > core.z0 - 0.5 && z < core.z1 + 0.5) continue;
      f.discs.push(mtx(x, y0 + 3.19, z));
    }
    if (clinic) {
      // clinic floor: consulting rooms along the front, a waiting area with chairs, a reception counter
      const roomD = 4.2, zr = z1 - roomD;
      for (let x = x0 + 0.2; x < x1 - 3; x += 4.0) {
        k.span(M.intWall, x, y0 + 0.04, zr, x + 0.12, y0 + 3.2, z1 - 0.6);
        k.span(M.glassInt, x + 0.12, y0 + 0.04, zr - 0.03, x + 4.0, y0 + 3.2, zr + 0.03);
        k.span(M.alu, x + 0.12, y0 + 2.2, zr - 0.05, x + 4.0, y0 + 2.26, zr + 0.05);
        f.tables.push(mtx(x + 2.0, y0, zr + 2.2, 0.8, 0.85, 0.9));
        f.chairs.push(mtx(x + 2.0, y0, zr + 1.3, 1, 1, 1, 0, Math.PI));
        f.chairs.push(mtx(x + 2.6, y0, zr + 3.1, 1, 1, 1, 0, 0.3));
        f.plants.push(mtx(x + 3.5, y0, z1 - 1.0));
      }
      for (let x = x0 + 3; x < x1 - 3; x += 1.2) if (x < core.x0 - 1 || x > core.x1 + 1) {
        f.chairs.push(mtx(x, y0, core.z1 + 3.2, 1, 1, 1, 0, 0));
      }
      f.counters.push(mtx((core.x0 + core.x1) / 2, y0, core.z1 + 1.6));
      return;
    }
    // open plan: benching (facing pairs of desks), chairs, screens; plants; a glass meeting room
    const meetX0 = x0 + 0.4, meetX1 = Math.min(x1 - 6, x0 + 8.4);
    const meetZ0 = z0 + 0.4, meetZ1 = Math.min(z1 - 6, z0 + 6.4);
    k.span(M.glassInt, meetX0, y0 + 0.04, meetZ1 - 0.03, meetX1, y0 + 3.2, meetZ1 + 0.03);
    k.span(M.glassInt, meetX1 - 0.03, y0 + 0.04, meetZ0, meetX1 + 0.03, y0 + 3.2, meetZ1);
    k.span(M.alu, meetX0, y0 + 3.14, meetZ1 - 0.04, meetX1, y0 + 3.2, meetZ1 + 0.04);
    f.tables.push(mtx((meetX0 + meetX1) / 2, y0, (meetZ0 + meetZ1) / 2, 2.2, 0.85, 1.6));
    for (let i = 0; i < 4; i++) {
      const cx = (meetX0 + meetX1) / 2 - 1.2 + i * 0.8;
      f.chairs.push(mtx(cx, y0, (meetZ0 + meetZ1) / 2 - 1.15, 1, 1, 1, 0, Math.PI));
      f.chairs.push(mtx(cx, y0, (meetZ0 + meetZ1) / 2 + 1.15, 1, 1, 1, 0, 0));
    }
    const blocked = (x, z) => (x > core.x0 - 1.8 && x < core.x1 + 1.8 && z > core.z0 - 1.8 && z < core.z1 + 2.6)
      || (x > meetX0 - 1.2 && x < meetX1 + 1.2 && z > meetZ0 - 1.2 && z < meetZ1 + 1.2);
    const alongX = (x1 - x0) >= (z1 - z0);
    const pitchA = 1.62, pitchB = 3.7;
    const A0 = alongX ? x0 : z0, A1 = alongX ? x1 : z1, B0 = alongX ? z0 : x0, B1 = alongX ? z1 : x1;
    for (let b = B0 + 2.3; b < B1 - 2.0; b += pitchB) {
      for (let a = A0 + 1.6; a < A1 - 1.4; a += pitchA) {
        if (hash(n * 31 + Math.round(a), Math.round(b)) < 0.06) continue; // a few gaps
        for (const s of [-1, 1]) {
          const x = alongX ? a : b + s * 0.4, z = alongX ? b + s * 0.4 : a;
          if (blocked(x, z)) continue;
          // desk faces the screen between the pair; s=-1 sits on the near side
          const ry = alongX ? (s < 0 ? Math.PI : 0) : (s < 0 ? -Math.PI / 2 : Math.PI / 2);
          f.desks.push(mtx(x, y0, z, 1, 1, 1, 0, ry));
          const cdx = alongX ? 0 : s * 0.75, cdz = alongX ? s * 0.75 : 0;
          if (hash(Math.round(x * 3), Math.round(z * 3), n) > 0.12) {
            f.chairs.push(mtx(x + cdx + rr(-0.12, 0.12), y0, z + cdz + rr(-0.1, 0.1), 1, 1, 1, 0, ry + rr(-0.5, 0.5)));
          }
          const mdx = alongX ? 0 : -s * 0.12, mdz = alongX ? -s * 0.12 : 0;
          f.monitors.push(mtx(x + mdx, y0, z + mdz, 1, 1, 1, 0, ry));
          // screen face, a hair in front of the monitor body, facing the chair
          const sx = x + mdx + (alongX ? 0 : s * 0.018), sz = z + mdz + (alongX ? s * 0.018 : 0);
          f.screens.push(mtx(sx, y0 + 1.07, sz, 1, 1, 1, 0, ry));
        }
      }
    }
    for (let i = 0; i < 4; i++) f.plants.push(mtx(rr(x0 + 1, x1 - 1), y0, i % 2 ? z0 + 0.9 : z1 - 0.9));
  }

  /* ================================================================ */
  /*  RETAIL (ground floor shops behind the arcade)                   */
  /* ================================================================ */
  /**
   * Shops along a front run (axis 'x', outward +Z): shopfront at z = front - REC, units between party walls.
   */
  function shopRow(k, f, x0, x1, zFront, depth, unit, kind = 'mixed') {
    const zs = zFront - REC, zb = zs - depth;
    k.span(M.floorShop, x0, 0, zb, x1, 0.12, zFront - 0.1);
    k.span(M.ceiling, x0, SOFFIT - 0.15, zb, x1, SOFFIT - 0.05, zs);
    k.span(M.shopBack, x0, 0.12, zb - 0.2, x1, SOFFIT - 0.15, zb);
    // shopfront glazing with a slim frame, transom and doors
    k.span(M.glassShop, x0, 0.12, zs - 0.02, x1, SOFFIT - 0.15, zs + 0.02);
    k.span(M.alu, x0, SOFFIT - 0.25, zs - 0.06, x1, SOFFIT - 0.15, zs + 0.06);
    k.span(M.alu, x0, 3.55, zs - 0.05, x1, 3.62, zs + 0.05);
    k.span(M.alu, x0, 0.12, zs - 0.06, x1, 0.2, zs + 0.06);
    const { n, step } = divide(x0, x1, unit);
    for (let i = 0; i <= n; i++) {
      const x = x0 + i * step;
      k.box(M.alu, x, SOFFIT / 2, zs, 0.1, SOFFIT - 0.1, 0.14);
      if (i < n) {
        const sub = divide(x, x + step, 1.8);
        for (let j = 1; j < sub.n; j++) k.box(M.alu, x + j * sub.step, SOFFIT / 2, zs, 0.05, SOFFIT - 0.1, 0.1);
      }
      if (i > 0 && i < n) k.span(M.intWall, x - 0.1, 0.12, zb, x + 0.1, SOFFIT - 0.15, zs - 0.05);
    }
    for (let i = 0; i < n; i++) {
      const sx0 = x0 + i * step, sx1 = sx0 + step, cx = (sx0 + sx1) / 2;
      const type = kind === 'cafe' ? 'cafe' : ['books', 'fashion', 'cafe', 'home', 'pharmacy'][Math.floor(hash(Math.round(cx), 11) * 5)];
      // shelving along the back wall
      for (let x = sx0 + 1.3; x < sx1 - 1.1; x += 2.05) {
        f.shelves.push(mtx(x, 0.12, zb + 0.25));
        for (const y of [0.25, 0.7, 1.15, 1.6, 2.05]) for (let g = 0; g < 4; g++) {
          if (type === 'cafe' && y < 1.5) continue;
          const w = rr(0.2, 0.42), h = rr(0.18, 0.38);
          f.goods.push(mtx(x - 0.75 + g * 0.5 + rr(-0.05, 0.05), 0.12 + y + 0.015 + h / 2, zb + 0.28, w, h, rr(0.2, 0.34)));
          const base = type === 'books' ? pick([0x8a3b2e, 0x2e4a6a, 0xc8b48a, 0x3c5a3a, 0xe6dfd0]) : type === 'pharmacy' ? pick([0xf2f2f2, 0x6ab0c0, 0xe8e4dc])
            : type === 'fashion' ? pick([0x1d1d22, 0xc9b9a3, 0x7c2f2f, 0xe8e2d8]) : pick([0xcbb89b, 0x8a6a4a, 0xe8e0d2, 0x4a5a5a]);
          f.goodsCol.push(new THREE.Color(base));
        }
      }
      // shelving on one party wall, a counter, display tables, pendants
      for (let z = zb + 1.8; z < zs - 1.8; z += 2.05) {
        f.shelves.push(mtx(sx0 + 0.4, 0.12, z, 1, 1, 1, 0, Math.PI / 2));
        for (const y of [0.7, 1.15, 1.6]) for (let g = 0; g < 3; g++) {
          f.goods.push(mtx(sx0 + 0.45, 0.12 + y + 0.14, z - 0.6 + g * 0.6, 0.28, 0.26, 0.36));
          f.goodsCol.push(new THREE.Color(pick([0xcbb89b, 0x8a6a4a, 0xe8e0d2, 0x4a5a5a, 0x2e4a6a])));
        }
      }
      f.counters.push(mtx(sx1 - 2.0, 0.12, zb + 2.4, 1, 1, 1, 0, Math.PI / 2));
      if (type === 'cafe') {
        for (let x = sx0 + 1.6; x < sx1 - 2.6; x += 1.9) for (let z = zb + 3.5; z < zs - 1; z += 1.9) {
          f.cafeT.push(mtx(x, 0.12, z));
          f.cafeC.push(mtx(x - 0.55, 0.12, z, 1, 1, 1, 0, Math.PI / 2), mtx(x + 0.55, 0.12, z, 1, 1, 1, 0, -Math.PI / 2));
        }
      } else {
        for (let x = sx0 + 2.2; x < sx1 - 3; x += 2.6) f.tables.push(mtx(x, 0.12, (zb + zs) / 2 + 0.6));
      }
      for (let x = sx0 + 1.5; x < sx1 - 1; x += 2.2) f.pendants.push(mtx(x, SOFFIT - 1.55, (zb + zs) / 2 + 0.5));
      for (let x = sx0 + 1; x < sx1 - 0.5; x += 2) for (let z = zb + 1; z < zs; z += 2.5) f.discs.push(mtx(x, SOFFIT - 0.16, z));
    }
    return { zs, zb };
  }

  /** Arcade on the facade line: columns, timber soffit with slats, dark fascia with backlit sign boards. */
  function arcade(k, x0, x1, zFront, colStep, { signs = true, colX = null } = {}) {
    const zs = zFront - REC;
    // soffit: timber slats on a dark carrier, downlights
    k.span(M.alu, x0, SOFFIT, zs, x1, SOFFIT + 0.08, zFront);
    for (let x = x0 + 0.1; x < x1; x += 0.24) k.box(M.soffit, x, SOFFIT - 0.03, (zs + zFront) / 2, 0.12, 0.06, REC);
    for (let x = x0 + 2; x < x1 - 1; x += 3.2) furn[0].discs.push(mtx(x, SOFFIT - 0.07, (zs + zFront) / 2));
    // fascia band (dark aluminium) wrapping the soffit edge
    k.span(M.alu, x0, SOFFIT - 0.06, zFront - 0.05, x1, GF, zFront + 0.35);
    // columns
    const xs = colX || (() => { const out = []; const d = divide(x0, x1, colStep); for (let i = 0; i <= d.n; i++) out.push(x0 + i * d.step); return out; })();
    for (const x of xs) k.box(M.cladding, clamp(x, x0 + 0.3, x1 - 0.3), SOFFIT / 2, zFront - 0.5, 0.55, SOFFIT, 0.55);
    if (signs) {
      const d = divide(x0, x1, 8);
      for (let i = 0; i < d.n; i++) signBoards.push({ x: x0 + (i + 0.5) * d.step, y: (SOFFIT + GF) / 2 - 0.02, z: zFront + 0.36, w: Math.min(4.6, d.step * 0.55), h: 0.5, cell: (i + Math.round(x0)) & 3, ry: 0 });
    }
  }
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const signBoards = [];

  /* ================================================================ */
  /*  LEVEL 0: retail, lobby, pavilion                                */
  /* ================================================================ */
  {
    const k = kits[0], f = furn[0];
    // C ground floor: corner shop along the front + lobby on the east side
    shopRow(k, f, C.x0, C.x1 - 7, C.z1, 9, 7.5, 'books');
    arcade(k, C.x0, C.x1, C.z1, 7.33, { colX: [C.x0 + 7.33, C.x0 + 14.66, C.x1 - 0.3] });
    // east side of C: lobby glazing recessed under the glass box, columns on the facade line
    {
      const xs = C.x1 - REC;
      k.span(M.floorShop, C.x1 - 7, 0, -19.5, xs, 0.12, C.z1 - REC);
      k.span(M.glassShop, C.x1 - 7, 0.12, C.z1 - REC - 0.02, xs, SOFFIT - 0.15, C.z1 - REC + 0.02);
      for (let x = C.x1 - 7; x <= xs; x += 1.53) k.box(M.alu, x, SOFFIT / 2, C.z1 - REC, 0.1, SOFFIT - 0.1, 0.12);
      k.span(M.alu, C.x1 - 7, SOFFIT - 0.25, C.z1 - REC - 0.05, xs, SOFFIT - 0.15, C.z1 - REC + 0.05);
      k.span(M.glassShop, xs - 0.02, 0.12, -19.5, xs + 0.02, SOFFIT - 0.15, C.z1 - REC);
      for (let z = -19.5; z <= C.z1 - REC + 0.01; z += 2.2) k.box(M.alu, xs, SOFFIT / 2, z, 0.12, SOFFIT - 0.1, 0.1);
      k.span(M.alu, xs - 0.05, SOFFIT - 0.25, -19.5, xs + 0.05, SOFFIT - 0.15, C.z1 - REC);
      k.span(M.ceiling, C.x1 - 7, SOFFIT - 0.15, -19.5, xs, SOFFIT - 0.05, C.z1 - REC);
      k.span(M.intWall, C.x1 - 7.1, 0.12, -19.5, C.x1 - 6.9, SOFFIT - 0.15, C.z1 - REC - 0.05);
      k.span(M.stoneLight, C.x1 - 6.9, 0.12, -18.5, C.x1 - 6.6, SOFFIT - 0.15, -9); // feature wall
      f.counters.push(mtx(C.x1 - 5.5, 0.12, -12, 1.2, 1, 1, 0, Math.PI / 2));
      for (let z = -18; z < -3; z += 2.6) f.discs.push(mtx(C.x1 - 5, SOFFIT - 0.16, z));
      // soffit + fascia on the east face
      k.span(M.alu, xs, SOFFIT, -19.5, C.x1, SOFFIT + 0.08, C.z1);
      for (let z = -19.4; z < C.z1; z += 0.24) k.box(M.soffit, (xs + C.x1) / 2, SOFFIT - 0.03, z, REC, 0.06, 0.12);
      k.span(M.alu, C.x1 - 0.05, SOFFIT - 0.06, -19.5, C.x1 + 0.35, GF, C.z1 + 0.35);
      for (const z of [-19.2, -12.2, -5.2]) k.box(M.cladding, C.x1 - 0.5, SOFFIT / 2, z, 0.55, SOFFIT, 0.55);
      signBoards.push({ x: C.x1 + 0.36, y: (SOFFIT + GF) / 2 - 0.02, z: -9.5, w: 4.2, h: 0.5, cell: 2, ry: Math.PI / 2 });
      // back of house of C (behind the shops) and its rear wall
      k.span(M.render, C.x0, 0, C.z0, C.x1, GF, C.z0 + 0.4);
      k.span(M.render, C.x0, 0, C.z0, C.x0 + 0.3, GF, F.z0);
    }
    // F: four shops along the front, rear service wall
    shopRow(k, f, F.x0 + 0.6, F.x1, F.z1, 9, 8);
    arcade(k, F.x0, F.x1, F.z1, 8);
    k.span(M.render, F.x0, 0, F.z0, F.x1, GF, F.z0 + 0.4);
    k.span(M.render, F.x0, 0, F.z0, F.x0 + 0.6, GF, F.z1 - REC);
    // W: three shops, the end one a café
    shopRow(k, f, W.x0 + 0.6, W.x1, W.z1, 9, 7.3, 'mixed');
    arcade(k, W.x0, W.x1, W.z1, 7.3);
    k.span(M.render, W.x0, 0, W.z0, W.x1, GF, W.z0 + 0.4);
    k.span(M.render, W.x0, 0, W.z0, W.x0 + 0.6, GF, W.z1 - REC);
    k.span(M.render, W.x1 - 0.6, 0, W.z0, W.x1, GF, W.z1 - REC);
    // backs of the shop rows (beyond the shop depth) closed by the service zone volume
    for (const [a, b] of [[C.x0, C.x1 - 7], [F.x0, F.x1], [W.x0, W.x1]]) k.span(M.render, a, 0, (a === C.x0 ? C.z0 : F.z0) + 0.4, b, GF, -REC - 9.2);
    // dark core (east face): full height, cladding with vertical joints and slot windows
    k.span(M.cladding, K.x0, 0, K.z0, K.x1, ROOF + 2.6, K.z1);
    for (let z = K.z0 + 0.8; z < K.z1; z += 1.3) k.box(M.alu, K.x1 + 0.01, (ROOF + 2.6) / 2, z, 0.04, ROOF + 2.6, 0.03);
    for (let y = 1.5; y < ROOF + 2.6; y += 3.2) k.box(M.alu, K.x1 + 0.01, y, (K.z0 + K.z1) / 2, 0.04, 0.03, K.z1 - K.z0);
    for (let n = 1; n <= NL; n++) k.box(M.glassRefl, K.x1 + 0.02, lvY(n) + 2, K.z1 - 1.0, 0.03, 2.6, 0.5);

    /* ---- entrance pavilion: glass box, deep dark canopy with sign, warm interior ---- */
    const V = P;
    k.span(M.floorShop, V.x0, 0, V.z0, V.x1, 0.15, V.z1);
    const pr = [run('x', V.z1, V.x0, V.x1, +1), run('z', V.x1, V.z0, V.z1, +1), run('z', V.x0, V.z0, V.z1, -1), run('x', V.z0, V.x0, V.x1, -1)];
    for (const r of pr) {
      const mid = (r.a0 + r.a1) / 2;
      put(k, M.glassShop, r, mid, 0, 0.15 + (V.h - 0.15) / 2, r.a1 - r.a0, 0.04, V.h - 0.15);
      const d = divide(r.a0, r.a1, 2.4);
      for (let i = 0; i <= d.n; i++) put(k, M.alu, r, r.a0 + i * d.step, 0.02, V.h / 2, 0.08, 0.14, V.h);
      put(k, M.alu, r, mid, 0.02, 2.6, r.a1 - r.a0, 0.1, 0.06);
    }
    // canopy: a thick dark slab projecting on the plaza side, with a backlit sign on its fascia
    const over = 2.6;
    k.span(M.cladding, V.x0 - 0.6, V.h, V.z0 - 0.6, V.x1 + 0.9, V.h + 1.15, V.z1 + over);
    k.span(M.soffit, V.x0 - 0.5, V.h - 0.02, V.z1, V.x1 + 0.8, V.h, V.z1 + over - 0.1);
    for (const x of [V.x0 + 0.2, V.x1 - 0.2]) k.box(M.cladding, x, V.h / 2, V.z1 + over - 0.4, 0.3, V.h, 0.3);
    for (let x = V.x0 + 1.5; x < V.x1; x += 3) furn[0].discs.push(mtx(x, V.h - 0.03, V.z1 + over / 2));
    signBoards.push({ x: (V.x0 + V.x1) / 2, y: V.h + 0.58, z: V.z1 + over + 0.01, w: 7, h: 0.55, cell: 1, ry: 0 });
    k.span(M.ceiling, V.x0 + 0.2, V.h - 0.12, V.z0 + 0.2, V.x1 - 0.2, V.h - 0.02, V.z1 - 0.2);
    k.span(M.shopBack, V.x0 + 0.3, 0.15, V.z0 + 0.3, V.x1 - 0.3, V.h - 0.12, V.z0 + 0.5);
    f.counters.push(mtx(V.x0 + 4, 0.15, V.z0 + 2.2), mtx(V.x0 + 6.8, 0.15, V.z0 + 2.2));
    for (let x = V.x0 + 2; x < V.x1 - 1.5; x += 2.4) for (let z = V.z0 + 4.8; z < V.z1 - 1; z += 2.3) {
      f.cafeT.push(mtx(x, 0.15, z));
      f.cafeC.push(mtx(x - 0.55, 0.15, z, 1, 1, 1, 0, Math.PI / 2), mtx(x + 0.55, 0.15, z, 1, 1, 1, 0, -Math.PI / 2));
    }
    for (let x = V.x0 + 2; x < V.x1 - 1; x += 2.4) f.pendants.push(mtx(x, V.h - 1.4, (V.z0 + V.z1) / 2 + 1));
    k.finish();
  }

  /* ================================================================ */
  /*  OFFICE LEVELS 1..4                                              */
  /* ================================================================ */
  for (let n = 1; n <= NL; n++) {
    const k = kits[n], y0 = lvY(n), y1 = y0 + FH;
    /* ---- C: glass box curtain wall on three faces ---- */
    const cFront = run('x', C.z1, C.x0, C.x1, +1);
    const cSide = run('z', C.x1, K.z1, C.z1, +1);
    const cBack = run('x', C.z0, C.x0, C.x1, -1);
    const cWest = run('z', C.x0, C.z0, F.z0, -1);
    curtainRun(k, cFront, y0, y1, 2, 1 + n * 10);
    curtainRun(k, cSide, y0, y1, 2, 2 + n * 10);
    curtainRun(k, cBack, y0, y1, 2, 3 + n * 10, { offsetPanels: false });
    curtainRun(k, cWest, y0, y1, 2, 4 + n * 10, { offsetPanels: false });
    officeInterior(n, { x0: C.x0 + 0.1, x1: C.x1 - 0.4, z0: C.z0 + 0.4, z1: C.z1 - 0.4 }, { x0: 7, x1: 15, z0: -21, z1: -15 },
      { clinic: n === 1, glassFaces: [cFront, cSide, cBack] });
    // corner post (thin, dark) so the box reads crisp
    k.box(M.alu, C.x1 + 0.06, y0 + FH / 2, C.z1 + 0.06, 0.14, FH, 0.14);

    /* ---- F: stone frame with recessed glazing and deep dark mullions ---- */
    {
      const gz = F.z1 - 0.9; // glazing line
      const r = run('x', gz, F.x0 + 1.1, F.x1 - 1.1, +1);
      const bays = divide(r.a0, r.a1, 1.6);
      for (let i = 0; i < bays.n; i++) {
        const a = r.a0 + (i + 0.5) * bays.step;
        const hv = hash(n, i, 77);
        put(k, hv > 0.72 ? M.glassRefl : M.glassClear, r, a, 0, y0 + FH / 2 + 0.2, bays.step - 0.04, 0.025, FH - 0.6);
      }
      for (let i = 0; i <= bays.n; i++) {
        const a = r.a0 + i * bays.step;
        const deep = i % 3 === 0;
        put(k, M.alu, r, a, deep ? 0.32 : 0.06, y0 + FH / 2, deep ? 0.12 : 0.06, deep ? 0.62 : 0.12, FH);
      }
      put(k, M.alu, r, (r.a0 + r.a1) / 2, 0.08, y0 + 0.2, r.a1 - r.a0, 0.18, 0.62);   // floor band
      put(k, M.alu, r, (r.a0 + r.a1) / 2, 0.06, y0 + 2.6, r.a1 - r.a0, 0.12, 0.06);   // transom
      // louvres over the top floor of the west bay
      if (n === NL) for (let y = y0 + 0.6; y < y1 - 0.2; y += 0.28) k.box(M.alu, (F.x0 + 1.1 + -16.5) / 2, y, F.z1 - 0.55, -16.5 - F.x0 - 1.1, 0.05, 0.32);
      // the stone frame: posts (bottom beam lives at the soffit line, crown on the roof level)
      for (const [a0, a1] of [[F.x0, F.x0 + 1.1], [-16.9, -16.1], [F.x1 - 1.1, F.x1]]) k.span(M.stone, a0, y0, F.z1 - 1.0, a1, y1, F.z1 + 0.7);
      // rear facade: punched strip windows in render
      k.span(M.render, F.x0, y0, F.z0, F.x1, y0 + 1.1, F.z0 + 0.4);
      k.span(M.render, F.x0, y0 + 3.3, F.z0, F.x1, y1, F.z0 + 0.4);
      k.span(M.glassRefl, F.x0, y0 + 1.1, F.z0 + 0.15, F.x1, y0 + 3.3, F.z0 + 0.2);
      for (let x = F.x0 + 2; x < F.x1; x += 2) k.box(M.alu, x, y0 + 2.2, F.z0 + 0.1, 0.08, 2.2, 0.14);
      // west end: solid render wall
      k.span(M.render, F.x0, y0, F.z0, F.x0 + 0.5, y1, F.z1 - 1.0);
      officeInterior(n, { x0: F.x0 + 0.6, x1: F.x1, z0: F.z0 + 0.4, z1: gz - 0.1 }, { x0: -22, x1: -14, z0: -19, z1: -13 },
        { glassFaces: [run('x', gz, F.x0, F.x1, +1)] });
    }

    /* ---- W: dark frame, vertical fins, lattice screen on the top floor ---- */
    {
      const gz = W.z1 - 0.7;
      const r = run('x', gz, W.x0 + 0.9, W.x1 - 0.9, +1);
      const bays = divide(r.a0, r.a1, 1.25);
      for (let i = 0; i < bays.n; i++) {
        const a = r.a0 + (i + 0.5) * bays.step;
        put(k, hash(n, i, 91) > 0.6 ? M.glassRefl : M.glassClear, r, a, 0, y0 + FH / 2, bays.step - 0.04, 0.025, FH - 0.1);
      }
      for (let i = 0; i <= bays.n; i++) put(k, M.alu, r, r.a0 + i * bays.step, 0.18, y0 + FH / 2, 0.08, 0.36, FH);
      put(k, M.cladding, r, (r.a0 + r.a1) / 2, 0.2, y0 + 0.15, r.a1 - r.a0, 0.4, 0.5);
      for (const [a0, a1] of [[W.x0, W.x0 + 0.9], [W.x1 - 0.9, W.x1]]) k.span(M.cladding, a0, y0, W.z1 - 0.8, a1, y1, W.z1 + 0.4);
      if (n === NL) k.span(M.screen, W.x0 + 0.9, y0 + 0.3, W.z1 - 0.12, W.x1 - 0.9, y1 - 0.1, W.z1 - 0.08);
      k.span(M.render, W.x0, y0, W.z0, W.x1, y0 + 1.1, W.z0 + 0.4);
      k.span(M.render, W.x0, y0 + 3.3, W.z0, W.x1, y1, W.z0 + 0.4);
      k.span(M.glassRefl, W.x0, y0 + 1.1, W.z0 + 0.15, W.x1, y0 + 3.3, W.z0 + 0.2);
      k.span(M.cladding, W.x0, y0, W.z0, W.x0 + 0.5, y1, W.z1 - 0.8);
      k.span(M.cladding, W.x1 - 0.5, y0, W.z0, W.x1, y1, W.z1 - 0.8);
      officeInterior(n, { x0: W.x0 + 0.5, x1: W.x1 - 0.5, z0: W.z0 + 0.4, z1: gz - 0.1 }, { x0: -51, x1: -44, z0: -19, z1: -13 },
        { clinic: n === 2, glassFaces: [run('x', gz, W.x0, W.x1, +1)] });
    }
    if (n === 1) { // frame beams at the soffit line
      k.span(M.stone, F.x0, GF - 0.5, F.z1 - 1.0, F.x1, GF + 0.25, F.z1 + 0.7);
      k.span(M.cladding, W.x0, GF - 0.4, W.z1 - 0.8, W.x1, GF + 0.2, W.z1 + 0.4);
    }
    k.finish();
  }

  const roofShrubMs = [];

  /* ================================================================ */
  /*  ROOF (level 5): terrace on the glass box, plant on the wings    */
  /* ================================================================ */
  {
    const k = kits[NL + 1], f = furn[NL + 1], y = ROOF;
    // slabs
    k.span(M.concrete, C.x0, y - 0.35, C.z0, C.x1, y, C.z1);
    k.span(M.concrete, F.x0, y - 0.35, F.z0, F.x1, y, F.z1);
    k.span(M.concrete, W.x0, y - 0.35, W.z0, W.x1, y, W.z1);
    // glass box parapet: one more row of curtain panels (glass balustrade look), dark cap
    const cFront = run('x', C.z1, C.x0, C.x1, +1), cSide = run('z', C.x1, K.z1, C.z1, +1), cBack = run('x', C.z0, C.x0, C.x1, -1);
    curtainRun(k, cFront, y, y + 1.3, 1.3, 91);
    curtainRun(k, cSide, y, y + 1.3, 1.3, 92);
    curtainRun(k, cBack, y, y + 1.3, 1.3, 93, { offsetPanels: false });
    for (const r of [cFront, cSide, cBack]) put(k, M.alu, r, (r.a0 + r.a1) / 2, 0.05, y + 1.33, r.a1 - r.a0, 0.32, 0.08);
    k.box(M.alu, C.x1 + 0.06, y + 0.65, C.z1 + 0.06, 0.14, 1.3, 0.14);
    // terrace: timber deck, planters with shrubs, pergola, loungers, a lift overrun
    k.span(M.timberDeck, C.x0 + 0.6, y, C.z0 + 7, C.x1 - 0.6, y + 0.14, C.z1 - 0.6);
    k.span(M.gravel, C.x0 + 0.6, y, C.z0 + 0.6, C.x1 - 0.6, y + 0.06, C.z0 + 7);
    k.span(M.stoneLight, 7, y, -21, 15, y + 3.4, -15);
    const planters = [[3, -2.4], [8, -2.4], [13, -2.4], [18.5, -2.4], [19.6, -8], [19.6, -13]];
    for (const [x, z] of planters) k.span(M.render, x - 1.2, y + 0.14, z - 0.6, x + 1.2, y + 0.84, z + 0.6);
    const roofTables = [], roofChairs = [], fans = [];
    for (const [x, z] of planters) for (let i = 0; i < 3; i++) roofShrubMs.push(mtx(x - 0.7 + i * 0.7, y + 1.05, z + rr(-0.1, 0.1), rr(0.45, 0.6), rr(0.4, 0.55), rr(0.45, 0.55), 0, rr(0, 6)));
    for (let x = 2; x <= 13; x += 5.5) for (const z of [-8, -13.5]) k.box(M.alu, x, y + 1.6, z, 0.14, 3.0, 0.14);
    for (let x = 1.6; x < 13.6; x += 0.45) k.box(M.timberDeck, x, y + 3.12, -10.75, 0.08, 0.2, 6.6);
    for (const z of [-8, -13.5]) k.box(M.alu, 7.5, y + 3.0, z, 11.2, 0.18, 0.14);
    for (let x = 3; x < 12; x += 3) for (const z of [-9.5, -12]) {
      roofTables.push(mtx(x, y + 0.14, z));
      roofChairs.push(mtx(x - 0.6, y + 0.14, z, 1, 1, 1, 0, Math.PI / 2), mtx(x + 0.6, y + 0.14, z, 1, 1, 1, 0, -Math.PI / 2));
    }
    for (let x = 16; x < 20; x += 1.4) k.box(M.render, x, y + 0.35, -18, 0.7, 0.35, 1.9);
    // F roof: membrane, condensers, louvred screen, overrun
    k.span(M.gravel, F.x0 + 0.4, y, F.z0 + 0.4, F.x1, y + 0.08, F.z1 - 1.0);
    k.span(M.stone, F.x0, y, F.z1 - 1.0, F.x1, y + 1.4, F.z1 + 0.7);   // stone crown of the frame
    k.span(M.render, F.x0, y, F.z0, F.x1, y + 1.1, F.z0 + 0.35);
    k.span(M.render, F.x0, y, F.z0, F.x0 + 0.35, y + 1.1, F.z1 - 1.0);
    k.span(M.stoneLight, -22, y, -19, -14, y + 3.2, -13);
    const plant = { x0: -12, x1: -2, z0: -19, z1: -6 };
    for (let x = plant.x0 + 1.2; x < plant.x1 - 0.8; x += 2.3) for (let z = plant.z0 + 1.4; z < plant.z1 - 1; z += 2.6) {
      k.box(M.aluMid, x, y + 0.65, z, 1.9, 1.1, 1.1);
      fans.push(mtx(x - 0.45, y + 1.21, z, 1.7, 1, 1.7), mtx(x + 0.45, y + 1.21, z, 1.7, 1, 1.7));
    }
    for (let x = plant.x0; x <= plant.x1; x += 0.35) { k.box(M.alu, x, y + 1.3, plant.z1 + 0.6, 0.05, 2.4, 0.2); k.box(M.alu, x, y + 1.3, plant.z0 - 0.6, 0.05, 2.4, 0.2); }
    for (let z = plant.z0 - 0.6; z <= plant.z1 + 0.6; z += 0.35) { k.box(M.alu, plant.x0 - 0.3, y + 1.3, z, 0.2, 2.4, 0.05); k.box(M.alu, plant.x1 + 0.3, y + 1.3, z, 0.2, 2.4, 0.05); }
    // W roof
    k.span(M.gravel, W.x0 + 0.4, y, W.z0 + 0.4, W.x1 - 0.4, y + 0.08, W.z1 - 0.8);
    k.span(M.cladding, W.x0, y, W.z1 - 0.8, W.x1, y + 1.2, W.z1 + 0.4);
    k.span(M.render, W.x0, y, W.z0, W.x1, y + 1.0, W.z0 + 0.35);
    k.span(M.stoneLight, -51, y, -19, -44, y + 3, -13);
    for (let x = -42; x < -38; x += 2.2) for (let z = -18; z < -8; z += 2.4) k.box(M.aluMid, x, y + 0.6, z, 1.6, 1.0, 1.0);
    k.finish();
    const g = floors[NL + 1];
    instanced(g, 'roof-tables', cafeTableGeo, M.siteObj, roofTables);
    instanced(g, 'roof-chairs', cafeChairGeo, M.siteObj, roofChairs);
    instanced(g, 'roof-fans', discGeo, M.alu, fans, { cast: false });
  }

  /* ================================================================ */
  /*  FURNITURE INSTANCES PER FLOOR                                   */
  /* ================================================================ */
  floors.forEach((g, n) => {
    const f = furn[n];
    instanced(g, `${g.name}-desks`, deskGeo, M.furniture, f.desks);
    instanced(g, `${g.name}-chairs`, chairGeo, M.furniture, f.chairs);
    instanced(g, `${g.name}-monitors`, monitorGeo, M.furniture, f.monitors);
    instanced(g, `${g.name}-screens`, screenGeo, M.screens, f.screens);
    instanced(g, `${g.name}-downlights`, discGeo, M.downlight, f.discs, { cast: false });
    instanced(g, `${g.name}-plants`, plantGeo, M.furniture, f.plants);
    instanced(g, `${g.name}-shelving`, shelfGeo, M.furniture, f.shelves);
    instanced(g, `${g.name}-goods`, goodsGeo, M.goods, f.goods, { colors: f.goodsCol });
    instanced(g, `${g.name}-counters`, counterGeo, M.furniture, f.counters);
    instanced(g, `${g.name}-tables`, tableGeo, M.furniture, f.tables);
    instanced(g, `${g.name}-cafe-tables`, cafeTableGeo, M.furniture, f.cafeT);
    instanced(g, `${g.name}-cafe-chairs`, cafeChairGeo, M.furniture, f.cafeC);
    instanced(g, `${g.name}-pendants`, pendantGeo, M.pendant, f.pendants, { cast: false });
  });

  /* ---------- sign boards: one merged geometry, atlas cells, abstract marks ---------- */
  if (signBoards.length) {
    const parts = [];
    for (const s of signBoards) {
      const g = T(new THREE.PlaneGeometry(s.w, s.h));
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, (s.cell + uv.getX(i)) / 4);
      parts.push({ g, m: mtx(s.x, s.y, s.z, 1, 1, 1, 0, s.ry) });
    }
    const sg = merge(parts, { colors: false });
    const sm = mesh(floors[0], 'L0-signs', sg, M.sign, { cast: false, receive: false });
    sm.renderOrder = 2;
  }

  /* ================================================================ */
  /*  SITE                                                            */
  /* ================================================================ */
  const sk = makeKit(site, 'site');
  /* Plan shapes use (x, z); flat() turns one into an upward-facing horizontal geometry at y = 0 with
     UVs in world metres / uvScale. */
  const poolShape = (x0, z0, x1, z1, r) => {
    const s = new THREE.Shape();
    s.moveTo(x0 + r, z0); s.lineTo(x1 - r, z0); s.absarc(x1 - r, z0 + r, r, -Math.PI / 2, 0, false);
    s.lineTo(x1, z1 - r); s.absarc(x1 - r, z1 - r, r, 0, Math.PI / 2, false);
    s.lineTo(x0 + r, z1); s.absarc(x0 + r, z1 - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(x0, z0 + r); s.absarc(x0 + r, z0 + r, r, Math.PI, Math.PI * 1.5, false);
    return s;
  };
  function flat(shape, uvScale = 1, segs = 12) {
    const g = new THREE.ShapeGeometry(shape, segs);
    g.rotateX(Math.PI / 2); // shape y becomes +z (this flips the faces downwards, fixed below)
    const idx = g.index.array;
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    const uv = g.attributes.uv, pos = g.attributes.position, nn = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) { uv.setXY(i, pos.getX(i) / uvScale, -pos.getZ(i) / uvScale); nn.setXYZ(i, 0, 1, 0); }
    return G(g);
  }
  // plaza paving: one surface with world-scaled UVs (texture tile = 9.6 m) and a hole for the pool
  {
    const X0 = -78, X1 = 78, Z0 = -36, Z1 = 44;
    const sh = new THREE.Shape();
    sh.moveTo(X0, Z0); sh.lineTo(X1, Z0); sh.lineTo(X1, Z1); sh.lineTo(X0, Z1); sh.closePath();
    sh.holes.push(new THREE.Path(poolShape(POOL.x0 - 0.7, POOL.z0 - 0.7, POOL.x1 + 0.7, POOL.z1 + 0.7, 2.6).getPoints(12).reverse()));
    const pm = mesh(site, 'plaza-paving', flat(sh, 9.6), M.paving, { cast: false });
    pm.position.y = 0.02;
    // dark granite bands: along the shop fronts and across the plaza
    sk.span(M.pavingDark, W.x0, 0.0, 0.6, C.x1 + 0.4, 0.035, 1.4);
    sk.span(M.pavingDark, C.x1 + 0.6, 0.0, -19.5, C.x1 + 1.4, 0.035, 1.4);
    for (let x = -60; x <= 60; x += 9.6) if (x < POOL.x0 - 1 || x > POOL.x1 + 1) sk.span(M.pavingDark, x - 0.15, 0.0, 2, x + 0.15, 0.033, 40);
  }
  // roads (north service street and the south boulevard) with kerbs and markings
  sk.span(M.asphalt, -140, 0, -52, 140, 0.03, -38);
  sk.span(M.asphalt, -140, 0, 46, 140, 0.03, 60);
  sk.span(M.asphalt, -98, 0, -52, -80, 0.03, 60);
  sk.span(M.asphalt, 80, 0, -52, 98, 0.03, 60);
  for (const z of [-38, 46]) sk.span(M.kerb, -80, 0, z - 0.1, 80, 0.16, z + 0.2);
  for (const z of [-52, 60]) sk.span(M.kerb, -140, 0, z - 0.2, 140, 0.16, z + 0.1);
  for (let x = -136; x < 140; x += 6) { sk.span(M.marking, x, 0.03, -45.1, x + 3, 0.045, -44.9); sk.span(M.marking, x, 0.03, 52.9, x + 3, 0.045, 53.1); }
  for (let x = -6; x <= 6; x += 1.2) sk.span(M.marking, x - 0.3, 0.03, 46.3, x + 0.3, 0.045, 59.6);
  // verge strips with lawn between the plaza and the roads
  sk.span(M.lawn, -80, 0, 40, -10, 0.12, 45.6);
  sk.span(M.lawn, 10, 0, 40, 80, 0.12, 45.6);
  sk.span(M.lawn, -80, 0, -37.6, 80, 0.12, -34);

  /* ---------- pool (raised, as in the render): dark tiled coping, mosaic basin, glassy water, jets ---------- */
  const WATER_Y = 0.36;
  {
    const { x0, z0, x1, z1 } = POOL;
    const ring = poolShape(x0 - 0.7, z0 - 0.7, x1 + 0.7, z1 + 0.7, 2.6);
    ring.holes.push(new THREE.Path(poolShape(x0, z0, x1, z1, 2.0).getPoints(12).reverse()));
    const cop = G(new THREE.ExtrudeGeometry(ring, { depth: 0.48, bevelEnabled: false, curveSegments: 12 }));
    cop.rotateX(Math.PI / 2); // shape y becomes +z, the extrusion runs downwards
    const cm = mesh(site, 'pool-coping', cop, M.poolEdge); cm.position.y = 0.48;
    const flm = mesh(site, 'pool-basin', flat(poolShape(x0, z0, x1, z1, 2.0), 0.6), M.poolTile, { cast: false });
    flm.position.y = 0.03;
    const pts = poolShape(x0, z0, x1, z1, 2.0).getPoints(12);
    const wpos = [], wuv = [];
    let acc = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 1e-4) continue;
      wpos.push(a.x, 0.48, a.y, b.x, 0.48, b.y, b.x, 0.03, b.y, a.x, 0.48, a.y, b.x, 0.03, b.y, a.x, 0.03, a.y);
      wuv.push(acc / 0.6, 0.75, (acc + len) / 0.6, 0.75, (acc + len) / 0.6, 0, acc / 0.6, 0.75, (acc + len) / 0.6, 0, acc / 0.6, 0);
      acc += len;
    }
    const wg = G(new THREE.BufferGeometry());
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3));
    wg.setAttribute('uv', new THREE.Float32BufferAttribute(wuv, 2));
    wg.computeVertexNormals();
    const poolWallMat = reg(M.poolTile.clone(), 'pool-tile-walls', 0.4);
    poolWallMat.side = THREE.DoubleSide;
    mesh(site, 'pool-walls', wg, poolWallMat, { cast: false });
    const wm = mesh(site, 'pool-water', flat(poolShape(x0, z0, x1, z1, 2.0), 9), M.water, { cast: false, receive: false });
    wm.position.y = WATER_Y;
  }
  const jetGeo = G(new THREE.CylinderGeometry(0.015, 0.05, 1, 6, 1, true)); jetGeo.translate(0, 0.5, 0);
  const jets = [];
  for (let x = POOL.x0 + 3; x <= POOL.x1 - 3; x += 2.4) jets.push({ x, z: POOL.z0 + 0.7, h: 1.3 }, { x, z: POOL.z1 - 0.7, h: 1.0 });
  const jetMesh = instanced(site, 'fountain-jets', jetGeo, M.jet, jets.map((j) => mtx(j.x, WATER_Y, j.z, 1, j.h, 1)), { cast: false, receive: false });
  // light bollards around the pool
  const bollardGeo = merge([cy(0.08, 0.08, 0.9, 8, 0, 0.45, 0, 0x2a2d31), cy(0.085, 0.085, 0.08, 8, 0, 0.8, 0, 0xf2eee6)]);

  /* ---------- planting, trees and palms ---------- */
  // raised beds (stone curbs, soil, shrubs) at the plaza edges
  const shrubMs = [];
  function bed(x0, z0, x1, z1) {
    const t = 0.3, h = 0.5;
    sk.span(M.stone, x0, 0, z0, x1, h, z0 + t); sk.span(M.stone, x0, 0, z1 - t, x1, h, z1);
    sk.span(M.stone, x0, 0, z0 + t, x0 + t, h, z1 - t); sk.span(M.stone, x1 - t, 0, z0 + t, x1, h, z1 - t);
    sk.span(M.soil, x0 + t, 0, z0 + t, x1 - t, h - 0.06, z1 - t);
    for (let x = x0 + 0.9; x < x1 - 0.6; x += rr(1.0, 1.5)) for (let z = z0 + 0.9; z < z1 - 0.6; z += rr(1.1, 1.6))
      shrubMs.push(mtx(x + rr(-0.2, 0.2), h + 0.2, z + rr(-0.2, 0.2), rr(0.55, 0.85), rr(0.45, 0.7), rr(0.55, 0.85), 0, rr(0, 6)));
  }
  bed(-58, 24, -34, 32); bed(40, 22, 62, 32); bed(52, -6, 64, 10); bed(-74, -8, -62, 20);
  // round stone bowl planters with shrubs (as in the render)
  const bowlProfile = [[0, 0], [0.9, 0], [1.25, 0.25], [1.4, 0.55], [1.38, 0.62], [1.2, 0.6], [0, 0.6]].map(([r, y]) => new THREE.Vector2(r, y));
  const bowlGeo = G(new THREE.LatheGeometry(bowlProfile, HIGH ? 24 : 14));
  const bowls = [[-28, 4.6], [-12, 4.6], [4, 4.6], [27, 4.4], [27, -7.5], [55, 15], [-40, 18]];
  instanced(site, 'planter-bowls', bowlGeo, M.stone, bowls.map(([x, z]) => mtx(x, 0, z)));
  for (const [x, z] of bowls) for (let i = 0; i < 3; i++) shrubMs.push(mtx(x + rr(-0.5, 0.5), 0.8, z + rr(-0.5, 0.5), rr(0.6, 0.85), rr(0.5, 0.7), rr(0.6, 0.85), 0, rr(0, 6)));
  const shrubGeo = (() => { const g = new THREE.IcosahedronGeometry(1, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.82 + 0.3 * hash(Math.round(p.getX(i) * 9), Math.round(p.getY(i) * 9), Math.round(p.getZ(i) * 9)); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } g.computeVertexNormals(); return G(g); })();

  // deciduous trees: trunk + branches (merged), crown of leaf cards (alpha)
  const branchParts = [cy(0.07, 0.13, 3.2, 7, 0, 1.6, 0, 0x5d5046)];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4, t = 0.5 + 0.12 * i;
    branchParts.push({ g: T(new THREE.CylinderGeometry(0.025, 0.06, 2.2, 5)), c: 0x5d5046, m: mtx(Math.cos(a) * 0.55, 2.6 + i * 0.35, Math.sin(a) * 0.55, 1, 1, 1, Math.sin(a) * t, 0, -Math.cos(a) * t) });
  }
  const treeWoodGeo = merge(branchParts);
  const cardGeo = G(new THREE.PlaneGeometry(1.5, 1.5));
  const trees = [[-30, 3.6], [-14, 3.6], [2, 3.6], [16.5, 3.6], [26.5, -3], [-46, 4], [44, 20], [58, 26], [-50, 28], [-70, 10], [63, 0]];
  const woodMs = [], cardMs = [];
  for (const [x, z] of trees) {
    const s = rr(0.9, 1.25), ry = rr(0, 6.28);
    woodMs.push(mtx(x, 0, z, s, s, s, 0, ry));
    const nCards = HIGH ? 34 : 18;
    for (let i = 0; i < nCards; i++) {
      const u = rnd() * Math.PI * 2, v = Math.acos(rr(-0.6, 1)), r = rr(0.6, 1.0);
      const cx = Math.cos(u) * Math.sin(v) * 1.9 * r, cyy = 4.4 + Math.cos(v) * 1.6 * r, cz = Math.sin(u) * Math.sin(v) * 1.9 * r;
      cardMs.push(mtx(x + cx * s, cyy * s, z + cz * s, s * rr(0.8, 1.2), s * rr(0.8, 1.2), 1, rr(-1, 1), rr(0, 6.28), rr(-0.6, 0.6)));
    }
  }
  // street trees along the boulevards and the far verges (simple rounded crowns, they read as a tree line)
  const stTrunk = [], stCrown = [], stCrownCol = [];
  const streetTree = (x, z) => {
    const s = rr(0.85, 1.25);
    stTrunk.push(mtx(x, 0, z, 0.9 * s, 1.0 * s, 0.9 * s));
    for (let i = 0; i < 3; i++) {
      stCrown.push(mtx(x + rr(-0.8, 0.8) * s, (4.4 + rr(-0.3, 0.9)) * s, z + rr(-0.8, 0.8) * s, rr(1.5, 2.1) * s, rr(1.2, 1.6) * s, rr(1.5, 2.1) * s, 0, rr(0, 6)));
      stCrownCol.push(new THREE.Color().setHSL(rr(0.18, 0.3), rr(0.15, 0.35), rr(0.62, 0.86)));
    }
  };
  for (let x = -136; x <= 136; x += rr(9, 13)) { streetTree(x, -36.2 + rr(-0.3, 0.3)); streetTree(x, -54 + rr(-0.3, 0.3)); streetTree(x, 62 + rr(-0.3, 0.3)); if (Math.abs(x) > 12) streetTree(x, 43.4); }
  for (let z = -30; z <= 40; z += rr(9, 13)) { streetTree(-78.5, z); streetTree(78.5, z); streetTree(-100, z); streetTree(100, z); }
  const stTrunkGeo = merge([cy(0.1, 0.16, 3.4, 6, 0, 1.7, 0, 0x5d5046)]);
  instanced(site, 'street-tree-trunks', stTrunkGeo, M.siteObj, stTrunk);
  instanced(site, 'street-tree-crowns', shrubGeo, M.shrub, stCrown, { colors: stCrownCol });
  instanced(site, 'tree-wood', treeWoodGeo, M.siteObj, woodMs);
  instanced(site, 'tree-leaves', cardGeo, M.leaves, cardMs);
  instanced(site, 'shrubs', shrubGeo, M.shrub, shrubMs);
  instanced(floors[NL + 1], 'roof-shrubs', shrubGeo, M.shrub, roofShrubMs);

  // palms: curved ringed trunk, crown of pinnate fronds with drooping leaflets, a few dry fronds
  function palmTrunkGeometry(h = 1, seg = HIGH ? 18 : 10, rad = HIGH ? 9 : 6) {
    const pos = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, y = t;
      const r = (0.26 - 0.1 * t) * (1 + 0.07 * Math.sin(t * 90));
      const bend = 0.035 * t * t; // gentle curve (in units of height, scaled with the trunk)
      for (let j = 0; j <= rad; j++) {
        const a = (j / rad) * Math.PI * 2;
        pos.push(Math.cos(a) * r + bend * 8, y * h, Math.sin(a) * r);
      }
    }
    for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) {
      const a = i * (rad + 1) + j, b = a + rad + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return G(g);
  }
  function frondGeometry(len = 3.8, n = HIGH ? 20 : 12) {
    const pos = [];
    const rib = (t) => [t * len, 0.55 * t * len * 0.5 - 0.9 * t * t * len * 0.5]; // rises then arches down
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const [x0, y0] = rib(t0), [x1, y1] = rib(t1);
      const w = 0.025 * (1 - t0) + 0.008;
      pos.push(x0, y0, -w, x1, y1, -w * 0.8, x1, y1, w * 0.8, x0, y0, -w, x1, y1, w * 0.8, x0, y0, w);
    }
    for (let i = 2; i < n; i++) {
      const t = i / n;
      const [x, y] = rib(t);
      const L = (0.2 + 0.85 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.7)) * (len / 3.8);
      for (const s of [-1, 1]) {
        // leaflet: forward-swept, drooping, thin; alternate leaflets rise a little (the V of a date palm)
        const up = (i % 2 ? 0.18 : -0.12);
        const ax = Math.cos(0.8) * L * 0.6, az = s * Math.sin(0.8) * L * 0.95, ay = -L * (0.5 - up);
        const bw = 0.035;
        pos.push(x, y, 0, x + ax, y + ay, az, x + bw, y + 0.01, 0);
        pos.push(x + bw, y + 0.01, 0, x + ax, y + ay, az, x + ax + 0.04, y + ay * 0.9, az * 0.92);
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    return G(g);
  }
  const palmTrunkGeo = palmTrunkGeometry();
  const frondGeo = frondGeometry();
  const bootGeo = G(new THREE.CylinderGeometry(0.42, 0.2, 0.9, 10, 1));
  const palms = [[54, 2], [62, 18], [-36, 6], [-22, 22], [-4, 25.5], [66, 34], [-64, 24], [74, 22], [58, -14], [-52, 20], [30.5, -24]];
  const trunks = [], fronds = [], dry = [], boots = [];
  const qL = new THREE.Quaternion(), qF = new THREE.Quaternion(), vTop = new THREE.Vector3();
  for (const [x, z] of palms) {
    const h = rr(8.5, 12.5), lean = rr(0.02, 0.1), la = rr(0, Math.PI * 2);
    qL.setFromEuler(_e.set(Math.cos(la) * lean, la, Math.sin(la) * lean, 'YXZ'));
    trunks.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), qL.clone(), new THREE.Vector3(1, h, 1)));
    vTop.set(0.035 * 8, h, 0).applyQuaternion(qL).add(new THREE.Vector3(x, 0, z));
    boots.push(new THREE.Matrix4().compose(vTop.clone().add(new THREE.Vector3(0, -0.35, 0)), qL.clone(), new THREE.Vector3(1, 1, 1)));
    const nf = HIGH ? 16 : 10, rot0 = rr(0, 6.28);
    for (let j = 0; j < nf; j++) {
      const up = j % 3 === 0 ? rr(0.35, 0.7) : j % 3 === 1 ? rr(0.0, 0.3) : rr(-0.4, -0.05);
      const s = rr(0.85, 1.2);
      qF.setFromEuler(_e.set(0, rot0 + (j / nf) * Math.PI * 2 + rr(-0.12, 0.12), up, 'YZX'));
      fronds.push(new THREE.Matrix4().compose(vTop.clone(), qF.clone(), new THREE.Vector3(s, s, s)));
    }
    for (let j = 0; j < 4; j++) {
      qF.setFromEuler(_e.set(0, rr(0, 6.28), rr(-1.2, -0.9), 'YZX'));
      dry.push(new THREE.Matrix4().compose(vTop.clone().add(new THREE.Vector3(0, -0.4, 0)), qF.clone(), new THREE.Vector3(0.7, 0.7, 0.7)));
    }
  }
  _e.set(0, 0, 0, 'XYZ');
  instanced(site, 'palm-trunks', palmTrunkGeo, M.palmTrunk, trunks);
  instanced(site, 'palm-boots', bootGeo, M.palmTrunk, boots);
  instanced(site, 'palm-fronds', frondGeo, M.frond, fronds);
  instanced(site, 'palm-fronds-dry', frondGeo, M.frondDry, dry);

  /* ---------- parasols, café seating, benches, lights ---------- */
  const parasolGeo = (() => {
    const canopy = new THREE.ConeGeometry(1.75, 0.5, 4, 1, true); canopy.rotateY(Math.PI / 4); canopy.translate(0, 2.55, 0);
    const val = new THREE.CylinderGeometry(1.24, 1.24, 0.22, 4, 1, true); val.rotateY(Math.PI / 4); val.translate(0, 2.2, 0);
    return merge([{ g: T(canopy), c: 0xf1ede4 }, { g: T(val), c: 0xe9e4da }]);
  })();
  const parasolPoleGeo = merge([cy(0.035, 0.035, 2.8, 6, 0, 1.4, 0, 0x8a8a88), cy(0.25, 0.25, 0.08, 10, 0, 0.04, 0, 0x55575a)]);
  const benchGeo = merge([bx(2.2, 0.38, 0.6, 0, 0.19, 0, 0xb9b2a6), bx(2.2, 0.06, 0.55, 0, 0.41, 0, 0x8b6646)]);
  const poleLampGeo = merge([cy(0.06, 0.08, 5.0, 8, 0, 2.5, 0, 0x2a2d31), bx(0.7, 0.12, 0.28, 0.25, 5.0, 0, 0x2a2d31)]);
  const lampLensGeo = G(new THREE.BoxGeometry(0.5, 0.03, 0.22));
  const parasols = [], cafeT = [], cafeC = [], benches = [], poles = [], lenses = [], bollards = [];
  const cafeSet = (x, z, umb = true) => {
    cafeT.push(mtx(x, 0.02, z));
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; cafeC.push(mtx(x + Math.cos(a) * 0.72, 0.02, z + Math.sin(a) * 0.72, 1, 1, 1, 0, -a - Math.PI / 2)); }
    if (umb) parasols.push(mtx(x, 0.02, z, 1, 1, 1, 0, rr(-0.1, 0.1)));
  };
  for (const x of [-52, -45, -24, -18, -6, 8, 13]) cafeSet(x + rr(-0.4, 0.4), 4.2 + rr(-0.3, 0.3));
  for (const x of [34, 39, 44]) cafeSet(x, -4.2);
  cafeSet(52, -3, true); cafeSet(24.6, -15, false); cafeSet(24.6, -11, false);
  for (const x of [-16, -4, 8, 20]) benches.push(mtx(x, 0.02, 20.2, 1, 1, 1, 0, 0));
  for (const x of [-10, 2, 14, 26]) benches.push(mtx(x, 0.02, 7.0, 1, 1, 1, 0, 0));
  for (const [x, z] of [[-66, 36], [-42, 36], [-18, 36], [6, 36], [30, 36], [54, 36], [70, 16], [70, -14], [-70, -12], [36, 10], [-30, 14], [-60, -30], [-20, -32], [20, -32], [60, -30]]) {
    poles.push(mtx(x, 0, z, 1, 1, 1, 0, rr(0, 6.28)));
  }
  const poleM = poles.map((m) => m.clone());
  for (const m of poleM) { const e = m.elements; const l = new THREE.Vector3(0.38, 4.93, 0).applyMatrix4(new THREE.Matrix4().extractRotation(m)); lenses.push(mtx(e[12] + l.x, l.y, e[14] + l.z, 1, 1, 1, 0, Math.atan2(-m.elements[2], m.elements[0]))); }
  for (let x = POOL.x0 + 2; x <= POOL.x1 - 2; x += 6.4) bollards.push(mtx(x, 0, POOL.z0 - 1.6), mtx(x, 0, POOL.z1 + 1.6));
  instanced(site, 'parasols', parasolGeo, M.fabric, parasols);
  instanced(site, 'parasol-poles', parasolPoleGeo, M.siteObj, parasols.map((m) => m.clone()));
  instanced(site, 'cafe-tables', cafeTableGeo, M.siteObj, cafeT);
  instanced(site, 'cafe-chairs', cafeChairGeo, M.siteObj, cafeC);
  instanced(site, 'benches', benchGeo, M.siteObj, benches);
  instanced(site, 'light-poles', poleLampGeo, M.siteObj, poles);
  instanced(site, 'light-lenses', lampLensGeo, M.lampHead, lenses, { cast: false });
  instanced(site, 'bollards', bollardGeo, M.siteObj, bollards);
  // bollard tops glow
  instanced(site, 'bollard-lights', discGeo, M.lampHead, bollards.map((m) => { const e = m.elements; return mtx(e[12], 0.85, e[14], 0.42, 1.5, 0.42); }), { cast: false });
  // uplights in the arcade floor at each column
  sk.finish();

  /* ---------- people (simple silhouettes, muted clothing) ---------- */
  {
    const prof = [[0, 0], [0.11, 0], [0.12, 0.08], [0.13, 0.5], [0.15, 0.85], [0.19, 1.15], [0.21, 1.36], [0.13, 1.45], [0.065, 1.5], [0.095, 1.56], [0.1, 1.66], [0.065, 1.74], [0, 1.76]].map(([r, y]) => new THREE.Vector2(r, y));
    const pg = G(new THREE.LatheGeometry(prof, HIGH ? 10 : 6));
    pg.scale(1, 1, 0.68);
    const spots = [];
    const groups = [[-22, 6.5, 3], [-2, 6, 2], [12, 22, 2], [30, 1, 3], [42, -1, 2], [-40, 8, 2], [6, 24.5, 1], [20, 5.5, 2], [36, 14, 2], [-10, 23, 2], [48, 10, 1], [-55, 6, 2]];
    for (const [gx, gz, n] of groups) for (let i = 0; i < n; i++) spots.push([gx + i * 0.65 + rr(-0.2, 0.2), gz + rr(-0.35, 0.35)]);
    for (const [x, z] of [[-24, 3.4], [-19, 5], [-7, 3.6], [33.5, -3.4], [38.6, -5], [43.4, -3.6]]) spots.push([x, z]);
    const colors = [0x22242a, 0x2f2a28, 0x3c4048, 0xd6cfc2, 0x1d2430, 0x5a4a3e, 0xe6e0d4, 0x2a2f2a];
    const pm = [], pc = [];
    for (const [x, z] of spots) {
      if (x > POOL.x0 - 1 && x < POOL.x1 + 1 && z > POOL.z0 - 1 && z < POOL.z1 + 1) continue;
      const s = rr(0.94, 1.08);
      pm.push(mtx(x, 0.02, z, s, s, s, 0, rr(0, 6.28)));
      pc.push(new THREE.Color(pick(colors)));
    }
    instanced(site, 'people', pg, M.people, pm, { colors: pc });
  }

  /* ---------- cars on the streets ---------- */
  {
    const prof = new THREE.Shape();
    prof.moveTo(-2.25, 0.3); prof.lineTo(2.2, 0.3); prof.quadraticCurveTo(2.35, 0.32, 2.32, 0.62); prof.lineTo(2.2, 0.82);
    prof.lineTo(1.0, 0.92); prof.lineTo(0.45, 1.38); prof.lineTo(-1.05, 1.42); prof.lineTo(-1.75, 0.98); prof.lineTo(-2.25, 0.92); prof.lineTo(-2.32, 0.6); prof.closePath();
    const body = T(new THREE.ExtrudeGeometry(prof, { depth: 1.76, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 2, curveSegments: 4 }));
    body.translate(0, 0, -0.88);
    const glassProf = new THREE.Shape();
    glassProf.moveTo(0.95, 0.95); glassProf.lineTo(0.42, 1.36); glassProf.lineTo(-1.02, 1.4); glassProf.lineTo(-1.66, 0.99); glassProf.closePath();
    const gl = T(new THREE.ExtrudeGeometry(glassProf, { depth: 1.62, bevelEnabled: false }));
    gl.translate(0, 0.005, -0.81);
    const wheel = (x, z) => ({ g: T(new THREE.CylinderGeometry(0.33, 0.33, 0.24, 12)), c: 0x1b1c1e, m: mtx(x, 0.33, z, 1, 1, 1, Math.PI / 2, 0, 0) });
    const carGeo = merge([{ g: body, c: 0xffffff }, { g: gl, c: 0x16191d, m: mtx(0, 0, 0, 1, 1, 1.02) }, wheel(1.45, 0.8), wheel(1.45, -0.8), wheel(-1.45, 0.8), wheel(-1.45, -0.8)]);
    const lightsGeo = merge([
      bx(0.06, 0.12, 0.34, 2.33, 0.68, 0.6, 0xfff6e8), bx(0.06, 0.12, 0.34, 2.33, 0.68, -0.6, 0xfff6e8),
      bx(0.06, 0.1, 0.36, -2.34, 0.8, 0.62, 0xff2a1a), bx(0.06, 0.1, 0.36, -2.34, 0.8, -0.62, 0xff2a1a),
    ]);
    const paints = [0xe9e9e6, 0x1c1f24, 0x8d949b, 0x2f3d52, 0xb8bcbf, 0x5a1f22, 0xf2f2ef, 0x3a3f44];
    const cm = [], cc = [];
    const car = (x, z, ry) => { cm.push(mtx(x, 0.03, z, 1, 1, 1, 0, ry)); cc.push(new THREE.Color(pick(paints))); };
    for (let x = -120; x < 120; x += rr(9, 22)) car(x, -48.5, 0);
    for (let x = -118; x < 120; x += rr(10, 24)) car(x, -41.5, Math.PI);
    for (let x = -120; x < 120; x += rr(9, 22)) car(x, 49.5, 0);
    for (let x = -116; x < 120; x += rr(10, 24)) car(x, 56.5, Math.PI);
    for (let z = -30; z < 40; z += rr(10, 20)) { car(-92.5, z, Math.PI / 2); car(85.5, z, -Math.PI / 2); }
    instanced(site, 'cars', carGeo, M.carBody, cm, { colors: cc });
    instanced(site, 'car-lights', lightsGeo, M.carLight, cm.map((m) => m.clone()), { cast: false });
  }

  /* ================================================================ */
  /*  NIGHT LAMPS (8 at most; intensity 0 until the engine ramps them) */
  /* ================================================================ */
  const lamps = [];
  function lamp(name, x, y, z, color, nightIntensity, distance) {
    const l = new THREE.PointLight(color, 0, distance, 2); l.name = name; l.position.set(x, y, z);
    l.castShadow = false; l.userData.nightIntensity = nightIntensity; site.add(l); lamps.push(l);
  }
  lamp('lamp-arcade-c', 10, 4.2, -0.8, 0xffc890, 60, 16);
  lamp('lamp-arcade-f', -16, 4.2, -0.8, 0xffc890, 60, 16);
  lamp('lamp-arcade-w', -47, 4.2, -0.8, 0xffc890, 50, 16);
  lamp('lamp-lobby', C.x1 + 0.4, 4.2, -10, 0xffc890, 55, 16);
  lamp('lamp-pavilion', 40, 3.6, -5.6, 0xffc27a, 70, 18);
  lamp('lamp-pool', 5, 1.2, 13.5, 0x7fd0ff, 60, 30);
  lamp('lamp-plaza-e', 46, 5.5, 14, 0xffd6a0, 45, 22);
  lamp('lamp-plaza-w', -36, 5.5, 14, 0xffd6a0, 45, 22);

  /* ================================================================ */
  /*  ANIMATION + DISPOSE                                             */
  /* ================================================================ */
  function update(dt, t) {
    ripple.offset.set((t * 0.01) % 1, (t * 0.017) % 1);
    if (jetMesh) {
      for (let i = 0; i < jets.length; i++) {
        const j = jets[i], k = 1 + 0.14 * Math.sin(t * 2.4 + i * 0.9);
        _p.set(j.x, WATER_Y, j.z); _q.identity(); _s.set(1, j.h * k, 1);
        jetMesh.setMatrixAt(i, _m.compose(_p, _q, _s));
      }
      jetMesh.instanceMatrix.needsUpdate = true;
    }
  }

  for (const g of temps) g.dispose();
  temps.length = 0;

  function dispose() {
    for (const m of instancedMeshes) m.dispose();
    for (const g of geometries) g.dispose();
    for (const t of textures) t.dispose();
    for (const m of materials) m.dispose();
    instancedMeshes.length = 0; geometries.clear(); textures.clear(); materials.clear();
    root.removeFromParent();
  }

  return { root, floors, site, nightMaterials, lamps, update, dispose };
}
