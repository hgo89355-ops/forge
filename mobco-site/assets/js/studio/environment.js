// MOBCO Explore in 3D · environment.js
// Sky dome (gradient + sun glow), a natural ground plane (soft earth tones, a fading survey grid only in the
// Lines style), warm key light with soft shadows, sky / ground fill, haze, and the time-of-day model (sun path
// derived from each model's meta.sun). Realistic finishing (outdoor reflections, procedural material detail,
// baked ground occlusion) lives in realism.js and is applied from setTime(), once per new material.
// Pure three.js, no DOM except one small canvas for the legacy contact shadow.

import { createRealism } from './realism.js';

const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** Hour at which the sun sits exactly at meta.sun (azimuth/elevation). */
export const DEFAULT_HOUR = 14.5;
export const MIN_HOUR = 6;
export const MAX_HOUR = 22;

// Sky keyframes by sun elevation (deg): colours are sRGB hex, interpolated in linear space.
const SKY_KEYS = [
  { el: -10, top: '#05080f', horizon: '#121a2b', bottom: '#0a0f18' },
  { el: -3, top: '#141c33', horizon: '#3a3f58', bottom: '#191d2b' },
  { el: 5, top: '#3d5274', horizon: '#e6b48a', bottom: '#6b6863' },
  { el: 16, top: '#5b84b0', horizon: '#e9dfcf', bottom: '#a29a8c' },
  { el: 32, top: '#5d8cc0', horizon: '#dfe8ef', bottom: '#b4ad9f' },
];

/** Sun azimuth/elevation (deg) at `hour` for a model whose pleasing default (at DEFAULT_HOUR) is `sun`. */
export function sunPosition(hour, sun = {}) {
  const az0 = Number.isFinite(sun.azimuth) ? sun.azimuth : 135;
  const el0 = clamp(Number.isFinite(sun.elevation) ? sun.elevation : 40, 8, 78);
  const peak = Math.min(82, el0 / Math.sin((Math.PI * (DEFAULT_HOUR - 6)) / 13));
  const frac = (hour - 6) / 13; // 06:00 → 0, 19:00 → 1
  let el;
  if (frac >= 0 && frac <= 1) el = peak * Math.sin(Math.PI * frac);
  else if (frac > 1) el = -Math.min(18, (hour - 19) * 7);
  else el = -Math.min(18, (6 - hour) * 7);
  const az = az0 + (hour - DEFAULT_HOUR) * 15;
  return { azimuth: az, elevation: el };
}

/** Direction *towards* the light: azimuth 0° = +Z, 90° = +X; elevation above the horizon. */
export function dirFromAngles(THREE, az, el, target = new THREE.Vector3()) {
  const a = az * DEG, e = el * DEG;
  return target.set(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)).normalize();
}

