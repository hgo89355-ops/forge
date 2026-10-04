/**
 * MOBCO 3D Project Studio — model: "villa-community"
 * -------------------------------------------------------------------------
 * An ILLUSTRATIVE massing model of a gated villa community, inspired by the
 * aerial render `assets/img/aerial-compound.webp` (not a replica, not to scale):
 *   - rows of white, modern two-storey villas (two typologies, InstancedMesh)
 *   - two free-form lagoon pools with sandy decks in a central park
 *   - a tree-lined boulevard with a palm median, a gated entrance and cars
 *   - a two-level commercial strip with a colonnade, roof-terrace pergolas and
 *     a café plaza facing the main road
 *
 * Module contract (see engine): imports nothing, THREE is injected.
 *   export const meta = {...}
 *   export function build(THREE, ctx) -> { root, floors, site, nightMaterials, lamps, update, dispose }
 *
 * World units are metres. Ground is y = 0 (provided by the engine). The model is
 * centred on the origin and fits inside 140 m x 140 m; max height ~10 m.
 * Axes: +x = east, -z = north (back of the scene), +z = south / main road (front).
 */

export const meta = {
  id: 'villa-community',
  name: { en: 'Lagoon Villa Community', ar: 'مجتمع فلل البحيرات' },
  projectSlug: 'lagoon-villa-community',
  tagline: {
    en: 'A gated community of white villas with private gardens, set around lagoon pools.',
    ar: 'مجتمع مسوَّر من الفلل البيضاء ذات الحدائق الخاصة، يلتفّ حول بحيرات اصطناعية.',
  },
  descriptors: [
    { label: { en: 'Typology', ar: 'النمط' }, value: { en: 'Gated villa community', ar: 'مجتمع فلل مسوَّر' } },
    { label: { en: 'Massing', ar: 'الكتلة' }, value: { en: 'Low-rise villas with roof terraces', ar: 'فلل منخفضة الارتفاع مع أسطح مفتوحة' } },
    { label: { en: 'Landscape', ar: 'تنسيق الموقع' }, value: { en: 'Lagoon pools and a tree-lined boulevard', ar: 'بحيرات اصطناعية وجادّة مشجّرة' } },
    { label: { en: 'Amenities', ar: 'المرافق' }, value: { en: 'Commercial strip along the main road', ar: 'شريط تجاري على امتداد الطريق الرئيسي' } },
    { label: { en: 'Model', ar: 'النموذج' }, value: { en: 'Illustrative massing — not to scale', ar: 'نموذج كتلي توضيحي — ليس بمقياس رسم' } },
  ],
  camera: {
    target: [0, 1, 2],
    aerial: [88, 98, 146],
    street: [38.6, 1.7, 56.4],
    top: [0, 215, 0.01],
    front: [0, 40, 122],
  },
  hotspots: [
    {
      id: 'lagoons', position: [-4, 2.5, -6],
      title: { en: 'Lagoon pools', ar: 'البحيرات الاصطناعية' },
      text: {
        en: 'Free-form lagoon pools with sandy decks form the green heart of the community, as shown in the render.',
        ar: 'بحيرات اصطناعية حرّة التشكيل بأرصفة رملية تشكّل القلب الأخضر للمجتمع، كما يظهر في التصوّر.',
      },
    },
    {
      id: 'villas', position: [-22, 10.5, -56],
      title: { en: 'Villa rows', ar: 'صفوف الفلل' },
      text: {
        en: 'White low-rise villas with roof terraces, private gardens and pools, set along quiet internal streets.',
        ar: 'فلل بيضاء منخفضة الارتفاع مع أسطح مفتوحة وحدائق ومسابح خاصة على امتداد شوارع داخلية هادئة.',
      },
    },
    {
      id: 'boulevard', position: [30, 7, -28],
      title: { en: 'Tree-lined boulevard', ar: 'الجادّة المشجّرة' },
      text: {
        en: 'A boulevard with a planted median and shaded sidewalks links the entrance to every street.',
        ar: 'جادّة بجزيرة وسطية مزروعة وأرصفة مظلّلة تربط المدخل بجميع الشوارع.',
      },
    },
    {
      id: 'commercial', position: [-45, 10.4, 47.6],
      title: { en: 'Commercial strip', ar: 'الشريط التجاري' },
      text: {
        en: 'Shops and dining behind a shaded colonnade, with a café plaza and roof-terrace pergolas along the main road.',
        ar: 'متاجر ومطاعم خلف رواق مظلّل، مع ساحة مقاهٍ وبرجولات على السطح على امتداد الطريق الرئيسي.',
      },
    },
    {
      id: 'gate', position: [30, 7.5, 36],
      title: { en: 'Gated entrance', ar: 'المدخل المسوَّر' },
      text: {
        en: 'A canopied gatehouse marks the controlled entry from the main road into the community.',
        ar: 'بوابة بمظلّة تحدّد الدخول المنظّم من الطريق الرئيسي إلى المجتمع.',
      },
    },
  ],
  // azimuth: degrees around +Y measured from +Z (front/south) towards +X (east);
  // elevation: degrees above the horizon. -> light comes from the front-left.
  sun: { azimuth: -38, elevation: 44 },
};

/* ------------------------------------------------------------------------ */
/* Layout constants (metres)                                                */
/* ------------------------------------------------------------------------ */
const L = {
  half: 70,
  // Main road (east–west) along the south edge
  road: { z0: 57, z1: 69 },
  // Boulevard (north–south) with a planted median
  blvd: { x0: 23, x1: 37, medX0: 29, medX1: 31, z0: -68.5, z1: 57 },
  walkW: { x0: 20, x1: 23 }, // west sidewalk of boulevard
  walkE: { x0: 37, x1: 40 }, // east sidewalk
  // Internal streets (east–west) in the west zone
  streets: [{ z0: -46, z1: -40 }, { z0: 8, z1: 14 }],
  streetX0: -66,
  wallZ: 34, // southern community wall (behind the commercial strip)
  gate: { z: 36, x0: 20, x1: 40 },
  // Villas: rows (west zone) + one column (east of boulevard)
  villaXs: [-58, -40, -22, -4, 14],
  rows: [
    { z: -56, rot: 0, pools: 'alt0' },        // north row, faces south (+z)
    { z: -30, rot: Math.PI, pools: 'all' },   // faces north, gardens to the park
    { z: 23.5, rot: Math.PI, pools: 'alt1' }, // faces north onto street B
  ],
  eastCol: { x: 50, zs: [-58, -40, -22, -4, 14], rot: -Math.PI / 2 }, // faces west
  // Commercial strip (two blocks)
  shops: [
    { id: 'retail-west', x0: -66, x1: -24 },
    { id: 'retail-east', x0: -18, x1: 16 },
  ],
  shopZ0: 36, shopZ1: 48, // ground-floor enclosure (south face at z = 48)
  lot: { x0: 41, x1: 68, z0: 39, z1: 55 },
  lagoons: [
    { cx: -4, cz: -6, rx: 13.5, rz: 7.6, rot: 0.08, seed: 1.3, beach: 2.3 },
    { cx: -48, cz: -6, rx: 9.0, rz: 6.6, rot: -0.35, seed: 4.1, beach: -0.6 },
  ],
};

