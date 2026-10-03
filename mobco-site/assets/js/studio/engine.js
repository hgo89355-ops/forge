// MOBCO 3D Studio — engine.js
// The UI-less WebGL engine behind studio.html (and a future compact embed on the home page).
//
//   import { createStudio, hasWebGL } from './assets/js/studio/engine.js';
//   const studio = createStudio(container, { compact, model, autoRotate, controls, ui, quality });
//   await studio.load('mixed-use');
//
// Features: ACES + sRGB renderer (DPR cap 2 / 1.5 on mobile, adaptive), soft PCF shadows fitted to the
// model, RoomEnvironment PMREM, gradient sky + fog + gridded ground + contact shadow, OrbitControls with
// damping and limits, animated view presets, auto-rotate, double-click focus, explode, level hover /
// isolation, horizontal section cut with teal caps, Realistic / Clay / Blueprint / X-ray modes,
// time of day (sun path, sky, night glow + lamps), projected hotspots with occlusion, thumbnails,
// snapshot, pause when hidden/offscreen, full disposal on model switch.
// Model modules (./models/<id>.js) follow the MODEL MODULE CONTRACT — see docs/requests/studio.md.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createEnvironment, DEFAULT_HOUR, MIN_HOUR, MAX_HOUR } from './environment.js';
import { createModeLibrary, patchCap, isGlassMaterial, MODES } from './modes.js';

export { DEFAULT_HOUR, MIN_HOUR, MAX_HOUR, MODES };
export const VIEWS = ['aerial', 'street', 'top', 'front'];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const now = () => performance.now();

/** True when the browser can create a WebGL2 context (three.js r163+ requires WebGL2). */
let gpuInfo = null;
export function hasWebGL() {
  try {
    if (new URLSearchParams(location.search).get('nogl') === '1') return false;
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    const ok = !!gl;
    if (gl && !gpuInfo) {
      let name = '';
      try { const ext = gl.getExtension('WEBGL_debug_renderer_info'); name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''; } catch { /* ignore */ }
      gpuInfo = { renderer: name, software: /swiftshader|llvmpipe|softpipe|software|microsoft basic render/i.test(name) };
    }
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return ok;
  } catch { return false; }
}
/** { renderer, software } of the WebGL implementation (software = CPU rasteriser such as SwiftShader). */
export function gpu() { if (!gpuInfo) hasWebGL(); return gpuInfo || { renderer: '', software: false }; }

/* ---------------------------------------------------------------- model module loading (cached) */
const moduleCache = new Map();
/** Dynamic-import a model module: ./models/<id>.js. Failed imports are not cached (retry busts the URL). */
export function loadModelModule(id, { retry = false } = {}) {
  if (!/^[a-z0-9_-]{1,40}$/i.test(String(id))) return Promise.reject(new Error(`Invalid model id "${id}"`));
  if (!retry && moduleCache.has(id)) return moduleCache.get(id);
  const url = `./models/${id}.js${retry ? `?retry=${Date.now()}` : ''}`;
  const p = import(/* @vite-ignore */ url).then((mod) => {
    if (typeof mod.build !== 'function') throw new Error(`Model "${id}" does not export build()`);
    return mod;
  });
  moduleCache.set(id, p);
  p.catch(() => { if (moduleCache.get(id) === p) moduleCache.delete(id); });
  return p;
}

function isMobileLike() {
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  return coarse || Math.min(screen.width, screen.height) < 820;
}

