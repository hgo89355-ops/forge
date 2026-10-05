// assets/js/pages/home-hero.js: HOME hero, Eastmain as a detailed 3D building you can spin and zoom (product-viewer style).
//
// · A still rendered from this same viewer (assets/img/hero/eastmain-3d-*) paints first, aligned to the live camera.
//   After first paint the studio engine (assets/js/studio/engine.js) is imported, the Eastmain model is built at the
//   blue hour, and the live canvas crossfades in on its first frame.
// · Drag to orbit (limited above the ground). The mouse wheel zooms towards the pointer only after a click inside the
//   viewer; wheeling before that shows a small hint and the page scrolls normally. Esc or leaving the hero gives the
//   wheel back. Touch: horizontal drags orbit, one-finger vertical swipes scroll the page, pinch zooms.
// · Close zoom reaches the facade, so the lit floors are visible through the glass.
// · "+" pins on real features fly the camera there and open a small card. Plus / minus, reset, full screen,
//   Explore in 3D. Slow auto-rotate until the visitor interacts (off for reduced motion, low-power renderers, ?qa=1).
// · The copy fades while zoomed in. Arabic mirrors the layout (copy on the right), never the model.
// · No WebGL2: the still stays, with the Explore in 3D link. CPU rasterisers (no GPU): the still stays until the
//   pointer reaches the hero. ?poster=1 renders the bare view for the stills.

import { t, onLang } from '../core/i18n.js';
import { $, $$, clamp, isQA, isRTL, prefersReducedMotion, rafThrottle } from '../core/utils.js';
import { whenLoaded } from '../core/preloader.js';

const MODEL = 'mixed-use';
const HOUR = 19.8;           // blue hour: sun about 5.5 degrees below the horizon
// Home cameras (world metres). Desktop keeps the corner of the glass box in a three-quarter view from the plaza;
// phones stand further back so the whole building fits the narrow frame.
const VIEWS = {
  desk: { position: [50, 8.5, 44], target: [8, 9.2, -10] },
  mob: { position: [56, 10, 54], target: [4, 9, -10] },
};
// The stills are rendered with no side insets: the camera target sits at the image centre.
const POSTER = { desk: { w: 2800, h: 1080 }, mob: { w: 400, h: 1200 } };
const PIN_DIST = { offices: 30, shops: 26, plaza: 46, roof: 44 };
const S = {
  canvas: { en: 'Eastmain, New Cairo. Interactive 3D model.', ar: 'إيست مين، القاهرة الجديدة. نموذج تفاعلي ثلاثي الأبعاد.' },
  role: { en: '3D viewer', ar: 'عارض ثلاثي الأبعاد' },
  pin: { en: 'Show: {name}', ar: 'عرض: {name}' },
  home: { en: 'Full view', ar: 'العرض الكامل' },
  fsIn: { en: 'Full screen', ar: 'ملء الشاشة' },
  fsOut: { en: 'Exit full screen', ar: 'الخروج من ملء الشاشة' },
};
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

