// assets/js/pages/home-hero-stills.js: HOME hero FALLBACK, a scroll-driven dive through still stages.
// Loaded by home-hero.js only when assets/img/hero/video.json is missing (the video mode is the default).
//
// HOW IT WORKS
// · assets/img/hero/zoom/stages.json lists the stages (built by tools/hero_zoom.py). Stage 0 is the whole building;
//   every next stage is a more detailed picture of one rectangle ("target") of the stage before it, aligned and
//   colour matched to that rectangle offline, so the stages read as ONE photograph.
// · One number, the depth G (log zoom from the whole building), drives everything. Stage k covers G from C[k] to
//   C[k + 1]; inside it the view is a pure zoom from the stage's resting frame towards its target rectangle. Near each
//   stage boundary the camera paths of the two stages are blended (smootherstep, so position AND speed stay
//   continuous): the focus of the zoom glides from one target to the next and the move reads as ONE camera move.
// · Over the last part of a stage's zoom ("blend.start" of it) the next stage morphs in over the rectangle. Stages
//   that continue their parent ("bridge" or aligned AI detail) morph BY FREQUENCY: the fine detail sharpens in first,
//   then the low frequencies follow, so the picture never changes, it only gets sharper. Stages whose content cannot
//   match their parent ("blend.dive") pass "through the glass": a long, gentle rise and fall of depth of field, a
//   radial zoom streak along the real motion and a soft reflection veil, with a slow dissolve in the middle. Every
//   curve is a smootherstep or a sin squared bump: continuous in value and slope at the band edges, and zero at
//   every stage's resting frame, so a level is always sharp.
// · The section is tall and the photo is pinned (position: sticky). Scroll progress maps to G at a constant zoom
//   rate (a little slower through the glass, eased at both ends), and the view follows that target with a
//   critically damped spring, so wheel ticks, touch flicks and jumps all become one smooth motion. Scrolling up zooms
//   back out; after the last stage the page simply continues. + and - and the level dots scroll to a stage; pinch
//   and ctrl + wheel move the scroll by the matching amount.
// · WebGL draws the base stage and the incoming one with their depth maps: dragging (and, gently, the cursor) tilts
//   the photo a few degrees with depth parallax. At the top (stage 0), dragging sideways past a threshold walks to
//   the next camera angle of the ring in the manifest ("angles", left to right; "ring": true wraps round the
//   building), and "above" (a drone view) is toggled by its button.
// · Loading: stage 0 paints first (the <img> in the page); stage 1 is fetched after first paint and the deeper
//   stages once the visitor starts scrolling into the dive. The view waits at a stage boundary until the next
//   stage is ready, then catches up.
// · Reduced motion: no pinning, stage 0 with + / - and the dots stepping through the stages (short crossfades),
//   no tilt. ?qa=1: static stage 0, no pinning. No WebGL (or ?nogl=1): the stage images are moved with CSS
//   transforms and crossfaded, no tilt.

import { t, onLang } from '../core/i18n.js';
import { $, clamp, isQA, prefersReducedMotion } from '../core/utils.js';
import { whenLoaded } from '../core/preloader.js';
import { scrollTo as scrollPage, getLenis } from '../core/motion.js';

const DIR = 'assets/img/hero/zoom/';
const OVER = 1.08;          // resting frame is a little larger than cover, so a tilt never shows an edge
const END_ZOOM = 1.45;      // how much further the last stage zooms (towards its "pin" point)
const START = 0.85;         // default share of a stage's zoom (log scale) used to morph into the next stage
const PAR = 0.5;            // depth parallax strength
const HOVER = { x: 0.018, y: 0.028 };  // cursor tilt (radians)
const DRAG = { x: 0.05, y: 0.09 };     // drag tilt limits (about 3 and 5 degrees)
const ANGLE_AT = 0.075;     // yaw that switches to the next camera angle of stage 0
const HOLD = [0.015, 0.04]; // share of the scroll held still at the top and at the end of the dive
const EASE = [0.35, 0.3];   // log zoom over which the move eases in at the top and out at the end
const GLASS_SLOW = 0.12;    // the zoom runs this much slower through a "dive" (more scroll for the glass)
const PATH_BLEND = 0.38;    // half width (log zoom) of the camera path blend at a stage boundary (at most)
const OMEGA = 8.5;          // spring that follows the scroll (per second, critically damped)
const VMAX = 4;             // fastest travel (log zoom per second), for big jumps
const GLASS = { blur: 8, streak: 0.035, veil: 0.8 };  // dive peak: focus blur (px), zoom streak (log zoom), veil
const SETTLE_IDLE = 650;    // ms without scrolling before a view left inside a dissolve eases out of it

const S = {
  view: { en: 'Eastmain, New Cairo. A photo you can dive into, {n} levels deep.', ar: 'إيست مين، القاهرة الجديدة. صورة يمكن التعمق فيها على {n} مستويات.' },
  stage: { en: 'Level {i} of {n}: {name}', ar: 'المستوى {i} من {n}: {name}' },
};
const fmt = (v, o) => t(v).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
// smootherstep: zero slope and zero curvature at both ends
const ss5 = (x) => { const c = clamp(x, 0, 1); return c * c * c * (c * (c * 6 - 15) + 10); };
// a soft bump over 0 to 1, zero (with zero slope) at both ends, 1 in the middle
const bump = (x) => (x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x) ** 2);

// morph weights at progress m (0 to 1); the same curves as weights() in tools/hero_zoom.py
// a: share of the next stage's fine detail added over the parent, b: share of its low frequencies, blur: focus blur
// (px), streak: radial zoom streak (log zoom), veil: glass reflection (0 to 1).
// "dive": content that cannot match its parent passes through the glass, a slow dissolve in the middle of a long
// gentle rise and fall of focus blur, zoom streak and veil; "pulse": a light focus bump over the sharpen-in morph
function weights(m, dive, pulse) {
  if (dive > 0) {
    const w = ss5((m - 0.3) / 0.45);
    const e = bump(m);
    return { a: w, b: w, blur: dive * GLASS.blur * e, streak: dive * GLASS.streak * e, veil: dive * GLASS.veil * e };
  }
  return { a: ss5(m / 0.6), b: ss5((m - 0.15) / 0.85), blur: pulse * bump(m), streak: 0, veil: 0 };
}

