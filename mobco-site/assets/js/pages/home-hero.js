// assets/js/pages/home-hero.js: HOME hero, an interactive 3D building (product-viewer style).
//
// · A still of the default view (assets/img/hero/) paints instantly; after first paint the studio engine
//   (assets/js/studio/engine.js) is imported, the model is built with the same camera, and the live canvas
//   crossfades in on its first frame.
// · Drag to orbit (touch: horizontal one-finger drags orbit, vertical swipes scroll the page, pinch zooms),
//   + / − buttons, double-click / double-tap zooms to a point, a click on the building flies in, mouse-wheel zoom
//   only after the visitor has pressed inside the viewer (until the pointer leaves it or Esc).
// · Hotspot pins from each model's meta.hotspots: a pin flies the camera to that part and opens a small card.
// · Toolbar: zoom, separate floors, day / night, reset, open in the full 3D Studio. Chips switch the building.
// · Keyboard: the canvas is focusable (arrow keys orbit, + / − zoom, 0 resets, Esc closes the card).
// · Reduced motion: no auto-rotate, instant camera moves. Software renderers (SwiftShader / llvmpipe) get the
//   engine's low-power profile and no auto-rotate. No WebGL2: the still stays, with a link to the 3D Studio.

import { t, onLang } from '../core/i18n.js';
import { $, $$, clamp, isQA, isRTL, prefersReducedMotion, rafThrottle } from '../core/utils.js';
import { whenLoaded } from '../core/preloader.js';

const MODELS = {
  'mixed-use': { name: { en: 'Eastmain', ar: 'إيست مين' }, place: { en: 'New Cairo, Egypt', ar: 'القاهرة الجديدة، مصر' } },
  'residential-tower': { name: { en: 'Victoria 101', ar: 'فيكتوريا 101' }, place: { en: 'Port Whitby, Canada', ar: 'بورت ويتبي، كندا' } },
  landmark: { name: { en: 'Classical Landmark', ar: 'المَعلم الكلاسيكي' }, place: { en: 'Saudi Arabia', ar: 'المملكة العربية السعودية' } },
};
const S = {
  canvas: { en: '{name}, interactive 3D model', ar: '{name}، نموذج تفاعلي ثلاثي الأبعاد' },
  studio: { en: 'Open {name} in the 3D Studio', ar: 'افتح {name} في الاستوديو ثلاثي الأبعاد' },
  loading: { en: 'Loading {name}', ar: 'جارٍ تحميل {name}' },
  ready: { en: '{name} is ready', ar: '{name} جاهز' },
  still: { en: '{name}, illustrative 3D model', ar: '{name}، نموذج توضيحي ثلاثي الأبعاد' },
};
const DAY = 14.5;
const NIGHT = 20.6;
const POSTER_ASPECT = 2.8; // assets/img/hero/eastmain-wide.* is 2800 × 1000, rendered centred on the camera target
const fmt = (v, o) => t(v).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const pad = (n) => String(n).padStart(2, '0');

