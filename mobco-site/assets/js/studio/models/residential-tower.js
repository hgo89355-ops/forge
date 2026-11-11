/**
 * MOBCO Explore in 3D · model "residential-tower" (Victoria 101, Port Whitby)
 * -----------------------------------------------------------------------------
 * Modelled from the aerial render (assets/img/victoria-101.jpg). Illustrative: level counts and sizes are
 * read from the render, not from drawings.
 *
 * A glass residential tower with white slab edges, stacked rounded balconies and a glazed crown, on a
 * two-storey podium whose white fascia runs along the whole frontage. To the east a mid-rise wing with
 * staggered balconies and a rooftop pool and green roof; to the west a lower glass block with a roof terrace.
 * In front, a parking court with a planted island, a drop-off and a ramp to the garage, all among mature trees.
 *
 * World units are metres, +Z = front (parking court), +X = east, ground y = 0.
 */

import { createKit, makeRng, P } from './_kit.js';

export const meta = {
  id: 'residential-tower',
  name: { en: 'Victoria 101', ar: 'فيكتوريا 101' },
  projectSlug: 'victoria-101',
  tagline: {
    en: 'A glass residential tower and a mid-rise wing with a rooftop pool, set among mature trees.',
    ar: 'برج سكني زجاجي وجناح متوسط الارتفاع بمسبح على السطح، تحيط بهما الأشجار.',
  },
  descriptors: [
    { label: { en: 'Typology', ar: 'النوع' }, value: { en: 'Multi-residential', ar: 'سكني متعدد الوحدات' } },
    { label: { en: 'Massing', ar: 'الكتلة' }, value: { en: 'Tower, mid-rise wing and podium', ar: 'برج وجناح متوسط الارتفاع ومنصّة' } },
    { label: { en: 'Facade', ar: 'الواجهة' }, value: { en: 'Glass with white slab edges and balconies', ar: 'زجاج بحواف بلاطات بيضاء وشرفات' } },
    { label: { en: 'Amenity', ar: 'المرافق' }, value: { en: 'Rooftop pool & green roof', ar: 'مسبح على السطح وسطح أخضر' } },
  ],
  camera: {
    target: [0, 14, -10],
    aerial: [-74, 60, 104],
    street: [-26, 1.7, 30],
    top: [0, 230, -9],
    front: [0, 26, 132],
  },
  hotspots: [
    {
      id: 'tower-balconies', position: [-35, 26, -16],
      title: { en: 'Rounded balconies', ar: 'شرفات مستديرة' },
      text: { en: 'Stacked balconies with glass rails project from the tower and the west block.', ar: 'شرفات متراكبة بدرابزين زجاجي تبرز من البرج والمبنى الغربي.' },
    },
    {
      id: 'tower-crown', position: [-18, 49, -19],
      title: { en: 'Glazed crown', ar: 'التاج الزجاجي' },
      text: { en: 'The top level steps in behind a glass screen that glows after dark.', ar: 'يتراجع الطابق الأخير خلف حاجز زجاجي يضيء بعد الغروب.' },
    },
    {
      id: 'rooftop-pool', position: [12, 22.5, -8],
      title: { en: 'Rooftop pool', ar: 'مسبح على السطح' },
      text: { en: 'A long pool runs along the front edge of the wing roof.', ar: 'مسبح طويل يمتد على الحافة الأمامية لسطح الجناح.' },
    },
    {
      id: 'green-roof', position: [42, 22, -14],
      title: { en: 'Green roof terrace', ar: 'تراس السطح الأخضر' },
      text: { en: 'A planted roof at the east end of the wing.', ar: 'سطح مزروع في الطرف الشرقي للجناح.' },
    },
    {
      id: 'arrival-court', position: [6, 4, 14],
      title: { en: 'Arrival court', ar: 'ساحة الوصول' },
      text: { en: 'A parking court with a planted island and a drive-through under the wing.', ar: 'ساحة مواقف بجزيرة مزروعة وممر للسيارات أسفل الجناح.' },
    },
  ],
  sun: { azimuth: 32, elevation: 42 },
};

/* ------------------------------------------------------------------ layout */
const GH = 6.4;          // podium (ground + mezzanine) height, white fascia at the top
const LH = 3.15;         // typical residential storey
const SLAB = 0.36;
const TOWER = { x0: -32, x1: -6, z0: -32, z1: -9, n: 12 };
const WEST = { x0: -48, x1: -32, z0: -25, z1: -4, n: 4 };
const WING = { x0: -6, x1: 50, z0: -25, z1: -5, n: 4 };
const PODIUM = { x0: -48, x1: 50, z0: -32, z1: -3 };
const DRIVE = { x0: 12, x1: 20 };    // drive-through under the wing
const lvY = (i) => (i === 0 ? 0 : GH + (i - 1) * LH);

