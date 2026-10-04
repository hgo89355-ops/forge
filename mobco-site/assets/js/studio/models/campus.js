/**
 * MOBCO Project Builder · model: "campus"
 * ---------------------------------------------------------------------------
 * An ILLUSTRATIVE massing model inspired by the aerial render of the
 * "Innovation Campus" (assets/img/campus.webp). It is not a replica and carries
 * no real dimensions: two white ring buildings with perforated shells wrapped
 * around garden courtyards, a slender glass tower with a sail-like fin, a
 * sweeping pedestrian sky bridge, and a plaza with water and palm groves.
 *
 * Module contract (shared with the Studio engine):
 *   export const meta       , ids, copy, camera presets, hotspots, sun
 *   export function build(THREE, ctx) → { root, floors, site, nightMaterials,
 *                                         lamps, update, dispose }
 * The module imports nothing; THREE is injected. World units are metres,
 * ground is y = 0. The engine provides ground, sky, lights and fog.
 */

export const meta = {
  id: 'campus',
  name: { en: 'Innovation Campus', ar: 'حرم الابتكار' },
  projectSlug: 'innovation-campus',
  tagline: {
    en: 'Ring buildings, a sail-finned tower and a sweeping sky bridge, set in landscaped grounds.',
    ar: 'مبانٍ حلقية وبرج بعنصر شراعي وجسر معلّق انسيابي، وسط مساحات خضراء منسّقة.',
  },
  descriptors: [
    { label: { en: 'Typology', ar: 'النمط' }, value: { en: 'Campus', ar: 'حرم تعليمي' } },
    { label: { en: 'Massing', ar: 'التكوين الكتلي' }, value: { en: 'Two ring buildings around garden courtyards', ar: 'مبنيان حلقيان حول فناءين مزروعين' } },
    { label: { en: 'Landmark', ar: 'العنصر المميّز' }, value: { en: 'Central tower with a sail-like fin', ar: 'برج مركزي بعنصر شراعي منحنٍ' } },
    { label: { en: 'Connection', ar: 'الربط' }, value: { en: 'Curved pedestrian sky bridge', ar: 'جسر مشاة معلّق منحنٍ' } },
    { label: { en: 'Landscape', ar: 'تنسيق الموقع' }, value: { en: 'Plaza, water and palm groves', ar: 'ساحة ومسطّحات مائية وبساتين نخيل' } },
  ],
  camera: {
    target: [0, 9, -2],
    aerial: [86, 88, 150],
    street: [0, 2.0, 68],
    top: [0, 180, 0.01],
    front: [0, 18, 150],
  },
  hotspots: [
    {
      id: 'shell', position: [-36, 18.6, 47],
      title: { en: 'Perforated shell', ar: 'الغلاف المثقّب' },
      text: {
        en: 'A soft white shell wraps each ring building; a scatter of glazed panels lets daylight into the upper levels.',
        ar: 'يلتفّ غلاف أبيض انسيابي حول كل مبنى حلقي، وتسمح ألواح زجاجية متناثرة بدخول الضوء الطبيعي إلى المستويات العليا.',
      },
    },
    {
      id: 'bridge', position: [0, 14.8, 47.5],
      title: { en: 'Sky bridge', ar: 'الجسر المعلّق' },
      text: {
        en: 'A curved, glazed pedestrian bridge links the two rings at an upper level and passes over the entrance boulevard.',
        ar: 'جسر مشاة زجاجي منحنٍ يربط المبنيين الحلقيين عند مستوى علوي ويمرّ فوق جادة المدخل.',
      },
    },
    {
      id: 'tower', position: [0, 50, -38],
      title: { en: 'Central tower', ar: 'البرج المركزي' },
      text: {
        en: 'A slender glass drum with white floor bands, framed by a sail-like fin that rises above the crown.',
        ar: 'أسطوانة زجاجية رشيقة بأحزمة بيضاء عند كل طابق، يحتضنها عنصر شراعي يرتفع فوق تاج البرج.',
      },
    },
    {
      id: 'plaza', position: [0, 1.6, -25],
      title: { en: 'Central plaza', ar: 'الساحة المركزية' },
      text: {
        en: 'A circular paved plaza with a reflecting pool and a glass pavilion gathers arrivals at the foot of the tower.',
        ar: 'ساحة دائرية مرصوفة مع حوض عاكس وجناح زجاجي تستقبل القادمين عند قاعدة البرج.',
      },
    },
    {
      id: 'courtyard', position: [36, 4, 30],
      title: { en: 'Garden courtyard', ar: 'الفناء المزروع' },
      text: {
        en: 'Each ring wraps around a shaded garden courtyard planted with palms.',
        ar: 'يحيط كل مبنى حلقي بفناء مظلّل مزروع بالنخيل.',
      },
    },
  ],
  sun: { azimuth: -35, elevation: 40 },
};

/* ------------------------------------------------------------------------ */
/* Parameters (all illustrative)                                             */
/* ------------------------------------------------------------------------ */

/** Ring buildings: superellipse cross-section revolved around a vertical axis. */
const RING_DEFAULTS = {
  rc: 17.5,        // radius of the shell's cross-section centre
  a: 7.6,          // half-width of the cross-section (radial)
  b: 5.4,          // half-height of the cross-section
  yc: 12.2,        // height of the cross-section centre
  n: 3.4,          // superellipse exponent (2 = ellipse, larger = boxier)
  tilt: 0.16,      // lowers the courtyard side (rise per metre towards the outside)
  yEdge: 8.4,      // height of the shell's lower edges (the glazed base runs below it)
  levels: [0, 4.2, 8.4, 12.8], // floor breaks: ground, L1 (glazed base), L2 (in shell), roof canopy
};

const RINGS = [
  { id: 'ring-west', cx: -36, cz: 30, seed: 11, phase: 0.4, nameEn: 'West ring', nameAr: 'المبنى الحلقي الغربي' },
  { id: 'ring-east', cx: 36, cz: 30, seed: 29, phase: 2.1, nameEn: 'East ring', nameAr: 'المبنى الحلقي الشرقي', rc: 17.0, a: 7.2 },
];

const TOWER = {
  id: 'tower', cx: 0, cz: -38,
  R: 7,            // glass drum radius
  lobbyH: 6,       // lobby height
  floorH: 4.2,     // typical floor-to-floor
  floors: 9,       // typical floors above the lobby
  crownH: 3.8,     // crown drum height
  finH: 64,        // overall height of the sail fin tip
  finTheta: 0.95,  // bearing (rad, from +z towards +x) of the fin's centre at its base
};

const COLORS = {
  white: 0xf3f2ee,
  shell: 0xf6f5f1,
  glass: 0x93b7c6,
  panel: 0x34566b,
  interior: 0xb9b6ae,
  frame: 0xe6e6e2,
  stone: 0xe3dfd6,
  plaza: 0xffffff,
  lawn: 0x93a77f,
  asphalt: 0x62686c,
  marking: 0xf1f1ee,
  water: 0x5fb3bf,
  trunk: 0x9d917f,
  frond: 0x5f8250,
  canopy: 0x6f8a5c,
  teal: 0x5fb2b8,
  glowWarm: 0xffc98a,
  lampGlow: 0xffe3b8,
};

/* ------------------------------------------------------------------------ */
/* Pure helpers                                                              */
/* ------------------------------------------------------------------------ */

/** Deterministic PRNG (mulberry32) so the model is identical on every load. */
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const spow = (x, p) => Math.sign(x) * Math.pow(Math.abs(x), p);

/**
 * Dense ring-shell profile in the (r, y) plane, from the outer lower edge, over
 * the top, to the courtyard-side lower edge. Each point carries its outward
 * normal (nr, ny) and cumulative arc length s.
 */
function ringProfile(c, samples) {
  const p = 2 / c.n;
  // angle at which the superellipse reaches yEdge (ignoring tilt; tilt handled by clipping below)
  const k = clamp((c.yc - c.yEdge) / c.b, 0, 0.99);
  const phi0 = -Math.asin(Math.pow(k, c.n / 2)) - 0.12;
  const phi1 = Math.PI - phi0;
  const raw = [];
  for (let i = 0; i <= samples; i++) {
    const phi = phi0 + (phi1 - phi0) * (i / samples);
    const r = c.rc + c.a * spow(Math.cos(phi), p);
    let y = c.yc + c.b * spow(Math.sin(phi), p);
    y -= c.tilt * (c.rc - r) * smoothstep(c.yc - c.b, c.yc + c.b, y + 2); // courtyard side sits lower
    raw.push({ r, y });
  }
  // keep only the part above yEdge (trim both ends at exactly yEdge)
  const pts = [];
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i];
    if (a.y >= c.yEdge) {
      if (pts.length === 0 && i > 0) {
        const b = raw[i - 1]; const t = (c.yEdge - b.y) / (a.y - b.y);
        pts.push({ r: b.r + (a.r - b.r) * t, y: c.yEdge });
      }
      pts.push({ ...a });
    } else if (pts.length) {
      const b = raw[i - 1]; const t = (c.yEdge - b.y) / (a.y - b.y);
      pts.push({ r: b.r + (a.r - b.r) * t, y: c.yEdge });
      break;
    }
  }
  // normals + arc length
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dr = b.r - a.r, dy = b.y - a.y, l = Math.hypot(dr, dy) || 1;
    pts[i].nr = dy / l; pts[i].ny = -dr / l; pts[i].tr = dr / l; pts[i].ty = dy / l;
    if (i > 0) s += Math.hypot(pts[i].r - pts[i - 1].r, pts[i].y - pts[i - 1].y);
    pts[i].s = s;
  }
  return pts;
}

