/**
 * MOBCO Explore in 3D · model: "campus"
 * ---------------------------------------------------------------------------
 * Innovation Campus, modelled from the aerial render (assets/img/campus.jpg). Illustrative: the layout,
 * shapes and proportions follow the render, sizes are estimated (no published dimensions).
 *
 * North part: a sculpted white horseshoe building wrapped around a garden court, open to the south where a
 * small gate building sits between two reflecting pools; a glass drum tower with white floor plates at the
 * back, wrapped by a curved white sail that rises above the crown; a long four-storey bar behind it and
 * flowing glazed wings either side. South-east: an office block with balconies and a curved white end wall.
 * South of the road and roundabout: two low pavilions under perforated white shells, each around an open
 * courtyard, linked by a glazed sky bridge over the tree-lined boulevard.
 *
 * Contract: export meta, export build(THREE, ctx) -> { root, floors, site, nightMaterials, lamps, update, dispose }.
 * World units are metres, ground y = 0, +z = south (towards the default camera), +x = east.
 */

import { createKit, makeRng, clamp, smoothstep, P, bandProfile } from './_kit.js';

export const meta = {
  id: 'campus',
  name: { en: 'Innovation Campus', ar: 'حرم الابتكار' },
  projectSlug: 'innovation-campus',
  tagline: {
    en: 'A white horseshoe around a garden court, a glass tower wrapped by a sail, and two perforated pavilions linked by a sky bridge.',
    ar: 'مبنى أبيض على شكل حدوة حول فناء مزروع، وبرج زجاجي يلتفّ حوله شراع، وجناحان بغلاف مثقّب يربطهما جسر معلّق.',
  },
  descriptors: [
    { label: { en: 'Typology', ar: 'النمط' }, value: { en: 'Campus', ar: 'حرم تعليمي' } },
    { label: { en: 'Massing', ar: 'التكوين الكتلي' }, value: { en: 'Horseshoe building around a garden court', ar: 'مبنى على شكل حدوة حول فناء مزروع' } },
    { label: { en: 'Landmark', ar: 'العنصر المميّز' }, value: { en: 'Glass tower wrapped by a curved sail', ar: 'برج زجاجي يلتفّ حوله شراع منحنٍ' } },
    { label: { en: 'Connection', ar: 'الربط' }, value: { en: 'Glazed sky bridge over the boulevard', ar: 'جسر معلّق زجاجي فوق الجادة' } },
    { label: { en: 'Landscape', ar: 'تنسيق الموقع' }, value: { en: 'Wooded grounds, pools and a roundabout', ar: 'أراضٍ مشجّرة وأحواض مائية ودوّار' } },
  ],
  camera: {
    target: [0, 6, -40],
    aerial: [18, 190, 250],
    street: [-30, 2.2, 36],
    top: [0, 420, -39.9],
    front: [0, 40, 260],
  },
  hotspots: [
    {
      id: 'tower', position: [0, 74, -170],
      title: { en: 'Central tower', ar: 'البرج المركزي' },
      text: { en: 'A glass drum with white floor plates, wrapped by a curved sail that rises above the crown.', ar: 'أسطوانة زجاجية بأحزمة بيضاء عند كل طابق، يلتفّ حولها شراع منحنٍ يرتفع فوق قمّتها.' },
    },
    {
      id: 'ring', position: [-82, 18, -98],
      title: { en: 'Horseshoe building', ar: 'مبنى الحدوة' },
      text: { en: 'A sculpted white shell curves around the court, with glazing set back under its inner edge.', ar: 'غلاف أبيض منحوت ينحني حول الفناء، والواجهات الزجاجية متراجعة تحت حافته الداخلية.' },
    },
    {
      id: 'court', position: [-26, 15, -102],
      title: { en: 'Garden court', ar: 'الفناء المزروع' },
      text: { en: 'A planted court with a glass pavilion and a paved spine from the gate to the tower.', ar: 'فناء مزروع فيه جناح زجاجي وممرّ مرصوف من البوابة إلى البرج.' },
    },
    {
      id: 'pavilions', position: [-118, 24, 62],
      title: { en: 'Perforated pavilions', ar: 'الجناحان المثقّبان' },
      text: { en: 'Two low buildings under white perforated shells, each around an open courtyard.', ar: 'مبنيان منخفضان تحت غلافين أبيضين مثقّبين، يحيط كل منهما بفناء مفتوح.' },
    },
    {
      id: 'bridge', position: [0, 26, 76],
      title: { en: 'Sky bridge', ar: 'الجسر المعلّق' },
      text: { en: 'A glazed bridge links the two pavilions across the boulevard.', ar: 'جسر زجاجي يربط الجناحين فوق الجادة.' },
    },
  ],
  sun: { azimuth: -35, elevation: 40 },
};

/* ------------------------------------------------------------------ layout (metres) */
const C = { cx: 0, cz: -95, rx: 76, rz: 56 };                 // horseshoe centre line
const TOWER = { x: 0, z: -170, R: 15, lobbyH: 6.5, fh: 3.9, n: 14, crownH: 3.4, sailH: 84 };
const BAR = { x0: -114, x1: 114, z0: -216, z1: -197, fh: 4, n: 4 };
const OFFICE = { cx: 92, cz: -40, r: 22, x1: 166, z0: -62, z1: -18, fh: 4.1, n: 5 };
const PAVS = [
  { id: 'pav-west', cx: -100, cz: 80, rx: 52, rz: 34, a: 18, phase: 0.6, seed: 3 },
  { id: 'pav-east', cx: 102, cz: 68, rx: 50, rz: 33, a: 18, phase: 2.4, seed: 7 },
];
const ROAD = { z0: -4, z1: 12, rbx: 0, rbz: 4, rbR: 22, rbIsland: 11, blvd: [4, 14] };
const DEG = Math.PI / 180;
const WINGS = [
  { a0: -154, a1: -103, rx: 117, rz: 90, H: 12, a: 13 },
  { a0: -99, a1: -66, rx: 125, rz: 97, H: 9, a: 10 },
  { a0: 103, a1: 152, rx: 117, rz: 90, H: 12, a: 13 },
  { a0: 80, a1: 101, rx: 125, rz: 97, H: 9, a: 10 },
];

