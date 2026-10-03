/**
 * MOBCO 3D Project Studio — model "landmark"
 * ------------------------------------------------------------------
 * An ILLUSTRATIVE massing model of a classical courtyard building, inspired
 * by the "ksa-landmark" render: terracotta brick wings with cream stone trims
 * around a landscaped court, a central drum wrapped in curved stacked
 * balconies, round corner turrets, a cantilevered timber porte-cochère on
 * stone columns, palms and a paved forecourt with a reflecting pool.
 * It is not a replica and carries no real dimensions or specifications.
 *
 * Module contract: imports nothing (THREE is injected), exports `meta` and
 * `build(THREE, ctx)`. World units are metres; +z is the front (arrival side),
 * the ground plane is y = 0 and is provided by the engine.
 */

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ plan constants */
// Courtyard block (x = ±X_OUT, z from Z_REAR to Z_FRONT) with an open court inside.
const X_OUT = 48, X_IN = 35;
const Z_FRONT = 4, Z_FRONT_IN = -11;   // front wing is deeper to receive the drum
const Z_REAR = -52, Z_REAR_IN = -39;
const TURRET_R = 6;                    // round corner turrets centred on the four corners
const DRUM = { x: 0, z: 2, R: 12.5, RW: 9.6, RG: 11.2, RA: 12.0 }; // balcony edge, recessed wall, ground wall, attic
// Storeys: ground + three upper floors; the drum adds an attic (level 4).
const LEVELS = [
  { y0: 0.0, h: 4.6 },
  { y0: 4.6, h: 3.8 },
  { y0: 8.4, h: 3.8 },
  { y0: 12.2, h: 3.8 },
  { y0: 16.0, h: 3.4 },   // drum attic only
];
const SLAB = 0.4;          // floor-plate thickness at the base of each level
const ROOF_Y = 16.0;       // top of the wings
const BAY = 3.6;           // façade bay rhythm

const FLOOR_LABELS = [
  { en: 'Ground floor', ar: 'الطابق الأرضي' },
  { en: 'First floor', ar: 'الطابق الأول' },
  { en: 'Second floor', ar: 'الطابق الثاني' },
  { en: 'Third floor & roof', ar: 'الطابق الثالث والسطح' },
  { en: 'Drum attic & crown', ar: 'علّية الأسطوانة والتاج' },
];

/* ------------------------------------------------------------------ meta */
export const meta = {
  id: 'landmark',
  name: { en: 'Classical Landmark', ar: 'المَعلم الكلاسيكي' },
  projectSlug: 'classical-landmark',
  tagline: {
    en: 'An illustrative massing study of a classical courtyard building in terracotta and cream stone, crowned by a sculpted central drum.',
    ar: 'دراسة كتلية توضيحية لمبنى كلاسيكي حول فناء بطوب التيراكوتا والحجر الكريمي، تتوّجه أسطوانة مركزية منحوتة.',
  },
  descriptors: [
    { label: { en: 'Typology', ar: 'النمط' }, value: { en: 'Courtyard building', ar: 'مبنى حول فناء' } },
    { label: { en: 'Massing', ar: 'الكتلة' }, value: { en: 'Four wings around a landscaped court', ar: 'أربعة أجنحة حول فناء منسّق' } },
    { label: { en: 'Signature', ar: 'العنصر المميّز' }, value: { en: 'Central drum with curved balconies', ar: 'أسطوانة مركزية بشرفات منحنية' } },
    { label: { en: 'Arrival', ar: 'الوصول' }, value: { en: 'Timber porte-cochère on stone columns', ar: 'مظلة مدخل خشبية على أعمدة حجرية' } },
    { label: { en: 'Palette', ar: 'الخامات' }, value: { en: 'Terracotta brick & cream stone', ar: 'طوب تيراكوتا وحجر كريمي' } },
  ],
  camera: {
    target: [0, 7, 0],
    aerial: [74, 58, 92],
    street: [3, 1.7, 61],
    top: [0, 210, 0.01],
    front: [0, 12, 100],
  },
  hotspots: [
    {
      id: 'drum', position: [0, 13.5, 14.8],
      title: { en: 'Curved balconies', ar: 'الشرفات المنحنية' },
      text: {
        en: 'Stacked, curved balconies wrap the central drum, framed by slender columns and ornamented balustrades.',
        ar: 'شرفات منحنية متتالية تلتف حول الأسطوانة المركزية، تؤطّرها أعمدة رشيقة ودرابزينات مزخرفة.',
      },
    },
    {
      id: 'porte-cochere', position: [0, 6.6, 22],
      title: { en: 'Porte-cochère', ar: 'مظلة المدخل' },
      text: {
        en: 'A cantilevered timber canopy on stone columns shelters the arrival court in front of the entrance.',
        ar: 'مظلة خشبية بارزة على أعمدة حجرية تظلّل ساحة الوصول أمام المدخل.',
      },
    },
    {
      id: 'courtyard', position: [0, 2.5, -25],
      title: { en: 'Inner courtyard', ar: 'الفناء الداخلي' },
      text: {
        en: 'Four wings enclose a landscaped courtyard with lawns, palms and a central fountain.',
        ar: 'تحيط الأجنحة الأربعة بفناء منسّق بالمسطحات الخضراء والنخيل ونافورة مركزية.',
      },
    },
    {
      id: 'pool', position: [0, 1.2, 43],
      title: { en: 'Reflecting pool', ar: 'البركة العاكسة' },
      text: {
        en: 'A long reflecting pool marks the central axis of the paved forecourt.',
        ar: 'بركة عاكسة طويلة تحدّد المحور المركزي للساحة الأمامية المرصوفة.',
      },
    },
    {
      id: 'facade', position: [-28, 10, 4.6],
      title: { en: 'Façade language', ar: 'لغة الواجهة' },
      text: {
        en: 'Terracotta walls with cream stone bands, framed windows and diamond and roundel motifs.',
        ar: 'جدران من التيراكوتا بأشرطة حجرية كريمية ونوافذ مؤطّرة وزخارف معيّنة ودائرية.',
      },
    },
  ],
  sun: { azimuth: -38, elevation: 40 },
};

