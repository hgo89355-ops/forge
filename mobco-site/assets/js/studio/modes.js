// MOBCO 3D Studio — modes.js
// Render-mode materials (Realistic / Clay / Blueprint / X-ray), the "ghost" material used when a level
// is isolated, lazily-built edge overlays (EdgesGeometry, incl. baked InstancedMesh edges), and the
// section-cut "cap" shader patch (back faces of cut solids render in MOBCO teal).
// The engine owns material identity: model materials are stored on mesh.userData.__orig and restored.

export const MODES = ['realistic', 'clay', 'blueprint', 'xray'];

const EDGE_ANGLE = 28;          // degrees: crease threshold for EdgesGeometry
const EDGE_BUDGET = 1_400_000;  // max edge vertices per model (keeps blueprint cheap on mobile)

export function isGlassMaterial(m) {
  if (!m) return false;
  return (m.transparent && m.opacity < 0.95) || (m.transmission || 0) > 0.05;
}

/**
 * Patch a material so that its back faces render as a flat teal "cap". Combined with a section clipping
 * plane and DoubleSide, cut solids read as filled sections. Only opaque materials are patched.
 */
export function patchCap(mat, capUniform) {
  if (!mat || mat.userData.__capPatched || mat.transparent || !mat.isMaterial) return;
  if (mat.isShaderMaterial || mat.isRawShaderMaterial || mat.isLineBasicMaterial || mat.isPointsMaterial) return;
  mat.userData.__capPatched = true;
  const prev = mat.onBeforeCompile;
  const prevKey = mat.customProgramCacheKey;
  mat.onBeforeCompile = function onCapCompile(shader, renderer) {
    if (typeof prev === 'function') prev.call(this, shader, renderer);
    shader.uniforms.uStudioCap = capUniform;
    shader.fragmentShader = 'uniform vec3 uStudioCap;\n' + shader.fragmentShader.replace(
      /}\s*$/,
      '\tif ( ! gl_FrontFacing ) gl_FragColor = vec4( uStudioCap, 1.0 );\n}\n',
    );
  };
  mat.customProgramCacheKey = function capKey() {
    let base = '';
    try { base = prevKey && prevKey !== capKey ? String(prevKey.call(this)) : ''; } catch { base = ''; }
    return `${base}|studio-cap`;
  };
  mat.needsUpdate = true;
}