export function build(THREE, ctx = {}) {
  const K = createKit(THREE, ctx);
  const { high } = K;
  const root = new THREE.Group(); root.name = 'residential-tower';
  const site = new THREE.Group(); site.name = 'victoria-site';
  const floors = [];
  const unit = K.g(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));

  const M = {
    white: K.std({ name: 'v-white-precast-slab', color: 0xf3f2ee, roughness: 0.45 }),
    fascia: K.std({ name: 'v-white-fascia-panel', color: 0xeeeff0, roughness: 0.32, metalness: 0.15 }),
    wall: K.std({ name: 'v-white-render-wall', color: 0xe8e7e3, roughness: 0.75 }),
    glass: K.glass('v-glazing', 0x6d8ca3, { opacity: 0.5, env: 1.55 }),
    glassDark: K.glass('v-glazing-dark-curtain', 0x6a8294, { opacity: 0.62, env: 1.6 }),
    crown: K.glass('v-glazing-crown-screen', 0xe6eef2, { opacity: 0.62, env: 1.1, roughness: 0.2 }),
    rail: K.glass('v-balustrade-frosted-glass', 0xf1f4f5, { opacity: 0.86, env: 0.9, roughness: 0.28 }),
    railClear: K.glass('v-balustrade-glass', 0xc3d6df, { opacity: 0.3, env: 1.1 }),
    mullion: K.std({ name: 'v-mullion-alu', color: 0xc9ced2, roughness: 0.3, metalness: 0.7 }),
    rooms: K.roomsMaterial('v-rooms-interior', { seed: 101, lit: 0.58, nightMax: 1.7 }),
    lobby: K.interior('v-lobby-interior', 0x8a8378, 0xffd9a8, 1.5),
    roof: K.std({ name: 'v-roof-membrane', color: 0xbdbab3, roughness: 0.92 }),
    deck: K.std({ name: 'v-timber-deck', color: 0xa88d70, roughness: 0.75 }),
    pavers: K.std({ name: 'v-roof-pavers-paving', color: 0xd9d4ca, roughness: 0.8 }),
    coping: K.std({ name: 'v-pool-coping-stone', color: 0xf0eee8, roughness: 0.5 }),
    pool: K.water('v-pool-water', 0x3fb6d0, { emissive: 0x48d8ee, nightMax: 0.9 }),
    green: K.std({ name: 'v-green-roof-sedum', color: 0x6f9550, roughness: 1 }),
    paving: K.std({ name: 'v-paving-concrete', color: 0xcfcac0, roughness: 0.85 }),
    asphalt: K.std({ name: 'v-asphalt-parking', color: 0x4d5257, roughness: 0.9 }),
    marking: K.std({ name: 'v-road-mark-paint', color: 0xf2f2ee, roughness: 0.7 }),
    kerb: K.std({ name: 'v-kerb-precast', color: 0xdedad2, roughness: 0.8 }),
    lawn: K.std({ name: 'v-lawn-grass', color: 0x6f8a4f, roughness: 1 }),
    beds: K.std({ name: 'v-planting-shrub-bed', color: 0x4f6a3b, roughness: 1 }),
    umbrella: K.std({ name: 'v-parasol-fabric', color: 0xf2efe8, roughness: 0.8, side: THREE.DoubleSide }),
    furniture: K.std({ name: 'v-outdoor-furniture', color: 0xdedbd5, roughness: 0.6 }),
    dark: K.std({ name: 'v-metal-dark', color: 0x3a3f44, roughness: 0.5, metalness: 0.5 }),
    stripe: K.lampMat('v-crown-light-strip', 0xfff2dc, 2.4),
  };

  /* ---------------------------------------------------------------- helpers */
  const box = (parent, name, mat, x0, x1, y0, y1, z0, z1, opts = {}) => {
    if (parent.isBatch) { parent.add(unit, mat, K.mat4((x0 + x1) / 2, y0, (z0 + z1) / 2, 0, x1 - x0, y1 - y0, z1 - z0)); return null; }
    const o = K.mesh(name, unit, mat, opts);
    o.position.set((x0 + x1) / 2, y0, (z0 + z1) / 2);
    o.scale.set(x1 - x0, y1 - y0, z1 - z0);
    parent.add(o);
    return o;
  };
  /** Rounded slab outline (plan) as [x, z] points, rect with corner radius r. */
  const rounded = (x0, x1, z0, z1, r, seg = 5) => {
    const pts = [];
    const corner = (cx, cz, a0) => { for (let i = 0; i <= seg; i++) { const a = a0 + (i / seg) * (Math.PI / 2); pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } };
    corner(x1 - r, z1 - r, 0); corner(x0 + r, z1 - r, Math.PI / 2); corner(x0 + r, z0 + r, Math.PI); corner(x1 - r, z0 + r, 1.5 * Math.PI);
    return pts;
  };
  const balconyCache = new Map();
  /** A balcony: rounded white slab + glass rail on the three open sides. dir: outward axis ('+x','-x','+z'). */
  function balcony(parent, cx, cz, y, w, d, dir, round = true) {
    const key = `${w}|${d}|${dir}|${round}`;
    if (!balconyCache.has(key)) {
      // local frame: x along the facade, z outward (0 = facade line)
      const r = round ? Math.min(d * 0.9, w / 2 - 0.1) : 0.35;
      const seg = high ? 6 : 3;
      const out = rounded(-w / 2, w / 2, -0.4, d, r, seg);
      const slab = K.prism(out, -0.32, 0);
      const railPath = [[w / 2, 0], ...out.slice(0, 2 * (seg + 1)), [-w / 2, 0]];
      const rail = K.sweep(railPath, () => [P(0, 0, 1), P(0, 1.05, 1)], { openProfile: true });
      const rail2 = K.sweep(railPath, () => [P(0, 1.05, 1), P(0, 0, 1)], { openProfile: true });
      const cap = K.sweep(railPath, () => [P(-0.04, 1.02, 1), P(0.04, 1.02, 1), P(0.04, 1.08, 1), P(-0.04, 1.08, 1)], {});
      balconyCache.set(key, { slab, rail, rail2, cap });
    }
    const b = balconyCache.get(key);
    if (parent.isBatch) {
      const ry = dir === '+x' ? Math.PI / 2 : dir === '-x' ? -Math.PI / 2 : dir === '-z' ? Math.PI : 0;
      const mx = K.mat4(cx, y, cz, ry);
      parent.add(b.slab, M.white, mx); parent.add(b.rail, M.rail, mx); parent.add(b.rail2, M.rail, mx); parent.add(b.cap, M.mullion, mx);
      return null;
    }
    const gp = new THREE.Group();
    gp.position.set(cx, y, cz);
    gp.rotation.y = dir === '+x' ? Math.PI / 2 : dir === '-x' ? -Math.PI / 2 : dir === '-z' ? Math.PI : 0;
    gp.add(K.mesh('balcony-slab', b.slab, M.white), K.mesh('balcony-rail', b.rail, M.rail, { cast: false }), K.mesh('balcony-rail-in', b.rail2, M.rail, { cast: false }), K.mesh('balcony-rail-cap', b.cap, M.mullion, { cast: false }));
    parent.add(gp);
    return gp;
  }
  /**
   * One storey of a glazed block: slab with a white edge, glass skin, rooms behind, mullions.
   * skip: list of faces without glass ('front' / 'back' / 'east' / 'west'). solid: faces with a white wall.
   */
  function storey(parent, b, level, y, h, { inset = 0, slabOut = 0.35, skip = [], solid = [], dark = null, mullStep = 1.6, shift = 0 } = {}) {
    const x0 = b.x0 + inset, x1 = b.x1 - inset, z0 = b.z0 + inset, z1 = b.z1 - inset;
    box(parent, 'slab', M.white, x0 - slabOut, x1 + slabOut, y, y + SLAB, z0 - slabOut, z1 + slabOut);
    const gy0 = y + SLAB, gy1 = y + h;
    const roomGeo = K.roomBox(x1 - x0 - 2.4, h - SLAB - 0.05, z1 - z0 - 2.4, level, 3.2, shift);
    if (parent.isBatch) parent.add(roomGeo, M.rooms, K.mat4((x0 + x1) / 2, gy0, (z0 + z1) / 2));
    else { const rooms = K.mesh('rooms', roomGeo, M.rooms, { cast: false }); rooms.position.set((x0 + x1) / 2, gy0, (z0 + z1) / 2); parent.add(rooms); }
    const faces = {
      front: [x0, x1, z1 - 0.12, z1], back: [x0, x1, z0, z0 + 0.12], west: [x0, x0 + 0.12, z0, z1], east: [x1 - 0.12, x1, z0, z1],
    };
    const ms = [];
    for (const [f, [a0, a1, c0, c1]] of Object.entries(faces)) {
      if (skip.includes(f)) continue;
      if (solid.includes(f)) { box(parent, `wall-${f}`, M.wall, a0, a1, gy0, gy1, c0, c1); continue; }
      const mat = dark && dark.face === f ? null : M.glass;
      if (dark && dark.face === f) {
        // split: dark curtain-wall part and clear part
        if (f === 'front' || f === 'back') {
          box(parent, 'glass-dark', M.glassDark, a0, dark.to, gy0, gy1, c0, c1, { cast: false });
          box(parent, 'glass', M.glass, dark.to, a1, gy0, gy1, c0, c1, { cast: false });
        }
      } else box(parent, 'glass', mat, a0, a1, gy0, gy1, c0, c1, { cast: false });
      const horiz = f === 'front' || f === 'back';
      const len = horiz ? a1 - a0 : c1 - c0;
      const n = Math.max(1, Math.round(len / mullStep));
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const x = horiz ? a0 + (a1 - a0) * t : (a0 + a1) / 2 + (f === 'east' ? 0.05 : -0.05);
        const z = horiz ? (c0 + c1) / 2 + (f === 'front' ? 0.05 : -0.05) : c0 + (c1 - c0) * t;
        ms.push(K.mat4(x, gy0, z, 0, 0.07, h - SLAB, 0.07));
      }
    }
    if (ms.length) (parent.group || parent).add(K.inst('mullions', unit, M.mullion, ms, { cast: false }));
  }
  const batches = [];
  const floorG = (id, level, en, ar, y = 0) => {
    const g = K.floorGroup(root, id, level, en, ar, y); floors.push(g);
    const b = K.batcher(g, `${id}-L${level}`); batches.push(b);
    // inst / mesh helpers still add to the real group
    return new Proxy(b, { get: (t, k) => (k in t ? t[k] : typeof g[k] === 'function' ? g[k].bind(g) : g[k]) });
  };
  const label = (bEn, bAr, i) => (i === 0 ? [`${bEn} · ground level`, `${bAr} · الطابق الأرضي`] : [`${bEn} · level ${i}`, `${bAr} · الطابق ${i}`]);

  /* ================================================================ PODIUM (ground level, shared) */
  {
    const f = floorG('podium', 0, 'Podium · ground level', 'المنصّة · الطابق الأرضي');
    const P0 = PODIUM;
    // lobby / amenity volume behind recessed glazing (set back under the fascia)
    const gz = P0.z1 - 1.6;
    box(f, 'podium-lobby', M.lobby, P0.x0 + 1.5, DRIVE.x0, 0, GH - 1.6, P0.z0 + 2, gz - 1.2, { cast: false });
    box(f, 'podium-lobby-east', M.lobby, DRIVE.x1, P0.x1 - 1.5, 0, GH - 1.6, P0.z0 + 6, gz - 1.2, { cast: false });
    box(f, 'podium-glass', M.glass, P0.x0 + 0.6, DRIVE.x0, 0, GH - 1.4, gz - 0.12, gz, { cast: false });
    box(f, 'podium-glass-east', M.glass, DRIVE.x1, P0.x1 - 0.6, 0, GH - 1.4, gz - 0.12, gz, { cast: false });
    box(f, 'podium-glass-west', M.glass, P0.x0 + 0.6, P0.x0 + 0.72, 0, GH - 1.4, P0.z0 + 4, gz, { cast: false });
    const ms = [];
    for (let x = P0.x0 + 1; x < P0.x1; x += 2.4) { if (x > DRIVE.x0 && x < DRIVE.x1) continue; ms.push(K.mat4(x, 0, gz + 0.06, 0, 0.1, GH - 1.4, 0.1)); }
    f.add(K.inst('podium-mullions', unit, M.mullion, ms, { cast: false }));
    // drive-through: walls, soffit
    box(f, 'drive-wall-w', M.wall, DRIVE.x0 - 0.4, DRIVE.x0, 0, GH - 1.4, P0.z0 + 4, gz, {});
    box(f, 'drive-wall-e', M.wall, DRIVE.x1, DRIVE.x1 + 0.4, 0, GH - 1.4, P0.z0 + 4, gz, {});
    box(f, 'drive-back', M.dark, DRIVE.x0, DRIVE.x1, 0, GH - 1.4, P0.z0 + 4, P0.z0 + 4.3, {});
    // white fascia band all along the frontage + west return, slab over the ground floor
    box(f, 'fascia-front', M.fascia, P0.x0 - 0.5, P0.x1 + 0.5, GH - 2.0, GH + 0.2, P0.z1 - 0.2, P0.z1 + 0.8);
    box(f, 'fascia-west', M.fascia, P0.x0 - 0.7, P0.x0 + 0.3, GH - 2.0, GH + 0.2, P0.z0 + 3, P0.z1 + 0.8);
    box(f, 'fascia-east', M.fascia, P0.x1 - 0.3, P0.x1 + 0.7, GH - 2.0, GH + 0.2, P0.z0 + 5, P0.z1 + 0.8);
    box(f, 'podium-soffit', M.white, P0.x0, P0.x1, GH - 1.65, GH - 1.55, gz, P0.z1 + 0.2, { cast: false });
    box(f, 'podium-core', M.wall, P0.x0 + 0.3, P0.x1 - 0.3, GH - 1.6, GH, P0.z0, P0.z1 - 0.2, { cast: false });
    // light line under the fascia
    box(f, 'fascia-light', M.stripe, P0.x0, P0.x1, GH - 1.68, GH - 1.62, P0.z1 + 0.1, P0.z1 + 0.4, { cast: false });
    // entrance canopy at the tower
    box(f, 'entrance-canopy', M.fascia, -28, -14, GH - 2.2, GH - 1.9, P0.z1, P0.z1 + 3.4);
  }

  /* ================================================================ TOWER */
  {
    const T = TOWER;
    for (let i = 1; i <= T.n; i++) {
      const [en, ar] = label('Tower', 'البرج', i);
      const f = floorG('tower', i, en, ar, lvY(i));
      const top = i >= T.n - 1;
      const b = top ? { x0: T.x0 + 2.4, x1: T.x1, z0: T.z0, z1: T.z1 } : T;
      storey(f, b, i, 0, LH, { dark: { face: 'front', to: -20.5 }, shift: 3 });
      // dark curtain strip: flush glass over the slab edges on the front-left (as in the render)
      if (!top) box(f, 'curtain-over-slab', M.glassDark, T.x0 - 0.38, -20.5, 0, SLAB + 0.02, T.z1 + 0.35, T.z1 + 0.42, { cast: false });
      // rounded balconies: west face (two stacks), east face above the wing roof
      if (!top && i > WEST.n) {
        balcony(f, T.x0, -14.5, SLAB, 6.4, 2.1, '-x');
        if (i % 2 === 0 || i > 6) balcony(f, T.x0, -26, SLAB, 5.2, 1.9, '-x');
      } else if (!top) balcony(f, T.x0, -28.5, SLAB, 4.4, 1.8, '-x'); else balcony(f, b.x0, -14.5, SLAB, 6.4, 1.6, '-x', false);
      if (i > 5) balcony(f, T.x1, -14, SLAB, 5.6, 2.0, '+x');
      if (i > 5 && i % 2 === 1) balcony(f, T.x1, -26, SLAB, 4.6, 1.8, '+x');
    }
    // crown: glazed screen with fins and a white cap
    const cy = lvY(T.n + 1);
    const f = floorG('tower', T.n + 1, 'Tower · crown and roof terrace', 'البرج · التاج وتراس السطح', cy);
    const x0 = T.x0 + 2.6, x1 = T.x1 - 0.4, z0 = T.z0 + 0.4, z1 = T.z1 - 0.4;
    box(f, 'crown-slab', M.white, T.x0 + 2.0, T.x1 + 0.35, 0, SLAB, T.z0 - 0.35, T.z1 + 0.35);
    box(f, 'crown-rooms', M.lobby, x0 + 1, x1 - 1, SLAB, 3.9, z0 + 1, z1 - 1, { cast: false });
    for (const [a0, a1, c0, c1] of [[x0, x1, z1 - 0.1, z1], [x0, x1, z0, z0 + 0.1], [x0, x0 + 0.1, z0, z1], [x1 - 0.1, x1, z0, z1]]) box(f, 'crown-screen', M.crown, a0, a1, SLAB, 5.2, c0, c1, { cast: false });
    const fins = [];
    for (let x = x0; x <= x1 + 0.01; x += 1.2) { fins.push(K.mat4(x, SLAB, z1 + 0.15, 0, 0.12, 4.9, 0.4)); fins.push(K.mat4(x, SLAB, z0 - 0.15, 0, 0.12, 4.9, 0.4)); }
    for (let z = z0; z <= z1 + 0.01; z += 1.2) { fins.push(K.mat4(x0 - 0.15, SLAB, z, 0, 0.4, 4.9, 0.12)); fins.push(K.mat4(x1 + 0.15, SLAB, z, 0, 0.4, 4.9, 0.12)); }
    f.add(K.inst('crown-fins', unit, M.fascia, fins, { cast: false }));
    box(f, 'crown-roof', M.roof, x0, x1, 3.9, 4.1, z0, z1);
    for (const [a0, a1, c0, c1] of [[x0 - 0.3, x1 + 0.3, z1 - 0.3, z1 + 0.3], [x0 - 0.3, x1 + 0.3, z0 - 0.3, z0 + 0.3], [x0 - 0.3, x0 + 0.3, z0, z1], [x1 - 0.3, x1 + 0.3, z0, z1]]) box(f, 'crown-cap', M.white, a0, a1, 5.2, 5.45, c0, c1);
    box(f, 'roof-plant', M.wall, -24, -16, 4.1, 6.0, -26, -20);
    box(f, 'roof-plant-2', M.dark, -13, -9, 4.1, 5.2, -27, -23);
    box(f, 'crown-light', M.stripe, x0 - 0.42, x1 + 0.42, 5.12, 5.2, z0 - 0.42, z1 + 0.42, { cast: false });
    // terrace rail on the set-back west strip
    box(f, 'terrace-rail', M.railClear, T.x0 + 2.0, T.x0 + 2.1, SLAB, SLAB + 1.1, T.z0, T.z1, { cast: false });
  }

  /* ================================================================ WEST BLOCK */
  {
    const B = WEST;
    for (let i = 1; i <= B.n; i++) {
      const [en, ar] = label('West block', 'المبنى الغربي', i);
      const f = floorG('west', i, en, ar, lvY(i));
      storey(f, B, i, 0, LH, { skip: ['east'], shift: 11 });
      balcony(f, B.x0, -18.5, SLAB, 5.6, 2.0, '-x');
      balcony(f, B.x0, -8.5, SLAB, 4.8, 1.8, '-x');
      balcony(f, -38.5, B.z1, SLAB, 6.2, 1.8, '+z');
    }
    const f = floorG('west', B.n + 1, 'West block · roof terrace', 'المبنى الغربي · تراس السطح', lvY(B.n + 1));
    box(f, 'west-roof-slab', M.white, B.x0 - 0.35, B.x1, 0, SLAB + 0.2, B.z0 - 0.35, B.z1 + 0.35);
    box(f, 'west-roof-deck', M.pavers, B.x0 + 0.6, B.x1 - 0.6, SLAB + 0.2, SLAB + 0.3, B.z0 + 0.6, B.z1 - 0.6, { cast: false });
    for (const [a0, a1, c0, c1] of [[B.x0 - 0.3, B.x1, B.z1 + 0.2, B.z1 + 0.3], [B.x0 - 0.3, B.x0 - 0.2, B.z0, B.z1 + 0.3], [B.x0 - 0.3, B.x1, B.z0 - 0.3, B.z0 - 0.2]]) box(f, 'west-roof-rail', M.railClear, a0, a1, SLAB + 0.2, SLAB + 1.3, c0, c1, { cast: false });
    // parasols, tables and planters on the terrace
    const pole = [], cano = [], tables = [];
    [[-43, -9], [-37, -7.5], [-41, -16], [-35, -14]].forEach(([x, z]) => {
      pole.push(K.mat4(x, SLAB + 0.3, z, 0, 0.06, 2.4, 0.06));
      cano.push(K.mat4(x, SLAB + 2.4, z, 0, 1, 1, 1));
      tables.push(K.mat4(x, SLAB + 0.3, z, 0, 1.2, 0.75, 1.2));
    });
    const canopy = K.g(new THREE.ConeGeometry(1.5, 0.5, 8, 1, true));
    f.add(K.inst('terrace-parasol-poles', unit, M.dark, pole), K.inst('terrace-parasols', canopy, M.umbrella, cano), K.inst('terrace-tables', unit, M.furniture, tables));
    K.shrubs(f, [[-46, -23, 1.3], [-46, -20, 1.2], [-44, -23.5, 1.2], [-32, -23.5, 1.1], [-46, -5, 1.2]], { y: SLAB + 0.3, name: 'terrace-planting' });
  }

  /* ================================================================ WING */
  {
    const B = WING;
    const rnd = makeRng(9);
    for (let i = 1; i <= B.n; i++) {
      const [en, ar] = label('Wing', 'الجناح', i);
      const f = floorG('wing', i, en, ar, lvY(i));
      storey(f, B, i, 0, LH, { skip: ['west'], solid: ['east'], shift: 21 });
      // staggered rectangular balconies on the front, a few on the back
      for (let k = 0; k < 9; k++) {
        const x = B.x0 + 4 + k * 5.6 + (i % 2 ? 1.6 : -0.4);
        if (x > B.x1 - 4) continue;
        if (rnd() < 0.15) continue;
        balcony(f, x, B.z1, SLAB, 3.2, 1.6, '+z', false);
      }
      balcony(f, B.x0 + 2.5, B.z1 - 6, SLAB, 4.4, 1.6, '-x', true);
    }
    const f = floorG('wing', B.n + 1, 'Wing · roof: pool and green roof', 'الجناح · السطح: المسبح والسطح الأخضر', lvY(B.n + 1));
    box(f, 'wing-roof-slab', M.roof, B.x0, B.x1 + 0.35, 0, SLAB + 0.25, B.z0 - 0.35, B.z1 + 0.35);
    box(f, 'wing-parapet-front', M.railClear, B.x0, B.x1, SLAB + 0.25, SLAB + 1.35, B.z1 + 0.25, B.z1 + 0.35, { cast: false });
    box(f, 'wing-parapet-back', M.railClear, B.x0, B.x1, SLAB + 0.25, SLAB + 1.35, B.z0 - 0.35, B.z0 - 0.25, { cast: false });
    box(f, 'wing-east-cap', M.fascia, B.x1 - 0.2, B.x1 + 0.6, -lvY(B.n + 1) + GH, SLAB + 1.4, B.z0 - 0.6, B.z1 + 0.6);
    // pool along the front edge (raised basin, glass edge), timber deck behind
    const py = SLAB + 0.25;
    box(f, 'pool-basin', M.coping, -3, 31, py, py + 1.2, -11.5, B.z1 - 0.2);
    box(f, 'pool-water', M.pool, -2.4, 30.4, py + 1.2, py + 1.22, -10.9, B.z1 - 0.6, { cast: false });
    box(f, 'roof-deck', M.deck, -4, 32, py, py + 0.12, B.z0 + 1, -11.5, { cast: false });
    box(f, 'green-roof', M.green, 33, B.x1 - 1.2, py, py + 0.35, B.z0 + 1, B.z1 - 1);
    K.shrubs(f, [[35, -22, 1.6], [38, -6.6, 1.5], [46, -21, 1.8], [47, -8, 1.4], [40, -16, 1.3], [44, -12, 1.2]], { y: py + 0.3, name: 'green-roof-shrubs' });
    K.trees(f, [[34.5, -8, 5.5, 0.8], [45.5, -21.5, 5, 0.8]], { seed: 3, name: 'green-roof-trees' }).forEach((o) => o.position.y = py);
    // amenity pavilion and stair cores
    box(f, 'roof-pavilion', M.glass, 20, 30, py, py + 3.4, -23.5, -15, { cast: false });
    box(f, 'roof-pavilion-room', M.lobby, 20.5, 29.5, py, py + 3.2, -23, -15.5, { cast: false });
    box(f, 'roof-pavilion-roof', M.white, 19.6, 30.4, py + 3.4, py + 3.7, -24, -14.6);
    box(f, 'roof-core', M.wall, 2, 7, py, py + 3.2, -24, -18.5);
    // loungers and parasols on the deck
    const loung = [], pole = [], cano = [];
    for (let x = -1; x < 30; x += 3.2) loung.push(K.mat4(x, py + 0.12, -13.4, 0, 0.8, 0.4, 2));
    [[2, -17], [10, -17], [16, -21], [13, -14.5]].forEach(([x, z]) => { pole.push(K.mat4(x, py + 0.12, z, 0, 0.06, 2.4, 0.06)); cano.push(K.mat4(x, py + 2.4, z, 0, 1.1, 1, 1.1)); });
    const canopy = K.g(new THREE.ConeGeometry(1.5, 0.5, 8, 1, true));
    f.add(K.inst('deck-loungers', unit, M.furniture, loung), K.inst('deck-parasol-poles', unit, M.dark, pole), K.inst('deck-parasols', canopy, M.umbrella, cano));
  }

  /* ================================================================ SITE */
  {
    const S = { x0: -160, x1: 160, z0: -150, z1: 150 };
    site.add(K.mesh('site-lawn-grass', K.flat([[S.x0, S.z0], [S.x1, S.z0], [S.x1, S.z1], [S.x0, S.z1]], 0.1), M.lawn, { cast: false }));
    // paving around the building, sidewalk in front of the podium
    site.add(K.mesh('podium-paving', K.flat([[-52, -36], [55, -36], [55, -1], [-52, -1]], 0.18), M.paving, { cast: false }));
    // parking court
    const court = [[-44, -1], [40, -1], [40, 34], [-44, 34]];
    site.add(K.mesh('parking-asphalt', K.flat(court, 0.2), M.asphalt, { cast: false }));
    // ramp down to the garage (east), with white walls
    site.add(K.mesh('ramp-asphalt', K.flat([[40, 4], [47, 4], [47, 34], [40, 34]], 0.2), M.asphalt, { cast: false }));
    box(site, 'ramp-wall-w', M.wall, 39.6, 40, 0, 1.1, 8, 34);
    box(site, 'ramp-wall-e', M.wall, 47, 47.4, 0, 1.1, 4, 34);
    box(site, 'ramp-mouth', M.dark, 40, 47, 0.2, 2.6, 3.6, 4);
    // stall markings
    const lines = [];
    for (let x = -42; x <= 4; x += 2.7) { lines.push(K.mat4(x, 0.21, 6.5, 0, 0.12, 0.02, 5)); lines.push(K.mat4(x, 0.21, 28, 0, 0.12, 0.02, 5)); }
    for (let x = 24; x <= 38; x += 2.7) lines.push(K.mat4(x, 0.21, 28, 0, 0.12, 0.02, 5));
    lines.push(K.mat4(-19, 0.21, 9, Math.PI / 2, 0.12, 0.02, 46), K.mat4(-19, 0.21, 25.5, Math.PI / 2, 0.12, 0.02, 46));
    site.add(K.inst('parking-stall-lines', unit, M.marking, lines, { cast: false }));
    // planted island with trees and a lamp, drop-off kerb island
    const isl = K.arc(12, 16, 9, 4.5, 0, Math.PI * 2, 28).slice(0, -1);
    site.add(K.mesh('island-kerb', K.prism(isl, 0, 0.35), M.kerb));
    site.add(K.mesh('island-planting-shrub-bed', K.flat(K.arc(12, 16, 8.3, 3.8, 0, Math.PI * 2, 28).slice(0, -1), 0.37), M.beds, { cast: false }));
    const drop = K.arc(30, 14, 5, 2.2, 0, Math.PI * 2, 20).slice(0, -1);
    site.add(K.mesh('dropoff-kerb', K.prism(drop, 0, 0.3), M.kerb));
    site.add(K.mesh('dropoff-lawn-grass', K.flat(K.arc(30, 14, 4.4, 1.7, 0, Math.PI * 2, 20).slice(0, -1), 0.32), M.lawn, { cast: false }));
    // access road to the west, street to the south
    site.add(K.mesh('street-west-asphalt', K.flat([[-70, S.z0], [-58, S.z0], [-58, S.z1], [-70, S.z1]], 0.2), M.asphalt, { cast: false }));
    site.add(K.mesh('street-south-asphalt', K.flat([[-70, 50], [S.x1, 50], [S.x1, 60], [-70, 60]], 0.2), M.asphalt, { cast: false }));
    site.add(K.mesh('access-asphalt', K.flat([[-58, 18], [-44, 18], [-44, 26], [-58, 26]], 0.2), M.asphalt, { cast: false }));
    site.add(K.mesh('sidewalk-west', K.flat([[-58, S.z0], [-55, S.z0], [-55, S.z1], [-58, S.z1]], 0.3), M.kerb, { cast: false }));
    const dashes = [];
    for (let z = S.z0 + 3; z < S.z1; z += 8) dashes.push(K.mat4(-64, 0.22, z, 0, 0.15, 0.02, 3));
    for (let x = -66; x < S.x1; x += 8) dashes.push(K.mat4(x, 0.22, 55, Math.PI / 2, 0.15, 0.02, 3));
    site.add(K.inst('street-dashes', unit, M.marking, dashes, { cast: false }));
    // hedges along the court
    const hedge = [];
    for (let x = -44; x < 40; x += 2.2) hedge.push([x, 36, 1.3]);
    for (let z = 0; z < 34; z += 2.2) hedge.push([-46, z, 1.2]);
    K.shrubs(site, hedge, { seed: 5, name: 'court-hedge', color: 0x4d6b3c });
    // mature trees all around (dense, as in the render)
    const rnd = makeRng(707);
    const trees = [];
    let tries = 0;
    while (trees.length < (high ? 420 : 160) && tries < 12000) {
      tries++;
      const x = S.x0 + rnd() * (S.x1 - S.x0), z = S.z0 + rnd() * (S.z1 - S.z0);
      if (x > -56 && x < 58 && z > -40 && z < 40) continue;          // buildings + court
      if (x > -72 && x < -54) continue;                             // west street
      if (z > 47 && z < 63 && x > -72) continue;                    // south street
      trees.push([x, z, 11 + rnd() * 7, 1 + rnd() * 0.4]);
    }
    for (let x = -40; x < 38; x += 9) trees.push([x + rnd() * 3, 41 + rnd() * 3, 9 + rnd() * 4, 1]);
    trees.push([4, 16, 7, 0.8], [18, 15.5, 6.5, 0.8], [-50, 12, 10, 1], [-50, 30, 11, 1]);
    K.trees(site, trees, { seed: 11, name: 'site-trees', palette: [0x4c6a3a, 0x5a7a42, 0x3f5c33, 0x67844a, 0x52703f] });
    // woodland beyond the site: large low canopy masses (cheap stand-ins for distant trees)
    const far2 = [];
    for (let i = 0; i < (high ? 170 : 60); i++) {
      const a = rnd() * Math.PI * 2, r = 165 + rnd() * 60;
      far2.push([Math.sin(a) * r, Math.cos(a) * r, 12 + rnd() * 5, 1.2 + rnd() * 0.4]);
    }
    K.trees(site, far2, { seed: 19, name: 'woodland', palette: [0x3f5a33, 0x4a663a, 0x56723f] });
    site.add(K.mesh('woodland-ground-meadow-grass', K.flat([[-230, -230], [230, -230], [230, 230], [-230, 230]], 0.04), M.lawn, { cast: false }));
    // a few distant buildings (the render shows low industrial blocks beyond the trees)
    const far = [];
    [[-100, -100, 30, 7, 16], [70, -104, 40, 8, 14], [100, -60, 22, 6, 18]].forEach(([x, z, w, h, d]) => far.push(K.mat4(x, 0, z, 0, w, h, d)));
    site.add(K.inst('context-blocks', unit, M.wall, far));
    // cars
    const cars = [];
    [[-40.6, 6.5], [-35.2, 6.5], [-24.4, 6.5], [-13.6, 6.5], [-2.8, 6.5], [-29.8, 28], [-19, 28], [-5.5, 28], [26.7, 28], [32.1, 28]].forEach(([x, z]) => cars.push([x + 1.35, z, 0]));
    cars.push([-64, -40, Math.PI], [-62, 20, 0], [-66, 70, Math.PI], [10, 53, Math.PI / 2], [60, 57, -Math.PI / 2], [24, 12, 1.2]);
    K.cars(site, cars, { name: 'v-cars' });
    // lamps in the court
    const heads = K.lampPosts(site, [[-30, 17.5, 0], [-6, 17.5, 0], [12, 16, 0], [34, 22, 0], [-44, 3, 0]], { h: 6.5, name: 'court-lamps', arm: false });
    heads.slice(0, 4).forEach(([x, y, z], i) => K.light(site, `court-light-${i}`, x, y, z, 70, 26));
    K.light(site, 'lobby-light', -20, 3, 2, 60, 22);
    K.light(site, 'drive-light', 16, 3.5, -8, 50, 18);
    K.light(site, 'pool-light', 14, lvY(WING.n + 1) + 2, -9, 60, 26, 0xbfeaff);
  }

  batches.forEach((b) => b.flush());
  floors.sort((a, b) => a.userData.level - b.userData.level);
  root.add(site);
  return {
    root, floors, site,
    nightMaterials: K.nightMaterials,
    lamps: K.lamps,
    update(dt, t) {
      const n = K.waterNormal();
      if (n) { n.offset.x = (t * 0.02) % 1; n.offset.y = (t * 0.013) % 1; }
    },
    dispose() { K.dispose(); root.removeFromParent(); },
  };
}
