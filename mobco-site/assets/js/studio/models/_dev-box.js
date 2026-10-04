// MOBCO Project Builder · _dev-box.js
// Temporary development model used to build and test the engine before the five real model modules
// land. It honours the MODEL MODULE CONTRACT exactly (see docs/requests/studio.md). It is NOT listed in
// the studio UI (only reachable with studio.html?dev=1 or ?model=_dev-box).

export const meta = {
  id: '_dev-box',
  name: { en: 'Development Block', ar: 'كتلة التطوير' },
  projectSlug: null,
  tagline: { en: 'A test massing for the studio engine', ar: 'كتلة اختبارية لمحرّك الاستوديو' },
  descriptors: [
    { label: { en: 'Typology', ar: 'النمط' }, value: { en: 'Tower on a podium', ar: 'برج فوق منصّة' } },
    { label: { en: 'Massing', ar: 'الكتلة' }, value: { en: 'Two stacked volumes', ar: 'كتلتان متراكبتان' } },
    { label: { en: 'Features', ar: 'العناصر' }, value: { en: 'Glazed levels, garden, pool', ar: 'طوابق زجاجية وحديقة ومسبح' } },
  ],
  camera: {
    target: [0, 14, 0],
    aerial: [78, 62, 96],
    street: [36, 3.2, 62],
    top: [0, 150, 0.01],
    front: [0, 18, 104],
  },
  hotspots: [
    { id: 'tower', position: [0, 42, 0], title: { en: 'Tower crown', ar: 'تاج البرج' }, text: { en: 'The upper volume steps back from the podium edge.', ar: 'تتراجع الكتلة العلوية عن حافة المنصّة.' } },
    { id: 'podium', position: [-20, 8, 12], title: { en: 'Podium', ar: 'المنصّة' }, text: { en: 'A low base that frames the street frontage.', ar: 'قاعدة منخفضة تؤطّر الواجهة المطلّة على الشارع.' } },
    { id: 'garden', position: [24, 1, 26], title: { en: 'Garden & pool', ar: 'الحديقة والمسبح' }, text: { en: 'Landscaped grounds around a shallow pool.', ar: 'مساحات خضراء منسّقة حول مسبح ضحل.' } },
  ],
  sun: { azimuth: 140, elevation: 42 },
};