export function createModeLibrary(THREE, { clipPlanes, capUniform }) {
  const owned = [];
  const mk = (m) => { m.clippingPlanes = clipPlanes; m.clipShadows = true; owned.push(m); return m; };

  const M = {
    clay: mk(new THREE.MeshStandardMaterial({ name: 'mode-clay', color: '#f1ede6', roughness: 0.88, metalness: 0, envMapIntensity: 0.55 })),
    claySite: mk(new THREE.MeshStandardMaterial({ name: 'mode-clay-site', color: '#e4dfd6', roughness: 0.95, metalness: 0, envMapIntensity: 0.45 })),
    clayGlass: mk(new THREE.MeshStandardMaterial({ name: 'mode-clay-glass', color: '#cfdde2', roughness: 0.25, metalness: 0, transparent: true, opacity: 0.5, envMapIntensity: 0.8, depthWrite: false })),
    bpFill: mk(new THREE.MeshBasicMaterial({ name: 'mode-bp-fill', color: '#123352', polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, toneMapped: false })),
    bpSite: mk(new THREE.MeshBasicMaterial({ name: 'mode-bp-site', color: '#11304e', polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, toneMapped: false })),
    bpGlass: mk(new THREE.MeshBasicMaterial({ name: 'mode-bp-glass', color: '#3f6f97', transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false })),
    xray: mk(new THREE.MeshBasicMaterial({ name: 'mode-xray', color: '#6fd1c5', transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false })),
    xraySite: mk(new THREE.MeshBasicMaterial({ name: 'mode-xray-site', color: '#9be3da', transparent: true, opacity: 0.025, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })),
    ghost: mk(new THREE.MeshStandardMaterial({ name: 'mode-ghost', color: '#e9eef1', roughness: 0.6, transparent: true, opacity: 0.13, depthWrite: false })),
    bpGhost: mk(new THREE.MeshBasicMaterial({ name: 'mode-bp-ghost', color: '#2c5a82', transparent: true, opacity: 0.12, depthWrite: false, toneMapped: false })),
    edge: mk(new THREE.LineBasicMaterial({ name: 'edge-bp', color: '#eaf3fb', transparent: true, opacity: 0.9, toneMapped: false })),
    edgeSite: mk(new THREE.LineBasicMaterial({ name: 'edge-bp-site', color: '#bcd4ea', transparent: true, opacity: 0.32, toneMapped: false })),
    edgeGhost: mk(new THREE.LineBasicMaterial({ name: 'edge-ghost', color: '#bcd4ea', transparent: true, opacity: 0.14, toneMapped: false })),
    xEdge: mk(new THREE.LineBasicMaterial({ name: 'edge-xray', color: '#9be3da', transparent: true, opacity: 0.55, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false })),
    xEdgeSite: mk(new THREE.LineBasicMaterial({ name: 'edge-xray-site', color: '#6fd1c5', transparent: true, opacity: 0.16, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false })),
    xEdgeGhost: mk(new THREE.LineBasicMaterial({ name: 'edge-xray-ghost', color: '#6fd1c5', transparent: true, opacity: 0.07, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false })),
  };
  // Opaque mode materials also show teal caps when cut.
  [M.clay, M.claySite, M.bpFill, M.bpSite].forEach((m) => patchCap(m, capUniform));

  const mapMat = (orig, fn) => (Array.isArray(orig) ? orig.map(fn) : fn(orig));

  /** Material for one mesh given the render mode and whether it is ghosted (level isolation). */
  function materialFor(mesh, mode, ghost) {
    const ud = mesh.userData;
    const orig = ud.__orig;
    if (ghost) {
      const g = mode === 'blueprint' ? M.bpGhost : mode === 'xray' ? M.xraySite : M.ghost;
      return mapMat(orig, () => g);
    }
    switch (mode) {
      case 'clay': return mapMat(orig, (m) => (isGlassMaterial(m) ? M.clayGlass : ud.__site ? M.claySite : M.clay));
      case 'blueprint': return mapMat(orig, (m) => (isGlassMaterial(m) ? M.bpGlass : ud.__site ? M.bpSite : M.bpFill));
      case 'xray': return mapMat(orig, () => (ud.__site ? M.xraySite : M.xray));
      default: return orig;
    }
  }

  function edgeMaterialFor(mesh, mode, ghost) {
    const site = mesh.userData.__site;
    if (mode === 'xray') return ghost ? M.xEdgeGhost : site ? M.xEdgeSite : M.xEdge;
    return ghost ? M.edgeGhost : site ? M.edgeSite : M.edge;
  }

  /** Build (once) the edge overlay of a mesh. Returns the LineSegments or null when over budget. */
  function ensureEdges(mesh, budget) {
    const ud = mesh.userData;
    if (ud.__edges !== undefined) return ud.__edges;
    ud.__edges = null;
    const geo = mesh.geometry;
    if (!geo || !geo.attributes?.position) return null;
    let edges;
    try { edges = new THREE.EdgesGeometry(geo, EDGE_ANGLE); } catch { return null; }
    let out = edges;
    if (mesh.isInstancedMesh) {
      const base = edges.attributes.position.array;
      const vcount = base.length / 3;
      const n = mesh.count;
      if (vcount * n > budget.left) { edges.dispose(); return null; }
      const arr = new Float32Array(base.length * n);
      const mtx = new THREE.Matrix4();
      const v = new THREE.Vector3();
      for (let i = 0; i < n; i++) {
        mesh.getMatrixAt(i, mtx);
        for (let j = 0; j < vcount; j++) {
          v.fromArray(base, j * 3).applyMatrix4(mtx).toArray(arr, (i * vcount + j) * 3);
        }
      }
      edges.dispose();
      out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    }
    const count = out.attributes.position.count;
    if (count > budget.left) { out.dispose(); return null; }
    budget.left -= count;
    out.computeBoundingSphere();
    const lines = new THREE.LineSegments(out, M.edge);
    lines.name = `${mesh.name || 'mesh'}·edges`;
    lines.raycast = () => {};
    lines.visible = false;
    lines.userData.__studioEdges = true;
    mesh.add(lines);
    ud.__edges = lines;
    return lines;
  }

  function newBudget() { return { left: EDGE_BUDGET }; }

  function disposeEdges(meshes) {
    meshes.forEach((mesh) => {
      const e = mesh.userData.__edges;
      if (e) { e.parent?.remove(e); e.geometry.dispose(); }
      delete mesh.userData.__edges;
    });
  }

  /** While a section cut is active, opaque materials render both sides so caps show. */
  function setDoubleSided(materials, on) {
    materials.forEach((m) => {
      if (!m.userData.__capPatched) return;
      if (m.userData.__side === undefined) m.userData.__side = m.side;
      const want = on ? THREE.DoubleSide : m.userData.__side;
      if (m.side !== want) { m.side = want; m.needsUpdate = true; }
    });
  }

  function dispose() { owned.forEach((m) => m.dispose()); }

  return { M, materialFor, edgeMaterialFor, ensureEdges, newBudget, disposeEdges, setDoubleSided, owned, dispose };
}