export function initHero() {
  const root = $('[data-hx]');
  if (!root) return;
  const stage = $('[data-hx-stage]', root);
  const view = $('[data-hx-view]', root);
  const posterImg = $('[data-hx-poster] img', root);
  const pinsLayer = $('[data-hx-pins]', root);
  const hint = $('[data-hx-hint]', root);
  const copy = $('[data-hx-copy]', root);
  const dock = $('[data-hx-dock]', root);
  const bar = $('[data-hx-bar]', root);
  const card = $('[data-hx-card]', root);
  const live = $('[data-hx-live]', root);
  const fallbackLink = $('[data-hx-fallback]', root);
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

  const params = new URLSearchParams(location.search);
  const posterMode = params.get('poster') === '1';
  const qa = isQA();
  const reduced = prefersReducedMotion();
  const fine = typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;

  let engine = null;
  let ready = false;
  let revealPending = false;
  let hotspots = [];
  const pins = new Map();
  let openId = null;
  let engaged = false;
  let autoAllowed = false;
  let autoOn = false;
  let zoomed = false;
  let hintTimer = 0;
  let lastFrame = [];
  let homeDist = 1;
  let layoutKind = '';
  let box = { w: 0, h: 0, top: 0, bottom: 0, cw: 0, ch: 0, ui: [] };

  const mobile = () => box.w < 768;
  const kind = () => (mobile() ? 'mob' : 'desk');
  const announce = (msg) => { if (live) { live.textContent = ''; requestAnimationFrame(() => { live.textContent = msg; }); } };

  if (posterMode) root.classList.add('is-poster');

  /* ------------------------------------------------------------------ layout: insets, poster alignment */
  function measure() {
    const s = stage.getBoundingClientRect();
    const c = copy.getBoundingClientRect();
    const d = dock.getBoundingClientRect();
    const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 80;
    box = { ...box, w: s.width, h: s.height };
    const rel = (r, m) => ({ x0: r.left - s.left - m, x1: r.right - s.left + m, y0: r.top - s.top - m, y1: r.bottom - s.top + m });
    const uiRects = [...dock.children].filter((el) => !el.hidden).map((el) => el.getBoundingClientRect());
    if (!zoomed) uiRects.push(c);
    box.ui = uiRects.filter((r) => r.width).map((r) => rel(r, 14));
    box.ui.push({ x0: -1e4, x1: 1e4, y0: -1e4, y1: header + 8 });
    let ins;
    if (posterMode) ins = { left: 0, right: 0, top: 0, bottom: 0 };
    else if (mobile()) ins = { left: 0, right: 0, top: Math.max(header, c.bottom - s.top), bottom: Math.max(0, s.bottom - d.top + 8) };
    else {
      // the building moves to the free side of the copy (mirrored in Arabic); vertical stays centred
      const side = Math.round(s.width * 0.3);
      ins = { left: isRTL() ? 0 : side, right: isRTL() ? side : 0, top: 0, bottom: 0 };
    }
    box.top = mobile() ? ins.top : header;
    box.bottom = Math.max(0, s.bottom - d.top + 8);
    root.style.setProperty('--hx-dock', `${Math.round(s.bottom - d.top)}px`);
    return ins;
  }
  /** Place the still so its camera centre lands where the live view puts it (the engine shifts the projection by
      (left minus right) / 2 and (top minus bottom) / 2 pixels). */
  function alignPoster(ins) {
    if (!posterImg) return;
    const k = kind();
    const P = POSTER[k];
    const W = box.w, H = box.h;
    const aspect = W / H;
    // the engine keeps the vertical field of view on wide screens and the horizontal one below an aspect of 1.25
    const liveScale = aspect >= 1.25 ? H : W / 1.25;
    const stillScale = P.w / P.h >= 1.25 ? P.h : P.w / 1.25;
    const s = liveScale / stillScale;
    const cx = W / 2 + (ins.left - ins.right) / 2;
    const cy = H / 2 + (ins.top - ins.bottom) / 2;
    let w = P.w * s, h = P.h * s;
    let x = cx - w / 2, y = cy - h / 2;
    // never leave an edge uncovered: grow (and recentre) when needed
    if (x > 0 || y > 0 || x + w < W || y + h < H || !(s > 0)) {
      const sc = Math.max(W / P.w, H / P.h);
      w = P.w * sc; h = P.h * sc;
      x = clamp(cx - w / 2, W - w, 0); y = clamp(cy - h / 2, H - h, 0);
    }
    posterImg.style.width = `${w.toFixed(1)}px`;
    posterImg.style.height = `${h.toFixed(1)}px`;
    posterImg.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  }
  function layout() {
    const ins = measure();
    alignPoster(ins);
    if (engine) {
      engine.setInsets(ins);
      const k = kind();
      if (k !== layoutKind) {
        layoutKind = k;
        engine.setHomeView(VIEWS[k], { apply: ready && !openId && !zoomed, instant: true });
        homeDist = dist(VIEWS[k].position, VIEWS[k].target);
      }
    } else layoutKind = '';
    measureCard();
    placeCard();
  }
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  /* ------------------------------------------------------------------ pins */
  function clearPins() { pinsLayer.innerHTML = ''; pins.clear(); }
  function buildPins() {
    clearPins();
    if (posterMode) return;
    hotspots.forEach((h) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'hx-pin is-off';
      el.tabIndex = -1;
      el.dataset.id = h.id;
      el.setAttribute('aria-expanded', 'false');
      el.innerHTML = '<span class="hx-pin__dot" aria-hidden="true"></span>';
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (openId === h.id) closeCard({ back: true }); else openCard(h.id);
      });
      el.addEventListener('pointerdown', (e) => e.stopPropagation());
      pinsLayer.appendChild(el);
      pins.set(h.id, el);
    });
    labelPins();
  }
  function labelPins() { hotspots.forEach((h) => pins.get(h.id)?.setAttribute('aria-label', fmt(S.pin, { name: t(h.title) }))); }
  const underUI = (x, y) => box.ui.some((r) => x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1);
  function onFrame({ hotspots: list }) {
    lastFrame = list || [];
    for (const p of lastFrame) {
      const el = pins.get(p.id);
      if (!el) continue;
      const edge = p.x < 20 || p.y < 20 || p.x > box.w - 20 || p.y > box.h - 20;
      const show = ready && p.visible && !edge && (p.id === openId || !underUI(p.x, p.y));
      if (el.__show !== show) {
        el.__show = show;
        el.classList.toggle('is-off', !show);
        el.tabIndex = show ? 0 : -1;
      }
      if (el.__occ !== p.occluded) { el.__occ = p.occluded; el.classList.toggle('is-occluded', !!p.occluded); }
      if (show) el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
    }
    placeCard();
    checkZoom();
    if (revealPending) {
      revealPending = false;
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-live')));
    }
  }

  /* ------------------------------------------------------------------ zoom state: fade the copy when close */
  function checkZoom() {
    if (!engine) return;
    const d = engine.camera.position.distanceTo(engine.controls.target);
    const on = !!openId || d < homeDist * 0.7;
    if (on === zoomed) return;
    zoomed = on;
    root.classList.toggle('is-zoomed', on);
    measure();
  }

  /* ------------------------------------------------------------------ card */
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
    const gap = 32, m = 20;
    const { w, cw, ch } = box;
    let x = p.x > w * 0.56 ? p.x - gap - cw : p.x + gap;
    if (x + cw > w - m) x = p.x - gap - cw;
    if (x < m) x = Math.min(p.x + gap, w - m - cw);
    const y = clamp(p.y - ch / 2, box.top + 8, Math.max(box.top + 8, box.h - box.bottom - ch - 8));
    card.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    card.classList.toggle('is-away', !p.visible);
  }
  function openCard(id, { focus = true } = {}) {
    if (!engine || !hotspots.some((h) => h.id === id)) return;
    stopAuto();
    engage(true);
    const first = !openId;
    openId = id;
    pins.forEach((el, k) => {
      el.setAttribute('aria-expanded', String(k === id));
      el.classList.toggle('is-active', k === id);
    });
    card.hidden = false;
    fillCard();
    placeCard();
    card.classList.remove('is-open');
    void card.offsetWidth;
    card.classList.add('is-open');
    engine.focusHotspot(id, { distance: (PIN_DIST[id] || 36) * (mobile() ? 1.35 : 1), duration: reduced ? 0 : 1400 });
    checkZoom();
    if (first && focus) cardEls.close?.focus({ preventScroll: true });
  }
  function closeCard({ back = false, focusPin = false } = {}) {
    if (!openId) return;
    const id = openId;
    openId = null;
    card.hidden = true;
    card.classList.remove('is-open', 'is-away');
    pins.forEach((el) => { el.setAttribute('aria-expanded', 'false'); el.classList.remove('is-active'); });
    if (back) { engine?.setView('aerial'); announce(t(S.home)); }
    if (focusPin) {
      const el = pins.get(id);
      if (el && !el.classList.contains('is-off')) el.focus({ preventScroll: true });
      else engine?.canvas.focus({ preventScroll: true });
    }
    checkZoom();
  }
  function stepCard(dir) {
    if (!openId || !hotspots.length) return;
    const i = hotspots.findIndex((h) => h.id === openId);
    openCard(hotspots[(i + dir + hotspots.length) % hotspots.length].id, { focus: false });
  }

  /* ------------------------------------------------------------------ controls */
  function stopAuto() {
    if (!autoOn) return;
    autoOn = false;
    engine?.setAutoRotate(false);
  }
  function resetAll() {
    if (!engine) return;
    closeCard();
    engine.setView('aerial');
    autoOn = autoAllowed;
    engine.setAutoRotate(autoOn);
    announce(t(S.home));
  }
  function zoomBy(f) {
    if (!engine) return;
    stopAuto();
    engine.zoom(f, { duration: reduced ? 0 : 420 });
  }

  /* ------------------------------------------------------------------ wheel engagement + hint */
  function engage(on) {
    if (engaged === on) return;
    engaged = on;
    engine?.setWheelZoom(on);
    // while engaged the wheel belongs to the viewer: keep Lenis from smooth-scrolling the page as well
    engine?.canvas.toggleAttribute('data-lenis-prevent', on);
    root.classList.toggle('is-engaged', on);
    if (on) root.classList.remove('is-hint');
  }
  function showHint() {
    if (!fine || !hint || !ready) return;
    root.classList.add('is-hint');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => root.classList.remove('is-hint'), 1800);
  }

  /* ------------------------------------------------------------------ loading */
  function fallback() {
    root.classList.remove('is-loading', 'is-live');
    root.classList.add('is-static');
    ready = false;
    clearPins();
    closeCard();
    if (bar) bar.hidden = true;
    if (fallbackLink) fallbackLink.hidden = false;
    try { engine?.dispose(); } catch { /* ignore */ }
    engine = null;
    layout();
  }
  function onLoad({ hotspots: hs }) {
    hotspots = Array.isArray(hs) ? hs : [];
    buildPins();
    ready = true;
    root.classList.remove('is-loading');
    revealPending = true;
    if (autoOn) setTimeout(() => { if (autoOn) engine?.setAutoRotate(true); }, 1500);
    layout();
  }

  /** On CPU rasterisers (no GPU) the first frame compiles for seconds and every frame is slow: the still (a render
      of this same model) stays until the visitor reaches for the hero (pointer over it, a tap or keyboard focus). */
  function whenWanted() {
    return new Promise((resolve) => {
      // a real pointer move over the hero (not the hover update a scroll causes under a resting pointer), a press,
      // keyboard focus or a wheel turn
      const evs = ['pointermove', 'pointerdown', 'focusin', 'wheel'];
      const go = (e) => {
        if (e.type === 'pointermove' && !(e.movementX || e.movementY)) return;
        evs.forEach((t) => root.removeEventListener(t, go));
        resolve();
      };
      evs.forEach((t) => root.addEventListener(t, go, { passive: true }));
    });
  }

  async function boot() {
    if (!hasWebGL2()) { fallback(); return; }
    let mod;
    try {
      mod = await import('../studio/engine.js');
      const lp = params.get('lowpower');
      const cpu = lp === '1' || (lp !== '0' && mod.gpu().software);
      if (cpu && !posterMode) await whenWanted();
      root.classList.add('is-loading');
      const k = kind();
      engine = mod.createStudio(view, {
        model: null,
        controls: !posterMode,
        ui: false,
        hotspots: !posterMode,
        autoRotate: false,
        quality: 'auto',
        touchAction: 'pan-y',
        wheelZoom: false,
        clickAction: 'none',
        hour: HOUR,
        homeView: VIEWS[k],
        zoomToCursor: true,
        minTargetY: 1,
        bloom: true,
        maxDpr: 1.5,
      });
    } catch (err) {
      console.warn('[home] 3D viewer unavailable', err);
      fallback();
      return;
    }
    layoutKind = kind();
    homeDist = dist(VIEWS[layoutKind].position, VIEWS[layoutKind].target);
    autoAllowed = !reduced && !engine.lowPower && !qa && !posterMode;
    autoOn = autoAllowed;
    const c = engine.controls;
    c.autoRotateSpeed = 0.35;
    c.minDistance = 2.5;
    c.maxDistance = 190;
    c.maxPolarAngle = Math.PI * 0.5; // down to eye level, never below the target
    c.zoomSpeed = 1.1;
    const cv = engine.canvas;
    cv.setAttribute('aria-label', t(S.canvas));
    cv.setAttribute('aria-roledescription', t(S.role));
    cv.setAttribute('aria-describedby', 'hx-help');
    engine.on('load', onLoad);
    engine.on('frame', onFrame);
    engine.on('interact', () => { stopAuto(); if (openId) closeCard(); });
    engine.on('contextlost', () => { console.warn('[home] WebGL context lost'); fallback(); });
    layout();
    try {
      await engine.load(MODEL, { instantCamera: true });
    } catch (err) {
      console.warn('[home] 3D model failed to load', err);
      fallback();
      return;
    }
    // the engine's own limit is generous for the studio; the hero keeps the camera near the building
    c.maxDistance = 190;
  }

  /* ------------------------------------------------------------------ wiring */
  btn.zin?.addEventListener('click', () => zoomBy(0.72));
  btn.zout?.addEventListener('click', () => zoomBy(1.38));
  btn.reset?.addEventListener('click', resetAll);
  cardEls.close?.addEventListener('click', () => closeCard({ back: true, focusPin: true }));
  $$('[data-hx-card-step]', card).forEach((b) => b.addEventListener('click', () => stepCard(Number(b.dataset.hxCardStep))));
  card.addEventListener('pointerdown', (e) => e.stopPropagation());

  // wheel zoom only after a press inside the viewer; before that, a hint and the page scrolls
  view.addEventListener('wheel', (e) => { if (!engaged && !(e.ctrlKey || e.metaKey)) showHint(); }, { passive: true });
  root.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a')) return;
    if (e.target.closest('.hx__stage, .hx-card, .hx__bar')) { engage(true); stopAuto(); }
  }, true);
  root.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') engage(false); });

  // keyboard: arrows orbit, plus / minus zoom, 0 resets, Esc closes the card and gives the wheel back
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
      case '+': case '=': zoomBy(0.75); break;
      case '-': case '_': zoomBy(1.33); break;
      case '0': case 'Home': resetAll(); break;
      default: handled = false;
    }
    if (handled) { e.preventDefault(); e.stopPropagation(); stopAuto(); }
  }, true);

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

  // off-screen: give the wheel back; the engine pauses its own rendering
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) engage(false); }, { threshold: 0 }).observe(root);
  }
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(rafThrottle(layout));
    [stage, copy, dock].forEach((el) => ro.observe(el));
  } else window.addEventListener('resize', rafThrottle(layout));
  root.addEventListener('transitionend', (e) => { if (e.target === copy) measure(); });

  onLang(() => {
    labelPins();
    engine?.canvas.setAttribute('aria-label', t(S.canvas));
    engine?.canvas.setAttribute('aria-roledescription', t(S.role));
    if (btn.full) btn.full.setAttribute('aria-label', t(document.fullscreenElement ? S.fsOut : S.fsIn));
    if (openId) fillCard();
    layout();
  });

  /* ------------------------------------------------------------------ boot: still first, engine after first paint */
  layout();
  if (posterImg && !posterImg.complete) posterImg.addEventListener('load', layout, { once: true });
  whenLoaded().then(() => {
    root.classList.add('is-ready');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const go = () => boot().catch((err) => { console.warn('[home] 3D hero failed', err); fallback(); });
      if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 600 });
      else setTimeout(go, 60);
    }));
  });

  // read-only handle for QA scripts and the still renderer
  Object.defineProperty(window, 'MOBCO_HERO', {
    configurable: true,
    get: () => ({ engine, ready, live: root.classList.contains('is-live'), openId, engaged, autoOn, zoomed }),
  });
}