/* ------------------------------------------------------------------ build */
export function build(THREE, ctx = {}) {
  const HIGH = (ctx.quality || 'high') !== 'low';
  // ctx.envMap is not assigned to materials: the engine's scene.environment (and its night dimming) lights them.
  const SEG = HIGH ? 72 : 40;           // segments for a full circle on large curved forms

  /* ---------- resource tracking (everything created here is disposed in dispose()) */
  const geos = new Set(), mats = new Set(), texs = new Set(), instanced = [];
  const G = (g) => { geos.add(g); return g; };
  const T = (t) => { texs.add(t); return t; };
  const std = (name, p) => { const m = new THREE.MeshStandardMaterial(p); m.name = name; mats.add(m); return m; };
  const phys = (name, p) => { const m = new THREE.MeshPhysicalMaterial(p); m.name = name; mats.add(m); return m; };

  // Deterministic RNG so the model is identical on every build.
  let seed = 20010;
  const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  /* ---------- procedural textures */
  const makeCanvas = (w, h) => {
    if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
    return new OffscreenCanvas(w, h);
  };

  // Terracotta brick: low-contrast stretcher bond, subtle per-brick variation.
  const BRICK_TILE = 3.2; // metres covered by one texture repeat
  const brickTex = (() => {
    const N = 512, c = makeCanvas(N, N), g = c.getContext('2d');
    g.fillStyle = '#c99a83'; g.fillRect(0, 0, N, N); // mortar
    const courses = 24, ch = N / courses, bw = N / 8;
    for (let r = 0; r < courses; r++) {
      const off = (r % 2) * bw / 2;
      for (let i = -1; i < 9; i++) {
        const v = (rnd() - 0.5) * 0.12, l = 0.5 + v;
        const R = Math.round(170 * (1 + v)), Gc = Math.round(88 * (1 + v * 1.2)), B = Math.round(66 * (1 + v));
        g.fillStyle = `rgb(${R},${Gc},${B})`;
        g.fillRect(i * bw + off + 1, r * ch + 1, bw - 2, ch - 2);
        if (l > 0.55) { g.fillStyle = 'rgba(255,220,200,0.05)'; g.fillRect(i * bw + off + 1, r * ch + 1, bw - 2, ch / 3); }
      }
    }
    const t = T(new THREE.CanvasTexture(c));
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
    return t;
  })();

  // Forecourt paving: large diagonal tiles in three stone tones (seamless).
  const PAVE_TILE = 7.2;
  const paveTex = (() => {
    const N = 512, k = 6, cell = N / k, c = makeCanvas(N, N), g = c.getContext('2d');
    const img = g.createImageData(N, N), d = img.data;
    const tones = [[226, 219, 206], [212, 203, 187], [194, 184, 168], [220, 212, 197]];
    const hash = (i, j) => { const m = ((i % k) + k) % k, n = ((j % k) + k) % k; const h = Math.sin(m * 127.1 + n * 311.7) * 43758.5453; return h - Math.floor(h); };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const a = (x + y) / cell, b = (x - y) / cell;
      const i = Math.floor(a), j = Math.floor(b), fa = a - i, fb = b - j;
      const joint = fa < 0.025 || fb < 0.025;
      const tone = tones[Math.floor(hash(i, j) * tones.length)];
      const o = (y * N + x) * 4, s = joint ? 0.86 : 1;
      d[o] = tone[0] * s; d[o + 1] = tone[1] * s; d[o + 2] = tone[2] * s; d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = T(new THREE.CanvasTexture(c));
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
    return t;
  })();

  // Water normal map: periodic sum of sines, scrolled in update() for a gentle shimmer.
  const waterNormal = (() => {
    const N = 128, c = makeCanvas(N, N), g = c.getContext('2d');
    const img = g.createImageData(N, N), d = img.data;
    const hgt = (x, y) => { const u = x / N * TAU, v = y / N * TAU; return Math.sin(u * 3 + v * 2) * 0.5 + Math.sin(u * 5 - v * 4) * 0.3 + Math.sin(u * 2 - v * 7 + 1.3) * 0.2; };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = hgt(x + 1, y) - hgt(x - 1, y), dy = hgt(x, y + 1) - hgt(x, y - 1);
      let nx = -dx * 1.4, ny = -dy * 1.4, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const o = (y * N + x) * 4; d[o] = (nx * 0.5 + 0.5) * 255; d[o + 1] = (ny * 0.5 + 0.5) * 255; d[o + 2] = (nz * 0.5 + 0.5) * 255; d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = T(new THREE.CanvasTexture(c));
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5);
    return t;
  })();

  /* ---------- materials (white/stone palette + terracotta; MOBCO teal only as accents) */
  const M = {
    brick: std('terracotta-brick', { color: '#ffffff', map: brickTex, roughness: 0.86, metalness: 0 }),
    stone: std('stone-wall', { color: '#e2d5bc', roughness: 0.78 }),
    trim: std('cream-stone-trim', { color: '#ede3cf', roughness: 0.62 }),
    plinth: std('stone-plinth', { color: '#c9bba1', roughness: 0.8 }),
    roof: std('roof-deck', { color: '#c6bfb2', roughness: 0.92 }),
    timber: std('timber', { color: '#7a4a2b', roughness: 0.55 }),
    bronze: std('bronze', { color: '#5a4632', roughness: 0.38, metalness: 0.65 }),
    glass: phys('glass', { color: '#4d6b74', roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.42, envMapIntensity: 1.2, depthWrite: false }),
    interiorLit: std('window-interior-lit', { color: '#2a3036', roughness: 0.9, emissive: new THREE.Color('#ffa850').multiplyScalar(1.25), emissiveIntensity: 0 }),
    interiorDark: std('window-interior', { color: '#22292f', roughness: 0.9 }),
    teal: std('mobco-teal-accent', { color: '#6fd1c5', roughness: 0.35, metalness: 0.25, emissive: '#6fd1c5', emissiveIntensity: 0 }),
    lawn: std('lawn', { color: '#6b8c45', roughness: 1 }),
    hedge: std('hedge', { color: '#4c6a35', roughness: 0.95 }),
    frond: std('palm-frond', { color: '#5a7a34', roughness: 0.85, side: THREE.DoubleSide }),
    trunk: std('palm-trunk', { color: '#8f7759', roughness: 0.95 }),
    paving: std('forecourt-paving', { color: '#ffffff', map: paveTex, roughness: 0.82 }),
    drive: std('drive-granite', { color: '#a89f8f', roughness: 0.85 }),
    poolTile: std('pool-tile', { color: '#5aa8a1', roughness: 0.5 }),
    water: phys('water', { color: '#1f666c', roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.8, envMapIntensity: 1.3, normalMap: waterNormal, normalScale: new THREE.Vector2(0.12, 0.12), emissive: new THREE.Color('#3fa89c').multiplyScalar(0.45), emissiveIntensity: 0, depthWrite: false }),
    lamp: std('lamp-head', { color: '#f4efe6', roughness: 0.4, emissive: '#ffe2b4', emissiveIntensity: 0 }),
    darkMetal: std('dark-metal', { color: '#2b2d30', roughness: 0.5, metalness: 0.6 }),
    carPaint: phys('car-paint', { color: '#1f3a30', roughness: 0.28, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1 }),
    tyre: std('tyre', { color: '#1b1b1b', roughness: 0.9 }),
  };
  brickTex.repeat.set(1, 1);

  /* ---------- shared unit geometries for instancing */
  const U = {
    box: G(new THREE.BoxGeometry(1, 1, 1)),
    cyl: G(new THREE.CylinderGeometry(1, 1, 1, HIGH ? 16 : 10)),
    shaft: G(new THREE.CylinderGeometry(1, 1, 1, HIGH ? 12 : 8, 1, true)),   // open: ends hidden by slabs/rails
    baluster: G(new THREE.CylinderGeometry(1, 1, 1, 6, 1, true)),
    disc: G(new THREE.CylinderGeometry(1, 1, 1, HIGH ? 20 : 10)),
    bush: G(new THREE.IcosahedronGeometry(1, HIGH ? 1 : 0)),
  };

  /* ---------- scene graph */
  const root = new THREE.Group(); root.name = 'landmark';
  const floors = LEVELS.map((L, i) => {
    const g = new THREE.Group(); g.name = `floor-${i}`;
    g.userData = { level: i, label: FLOOR_LABELS[i], buildingId: 'landmark' };
    root.add(g); return g;
  });
  const site = new THREE.Group(); site.name = 'site'; root.add(site);
  const nightMaterials = [M.interiorLit, M.lamp, M.water, M.teal];
  const lamps = [];

  /* ---------- instancing batches: (group, name) -> list of matrices */
  const batches = new Map();
  const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
  /** Queue one instance of a unit geometry: centre (x,y,z), scale (sx,sy,sz), yaw ry, then pitch rx, roll rz (local). */
  function inst(group, name, geo, mat, x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0, shadow = true) {
    const key = group.id + '|' + name;
    let b = batches.get(key);
    if (!b) { b = { group, name, geo, mat, shadow, list: [] }; batches.set(key, b); }
    _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e);
    b.list.push(new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz)));
  }
  function flushBatches() {
    for (const b of batches.values()) {
      const im = new THREE.InstancedMesh(b.geo, b.mat, b.list.length);
      b.list.forEach((m, i) => im.setMatrixAt(i, m));
      im.instanceMatrix.needsUpdate = true;
      im.name = b.name; im.castShadow = b.shadow; im.receiveShadow = true;
      im.computeBoundingSphere();
      b.group.add(im); instanced.push(im);
    }
    batches.clear();
  }

  function mesh(group, name, geo, mat, cast = true, receive = true) {
    const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = cast; m.receiveShadow = receive; group.add(m); return m;
  }

  /* ---------- geometry helpers */
  // World-scaled UVs so the brick texture keeps one scale on every wall (box geometry).
  function boxWorldUV(g, tile) {
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const ax = Math.abs(n.getX(i)), az = Math.abs(n.getZ(i));
      if (ax > 0.5) uv.setXY(i, p.getZ(i) / tile, p.getY(i) / tile);
      else if (az > 0.5) uv.setXY(i, p.getX(i) / tile, p.getY(i) / tile);
      else uv.setXY(i, p.getX(i) / tile, p.getZ(i) / tile);
    }
  }
  /** Axis-aligned box from bounds. */
  function boxGeo(x0, x1, y0, y1, z0, z1, tile = 0) {
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    if (tile) boxWorldUV(g, tile);
    return G(g);
  }
  /** Vertical cylinder (optionally a partial, open arc) with world-scaled UVs on its side. */
  function cylGeo(cx, cz, r, y0, h, { t0 = 0, tl = TAU, open = false, tile = 0, seg = SEG } = {}) {
    const g = new THREE.CylinderGeometry(r, r, h, Math.max(6, Math.round(seg * tl / TAU)), 1, open, t0, tl);
    if (tile) {
      const uv = g.attributes.uv, n = g.attributes.normal, p = g.attributes.position;
      for (let i = 0; i < uv.count; i++) {
        if (Math.abs(n.getY(i)) > 0.9) uv.setXY(i, p.getX(i) / tile, p.getZ(i) / tile);
        else uv.setXY(i, (t0 + uv.getX(i) * tl) * r / tile, (p.getY(i) + h / 2 + y0) / tile);
      }
    }
    g.translate(cx, y0 + h / 2, cz);
    return G(g);
  }
  /** Plan shape of an annular sector; angle θ measured from +z towards +x (x = r·sinθ, z = r·cosθ). */
  function arcShape(rIn, rOut, t0, t1) {
    const s = new THREE.Shape();
    const full = Math.abs(t1 - t0) >= TAU - 1e-6;
    const seg = Math.max(4, Math.ceil(Math.abs(t1 - t0) / TAU * SEG));
    const pt = (r, t) => [r * Math.sin(t), -r * Math.cos(t)]; // shape y = -z (undone by rotateX(-90°))
    for (let i = 0; i <= seg; i++) { const [X, Y] = pt(rOut, t0 + (t1 - t0) * i / seg); i ? s.lineTo(X, Y) : s.moveTo(X, Y); }
    if (full) {
      if (rIn > 0) { const hole = new THREE.Path(); for (let i = 0; i <= seg; i++) { const [X, Y] = pt(rIn, t0 - (t1 - t0) * i / seg); i ? hole.lineTo(X, Y) : hole.moveTo(X, Y); } s.holes.push(hole); }
    } else if (rIn > 0) {
      for (let i = seg; i >= 0; i--) { const [X, Y] = pt(rIn, t0 + (t1 - t0) * i / seg); s.lineTo(X, Y); }
    } else s.lineTo(0, 0);
    return s;
  }
  /**
   * Annular-sector band from y0 to y0+h centred on (cx, cz), built directly so curved faces get
   * smooth normals (ExtrudeGeometry would facet them). Full rings (|t1−t0| = 2π) get no end caps.
   */
  function arcBandGeo(cx, cz, rIn, rOut, y0, h, t0, t1) {
    const full = Math.abs(t1 - t0) >= TAU - 1e-6;
    const seg = Math.max(4, Math.ceil(Math.abs(t1 - t0) / TAU * SEG * 1.5));
    const P = [], N = [], UV = [], I = [];
    const y1 = y0 + h, k = 1 / BRICK_TILE; // world-scaled UVs (brick-textured balustrades)
    const quad = (a, b, c, d) => { I.push(a, b, c, a, c, d); };
    // vertex at polar (r, t), height y; normal mode: 1 = radial out, -1 = radial in, 'up' / 'down', or [nx, nz] for end caps
    const v = (r, t, y, mode) => {
      const st = Math.sin(t), ct = Math.cos(t), x = r * st, z = r * ct;
      P.push(cx + x, y, cz + z);
      if (mode === 1 || mode === -1) { N.push(mode * st, 0, mode * ct); UV.push(t * r * k, y * k); }
      else if (mode === 'up' || mode === 'down') { N.push(0, mode === 'up' ? 1 : -1, 0); UV.push(x * k, z * k); }
      else { N.push(mode[0], 0, mode[1]); UV.push(r * k, y * k); }
      return P.length / 3 - 1;
    };
    for (let i = 0; i < seg; i++) {
      const ta = t0 + (t1 - t0) * i / seg, tb = t0 + (t1 - t0) * (i + 1) / seg;
      quad(v(rOut, ta, y0, 1), v(rOut, tb, y0, 1), v(rOut, tb, y1, 1), v(rOut, ta, y1, 1));          // outer wall
      quad(v(rIn, ta, y0, -1), v(rIn, ta, y1, -1), v(rIn, tb, y1, -1), v(rIn, tb, y0, -1));          // inner wall
      quad(v(rOut, ta, y1, 'up'), v(rOut, tb, y1, 'up'), v(rIn, tb, y1, 'up'), v(rIn, ta, y1, 'up')); // top
      quad(v(rOut, ta, y0, 'down'), v(rIn, ta, y0, 'down'), v(rIn, tb, y0, 'down'), v(rOut, tb, y0, 'down')); // bottom
    }
    if (!full) {
      const dir = Math.sign(t1 - t0) || 1;
      for (const [t, sgn] of [[t0, -dir], [t1, dir]]) {
        const n = [sgn * Math.cos(t), -sgn * Math.sin(t)];
        const a = v(rIn, t, y0, n), b = v(rOut, t, y0, n), c = v(rOut, t, y1, n), d = v(rIn, t, y1, n);
        if (sgn * dir < 0) quad(a, b, c, d); else quad(a, d, c, b);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
    g.setIndex(I);
    return G(g);
  }
  /** Flat annular sector (ground markings, drive) at height y. */
  function arcFlatGeo(cx, cz, rIn, rOut, y, t0, t1) {
    const g = new THREE.ShapeGeometry(arcShape(rIn, rOut, t0, t1));
    g.rotateX(-Math.PI / 2); g.translate(cx, y, cz);
    return G(g);
  }

  /* ---------- façade element helpers (all instanced) */
  // A wall "frame": point (ox, oz) on the wall surface, outward yaw ry. Local x runs along the wall.
  const along = (ox, oz, ry, lx, ld) => [ox + Math.cos(ry) * lx + Math.sin(ry) * ld, oz - Math.sin(ry) * lx + Math.cos(ry) * ld];

  /**
   * Framed window: dark interior backing (lit or not at night), glass pane, cream head/sill/jambs, mullions.
   * y0 = sill height (world), w × h = clear opening.
   */
  function windowAt(group, ox, oz, ry, y0, w, h, { mullions = 2, transom = true, frameMat = M.trim, lit = null } = {}) {
    const yc = y0 + h / 2;
    const isLit = lit ?? (rnd() < 0.72);
    let [x, z] = along(ox, oz, ry, 0, -0.1);
    inst(group, isLit ? 'window-interior-lit' : 'window-interior', U.box, isLit ? M.interiorLit : M.interiorDark, x, yc, z, w, h, 0.3, ry, 0, 0, false);
    [x, z] = along(ox, oz, ry, 0, 0.1);
    inst(group, 'window-glass', U.box, M.glass, x, yc, z, w, h, 0.02, ry, 0, 0, false);
    const fname = frameMat === M.bronze ? 'window-frame-bronze' : 'window-frame';
    if (!HIGH) {
      // low quality: one surround plate behind the pane + a sill (2 boxes instead of 5–7)
      [x, z] = along(ox, oz, ry, 0, -0.05);
      inst(group, fname, U.box, frameMat, x, yc + 0.03, z, w + 0.4, h + 0.34, 0.2, ry);
      [x, z] = along(ox, oz, ry, 0, 0.06);
      inst(group, fname, U.box, frameMat, x, y0 - 0.1, z, w + 0.52, 0.14, 0.36, ry);
      return;
    }
    [x, z] = along(ox, oz, ry, 0, 0.04);
    inst(group, fname, U.box, frameMat, x, y0 + h + 0.1, z, w + 0.4, 0.2, 0.32, ry);            // head
    [x, z] = along(ox, oz, ry, 0, 0.06);
    inst(group, fname, U.box, frameMat, x, y0 - 0.07, z, w + 0.52, 0.14, 0.36, ry);             // sill
    for (const sgn of [-1, 1]) {                                                                // jambs
      [x, z] = along(ox, oz, ry, sgn * (w / 2 + 0.09), 0.04);
      inst(group, fname, U.box, frameMat, x, yc, z, 0.18, h, 0.28, ry);
    }
    for (let k = 1; k < mullions; k++) {                                                        // mullions
      [x, z] = along(ox, oz, ry, -w / 2 + (k * w) / mullions, 0.1);
      inst(group, fname, U.box, frameMat, x, yc, z, 0.06, h, 0.1, ry, 0, 0, false);
    }
    if (transom) { [x, z] = along(ox, oz, ry, 0, 0.1); inst(group, fname, U.box, frameMat, x, y0 + h * 0.74, z, w, 0.06, 0.1, ry, 0, 0, false); }
  }

  /** Classical ornament on a pier: 'diamond' (rotated square) or 'roundel' (disc). */
  function ornamentAt(group, kind, ox, oz, ry, y, size) {
    const [x, z] = along(ox, oz, ry, 0, 0);
    if (kind === 'diamond') inst(group, 'ornament-diamond', U.box, M.trim, x, y, z, size * 0.72, size * 0.72, 0.14, ry, 0, 45 * DEG, false);
    else {
      inst(group, 'ornament-roundel', U.disc, M.trim, x, y, z, size / 2, 0.14, size / 2, ry, 90 * DEG, 0, false);
      if (!HIGH) return;
      const [x2, z2] = along(ox, oz, ry, 0, 0.05);
      inst(group, 'ornament-roundel-boss', U.disc, M.brick, x2, y, z2, size / 4, 0.1, size / 4, ry, 90 * DEG, 0, false);
    }
  }

  /** Straight balustrade (base rail, balusters, top rail, piers) between a and b, base at y. */
  function balustradeLine(group, ax, az, bx, bz, y, { height = 1.05 } = {}) {
    const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
    const yaw = Math.atan2(-dz, dx); // rotation that maps local +x onto (dx, dz)
    const cx = (ax + bx) / 2, cz = (az + bz) / 2;
    inst(group, 'parapet-rail', U.box, M.trim, cx, y + 0.12, cz, len, 0.24, 0.5, yaw);
    inst(group, 'parapet-rail', U.box, M.trim, cx, y + height - 0.08, cz, len, 0.16, 0.56, yaw);
    if (HIGH) {
      const n = Math.max(1, Math.floor(len / 0.42));
      for (let i = 0; i < n; i++) {
        const f = (i + 0.5) / n, x = ax + dx * f, z = az + dz * f;
        inst(group, 'parapet-baluster', U.baluster, M.trim, x, y + 0.24 + (height - 0.4) / 2, z, 0.08, height - 0.4, 0.08, 0, 0, 0, false);
      }
    } else {
      inst(group, 'parapet-panel', U.box, M.trim, cx, y + 0.24 + (height - 0.4) / 2, cz, len, height - 0.4, 0.22, yaw);
    }
    const np = Math.max(1, Math.round(len / 6));
    for (let i = 0; i <= np; i++) {
      const f = i / np, x = ax + dx * f, z = az + dz * f;
      inst(group, 'parapet-pier', U.box, M.trim, x, y + height / 2 + 0.06, z, 0.62, height + 0.12, 0.62, yaw);
    }
  }

  /** Curved balustrade on a circle (cx, cz, r) between angles t0..t1, base at y. */
  function balustradeArc(group, cx, cz, r, t0, t1, y, { height = 1.05, piers = 0 } = {}) {
    mesh(group, 'parapet-rail-curved', arcBandGeo(cx, cz, r - 0.25, r + 0.25, y, 0.24, t0, t1), M.trim);
    mesh(group, 'parapet-rail-curved', arcBandGeo(cx, cz, r - 0.28, r + 0.28, y + height - 0.16, 0.16, t0, t1), M.trim);
    if (HIGH) {
      const n = Math.max(2, Math.floor(Math.abs(t1 - t0) * r / 0.42));
      for (let i = 0; i < n; i++) {
        const t = t0 + (t1 - t0) * (i + 0.5) / n;
        inst(group, 'parapet-baluster', U.baluster, M.trim, cx + r * Math.sin(t), y + 0.24 + (height - 0.4) / 2, cz + r * Math.cos(t), 0.08, height - 0.4, 0.08, 0, 0, 0, false);
      }
    } else {
      mesh(group, 'parapet-panel-curved', arcBandGeo(cx, cz, r - 0.11, r + 0.11, y + 0.24, height - 0.4, t0, t1), M.trim);
    }
    for (let i = 0; i < piers; i++) {
      const t = t0 + (t1 - t0) * (piers === 1 ? 0.5 : i / (piers - 1));
      inst(group, 'parapet-pier', U.box, M.trim, cx + r * Math.sin(t), y + height / 2 + 0.06, cz + r * Math.cos(t), 0.6, height + 0.12, 0.6, t);
    }
  }

  /* ================================================================== BUILDING */

  // Wing rectangles [x0, x1, z0, z1] — they tile the block without overlapping.
  const WINGS = [
    { id: 'front', r: [-X_OUT, X_OUT, Z_FRONT_IN, Z_FRONT] },
    { id: 'rear', r: [-X_OUT, X_OUT, Z_REAR, Z_REAR_IN] },
    { id: 'west', r: [-X_OUT, -X_IN, Z_REAR_IN, Z_FRONT_IN] },
    { id: 'east', r: [X_IN, X_OUT, Z_REAR_IN, Z_FRONT_IN] },
  ];
  const TURRETS = [[-X_OUT, Z_FRONT, 1], [X_OUT, Z_FRONT, 1], [-X_OUT, Z_REAR, -1], [X_OUT, Z_REAR, -1]];

  // Façade runs: windows are laid out per run (centred), with pilasters at the run ends.
  // axis 'x' → wall at z = fixed; axis 'z' → wall at x = fixed. n = outward normal.
  const tc = TURRET_R + 0.8; // clearance from turret centre
  const FACES = [
    { axis: 'x', fixed: Z_FRONT, n: [0, 1], runs: [[-X_OUT + tc, -13.6], [13.6, X_OUT - tc]], outer: true },
    { axis: 'x', fixed: Z_REAR, n: [0, -1], runs: [[-X_OUT + tc, -1.8], [1.8, X_OUT - tc]], outer: true },
    { axis: 'z', fixed: -X_OUT, n: [-1, 0], runs: [[Z_REAR + tc, Z_FRONT - tc]], outer: true },
    { axis: 'z', fixed: X_OUT, n: [1, 0], runs: [[Z_REAR + tc, Z_FRONT - tc]], outer: true },
    { axis: 'x', fixed: Z_FRONT_IN, n: [0, -1], runs: [[-X_IN, X_IN]], outer: false },
    { axis: 'x', fixed: Z_REAR_IN, n: [0, 1], runs: [[-X_IN, X_IN]], outer: false },
    { axis: 'z', fixed: -X_IN, n: [1, 0], runs: [[Z_REAR_IN, Z_FRONT_IN]], outer: false },
    { axis: 'z', fixed: X_IN, n: [-1, 0], runs: [[Z_REAR_IN, Z_FRONT_IN]], outer: false },
  ];

  function facadeLevel(level) {
    const g = floors[level], { y0, h } = LEVELS[level];
    const ground = level === 0;
    const w = ground ? 1.7 : 1.55, wh = ground ? 2.7 : 2.05, sill = y0 + SLAB + (ground ? 0.7 : 0.75);
    for (const f of FACES) {
      const ry = Math.atan2(f.n[0], f.n[1]);
      const pt = (s) => (f.axis === 'x' ? [s, f.fixed] : [f.fixed, s]);
      for (const [a, b] of f.runs) {
        const L = b - a, nb = Math.max(1, Math.floor((L - 1.6) / BAY)), s0 = a + (L - nb * BAY) / 2 + BAY / 2;
        for (let i = 0; i < nb; i++) {
          const [x, z] = pt(s0 + i * BAY);
          windowAt(g, x, z, ry, sill, w, wh, { mullions: ground ? 3 : 2, transom: HIGH });
          if (i < nb - 1) {
            const [px, pz] = pt(s0 + (i + 0.5) * BAY);
            const pilaster = (i + 1) % 3 === 0 && nb > 4;
            if (pilaster) inst(g, 'pilaster', U.box, M.trim, px, y0 + SLAB + (h - SLAB) / 2, pz, f.axis === 'x' ? 0.85 : 0.5, h - SLAB, f.axis === 'x' ? 0.5 : 0.85);
            else if (f.outer && !ground) ornamentAt(g, (i + level) % 2 ? 'diamond' : 'roundel', px, pz, ry, y0 + SLAB + 1.75, 0.66);
          }
        }
        // pilasters at both run ends (skip where the run meets the drum, which has its own frame)
        for (const s of [a + 0.45, b - 0.45]) {
          const [x, z] = pt(s);
          inst(g, 'pilaster', U.box, M.trim, x, y0 + SLAB + (h - SLAB) / 2, z, f.axis === 'x' ? 0.9 : 0.5, h - SLAB, f.axis === 'x' ? 0.5 : 0.9);
        }
      }
    }
  }

  /* ---------- wings: slab + wall per level */
  for (let level = 0; level < 4; level++) {
    const g = floors[level], { y0, h } = LEVELS[level];
    for (const wing of WINGS) {
      const [x0, x1, z0, z1] = wing.r;
      const lip = level === 0 ? 0.3 : 0.16; // floor-plate lip reads as a stone string course
      mesh(g, `${wing.id}-wing-slab`, boxGeo(x0 - lip, x1 + lip, y0, y0 + SLAB, z0 - lip, z1 + lip), level === 0 ? M.plinth : M.trim);
      mesh(g, `${wing.id}-wing-wall`, boxGeo(x0, x1, y0 + SLAB, y0 + h, z0, z1, BRICK_TILE), level === 0 ? M.stone : M.brick);
    }
    facadeLevel(level);
    // corner turrets
    for (const [tx, tz, sz] of TURRETS) {
      mesh(g, 'turret-slab', cylGeo(tx, tz, TURRET_R + (level === 0 ? 0.3 : 0.16), y0, SLAB, { seg: SEG / 2 }), level === 0 ? M.plinth : M.trim);
      mesh(g, 'turret-wall', cylGeo(tx, tz, TURRET_R, y0 + SLAB, h - SLAB, { tile: BRICK_TILE, seg: SEG / 2 }), level === 0 ? M.stone : M.brick);
      // windows around the exterior arc (front-right turret base angles, mirrored per corner)
      const base = [-52, -12, 28, 68, 108, 148];
      const sx = Math.sign(tx);
      const angles = base.map((t) => { let a = t * DEG; if (sz < 0) a = Math.PI - a; return sx < 0 ? -a : a; });
      const ground = level === 0;
      angles.forEach((a, i) => {
        const ox = tx + TURRET_R * Math.sin(a), oz = tz + TURRET_R * Math.cos(a);
        windowAt(g, ox, oz, a, y0 + SLAB + (ground ? 0.7 : 0.75), ground ? 1.4 : 1.3, ground ? 2.7 : 2.05, { mullions: 2, transom: HIGH });
        if (!ground && i < angles.length - 1) {
          const am = (a + angles[i + 1]) / 2;
          ornamentAt(g, (i + level) % 2 ? 'diamond' : 'roundel', tx + TURRET_R * Math.sin(am), tz + TURRET_R * Math.cos(am), am, y0 + SLAB + 1.75, 0.62);
        }
      });
    }
  }

  /* ---------- roof (part of level 3): cornice slab, deck, balustrades, turret crowns, pavilions */
  {
    const g = floors[3], y = ROOF_Y;
    for (const wing of WINGS) {
      const [x0, x1, z0, z1] = wing.r;
      mesh(g, `${wing.id}-cornice`, boxGeo(x0 - 0.35, x1 + 0.35, y, y + 0.45, z0 - 0.35, z1 + 0.35), M.trim);
      mesh(g, `${wing.id}-roof-deck`, boxGeo(x0 + 0.5, x1 - 0.5, y + 0.45, y + 0.5, z0 + 0.5, z1 - 0.5), M.roof, false, true);
    }
    const yb = y + 0.45, e = 0.05; // balustrade sits on the cornice edge
    const c = TURRET_R - 0.4;
    // outer perimeter (interrupted by turrets and the drum)
    balustradeLine(g, -X_OUT + c, Z_FRONT - e, -DRUM.RA - 0.2, Z_FRONT - e, yb);
    balustradeLine(g, DRUM.RA + 0.2, Z_FRONT - e, X_OUT - c, Z_FRONT - e, yb);
    balustradeLine(g, -X_OUT + c, Z_REAR + e, X_OUT - c, Z_REAR + e, yb);
    balustradeLine(g, -X_OUT + e, Z_REAR + c, -X_OUT + e, Z_FRONT - c, yb);
    balustradeLine(g, X_OUT - e, Z_REAR + c, X_OUT - e, Z_FRONT - c, yb);
    // courtyard edge
    balustradeLine(g, -X_IN, Z_FRONT_IN + e, X_IN, Z_FRONT_IN + e, yb);
    balustradeLine(g, -X_IN, Z_REAR_IN - e, X_IN, Z_REAR_IN - e, yb);
    balustradeLine(g, -X_IN - e, Z_REAR_IN, -X_IN - e, Z_FRONT_IN, yb);
    balustradeLine(g, X_IN + e, Z_REAR_IN, X_IN + e, Z_FRONT_IN, yb);
    // turret crowns: deep cornice + curved balustrade over the exterior arc
    for (const [tx, tz, sz] of TURRETS) {
      mesh(g, 'turret-cornice', cylGeo(tx, tz, TURRET_R + 0.4, y, 0.45, { seg: SEG / 2 }), M.trim);
      mesh(g, 'turret-frieze', cylGeo(tx, tz, TURRET_R + 0.12, y - 0.85, 0.5, { seg: SEG / 2, open: true }), M.trim);
      const sx = Math.sign(tx);
      let t0 = -90 * DEG, t1 = 180 * DEG;                    // front-right exterior arc
      if (sz < 0) { [t0, t1] = [Math.PI - t1, Math.PI - t0]; }
      if (sx < 0) { [t0, t1] = [-t1, -t0]; }
      balustradeArc(g, tx, tz, TURRET_R - 0.1, t0, t1, yb, { piers: 4 });
    }
    // rooftop pavilions (stair / plant enclosures) give the roofscape some rhythm
    const pav = [[-X_OUT + 6.5, -25, 6, 9], [X_OUT - 6.5, -25, 6, 9], [0, Z_REAR + 6.5, 12, 6]];
    for (const [px, pz, sx, sz] of pav) {
      mesh(g, 'roof-pavilion', boxGeo(px - sx / 2, px + sx / 2, y + 0.5, y + 3.1, pz - sz / 2, pz + sz / 2, BRICK_TILE), M.stone);
      mesh(g, 'roof-pavilion-cornice', boxGeo(px - sx / 2 - 0.25, px + sx / 2 + 0.25, y + 3.1, y + 3.45, pz - sz / 2 - 0.25, pz + sz / 2 + 0.25), M.trim);
    }
    // roof-terrace planting along the front wing
    for (let i = 0; i < 10; i++) {
      const x = (i < 5 ? -1 : 1) * (17 + (i % 5) * 5.4);
      inst(g, 'roof-planter', U.box, M.trim, x, y + 0.85, Z_FRONT - 2.2, 1.6, 0.7, 1.6);
      inst(g, 'roof-shrub', U.bush, M.hedge, x, y + 1.6, Z_FRONT - 2.2, 0.95, 0.75, 0.95);
    }
  }

  /* ---------- central drum */
  const { x: DX, z: DZ, R, RW, RG, RA } = DRUM;
  const ARC = 84 * DEG; // balconies wrap ±84° (their ends tuck into the front wing)
  {
    // Level 0: plinth, stone ground floor with a colonnade and glazed entrance
    const g = floors[0], { y0, h } = LEVELS[0];
    mesh(g, 'drum-plinth', cylGeo(DX, DZ, R + 0.1, y0, SLAB), M.plinth);
    mesh(g, 'drum-entrance-steps', arcBandGeo(DX, DZ, R + 0.1, R + 0.55, 0, 0.26, -32 * DEG, 32 * DEG), M.plinth);
    mesh(g, 'drum-entrance-steps', arcBandGeo(DX, DZ, R + 0.55, R + 1.0, 0, 0.13, -32 * DEG, 32 * DEG), M.plinth);
    mesh(g, 'drum-ground-wall', cylGeo(DX, DZ, RG, y0 + SLAB, h - SLAB, { t0: -105 * DEG, tl: 210 * DEG, open: true, tile: BRICK_TILE }), M.stone);
    for (let a = -30; a <= 30; a += 10) {   // tall bronze-framed entrance glazing
      const t = a * DEG;
      windowAt(g, DX + RG * Math.sin(t), DZ + RG * Math.cos(t), t, y0 + SLAB + 0.15, 1.6, 3.4, { mullions: 2, transom: true, frameMat: M.bronze, lit: true });
    }
    for (let a = 40; a <= 75; a += 10) for (const s of [-1, 1]) {
      const t = s * a * DEG;
      windowAt(g, DX + RG * Math.sin(t), DZ + RG * Math.cos(t), t, y0 + SLAB + 0.7, 1.4, 2.7, { mullions: 2, transom: HIGH });
    }
    for (let a = -75; a <= 75; a += 10) {   // colonnade carrying the first balcony
      const t = a * DEG, rc = R - 0.45, x = DX + rc * Math.sin(t), z = DZ + rc * Math.cos(t);
      inst(g, 'drum-column', U.cyl, M.trim, x, y0 + SLAB + (h - SLAB) / 2, z, 0.3, h - SLAB - 0.5, 0.3);
      inst(g, 'drum-column-base', U.box, M.trim, x, y0 + SLAB + 0.15, z, 0.75, 0.3, 0.75, t);
      inst(g, 'drum-column-capital', U.box, M.trim, x, y0 + h - 0.12, z, 0.8, 0.24, 0.8, t);
    }

    // Levels 1–3: curved balconies — slab, terracotta balustrade with motifs, slender columns, recessed wall with French doors
    for (let level = 1; level <= 3; level++) {
      const gl = floors[level], L = LEVELS[level], yb = L.y0 + SLAB, bh = 1.05;
      mesh(gl, 'drum-balcony-slab', cylGeo(DX, DZ, R, L.y0, SLAB), M.trim);
      mesh(gl, 'drum-balcony-soffit-band', cylGeo(DX, DZ, R + 0.12, L.y0 + 0.06, 0.24, { t0: -ARC, tl: 2 * ARC, open: true }), M.trim);
      mesh(gl, 'drum-balustrade', arcBandGeo(DX, DZ, R - 0.34, R - 0.06, yb, bh, -ARC, ARC), M.brick);
      mesh(gl, 'drum-balustrade-coping', arcBandGeo(DX, DZ, R - 0.42, R + 0.04, yb + bh, 0.12, -ARC, ARC), M.trim);
      for (let a = -76, i = 0; a <= 76; a += 9.5, i++) {
        const t = a * DEG;
        ornamentAt(gl, (i + level) % 2 ? 'diamond' : 'roundel', DX + (R - 0.06) * Math.sin(t), DZ + (R - 0.06) * Math.cos(t), t, yb + bh / 2, 0.62);
      }
      const ct = yb + bh + 0.12, ch = L.y0 + L.h - ct;
      for (let a = -76; a <= 76; a += 19) {
        const t = a * DEG, rc = R - 0.22;
        inst(gl, 'drum-balcony-column', U.shaft, M.trim, DX + rc * Math.sin(t), ct + ch / 2, DZ + rc * Math.cos(t), 0.15, ch, 0.15);
      }
      mesh(gl, 'drum-recessed-wall', cylGeo(DX, DZ, RW, yb, L.h - SLAB, { open: true, tile: BRICK_TILE }), M.brick);
      for (let a = -72; a <= 72; a += 12) {
        const t = a * DEG;
        windowAt(gl, DX + RW * Math.sin(t), DZ + RW * Math.cos(t), t, yb + 0.05, 1.25, 2.55, { mullions: 2, transom: HIGH });
      }
    }

    // Level 4: attic drum with cornice, crown balustrade and a front cartouche (teal medallion accent)
    {
      const gl = floors[4], L = LEVELS[4], top = L.y0 + L.h;
      mesh(gl, 'drum-attic-slab', cylGeo(DX, DZ, R + 0.12, L.y0, 0.5), M.trim);
      mesh(gl, 'drum-attic-wall', cylGeo(DX, DZ, RA, L.y0 + 0.5, L.h - 0.5, { tile: BRICK_TILE }), M.brick);
      mesh(gl, 'drum-attic-cornice', cylGeo(DX, DZ, RA + 0.4, top, 0.45), M.trim);
      mesh(gl, 'drum-attic-roof', cylGeo(DX, DZ, RA - 0.3, top + 0.45, 0.06), M.roof, false, true);
      mesh(gl, 'drum-attic-frieze', cylGeo(DX, DZ, RA + 0.1, top - 0.75, 0.42, { open: true }), M.trim);
      for (let a = 0, i = 0; a < 360; a += 15, i++) {
        const t = a * DEG; if (a < 12 || a > 348) continue;
        windowAt(gl, DX + RA * Math.sin(t), DZ + RA * Math.cos(t), t, L.y0 + 0.95, 1.05, 1.15, { mullions: 1, transom: false });
        const tm = t + 7.5 * DEG;
        if (a < 345) ornamentAt(gl, i % 2 ? 'diamond' : 'roundel', DX + RA * Math.sin(tm), DZ + RA * Math.cos(tm), tm, L.y0 + 1.5, 0.52);
      }
      balustradeArc(gl, DX, DZ, RA, -Math.PI, Math.PI, top + 0.45, { height: 0.95, piers: 0 });
      // cartouche: raised terracotta panel, cream frame and cap, teal medallion
      const cy = top + 0.45, cw = 5.4, chh = 2.6, cz = DZ + RA - 0.1;
      mesh(gl, 'crown-cartouche', boxGeo(-cw / 2, cw / 2, cy, cy + chh, cz - 0.8, cz + 0.2, BRICK_TILE), M.brick);
      mesh(gl, 'crown-cartouche-frame', boxGeo(-cw / 2 - 0.25, -cw / 2 + 0.05, cy, cy + chh, cz - 0.85, cz + 0.32), M.trim);
      mesh(gl, 'crown-cartouche-frame', boxGeo(cw / 2 - 0.05, cw / 2 + 0.25, cy, cy + chh, cz - 0.85, cz + 0.32), M.trim);
      mesh(gl, 'crown-cartouche-cap', boxGeo(-cw / 2 - 0.45, cw / 2 + 0.45, cy + chh, cy + chh + 0.32, cz - 1.0, cz + 0.45), M.trim);
      mesh(gl, 'crown-cartouche-sill', boxGeo(-cw / 2 - 0.3, cw / 2 + 0.3, cy, cy + 0.28, cz - 0.9, cz + 0.4), M.trim);
      inst(gl, 'crown-medallion-ring', U.disc, M.trim, 0, cy + chh / 2 + 0.05, cz + 0.24, 0.85, 0.12, 0.85, 0, 90 * DEG);
      inst(gl, 'crown-medallion', U.disc, M.teal, 0, cy + chh / 2 + 0.05, cz + 0.3, 0.6, 0.1, 0.6, 0, 90 * DEG, 0, false);
      for (const s of [-1, 1]) inst(gl, 'crown-finial', U.cyl, M.trim, s * (cw / 2 + 0.1), cy + chh + 0.62, cz - 0.3, 0.22, 0.6, 0.22);
    }
  }

  /* ---------- porte-cochère (level 0): cantilevered timber pergola on four stone columns */
  {
    const g = floors[0];
    const P0 = -34 * DEG, P1 = 34 * DEG, rIn = R - 0.05, rOut = 24.0;
    const yb = 5.45, beam = 0.55;           // underside of rafters / rafter depth
    mesh(g, 'porte-cochere-fascia', arcBandGeo(DX, DZ, rOut - 0.5, rOut, yb - 0.15, beam + 0.4, P0, P1), M.timber);
    mesh(g, 'porte-cochere-ledger', arcBandGeo(DX, DZ, rIn, rIn + 0.45, yb, beam + 0.1, P0, P1), M.timber);
    const step = HIGH ? 1.6 : 3.2;
    for (let a = P0 / DEG; a <= P1 / DEG + 1e-6; a += step) {
      const t = a * DEG, edge = Math.abs(a) > 33.5;
      const rm = (rIn + rOut) / 2, len = rOut - rIn - 0.4;
      inst(g, edge ? 'porte-cochere-edge-beam' : 'porte-cochere-rafter', U.box, M.timber, DX + rm * Math.sin(t), yb + beam / 2, DZ + rm * Math.cos(t), edge ? 0.5 : 0.16, edge ? beam + 0.3 : beam, len, t);
    }
    for (const r of [14.6, 17.2, 19.8, 22.4]) mesh(g, 'porte-cochere-purlin', arcBandGeo(DX, DZ, r - 0.09, r + 0.09, yb + beam, 0.14, P0, P1), M.timber);
    // stone columns with base and capital
    for (const a of [-29, -9.5, 9.5, 29]) {
      const t = a * DEG, rc = 20.6, x = DX + rc * Math.sin(t), z = DZ + rc * Math.cos(t);
      inst(g, 'porte-cochere-column', U.cyl, M.trim, x, 0.06 + (yb - 0.6) / 2 + 0.25, z, 0.42, yb - 0.6 - 0.5, 0.42);
      inst(g, 'porte-cochere-column-base', U.box, M.plinth, x, 0.06 + 0.25, z, 1.15, 0.5, 1.15, t);
      inst(g, 'porte-cochere-column-capital', U.cyl, M.trim, x, yb - 0.32, z, 0.62, 0.36, 0.62);
      inst(g, 'porte-cochere-column-abacus', U.box, M.trim, x, yb - 0.07, z, 1.35, 0.14, 1.35, t);
    }
    // downlights (glow at night)
    for (const r of [15.9, 21.1]) for (const a of [-22, -7, 7, 22]) {
      const t = a * DEG;
      inst(g, 'porte-cochere-downlight', U.disc, M.lamp, DX + r * Math.sin(t), yb - 0.03, DZ + r * Math.cos(t), 0.22, 0.06, 0.22, 0, 0, 0, false);
    }
    for (const s of [-1, 1]) {
      const l = new THREE.PointLight('#ffd7a0', 0, 22, 2); l.name = 'porte-cochere-light';
      l.position.set(s * 6, 4.6, DZ + 18.5); l.userData.nightIntensity = 60; g.add(l); lamps.push(l);
    }
  }

  /* ================================================================== SITE (non-exploding) */
  {
    const S = site;
    // forecourt / surrounding paving
    const pw = 128, pd = 122, pcz = 1;
    const pg = G(new THREE.PlaneGeometry(pw, pd)); pg.rotateX(-Math.PI / 2); pg.translate(0, 0.02, pcz);
    paveTex.repeat.set(pw / PAVE_TILE, pd / PAVE_TILE);
    mesh(S, 'forecourt-paving', pg, M.paving, false, true);

    // arrival drive: drop-off arc under the canopy + two straight lanes to the site edge
    mesh(S, 'drive-dropoff', arcFlatGeo(DX, DZ, R + 1.0, 27.5, 0.05, -44 * DEG, 44 * DEG), M.drive, false, true);
    for (const s of [-1, 1]) {
      const lg = G(new THREE.PlaneGeometry(6.4, 36)); lg.rotateX(-Math.PI / 2); lg.translate(s * 11.6, 0.05, 43.5);
      mesh(S, 'drive-lane', lg, M.drive, false, true);
      // granite kerbs
      inst(S, 'kerb', U.box, M.plinth, s * 8.25, 0.09, 43.5, 0.3, 0.16, 36);
      inst(S, 'kerb', U.box, M.plinth, s * 14.95, 0.09, 43.5, 0.3, 0.16, 36);
    }

    // reflecting pool on the forecourt axis
    {
      const x0 = -5, x1 = 5, z0 = 31.5, z1 = 55, cw = 0.6, ch = 0.38;
      mesh(S, 'pool-coping', boxGeo(x0 - cw, x1 + cw, 0, ch, z0 - cw, z0), M.trim);
      mesh(S, 'pool-coping', boxGeo(x0 - cw, x1 + cw, 0, ch, z1, z1 + cw), M.trim);
      mesh(S, 'pool-coping', boxGeo(x0 - cw, x0, 0, ch, z0, z1), M.trim);
      mesh(S, 'pool-coping', boxGeo(x1, x1 + cw, 0, ch, z0, z1), M.trim);
      mesh(S, 'pool-basin', boxGeo(x0, x1, 0, 0.06, z0, z1), M.poolTile, false, true);
      const wg = G(new THREE.PlaneGeometry(x1 - x0, z1 - z0)); wg.rotateX(-Math.PI / 2); wg.translate(0, ch - 0.07, (z0 + z1) / 2);
      mesh(S, 'pool-water', wg, M.water, false, true);
      const pl = new THREE.PointLight('#7fe0d4', 0, 16, 2); pl.name = 'pool-light'; pl.position.set(0, 2.2, 37); pl.userData.nightIntensity = 8; S.add(pl); lamps.push(pl);
      const pl2 = pl.clone(); pl2.position.set(0, 2.2, 49.5); pl2.userData.nightIntensity = 8; S.add(pl2); lamps.push(pl2);
    }

    // lawn parterres flanking the forecourt, framed by low hedges
    for (const s of [-1, 1]) {
      const x0 = s > 0 ? 19 : -45, x1 = s > 0 ? 45 : -19, z0 = 11, z1 = 53;
      mesh(S, 'parterre-lawn', boxGeo(x0, x1, 0, 0.12, z0, z1), M.lawn, false, true);
      inst(S, 'parterre-hedge', U.box, M.hedge, (x0 + x1) / 2, 0.4, z0 + 0.4, x1 - x0, 0.7, 0.8);
      inst(S, 'parterre-hedge', U.box, M.hedge, (x0 + x1) / 2, 0.4, z1 - 0.4, x1 - x0, 0.7, 0.8);
      inst(S, 'parterre-hedge', U.box, M.hedge, x0 + 0.4, 0.4, (z0 + z1) / 2, 0.8, 0.7, z1 - z0 - 1.6);
      inst(S, 'parterre-hedge', U.box, M.hedge, x1 - 0.4, 0.4, (z0 + z1) / 2, 0.8, 0.7, z1 - z0 - 1.6);
      // a cross path of paving through each parterre
      mesh(S, 'parterre-path', boxGeo(x0 + 0.8, x1 - 0.8, 0.02, 0.14, 30.5, 33.5), M.drive, false, true);
    }
    // base hedge + shrubs along the front wing (as in the render)
    for (const s of [-1, 1]) {
      inst(S, 'base-hedge', U.box, M.hedge, s * 28, 0.45, Z_FRONT + 1.1, 25, 0.9, 1.1);
      for (let i = 0; i < (HIGH ? 9 : 5); i++) {
        const x = s * (17.2 + i * (22 / ((HIGH ? 9 : 5) - 1)));
        inst(S, 'shrub', U.bush, M.hedge, x, 0.9, Z_FRONT + 1.2, 0.9, 0.75, 0.9);
      }
    }

    // inner courtyard: four lawns, cross paths, central fountain
    {
      const cz = (Z_FRONT_IN + Z_REAR_IN) / 2;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const xa = sx * 3.2, xb = sx * (X_IN - 2.2), za = cz + sz * 3.2, zb = cz + sz * 11.6;
        mesh(S, 'courtyard-lawn', boxGeo(Math.min(xa, xb), Math.max(xa, xb), 0, 0.12, Math.min(za, zb), Math.max(za, zb)), M.lawn, false, true);
        for (let i = 0; i < (HIGH ? 6 : 3); i++) {
          const t = (i + 0.5) / (HIGH ? 6 : 3);
          inst(S, 'shrub', U.bush, M.hedge, xa + (xb - xa) * t, 0.65, za + 0.6 * sz, 0.75, 0.6, 0.75);
        }
      }
      mesh(S, 'fountain-rim', arcBandGeo(0, cz, 3.0, 3.6, 0, 0.55, -Math.PI, Math.PI), M.trim);
      const fw = cylGeo(0, cz, 3.02, 0, 0.42, { seg: 40 });
      mesh(S, 'fountain-water', fw, M.water, false, true);
      mesh(S, 'fountain-pedestal', cylGeo(0, cz, 0.45, 0.42, 1.0, { seg: 20 }), M.trim);
      mesh(S, 'fountain-bowl', cylGeo(0, cz, 1.3, 1.42, 0.22, { seg: 28 }), M.trim);
      mesh(S, 'fountain-finial', cylGeo(0, cz, 0.22, 1.64, 0.6, { seg: 14 }), M.trim);
      const cl = new THREE.PointLight('#ffd9a8', 0, 26, 2); cl.name = 'courtyard-light'; cl.position.set(0, 4, cz); cl.userData.nightIntensity = 70; S.add(cl); lamps.push(cl);
    }

    // palms: InstancedMesh trunks + crowns
    const palmPts = [];
    for (const s of [-1, 1]) {
      for (let z = 12; z <= 54; z += 7) palmPts.push([s * 16.8, z]);
      palmPts.push([s * 23, 15], [s * 41, 15], [s * 23, 49], [s * 41, 49], [s * 32, 32]);
      for (let z = -46; z <= -4; z += 10.5) palmPts.push([s * 57, z]);
      palmPts.push([s * 8, cz2(-1)], [s * 26, cz2(-1)], [s * 8, cz2(1)], [s * 26, cz2(1)]);
    }
    function cz2(sz) { return (Z_FRONT_IN + Z_REAR_IN) / 2 + sz * 7.4; }
    const trunkGeo = G(new THREE.CylinderGeometry(0.17, 0.27, 1, HIGH ? 7 : 5, HIGH ? 3 : 1)); trunkGeo.translate(0, 0.5, 0);
    const crownGeo = G(palmCrownGeometry(THREE, HIGH ? 12 : 7, HIGH ? 6 : 4));
    palmPts.forEach(([x, z]) => {
      const hgt = 7.5 + rnd() * 4.5, lean = (rnd() - 0.5) * 0.12, yaw = rnd() * TAU;
      inst(S, 'palm-trunk', trunkGeo, M.trunk, x, 0.05, z, 1, hgt, 1, yaw, lean, 0);
      const tx = x + Math.sin(yaw) * Math.sin(lean) * hgt, tz = z + Math.cos(yaw) * Math.sin(lean) * hgt;
      const sc = 0.9 + rnd() * 0.3;
      inst(S, 'palm-crown', crownGeo, M.frond, tx, hgt * Math.cos(lean), tz, sc, sc, sc, rnd() * TAU);
    });

    // lamp posts along the drive lanes
    for (const s of [-1, 1]) for (const z of [31, 43, 55]) {
      const x = s * 15.6;
      inst(S, 'lamp-post', U.cyl, M.darkMetal, x, 2.1, z, 0.08, 4.2, 0.08);
      inst(S, 'lamp-post-base', U.cyl, M.darkMetal, x, 0.25, z, 0.2, 0.5, 0.2);
      inst(S, 'lamp-head', U.box, M.lamp, x, 4.42, z, 0.36, 0.5, 0.36, 0, 0, 0, false);
      inst(S, 'lamp-cap', U.box, M.darkMetal, x, 4.73, z, 0.5, 0.1, 0.5);
    }
    for (const s of [-1, 1]) {
      const l = new THREE.PointLight('#ffe0b0', 0, 24, 2); l.name = 'drive-light'; l.position.set(s * 15.6, 4.2, 43); l.userData.nightIntensity = 45; S.add(l); lamps.push(l);
    }

    // a parked sedan under the canopy (scale reference)
    {
      const car = new THREE.Group(); car.name = 'car'; car.position.set(5.2, 0.05, DZ + 16.2); car.rotation.y = -Math.PI / 2 - 0.28; S.add(car);
      mesh(car, 'car-body', boxGeo(-2.3, 2.3, 0.3, 0.95, -0.9, 0.9), M.carPaint);
      mesh(car, 'car-cabin', boxGeo(-1.25, 1.05, 0.95, 1.45, -0.78, 0.78), M.glass, false);
      mesh(car, 'car-roof', boxGeo(-1.05, 0.85, 1.43, 1.5, -0.74, 0.74), M.carPaint);
      for (const wx of [-1.45, 1.45]) for (const wz of [-0.82, 0.82]) inst(car, 'car-wheel', U.cyl, M.tyre, wx, 0.34, wz, 0.34, 0.24, 0.34, 0, 90 * DEG);
    }
  }

  flushBatches();

  // every mesh casts/receives as set above; glass & water never write depth so the backings show through

  /* ---------- runtime API */
  let tAcc = 0;
  function update(dt) {
    tAcc += dt || 0;
    waterNormal.offset.set(tAcc * 0.012, tAcc * 0.007);
  }

  function dispose() {
    for (const im of instanced) im.dispose();
    for (const l of lamps) l.dispose?.();
    for (const g of geos) g.dispose();
    for (const m of mats) m.dispose();
    for (const t of texs) t.dispose();
    geos.clear(); mats.clear(); texs.clear(); instanced.length = 0;
  }

  return { root, floors, site, nightMaterials, lamps, update, dispose };
}