/** Interpolate a profile at arc length s. */
function profileAt(pts, s) {
  let i = 1;
  while (i < pts.length - 1 && pts[i].s < s) i++;
  const a = pts[i - 1], b = pts[i];
  const t = clamp((s - a.s) / ((b.s - a.s) || 1), 0, 1);
  const L = (k) => a[k] + (b[k] - a[k]) * t;
  const nr = L('nr'), ny = L('ny'), nl = Math.hypot(nr, ny) || 1;
  const tr = L('tr'), ty = L('ty'), tl = Math.hypot(tr, ty) || 1;
  return { r: L('r'), y: L('y'), nr: nr / nl, ny: ny / nl, tr: tr / tl, ty: ty / tl };
}

/** Clip a profile polyline to the height band [y0, y1]; returns contiguous pieces. */
function sliceProfile(pts, y0, y1) {
  const out = [];
  let cur = null;
  const lerp = (a, b, t) => {
    const o = {};
    for (const k of ['r', 'y', 'nr', 'ny']) o[k] = a[k] + (b[k] - a[k]) * t;
    return o;
  };
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    let ta = 0, tb = 1;
    const dy = b.y - a.y;
    if (Math.abs(dy) < 1e-9) {
      if (a.y < y0 || a.y > y1) { ta = 1; tb = 0; }
    } else {
      const t0 = (y0 - a.y) / dy, t1 = (y1 - a.y) / dy;
      ta = Math.max(0, Math.min(t0, t1)); tb = Math.min(1, Math.max(t0, t1));
    }
    if (tb - ta <= 1e-6) { if (cur) { out.push(cur); cur = null; } continue; }
    const pa = lerp(a, b, ta), pb = lerp(a, b, tb);
    if (cur && ta === 0) cur.push(pb);
    else { if (cur) out.push(cur); cur = [pa, pb]; }
    if (tb < 1) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out.filter((p) => p.length >= 2);
}

/** Inner/outer radius of the ring shell's interior at height y (for floor plates). */
function shellSpanAt(pts, y) {
  let rMin = Infinity, rMax = -Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if ((a.y - y) * (b.y - y) <= 0 && a.y !== b.y) {
      const r = a.r + (b.r - a.r) * ((y - a.y) / (b.y - a.y));
      rMin = Math.min(rMin, r); rMax = Math.max(rMax, r);
    }
  }
  return rMin < rMax ? [rMin, rMax] : null;
}

/* ------------------------------------------------------------------------ */
/* build()                                                                   */
/* ------------------------------------------------------------------------ */