export function build(THREE, ctx = {}) {
  const K = createKit(THREE, ctx);
  const { high } = K;
  const root = new THREE.Group(); root.name = 'campus';
  const site = new THREE.Group(); site.name = 'campus-site';
  const floors = [];
  const fg = (...a) => { const f = K.floorGroup(root, ...a); floors.push(f); return f; };

  /* ---------------------------------------------------------------- materials */
  const shellTex = K.canvasTex(high ? 512 : 256, high ? 512 : 256, (c, w, h) => {
    const rnd = makeRng(41);
    c.fillStyle = '#f3f2ee'; c.fillRect(0, 0, w, h);
    // soft large-scale mottling (cast panels)
    for (let i = 0; i < 70; i++) {
      const x = rnd() * w, y = rnd() * h, r = (0.05 + rnd() * 0.18) * w;
      const gr = c.createRadialGradient(x, y, 0, x, y, r);
      const a = 0.025 + rnd() * 0.03;
      gr.addColorStop(0, rnd() < 0.5 ? `rgba(200,196,186,${a})` : `rgba(255,255,255,${a * 1.5})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
    }
    // faint panel joints
    c.strokeStyle = 'rgba(150,146,138,0.16)'; c.lineWidth = Math.max(1, w / 512);
    for (let i = 0; i <= 8; i++) { const y = (i / 8) * h; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    for (let i = 0; i <= 6; i++) { const x = (i / 6) * w; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    // sparse dark specks (small openings / fixings seen in the render)
    for (let i = 0; i < 120; i++) {
      const x = rnd() * w, y = rnd() * h, s = (0.6 + rnd() * 1.6) * (w / 512);
      c.fillStyle = `rgba(70,74,80,${0.25 + rnd() * 0.35})`; c.fillRect(x, y, s * 1.6, s);
    }
  }, { repeat: [1 / 36, 1 / 36] });
  const M = {
    shell: K.std({ name: 'campus-shell-white', color: 0xffffff, map: shellTex, roughness: 0.58, metalness: 0 }),
    white: K.std({ name: 'campus-render-white', color: 0xf1f0ec, roughness: 0.66 }),
    slab: K.std({ name: 'campus-slab-edge-white', color: 0xf4f3ef, roughness: 0.5 }),
    roof: K.std({ name: 'campus-roof-membrane', color: 0xd6d3cc, roughness: 0.9 }),
    glass: K.glass('campus-glazing', 0x7e9fb1, { opacity: 0.4 }),
    glassDark: K.glass('campus-glazing-dark', 0x4d6577, { opacity: 0.62, env: 1.5 }),
    rail: K.glass('campus-balustrade-glass', 0xb8cdd6, { opacity: 0.22, env: 1 }),
    mullion: K.std({ name: 'campus-mullion-metal', color: 0xdfe2e4, roughness: 0.35, metalness: 0.65 }),
    interior: K.interior('campus-interior', 0x6a645c, 0xffd6a6, 1.0),
    interiorCool: K.interior('campus-interior-office', 0x7b7a76, 0xfff0d8, 0.9),
    water: K.water('campus-water-pool', 0x2f93b4, { emissive: 0x3cc8e0, nightMax: 0.5 }),
    paving: K.std({ name: 'campus-plaza-paving', color: 0xe9e5dc, roughness: 0.85 }),
    path: K.std({ name: 'campus-gravel-path', color: 0xc99a72, roughness: 0.95 }),
    asphalt: K.std({ name: 'campus-asphalt-road', color: 0x55595d, roughness: 0.92 }),
    kerb: K.std({ name: 'campus-kerb-paving', color: 0xcfcbc2, roughness: 0.9 }),
    marking: K.std({ name: 'campus-road-mark', color: 0xf4f4f0, roughness: 0.7 }),
    lawn: K.std({ name: 'campus-lawn-grass', color: 0x7a8b56, roughness: 1 }),
    meadow: K.std({ name: 'campus-meadow-grass', color: 0x657d44, roughness: 1 }),
    beds: K.std({ name: 'campus-planting-shrub-bed', color: 0x587540, roughness: 1 }),
    soil: K.std({ name: 'campus-gravel-earth', color: 0xb99a76, roughness: 1 }),
    context: K.std({ name: 'campus-context-render', color: 0xe8e5de, roughness: 0.8 }),
    contextRoof: K.std({ name: 'campus-context-roof-concrete', color: 0xcfcac0, roughness: 0.9 }),
    accent: K.std({ name: 'campus-logo-accent', color: 0x6b4fa0, roughness: 0.5 }),
  };

  /* perforated shell: triangular openings with blue glass, density varies across the skin */
  const PU = 64, PV = 32;                      // one texture tile covers 64 x 32 m
  const perfW = high ? 1024 : 512, perfH = perfW / 2;
  const perfCells = [];
  {
    const rnd = makeRng(77);
    const cols = 36, rows = 20;
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols * 2; q++) {
      const u = (q / 2 + 0.25) / cols, v = (r + 0.5) / rows;
      const tau = Math.PI * 2;
      const dens = 0.5 + 0.3 * Math.sin(tau * (2 * u) + 1.3) * Math.cos(tau * v) + 0.22 * Math.sin(tau * (3 * u + 2 * v) + 0.4) + 0.12 * Math.cos(tau * (5 * u - v));
      const p = smoothstep(0.15, 0.95, dens);
      if (rnd() > Math.pow(p, 1.1)) continue;
      perfCells.push({ r, q, up: (q + r) % 2 === 0, s: 0.3 + 0.62 * p * (0.8 + rnd() * 0.2), lit: rnd() < 0.75, tone: rnd() });
    }
  }
  const drawPerf = (mode) => (c, w, h) => {
    const cols = 36, rows = 20;
    const cw = w / cols, ch = h / rows;
    c.fillStyle = mode === 'map' ? '#f4f3ef' : mode === 'emit' ? '#000' : 'rgb(0,150,0)';
    c.fillRect(0, 0, w, h);
    for (const cell of perfCells) {
      const x0 = (cell.q / 2) * cw, y0 = cell.r * ch;
      const cx = x0 + cw / 2, cy = y0 + ch / 2;
      const s = cell.s;
      const pts = cell.up
        ? [[cx, cy - ch * 0.5 * s], [cx + cw * 0.5 * s, cy + ch * 0.5 * s], [cx - cw * 0.5 * s, cy + ch * 0.5 * s]]
        : [[cx - cw * 0.5 * s, cy - ch * 0.5 * s], [cx + cw * 0.5 * s, cy - ch * 0.5 * s], [cx, cy + ch * 0.5 * s]];
      if (mode === 'map') {
        const t = cell.tone;
        c.fillStyle = `rgb(${Math.round(40 + 50 * t)},${Math.round(72 + 60 * t)},${Math.round(104 + 70 * t)})`;
      } else if (mode === 'emit') {
        c.fillStyle = cell.lit ? `rgb(255,${Math.round(205 + 30 * cell.tone)},${Math.round(150 + 40 * cell.tone)})` : '#000';
      } else c.fillStyle = 'rgb(0,28,150)'; // roughness (G) low, metalness (B) mid
      c.beginPath(); c.moveTo(...pts[0]); c.lineTo(...pts[1]); c.lineTo(...pts[2]); c.closePath(); c.fill();
    }
  };
  const rep = [1 / PU, 1 / PV];
  const perfMap = K.canvasTex(perfW, perfH, drawPerf('map'), { repeat: rep });
  const perfEmit = K.canvasTex(perfW, perfH, drawPerf('emit'), { repeat: rep });
  const perfOrm = K.canvasTex(perfW, perfH, drawPerf('orm'), { repeat: rep, srgb: false });
  M.perf = K.std({
    name: 'campus-shell-perforated', color: 0xffffff, map: perfMap, roughness: 1, metalness: 1,
    roughnessMap: perfOrm, metalnessMap: perfOrm, emissive: 0xffffff, emissiveMap: perfEmit, emissiveIntensity: 0,
    envMap: ctx.envMap || null, envMapIntensity: 1,
  });
  M.perf.userData.__nightMax = 1.1;
  M.perf.userData.baseEnvMapIntensity = 1;
  K.nightMaterials.push(M.perf);

  /* ---------------------------------------------------------------- helpers */
  const fOf = (n) => (v, H) => Math.pow(Math.max(0, 1 - Math.pow(clamp(v / H, 0, 1), n)), 1 / n);
  const mats3 = (a, b, c) => [a, b, c];
  /** Instanced mullions along a plan path at offset u (path points spaced ~every `step`). */
  function mullionsAlong(path, uFn, y0, y1, every = 1, name = 'mullions', parent = root, mat = M.mullion, size = [0.14, 0.22]) {
    const ms = [];
    const n = path.length;
    for (let i = 0; i < n; i += every) {
      const a = path[Math.max(0, i - 1)], b = path[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      const u = uFn(i / (n - 1));
      const x = path[i][0] - tz * u, z = path[i][1] + tx * u;
      ms.push(K.mat4(x, y0, z, Math.atan2(tx, tz), size[0], y1 - y0, size[1]));
    }
    const geo = unitBox;
    const im = K.inst(name, geo, mat, ms, { cast: false });
    parent.add(im);
    return im;
  }
  const unitBox = K.g(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
  /** A vertical glass strip along a path at offset u (facing outward when outward = true). */
  function glassAlong(path, uFn, y0, y1, mat, outward, opts = {}) {
    return K.sweep(path, (t) => {
      const u = uFn(t);
      return outward ? [P(u, y0, 1, 0), P(u, y1, 1, 0)] : [P(u, y1, 1, 0), P(u, y0, 1, 0)];
    }, { ...opts, openProfile: true });
  }

  /* ================================================================ HORSESHOE (ring) */
  const ringPaths = [];
  {
    const levels = [
      fg('ring', 0, 'Horseshoe building · ground level', 'مبنى الحدوة · الطابق الأرضي'),
      fg('ring', 1, 'Horseshoe building · level 1', 'مبنى الحدوة · الطابق 1'),
      fg('ring', 2, 'Horseshoe building · level 2 and roof', 'مبنى الحدوة · الطابق 2 والسطح'),
    ];
    const fo = fOf(1.7), fi = fOf(3.4);
    // arms run from the tower (t = 0) to the open south end (t = 1)
    const arms = [
      { a0: -169 * DEG, a1: -9 * DEG, rev: false },
      { a0: 9 * DEG, a1: 163 * DEG, rev: true },
    ];
    for (const arm of arms) {
      const n = high ? 110 : 56;
      const path = K.arc(C.cx, C.cz, C.rx, C.rz, arm.a0, arm.a1, n);
      ringPaths.push(path);
      const par = (t) => {
        const tt = arm.rev ? 1 - t : t;                         // 0 at the tower end, 1 at the south end
        const end = smoothstep(0.7, 1, tt);
        const back = smoothstep(0.12, 0, tt);
        const H = 19 * (1 - 0.86 * Math.pow(end, 1.3)) + 2 * back + 1.2 * Math.sin(tt * 7.0) * (1 - end);
        const a = 16 * (1 - 0.45 * end);
        const ain = 19 * (1 - 0.6 * end);
        const b1 = Math.min(5.2, H * 0.5);
        const b2 = b1 + (H - b1) * 0.47;
        return { H, a, ain, b1, b2, glass: -(a - 3.6) };
      };
      // L0: solid outer face to the ground, glazing set back on the court side
      const l0 = K.sweep(path, (t) => {
        const q = par(t);
        return bandProfile(() => q.glass, (v) => q.a * fo(v, q.H), 0, q.b1, 4, { bot: 0, out: 0, top: 0, in: 1 });
      }, { caps: true, capMat: 0 });
      const l1 = K.sweep(path, (t) => {
        const q = par(t);
        return bandProfile((v) => -q.ain * fi(v, q.H), (v) => q.a * fo(v, q.H), q.b1, q.b2, 6, {});
      }, { caps: true });
      const l2 = K.sweep(path, (t) => {
        const q = par(t);
        return bandProfile((v) => -q.ain * fi(v, q.H), (v) => q.a * fo(v, q.H), q.b2, q.H, 9, {}, 1.2);
      }, { caps: true });
      levels[0].add(K.mesh('ring-shell-L0', l0, [M.shell, M.interior]));
      levels[1].add(K.mesh('ring-shell-L1', l1, M.shell));
      levels[2].add(K.mesh('ring-shell-L2', l2, M.shell));
      const gl = glassAlong(path, (t) => par(t).glass - 0.25, 0, 5.0, M.glass, false);
      const glm = K.mesh('ring-glazing', gl, M.glass, { cast: false }); levels[0].add(glm);
      mullionsAlong(path, (t) => par(t).glass - 0.3, 0, 5.0, 2, 'ring-mullions', levels[0]);
      // floor line inside the glazing
      const fl = K.sweep(path, (t) => { const q = par(t); return [P(q.glass - 0.3, 3.2, 1), P(q.glass - 0.05, 3.2, 1), P(q.glass - 0.05, 3.5, 1), P(q.glass - 0.3, 3.5, 1)]; }, { caps: true });
      levels[0].add(K.mesh('ring-floor-edge', fl, M.slab, { cast: false }));
    }
  }

  /* ================================================================ TOWER + SAIL */
  {
    const T = TOWER;
    const slabGeo = K.g(new THREE.CylinderGeometry(T.R + 1.5, T.R + 1.5, 0.85, high ? 64 : 32));
    const glassGeo = K.g(new THREE.CylinderGeometry(T.R - 0.2, T.R - 0.2, 1, high ? 48 : 28, 1, true));
    const coreGeo = K.g(new THREE.CylinderGeometry(T.R - 1.4, T.R - 1.4, 1, 24, 1, false));
    const nMull = high ? 40 : 24;
    const addFloor = (level, y, h, en, ar, lobby = false) => {
      const f = fg('tower', level, en, ar, y);
      const off = (level % 2 ? 0.55 : -0.45);
      const slab = K.mesh('tower-slab', slabGeo, M.slab);
      slab.position.set(T.x + off, 0.42, T.z - off * 0.4);
      f.add(slab);
      const gm = K.mesh('tower-glass', glassGeo, M.glass, { cast: false });
      gm.scale.y = h - 0.85; gm.position.set(T.x, 0.85 + (h - 0.85) / 2, T.z); f.add(gm);
      const core = K.mesh('tower-interior', coreGeo, lobby ? M.interior : M.interiorCool, { cast: false });
      core.scale.y = h - 0.9; core.position.set(T.x, 0.85 + (h - 0.9) / 2, T.z); f.add(core);
      const ms = [];
      for (let k = 0; k < nMull; k++) {
        const a = (k / nMull) * Math.PI * 2;
        ms.push(K.mat4(T.x + Math.sin(a) * (T.R - 0.1), 0.85, T.z + Math.cos(a) * (T.R - 0.1), a, 0.12, h - 0.85, 0.2));
      }
      f.add(K.inst('tower-mullions', unitBox, M.mullion, ms, { cast: false }));
      return f;
    };
    addFloor(0, 0, T.lobbyH, 'Tower · lobby', 'البرج · الردهة', true);
    for (let i = 1; i <= T.n; i++) addFloor(i, T.lobbyH + (i - 1) * T.fh, T.fh, `Tower · level ${i}`, `البرج · الطابق ${i}`);
    const topY = T.lobbyH + T.n * T.fh;
    const crown = fg('tower', T.n + 1, 'Tower · crown', 'البرج · التاج', topY);
    {
      const ring = K.mesh('tower-crown-band', K.g(new THREE.CylinderGeometry(T.R + 0.6, T.R + 0.6, T.crownH, high ? 64 : 32, 1, true)), M.white);
      ring.material = M.white; ring.position.set(T.x, 0.85 + T.crownH / 2, T.z); crown.add(ring);
      const slab = K.mesh('tower-roof-slab', slabGeo, M.slab); slab.position.set(T.x, 0.42, T.z); crown.add(slab);
      const roof = K.mesh('tower-roof', K.g(new THREE.CylinderGeometry(T.R + 0.4, T.R + 0.4, 0.4, 40)), M.roof); roof.position.set(T.x, 0.85 + T.crownH - 0.4, T.z); crown.add(roof);
      // logo plaque facing south (the render shows a coloured logo on the crown)
      const lm = [];
      for (let k = 0; k < 3; k++) lm.push(K.mat4(T.x - 3.2 + k * 1.7, 0.85 + T.crownH * 0.32, T.z + T.R + 0.62, 0, 1.1, 1.4, 0.15));
      crown.add(K.inst('tower-logo-letters', unitBox, M.accent, lm, { cast: false }));
      // mast
      const mast = K.mesh('tower-mast', K.g(new THREE.CylinderGeometry(0.18, 0.28, 18, 8)), M.mullion);
      mast.position.set(T.x - 6, 0.85 + T.crownH + 9, T.z - 2); crown.add(mast);
    }
    // glazed lobby pavilion at the foot of the tower (south side)
    {
      const L = fg('tower', 0, 'Tower · entrance pavilion', 'البرج · جناح المدخل');
      const w = 34, d = 13, h = 9.2, z0 = T.z + T.R - 3.5;
      const g1 = K.mesh('lobby-glass', K.box(w, h - 0.8, d), M.glass, { cast: false }); g1.position.set(T.x, (h - 0.8) / 2, z0 + d / 2); L.add(g1);
      const in1 = K.mesh('lobby-interior', K.box(w - 1.2, h - 1.2, d - 1.4), M.interior, { cast: false }); in1.position.set(T.x, (h - 1.2) / 2, z0 + d / 2); L.add(in1);
      const roof = K.mesh('lobby-roof', K.box(w + 1.2, 0.8, d + 1.2), M.slab); roof.position.set(T.x, h - 0.4, z0 + d / 2); L.add(roof);
      const mid = K.mesh('lobby-mezzanine', K.box(w + 0.4, 0.4, d + 0.4), M.slab); mid.position.set(T.x, 4.4, z0 + d / 2); L.add(mid);
      const ms = [];
      for (let k = 0; k <= 15; k++) ms.push(K.mat4(T.x - w / 2 + (k * w) / 15, 0, z0 + d + 0.05, 0, 0.16, h - 0.8, 0.2));
      L.add(K.inst('lobby-mullions', unitBox, M.mullion, ms, { cast: false }));
      // roof garden trees on the pavilion (seen in the render)
      K.shrubs(L, [[T.x - 9, z0 + 4, 2], [T.x - 4, z0 + 6, 1.6], [T.x + 7, z0 + 5, 2.2], [T.x + 11, z0 + 8, 1.6]], { y: h, name: 'lobby-roof-planting' });
    }
    // the sail: a curved white plate that wraps the south-east of the drum and rises above the crown
    {
      const Hs = T.sailH, ns = high ? 46 : 26, na = high ? 16 : 10;
      const st = [];
      for (let k = 0; k <= ns; k++) {
        const s = k / ns, y = Hs * s;
        const tip = smoothstep(0.8, 1, s);
        const sw = Math.sin((Math.PI / 2) * Math.min(1, s / 0.72));
        const ta = (42 - 56 * sw + 36 * tip) * DEG;
        const tb = (172 - 84 * Math.pow(s, 1.15) - 30 * tip) * DEG;
        const r = T.R + 2.4 + 12 * Math.pow(Math.max(0, 1 - y / 26), 2) + 3 * tip;
        const th = 1.1 - 0.5 * s;
        const spread = 8 * (1 - 0.5 * s);           // the sail peels away from the drum towards its east edge
        const rr = (f) => r + spread * f * f;
        const prof = [];
        for (let j = 0; j <= na; j++) { const f = 1 - j / na, a = tb + (ta - tb) * (j / na); prof.push(P(Math.sin(a) * (rr(f) + th / 2), Math.cos(a) * (rr(f) + th / 2), j === 0 || j === na)); }
        for (let j = 0; j <= na; j++) { const f = j / na, a = ta + (tb - ta) * (j / na); prof.push(P(Math.sin(a) * (rr(f) - th / 2), Math.cos(a) * (rr(f) - th / 2), j === 0 || j === na)); }
        st.push({ o: [T.x, y, T.z], U: [1, 0, 0], V: [0, 0, 1], prof });
      }
      const sail = K.mesh('tower-sail', K.loft(st, { caps: true }), M.shell);
      root.add(sail);
    }
  }

  /* ================================================================ BACK BAR */
  {
    const B = BAR;
    const w = B.x1 - B.x0, d = B.z1 - B.z0, cx = (B.x0 + B.x1) / 2, cz = (B.z0 + B.z1) / 2;
    for (let i = 0; i < B.n; i++) {
      const top = i === B.n - 1;
      const f = fg('bar', i, i === 0 ? 'Long building · ground level' : `Long building · level ${i}`, i === 0 ? 'المبنى الطولي · الطابق الأرضي' : `المبنى الطولي · الطابق ${i}`, i * B.fh);
      const inset = top ? 2.2 : 0;
      const slab = K.mesh('bar-slab', K.box(w + 0.8 - inset * 2, 0.7, d + 0.8 - inset * 2), M.slab); slab.position.set(cx, 0.35, cz); f.add(slab);
      // spandrel band (white) and ribbon glazing
      const span = K.mesh('bar-spandrel', K.box(w - inset * 2, 1.0, d - inset * 2), M.white); span.position.set(cx, 1.2, cz); f.add(span);
      const gl = K.mesh('bar-glass', K.box(w - 0.6 - inset * 2, B.fh - 1.7, d - 0.6 - inset * 2), top ? M.glassDark : M.glass, { cast: false });
      gl.position.set(cx, 1.7 + (B.fh - 1.7) / 2, cz); f.add(gl);
      const inn = K.mesh('bar-interior', K.box(w - 2.4 - inset * 2, B.fh - 1.8, d - 2.4 - inset * 2), M.interiorCool, { cast: false });
      inn.position.set(cx, 1.7 + (B.fh - 1.8) / 2, cz); f.add(inn);
      const ms = [];
      const step = top ? 3.2 : 1.6;
      for (let x = B.x0 + inset; x <= B.x1 - inset + 0.01; x += step) {
        ms.push(K.mat4(x, 1.7, B.z1 - inset - 0.25, 0, top ? 0.6 : 0.1, B.fh - 1.7, 0.2));
        ms.push(K.mat4(x, 1.7, B.z0 + inset + 0.25, 0, top ? 0.6 : 0.1, B.fh - 1.7, 0.2));
      }
      f.add(K.inst('bar-mullions', unitBox, top ? M.white : M.mullion, ms, { cast: false }));
      if (top) {
        const roof = K.mesh('bar-roof', K.box(w - inset * 2 + 1, 0.8, d - inset * 2 + 1), M.roof); roof.position.set(cx, B.fh + 0.4, cz); f.add(roof);
        // rooftop plant screens
        const pm = [];
        for (let x = B.x0 + 12; x < B.x1 - 8; x += 22) pm.push(K.mat4(x, B.fh + 0.8, cz, 0, 8, 2.2, 6));
        f.add(K.inst('bar-roof-plant', unitBox, M.white, pm));
      }
    }
  }

  /* ================================================================ WINGS (flowing glazed buildings) */
  {
    const L0 = fg('wings', 0, 'Wings · ground level', 'الأجنحة · الطابق الأرضي');
    const L1 = fg('wings', 1, 'Wings · upper level and roof', 'الأجنحة · الطابق العلوي والسطح');
    const fo = fOf(5.5);
    for (const wg of WINGS) {
      const path = K.arc(C.cx, C.cz, wg.rx, wg.rz, wg.a0 * DEG, wg.a1 * DEG, high ? 60 : 30);
      const par = (t) => { const e = Math.sin(Math.PI * t); return { H: wg.H * (0.82 + 0.18 * e), a: wg.a * (0.85 + 0.15 * e) }; };
      const b1 = 4.6;
      const g0 = K.sweep(path, (t) => { const q = par(t); return bandProfile(() => -(q.a - 2.2), () => q.a - 2.2, 0, b1, 1, { bot: 0, out: 1, top: 0, in: 1 }); }, { caps: true, capMat: 1 });
      L0.add(K.mesh('wing-core', g0, [M.white, M.interior]));
      L0.add(K.mesh('wing-glass-out', glassAlong(path, (t) => par(t).a - 1.95, 0, b1, M.glass, true), M.glass, { cast: false }));
      L0.add(K.mesh('wing-glass-in', glassAlong(path, (t) => -(par(t).a - 1.95), 0, b1, M.glass, false), M.glass, { cast: false }));
      mullionsAlong(path, (t) => par(t).a - 1.9, 0, b1, 2, 'wing-mullions-out', L0);
      mullionsAlong(path, (t) => -(par(t).a - 1.9), 0, b1, 2, 'wing-mullions-in', L0);
      const g1 = K.sweep(path, (t) => { const q = par(t); return bandProfile((v) => -q.a * fo(v, q.H), (v) => q.a * fo(v, q.H), b1, q.H, 7, {}, 1.2); }, { caps: true });
      L1.add(K.mesh('wing-roof-shell', g1, M.shell));
      // upper glazing band inside the roof shell (clerestory)
      L1.add(K.mesh('wing-clerestory', glassAlong(path, (t) => par(t).a * 0.98, b1 + 0.3, b1 + 2.6, M.glassDark, true), M.glassDark, { cast: false }));
    }
  }

  /* ================================================================ OFFICE BLOCK (south-east) */
  {
    const O = OFFICE;
    const westArc = K.arc(O.cx, O.cz, O.r, O.r, Math.PI, 2 * Math.PI, high ? 32 : 18);
    const eastPath = [[O.cx, O.z1], [O.cx + 20, O.z1], [O.cx + 45, O.z1], [O.x1, O.z1], [O.x1, O.cz], [O.x1, O.z0], [O.cx + 45, O.z0], [O.cx + 20, O.z0], [O.cx, O.z0]];
    // densify straight runs for mullions
    const dens = (pts, step) => {
      const out = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
        const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / step));
        for (let k = 0; k < n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
      }
      out.push(pts[pts.length - 1]);
      return out;
    };
    const eastD = dens(eastPath, 2.0);
    const footprint = [...westArc.slice(0, -1), ...eastPath.slice(0, -1)];
    const offset = (pts, d) => pts.map(([x, z]) => {
      // offset outward from the building centre (convex footprint, good enough here)
      const cx = (O.cx + O.x1) / 2 - 8, cz = O.cz;
      let dx = x - cx, dz = z - cz;
      if (x > O.cx + 0.01) { // rectangle part: push along the dominant axis
        const ex = Math.abs(x - O.x1) < 0.5 ? 1 : 0, ez = Math.abs(z - O.z0) < 0.5 ? -1 : Math.abs(z - O.z1) < 0.5 ? 1 : 0;
        return [x + ex * d, z + ez * d];
      }
      // the curved west end keeps a thin slab edge (no balconies)
      const dd = d > 0 ? Math.min(d, 0.45) : d;
      dx = x - O.cx; dz = z - O.cz; const l = Math.hypot(dx, dz) || 1;
      return [x + (dx / l) * dd, z + (dz / l) * dd];
    });
    const slabPts = offset(footprint, 1.6);
    const inPts = offset(footprint, -1.6);
    const slabGeo = K.prism(slabPts, 0, 0.55);
    const roofGeo = K.prism(offset(footprint, 0.4), 0, 0.9);
    const innerGeo = K.prism(inPts, 0, 1);
    const rnd = makeRng(55);
    for (let i = 0; i < O.n; i++) {
      const f = fg('office', i, i === 0 ? 'Office block · ground level' : `Office block · level ${i}`, i === 0 ? 'مبنى المكاتب · الطابق الأرضي' : `مبنى المكاتب · الطابق ${i}`, i * O.fh);
      f.add(K.mesh('office-slab', slabGeo, M.slab));
      const inn = K.mesh('office-interior', innerGeo, M.interiorCool, { cast: false }); inn.scale.y = O.fh - 0.7; inn.position.y = 0.55; f.add(inn);
      // west end: curved solid wall with scattered small windows
      f.add(K.mesh('office-west-wall', K.sweep(westArc, () => [P(-0.35, 0.55, 1), P(0.35, 0.55, 1), P(0.35, O.fh, 1), P(-0.35, O.fh, 1)], { caps: true }), M.white));
      const wins = [];
      for (let k = 2; k < westArc.length - 2; k += 1) {
        if (rnd() < 0.55) continue;
        const [x, z] = westArc[k];
        const a = Math.atan2(x - O.cx, z - O.cz);
        wins.push(K.mat4(x + Math.sin(a) * 0.36, 1.2 + rnd() * 1.6, z + Math.cos(a) * 0.36, a, 0.7 + rnd() * 0.5, 0.7 + rnd() * 0.4, 0.06));
      }
      if (wins.length) f.add(K.inst('office-west-windows', unitBox, M.glassDark, wins, { cast: false }));
      // east part: full-height glazing set back behind balconies
      f.add(K.mesh('office-glass', glassAlong(eastD, () => -0.2, 0.55, O.fh, M.glass, true), M.glass, { cast: false }));
      f.add(K.mesh('office-balustrade', glassAlong(eastD, () => 1.45, 0.55, 1.6, M.rail, true), M.rail, { cast: false }));
      const ms = [];
      for (let k = 0; k < eastD.length; k += 1) ms.push(K.mat4(eastD[k][0], 0.55, eastD[k][1], 0, 0.12, O.fh - 0.55, 0.12));
      f.add(K.inst('office-mullions', unitBox, M.mullion, ms, { cast: false }));
      if (i === O.n - 1) {
        const roof = K.mesh('office-roof', roofGeo, M.roof); roof.position.y = O.fh; f.add(roof);
      }
    }
    // pilotis at ground level along the south front
    const pil = [];
    for (let x = O.cx + 4; x < O.x1; x += 8) pil.push(K.mat4(x, 0, O.z1 + 1.2, 0, 0.6, O.fh, 0.6));
    floors.find((f) => f.name === 'office-L0').add(K.inst('office-columns', unitBox, M.white, pil));
  }

  /* ================================================================ PERFORATED PAVILIONS (south) */
  const pavPaths = [];
  {
    const levels = [
      fg('pavilions', 0, 'Pavilions · ground level', 'الجناحان · الطابق الأرضي'),
      fg('pavilions', 1, 'Pavilions · level 1', 'الجناحان · الطابق 1'),
      fg('pavilions', 2, 'Pavilions · upper level and roof', 'الجناحان · الطابق العلوي والسطح'),
    ];
    const fo = fOf(1.9), fi = fOf(2.2);
    for (const pv of PAVS) {
      const n = high ? 120 : 60;
      const path = K.arc(pv.cx, pv.cz, pv.rx, pv.rz, 0, Math.PI * 2, n).slice(0, -1);
      pavPaths.push({ pv, path });
      const par = (t) => {
        const a = t * Math.PI * 2;
        const H = 20 + 6 * Math.sin(2 * a + pv.phase) + 2.5 * Math.cos(3 * a + pv.seed);
        const w = pv.a + 5 * Math.sin(a + pv.phase * 0.7);
        return { H, w, b1: 9, b2: 9 + (H - 9) * 0.42 };
      };
      const g0 = K.sweep(path, (t) => { const q = par(t); return bandProfile(() => -(q.w - 2.6), () => q.w - 2.6, 0, q.b1, 1, { bot: 0, out: 1, top: 0, in: 1 }); }, { closed: true });
      levels[0].add(K.mesh(`${pv.id}-core`, g0, [M.white, M.interior]));
      levels[0].add(K.mesh(`${pv.id}-glass-out`, glassAlong(path, (t) => par(t).w - 2.35, 0, 9, M.glass, true, { closed: true }), M.glass, { cast: false }));
      levels[0].add(K.mesh(`${pv.id}-glass-in`, glassAlong(path, (t) => -(par(t).w - 2.35), 0, 9, M.glass, false, { closed: true }), M.glass, { cast: false }));
      mullionsAlong(path, (t) => par(t).w - 2.3, 0, 9, 1, `${pv.id}-mullions`, levels[0]);
      const sw = (q) => q.w + 2.4;
      const g1 = K.sweep(path, (t) => { const q = par(t); return bandProfile((v) => -sw(q) * fi(v, q.H), (v) => sw(q) * fo(v, q.H), q.b1, q.b2, 5, { bot: 1, out: 0, top: 0, in: 0 }); }, { closed: true });
      const g2 = K.sweep(path, (t) => { const q = par(t); return bandProfile((v) => -sw(q) * fi(v, q.H), (v) => sw(q) * fo(v, q.H), q.b2, q.H, 9, {}, 1.2); }, { closed: true });
      levels[1].add(K.mesh(`${pv.id}-shell-L1`, g1, [M.perf, M.white]));
      levels[2].add(K.mesh(`${pv.id}-shell-L2`, g2, M.perf));
    }
  }

  /* ================================================================ SKY BRIDGE */
  {
    const ctrl = [[-46, 18, 82], [-30, 21, 86], [-10, 23, 79], [10, 22.5, 68], [28, 19, 60], [44, 16, 62]];
    const path = K.spline(ctrl, high ? 70 : 36);
    const prof = [
      P(-2.4, 0.9, 1, 0), P(-1.6, 0, 0, 0), P(1.6, 0, 0, 0), P(2.4, 0.9, 1, 1),
      P(2.4, 3.6, 1, 0), P(2.0, 4.2, 0, 0), P(-2.0, 4.2, 0, 0), P(-2.4, 3.6, 1, 1),
    ];
    const geo = K.sweep(path, () => prof, { caps: true, capMat: 0 });
    const bridge = K.mesh('sky-bridge', geo, [M.shell, M.glass]);
    root.add(bridge);
    // a white ribbon fin along the south edge (the render's sweeping edge)
    const fin = K.sweep(path, (t) => { const e = Math.sin(Math.PI * t); return [P(2.2, -0.5, 1), P(3.6 + 1.6 * e, 0.3, 1), P(3.6 + 1.6 * e, 0.7, 1), P(2.2, 0.9, 1)]; }, { caps: true });
    root.add(K.mesh('sky-bridge-ribbon', fin, M.shell));
    const deck = K.sweep(path, () => [P(-2.2, 0.9, 1), P(2.2, 0.9, 1), P(2.2, 1.0, 1), P(-2.2, 1.0, 1)], { caps: true });
    root.add(K.mesh('sky-bridge-floor', deck, M.paving, { cast: false }));
    const ceil = K.sweep(path, () => [P(-0.5, 3.75, 1), P(0.5, 3.75, 1), P(0.5, 3.85, 1), P(-0.5, 3.85, 1)], { caps: true });
    root.add(K.mesh('sky-bridge-light-line', ceil, K.lampMat('campus-bridge-light', 0xfff0d6, 1.6), { cast: false }));
  }

  /* ================================================================ COURT, GATE, POOLS */
  {
    // paved spine from the gate to the tower
    const spine = [];
    const sp = K.spline([[0, -34], [-3, -55], [3, -80], [-2, -105], [0, -128], [0, -140]], 40);
    const left = [], right = [];
    sp.forEach(([x, z], i) => { const w = 6 + 2.5 * Math.sin(i * 0.45); left.push([x - w, z]); right.push([x + w, z]); });
    spine.push(...left, ...right.reverse());
    site.add(K.mesh('court-spine-paving', K.flat(spine, 0.26), M.paving, { cast: false }));
    // court planting base (inside the horseshoe)
    const court = K.arc(C.cx, C.cz, C.rx - 17, C.rz - 17, 0, Math.PI * 2, 64).slice(0, -1);
    site.add(K.mesh('court-meadow-grass', K.flat(court, 0.16), M.meadow, { cast: false }));
    // glass teardrop pavilion with a white fin
    const tp = [-24, -100];
    const lathe = [];
    for (let i = 0; i <= 14; i++) { const t = i / 14; lathe.push(new THREE.Vector2(12.5 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.98 + 0.02)), 0.8) * (1 - 0.55 * t) + 0.01, 20 * t)); }
    const tgeo = K.g(new THREE.LatheGeometry(lathe, high ? 14 : 10));
    const tear = K.mesh('court-pavilion-glass', tgeo, K.glass('campus-pavilion-glazing', 0x9cc0d0, { opacity: 0.45, side: THREE.DoubleSide }), { cast: false });
    tear.position.set(tp[0], 0, tp[1]); tear.rotation.z = 0.12; root.add(tear);
    const tin = K.mesh('court-pavilion-interior', K.g(new THREE.CylinderGeometry(8, 9.5, 3.2, 16)), M.interior, { cast: false }); tin.position.set(tp[0], 1.6, tp[1]); root.add(tin);
    {
      const st = [];
      const ns = 24;
      for (let k = 0; k <= ns; k++) {
        const s = k / ns, y = 22.5 * s;
        const r = 12.9 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 0.9 + 0.05)), 0.7) * (1 - 0.45 * s) + 0.6;
        const a0 = (40 + 30 * s) * DEG, a1 = (150 - 60 * s) * DEG;
        const prof = [];
        const na = 8;
        for (let j = 0; j <= na; j++) { const a = a1 + (a0 - a1) * (j / na); prof.push(P(Math.sin(a) * (r + 0.4), Math.cos(a) * (r + 0.4), j === 0 || j === na)); }
        for (let j = 0; j <= na; j++) { const a = a0 + (a1 - a0) * (j / na); prof.push(P(Math.sin(a) * r, Math.cos(a) * r, j === 0 || j === na)); }
        st.push({ o: [tp[0] + 1.2, y, tp[1]], U: [1, 0, 0], V: [0, 0, 1], prof });
      }
      root.add(K.mesh('court-pavilion-fin', K.loft(st, { caps: true }), M.shell));
    }
    // flat white block (east of the spine) and terraced glass steps on the inner east side
    const blk = K.mesh('court-block', K.box(24, 6.5, 18), M.white); blk.position.set(24, 3.25, -86); root.add(blk);
    const blkG = K.mesh('court-block-glazing', K.box(24.2, 1.6, 18.2), M.glassDark, { cast: false }); blkG.position.set(24, 4.2, -86); root.add(blkG);
    {
      const path = K.arc(C.cx, C.cz, C.rx - 27, C.rz - 27, 52 * DEG, 98 * DEG, 24);
      for (let k = 0; k < 3; k++) {
        const h0 = k * 3.4, u0 = -2 - k * 4.5;
        const g = K.sweep(path, () => [P(u0 - 4.5, h0, 1, 0), P(2, h0, 1, 0), P(2, h0 + 3.4, 1, 0), P(u0 - 4.5, h0 + 3.4, 1, 1)], { caps: true });
        root.add(K.mesh(`court-terrace-${k}`, g, [M.slab, M.glass]));
      }
    }
    // gate building between the arm ends and the reflecting pools
    const gate = new THREE.Group(); gate.name = 'gate'; root.add(gate);
    const gz = C.cz + C.rz + 2;
    const gb = K.mesh('gate-glass', K.box(15, 7, 8), M.glass, { cast: false }); gb.position.set(0, 3.5, gz); gate.add(gb);
    const gi = K.mesh('gate-interior', K.box(14, 6.6, 7), M.interior, { cast: false }); gi.position.set(0, 3.3, gz); gate.add(gi);
    const gr = K.mesh('gate-roof', K.box(17, 0.8, 10), M.slab); gr.position.set(0, 7.4, gz); gate.add(gr);
    const gf = K.mesh('gate-frame', K.box(17, 9, 1.2), M.white); gf.position.set(0, 4.5, gz - 4.6); gate.add(gf);
    for (const s of [-1, 1]) {
      const pool = K.arc(C.cx, C.cz, C.rx + 17, C.rz + 17, s * 6 * DEG, s * 42 * DEG, 24);
      const g = K.sweep(pool, () => [P(-4, 0.05, 1), P(4, 0.05, 1), P(4, 0.24, 1), P(-4, 0.24, 1)], { caps: true });
      site.add(K.mesh(`pool-${s < 0 ? 'west' : 'east'}`, g, M.water, { cast: false }));
      const rim = K.sweep(pool, () => [P(-4.8, 0.02, 1), P(4.8, 0.02, 1), P(4.8, 0.18, 1), P(-4.8, 0.18, 1)], { caps: true });
      site.add(K.mesh(`pool-rim-${s}`, rim, M.paving, { cast: false }));
    }
    // court water channel
    const ch = K.spline([[-14, -88], [-20, -76], [-12, -62], [-6, -50]], 22);
    site.add(K.mesh('court-water-channel', K.sweep(ch, () => [P(-1.4, 0.05, 1), P(1.4, 0.05, 1), P(1.4, 0.3, 1), P(-1.4, 0.3, 1)], { caps: true }), M.water, { cast: false }));
    // forecourt paving before the gate
    site.add(K.mesh('gate-forecourt-paving', K.flat([[-26, -40], [26, -40], [22, -24], [-22, -24]], 0.26), M.paving, { cast: false }));
  }

  /* ================================================================ GROUND, ROADS */
  {
    const S = { x0: -250, x1: 250, z0: -255, z1: 250 };
    site.add(K.mesh('site-lawn-grass', K.flat([[S.x0, S.z0], [S.x1, S.z0], [S.x1, S.z1], [S.x0, S.z1]], 0.1), M.lawn, { cast: false }));
    // E-W road with sidewalks, through the roundabout
    const ewN = [[S.x0, ROAD.z0], [S.x1, ROAD.z0], [S.x1, ROAD.z1], [S.x0, ROAD.z1]];
    site.add(K.mesh('road-ew-asphalt', K.flat(ewN, 0.2), M.asphalt, { cast: false }));
    site.add(K.mesh('road-ew-kerb-n', K.flat([[S.x0, ROAD.z0 - 3], [S.x1, ROAD.z0 - 3], [S.x1, ROAD.z0], [S.x0, ROAD.z0]], 0.3), M.kerb, { cast: false }));
    site.add(K.mesh('road-ew-kerb-s', K.flat([[S.x0, ROAD.z1], [S.x1, ROAD.z1], [S.x1, ROAD.z1 + 3], [S.x0, ROAD.z1 + 3]], 0.3), M.kerb, { cast: false }));
    // roundabout: asphalt ring and planted island
    const rb = K.g(new THREE.RingGeometry(ROAD.rbIsland, ROAD.rbR, 64, 1)); rb.rotateX(-Math.PI / 2); rb.translate(ROAD.rbx, 0.21, ROAD.rbz);
    site.add(K.mesh('roundabout-asphalt', rb, M.asphalt, { cast: false }));
    const isl = K.g(new THREE.CylinderGeometry(ROAD.rbIsland, ROAD.rbIsland + 0.2, 0.35, 48)); isl.translate(ROAD.rbx, 0.3, ROAD.rbz);
    site.add(K.mesh('roundabout-island-soil', isl, M.soil, { cast: false }));
    const isl2 = K.g(new THREE.CylinderGeometry(ROAD.rbIsland - 3.5, ROAD.rbIsland - 3, 0.5, 40)); isl2.translate(ROAD.rbx, 0.4, ROAD.rbz);
    site.add(K.mesh('roundabout-island-planting-shrub-bed', isl2, M.beds, { cast: false }));
    // boulevard south (two carriageways, tree median) and access road north to the gate
    const [bi, bo] = ROAD.blvd;
    for (const s of [-1, 1]) {
      site.add(K.mesh('boulevard-asphalt', K.flat([[s * bi, ROAD.z1], [s * bo, ROAD.z1], [s * bo, S.z1], [s * bi, S.z1]], 0.2), M.asphalt, { cast: false }));
      site.add(K.mesh('boulevard-kerb', K.flat([[s * bo, ROAD.z1 + 3], [s * (bo + 3), ROAD.z1 + 3], [s * (bo + 3), S.z1], [s * bo, S.z1]], 0.3), M.kerb, { cast: false }));
    }
    site.add(K.mesh('access-road-asphalt', K.flat([[-8, -24], [8, -24], [9, ROAD.z0], [-9, ROAD.z0]], 0.2), M.asphalt, { cast: false }));
    // lane markings (dashes)
    const dashes = [];
    for (let x = S.x0 + 4; x < S.x1; x += 9) { if (Math.abs(x) < ROAD.rbR + 2) continue; dashes.push(K.mat4(x, 0.2, (ROAD.z0 + ROAD.z1) / 2, Math.PI / 2, 0.18, 0.02, 3.2)); }
    for (let z = ROAD.z1 + 10; z < S.z1; z += 9) for (const s of [-1, 1]) dashes.push(K.mat4(s * (bi + bo) / 2, 0.2, z, 0, 0.18, 0.02, 3.2));
    site.add(K.inst('road-mark-dashes', unitBox, M.marking, dashes, { cast: false, receive: true }));
    // crossings near the roundabout
    const zebra = [];
    for (let k = -3; k <= 3; k++) { zebra.push(K.mat4(ROAD.rbR + 6, 0.2, ROAD.rbz + k * 1.6, Math.PI / 2, 0.7, 0.02, 4)); zebra.push(K.mat4(-ROAD.rbR - 6, 0.2, ROAD.rbz + k * 1.6, Math.PI / 2, 0.7, 0.02, 4)); }
    site.add(K.inst('road-mark-crossings', unitBox, M.marking, zebra, { cast: false }));

    // meandering earth paths through the grounds (terracotta gravel in the render)
    const paths = [
      [[-200, -40], [-160, -20], [-120, -36], [-96, -14], [-60, -22], [-30, -30]],
      [[-210, -120], [-170, -100], [-150, -60], [-170, -30]],
      [[-60, 150], [-100, 140], [-160, 150], [-210, 130]],
      [[170, -110], [140, -90], [130, -70]],
      [[30, 150], [60, 140], [90, 150], [140, 160], [190, 150]],
    ];
    paths.forEach((ctrl, i) => {
      const p = K.spline(ctrl, 40);
      site.add(K.mesh(`grounds-gravel-path-${i}`, K.sweep(p, () => [P(-1.8, 0.05, 1), P(1.8, 0.05, 1), P(1.8, 0.2, 1), P(-1.8, 0.2, 1)], { caps: true }), M.path, { cast: false }));
    });
    // planted beds in the court
    const bedSpots = [[-40, -120, 14, 9], [-50, -80, 10, 16], [44, -98, 9, 12], [14, -122, 12, 8], [-8, -64, 8, 6]];
    bedSpots.forEach(([x, z, rx, rz], i) => site.add(K.mesh(`court-planting-shrub-bed-${i}`, K.flat(K.arc(x, z, rx, rz, 0, Math.PI * 2, 20).slice(0, -1), 0.22), M.beds, { cast: false })));
    // the pavilions' courtyards: lawns
    for (const { pv } of pavPaths) site.add(K.mesh(`${pv.id}-courtyard-lawn-grass`, K.flat(K.arc(pv.cx, pv.cz, pv.rx - 16, pv.rz - 16, 0, Math.PI * 2, 40).slice(0, -1), 0.16), M.meadow, { cast: false }));
  }

  /* ================================================================ VEGETATION */
  {
    const rnd = makeRng(808);
    const ell = (x, z, cx, cz, rx, rz) => Math.hypot((x - cx) / rx, (z - cz) / rz);
    const inRect = (x, z, x0, x1, z0, z1) => x > x0 && x < x1 && z > z0 && z < z1;
    const nearPath = (x, z, path, d) => { for (let i = 0; i < path.length; i += 2) if (Math.hypot(path[i][0] - x, path[i][1] - z) < d) return true; return false; };
    const blocked = (x, z) => {
      const rc = ell(x, z, C.cx, C.cz, C.rx, C.rz);
      if (rc > 0.72 && rc < 1.3 && z < C.cz + C.rz + 10) return true;         // horseshoe + wings band
      if (rc <= 0.72) return true;                                           // court (planted separately)
      {
        const phi = Math.atan2(x - C.cx, z - C.cz) / DEG;
        for (const wg of WINGS) {
          if (phi < wg.a0 - 4 || phi > wg.a1 + 4) continue;
          const rw = ell(x, z, C.cx, C.cz, wg.rx, wg.rz);
          if (Math.abs(rw - 1) * wg.rx < wg.a + 5) return true;
        }
      }
      if (Math.abs(x) < 34 && z > -48 && z < 0) return true;                  // gate forecourt, pools, access
      if (Math.hypot(x - TOWER.x, z - TOWER.z) < 30) return true;
      if (inRect(x, z, BAR.x0 - 5, BAR.x1 + 5, BAR.z0 - 5, BAR.z1 + 6)) return true;
      if (inRect(x, z, OFFICE.cx - OFFICE.r - 5, OFFICE.x1 + 5, OFFICE.z0 - 6, OFFICE.z1 + 5)) return true;
      if (z > ROAD.z0 - 5 && z < ROAD.z1 + 5) return true;
      if (Math.hypot(x - ROAD.rbx, z - ROAD.rbz) < ROAD.rbR + 4) return true;
      if (z > ROAD.z1 && Math.abs(x) < ROAD.blvd[1] + 5) return true;
      for (const { pv } of pavPaths) { const r = ell(x, z, pv.cx, pv.cz, pv.rx, pv.rz); if (r > 0.55 && r < 1.45) return true; }
      return false;
    };
    const big = [];
    const N = high ? 1250 : 420;
    let tries = 0;
    while (big.length < N && tries < 40000) {
      tries++;
      const x = -246 + rnd() * 492, z = -250 + rnd() * 496;
      if (blocked(x, z)) continue;
      const grove = 0.5 + 0.5 * Math.sin(x * 0.045 + 1.3) * Math.cos(z * 0.04 - 0.7);
      if (rnd() > 0.45 + 0.55 * grove) continue;
      big.push([x, z, 9 + rnd() * 6, 1.0 + rnd() * 0.35]);
    }
    // avenues: boulevard median and both verges; along the E-W road
    for (let z = ROAD.z1 + 8; z < 236; z += 10) {
      big.push([0, z, 7 + rnd() * 2, 0.75]);
      big.push([-(ROAD.blvd[1] + 5.5), z + 4, 9 + rnd() * 2, 0.95]);
      big.push([ROAD.blvd[1] + 5.5, z + 2, 9 + rnd() * 2, 0.95]);
    }
    for (let x = -232; x < 236; x += 12) { if (Math.abs(x) < 40) continue; if (x < OFFICE.cx - 30 || x > OFFICE.x1 + 4) big.push([x, ROAD.z0 - 6.5, 8 + rnd() * 2, 0.9]); big.push([x + 5, ROAD.z1 + 6.5, 8 + rnd() * 2, 0.9]); }
    // court trees (lush, smaller)
    const court = [];
    for (let i = 0; i < (high ? 70 : 34); i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.68;
      const x = C.cx + Math.sin(a) * C.rx * r, z = C.cz + Math.cos(a) * C.rz * r;
      if (Math.abs(x) < 9 || Math.hypot(x + 24, z + 100) < 16 || inRect(x, z, 10, 38, -97, -75) || Math.hypot(x, z - TOWER.z) < 28) continue;
      court.push([x, z, 5 + rnd() * 4, 0.9]);
    }
    // pavilion courtyard trees
    for (const { pv } of pavPaths) {
      for (let i = 0; i < (high ? 26 : 12); i++) {
        const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.42;
        court.push([pv.cx + Math.sin(a) * pv.rx * r, pv.cz + Math.cos(a) * pv.rz * r, 6 + rnd() * 4, 1]);
      }
    }
    // roundabout island
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; court.push([ROAD.rbx + Math.sin(a) * 6, ROAD.rbz + Math.cos(a) * 6, 4 + rnd() * 2, 0.8]); }
    K.trees(site, big, { seed: 31, name: 'grounds-trees' });
    K.trees(site, court, { seed: 47, name: 'court-trees', palette: [0x6e8f45, 0x7d9a4e, 0x5e7f3f, 0x86a35a] });
    // palms by the tower and along the office front (slim palms in the render)
    const palmSpots = [[-18, -142, 9], [-12, -136, 8], [17, -140, 9], [22, -134, 8], [-10, -45, 7], [10, -45, 7]];
    for (let x = OFFICE.cx + 2; x < OFFICE.x1; x += 9) palmSpots.push([x, OFFICE.z1 + 5, 8 + rnd() * 2]);
    K.palms(site, palmSpots, { seed: 5, name: 'campus-palms' });
    // shrubs: court beds, roundabout, along the horseshoe foot
    const sh = [];
    for (let i = 0; i < (high ? 220 : 90); i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.7;
      const x = C.cx + Math.sin(a) * C.rx * r, z = C.cz + Math.cos(a) * C.rz * r;
      if (Math.abs(x) < 8 || Math.hypot(x, z - TOWER.z) < 26) continue;
      sh.push([x, z, 1 + rnd() * 1.8]);
    }
    for (let i = 0; i < 24; i++) { const a = rnd() * Math.PI * 2, r = 3 + rnd() * 5; sh.push([ROAD.rbx + Math.sin(a) * r, ROAD.rbz + Math.cos(a) * r, 1 + rnd()]); }
    for (const path of ringPaths) for (let i = 2; i < path.length - 2; i += 3) {
      const [x, z] = path[i]; const dx = x - C.cx, dz = (z - C.cz) * (C.rx / C.rz); const l = Math.hypot(dx, dz) || 1;
      sh.push([x + (dx / l) * 19, z + (dz / l) * 19 * (C.rz / C.rx), 1.4 + rnd()]);
    }
    K.shrubs(site, sh, { seed: 17, name: 'campus-shrubs' });
  }

  /* ================================================================ CONTEXT: city blocks at the edge of the grounds */
  {
    const rnd = makeRng(1201);
    const bodies = [], roofs = [];
    const add = (x, z, w, d, h) => { bodies.push(K.mat4(x, 0, z, 0, w, h, d)); roofs.push(K.mat4(x, h, z, 0, w + 0.6, 0.5, d + 0.6)); };
    for (let z = -240; z >= -300; z -= 22) for (let x = -250; x <= 250; x += 17) { if (rnd() < 0.3) continue; add(x + rnd() * 6, z + rnd() * 6, 9 + rnd() * 8, 9 + rnd() * 7, 5 + rnd() * 10); }
    for (let z = -215; z <= 240; z += 21) for (const s of [-1, 1]) { if (rnd() < 0.35 || (z > -5 && z < 30)) continue; add(s * (236 + rnd() * 6), z, 10 + rnd() * 6, 12 + rnd() * 8, 5 + rnd() * 8); }
    for (let x = -236; x <= 236; x += 22) { if (Math.abs(x) < 34 || rnd() < 0.3) continue; add(x, 240 + rnd() * 4, 12 + rnd() * 6, 9 + rnd() * 4, 6 + rnd() * 5); }
    site.add(K.inst('context-blocks', unitBox, M.context, bodies), K.inst('context-roofs', unitBox, M.contextRoof, roofs));
    const ct = [];
    for (let i = 0; i < (high ? 160 : 60); i++) ct.push([-250 + rnd() * 500, -244 - rnd() * 60, 8 + rnd() * 5, 1]);
    K.trees(site, ct, { seed: 77, name: 'context-trees' });
    site.add(K.mesh('context-ground-paving', K.flat([[-255, -255], [255, -255], [255, -305], [-255, -305]], 0.1), M.contextRoof, { cast: false }));
  }

  /* ================================================================ CARS, LAMPS, NIGHT LIGHTS */
  {
    const rnd = makeRng(64);
    const list = [];
    for (let i = 0; i < 14; i++) { const x = -225 + rnd() * 450; if (Math.abs(x) < ROAD.rbR + 4) continue; const north = rnd() < 0.5; list.push([x, north ? ROAD.z0 + 4 : ROAD.z1 - 4, north ? -Math.PI / 2 : Math.PI / 2]); }
    for (let i = 0; i < 12; i++) { const z = ROAD.z1 + 12 + rnd() * 200; const east = rnd() < 0.5; list.push([east ? (ROAD.blvd[0] + ROAD.blvd[1]) / 2 + 2 : -(ROAD.blvd[0] + ROAD.blvd[1]) / 2 - 2, z, east ? Math.PI : 0]); }
    list.push([ROAD.rbx + 18, ROAD.rbz + 6, 2.2], [ROAD.rbx - 16, ROAD.rbz - 10, -0.9]);
    K.cars(site, list, { name: 'campus-cars' });
    const posts = [];
    for (let x = -220; x <= 220; x += 24) { if (Math.abs(x) < ROAD.rbR + 4) continue; posts.push([x, ROAD.z0 - 1.6, 0], [x + 12, ROAD.z1 + 1.6, Math.PI]); }
    for (let z = ROAD.z1 + 14; z < 236; z += 22) posts.push([-1.2, z, -Math.PI / 2], [1.2, z + 11, Math.PI / 2]);
    K.lampPosts(site, posts, { h: 8, name: 'campus-street-lamps' });
    K.light(site, 'light-gate', 0, 6, C.cz + C.rz + 10, 110, 40);
    K.light(site, 'light-court-west', -30, 7, -96, 120, 46);
    K.light(site, 'light-court-east', 30, 7, -96, 110, 46);
    K.light(site, 'light-tower-foot', 0, 6, TOWER.z + 22, 140, 44);
    K.light(site, 'light-roundabout', ROAD.rbx, 7, ROAD.rbz, 120, 46);
    K.light(site, 'light-bridge', 0, 12, 94, 130, 40);
    K.light(site, 'light-office', OFFICE.cx + 30, 6, OFFICE.z1 + 8, 100, 40);
    // sail uplight
    const sl = new THREE.SpotLight(0xfff1dc, 0, 120, 0.5, 0.7, 1.3);
    sl.name = 'sail-uplight';
    sl.position.set(TOWER.x + 30, 0.6, TOWER.z + 30);
    sl.target.position.set(TOWER.x + 8, 40, TOWER.z + 8);
    sl.userData.nightIntensity = 700;
    site.add(sl, sl.target); K.lamps.push(sl);
  }

  floors.sort((a, b) => a.userData.level - b.userData.level);

  root.add(site);
  return {
    root, floors, site,
    nightMaterials: K.nightMaterials,
    lamps: K.lamps,
    update(dt, t) {
      const n = K.waterNormal();
      if (n) { n.offset.x = (t * 0.01) % 1; n.offset.y = (t * 0.006) % 1; }
    },
    dispose() { K.dispose(); root.removeFromParent(); },
  };
}