/* ------------------------------------------------------------------ palm crown geometry */
/**
 * One palm crown as a single BufferGeometry: `n` drooping fronds, each a folded strip of `seg` segments.
 * Origin is the top of the trunk.
 */
function palmCrownGeometry(THREE, n, seg) {
  const pos = [], idx = [];
  const Lf = 3.6;
  for (let f = 0; f < n; f++) {
    const a = (f / n) * Math.PI * 2 + (f % 2) * 0.2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const tilt = f % 3 === 0 ? 0.55 : 0.25;    // a few fronds rise higher
    const base = pos.length / 3;
    for (let i = 0; i <= seg; i++) {
      const s = i / seg, d = Lf * s;
      const y = Lf * (tilt * s - 0.62 * s * s);
      const w = 0.62 * Math.sin(Math.PI * Math.min(1, s * 1.08)) + 0.04;
      // centre line + two edges (edges dropped slightly → V fold)
      const cx = sa * d, cz = ca * d;
      const px = ca, pz = -sa;                 // perpendicular in plan
      pos.push(cx, y, cz);
      pos.push(cx + px * w, y - 0.14 * w, cz + pz * w);
      pos.push(cx - px * w, y - 0.14 * w, cz - pz * w);
    }
    for (let i = 0; i < seg; i++) {
      const c0 = base + i * 3, c1 = c0 + 3;
      idx.push(c0, c0 + 1, c1 + 1, c0, c1 + 1, c1);       // one half
      idx.push(c0, c1, c1 + 2, c0, c1 + 2, c0 + 2);       // other half
    }
  }
  // small cluster at the crown base
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
