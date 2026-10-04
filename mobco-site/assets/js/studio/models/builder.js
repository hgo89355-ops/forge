/**
 * MOBCO Project Builder · model "builder"
 * ------------------------------------------------------------------
 * A procedural concept sketch built from the visitor's choices: building type, number of floors, footprint,
 * facade material and accent colour, roof extras (terrace, solar panels) and site extras (pool, landscaping,
 * parking). It is a quick massing sketch for conversation, not a design: no areas, costs or approvals implied.
 *
 * Contract: THREE is injected into build(); the current choices live in this module (setConfig / getConfig),
 * so the engine simply reloads "builder" after every change. World units = metres, ground at y = 0,
 * +Z = street side (front).
 */

/* ================================================================== options */
export const TYPES = ['office', 'residential', 'villa', 'mixed', 'school'];
export const FACADES = ['glass', 'stone', 'render', 'brick'];
export const COLOURS = ['indigo', 'teal', 'sand', 'charcoal'];
export const SIZES = ['s', 'm', 'l'];
/** floors: [min, max, default] per type */
export const FLOORS = { office: [2, 24, 8], residential: [4, 32, 14], villa: [1, 3, 2], mixed: [3, 20, 8], school: [1, 4, 3] };
export const DEFAULTS = Object.freeze({
  type: 'mixed', floors: 8, size: 'm', facade: 'glass', colour: 'teal',
  terrace: true, solar: false, pool: false, landscape: true, parking: true,
});

// brand palette (logo colours) used as accents: frames, fins, spandrels, canopies, glass tint
const ACCENT = { indigo: 0x535380, teal: 0x5fb2b8, sand: 0xb2aa8a, charcoal: 0x3a3a3e };
const GLASS_TINT = { indigo: 0x737791, teal: 0x7898a0, sand: 0x8f8c80, charcoal: 0x666c74 };

const clampInt = (v, a, b) => Math.max(a, Math.min(b, Math.round(+v || 0)));

export function normalizeConfig(c = {}) {
  const type = TYPES.includes(c.type) ? c.type : DEFAULTS.type;
  const [lo, hi, def] = FLOORS[type];
  return {
    type,
    floors: Number.isFinite(+c.floors) ? clampInt(c.floors, lo, hi) : def,
    size: SIZES.includes(c.size) ? c.size : DEFAULTS.size,
    facade: FACADES.includes(c.facade) ? c.facade : DEFAULTS.facade,
    colour: COLOURS.includes(c.colour) ? c.colour : DEFAULTS.colour,
    terrace: c.terrace === undefined ? DEFAULTS.terrace : !!c.terrace,
    solar: c.solar === undefined ? DEFAULTS.solar : !!c.solar,
    pool: c.pool === undefined ? DEFAULTS.pool : !!c.pool,
    landscape: c.landscape === undefined ? DEFAULTS.landscape : !!c.landscape,
    parking: c.parking === undefined ? DEFAULTS.parking : !!c.parking,
  };
}

let CONFIG = normalizeConfig(DEFAULTS);
export function setConfig(c) { CONFIG = normalizeConfig({ ...CONFIG, ...c }); return { ...CONFIG }; }
export function getConfig() { return { ...CONFIG }; }

/* ================================================================== meta (refreshed by every build) */
const BASE_META = {
  id: 'builder',
  name: { en: 'Your project', ar: 'مشروعك' },
  projectSlug: null,
  tagline: null,
  descriptors: [],
  hotspots: [],
  sun: { azimuth: -34, elevation: 42 },
};
export let meta = { ...BASE_META, camera: { target: [0, 8, 0], aerial: [70, 60, 80], street: [20, 1.7, 40], top: [0, 160, 0.05], front: [0, 12, 90] } };