export function createEnvironment(THREE, { scene, quality = 'high' }) {
  const disposables = [];
  const track = (x) => (disposables.push(x), x);
  const realism = createRealism(THREE, { quality });

  /* ------------------------------------------------------------ sky dome */
  const skyUniforms = {
    uTop: { value: new THREE.Color('#5d8cc0') },
    uHorizon: { value: new THREE.Color('#dfe8ef') },
    uBottom: { value: new THREE.Color('#b4ad9f') },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color('#fff2dc') },
    uSunGlow: { value: 1 },
  };
  const skyMat = track(new THREE.ShaderMaterial({
    name: 'studio-sky',
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uBottom;
      uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uSunGlow;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uHorizon, uTop, pow(smoothstep(-0.02, 0.7, h), 0.62));
        // thin bright haze band right on the horizon
        col += uHorizon * 0.12 * (1.0 - smoothstep(0.0, 0.08, abs(h)));
        col = mix(col, uBottom, smoothstep(0.0, -0.22, h));
        float s = max(dot(d, normalize(uSunDir)), 0.0);
        col += uSunColor * (pow(s, 380.0) * 1.4 + pow(s, 24.0) * 0.2 + pow(s, 4.0) * 0.06) * uSunGlow;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  const sky = new THREE.Mesh(track(new THREE.SphereGeometry(1, 48, 24)), skyMat);
  sky.name = 'studio-sky';
  sky.scale.setScalar(1800);
  sky.renderOrder = -100;
  sky.frustumCulled = false;
  sky.onBeforeRender = (r, s, camera) => { sky.position.copy(camera.position); sky.updateMatrixWorld(); };
  scene.add(sky);

  /* ------------------------------------------------------------ ground: soft earth, grid only in Lines */
  const groundUniforms = {
    uGridColor: { value: new THREE.Color('#bdb6ab') },
    uGridOpacity: { value: 0.0 },
    uFadeNear: { value: 90 },
    uFadeFar: { value: 320 },
    uFlat: { value: 0 },
    uFlatColor: { value: new THREE.Vector3(0.12, 0.12, 0.22) }, // output-space (sRGB) colour
    uFlatGrid: { value: new THREE.Vector3(1, 1, 1) },
    uFlatGridOpacity: { value: 0.12 },
  };
  const groundMat = track(new THREE.MeshStandardMaterial({ name: 'studio-ground', color: '#cfc7b6', roughness: 1, metalness: 0 }));
  groundMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, groundUniforms, realism.uniforms);
    shader.vertexShader = realism.VERT_DECL + shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>\n${realism.VERT_BODY}`,
    );
    shader.fragmentShader = realism.GLSL_COMMON + `
      uniform vec3 uGridColor; uniform float uGridOpacity; uniform float uFadeNear; uniform float uFadeFar;
      uniform float uFlat; uniform vec3 uFlatColor; uniform vec3 uFlatGrid; uniform float uFlatGridOpacity;
      float studioGrid(vec2 p, float s) {
        vec2 q = p / s;
        vec2 g = abs(fract(q - 0.5) - 0.5) / max(fwidth(q), vec2(1e-4));
        return 1.0 - min(min(g.x, g.y), 1.0);
      }
    ` + shader.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec3 gp = vRlWorld;
          float big = rlNoise(gp * 0.012 + 2.0);
          float mid = rlNoise(gp * 0.07);
          float fine = rlDetail(gp, 0.9);
          // dry earth with faint sandier and greener drifts, very low contrast
          diffuseColor.rgb *= mix(vec3(0.95, 0.96, 0.93), vec3(1.05, 1.02, 0.95), big);
          diffuseColor.rgb *= 0.94 + 0.08 * mid + 0.05 * (fine - 0.5);
          float gFade = 1.0 - smoothstep(uFadeNear, uFadeFar, length(gp.xz));
          float gLines = max(studioGrid(gp.xz, 10.0) * 0.55, studioGrid(gp.xz, 50.0));
          diffuseColor.rgb = mix(diffuseColor.rgb, uGridColor, gLines * gFade * uGridOpacity * (1.0 - uFlat));
        }`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>\n${realism.AO_APPLY}`)
      .replace('#include <colorspace_fragment>', `#include <colorspace_fragment>
        if (uFlat > 0.5) {
          float fFade = 1.0 - smoothstep(uFadeNear * 0.8, uFadeFar, length(vRlWorld.xz));
          float fLines = max(studioGrid(vRlWorld.xz, 5.0) * 0.45, studioGrid(vRlWorld.xz, 25.0));
          gl_FragColor = vec4(mix(uFlatColor, uFlatGrid, fLines * fFade * uFlatGridOpacity), 1.0);
        }`);
  };
  groundMat.customProgramCacheKey = () => 'mobco-studio-ground-v2';
  const ground = new THREE.Mesh(track(new THREE.PlaneGeometry(5000, 5000)), groundMat);
  ground.name = 'studio-ground';
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  /* ------------------------------------------------------------ contact shadow (legacy blob, kept for the API;
     the baked ground occlusion replaces it, so it stays hidden) */
  const contactMat = track(new THREE.MeshBasicMaterial({ name: 'studio-contact', color: '#1a1a2a', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  const contact = new THREE.Mesh(track(new THREE.PlaneGeometry(1, 1)), contactMat);
  contact.name = 'studio-contact-shadow';
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.01;
  contact.visible = false;
  scene.add(contact);

  /* ------------------------------------------------------------ lights */
  const hemi = new THREE.HemisphereLight('#cfe0f2', '#a3967f', 0.5);
  hemi.name = 'studio-hemi';
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe9cc', 2.6);
  sun.name = 'studio-sun';
  sun.castShadow = true;
  const mapSize = quality === 'low' ? 1024 : 2048;
  sun.shadow.mapSize.set(mapSize, mapSize);
  sun.shadow.radius = quality === 'low' ? 2.5 : 4;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.045;
  sun.shadow.intensity = 0.92; // a little sky light always reaches into the shade
  scene.add(sun, sun.target);

  const fog = new THREE.Fog('#dfe8ef', 200, 900);
  scene.fog = fog;

  /* ------------------------------------------------------------ state */
  const center = new THREE.Vector3();
  let radius = 80;
  const lightDir = new THREE.Vector3(0, 1, 0);
  const tmpA = new THREE.Color(), tmpB = new THREE.Color();
  let current = { night: 0, day: 1, elevation: 40, azimuth: 135 };
  let theme = 'sky';
  let aoBox = null, aoDirty = false;
  let toneReady = false;
  const envObjects = new Set([sky, ground, contact]);

  function fitToBounds(box) {
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    center.copy(sphere.center);
    radius = Math.max(20, sphere.radius);
    const cam = sun.shadow.camera;
    const r = radius * 1.08;
    cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r;
    cam.near = 0.5; cam.far = radius * 6;
    cam.updateProjectionMatrix();
    const size = box.getSize(new THREE.Vector3());
    contact.scale.set(Math.max(20, size.x * 1.35), Math.max(20, size.z * 1.35), 1);
    contact.position.x = (box.min.x + box.max.x) / 2;
    contact.position.z = (box.min.z + box.max.z) / 2;
    groundUniforms.uFadeNear.value = radius * 1.1;
    groundUniforms.uFadeFar.value = radius * 3.6;
    fog.near = radius * 3;
    fog.far = radius * 14;
    aoBox = box.clone();
    aoDirty = true;
    placeLight();
  }

  function placeLight() {
    sun.position.copy(center).addScaledVector(lightDir, radius * 3);
    sun.target.position.copy(center);
    sun.target.updateMatrixWorld();
  }

  function lerpKeys(el) {
    const keys = SKY_KEYS;
    if (el <= keys[0].el) return [keys[0], keys[0], 0];
    for (let i = 0; i < keys.length - 1; i++) {
      if (el <= keys[i + 1].el) return [keys[i], keys[i + 1], (el - keys[i].el) / (keys[i + 1].el - keys[i].el)];
    }
    const last = keys[keys.length - 1];
    return [last, last, 0];
  }

  /** Realism pass: new materials, matching reflections and (after a model change) the ground occlusion. */
  function finish(renderer, elevation) {
    if (!renderer) return;
    if (!toneReady) {
      // Neutral (Khronos PBR) tone mapping keeps white stone and render white without the ACES hue shift and
      // rolls highlights off softly, so sunlit facades never clip
      renderer.toneMapping = THREE.NeutralToneMapping;
      toneReady = true;
    }
    try {
      realism.enhanceScene(scene);
      realism.setEnvironment(scene, renderer, elevation, scene.environmentIntensity);
      if (aoDirty && theme === 'sky') { aoDirty = false; realism.bakeAO(renderer, scene, aoBox, envObjects); }
    } catch (e) { console.warn('[studio] realism pass failed', e); }
  }

  /**
   * Apply a time of day. Returns { night, day } factors (0..1) so the engine can ramp
   * night materials and lamps. `sunMeta` = model meta.sun.
   */
  function setTime(hour, sunMeta, renderer) {
    const { azimuth, elevation } = sunPosition(hour, sunMeta);
    const day = smoothstep(-4, 14, elevation);
    const night = 1 - smoothstep(-6, 3, elevation);
    const golden = smoothstep(16, 4, elevation) * smoothstep(-4, 2, elevation);
    // sky colours
    const [a, b, t] = lerpKeys(elevation);
    const s = smoothstep(0, 1, t);
    skyUniforms.uTop.value.copy(tmpA.set(a.top)).lerp(tmpB.set(b.top), s);
    skyUniforms.uHorizon.value.copy(tmpA.set(a.horizon)).lerp(tmpB.set(b.horizon), s);
    skyUniforms.uBottom.value.copy(tmpA.set(a.bottom)).lerp(tmpB.set(b.bottom), s);
    fog.color.copy(skyUniforms.uHorizon.value).lerp(skyUniforms.uBottom.value, 0.2);
    // key light: a warm sun by day, a cool moon after dusk
    const moon = elevation < -2.5;
    if (moon) {
      dirFromAngles(THREE, sunMeta?.azimuth != null ? sunMeta.azimuth + 160 : 300, 38, lightDir);
      sun.color.set('#9fb2d8');
      sun.intensity = 0.38 * smoothstep(-2.5, -9, elevation);
    } else {
      dirFromAngles(THREE, azimuth, Math.max(elevation, 1.5), lightDir);
      const warm = smoothstep(3, 34, elevation);
      sun.color.copy(tmpA.set('#ff9f62')).lerp(tmpB.set('#ffeacf'), warm);
      sun.intensity = 2.75 * day + 0.6 * golden;
    }
    placeLight();
    skyUniforms.uSunDir.value.copy(dirFromAngles(THREE, azimuth, elevation, new THREE.Vector3()));
    skyUniforms.uSunColor.value.copy(sun.color);
    skyUniforms.uSunGlow.value = moon ? 0 : 0.35 + 0.65 * day;
    // fill: sky above, warm bounce from the ground below
    hemi.color.copy(skyUniforms.uTop.value).lerp(tmpB.set('#ffffff'), 0.5);
    hemi.groundColor.copy(tmpA.set(night > 0.5 ? '#16161f' : '#a3967f')).lerp(tmpB.set('#c48a5c'), golden * 0.5);
    hemi.intensity = 0.07 + 0.55 * day;
    // very low at night: bright reflections on glass would wash out the lit interiors
    scene.environmentIntensity = 0.035 + 0.785 * day;
    if (renderer) renderer.toneMappingExposure = 0.98 + 0.12 * night;
    current = { night, day, elevation, azimuth };
    finish(renderer, elevation);
    return current;
  }

  /**
   * Visual theme for render modes: 'sky' (realistic / clay), 'blueprint', 'xray'.
   */
  function setTheme(next) {
    theme = next;
    const flat = next === 'blueprint' || next === 'xray';
    sky.visible = !flat;
    contact.visible = false;
    sun.castShadow = !flat;
    groundUniforms.uFlat.value = flat ? 1 : 0;
    realism.setAOEnabled(!flat);
    if (next === 'blueprint') {
      scene.background = new THREE.Color('#23234a');
      groundUniforms.uFlatColor.value.set(35 / 255, 35 / 255, 74 / 255);
      groundUniforms.uFlatGrid.value.set(0.86, 0.88, 0.97);
      groundUniforms.uFlatGridOpacity.value = 0.16;
    } else if (next === 'xray') {
      scene.background = new THREE.Color('#1f1f38');
      groundUniforms.uFlatColor.value.set(31 / 255, 31 / 255, 56 / 255);
      groundUniforms.uFlatGrid.value.set(95 / 255, 178 / 255, 184 / 255);
      groundUniforms.uFlatGridOpacity.value = 0.12;
    } else {
      scene.background = null;
    }
    scene.fog = flat ? null : fog;
  }

  function dispose() {
    scene.remove(sky, ground, contact, hemi, sun, sun.target);
    sun.shadow.map?.dispose();
    realism.dispose();
    disposables.forEach((d) => d.dispose?.());
  }

  return {
    sky, ground, contact, sun, hemi, realism,
    fitToBounds, setTime, setTheme, dispose,
    get state() { return current; },
    get radius() { return radius; },
  };
}
