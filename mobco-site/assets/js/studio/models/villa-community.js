/**
 * MOBCO Explore in 3D · model: "villa-community" (Lagoon Villa Community)
 * -------------------------------------------------------------------------
 * Modelled from the aerial renders (assets/img/aerial-compound.jpg and aerial-compound-portrait.jpg).
 * Illustrative: the layout follows the renders, sizes are estimated.
 *
 * White, cubic two-storey villas with deep white window frames, roof terraces with pergolas and private
 * pools, set in dense planting around free-form lagoon pools with sandy decks. A curving street runs along
 * the east edge, with an open park of scattered trees beyond it; a commercial block with a glazed shopfront
 * and café terrace closes the south-west corner.
 *
 * World units are metres, +z = south (front), +x = east, ground y = 0.
 */

import { createKit, makeRng, P } from './_kit.js';

export const meta = {
  id: 'villa-community',
  name: { en: 'Lagoon Villa Community', ar: 'مجتمع فلل البحيرات' },
  projectSlug: 'lagoon-villa-community',
  tagline: {
    en: 'White villas with private pools and roof terraces, set in gardens around lagoon pools.',
    ar: 'فلل بيضاء بمسابح خاصة وأسطح مفتوحة، وسط حدائق حول بحيرات اصطناعية.',
  },
  descriptors: [
    { label: { en: 'Typology', ar: 'النمط' }, value: { en: 'Villa community', ar: 'مجتمع فلل' } },
    { label: { en: 'Massing', ar: 'الكتلة' }, value: { en: 'Two-storey villas with roof terraces', ar: 'فلل من طابقين مع أسطح مفتوحة' } },
    { label: { en: 'Landscape', ar: 'تنسيق الموقع' }, value: { en: 'Lagoon pools in dense planting', ar: 'بحيرات اصطناعية وسط تشجير كثيف' } },
    { label: { en: 'Amenities', ar: 'المرافق' }, value: { en: 'Shops and café by the entrance', ar: 'متاجر ومقهى عند المدخل' } },
  ],
  camera: {
    target: [-10, 2, -20],
    aerial: [70, 120, 150],
    street: [50, 1.7, 30],
    top: [-10, 300, -19.9],
    front: [-10, 45, 175],
  },
  hotspots: [
    {
      id: 'lagoons', position: [-8, 3, -18],
      title: { en: 'Lagoon pools', ar: 'البحيرات الاصطناعية' },
      text: { en: 'Free-form pools with sandy decks sit in the gardens between the villas.', ar: 'مسابح حرّة التشكيل بأرصفة رملية وسط الحدائق بين الفلل.' },
    },
    {
      id: 'villas', position: [34, 11, -21],
      title: { en: 'Villas', ar: 'الفلل' },
      text: { en: 'Two-storey white villas with deep window frames, roof terraces and private pools.', ar: 'فلل بيضاء من طابقين بإطارات نوافذ عميقة وأسطح مفتوحة ومسابح خاصة.' },
    },
    {
      id: 'street', position: [56, 3, -60],
      title: { en: 'Tree-lined street', ar: 'الشارع المشجّر' },
      text: { en: 'A curving street runs along the east edge, lined with trees.', ar: 'شارع منحنٍ يمتد على الحافة الشرقية تحفّه الأشجار.' },
    },
    {
      id: 'park', position: [140, 3, -30],
      title: { en: 'Open park', ar: 'الحديقة المفتوحة' },
      text: { en: 'Beyond the street, open lawns with scattered trees.', ar: 'خلف الشارع، مسطّحات خضراء مفتوحة تتناثر فيها الأشجار.' },
    },
    {
      id: 'commercial', position: [-40, 12, 62],
      title: { en: 'Shops and café', ar: 'المتاجر والمقهى' },
      text: { en: 'A low commercial block with a glazed shopfront and a café terrace.', ar: 'مبنى تجاري منخفض بواجهة زجاجية وتراس مقهى.' },
    },
  ],
  sun: { azimuth: -38, elevation: 44 },
};

