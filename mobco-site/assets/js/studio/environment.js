// MOBCO 3D Studio — environment.js
// Sky dome (gradient + sun glow), ground plane with a procedural fading grid, a soft contact shadow,
// key/fill lights, fog, and the time-of-day model (sun path derived from each model's meta.sun).
// Owned by the studio page. Pure three.js — no DOM.

const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** Hour at which the sun sits exactly at meta.sun (azimuth/elevation). */
export const DEFAULT_HOUR = 14.5;
export const MIN_HOUR = 6;
export const MAX_HOUR = 22;

// Sky keyframes by sun elevation (deg): colours are sRGB hex, interpolated in linear space.
const SKY_KEYS = [
  { el: -10, top: '#060d14', horizon: '#14263a', bottom: '#0b1620' },
  { el: -3, top: '#13253a', horizon: '#3b4a5e', bottom: '#1a2b3a' },
  { el: 5, top: '#3a5671', horizon: '#ddb490', bottom: '#5f6a70' },
  { el: 16, top: '#5f81a0', horizon: '#e4dccf', bottom: '#8f9a9f' },
  { el: 32, top: '#6f8fa9', horizon: '#e1e8ec', bottom: '#a7b1b6' },
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

  /* ------------------------------------------------------------ sky dome */
  const skyUniforms = {
    uTop: { value: new THREE.Color('#6f8fa9') },
    uHorizon: { value: new THREE.Color('#e1e8ec') },
    uBottom: { value: new THREE.Color('#a7b1b6') },
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
        vec3 col = mix(uHorizon, uTop, pow(smoothstep(-0.02, 0.62, h), 0.75));
        col = mix(col, uBottom, smoothstep(0.0, -0.22, h));
        float s = max(dot(d, normalize(uSunDir)), 0.0);
        col += uSunColor * (pow(s, 380.0) * 1.4 + pow(s, 24.0) * 0.22 + pow(s, 4.0) * 0.06) * uSunGlow;
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

  /* ------------------------------------------------------------ ground with procedural grid */
  const groundUniforms = {
    uGridColor: { value: new THREE.Color('#bdb6ab') },
    uGridOpacity: { value: 0.55 },
    uFadeNear: { value: 90 },
    uFadeFar: { value: 320 },
    uFlat: { value: 0 },
    uFlatColor: { value: new THREE.Vector3(0.06, 0.16, 0.27) }, // output-space (sRGB) colour
    uFlatGrid: { value: new THREE.Vector3(1, 1, 1) },
    uFlatGridOpacity: { value: 0.12 },
  };
  const groundMat = track(new THREE.MeshStandardMaterial({ name: 'studio-ground', color: '#e7e3dc', roughness: 1, metalness: 0 }));
  groundMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, groundUniforms);
    shader.vertexShader = 'varying vec3 vGroundPos;\n' + shader.vertexShader.replace(
      '#include <project_vertex>',
      '#include <project_vertex>\n vGroundPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    );
    shader.fragmentShader = `
      varying vec3 vGroundPos;
      uniform vec3 uGridColor; uniform float uGridOpacity; uniform float uFadeNear; uniform float uFadeFar;
      uniform float uFlat; uniform vec3 uFlatColor; uniform vec3 uFlatGrid; uniform float uFlatGridOpacity;
      float studioGrid(vec2 p, float s) {
        vec2 q = p / s;
        vec2 g = abs(fract(q - 0.5) - 0.5) / max(fwidth(q), vec2(1e-4));
        return 1.0 - min(min(g.x, g.y), 1.0);
      }
    ` + shader.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
        float gFade = 1.0 - smoothstep(uFadeNear, uFadeFar, length(vGroundPos.xz));
        float gLines = max(studioGrid(vGroundPos.xz, 10.0) * 0.55, studioGrid(vGroundPos.xz, 50.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, uGridColor, gLines * gFade * uGridOpacity * (1.0 - uFlat));`)
      .replace('#include <colorspace_fragment>', `#include <colorspace_fragment>
        if (uFlat > 0.5) {
          float fFade = 1.0 - smoothstep(uFadeNear * 0.8, uFadeFar, length(vGroundPos.xz));
          float fLines = max(studioGrid(vGroundPos.xz, 5.0) * 0.45, studioGrid(vGroundPos.xz, 25.0));
          gl_FragColor = vec4(mix(uFlatColor, uFlatGrid, fLines * fFade * uFlatGridOpacity), 1.0);
        }`);
  };
  groundMat.customProgramCacheKey = () => 'mobco-studio-ground-v1';
  const ground = new THREE.Mesh(track(new THREE.PlaneGeometry(5000, 5000)), groundMat);
  ground.name = 'studio-ground';
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  /* ------------------------------------------------------------ contact shadow (soft radial) */
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g2 = c.getContext('2d');
  const grad = g2.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0.85)');
  grad.addColorStop(0.45, 'rgba(0,0,0,0.42)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g2.fillStyle = grad;
  g2.fillRect(0, 0, 256, 256);
  const contactTex = track(new THREE.CanvasTexture(c));
  contactTex.colorSpace = THREE.SRGBColorSpace;
  const contactMat = track(new THREE.MeshBasicMaterial({
    name: 'studio-contact', map: contactTex, color: '#1a2a36', transparent: true, opacity: 0.32, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, toneMapped: false,
  }));
  const contact = new THREE.Mesh(track(new THREE.PlaneGeometry(1, 1)), contactMat);
  contact.name = 'studio-contact-shadow';
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.01;
  contact.renderOrder = -1;
  scene.add(contact);

  /* ------------------------------------------------------------ lights */
  const hemi = new THREE.HemisphereLight('#dbe6ee', '#b7ad9f', 0.6);
  hemi.name = 'studio-hemi';
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff4e6', 2.4);
  sun.name = 'studio-sun';
  sun.castShadow = true;
  const mapSize = quality === 'low' ? 1024 : 2048;
  sun.shadow.mapSize.set(mapSize, mapSize);
  sun.shadow.radius = quality === 'low' ? 2 : 3.5;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.035;
  scene.add(sun, sun.target);

  const fog = new THREE.Fog('#e1e8ec', 200, 900);
  scene.fog = fog;

  /* ------------------------------------------------------------ state */
  const center = new THREE.Vector3();
  let radius = 80;
  const lightDir = new THREE.Vector3(0, 1, 0);
  const tmpA = new THREE.Color(), tmpB = new THREE.Color();
  let current = { night: 0, day: 1, elevation: 40, azimuth: 135 };

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
    fog.near = radius * 2.6;
    fog.far = radius * 9;
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

  /**
   * Apply a time of day. Returns { night, day } factors (0..1) so the engine can ramp
   * night materials and lamps. `sunMeta` = model meta.sun.
   */
  function setTime(hour, sunMeta, renderer) {
    const { azimuth, elevation } = sunPosition(hour, sunMeta);
    const day = smoothstep(-4, 14, elevation);
    const night = 1 - smoothstep(-6, 3, elevation);
    // sky colours
    const [a, b, t] = lerpKeys(elevation);
    const s = smoothstep(0, 1, t);
    skyUniforms.uTop.value.copy(tmpA.set(a.top)).lerp(tmpB.set(b.top), s);
    skyUniforms.uHorizon.value.copy(tmpA.set(a.horizon)).lerp(tmpB.set(b.horizon), s);
    skyUniforms.uBottom.value.copy(tmpA.set(a.bottom)).lerp(tmpB.set(b.bottom), s);
    fog.color.copy(skyUniforms.uHorizon.value).lerp(skyUniforms.uBottom.value, 0.25);
    // key light: sun by day, a cool moon after dusk
    const moon = elevation < -2.5;
    if (moon) {
      dirFromAngles(THREE, sunMeta?.azimuth != null ? sunMeta.azimuth + 160 : 300, 38, lightDir);
      sun.color.set('#a9bedb');
      sun.intensity = 0.42 * smoothstep(-2.5, -9, elevation);
    } else {
      dirFromAngles(THREE, azimuth, Math.max(elevation, 1.5), lightDir);
      const warm = smoothstep(4, 30, elevation);
      sun.color.copy(tmpA.set('#ffb98a')).lerp(tmpB.set('#fff5e8'), warm);
      sun.intensity = 2.3 * day;
    }
    placeLight();
    skyUniforms.uSunDir.value.copy(dirFromAngles(THREE, azimuth, elevation, new THREE.Vector3()));
    skyUniforms.uSunColor.value.copy(sun.color);
    skyUniforms.uSunGlow.value = moon ? 0 : 0.35 + 0.65 * day;
    hemi.color.copy(skyUniforms.uTop.value).lerp(tmpB.set('#ffffff'), 0.45);
    hemi.groundColor.set(night > 0.5 ? '#1c2630' : '#b7ad9f');
    hemi.intensity = 0.07 + 0.59 * day;
    // very low at night: bright studio-room reflections on glass would wash out the lit interiors
    scene.environmentIntensity = 0.035 + 0.785 * day;
    if (renderer) renderer.toneMappingExposure = 0.9 + 0.1 * night;
    contactMat.opacity = 0.14 + 0.2 * day;
    current = { night, day, elevation, azimuth };
    return current;
  }

  /**
   * Visual theme for render modes: 'sky' (realistic / clay), 'blueprint', 'xray'.
   */
  function setTheme(theme) {
    const flat = theme === 'blueprint' || theme === 'xray';
    sky.visible = !flat;
    contact.visible = !flat;
    sun.castShadow = !flat;
    groundUniforms.uFlat.value = flat ? 1 : 0;
    if (theme === 'blueprint') {
      scene.background = new THREE.Color('#0f2b47');
      groundUniforms.uFlatColor.value.set(15 / 255, 43 / 255, 71 / 255);
      groundUniforms.uFlatGrid.value.set(0.82, 0.9, 0.97);
      groundUniforms.uFlatGridOpacity.value = 0.16;
    } else if (theme === 'xray') {
      scene.background = new THREE.Color('#0b1620');
      groundUniforms.uFlatColor.value.set(11 / 255, 22 / 255, 32 / 255);
      groundUniforms.uFlatGrid.value.set(111 / 255, 209 / 255, 197 / 255);
      groundUniforms.uFlatGridOpacity.value = 0.12;
    } else {
      scene.background = null;
    }
    scene.fog = flat ? null : fog;
  }

  function dispose() {
    scene.remove(sky, ground, contact, hemi, sun, sun.target);
    sun.shadow.map?.dispose();
    disposables.forEach((d) => d.dispose?.());
  }

  return {
    sky, ground, contact, sun, hemi,
    fitToBounds, setTime, setTheme, dispose,
    get state() { return current; },
    get radius() { return radius; },
  };
}