/* ------------------------------------------------------------------ WebGL renderer */
const VERT = `attribute vec2 aPos; varying vec2 vUv;
void main(){ vUv = vec2(aPos.x * .5 + .5, .5 - aPos.y * .5); gl_Position = vec4(aPos, 0., 1.); }`;
// uMix: x = detail (high frequency) weight, y = low frequency weight. uLod: x = extra mip bias that turns the next
// stage into the parent's resolution (its low pass), y = focus blur bias for both pictures. uBlurR: focus blur radius
// in base texture coordinates. uPrev: the camera a moment earlier (centre, scale); the difference is the motion of
// each pixel, sampled along as a radial zoom streak (z = 0: off). Soft frames take 10 taps on a golden angle disc
// stretched along that streak. uVeil: x = glass veil amount, y = position of its reflection band.
const FRAG = `precision highp float;
uniform sampler2D uImg0; uniform sampler2D uDep0; uniform sampler2D uImg1; uniform sampler2D uDep1;
uniform vec2 uRes; uniform vec2 uCenter; uniform vec2 uScale; uniform vec2 uTilt;
uniform vec4 uRect; uniform vec2 uMix; uniform vec2 uLod; uniform vec2 uBlurR; uniform vec2 uFeather; uniform vec2 uFocus; uniform float uPar;
uniform vec4 uPrev; uniform vec2 uVeil;
varying vec2 vUv;
const float F = 3.0;
vec2 toUv(vec2 q, float A){ return uCenter + vec2(q.x / (2. * A), -q.y * .5) / uScale; }
float cover(vec2 c){
  vec2 e = clamp(min(c, 1. - c) / uFeather, 0., 1.);
  e = e * e * (3. - 2. * e);
  return e.x * e.y;
}
void main(){
  float A = uRes.x / uRes.y;
  vec2 p = vec2((vUv.x * 2. - 1.) * A, 1. - vUv.y * 2.);
  float ca = cos(uTilt.x), sa = sin(uTilt.x), cb = cos(uTilt.y), sb = sin(uTilt.y);
  mat3 ry = mat3(cb, 0., sb,  0., 1., 0.,  -sb, 0., cb);
  mat3 rx = mat3(1., 0., 0.,  0., ca, -sa,  0., sa, ca);
  mat3 inv = rx * ry;
  vec3 o = inv * vec3(0., 0., F);
  vec3 d = inv * vec3(p, -F);
  vec2 hit = o.xy - (o.z / d.z) * d.xy;
  vec2 slope = d.xy / d.z + p / F;
  vec2 q = hit;
  for (int i = 0; i < 4; i++) {
    vec2 u = toUv(q, A);
    vec2 c = (u - uRect.xy) / uRect.zw;
    float a = cover(c) * uMix.y;
    float d0 = texture2D(uDep0, clamp(u, 0., 1.)).r - uFocus.x;
    float d1 = texture2D(uDep1, clamp(c, 0., 1.)).r - uFocus.y;
    q = hit + mix(d0, d1, a) * uPar * slope;
  }
  vec2 u = toUv(q, A);
  float cv = cover((u - uRect.xy) / uRect.zw);
  bool over = uMix.x + uMix.y > 0.;
  vec3 col;
  if (uBlurR.x <= 0. && uPrev.z <= 0.) {
    vec3 base = texture2D(uImg0, clamp(u, 0., 1.)).rgb;
    col = base;
    if (over) {
      vec2 c = clamp((u - uRect.xy) / uRect.zw, 0., 1.);
      vec3 det = texture2D(uImg1, c).rgb;
      vec3 low = texture2D(uImg1, c, uLod.x).rgb;
      col = mix(base, low, uMix.y * cv) + (uMix.x * cv) * (det - low);
    }
  } else {
    vec2 du = uPrev.z > 0. ? (uPrev.xy + vec2(q.x / (2. * A), -q.y * .5) / uPrev.zw) - u : vec2(0.);
    vec3 b = vec3(0.), dt = vec3(0.), lo = vec3(0.);
    // the streak is 10 taps long: blur each tap over the gap to the next so it never shows as separate copies
    float gap = length(du * uScale * uRes) / 10.;
    float bias = max(uLod.y, log2(max(gap, 1.)) + .2);
    // through the glass, the parent left around the incoming rectangle drifts out of focus as the room comes in
    float bias0 = bias + (uVeil.x > 0. ? (1. - cv) * uMix.y * 3. : 0.);
    for (int i = 0; i < 10; i++) {
      float fi = float(i);
      float r = sqrt((fi + .5) / 10.);
      float an = fi * 2.39996;
      vec2 uo = u + du * ((fi + .5) / 10. - .5) + uBlurR * r * vec2(cos(an), sin(an));
      b += texture2D(uImg0, clamp(uo, 0., 1.), bias0).rgb;
      if (over) {
        vec2 c = clamp((uo - uRect.xy) / uRect.zw, 0., 1.);
        dt += texture2D(uImg1, c, bias).rgb;
        lo += texture2D(uImg1, c, max(uLod.x, bias)).rgb;
      }
    }
    b *= .1; dt *= .1; lo *= .1;
    col = over ? mix(b, lo, uMix.y * cv) + (uMix.x * cv) * (dt - lo) : b;
  }
  if (uVeil.x > 0.) {
    // passing a pane of glass: the picture lifts towards a cool reflection, brightest along a soft diagonal band
    float band = exp(-pow((vUv.x * .8 + vUv.y * .45 - uVeil.y) / .32, 2.));
    col = mix(col, vec3(.82, .87, .95), uVeil.x * (.05 + .14 * band));
  }
  gl_FragColor = vec4(clamp(col, 0., 1.), 1.);
}`;