function hasWebGL2() {
  try {
    if (new URLSearchParams(location.search).get('nogl') === '1') return false;
    const gl = document.createElement('canvas').getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch { return false; }
}

export function initHero3D() {
  const root = $('[data-hx]');
  if (!root) return;
  const stage = $('[data-hx-stage]', root);
  const view = $('[data-hx-view]', root);
  const pinsLayer = $('[data-hx-pins]', root);
  const copy = $('[data-hx-copy]', root);
  const dock = $('[data-hx-dock]', root);
  const bar = $('[data-hx-bar]', root);
  const card = $('[data-hx-card]', root);
  const live = $('[data-hx-live]', root);
  const progressEl = $('[data-hx-progress]', root);
  const posterImg = $('[data-hx-poster] img', root);
  const chips = $$('[data-hx-model]', root);
  const chipGroup = chips[0]?.parentElement;
  const studioLink = $('[data-hx-studio]', root);
  const placeEl = $('[data-hx-place]', root);
  const fallbackLink = $('[data-hx-fallback]', root);
  const btn = {
    zin: $('[data-hx-zoom="in"]', root),
    zout: $('[data-hx-zoom="out"]', root),
    explode: $('[data-hx-explode]', root),
    night: $('[data-hx-night]', root),
    reset: $('[data-hx-reset]', root),
  };
  const cardEls = {
    count: $('[data-hx-card-count]', card),
    title: $('[data-hx-card-title]', card),
    text: $('[data-hx-card-text]', card),
  };

  const reduced = prefersReducedMotion();
  let modelId = chips.find((c) => c.getAttribute('aria-pressed') === 'true')?.dataset.hxModel || 'mixed-use';
  let engine = null;
  let lowPower = false;
  let ready = false;          // a model is on screen and interactive
  let revealPending = false;  // crossfade on the first frame after a load
  let hotspots = [];
  const pins = new Map();
  let openId = null;
  let engaged = false;
  let autoAllowed = false;
  let autoOn = false;
  let exploded = false;
  let night = false;
  let hourRaf = 0;
  let lastFrame = [];
  let box = { w: 0, h: 0, top: 0, bottom: 0, cw: 0, ch: 0 };

  const mobile = () => box.w < 768;
  const announce = (msg) => { if (live) { live.textContent = ''; requestAnimationFrame(() => { live.textContent = msg; }); } };

  /* ------------------------------------------------------------------ text that depends on model / language */
  function paintModelText() {
    const m = MODELS[modelId];
    if (placeEl) placeEl.textContent = t(m.place);
    if (studioLink) {
      studioLink.href = `studio.html?model=${modelId}`;
      const label = fmt(S.studio, { name: t(m.name) });
      studioLink.setAttribute('aria-label', label);
    }
    engine?.canvas.setAttribute('aria-label', fmt(S.canvas, { name: t(m.name) }));
    if (root.classList.contains('is-static') && posterImg) posterImg.alt = fmt(S.still, { name: t(m.name) });
  }
  function setChip(id) {
    chips.forEach((c) => {
      const on = c.dataset.hxModel === id;
      c.setAttribute('aria-pressed', String(on));
      c.classList.toggle('is-active', on);
    });
  }
  function setProgress(v) { progressEl?.style.setProperty('--p', clamp(v, 0, 1).toFixed(3)); }

  /* ------------------------------------------------------------------ layout: insets + poster alignment */
  function measure() {
    const s = stage.getBoundingClientRect();
    const c = copy.getBoundingClientRect();
    const d = dock.getBoundingClientRect();
    const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 80;
    box = { ...box, w: s.width, h: s.height, left: s.left, right: s.right };
    let ins;
    if (s.width < 768) {
      ins = { left: 0, right: 0, top: Math.max(header, c.bottom - s.top + 8), bottom: Math.max(0, s.bottom - d.top + 8) };
    } else {
      const side = isRTL() ? Math.max(0, s.right - c.left + 16) : Math.max(0, c.right - s.left + 16);
      ins = { left: isRTL() ? 0 : side, right: isRTL() ? side : 0, top: header, bottom: Math.max(0, s.bottom - d.top + 8) };
    }
    box.top = ins.top;
    box.bottom = ins.bottom;
    root.style.setProperty('--hx-dock', `${Math.round(s.bottom - d.top)}px`);
    return ins;
  }
  function alignPoster(ins) {
    if (box.w < 768) { stage.style.removeProperty('--hx-px'); return; }
    const slack = POSTER_ASPECT * box.h - box.w;
    if (slack <= 1) { stage.style.removeProperty('--hx-px'); return; }
    // the live view shifts the building by (left − right) / 2 px; slide the wide still the same way
    const p = clamp(0.5 - ((ins.left - ins.right) / 2) / slack, 0, 1);
    stage.style.setProperty('--hx-px', `${(p * 100).toFixed(2)}%`);
  }
  function layout() {
    const ins = measure();
    alignPoster(ins);
    engine?.setInsets(ins);
    measureCard();
    placeCard();
  }

  /* ------------------------------------------------------------------ pins */
  function clearPins() { pinsLayer.innerHTML = ''; pins.clear(); }
  function buildPins() {
    clearPins();
    hotspots.forEach((h) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'hx-pin is-off';
      el.tabIndex = -1;
      el.dataset.id = h.id;
      el.setAttribute('aria-expanded', 'false');
      el.setAttribute('aria-controls', 'hx-card');
      el.innerHTML = '<span class="hx-pin__dot" aria-hidden="true"></span>';
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (openId === h.id) closeCard({ back: true }); else openCard(h.id);
      });
      pinsLayer.appendChild(el);
      pins.set(h.id, el);
    });
    labelPins();
  }
  function labelPins() { hotspots.forEach((h) => pins.get(h.id)?.setAttribute('aria-label', t(h.title))); }
  function onFrame({ hotspots: list }) {
    lastFrame = list || [];
    for (const p of lastFrame) {
      const el = pins.get(p.id);
      if (!el) continue;
      const show = ready && p.visible;
      if (el.__show !== show) {
        el.__show = show;
        el.classList.toggle('is-off', !show);
        el.tabIndex = show ? 0 : -1;
      }
      if (el.__occ !== p.occluded) { el.__occ = p.occluded; el.classList.toggle('is-occluded', !!p.occluded); }
      if (show) el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
    }
    placeCard();
    if (revealPending) {
      revealPending = false;
      requestAnimationFrame(() => root.classList.add('is-live'));
    }
  }

  /* ------------------------------------------------------------------ hotspot card */
  function measureCard() {
    if (card.hidden) return;
    box.cw = card.offsetWidth;
    box.ch = card.offsetHeight;
  }
  function fillCard() {
    const i = hotspots.findIndex((h) => h.id === openId);
    if (i < 0) return;
    const h = hotspots[i];
    cardEls.count.textContent = `${pad(i + 1)} / ${pad(hotspots.length)}`;
    cardEls.title.textContent = t(h.title);
    cardEls.text.textContent = t(h.text);
    measureCard();
  }
  function placeCard() {
    if (!openId || card.hidden) return;
    if (mobile()) { card.style.transform = ''; return; }
    const p = lastFrame.find((x) => x.id === openId);
    if (!p) return;
    const gap = 30, m = 20;
    const { w, cw, ch } = box;
    // open towards the side with more room (the card never covers its pin)
    let x = p.x > w * 0.56 ? p.x - gap - cw : p.x + gap;
    if (x + cw > w - m) x = p.x - gap - cw;
    if (x < m) x = Math.min(p.x + gap, w - m - cw);
    const y = clamp(p.y - ch / 2, box.top + 8, Math.max(box.top + 8, box.h - box.bottom - ch - 8));
    card.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    card.classList.toggle('is-away', !p.visible);
  }
  function openCard(id) {
    if (!engine || !hotspots.some((h) => h.id === id)) return;
    stopAuto();
    engage(true);
    if (exploded) setExploded(false);
    openId = id;
    pins.forEach((el, k) => {
      el.setAttribute('aria-expanded', String(k === id));
      el.classList.toggle('is-active', k === id);
    });
    card.hidden = false;
    root.classList.add('has-card');
    fillCard();
    placeCard();
    card.classList.remove('is-open');
    void card.offsetWidth;
    card.classList.add('is-open');
    engine.focusHotspot(id);
  }
  function closeCard({ back = false, focusPin = false } = {}) {
    if (!openId) return;
    const id = openId;
    openId = null;
    card.hidden = true;
    card.classList.remove('is-open');
    root.classList.remove('has-card');
    pins.forEach((el) => { el.setAttribute('aria-expanded', 'false'); el.classList.remove('is-active'); });
    if (back) engine?.setView('aerial');
    if (focusPin) {
      const el = pins.get(id);
      if (el && !el.classList.contains('is-off')) el.focus({ preventScroll: true });
      else engine?.canvas.focus({ preventScroll: true });
    }
  }
  function stepCard(dir) {
    if (!openId || !hotspots.length) return;
    const i = hotspots.findIndex((h) => h.id === openId);
    openCard(hotspots[(i + dir + hotspots.length) % hotspots.length].id);
  }

  /* ------------------------------------------------------------------ toggles */
  function sync() {
    btn.explode?.setAttribute('aria-pressed', String(exploded));
    btn.night?.setAttribute('aria-pressed', String(night));
    root.classList.toggle('is-night', night);
  }
  function stopAuto() {
    if (!autoOn) return;
    autoOn = false;
    engine?.setAutoRotate(false);
  }
  function setExploded(on) {
    exploded = on;
    if (on) closeCard();
    engine?.setExplode(on ? 1 : 0);
    sync();
  }
  function animateHour(to) {
    cancelAnimationFrame(hourRaf);
    if (!engine) return;
    const from = engine.getState().hour;
    if (reduced || lowPower || Math.abs(to - from) < 0.01) { engine.setTime(to); return; }
    const t0 = performance.now();
    const D = 1500;
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / D);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      engine.setTime(from + (to - from) * e);
      if (k < 1) hourRaf = requestAnimationFrame(tick);
    };
    hourRaf = requestAnimationFrame(tick);
  }
  function setNight(on) {
    night = on;
    animateHour(on ? NIGHT : DAY);
    sync();
  }
  function resetAll() {
    if (!engine) return;
    closeCard();
    cancelAnimationFrame(hourRaf);
    engine.reset();
    exploded = false;
    night = false;
    sync();
    autoOn = autoAllowed;
    engine.setAutoRotate(autoOn);
  }
  function zoomBy(f) {
    if (!engine) return;
    stopAuto();
    engine.zoom(f, { duration: 420 });
  }

  /* ------------------------------------------------------------------ wheel engagement */
  function engage(on) {
    if (engaged === on) return;
    engaged = on;
    engine?.setWheelZoom(on);
    // while engaged the wheel belongs to the viewer: keep Lenis from smooth-scrolling the page as well
    engine?.canvas.toggleAttribute('data-lenis-prevent-wheel', on);
    root.classList.toggle('is-engaged', on);
  }

  /* ------------------------------------------------------------------ loading */
  function fallback() {
    root.classList.remove('is-loading', 'is-live');
    root.classList.add('is-static');
    ready = false;
    clearPins();
    closeCard();
    if (bar) bar.hidden = true;
    if (chipGroup) chipGroup.hidden = true;
    if (fallbackLink) { fallbackLink.hidden = false; fallbackLink.href = `studio.html?model=${modelId}`; }
    if (posterImg) posterImg.alt = fmt(S.still, { name: t(MODELS[modelId].name) });
    try { engine?.dispose(); } catch { /* ignore */ }
    engine = null;
  }
  async function load(id, first = false) {
    modelId = id;
    setChip(id);
    paintModelText();
    closeCard();
    cancelAnimationFrame(hourRaf);
    root.classList.add('is-loading');
    setProgress(0.04);
    if (!first) announce(fmt(S.loading, { name: t(MODELS[id].name) }));
    try {
      await engine.load(id, { instantCamera: first });
    } catch (err) {
      console.warn('[home] 3D model failed to load', err);
      if (first || !ready) fallback();
      else { root.classList.remove('is-loading'); }
    }
  }
  function onLoad({ id, hotspots: hs }) {
    modelId = id;
    hotspots = Array.isArray(hs) ? hs : [];
    exploded = false;
    if (night) engine.setTime(NIGHT); // keep the visitor's day / night choice across buildings
    sync();
    buildPins();
    ready = true;
    root.classList.remove('is-loading');
    setProgress(1);
    if (!root.classList.contains('is-live')) revealPending = true;
    else announce(fmt(S.ready, { name: t(MODELS[id].name) }));
    if (autoOn) {
      // start turning once the crossfade has settled
      setTimeout(() => { if (autoOn) engine?.setAutoRotate(true); }, revealPending ? 1400 : 300);
    }
  }

  async function boot() {
    if (!hasWebGL2()) { fallback(); return; }
    root.classList.add('is-loading');
    setProgress(0.03);
    let mod;
    try {
      mod = await import('../studio/engine.js');
      engine = mod.createStudio(view, {
        model: null,
        controls: true,
        ui: false,
        hotspots: true,
        autoRotate: false,
        quality: 'auto',
        touchAction: 'pan-y',
        wheelZoom: false,
        clickAction: 'focus',
      });
    } catch (err) {
      console.warn('[home] 3D viewer unavailable', err);
      fallback();
      return;
    }
    lowPower = !!engine.lowPower;
    autoAllowed = !reduced && !lowPower && !isQA();
    autoOn = autoAllowed;
    engine.controls.autoRotateSpeed = 0.75;
    engine.controls.minDistance = 14;
    const cv = engine.canvas;
    cv.setAttribute('aria-describedby', 'hx-help');
    cv.setAttribute('aria-roledescription', t({ en: '3D viewer', ar: 'عارض ثلاثي الأبعاد' }));
    engine.on('progress', ({ value }) => setProgress(value));
    engine.on('load', onLoad);
    engine.on('frame', onFrame);
    engine.on('interact', stopAuto);
    engine.on('pick', ({ point }) => {
      stopAuto();
      if (point && openId) closeCard();
    });
    engine.on('contextlost', () => { console.warn('[home] WebGL context lost'); fallback(); });
    layout();
    paintModelText();
    await load(modelId, true);
  }

  /* ------------------------------------------------------------------ wiring */
  chips.forEach((c) => c.addEventListener('click', () => {
    const id = c.dataset.hxModel;
    if (!MODELS[id]) return;
    if (!engine) { modelId = id; setChip(id); paintModelText(); return; }
    if (id === modelId && ready) return;
    load(id);
  }));
  btn.zin?.addEventListener('click', () => zoomBy(0.78));
  btn.zout?.addEventListener('click', () => zoomBy(1.28));
  btn.explode?.addEventListener('click', () => { stopAuto(); setExploded(!exploded); });
  btn.night?.addEventListener('click', () => setNight(!night));
  btn.reset?.addEventListener('click', resetAll);
  $('[data-hx-card-close]', card)?.addEventListener('click', () => closeCard({ back: true, focusPin: true }));
  $$('[data-hx-card-step]', card).forEach((b) => b.addEventListener('click', () => stepCard(Number(b.dataset.hxCardStep))));

  // mouse-wheel zoom only after a press inside the viewer; leaving it (or Esc) hands the wheel back to the page
  root.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.hx__stage, .hx-card, .hx__bar')) engage(true);
  }, true);
  root.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') engage(false); });

  // keyboard: arrows orbit (instead of OrbitControls' pan), + / − zoom, 0 resets, Esc closes the card
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (openId) { e.preventDefault(); closeCard({ back: true, focusPin: true }); }
      engage(false);
      return;
    }
    if (!engine || e.target !== engine.canvas || e.altKey || e.metaKey || e.ctrlKey) return;
    const a = 0.16;
    let handled = true;
    switch (e.key) {
      case 'ArrowLeft': engine.rotate(-a, 0); break;
      case 'ArrowRight': engine.rotate(a, 0); break;
      case 'ArrowUp': engine.rotate(0, -a * 0.6); break;
      case 'ArrowDown': engine.rotate(0, a * 0.6); break;
      case '+': case '=': zoomBy(0.8); break;
      case '-': case '_': zoomBy(1.25); break;
      case '0': case 'Home': resetAll(); break;
      default: handled = false;
    }
    if (handled) { e.preventDefault(); e.stopPropagation(); stopAuto(); }
  }, true);

  // off-screen: give the wheel back; the engine pauses its own rendering
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) engage(false); }, { threshold: 0 }).observe(root);
  }
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(rafThrottle(layout));
    [stage, copy, dock].forEach((el) => ro.observe(el));
  } else window.addEventListener('resize', rafThrottle(layout));

  onLang(() => {
    paintModelText();
    labelPins();
    engine?.canvas.setAttribute('aria-roledescription', t({ en: '3D viewer', ar: 'عارض ثلاثي الأبعاد' }));
    if (openId) fillCard();
    layout();
  });

  /* ------------------------------------------------------------------ boot: still first, engine after first paint */
  layout();
  paintModelText();
  whenLoaded().then(() => {
    root.classList.add('is-ready');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const go = () => boot().catch((err) => { console.warn('[home] 3D hero failed', err); fallback(); });
      if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 600 });
      else setTimeout(go, 60);
    }));
  });

  // read-only handle for QA scripts
  Object.defineProperty(window, 'MOBCO_HERO', { configurable: true, get: () => ({ engine, ready, modelId, openId, engaged, autoOn, exploded, night }) });
}