/* ------------------------------------------------------------------------ */
/* Small deterministic PRNG so the layout is identical on every load        */
/* ------------------------------------------------------------------------ */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------------ */
/* build()                                                                  */
/* ------------------------------------------------------------------------ */
export function build(THREE, ctx = {}) {
  const HIGH = ctx.quality !== 'low';
  const envMap = ctx.envMap || null;
  const rand = mulberry32(20010);

  /* ---- resource tracking (for dispose) --------------------------------- */
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const instancedMeshes = [];
  const tg = (g) => (geometries.add(g), g);
  const tm = (m) => (materials.add(m), m);

  /* ---- materials ------------------------------------------------------- */
  const std = (p) => tm(new THREE.MeshStandardMaterial(p));
  const M = {
    wall: std({ name: 'villa-white-render', color: 0xf4f2ee, roughness: 0.82, metalness: 0 }),
    wallWarm: std({ name: 'shop-white-render', color: 0xefece6, roughness: 0.78, metalness: 0 }),
    stone: std({ name: 'limestone', color: 0xd9d1c2, roughness: 0.88, metalness: 0 }),
    frame: std({ name: 'dark-aluminium', color: 0x2a3036, roughness: 0.42, metalness: 0.55, envMap, envMapIntensity: 1 }),
    glass: tm(new THREE.MeshPhysicalMaterial({
      name: 'glazing', color: 0xa9c4cf, roughness: 0.06, metalness: 0.1, transmission: 0,
      transparent: true, opacity: 0.42, envMap, envMapIntensity: 1.2, clearcoat: 0.6, clearcoatRoughness: 0.08,
      depthWrite: false,
    })),
    // Interior panels sit behind the glazing: dark by day, warm glow at night.
    interior: std({ name: 'interior-glow', color: 0x2f353c, roughness: 0.9, metalness: 0, emissive: 0xffc985, emissiveIntensity: 0 }),
    wood: std({ name: 'timber', color: 0x7a5f4b, roughness: 0.75, metalness: 0 }),
    teal: std({ name: 'mobco-teal-accent', color: 0x6fd1c5, roughness: 0.35, metalness: 0.2, emissive: 0x6fd1c5, emissiveIntensity: 0 }),
    sand: std({ name: 'lagoon-sand-deck', color: 0xe6d6b8, roughness: 0.95, metalness: 0 }),
    coping: std({ name: 'pool-coping', color: 0xf1ede4, roughness: 0.7, metalness: 0 }),
    grass: std({ name: 'lawn', color: 0x91a871, roughness: 1, metalness: 0 }),
    hedge: std({ name: 'hedge', color: 0x4f6c3f, roughness: 0.95, metalness: 0 }),
    asphalt: std({ name: 'asphalt', color: 0x40454b, roughness: 0.93, metalness: 0 }),
    paving: std({ name: 'paving', color: 0xdcd6cb, roughness: 0.9, metalness: 0 }),
    marking: std({ name: 'road-marking', color: 0xf3f1ea, roughness: 0.7, metalness: 0 }),
    trunk: std({ name: 'tree-trunk', color: 0x6d5a48, roughness: 0.95, metalness: 0 }),
    leafA: std({ name: 'foliage-a', color: 0x5b7f47, roughness: 0.9, metalness: 0 }),
    leafB: std({ name: 'foliage-b', color: 0x48693a, roughness: 0.9, metalness: 0 }),
    leafC: std({ name: 'foliage-c', color: 0x6d8f52, roughness: 0.9, metalness: 0 }),
    palm: std({ name: 'palm-fronds', color: 0x51773f, roughness: 0.85, metalness: 0, side: THREE.DoubleSide }),
    canvas: std({ name: 'canvas-white', color: 0xf7f5f0, roughness: 0.85, metalness: 0, side: THREE.DoubleSide }),
    lampHead: std({ name: 'lamp-head', color: 0xe9e6df, roughness: 0.5, metalness: 0.1, emissive: 0xffd9a0, emissiveIntensity: 0 }),
    tyre: std({ name: 'car-tyre', color: 0x1c1f22, roughness: 0.9, metalness: 0 }),
    carGlass: std({ name: 'car-glass', color: 0x1f2a33, roughness: 0.15, metalness: 0.5, envMap, envMapIntensity: 1 }),
    car: [
      std({ name: 'car-white', color: 0xf2f2f0, roughness: 0.3, metalness: 0.4 }),
      std({ name: 'car-silver', color: 0xb9bec3, roughness: 0.3, metalness: 0.6 }),
      std({ name: 'car-graphite', color: 0x50565c, roughness: 0.32, metalness: 0.55 }),
      std({ name: 'car-navy', color: 0x24384b, roughness: 0.32, metalness: 0.5 }),
    ],
  };

  // Procedural, tileable normal map for the water shimmer (no network textures).
  const waterNormal = makeWaterNormal(THREE, 256);
  textures.add(waterNormal);
  M.water = tm(new THREE.MeshPhysicalMaterial({
    name: 'lagoon-water-deep', color: 0x1d8bab, roughness: 0.14, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.1,
    normalMap: waterNormal, normalScale: new THREE.Vector2(0.12, 0.12), envMap, envMapIntensity: 0.8,
    emissive: 0x1fb9d0, emissiveIntensity: 0,
  }));
  M.waterShallow = tm(new THREE.MeshPhysicalMaterial({
    name: 'lagoon-water-shallow', color: 0x4fb6c4, roughness: 0.14, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.1,
    normalMap: waterNormal, normalScale: new THREE.Vector2(0.1, 0.1), envMap, envMapIntensity: 0.8,
    emissive: 0x3fd6dc, emissiveIntensity: 0,
  }));

  // HDR interior glow (peak at emissiveIntensity 1): the villas' small, recessed openings need more than
  // the commercial strip's big shopfronts to read as lit after dusk
  M.interior.emissive.multiplyScalar(1.7);
  const nightMaterials = [M.interior, M.lampHead, M.teal, M.water, M.waterShallow];

  /* ---- scene graph ----------------------------------------------------- */
  const root = new THREE.Group(); root.name = 'villa-community';
  const site = new THREE.Group(); site.name = 'site';
  const buildings = new THREE.Group(); buildings.name = 'buildings';
  root.add(site, buildings);

  /* ---- geometry kit ---------------------------------------------------- */
  // A Bin collects geometry pieces per material key, then merges them into
  // one BufferGeometry per key (few draw calls, ideal for instancing).
  class Bin {
    constructor() { this.parts = new Map(); }
    add(key, g) { if (!this.parts.has(key)) this.parts.set(key, []); this.parts.get(key).push(g); return g; }
    /** Axis-aligned box from two opposite corners (any order). */
    box(key, x0, y0, z0, x1, y1, z1) {
      const ax = Math.min(x0, x1), bx = Math.max(x0, x1);
      const ay = Math.min(y0, y1), by = Math.max(y0, y1);
      const az = Math.min(z0, z1), bz = Math.max(z0, z1);
      const g = new THREE.BoxGeometry(bx - ax, by - ay, bz - az);
      g.translate((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
      return this.add(key, g);
    }
    /** Merge every key -> Map<key, BufferGeometry>. */
    merged() {
      const out = new Map();
      for (const [k, list] of this.parts) out.set(k, mergeGeometries(THREE, list));
      return out;
    }
  }

  /**
   * Window on a facade: dark frame plate, interior panel (glows at night),
   * glass skin and optional mullions / transom, stacked out from the wall face.
   * face: 'px' | 'nx' | 'pz' | 'nz'; at: facade plane coordinate;
   * u: centre along the facade (z for x-faces, x for z-faces); y0: sill height.
   */
  function windowOn(bin, face, at, u, y0, w, h, o = {}) {
    const s = face[0] === 'p' ? 1 : -1;
    const onX = face[1] === 'x';
    const layer = (u0, u1, v0, v1, n0, n1, key) => {
      if (onX) bin.box(key, at + s * n0, v0, u0, at + s * n1, v1, u1);
      else bin.box(key, u0, v0, at + s * n0, u1, v1, at + s * n1);
    };
    const f = o.frame ?? 0.08;
    layer(u - w / 2 - f, u + w / 2 + f, y0 - f, y0 + h + f, 0, 0.05, 'frame');
    if (o.door) { layer(u - w / 2, u + w / 2, y0, y0 + h, 0.05, 0.08, 'wood'); return; }
    layer(u - w / 2, u + w / 2, y0, y0 + h, 0.05, 0.07, 'interior');
    layer(u - w / 2, u + w / 2, y0, y0 + h, 0.1, 0.11, 'glass');
    const m = o.mullions || 0;
    for (let i = 1; i <= m; i++) {
      const uu = u - w / 2 + (i * w) / (m + 1);
      layer(uu - 0.035, uu + 0.035, y0, y0 + h, 0.11, 0.14, 'frame');
    }
    if (o.transom) layer(u - w / 2, u + w / 2, y0 + o.transom - 0.035, y0 + o.transom + 0.035, 0.11, 0.14, 'frame');
  }

  /** Glass balustrade with a slim top rail, running along x or z. */
  function balustrade(bin, axis, at, a0, a1, y0, h = 1.05) {
    if (axis === 'x') { bin.box('glass', a0, y0, at - 0.02, a1, y0 + h, at + 0.02); bin.box('frame', a0, y0 + h, at - 0.04, a1, y0 + h + 0.06, at + 0.04); }
    else { bin.box('glass', at - 0.02, y0, a0, at + 0.02, y0 + h, a1); bin.box('frame', at - 0.04, y0 + h, a0, at + 0.04, y0 + h + 0.06, a1); }
  }

  /** Pergola: four posts, two beams and slats spanning the short side. */
  function pergola(bin, x0, z0, x1, z1, y0, h, o = {}) {
    const post = o.post || 'frame', slat = o.slat || 'wood', p = 0.16;
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) bin.box(post, x - p / 2, y0, z - p / 2, x + p / 2, y0 + h, z + p / 2);
    const alongX = (x1 - x0) >= (z1 - z0);
    if (alongX) {
      bin.box(post, x0 - 0.2, y0 + h - 0.25, z0 - 0.09, x1 + 0.2, y0 + h, z0 + 0.09);
      bin.box(post, x0 - 0.2, y0 + h - 0.25, z1 - 0.09, x1 + 0.2, y0 + h, z1 + 0.09);
      const n = Math.max(2, Math.round((x1 - x0) / (o.pitch || 0.45)));
      for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n; bin.box(slat, x - 0.05, y0 + h, z0 - 0.35, x + 0.05, y0 + h + 0.14, z1 + 0.35); }
    } else {
      bin.box(post, x0 - 0.09, y0 + h - 0.25, z0 - 0.2, x0 + 0.09, y0 + h, z1 + 0.2);
      bin.box(post, x1 - 0.09, y0 + h - 0.25, z0 - 0.2, x1 + 0.09, y0 + h, z1 + 0.2);
      const n = Math.max(2, Math.round((z1 - z0) / (o.pitch || 0.45)));
      for (let i = 0; i <= n; i++) { const z = z0 + ((z1 - z0) * i) / n; bin.box(slat, x0 - 0.35, y0 + h, z - 0.05, x1 + 0.35, y0 + h + 0.14, z + 0.05); }
    }
  }

  /** Parapet ring (4 boxes) around a rectangle. */
  function parapet(bin, key, x0, z0, x1, z1, y0, h, t = 0.22) {
    bin.box(key, x0, y0, z0, x1, y0 + h, z0 + t);
    bin.box(key, x0, y0, z1 - t, x1, y0 + h, z1);
    bin.box(key, x0, y0, z0 + t, x0 + t, y0 + h, z1 - t);
    bin.box(key, x1 - t, y0, z0 + t, x1, y0 + h, z1 - t);
  }

  const matFor = (key) => {
    const m = M[key];
    if (!m) throw new Error(`villa-community: unknown material key "${key}"`);
    return m;
  };

  /** Plain (non-instanced) meshes from a bin, one per material key. */
  function meshesFromBin(bin, parent, prefix, opts = {}) {
    for (const [key, geo] of bin.merged()) {
      tg(geo);
      const mesh = new THREE.Mesh(geo, matFor(key));
      mesh.name = `${prefix}-${key}`;
      applyShadow(mesh, key, opts);
      parent.add(mesh);
    }
  }

  /** InstancedMesh per material key of a bin, placed with the given matrices. */
  function instancedFromBin(bin, parent, prefix, matrices, opts = {}) {
    const out = [];
    for (const [key, geo] of bin.merged()) {
      tg(geo);
      out.push(makeInstanced(`${prefix}-${key}`, geo, matFor(key), matrices, parent, key, opts));
    }
    return out;
  }

  function makeInstanced(name, geo, mat, matrices, parent, key = '', opts = {}) {
    const im = new THREE.InstancedMesh(geo, mat, matrices.length);
    im.name = name;
    matrices.forEach((m, i) => im.setMatrixAt(i, m));
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    applyShadow(im, key, opts);
    instancedMeshes.push(im);
    parent.add(im);
    return im;
  }

  const NO_CAST = new Set(['glass', 'interior', 'marking', 'grass', 'asphalt', 'paving', 'water', 'waterShallow', 'sand', 'lampHead', 'teal']);
  function applyShadow(mesh, key, opts) {
    mesh.castShadow = opts.cast ?? !NO_CAST.has(key);
    mesh.receiveShadow = opts.receive ?? key !== 'glass';
  }

  const mat4 = (x, y, z, ry = 0, s = 1, sy = s) => {
    const m = new THREE.Matrix4();
    m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(s, sy, s));
    return m;
  };

  /* ===================================================================== */
  /* 1. FLOOR GROUPS                                                       */
  /* ===================================================================== */
  const floorDefs = [];
  const mkFloor = (buildingId, level, en, ar) => {
    const g = new THREE.Group();
    g.name = `${buildingId}-L${level}`;
    g.userData = { level, label: { en, ar }, buildingId };
    buildings.add(g);
    floorDefs.push(g);
    return g;
  };
  const villaFloors = [
    mkFloor('villas', 0, 'Villas — ground floor', 'الفلل — الطابق الأرضي'),
    mkFloor('villas', 1, 'Villas — first floor', 'الفلل — الطابق الأول'),
    mkFloor('villas', 2, 'Villas — roof terraces', 'الفلل — الأسطح'),
  ];
  const shopFloors = {};
  for (const s of L.shops) {
    const nm = s.id === 'retail-west' ? ['West', 'الغربي'] : ['East', 'الشرقي'];
    shopFloors[s.id] = [
      mkFloor(s.id, 0, `Commercial ${nm[0]} — retail arcade`, `المبنى التجاري ${nm[1]} — رواق المتاجر`),
      mkFloor(s.id, 1, `Commercial ${nm[0]} — upper level`, `المبنى التجاري ${nm[1]} — المستوى العلوي`),
      mkFloor(s.id, 2, `Commercial ${nm[0]} — roof terrace`, `المبنى التجاري ${nm[1]} — السطح`),
    ];
  }
  // Contract: ordered bottom -> top
  const floors = floorDefs.slice().sort((a, b) => a.userData.level - b.userData.level);

  /* ===================================================================== */
  /* 2. VILLAS (two typologies, instanced)                                 */
  /* ===================================================================== */
  // Local frame: front facade faces +z, footprint ~11 m x 10 m, centred at origin.
  const GF0 = 0.3, GF1 = 3.6, SLAB1 = 3.85, FF1 = 7.0, CAP1 = 7.3;

  /** Type A — L-shaped upper floor with a pergola-shaded terrace. */
  function villaTypeA() {
    const b = [new Bin(), new Bin(), new Bin()];
    const [g, f, r] = b;
    // Ground floor
    g.box('stone', -6.0, 0, -5.6, 6.0, GF0, 5.6);
    g.box('wall', -5.5, GF0, -5.0, 5.5, GF1, 4.6);
    g.box('wall', -5.75, GF1, -5.25, 5.75, SLAB1, 4.9);           // crisp slab edge
    g.box('stone', 1.3, GF0, 4.6, 4.3, GF1, 4.75);                // stone-clad entrance wall
    g.box('wall', 1.0, 3.0, 4.75, 4.6, 3.22, 6.2);               // entrance canopy
    windowOn(g, 'pz', 4.6, -2.4, 0.5, 5.0, 2.75, { mullions: 2 });
    windowOn(g, 'pz', 4.75, 2.8, 0.42, 1.2, 2.45, { door: true });
    windowOn(g, 'nz', -5.0, -0.6, 0.5, 7.0, 2.75, { mullions: 3 });
    windowOn(g, 'px', 5.5, -1.2, 1.5, 1.4, 1.4);
    windowOn(g, 'nx', -5.5, 0.4, 0.5, 3.0, 2.75, { mullions: 1 });
    // First floor (west part) + terrace on the east part of the GF roof
    f.box('wall', -5.5, SLAB1, -5.0, 1.5, FF1, 3.6);
    f.box('wall', -5.8, FF1, -5.3, 1.8, CAP1, 3.95);
    f.box('wall', 5.45, SLAB1, -5.25, 5.75, SLAB1 + 1.0, 4.9);   // terrace parapets
    f.box('wall', 1.5, SLAB1, 4.6, 5.45, SLAB1 + 1.0, 4.9);
    f.box('stone', 1.5, SLAB1, -5.0, 5.45, SLAB1 + 0.06, 4.6);    // terrace paving
    windowOn(f, 'pz', 3.6, -3.4, SLAB1 + 0.35, 1.5, 2.5);
    windowOn(f, 'pz', 3.6, -0.6, SLAB1 + 0.35, 2.2, 2.5, { mullions: 1 });
    windowOn(f, 'px', 1.5, 0.6, SLAB1 + 0.15, 3.6, 2.6, { mullions: 2 });
    windowOn(f, 'nz', -5.0, -2.0, SLAB1 + 1.1, 4.0, 1.5, { mullions: 1 });
    windowOn(f, 'nx', -5.5, -1.0, SLAB1 + 0.3, 0.9, 2.4);
    pergola(f, 2.0, -1.2, 5.1, 4.2, SLAB1 + 0.06, 2.75, { post: 'wall', slat: 'wood', pitch: 0.42 });
    // Roof: parapet + stair pavilion
    parapet(r, 'wall', -5.8, -5.3, 1.8, 3.95, CAP1, 0.45, 0.2);
    r.box('wall', -5.2, CAP1, -4.9, -2.3, 9.5, -1.9);
    r.box('wall', -5.35, 9.5, -5.05, -2.15, 9.7, -1.75);
    windowOn(r, 'px', -2.3, -3.4, CAP1 + 0.2, 1.0, 1.9, { door: true });
    r.box('frame', -1.4, CAP1 + 0.08, -4.6, 0.9, CAP1 + 0.3, -2.0); // low solar array
    return b;
  }

  /** Type B — cubic villa with a framed front loggia. */
  function villaTypeB() {
    const b = [new Bin(), new Bin(), new Bin()];
    const [g, f, r] = b;
    g.box('stone', -5.7, 0, -5.6, 5.7, GF0, 5.4);
    g.box('wall', -5.2, GF0, -5.0, 5.2, GF1, 4.4);
    g.box('wall', -5.45, GF1, -5.25, 5.45, SLAB1, 4.75);
    g.box('stone', -5.2, GF0, 4.4, -3.4, GF1, 4.56);              // stone feature panel
    windowOn(g, 'pz', 4.4, 0.4, 0.5, 4.8, 2.75, { mullions: 2 });
    windowOn(g, 'pz', 4.4, 3.95, 0.42, 1.2, 2.45, { door: true });
    windowOn(g, 'nz', -5.0, 0.0, 0.5, 6.4, 2.75, { mullions: 3 });
    windowOn(g, 'px', 5.2, 1.0, 1.4, 2.4, 1.5, { mullions: 1 });
    windowOn(g, 'nx', -5.2, -1.4, 1.4, 1.2, 1.5);
    // First floor: set back 2.4 m behind a white portal frame
    f.box('wall', -4.9, SLAB1, -5.0, 4.9, FF1, 2.0);
    f.box('wall', -5.2, SLAB1, -5.0, -4.85, CAP1, 4.75);          // portal side fins
    f.box('wall', 4.85, SLAB1, -5.0, 5.2, CAP1, 4.75);
    f.box('wall', -5.2, FF1, -5.25, 5.2, CAP1, 4.75);             // portal head / roof slab
    f.box('stone', -4.85, SLAB1, 2.0, 4.85, SLAB1 + 0.06, 4.6);  // loggia floor
    balustrade(f, 'x', 4.5, -4.85, 4.85, SLAB1 + 0.06);
    windowOn(f, 'pz', 2.0, 0.0, SLAB1 + 0.15, 7.6, 2.65, { mullions: 3 });
    windowOn(f, 'nz', -5.0, 1.5, SLAB1 + 1.0, 3.2, 1.5, { mullions: 1 });
    windowOn(f, 'nx', -5.2, -2.2, SLAB1 + 0.5, 1.0, 2.2);
    windowOn(f, 'px', 5.2, -2.2, SLAB1 + 0.5, 1.0, 2.2);
    // Roof
    parapet(r, 'wall', -5.2, -5.25, 5.2, 4.75, CAP1, 0.45, 0.2);
    r.box('wall', 1.6, CAP1, -4.85, 4.6, 9.45, -1.85);
    r.box('wall', 1.45, 9.45, -5.0, 4.75, 9.65, -1.7);
    windowOn(r, 'nx', 1.6, -3.3, CAP1 + 0.2, 1.0, 1.9, { door: true });
    pergola(r, -4.4, -0.2, 0.4, 3.9, CAP1, 2.4, { post: 'frame', slat: 'wood', pitch: 0.5 });
    r.box('wood', -4.6, CAP1, -0.4, 0.6, CAP1 + 0.08, 4.1);       // roof deck
    return b;
  }

  // Villa placements (alternating typologies, rotated to face their street)
  const villas = []; // { x, z, rot, type, pool }
  L.rows.forEach((row, ri) => {
    L.villaXs.forEach((x, i) => {
      const pool = row.pools === 'all' || (row.pools === 'alt0' && i % 2 === 0) || (row.pools === 'alt1' && i % 2 === 1);
      villas.push({ x, z: row.z, rot: row.rot, type: (i + ri) % 2 ? 'B' : 'A', pool });
    });
  });
  L.eastCol.zs.forEach((z, i) => villas.push({ x: L.eastCol.x, z, rot: L.eastCol.rot, type: i % 2 ? 'A' : 'B', pool: true }));

  for (const [type, maker] of [['A', villaTypeA], ['B', villaTypeB]]) {
    const list = villas.filter((v) => v.type === type);
    const mats = list.map((v) => mat4(v.x, 0, v.z, v.rot));
    const bins = maker();
    bins.forEach((bin, level) => instancedFromBin(bin, villaFloors[level], `villa${type}-L${level}`, mats));
  }

  /* ---- villa gardens (site): driveways, private pools, hedges ---------- */
  {
    const drive = new Bin();
    drive.box('paving', 1.0, 0, 5.6, 4.6, 0.1, 7.9);
    drive.box('paving', -0.4, 0, 5.6, 0.8, 0.1, 7.0);   // path to door zone
    const vm = villas.map((v) => mat4(v.x, 0, v.z, v.rot));
    instancedFromBin(drive, site, 'villa-driveway', vm, { cast: false });

    // Private pool: coping ring + water, in the back garden (local -z)
    const pool = new Bin();
    const px0 = -4.6, px1 = 2.4, pz0 = -9.0, pz1 = -6.1, c = 0.35;
    parapet(pool, 'coping', px0 - c, pz0 - c, px1 + c, pz1 + c, 0, 0.24, c);
    pool.box('water', px0, 0, pz0, px1, 0.16, pz1);
    pool.box('stone', px1 + c, 0, pz0 - c, px1 + 2.6, 0.12, pz1 + c); // sun deck
    const pm = villas.filter((v) => v.pool).map((v) => mat4(v.x, 0, v.z, v.rot));
    instancedFromBin(pool, site, 'villa-pool', pm, { cast: false });
  }

  /* ===================================================================== */
  /* 3. COMMERCIAL STRIP (two blocks, three levels each)                   */
  /* ===================================================================== */
  const Z0 = L.shopZ0, Z1 = L.shopZ1; // ground enclosure; colonnade to z = 50
  const SG0 = 0.35, SG1 = 4.5, SS1 = 5.1, SU1 = 8.8, SCAP = 9.15;
  for (const s of L.shops) {
    const [g, f, r] = [new Bin(), new Bin(), new Bin()];
    const { x0, x1 } = s, W = x1 - x0, cx = (x0 + x1) / 2;
    // --- Level 0: podium, enclosure, storefront, colonnade
    g.box('stone', x0 - 0.3, 0, Z0 - 0.3, x1 + 0.3, SG0, 50.4);
    g.box('wallWarm', x0, SG0, Z0, x1, SG1, Z1);
    const bays = Math.round(W / 6);
    const bayW = W / bays;
    for (let i = 0; i < bays; i++) {
      const bc = x0 + bayW * (i + 0.5);
      windowOn(g, 'pz', Z1, bc, SG0 + 0.05, bayW - 0.9, 3.55, { mullions: 2, transom: 2.75, frame: 0.1 });
    }
    for (let i = 0; i <= bays; i++) {
      const x = x0 + bayW * i;
      g.box('wallWarm', x - 0.25, SG0, 49.2, x + 0.25, SG1, 49.7);
    }
    windowOn(g, 'px', x1, 42, SG0 + 0.1, 6, 3.3, { mullions: 3, transom: 2.6 });
    windowOn(g, 'nx', x0, 42, SG0 + 0.1, 6, 3.3, { mullions: 3, transom: 2.6 });
    for (let x = x0 + 4; x < x1 - 3; x += 9) windowOn(g, 'nz', Z0, x, SG0 + 0.05, 1.6, 2.6, { door: true });
    // --- Level 1: slab (cantilevers over the colonnade), upper storey, terrace
    f.box('wallWarm', x0 - 0.2, SG1, Z0 - 0.2, x1 + 0.2, SS1, 50.2);
    f.box('teal', x0 + 0.4, SG1 + 0.22, 50.2, x1 - 0.4, SG1 + 0.3, 50.25); // hairline accent
    f.box('wallWarm', x0, SS1, Z0, x1, SU1, 46.5);
    f.box('wallWarm', x0 - 0.3, SU1, Z0 - 0.3, x1 + 0.3, SCAP, 46.85);
    f.box('stone', x0, SS1, 46.5, x1, SS1 + 0.05, 50.0);
    balustrade(f, 'x', 49.95, x0 + 0.1, x1 - 0.1, SS1 + 0.05);
    const fins = Math.round(W / 2.4);
    windowOn(f, 'pz', 46.5, cx, SS1 + 0.3, W - 1.2, 3.0, { mullions: fins * 2 - 1, transom: 2.3, frame: 0.1 });
    for (let i = 1; i < fins; i++) {
      const x = x0 + (W * i) / fins;
      f.box('wallWarm', x - 0.08, SS1, 46.5, x + 0.08, SU1, 47.2);
    }
    windowOn(f, 'px', x1, 41, SS1 + 0.6, 7, 2.3, { mullions: 3 });
    windowOn(f, 'nx', x0, 41, SS1 + 0.6, 7, 2.3, { mullions: 3 });
    for (let x = x0 + 3; x < x1 - 2; x += 6) windowOn(f, 'nz', Z0, x, SS1 + 1.0, 3.0, 1.6, { mullions: 1 });
    // --- Level 2: roof terrace with pergolas, planters, plant screen
    parapet(r, 'wallWarm', x0 - 0.3, Z0 - 0.3, x1 + 0.3, 46.85, SCAP, 0.75, 0.25);
    const deckX0 = x0 + 2, deckX1 = x0 + Math.min(18, W * 0.5);
    r.box('wood', deckX0, SCAP, 39.5, deckX1, SCAP + 0.1, 45.8);
    const pw = (deckX1 - deckX0 - 1.5) / 2;
    pergola(r, deckX0 + 0.5, 40.4, deckX0 + 0.5 + pw, 45.0, SCAP + 0.1, 2.7, { pitch: 0.5 });
    pergola(r, deckX1 - 0.5 - pw, 40.4, deckX1 - 0.5, 45.0, SCAP + 0.1, 2.7, { pitch: 0.5 });
    for (let x = deckX0; x < deckX1 - 1; x += 3.2) {
      r.box('stone', x, SCAP, 45.9, x + 2.4, SCAP + 0.6, 46.5);
      r.box('hedge', x + 0.1, SCAP + 0.6, 45.95, x + 2.3, SCAP + 1.1, 46.45);
    }
    r.box('wallWarm', x1 - 9, SCAP, 37.5, x1 - 2, SCAP + 1.9, 41.5);     // plant enclosure
    for (let x = x1 - 8.6; x < x1 - 2.2; x += 0.5) r.box('frame', x, SCAP + 0.3, 41.5, x + 0.12, SCAP + 1.7, 41.62);
    r.box('glass', cx - 3, SCAP, 38.2, cx + 3, SCAP + 0.5, 40.2);         // skylight
    r.box('frame', cx - 3.1, SCAP, 38.1, cx + 3.1, SCAP + 0.15, 40.3);

    const fl = shopFloors[s.id];
    meshesFromBin(g, fl[0], `${s.id}-L0`);
    meshesFromBin(f, fl[1], `${s.id}-L1`);
    meshesFromBin(r, fl[2], `${s.id}-L2`);
  }

  /* ===================================================================== */
  /* 4. SITE: ground surfaces, roads, walls, gate, lagoons                 */
  /* ===================================================================== */
  const ground = new Bin();
  const H = L.half;
  // Lawn base for the whole site (top at y = 0.03)
  ground.box('grass', -H, 0, -H, H, 0.03, H);
  // Main road + sidewalks + markings
  ground.box('asphalt', -H, 0, L.road.z0, H, 0.06, L.road.z1);
  ground.box('paving', -H, 0, L.road.z1, H, 0.12, H);
  for (let x = -H + 2; x + 3.5 < H - 1; x += 9) {
    ground.box('marking', x, 0.05, 59.92, x + 3.5, 0.075, 60.08);
    ground.box('marking', x, 0.05, 65.92, x + 3.5, 0.075, 66.08);
  }
  ground.box('marking', -H, 0.05, 62.82, H, 0.075, 62.94);
  ground.box('marking', -H, 0.05, 63.06, H, 0.075, 63.18);
  // Plaza in front of the commercial strip
  ground.box('paving', -H, 0, L.wallZ + 0.2, L.walkW.x1, 0.12, L.road.z0);
  // Boulevard carriageways, sidewalks, median
  const B = L.blvd;
  ground.box('asphalt', B.x0, 0, B.z0, B.x1, 0.06, B.z1);
  for (let z = B.z0 + 4; z < 30; z += 8) {
    ground.box('marking', 25.92, 0.05, z, 26.08, 0.075, z + 3);
    ground.box('marking', 33.92, 0.05, z, 34.08, 0.075, z + 3);
  }
  for (const [z0, z1] of [[-63, 31], [39.5, 45]]) {
    ground.box('stone', B.medX0, 0, z0, B.medX1, 0.2, z1);
    ground.box('hedge', B.medX0 + 0.15, 0.1, z0 + 0.15, B.medX1 - 0.15, 0.24, z1 - 0.15);
  }
  // Sidewalks (west one is cut by the two internal streets; east one by the lot entry)
  const cutW = [[-68.5, -46], [-40, 8], [14, L.wallZ + 0.2]];
  for (const [z0, z1] of cutW) ground.box('paving', L.walkW.x0, 0, z0, L.walkW.x1, 0.12, z1);
  for (const [z0, z1] of [[-68.5, 44], [50, 57]]) ground.box('paving', L.walkE.x0, 0, z0, L.walkE.x1, 0.12, z1);
  // Internal streets with narrow sidewalks
  for (const st of L.streets) {
    ground.box('asphalt', L.streetX0, 0, st.z0, L.walkW.x1, 0.06, st.z1);
    ground.box('paving', L.streetX0 - 2, 0, st.z0 - 1.5, L.walkW.x0, 0.12, st.z0);
    ground.box('paving', L.streetX0 - 2, 0, st.z1, L.walkW.x0, 0.12, st.z1 + 1.5);
    ground.box('paving', L.streetX0 - 2, 0, st.z0, L.streetX0, 0.12, st.z1);
    for (let x = L.streetX0 + 3; x < 18; x += 8) ground.box('marking', x, 0.05, (st.z0 + st.z1) / 2 - 0.07, x + 3, 0.075, (st.z0 + st.z1) / 2 + 0.07);
  }
  // Parking lot (outside the wall, east of the boulevard)
  const P = L.lot;
  ground.box('asphalt', P.x0, 0, P.z0, P.x1, 0.06, P.z1);
  ground.box('asphalt', L.walkE.x0, 0, 44, P.x0, 0.06, 50);
  for (let x = P.x0 + 1; x <= P.x1 - 1; x += 2.6) {
    ground.box('marking', x - 0.06, 0.05, P.z0 + 0.5, x + 0.06, 0.075, P.z0 + 5.5);
    ground.box('marking', x - 0.06, 0.05, P.z1 - 5.5, x + 0.06, 0.075, P.z1 - 0.5);
  }
  ground.box('paving', P.x0 + 2, 0, 46.2, P.x1 - 2, 0.14, 47.8);   // central planted island
  ground.box('hedge', P.x0 + 2.2, 0.1, 46.4, P.x1 - 2.2, 0.55, 47.6);
  meshesFromBin(ground, site, 'ground', { cast: false, receive: true });
  // the median hedge & island hedge should not cast heavy shadows; fine as receive-only

  // Community wall with stone coping + gate piers
  const walls = new Bin();
  const wallRun = (x0, z0, x1, z1) => {
    walls.box('wall', x0, 0, z0, x1, 2.0, z1);
    const e = 0.06;
    walls.box('stone', Math.min(x0, x1) - e, 2.0, Math.min(z0, z1) - e, Math.max(x0, x1) + e, 2.14, Math.max(z0, z1) + e);
  };
  wallRun(-69.6, -69.6, 69.6, -69.3);
  wallRun(-69.6, -69.3, -69.3, L.wallZ);
  wallRun(69.3, -69.3, 69.6, L.wallZ);
  wallRun(-69.3, L.wallZ - 0.3, L.gate.x0 - 0.4, L.wallZ);
  wallRun(L.gate.x1 + 0.4, L.wallZ - 0.3, 69.3, L.wallZ);
  // Gate canopy on four columns, gatehouse on the median, teal hairlines
  const G = L.gate;
  for (const x of [G.x0 + 0.6, G.x1 - 0.6]) for (const z of [G.z - 2.2, G.z + 2.2]) walls.box('wall', x - 0.18, 0.12, z - 0.18, x + 0.18, 5.2, z + 0.18);
  walls.box('wall', G.x0, 5.2, G.z - 2.7, G.x1, 5.5, G.z + 2.7);
  walls.box('teal', G.x0 + 0.3, 5.31, G.z + 2.7, G.x1 - 0.3, 5.39, G.z + 2.74);
  walls.box('teal', G.x0 + 0.3, 5.31, G.z - 2.74, G.x1 - 0.3, 5.39, G.z - 2.7);
  walls.box('stone', B.medX0 - 0.1, 0, G.z - 1.8, B.medX1 + 0.1, 0.2, G.z + 1.8);
  walls.box('wall', B.medX0 + 0.05, 0.2, G.z - 1.5, B.medX1 - 0.05, 3.0, G.z + 1.5);
  walls.box('wall', B.medX0 - 0.15, 3.0, G.z - 1.7, B.medX1 + 0.15, 3.2, G.z + 1.7);
  windowOn(walls, 'px', B.medX1 - 0.05, G.z, 1.1, 2.4, 1.6, { mullions: 1 });
  windowOn(walls, 'nx', B.medX0 + 0.05, G.z, 1.1, 2.4, 1.6, { mullions: 1 });
  for (const x of [G.x0 - 0.4, G.x1 + 0.4]) walls.box('stone', x - 0.5, 0, L.wallZ - 0.65, x + 0.5, 2.6, L.wallZ + 0.35);
  // Plaza pergolas over café seating (along the main road)
  for (const px of [-60, -44, -8, 6]) pergola(walls, px, 51.4, px + 8, 55.2, 0.12, 3.0, { post: 'frame', slat: 'wall', pitch: 0.4 });
  meshesFromBin(walls, site, 'structures');

  /* ---- Lagoons: free-form pools with sand decks ------------------------- */
  const lagoonOutlines = []; // outer deck outlines (for tree rejection)
  for (const lg of L.lagoons) {
    const N = HIGH ? 120 : 64;
    const edge = lagoonCurve(lg, N);                                   // water edge
    const shallowIn = offsetLoop(edge, -1.6);
    const deckOut = edge.map((p, i) => {
      const a = (i / N) * Math.PI * 2;
      const extra = 2.2 + Math.max(0, Math.cos(a - lg.beach)) * 2.6;  // wider "beach" on one side
      return offsetPoint(edge, i, extra);
    });
    const copingOut = offsetLoop(edge, 0.35);
    lagoonOutlines.push(offsetLoop(deckOut.map((p) => p), 0));

    const deckGeo = tg(ringExtrude(THREE, deckOut, copingOut, 0.14));
    const copeGeo = tg(ringExtrude(THREE, copingOut, edge, 0.2));
    const shallowGeo = tg(flatShape(THREE, edge, shallowIn, 0.11));
    const deepGeo = tg(flatShape(THREE, shallowIn, null, 0.11));
    const add = (geo, m, nm, cast = false) => { const me = new THREE.Mesh(geo, m); me.name = nm; me.castShadow = cast; me.receiveShadow = true; site.add(me); };
    add(deckGeo, M.sand, `lagoon-deck-${lg.cx}`);
    add(copeGeo, M.coping, `lagoon-coping-${lg.cx}`);
    add(shallowGeo, M.waterShallow, `lagoon-water-shallow-${lg.cx}`);
    add(deepGeo, M.water, `lagoon-water-${lg.cx}`);
  }

  /* ---- Café plaza furniture, lagoon loungers & umbrellas (instanced) ---- */
  {
    const umbrella = new Bin();
    umbrella.box('frame', -0.04, 0, -0.04, 0.04, 2.3, 0.04);
    const cone = new THREE.ConeGeometry(1.4, 0.45, HIGH ? 12 : 8, 1, true);
    cone.translate(0, 2.45, 0);
    umbrella.add('canvas', cone);
    umbrella.box('wood', -0.45, 0.7, -0.45, 0.45, 0.76, 0.45);           // table top
    const um = [];
    for (let x = -66; x < 16; x += 4.2) if (!(x > -26 && x < -16)) um.push(mat4(x + 1.5, 0.12, 52.6 + (Math.round(x) % 2 ? 1.4 : 0), 0));
    for (const lg of L.lagoons) {
      for (let k = 0; k < 4; k++) {
        const a = lg.beach + (k - 1.5) * 0.28;
        const p = lagoonPoint(lg, a, 1.0);
        const d = 3.4;
        um.push(mat4(p[0] + Math.cos(a) * d, 0.14, p[1] + Math.sin(a) * d * 0.95, 0));
      }
    }
    instancedFromBin(umbrella, site, 'umbrella', um);

    const lounger = new Bin();
    lounger.box('canvas', -0.35, 0.25, -0.95, 0.35, 0.38, 0.95);
    lounger.box('canvas', -0.35, 0.38, 0.55, 0.35, 0.8, 0.75);
    lounger.box('frame', -0.3, 0, -0.9, 0.3, 0.25, 0.9);
    const lm = [];
    for (const lg of L.lagoons) {
      for (let k = 0; k < 7; k++) {
        const a = lg.beach + (k - 3) * 0.17;
        const p = lagoonPoint(lg, a, 1.0);
        const d = 1.9;
        lm.push(mat4(p[0] + Math.cos(a) * d, 0.14, p[1] + Math.sin(a) * d * 0.95, -a - Math.PI / 2));
      }
    }
    instancedFromBin(lounger, site, 'lounger', lm);
  }

  /* ===================================================================== */
  /* 5. TREES, PALMS, HEDGES                                               */
  /* ===================================================================== */
  const treeSpots = []; // [x, z, scale]
  const palmSpots = []; // [x, z, scale]
  const inLagoon = (x, z, m) => lagoonOutlines.some((poly) => pointInPoly(x, z, poly, m));
  // Boulevard: double rows of shade trees + palms on the median
  for (let z = -64; z <= 30; z += 8) {
    if (!L.streets.some((s) => z > s.z0 - 3 && z < s.z1 + 3)) treeSpots.push([21.5, z, 1.0]);
    treeSpots.push([38.5, z + 4 > 31 ? 30 : z + 4, 1.0]);
  }
  for (let z = -58; z <= 26; z += 12) palmSpots.push([30, z, 1.0]);
  palmSpots.push([30, 42.5, 0.9]);
  // Plaza palms in planters along the main road
  for (let x = -64; x <= 16; x += 10) palmSpots.push([x, 56.2, 1.1]);
  // Central park (avoid lagoons, streets and hedges)
  for (let n = 0, tries = 0; n < (HIGH ? 46 : 28) && tries < 900; tries++) {
    const x = -66 + rand() * 84, z = -18.5 + rand() * 25;
    if (inLagoon(x, z, 1.8)) continue;
    if (treeSpots.some(([tx, tz]) => (tx - x) ** 2 + (tz - z) ** 2 < 9)) continue;
    treeSpots.push([x, z, 0.8 + rand() * 0.45]); n++;
  }
  // Villa gardens: one front tree, one or two in the back garden
  const local = (v, lx, lz) => {
    const c = Math.cos(v.rot), s = Math.sin(v.rot);
    return [v.x + lx * c + lz * s, v.z - lx * s + lz * c];
  };
  for (const v of villas) {
    const f = local(v, -5.0, 7.4); treeSpots.push([f[0], f[1], 0.65]);
    const b1 = local(v, 5.2, -8.2); treeSpots.push([b1[0], b1[1], 0.8 + rand() * 0.25]);
    if (!v.pool) { const b2 = local(v, -2.5, -9.0); treeSpots.push([b2[0], b2[1], 0.75]); }
  }
  // East meadow & around the parking lot
  for (let z = -66; z <= 30; z += 6.5) treeSpots.push([64.8 + (rand() - 0.5) * 1.2, z + rand() * 2, 0.85 + rand() * 0.2]);
  for (let x = 43; x <= 66; x += 5.75) { treeSpots.push([x, 56.3, 0.72]); treeSpots.push([Math.min(x + 2, 65.5), 37.2, 0.72]); }
  for (const z of [-60, -44, -28, -12, 4, 20]) treeSpots.push([-66.6, z, 0.8]);
  // Lawns south of the east villas and beside the gate
  for (const [x, z] of [[45, 27.5], [51, 28.5], [57.5, 27], [48.5, 32], [55, 32.3], [61, 30.5], [43, 23], [17.5, 30.5]]) treeSpots.push([x, z, 0.85 + rand() * 0.2]);

  // Shade tree: trunk + clustered canopy (three blobs at high quality)
  const trunkGeo = tg(new THREE.CylinderGeometry(0.13, 0.2, 1, 6, 1));
  trunkGeo.translate(0, 0.5, 0);
  const canopyGeo = tg(makeCanopy(THREE, HIGH));
  const trunkM = [], canopyM = [[], [], []];
  for (const [x, z, s] of treeSpots) {
    const h = (2.2 + rand() * 0.8) * s;
    trunkM.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(s, h + 1.2 * s, s)));
    const r = (2.0 + rand() * 0.6) * s;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2);
    canopyM[Math.floor(rand() * 3)].push(new THREE.Matrix4().compose(new THREE.Vector3(x, h + r * 0.75, z), q, new THREE.Vector3(r, r * 0.82, r)));
  }
  makeInstanced('tree-trunks', trunkGeo, M.trunk, trunkM, site, 'trunk');
  [M.leafA, M.leafB, M.leafC].forEach((m, i) => makeInstanced(`tree-canopy-${i}`, canopyGeo, m, canopyM[i], site, 'leaf'));

  // Palm: slim trunk + arched fronds
  const palmTrunkGeo = tg(new THREE.CylinderGeometry(0.14, 0.22, 1, 6, 1));
  palmTrunkGeo.translate(0, 0.5, 0);
  const frondGeo = tg(makeFronds(THREE, HIGH ? 9 : 6));
  const ptM = [], pfM = [];
  for (const [x, z, s] of palmSpots) {
    const h = (6.2 + rand() * 1.4) * s;
    ptM.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(s, h, s)));
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI);
    pfM.push(new THREE.Matrix4().compose(new THREE.Vector3(x, h, z), q, new THREE.Vector3(s, s, s)));
  }
  makeInstanced('palm-trunks', palmTrunkGeo, M.trunk, ptM, site, 'trunk');
  makeInstanced('palm-fronds', frondGeo, M.palm, pfM, site, 'palm');
  // Plaza palm planters
  {
    const planter = new Bin();
    planter.box('stone', -0.8, 0, -0.8, 0.8, 0.55, 0.8);
    planter.box('hedge', -0.65, 0.4, -0.65, 0.65, 0.62, 0.65);
    instancedFromBin(planter, site, 'palm-planter', palmSpots.filter(([, z]) => z > 50).map(([x, z]) => mat4(x, 0.1, z)));
  }

  // Hedges: plot boundaries (unit box scaled per instance)
  {
    const hedgeGeo = tg(new THREE.BoxGeometry(1, 1, 1));
    hedgeGeo.translate(0, 0.5, 0);
    const hm = [];
    const hedge = (x0, z0, x1, z1, h = 1.2) => {
      const m = new THREE.Matrix4().compose(new THREE.Vector3((x0 + x1) / 2, 0.02, (z0 + z1) / 2), new THREE.Quaternion(),
        new THREE.Vector3(Math.max(0.6, Math.abs(x1 - x0)), h, Math.max(0.6, Math.abs(z1 - z0))));
      hm.push(m);
    };
    for (const x of [-49, -31, -13, 5]) {
      hedge(x, -68.6, x, -48.5);     // row 1
      hedge(x, -37.5, x, -20.4);     // row 2
      hedge(x, 16.5, x, 33.4);       // row 3
    }
    hedge(-66.5, -20.6, 19.4, -20.2);  // row 2 gardens / park edge
    hedge(19.6, 16.5, 19.6, 33.4);
    for (const z of [-49, -31, -13, 5, 23]) hedge(43.5, z, 62.5, z);
    hedge(63, -68.6, 63, 31.5);
    hedge(43.5, 31.5, 63, 31.5);
    makeInstanced('garden-hedges', hedgeGeo, M.hedge, hm, site, 'hedge');
  }

  /* ===================================================================== */
  /* 6. STREET LAMPS + night lights                                        */
  /* ===================================================================== */
  {
    const pole = new Bin();
    pole.box('frame', -0.07, 0, -0.07, 0.07, 6.0, 0.07);
    pole.box('frame', -0.05, 5.85, -0.05, 1.1, 5.95, 0.05);
    const head = new Bin();
    head.box('lampHead', 0.75, 5.72, -0.14, 1.45, 5.86, 0.14);
    const lm = [];
    for (let z = -60; z <= 28; z += 22) { lm.push(mat4(20.4, 0.12, z + 4, Math.PI)); lm.push(mat4(39.6, 0.12, z + 15, 0)); }
    for (let x = -62; x <= 12; x += 18.5) lm.push(mat4(x, 0.12, 56.7, Math.PI / 2));
    for (const st of L.streets) for (let x = -60; x <= 14; x += 24.5) lm.push(mat4(x + 6, 0.12, st.z0 - 0.75, Math.PI / 2));
    for (let x = 45; x <= 66; x += 10) lm.push(mat4(x, 0.12, 47, Math.PI / 2));
    instancedFromBin(pole, site, 'lamp-pole', lm);
    instancedFromBin(head, site, 'lamp-head', lm, { cast: false });
  }
  const lamps = [];
  const addLamp = (name, x, y, z, color, nightIntensity, distance) => {
    const l = new THREE.PointLight(color, 0, distance, 2);
    l.name = name; l.position.set(x, y, z); l.castShadow = false;
    l.userData.nightIntensity = nightIntensity;
    site.add(l); lamps.push(l);
  };
  addLamp('lamp-gate', 30, 4.6, L.gate.z, 0xffd6a0, 60, 26);
  addLamp('lamp-plaza-west', -45, 3.6, 53.5, 0xffd2a0, 70, 30);
  addLamp('lamp-plaza-east', -1, 3.6, 53.5, 0xffd2a0, 70, 30);
  addLamp('lamp-lagoon-main', -4, 1.6, -6, 0x7fe6ee, 55, 24);
  addLamp('lamp-lagoon-west', -48, 1.6, -6, 0x7fe6ee, 35, 18);
  addLamp('lamp-boulevard-north', 30, 6, -30, 0xffd6a0, 50, 30);
  addLamp('lamp-boulevard-south', 30, 6, 12, 0xffd6a0, 50, 30);
  addLamp('lamp-parking', 55, 5.5, 47, 0xffd6a0, 45, 26);

  /* ===================================================================== */
  /* 7. CARS (parked + gently moving)                                      */
  /* ===================================================================== */
  // Car: lower body + roof (paint), glass cabin, four wheels. Length along local +x.
  const carBody = tg(mergeGeometries(THREE, [
    boxAt(THREE, -2.2, 0.3, -0.88, 2.2, 0.82, 0.88),
    boxAt(THREE, -1.05, 1.32, -0.76, 0.85, 1.4, 0.76),
  ]));
  const carCabin = tg(boxAt(THREE, -1.3, 0.82, -0.8, 1.1, 1.32, 0.8));
  const carTyre = tg(mergeGeometries(THREE, [[-1.35, -0.78], [-1.35, 0.78], [1.35, -0.78], [1.35, 0.78]].map(([x, z]) => {
    const w = new THREE.CylinderGeometry(0.33, 0.33, 0.24, HIGH ? 10 : 6);
    w.rotateX(Math.PI / 2); w.translate(x, 0.33, z); return w;
  })));
  // Parked cars: lot + some driveways
  const parked = [];
  for (let x = P.x0 + 2.3, i = 0; x < P.x1 - 1; x += 2.6, i++) {
    if (i % 3 !== 1) parked.push({ x, z: P.z0 + 3, rot: Math.PI / 2 });
    if (i % 4 !== 2) parked.push({ x, z: P.z1 - 3, rot: -Math.PI / 2 });
  }
  villas.forEach((v, i) => { if (i % 3 === 0 && v.z !== L.rows[2].z) { const p = local(v, 2.8, 7.0); parked.push({ x: p[0], z: p[1], rot: v.rot + Math.PI / 2 }); } });
  // Moving cars: a loop on the boulevard + four lanes on the main road
  const loopLen = blvdLoopLength();
  const movers = [];
  for (let i = 0; i < 6; i++) movers.push({ kind: 'loop', s: (i / 6) * loopLen + rand() * 8, v: 5.5 });
  [[58.5, -1], [61.5, -1], [64.5, 1], [67.5, 1]].forEach(([z, dir], li) => {
    for (let k = 0; k < 2; k++) movers.push({ kind: 'road', z, dir, x: -70 + ((k * 72 + li * 31) % 140), v: 7 + li * 0.6 });
  });
  const allCars = [...parked.map((p) => ({ ...p, parked: true })), ...movers];
  allCars.forEach((c, i) => (c.color = i % 4));
  const carMeshes = { body: [], cabin: null, tyre: null };
  const carIndex = []; // per car: { bodyMesh, bodyIdx, idx }
  {
    const perColor = [[], [], [], []];
    allCars.forEach((c, i) => { carIndex.push({ color: c.color, bodyIdx: perColor[c.color].length, idx: i }); perColor[c.color].push(i); });
    const id = new THREE.Matrix4();
    carMeshes.body = perColor.map((list, ci) => makeInstanced(`car-body-${ci}`, carBody, M.car[ci], list.map(() => id), site, 'car'));
    carMeshes.cabin = makeInstanced('car-cabin', carCabin, M.carGlass, allCars.map(() => id), site, 'car');
    carMeshes.tyre = makeInstanced('car-tyres', carTyre, M.tyre, allCars.map(() => id), site, 'car', { cast: false });
    for (const m of [...carMeshes.body, carMeshes.cabin, carMeshes.tyre]) m.frustumCulled = false; // animated
  }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
  function placeCar(i, x, z, heading, scale = 1) {
    _p.set(x, 0.06, z); _q.setFromAxisAngle(_up, heading); _s.setScalar(Math.max(scale, 0.0001));
    _m.compose(_p, _q, _s);
    const ci = carIndex[i];
    carMeshes.body[ci.color].setMatrixAt(ci.bodyIdx, _m);
    carMeshes.cabin.setMatrixAt(i, _m);
    carMeshes.tyre.setMatrixAt(i, _m);
  }
  function blvdLoopLength() { return 2 * (50 + 63) + 2 * Math.PI * 4; }
  /** Point on the boulevard loop: up the east lane, U-turn, down the west lane, U-turn. */
  function blvdLoop(s) {
    const straight = 113, arc = Math.PI * 4;
    s = ((s % loopLen) + loopLen) % loopLen;
    if (s < straight) return [34, 50 - s, Math.PI / 2];                              // northbound (-z)
    s -= straight;
    if (s < arc) { const a = s / 4; return [30 + 4 * Math.cos(a), -63 - 4 * Math.sin(a), Math.PI / 2 + a]; }
    s -= arc;
    if (s < straight) return [26, -63 + s, -Math.PI / 2];                            // southbound (+z)
    s -= straight;
    const a = s / 4; return [30 - 4 * Math.cos(a), 50 + 4 * Math.sin(a), -Math.PI / 2 + a];
  }
  function updateCars(dt) {
    allCars.forEach((c, i) => {
      if (c.parked) { if (!c.placed) { placeCar(i, c.x, c.z, c.rot); c.placed = true; } return; }
      if (c.kind === 'loop') {
        c.s += c.v * dt;
        const [x, z, h] = blvdLoop(c.s);
        placeCar(i, x, z, h);
      } else {
        c.x += c.v * c.dir * dt;
        if (c.x > 72) c.x -= 144; if (c.x < -72) c.x += 144;
        const fade = Math.min(1, Math.max(0, (67.5 - Math.abs(c.x)) / 4));
        placeCar(i, Math.max(-66, Math.min(66, c.x)), c.z, c.dir > 0 ? 0 : Math.PI, fade); // hidden cars park at the edge
      }
    });
    for (const m of [...carMeshes.body, carMeshes.cabin, carMeshes.tyre]) m.instanceMatrix.needsUpdate = true;
  }
  updateCars(0);

  /* ===================================================================== */
  /* 8. update / dispose                                                   */
  /* ===================================================================== */
  function update(dt = 0, t = 0) {
    const d = Math.min(dt, 0.1);
    waterNormal.offset.set(t * 0.012, t * 0.007);
    if (d > 0) updateCars(d);
  }

  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const im of instancedMeshes) im.dispose();
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    for (const t of textures) t.dispose();
    root.removeFromParent();
    root.clear();
  }

  return { root, floors, site, nightMaterials, lamps, update, dispose };
}