/* ================================================================== build */
export function build(THREE, ctx = {}) {
  const cfg = { ...CONFIG };
  const HIGH = ctx.quality !== 'low';

  /* ---------- resources --------------------------------------------- */
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const G = (g) => (geometries.add(g), g);
  const std = (name, p) => { const m = new THREE.MeshStandardMaterial(p); m.name = name; materials.add(m); return m; };
  const phys = (name, p) => { const m = new THREE.MeshPhysicalMaterial(p); m.name = name; materials.add(m); return m; };

  let seed = 90210;
  const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rr = (a, b) => a + (b - a) * rnd();

  // gentle ripple normal map for the pool
  const ripple = (() => {
    const N = 128, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'), img = g.createImageData(N, N);
    const hgt = (x, y) => { const u = (x / N) * Math.PI * 2, v = (y / N) * Math.PI * 2; return Math.sin(u * 3 + Math.sin(v * 2) * 1.3) * 0.5 + Math.sin(v * 5 + u * 2) * 0.3 + Math.sin((u - v) * 7) * 0.15; };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = hgt(x + 1, y) - hgt(x - 1, y), dy = hgt(x, y + 1) - hgt(x, y - 1);
      let nx = -dx, ny = -dy, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const i = (y * N + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255; img.data[i + 1] = (ny * 0.5 + 0.5) * 255; img.data[i + 2] = (nz * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; textures.add(t); return t;
  })();

  /* ---------- materials --------------------------------------------- */
  const accent = new THREE.Color(ACCENT[cfg.colour]);
  const accentDark = accent.clone().lerp(new THREE.Color(0x30343a), 0.55).multiplyScalar(0.8);
  const M = {
    glass: phys('builder-glass', { color: GLASS_TINT[cfg.colour], roughness: 0.04, metalness: 0.08, transparent: true, opacity: 0.5, envMapIntensity: 1.4, depthWrite: false }),
    railGlass: phys('builder-balustrade-glass', { color: 0xbfd6dc, roughness: 0.05, metalness: 0.05, transparent: true, opacity: 0.32, envMapIntensity: 1.2, depthWrite: false, side: THREE.DoubleSide }),
    spandrel: std('builder-spandrel', { color: accentDark, roughness: 0.28, metalness: 0.4 }),
    metal: std('builder-metal-accent', { color: accent, roughness: 0.38, metalness: 0.55 }),
    metalLight: std('builder-metal-light', { color: 0xc9ccce, roughness: 0.4, metalness: 0.5 }),
    stone: std('builder-stone', { color: 0xe4d9c4, roughness: 0.74 }),
    render: std('builder-white-render', { color: 0xf0ede6, roughness: 0.86 }),
    brick: std('builder-brick', { color: 0xa65d40, roughness: 0.9 }),
    concrete: std('builder-concrete-slab', { color: 0xd8d4cb, roughness: 0.82 }),
    roof: std('builder-roof-membrane', { color: 0xc9c5bc, roughness: 0.95 }),
    deck: std('builder-timber-deck', { color: 0xa98058, roughness: 0.78 }),
    paving: std('builder-paving', { color: 0xddd4c4, roughness: 0.86 }),
    gravel: std('builder-gravel', { color: 0xc8beac, roughness: 1 }),
    kerb: std('builder-kerb', { color: 0xd5cfc4, roughness: 0.8 }),
    asphalt: std('builder-asphalt', { color: 0x4c4f55, roughness: 0.94 }),
    marking: std('builder-road-marking', { color: 0xf1efe8, roughness: 0.75 }),
    lawn: std('builder-lawn', { color: 0x7f9b5f, roughness: 1 }),
    hedge: std('builder-hedge', { color: 0x4f6c42, roughness: 0.95 }),
    leafA: std('builder-foliage-a', { color: 0x557a43, roughness: 0.9 }),
    leafB: std('builder-foliage-b', { color: 0x6b8c4e, roughness: 0.9 }),
    leafC: std('builder-foliage-c', { color: 0x46663b, roughness: 0.9 }),
    frond: std('builder-palm-frond', { color: 0x5b7f45, roughness: 0.85, side: THREE.DoubleSide }),
    trunk: std('builder-tree-trunk', { color: 0x7a6650, roughness: 0.95 }),
    palmTrunk: std('builder-palm-trunk', { color: 0x9a8670, roughness: 0.95 }),
    planter: std('builder-planter-concrete', { color: 0xcfc8bb, roughness: 0.85 }),
    coping: std('builder-pool-coping', { color: 0xf0ece4, roughness: 0.6 }),
    poolTile: std('builder-pool-tile', { color: 0x9fd1d6, roughness: 0.4 }),
    water: phys('builder-pool-water', { color: 0x2a7f92, roughness: 0.04, metalness: 0.02, clearcoat: 1, clearcoatRoughness: 0.04, normalMap: ripple, normalScale: new THREE.Vector2(0.22, 0.22), envMapIntensity: 1.2, emissive: 0x2fb5c8, emissiveIntensity: 0, transparent: true, opacity: 0.88, depthWrite: true }),
    fabric: std('builder-fabric', { color: 0xefe9dc, roughness: 0.9, side: THREE.DoubleSide }),
    fabricAccent: std('builder-fabric-accent', { color: accent, roughness: 0.9, side: THREE.DoubleSide }),
    solar: std('builder-solar-panel', { color: 0x1c2333, roughness: 0.22, metalness: 0.55 }),
    carWhite: std('builder-car-white', { color: 0xeeeeec, roughness: 0.3, metalness: 0.35 }),
    carSilver: std('builder-car-silver', { color: 0xa9adb2, roughness: 0.3, metalness: 0.55 }),
    carDark: std('builder-car-graphite', { color: 0x2f3338, roughness: 0.3, metalness: 0.5 }),
    carBlue: std('builder-car-indigo', { color: 0x464a6e, roughness: 0.3, metalness: 0.45 }),
    carGlass: std('builder-car-glass', { color: 0x20262e, roughness: 0.12, metalness: 0.4 }),
    // night-ramped (emissiveIntensity 0 → 1 by the engine)
    interiorA: std('builder-interior-a', { color: 0x3c414b, roughness: 0.85, emissive: 0xffffff, emissiveIntensity: 0 }),
    interiorB: std('builder-interior-b', { color: 0x434853, roughness: 0.85, emissive: 0xffffff, emissiveIntensity: 0 }),
    interiorC: std('builder-interior-c', { color: 0x363b44, roughness: 0.85, emissive: 0xffffff, emissiveIntensity: 0 }),
    lobby: std('builder-interior-lobby', { color: 0x5b5f66, roughness: 0.7, emissive: 0xffffff, emissiveIntensity: 0 }),
    lampHead: std('builder-lamp-head', { color: 0xf2efe8, roughness: 0.4, emissive: 0xffdcaa, emissiveIntensity: 0 }),
    strip: std('builder-light-strip', { color: 0xf3f1ec, roughness: 0.5, emissive: 0xfff0d8, emissiveIntensity: 0 }),
  };
  ripple.repeat.set(4, 4);
  // warm HDR interior glow: lit floors read through the tinted glass after dusk; a few floors stay dimmer
  M.interiorA.emissive.setRGB(1.9, 1.15, 0.55);
  M.interiorB.emissive.setRGB(1.35, 0.95, 0.6);
  M.interiorC.emissive.setRGB(0.5, 0.42, 0.34);
  M.lobby.emissive.setRGB(2.2, 1.5, 0.8);
  M.lampHead.emissive.multiplyScalar(3);
  M.strip.emissive.multiplyScalar(2.6);
  M.water.emissive.multiplyScalar(0.8);
  const nightMaterials = [M.interiorA, M.interiorB, M.interiorC, M.lobby, M.lampHead, M.strip, M.water];
  const interiors = [M.interiorA, M.interiorB, M.interiorA, M.interiorC, M.interiorB];
  const wallMat = { glass: M.spandrel, stone: M.stone, render: M.render, brick: M.brick }[cfg.facade];

  /* ---------- geometry kit: instanced boxes / shapes grouped per floor ---------- */
  const UNIT_BOX = G(new THREE.BoxGeometry(1, 1, 1));
  const TRUNK = G(new THREE.CylinderGeometry(0.11, 0.17, 1, 7).translate(0, 0.5, 0));
  const CANOPY = G(new THREE.IcosahedronGeometry(1, HIGH ? 2 : 1));
  const FROND = G(new THREE.PlaneGeometry(0.75, 3.6, 1, 3).translate(0, 1.8, 0));
  { // droop the fronds a little
    const pos = FROND.attributes.position;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setZ(i, -0.06 * y * y); }
    FROND.computeVertexNormals();
  }
  const CONE = G(new THREE.ConeGeometry(1, 0.5, 12, 1, true).translate(0, -0.25, 0));
  const POLE = G(new THREE.CylinderGeometry(0.07, 0.09, 1, 6).translate(0, 0.5, 0));

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), vp = new THREE.Vector3(), vs = new THREE.Vector3();
  function Kit() {
    const buckets = new Map();
    const push = (geo, mat, matrix, cast) => {
      const k = `${geo.uuid}|${mat.uuid}|${cast ? 1 : 0}`;
      let b = buckets.get(k);
      if (!b) { b = { geo, mat, cast, list: [] }; buckets.set(k, b); }
      b.list.push(matrix.clone());
    };
    return {
      box(mat, x, y, z, sx, sy, sz, ry = 0, cast = true) {
        if (sx <= 0.001 || sy <= 0.001 || sz <= 0.001) return;
        q.setFromEuler(e.set(0, ry, 0));
        push(UNIT_BOX, mat, m4.compose(vp.set(x, y, z), q, vs.set(sx, sy, sz)), cast);
      },
      /** axis-aligned box from min / max corners */
      span(mat, x0, y0, z0, x1, y1, z1, cast = true) {
        this.box(mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), 0, cast);
      },
      shape(geo, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, cast = true) {
        q.setFromEuler(e.set(rx, ry, rz, 'YXZ'));
        push(geo, mat, m4.compose(vp.set(x, y, z), q, vs.set(sx, sy, sz)), cast);
      },
      addTo(group, { receive = true } = {}) {
        for (const b of buckets.values()) {
          const mesh = new THREE.InstancedMesh(b.geo, b.mat, b.list.length);
          b.list.forEach((mx, i) => mesh.setMatrixAt(i, mx));
          mesh.instanceMatrix.needsUpdate = true;
          mesh.castShadow = b.cast && !b.mat.transparent;
          mesh.receiveShadow = receive;
          mesh.computeBoundingSphere();
          mesh.computeBoundingBox();
          group.add(mesh);
        }
      },
    };
  }

  /* ---------- scene graph ------------------------------------------- */
  const root = new THREE.Group(); root.name = 'builder';
  const building = new THREE.Group(); building.name = 'building'; root.add(building);
  const site = new THREE.Group(); site.name = 'site';
  const levelKits = [];     // index = level → Kit
  const levelY = [];        // index = level → base y
  const kitAt = (level) => (levelKits[level] ||= Kit());
  const siteKit = Kit();

  /* ---------- facade helpers ---------------------------------------- */
  // A side of a rectangle: along-axis 'x' or 'z', from a0 to a1, outer face at `f`, outward sign `s`.
  const sidesOf = (x0, x1, z0, z1) => ([
    { ax: 'x', a0: x0, a1: x1, f: z1, s: 1, name: 'front' },
    { ax: 'x', a0: x0, a1: x1, f: z0, s: -1, name: 'back' },
    { ax: 'z', a0: z0, a1: z1, f: x1, s: 1, name: 'right' },
    { ax: 'z', a0: z0, a1: z1, f: x0, s: -1, name: 'left' },
  ]);
  /** Box on a side: `a` along the side (centre), `o` offset outwards from the face (centre), sizes along/out/height. */
  function put(kit, mat, side, a, o, y, la, lo, h, cast = true) {
    const off = side.f + side.s * o;
    if (side.ax === 'x') kit.box(mat, a, y, off, la, h, lo, 0, cast);
    else kit.box(mat, off, y, a, lo, h, la, 0, cast);
  }
  const modules = (a0, a1, step) => {
    const L = a1 - a0; const n = Math.max(1, Math.round(L / step)); const m = L / n;
    return { n, m, at: (i) => a0 + m * i };
  };

  /** One storey of facade on all sides of a rectangle. kind: 'typical' | 'lobby' | 'retail' */
  function facadeLevel(kit, rect, y, h, kind, opts = {}) {
    const { x0, x1, z0, z1 } = rect;
    const sides = sidesOf(x0, x1, z0, z1).filter((sd) => !(opts.skip || []).includes(sd.name));
    const ys = y + 0.32; // above the slab
    const hh = h - 0.32;
    const interior = opts.interior || M.interiorA;
    // floor plate + interior volume seen through the glass
    kit.span(M.concrete, x0 + 0.05, y, z0 + 0.05, x1 - 0.05, y + 0.32, z1 - 0.05);
    kit.span(interior, x0 + 0.9, ys, z0 + 0.9, x1 - 0.9, y + h - 0.02, z1 - 0.9, false);

    if (kind === 'lobby' || kind === 'retail') {
      for (const sd of sides) {
        const L = sd.a1 - sd.a0, mid = (sd.a0 + sd.a1) / 2;
        put(kit, M.glass, sd, mid, -0.35, ys + hh / 2, L - 0.4, 0.06, hh);
        const md = modules(sd.a0, sd.a1, kind === 'retail' ? 6 : 7.5);
        for (let i = 0; i <= md.n; i++) put(kit, wallMat === M.spandrel ? M.concrete : wallMat, sd, md.at(i), -0.05, ys + hh / 2, 0.7, 0.7, hh);
        // mullions every 1.5 m
        const mm = modules(sd.a0, sd.a1, 1.5);
        for (let i = 1; i < mm.n; i++) put(kit, M.metal, sd, mm.at(i), -0.3, ys + hh / 2, 0.06, 0.12, hh, false);
        put(kit, M.metal, sd, mid, -0.3, ys + hh - 0.5, L - 0.4, 0.12, 0.08, false);
        if (kind === 'retail') { // signage / canopy band
          put(kit, M.spandrel, sd, mid, 0.05, y + h - 0.45, L, 0.3, 0.7);
          put(kit, M.strip, sd, mid, 0.22, y + h - 0.82, L - 1, 0.04, 0.06, false);
          put(kit, M.spandrel, sd, mid, 1.0, y + h - 1.2, L - 2, 2.0, 0.18);
        }
        if (sd.name === 'front' && kind === 'lobby' && opts.canopy !== false) {
          const cw = Math.min(14, L * 0.45);
          put(kit, M.metal, sd, mid, 2.0, y + Math.min(h - 0.6, 4.2), cw, 4.2, 0.28);
          put(kit, M.strip, sd, mid, 2.0, y + Math.min(h - 0.6, 4.2) - 0.16, cw - 0.6, 3.6, 0.03, false);
          for (const k of [-1, 1]) put(kit, M.metal, sd, mid + k * (cw / 2 - 0.4), 3.6, y + Math.min(h - 0.6, 4.2) / 2, 0.18, 0.18, Math.min(h - 0.6, 4.2));
        }
      }
      return;
    }

    for (const sd of sides) {
      const L = sd.a1 - sd.a0, mid = (sd.a0 + sd.a1) / 2;
      if (cfg.facade === 'glass') {
        const sp = Math.min(0.95, hh * 0.28);
        put(kit, M.spandrel, sd, mid, 0.04, y + (sp + 0.32) / 2, L + 0.08, 0.08, sp + 0.32);
        put(kit, M.glass, sd, mid, 0.0, ys + sp + (hh - sp) / 2, L, 0.05, hh - sp);
        const mm = modules(sd.a0, sd.a1, 1.5);
        for (let i = 0; i <= mm.n; i++) put(kit, M.metal, sd, mm.at(i), 0.07, y + h / 2, 0.07, 0.14, h, false);
        put(kit, M.metal, sd, mid, 0.07, ys + sp, L, 0.12, 0.06, false);
      } else if (cfg.facade === 'stone') {
        const md = modules(sd.a0, sd.a1, 2.7);
        put(kit, M.stone, sd, mid, -0.1, y + 0.6, L + 0.2, 0.5, 1.2);           // sill band (covers the slab edge)
        put(kit, M.stone, sd, mid, -0.1, y + h - 0.2, L + 0.2, 0.5, 0.4);       // head band
        put(kit, M.glass, sd, mid, -0.38, ys + 0.9 + (hh - 1.25) / 2, L, 0.04, hh - 1.25);
        for (let i = 0; i <= md.n; i++) put(kit, M.stone, sd, md.at(i), 0.02, y + h / 2, 0.8, 0.74, h);
        for (let i = 0; i < md.n; i++) put(kit, M.metal, sd, md.at(i) + md.m / 2, -0.33, ys + 0.9 + (hh - 1.25) / 2, 0.06, 0.1, hh - 1.25, false);
      } else if (cfg.facade === 'render') {
        put(kit, M.render, sd, mid, -0.08, y + 0.62, L + 0.16, 0.46, 1.24);      // solid band
        put(kit, M.render, sd, mid, -0.08, y + h - 0.14, L + 0.16, 0.46, 0.28);
        put(kit, M.glass, sd, mid, -0.26, ys + 0.92 + (hh - 1.16) / 2, L, 0.04, hh - 1.16);
        const mm = modules(sd.a0, sd.a1, 1.8);
        for (let i = 1; i < mm.n; i++) put(kit, M.metalLight, sd, mm.at(i), -0.22, ys + 0.92 + (hh - 1.16) / 2, 0.05, 0.08, hh - 1.16, false);
        if (!opts.balconies) {
          const fm = modules(sd.a0, sd.a1, 3.6);
          for (let i = 0; i <= fm.n; i++) put(kit, M.metal, sd, fm.at(i), 0.3, y + h / 2, 0.12, 0.6, h);
        }
      } else { // brick: punched windows
        const md = modules(sd.a0, sd.a1, 2.6);
        const win = Math.min(1.5, md.m * 0.58);
        put(kit, M.brick, sd, mid, -0.08, y + 0.5, L + 0.16, 0.46, 1.0);
        put(kit, M.brick, sd, mid, -0.08, y + h - 0.3, L + 0.16, 0.46, 0.6);
        put(kit, M.glass, sd, mid, -0.3, ys + 0.68 + (hh - 1.28) / 2, L, 0.04, hh - 1.28);
        for (let i = 0; i <= md.n; i++) {
          const a = md.at(i);
          const w = i === 0 || i === md.n ? (md.m - win) / 2 + 0.25 : md.m - win;
          const c = i === 0 ? a + w / 2 - 0.25 : i === md.n ? a - w / 2 + 0.25 : a;
          put(kit, M.brick, sd, c, -0.08, y + h / 2, w, 0.46, h);
        }
        for (let i = 0; i < md.n; i++) {
          const c = md.at(i) + md.m / 2;
          for (const k of [-1, 1]) put(kit, M.metal, sd, c + k * (win / 2 - 0.04), -0.24, ys + 0.68 + (hh - 1.28) / 2, 0.08, 0.16, hh - 1.28, false);
          put(kit, M.metal, sd, c, -0.2, ys + 0.66, win, 0.24, 0.06, false);
          put(kit, M.metal, sd, c, -0.24, ys + 0.68 + (hh - 1.28) / 2, 0.05, 0.1, hh - 1.28, false);
        }
      }
      // balconies (residential): front and back, every other module, white slabs with glass balustrades
      if (opts.balconies && (sd.name === 'front' || sd.name === 'back')) {
        const bm = modules(sd.a0 + 1.5, sd.a1 - 1.5, 4.2);
        for (let i = 0; i < bm.n; i++) {
          const c = bm.at(i) + bm.m / 2, bw = Math.min(3.6, bm.m - 0.5);
          put(kit, M.render, sd, c, 0.75, y + 0.16, bw, 1.5, 0.22);
          put(kit, M.railGlass, sd, c, 1.47, y + 0.75, bw, 0.03, 1.0, false);
          put(kit, M.metalLight, sd, c, 1.47, y + 1.27, bw, 0.05, 0.05, false);
        }
      }
    }
  }

  /** Roof of a rectangle at height y (top of the last storey). Returns nothing; adds to `kit`. */
  function roofOf(kit, rect, y, { terrace, solar, plant = true, small = false } = {}) {
    const { x0, x1, z0, z1 } = rect;
    const W = x1 - x0, D = z1 - z0;
    kit.span(M.concrete, x0, y, z0, x1, y + 0.35, z1);
    kit.span(M.roof, x0 + 0.3, y + 0.35, z0 + 0.3, x1 - 0.3, y + 0.42, z1 - 0.3, false);
    const pm = cfg.facade === 'glass' ? M.spandrel : wallMat;
    const ph = 1.1, pt = 0.28;
    kit.span(pm, x0, y + 0.35, z1 - pt, x1, y + 0.35 + ph, z1);
    kit.span(pm, x0, y + 0.35, z0, x1, y + 0.35 + ph, z0 + pt);
    kit.span(pm, x0, y + 0.35, z0 + pt, x0 + pt, y + 0.35 + ph, z1 - pt);
    kit.span(pm, x1 - pt, y + 0.35, z0 + pt, x1, y + 0.35 + ph, z1 - pt);
    if (cfg.facade === 'glass') { // slim metal coping on the parapet
      const cy0 = y + 0.35 + ph, cy1 = cy0 + 0.08;
      kit.span(M.metal, x0 - 0.04, cy0, z1 - pt - 0.02, x1 + 0.04, cy1, z1 + 0.04, false);
      kit.span(M.metal, x0 - 0.04, cy0, z0 - 0.04, x1 + 0.04, cy1, z0 + pt + 0.02, false);
      kit.span(M.metal, x0 - 0.04, cy0, z0, x0 + pt + 0.02, cy1, z1, false);
      kit.span(M.metal, x1 - pt - 0.02, cy0, z0, x1 + 0.04, cy1, z1, false);
    }
    const top = y + 0.42;
    const zMid = terrace && solar ? (z0 + z1) / 2 : terrace ? z0 + 0.3 : z1 - 0.3;
    if (terrace) { // timber deck, planters, pergola, loungers
      const tz0 = zMid + 0.3, tz1 = z1 - 0.8, tx0 = x0 + 0.8, tx1 = x1 - 0.8;
      if (tz1 - tz0 > 2.5) {
        kit.span(M.deck, tx0, top, tz0, tx1, top + 0.1, tz1);
        const pw = Math.min(10, (tx1 - tx0) * 0.5), pz = Math.min(4, (tz1 - tz0) * 0.55);
        const pcx = tx0 + pw / 2 + 0.6, pcz = tz1 - pz / 2 - 0.4;
        for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) kit.box(M.metal, pcx + dx * (pw / 2 - 0.1), top + 1.35, pcz + dz * (pz / 2 - 0.1), 0.12, 2.6, 0.12);
        const ns = Math.round(pw / 0.55);
        for (let i = 0; i <= ns; i++) kit.box(M.metal, pcx - pw / 2 + (pw * i) / ns, top + 2.7, pcz, 0.08, 0.16, pz + 0.3, 0, true);
        for (let i = 0; i < Math.min(4, Math.floor((tx1 - tx0 - pw - 2) / 2.2)); i++) {
          const lx = tx1 - 1.2 - i * 2.2;
          kit.box(M.fabric, lx, top + 0.3, tz1 - 1.4, 0.75, 0.2, 1.9);
          kit.box(M.fabric, lx, top + 0.55, tz1 - 2.15, 0.75, 0.45, 0.3);
        }
        // planters along the inner edge
        const npl = Math.max(2, Math.floor((tx1 - tx0) / 5));
        for (let i = 0; i < npl; i++) {
          const px = tx0 + 1 + ((tx1 - tx0 - 2) * i) / Math.max(1, npl - 1);
          kit.box(M.planter, px, top + 0.35, tz0 + 0.6, 1.6, 0.6, 0.9);
          kit.shape(CANOPY, i % 2 ? M.leafB : M.leafA, px, top + 0.95, tz0 + 0.6, 0.85, 0.55, 0.5);
        }
        kit.span(M.strip, tx0, top + 0.12, tz0 - 0.02, tx1, top + 0.16, tz0 + 0.02, false);
      }
    }
    if (solar) {
      const sz0 = z0 + 1, sz1 = (terrace ? zMid : z1) - 1, sx0 = x0 + 1.2, sx1 = x1 - 1.2;
      const rowD = 2.2, pd = 1.7;
      const rows = Math.max(1, Math.floor((sz1 - sz0) / rowD));
      const plantGap = plant && !terrace && !small ? 6 : 0;
      for (let r = 0; r < rows; r++) {
        const zc = sz0 + rowD * (r + 0.5);
        const len = sx1 - sx0 - plantGap;
        const segs = Math.max(1, Math.round(len / 4));
        for (let s = 0; s < segs; s++) {
          const cx = sx0 + plantGap + (len * (s + 0.5)) / segs;
          kit.box(M.solar, cx, top + 0.62, zc, len / segs - 0.2, 0.06, pd, 0, true); // tilted after grouping
        }
      }
    }
    if (plant && !small && !(solar && !terrace)) {
      const pw = Math.min(8, W * 0.3), pd = Math.min(5, D * 0.3);
      const pz = terrace ? z0 + pd / 2 + 1.2 : (z0 + z1) / 2;
      kit.box(wallMat === M.spandrel ? M.render : wallMat === M.brick ? M.render : wallMat, x0 + pw / 2 + 1.5, top + 1.5, pz, pw, 3, pd);
      kit.box(M.metalLight, x0 + pw / 2 + 1.5, top + 3.15, pz, pw - 0.6, 0.3, pd - 0.6, 0, false);
    } else if (plant && small && !terrace && !solar) {
      kit.span(M.gravel, x0 + 0.4, top, z0 + 0.4, x1 - 0.4, top + 0.04, z1 - 0.4, false);
    }
  }

  /* ---------- building layouts --------------------------------------- */
  const SIZE_I = { s: 0, m: 1, l: 2 }[cfg.size];
  const blocks = [];  // { rect, levels: [{level, y, h, kind}], roof }
  let H = 0;          // total building height (top of roof)
  const n = cfg.floors;
  const labels = [];

  if (cfg.type === 'mixed') {
    const [w, d] = [[30, 22], [40, 28], [52, 34]][SIZE_I];
    const pod = { x0: -w / 2, x1: w / 2, z0: -d / 2, z1: d / 2 };
    const tw = Math.round(w * 0.58), td = Math.round(d * 0.62);
    const tower = { x0: -tw / 2 + w * 0.08, x1: tw / 2 + w * 0.08, z0: -d / 2 + 1.5, z1: -d / 2 + 1.5 + td };
    const podLevels = Math.min(2, n - 1);
    const lv = [];
    let y = 0;
    for (let i = 0; i < podLevels; i++) { lv.push({ level: i, y, h: 5, kind: 'retail', rect: pod }); y += 5; }
    const podTop = y;
    for (let i = podLevels; i < n; i++) { lv.push({ level: i, y, h: 3.6, kind: 'typical', rect: tower }); y += 3.6; }
    blocks.push({ levels: lv, podium: { rect: pod, y: podTop, level: podLevels - 1, skipRect: tower }, roofRect: tower, roofY: y });
    H = y + 1.5;
  } else if (cfg.type === 'office') {
    const [w, d] = [[24, 17], [34, 22], [46, 28]][SIZE_I];
    const r = { x0: -w / 2, x1: w / 2, z0: -d / 2, z1: d / 2 };
    const lv = []; let y = 0;
    for (let i = 0; i < n; i++) { const h = i === 0 ? 4.8 : 3.8; lv.push({ level: i, y, h, kind: i === 0 ? 'lobby' : 'typical', rect: r }); y += h; }
    blocks.push({ levels: lv, roofRect: r, roofY: y });
    H = y + 1.5;
  } else if (cfg.type === 'residential') {
    const [w, d] = [[17, 16], [23, 19], [29, 22]][SIZE_I];
    const r = { x0: -w / 2, x1: w / 2, z0: -d / 2, z1: d / 2 };
    const lv = []; let y = 0;
    for (let i = 0; i < n; i++) { const h = i === 0 ? 4.5 : 3.15; lv.push({ level: i, y, h, kind: i === 0 ? 'lobby' : 'typical', rect: r, balconies: i > 0 }); y += h; }
    blocks.push({ levels: lv, roofRect: r, roofY: y });
    H = y + 1.5;
  } else if (cfg.type === 'villa') {
    const [w, d] = [[13, 9], [17, 11], [22, 13]][SIZE_I];
    const lv = []; let y = 0;
    for (let i = 0; i < n; i++) {
      // upper floors shift sideways and step back: a modern stacked villa
      const shift = i === 0 ? 0 : i === 1 ? w * 0.18 : -w * 0.08;
      const ww = i === 0 ? w : i === 1 ? w * 0.82 : w * 0.6;
      const dd = i === 0 ? d : i === 1 ? d * 0.92 : d * 0.75;
      const r = { x0: -ww / 2 + shift, x1: ww / 2 + shift, z0: -d / 2, z1: -d / 2 + dd };
      lv.push({ level: i, y, h: 3.4, kind: 'typical', rect: r, villa: true });
      y += 3.4;
    }
    blocks.push({ levels: lv, roofRect: lv[lv.length - 1].rect, roofY: y, villa: true });
    H = y + 1.2;
  } else { // school: bar, L or U around a courtyard
    const bars = [
      [{ x0: -21, x1: 21, z0: -7, z1: 7 }],
      [{ x0: -24, x1: 24, z0: 2, z1: 16 }, { x0: -24, x1: -10, z0: -26, z1: 2 }],
      [{ x0: -30, x1: 30, z0: 6, z1: 20 }, { x0: -30, x1: -16, z0: -26, z1: 6 }, { x0: 16, x1: 30, z0: -26, z1: 6 }],
    ][SIZE_I];
    bars.forEach((r, bi) => {
      const lv = []; let y = 0;
      for (let i = 0; i < n; i++) { const h = i === 0 ? 4.2 : 3.8; lv.push({ level: i, y, h, kind: i === 0 && bi === 0 ? 'lobby' : 'typical', rect: r, skip: bi > 0 ? ['front'] : [], school: true }); y += h; }
      blocks.push({ levels: lv, roofRect: r, roofY: y, school: true, main: bi === 0 });
      H = Math.max(H, y + 1.5);
    });
  }

  // storeys
  for (const b of blocks) {
    for (const L of b.levels) {
      levelY[L.level] = levelY[L.level] ?? L.y;
      const kit = kitAt(L.level);
      const interior = L.kind === 'lobby' || L.kind === 'retail' ? M.lobby : interiors[(L.level * 7 + (b.main === false ? 3 : 0)) % interiors.length];
      facadeLevel(kit, L.rect, L.y, L.h, L.kind, { interior, balconies: L.balconies, skip: L.skip, canopy: !L.school || b.main !== false });
      if (L.school && cfg.facade !== 'brick') { // horizontal sun shades on classroom floors
        const r = L.rect;
        for (const sd of sidesOf(r.x0, r.x1, r.z0, r.z1)) {
          if ((L.skip || []).includes(sd.name) || L.kind === 'lobby') continue;
          put(kit, M.metal, sd, (sd.a0 + sd.a1) / 2, 0.55, L.y + L.h - 0.25, sd.a1 - sd.a0, 1.0, 0.08);
        }
      }
    }
    if (b.podium) { // podium roof around the tower: terrace or planting
      const { rect: r, y, level, skipRect: t } = b.podium;
      const kit = kitAt(level);
      kit.span(M.concrete, r.x0, y, r.z0, r.x1, y + 0.35, r.z1);
      const deck = cfg.terrace ? M.deck : cfg.landscape ? M.lawn : M.roof;
      kit.span(deck, r.x0 + 0.6, y + 0.35, t.z1 + 0.6, r.x1 - 0.6, y + 0.45, r.z1 - 0.6, false);
      kit.span(M.railGlass, r.x0 + 0.1, y + 0.35, r.z1 - 0.08, r.x1 - 0.1, y + 1.45, r.z1 - 0.04, false);
      kit.span(M.railGlass, r.x0 + 0.04, y + 0.35, r.z0 + 0.1, r.x0 + 0.08, y + 1.45, r.z1 - 0.1, false);
      kit.span(M.railGlass, r.x1 - 0.08, y + 0.35, r.z0 + 0.1, r.x1 - 0.04, y + 1.45, r.z1 - 0.1, false);
      if (cfg.landscape || cfg.terrace) {
        const np = Math.max(3, Math.floor((r.x1 - r.x0) / 6));
        for (let i = 0; i < np; i++) {
          const px = r.x0 + 2 + ((r.x1 - r.x0 - 4) * i) / (np - 1);
          kit.box(M.planter, px, y + 0.75, r.z1 - 1.6, 1.8, 0.8, 1.2);
          kit.shape(CANOPY, i % 2 ? M.leafA : M.leafC, px, y + 1.6, r.z1 - 1.6, 1.0, 0.75, 0.75);
        }
      }
      if (cfg.terrace) {
        for (let i = 0; i < 3; i++) {
          const ux = r.x0 + 4 + i * 5;
          kit.shape(CONE, M.fabricAccent, ux, y + 2.8, (t.z1 + r.z1) / 2, 1.5, 1, 1.5);
          kit.shape(POLE, M.metalLight, ux, y + 0.45, (t.z1 + r.z1) / 2, 0.6, 2.4, 0.6);
          kit.box(M.fabric, ux, y + 0.85, (t.z1 + r.z1) / 2, 0.9, 0.06, 0.9);
        }
      }
    }
    // roof
    const top = b.levels[b.levels.length - 1].level + 1;
    const villaOrSchool = b.villa || b.school;
    roofOf(kitAt(top), b.roofRect, b.roofY, {
      terrace: cfg.terrace && (b.main !== false), solar: cfg.solar, plant: !b.villa, small: villaOrSchool && (b.roofRect.z1 - b.roofRect.z0) < 16,
    });
    levelY[top] = levelY[top] ?? b.roofY;
    // villa: the lower roof exposed by a stepped upper floor becomes a terrace with a glass balustrade
    if (b.villa) {
      for (let i = 1; i < b.levels.length; i++) {
        const lo = b.levels[i - 1].rect, hi = b.levels[i].rect, y = b.levels[i].y;
        const kit = kitAt(i - 1);
        kit.span(M.concrete, lo.x0, y, lo.z0, lo.x1, y + 0.3, lo.z1);
        if (hi.z1 < lo.z1 - 0.5) {
          kit.span(M.deck, lo.x0 + 0.2, y + 0.3, hi.z1, lo.x1 - 0.2, y + 0.38, lo.z1 - 0.2, false);
          kit.span(M.railGlass, lo.x0 + 0.1, y + 0.3, lo.z1 - 0.1, lo.x1 - 0.1, y + 1.3, lo.z1 - 0.06, false);
        }
        if (hi.x1 > lo.x1) { // cantilever soffit
          kit.span(wallMat === M.spandrel ? M.render : wallMat, lo.x1, y, hi.z0, hi.x1, y + 0.32, hi.z1);
        }
      }
    }
  }

  // floor labels (shown in the level chip when a floor is selected)
  const top = levelKits.length - 1;
  for (let i = 0; i <= top; i++) {
    labels[i] = i === top
      ? { en: 'Roof', ar: 'السطح' }
      : i === 0 ? { en: 'Ground floor', ar: 'الطابق الأرضي' } : { en: `Floor ${i}`, ar: `الطابق ${i}` };
  }

  /* ---------- site ---------------------------------------------------- */
  const bb = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };
  for (const b of blocks) for (const L of b.levels) {
    bb.x0 = Math.min(bb.x0, L.rect.x0); bb.x1 = Math.max(bb.x1, L.rect.x1);
    bb.z0 = Math.min(bb.z0, L.rect.z0); bb.z1 = Math.max(bb.z1, L.rect.z1);
  }
  if (blocks[0].podium) { const r = blocks[0].podium.rect; bb.x0 = Math.min(bb.x0, r.x0); bb.x1 = Math.max(bb.x1, r.x1); bb.z0 = Math.min(bb.z0, r.z0); bb.z1 = Math.max(bb.z1, r.z1); }
  const villa = cfg.type === 'villa';
  const front = villa ? 9 : 14;
  const plot = {
    x0: bb.x0 - (villa ? 6 : 10) - (cfg.pool ? (villa ? 13 : 18) : 0),
    x1: bb.x1 + (villa ? 6 : 10) + (cfg.parking ? (villa ? 8 : 22) : 0),
    z0: bb.z0 - (villa ? 9 : 10),
    z1: bb.z1 + front,
  };
  const S = siteKit;
  const PW = plot.x1 - plot.x0, PD = plot.z1 - plot.z0;
  // plot base
  S.span(cfg.landscape ? M.lawn : M.gravel, plot.x0, 0, plot.z0, plot.x1, 0.06, plot.z1, false);
  // forecourt + entrance path
  const fx0 = bb.x0 - 3, fx1 = bb.x1 + 3;
  S.span(M.paving, fx0, 0, bb.z1, fx1, 0.09, plot.z1, false);
  if (!cfg.landscape) S.span(M.paving, plot.x0, 0, plot.z0, plot.x1, 0.075, plot.z1, false);
  // a paved ring around the building
  S.span(M.paving, bb.x0 - 2.5, 0, bb.z0 - 2.5, bb.x1 + 2.5, 0.085, bb.z1, false);
  // kerb + sidewalk + road
  const roadZ0 = plot.z1 + 4, roadZ1 = roadZ0 + 11;
  const rx0 = Math.min(plot.x0, -60) - 30, rx1 = Math.max(plot.x1, 60) + 30;
  S.span(M.paving, rx0, 0, plot.z1, rx1, 0.16, roadZ0, false);
  S.span(M.kerb, rx0, 0, roadZ0 - 0.25, rx1, 0.2, roadZ0, false);
  S.span(M.asphalt, rx0, 0, roadZ0, rx1, 0.06, roadZ1, false);
  S.span(M.kerb, rx0, 0, roadZ1, rx1, 0.2, roadZ1 + 0.25, false);
  S.span(M.paving, rx0, 0, roadZ1 + 0.25, rx1, 0.16, roadZ1 + 3.5, false);
  for (let x = rx0 + 2; x < rx1 - 2; x += 6) S.box(M.marking, x, 0.065, (roadZ0 + roadZ1) / 2, 3, 0.012, 0.15, 0, false);
  // site boundary: low wall (villa) or kerb + hedge (others)
  if (villa) {
    const wh = 1.6;
    S.span(M.render, plot.x0, 0, plot.z0, plot.x1, wh, plot.z0 + 0.25);
    S.span(M.render, plot.x0, 0, plot.z0, plot.x0 + 0.25, wh, plot.z1);
    S.span(M.render, plot.x1 - 0.25, 0, plot.z0, plot.x1, wh, plot.z1);
    S.span(M.render, plot.x0, 0, plot.z1 - 0.25, fx0 - 1, 1.1, plot.z1);
    S.span(M.render, fx1 + 1, 0, plot.z1 - 0.25, plot.x1, 1.1, plot.z1);
    S.span(M.metal, plot.x0, wh, plot.z0, plot.x1, wh + 0.08, plot.z0 + 0.27, false);
  } else {
    S.span(M.kerb, plot.x0, 0, plot.z0, plot.x1, 0.22, plot.z0 + 0.3, false);
    S.span(M.kerb, plot.x0, 0, plot.z0, plot.x0 + 0.3, 0.22, plot.z1, false);
    S.span(M.kerb, plot.x1 - 0.3, 0, plot.z0, plot.x1, 0.22, plot.z1, false);
  }

  // trees
  const tree = (x, z, s = 1) => {
    const h = rr(3.2, 4.4) * s;
    S.shape(TRUNK, M.trunk, x, 0.05, z, 1.4 * s, h, 1.4 * s);
    const leaves = [M.leafA, M.leafB, M.leafC];
    const r0 = rr(1.7, 2.3) * s;
    S.shape(CANOPY, leaves[Math.floor(rnd() * 3)], x, h + r0 * 0.55, z, r0, r0 * 0.9, r0);
    S.shape(CANOPY, leaves[Math.floor(rnd() * 3)], x + rr(-0.8, 0.8) * s, h + r0 * 0.95, z + rr(-0.8, 0.8) * s, r0 * 0.7, r0 * 0.66, r0 * 0.7);
    if (HIGH) S.shape(CANOPY, leaves[Math.floor(rnd() * 3)], x + rr(-1, 1) * s, h + r0 * 0.4, z + rr(-1, 1) * s, r0 * 0.6, r0 * 0.5, r0 * 0.6);
  };
  const palm = (x, z) => {
    const h = rr(6.5, 8.5);
    S.shape(TRUNK, M.palmTrunk, x, 0, z, 1.25, h, 1.25, rr(-0.05, 0.05), 0, rr(-0.05, 0.05));
    const nF = HIGH ? 9 : 6, a0 = rnd() * Math.PI;
    for (let i = 0; i < nF; i++) S.shape(FROND, M.frond, x, h - 0.1, z, 1, 1, 1, rr(0.95, 1.35), a0 + (i / nF) * Math.PI * 2, 0);
  };
  // street trees along the sidewalk (both sides of the road)
  for (let x = rx0 + 8; x < rx1 - 6; x += 11) { tree(x, plot.z1 + 2, 0.9); tree(x + 5, roadZ1 + 2, 0.85); }
  if (cfg.landscape) {
    // trees along the side and back boundaries, palms at the entrance, hedges
    for (let x = plot.x0 + 3; x <= plot.x1 - 3; x += rr(6.5, 8.5)) tree(x, plot.z0 + 2.6 + rr(-0.5, 0.5));
    for (let z = plot.z0 + 8; z <= plot.z1 - 6; z += rr(7, 9)) { if (!cfg.pool) tree(plot.x0 + 2.6, z); if (!cfg.parking) tree(plot.x1 - 2.6, z); }
    for (const k of [-1, 1]) palm((fx0 + fx1) / 2 + k * Math.min(10, (fx1 - fx0) * 0.32), plot.z1 - 3.5);
    if (!villa) {
      palm(fx0 + 2, bb.z1 + 4.5); palm(fx1 - 2, bb.z1 + 4.5);
      S.span(M.hedge, plot.x0 + 0.5, 0, plot.z1 - 1.6, fx0 - 1, 0.9, plot.z1 - 0.7);
      S.span(M.hedge, fx1 + 1, 0, plot.z1 - 1.6, plot.x1 - 0.5, 0.9, plot.z1 - 0.7);
    } else {
      S.span(M.hedge, plot.x0 + 0.4, 0, plot.z0 + 0.4, plot.x1 - 0.4, 1.3, plot.z0 + 1.2);
    }
    // planters with shrubs on the forecourt
    for (let i = 0; i < 4; i++) {
      const px = fx0 + 2 + ((fx1 - fx0 - 4) * i) / 3;
      S.box(M.planter, px, 0.35, plot.z1 - 7.5, 2.4, 0.5, 1.4);
      S.shape(CANOPY, i % 2 ? M.leafB : M.leafA, px, 0.8, plot.z1 - 7.5, 1.1, 0.5, 0.6);
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const px = fx0 + 3 + ((fx1 - fx0 - 6) * i) / 2;
      S.box(M.planter, px, 0.4, plot.z1 - 6, 1.6, 0.8, 1.6);
      S.shape(CANOPY, M.leafB, px, 1.1, plot.z1 - 6, 0.7, 0.55, 0.7);
    }
  }

  // parking (+X side)
  const carMats = [M.carWhite, M.carSilver, M.carDark, M.carWhite, M.carBlue, M.carSilver];
  const car = (x, z, ry) => {
    const mat = carMats[Math.floor(rnd() * carMats.length)];
    S.box(mat, x, 0.62, z, 1.85, 0.74, 4.4, ry);
    S.box(M.carGlass, x, 1.22, z - (Math.cos(ry) > 0 ? 0.2 : -0.2) * Math.abs(Math.cos(ry)), 1.65, 0.5, 2.3, ry);
    S.box(mat, x, 1.48, z, 1.6, 0.04, 1.9, ry, false);
  };
  if (cfg.parking) {
    if (villa) {
      const px0 = bb.x1 + 1.2, px1 = plot.x1 - 0.8;
      S.span(M.paving, px0, 0, bb.z0 + 1, px1, 0.1, plot.z1, false);
      S.span(M.metal, px0, 2.7, bb.z0 + 1.5, px1, 2.9, bb.z0 + 8);
      for (const zz of [bb.z0 + 1.7, bb.z0 + 7.8]) for (const xx of [px0 + 0.2, px1 - 0.2]) S.box(M.metal, xx, 1.35, zz, 0.14, 2.7, 0.14);
      car((px0 + px1) / 2, bb.z0 + 4.6, 0);
      car((px0 + px1) / 2, plot.z1 - 4.2, Math.PI);
    } else {
      const px0 = bb.x1 + 10.5, px1 = plot.x1 - 1.2, pz0 = plot.z0 + 2, pz1 = plot.z1 - 1;
      S.span(M.asphalt, px0, 0, pz0, px1, 0.08, pz1, false);
      const rowsX = [px0 + 2.8, px1 - 2.8];
      for (let r = 0; r < rowsX.length; r++) {
        for (let z = pz0 + 1.4; z < pz1 - 1.4; z += 2.6) {
          S.box(M.marking, rowsX[r] + (r === 0 ? 2.6 : -2.6), 0.085, z, 0.12, 0.012, 0.12, 0, false);
          S.box(M.marking, rowsX[r] + (r === 0 ? 0.4 : -0.4), 0.085, z - 1.3, 4.8, 0.012, 0.1, 0, false);
          if (rnd() < 0.68) car(rowsX[r] + (r === 0 ? 0.2 : -0.2), z, Math.PI / 2 * (r === 0 ? 1 : -1));
        }
      }
      // a short canopy of solar carports when solar is on
      if (cfg.solar) {
        for (let z = pz0 + 1; z < pz1 - 3; z += 11) {
          S.box(M.solar, rowsX[0], 3.0, z + 5, 5.6, 0.08, 10.4, 0, true);
          S.box(M.metalLight, rowsX[0] - 1.2, 1.5, z + 5, 0.15, 3.0, 0.15);
        }
      }
    }
  }

  // pool (−X side)
  if (cfg.pool) {
    const qx1 = bb.x0 - (villa ? 2 : 4), qx0 = plot.x0 + (villa ? 1.4 : 2.5);
    const qz0 = bb.z0 + (villa ? 0 : 1), qz1 = Math.min(plot.z1 - 4, bb.z1 + (villa ? 4 : 6));
    S.span(M.deck, qx0 - 0.5, 0, qz0 - 0.5, qx1 + 0.5, 0.12, qz1 + 0.5, false);
    const pw = Math.min(villa ? 5 : 8, qx1 - qx0 - 5.5), pl = Math.min(villa ? 10 : 16, qz1 - qz0 - 3.6);
    const wx0 = qx0 + 1.8, wx1 = wx0 + pw, wz0 = (qz0 + qz1) / 2 - pl / 2, wz1 = wz0 + pl;
    const cw = 0.45, cy = 0.22;
    S.span(M.coping, wx0 - cw, 0, wz0 - cw, wx1 + cw, cy, wz0, false);
    S.span(M.coping, wx0 - cw, 0, wz1, wx1 + cw, cy, wz1 + cw, false);
    S.span(M.coping, wx0 - cw, 0, wz0, wx0, cy, wz1, false);
    S.span(M.coping, wx1, 0, wz0, wx1 + cw, cy, wz1, false);
    S.span(M.poolTile, wx0, 0, wz0, wx1, 0.02, wz1, false);
    S.span(M.water, wx0, 0, wz0, wx1, 0.15, wz1, false);
    for (let z = wz0 + 0.8; z < wz1 - 0.6; z += 1.6) {
      S.box(M.fabric, wx1 + 1.6, 0.36, z, 1.9, 0.18, 0.7);
      S.box(M.fabric, wx1 + 2.45, 0.58, z, 0.3, 0.45, 0.7);
    }
    for (let i = 0; i < 2; i++) {
      const uz = wz0 + (wz1 - wz0) * (0.3 + i * 0.4);
      S.shape(CONE, M.fabricAccent, wx1 + 2.1, 2.9, uz, 1.6, 1, 1.6);
      S.shape(POLE, M.metalLight, wx1 + 2.1, 0.1, uz, 0.6, 2.7, 0.6);
    }
  }

  // street lamps (light sources at night)
  const lamps = [];
  const lampXs = [];
  for (let x = fx0 - 6; x <= fx1 + 6; x += Math.max(12, (fx1 - fx0 + 12) / 3)) lampXs.push(x);
  lampXs.slice(0, 4).forEach((x) => {
    S.shape(POLE, M.metalLight, x, 0.15, plot.z1 + 0.8, 1, 6, 1);
    S.box(M.metalLight, x, 6.1, plot.z1 + 1.4, 0.18, 0.12, 1.3);
    S.box(M.lampHead, x, 6.02, plot.z1 + 1.9, 0.32, 0.08, 0.5, 0, false);
    const L = new THREE.PointLight(0xffd29a, 0, 26, 2);
    L.position.set(x, 5.6, plot.z1 + 2);
    L.userData.nightIntensity = 34;
    lamps.push(L);
  });
  // a soft light strip along the entrance canopy
  if (!villa) S.box(M.strip, (fx0 + fx1) / 2, 0.1, plot.z1 - 0.3, fx1 - fx0 - 2, 0.04, 0.08, 0, false);

  /* ---------- groups ---------------------------------------------------- */
  const floors = [];
  for (let i = 0; i < levelKits.length; i++) {
    const g = new THREE.Group();
    g.name = `level-${i}`;
    g.userData = { level: i, label: labels[i] };
    levelKits[i]?.addTo(g);
    building.add(g);
    floors.push(g);
  }
  siteKit.addTo(site);
  root.add(site);

  // tilt the roof solar panels (boxes at the panel height) toward the sun side
  root.traverse((o) => {
    if (!o.isInstancedMesh || o.material !== M.solar) return;
    const mx = new THREE.Matrix4(), p = new THREE.Vector3(), r = new THREE.Quaternion(), s = new THREE.Vector3();
    const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.33, 0, 0));
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, mx); mx.decompose(p, r, s);
      r.multiply(tilt);
      o.setMatrixAt(i, mx.compose(p, r, s));
    }
    o.instanceMatrix.needsUpdate = true;
    o.computeBoundingBox(); o.computeBoundingSphere();
  });

  /* ---------- meta: camera presets fitted to this sketch ---------------- */
  const cx = (plot.x0 + plot.x1) / 2, cz = (plot.z0 + plot.z1 + 8) / 2;
  const span = Math.max(PW, PD + 14, H * 1.35);
  const dist = span * 1.25 + 20;
  const tY = Math.min(H * 0.38, 40);
  const bcx = (bb.x0 + bb.x1) / 2;
  meta = {
    ...BASE_META,
    camera: {
      target: [cx, tY, cz - 4],
      aerial: [cx + dist * 0.62, tY + dist * 0.56, cz + dist * 0.78],
      street: [bcx - (bb.x1 - bb.x0) * 0.55, 1.7, roadZ1 + 2],
      top: [cx, H + span * 1.6 + 30, cz + 0.05],
      front: [cx, Math.max(6, H * 0.45), cz + dist * 1.05],
    },
  };

  /* ---------- animation + dispose ------------------------------------- */
  let t = 0;
  function update(dt) {
    t += dt;
    ripple.offset.set(t * 0.012, t * 0.007);
  }
  function dispose() {
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((x) => x.dispose());
    root.traverse((o) => { if (o.isInstancedMesh) o.dispose?.(); });
  }

  return { root, floors, site, nightMaterials, lamps, update: cfg.pool ? update : null, dispose };
}