/* ------------------------------------------------------------------ layout */
const STREET = [[66, -175], [61, -120], [55, -70], [52, -20], [55, 30], [52, 72], [36, 92], [0, 98], [-60, 99], [-150, 100]];
const WEST_ROAD = [[-112, 100], [-104, 40], [-110, -40], [-130, -175]];
const LAGOONS = [
  { id: 'lagoon-central', cx: -8, cz: -18, s: 1.0, seed: 2, ctrl: [[-24, -22], [-14, -33], [4, -31], [10, -20], [4, -10], [-6, -12], [-14, -2], [-24, -8]] },
  { id: 'lagoon-north', cx: 20, cz: -110, s: 1.0, seed: 5, ctrl: [[8, -130], [20, -128], [30, -118], [28, -104], [34, -92], [26, -86], [16, -96], [12, -110]] },
  { id: 'lagoon-west', cx: -70, cz: -118, s: 1.0, seed: 8, ctrl: [[-86, -122], [-76, -132], [-60, -130], [-52, -120], [-60, -110], [-74, -112], [-82, -106]] },
];

export function build(THREE, ctx = {}) {
  const K = createKit(THREE, ctx);
  const { high } = K;
  const root = new THREE.Group(); root.name = 'villa-community';
  const site = new THREE.Group(); site.name = 'villa-site';
  const unit = K.g(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
  const floors = [];
  const floorG = (id, level, en, ar) => { const f = K.floorGroup(root, id, level, en, ar); floors.push(f); return f; };

  const M = {
    render: K.std({ name: 'villa-white-render', color: 0xf5f3ee, roughness: 0.82 }),
    renderWarm: K.std({ name: 'villa-render-wall-warm', color: 0xece6dc, roughness: 0.85 }),
    win: K.std({ name: 'villa-window-glazing-lit', color: 0x27323a, roughness: 0.06, metalness: 0.55, envMap: ctx.envMap || null, envMapIntensity: 1.3, emissive: 0xffcf96, emissiveIntensity: 0 }),
    winDark: K.std({ name: 'villa-window-glazing', color: 0x2a343b, roughness: 0.06, metalness: 0.55, envMap: ctx.envMap || null, envMapIntensity: 1.3 }),
    rail: K.glass('villa-balustrade-glass', 0xc7d8df, { opacity: 0.3, env: 1 }),
    metal: K.std({ name: 'villa-pergola-metal', color: 0x3b3e42, roughness: 0.45, metalness: 0.5 }),
    deck: K.std({ name: 'villa-timber-deck', color: 0xa07e5c, roughness: 0.75 }),
    coping: K.std({ name: 'villa-pool-coping-paving', color: 0xe8e3d8, roughness: 0.7 }),
    pool: K.water('villa-pool-water', 0x2f9fbf, { emissive: 0x3ed0e6, nightMax: 0.8 }),
    lagoon: K.water('lagoon-water', 0x45a9c4, { emissive: 0x3ec6dc, nightMax: 0.5 }),
    sand: K.std({ name: 'lagoon-sand-deck', color: 0xd9c8a8, roughness: 0.95 }),
    garden: K.std({ name: 'garden-lawn-grass', color: 0x6f8c4a, roughness: 1 }),
    park: K.std({ name: 'park-meadow-grass', color: 0x95a552, roughness: 1 }),
    paving: K.std({ name: 'villa-paving-driveway', color: 0xd8d2c6, roughness: 0.85 }),
    asphalt: K.std({ name: 'villa-asphalt-road', color: 0x464b52, roughness: 0.9 }),
    kerb: K.std({ name: 'villa-kerb-paving', color: 0xd3cec4, roughness: 0.85 }),
    marking: K.std({ name: 'villa-road-mark', color: 0xf0f0ea, roughness: 0.7 }),
    shopGlass: K.std({ name: 'shop-window-glazing-lit', color: 0x1f272d, roughness: 0.05, metalness: 0.6, envMap: ctx.envMap || null, envMapIntensity: 1.4, emissive: 0xffd7a6, emissiveIntensity: 0 }),
    sign: K.lampMat('shop-sign-light', 0xffffff, 1.6),
    umbrella: K.std({ name: 'cafe-parasol-fabric', color: 0xf1ede4, roughness: 0.8, side: THREE.DoubleSide }),
    furniture: K.std({ name: 'cafe-furniture-timber', color: 0x8a6d50, roughness: 0.7 }),
    roof: K.std({ name: 'commercial-roof-membrane', color: 0xe9e7e2, roughness: 0.9 }),
  };
  M.win.userData.__nightMax = 0.85; K.nightMaterials.push(M.win);
  M.shopGlass.userData.__nightMax = 1.1; K.nightMaterials.push(M.shopGlass);
  M.win.userData.realism = 'plain'; M.winDark.userData.realism = 'plain'; M.shopGlass.userData.realism = 'plain';

  /* ================================================================ VILLA TEMPLATES */
  // local frame: +z = garden / pool side, -z = street / entrance side; x across the plot
  function template() {
    const parts = [new Map(), new Map(), new Map()];
    const b = (lv, mat, x0, x1, y0, y1, z0, z1) => {
      if (!parts[lv].has(mat)) parts[lv].set(mat, []);
      const geo = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      parts[lv].get(mat).push(geo);
    };
    return { b, parts, finish: () => parts.map((mp) => new Map([...mp].map(([mat, list]) => [mat, K.merge(list)]))) };
  }
  function villaA() {
    const t = template(); const b = t.b;
    // ground floor
    b(0, M.render, -6, 6, 0, 3.5, -5, 5);
    b(0, M.win, -4.5, 3.5, 0.15, 3.0, 5, 5.06);
    b(0, M.render, -5.2, 4.2, 3.0, 3.5, 5, 6.3); b(0, M.render, -5.2, -4.6, 0, 3.0, 5, 6.3); b(0, M.render, 3.6, 4.2, 0, 3.0, 5, 6.3);
    b(0, M.winDark, -2, 2.5, 1.0, 2.6, -5.06, -5);
    b(0, M.win, 6, 6.06, 0.6, 2.8, -2, 2);
    b(0, M.renderWarm, -6.3, 6.3, 3.5, 3.8, -5.3, 5.3);
    b(0, M.metal, -1, 1.2, 0, 2.6, -5.12, -5.04); // entrance door
    // upper floor + roof terrace with pergola
    b(1, M.render, -6, 1.5, 3.8, 7.0, -5, 4);
    b(1, M.win, -5, 0.5, 4.0, 6.6, 4, 4.06);
    b(1, M.render, -6.4, 1.9, 6.6, 7.1, 4, 5.4); b(1, M.render, -6.4, -5.8, 3.8, 6.6, 4, 5.4); b(1, M.render, 1.3, 1.9, 3.8, 6.6, 4, 5.4);
    b(1, M.win, 1.5, 1.56, 3.9, 6.6, -2, 2.5);
    b(1, M.winDark, -4, -1, 4.4, 6.4, -5.06, -5);
    b(1, M.rail, 1.5, 6.2, 3.8, 4.9, 5.2, 5.28); b(1, M.rail, 6.2, 6.28, 3.8, 4.9, -5.2, 5.28);
    for (const [x, z] of [[2.1, 4.9], [6.0, 4.9], [2.1, -4.8], [6.0, -4.8]]) b(1, M.metal, x - 0.08, x + 0.08, 3.8, 6.6, z - 0.08, z + 0.08);
    for (let x = 2.0; x <= 6.2; x += 0.42) b(1, M.metal, x - 0.05, x + 0.05, 6.5, 6.68, -5, 5);
    b(1, M.deck, 1.6, 6.2, 3.8, 3.86, -5.1, 5.1);
    // roof
    b(2, M.render, -6.2, 1.7, 7.0, 7.45, -5.2, 4.2);
    b(2, M.render, -5.2, -2.2, 7.45, 9.7, -4.6, -1.4);
    b(2, M.winDark, -2.26, -2.2, 7.6, 9.4, -4, -2);
    return t.finish();
  }
  function villaB() {
    const t = template(); const b = t.b;
    b(0, M.render, -6.5, 6.5, 0, 3.5, -5.5, 5.5);
    b(0, M.win, -5.5, 5.5, 0.15, 3.0, 5.5, 5.56);
    b(0, M.render, -6.8, 6.8, 3.0, 3.5, 5.5, 7.0); b(0, M.render, -6.8, -6.0, 0, 3.0, 5.5, 7.0); b(0, M.render, 6.0, 6.8, 0, 3.0, 5.5, 7.0);
    b(0, M.winDark, -4.5, -1.5, 0.9, 2.7, -5.56, -5.5);
    b(0, M.win, -6.56, -6.5, 0.6, 2.8, -1, 3);
    b(0, M.renderWarm, -6.8, 6.8, 3.5, 3.8, -5.8, 7.0);
    b(0, M.metal, 1, 3, 0, 2.6, -5.62, -5.54);
    b(1, M.render, -6.5, 6.5, 3.8, 7.0, -6.5, 3.2);
    b(1, M.win, -5.5, 2.0, 4.0, 6.6, 3.2, 3.26);
    b(1, M.render, 3.2, 6.5, 4.0, 6.8, 3.2, 3.3);
    b(1, M.winDark, 3, 5.5, 4.4, 6.4, -6.56, -6.5);
    b(1, M.rail, -6.5, 6.5, 3.8, 4.9, 6.9, 6.98); b(1, M.rail, -6.6, -6.52, 3.8, 4.9, 3.2, 7.0); b(1, M.rail, 6.52, 6.6, 3.8, 4.9, 3.2, 7.0);
    b(1, M.deck, -6.5, 6.5, 3.8, 3.86, 3.2, 7.0);
    b(2, M.render, -6.7, 6.7, 7.0, 7.4, -6.7, 3.4);
    b(2, M.render, -6.2, -3.2, 7.4, 9.6, -6.2, -3);
    b(2, M.winDark, -3.26, -3.2, 7.6, 9.3, -5.6, -3.6);
    for (const [x, z] of [[0, -5.6], [5.8, -5.6], [0, 2.6], [5.8, 2.6]]) b(2, M.metal, x - 0.08, x + 0.08, 7.4, 9.8, z - 0.08, z + 0.08);
    for (let z = -5.8; z <= 2.8; z += 0.42) b(2, M.metal, -0.2, 6.0, 9.7, 9.86, z - 0.05, z + 0.05);
    b(2, M.rail, -2.9, 6.6, 7.4, 8.5, 3.3, 3.38); b(2, M.rail, 6.52, 6.6, 7.4, 8.5, -6.6, 3.4);
    return t.finish();
  }
  const TEMPLATES = [villaA(), villaB()];

  /* ================================================================ VILLA PLACEMENT */
  // yaw so the entrance (local -z) faces the street side; see notes in each row
  const villas = [];
  const add = (x, z, yaw, v) => villas.push({ x, z, yaw, v });
  // east column along the street (entrances face the street to the east, gardens and pools west)
  const streetX = (z) => { // street centre line x at z (piecewise linear on STREET)
    for (let i = 0; i < STREET.length - 1; i++) {
      const [ax, az] = STREET[i], [bx, bz] = STREET[i + 1];
      if ((z - az) * (z - bz) <= 0 && az !== bz) return ax + ((z - az) / (bz - az)) * (bx - ax);
    }
    return 55;
  };
  let k = 0;
  for (let z = -150; z <= 46; z += 17) { add(streetX(z) - 21, z, -Math.PI / 2, k++ % 2); }
  // row south of the central lagoon (gardens north, towards the lagoon)
  [-38, -18, 2].forEach((x, i) => add(x, 32, Math.PI, (i + 1) % 2));
  // west row along the inner street (entrances west, gardens east)
  for (let i = 0; i < 6; i++) add(-62 - i * 1.6, 22 - i * 17, Math.PI / 2, i % 2);
  // north row (entrances north, gardens south towards the lagoon)
  [-40, -20, 0, 18].forEach((x, i) => add(x, -66, 0, i % 2));
  // far north rows (depth beyond the lagoons)
  [-100, -82, -46, -28, -10].forEach((x, i) => add(x, -150, 0, i % 2));
  [-104, -100].forEach((x, i) => add(x, -100 + i * 22, Math.PI / 2, (i + 1) % 2));

  const levelNames = [
    ['Villas · ground level', 'الفلل · الطابق الأرضي'],
    ['Villas · upper level', 'الفلل · الطابق العلوي'],
    ['Villas · roof terraces', 'الفلل · الأسطح'],
  ];
  const vMats = villas.map((v) => K.mat4(v.x, 0, v.z, v.yaw));
  const vMatsB = villas.map((v) => K.mat4(v.x, 0, v.z, v.yaw, 1.15));
  for (let lv = 0; lv < 3; lv++) {
    const f = floorG('villas', lv, ...levelNames[lv]);
    TEMPLATES.forEach((tp, vi) => {
      const list = villas.map((v, i) => (v.v === vi ? vMatsB[i] : null)).filter(Boolean);
      if (!list.length) return;
      for (const [mat, geo] of tp[lv]) {
        const glassy = mat.transparent && mat.opacity < 0.95;
        f.add(K.inst(`villa-${vi}-L${lv}-${mat.name}`, geo, mat, list, { cast: !glassy }));
      }
    });
  }
  // private plots: lawn, pool with coping and deck, low garden walls, driveway
  {
    const B = K.batcher(site, 'villa-plots');
    const loc = new THREE.Matrix4();
    const put = (vm, mat, x0, x1, y0, y1, z0, z1) => {
      loc.copy(vm).multiply(K.mat4((x0 + x1) / 2, y0, (z0 + z1) / 2, 0, x1 - x0, y1 - y0, z1 - z0));
      B.add(unit, mat, loc);
    };
    villas.forEach((v, i) => {
      const vm = vMats[i];
      put(vm, M.garden, -9.5, 9.5, 0.1, 0.22, -9, 16);
      put(vm, M.coping, -6.2, 2.2, 0.22, 0.42, 8.6, 13.4);
      put(vm, M.deck, 2.2, 6.5, 0.22, 0.34, 7.2, 13.4);
      put(vm, M.paving, -1, 6, 0.22, 0.3, -11, -5);
      put(vm, M.render, -9.7, -9.4, 0, 1.6, -6, 16.2);
      put(vm, M.render, 9.4, 9.7, 0, 1.6, -6, 16.2);
      put(vm, M.render, -9.7, 9.7, 0, 1.6, 15.9, 16.2);
    });
    B.flush();
    const pools = villas.map((v, i) => new THREE.Matrix4().copy(vMats[i]).multiply(K.mat4(-2, 0.3, 11, 0, 7.6, 0.14, 4.0)));
    site.add(K.inst('villa-pools', unit, M.pool, pools, { cast: false }));
  }

  /* ================================================================ COMMERCIAL BLOCK */
  {
    const B0 = K.batcher(floorG('commercial', 0, 'Shops · ground level', 'المتاجر · الطابق الأرضي'), 'shops-L0');
    const B1 = K.batcher(floorG('commercial', 1, 'Shops · upper level', 'المتاجر · الطابق العلوي'), 'shops-L1');
    const B2 = K.batcher(floorG('commercial', 2, 'Shops · roof', 'المتاجر · السطح'), 'shops-L2');
    const bx = (B, mat, x0, x1, y0, y1, z0, z1) => B.add(unit, mat, K.mat4((x0 + x1) / 2, y0, (z0 + z1) / 2, 0, x1 - x0, y1 - y0, z1 - z0));
    // main block (south), two storeys: dark glazed shopfront under a white upper band
    const X0 = -78, X1 = 26, Z0 = 50, Z1 = 84;
    bx(B0, M.render, X0, X1, 0, 4.6, Z0, Z1 - 1.5);
    bx(B0, M.shopGlass, X0 + 1, X1 - 1, 0.1, 4.2, Z1 - 1.5, Z1 - 1.44);
    bx(B0, M.shopGlass, X0 - 0.06, X0, 0.1, 4.2, Z0 + 4, Z1 - 2);
    for (let x = X0 + 1; x <= X1 - 1; x += 3.2) bx(B0, M.metal, x - 0.08, x + 0.08, 0.1, 4.2, Z1 - 1.48, Z1 - 1.36);
    bx(B0, M.render, X0 - 0.4, X1 + 0.4, 4.6, 5.0, Z0 - 0.4, Z1 + 0.6);
    bx(B0, M.sign, -40, -28, 3.4, 4.0, Z1 + 0.6, Z1 + 0.7); bx(B0, M.sign, -16, -6, 3.4, 4.0, Z1 + 0.6, Z1 + 0.7); bx(B0, M.sign, 6, 16, 3.4, 4.0, Z1 + 0.6, Z1 + 0.7);
    bx(B1, M.render, X0, X1, 5.0, 9.2, Z0, Z1);
    bx(B1, M.shopGlass, X0 + 2, X0 + 40, 5.6, 8.6, Z1, Z1 + 0.06);
    bx(B1, M.winDark, X1 - 30, X1 - 4, 5.6, 8.6, Z1, Z1 + 0.06);
    bx(B2, M.render, X0 - 0.3, X1 + 0.3, 9.2, 9.8, Z0 - 0.3, Z1 + 0.3);
    bx(B2, M.roof, X0 + 0.6, X1 - 0.6, 9.8, 9.85, Z0 + 0.6, Z1 - 0.6);
    bx(B2, M.render, -30, -6, 9.8, 12.4, 58, 72);
    bx(B2, M.render, 4, 14, 9.8, 11.2, 56, 64);
    // west block: three storeys, roof terrace with pergolas
    const W0 = -108, W1 = -78, V0 = 20, V1 = 84;
    bx(B0, M.render, W0, W1, 0, 4.6, V0, V1);
    bx(B0, M.shopGlass, W0 - 0.06, W0, 0.1, 4.2, V0 + 3, V1 - 3);
    bx(B1, M.render, W0, W1, 4.6, 8.4, V0, V1);
    bx(B1, M.winDark, W0 - 0.06, W0, 5.2, 7.8, V0 + 3, V1 - 3);
    bx(B2, M.render, W0, W1, 8.4, 12.2, V0, V1 - 20);
    bx(B2, M.winDark, W0 - 0.06, W0, 9.0, 11.6, V0 + 3, V1 - 23);
    bx(B2, M.render, W0 - 0.3, W1 + 0.3, 12.2, 12.7, V0 - 0.3, V1 - 19.7);
    bx(B2, M.roof, W0, W1, 8.4, 8.6, V1 - 20, V1);
    for (const pz of [V1 - 16, V1 - 7]) {
      for (const [x, z] of [[W0 + 4, pz], [W0 + 12, pz], [W0 + 4, pz + 6], [W0 + 12, pz + 6]]) bx(B2, M.metal, x - 0.1, x + 0.1, 8.6, 11.4, z - 0.1, z + 0.1);
      for (let z = pz - 0.4; z <= pz + 6.4; z += 0.5) bx(B2, M.metal, W0 + 3.6, W0 + 12.4, 11.3, 11.5, z - 0.06, z + 0.06);
    }
    B0.flush(); B1.flush(); B2.flush();
    // café terrace: parasols, tables
    const pole = [], cano = [], tables = [];
    for (let x = -72; x < 22; x += 6.5) for (const z of [88.5, 93]) {
      pole.push(K.mat4(x, 0.3, z, 0, 0.07, 2.5, 0.07)); cano.push(K.mat4(x, 2.6, z, 0, 1, 1, 1)); tables.push(K.mat4(x, 0.3, z, 0, 1.2, 0.75, 1.2));
    }
    const canopy = K.g(new THREE.ConeGeometry(1.7, 0.45, 8, 1, true));
    site.add(K.inst('cafe-parasol-poles', unit, M.metal, pole), K.inst('cafe-parasols', canopy, M.umbrella, cano), K.inst('cafe-tables', unit, M.furniture, tables));
    K.palms(site, [[-60, 90.5, 7], [-34, 90.5, 8], [-8, 90.5, 7], [16, 90.5, 8], [-114, 30, 8], [-114, 60, 7]], { name: 'shop-palms' });
  }

  /* ================================================================ GROUND, ROADS, LAGOONS */
  {
    const S = { x0: -150, x1: 250, z0: -180, z1: 125 };
    site.add(K.mesh('site-garden-lawn-grass', K.flat([[S.x0, S.z0], [S.x1, S.z0], [S.x1, S.z1], [S.x0, S.z1]], 0.08), M.garden, { cast: false }));
    // the open park east of the street (lighter, drier grass)
    const eastEdge = STREET.slice(0, 7).map(([x, z]) => [x + 9, z]);
    site.add(K.mesh('park-meadow-grass', K.flat([...eastEdge, [S.x1, 92], [S.x1, S.z0]].reverse(), 0.12), M.park, { cast: false }));
    const road = (path, w, name) => {
      const p = K.spline(path, 90);
      site.add(K.mesh(`${name}-asphalt`, K.sweep(p, () => [P(-w / 2, 0.14, 1), P(w / 2, 0.14, 1), P(w / 2, 0.24, 1), P(-w / 2, 0.24, 1)], { caps: true }), M.asphalt, { cast: false }));
      site.add(K.mesh(`${name}-kerb-w`, K.sweep(p, () => [P(-w / 2 - 2.6, 0.14, 1), P(-w / 2, 0.14, 1), P(-w / 2, 0.36, 1), P(-w / 2 - 2.6, 0.36, 1)], { caps: true }), M.kerb, { cast: false }));
      site.add(K.mesh(`${name}-kerb-e`, K.sweep(p, () => [P(w / 2, 0.14, 1), P(w / 2 + 1.2, 0.14, 1), P(w / 2 + 1.2, 0.36, 1), P(w / 2, 0.36, 1)], { caps: true }), M.kerb, { cast: false }));
      const dash = [];
      for (let i = 2; i < p.length - 1; i += 2) {
        const [ax, az] = p[i - 1], [bx, bz] = p[i + 1];
        dash.push(K.mat4(p[i][0], 0.25, p[i][1], Math.atan2(bx - ax, bz - az), 0.15, 0.02, 2.4));
      }
      site.add(K.inst(`${name}-dashes`, unit, M.marking, dash, { cast: false }));
      return p;
    };
    const st = road(STREET, 9, 'street-east');
    road(WEST_ROAD, 10, 'road-west');
    road([[-104, 40], [-80, 40], [-70, 38]], 7, 'inner-street');
    // lagoons: sandy deck, coping, water
    for (const L of LAGOONS) {
      const p = K.spline(L.ctrl, 64, true);
      const cx = p.reduce((s, q) => s + q[0], 0) / p.length, cz = p.reduce((s, q) => s + q[1], 0) / p.length;
      const grow = (d) => p.map(([x, z]) => { const dx = x - cx, dz = z - cz, l = Math.hypot(dx, dz) || 1; return [x + (dx / l) * d, z + (dz / l) * d]; });
      site.add(K.mesh(`${L.id}-sand-deck`, K.flat(grow(5.5), 0.2), M.sand, { cast: false }));
      site.add(K.mesh(`${L.id}-coping`, K.sweep(grow(0.4), () => [P(-0.4, 0.2, 1), P(0.4, 0.2, 1), P(0.4, 0.42, 1), P(-0.4, 0.42, 1)], { closed: true }), M.coping, { cast: false }));
      site.add(K.mesh(`${L.id}-water`, K.flat(p, 0.32), M.lagoon, { cast: false }));
      // loungers and parasols on the deck
      const rnd = makeRng(L.seed);
      const lo = [], po = [], ca = [];
      const ring = grow(3.2);
      for (let i = 0; i < ring.length; i += 5) {
        if (rnd() < 0.35) continue;
        const [x, z] = ring[i]; const a = Math.atan2(x - cx, z - cz);
        lo.push(K.mat4(x, 0.2, z, a, 0.75, 0.4, 1.9));
        if (rnd() < 0.5) { po.push(K.mat4(x + 1.2, 0.2, z, 0, 0.06, 2.4, 0.06)); ca.push(K.mat4(x + 1.2, 2.5, z, 0, 0.9, 1, 0.9)); }
      }
      const canopy = K.g(new THREE.ConeGeometry(1.5, 0.4, 8, 1, true));
      site.add(K.inst(`${L.id}-loungers`, unit, M.coping, lo), K.inst(`${L.id}-parasol-poles`, unit, M.metal, po), K.inst(`${L.id}-parasols`, canopy, M.umbrella, ca));
    }
    // vegetation: dense gardens between the villas, tree line along the street, scattered park trees
    const rnd = makeRng(4242);
    const near = (x, z, d) => villas.some((v) => {
      const dx = x - v.x, dz = z - v.z, c = Math.cos(v.yaw), sn = Math.sin(v.yaw);
      const lx = c * dx - sn * dz, lz = sn * dx + c * dz;
      return Math.abs(lx) < 10 + (d - 10) * 0.3 && lz > -11 && lz < 17;
    });
    const inLagoon = (x, z) => LAGOONS.some((L) => L.ctrl.some(([a, b]) => Math.hypot(a - x, b - z) < 14));
    const onRoad = (x, z, path, d) => { for (let i = 0; i < path.length; i++) if (Math.hypot(path[i][0] - x, path[i][1] - z) < d) return true; return false; };
    const westP = K.spline(WEST_ROAD, 60);
    const trees = [], shrubs = [];
    let tries = 0;
    while (trees.length < (high ? 420 : 170) && tries < 20000) {
      tries++;
      const x = -146 + rnd() * 190, z = -176 + rnd() * 300;
      if (x > streetX(z) - 8) continue;
      if (z > 44 && x < 30) continue;                                  // shops + café
      if (near(x, z, 10.5) || inLagoon(x, z) || onRoad(x, z, st, 9) || onRoad(x, z, westP, 9)) continue;
      trees.push([x, z, 7 + rnd() * 6, 0.9 + rnd() * 0.4]);
    }
    // a garden tree or two in each plot
    villas.forEach((v, i) => {
      const c = Math.cos(v.yaw), sn = Math.sin(v.yaw);
      const w = (lx, lz) => [v.x + c * lx + sn * lz, v.z - sn * lx + c * lz];
      trees.push([...w(i % 2 ? 7.5 : -7.5, 15), 6 + rnd() * 3, 0.8]);
      if (i % 3 === 0) trees.push([...w(-7.5, -8.5), 5 + rnd() * 2, 0.7]);
      shrubs.push([...w(8.3, 3), 1.4], [...w(-8.3, 4), 1.3], [...w(8.3, 9), 1.2]);
    });
    for (let i = 0; i < (high ? 500 : 200); i++) {
      const x = -146 + rnd() * 190, z = -176 + rnd() * 300;
      if (x > streetX(z) - 6 || (z > 44 && x < 30) || near(x, z, 9) || inLagoon(x, z)) continue;
      shrubs.push([x, z, 1.2 + rnd() * 1.6]);
    }
    // street tree lines
    for (let i = 1; i < st.length - 1; i += 1) {
      const [x, z] = st[i]; if (z > 70) continue;
      trees.push([x + 9 + rnd() * 4, z, 10 + rnd() * 4, 1.1]);
      if (i % 2) trees.push([x + 16 + rnd() * 6, z + rnd() * 4, 11 + rnd() * 4, 1.2]);
    }
    // park: scattered trees, a few small groups
    const park = [];
    for (let i = 0; i < (high ? 130 : 60); i++) {
      const z = -176 + rnd() * 268, x = streetX(Math.max(-170, Math.min(70, z))) + 26 + rnd() * 170;
      if (x > 246) continue;
      park.push([x, z, 9 + rnd() * 5, 1 + rnd() * 0.3]);
    }
    K.trees(site, trees, { seed: 31, name: 'garden-trees' });
    K.trees(site, park, { seed: 37, name: 'park-trees', palette: [0x4d6b37, 0x587a3e, 0x456331] });
    K.shrubs(site, shrubs, { seed: 41, name: 'garden-shrubs' });
    // a few flowering trees (the render shows a red-flowering tree among the villas)
    K.shrubs(site, [[12, 18, 3.6], [-30, -40, 3.2], [26, -80, 3.4]], { seed: 3, name: 'flowering-shrubs', color: 0xc0574a });
    // cars, lamps, lights
    const cars = [];
    [[0.25, 1], [0.38, -1], [0.55, 1], [0.7, -1], [0.82, 1]].forEach(([t, s]) => {
      const i = Math.floor(t * (st.length - 1)); const [x, z] = st[i]; const [bx2, bz2] = st[i + 1];
      const yaw = Math.atan2(bx2 - x, bz2 - z) + (s < 0 ? Math.PI : 0);
      cars.push([x + Math.cos(yaw) * 2 * s, z - Math.sin(yaw) * 2 * s, yaw]);
    });
    villas.slice(0, 8).forEach((v, i) => { if (i % 3 === 0) cars.push([v.x + 6, v.z - 3, 0]); });
    cars.push([-40, 77, Math.PI / 2], [-70, 99, Math.PI / 2], [-20, 98, -Math.PI / 2]);
    K.cars(site, cars, { name: 'villa-cars' });
    const posts = [];
    for (let i = 3; i < st.length - 2; i += 6) { const [x, z] = st[i]; posts.push([x - 6.2, z, Math.PI / 2]); }
    const heads = K.lampPosts(site, posts, { h: 6, name: 'street-lamps' });
    heads.filter((_, i) => i % 3 === 0).slice(0, 4).forEach(([x, y, z], i) => K.light(site, `street-light-${i}`, x, y, z, 70, 28));
    K.light(site, 'lagoon-light', -8, 4, -18, 90, 36, 0xcff3ff);
    K.light(site, 'cafe-light', -30, 3.2, 90, 110, 34);
    K.light(site, 'shops-west-light', -112, 3.2, 50, 70, 28);
  }

  floors.sort((a, b) => a.userData.level - b.userData.level);
  root.add(site);
  return {
    root, floors, site,
    nightMaterials: K.nightMaterials,
    lamps: K.lamps,
    update(dt, t) {
      const n = K.waterNormal();
      if (n) { n.offset.x = (t * 0.015) % 1; n.offset.y = (t * 0.01) % 1; }
    },
    dispose() { K.dispose(); root.removeFromParent(); },
  };
}
