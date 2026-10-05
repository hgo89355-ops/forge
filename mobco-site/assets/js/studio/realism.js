// MOBCO Explore in 3D · realism.js
// Physically plausible finishing for every model (the five project models), applied once per
// material after the engine has prepared a model (environment.setTime → enhanceScene):
//   · an outdoor image-based light (sky, warm ground, a soft distant skyline) instead of a studio room, in a
//     day, golden-hour and night variant, so glass and water reflect a believable surrounding
//   · world-space procedural detail by material family (stone / render grain and roughness variation,
//     running-bond brick, paving joints, asphalt grain, lawn and foliage colour variation, glass fresnel)
//   · a baked "ground occlusion" map (bottom-up + top-down depth of the buildings, blurred) that darkens the
//     ground around buildings and trees and the foot of every wall: soft contact shadows without post-processing.
// Pure three.js, no DOM. Cheap enough for software WebGL (one texture fetch and a few noise taps per pixel).

const AO_SIZE_HIGH = 512;
const AO_SIZE_LOW = 256;
const AO_FALLOFF = 7;   // m: a surface this far above the ground no longer occludes (bottom-up depth range)

/* ------------------------------------------------------------------ material families */
const SKIP = /^(mode-|edge-|studio-)/;
const RULES = [
  ['water', /water|lagoon/i],
  ['solar', /solar/i],
  ['foliage', /foliage|canopy|frond|leaf|hedge|shrub|tree-a|tree-b|bush/i],
  ['grass', /lawn|grass|sedum|green-roof|turf|meadow/i],
  ['asphalt', /asphalt|road(?!-mark)|parking-surface/i],
  ['brick', /brick|terracotta/i],
  ['paving', /paving|plaza|pave|kerb|curb|coping|forecourt|gravel|sand-deck|lagoon-sand|deck-stone/i],
  ['timber', /timber|deck|wood/i],
  ['masonry', /stone|limestone|precast|render|plaster|concrete|white|shell|plinth|trim|portal|parapet|wall|campus-frame|facade-solid|column/i],
];

export function isGlassLike(m) {
  return !!m && ((m.transparent && m.opacity < 0.95) || (m.transmission || 0) > 0.05);
}

export function classify(m) {
  if (!m || !(m.isMeshStandardMaterial)) return null;
  const name = String(m.name || '');
  if (SKIP.test(name)) return null;
  if (m.userData && m.userData.realism) return m.userData.realism; // explicit opt-in / opt-out from a model
  if (/water|lagoon/i.test(name)) return 'water';
  if (isGlassLike(m) && /glass|glazing|balustrade|glaz/i.test(name)) return 'glass';
  if (isGlassLike(m)) return 'plain';
  for (const [cls, re] of RULES) if (re.test(name)) return cls;
  return 'plain';
}

/* ------------------------------------------------------------------ GLSL */
const GLSL_COMMON = /* glsl */`
uniform sampler2D rlAOMap;
uniform mat4 rlAOMatrix;
uniform vec4 rlAOParams; // x strength, y top-height range (m), z on, w direct-light share
varying vec3 vRlWorld;
varying vec3 vRlNormal;
float rlHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float rlHash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float rlNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(rlHash(i), rlHash(i + vec3(1, 0, 0)), f.x), mix(rlHash(i + vec3(0, 1, 0)), rlHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(rlHash(i + vec3(0, 0, 1)), rlHash(i + vec3(1, 0, 1)), f.x), mix(rlHash(i + vec3(0, 1, 1)), rlHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
// two octaves + a fine grain that fades out with distance (no shimmering at aerial range)
float rlDetail(vec3 p, float scale) {
  float px = length(fwidth(p)) * scale;
  float fine = 1.0 - smoothstep(0.15, 0.6, px * 6.0);
  return 0.62 * rlNoise(p * scale) + 0.38 * mix(0.5, rlNoise(p * scale * 6.3 + 7.1), fine);
}
float rlAO() {
  if (rlAOParams.z < 0.5) return 1.0;
  vec4 c = rlAOMatrix * vec4(vRlWorld, 1.0);
  vec2 uv = c.xy * 0.5 + 0.5;
  if (uv.x <= 0.0 || uv.y <= 0.0 || uv.x >= 1.0 || uv.y >= 1.0) return 1.0;
  vec2 s = texture2D(rlAOMap, uv).rg;
  float top = s.g * rlAOParams.y;
  float y = vRlWorld.y;
  float vert = 1.0 - smoothstep(0.0, 3.4, y);
  float beside = clamp((top - y) / 0.9, 0.0, 1.0);
  return 1.0 - rlAOParams.x * s.r * vert * beside;
}
`;