/* ======================================================================== */
/* Geometry helpers (pure functions, THREE injected)                        */
/* ======================================================================== */

/** Merge geometries (indexed or not) into one non-indexed BufferGeometry with position/normal/uv. Disposes inputs. */
function mergeGeometries(THREE, list) {
  const flat = list.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0;
  for (const g of flat) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of flat) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += c;
  }
  for (const g of new Set([...list, ...flat])) g.dispose();
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}

function boxAt(THREE, x0, y0, z0, x1, y1, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

/** Clustered tree canopy (unit radius), three icosahedron blobs merged. */
function makeCanopy(THREE, high) {
  if (!high) return new THREE.IcosahedronGeometry(1, 0);
  const parts = [
    [0, 0, 0, 1], [0.5, -0.18, 0.25, 0.72], [-0.42, -0.12, -0.32, 0.74], [0.05, 0.3, -0.1, 0.62],
  ].map(([x, y, z, r]) => { const g = new THREE.IcosahedronGeometry(r, 1); g.translate(x, y, z); return g; });
  return mergeGeometries(THREE, parts);
}

/** Palm crown: n arched, tapered fronds radiating from the origin. */
function makeFronds(THREE, n) {
  const parts = [];
  for (let i = 0; i < n; i++) {
    const g = new THREE.PlaneGeometry(0.75, 3.4, 1, 5);
    g.rotateX(-Math.PI / 2);           // lie flat along z
    g.translate(0, 0, 1.7);            // base at origin, tip at z = 3.4
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const z = p.getZ(k), t = z / 3.4;
      p.setX(k, p.getX(k) * (1 - t * 0.75));   // taper
      p.setY(k, 0.55 * t * 3.4 - 1.35 * t * t * 3.4 * 0.6); // arch up then droop
    }
    g.computeVertexNormals();
    g.rotateY((i / n) * Math.PI * 2 + (i % 2) * 0.2);
    parts.push(g);
  }
  return mergeGeometries(THREE, parts);
}

