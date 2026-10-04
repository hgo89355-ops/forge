// assets/js/pages/home-hero.js: HOME hero, the real Eastmain building as a zoomable photo.
//
// · The still (assets/img/hero/eastmain-1920.*) paints first. A small raw WebGL view then takes over: the photo plus
//   a depth map (eastmain-depth.png), so moving the cursor tilts the building a few degrees with true depth parallax.
//   The high-res image (eastmain-hd.webp) loads after first paint (desktop) or on the first zoom (touch).
// · Wheel zooms toward the cursor only after a press inside the hero (or with ctrl / meta, trackpad pinch);
//   before that a small hint shows and the page scrolls normally. Leaving the hero or Esc disengages.
// · Drag pans, double-click / double-tap zooms in, pinch zooms, one-finger vertical swipes scroll the page.
// · Pins fly to real details and open a small card. Keyboard: arrows pan, plus / minus zoom, 0 resets, Esc closes.
// · Reduced motion: no tilt, instant moves. ?qa=1 or no WebGL: the still is moved with CSS transforms (no tilt).

import { t, onLang } from '../core/i18n.js';
import { $, $$, clamp, isQA, isRTL, prefersReducedMotion } from '../core/utils.js';
import { whenLoaded } from '../core/preloader.js';

const IMG = { w: 3160, h: 2840 };
const SRC = {
  hd: 'assets/img/hero/eastmain-hd.webp',
  depth: 'assets/img/hero/eastmain-depth.png',
};
const OVER = 1.06;   // rest view is slightly larger than cover, so the tilt never shows an edge
const ZMAX = 6;
const TILT = 0.05;   // max tilt in radians (about 3 degrees)
const PAR = 0.8;     // depth parallax strength (screen half-heights per unit of depth)
const FOCUS = 0.28;  // depth value that stays put (the building)
const REST = { desk: { x: 0.47, y: 0.57 }, mob: { x: 0.47, y: 0.5 } };