const VERT_DECL = 'varying vec3 vRlWorld;\nvarying vec3 vRlNormal;\n';
const VERT_BODY = /* glsl */`
  vec4 rlW = vec4(transformed, 1.0);
  vec3 rlN = objectNormal;
  #ifdef USE_BATCHING
    rlW = batchingMatrix * rlW;
  #endif
  #ifdef USE_INSTANCING
    rlW = instanceMatrix * rlW;
    rlN = mat3(instanceMatrix) * rlN;
  #endif
  vRlWorld = (modelMatrix * rlW).xyz;
  vRlNormal = normalize(mat3(modelMatrix) * rlN);
`;

// Albedo / roughness detail per family (inserted after map_fragment and roughnessmap_fragment).
const ALBEDO = {
  masonry: /* glsl */`
    { float n = rlDetail(vRlWorld, 0.9);
      float big = rlNoise(vRlWorld * 0.08 + 3.0);
      diffuseColor.rgb *= 0.93 + 0.1 * n + 0.05 * (big - 0.5);
      // faint weathering: a touch darker towards the foot of walls
      diffuseColor.rgb *= mix(0.94, 1.0, smoothstep(0.0, 1.6, vRlWorld.y)); }`,
  brick: /* glsl */`
    { vec3 an = abs(vRlNormal);
      vec2 bp = an.x > an.z ? vec2(vRlWorld.z, vRlWorld.y) : vec2(vRlWorld.x, vRlWorld.y);
      if (an.y > 0.7) bp = vRlWorld.xz;
      #ifndef USE_MAP
        vec2 q = bp / vec2(0.25, 0.085);
        q.x += 0.5 * mod(floor(q.y), 2.0);
        vec2 f = fract(q); vec2 id = floor(q);
        vec2 fw = fwidth(q);
        float vis = 1.0 - smoothstep(0.18, 0.5, max(fw.x, fw.y));
        float mx = smoothstep(0.0, 0.05 + fw.x, f.x) * smoothstep(0.0, 0.05 + fw.x, 1.0 - f.x);
        float my = smoothstep(0.0, 0.12 + fw.y, f.y) * smoothstep(0.0, 0.12 + fw.y, 1.0 - f.y);
        float brick = mx * my;
        float tint = rlHash2(id) - 0.5;
        vec3 bc = diffuseColor.rgb * (1.0 + 0.22 * tint) * vec3(1.0 + 0.04 * tint, 1.0, 1.0 - 0.03 * tint);
        vec3 mortar = mix(diffuseColor.rgb, vec3(0.78, 0.75, 0.70), 0.55);
        vec3 pat = mix(mortar, bc, brick);
        diffuseColor.rgb = mix(diffuseColor.rgb * 0.97, pat, vis);
      #endif
      diffuseColor.rgb *= 0.95 + 0.08 * rlNoise(vRlWorld * 0.6); }`,
  paving: /* glsl */`
    { float n = rlDetail(vRlWorld, 1.4);
      diffuseColor.rgb *= 0.94 + 0.1 * n;
      #ifndef USE_MAP
        if (abs(vRlNormal.y) > 0.7) {
          vec2 q = vRlWorld.xz / 0.9;
          vec2 f = abs(fract(q) - 0.5);
          vec2 fw = fwidth(q);
          float vis = 1.0 - smoothstep(0.08, 0.3, max(fw.x, fw.y));
          float j = 1.0 - smoothstep(0.47 - fw.x, 0.49, max(f.x, f.y));
          diffuseColor.rgb *= mix(1.0, mix(0.86, 1.0, j), vis);
          diffuseColor.rgb *= 0.97 + 0.06 * rlHash2(floor(q));
        }
      #endif
    }`,
  asphalt: /* glsl */`
    { float n = rlDetail(vRlWorld, 2.2);
      float patchN = rlNoise(vRlWorld * 0.12);
      diffuseColor.rgb *= 0.9 + 0.16 * n + 0.08 * (patchN - 0.5); }`,
  grass: /* glsl */`
    { float big = rlNoise(vRlWorld * 0.09 + 11.0);
      float mid = rlDetail(vRlWorld, 0.7);
      vec3 dry = vec3(1.12, 1.06, 0.82), lush = vec3(0.86, 0.98, 0.84);
      diffuseColor.rgb *= mix(lush, dry, smoothstep(0.25, 0.85, big)) * (0.9 + 0.2 * mid); }`,
  foliage: /* glsl */`
    { float big = rlNoise(vRlWorld * 0.11 + 5.0);
      float mid = rlNoise(vRlWorld * 1.3);
      vec3 warm = vec3(1.1, 1.06, 0.84), cool = vec3(0.86, 0.97, 0.92);
      diffuseColor.rgb *= mix(cool, warm, big) * (0.82 + 0.3 * mid);
      // sunlit tops read lighter, undersides darker (cheap canopy self-shading)
      diffuseColor.rgb *= 0.85 + 0.22 * clamp(vRlNormal.y * 0.5 + 0.5, 0.0, 1.0); }`,
  timber: /* glsl */`
    { vec3 an = abs(vRlNormal);
      float along = an.y > 0.7 ? vRlWorld.x : vRlWorld.y;
      float grain = rlNoise(vec3(along * 0.6, vRlWorld.z * 9.0, vRlWorld.y * 9.0));
      diffuseColor.rgb *= 0.88 + 0.2 * grain; }`,
  solar: '',
  water: '',
  glass: '',
  plain: '',
};
const ROUGH = {
  masonry: 'roughnessFactor = clamp(roughnessFactor + (rlNoise(vRlWorld * 1.7) - 0.5) * 0.16, 0.05, 1.0);',
  brick: 'roughnessFactor = clamp(roughnessFactor + (rlNoise(vRlWorld * 3.0) - 0.5) * 0.12, 0.05, 1.0);',
  paving: 'roughnessFactor = clamp(roughnessFactor + (rlNoise(vRlWorld * 2.1) - 0.5) * 0.18, 0.05, 1.0);',
  asphalt: 'roughnessFactor = clamp(roughnessFactor - 0.06 + (rlNoise(vRlWorld * 0.3) - 0.5) * 0.12, 0.05, 1.0);',
  timber: '',
  grass: '',
  foliage: '',
  water: '',
  glass: 'roughnessFactor = clamp(roughnessFactor + (rlNoise(vRlWorld * 0.05) - 0.5) * 0.04, 0.0, 1.0);',
  solar: 'roughnessFactor = clamp(roughnessFactor + (rlNoise(vRlWorld * 0.4) - 0.5) * 0.06, 0.05, 1.0);',
  plain: '',
};
// Physically shaped glass (opt-in with material.userData.physicalGlass): the tinted body covers what is behind
// by its opacity, rising towards 1 at grazing angles (Fresnel), while reflections are ADDED on top instead of being
// scaled by the opacity. Output is premultiplied; the material blends One / OneMinusSrcAlpha. Lit interiors stay
// visible through clear panels at night and the sky still reads on the glass.
const PHYSICAL_GLASS = /* glsl */`
  { float pgNV = saturate(dot(geometryNormal, geometryViewDir));
    float pgF = pow(1.0 - pgNV, 5.0);
    float pgA = clamp(diffuseColor.a + (1.0 - diffuseColor.a) * pgF * 0.85, 0.0, 1.0);
    gl_FragColor = vec4(totalDiffuse * pgA + totalSpecular + totalEmissiveRadiance, pgA); }`;