/** Free-form lagoon edge: smooth harmonic blob around (cx, cz). Returns [[x, z], ...]. */
function lagoonCurve(lg, n) {
  const pts = [];
  for (let i = 0; i < n; i++) pts.push(lagoonPoint(lg, (i / n) * Math.PI * 2, 1));
  return pts;
}
function lagoonPoint(lg, a, k = 1) {
  const s = lg.seed;
  const r = (1 + 0.17 * Math.sin(2 * a + s) + 0.09 * Math.cos(3 * a + s * 1.7) + 0.05 * Math.sin(5 * a + s * 0.6)) * k;
  const x = Math.cos(a) * lg.rx * r, z = Math.sin(a) * lg.rz * r;
  const c = Math.cos(lg.rot), sn = Math.sin(lg.rot);
  return [lg.cx + x * c - z * sn, lg.cz + x * sn + z * c];
}
/** Offset a closed loop point along its averaged outward normal (CCW-agnostic). */
function offsetPoint(loop, i, d) {
  const n = loop.length;
  const a = loop[(i - 1 + n) % n], b = loop[(i + 1) % n], p = loop[i];
  let tx = b[0] - a[0], tz = b[1] - a[1];
  const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
  let nx = tz, nz = -tx;
  // make the normal point away from the loop centroid
  let cx = 0, cz = 0; for (const q of loop) { cx += q[0]; cz += q[1]; } cx /= n; cz /= n;
  if ((p[0] - cx) * nx + (p[1] - cz) * nz < 0) { nx = -nx; nz = -nz; }
  return [p[0] + nx * d, p[1] + nz * d];
}
function offsetLoop(loop, d) { return loop.map((_, i) => offsetPoint(loop, i, d)); }

