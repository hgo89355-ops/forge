/**
 * MOBCO 3D Project Studio — model "residential-tower"
 * -----------------------------------------------------------------------------
 * ILLUSTRATIVE massing model inspired by the Victoria 101 render (Port Whitby).
 * It is NOT a replica: proportions, level counts and site layout are an
 * interpretation for presentation purposes only — no specs are implied.
 *
 * Composition (world units = metres, +Z = front / parking court, +X = east):
 *   - "tower": glass residential tower, wraparound glass balconies, white crown
 *   - "wing" : long mid-rise wing, projecting balconies, rooftop pool + green roof
 *   - "west" : low glass block with a planted roof terrace
 *   - site   : paving, parking court with island + lamps + cars, garage ramp,
 *              roads, hedges and a ring of mature trees
 *
 * Module contract: ES module, imports nothing, THREE is injected into build().
 */

/* ========================================================================== */
/* Meta                                                                       */
/* ========================================================================== */

export const meta = {
  id: 'residential-tower',
  name: { en: 'Victoria 101 — Residential', ar: 'فيكتوريا 101 — سكني' },
  projectSlug: 'victoria-101',
  tagline: {
    en: 'A glass residential tower and a mid-rise wing, set among mature trees.',
    ar: 'برج سكني زجاجي وجناح متوسط الارتفاع تحيط بهما الأشجار.',
  },
  descriptors: [
    { label: { en: 'Typology', ar: 'النوع' }, value: { en: 'Multi-residential', ar: 'سكني متعدد الوحدات' } },
    { label: { en: 'Massing', ar: 'الكتلة' }, value: { en: 'Tower + mid-rise wing', ar: 'برج + جناح متوسط الارتفاع' } },
    { label: { en: 'Facade', ar: 'الواجهة' }, value: { en: 'Glass with wraparound balconies', ar: 'زجاج مع شرفات محيطية' } },
    { label: { en: 'Amenity', ar: 'المرافق' }, value: { en: 'Rooftop pool & green roof', ar: 'مسبح على السطح وسطح أخضر' } },
  ],
  camera: {
    target: [2, 13, -10],
    aerial: [-62, 58, 92],
    street: [-30, 1.7, 22],
    top: [2, 240, -9],
    front: [2, 30, 128],
  },
  hotspots: [
    {
      id: 'tower-balconies', position: [-18, 30, -6],
      title: { en: 'Wraparound balconies', ar: 'شرفات محيطية' },
      text: {
        en: 'Continuous slab edges and glass balustrades wrap the tower, giving every level an outdoor edge.',
        ar: 'حواف بلاطات متصلة ودرابزين زجاجي يلتف حول البرج، ليمنح كل طابق مساحة خارجية.',
      },
    },
    {
      id: 'tower-crown', position: [-18, 47.8, -19],
      title: { en: 'Crown', ar: 'التاج' },
      text: {
        en: 'A light white frame finishes the tower top and glows softly after dark.',
        ar: 'إطار أبيض خفيف يتوّج قمة البرج ويضيء بهدوء بعد الغروب.',
      },
    },
    {
      id: 'rooftop-pool', position: [15, 23.2, -8.5],
      title: { en: 'Rooftop pool', ar: 'مسبح على السطح' },
      text: {
        en: 'A long pool and timber deck occupy the roof of the mid-rise wing.',
        ar: 'مسبح طويل وسطح خشبي يعلوان سقف الجناح متوسط الارتفاع.',
      },
    },
    {
      id: 'green-roof', position: [45, 23.2, -14],
      title: { en: 'Green roof terrace', ar: 'تراس السطح الأخضر' },
      text: {
        en: 'Planted roof areas and a small pavilion soften the skyline of the wing.',
        ar: 'مساحات مزروعة وجناح صغير على السطح يلطّفان خط أفق المبنى.',
      },
    },
    {
      id: 'arrival-court', position: [-16, 5.2, 4],
      title: { en: 'Arrival canopy & court', ar: 'مظلة المدخل والساحة' },
      text: {
        en: 'A cantilevered canopy marks the entrance from a landscaped parking court.',
        ar: 'مظلة بارزة تحدد المدخل من ساحة مواقف منسّقة بالمساحات الخضراء.',
      },
    },
  ],
  // azimuth: degrees around +Y measured from +Z (front) toward +X (three.js Spherical theta);
  // elevation: degrees above the horizon.
  sun: { azimuth: 32, elevation: 42 },
};

/* ========================================================================== */
/* Layout parameters                                                          */
/* ========================================================================== */

const GROUND_H = 5.6;   // double-height ground level (lobby / amenity)
const LEVEL_H = 3.2;    // typical residential level
const SLAB_T = 0.32;    // floor slab thickness (reads as the white horizontal band)
const levelBase = (n) => (n === 0 ? 0 : GROUND_H + (n - 1) * LEVEL_H);
const levelHeight = (n) => (n === 0 ? GROUND_H : LEVEL_H);

// Building footprints = glass line (balconies / lips project beyond it).
const TOWER = { id: 'tower', x0: -30, x1: -6, z0: -30, z1: -8, levels: 12, name: { en: 'Tower', ar: 'البرج' } };
const WING = { id: 'wing', x0: -6, x1: 50, z0: -24, z1: -4, levels: 6, name: { en: 'Wing', ar: 'الجناح' } };
const WEST = { id: 'west', x0: -48, x1: -30, z0: -24, z1: -2, levels: 5, name: { en: 'West block', ar: 'المبنى الغربي' } };
const PODIUM_FRONT = -4; // the tower's ground level steps forward to meet the wing frontage

// Texture atlas for the night window glow: COLS bays x ROWS levels, one cell = BAY metres x one level.
const GLOW_COLS = 32, GLOW_ROWS = 16, GLOW_BAY = 3.0;

/* ========================================================================== */
/* Small utilities                                                            */
/* ========================================================================== */

/** Deterministic PRNG (mulberry32) so every build looks identical. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const levelLabel = (b, n, roof) => roof
  ? { en: `${b.name.en} · Roof`, ar: `${b.name.ar} · السطح` }
  : n === 0
    ? { en: `${b.name.en} · Ground level`, ar: `${b.name.ar} · الطابق الأرضي` }
    : { en: `${b.name.en} · Level ${n}`, ar: `${b.name.ar} · الطابق ${n}` };

/* ========================================================================== */
/* Build                                                                      */
/* ========================================================================== */