export function build(THREE, ctx = {}) {
  const high = ctx.quality !== 'low';
  const geos = [], mats = [];
  const g = (x) => (geos.push(x), x);
  const m = (x) => (mats.push(x), x);

  const stone = m(new THREE.MeshStandardMaterial({ name: 'stone', color: 0xf1ede6, roughness: 0.72, metalness: 0.02 }));
  const slabMat = m(new THREE.MeshStandardMaterial({ name: 'slab', color: 0xe6e1d8, roughness: 0.8 }));
  const glass = m(new THREE.MeshPhysicalMaterial({
    name: 'glass', color: 0x9fb8c6, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.42,
    envMapIntensity: 1.2, envMap: ctx.envMap || null,
  }));
  const glow = m(new THREE.MeshStandardMaterial({ name: 'interior-glow', color: 0x2a2f33, emissive: 0xffd9a0, emissiveIntensity: 0, roughness: 1 }));
  const mullion = m(new THREE.MeshStandardMaterial({ name: 'mullion', color: 0x9aa6ad, roughness: 0.4, metalness: 0.6 }));
  const accent = m(new THREE.MeshStandardMaterial({ name: 'accent', color: 0x5fb2b8, roughness: 0.45 }));
  const paving = m(new THREE.MeshStandardMaterial({ name: 'paving', color: 0xd8d3ca, roughness: 0.95 }));
  const grass = m(new THREE.MeshStandardMaterial({ name: 'grass', color: 0xa9b79a, roughness: 1 }));
  const water = m(new THREE.MeshStandardMaterial({ name: 'water', color: 0x5fb3c4, roughness: 0.12, metalness: 0.1, emissive: 0x3fd0d8, emissiveIntensity: 0 }));
  const foliage = m(new THREE.MeshStandardMaterial({ name: 'foliage', color: 0x8fa58a, roughness: 0.9, flatShading: true }));
  const trunk = m(new THREE.MeshStandardMaterial({ name: 'trunk', color: 0x8a7a68, roughness: 1 }));
  const lampHead = m(new THREE.MeshStandardMaterial({ name: 'lamp-head', color: 0xffffff, emissive: 0xffe2b0, emissiveIntensity: 0 }));

  const root = new THREE.Group(); root.name = 'dev-box';
  const floors = [];
  const FH = 3.6;

  function addFloor(parent, { w, d, y, level, buildingId, label }) {
    const fg = new THREE.Group();
    fg.name = `${buildingId}-L${level}`;
    fg.position.y = y;
    fg.userData = { level, label, buildingId };
    const slab = new THREE.Mesh(g(new THREE.BoxGeometry(w, 0.45, d)), slabMat);
    slab.name = 'slab'; slab.position.y = 0.225; slab.castShadow = slab.receiveShadow = true; fg.add(slab);
    const core = new THREE.Mesh(g(new THREE.BoxGeometry(w - 1.6, FH - 0.5, d - 1.6)), glow);
    core.name = 'interior'; core.position.y = 0.45 + (FH - 0.5) / 2; core.receiveShadow = true; fg.add(core);
    const skin = new THREE.Mesh(g(new THREE.BoxGeometry(w - 0.4, FH - 0.45, d - 0.4)), glass);
    skin.name = 'glazing'; skin.position.y = 0.45 + (FH - 0.45) / 2; fg.add(skin);
    // mullions (instanced)
    const perSide = Math.max(2, Math.round(w / 3));
    const perDepth = Math.max(2, Math.round(d / 3));
    const total = (perSide + perDepth) * 2;
    const mg = g(new THREE.BoxGeometry(0.18, FH - 0.45, 0.18));
    const inst = new THREE.InstancedMesh(mg, mullion, total);
    inst.name = 'mullions'; inst.castShadow = true;
    const mtx = new THREE.Matrix4(); let k = 0;
    const yy = 0.45 + (FH - 0.45) / 2;
    for (let i = 0; i < perSide; i++) {
      const x = -w / 2 + 0.2 + (i * (w - 0.4)) / (perSide - 1);
      mtx.makeTranslation(x, yy, d / 2 - 0.2); inst.setMatrixAt(k++, mtx);
      mtx.makeTranslation(x, yy, -d / 2 + 0.2); inst.setMatrixAt(k++, mtx);
    }
    for (let i = 0; i < perDepth; i++) {
      const z = -d / 2 + 0.2 + (i * (d - 0.4)) / (perDepth - 1);
      mtx.makeTranslation(w / 2 - 0.2, yy, z); inst.setMatrixAt(k++, mtx);
      mtx.makeTranslation(-w / 2 + 0.2, yy, z); inst.setMatrixAt(k++, mtx);
    }
    inst.instanceMatrix.needsUpdate = true;
    fg.add(inst);
    parent.add(fg);
    floors.push(fg);
    return fg;
  }

  // Podium (building A), 3 levels, wide
  const podium = new THREE.Group(); podium.name = 'podium'; podium.position.set(-6, 0, 4); root.add(podium);
  for (let i = 0; i < 3; i++) {
    addFloor(podium, { w: 44, d: 30, y: i * FH, level: i, buildingId: 'podium', label: { en: i === 0 ? 'Podium · ground level' : `Podium · level ${i}`, ar: i === 0 ? 'المنصّة · الطابق الأرضي' : `المنصّة · الطابق ${i}` } });
  }
  const podRoof = new THREE.Mesh(g(new THREE.BoxGeometry(44.6, 0.6, 30.6)), stone);
  podRoof.name = 'podium-roof'; podRoof.position.y = 3 * FH + 0.3; podRoof.castShadow = podRoof.receiveShadow = true;
  floors[2].add(podRoof); podRoof.position.y = FH + 0.3;

  // Tower (building B), 8 levels on top of the podium
  const tower = new THREE.Group(); tower.name = 'tower'; tower.position.set(4, 3 * FH + 0.6, -2); root.add(tower);
  for (let i = 0; i < 8; i++) {
    addFloor(tower, { w: 20, d: 18, y: i * FH, level: i, buildingId: 'tower', label: { en: `Tower · level ${i + 1}`, ar: `البرج · الطابق ${i + 1}` } });
  }
  const crown = new THREE.Mesh(g(new THREE.BoxGeometry(20.8, 1.2, 18.8)), stone);
  crown.name = 'crown'; crown.position.y = FH + 0.6; crown.castShadow = true; floors[floors.length - 1].add(crown);
  const fin = new THREE.Mesh(g(new THREE.BoxGeometry(0.6, 6, 6)), accent);
  fin.name = 'accent-fin'; fin.position.set(10.4, FH + 3.4, 0); fin.castShadow = true; floors[floors.length - 1].add(fin);

  // Site
  const site = new THREE.Group(); site.name = 'site';
  const pave = new THREE.Mesh(g(new THREE.BoxGeometry(120, 0.04, 100)), paving);
  pave.name = 'paving'; pave.position.y = 0.02; pave.receiveShadow = true; site.add(pave);
  const lawn = new THREE.Mesh(g(new THREE.BoxGeometry(34, 0.06, 26)), grass);
  lawn.name = 'lawn'; lawn.position.set(32, 0.05, 30); lawn.receiveShadow = true; site.add(lawn);
  const pool = new THREE.Mesh(g(new THREE.BoxGeometry(14, 0.08, 7)), water);
  pool.name = 'pool'; pool.position.set(30, 0.08, 30); pool.receiveShadow = true; site.add(pool);

  const nTrees = high ? 46 : 22;
  const crownGeo = g(new THREE.IcosahedronGeometry(2.4, 0));
  const trunkGeo = g(new THREE.CylinderGeometry(0.18, 0.24, 2.6, 6));
  const trees = new THREE.InstancedMesh(crownGeo, foliage, nTrees);
  const trunks = new THREE.InstancedMesh(trunkGeo, trunk, nTrees);
  trees.name = 'tree-crowns'; trunks.name = 'tree-trunks';
  trees.castShadow = trunks.castShadow = true;
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < nTrees; i++) {
    const a = (i / nTrees) * Math.PI * 2;
    const r = 46 + rnd() * 8;
    p.set(Math.cos(a) * r, 0, Math.sin(a) * r * 0.82);
    const sc = 0.8 + rnd() * 0.5;
    s.set(sc, sc * (1 + rnd() * 0.3), sc);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6);
    mtx.compose(new THREE.Vector3(p.x, 2.6 + 1.6 * sc, p.z), q, s); trees.setMatrixAt(i, mtx);
    mtx.compose(new THREE.Vector3(p.x, 1.3, p.z), q, new THREE.Vector3(1, 1, 1)); trunks.setMatrixAt(i, mtx);
  }
  site.add(trees, trunks);

  const lamps = [];
  const poleGeo = g(new THREE.CylinderGeometry(0.08, 0.1, 4.2, 6));
  const headGeo = g(new THREE.SphereGeometry(0.28, 10, 8));
  [[-28, 26], [-8, 26], [12, 26], [40, 18]].forEach(([x, z], i) => {
    const pole = new THREE.Mesh(poleGeo, mullion); pole.name = `lamp-pole-${i}`; pole.position.set(x, 2.1, z); pole.castShadow = true; site.add(pole);
    const head = new THREE.Mesh(headGeo, lampHead); head.name = `lamp-head-${i}`; head.position.set(x, 4.3, z); site.add(head);
    const light = new THREE.PointLight(0xffd6a0, 0, 22, 2); light.name = `lamp-light-${i}`; light.position.set(x, 4.1, z);
    site.add(light); lamps.push(light);
  });

  root.add(site);

  return {
    root,
    floors,
    site,
    nightMaterials: [glow, lampHead, water],
    lamps,
    update(dt, t) {
      water.emissiveIntensity = water.emissiveIntensity; // night ramp owned by the engine
      water.color.setHSL(0.53, 0.42, 0.55 + Math.sin(t * 1.6) * 0.02);
    },
    dispose() {
      geos.forEach((x) => x.dispose());
      mats.forEach((x) => x.dispose());
    },
  };
}