/* ================================================================== createStudio */
export function createStudio(container, options = {}) {
  if (!container) throw new Error('createStudio: container element required');
  if (!hasWebGL()) { const e = new Error('WebGL2 is not available'); e.code = 'NO_WEBGL'; throw e; }

  const reduced = () => options.reducedMotion ?? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const mobile = isMobileLike();
  let lowPowerFlag = false;
  const still = () => reduced() || lowPowerFlag; // no tweened motion (reduced motion, or a CPU rasteriser)
  const opts = {
    compact: false,
    model: null,
    autoRotate: false,
    controls: true,
    ui: true,
    quality: 'auto',
    hotspots: true,
    ...options,
  };
  // CPU rasterisers (SwiftShader, llvmpipe — e.g. no GPU, blocklisted drivers, headless CI) get a
  // low-power profile: no MSAA, DPR 1 × 0.75, small shadow map, no ambient animation, no thumbnails.
  const lp = new URLSearchParams(location.search).get('lowpower');
  const lowPower = lp === '1' || (lp !== '0' && (gpu().software || opts.lowPower === true));
  const lowEnd = mobile || lowPower || (navigator.hardwareConcurrency || 8) <= 2 || (navigator.deviceMemory || 8) <= 2;
  const quality = opts.quality === 'auto' ? (opts.compact || lowEnd ? 'low' : 'high') : opts.quality;
  lowPowerFlag = lowPower;
  const dprCap = lowPower ? 1 : mobile ? 1.5 : 2;
  const hq = new URLSearchParams(location.search).get('hq') === '1'; // QA: full-resolution stills even on a CPU rasteriser
  let dprScale = lowPower && !hq ? 0.6 : 1; // adaptive (lowered when frames are slow)

  /* -------------------------------------------------------------- events */
  const listeners = new Map();
  const on = (type, cb) => { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(cb); return () => listeners.get(type)?.delete(cb); };
  const emit = (type, detail) => listeners.get(type)?.forEach((cb) => { try { cb(detail); } catch (e) { console.error('[studio] listener error', e); } });

  /* -------------------------------------------------------------- renderer */
  const renderer = new THREE.WebGLRenderer({ antialias: !lowPower || hq, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // r186: PCF is the soft-filtered map (PCFSoftShadowMap was removed)
  renderer.localClippingEnabled = true;
  const canvas = renderer.domElement;
  canvas.className = 'studio-canvas';
  canvas.setAttribute('tabindex', opts.controls === false ? '-1' : '0');
  canvas.setAttribute('role', 'img');
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.5, 4000);
  camera.position.set(90, 70, 110);

  // Environment map (studio room → PMREM)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envMap = pmrem.fromScene(roomEnv, 0.04).texture;
  roomEnv.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
  pmrem.dispose();
  scene.environment = envMap;
  scene.environmentIntensity = 0.8;

  const env = createEnvironment(THREE, { scene, quality });

  // Section cut plane: keeps y <= constant
  const sectionPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e5);
  const clipPlanes = [sectionPlane];
  const capUniform = { value: new THREE.Vector3(111 / 255, 209 / 255, 197 / 255) };
  const modes = createModeLibrary(THREE, { clipPlanes, capUniform });

  // Section plane visual (teal frame + faint fill) — not clipped
  const sectionVis = new THREE.Group();
  sectionVis.name = 'studio-section-plane';
  const secFill = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#6fd1c5', transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  secFill.rotation.x = -Math.PI / 2;
  const secFrameGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.5, 0, -0.5), new THREE.Vector3(0.5, 0, -0.5), new THREE.Vector3(0.5, 0, 0.5), new THREE.Vector3(-0.5, 0, 0.5),
  ]);
  const secFrame = new THREE.LineLoop(secFrameGeo, new THREE.LineBasicMaterial({ color: '#6fd1c5', transparent: true, opacity: 0.9, toneMapped: false }));
  sectionVis.add(secFill, secFrame);
  sectionVis.visible = false;
  sectionVis.traverse((o) => { o.raycast = () => {}; });
  scene.add(sectionVis);

  // Level highlight boxes (hover = faint, selected = solid)
  function makeBox(color, lineOpacity, fillOpacity) {
    const g = new THREE.Group();
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color, transparent: true, opacity: lineOpacity, toneMapped: false, depthTest: false }));
    const fill = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: fillOpacity, depthWrite: false, toneMapped: false }));
    edges.renderOrder = 20;
    g.add(fill, edges);
    g.visible = false;
    g.traverse((o) => { o.raycast = () => {}; });
    scene.add(g);
    return g;
  }
  const hoverBox = makeBox('#9be3da', 0.55, 0.06);
  const selectBox = makeBox('#6fd1c5', 0.95, 0.04);

  /* -------------------------------------------------------------- controls */
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !lowPower;
  controls.dampingFactor = 0.075;
  controls.screenSpacePanning = true;
  controls.minDistance = 8;
  controls.maxDistance = 520;
  controls.minPolarAngle = 0.02;
  controls.maxPolarAngle = THREE.MathUtils.degToRad(87);
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.9;
  controls.panSpeed = 0.8;
  controls.autoRotateSpeed = 0.55;
  controls.enabled = opts.controls !== false;
  controls.enableZoom = opts.controls !== false;
  controls.listenToKeyEvents(canvas);
  controls.keyPanSpeed = 14;

  /* -------------------------------------------------------------- state */
  const state = {
    id: null,
    mode: 'realistic',
    explode: 0,
    explodeTarget: 0,
    section: 1,          // 1 = no cut, 0 = cut at ground
    hour: DEFAULT_HOUR,
    autoRotate: !!opts.autoRotate && !reduced(),
    hotspots: opts.hotspots !== false,
    hover: -1,
    selected: -1,
    loading: false,
    error: null,
  };
  let model = null;
  let loadToken = 0;
  let needsRender = true;
  let tween = null;       // camera tween
  let revealTween = null; // explode reveal on load
  let insets = { left: 0, right: 0, top: 0, bottom: 0 };
  const offset = { x: 0, y: 0, tx: 0, ty: 0 };
  let width = 1, height = 1;
  let running = false, raf = 0, visible = true, inView = true, disposed = false;
  let lastTime = now(), elapsed = 0;
  controls.autoRotate = state.autoRotate;

  const invalidate = () => { needsRender = true; };
  controls.addEventListener('change', () => {
    clampTarget();
    invalidate();
  });
  controls.addEventListener('start', () => {
    if (tween && !tween.locked) tween = null;
    emit('interact', {});
  });

  function clampTarget() {
    if (!model) return;
    const r = model.radius + 40;
    const t = controls.target;
    t.x = clamp(t.x, -r, r);
    t.z = clamp(t.z, -r, r);
    t.y = clamp(t.y, 0, model.height + 30);
  }

  /* -------------------------------------------------------------- sizing */
  function resize() {
    const rect = container.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap) * dprScale;
    renderer.setPixelRatio(Math.max(0.5, dpr));
    renderer.setSize(width, height, false);
    const aspect = width / height;
    camera.aspect = aspect;
    // Keep a calm architectural lens on wide screens; widen on portrait screens so the model still fits.
    const baseFov = opts.compact ? 38 : 40;
    camera.fov = aspect >= 1.25 ? baseFov : Math.min(62, (2 * Math.atan(Math.tan((baseFov * Math.PI) / 360) * (1.25 / aspect)) * 180) / Math.PI);
    applyViewOffset();
    invalidate();
  }
  function applyViewOffset() {
    if (Math.abs(offset.x) < 0.5 && Math.abs(offset.y) < 0.5) camera.clearViewOffset();
    else camera.setViewOffset(width, height, offset.x, offset.y, width, height);
    camera.updateProjectionMatrix();
  }
  /**
   * Reserve screen space covered by UI panels (CSS px, physical sides). The projection centre shifts so
   * the model frames inside the free area. Animated.
   */
  function setInsets(next = {}) {
    insets = { left: 0, right: 0, top: 0, bottom: 0, ...next };
    offset.tx = -(insets.left - insets.right) / 2;
    offset.ty = -(insets.top - insets.bottom) / 2;
    if (still() || !model) { offset.x = offset.tx; offset.y = offset.ty; applyViewOffset(); }
    invalidate();
  }

  const ro = new ResizeObserver(() => resize());
  ro.observe(container);
  let dprMedia = null;
  const watchDpr = () => {
    dprMedia?.removeEventListener?.('change', onDprChange);
    dprMedia = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    dprMedia.addEventListener?.('change', onDprChange);
  };
  function onDprChange() { resize(); watchDpr(); }
  watchDpr();

  /* -------------------------------------------------------------- visibility (pause) */
  const io = new IntersectionObserver((entries) => {
    inView = entries.some((e) => e.isIntersecting);
    syncLoop();
  }, { threshold: 0 });
  io.observe(container);
  const onVis = () => { visible = document.visibilityState !== 'hidden'; syncLoop(); };
  document.addEventListener('visibilitychange', onVis);

  function syncLoop() {
    const shouldRun = visible && inView && !disposed;
    if (shouldRun && !running) { running = true; lastTime = now(); raf = requestAnimationFrame(frame); }
    else if (!shouldRun && running) { running = false; cancelAnimationFrame(raf); }
  }

  /* -------------------------------------------------------------- adaptive quality */
  const perf = { frames: 0, acc: 0, checks: 0 };
  function samplePerf(dt) {
    if (perf.checks >= 3 || dprScale <= 0.5 || hq) return;
    perf.frames++; perf.acc += dt;
    if (perf.frames >= 45) {
      const avg = perf.acc / perf.frames;
      perf.frames = 0; perf.acc = 0; perf.checks++;
      if (avg > 0.045) { dprScale = Math.max(0.5, dprScale * 0.8); resize(); }
    }
  }

  /* -------------------------------------------------------------- render loop */
  const hotspotVec = new THREE.Vector3();
  let perfFrames = 0;
  let occlusionClock = 0, occlusionIndex = 0;
  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const t = now();
    const dt = Math.min(0.1, (t - lastTime) / 1000);
    lastTime = t;
    elapsed += dt;
    let dirty = needsRender;

    if (tween) { stepTween(t); dirty = true; }
    if (revealTween) { stepReveal(t); dirty = true; }
    if (controls.update(dt)) dirty = true;

    // explode easing
    if (Math.abs(state.explode - state.explodeTarget) > 0.0005) {
      const k = still() ? 1 : 1 - Math.exp(-dt * 7);
      state.explode += (state.explodeTarget - state.explode) * k;
      if (Math.abs(state.explode - state.explodeTarget) <= 0.0005) state.explode = state.explodeTarget;
      applyExplode();
      dirty = true;
    }
    // view offset easing
    if (Math.abs(offset.x - offset.tx) > 0.3 || Math.abs(offset.y - offset.ty) > 0.3) {
      const k = 1 - Math.exp(-dt * 6);
      offset.x += (offset.tx - offset.x) * k;
      offset.y += (offset.ty - offset.y) * k;
      applyViewOffset();
      dirty = true;
    }
    if (model?.update && (!lowPower || dirty)) {
      try { model.update(dt, elapsed); } catch (e) { console.warn('[studio] model update failed', e); model.update = null; }
      dirty = true;
    }
    if (!dirty) return;
    needsRender = false;
    const r0 = PERF ? performance.now() : 0;
    renderer.render(scene, camera);
    if (PERF && perfFrames++ < 12) plog('frame ms', Math.round(performance.now() - r0), renderer.info.render.calls, renderer.info.render.triangles);
    if (model && state.hotspots && opts.hotspots !== false) {
      occlusionClock += dt;
      emit('frame', { hotspots: projectHotspots(occlusionClock > 0.12) });
      if (occlusionClock > 0.12) occlusionClock = 0;
    } else emit('frame', { hotspots: [] });
    samplePerf(dt);
  }

  /* -------------------------------------------------------------- hotspots */
  const occRay = new THREE.Raycaster();
  function projectHotspots(doOcclusion) {
    if (!model) return [];
    const list = model.hotspots;
    if (!list.length) return [];
    if (doOcclusion) {
      // one hotspot per tick keeps raycasting cheap
      const h = list[occlusionIndex % list.length];
      occlusionIndex++;
      hotspotVec.copy(h.world);
      const dir = hotspotVec.clone().sub(camera.position);
      const dist = dir.length();
      occRay.set(camera.position, dir.normalize());
      occRay.far = Math.max(0, dist - 0.8);
      const hits = occRay.intersectObjects(model.solids, false).filter(validHit);
      h.occluded = hits.length > 0;
    }
    const fade = clamp(1 - state.explode * 3, 0, 1);
    return list.map((h) => {
      hotspotVec.copy(h.world).project(camera);
      const onScreen = hotspotVec.z < 1 && Math.abs(hotspotVec.x) < 1.05 && Math.abs(hotspotVec.y) < 1.05;
      const cut = h.world.y > sectionHeight() + 0.5;
      return {
        id: h.id,
        x: (hotspotVec.x * 0.5 + 0.5) * width,
        y: (-hotspotVec.y * 0.5 + 0.5) * height,
        visible: onScreen && fade > 0.02 && !cut,
        occluded: !!h.occluded,
        opacity: fade,
      };
    });
  }

  /* -------------------------------------------------------------- camera tweens */
  function tweenCamera(toPos, toTarget, { duration = 1300, instant = false, locked = false } = {}) {
    const p = new THREE.Vector3().fromArray(toPos.toArray ? toPos.toArray() : toPos);
    const tg = new THREE.Vector3().fromArray(toTarget.toArray ? toTarget.toArray() : toTarget);
    if (instant || still()) {
      tween = null;
      camera.position.copy(p);
      controls.target.copy(tg);
      controls.update(0);
      invalidate();
      return;
    }
    tween = {
      t0: now(), duration, locked,
      fromPos: camera.position.clone(), toPos: p,
      fromTarget: controls.target.clone(), toTarget: tg,
    };
    invalidate();
  }
  function stepTween(t) {
    const k = clamp((t - tween.t0) / tween.duration, 0, 1);
    const e = easeInOutCubic(k);
    camera.position.lerpVectors(tween.fromPos, tween.toPos, e);
    // arc slightly upward through the move so it reads as a flight, not a slide
    camera.position.y += Math.sin(Math.PI * e) * tween.fromPos.distanceTo(tween.toPos) * 0.08;
    controls.target.lerpVectors(tween.fromTarget, tween.toTarget, e);
    if (k >= 1) { tween = null; emit('viewend', {}); }
  }

  /** Preset position, pulled back when overlay panels leave only part of the canvas free (not for street). */
  function viewPos(name) {
    const cam = model.meta.camera;
    const p = new THREE.Vector3().fromArray(cam[name] || cam.aerial);
    if (name === 'street') return p;
    const free = clamp((width - insets.left - insets.right) / Math.max(1, width), 0.3, 1);
    const k = clamp(1 / (0.45 + 0.55 * free), 1, 1.45);
    const tg = new THREE.Vector3().fromArray(cam.target);
    return p.sub(tg).multiplyScalar(k).add(tg);
  }
  function setView(name, { instant = false } = {}) {
    if (!model) return;
    const cam = model.meta.camera;
    const pos = viewPos(VIEWS.includes(name) ? name : 'aerial');
    tweenCamera(pos, cam.target, { instant });
    state.view = name;
    emit('change', getState());
  }

  /* -------------------------------------------------------------- explode */
  function applyExplode() {
    if (!model) return;
    const e = easeOutCubic(clamp(state.explode, 0, 1));
    model.floors.forEach((f) => { f.group.position.y = f.baseY + f.level * model.gap * e; });
    // keep the growing stack in frame: lift the orbit target and ease the camera back a little
    const prev = model.lastEase || 0;
    if (Math.abs(e - prev) > 1e-5 && !tween) {
      const lift = model.maxLevel * model.gap * 0.42 * (e - prev);
      controls.target.y += lift;
      camera.position.y += lift;
      const off = camera.position.clone().sub(controls.target).multiplyScalar((1 + 0.3 * e) / (1 + 0.3 * prev));
      camera.position.copy(controls.target).add(off);
      controls.update(0);
    }
    model.lastEase = e;
    updateBoxes();
  }
  function setExplode(v, { instant = false } = {}) {
    if (revealTween) { revealTween = null; applyExplode(); }
    state.explodeTarget = clamp(+v || 0, 0, 1);
    if (instant || still()) { state.explode = state.explodeTarget; applyExplode(); }
    invalidate();
    emit('change', getState());
  }

  /* -------------------------------------------------------------- section cut */
  function sectionHeight() {
    if (!model || state.section >= 0.999) return Infinity;
    return 0.25 + state.section * (model.cutTop - 0.25);
  }
  function setSection(v) {
    state.section = clamp(+v, 0, 1);
    const active = model && state.section < 0.999;
    const h = sectionHeight();
    sectionPlane.constant = active ? h : 1e5;
    if (model) {
      const wasActive = model.sectionActive;
      if (active !== wasActive) {
        modes.setDoubleSided(model.materials, active);
        modes.setDoubleSided(modes.owned, active);
        model.sectionActive = active;
      }
      sectionVis.visible = active;
      if (active) {
        sectionVis.position.set(model.center.x, h + 0.02, model.center.z);
        sectionVis.scale.set(model.size.x + 10, 1, model.size.z + 10);
      }
    }
    invalidate();
    emit('change', getState());
  }

  /* -------------------------------------------------------------- render modes & isolation */
  function applyMaterials() {
    if (!model) return;
    const mode = state.mode;
    const sel = state.selected;
    const needEdges = mode === 'blueprint' || mode === 'xray';
    const budget = model.edgeBudget;
    for (const mesh of model.meshes) {
      const ud = mesh.userData;
      const ghost = sel >= 0 && !ud.__site && ud.__floor !== sel;
      mesh.material = modes.materialFor(mesh, mode, ghost);
      if (mesh.isInstancedMesh) mesh.instanceColor = mode === 'realistic' ? ud.__instColor : null;
      mesh.castShadow = mode === 'realistic' || mode === 'clay' ? ud.__cast && !ghost : false;
      if (needEdges) {
        const e = modes.ensureEdges(mesh, budget);
        if (e) { e.visible = true; e.material = modes.edgeMaterialFor(mesh, mode, ghost); }
      } else if (ud.__edges) ud.__edges.visible = false;
    }
    invalidate();
  }
  const themeFor = (mode) => (mode === 'blueprint' ? 'blueprint' : mode === 'xray' ? 'xray' : 'sky');
  function setMode(mode) {
    if (!MODES.includes(mode)) return;
    state.mode = mode;
    env.setTheme(themeFor(mode));
    capUniform.value.set(...(mode === 'blueprint' ? [0.86, 0.93, 0.98] : [111 / 255, 209 / 255, 197 / 255]));
    applyMaterials();
    applyTime();
    emit('change', getState());
  }

  /* -------------------------------------------------------------- time of day */
  function applyTime() {
    const sunMeta = model?.meta.sun || {};
    const { night } = env.setTime(state.hour, sunMeta, renderer);
    const flat = state.mode === 'blueprint' || state.mode === 'xray';
    if (flat) renderer.toneMappingExposure = 1;
    const n = flat ? 0 : night;
    if (model) {
      model.night.forEach((m) => { if ('emissiveIntensity' in m) m.emissiveIntensity = n * (m.userData.__nightMax ?? 1); });
      model.lamps.forEach((l) => { l.intensity = n * l.userData.__nightIntensity; });
    }
    invalidate();
  }
  function setTime(hour) {
    state.hour = clamp(+hour, MIN_HOUR, MAX_HOUR);
    applyTime();
    emit('change', getState());
  }

  /* -------------------------------------------------------------- picking */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function validHit(hit) {
    if (!hit.object.visible) return false;
    return hit.point.y <= sectionHeight() + 0.05;
  }
  function pick(clientX, clientY, objects) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObjects(objects, false).filter(validHit)[0] || null;
  }
  function floorAt(clientX, clientY) {
    if (!model || !model.pickables.length) return -1;
    const hit = pick(clientX, clientY, model.pickables);
    if (!hit) return -1;
    return hit.object.userData.__floor ?? -1;
  }

  const boxTmp = new THREE.Box3();
  function placeBox(box, index) {
    if (index < 0 || !model || !model.floors[index]) { box.visible = false; return; }
    const f = model.floors[index];
    const e = easeOutCubic(clamp(state.explode, 0, 1));
    boxTmp.copy(f.box);
    boxTmp.min.y += f.level * model.gap * e; boxTmp.max.y += f.level * model.gap * e;
    const size = boxTmp.getSize(new THREE.Vector3());
    const c = boxTmp.getCenter(new THREE.Vector3());
    box.position.copy(c);
    box.scale.set(size.x + 0.6, Math.max(0.6, size.y + 0.3), size.z + 0.6);
    box.visible = true;
  }
  function updateBoxes() {
    placeBox(hoverBox, state.hover !== state.selected ? state.hover : -1);
    placeBox(selectBox, state.selected);
  }

  function setHover(index) {
    if (index === state.hover) return;
    state.hover = index;
    updateBoxes();
    invalidate();
    emit('hover', { floor: floorInfo(index) });
  }
  function select(index) {
    const i = model && index >= 0 && index < model.floors.length ? index : -1;
    state.selected = i;
    updateBoxes();
    applyMaterials();
    emit('select', { floor: floorInfo(i) });
    emit('change', getState());
  }
  function selectStep(dir) {
    if (!model || !model.floors.length) return;
    const n = model.floors.length;
    const cur = state.selected < 0 ? (dir > 0 ? -1 : 0) : state.selected;
    select((cur + dir + n) % n);
  }
  function floorInfo(i) {
    if (!model || i < 0 || !model.floors[i]) return null;
    const f = model.floors[i];
    return { index: i, level: f.level, label: f.label, buildingId: f.buildingId, count: model.floors.length };
  }

  /* pointer: hover / click-select / double-click focus */
  let downAt = null;
  let hoverQueued = false, lastPointer = null;
  function onPointerMove(e) {
    if (e.pointerType === 'touch' || !model || opts.controls === false) return;
    lastPointer = e;
    if (e.buttons) { if (state.hover !== -1) setHover(-1); return; }
    if (hoverQueued) return;
    hoverQueued = true;
    requestAnimationFrame(() => {
      hoverQueued = false;
      if (!lastPointer) return;
      setHover(floorAt(lastPointer.clientX, lastPointer.clientY));
      canvas.style.cursor = state.hover >= 0 ? 'pointer' : '';
    });
  }
  function onPointerDown(e) { downAt = { x: e.clientX, y: e.clientY, t: e.timeStamp }; }
  function onPointerUp(e) {
    if (!downAt || !model) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    const quick = e.timeStamp - downAt.t < 600; // event timestamps: robust when the main thread is busy
    downAt = null;
    if (moved > 6 || !quick || e.button > 0) return;
    const i = floorAt(e.clientX, e.clientY);
    if (i >= 0) select(i === state.selected ? -1 : i);
    else if (state.selected >= 0) select(-1);
  }
  function onPointerLeave() { lastPointer = null; setHover(-1); canvas.style.cursor = ''; }
  function onDblClick(e) {
    if (!model) return;
    focusAt(e.clientX, e.clientY);
  }
  if (opts.controls !== false) {
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('dblclick', onDblClick);
  }

  function focusPoint(point) {
    const p = point.clone ? point.clone() : new THREE.Vector3().fromArray(point);
    p.y = clamp(p.y, 0, (model?.height || 60) + 10);
    const dir = camera.position.clone().sub(controls.target);
    const dist = clamp(dir.length() * 0.6, controls.minDistance * 2.2, controls.maxDistance);
    const to = p.clone().add(dir.normalize().multiplyScalar(dist));
    to.y = Math.max(to.y, 1.6);
    tweenCamera(to, p, { duration: 1000 });
    emit('focus', { point: p.toArray() });
  }

  /** Focus the point under a screen position (double-tap on touch). Returns true when something was hit. */
  function focusAt(clientX, clientY) {
    if (!model) return false;
    const hit = pick(clientX, clientY, [...model.solids, ...model.siteSolids, env.ground]);
    if (hit) focusPoint(hit.point);
    return !!hit;
  }

  function zoom(factor) {
    // factor < 1 → closer. OrbitControls: dollyIn(s<1) shrinks the distance, dollyOut(s<1) grows it.
    if (factor < 1) controls.dollyIn(factor); else controls.dollyOut(1 / factor);
    controls.update(0);
    invalidate();
  }

  /* -------------------------------------------------------------- loading */
  function normalizeMeta(id, meta = {}, bounds) {
    const size = bounds.getSize(new THREE.Vector3());
    const c = bounds.getCenter(new THREE.Vector3());
    const h = Math.max(4, size.y);
    const R = Math.max(size.x, size.z, h) * 0.5 + 10;
    const target = [c.x, h * 0.32, c.z];
    const d = R * 2.6;
    const fallback = {
      target,
      aerial: [c.x + d * 0.62, h * 0.32 + d * 0.55, c.z + d * 0.72],
      street: [c.x + R * 0.9, 2.4, c.z + R * 1.5],
      top: [c.x, h + d * 1.3, c.z + 0.01],
      front: [c.x, h * 0.45, c.z + d * 1.05],
    };
    const cam = { ...fallback };
    const src = meta.camera || {};
    for (const k of ['target', ...VIEWS]) {
      if (Array.isArray(src[k]) && src[k].length === 3 && src[k].every(Number.isFinite)) cam[k] = src[k].slice();
    }
    // a perfectly vertical top view would gimbal-lock OrbitControls
    if (Math.abs(cam.top[0] - cam.target[0]) < 0.01 && Math.abs(cam.top[2] - cam.target[2]) < 0.01) cam.top[2] += 0.05;
    return {
      id: meta.id || id,
      name: meta.name || { en: id, ar: id },
      projectSlug: meta.projectSlug ?? null,
      tagline: meta.tagline || null,
      descriptors: Array.isArray(meta.descriptors) ? meta.descriptors.slice(0, 6) : [],
      camera: cam,
      hotspots: Array.isArray(meta.hotspots) ? meta.hotspots.slice(0, 8) : [],
      sun: meta.sun || { azimuth: 135, elevation: 40 },
    };
  }

  function prepare(id, meta, built, mod) {
    if (!built || !built.root || !built.root.isObject3D) throw new Error(`Model "${id}" build() did not return a root Group`);
    const root = built.root;
    const site = built.site && built.site.isObject3D ? built.site : null;
    scene.add(root);
    if (site && !site.parent) scene.add(site);
    root.updateMatrixWorld(true);
    site?.updateMatrixWorld(true);

    const floorsIn = Array.isArray(built.floors) ? built.floors.filter((f) => f && f.isObject3D) : [];
    const meshes = [];
    const materials = new Set();
    const seen = new Set();
    const register = (o, isSite) => {
      if (!(o.isMesh) || seen.has(o) || o.userData.__studioEdges) return;
      seen.add(o);
      const ud = o.userData;
      ud.__orig = o.material;
      ud.__site = isSite;
      ud.__cast = o.castShadow;
      if (o.isInstancedMesh) ud.__instColor = o.instanceColor;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m) materials.add(m); });
      meshes.push(o);
    };
    site?.traverse((o) => register(o, true));
    root.traverse((o) => register(o, false));

    // floors
    const floors = floorsIn.map((g, i) => {
      const level = Number.isFinite(g.userData?.level) ? g.userData.level : i;
      g.traverse((o) => { if (o.isMesh && o.userData.__floor === undefined) o.userData.__floor = i; });
      const box = new THREE.Box3().setFromObject(g);
      return { group: g, baseY: g.position.y, level, label: g.userData?.label || null, buildingId: g.userData?.buildingId ?? null, box };
    });
    const maxLevel = floors.reduce((m, f) => Math.max(m, f.level), 0);

    // materials: clipping + caps
    materials.forEach((m) => {
      m.clippingPlanes = clipPlanes;
      m.clipShadows = true;
      if (!isGlassMaterial(m)) patchCap(m, capUniform);
      if (m.emissiveIntensity !== undefined && m.userData.__nightMax === undefined) m.userData.__nightMax = 1;
      m.needsUpdate = true;
    });

    // bounds
    const bounds = new THREE.Box3().setFromObject(root);
    if (site) bounds.union(new THREE.Box3().setFromObject(site));
    if (bounds.isEmpty()) bounds.set(new THREE.Vector3(-20, 0, -20), new THREE.Vector3(20, 20, 20));
    const buildingBounds = new THREE.Box3();
    meshes.forEach((o) => { if (!o.userData.__site) buildingBounds.expandByObject(o); });
    if (buildingBounds.isEmpty()) buildingBounds.copy(bounds);
    const height = Math.max(4, buildingBounds.max.y);
    const gap = clamp(40 / Math.max(1, maxLevel), 2.2, 6);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const radius = Math.max(size.x, size.z) * 0.5;

    const nMeta = normalizeMeta(id, meta, bounds);
    const hotspots = nMeta.hotspots
      .filter((h) => Array.isArray(h.position) && h.position.length === 3)
      .map((h, i) => ({ ...h, id: h.id || `h${i + 1}`, world: root.localToWorld(new THREE.Vector3().fromArray(h.position)), occluded: false }));

    const lamps = (Array.isArray(built.lamps) ? built.lamps : []).filter((l) => l && l.isLight).slice(0, 8);
    lamps.forEach((l) => {
      if (!l.parent) scene.add(l);
      const ud = l.userData || {};
      l.userData.__nightIntensity = Number.isFinite(ud.nightIntensity) ? ud.nightIntensity
        : Number.isFinite(ud.intensity) ? ud.intensity
          : l.isSpotLight ? 90 : 26;
      l.castShadow = false;
      l.intensity = 0;
    });

    const solids = meshes.filter((o) => !o.userData.__site && (!o.isInstancedMesh || o.count <= 96));
    const siteSolids = meshes.filter((o) => o.userData.__site && (!o.isInstancedMesh || o.count <= 96));
    const pickables = solids.filter((o) => o.userData.__floor !== undefined);

    const shadowBounds = bounds.clone();
    shadowBounds.max.y = Math.max(shadowBounds.max.y, height + maxLevel * gap);

    return {
      id, mod, meta: nMeta, built, root, site, floors, meshes, materials: [...materials],
      night: (Array.isArray(built.nightMaterials) ? built.nightMaterials : []).filter((m) => m && m.isMaterial),
      lamps, update: typeof built.update === 'function' ? built.update.bind(built) : null,
      hotspots, solids, siteSolids, pickables, bounds, shadowBounds, size, center, radius, height,
      cutTop: height + 0.5, gap, maxLevel, sectionActive: false, edgeBudget: modes.newBudget(),
    };
  }

  function unload(m) {
    if (!m) return;
    try {
      modes.disposeEdges(m.meshes);
      m.meshes.forEach((o) => { o.material = o.userData.__orig; if (o.isInstancedMesh) o.instanceColor = o.userData.__instColor; });
      if (m.sectionActive) modes.setDoubleSided(m.materials, false);
      m.lamps.forEach((l) => l.parent?.remove(l));
      scene.remove(m.root);
      if (m.site) m.site.parent?.remove(m.site);
      if (typeof m.built.dispose === 'function') m.built.dispose();
    } catch (e) { console.warn('[studio] dispose failed', e); }
    renderer.renderLists.dispose();
  }

  const PERF = new URLSearchParams(location.search).get('perf') === '1';
  const plog = (...a) => { if (PERF) console.info('[perf]', Math.round(performance.now()), ...a); };
  async function load(id, { instantCamera = false, retry = false } = {}) {
    plog('load start', id);
    const token = ++loadToken;
    state.loading = true;
    state.error = null;
    emit('loadstart', { id });
    emit('progress', { id, value: 0.06 });
    let mod;
    try {
      mod = await loadModelModule(id, { retry });
    } catch (error) {
      if (token !== loadToken) return null;
      state.loading = false; state.error = error;
      emit('error', { id, error, stage: 'import' });
      throw error;
    }
    if (token !== loadToken || disposed) return null;
    plog('module imported');
    emit('progress', { id, value: 0.42 });
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    if (token !== loadToken || disposed) return null;

    let next;
    try {
      const built = mod.build(THREE, { quality, envMap });
      next = prepare(id, mod.meta || {}, built, mod);
    } catch (error) {
      console.error(`[studio] model "${id}" failed to build`, error);
      if (token !== loadToken) return null;
      state.loading = false; state.error = error;
      emit('error', { id, error, stage: 'build' });
      throw error;
    }
    plog('built+prepared');
    emit('progress', { id, value: 0.7 });

    // swap
    const prev = model;
    model = next;
    if (prev) {
      if (prev.sectionActive) modes.setDoubleSided(modes.owned, false);
      unload(prev);
    }
    revealTween = null;
    state.id = id;
    state.selected = -1; state.hover = -1;
    hoverBox.visible = selectBox.visible = false;
    state.explode = 0; state.explodeTarget = 0;
    state.section = 1;
    sectionPlane.constant = 1e5;
    sectionVis.visible = false;
    state.hour = DEFAULT_HOUR;
    env.fitToBounds(model.shadowBounds);
    controls.maxDistance = Math.max(260, model.radius * 5.5);
    applyMaterials();
    applyTime();
    applyExplode();

    // compile shaders before revealing (avoids a first-frame hitch)
    try {
      if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
      else renderer.compile(scene, camera);
    } catch { /* non-fatal */ }
    if (token !== loadToken || disposed) return null;
    plog('compiled');
    emit('progress', { id, value: 1 });

    // reveal: camera glides in, floors settle from a gentle explode
    const cam = model.meta.camera;
    if (instantCamera || still()) {
      tweenCamera(viewPos('aerial'), cam.target, { instant: true });
    } else {
      const from = viewPos('aerial').sub(new THREE.Vector3().fromArray(cam.target)).multiplyScalar(1.28).add(new THREE.Vector3().fromArray(cam.target));
      from.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.22);
      camera.position.copy(from);
      controls.target.fromArray(cam.target);
      controls.update(0);
      tweenCamera(viewPos('aerial'), cam.target, { duration: 1800 });
      if (model.floors.length) revealTween = { t0: now(), duration: 1500 };
    }
    state.view = 'aerial';
    state.loading = false;
    resize();
    invalidate();
    emit('load', { id, meta: model.meta, floors: model.floors.length, hotspots: model.hotspots.map((h) => ({ id: h.id, title: h.title, text: h.text })) });
    emit('change', getState());
    return model.meta;
  }
  function stepReveal(t) {
    const k = clamp((t - revealTween.t0) / revealTween.duration, 0, 1);
    const e = 1 - easeOutCubic(k);
    if (model) model.floors.forEach((f) => { f.group.position.y = f.baseY + f.level * model.gap * 0.55 * e * e; });
    if (k >= 1) { revealTween = null; applyExplode(); }
  }

  /* -------------------------------------------------------------- snapshot & thumbnails */
  /** Render now and return a copy of the frame as a 2D canvas (CSS-pixel size × scale). */
  function snapshot({ scale = 1 } = {}) {
    renderer.render(scene, camera);
    const out = document.createElement('canvas');
    out.width = Math.round(canvas.width * scale);
    out.height = Math.round(canvas.height * scale);
    out.getContext('2d').drawImage(canvas, 0, 0, out.width, out.height);
    return out;
  }

  /**
   * Render a thumbnail of any model id without disturbing the live view: the thumb model is built,
   * rendered into a corner viewport, copied to a 2D canvas and removed — all inside one task, then the
   * live frame is re-rendered, so nothing flickers. Resolves to a JPEG data URL (or null).
   */
  async function renderThumbnail(id, { w = 320, h = 200 } = {}) {
    if (disposed) return null;
    const mod = await loadModelModule(id); // rejects when the module is missing → caller marks it unavailable
    if (disposed || !model || themeFor(state.mode) !== 'sky' || state.loading) return null;
    const dpr = renderer.getPixelRatio();
    if (w * dpr > canvas.width || h * dpr > canvas.height) return null;
    let built;
    try { built = mod.build(THREE, { quality: 'low', envMap }); } catch { return null; }
    const group = new THREE.Group();
    group.add(built.root);
    if (built.site && !built.site.parent) group.add(built.site);
    const meta = normalizeMeta(id, mod.meta || {}, new THREE.Box3().setFromObject(group));
    (built.nightMaterials || []).forEach((m) => { if (m && 'emissiveIntensity' in m) m.emissiveIntensity = 0; });
    (built.lamps || []).forEach((l) => { if (l) l.intensity = 0; });

    const thumbCam = new THREE.PerspectiveCamera(30, w / h, 0.5, 4000);
    const tgt = new THREE.Vector3().fromArray(meta.camera.target);
    const dir = new THREE.Vector3().fromArray(meta.camera.aerial).sub(tgt);
    const box = new THREE.Box3().setFromObject(built.root);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const fitDist = sphere.radius / Math.sin(THREE.MathUtils.degToRad(30) / 2) * 0.6;
    thumbCam.position.copy(sphere.center).add(dir.normalize().multiplyScalar(fitDist));
    thumbCam.lookAt(sphere.center);

    // swap scene content (synchronous from here until the live frame is restored)
    const hidden = [model.root, model.site, hoverBox, selectBox, sectionVis].filter(Boolean);
    const prevVis = hidden.map((o) => o.visible);
    hidden.forEach((o) => { o.visible = false; });
    const prevHour = state.hour;
    const prevCut = sectionPlane.constant;
    sectionPlane.constant = 1e5;
    scene.add(group);
    env.setTime(DEFAULT_HOUR, meta.sun, renderer);
    env.fitToBounds(new THREE.Box3().setFromObject(group));
    let url = null;
    try {
      renderer.setViewport(0, 0, w, h);
      renderer.setScissor(0, 0, w, h);
      renderer.setScissorTest(true);
      renderer.render(scene, thumbCam);
      const out = document.createElement('canvas');
      out.width = w * 2 > 640 ? w : Math.round(w * Math.min(2, dpr));
      out.height = Math.round(out.width * (h / w));
      out.getContext('2d').drawImage(canvas, 0, canvas.height - h * dpr, w * dpr, h * dpr, 0, 0, out.width, out.height);
      url = out.toDataURL('image/jpeg', 0.84);
    } catch (e) { console.warn('[studio] thumbnail failed', e); }
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, width, height);
    scene.remove(group);
    hidden.forEach((o, i) => { o.visible = prevVis[i]; });
    sectionPlane.constant = prevCut;
    env.fitToBounds(model.shadowBounds);
    state.hour = prevHour;
    applyTime();
    renderer.render(scene, camera); // restore the live frame in the same task
    try { built.dispose?.(); } catch { /* ignore */ }
    return url;
  }

  /* -------------------------------------------------------------- public API */
  function getState() {
    return {
      id: state.id, mode: state.mode, explode: state.explodeTarget, section: state.section, hour: state.hour,
      autoRotate: state.autoRotate, hotspots: state.hotspots, selected: state.selected, view: state.view,
      loading: state.loading, floors: model ? model.floors.length : 0,
    };
  }
  function setAutoRotate(on) {
    state.autoRotate = !!on && !reduced();
    controls.autoRotate = state.autoRotate;
    invalidate();
    emit('change', getState());
  }
  function setHotspots(on) { state.hotspots = !!on; invalidate(); emit('change', getState()); }
  function reset() {
    select(-1);
    setExplode(0);
    setSection(1);
    setMode('realistic');
    setTime(DEFAULT_HOUR);
    setAutoRotate(!!opts.autoRotate);
    setView('aerial');
  }
  function setControlsEnabled({ zoom: z } = {}) {
    if (opts.controls === false) return;
    if (z !== undefined) controls.enableZoom = !!z;
  }
  function dispose() {
    disposed = true;
    syncLoop();
    unload(model); model = null;
    ro.disconnect(); io.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    dprMedia?.removeEventListener?.('change', onDprChange);
    controls.dispose();
    modes.dispose();
    env.dispose();
    envMap.dispose();
    [hoverBox, selectBox, sectionVis].forEach((g) => g.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }));
    renderer.dispose();
    renderer.forceContextLoss?.();
    canvas.remove();
    listeners.clear();
  }

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); emit('contextlost', {}); });

  resize();
  syncLoop();

  const api = {
    THREE, renderer, scene, camera, controls, canvas, quality, lowPower,
    on, load, setView, setExplode, setSection, setMode, setTime, setAutoRotate, setHotspots, setInsets,
    select, selectStep, focusPoint, focusAt, floorAt, zoom, reset, snapshot, renderThumbnail, getState, invalidate, dispose, setControlsEnabled,
    get model() { return model ? { id: model.id, meta: model.meta, floors: model.floors.map((f, i) => floorInfo(i)) } : null; },
  };
  if (opts.model) api.ready = load(opts.model).catch(() => null);
  else api.ready = Promise.resolve(null);
  return api;
}