export function build(THREE, ctx = {}) {
  const HIGH = ctx.quality !== 'low';
  const envMap = ctx.envMap || null;
  const Q = {
    lathe: HIGH ? 128 : 64,        // radial segments of ring shells
    profile: HIGH ? 90 : 46,       // profile samples of ring shells
    panelPitch: HIGH ? 1.25 : 1.7, // perforation grid pitch (m)
    cyl: HIGH ? 64 : 36,           // radial segments of glass drums
    sweep: HIGH ? 120 : 60,        // bridge sweep steps
    palms: HIGH ? 1 : 0.55,        // palm density factor
    trees: HIGH ? 1 : 0.5,
  };

  /* ---------- resource tracking (for dispose) ---------- */
  const geos = new Set(), mats = new Set(), texs = new Set(), instanced = [];
  const G = (g) => { geos.add(g); return g; };
  const Mt = (m) => { mats.add(m); return m; };

  /* ---------- procedural textures ---------- */
  const hasCanvas = typeof document !== 'undefined';
  function canvasTex(size, draw, opts = {}) {
    if (!hasCanvas) return null;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    draw(cv.getContext('2d'), size);
    const t = new THREE.CanvasTexture(cv);
    if (opts.srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opts.repeat, opts.repeat); }
    t.anisotropy = 4;
    texs.add(t);
    return t;
  }
  // Tileable ripple normal map for water (sum of sines → height → normals).
  const waterNormal = canvasTex(128, (g, S) => {
    const img = g.createImageData(S, S);
    const h = (x, y) => {
      const u = (x / S) * Math.PI * 2, v = (y / S) * Math.PI * 2;
      return Math.sin(u * 3 + v * 2) * 0.5 + Math.sin(u * 5 - v * 4) * 0.3 + Math.sin(v * 7 + u) * 0.2;
    };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = h(x + 1, y) - h(x - 1, y), dy = h(x, y + 1) - h(x, y - 1);
      const nx = -dx * 0.9, ny = -dy * 0.9, nz = 1, l = Math.hypot(nx, ny, nz);
      const i = (y * S + x) * 4;
      img.data[i] = (nx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (ny / l * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, { repeat: 6 });
  // Radial stone-joint pattern for the circular plaza (UVs of a CircleGeometry are centred).
  const plazaMap = canvasTex(1024, (g, S) => {
    g.fillStyle = '#ece8e0'; g.fillRect(0, 0, S, S);
    const c = S / 2;
    g.strokeStyle = 'rgba(150,140,125,0.35)'; g.lineWidth = 1.6;
    for (let r = c * 0.12; r < c; r += c * 0.055) { g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.stroke(); }
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      g.beginPath(); g.moveTo(c + Math.cos(a) * c * 0.12, c + Math.sin(a) * c * 0.12);
      g.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c); g.stroke();
    }
    // a lighter inner ring band
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = c * 0.03;
    g.beginPath(); g.arc(c, c, c * 0.72, 0, Math.PI * 2); g.stroke();
  }, { srgb: true });

  /* ---------- materials ---------- */
  const std = (p) => Mt(new THREE.MeshStandardMaterial(p));
  const phys = (p) => Mt(new THREE.MeshPhysicalMaterial(p));
  const withEnv = (p) => (envMap ? { ...p, envMap } : p);

  const mat = {
    white: std({ name: 'campus-white', color: COLORS.white, roughness: 0.5, metalness: 0 }),
    shell: phys({ name: 'campus-shell', color: COLORS.shell, roughness: 0.36, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.45, side: THREE.DoubleSide }),
    panel: phys(withEnv({ name: 'campus-panel-glass', color: COLORS.panel, roughness: 0.12, metalness: 0.45, envMapIntensity: 1.3, emissive: COLORS.glowWarm, emissiveIntensity: 0 })),
    glass: phys(withEnv({ name: 'campus-glass', color: COLORS.glass, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.42, envMapIntensity: 1.2, depthWrite: false })),
    interior: std({ name: 'campus-interior', color: COLORS.interior, roughness: 0.9, emissive: COLORS.glowWarm, emissiveIntensity: 0 }),
    frame: std({ name: 'campus-frame', color: COLORS.frame, roughness: 0.38, metalness: 0.35 }),
    stone: std({ name: 'campus-stone', color: COLORS.stone, roughness: 0.95 }),
    plaza: std({ name: 'campus-plaza', color: COLORS.plaza, map: plazaMap, roughness: 0.85 }),
    lawn: std({ name: 'campus-lawn', color: COLORS.lawn, roughness: 1 }),
    asphalt: std({ name: 'campus-asphalt', color: COLORS.asphalt, roughness: 0.95 }),
    marking: std({ name: 'campus-marking', color: COLORS.marking, roughness: 0.8 }),
    water: phys(withEnv({ name: 'campus-water', color: COLORS.water, roughness: 0.08, metalness: 0.1, normalMap: waterNormal, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.2, emissive: COLORS.teal, emissiveIntensity: 0 })),
    trunk: std({ name: 'campus-palm-trunk', color: COLORS.trunk, roughness: 0.9 }),
    frond: std({ name: 'campus-palm-frond', color: COLORS.frond, roughness: 0.85, side: THREE.DoubleSide }),
    canopy: std({ name: 'campus-tree-canopy', color: COLORS.canopy, roughness: 0.95 }),
    lampHead: std({ name: 'campus-lamp-head', color: 0xffffff, roughness: 0.4, emissive: COLORS.lampGlow, emissiveIntensity: 0 }),
    accent: std({ name: 'campus-accent-teal', color: COLORS.teal, roughness: 0.4, metalness: 0.1, emissive: COLORS.teal, emissiveIntensity: 0 }),
    carLight: std({ name: 'campus-car-white', color: 0xe9e9e7, roughness: 0.35, metalness: 0.4 }),
    carDark: std({ name: 'campus-car-dark', color: 0x4a5258, roughness: 0.35, metalness: 0.5 }),
  };
  const nightMaterials = [mat.interior, mat.panel, mat.lampHead, mat.water, mat.accent];

  /* ---------- geometry helpers ---------- */

  /** Build an indexed BufferGeometry; flips triangles whose winding disagrees with the given normals. */
  function makeGeo(pos, nor, idx, { fix = true, uv = null } = {}) {
    if (fix) {
      for (let t = 0; t < idx.length; t += 3) {
        const [a, b, c] = [idx[t] * 3, idx[t + 1] * 3, idx[t + 2] * 3];
        const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
        const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
        const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
        const nx = nor[a] + nor[b] + nor[c], ny = nor[a + 1] + nor[b + 1] + nor[c + 1], nz = nor[a + 2] + nor[b + 2] + nor[c + 2];
        if (fx * nx + fy * ny + fz * nz < 0) { const tmp = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = tmp; }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return G(g);
  }

  /** Concatenate geometries (position + normal [+ index]) into one; sources are disposed. */
  function mergeGeos(list) {
    const pos = [], nor = [], idx = [];
    let off = 0;
    for (const src of list) {
      const g = src;
      const p = g.getAttribute('position'), n = g.getAttribute('normal');
      for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); }
      if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off);
      else for (let i = 0; i < p.count; i++) idx.push(i + off);
      off += p.count;
      g.dispose(); geos.delete(g);
    }
    return makeGeo(pos, nor, idx, { fix: false });
  }

  /**
   * Revolve a profile [{r, y, nr?, ny?}] around the local y axis.
   * smooth=true uses per-point normals (curved shells); false gives crisp
   * per-segment normals (slabs, bands).
   */
  function latheGeo(pts, seg, smooth = true, phiStart = 0, phiLen = Math.PI * 2) {
    const pos = [], nor = [], idx = [];
    const ring = (r, y, nr, ny) => {
      const base = pos.length / 3;
      for (let j = 0; j <= seg; j++) {
        const th = phiStart + (phiLen * j) / seg, s = Math.sin(th), c = Math.cos(th);
        pos.push(r * s, y, r * c); nor.push(nr * s, ny, nr * c);
      }
      return base;
    };
    const quads = (b0, b1) => { for (let j = 0; j < seg; j++) idx.push(b0 + j, b1 + j, b0 + j + 1, b0 + j + 1, b1 + j, b1 + j + 1); };
    if (smooth) {
      const bases = pts.map((p, i) => {
        let nr = p.nr, ny = p.ny;
        if (nr === undefined) {
          const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
          const dr = b.r - a.r, dy = b.y - a.y, l = Math.hypot(dr, dy) || 1; nr = dy / l; ny = -dr / l;
        }
        return ring(p.r, p.y, nr, ny);
      });
      for (let i = 0; i < bases.length - 1; i++) quads(bases[i], bases[i + 1]);
    } else {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const dr = b.r - a.r, dy = b.y - a.y, l = Math.hypot(dr, dy) || 1;
        quads(ring(a.r, a.y, dy / l, -dr / l), ring(b.r, b.y, dy / l, -dr / l));
      }
    }
    return makeGeo(pos, nor, idx);
  }

  /** Annular slab (closed rectangle revolved): r0..r1 radially, y0..y1 vertically. */
  const slabGeo = (r0, r1, y0, y1, seg = Q.cyl) => latheGeo(
    [{ r: r0, y: y0 }, { r: r1, y: y0 }, { r: r1, y: y1 }, { r: r0, y: y1 }, { r: r0, y: y0 }].map((p) => ({ ...p, r: Math.max(p.r, 0.001) })),
    seg, false);

  /** Open cylinder wall (outward normals). */
  const wallGeo = (r, y0, y1, seg = Q.cyl) => latheGeo([{ r, y: y0 }, { r, y: y1 }], seg, false);

  /** Sweep a closed CCW 2-D polygon [[x, y]] along frames [{P, S, U}] with crisp edges. */
  function sweepGeo(frames, poly) {
    const pos = [], nor = [], idx = [];
    for (let e = 0; e < poly.length; e++) {
      const [x0, y0] = poly[e], [x1, y1] = poly[(e + 1) % poly.length];
      const ex = y1 - y0, ey = -(x1 - x0), el = Math.hypot(ex, ey) || 1; // outward edge normal (CCW polygon)
      const base = pos.length / 3;
      for (const f of frames) {
        for (const [x, y] of [[x0, y0], [x1, y1]]) {
          pos.push(f.P.x + f.S.x * x + f.U.x * y, f.P.y + f.S.y * x + f.U.y * y, f.P.z + f.S.z * x + f.U.z * y);
          nor.push((f.S.x * ex + f.U.x * ey) / el, (f.S.y * ex + f.U.y * ey) / el, (f.S.z * ex + f.U.z * ey) / el);
        }
      }
      for (let i = 0; i < frames.length - 1; i++) {
        const a = base + i * 2, b = a + 2;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    return makeGeo(pos, nor, idx);
  }

  /**
   * Thick parametric surface P(u, v), u ∈ [0,1] across, v ∈ [v0,v1] along.
   * outward(P) gives a hint used to orient the surface normal. Returns a
   * closed plate of the given thickness (outer, inner, two long edges, caps).
   */
  function thickSurfaceGeo(fn, nu, nv, v0, v1, thick, outward) {
    const P = [], N = [];
    const eps = 1e-3;
    for (let j = 0; j <= nv; j++) {
      const v = v0 + (v1 - v0) * (j / nv);
      for (let i = 0; i <= nu; i++) {
        const u = i / nu;
        const p = fn(u, v);
        const du = fn(Math.min(1, u + eps), v).sub(fn(Math.max(0, u - eps), v));
        const dv = fn(u, Math.min(1, v + eps)).sub(fn(u, Math.max(0, v - eps)));
        const n = new THREE.Vector3().crossVectors(du, dv).normalize();
        if (n.dot(outward(p)) < 0) n.negate();
        P.push(p); N.push(n);
      }
    }
    const at = (i, j) => j * (nu + 1) + i;
    const parts = [];
    // outer / inner faces
    for (const side of [1, -1]) {
      const pos = [], nor = [], idx = [];
      P.forEach((p, k) => {
        const q = side > 0 ? p : p.clone().addScaledVector(N[k], -thick);
        pos.push(q.x, q.y, q.z); nor.push(N[k].x * side, N[k].y * side, N[k].z * side);
      });
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) idx.push(at(i, j), at(i + 1, j), at(i, j + 1), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1));
      parts.push(makeGeo(pos, nor, idx));
    }
    // edge strips (u = 0, u = 1 along v; v = v0, v = v1 along u)
    const strip = (keys, dirFn) => {
      const pos = [], nor = [], idx = [];
      keys.forEach((k, m) => {
        const p = P[k], q = p.clone().addScaledVector(N[k], -thick), d = dirFn(k, m);
        pos.push(p.x, p.y, p.z, q.x, q.y, q.z); nor.push(d.x, d.y, d.z, d.x, d.y, d.z);
      });
      for (let m = 0; m < keys.length - 1; m++) { const a = m * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      parts.push(makeGeo(pos, nor, idx));
    };
    const colKeys = (i) => Array.from({ length: nv + 1 }, (_, j) => at(i, j));
    const rowKeys = (j) => Array.from({ length: nu + 1 }, (_, i) => at(i, j));
    const tangentU = (k, sign) => { const i = k % (nu + 1), j = Math.floor(k / (nu + 1)); const a = P[at(Math.max(0, i - 1), j)], b = P[at(Math.min(nu, i + 1), j)]; return b.clone().sub(a).normalize().multiplyScalar(sign); };
    const tangentV = (k, sign) => { const i = k % (nu + 1), j = Math.floor(k / (nu + 1)); const a = P[at(i, Math.max(0, j - 1))], b = P[at(i, Math.min(nv, j + 1))]; return b.clone().sub(a).normalize().multiplyScalar(sign); };
    strip(colKeys(0), (k) => tangentU(k, -1));
    strip(colKeys(nu), (k) => tangentU(k, 1));
    strip(rowKeys(0), (k) => tangentV(k, -1));
    strip(rowKeys(nv), (k) => tangentV(k, 1));
    return mergeGeos(parts);
  }

  /** Flat diamond (rhombus) in the XY plane facing +Z, unit size. */
  const diamondGeo = makeGeo(
    [0, 0.5, 0, -0.5, 0, 0, 0, -0.5, 0, 0.5, 0, 0],
    [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
    [0, 1, 2, 0, 2, 3]);

  /* ---------- scene objects helpers ---------- */
  const mesh = (geo, material, name, { cast = true, receive = true } = {}) => {
    const m = new THREE.Mesh(geo, material);
    m.name = name; m.castShadow = cast; m.receiveShadow = receive;
    return m;
  };
  const instancedMesh = (geo, material, matrices, name, { cast = true, receive = true } = {}) => {
    if (!matrices.length) return null;
    const im = new THREE.InstancedMesh(geo, material, matrices.length);
    matrices.forEach((m4, i) => im.setMatrixAt(i, m4));
    im.instanceMatrix.needsUpdate = true;
    im.name = name; im.castShadow = cast; im.receiveShadow = receive;
    im.computeBoundingSphere();
    instanced.push(im);
    return im;
  };
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Euler();
  const trs = (x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => {
    _e.set(rx, ry, rz); _q.setFromEuler(_e);
    return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
  };

  /**
   * Mullions on a circular wall: vertical fins at radius r every `pitch` metres,
   * plus optional horizontal transoms at the given heights.
   */
  function circularMullions(r, y0, y1, pitch, name, transoms = []) {
    const n = Math.max(8, Math.round((2 * Math.PI * r) / pitch));
    const mats4 = [];
    for (let i = 0; i < n; i++) {
      const th = (i / n) * Math.PI * 2;
      mats4.push(trs(r * Math.sin(th), (y0 + y1) / 2, r * Math.cos(th), th, 0.12, y1 - y0, 0.28));
    }
    const group = [instancedMesh(unitBox, mat.frame, mats4, name)];
    for (const ty of transoms) group.push(mesh(slabGeo(r - 0.06, r + 0.1, ty - 0.05, ty + 0.05), mat.frame, `${name}-transom`, { cast: false }));
    return group.filter(Boolean);
  }
  const unitBox = G(new THREE.BoxGeometry(1, 1, 1));

  /* ---------- containers ---------- */
  const root = new THREE.Group(); root.name = 'campus';
  const site = new THREE.Group(); site.name = 'campus-site';
  root.add(site);
  const floors = [];
  const newFloor = (level, labelEn, labelAr, buildingId, x = 0, z = 0) => {
    const g = new THREE.Group();
    g.name = `${buildingId}-L${level}`;
    g.position.set(x, 0, z);
    g.userData = { level, label: { en: labelEn, ar: labelAr }, buildingId };
    root.add(g); floors.push(g);
    return g;
  };

  /* ====================================================================== */
  /* Ring buildings                                                          */
  /* ====================================================================== */

  function buildRing(spec) {
    const c = { ...RING_DEFAULTS, ...spec };
    const prof = ringProfile(c, Q.profile);
    const rOutEdge = prof[0].r, rInEdge = prof[prof.length - 1].r;
    const rGlassOut = rOutEdge - 1.5, rGlassIn = rInEdge + 1.3;
    const [yL2, yRoof] = [c.levels[2], c.levels[3]];
    const labels = [
      ['Ground floor', 'الطابق الأرضي'], ['Level 1', 'المستوى 1'], ['Level 2', 'المستوى 2'], ['Level 3 & roof', 'المستوى 3 والسقف'],
    ];
    const lv = labels.map(([en, ar], i) => newFloor(i, `${c.nameEn} · ${en}`, `${c.nameAr} · ${ar}`, c.id, c.cx, c.cz));

    /* Glazed base (ground + level 1): recessed glass drums under the shell's
       overhang, white slab edges between them, slender perimeter columns. */
    for (const level of [0, 1]) {
      const g = lv[level], y0 = c.levels[level], y1 = c.levels[level + 1];
      const yb = level === 0 ? 0.18 : y0 + 0.4; // glazing starts above the slab
      if (level === 0) g.add(mesh(slabGeo(rGlassIn - 0.3, rGlassOut + 0.3, 0, 0.18), mat.stone, `${c.id}-ground-slab`, { cast: false }));
      else g.add(mesh(slabGeo(rGlassIn - 0.45, rGlassOut + 0.45, y0, y0 + 0.4, Q.lathe), mat.white, `${c.id}-L1-slab`));
      for (const [r, tag, inward] of [[rGlassOut, 'outer', -1], [rGlassIn, 'inner', 1]]) {
        g.add(mesh(wallGeo(r + inward * 0.9, yb, y1, Q.lathe >> 1), mat.interior, `${c.id}-L${level}-interior-${tag}`, { cast: false }));
        g.add(mesh(wallGeo(r, yb, y1, Q.lathe), mat.glass, `${c.id}-L${level}-glass-${tag}`, { cast: false, receive: false }));
        circularMullions(r - 0.1 * inward, yb, y1, 1.7, `${c.id}-L${level}-mullions-${tag}`).forEach((m) => g.add(m));
      }
      const nCol = 32, colR = rOutEdge - 0.55, colMats = [];
      for (let i = 0; i < nCol; i++) {
        const th = ((i + 0.5) / nCol) * Math.PI * 2;
        colMats.push(trs(colR * Math.sin(th), (yb + y1) / 2, colR * Math.cos(th), 0, 0.26, y1 - yb, 0.26));
      }
      g.add(instancedMesh(columnGeo, mat.white, colMats, `${c.id}-L${level}-columns`));
    }

    /* Floor plates inside the shell (revealed by explode / section cuts). The
       level-2 plate also closes the soffit of the overhang. */
    lv[2].add(mesh(slabGeo(rInEdge - 0.05, rOutEdge + 0.05, yL2 - 0.05, yL2 + 0.3, Q.lathe), mat.white, `${c.id}-L2-slab`));
    {
      const span = shellSpanAt(prof, yRoof + 0.3) || [rInEdge, rOutEdge];
      lv[3].add(mesh(slabGeo(span[0] + 0.5, span[1] - 0.5, yRoof, yRoof + 0.3, Q.lathe), mat.white, `${c.id}-L3-slab`));
    }

    /* Shell, sliced into the level bands so the skin explodes with its floor. */
    const lining = prof.map((p) => ({ r: p.r - p.nr * 0.6, y: p.y - p.ny * 0.6, nr: p.nr, ny: p.ny }));
    for (const [y0, y1, level] of [[yL2 - 0.05, yRoof, 2], [yRoof, 99, 3]]) {
      sliceProfile(prof, y0, y1).forEach((piece, k) => {
        lv[level].add(mesh(latheGeo(piece, Q.lathe, true), mat.shell, `${c.id}-L${level}-shell-${k}`));
      });
      // interior lining (inset 0.6 m), what glows through the perforations at night
      sliceProfile(lining, Math.max(y0, yL2 + 0.35), y1).forEach((piece, k) => {
        lv[level].add(mesh(latheGeo(piece, Q.lathe >> 1, true), mat.interior, `${c.id}-L${level}-lining-${k}`, { cast: false }));
      });
    }

    /* Perforations: diamond glazed panels scattered over the shell. */
    const rand = makeRng(c.seed);
    const S = prof[prof.length - 1].s;
    const pitch = Q.panelPitch;
    const perBand = [[], [], [], []];
    const T = new THREE.Vector3(), B = new THREE.Vector3(), N = new THREE.Vector3(), X = new THREE.Vector3();
    const rows = Math.floor(S / pitch);
    for (let j = 1; j < rows; j++) {
      const s = (j / rows) * S, sn = s / S;
      if (sn < 0.07 || sn > 0.93) continue;
      const pr = profileAt(prof, s);
      const cols = Math.max(12, Math.round((2 * Math.PI * pr.r) / pitch));
      for (let k = 0; k < cols; k++) {
        const th = ((k + (j % 2) * 0.5) / cols) * Math.PI * 2;
        // density: concentrated over the crown, modulated by slow waves around the ring
        const crown = Math.exp(-(((sn - 0.5) / 0.23) ** 2));
        const wave = 0.5 + 0.5 * Math.sin(th * 3 + c.phase + sn * 5) * Math.cos(th * 2 - c.phase * 1.7 + sn * 3);
        const d = clamp(0.1 + 0.18 * wave + crown * (0.2 + 0.75 * wave), 0, 0.92);
        if (rand() > d) continue;
        const size = pitch * (0.4 + 0.75 * d * d) * (0.85 + rand() * 0.3);
        const sth = Math.sin(th), cth = Math.cos(th);
        T.set(cth, 0, -sth);
        B.set(pr.tr * sth, pr.ty, pr.tr * cth);
        N.set(pr.nr * sth, pr.ny, pr.nr * cth);
        if (X.crossVectors(T, B).dot(N) < 0) T.negate();
        const y = pr.y;
        const ext = Math.abs(pr.ty) * size * 0.55;
        const band = y < yRoof ? 2 : 3;
        const [b0, b1] = band === 2 ? [yL2, yRoof] : [yRoof, 99];
        if (y - ext < b0 || y + ext > b1) continue; // never straddle a floor break
        const m4 = new THREE.Matrix4().makeBasis(T.clone().multiplyScalar(size * 0.82), B.clone().multiplyScalar(size), N.clone());
        m4.setPosition(pr.r * sth + N.x * 0.07, y + N.y * 0.07, pr.r * cth + N.z * 0.07);
        perBand[band].push(m4);
      }
    }
    for (const level of [2, 3]) {
      const im = instancedMesh(diamondGeo, mat.panel, perBand[level], `${c.id}-L${level}-perforations`, { cast: false });
      if (im) lv[level].add(im);
    }

    return { prof, rOutEdge, rInEdge, rGlassOut, rGlassIn, c };
  }

  const columnGeo = G(new THREE.CylinderGeometry(0.5, 0.5, 1, 10));
  const rings = RINGS.map(buildRing);

  /* ====================================================================== */
  /* Central tower with sail fin                                             */
  /* ====================================================================== */

  function buildTower(t) {
    const levels = [];
    const yAt = (i) => (i === 0 ? 0 : t.lobbyH + (i - 1) * t.floorH); // floor level heights
    const topY = yAt(t.floors + 1);
    const crownTop = topY + t.crownH;
    const nLevels = t.floors + 2;
    for (let i = 0; i < nLevels; i++) {
      const [en, ar] = i === 0 ? ['Lobby', 'الردهة'] : i === nLevels - 1 ? ['Crown & sail', 'التاج والشراع'] : [`Level ${i}`, `المستوى ${i}`];
      levels.push(newFloor(i, `Tower · ${en}`, `البرج · ${ar}`, t.id, t.cx, t.cz));
    }
    const R = t.R;

    // Lobby: taller, slightly wider glass drum with a canopy disc above
    const L0 = levels[0];
    L0.add(mesh(wallGeo(R + 0.2, 0, t.lobbyH, Q.cyl), mat.glass, 'tower-lobby-glass', { cast: false, receive: false }));
    L0.add(mesh(wallGeo(R - 0.8, 0, t.lobbyH, Q.cyl), mat.interior, 'tower-lobby-interior', { cast: false }));
    circularMullions(R + 0.28, 0, t.lobbyH, 1.6, 'tower-lobby-mullions', [3.2]).forEach((m) => L0.add(m));
    L0.add(mesh(slabGeo(0.001, R - 0.8, 0, 0.15), mat.stone, 'tower-lobby-floor', { cast: false }));

    // Typical floors: white slab-edge band + glass + interior lining + mullions
    for (let i = 1; i <= t.floors; i++) {
      const g = levels[i], y0 = yAt(i), y1 = yAt(i + 1);
      const bandR = i === 1 ? R + 2.6 : R + 0.55; // level 1 band doubles as the lobby canopy
      g.add(mesh(slabGeo(0.001, bandR, y0, y0 + 0.45), mat.white, `tower-L${i}-slab`));
      g.add(mesh(wallGeo(R, y0 + 0.45, y1, Q.cyl), mat.glass, `tower-L${i}-glass`, { cast: false, receive: false }));
      g.add(mesh(wallGeo(R - 0.8, y0 + 0.45, y1, Q.cyl >> 1), mat.interior, `tower-L${i}-interior`, { cast: false }));
      circularMullions(R + 0.08, y0 + 0.45, y1, 1.5, `tower-L${i}-mullions`).forEach((m) => g.add(m));
    }

    // Crown: white drum, teal accent ring, roof disc
    const crown = levels[nLevels - 1];
    crown.add(mesh(slabGeo(0.001, R + 0.6, topY, crownTop - 0.4), mat.white, 'tower-crown'));
    crown.add(mesh(slabGeo(R + 0.55, R + 0.66, topY + 1.2, topY + 1.45), mat.accent, 'tower-crown-accent', { cast: false }));
    crown.add(mesh(slabGeo(0.001, R - 0.2, crownTop - 0.4, crownTop), mat.white, 'tower-roof'));

    /* Sail fin: a thick curved blade that peels away from the drum like a
       scroll, tight to the glass at its attached edge, bellying outwards
       towards its free edge, and curls over the crown at the top. */
    const H = t.finH;
    const crestY = (u) => H - 11 * u * u;                       // crest falls towards the free edge
    const finAt = (u, y) => {
      const h = y / H;
      const lean = smoothstep(crownTop - 6, H, y);              // curl over the crown
      const peel = 1.2 + 4.2 * Math.pow(u, 1.6) * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, h * 1.05)));
      const r = (R + peel) * (1 - 0.6 * lean * lean);
      const th = t.finTheta + u * (0.75 + 0.7 * h) - 0.45 * lean;
      return new THREE.Vector3(r * Math.sin(th), y, r * Math.cos(th));
    };
    const outward = (p) => new THREE.Vector3(p.x, 0, p.z).normalize();
    const finNu = HIGH ? 24 : 12;
    for (let i = 0; i < nLevels; i++) {
      const top = i === nLevels - 1;
      const y0 = yAt(i), y1 = top ? H : yAt(i + 1);
      const band = (u, v) => finAt(u, y0 + ((top ? crestY(u) : y1) - y0) * v);
      const nv = top ? (HIGH ? 18 : 9) : (HIGH ? 3 : 2);
      levels[i].add(mesh(thickSurfaceGeo(band, finNu, nv, 0, 1, 0.6, outward), mat.shell, `tower-L${i}-sail`));
    }

    /* A sparse scatter of glazed diamonds on the fin's outer face, denser
       towards its free edge (echoes the ring shells). */
    const finPanels = levels.map(() => []);
    {
      const rnd = makeRng(41), e = 0.01;
      const P = new THREE.Vector3(), Tu = new THREE.Vector3(), Tv = new THREE.Vector3(), Nn = new THREE.Vector3();
      const step = HIGH ? 1.3 : 1.8;
      for (let y = 1.5; y < H - 2; y += step) {
        for (let u = 0.1; u < 0.96; u += 0.055 * (step / 1.3)) {
          if (y > crestY(u) - 2) continue;
          const d = 0.05 + 0.6 * u * u * smoothstep(4, H * 0.7, y);
          if (rnd() > d) continue;
          P.copy(finAt(u, y));
          Tu.copy(finAt(u + e, y)).sub(finAt(u - e, y)).normalize();
          Tv.copy(finAt(u, y + e)).sub(finAt(u, y - e)).normalize();
          Nn.crossVectors(Tu, Tv).normalize();
          if (Nn.dot(outward(P)) < 0) Nn.negate();
          if (new THREE.Vector3().crossVectors(Tu, Tv).dot(Nn) < 0) Tu.negate();
          const size = 0.7 + 0.6 * d + rnd() * 0.25;
          const ext = size * 0.55;
          const li = levels.findIndex((_, i) => y - ext >= yAt(i) && (i === nLevels - 1 || y + ext <= yAt(i + 1)));
          if (li < 0) continue;
          const m4 = new THREE.Matrix4().makeBasis(Tu.clone().multiplyScalar(size * 0.8), Tv.clone().multiplyScalar(size), Nn.clone());
          m4.setPosition(P.x + Nn.x * 0.06, P.y + Nn.y * 0.06, P.z + Nn.z * 0.06);
          finPanels[li].push(m4);
        }
      }
      finPanels.forEach((list, i) => {
        const im = instancedMesh(diamondGeo, mat.panel, list, `tower-L${i}-sail-perforations`, { cast: false });
        if (im) levels[i].add(im);
      });
    }
    return { topY, crownTop };
  }
  buildTower(TOWER);

  /* ====================================================================== */
  /* Sky bridge (one floor group, level 1, it joins the rings' first floor) */
  /* ====================================================================== */

  const bridgeGroup = newFloor(1, 'Sky bridge', 'الجسر المعلّق', 'bridge');
  const bridgeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-20.5, 4.6, 38.0),
    new THREE.Vector3(-12, 8.0, 45.5),
    new THREE.Vector3(0, 10.2, 47.5),
    new THREE.Vector3(11, 8.6, 43),
    new THREE.Vector3(20.0, 4.6, 33.0),
  ], false, 'centripetal');
  const frames = [];
  {
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i <= Q.sweep; i++) {
      const tt = i / Q.sweep;
      const P = bridgeCurve.getPointAt(tt), Tn = bridgeCurve.getTangentAt(tt);
      const S = new THREE.Vector3().crossVectors(Tn, up).normalize();
      const U = new THREE.Vector3().crossVectors(S, Tn).normalize();
      frames.push({ P, S, U, T: Tn, t: tt });
    }
  }
  const W = 2.9; // half width of the walkway
  // deck: a shallow lens in section (CCW polygon in side/up coordinates)
  const deckPoly = [[-W - 0.5, 0], [-W - 0.5, -0.3], [-W + 0.6, -0.85], [0, -1.05], [W - 0.6, -0.85], [W + 0.5, -0.3], [W + 0.5, 0]];
  bridgeGroup.add(mesh(sweepGeo(frames, deckPoly), mat.white, 'bridge-deck'));
  // roof: a thin arched canopy overhanging the glass
  const roofPoly = [[-W - 0.9, 3.05], [W + 0.9, 3.05]];
  for (let k = 0; k <= 8; k++) {
    const x = (W + 0.9) * (1 - (2 * k) / 8);
    roofPoly.push([x, 3.17 + 0.5 * Math.cos((Math.PI / 2) * (x / (W + 0.9)))]);
  }
  bridgeGroup.add(mesh(sweepGeo(frames, roofPoly), mat.white, 'bridge-roof'));
  for (const sgn of [-1, 1]) {
    bridgeGroup.add(mesh(sweepGeo(frames, sgn < 0 ? [[-W - 0.04, 0], [-W + 0.04, 0], [-W + 0.04, 3.05], [-W - 0.04, 3.05]] : [[W - 0.04, 0], [W + 0.04, 0], [W + 0.04, 3.05], [W - 0.04, 3.05]]), mat.glass, `bridge-glass-${sgn < 0 ? 'l' : 'r'}`, { cast: false, receive: false }));
  }
  // glowing ceiling strip (interior) so the bridge reads as an inhabited tube at night
  bridgeGroup.add(mesh(sweepGeo(frames, [[-W + 0.3, 2.85], [W - 0.3, 2.85], [W - 0.3, 3.05], [-W + 0.3, 3.05]]), mat.interior, 'bridge-ceiling', { cast: false }));
  // a sweeping white "keel" ribbon under the deck, deepest at mid-span
  {
    const keelFrames = frames;
    const pos = [], nor = [], idx = [];
    keelFrames.forEach((f, i) => {
      const depth = 0.3 + 1.5 * Math.sin(Math.PI * f.t);
      const a = f.P.clone().addScaledVector(f.U, -0.3).addScaledVector(f.S, W + 0.4);
      const b = a.clone().addScaledVector(f.U, -depth).addScaledVector(f.S, -0.9 * Math.sin(Math.PI * f.t));
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z); nor.push(f.S.x, f.S.y, f.S.z, f.S.x, f.S.y, f.S.z);
      if (i < keelFrames.length - 1) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    });
    const keel = mesh(makeGeo(pos, nor, idx), mat.shell, 'bridge-keel');
    bridgeGroup.add(keel);
  }
  // mullions on both glass walls
  {
    const mm = [];
    const n = Math.round(bridgeCurve.getLength() / 2.2);
    const bm = new THREE.Matrix4();
    for (let i = 1; i < n; i++) {
      const tt = i / n, P = bridgeCurve.getPointAt(tt), Tn = bridgeCurve.getTangentAt(tt);
      const S = new THREE.Vector3().crossVectors(Tn, new THREE.Vector3(0, 1, 0)).normalize();
      const U = new THREE.Vector3().crossVectors(S, Tn).normalize();
      for (const sgn of [-1, 1]) {
        bm.makeBasis(Tn.clone().multiplyScalar(0.1), U.clone().multiplyScalar(3.05), S.clone().multiplyScalar(0.18));
        const c0 = P.clone().addScaledVector(S, sgn * W).addScaledVector(U, 1.525);
        bm.setPosition(c0);
        mm.push(bm.clone());
      }
    }
    bridgeGroup.add(instancedMesh(unitBox, mat.frame, mm, 'bridge-mullions', { cast: false }));
  }
  // slender V-struts down to the lawns either side of the boulevard
  {
    const strut = (a, b, r) => {
      const d = b.clone().sub(a), len = d.length();
      const m4 = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(r * 2, len, r * 2));
      return m4;
    };
    const sm = [];
    for (const tt of [0.24, 0.76]) {
      const f = frames[Math.round(tt * Q.sweep)];
      const foot = f.P.clone(); foot.y = 0;
      for (const sgn of [-1, 1]) {
        const top = f.P.clone().addScaledVector(f.U, -0.95).addScaledVector(f.S, sgn * 1.6);
        sm.push(strut(foot, top, 0.22));
      }
    }
    bridgeGroup.add(instancedMesh(columnGeo, mat.white, sm, 'bridge-struts'));
  }

  /* ====================================================================== */
  /* Site / landscape (non-exploding)                                        */
  /* ====================================================================== */

  const roundedRect = (x0, z0, x1, z1, rad) => {
    // Shape lives in (x, -z) so that rotateX(-π/2) maps it onto the ground.
    const s = new THREE.Shape();
    const [ax, ay, bx, by] = [x0, -z1, x1, -z0];
    s.moveTo(ax + rad, ay); s.lineTo(bx - rad, ay); s.quadraticCurveTo(bx, ay, bx, ay + rad);
    s.lineTo(bx, by - rad); s.quadraticCurveTo(bx, by, bx - rad, by); s.lineTo(ax + rad, by);
    s.quadraticCurveTo(ax, by, ax, by - rad); s.lineTo(ax, ay + rad); s.quadraticCurveTo(ax, ay, ax + rad, ay);
    return s;
  };
  const circleShape = (x, z, r, hole = false) => {
    const s = hole ? new THREE.Path() : new THREE.Shape();
    s.absarc(x, -z, r, 0, Math.PI * 2, hole);
    return s;
  };
  const flat = (shape, y, curveSegments = 32) => { const g = G(new THREE.ShapeGeometry(shape, curveSegments)); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g; };
  const raised = (shape, y0, depth, curveSegments = 32) => {
    const g = G(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments }));
    g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); return g;
  };
  const cs = HIGH ? 48 : 24;

  // Site base (stone paving) and roads
  site.add(mesh(flat(roundedRect(-70, -70, 70, 70, 10), 0.02, 8), mat.stone, 'site-paving', { cast: false }));
  const ROAD = { half: 4.5, ewZ: -4, rbR: 12 };
  site.add(mesh(flat(roundedRect(-70, ROAD.ewZ - ROAD.half, 70, ROAD.ewZ + ROAD.half, 0.01), 0.05, 2), mat.asphalt, 'road-east-west', { cast: false }));
  site.add(mesh(flat(roundedRect(-ROAD.half, ROAD.ewZ, ROAD.half, 70, 0.01), 0.05, 2), mat.asphalt, 'road-boulevard', { cast: false }));
  site.add(mesh(flat(circleShape(0, ROAD.ewZ, ROAD.rbR), 0.05, cs), mat.asphalt, 'road-roundabout', { cast: false }));
  // dashed centre lines
  {
    const dm = [];
    for (let x = -68; x <= 68; x += 5) if (Math.abs(x) > ROAD.rbR + 1) dm.push(trs(x, 0.08, ROAD.ewZ, 0, 2.4, 0.02, 0.16));
    for (let z = ROAD.ewZ + ROAD.rbR + 2; z <= 68; z += 5) dm.push(trs(0, 0.08, z, 0, 0.16, 0.02, 2.4));
    // pedestrian crossings near the roundabout
    for (const [cx, cz, rot] of [[0, ROAD.ewZ + ROAD.rbR + 4, 0], [-(ROAD.rbR + 4), ROAD.ewZ, Math.PI / 2], [ROAD.rbR + 4, ROAD.ewZ, Math.PI / 2]]) {
      for (let k = -3; k <= 3; k++) {
        const o = k * 1.2;
        dm.push(rot ? trs(cx, 0.08, cz + o, 0, 2.6, 0.02, 0.6) : trs(cx + o, 0.08, cz, 0, 0.6, 0.02, 2.6));
      }
    }
    site.add(instancedMesh(unitBox, mat.marking, dm, 'road-markings', { cast: false }));
  }

  // Lawns (raised beds read crisply in a model and never z-fight with paving)
  const LAWN_H = 0.15;
  const lawnSW = roundedRect(-67, ROAD.ewZ + ROAD.half + 2.2, -ROAD.half - 2, 67, 4);
  const lawnSE = roundedRect(ROAD.half + 2, ROAD.ewZ + ROAD.half + 2.2, 67, 67, 4);
  const lawnN = roundedRect(-67, -67, 67, ROAD.ewZ - ROAD.half - 2.2, 4);
  site.add(mesh(raised(lawnSW, 0.02, LAWN_H, 6), mat.lawn, 'lawn-south-west', { cast: false }));
  site.add(mesh(raised(lawnSE, 0.02, LAWN_H, 6), mat.lawn, 'lawn-south-east', { cast: false }));
  site.add(mesh(raised(lawnN, 0.02, LAWN_H, 6), mat.lawn, 'lawn-north', { cast: false }));
  site.add(mesh(raised(circleShape(0, ROAD.ewZ, 6), 0.05, 0.25, cs), mat.lawn, 'roundabout-island', { cast: false }));

  // Ring aprons: paved annulus around each ring, courtyard stays planted
  for (const rg of rings) {
    const s = circleShape(rg.c.cx, rg.c.cz, rg.rOutEdge + 3.5);
    s.holes.push(circleShape(rg.c.cx, rg.c.cz, rg.rGlassIn - 1.2, true));
    site.add(mesh(raised(s, 0.02, 0.22, cs * 2), mat.stone, `${rg.c.id}-apron`, { cast: false }));
    // courtyard path ring
    const p = circleShape(rg.c.cx, rg.c.cz, rg.rGlassIn - 4.2);
    p.holes.push(circleShape(rg.c.cx, rg.c.cz, rg.rGlassIn - 5.6, true));
    site.add(mesh(raised(p, 0.02, 0.2, cs), mat.stone, `${rg.c.id}-courtyard-path`, { cast: false }));
  }

  // Tower plaza with a recessed reflecting pool (annular sector facing the boulevard)
  const PLAZA = { x: TOWER.cx, z: TOWER.cz, r: 25 };
  const poolPath = (hole) => {
    const p = hole ? new THREE.Path() : new THREE.Shape();
    const [r0, r1, a0, a1] = [TOWER.R + 4.2, TOWER.R + 8.5, -Math.PI / 2 - 1.0, -Math.PI / 2 + 1.0];
    // angles measured in shape space (x, -z): -π/2 points to +z (south, towards the entrance)
    p.absarc(PLAZA.x, -PLAZA.z, r1, a0, a1, false);
    p.absarc(PLAZA.x, -PLAZA.z, r0, a1, a0, true);
    p.closePath();
    return p;
  };
  {
    const plazaShape = circleShape(PLAZA.x, PLAZA.z, PLAZA.r);
    plazaShape.holes.push(poolPath(true));
    const pg = raised(plazaShape, 0.02, 0.25, cs * 2);
    // planar UVs centred on the plaza for the radial joint texture
    const uv = pg.getAttribute('uv'), ps = pg.getAttribute('position');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (ps.getX(i) - PLAZA.x) / (2 * PLAZA.r) + 0.5, -(ps.getZ(i) - PLAZA.z) / (2 * PLAZA.r) + 0.5);
    site.add(mesh(pg, mat.plaza, 'tower-plaza', { cast: false }));
    // plaza approach from the roundabout
    site.add(mesh(raised(roundedRect(-5, PLAZA.z + PLAZA.r - 2, 5, ROAD.ewZ - ROAD.half, 0.01), 0.02, 0.18, 2), mat.stone, 'plaza-approach', { cast: false }));
    const water = mesh(flat(poolPath(false), 0.2, cs), mat.water, 'plaza-pool', { cast: false });
    const wuv = water.geometry.getAttribute('uv');
    const wps = water.geometry.getAttribute('position');
    for (let i = 0; i < wuv.count; i++) wuv.setXY(i, wps.getX(i) / 12, wps.getZ(i) / 12);
    site.add(water);
  }

  // Glass cone pavilion in the west courtyard (the render shows a glazed tent-like form)
  {
    const rg = rings[0];
    const coneH = 8, coneR = 4.6;
    const cone = mesh(G(new THREE.ConeGeometry(coneR, coneH, HIGH ? 40 : 20, 1, true)), mat.glass, 'pavilion-glass', { cast: false, receive: false });
    cone.position.set(rg.c.cx, 0.2 + coneH / 2, rg.c.cz);
    site.add(cone);
    const coneIn = mesh(G(new THREE.ConeGeometry(coneR - 0.5, coneH - 1, HIGH ? 24 : 12, 1, true)), mat.interior, 'pavilion-interior', { cast: false });
    coneIn.position.set(rg.c.cx, 0.2 + (coneH - 1) / 2, rg.c.cz);
    site.add(coneIn);
    // helical white ribs
    const ribs = [];
    const nr = 10;
    for (let i = 0; i < nr; i++) {
      const th = (i / nr) * Math.PI * 2;
      const base = new THREE.Vector3(rg.c.cx + coneR * Math.sin(th), 0.2, rg.c.cz + coneR * Math.cos(th));
      const tip = new THREE.Vector3(rg.c.cx, 0.2 + coneH, rg.c.cz);
      const d = tip.clone().sub(base), len = d.length();
      ribs.push(new THREE.Matrix4().compose(base.clone().add(tip).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(0.16, len, 0.16)));
    }
    site.add(instancedMesh(columnGeo, mat.white, ribs, 'pavilion-ribs'));
    // round pool in the east courtyard
    const rg2 = rings[1];
    site.add(mesh(raised(circleShape(rg2.c.cx, rg2.c.cz, 4.4), 0.02, 0.3, cs), mat.white, 'courtyard-fountain-rim', { cast: false }));
    const fw = mesh(flat(circleShape(rg2.c.cx, rg2.c.cz, 4.0), 0.27, cs), mat.water, 'courtyard-fountain-water', { cast: false });
    site.add(fw);
  }

  /* ---------- vegetation ---------- */
  // Palm: tapered trunk + crown of drooping fronds (one merged geometry)
  const trunkGeo = G(new THREE.CylinderGeometry(0.17, 0.27, 1, HIGH ? 7 : 5, 1));
  trunkGeo.translate(0, 0.5, 0);
  const frondGeo = (() => {
    const pos = [], nor = [], idx = [];
    const F = HIGH ? 9 : 7, segs = HIGH ? 5 : 3, L = 3.4;
    for (let f = 0; f < F; f++) {
      const a = (f / F) * Math.PI * 2 + (f % 2) * 0.2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const lift = f % 2 ? 0.9 : 0.55;
      const base = pos.length / 3;
      for (let k = 0; k <= segs; k++) {
        const s = k / segs;
        const d = s * L, h = lift * s * 1.8 - 2.1 * s * s;
        const w = 0.62 * Math.pow(Math.sin(Math.PI * Math.min(0.98, s * 0.9 + 0.08)), 0.8);
        const cx = ca * d, cz = sa * d;
        pos.push(cx - sa * w, h - 0.12 * w, cz + ca * w, cx + sa * w, h - 0.12 * w, cz - ca * w);
        nor.push(0, 1, 0, 0, 1, 0);
        if (k < segs) { const b = base + k * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
      }
    }
    const g = makeGeo(pos, nor, idx);
    g.computeVertexNormals();
    return g;
  })();
  const canopyGeo = G(new THREE.IcosahedronGeometry(1, HIGH ? 2 : 1));
  const treeTrunkGeo = trunkGeo;

  // Placement: rejection against buildings, roads, pools, bridge
  const bridgePlan = frames.filter((_, i) => i % 4 === 0).map((f) => [f.P.x, f.P.z]);
  const blocked = (x, z, pad = 0) => {
    if (Math.abs(x) > 66 || Math.abs(z) > 66) return true;
    if (Math.abs(z - ROAD.ewZ) < ROAD.half + 1.6 + pad) return true;                 // E-W road
    if (z > ROAD.ewZ && Math.abs(x) < ROAD.half + 1.6 + pad) return true;           // boulevard
    if (Math.hypot(x, z - ROAD.ewZ) < ROAD.rbR + 1 + pad) return true;               // roundabout
    for (const rg of rings) {
      const d = Math.hypot(x - rg.c.cx, z - rg.c.cz);
      if (d > rg.rGlassIn - 6.4 - pad && d < rg.rOutEdge + 4 + pad) return true;       // ring + apron + path
      if (d < 6.0 + pad) return true;                                                // courtyard centrepiece
    }
    if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + 0.5 + pad) return true;      // plaza
    if (Math.abs(x) < 6 && z < ROAD.ewZ && z > PLAZA.z) return true;                  // approach
    for (const [bx, bz] of bridgePlan) if (Math.hypot(x - bx, z - bz) < 5 + pad) return true;
    return false;
  };

  const palms = [], trees = [];
  const prand = makeRng(7);
  const addPalm = (x, z, h = 5.8 + prand() * 2.6) => palms.push({ x, z, h, r: prand() * Math.PI * 2, lean: (prand() - 0.5) * 0.12 });
  // boulevard avenue (both sides) and east-west avenue
  for (let z = ROAD.ewZ + ROAD.rbR + 6; z <= 66; z += 6.5) for (const x of [-ROAD.half - 1.0, ROAD.half + 1.0]) {
    const near = bridgePlan.some(([bx, bz]) => Math.hypot(x - bx, z - bz) < 5);
    if (!near) addPalm(x, z, 7.2 + prand() * 1.2);
  }
  for (let x = -64; x <= 64; x += 7) if (Math.abs(x) > ROAD.rbR + 4) {
    addPalm(x, ROAD.ewZ - ROAD.half - 1.0, 7 + prand());
    if (!blocked(x, ROAD.ewZ + ROAD.half + 3.5, -1.6)) addPalm(x, ROAD.ewZ + ROAD.half + 1.0, 7 + prand());
  }
  // plaza rim
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a)) - Math.PI / 2) < 0.28) continue; // keep the approach open (+z)
    addPalm(PLAZA.x + Math.cos(a) * (PLAZA.r - 1.6), PLAZA.z + Math.sin(a) * (PLAZA.r - 1.6), 6.5 + prand() * 1.5);
  }
  // roundabout island
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; addPalm(Math.cos(a) * 3, ROAD.ewZ + Math.sin(a) * 3, 5.5 + prand() * 1.5); }
  addPalm(0, ROAD.ewZ, 8.5);
  // courtyards: palms between path and building
  for (const rg of rings) {
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.2, rr = rg.rGlassIn - 3.0;
      addPalm(rg.c.cx + Math.cos(a) * rr, rg.c.cz + Math.sin(a) * rr, 5.5 + prand() * 1.5);
    }
    if (rg === rings[1]) for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; addPalm(rg.c.cx + Math.cos(a) * 7.2, rg.c.cz + Math.sin(a) * 7.2, 6 + prand() * 2); }
  }
  // groves: random scatter on the lawns
  const grove = (n, x0, z0, x1, z1, kind) => {
    for (let k = 0, tries = 0; k < n && tries < n * 30; tries++) {
      const x = x0 + prand() * (x1 - x0), z = z0 + prand() * (z1 - z0);
      if (blocked(x, z, 0.5)) continue;
      const list = kind === 'palm' ? palms : trees;
      if (list.some((p) => Math.hypot(p.x - x, p.z - z) < (kind === 'palm' ? 3.4 : 5.2))) continue;
      if (kind === 'palm') addPalm(x, z); else trees.push({ x, z, s: 2.6 + prand() * 1.6, r: prand() * 6 });
      k++;
    }
  };
  const gp = Q.palms, gt = Q.trees;
  grove(Math.round(34 * gp), -66, 4, -4, 66, 'palm');
  grove(Math.round(34 * gp), 4, 4, 66, 66, 'palm');
  grove(Math.round(30 * gp), -66, -66, 66, -12, 'palm');
  grove(Math.round(26 * gt), -66, -66, 66, -14, 'tree');
  grove(Math.round(14 * gt), -66, 40, 66, 66, 'tree');

  {
    const tm = [], cm = [];
    const top = new THREE.Vector3();
    for (const p of palms) {
      const m4 = trs(p.x, 0.15, p.z, p.r, 1, p.h, 1, p.lean, -p.lean);
      tm.push(m4);
      top.set(0, 1, 0).applyMatrix4(m4); // crown sits on the (leaning) trunk tip
      const sc = 0.62 + p.h / 40;
      cm.push(trs(top.x, top.y - 0.1, top.z, p.r, sc, sc, sc));
    }
    site.add(instancedMesh(trunkGeo, mat.trunk, tm, 'palm-trunks'));
    site.add(instancedMesh(frondGeo, mat.frond, cm, 'palm-crowns'));
    const ttm = [], tcm = [];
    for (const t of trees) {
      ttm.push(trs(t.x, 0.15, t.z, 0, 1.3, t.s * 0.9, 1.3));
      tcm.push(trs(t.x, 0.15 + t.s * 1.35, t.z, t.r, t.s, t.s * 0.82, t.s));
    }
    site.add(instancedMesh(treeTrunkGeo, mat.trunk, ttm, 'tree-trunks'));
    site.add(instancedMesh(canopyGeo, mat.canopy, tcm, 'tree-canopies'));
  }

  /* ---------- street lamps, cars ---------- */
  const lampPoleGeo = G(new THREE.CylinderGeometry(0.07, 0.1, 1, 6)); lampPoleGeo.translate(0, 0.5, 0);
  const lampHeadGeo = G(new THREE.CylinderGeometry(0.4, 0.3, 0.16, 10));
  {
    const pm = [], hm = [];
    const addLamp = (x, z, h = 6) => { pm.push(trs(x, 0.02, z, 0, 1, h, 1)); hm.push(trs(x, 0.02 + h, z)); };
    for (let z = ROAD.ewZ + ROAD.rbR + 9; z <= 66; z += 13) for (const x of [-ROAD.half - 0.6, ROAD.half + 0.6]) {
      if (!bridgePlan.some(([bx, bz]) => Math.hypot(x - bx, z - bz) < 4)) addLamp(x, z);
    }
    for (let x = -62; x <= 62; x += 14) if (Math.abs(x) > ROAD.rbR + 5) { addLamp(x, ROAD.ewZ - ROAD.half - 0.6); addLamp(x + 7, ROAD.ewZ + ROAD.half + 0.6); }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + 0.13; addLamp(PLAZA.x + Math.cos(a) * (PLAZA.r - 4.2), PLAZA.z + Math.sin(a) * (PLAZA.r - 4.2), 4.2); }
    site.add(instancedMesh(lampPoleGeo, mat.frame, pm, 'lamp-poles'));
    site.add(instancedMesh(lampHeadGeo, mat.lampHead, hm, 'lamp-heads', { cast: false }));
  }
  const carGeo = (() => {
    const body = new THREE.BoxGeometry(4.3, 0.75, 1.8); body.translate(0, 0.55, 0);
    const cabin = new THREE.BoxGeometry(2.3, 0.6, 1.6); cabin.translate(-0.2, 1.2, 0);
    return mergeGeos([body, cabin]);
  })();
  {
    const crand = makeRng(5);
    const light = [], dark = [];
    const put = (x, z, ry) => (crand() < 0.6 ? light : dark).push(trs(x, 0.05, z, ry));
    for (let i = 0; i < 8; i++) { const z = 14 + crand() * 40; put(crand() < 0.5 ? -2.2 : 2.2, z, Math.PI / 2); }
    for (let i = 0; i < 10; i++) { let x = (crand() * 2 - 1) * 64; if (Math.abs(x) < ROAD.rbR + 3) x += Math.sign(x || 1) * 16; put(x, ROAD.ewZ + (crand() < 0.5 ? -2.2 : 2.2), 0); }
    site.add(instancedMesh(carGeo, mat.carLight, light, 'cars-light'));
    site.add(instancedMesh(carGeo, mat.carDark, dark, 'cars-dark'));
  }

  /* ---------- night lights (engine ramps intensity to userData.nightIntensity) ---------- */
  const lamps = [];
  const point = (name, x, y, z, intensity, dist = 34) => {
    const l = new THREE.PointLight(COLORS.lampGlow, 0, dist, 2);
    l.name = name; l.position.set(x, y, z); l.castShadow = false;
    l.userData.nightIntensity = intensity;
    root.add(l); lamps.push(l);
  };
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    point(`plaza-light-${i}`, PLAZA.x + Math.cos(a) * 16, 4.5, PLAZA.z + Math.sin(a) * 16, 160);
  }
  point('bridge-light', 0, 6.0, 46.5, 140, 30);
  point('courtyard-west-light', rings[0].c.cx, 4, rings[0].c.cz, 120, 22);
  point('courtyard-east-light', rings[1].c.cx, 4, rings[1].c.cz, 120, 22);
  {
    // uplight washing the sail fin
    const th = TOWER.finTheta;
    const sl = new THREE.SpotLight(0xfff1dc, 0, 90, 0.42, 0.6, 1.4);
    sl.name = 'sail-uplight';
    sl.position.set(TOWER.cx + Math.sin(th) * 22, 0.6, TOWER.cz + Math.cos(th) * 22);
    sl.target.position.set(TOWER.cx + Math.sin(th) * 6, 36, TOWER.cz + Math.cos(th) * 6);
    sl.castShadow = false;
    sl.userData.nightIntensity = 2400;
    root.add(sl, sl.target); lamps.push(sl);
  }

  /* ---------- floors ordered bottom → top (level, then building) ---------- */
  floors.sort((a, b) => a.userData.level - b.userData.level);

  /* ---------- animation + disposal ---------- */
  function update(dt, t) {
    if (waterNormal) { waterNormal.offset.x = (t * 0.012) % 1; waterNormal.offset.y = (t * 0.007) % 1; }
  }
  function dispose() {
    for (const im of instanced) im.dispose();
    for (const l of lamps) l.dispose && l.dispose();
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
    texs.forEach((t) => t.dispose());
    geos.clear(); mats.clear(); texs.clear();
    root.removeFromParent();
  }

  return { root, floors, site, nightMaterials, lamps, update, dispose };
}