/** Shape in the XZ plane: THREE.Shape uses (x, -z) so that rotateX(-90°) maps back to +z. */
function toShape(THREE, loop) {
  return new THREE.Shape(loop.map(([x, z]) => new THREE.Vector2(x, -z)));
}
/** Extruded ring between an outer and an inner loop, from y = 0 to y = h. */
function ringExtrude(THREE, outer, inner, h) {
  const shape = toShape(THREE, outer);
  shape.holes.push(new THREE.Path(inner.map(([x, z]) => new THREE.Vector2(x, -z))));
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(-Math.PI / 2);
  return g;
}
/** Flat surface (optionally with a hole) at height y, facing up; UVs in metres. */
function flatShape(THREE, outer, inner, y) {
  const shape = toShape(THREE, outer);
  if (inner) shape.holes.push(new THREE.Path(inner.map(([x, z]) => new THREE.Vector2(x, -z))));
  const g = new THREE.ShapeGeometry(shape, 1);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  // metre-based UVs scaled for the normal-map tiling
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 9, p.getZ(i) / 9);
  return g;
}
function pointInPoly(x, z, poly, margin = 0) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  if (inside || margin <= 0) return inside;
  for (const [px, pz] of poly) if ((px - x) ** 2 + (pz - z) ** 2 < margin * margin) return true;
  return false;
}

/** Tileable procedural water normal map (sum of integer-frequency waves). */
function makeWaterNormal(THREE, size) {
  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(size, size) : Object.assign(document.createElement('canvas'), { width: size, height: size });
  const c2 = canvas.getContext('2d');
  const img = c2.createImageData(size, size);
  const waves = [[3, 1, 0.0, 1], [1, 4, 1.3, 0.8], [5, -2, 2.1, 0.5], [-2, 6, 0.7, 0.4], [7, 3, 4.0, 0.25]];
  const T = Math.PI * 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let dx = 0, dy = 0;
      const u = x / size, v = y / size;
      for (const [kx, ky, ph, a] of waves) {
        const c = Math.cos(T * (kx * u + ky * v) + ph) * a;
        dx += c * kx; dy += c * ky;
      }
      const nx = -dx * 0.08, ny = -dy * 0.08, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      const i = (y * size + x) * 4;
      img.data[i] = ((nx / l) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((ny / l) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((nz / l) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  c2.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.name = 'water-normal';
  return tex;
}