function createGL(canvas) {
  const opts = { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' };
  const gl = canvas.getContext('webgl2', opts) || canvas.getContext('webgl', opts);
  if (!gl) return null;
  const isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = {};
  for (const n of ['uImg0', 'uDep0', 'uImg1', 'uDep1', 'uRes', 'uCenter', 'uScale', 'uTilt', 'uRect', 'uMix', 'uLod', 'uBlurR', 'uFeather', 'uFocus', 'uPar', 'uPrev', 'uVeil']) u[n] = gl.getUniformLocation(prog, n);
  ['uImg0', 'uDep0', 'uImg1', 'uDep1'].forEach((n, i) => gl.uniform1i(u[n], i));

  function texture(source, mip) {
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    if (source) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // mipmaps (WebGL2: any size) give the morph its low pass and the dive its blur; WebGL1 falls back to a crossfade
    if (mip && isGL2) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    return tex;
  }
  const blank = texture(null, false);
  function bind(unit, tex) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex || blank);
  }
  function draw(st) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    bind(0, st.img0); bind(1, st.dep0); bind(2, st.img1); bind(3, st.dep1);
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform2f(u.uCenter, st.cx, st.cy);
    gl.uniform2f(u.uScale, st.sx, st.sy);
    gl.uniform2f(u.uTilt, st.tx, st.ty);
    gl.uniform4f(u.uRect, st.rect[0], st.rect[1], st.rect[2], st.rect[3]);
    gl.uniform2f(u.uMix, st.a, st.b);
    gl.uniform2f(u.uLod, st.lodLow, st.lodBlur);
    gl.uniform2f(u.uBlurR, st.blurR[0], st.blurR[1]);
    gl.uniform2f(u.uFeather, st.feather[0], st.feather[1]);
    gl.uniform2f(u.uFocus, st.focus[0], st.focus[1]);
    gl.uniform1f(u.uPar, st.par);
    gl.uniform4f(u.uPrev, st.prev[0], st.prev[1], st.prev[2], st.prev[3]);
    gl.uniform2f(u.uVeil, st.veil[0], st.veil[1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  return { gl, texture, draw, maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE) };
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => res(img);
    img.onerror = () => rej(new Error(`image ${src}`));
    img.src = src;
  });
}
async function decoded(src) {
  const img = await loadImage(src);
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(img); } catch { /* fall through */ }
  }
  return img;
}
function hasWebGL() {
  try {
    if (new URLSearchParams(location.search).get('nogl') === '1') return false;
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch { return false; }
}

/* ------------------------------------------------------------------ hero */
export function initStills(root) {
  if (!root) return;
  fetch(`${DIR}stages.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`stages.json ${r.status}`))))
    .then((man) => setup(root, man))
    .catch((err) => {
      root.classList.add('is-static');
      console.warn('[hero] zoom stages unavailable, the photo stays still', err);
    });
}

function setup(root, man) {
  const ST = man.stages.map((s) => ({ ...s, w: s.size[0], h: s.size[1] }));
  const N = ST.length;
  if (!N) return;
  // stage 0 camera angles, an ordered ring (left to right); the one using the stage 0 photo is home. Above comes last.
  const ANG = ST[0].angles?.length ? ST[0].angles.map((a) => ({ ...a })) : [{ file: ST[0].file, depth: ST[0].depth, focus: ST[0].focus }];
  const HOME = Math.max(0, ANG.findIndex((a) => a.file === ST[0].file));
  const SIDE = ANG.length;                 // angles reachable by dragging
  const RING = !!ST[0].ring && SIDE > 2;   // wraps round the building
  const ABOVE = ST[0].above ? ANG.push({ ...ST[0].above }) - 1 : -1;

  const pin = $('[data-hx-pin]', root) || root;
  const stage = $('[data-hx-stage]', root);
  const layers = $('[data-hx-layers]', root);
  const view = $('[data-hx-view]', root);
  const poster = $('[data-hx-poster]', root);
  const rail = $('[data-hx-depth]', root);
  const label = $('[data-hx-label]', root);
  const live = $('[data-hx-live]', root);
  const btn = {
    zin: $('[data-hx-zoom="in"]', root),
    zout: $('[data-hx-zoom="out"]', root),
    reset: $('[data-hx-reset]', root),
    above: $('[data-hx-above]', root),
  };

  const qa = isQA();
  const reduced = prefersReducedMotion() || qa;
  // scroll mode: the section is tall (CSS, from the same conditions) and scrolling drives the dive
  const scrollMode = !reduced && getComputedStyle(root).getPropertyValue('--hx-scroll').trim() === '1';
  root.classList.toggle('is-scroll', scrollMode);

  let W = 1, H = 1;
  const geo = [];           // per stage: display width / height at its resting zoom
  let L = [], C = [];       // log zoom span of each stage and the running sum (C[N]: the deepest view)
  let P = [];               // scroll progress at which each stage rests (P[N] = end of the dive)
  const TN = 600;
  let PT = [];              // scroll progress at depth G = C[N] * i / TN (the speed profile, integrated)
  let gCur = 0, gT = 0, vel = 0;   // depth of the view, its target and its speed (log zoom, per second)
  let gF = 0;               // what the spring follows: the target, reached at no more than VMAX
  let sCur = 0, sT = 0;     // the same two in stage units (stage k rests at s = k)
  let goal = null;          // step mode: stage the view is travelling to
  const tilt = { x: 0, y: 0 };
  const user = { x: 0, y: 0 };   // drag and key tilt
  const hover = { x: 0, y: 0 };  // cursor tilt
  const ang = { cur: HOME, from: HOME, mix: 1, t0: 0 };
  let glr = null;
  let visible = true;
  let raf = 0, last = 0;
  let zoomed = false;
  let diving = false;
  let shown = -1;            // stage index the dots show
  const res = [];            // per stage: { state, img, dep, el }
  const angRes = [];         // per camera angle (HOME shares stage 0)
  const dotEls = [];

  const mobile = () => W < 768;
  const announce = (msg) => { if (live) { live.textContent = ''; requestAnimationFrame(() => { live.textContent = msg; }); } };
  const ready = (k) => res[k]?.state === 'ready';
  const blendOf = (k) => ({ start: START, dive: 0, pulse: 0, ...(ST[k]?.blend || {}) });

  /* ---------------------------------------------------------------- geometry */
  function layout() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    ST.forEach((s, k) => {
      const sc = Math.max(W / s.w, H / s.h) * OVER;
      geo[k] = { dw: s.w * sc, dh: s.h * sc };
    });
    L = ST.map((s, k) => Math.log(zEnd(k)));
    C = [0];
    L.forEach((l, k) => C.push(C[k] + l));
    // scroll progress for each depth: a constant zoom rate, slower through the glass, eased in and out at the ends
    const span = 1 - HOLD[0] - HOLD[1];
    const acc = [0];
    let sum = 0;
    for (let i = 1; i <= TN; i++) {
      sum += 1 / speed(C[N] * (i - 0.5) / TN);
      acc.push(sum);
    }
    PT = acc.map((x) => HOLD[0] + span * x / sum);
    P = C.map((g) => pOfG(g));
  }
  const hasNext = (k) => k < N - 1 && !!ST[k].target;
  function zEnd(k) {
    if (!hasNext(k)) return END_ZOOM;
    return Math.max(1.05, geo[k + 1].dw / (ST[k].target.w * geo[k].dw));
  }
  // the morph into stage j (j >= 1) runs from depth bandA(j) to C[j], where stage j becomes the base
  const bandA = (j) => C[j] - blendOf(j).start * L[j - 1];
  function speed(G) {
    let v = 1;
    for (let j = 1; j < N; j++) {
      const bl = blendOf(j);
      if (bl.dive > 0 && hasNext(j - 1)) v -= GLASS_SLOW * Math.min(1, bl.dive) * bump((G - bandA(j)) / (C[j] - bandA(j)));
    }
    return v * (0.4 + 0.6 * ss5(G / EASE[0])) * (0.4 + 0.6 * ss5((C[N] - G) / EASE[1]));
  }
  function pOfG(G) {
    const x = clamp(G / C[N], 0, 1) * TN;
    const i = Math.min(TN - 1, Math.floor(x));
    return PT[i] + (PT[i + 1] - PT[i]) * (x - i);
  }
  function gOfP(p) {
    if (p <= PT[0]) return 0;
    if (p >= PT[TN]) return C[N];
    let lo = 0, hi = TN;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (PT[m] <= p) lo = m; else hi = m; }
    return C[N] * (lo + (p - PT[lo]) / (PT[hi] - PT[lo])) / TN;
  }
  const stageOf = (G) => { let k = 0; while (k < N - 1 && G >= C[k + 1]) k++; return k; };
  const sOfG = (G) => { G = clamp(G, 0, C[N]); const k = stageOf(G); return k + (G - C[k]) / L[k]; };
  const gOfS = (s) => { s = clamp(s, 0, N); const k = Math.min(N - 1, Math.floor(s)); return C[k] + (s - k) * L[k]; };
  function clampC(k, c, z) {
    const ex = W / (2 * geo[k].dw * z), ey = H / (2 * geo[k].dh * z);
    return { x: ex >= 0.5 ? 0.5 : clamp(c.x, ex, 1 - ex), y: ey >= 0.5 ? 0.5 : clamp(c.y, ey, 1 - ey) };
  }
  function restOf(k) {
    if (k > 0) return { x: 0.5, y: 0.5 };
    return clampC(0, (mobile() && ST[0].restMobile) || ST[0].rest || { x: 0.5, y: 0.5 }, 1);
  }
  function endOf(k) {
    const r = ST[k].target;
    if (hasNext(k)) return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    return clampC(k, ST[k].pin || { x: 0.5, y: 0.5 }, END_ZOOM);
  }
  function runPx() { return Math.max(0, root.offsetHeight - pin.offsetHeight); }
  function scrollP() {
    const run = runPx();
    return run > 1 ? clamp(-root.getBoundingClientRect().top / run, 0, 1) : 0;
  }
  const pOfS = (s) => (s <= 0 ? 0 : pOfG(gOfS(s)));
  let autoUntil = 0;         // a scroll started by the hero itself is running (no settling until then)
  function scrollToS(s, { immediate = false } = {}) {
    autoUntil = performance.now() + (immediate ? 300 : 1700);
    const y = window.scrollY + root.getBoundingClientRect().top + pOfS(clamp(s, 0, N)) * runPx();
    scrollPage(Math.round(y), { immediate });
  }
  // stage k's own camera path at depth G: a pure zoom from its resting frame to its target (extends past both ends)
  function zoomPath(k, G) {
    const A = restOf(k), B = endOf(k);
    const zB = Math.exp(L[k]), z = Math.exp(G - C[k]);
    const px = (B.x * zB - A.x) / (zB - 1), py = (B.y * zB - A.y) / (zB - 1);
    return { x: px - (px - A.x) / z, y: py - (py - A.y) / z };
  }
  // a point of stage j + 1 in the coordinates of stage j, and back
  const upTo = (j, c) => { const r = ST[j].target; return { x: r.x + c.x * r.w, y: r.y + c.y * r.h }; };
  const downTo = (j, c) => { const r = ST[j].target; return { x: (c.x - r.x) / r.w, y: (c.y - r.y) / r.h }; };
  const halfBlend = (j) => Math.min(PATH_BLEND, 0.4 * L[j], 0.8 * L[j + 1]);
  const pathW = (j, G) => { const h = halfBlend(j); return ss5((G - C[j + 1] + h) / (2 * h)); };
  // the view at depth G, in the coordinates of its base stage: the stage's path, blended with the neighbouring
  // stage's path around each boundary so the focus of the zoom glides instead of jumping
  function camera(G) {
    G = clamp(G, 0, C[N]);
    const k = stageOf(G);
    let c = zoomPath(k, G);
    if (hasNext(k) && G > C[k + 1] - halfBlend(k)) {
      const w = pathW(k, G);
      const n = upTo(k, zoomPath(k + 1, G));
      c = { x: c.x + (n.x - c.x) * w, y: c.y + (n.y - c.y) * w };
    }
    if (k > 0 && hasNext(k - 1) && G < C[k] + halfBlend(k - 1)) {
      const w = pathW(k - 1, G);
      const pr = downTo(k - 1, zoomPath(k - 1, G));
      c = { x: pr.x + (c.x - pr.x) * w, y: pr.y + (c.y - pr.y) * w };
    }
    const z = Math.exp(G - C[k]);
    c = clampC(k, c, z);
    return { k, f: (G - C[k]) / L[k], z, cx: c.x, cy: c.y };
  }
  function maxG() {
    if (ang.cur !== HOME || ang.mix < 1) return 0;
    for (let k = 1; k < N; k++) if (!ready(k)) return Math.max(0, bandA(k) - 1e-3);
    return C[N];
  }

  /* ---------------------------------------------------------------- render */
  function frame() {
    const cam = camera(gCur);
    const k = cam.k;
    const out = { cam, over: -1, a: 0, b: 0, rect: [0, 0, 1, 1], feather: [1e-4, 1e-4], blur: 0, streak: 0, veil: 0, veilPos: 0, zrel: 1 };
    if (k === 0 && ang.mix < 1) {
      // camera angle change: a plain crossfade with a light focus pull
      const m = ss5(ang.mix);
      out.angFrom = ang.from;
      out.angTo = ang.cur;
      out.a = m; out.b = m;
      out.blur = bump(ang.mix) * 5;
    } else if (hasNext(k) && ready(k + 1)) {
      const bl = blendOf(k + 1);
      const a0 = bandA(k + 1);
      const m = clamp((gCur - a0) / (C[k + 1] - a0), 0, 1);
      if (m > 0) {
        const r = ST[k].target;
        const wt = weights(m, bl.dive, bl.pulse);
        // soft edge of the incoming rectangle (share of its size); through the glass it starts as a wide radial
        // fade, so the new room opens from the middle of the view outwards instead of showing the rectangle
        const fx = bl.dive > 0 ? 0.48 - 0.46 * ss5(m) : 0.2 - 0.18 * ss5(m);
        out.over = k + 1;
        out.a = wt.a; out.b = wt.b; out.blur = wt.blur; out.streak = wt.streak;
        out.veil = wt.veil; out.veilPos = -0.3 + 1.8 * m;
        out.rect = [r.x, r.y, r.w, r.h];
        out.feather = [fx, fx * ST[k + 1].w / ST[k + 1].h];
        out.zrel = ST[k + 1].zrel || ST[k + 1].w / (r.w * ST[k].w);
      }
    }
    return out;
  }
  function paint() {
    const fr = frame();
    const { cam } = fr;
    const g = geo[cam.k];
    if (glr) {
      let b, o, f0, f1;
      if (fr.angFrom !== undefined) {
        b = angRes[fr.angFrom] || res[0]; o = angRes[fr.angTo] || res[0];
        f0 = ANG[fr.angFrom].focus ?? 0.3; f1 = ANG[fr.angTo].focus ?? 0.3;
      } else {
        b = cam.k === 0 ? (angRes[ang.cur] || res[0]) : res[cam.k];
        o = fr.over >= 0 ? res[fr.over] : null;
        f0 = cam.k === 0 ? (ANG[ang.cur].focus ?? 0.3) : (ST[cam.k].focus ?? 0.3);
        f1 = fr.over >= 0 ? (ST[fr.over].focus ?? 0.3) : f0;
      }
      const canvas = glr.gl.canvas;
      const dpr = canvas.width / W;
      // mip bias that takes the next stage down to the zoomed parent's resolution (its low pass)
      let lodLow = 0;
      if (fr.over >= 0) {
        const onScreen = fr.rect[2] * g.dw * cam.z * dpr;   // device px across the rectangle
        lodLow = Math.max(0, Math.log2(fr.zrel) - Math.log2(Math.max(1e-3, ST[fr.over].w / onScreen)));
      }
      // focus blur: 10 taps on a disc of the blur radius, each from a mip level that fills the gaps between taps
      const on = !reduced && fr.blur * dpr > 0.02;
      const lodBlur = on ? Math.max(0, Math.log2(fr.blur * dpr) - 1.2) : 0;
      const blurR = on ? [fr.blur / (g.dw * cam.z), fr.blur / (g.dh * cam.z)] : [0, 0];
      // zoom streak: where every pixel was a little earlier on the same path (same base stage)
      let prev = [0, 0, 0, 0];
      if (!reduced && fr.streak > 2e-3) {
        const pc = camera(Math.max(C[cam.k], gCur - fr.streak));
        prev = [pc.cx, pc.cy, g.dw * pc.z / W, g.dh * pc.z / H];
      }
      glr.draw({
        img0: b?.img, dep0: b?.dep, img1: o?.img, dep1: o?.dep,
        cx: cam.cx, cy: cam.cy, sx: g.dw * cam.z / W, sy: g.dh * cam.z / H,
        tx: tilt.x, ty: tilt.y, rect: fr.rect, a: o ? fr.a : 0, b: o ? fr.b : 0, lodLow, lodBlur, blurR, feather: fr.feather,
        focus: [f0, f1], par: reduced ? 0 : PAR, prev, veil: [reduced ? 0 : fr.veil, fr.veilPos],
      });
    } else {
      paintCSS(fr);
    }
    showStage(Math.min(N - 1, Math.floor(sCur + 0.5)));
  }
  // CSS mode: the stage images themselves, scaled and moved; the incoming one fades in with a soft mask
  function paintCSS(fr) {
    const { cam } = fr;
    const g = geo[cam.k];
    const x = W / 2 - cam.cx * g.dw * cam.z, y = H / 2 - cam.cy * g.dh * cam.z;
    const on = new Set();
    const put = (k, px, py, wpx, alpha, over) => {
      const el = res[k]?.el;
      if (!el) return;
      on.add(el);
      el.style.transform = `translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0) scale(${(wpx / ST[k].w).toFixed(5)})`;
      el.style.opacity = alpha >= 1 ? '' : alpha.toFixed(3);
      el.classList.toggle('is-over', over);
      el.classList.add('is-on');
    };
    put(cam.k, x, y, g.dw * cam.z, 1, false);
    if (fr.over >= 0) {
      const [rx, ry, rw] = fr.rect;
      put(fr.over, x + rx * g.dw * cam.z, y + ry * g.dh * cam.z, rw * g.dw * cam.z, fr.b, true);
    }
    res.forEach((r) => { if (r?.el && !on.has(r.el)) r.el.classList.remove('is-on', 'is-over'); });
  }
  // the still before WebGL takes over: the same resting frame, so the swap is invisible
  function placePoster() {
    poster.style.width = `${ST[0].w}px`;
    poster.style.height = `${ST[0].h}px`;
    if (glr) {
      const c = restOf(0), g = geo[0];
      poster.style.transform = `translate3d(${(W / 2 - c.x * g.dw).toFixed(2)}px, ${(H / 2 - c.y * g.dh).toFixed(2)}px, 0) scale(${(g.dw / ST[0].w).toFixed(5)})`;
    }
  }

  function tick(now) {
    raf = 0;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    let moving = false;
    const lim = maxG();
    if (scrollMode) {
      gT = gOfP(scrollP());
      sT = sOfG(gT);
      if (sT > 0.01 && ang.cur !== HOME && ang.mix >= 1) { user.x = 0; user.y = 0; switchAngle(HOME); }
      if (sT > 0.01 && !diving) { diving = true; for (let k = 1; k < N; k++) ensure(k); }
    } else {
      if (goal !== null) gT = gOfS(goal);
      sT = sOfG(Math.min(gT, lim));
    }
    root.classList.toggle('is-waiting', gT > lim + 1e-3);
    const want = Math.min(gT, lim);
    // big jumps: the followed point travels to the target at no more than VMAX (the spring smooths its start and stop)
    gF += clamp(want - gF, -VMAX * dt, VMAX * dt);
    // the view follows it with a critically damped spring (exact step), so position and speed never jump
    const x = gCur - gF;
    if (reduced || (gF === want && Math.abs(x) < 1e-4 && Math.abs(vel) < 2e-3)) {
      if (gCur !== want) moving = true;
      gCur = gF = want;
      vel = 0;
    } else {
      const e = Math.exp(-OMEGA * dt);
      const j = (vel + OMEGA * x) * dt;
      gCur = gF + (x + j) * e;
      vel = (vel - OMEGA * j) * e;
      moving = true;
    }
    sCur = sOfG(gCur);
    if (goal !== null && Math.abs(sCur - goal) < 1e-4) goal = null;
    // tilt follows the drag / key tilt plus the cursor
    const tx = reduced ? 0 : clamp(user.x + hover.x, -DRAG.x * 1.2, DRAG.x * 1.2);
    const ty = reduced ? 0 : clamp(user.y + hover.y, -DRAG.y * 1.2, DRAG.y * 1.2);
    const kt = 1 - Math.exp(-dt * (drag ? 14 : 5));
    for (const [key, target] of [['x', tx], ['y', ty]]) {
      const d = target - tilt[key];
      if (Math.abs(d) > 1e-5) { tilt[key] += d * kt; moving = true; } else tilt[key] = target;
    }
    if (ang.mix < 1) {
      ang.mix = reduced ? 1 : clamp((now - ang.t0) / 520, 0, 1);
      moving = true;
    }
    paint();
    syncUI();
    if (moving) request(); else last = 0;
  }
  function request() { if (!raf && visible) raf = requestAnimationFrame(tick); }

  /* ---------------------------------------------------------------- loading */
  const queue = new Set();
  let pumping = false;
  function ensure(k) {
    if (k < 0 || k >= N || res[k]) return;
    res[k] = { state: 'queued' };
    queue.add(k);
    pump();
  }
  function around(k) { for (let i = 1; i <= 2; i++) ensure(k + i); }
  async function pump() {
    if (pumping || !queue.size) return;
    pumping = true;
    const k = Math.min(...queue);
    queue.delete(k);
    try {
      res[k] = await loadStage(ST[k], k === 0 ? poster : null);
    } catch (err) {
      res[k] = null;
      console.warn('[hero] stage failed to load', k, err);
    }
    pumping = false;
    request();
    pump();
  }
  async function loadStage(s, el) {
    if (glr) {
      const r = glr;
      const [img, dep] = await Promise.all([decoded(el ? (el.currentSrc || el.src) : DIR + s.file), decoded(DIR + s.depth)]);
      if (glr !== r) { img.close?.(); dep.close?.(); throw new Error('renderer changed'); }
      const out = { state: 'ready', img: r.texture(img, true), dep: r.texture(dep, false) };
      img.close?.();
      dep.close?.();
      return out;
    }
    if (!el) {
      el = document.createElement('img');
      el.className = 'hx__layer';
      el.alt = '';
      el.decoding = 'async';
      el.width = s.w;
      el.height = s.h;
      el.src = DIR + s.file;
      await (el.decode ? el.decode() : new Promise((ok, no) => { el.onload = ok; el.onerror = no; }));
      el.style.width = `${s.w}px`;
      el.style.height = `${s.h}px`;
      layers.append(el);
    }
    return { state: 'ready', el };
  }
  let anglesLoading = null;
  function loadAngles() {
    if (!glr || ANG.length < 2) return Promise.resolve();
    if (anglesLoading) return anglesLoading;
    angRes[HOME] = res[0];
    // nearest angles of the ring first, the view from above last
    const dist = (i) => {
      if (i === ABOVE) return 1e3;
      const d = Math.abs(i - HOME);
      return RING ? Math.min(d, SIDE - d) : d;
    };
    const order = ANG.map((_, i) => i).filter((i) => i !== HOME).sort((a, b) => dist(a) - dist(b));
    anglesLoading = (async () => {
      for (const i of order) {
        try { angRes[i] = await loadStage(ANG[i], null); } catch (err) { console.warn('[hero] angle failed to load', i, err); }
      }
    })();
    return anglesLoading;
  }
  function switchAngle(to) {
    if (to === ang.cur || to < 0 || to >= ANG.length || (to !== HOME && !angRes[to])) return false;
    ang.from = ang.mix < 1 ? ang.from : ang.cur;
    ang.cur = to;
    ang.mix = 0;
    ang.t0 = performance.now();
    if (btn.above) btn.above.setAttribute('aria-pressed', String(to === ABOVE));
    root.classList.toggle('is-above', to === ABOVE);
    root.dataset.angle = ANG[to].id || String(to);
    request();
    return true;
  }
  async function toggleAbove() {
    if (ABOVE < 0 || !glr) return;
    if (ang.cur === ABOVE) { switchAngle(HOME); return; }
    await loadAngles();
    user.x = 0; user.y = 0;
    if (sT > 0.01) {
      // back to the top first: the view from above belongs to the whole building
      if (scrollMode) scrollToS(0); else { goal = 0; }
      const wait = () => (sCur < 0.01 ? switchAngle(ABOVE) : setTimeout(wait, 120));
      wait();
      return;
    }
    switchAngle(ABOVE);
  }

  /* ---------------------------------------------------------------- state changes */
  function syncUI() {
    const on = sT > 0.02 || sCur > 0.02;
    if (on !== zoomed) {
      zoomed = on;
      root.classList.toggle('is-zoomed', on);
    }
    const end = scrollMode ? sT : goal ?? sT;
    if (btn.zin) btn.zin.disabled = end >= N - 1 - 0.02;
    if (btn.zout) btn.zout.disabled = end <= 0.02;
  }
  // go to depth s: scroll there (scroll mode) or travel (reduced motion / QA)
  function go(to, { say = true } = {}) {
    to = clamp(to, 0, N);
    if (to > 0 && ang.cur !== HOME) switchAngle(HOME);
    for (let k = 0; k <= Math.min(N - 1, Math.ceil(to)); k++) ensure(k);
    around(Math.floor(to));
    if (scrollMode) scrollToS(to);
    else {
      const step = () => { goal = to; if (reduced) { gT = gCur = gF = Math.min(gOfS(to), maxG()); vel = 0; sT = sCur = sOfG(gCur); } request(); };
      if (reduced && !qa) {
        root.classList.add('is-jump');
        setTimeout(() => { step(); requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('is-jump'))); }, 140);
      } else step();
    }
    if (say) announce(stageText(Math.min(N - 1, Math.floor(to))));
  }
  const now = () => (scrollMode ? sT : goal ?? sT);
  const deeper = () => go(Math.min(N - 1, Math.floor(now() + 0.05) + 1));
  const shallower = () => go(Math.max(0, Math.ceil(now() - 0.05) - 1));
  function zoomBy(dl) {
    const next = sOfG(gOfS(now()) + dl);
    if (dl > 0 && ang.cur !== HOME) switchAngle(HOME);
    if (scrollMode) { scrollToS(next, { immediate: true }); request(); return; }
    goal = null;
    gT = Math.min(gOfS(next), maxG());
    if (reduced) { gCur = gF = gT; vel = 0; }
    around(Math.floor(sOfG(gT)));
    request();
  }
  function reset() {
    user.x = 0; user.y = 0;
    if (ang.cur !== HOME) switchAngle(HOME);
    go(0);
  }
  const stageText = (k) => fmt(S.stage, { i: k + 1, n: N, name: t(ST[k].label) });

  /* ---------------------------------------------------------------- level dots + caption */
  function build() {
    if (rail) {
      ST.forEach((s, k) => {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'hx-dot';
        b.innerHTML = '<span aria-hidden="true"></span>';
        b.addEventListener('click', () => go(k));
        li.append(b);
        rail.append(li);
        dotEls.push(b);
      });
      rail.hidden = false;
    }
    paintText();
  }
  function paintText() {
    dotEls.forEach((b, k) => {
      b.setAttribute('aria-label', stageText(k));
      b.dataset.tooltip = t(ST[k].label);
    });
    view.setAttribute('aria-label', fmt(S.view, { n: N }));
    if (label && shown >= 0) label.textContent = t(ST[shown].label);
  }
  function showStage(k) {
    if (k === shown) return;
    shown = k;
    dotEls.forEach((b, i) => {
      b.classList.toggle('is-active', i === k);
      b.classList.toggle('is-past', i < k);
      if (i === k) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    root.dataset.stage = String(k);
    if (label) label.textContent = t(ST[k].label);
    if (k > 0) around(k);
  }

  /* ---------------------------------------------------------------- input */
  const pts = new Map();
  let drag = null;
  let pinch = null;
  let lastTap = { t: 0, x: 0, y: 0 };
  let touchDbl = 0;
  const local = (e) => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  // drag tilt with a soft stop at the limits
  const rubber = (v, lim) => (Math.abs(v) <= lim ? v : Math.sign(v) * (lim + (Math.abs(v) - lim) * 0.25));
  function turn(dx, dy) {
    if (reduced || !glr) return;
    user.y = rubber(user.y + dx / W * 0.3, DRAG.y);
    user.x = rubber(user.x + dy / H * 0.2, DRAG.x);
    // past the limit the next camera angle of the ring takes over, and the drag carries on from its other side
    // (drag right turns the scene as if the camera moved left, like a product viewer)
    if (SIDE > 1 && ang.cur < SIDE && sCur < 0.01 && Math.abs(user.y) > ANGLE_AT) {
      const dir = Math.sign(user.y);
      let to = ang.cur - dir;
      if (RING) to = (to + SIDE) % SIDE;
      if (to >= 0 && to < SIDE && switchAngle(to)) user.y -= dir * ANGLE_AT * 1.6;
    }
    request();
  }

  view.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const p = local(e);
    pts.set(e.pointerId, p);
    if (ANG.length > 1) loadAngles();
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
      drag = null;
      root.classList.remove('is-dragging');
    } else if (pts.size === 1) {
      drag = { x: p.x, y: p.y, x0: p.x, y0: p.y, moved: 0, mode: e.pointerType === 'mouse' ? 'turn' : null, id: e.pointerId };
      if (drag.mode) { try { view.setPointerCapture(e.pointerId); } catch { /* ignore */ } root.classList.add('is-dragging'); }
    }
  });
  view.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const p = local(e);
    pts.set(e.pointerId, p);
    if (pinch && pts.size >= 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      zoomBy(Math.log(d / pinch.d));
      pinch.d = d;
    } else if (drag) {
      const dx = p.x - drag.x, dy = p.y - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      drag.x = p.x; drag.y = p.y;
      if (!drag.mode) {
        // touch: a mostly horizontal move tilts; vertical moves scroll the page (touch-action: pan-y), which dives
        const tx = p.x - drag.x0, ty = p.y - drag.y0;
        if (Math.abs(tx) > 8 && Math.abs(tx) > Math.abs(ty) * 1.2) { drag.mode = 'turn'; root.classList.add('is-dragging'); }
        else return;
      }
      turn(dx, drag.mode === 'turn' && e.pointerType !== 'mouse' ? 0 : dy);
    }
  });
  const endPointer = (e) => {
    if (!pts.has(e.pointerId)) return;
    const p = pts.get(e.pointerId);
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (pts.size === 0) {
      const tap = e.type === 'pointerup' && (!drag || drag.moved < 8);
      drag = null;
      root.classList.remove('is-dragging');
      // settle a rubber-banded tilt back to the limit
      user.y = clamp(user.y, -DRAG.y, DRAG.y);
      user.x = clamp(user.x, -DRAG.x, DRAG.x);
      request();
      if (tap && e.pointerType !== 'mouse') {
        const t0 = performance.now();
        if (t0 - lastTap.t < 320 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 36) { deeper(); lastTap.t = 0; touchDbl = t0; } else lastTap = { t: t0, x: p.x, y: p.y };
      }
    }
  };
  view.addEventListener('pointerup', endPointer);
  view.addEventListener('pointercancel', endPointer);
  view.addEventListener('dblclick', (e) => {
    if (performance.now() - touchDbl < 600) return;
    e.preventDefault();
    if (now() >= N - 1 - 0.02) reset(); else deeper();
  });
  // trackpad pinch (ctrl + wheel) zooms the photo instead of the page; plain wheel scrolls the page, which dives
  view.addEventListener('wheel', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * H : e.deltaY;
    zoomBy(-clamp(dy, -120, 120) * 0.01);
  }, { passive: false });

  root.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || reduced || drag) return;
    const r = stage.getBoundingClientRect();
    hover.y = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1) * HOVER.y;
    hover.x = clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1) * HOVER.x;
    request();
  });
  root.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse') return;
    hover.x = 0; hover.y = 0;
    request();
  });

  view.addEventListener('keydown', (e) => {
    const k = e.key;
    const step = 0.03;
    let used = true;
    if (k === 'ArrowLeft') turn(-step / 0.3 * W, 0);
    else if (k === 'ArrowRight') turn(step / 0.3 * W, 0);
    else if (k === 'ArrowUp') turn(0, -step / 0.2 * H);
    else if (k === 'ArrowDown') turn(0, step / 0.2 * H);
    else if (k === '+' || k === '=') deeper();
    else if (k === '-' || k === '_') shallower();
    else if (k === '0') reset();
    else used = false;
    if (used) e.preventDefault();
  });

  btn.zin?.addEventListener('click', deeper);
  btn.zout?.addEventListener('click', shallower);
  btn.reset?.addEventListener('click', reset);
  btn.above?.addEventListener('click', toggleAbove);

  /* ---------------------------------------------------------------- layout + lifecycle */
  function relayout() {
    layout();
    if (glr) {
      const canvas = glr.gl.canvas;
      const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4.2e6 / (W * H)));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }
    placePoster();
    if (scrollMode) { gT = gCur = gF = Math.min(gOfP(scrollP()), maxG()); vel = 0; sT = sCur = sOfG(gCur); }
    paint();
    request();
  }
  function cssMode() {
    glr = null;
    res.length = 0;
    angRes.length = 0;
    anglesLoading = null;
    ang.cur = ang.from = HOME; ang.mix = 1;
    if (btn.above) { btn.above.hidden = true; btn.above.setAttribute('aria-pressed', 'false'); }
    root.classList.remove('is-above');
    queue.clear();
    root.classList.remove('is-live');
    root.classList.add('is-css');
    res[0] = { state: 'ready', el: poster };
    for (const el of layers.querySelectorAll('.hx__layer')) el.remove();
    if (gCur > maxG()) { gCur = gT = gF = sCur = sT = vel = 0; goal = null; }
    if (diving) for (let k = 1; k < N; k++) ensure(k);
    relayout();
  }

  view.tabIndex = 0;
  view.setAttribute('role', 'application');
  view.setAttribute('aria-describedby', 'hx-help');
  view.style.touchAction = 'pan-y';
  // read-only snapshot for tests and debugging (tests set root.hxHold = true to keep exact scroll positions)
  root.hxState = () => ({
    s: sCur, target: sT, goal, stages: N, gl: !!glr, scroll: scrollMode, ready: res.map((r) => r?.state || null),
    tilt: { ...tilt }, angle: ang.cur, angleId: ANG[ang.cur]?.id, angles: ANG.map((a) => a.id), ring: RING,
    stops: P.slice(), run: runPx(), depth: gCur, depths: C.slice(), bands: ST.map((_, j) => (j > 0 && hasNext(j - 1) ? [bandA(j), C[j]] : null)),
  });
  // test hooks: put the view at depth s (stage units) or at scroll progress p at once; the scroll progress for s
  const jumpG = (G) => { goal = null; vel = 0; gT = gCur = gF = clamp(G, 0, maxG()); sT = sCur = sOfG(gCur); paint(); syncUI(); };
  root.hxJump = (v) => jumpG(gOfS(v));
  root.hxJumpP = (p) => jumpG(gOfP(p));
  root.hxScrollForS = (v) => pOfS(clamp(v, 0, N));
  build();
  cssMode();
  syncUI();

  if ('ResizeObserver' in window) {
    let pending = 0;
    new ResizeObserver(() => { cancelAnimationFrame(pending); pending = requestAnimationFrame(relayout); }).observe(stage);
  } else window.addEventListener('resize', relayout);
  // never rest on a double exposure: when scrolling stops in the middle of a dissolve through the glass, ease
  // gently on to the nearer side where one picture dominates (only after a pause, and only a short way)
  let idleTimer = 0;
  function settleGlass() {
    if (pts.size || !visible || root.hxHold) return;
    if (getLenis()?.isScrolling || performance.now() < autoUntil) { idleTimer = setTimeout(settleGlass, 300); return; }
    const G = gOfP(scrollP());
    const k = stageOf(G);
    if (!hasNext(k) || !(blendOf(k + 1).dive > 0)) return;
    const bl = blendOf(k + 1);
    const a0 = bandA(k + 1), len = C[k + 1] - a0;
    const m = (G - a0) / len;
    const w = weights(m, bl.dive, bl.pulse).b;
    if (w <= 0.1 || w >= 0.9) return;
    let lo = m, hi = m;
    while (lo > 0 && weights(lo, bl.dive, bl.pulse).b > 0.06) lo -= 0.005;
    while (hi < 1 && weights(hi, bl.dive, bl.pulse).b < 0.94) hi += 0.005;
    scrollToS(sOfG(a0 + (m - lo < hi - m ? lo : hi) * len));
  }
  if (scrollMode) {
    window.addEventListener('scroll', () => {
      request();
      clearTimeout(idleTimer);
      idleTimer = setTimeout(settleGlass, SETTLE_IDLE);
    }, { passive: true });
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible) request();
    }).observe(root);
  }
  onLang(() => { paintText(); if (shown >= 0) { const k = shown; shown = -1; showStage(k); } });

  whenLoaded().then(() => {
    root.classList.add('is-ready');
    if (qa) return;
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 400));
    const prefetch = () => idle(() => ensure(1), { timeout: 2000 });
    if (!hasWebGL()) { prefetch(); return; }
    startGL().then(prefetch).catch((err) => {
      console.warn('[hero] WebGL view unavailable, using CSS zoom', err);
      cssMode();
      prefetch();
    });
  });

  async function startGL() {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    const r = createGL(canvas);
    if (!r) throw new Error('no context');
    if (r.maxTex < Math.max(...ST.map((s) => s.w))) throw new Error('textures too small');
    glr = r;
    res.length = 0;
    res[0] = await loadStage(ST[0], poster);
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      canvas.remove();
      cssMode();
      ensure(Math.floor(sCur) + 1);
    });
    view.append(canvas);
    root.classList.remove('is-css');
    for (const el of layers.querySelectorAll('.hx__layer')) el.remove();
    if (diving) for (let k = 1; k < N; k++) ensure(k);
    relayout();
    requestAnimationFrame(() => root.classList.add('is-live'));
    if (btn.above && ABOVE >= 0) btn.above.hidden = false;
  }
}