// image coordinates (0 to 1) of details that are really visible in the photo
const PINS = [
  {
    u: 0.455, v: 0.42, z: 2.6,
    title: { en: 'Glass facade', ar: 'الواجهة الزجاجية' },
    text: { en: 'Office floors sit behind full-height glass, the ceiling lights visible at night.', ar: 'طوابق مكاتب خلف زجاج بكامل الارتفاع، وتظهر أضواء أسقفها ليلًا.' },
  },
  {
    u: 0.52, v: 0.735, z: 3.2,
    title: { en: 'Shopfronts', ar: 'واجهات المحلات' },
    text: { en: 'Shops and cafés open onto the plaza at ground level.', ar: 'محلات ومقاهٍ تطل على الساحة في الطابق الأرضي.' },
  },
  {
    u: 0.6, v: 0.85, z: 2.6,
    title: { en: 'Plaza and pool', ar: 'الساحة والبركة' },
    text: { en: 'A shallow pool with small fountains runs through the plaza.', ar: 'بركة ماء ضحلة بنوافير صغيرة تمتد عبر الساحة.' },
  },
  {
    u: 0.855, v: 0.56, z: 2.8,
    title: { en: 'Palms and planting', ar: 'النخيل والتشجير' },
    text: { en: 'Palm trees and planting line the edge of the plaza.', ar: 'أشجار النخيل والنباتات على أطراف الساحة.' },
  },
];
const S = {
  view: { en: 'Eastmain, New Cairo. Zoomable photo.', ar: 'إيست مين، القاهرة الجديدة. صورة قابلة للتكبير.' },
  pin: { en: 'Show detail: {name}', ar: 'عرض التفصيل: {name}' },
  full: { en: 'Full view', ar: 'العرض الكامل' },
  zoom: { en: 'Zoom {n}%', ar: 'التكبير {n}%' },
  fsIn: { en: 'Full screen', ar: 'ملء الشاشة' },
  fsOut: { en: 'Exit full screen', ar: 'الخروج من ملء الشاشة' },
};
const fmt = (v, o) => t(v).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const pad = (n) => String(n).padStart(2, '0');
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/* ------------------------------------------------------------------ WebGL renderer */
const VERT = `attribute vec2 aPos; varying vec2 vUv;
void main(){ vUv = vec2(aPos.x * .5 + .5, .5 - aPos.y * .5); gl_Position = vec4(aPos, 0., 1.); }`;
const FRAG = `precision highp float;
uniform sampler2D uImg; uniform sampler2D uDepth;
uniform vec2 uRes; uniform vec2 uCenter; uniform vec2 uScale; uniform vec2 uTilt;
uniform float uPar; uniform float uFocus;
varying vec2 vUv;
const float F = 3.0;
vec2 toUv(vec2 q, float A){ return uCenter + vec2(q.x / (2. * A), -q.y * .5) / uScale; }
void main(){
  float A = uRes.x / uRes.y;
  vec2 p = vec2((vUv.x * 2. - 1.) * A, 1. - vUv.y * 2.);
  float ca = cos(uTilt.x), sa = sin(uTilt.x), cb = cos(uTilt.y), sb = sin(uTilt.y);
  // inverse rotation (plane frame): Rx(-a) * Ry(-b)
  mat3 ry = mat3(cb, 0., sb,  0., 1., 0.,  -sb, 0., cb);
  mat3 rx = mat3(1., 0., 0.,  0., ca, -sa,  0., sa, ca);
  mat3 inv = rx * ry;
  vec3 o = inv * vec3(0., 0., F);
  vec3 d = inv * vec3(p, -F);
  vec2 hit = o.xy - (o.z / d.z) * d.xy;
  vec2 slope = d.xy / d.z + p / F;
  vec2 q = hit;
  for (int i = 0; i < 4; i++) {
    float h = (texture2D(uDepth, clamp(toUv(q, A), 0., 1.)).r - uFocus) * uPar;
    q = hit + h * slope;
  }
  gl_FragColor = vec4(texture2D(uImg, clamp(toUv(q, A), 0., 1.)).rgb, 1.);
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
  for (const n of ['uImg', 'uDepth', 'uRes', 'uCenter', 'uScale', 'uTilt', 'uPar', 'uFocus']) u[n] = gl.getUniformLocation(prog, n);
  gl.uniform1i(u.uImg, 0);
  gl.uniform1i(u.uDepth, 1);
  const textures = [gl.createTexture(), gl.createTexture()];

  function upload(unit, source, mip) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, textures[unit]);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (mip && isGL2) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  }

  function draw(st) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform2f(u.uCenter, st.cx, st.cy);
    gl.uniform2f(u.uScale, st.sx, st.sy);
    gl.uniform2f(u.uTilt, st.tx, st.ty);
    gl.uniform1f(u.uPar, PAR);
    gl.uniform1f(u.uFocus, FOCUS);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  return { gl, upload, draw, maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE) };
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
export function initHero() {
  const root = $('[data-hx]');
  if (!root) return;
  const stage = $('[data-hx-stage]', root);
  const view = $('[data-hx-view]', root);
  const poster = $('[data-hx-poster] img', root);
  const posterSrc = $('[data-hx-poster-src]', root);
  const pinsLayer = $('[data-hx-pins]', root);
  const hint = $('[data-hx-hint]', root);
  const copy = $('[data-hx-copy]', root);
  const dock = $('[data-hx-dock]', root);
  const card = $('[data-hx-card]', root);
  const live = $('[data-hx-live]', root);
  const btn = {
    zin: $('[data-hx-zoom="in"]', root),
    zout: $('[data-hx-zoom="out"]', root),
    reset: $('[data-hx-reset]', root),
    full: $('[data-hx-full]', root),
  };
  const cardEls = {
    count: $('[data-hx-card-count]', card),
    title: $('[data-hx-card-title]', card),
    text: $('[data-hx-card-text]', card),
    close: $('[data-hx-card-close]', card),
  };

  const qa = isQA();
  const reduced = prefersReducedMotion() || qa;
  const fine = matchMedia('(pointer: fine)').matches;

  let W = 1, H = 1, dispW = 1, dispH = 1;
  const cur = { z: 1, cx: 0.5, cy: 0.5 };
  const tgt = { z: 1, cx: 0.5, cy: 0.5 };
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  let flight = null;
  let glr = null;          // WebGL renderer, null in CSS mode
  let hdState = 'none';    // none | loading | done
  let visible = true;
  let raf = 0;
  let last = 0;
  let engaged = false;
  let openIdx = -1;
  let hintTimer = 0;
  let zoomed = false;
  const pinEls = [];
  let ui = [];

  const mobile = () => W < 768;
  const rest = () => (mobile() ? REST.mob : REST.desk);
  const announce = (msg) => { if (live) { live.textContent = ''; requestAnimationFrame(() => { live.textContent = msg; }); } };

  /* ---------------------------------------------------------------- geometry */
  function measure() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    const s = Math.max(W / IMG.w, H / IMG.h) * OVER;
    dispW = IMG.w * s;
    dispH = IMG.h * s;
  }
  function clampState(st) {
    st.z = clamp(st.z, 1, ZMAX);
    const kx = dispW * st.z, ky = dispH * st.z;
    const ex = (W / 2 + W * 0.025) / kx, ey = (H / 2 + H * 0.025) / ky;
    st.cx = ex >= 0.5 ? 0.5 : clamp(st.cx, ex, 1 - ex);
    st.cy = ey >= 0.5 ? 0.5 : clamp(st.cy, ey, 1 - ey);
    return st;
  }
  const toUv = (sx, sy, st) => ({ u: st.cx + (sx - W / 2) / (dispW * st.z), v: st.cy + (sy - H / 2) / (dispH * st.z) });
  // image uv to stage px, through the same tilt as the shader (surface of the building, no parallax)
  function toScreen(u, v) {
    const A = W / H;
    const qx = (u - cur.cx) * dispW * cur.z / W * 2 * A;
    const qy = -(v - cur.cy) * dispH * cur.z / H * 2;
    const ca = Math.cos(tilt.x), sa = Math.sin(tilt.x), cb = Math.cos(tilt.y), sb = Math.sin(tilt.y);
    // R = Ry(b) * Rx(a)
    const y1 = qy * ca, z1 = qy * sa;
    const x2 = qx * cb + z1 * sb, z2 = -qx * sb + z1 * cb;
    const k = 3 / (3 - z2);
    return { x: (x2 * k / A + 1) / 2 * W, y: (1 - y1 * k) / 2 * H };
  }

  /* ---------------------------------------------------------------- render */
  function paint() {
    if (glr) {
      glr.draw({ cx: cur.cx, cy: cur.cy, sx: dispW * cur.z / W, sy: dispH * cur.z / H, tx: tilt.x, ty: tilt.y });
    } else {
      const z = cur.z;
      const x = W / 2 - cur.cx * dispW * z, y = H / 2 - cur.cy * dispH * z;
      poster.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${z.toFixed(4)})`;
    }
    placePins();
    placeCard();
  }
  function placeStill() {
    poster.style.width = `${dispW}px`;
    poster.style.height = `${dispH}px`;
    if (glr) {
      const st = clampState({ ...rest(), z: 1 });
      const x = W / 2 - st.cx * dispW, y = H / 2 - st.cy * dispH;
      poster.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    }
  }

  function tick(now) {
    raf = 0;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    let moving = false;
    if (flight) {
      const p = clamp((now - flight.t0) / flight.dur, 0, 1);
      const e = easeInOut(p);
      const z = Math.exp(Math.log(flight.a.z) + (Math.log(flight.b.z) - Math.log(flight.a.z)) * e);
      // pan in step with the change of view size, so the target grows from where it is
      const dz = 1 / flight.b.z - 1 / flight.a.z;
      const w = Math.abs(dz) > 1e-3 ? (1 / z - 1 / flight.a.z) / dz : e;
      cur.z = z;
      cur.cx = flight.a.cx + (flight.b.cx - flight.a.cx) * w;
      cur.cy = flight.a.cy + (flight.b.cy - flight.a.cy) * w;
      if (p >= 1) { const done = flight.done; flight = null; Object.assign(cur, tgt); done?.(); } else moving = true;
    } else {
      const k = 1 - Math.exp(-dt * 14);
      for (const key of ['z', 'cx', 'cy']) {
        const d = tgt[key] - cur[key];
        if (Math.abs(d) > (key === 'z' ? 1e-4 : 1e-5)) { cur[key] += d * k; moving = true; } else cur[key] = tgt[key];
      }
    }
    const kt = 1 - Math.exp(-dt * 4.5);
    for (const [a, b] of [['x', 'tx'], ['y', 'ty']]) {
      const d = tilt[b] - tilt[a];
      if (Math.abs(d) > 1e-5) { tilt[a] += d * kt; moving = true; } else tilt[a] = tilt[b];
    }
    paint();
    if (moving) request(); else last = 0;
  }
  function request() { if (!raf && visible) raf = requestAnimationFrame(tick); }
  function jump() { Object.assign(cur, tgt); tilt.x = tilt.tx; tilt.y = tilt.ty; paint(); }

  /* ---------------------------------------------------------------- state changes */
  function setZoomedUI() {
    const on = tgt.z > 1.12 || openIdx >= 0;
    if (on !== zoomed) {
      zoomed = on;
      root.classList.toggle('is-zoomed', on);
      ui = uiRects();
      view.style.touchAction = on ? 'none' : 'pan-y';
      if (on) loadHD();
    }
    if (btn.zin) btn.zin.disabled = tgt.z >= ZMAX - 1e-3;
    if (btn.zout) btn.zout.disabled = tgt.z <= 1 + 1e-3;
  }
  function settle() {
    clampState(tgt);
    setZoomedUI();
    if (reduced) jump(); else request();
  }
  function zoomAt(factor, sx = W / 2, sy = H / 2) {
    flight = null;
    const p = toUv(sx, sy, tgt);
    tgt.z = clamp(tgt.z * factor, 1, ZMAX);
    tgt.cx = p.u - (sx - W / 2) / (dispW * tgt.z);
    tgt.cy = p.v - (sy - H / 2) / (dispH * tgt.z);
    settle();
  }
  function panBy(dx, dy) {
    flight = null;
    tgt.cx -= dx / (dispW * tgt.z);
    tgt.cy -= dy / (dispH * tgt.z);
    settle();
  }
  function flyTo(st, done) {
    clampState(st);
    Object.assign(tgt, st);
    setZoomedUI();
    if (reduced) { flight = null; jump(); done?.(); return; }
    const dist = Math.hypot((st.cx - cur.cx) * dispW, (st.cy - cur.cy) * dispH) / Math.max(W, H);
    const dur = clamp(700 + 260 * Math.abs(Math.log(st.z / cur.z)) + 500 * dist, 700, 1500);
    flight = { a: { ...cur }, b: { ...st }, t0: performance.now(), dur, done };
    last = 0;
    request();
  }
  function reset({ say = true } = {}) {
    closeCard({ fly: false });
    flyTo({ ...rest(), z: 1 });
    if (say) announce(t(S.full));
  }

  /* ---------------------------------------------------------------- high-res image */
  async function loadHD() {
    if (hdState !== 'none') return;
    hdState = 'loading';
    try {
      if (glr) {
        if (glr.maxTex < IMG.w) { hdState = 'done'; return; }
        const bmp = await decoded(SRC.hd);
        if (!glr) return;
        glr.upload(0, bmp, true);
        bmp.close?.();
        paint();
      } else {
        await loadImage(SRC.hd);
        if (posterSrc) posterSrc.srcset = SRC.hd;
        poster.src = SRC.hd;
      }
      hdState = 'done';
    } catch (err) {
      hdState = 'none';
      console.warn('[hero] high-res image failed', err);
    }
  }

  /* ---------------------------------------------------------------- pins + card */
  function buildPins() {
    PINS.forEach((p, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hx-pin';
      b.innerHTML = '<span class="hx-pin__dot" aria-hidden="true"></span>';
      b.addEventListener('click', (e) => { e.stopPropagation(); openPin(i); });
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      pinsLayer.append(b);
      pinEls.push(b);
    });
    paintPinText();
  }
  function paintPinText() {
    pinEls.forEach((b, i) => b.setAttribute('aria-label', fmt(S.pin, { name: t(PINS[i].title) })));
    view.setAttribute('aria-label', t(S.view));
    if (openIdx >= 0) fillCard(openIdx);
    if (btn.full) btn.full.setAttribute('aria-label', t(document.fullscreenElement ? S.fsOut : S.fsIn));
  }
  function uiRects() {
    const s = stage.getBoundingClientRect();
    const list = [dock.getBoundingClientRect()];
    if (!zoomed) list.push(copy.getBoundingClientRect());
    list.push({ left: s.left, right: s.right, top: s.top, bottom: s.top + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 80) });
    return list.map((r) => ({ x0: r.left - s.left - 16, x1: r.right - s.left + 16, y0: r.top - s.top - 16, y1: r.bottom - s.top + 16 }));
  }
  function placePins() {
    pinEls.forEach((b, i) => {
      const p = toScreen(PINS[i].u, PINS[i].v);
      const out = p.x < 24 || p.y < 24 || p.x > W - 24 || p.y > H - 24 || ui.some((r) => p.x > r.x0 && p.x < r.x1 && p.y > r.y0 && p.y < r.y1);
      const hide = out && i !== openIdx;
      b.classList.toggle('is-off', hide);
      b.tabIndex = hide ? -1 : 0;
      b.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
    });
  }
  function placeCard() {
    if (openIdx < 0 || mobile()) return;
    const p = toScreen(PINS[openIdx].u, PINS[openIdx].v);
    const cw = card.offsetWidth, ch = card.offsetHeight;
    let x = isRTL() ? p.x - 40 - cw : p.x + 40;
    x = clamp(x, 16, W - cw - 16);
    const y = clamp(p.y - ch / 2, 96, H - ch - 112);
    card.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  }
  function fillCard(i) {
    cardEls.count.textContent = `${pad(i + 1)} / ${pad(PINS.length)}`;
    cardEls.title.textContent = t(PINS[i].title);
    cardEls.text.textContent = t(PINS[i].text);
  }
  function pinView(i) {
    const p = PINS[i];
    const z = mobile() ? p.z * 0.85 : p.z;
    // where the detail should land on screen: beside the card (desktop) or above the bottom card (phones)
    const fx = mobile() ? 0.5 : (isRTL() ? 0.6 : 0.4);
    const fy = mobile() ? 0.36 : 0.5;
    return { z, cx: p.u - (fx - 0.5) * W / (dispW * z), cy: p.v - (fy - 0.5) * H / (dispH * z) };
  }
  function openPin(i, { focusCard = true } = {}) {
    const first = openIdx < 0;
    openIdx = (i + PINS.length) % PINS.length;
    pinEls.forEach((b, k) => b.classList.toggle('is-active', k === openIdx));
    fillCard(openIdx);
    card.classList.add('is-away');
    card.hidden = false;
    setZoomedUI();
    flyTo(pinView(openIdx), () => {
      card.classList.remove('is-away');
      card.classList.remove('is-open');
      void card.offsetWidth;
      card.classList.add('is-open');
      placeCard();
    });
    placeCard();
    if (first && focusCard) cardEls.close.focus({ preventScroll: true });
  }
  function closeCard({ fly = true, focusPin = false } = {}) {
    if (openIdx < 0) return;
    const was = openIdx;
    openIdx = -1;
    card.hidden = true;
    card.classList.remove('is-open', 'is-away');
    pinEls.forEach((b) => b.classList.remove('is-active'));
    if (fly) { flyTo({ ...rest(), z: 1 }); announce(t(S.full)); } else setZoomedUI();
    if (focusPin) pinEls[was]?.focus({ preventScroll: true });
  }

  /* ---------------------------------------------------------------- engagement + hint */
  function engage(on) {
    if (engaged === on) return;
    engaged = on;
    root.classList.toggle('is-engaged', on);
    if (on) { view.setAttribute('data-lenis-prevent', ''); root.classList.remove('is-hint'); } else view.removeAttribute('data-lenis-prevent');
  }
  function showHint() {
    if (!fine || !hint) return;
    root.classList.add('is-hint');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => root.classList.remove('is-hint'), 1800);
  }

  /* ---------------------------------------------------------------- input */
  const pts = new Map();
  let drag = null;
  let pinch = null;
  let lastTap = { t: 0, x: 0, y: 0 };
  const local = (e) => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  view.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    engage(true);
    const p = local(e);
    pts.set(e.pointerId, p);
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, m: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
      drag = null;
    } else if (pts.size === 1) {
      const canPan = e.pointerType === 'mouse' || zoomed;
      drag = canPan ? { x: p.x, y: p.y, moved: 0 } : null;
      if (canPan) { try { view.setPointerCapture(e.pointerId); } catch { /* ignore */ } root.classList.add('is-dragging'); }
    }
  });
  view.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const p = local(e);
    pts.set(e.pointerId, p);
    if (pinch && pts.size >= 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      panBy(m.x - pinch.m.x, m.y - pinch.m.y);
      zoomAt(d / pinch.d, m.x, m.y);
      pinch = { d, m };
      Object.assign(cur, tgt);
      paint();
    } else if (drag) {
      const dx = p.x - drag.x, dy = p.y - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      drag.x = p.x; drag.y = p.y;
      if (openIdx >= 0 && drag.moved > 6) closeCard({ fly: false });
      panBy(dx, dy);
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
      if (tap && e.pointerType !== 'mouse') {
        const now = performance.now();
        if (now - lastTap.t < 320 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 36) { doubleAt(p.x, p.y); lastTap.t = 0; touchDbl = now; } else lastTap = { t: now, x: p.x, y: p.y };
      }
    }
  };
  view.addEventListener('pointerup', endPointer);
  view.addEventListener('pointercancel', endPointer);
  let touchDbl = 0;
  view.addEventListener('dblclick', (e) => { if (performance.now() - touchDbl < 600) return; const p = local(e); doubleAt(p.x, p.y); });
  function doubleAt(x, y) {
    closeCard({ fly: false });
    if (tgt.z >= ZMAX - 0.01) reset(); else zoomAt(2.2, x, y);
  }

  view.addEventListener('wheel', (e) => {
    const pinchGesture = e.ctrlKey || e.metaKey;
    if (!engaged && !pinchGesture) { showHint(); return; }
    e.preventDefault();
    const p = local(e);
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * H : e.deltaY;
    if (openIdx >= 0) closeCard({ fly: false });
    zoomAt(Math.exp(-clamp(dy, -240, 240) * (pinchGesture ? 0.01 : 0.0022)), p.x, p.y);
  }, { passive: false });

  function setTiltFrom(e) {
    if (reduced || !glr) return;
    const r = stage.getBoundingClientRect();
    const nx = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1);
    const ny = clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1);
    const k = 1 / Math.sqrt(cur.z);
    tilt.ty = nx * TILT * k;
    tilt.tx = ny * TILT * 0.7 * k;
    request();
  }
  root.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') setTiltFrom(e); });
  root.addEventListener('pointerdown', (e) => { if (!e.target.closest('a')) engage(true); });
  root.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse') return;
    engage(false);
    tilt.tx = 0; tilt.ty = 0;
    request();
  });

  view.addEventListener('keydown', (e) => {
    const step = 0.12;
    const k = e.key;
    let used = true;
    if (k === 'ArrowLeft') panBy(W * step, 0);
    else if (k === 'ArrowRight') panBy(-W * step, 0);
    else if (k === 'ArrowUp') panBy(0, H * step);
    else if (k === 'ArrowDown') panBy(0, -H * step);
    else if (k === '+' || k === '=') zoomAt(1.5);
    else if (k === '-' || k === '_') zoomAt(1 / 1.5);
    else if (k === '0') reset();
    else used = false;
    if (used) { e.preventDefault(); if (k !== '0') announce(fmt(S.zoom, { n: Math.round(tgt.z * 100) })); }
  });
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (openIdx >= 0) { e.stopPropagation(); closeCard({ focusPin: true }); } else engage(false);
  });

  btn.zin?.addEventListener('click', () => { closeCard({ fly: false }); zoomAt(1.6); announce(fmt(S.zoom, { n: Math.round(tgt.z * 100) })); });
  btn.zout?.addEventListener('click', () => { closeCard({ fly: false }); zoomAt(1 / 1.6); announce(fmt(S.zoom, { n: Math.round(tgt.z * 100) })); });
  btn.reset?.addEventListener('click', () => reset());
  cardEls.close.addEventListener('click', () => closeCard({ focusPin: true }));
  $$('[data-hx-card-step]', card).forEach((b) => b.addEventListener('click', () => openPin(openIdx + Number(b.dataset.hxCardStep), { focusCard: false })));
  card.addEventListener('pointerdown', (e) => e.stopPropagation());

  if (btn.full && document.fullscreenEnabled && root.requestFullscreen) {
    btn.full.hidden = false;
    btn.full.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen?.(); else root.requestFullscreen().catch(() => {});
    });
    document.addEventListener('fullscreenchange', () => {
      const on = document.fullscreenElement === root;
      btn.full.setAttribute('aria-pressed', String(on));
      btn.full.setAttribute('aria-label', t(on ? S.fsOut : S.fsIn));
    });
  }

  /* ---------------------------------------------------------------- layout + lifecycle */
  function relayout() {
    const wasMobile = mobile();
    measure();
    ui = uiRects();
    if (glr) {
      const canvas = glr.gl.canvas;
      const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4.2e6 / (W * H)));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }
    placeStill();
    if (openIdx >= 0) Object.assign(tgt, pinView(openIdx));
    else if (!zoomed || wasMobile !== mobile()) Object.assign(tgt, { ...rest(), z: zoomed ? tgt.z : 1 });
    clampState(tgt);
    flight = null;
    jump();
  }

  // static layout for the still before anything else (CSS mode moves it, WebGL mode keeps it as the first paint)
  poster.style.transformOrigin = '0 0';
  view.tabIndex = 0;
  view.setAttribute('role', 'application');
  view.setAttribute('aria-describedby', 'hx-help');
  view.style.touchAction = 'pan-y';
  buildPins();
  measure();
  Object.assign(tgt, clampState({ ...rest(), z: 1 }));
  Object.assign(cur, tgt);
  root.classList.add('is-css');
  relayout();
  setZoomedUI();

  if ('ResizeObserver' in window) {
    let pending = 0;
    new ResizeObserver(() => { cancelAnimationFrame(pending); pending = requestAnimationFrame(relayout); }).observe(stage);
  } else window.addEventListener('resize', relayout);
  // pins avoid the copy, which fades in late: refresh the UI areas once fonts and the intro are settled
  const refreshUI = () => { ui = uiRects(); placePins(); };
  document.fonts?.ready.then(refreshUI);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (!visible) engage(false); else request();
    }).observe(root);
  }
  root.addEventListener('transitionend', (e) => { if (e.target === copy) refreshUI(); });
  onLang(() => { paintPinText(); refreshUI(); paint(); });

  whenLoaded().then(() => {
    root.classList.add('is-ready');
    setTimeout(refreshUI, 1400);
    if (qa || !hasWebGL()) return;
    startGL().catch((err) => {
      console.warn('[hero] WebGL view unavailable, using the still', err);
      glr = null;
      root.classList.remove('is-live');
      root.classList.add('is-css');
      relayout();
    });
  });

  async function startGL() {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    const r = createGL(canvas);
    if (!r) throw new Error('no context');
    const [img, depth] = await Promise.all([decoded(poster.currentSrc || poster.src), decoded(SRC.depth)]);
    r.upload(0, img, true);
    r.upload(1, depth, false);
    img.close?.();
    depth.close?.();
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      glr = null;
      canvas.remove();
      root.classList.remove('is-live');
      root.classList.add('is-css');
      hdState = 'none';
      relayout();
    });
    view.append(canvas);
    glr = r;
    root.classList.remove('is-css');
    relayout();
    requestAnimationFrame(() => root.classList.add('is-live'));
    // the high-res image after first paint: right away on desktop, on the first zoom on touch screens
    if (fine) {
      const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 600));
      idle(() => loadHD(), { timeout: 2500 });
    }
  }
}