export function build(THREE, ctx = {}) {
  const HIGH = ctx.quality !== 'low';
  const envMap = ctx.envMap || null;
  const rand = rng(101);

  // ---- resource tracking (everything created here is disposed in dispose()) ----
  const owned = { geo: new Set(), mat: new Set(), tex: new Set() };
  const G = (g) => (owned.geo.add(g), g);
  const M = (m) => (owned.mat.add(m), m);
  const T = (t) => (owned.tex.add(t), t);

  const root = new THREE.Group();
  root.name = 'residential-tower';
  const site = new THREE.Group();
  site.name = 'site';
  root.add(site);

  const floors = [];
  const nightMaterials = [];
  const lamps = [];

  /* ------------------------------------------------------------------------ */
  /* Procedural textures                                                       */
  /* ------------------------------------------------------------------------ */

  /** Window-glow atlas: warm lit rooms / dark rooms; cell (0,0) is reserved dark. */
  function makeGlowTexture() {
    const cw = 32, ch = 32;
    const c = document.createElement('canvas');
    c.width = GLOW_COLS * cw; c.height = GLOW_ROWS * ch;
    const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
    const r = rng(7);
    for (let row = 0; row < GLOW_ROWS; row++) {
      for (let col = 0; col < GLOW_COLS; col++) {
        if (row === 0 && col === 0) continue;
        if (r() > 0.5) continue; // dark room
        const k = 0.5 + r() * 0.5;
        const warm = r() < 0.85;
        const rgb = (m) => `rgb(${Math.round(255 * k * m)},${Math.round((warm ? 192 : 230) * k * m)},${Math.round((warm ? 124 : 220) * k * m)})`;
        // canvas y=0 is the top of the texture (flipY): row index counts from the bottom
        const x0 = col * cw + 1, y0 = (GLOW_ROWS - 1 - row) * ch + 3, w = cw - 2, h = ch - 6;
        // ceiling-lit gradient: brighter near the top of the room
        const grd = g.createLinearGradient(0, y0, 0, y0 + h);
        grd.addColorStop(0, rgb(1)); grd.addColorStop(1, rgb(0.55));
        g.fillStyle = grd;
        const blind = r() < 0.3 ? Math.floor(h * (0.2 + r() * 0.4)) : 0; // lowered blind
        if (blind) { g.fillStyle = rgb(0.35); g.fillRect(x0, y0, w, blind); g.fillStyle = grd; }
        g.fillRect(x0, y0 + blind, w, h - blind);
      }
    }
    const t = T(new THREE.CanvasTexture(c));
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = 4;
    t.name = 'tx-window-glow';
    return t;
  }

  /** Tileable ripple normal map for the pool (sum of integer-frequency sines). */
  function makeRippleNormal() {
    const N = 128;
    const c = document.createElement('canvas'); c.width = N; c.height = N;
    const g = c.getContext('2d');
    const img = g.createImageData(N, N);
    const h = (x, y) => {
      const u = (x / N) * Math.PI * 2, v = (y / N) * Math.PI * 2;
      return Math.sin(u * 3 + v * 2) * 0.5 + Math.sin(u * 5 - v * 4 + 1.3) * 0.3 + Math.sin(v * 7 + u + 0.7) * 0.2;
    };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = h(x + 1, y) - h(x - 1, y), dy = h(x, y + 1) - h(x, y - 1);
      const nx = -dx * 1.6, ny = -dy * 1.6, nz = 1, l = Math.hypot(nx, ny, nz);
      const i = (y * N + x) * 4;
      img.data[i] = (nx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (ny / l * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = T(new THREE.CanvasTexture(c));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 1);
    t.name = 'tx-pool-ripple';
    return t;
  }

  const glowTex = makeGlowTexture();
  const rippleTex = makeRippleNormal();

  /* ------------------------------------------------------------------------ */
  /* Materials (white / stone / glass palette, MOBCO teal as a small accent)    */
  /* ------------------------------------------------------------------------ */

  // Opaque materials rely on scene.environment (so the engine can dim IBL at night with
  // scene.environmentIntensity). Only the reflective glass / water take ctx.envMap explicitly;
  // their base envMapIntensity is stored in userData.baseEnvMapIntensity for night dimming.
  const std = (name, p) => M(new THREE.MeshStandardMaterial({ name, ...p }));
  const phys = (name, p) => M(new THREE.MeshPhysicalMaterial({ name, ...p }));
  const reflective = (m) => {
    if (envMap) m.envMap = envMap;
    m.userData.baseEnvMapIntensity = m.envMapIntensity;
    return m;
  };

  const mat = {
    white: std('mt-white-precast', { color: 0xf2f1ec, roughness: 0.5 }),
    whiteMatte: std('mt-white-render', { color: 0xe9e7e1, roughness: 0.8 }),
    aluLight: std('mt-mullion-alu', { color: 0xd3d8db, roughness: 0.3, metalness: 0.6 }),
    aluDark: std('mt-mullion-dark', { color: 0x40494f, roughness: 0.38, metalness: 0.55 }),
    spandrel: std('mt-spandrel-panel', { color: 0x56626b, roughness: 0.32, metalness: 0.35 }),
    interior: std('mt-interior', {
      color: 0x47586a, roughness: 0.38, metalness: 0.1,
      emissive: 0xffffff, emissiveMap: glowTex, emissiveIntensity: 0,
    }),
    lobby: std('mt-interior-lobby', { color: 0x6c7880, roughness: 0.55, emissive: 0xffe2b8, emissiveIntensity: 0 }),
    glass: reflective(phys('mt-glass-curtain', {
      color: 0x8fb2c6, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.46,
      envMapIntensity: 1.2, depthWrite: false, side: THREE.DoubleSide,
    })),
    railGlass: reflective(phys('mt-glass-balustrade', {
      color: 0xc6dde6, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.35,
      envMapIntensity: 1.2, depthWrite: false, side: THREE.DoubleSide,
    })),
    roof: std('mt-roof-membrane', { color: 0xc8c6c0, roughness: 0.92 }),
    paving: std('mt-paving-stone', { color: 0xd7d1c5, roughness: 0.88 }),
    curb: std('mt-curb-precast', { color: 0xe6e2da, roughness: 0.8 }),
    asphalt: std('mt-asphalt', { color: 0x565b60, roughness: 0.95 }),
    marking: std('mt-line-marking', { color: 0xf3f3ef, roughness: 0.7 }),
    lawn: std('mt-lawn', { color: 0x7d9466, roughness: 1 }),
    greenRoof: std('mt-green-roof', { color: 0x7c9d5c, roughness: 1 }),
    shrub: std('mt-shrub', { color: 0x4f6e40, roughness: 0.95 }),
    leafA: std('mt-tree-canopy-a', { color: 0x4d6e3e, roughness: 0.92 }),
    leafB: std('mt-tree-canopy-b', { color: 0x3d5b34, roughness: 0.92 }),
    leafC: std('mt-tree-canopy-c', { color: 0x63804a, roughness: 0.92 }),
    trunk: std('mt-tree-trunk', { color: 0x6a5947, roughness: 0.9 }),
    wood: std('mt-timber-deck', { color: 0xa5835f, roughness: 0.7 }),
    poolTile: std('mt-pool-coping', { color: 0xf4f3ef, roughness: 0.45 }),
    water: reflective(phys('mt-pool-water', {
      color: 0x3aa9c2, roughness: 0.06, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.05,
      normalMap: rippleTex, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.2,
      emissive: 0x3fd4e2, emissiveIntensity: 0,
    })),
    teal: std('mt-accent-teal', { color: 0x6fd1c5, roughness: 0.35, emissive: 0x6fd1c5, emissiveIntensity: 0 }),
    lampHead: std('mt-lamp-head', { color: 0xf1eee8, roughness: 0.4, emissive: 0xffdcaa, emissiveIntensity: 0 }),
    lightStrip: std('mt-light-strip', { color: 0xf6f4ee, roughness: 0.4, emissive: 0xfff0d6, emissiveIntensity: 0 }),
    metalDark: std('mt-metal-dark', { color: 0x30363b, roughness: 0.5, metalness: 0.6 }),
    carWhite: std('mt-car-white', { color: 0xe9e9e7, roughness: 0.3, metalness: 0.3 }),
    carSilver: std('mt-car-silver', { color: 0xa4a9ad, roughness: 0.3, metalness: 0.5 }),
    carDark: std('mt-car-graphite', { color: 0x2d3338, roughness: 0.3, metalness: 0.4 }),
    carBlue: std('mt-car-blue', { color: 0x3c566b, roughness: 0.3, metalness: 0.4 }),
    carGlass: std('mt-car-glass', { color: 0x34414b, roughness: 0.15, metalness: 0.4 }),
  };
  // Night glow strength: the engine ramps emissiveIntensity 0→1, so the brightness lives in the
  // (HDR, >1) emissive colour. Interior glow is seen through ~45% glass, hence the boost.
  mat.interior.emissive.setScalar(2.4);
  mat.lobby.emissive.multiplyScalar(1.8);
  mat.lampHead.emissive.multiplyScalar(3.0);
  mat.lightStrip.emissive.multiplyScalar(3.0);
  mat.teal.emissive.multiplyScalar(1.6);
  mat.water.emissive.multiplyScalar(0.9);
  nightMaterials.push(mat.interior, mat.lobby, mat.water, mat.teal, mat.lampHead, mat.lightStrip);

  /* ------------------------------------------------------------------------ */
  /* Geometry helpers                                                          */
  /* ------------------------------------------------------------------------ */

  const geoCache = new Map();
  /** Shared box geometry keyed by size. */
  const boxGeo = (w, h, d) => {
    const k = `b${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`;
    if (!geoCache.has(k)) geoCache.set(k, G(new THREE.BoxGeometry(w, h, d)));
    return geoCache.get(k);
  };
  const UNIT = boxGeo(1, 1, 1); // scaled per instance

  function shadowFlags(o, cast = true, receive = true) { o.castShadow = cast; o.receiveShadow = receive; return o; }

  /** Box mesh placed by its bottom-centre (y = bottom). */
  function addBox(parent, name, material, w, h, d, x, y, z, cast = true, receive = true) {
    const m = new THREE.Mesh(boxGeo(w, h, d), material);
    m.name = name; m.position.set(x, y + h / 2, z);
    parent.add(shadowFlags(m, cast, receive));
    return m;
  }
  /** Box mesh from min/max extents. */
  function addSpan(parent, name, material, x0, x1, y0, y1, z0, z1, cast = true, receive = true) {
    return addBox(parent, name, material, x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, y0, (z0 + z1) / 2, cast, receive);
  }

  /**
   * InstancedMesh from a list of transforms [x, y, z, rotY, sx, sy, sz] (y = centre).
   * Returns null for an empty list.
   */
  const _o = new THREE.Object3D();
  function addInstances(parent, name, geo, material, xf, cast = true, receive = true) {
    if (!xf.length) return null;
    const m = new THREE.InstancedMesh(geo, material, xf.length);
    xf.forEach((t, i) => {
      _o.position.set(t[0], t[1], t[2]);
      _o.rotation.set(0, t[3] || 0, 0);
      _o.scale.set(t[4] ?? 1, t[5] ?? 1, t[6] ?? 1);
      _o.updateMatrix();
      m.setMatrixAt(i, _o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingBox(); m.computeBoundingSphere();
    m.name = name;
    parent.add(shadowFlags(m, cast, receive));
    return m;
  }

  /** Open-ended glass "tube": the 4 vertical faces of a box (no top/bottom → no coplanar caps). */
  function tubeGeo(w, h, d) {
    const k = `t${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`;
    if (geoCache.has(k)) return geoCache.get(k);
    const x = w / 2, y = h / 2, z = d / 2;
    const quads = [ // each: 4 corners CCW seen from outside, normal
      [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z], [0, 0, 1]],
      [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z], [0, 0, -1]],
      [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z], [1, 0, 0]],
      [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z], [-1, 0, 0]],
    ];
    const pos = [], nor = [], uv = [], idx = [];
    quads.forEach((q, i) => {
      for (let j = 0; j < 4; j++) { pos.push(...q[j]); nor.push(...q[4]); }
      uv.push(0, 0, 1, 0, 1, 1, 0, 1);
      const b = i * 4; idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    });
    const g = G(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    geoCache.set(k, g);
    return g;
  }

  /**
   * Interior "room" box whose side-face UVs index the window-glow atlas in metres:
   * one atlas cell = one GLOW_BAY-wide bay of one level. Top/bottom map to the dark cell.
   */
  function glowBoxGeo(w, h, d, row) {
    const g = G(new THREE.BoxGeometry(w, h, d));
    const uv = g.attributes.uv;
    const u0 = Math.floor(rand() * GLOW_COLS) / GLOW_COLS;
    for (let i = 0; i < uv.count; i++) {
      const f = Math.floor(i / 4);
      if (f === 2 || f === 3) { uv.setXY(i, 0.5 / GLOW_COLS, 0.5 / GLOW_ROWS); continue; }
      const fw = f === 4 || f === 5 ? w : d; // BoxGeometry face order: px, nx, py, ny, pz, nz
      const u = uv.getX(i) * fw / (GLOW_BAY * GLOW_COLS) + u0 + f * 0.27;
      const v = (row + uv.getY(i)) / GLOW_ROWS;
      uv.setXY(i, u, v);
    }
    return g;
  }

  /** Merge simple non-indexed geometries (position + normal only). */
  function mergeSimple(parts) {
    let n = 0; parts.forEach((p) => { n += p.pos.length; });
    const pos = new Float32Array(n), nor = new Float32Array(n);
    let o = 0;
    parts.forEach((p) => { pos.set(p.pos, o); nor.set(p.nor, o); o += p.pos.length; });
    const g = G(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.computeBoundingSphere();
    return g;
  }
  /** Extract (and transform) a temporary three geometry into merge parts; disposes the source. */
  function toPart(geo, tx = 0, ty = 0, tz = 0) {
    const ni = geo.index ? geo.toNonIndexed() : geo;
    ni.translate(tx, ty, tz);
    const part = { pos: ni.attributes.position.array.slice(), nor: ni.attributes.normal.array.slice() };
    if (ni !== geo) ni.dispose();
    geo.dispose();
    return part;
  }

  /* ------------------------------------------------------------------------ */
  /* Facade helpers                                                            */
  /* ------------------------------------------------------------------------ */

  const SIDES = ['n', 's', 'e', 'w'];

  /**
   * Positions along each requested side of a rectangle at a regular step.
   * Returns [x, z, rotY] with rotY = 0 for N/S sides (element runs along X) and PI/2 for E/W.
   * `out` pushes the point outward from the rectangle edge by that distance.
   */
  function alongSides(r, sides, step, out, { corners = true, inset = 0 } = {}) {
    const pts = [];
    for (const s of sides) {
      const alongX = s === 'n' || s === 's';
      const a0 = (alongX ? r.x0 : r.z0) + inset, a1 = (alongX ? r.x1 : r.z1) - inset;
      const len = a1 - a0;
      const nSeg = Math.max(1, Math.round(len / step));
      for (let i = corners ? 0 : 1; i <= (corners ? nSeg : nSeg - 1); i++) {
        const a = a0 + (len * i) / nSeg;
        if (s === 'n') pts.push([a, r.z0 - out, 0]);
        if (s === 's') pts.push([a, r.z1 + out, 0]);
        if (s === 'e') pts.push([r.x1 + out, a, Math.PI / 2]);
        if (s === 'w') pts.push([r.x0 - out, a, Math.PI / 2]);
      }
    }
    return pts;
  }

  /**
   * Balustrade panels for a slab that projects `ext[side]` beyond the glass rectangle `r`.
   * Panels run along every balcony edge and return to the glass line where a neighbouring
   * side has no balcony. Returns [cx, cz, length, rotY] list.
   */
  function railPanels(r, ext) {
    const P = [];
    const ox0 = r.x0 - ext.w, ox1 = r.x1 + ext.e, oz0 = r.z0 - ext.n, oz1 = r.z1 + ext.s;
    const e = 0.06; // inset from the slab edge
    if (ext.s > 0) P.push([(ox0 + ox1) / 2, oz1 - e, ox1 - ox0 - 2 * e, 0]);
    if (ext.n > 0) P.push([(ox0 + ox1) / 2, oz0 + e, ox1 - ox0 - 2 * e, 0]);
    if (ext.e > 0) P.push([ox1 - e, (oz0 + oz1) / 2, oz1 - oz0 - 2 * e, Math.PI / 2]);
    if (ext.w > 0) P.push([ox0 + e, (oz0 + oz1) / 2, oz1 - oz0 - 2 * e, Math.PI / 2]);
    // returns (close a balcony run where the adjacent side has none)
    const ret = (cond, x, z, len, rot) => { if (cond && len > 0.2) P.push([x, z, len, rot]); };
    ret(ext.s > 0 && ext.e === 0, r.x1 - e, r.z1 + ext.s / 2, ext.s, Math.PI / 2);
    ret(ext.s > 0 && ext.w === 0, r.x0 + e, r.z1 + ext.s / 2, ext.s, Math.PI / 2);
    ret(ext.n > 0 && ext.e === 0, r.x1 - e, r.z0 - ext.n / 2, ext.n, Math.PI / 2);
    ret(ext.n > 0 && ext.w === 0, r.x0 + e, r.z0 - ext.n / 2, ext.n, Math.PI / 2);
    ret(ext.e > 0 && ext.s === 0, r.x1 + ext.e / 2, r.z1 - e, ext.e, 0);
    ret(ext.e > 0 && ext.n === 0, r.x1 + ext.e / 2, r.z0 + e, ext.e, 0);
    ret(ext.w > 0 && ext.s === 0, r.x0 - ext.w / 2, r.z1 - e, ext.w, 0);
    ret(ext.w > 0 && ext.n === 0, r.x0 - ext.w / 2, r.z0 + e, ext.w, 0);
    return P;
  }

  /** Glass balustrade + slim white handrail cap from railPanels() output. */
  function addRails(parent, name, panels, yBase, h = 1.05) {
    const glassXf = panels.map(([x, z, len, rot]) => [x, yBase + h / 2, z, rot, len, h, 0.03]);
    const capXf = panels.map(([x, z, len, rot]) => [x, yBase + h + 0.03, z, rot, len + 0.06, 0.06, 0.08]);
    addInstances(parent, `${name}-balustrade`, UNIT, mat.railGlass, glassXf, false, false);
    addInstances(parent, `${name}-handrail`, UNIT, mat.white, capXf, true, false);
  }

  /**
   * One glazed building level.
   * o = { rect, ext:{n,s,e,w} balcony depth per side, shared:[sides abutting a neighbour],
   *       lip (slab lip on free sides w/o balcony), mullionStep, mullionMat, finStep,
   *       interiorMat, row, rails:true }
   */
  function glazedLevel(g, b, n, o) {
    const r = o.rect || b;
    const y = levelBase(n), h = levelHeight(n);
    const shared = o.shared || [];
    const lip = o.lip ?? 0.2;
    const ext = {};
    for (const s of SIDES) ext[s] = shared.includes(s) ? 0 : Math.max(o.ext?.[s] || 0, 0);
    const slabExt = {};
    for (const s of SIDES) slabExt[s] = shared.includes(s) ? 0 : Math.max(ext[s], lip);
    const tag = `${b.id}-L${n}`;

    // floor slab (projects as balcony / white band)
    addSpan(g, `${tag}-slab`, mat.white, r.x0 - slabExt.w, r.x1 + slabExt.e, y, y + SLAB_T, r.z0 - slabExt.n, r.z1 + slabExt.s);

    // interior volume (carries the window glow) — inset behind the glass
    const inset = 0.3, ih = h - SLAB_T;
    const iw = r.x1 - r.x0 - 2 * inset, id = r.z1 - r.z0 - 2 * inset;
    const interior = new THREE.Mesh(o.interiorMat === mat.lobby ? boxGeo(iw, ih, id) : glowBoxGeo(iw, ih, id, o.row ?? n), o.interiorMat || mat.interior);
    interior.name = `${tag}-interior`;
    interior.position.set((r.x0 + r.x1) / 2, y + SLAB_T + ih / 2, (r.z0 + r.z1) / 2);
    g.add(shadowFlags(interior, true, true));

    // curtain wall glass
    const glass = new THREE.Mesh(tubeGeo(r.x1 - r.x0, ih, r.z1 - r.z0), mat.glass);
    glass.name = `${tag}-curtain-wall`;
    glass.position.copy(interior.position);
    g.add(shadowFlags(glass, false, false));

    // mullions (vertical, just outside the glass)
    if (o.mullionStep) {
      const free = SIDES.filter((s) => !shared.includes(s));
      const md = 0.14, mw = o.mullionW ?? 0.08;
      const pts = alongSides(r, free, o.mullionStep, md / 2);
      addInstances(g, `${tag}-mullions`, UNIT, o.mullionMat || mat.aluLight,
        pts.map(([x, z, rot]) => [x, y + SLAB_T + ih / 2, z, rot, mw, ih, md]), true, false);
    }

    // balcony fins: white blades perpendicular to the facade between balconies
    if (o.finStep) {
      const xf = [];
      for (const s of SIDES) {
        if (!ext[s]) continue;
        alongSides(r, [s], o.finStep, ext[s] / 2, { corners: false }).forEach(([x, z, rot]) => {
          xf.push([x, y + SLAB_T + ih / 2, z, rot + Math.PI / 2, ext[s] - 0.1, ih, 0.16]);
        });
      }
      addInstances(g, `${tag}-fins`, UNIT, mat.white, xf);
    }

    // balustrades
    if (o.rails !== false && SIDES.some((s) => ext[s] > 0)) addRails(g, tag, railPanels(r, ext), y + SLAB_T);

    return { y, h, ext, slabExt };
  }

  /** White fascia band at the top of a ground level on the given sides. */
  function fascia(g, b, r, sides, depth = 0.45, hgt = 0.95) {
    const y1 = GROUND_H, y0 = y1 - hgt, out = 0.4;
    for (const s of sides) {
      if (s === 's') addSpan(g, `${b.id}-fascia-s`, mat.white, r.x0 - (sides.includes('w') ? out : 0), r.x1 + (sides.includes('e') ? out : 0), y0, y1, r.z1 + out - depth, r.z1 + out);
      if (s === 'n') addSpan(g, `${b.id}-fascia-n`, mat.white, r.x0 - (sides.includes('w') ? out : 0), r.x1 + (sides.includes('e') ? out : 0), y0, y1, r.z0 - out, r.z0 - out + depth);
      if (s === 'e') addSpan(g, `${b.id}-fascia-e`, mat.white, r.x1 + out - depth, r.x1 + out, y0, y1, r.z0 - out + depth, r.z1 + out - depth);
      if (s === 'w') addSpan(g, `${b.id}-fascia-w`, mat.white, r.x0 - out, r.x0 - out + depth, y0, y1, r.z0 - out + depth, r.z1 + out - depth);
    }
  }

  /** Roof parapet: glass balustrade on a white upstand, around the given rectangle. */
  function roofEdge(g, name, r, y) {
    const t = 0.25;
    const sides = [
      [r.x0, r.x1, r.z1 - t, r.z1], [r.x0, r.x1, r.z0, r.z0 + t],
      [r.x1 - t, r.x1, r.z0 + t, r.z1 - t], [r.x0, r.x0 + t, r.z0 + t, r.z1 - t],
    ];
    sides.forEach(([a, b2, c, d], i) => addSpan(g, `${name}-upstand-${i}`, mat.white, a, b2, y, y + 0.35, c, d));
    const inner = { x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1 };
    const P = railPanels({ x0: inner.x0 + 0.13, x1: inner.x1 - 0.13, z0: inner.z0 + 0.13, z1: inner.z1 - 0.13 }, { n: 0.0001, s: 0.0001, e: 0.0001, w: 0.0001 });
    addRails(g, name, P, y + 0.35, 0.95);
  }

  function newFloor(b, n, roof = false) {
    const g = new THREE.Group();
    g.name = `${b.id}-${roof ? 'roof' : 'level-' + n}`;
    g.userData = { level: n, label: levelLabel(b, n, roof), buildingId: b.id };
    root.add(g);
    floors.push(g);
    return g;
  }

  /* ------------------------------------------------------------------------ */
  /* Tree geometry (shared by site + roof planting)                             */
  /* ------------------------------------------------------------------------ */

  /** Soft multi-blob canopy in unit height (0..1), smooth radial normals. */
  function canopyGeo(detail, seed) {
    const r = rng(seed);
    const blobs = [[0, 0.64, 0, 0.31], [0.17, 0.55, 0.07, 0.25], [-0.15, 0.53, -0.08, 0.26], [0.03, 0.78, -0.05, 0.21]];
    if (detail === 0) blobs.length = 3;
    const parts = [];
    const ph = r() * 10;
    for (const [bx, by, bz, br] of blobs) {
      const ico = new THREE.IcosahedronGeometry(1, detail);
      const p = ico.attributes.position;
      const pos = new Float32Array(p.count * 3), nor = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const k = 1 + 0.1 * Math.sin(x * 5.3 + ph) * Math.cos(y * 4.1 + ph) * Math.sin(z * 3.7 + 1.1);
        pos[i * 3] = bx + x * br * k; pos[i * 3 + 1] = by + y * br * k * 0.86; pos[i * 3 + 2] = bz + z * br * k;
        nor[i * 3] = x; nor[i * 3 + 1] = y; nor[i * 3 + 2] = z;
      }
      parts.push({ pos, nor });
      ico.dispose();
    }
    return mergeSimple(parts);
  }
  const canopy = canopyGeo(HIGH ? 1 : 0, 3);
  const conifer = mergeSimple([toPart(new THREE.ConeGeometry(0.2, 0.62, HIGH ? 8 : 6), 0, 0.6, 0), toPart(new THREE.ConeGeometry(0.15, 0.45, HIGH ? 8 : 6), 0, 0.84, 0)]);
  const trunk = mergeSimple([toPart(new THREE.CylinderGeometry(0.022, 0.032, 0.42, 5), 0, 0.21, 0)]);

  /**
   * Instanced trees. list: [x, z, height, kind(0 deciduous / 1 conifer), yBase]
   */
  function addTrees(parent, name, list) {
    const dec = list.filter((t) => t[3] === 0), con = list.filter((t) => t[3] === 1);
    const xf = (t, sq = 1) => [t[0], t[4] || 0, t[1], t[0] * 0.7 + t[1] * 1.3, t[2] * sq, t[2], t[2] * sq];
    const groups = [[], [], []];
    dec.forEach((t, i) => groups[i % 3].push(t));
    [mat.leafA, mat.leafB, mat.leafC].forEach((m, i) => addInstances(parent, `${name}-canopy-${i}`, canopy, m, groups[i].map((t) => xf(t))));
    addInstances(parent, `${name}-conifers`, conifer, mat.leafB, con.map((t) => xf(t, 0.9)));
    addInstances(parent, `${name}-trunks`, trunk, mat.trunk, list.map((t) => xf(t)), true, false);
  }
  // Instanced meshes place by centre-y; trees are authored from y=0 so the transform y is the base.

  /* ========================================================================== */
  /* TOWER                                                                     */
  /* ========================================================================== */
  {
    const b = TOWER;
    // Level 0: double-height lobby that steps forward to meet the wing frontage.
    const g0 = newFloor(b, 0);
    const r0 = { x0: b.x0, x1: b.x1, z0: b.z0, z1: PODIUM_FRONT };
    glazedLevel(g0, b, 0, { rect: r0, shared: ['e', 'w'], lip: 0, mullionStep: 2.4, mullionMat: mat.aluDark, interiorMat: mat.lobby, rails: false });
    fascia(g0, b, r0, ['s', 'n']);
    // podium planter strip in front of the tower above the lobby
    addSpan(g0, 'tower-podium-roof', mat.roof, r0.x0, r0.x1, GROUND_H, GROUND_H + 0.18, b.z1 + 1.95, r0.z1 + 0.4);
    addSpan(g0, 'tower-podium-planter', mat.greenRoof, r0.x0 + 1.5, r0.x1 - 1.5, GROUND_H + 0.18, GROUND_H + 0.6, b.z1 + 2.4, r0.z1 - 0.2);

    // Entrance canopy (cantilever) + slim columns + teal accent line + soffit light
    const cy = 4.1, cz0 = PODIUM_FRONT, cz1 = 5.2, cx0 = -25, cx1 = -9;
    addSpan(g0, 'entrance-canopy', mat.white, cx0, cx1, cy, cy + 0.42, cz0 + 0.45, cz1);
    addSpan(g0, 'entrance-canopy-accent', mat.teal, cx0 + 0.5, cx1 - 0.5, cy + 0.12, cy + 0.2, cz1, cz1 + 0.04, false, false);
    addSpan(g0, 'entrance-canopy-soffit-light', mat.lightStrip, cx0 + 1.5, cx1 - 1.5, cy - 0.04, cy, cz1 - 2.2, cz1 - 1.9, false, false);
    addSpan(g0, 'entrance-canopy-soffit-light-2', mat.lightStrip, cx0 + 1.5, cx1 - 1.5, cy - 0.04, cy, cz0 + 2.4, cz0 + 2.7, false, false);
    const colGeo = G(new THREE.CylinderGeometry(0.16, 0.16, cy, 12));
    addInstances(g0, 'entrance-canopy-columns', colGeo, mat.white, [[cx0 + 2, cy / 2, cz1 - 1.2], [cx1 - 2, cy / 2, cz1 - 1.2]]);
    const canopyLight = new THREE.PointLight(0xffe2b8, 0, 18, 2);
    canopyLight.name = 'lamp-entrance-canopy'; canopyLight.position.set((cx0 + cx1) / 2, cy - 0.6, 1.2);
    canopyLight.userData.intensity = 120;
    g0.add(canopyLight); lamps.push(canopyLight);

    // Levels 1..11: wraparound balconies (only where the tower stands clear of the low blocks)
    for (let n = 1; n < b.levels; n++) {
      const g = newFloor(b, n);
      const shared = [];
      if (n <= WEST.levels) shared.push('w');      // west block roof + parapet height
      if (n <= WING.levels) shared.push('e');      // wing roof + parapet height
      const deep = 1.8;
      glazedLevel(g, b, n, {
        ext: { n: deep, s: deep, e: deep, w: deep }, shared,
        mullionStep: HIGH ? 1.5 : 3, mullionMat: mat.aluLight, finStep: 6, lip: 0.2,
      });
    }

    // Crown (roof level): terrace slab, set-back glass pavilion, open white frame with light line
    const n = b.levels;
    const gr = newFloor(b, n, true);
    const y = levelBase(n), dk = 1.8;
    const outer = { x0: b.x0 - dk, x1: b.x1 + dk, z0: b.z0 - dk, z1: b.z1 + dk };
    addSpan(gr, 'tower-roof-slab', mat.white, outer.x0, outer.x1, y, y + SLAB_T + 0.08, outer.z0, outer.z1);
    addSpan(gr, 'tower-roof-deck', mat.roof, outer.x0 + 0.3, outer.x1 - 0.3, y + SLAB_T + 0.08, y + SLAB_T + 0.14, outer.z0 + 0.3, outer.z1 - 0.3, false, true);
    roofEdge(gr, 'tower-roof-parapet', { x0: outer.x0 + 0.05, x1: outer.x1 - 0.05, z0: outer.z0 + 0.05, z1: outer.z1 - 0.05 }, y + SLAB_T + 0.08);
    // set-back penthouse / amenity pavilion
    const py = y + SLAB_T + 0.14, ph = 4.0;
    const pr = { x0: b.x0 + 3, x1: b.x1 - 3, z0: b.z0 + 3, z1: b.z1 - 3 };
    const pint = new THREE.Mesh(glowBoxGeo(pr.x1 - pr.x0 - 0.6, ph, pr.z1 - pr.z0 - 0.6, 15), mat.interior);
    pint.name = 'tower-crown-pavilion-interior'; pint.position.set((pr.x0 + pr.x1) / 2, py + ph / 2, (pr.z0 + pr.z1) / 2);
    gr.add(shadowFlags(pint));
    const pgl = new THREE.Mesh(tubeGeo(pr.x1 - pr.x0, ph, pr.z1 - pr.z0), mat.glass);
    pgl.name = 'tower-crown-pavilion-glass'; pgl.position.copy(pint.position); gr.add(shadowFlags(pgl, false, false));
    addInstances(gr, 'tower-crown-pavilion-mullions', UNIT, mat.aluLight,
      alongSides(pr, SIDES, HIGH ? 1.5 : 3, 0.07).map(([x, z, rot]) => [x, py + ph / 2, z, rot, 0.08, ph, 0.14]), true, false);
    addSpan(gr, 'tower-crown-pavilion-roof', mat.white, pr.x0 - 0.8, pr.x1 + 0.8, py + ph, py + ph + 0.4, pr.z0 - 0.8, pr.z1 + 0.8);
    // open crown frame on the outer slab line
    const fy0 = py + ph + 0.4 + 0.6, fy1 = fy0 + 0.9, ft = 0.5;
    const fr = { x0: outer.x0 + 0.1, x1: outer.x1 - 0.1, z0: outer.z0 + 0.1, z1: outer.z1 - 0.1 };
    addSpan(gr, 'tower-crown-frame-s', mat.white, fr.x0, fr.x1, fy0, fy1, fr.z1 - ft, fr.z1);
    addSpan(gr, 'tower-crown-frame-n', mat.white, fr.x0, fr.x1, fy0, fy1, fr.z0, fr.z0 + ft);
    addSpan(gr, 'tower-crown-frame-e', mat.white, fr.x1 - ft, fr.x1, fy0, fy1, fr.z0 + ft, fr.z1 - ft);
    addSpan(gr, 'tower-crown-frame-w', mat.white, fr.x0, fr.x0 + ft, fy0, fy1, fr.z0 + ft, fr.z1 - ft);
    // frame posts at corners + quarter points
    const postH = fy0 - (y + SLAB_T + 0.08);
    const posts = alongSides({ x0: fr.x0 + ft / 2, x1: fr.x1 - ft / 2, z0: fr.z0 + ft / 2, z1: fr.z1 - ft / 2 }, SIDES, 9, 0)
      .map(([x, z]) => [x, y + SLAB_T + 0.08 + postH / 2, z, 0, 0.35, postH, 0.35]);
    addInstances(gr, 'tower-crown-posts', UNIT, mat.white, posts);
    // light line under the frame
    const ly = fy0 - 0.12;
    addSpan(gr, 'tower-crown-light-s', mat.lightStrip, fr.x0 + 0.3, fr.x1 - 0.3, ly, fy0, fr.z1 - 0.3, fr.z1 - 0.15, false, false);
    addSpan(gr, 'tower-crown-light-n', mat.lightStrip, fr.x0 + 0.3, fr.x1 - 0.3, ly, fy0, fr.z0 + 0.15, fr.z0 + 0.3, false, false);
    addSpan(gr, 'tower-crown-light-e', mat.lightStrip, fr.x1 - 0.3, fr.x1 - 0.15, ly, fy0, fr.z0 + 0.3, fr.z1 - 0.3, false, false);
    addSpan(gr, 'tower-crown-light-w', mat.lightStrip, fr.x0 + 0.15, fr.x0 + 0.3, ly, fy0, fr.z0 + 0.3, fr.z1 - 0.3, false, false);
  }

  /* ========================================================================== */
  /* WEST BLOCK                                                                */
  /* ========================================================================== */
  {
    const b = WEST;
    const g0 = newFloor(b, 0);
    glazedLevel(g0, b, 0, { shared: ['e'], lip: 0, mullionStep: 2.4, mullionMat: mat.aluDark, interiorMat: mat.lobby, rails: false });
    fascia(g0, b, b, ['s', 'n', 'w']);
    for (let n = 1; n < b.levels; n++) {
      const g = newFloor(b, n);
      glazedLevel(g, b, n, {
        ext: { s: 1.6, w: 1.6, n: 0, e: 0 }, shared: ['e'],
        mullionStep: HIGH ? 1.5 : 3, mullionMat: mat.aluLight, finStep: 5.5, lip: 0.2,
      });
    }
    // green roof terrace
    const n = b.levels, y = levelBase(n);
    const gr = newFloor(b, n, true);
    const r = { x0: b.x0 - 0.2, x1: b.x1, z0: b.z0 - 0.2, z1: b.z1 + 0.2 };
    addSpan(gr, 'west-roof-slab', mat.white, r.x0, r.x1, y, y + SLAB_T, r.z0, r.z1);
    addSpan(gr, 'west-roof-membrane', mat.roof, r.x0 + 0.3, r.x1 - 0.3, y + SLAB_T, y + SLAB_T + 0.06, r.z0 + 0.3, r.z1 - 0.3, false, true);
    roofEdge(gr, 'west-roof-parapet', { x0: r.x0, x1: r.x1 - 0.05, z0: r.z0, z1: r.z1 }, y + SLAB_T);
    const ry = y + SLAB_T + 0.06;
    addSpan(gr, 'west-green-roof-a', mat.greenRoof, r.x0 + 1.2, r.x1 - 7.5, ry, ry + 0.35, r.z0 + 1.2, r.z1 - 8);
    addSpan(gr, 'west-green-roof-b', mat.greenRoof, r.x1 - 6.5, r.x1 - 1.2, ry, ry + 0.35, r.z0 + 1.2, r.z0 + 9);
    addSpan(gr, 'west-roof-deck', mat.wood, r.x0 + 1.2, r.x1 - 1.2, ry, ry + 0.12, r.z1 - 7, r.z1 - 1.2);
    addTrees(gr, 'west-roof-trees', [
      [r.x0 + 4, r.z0 + 4, 4.2, 0, ry + 0.35], [r.x0 + 9, r.z0 + 7.5, 3.6, 0, ry + 0.35],
      [r.x1 - 3.8, r.z0 + 4.5, 3.8, 0, ry + 0.35], [r.x0 + 5, r.z0 + 11.5, 3.4, 0, ry + 0.35],
    ]);
    // pergola over the deck
    const py = ry + 2.8;
    const pg = { x0: r.x0 + 2, x1: r.x1 - 2, z0: r.z1 - 6.4, z1: r.z1 - 1.8 };
    addInstances(gr, 'west-pergola-posts', UNIT, mat.white,
      [[pg.x0, (ry + py) / 2, pg.z0], [pg.x1, (ry + py) / 2, pg.z0], [pg.x0, (ry + py) / 2, pg.z1], [pg.x1, (ry + py) / 2, pg.z1]]
        .map((p) => [...p, 0, 0.18, py - ry, 0.18]));
    const slats = [];
    for (let x = pg.x0; x <= pg.x1 + 0.01; x += 0.9) slats.push([x, py + 0.1, (pg.z0 + pg.z1) / 2, 0, 0.12, 0.2, pg.z1 - pg.z0 + 0.4]);
    addInstances(gr, 'west-pergola-slats', UNIT, mat.white, slats);
  }

  /* ========================================================================== */
  /* WING                                                                      */
  /* ========================================================================== */
  {
    const b = WING;
    const g0 = newFloor(b, 0);
    glazedLevel(g0, b, 0, { shared: ['w'], lip: 0, mullionStep: 2.4, mullionMat: mat.aluDark, interiorMat: mat.lobby, rails: false });
    fascia(g0, b, b, ['s', 'n', 'e']);

    // projecting balconies: columns along the long faces
    const balcCols = [];
    for (let x = b.x0 + 6.5; x < b.x1 - 3; x += 7.2) balcCols.push(x);
    const BW = 4.2, BD = 1.7;

    for (let n = 1; n < b.levels; n++) {
      const g = newFloor(b, n);
      const { y } = glazedLevel(g, b, n, {
        ext: {}, shared: ['w'], lip: 0.25,
        mullionStep: HIGH ? 1.2 : 2.4, mullionMat: mat.aluDark, mullionW: 0.07,
      });
      // spandrel panels: every other bay on the long faces is an opaque dark panel
      const sp = [];
      for (const side of ['s', 'n']) {
        const z = side === 's' ? b.z1 + 0.05 : b.z0 - 0.05;
        for (let x = b.x0 + 1.8; x < b.x1 - 1; x += 3.6) {
          if (balcCols.some((c) => Math.abs(c - x) < BW / 2 + 0.8)) continue;
          sp.push([x, y + SLAB_T + (LEVEL_H - SLAB_T) / 2, z, 0, 1.15, LEVEL_H - SLAB_T, 0.05]);
        }
      }
      addInstances(g, `wing-L${n}-spandrels`, UNIT, mat.spandrel, sp, true, false);

      // balconies (stagger alternate columns per level for a livelier rhythm)
      const slab = [], glassP = [], caps = [];
      const yb = y; // balcony slab aligned with floor slab
      for (const side of ['s', 'n']) {
        const sgn = side === 's' ? 1 : -1;
        const zEdge = side === 's' ? b.z1 : b.z0;
        balcCols.forEach((cx, i) => {
          const x = cx + ((i + n) % 2 ? 0.9 : -0.9);
          const zc = zEdge + sgn * BD / 2;
          slab.push([x, yb + 0.14, zc, 0, BW, 0.28, BD]);
          const gy = yb + 0.28 + 0.525;
          glassP.push([x, gy, zEdge + sgn * (BD - 0.05), 0, BW - 0.1, 1.05, 0.03]);
          glassP.push([x - BW / 2 + 0.05, gy, zc, Math.PI / 2, BD - 0.1, 1.05, 0.03]);
          glassP.push([x + BW / 2 - 0.05, gy, zc, Math.PI / 2, BD - 0.1, 1.05, 0.03]);
          caps.push([x, yb + 0.28 + 1.08, zEdge + sgn * (BD - 0.05), 0, BW, 0.06, 0.08]);
        });
      }
      addInstances(g, `wing-L${n}-balcony-slabs`, UNIT, mat.white, slab);
      addInstances(g, `wing-L${n}-balcony-glass`, UNIT, mat.railGlass, glassP, false, false);
      addInstances(g, `wing-L${n}-balcony-handrails`, UNIT, mat.white, caps, true, false);
    }

    // Roof: pool deck, long pool, pavilion, green roof, stair overrun
    const n = b.levels, y = levelBase(n);
    const gr = newFloor(b, n, true);
    const r = { x0: b.x0, x1: b.x1 + 0.25, z0: b.z0 - 0.25, z1: b.z1 + 0.25 };
    addSpan(gr, 'wing-roof-slab', mat.white, r.x0, r.x1, y, y + SLAB_T, r.z0, r.z1);
    const ry = y + SLAB_T + 0.06;
    addSpan(gr, 'wing-roof-membrane', mat.roof, r.x0 + 0.3, r.x1 - 0.3, y + SLAB_T, ry, r.z0 + 0.3, r.z1 - 0.3, false, true);
    roofEdge(gr, 'wing-roof-parapet', { x0: r.x0 + 0.05, x1: r.x1, z0: r.z0, z1: r.z1 }, y + SLAB_T);

    // timber pool deck
    const dk = { x0: 1.5, x1: 31, z0: -17.5, z1: -5.0 };
    addSpan(gr, 'wing-pool-deck', mat.wood, dk.x0, dk.x1, ry, ry + 0.14, dk.z0, dk.z1);
    // pool: coping ring + water
    const pl = { x0: 3.5, x1: 29, z0: -10.6, z1: -6.2 }, cope = 0.35;
    const wy0 = ry + 0.14, wy1 = wy0 + 0.22;
    addSpan(gr, 'wing-pool-water', mat.water, pl.x0, pl.x1, wy0, wy1, pl.z0, pl.z1, false, true);
    addSpan(gr, 'wing-pool-coping-s', mat.poolTile, pl.x0 - cope, pl.x1 + cope, wy0, wy1 + 0.1, pl.z1, pl.z1 + cope);
    addSpan(gr, 'wing-pool-coping-n', mat.poolTile, pl.x0 - cope, pl.x1 + cope, wy0, wy1 + 0.1, pl.z0 - cope, pl.z0);
    addSpan(gr, 'wing-pool-coping-e', mat.poolTile, pl.x1, pl.x1 + cope, wy0, wy1 + 0.1, pl.z0, pl.z1);
    addSpan(gr, 'wing-pool-coping-w', mat.poolTile, pl.x0 - cope, pl.x0, wy0, wy1 + 0.1, pl.z0, pl.z1);
    // loungers along the deck
    const lounge = [];
    for (let x = pl.x0 + 1.2; x < pl.x1 - 0.5; x += 2.1) lounge.push([x, wy0 + 0.2, -12.6, 0, 0.75, 0.4, 1.9]);
    addInstances(gr, 'wing-pool-loungers', UNIT, mat.white, lounge);
    // parasols (white discs on slim poles)
    const umbX = [pl.x0 + 3.3, pl.x0 + 9.6, pl.x0 + 15.9, pl.x0 + 22.2];
    const discGeo = G(new THREE.CylinderGeometry(1.4, 1.4, 0.08, HIGH ? 20 : 10));
    const poleGeo = G(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6));
    addInstances(gr, 'wing-pool-parasols', discGeo, mat.white, umbX.map((x) => [x, wy0 + 2.4, -14.6]));
    addInstances(gr, 'wing-pool-parasol-poles', poleGeo, mat.metalDark, umbX.map((x) => [x, wy0 + 1.2, -14.6]), true, false);
    // roof pavilion (amenity room): glass box + white roof plate
    const pv = { x0: 33, x1: 41.5, z0: -21.5, z1: -11 }, pvh = 3.3;
    const pvi = new THREE.Mesh(glowBoxGeo(pv.x1 - pv.x0 - 0.6, pvh, pv.z1 - pv.z0 - 0.6, 14), mat.interior);
    pvi.name = 'wing-roof-pavilion-interior'; pvi.position.set((pv.x0 + pv.x1) / 2, ry + pvh / 2, (pv.z0 + pv.z1) / 2); gr.add(shadowFlags(pvi));
    const pvg = new THREE.Mesh(tubeGeo(pv.x1 - pv.x0, pvh, pv.z1 - pv.z0), mat.glass);
    pvg.name = 'wing-roof-pavilion-glass'; pvg.position.copy(pvi.position); gr.add(shadowFlags(pvg, false, false));
    addInstances(gr, 'wing-roof-pavilion-mullions', UNIT, mat.aluLight,
      alongSides(pv, SIDES, 1.5, 0.07).map(([x, z, rot]) => [x, ry + pvh / 2, z, rot, 0.08, pvh, 0.14]), true, false);
    addSpan(gr, 'wing-roof-pavilion-roof', mat.white, pv.x0 - 1.2, pv.x1 + 1.2, ry + pvh, ry + pvh + 0.35, pv.z0 - 0.6, pv.z1 + 2.4);
    // green roof: east lawn + strip behind the deck, planters with small trees
    addSpan(gr, 'wing-green-roof-east', mat.greenRoof, 42.8, r.x1 - 1.2, ry, ry + 0.38, r.z0 + 1.2, r.z1 - 1.2);
    addSpan(gr, 'wing-green-roof-north', mat.greenRoof, 1.5, 31, ry, ry + 0.38, r.z0 + 1.2, dk.z0 - 0.8);
    addSpan(gr, 'wing-green-roof-planter', mat.greenRoof, 33, 41.5, ry, ry + 0.38, -9.2, r.z1 - 1.2);
    addTrees(gr, 'wing-roof-trees', [
      [45.5, -20.5, 4.4, 0, ry + 0.38], [47.4, -15.2, 3.8, 0, ry + 0.38], [45.2, -9.8, 4.0, 0, ry + 0.38],
      [47.6, -6.6, 3.4, 0, ry + 0.38], [8, -21.4, 3.6, 0, ry + 0.38], [20, -21.6, 3.9, 0, ry + 0.38], [35.2, -7.0, 3.2, 0, ry + 0.38],
    ]);
    // stair / lift overrun next to the tower
    addSpan(gr, 'wing-roof-overrun', mat.whiteMatte, -5.0, 0.4, ry, ry + 3.4, -22.6, -15.5);
    // pool light (moves with the exploded roof level)
    const poolLight = new THREE.PointLight(0x7fe6f0, 0, 22, 2);
    poolLight.name = 'lamp-pool'; poolLight.position.set((pl.x0 + pl.x1) / 2, wy1 + 1.5, (pl.z0 + pl.z1) / 2);
    poolLight.userData.intensity = 80;
    gr.add(poolLight); lamps.push(poolLight);
  }

  /* ========================================================================== */
  /* SITE (non-exploding landscape)                                            */
  /* ========================================================================== */
  {
    const S = site;
    const E = 69; // half extent of the site (fits the 140 m footprint)
    // lawn base
    const lawnGeo = G(new THREE.PlaneGeometry(2 * E, 2 * E));
    const lawn = new THREE.Mesh(lawnGeo, mat.lawn);
    lawn.name = 'site-lawn'; lawn.rotation.x = -Math.PI / 2; lawn.position.y = 0.02;
    S.add(shadowFlags(lawn, false, true));

    // plaza paving around the buildings
    const PZ = { x0: -56, x1: 56, z0: -38, z1: 3 };
    addSpan(S, 'site-plaza-paving', mat.paving, PZ.x0, PZ.x1, 0.02, 0.1, PZ.z0, PZ.z1, false, true);

    // parking court
    const PK = { x0: -34, x1: 38, z0: 3, z1: 35 };
    addSpan(S, 'site-parking-asphalt', mat.asphalt, PK.x0, PK.x1, 0.02, 0.06, PK.z0, PK.z1, false, true);
    // curbs on the open sides of the court
    addSpan(S, 'site-parking-curb-s', mat.curb, PK.x0 - 0.3, 14, 0.02, 0.18, PK.z1, PK.z1 + 0.3, false, true);
    addSpan(S, 'site-parking-curb-s2', mat.curb, 24, PK.x1 + 0.3, 0.02, 0.18, PK.z1, PK.z1 + 0.3, false, true);
    addSpan(S, 'site-parking-curb-w', mat.curb, PK.x0 - 0.3, PK.x0, 0.02, 0.18, PK.z0, PK.z1, false, true);
    addSpan(S, 'site-parking-curb-e', mat.curb, PK.x1, PK.x1 + 0.3, 0.02, 0.18, PK.z0, PK.z1, false, true);
    // driveway + roads
    addSpan(S, 'site-driveway', mat.asphalt, 14, 24, 0.02, 0.06, PK.z1, 46, false, true);
    addSpan(S, 'site-road-south', mat.asphalt, -E, E, 0.02, 0.06, 46, 55, false, true);
    addSpan(S, 'site-road-west', mat.asphalt, -E, -60, 0.02, 0.06, -E, 46, false, true);
    addSpan(S, 'site-sidewalk-south', mat.paving, -E, 14, 0.02, 0.1, 43.5, 46, false, true);
    addSpan(S, 'site-sidewalk-south-2', mat.paving, 24, E, 0.02, 0.1, 43.5, 46, false, true);
    addSpan(S, 'site-sidewalk-west', mat.paving, -60, -57.5, 0.02, 0.1, -E, 43.5, false, true);

    // markings
    const lines = [];
    const stall = 2.7, sd = 5.2;
    const stallRow = (x0, x1, z0, skip) => {
      for (let x = x0; x <= x1 + 0.01; x += stall) {
        if (skip && x > skip[0] && x < skip[1]) continue;
        lines.push([x, 0.08, z0 + sd / 2, 0, 0.12, 0.04, sd]);
      }
    };
    const rowA = { z: PK.z0 + 0.6, x0: -31, x1: 34, skip: [-27, -6] }; // north row (along plaza), gap at drop-off
    const rowB = { z: 15.6, x0: -20.5, x1: 22 };
    const rowC = { z: 23.8 + 0.2, x0: -20.5, x1: 22 };
    stallRow(rowA.x0, rowA.x1, rowA.z, rowA.skip);
    stallRow(rowB.x0, rowB.x1, rowB.z);
    stallRow(rowC.x0, rowC.x1, rowC.z);
    // road centre dashes
    for (let x = -E + 2; x < E - 2; x += 6) lines.push([x, 0.08, 50.5, 0, 3, 0.04, 0.15]);
    for (let z = -E + 2; z < 44; z += 6) lines.push([-64.5, 0.08, z, 0, 0.15, 0.04, 3]);
    // drop-off zone hatch in front of the canopy
    for (let x = -26; x <= -8; x += 1.5) lines.push([x, 0.08, 7.4, Math.PI / 4, 0.12, 0.04, 2.4]);
    addInstances(S, 'site-line-markings', UNIT, mat.marking, lines, false, true);

    // central landscaped island (rounded) + small round island near the ramp
    const isl = new THREE.Shape();
    const ix0 = -20, ix1 = 21.5, iz0 = 20.9, iz1 = 23.9, ir = (iz1 - iz0) / 2;
    isl.moveTo(ix0 + ir, iz0); isl.lineTo(ix1 - ir, iz0);
    isl.absarc(ix1 - ir, iz0 + ir, ir, -Math.PI / 2, Math.PI / 2, false);
    isl.lineTo(ix0 + ir, iz1);
    isl.absarc(ix0 + ir, iz0 + ir, ir, Math.PI / 2, Math.PI * 1.5, false);
    const islandGeo = G(new THREE.ExtrudeGeometry(isl, { depth: 0.22, bevelEnabled: false, curveSegments: HIGH ? 10 : 5 }));
    islandGeo.rotateX(Math.PI / 2); islandGeo.translate(0, 0.24, 0);
    const islandCurbGeo = G(new THREE.ExtrudeGeometry(isl, { depth: 0.18, bevelEnabled: false, curveSegments: HIGH ? 10 : 5 }));
    islandCurbGeo.rotateX(Math.PI / 2); islandCurbGeo.translate(0, 0.2, 0);
    // curb = slightly larger shape below the grass
    const island = new THREE.Mesh(islandGeo, mat.lawn); island.name = 'site-island-planting';
    const islandCurb = new THREE.Mesh(islandCurbGeo, mat.curb); islandCurb.name = 'site-island-curb';
    islandCurb.scale.set(1.012, 1, 1.09); islandCurb.position.set(-(ix0 + ix1) / 2 * 0.012, 0, -(iz0 + iz1) / 2 * 0.09);
    S.add(shadowFlags(island, false, true), shadowFlags(islandCurb, false, true));
    const roundGeo = G(new THREE.CylinderGeometry(3, 3, 0.24, HIGH ? 28 : 14));
    const roundCurbGeo = G(new THREE.CylinderGeometry(3.25, 3.25, 0.18, HIGH ? 28 : 14));
    const ri = new THREE.Mesh(roundGeo, mat.lawn); ri.name = 'site-round-island'; ri.position.set(31.5, 0.12, 27.5);
    const ric = new THREE.Mesh(roundCurbGeo, mat.curb); ric.name = 'site-round-island-curb'; ric.position.set(31.5, 0.09, 27.5);
    S.add(shadowFlags(ri, false, true), shadowFlags(ric, false, true));

    // garage ramp at the east of the court: white walls, dark floor, portal
    const RP = { x0: 40.5, x1: 47.5, z0: -3.6, z1: 18 };
    addSpan(S, 'site-ramp-floor', mat.asphalt, RP.x0, RP.x1, 0.02, 0.09, RP.z0, RP.z1, false, true);
    addSpan(S, 'site-ramp-wall-w', mat.white, RP.x0 - 0.3, RP.x0, 0.02, 1.15, RP.z0, RP.z1);
    addSpan(S, 'site-ramp-wall-e', mat.white, RP.x1, RP.x1 + 0.3, 0.02, 1.15, RP.z0, RP.z1);
    addSpan(S, 'site-ramp-portal', mat.white, RP.x0 - 0.3, RP.x1 + 0.3, 2.9, 3.5, RP.z0 - 0.4, RP.z0 + 4.5);
    addSpan(S, 'site-ramp-portal-mouth', mat.metalDark, RP.x0, RP.x1, 0.09, 2.9, RP.z0 - 0.35, RP.z0 - 0.1, false, false);
    addSpan(S, 'site-ramp-portal-cheek-w', mat.white, RP.x0 - 0.3, RP.x0, 1.15, 2.9, RP.z0 - 0.4, RP.z0 + 4.5);
    addSpan(S, 'site-ramp-portal-cheek-e', mat.white, RP.x1, RP.x1 + 0.3, 1.15, 2.9, RP.z0 - 0.4, RP.z0 + 4.5);
    addSpan(S, 'site-ramp-accent', mat.teal, RP.x0 + 0.4, RP.x1 - 0.4, 3.26, 3.34, RP.z0 + 4.5, RP.z0 + 4.54, false, false);

    // hedges along the plaza edge + planters by the entrance
    const hedges = [];
    for (let x = -54; x < -34; x += 3.2) hedges.push([x, 0.5, 1.6, 0, 3.0, 0.8, 1.1]);
    for (let x = 0; x < 38; x += 3.2) hedges.push([x, 0.5, 1.6, 0, 3.0, 0.8, 1.1]);
    for (let z = -36; z < 0; z += 3.2) { hedges.push([-55, 0.5, z, 0, 1.1, 0.8, 3.0]); hedges.push([55, 0.5, z, 0, 1.1, 0.8, 3.0]); }
    addInstances(S, 'site-hedges', UNIT, mat.shrub, hedges);

    // lamp posts: around the court + plaza
    const lampPts = [
      [-31, 10.5], [-8, 10.5], [12, 10.5], [32, 10.5],
      [-12, 22.4], [8, 22.4],
      [-31, 31], [0, 33.5], [33, 33.5], [19, 41],
      [-52, -2], [52, -2],
    ];
    const lampH = 6.2;
    const poleGeo = G(new THREE.CylinderGeometry(0.07, 0.1, lampH, 8));
    addInstances(S, 'site-lamp-poles', poleGeo, mat.metalDark, lampPts.map(([x, z]) => [x, lampH / 2, z]), true, false);
    addInstances(S, 'site-lamp-heads', UNIT, mat.lampHead, lampPts.map(([x, z]) => [x, lampH + 0.08, z, 0, 0.6, 0.16, 0.6]), true, false);
    // point lights on a selection of lamps (engine turns them on at night)
    [[-20, 10.5], [12, 10.5], [-12, 22.4], [8, 22.4], [19, 41], [0, 33.5]].forEach(([x, z], i) => {
      const l = new THREE.PointLight(0xffd9a6, 0, 26, 2);
      l.name = `lamp-court-${i}`; l.position.set(x, lampH - 0.4, z); l.userData.intensity = 220;
      S.add(l); lamps.push(l);
    });

    // parked cars (deterministic fill of stalls)
    const carSlots = [];
    const fillRow = (row, facing, prob) => {
      for (let x = row.x0 + stall / 2; x < row.x1; x += stall) {
        if (row.skip && x > row.skip[0] && x < row.skip[1]) continue;
        if (rand() < prob) carSlots.push([x + (rand() - 0.5) * 0.25, row.z + sd / 2 + (rand() - 0.5) * 0.3, facing]);
      }
    };
    fillRow(rowA, 0, HIGH ? 0.5 : 0.35); fillRow(rowB, 0, HIGH ? 0.45 : 0.3); fillRow(rowC, 0, HIGH ? 0.45 : 0.3);
    const carMats = [mat.carWhite, mat.carSilver, mat.carDark, mat.carBlue];
    const carGroups = [[], [], [], []];
    carSlots.forEach((c) => carGroups[Math.floor(rand() * 4) % 4].push(c));
    carGroups.forEach((grp, i) => addInstances(S, `site-cars-${i}`, UNIT, carMats[i], grp.map(([x, z]) => [x, 0.06 + 0.4 + 0.12, z, 0, 1.8, 0.8, 4.4])));
    addInstances(S, 'site-cars-cabins', UNIT, mat.carGlass, carSlots.map(([x, z]) => [x, 0.06 + 0.92 + 0.22, z + 0.15, 0, 1.6, 0.46, 2.2]), true, false);
    // a couple of cars on the road
    addInstances(S, 'site-cars-road', UNIT, mat.carWhite, [[-30, 0.58, 48.5, Math.PI / 2, 1.8, 0.8, 4.4], [38, 0.58, 52.5, Math.PI / 2, 1.8, 0.8, 4.4]]);

    // trees: dense ring of mature trees avoiding buildings, paving and roads
    const blocked = [
      [-58, 58, -40, 4.5],     // buildings + plaza
      [-36, 40, 1, 37],        // parking court
      [12, 26, 34, 47],        // driveway
      [-E - 2, E + 2, 42.5, 56], // south road + walk
      [-E - 2, -56.5, -E - 2, 47], // west road + walk
      [38.5, 50, -6, 20],      // ramp
    ];
    const free = (x, z, pad) => !blocked.some(([a, b2, c, d]) => x > a - pad && x < b2 + pad && z > c - pad && z < d + pad);
    const trees = [];
    const target = HIGH ? 150 : 70, minD = HIGH ? 6.2 : 8.5;
    for (let tries = 0; tries < 6000 && trees.length < target; tries++) {
      const x = (rand() * 2 - 1) * (E - 6), z = (rand() * 2 - 1) * (E - 6);
      if (!free(x, z, 2.5)) continue;
      if (trees.some((t) => (t[0] - x) ** 2 + (t[1] - z) ** 2 < minD * minD)) continue;
      trees.push([x, z, 8.5 + rand() * 4.5, rand() < 0.12 ? 1 : 0, 0.02]);
    }
    // feature trees: island + plaza front corners
    [[-14, 22.4], [-2, 22.4], [14, 22.4]].forEach(([x, z]) => trees.push([x, z, 8.5, 0, 0.36]));
    trees.push([31.5, 27.5, 9.5, 0, 0.24]);
    addTrees(S, 'site-trees', trees);
  }

  /* ------------------------------------------------------------------------ */
  /* Finalise                                                                  */
  /* ------------------------------------------------------------------------ */

  // floors bottom → top (stable within a level: tower, west, wing)
  floors.sort((a, b) => a.userData.level - b.userData.level);

  let shimmerT = 0;
  function update(dt) {
    shimmerT += dt || 0;
    rippleTex.offset.set(shimmerT * 0.018, shimmerT * 0.011);
  }

  function dispose() {
    root.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
    owned.geo.forEach((g) => g.dispose());
    owned.mat.forEach((m) => m.dispose());
    owned.tex.forEach((t) => t.dispose());
    owned.geo.clear(); owned.mat.clear(); owned.tex.clear(); geoCache.clear();
    if (root.parent) root.parent.remove(root);
  }

  return { root, floors, site, nightMaterials, lamps, update, dispose };
}