// Glass: let reflections win at grazing angles (real glazing turns mirror-like towards the horizon)
const GLASS_ALPHA = /* glsl */`
  { float rlF = pow(1.0 - saturate(dot(geometryNormal, geometryViewDir)), 3.0);
    gl_FragColor.a = clamp(gl_FragColor.a + rlF * 0.55 * (1.0 - gl_FragColor.a), 0.0, 1.0); }`;
const AO_APPLY = /* glsl */`
  { float rlA = rlAO();
    reflectedLight.indirectDiffuse *= rlA;
    reflectedLight.indirectSpecular *= mix(1.0, rlA, 0.7);
    reflectedLight.directDiffuse *= mix(1.0, rlA, rlAOParams.w); }`;

/* ------------------------------------------------------------------ shared state */
export function createRealism(THREE, { quality = 'high' } = {}) {
  const uniforms = {
    rlAOMap: { value: null },
    rlAOMatrix: { value: new THREE.Matrix4() },
    rlAOParams: { value: new THREE.Vector4(0.55, 40, 0, 0.32) },
  };
  const envTargets = {};      // variant → WebGLRenderTarget (PMREM)
  let envVariant = null;
  const envMats = new Set();  // materials given the outdoor env explicitly (glass, water)
  let envIntensityScale = 1;

  /* ---------------------------------------------------------------- material patch */
  function patchMaterial(m) {
    if (!m || m.userData.__rl !== undefined) return false;
    const cls = classify(m);
    m.userData.__rl = cls || false;
    if (!cls) return false;
    const pg = !!m.userData.physicalGlass && m.transparent;
    if (pg) {
      m.blending = THREE.CustomBlending;
      m.blendEquation = THREE.AddEquation;
      m.blendSrc = THREE.OneFactor;
      m.blendDst = THREE.OneMinusSrcAlphaFactor;
      m.blendSrcAlpha = THREE.OneFactor;
      m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
      m.premultipliedAlpha = false;
    }
    // reflections: glass and water take the outdoor environment explicitly so they can reflect more than
    // the diffuse fill (scene.environmentIntensity applies to materials without their own envMap)
    if (cls === 'glass' || cls === 'water' || cls === 'solar') {
      const base = Number.isFinite(m.userData.baseEnvMapIntensity) ? m.userData.baseEnvMapIntensity : (m.envMapIntensity || 1);
      m.userData.__rlEnvBase = cls === 'glass' ? Math.max(base, 1.25) : cls === 'water' ? Math.max(base, 1.1) : 1.0;
      m.envMapIntensity = m.userData.__rlEnvBase * envIntensityScale;
      if (envTargets[envVariant]) m.envMap = envTargets[envVariant].texture;
      envMats.add(m);
      if (cls === 'glass') {
        m.roughness = Math.min(m.roughness ?? 0.05, 0.06);
        if ('ior' in m && !pg) m.ior = 1.52;
        if ('specularIntensity' in m) m.specularIntensity = 1;
      }
      if (cls === 'water') m.roughness = Math.min(m.roughness ?? 0.05, 0.05);
    }
    const prev = m.onBeforeCompile;
    const prevKey = m.customProgramCacheKey;
    m.onBeforeCompile = function onRealism(shader, renderer) {
      if (typeof prev === 'function') prev.call(this, shader, renderer);
      Object.assign(shader.uniforms, uniforms);
      let vs = shader.vertexShader;
      vs = VERT_DECL + vs;
      vs = vs.includes('#include <project_vertex>')
        ? vs.replace('#include <project_vertex>', `#include <project_vertex>\n${VERT_BODY}`)
        : vs;
      shader.vertexShader = vs;
      let fs = shader.fragmentShader;
      fs = GLSL_COMMON + fs;
      if (ALBEDO[cls]) fs = fs.replace('#include <map_fragment>', `#include <map_fragment>\n${ALBEDO[cls]}`);
      if (ROUGH[cls]) fs = fs.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${ROUGH[cls]}`);
      if (cls !== 'glass' && cls !== 'water') fs = fs.replace('#include <aomap_fragment>', `#include <aomap_fragment>\n${AO_APPLY}`);
      if (pg) fs = fs.replace('#include <opaque_fragment>', PHYSICAL_GLASS);
      else if (cls === 'glass') fs = fs.replace('#include <opaque_fragment>', `#include <opaque_fragment>\n${GLASS_ALPHA}`);
      shader.fragmentShader = fs;
    };
    m.customProgramCacheKey = function realismKey() {
      let base = '';
      try { base = prevKey && prevKey !== realismKey ? String(prevKey.call(this)) : ''; } catch { base = ''; }
      return `${base}|rl-${cls}${pg ? '-pg' : ''}`;
    };
    m.needsUpdate = true;
    return true;
  }

  /** Patch every model material in the scene that has not been seen yet (cheap when nothing is new). */
  function enhanceScene(scene) {
    let changed = 0;
    scene.traverse((o) => {
      if (!o.isMesh || o.userData.__studioEdges) return;
      const list = [];
      const add = (x) => { if (Array.isArray(x)) list.push(...x); else if (x) list.push(x); };
      add(o.material);
      add(o.userData.__orig);
      for (const m of list) if (patchMaterial(m)) changed++;
    });
    // forget disposed materials (models are swapped on every switch)
    for (const m of envMats) if (!m.userData.__rl) envMats.delete(m);
    return changed;
  }

  /* ---------------------------------------------------------------- outdoor environment (PMREM) */
  const ENV = {
    day: { top: [0.22, 0.36, 0.62], horizon: [0.92, 0.94, 0.96], ground: [0.33, 0.30, 0.26], city: [0.36, 0.39, 0.43], glow: [1.6, 1.45, 1.2] },
    golden: { top: [0.16, 0.2, 0.36], horizon: [1.15, 0.72, 0.42], ground: [0.26, 0.2, 0.16], city: [0.2, 0.18, 0.2], glow: [2.6, 1.4, 0.6] },
    // blue hour: deep blue zenith, a lighter blue band low in the sky, lit windows on the skyline
    dusk: { top: [0.035, 0.075, 0.2], horizon: [0.2, 0.3, 0.52], ground: [0.025, 0.026, 0.032], city: [0.03, 0.032, 0.04], glow: [0.18, 0.2, 0.28], lights: 1 },
    night: { top: [0.008, 0.012, 0.026], horizon: [0.03, 0.04, 0.06], ground: [0.012, 0.012, 0.014], city: [0.02, 0.022, 0.03], glow: [0, 0, 0], lights: 0.6 },
  };
  function buildEnvScene(v) {
    const sc = new THREE.Scene();
    const disposables = [];
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Vector3(...v.top) },
        uHor: { value: new THREE.Vector3(...v.horizon) },
        uGnd: { value: new THREE.Vector3(...v.ground) },
        uGlow: { value: new THREE.Vector3(...v.glow) },
      },
      vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: /* glsl */`
        uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uGnd; uniform vec3 uGlow; varying vec3 vD;
        void main(){
          vec3 d = normalize(vD);
          vec3 c = mix(uHor, uTop, pow(smoothstep(0.0, 0.75, d.y), 0.6));
          c = mix(c, uGnd, smoothstep(0.0, -0.08, d.y));
          // broad bright patch high in the sky (diffuse sun scatter) gives glazing a soft highlight band
          float s = max(dot(d, normalize(vec3(0.45, 0.62, 0.64))), 0.0);
          c += uGlow * (pow(s, 6.0) * 0.35 + pow(s, 48.0) * 0.8);
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    const geo = new THREE.SphereGeometry(60, 48, 24);
    disposables.push(mat, geo);
    sc.add(new THREE.Mesh(geo, mat));
    // distant skyline: low irregular blocks on the horizon (only visible in reflections)
    const box = new THREE.BoxGeometry(1, 1, 1);
    const cityMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(...v.city) });
    disposables.push(box, cityMat);
    const n = 64;
    const city = new THREE.InstancedMesh(box, cityMat, n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const tint = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd() * 0.05;
      const r = 40 + rnd() * 8;
      const h = 1.2 + Math.pow(rnd(), 2.2) * 7;
      p.set(Math.sin(a) * r, h / 2 - 0.5, Math.cos(a) * r);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a);
      s.set(3 + rnd() * 6, h, 3 + rnd() * 4);
      m4.compose(p, q, s);
      city.setMatrixAt(i, m4);
      const k = 0.75 + rnd() * 0.5;
      city.setColorAt(i, tint.setRGB(k, k, k * 1.03));
    }
    sc.add(city);
    // after dusk the skyline carries small warm window lights (only seen in reflections)
    if (v.lights) {
      const lg = new THREE.PlaneGeometry(0.35, 0.22);
      const lm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6 * v.lights, 1.15 * v.lights, 0.7 * v.lights), side: THREE.DoubleSide });
      disposables.push(lg, lm);
      const nl = 420;
      const lights = new THREE.InstancedMesh(lg, lm, nl);
      for (let i = 0; i < nl; i++) {
        const a = rnd() * Math.PI * 2;
        const r = 36.8;
        p.set(Math.sin(a) * r, 0.2 + Math.pow(rnd(), 1.8) * 5.5, Math.cos(a) * r);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a);
        s.set(1, 1, 1);
        m4.compose(p, q, s);
        lights.setMatrixAt(i, m4);
      }
      sc.add(lights);
    }
    return { sc, dispose: () => disposables.forEach((d) => d.dispose()) };
  }
  function envFor(renderer, variant) {
    if (envTargets[variant]) return envTargets[variant];
    const pm = new THREE.PMREMGenerator(renderer);
    const { sc, dispose } = buildEnvScene(ENV[variant]);
    let rt = null;
    try { rt = pm.fromScene(sc, 0.012, 0.5, 200, { size: quality === 'low' ? 128 : 256 }); } catch (e) { console.warn('[studio] environment map failed', e); }
    dispose();
    pm.dispose();
    envTargets[variant] = rt;
    return rt;
  }
  /** Swap in the outdoor environment that matches the sun height. Returns true when it changed. */
  function setEnvironment(scene, renderer, elevation, envIntensity) {
    const variant = elevation > 9 ? 'day' : elevation > -2 ? 'golden' : elevation > -9 ? 'dusk' : 'night';
    // reflections dim with the light (the engine scales its own envMats the same way)
    envIntensityScale = envIntensity / 0.82;
    envMats.forEach((m) => { m.envMapIntensity = (m.userData.__rlEnvBase || 1) * envIntensityScale; });
    if (variant === envVariant) return false;
    const rt = envFor(renderer, variant);
    if (!rt) return false;
    envVariant = variant;
    scene.environment = rt.texture;
    envMats.forEach((m) => { m.envMap = rt.texture; });
    return true;
  }

  /* ---------------------------------------------------------------- ground occlusion map */
  const aoSize = quality === 'low' ? AO_SIZE_LOW : AO_SIZE_HIGH;
  const rtOpts = { type: THREE.HalfFloatType, depthBuffer: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false };
  let rtBelow = null, rtAbove = null, rtA = null, rtB = null;
  const depthMat = new THREE.MeshDepthMaterial({ side: THREE.DoubleSide });
  depthMat.depthPacking = THREE.BasicDepthPacking;
  const camBelow = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, AO_FALLOFF);
  const camAbove = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 100);
  const quadScene = new THREE.Scene();
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const combineMat = new THREE.ShaderMaterial({
    uniforms: { tBelow: { value: null }, tAbove: { value: null }, uDir: { value: new THREE.Vector2(1, 0) }, uTexel: { value: 1 / aoSize } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    // pass 1: combine (below is mirrored in x) + horizontal blur
    fragmentShader: /* glsl */`
      uniform sampler2D tBelow; uniform sampler2D tAbove; uniform vec2 uDir; uniform float uTexel; varying vec2 vUv;
      vec2 tap(vec2 uv){ return vec2(texture2D(tBelow, vec2(1.0 - uv.x, uv.y)).r, texture2D(tAbove, uv).r); }
      void main(){
        vec2 acc = vec2(0.0); float wsum = 0.0;
        for (int i = -6; i <= 6; i++) { float w = exp(-float(i*i) / 18.0); acc += tap(vUv + uDir * float(i) * uTexel * 1.5) * w; wsum += w; }
        gl_FragColor = vec4(acc / wsum, 0.0, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  const blurMat = new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2(0, 1) }, uTexel: { value: 1 / aoSize } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: /* glsl */`
      uniform sampler2D tSrc; uniform vec2 uDir; uniform float uTexel; varying vec2 vUv;
      void main(){
        vec2 acc = vec2(0.0); float wsum = 0.0;
        for (int i = -6; i <= 6; i++) { float w = exp(-float(i*i) / 18.0); acc += texture2D(tSrc, vUv + uDir * float(i) * uTexel * 1.5).rg * w; wsum += w; }
        gl_FragColor = vec4(acc / wsum, 0.0, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(quadGeo, combineMat);
  quad.frustumCulled = false;
  quadScene.add(quad);

  function ensureTargets() {
    if (rtBelow) return;
    rtBelow = new THREE.WebGLRenderTarget(aoSize, aoSize, rtOpts);
    rtAbove = new THREE.WebGLRenderTarget(aoSize, aoSize, rtOpts);
    rtA = new THREE.WebGLRenderTarget(aoSize, aoSize, { ...rtOpts, depthBuffer: false });
    rtB = new THREE.WebGLRenderTarget(aoSize, aoSize, { ...rtOpts, depthBuffer: false });
  }

  const tmpBox = new THREE.Box3();
  /** Meshes that occlude the ground: anything rising more than ~1 m (buildings, walls, trees, cars). */
  function occluders(scene, exclude) {
    const out = [];
    scene.traverse((o) => {
      if (!o.isMesh || exclude.has(o) || o.userData.__studioEdges) return;
      const ud = o.userData;
      if (ud.__orig === undefined && !ud.__rlOccluder) return; // helpers, sky, ground, thumbnails' own scene parts
      if (!o.visible) return;
      let top = ud.__rlTop;
      if (top === undefined) {
        o.updateWorldMatrix(true, false);
        if (o.isInstancedMesh) { o.computeBoundingBox(); tmpBox.copy(o.boundingBox).applyMatrix4(o.matrixWorld); }
        else { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); tmpBox.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); }
        top = tmpBox.max.y;
        ud.__rlTop = top;
      }
      const mats = Array.isArray(ud.__orig || o.material) ? (ud.__orig || o.material) : [ud.__orig || o.material];
      if (mats.some((m) => m && (/water|lagoon|jet/i.test(m.name || '')))) return;
      if (top > 0.9) out.push(o);
    });
    return out;
  }

  /**
   * Render the occlusion map for the current scene content inside `box` (world bounds of model + site).
   * `exclude` = environment objects (sky, ground…).
   */
  function bakeAO(renderer, scene, box, exclude) {
    if (!box || box.isEmpty()) { uniforms.rlAOParams.value.z = 0; return; }
    ensureTargets();
    const size = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    const half = Math.max(size.x, size.z) / 2 + 12;
    const top = Math.max(4, box.max.y) + 2;
    for (const cam of [camBelow, camAbove]) {
      cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half;
      cam.up.set(0, 0, -1);
    }
    camBelow.position.set(c.x, -0.05, c.z); camBelow.lookAt(c.x, 10, c.z);
    camBelow.near = 0; camBelow.far = AO_FALLOFF;
    camAbove.position.set(c.x, top, c.z); camAbove.lookAt(c.x, 0, c.z);
    camAbove.near = 0; camAbove.far = top;
    camBelow.updateProjectionMatrix(); camAbove.updateProjectionMatrix();
    camBelow.updateMatrixWorld(); camAbove.updateMatrixWorld();

    const occ = new Set(occluders(scene, exclude));
    const hidden = [];
    scene.traverse((o) => {
      if ((o.isMesh || o.isLine || o.isPoints || o.isSprite) && o.visible && !occ.has(o)) { hidden.push(o); o.visible = false; }
    });
    const prev = {
      target: renderer.getRenderTarget(), override: scene.overrideMaterial, bg: scene.background, fog: scene.fog,
      autoClear: renderer.autoClear, shadowAuto: renderer.shadowMap.autoUpdate, clearAlpha: renderer.getClearAlpha(),
      clearColor: renderer.getClearColor(new THREE.Color()), tone: renderer.toneMapping,
    };
    try {
      scene.overrideMaterial = depthMat;
      scene.background = null;
      scene.fog = null;
      renderer.shadowMap.autoUpdate = false;
      renderer.autoClear = true;
      renderer.setClearColor(0x000000, 1);
      // MeshDepthMaterial (basic packing) writes 1 − depth: bottom-up → closeness of the lowest surface to the
      // ground; top-down (depth reversed below) → height of the highest surface
      renderer.setRenderTarget(rtBelow); renderer.clear(); renderer.render(scene, camBelow);
      renderer.setRenderTarget(rtAbove); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camAbove);
    } finally {
      scene.overrideMaterial = prev.override;
      scene.background = prev.bg;
      scene.fog = prev.fog;
      hidden.forEach((o) => { o.visible = true; });
    }
    try {
      // top-down depth: 1 − z = (top − (top − y)) / top = y / top → the G channel is the surface height / top
      quad.material = combineMat;
      combineMat.uniforms.tBelow.value = rtBelow.texture;
      combineMat.uniforms.tAbove.value = rtAbove.texture;
      combineMat.uniforms.uDir.value.set(1, 0);
      renderer.setRenderTarget(rtA); renderer.render(quadScene, quadCam);
      quad.material = blurMat;
      blurMat.uniforms.tSrc.value = rtA.texture; blurMat.uniforms.uDir.value.set(0, 1);
      renderer.setRenderTarget(rtB); renderer.render(quadScene, quadCam);
      blurMat.uniforms.tSrc.value = rtB.texture; blurMat.uniforms.uDir.value.set(1, 0);
      renderer.setRenderTarget(rtA); renderer.render(quadScene, quadCam);
      blurMat.uniforms.tSrc.value = rtA.texture; blurMat.uniforms.uDir.value.set(0, 1);
      renderer.setRenderTarget(rtB); renderer.render(quadScene, quadCam);
    } finally {
      renderer.setRenderTarget(prev.target);
      renderer.autoClear = prev.autoClear;
      renderer.shadowMap.autoUpdate = prev.shadowAuto;
      renderer.setClearColor(prev.clearColor, prev.clearAlpha);
    }
    uniforms.rlAOMap.value = rtB.texture;
    uniforms.rlAOMatrix.value.multiplyMatrices(camAbove.projectionMatrix, camAbove.matrixWorldInverse);
    uniforms.rlAOParams.value.y = top;
    uniforms.rlAOParams.value.z = 1;
  }

  function setAOEnabled(on) { uniforms.rlAOParams.value.z = on && uniforms.rlAOMap.value ? 1 : 0; }

  function dispose() {
    Object.values(envTargets).forEach((rt) => rt?.dispose());
    [rtBelow, rtAbove, rtA, rtB].forEach((rt) => rt?.dispose());
    depthMat.dispose(); combineMat.dispose(); blurMat.dispose(); quadGeo.dispose();
  }

  return { uniforms, GLSL_COMMON, VERT_DECL, VERT_BODY, AO_APPLY, patchMaterial, enhanceScene, setEnvironment, bakeAO, setAOEnabled, dispose };
}

/* ------------------------------------------------------------------ bloom (opt-in, engine option `bloom`)
   Soft glow around the brightest pixels (lit interiors, lamps, signs after dusk): the scene renders into a
   multisampled half-float target, bright parts are thresholded into a small mip chain, blurred and added back, then
   tone mapping and sRGB output happen in the final pass. About 6 extra full-screen passes at reduced sizes. */
export function createBloom(THREE, renderer, { strength = 0.55, threshold = 1.15, knee = 0.6, levels = 5 } = {}) {
  const half = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false };
  const sceneRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const mips = Array.from({ length: levels }, () => new THREE.WebGLRenderTarget(1, 1, half));
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geo = new THREE.PlaneGeometry(2, 2);
  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const mk = (fs, uniforms, extra = {}) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false, toneMapped: false, ...extra });
  const prefilter = mk(/* glsl */`
    uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uTh; uniform float uKnee; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tSrc, vUv + uTexel * vec2(-0.5, -0.5)).rgb + texture2D(tSrc, vUv + uTexel * vec2(0.5, -0.5)).rgb
             + texture2D(tSrc, vUv + uTexel * vec2(-0.5, 0.5)).rgb + texture2D(tSrc, vUv + uTexel * vec2(0.5, 0.5)).rgb;
      c *= 0.25;
      float br = max(c.r, max(c.g, c.b));
      float w = smoothstep(uTh - uKnee, uTh + uKnee, br);
      gl_FragColor = vec4(min(c * w, vec3(24.0)), 1.0);
    }`, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uTh: { value: threshold }, uKnee: { value: knee } });
  const down = mk(/* glsl */`
    uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tSrc, vUv).rgb * 0.25;
      c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb * 0.1875;
      c += texture2D(tSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb * 0.1875;
      c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb * 0.1875;
      c += texture2D(tSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb * 0.1875;
      gl_FragColor = vec4(c, 1.0);
    }`, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });
  const up = mk(/* glsl */`
    uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tSrc, vUv).rgb * 4.0;
      c += (texture2D(tSrc, vUv + uTexel * vec2(-1.0, 0.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1.0, 0.0)).rgb
          + texture2D(tSrc, vUv + uTexel * vec2(0.0, -1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(0.0, 1.0)).rgb) * 2.0;
      c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb
         + texture2D(tSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb;
      gl_FragColor = vec4(c / 16.0 * 0.85, 1.0);
    }`, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } }, { blending: THREE.AdditiveBlending, transparent: true });
  const composite = new THREE.ShaderMaterial({
    vertexShader: VS,
    fragmentShader: /* glsl */`
      uniform sampler2D tScene; uniform sampler2D tBloom; uniform float uStrength; varying vec2 vUv;
      void main(){
        vec3 c = texture2D(tScene, vUv).rgb + texture2D(tBloom, vUv).rgb * uStrength;
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    uniforms: { tScene: { value: sceneRT.texture }, tBloom: { value: mips[0].texture }, uStrength: { value: strength } },
    depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(geo, prefilter);
  quad.frustumCulled = false;
  const qs = new THREE.Scene();
  qs.add(quad);
  let w = 1, h = 1;
  function setSize(width, height) {
    w = Math.max(1, Math.round(width)); h = Math.max(1, Math.round(height));
    // multisampling replaces the canvas antialiasing; fewer samples on very large buffers
    const samples = w * h > 2.6e6 ? 2 : 4;
    if (sceneRT.samples !== samples) { sceneRT.samples = samples; sceneRT.dispose(); }
    sceneRT.setSize(w, h);
    let mw = w, mh = h;
    for (const rt of mips) { mw = Math.max(1, Math.round(mw / 2)); mh = Math.max(1, Math.round(mh / 2)); rt.setSize(mw, mh); }
  }
  function pass(mat, src, dst, texel) {
    quad.material = mat;
    mat.uniforms.tSrc.value = src;
    mat.uniforms.uTexel.value.set(1 / texel.width, 1 / texel.height);
    renderer.setRenderTarget(dst);
    renderer.render(qs, cam);
  }
  /** Render `scene` with bloom to the canvas. */
  function render(scene, camera) {
    const prevTarget = renderer.getRenderTarget();
    const prevAuto = renderer.autoClear;
    renderer.setRenderTarget(sceneRT);
    renderer.render(scene, camera);
    renderer.autoClear = true;
    pass(prefilter, sceneRT.texture, mips[0], sceneRT);
    for (let i = 1; i < mips.length; i++) pass(down, mips[i - 1].texture, mips[i], mips[i - 1]);
    renderer.autoClear = false;
    for (let i = mips.length - 1; i > 0; i--) pass(up, mips[i].texture, mips[i - 1], mips[i]);
    renderer.autoClear = true;
    quad.material = composite;
    renderer.setRenderTarget(prevTarget);
    renderer.render(qs, cam);
    renderer.autoClear = prevAuto;
  }
  function dispose() {
    sceneRT.dispose(); mips.forEach((m) => m.dispose());
    [prefilter, down, up, composite].forEach((m) => m.dispose()); geo.dispose();
  }
  return { render, setSize, dispose, uniforms: composite.uniforms, prefilter };
}
