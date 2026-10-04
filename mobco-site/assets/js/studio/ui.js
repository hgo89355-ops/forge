// MOBCO Project Builder · ui.js
// Binds studio.html to the engine. Two modes share one viewer:
//   explore · the five project models: library rail with runtime thumbnails, info card, hotspots and their cards
//   build   · the visitor's own concept sketch (models/builder.js), rebuilt live from the builder form
// Shared: compact view options (view presets, day / sunset / night, separate floors, line drawing), toolbar
// (save image, full screen, reset, show / hide options), zoom buttons, floor chip, loader, error and
// no-WebGL states, wheel-zoom engagement, view insets. Fully bilingual through strings.js and t().

import { t, getLang, onLang } from '../core/i18n.js';
import { scan, stopScroll, startScroll } from '../core/motion.js';
import { toast } from '../core/ui.js';
import { $, $$, esc, icon, store, isTouch, hasFinePointer, prefersReducedMotion, debounce } from '../core/utils.js';
import { projectUrl } from '../data/site-data.js';
import { S, fmt } from './strings.js';
import { modelIcon, projectFor } from './registry.js';
import { DEFAULT_HOUR } from './environment.js';
import { createBuilderUI } from './builder-ui.js';
import { setConfig as setBuilderConfig } from './models/builder.js';

const pad = (n) => String(n).padStart(2, '0');
const THUMB_KEY = (id) => `mobco-studio-thumb-v2:${id}`;
const BUILDER = 'builder';
const LIGHT = { day: DEFAULT_HOUR, sunset: 18.35, night: 21 };
const lightOf = (h) => (h < 17.4 ? 'day' : h < 19.2 ? 'sunset' : 'night');

export function createStudioUI({ root, engine, entries, initialId, initialMode = 'explore', deepLinked = false, onModelChange = () => {} }) {
  const viewport = $('[data-studio-viewport]', root);
  const loader = $('[data-studio-loader]', root);
  const errorEl = $('[data-studio-error]', root);
  const fallbackEl = $('[data-studio-fallback]', root);
  const hotLayer = $('[data-studio-hotspots]', root);
  const levelChip = $('[data-studio-level]', root);
  const hint = $('[data-studio-hint]', root);
  const hintText = $('[data-studio-hint-text]', root);
  const live = $('[data-studio-live]', root);
  const side = $('[data-studio-side]', root);
  const infoBody = $('[data-studio-info-body]', root);
  const panel = $('[data-studio-panel]', root);
  const panelBody = $('[data-panel-body]', root);
  const panelToggle = $('[data-panel-toggle]', root);
  const railList = $('[data-rail-list]', root);
  const rail = $('[data-studio-rail]', root);
  const toolbar = $('[data-studio-toolbar]', root);
  const zoomBox = $('[data-studio-zoom]', root);
  const poster = $('[data-studio-poster-img]', root);
  const form = $('[data-builder]', root);

  const metas = {};            // id → normalized meta (after a successful load)
  const status = {};           // id → 'ok' | 'error'
  let mode = initialMode === 'build' ? 'build' : 'explore';
  let current = initialId;     // explore model id (kept while building, so "Our projects" returns to it)
  let shown = null;            // id currently displayed by the engine ('builder' while building)
  let readyFired = false;
  let loadSeq = 0;
  let engineState = engine ? engine.getState() : null;
  let hotspots = [];
  let openHot = null;
  let hotcard = null;
  let hoverFloor = null, selectedFloor = null;
  let immersive = false;
  let collapsed = false;
  let engaged = false;
  let viewTouched = false;     // the visitor moved the camera since the last preset
  let currentView = 'aerial';
  let lastInsets = { left: 0, right: 0, top: 0, bottom: 0 };

  const reduced = prefersReducedMotion() || !!engine?.lowPower;
  if (engine?.lowPower) root.classList.add('is-lowpower');
  const touchOnly = isTouch() && !hasFinePointer();

  /* ============================================================ helpers */
  const entryOf = (id) => entries.find((e) => e.id === id) || null;
  const nameOf = (id) => {
    if (id === BUILDER) return t(S.yourProject);
    const e = entryOf(id);
    return t(e?.project ? e.name : metas[id]?.name || e?.name || id);
  };
  const announce = (msg) => { if (live) { live.textContent = ''; requestAnimationFrame(() => { live.textContent = msg; }); } };
  const isDesktopLayout = () => matchMedia('(min-width: 1024px)').matches;

  function fireReady(ok) {
    if (readyFired) return;
    readyFired = true;
    root.dataset.ready = 'true';
    window.dispatchEvent(new CustomEvent('studio:ready', { detail: { model: mode === 'build' ? BUILDER : current, mode, ok, webgl: !!engine } }));
  }

  // brand the engine's floor highlight boxes (hover / selected) without touching engine.js
  if (engine) {
    engine.scene.traverse((o) => {
      const m = o.material;
      if (!m || !m.color) return;
      const hex = m.color.getHex();
      if (hex === 0x9be3da) m.color.set('#a9d8dc');
      else if (hex === 0x6fd1c5) m.color.set('#5fb2b8');
    });
  }

  /* ============================================================ rail */
  function renderRail() {
    railScrolledTo = null;
    railList.innerHTML = entries.map((e) => {
      const thumb = store.get(THUMB_KEY(e.id), 'session');
      return `<li><button class="studio-rail__item${status[e.id] === 'error' ? ' is-unavailable' : ''}" type="button" data-model="${esc(e.id)}" aria-pressed="${mode === 'explore' && e.id === current}">
        <span class="studio-rail__thumb${thumb ? ' has-img' : ''}">${modelIcon(e.id)}${thumb ? `<img src="${esc(thumb)}" alt="" width="320" height="200" decoding="async">` : ''}</span>
        <span class="studio-rail__name">${esc(t(e.name))}</span>
      </button></li>`;
    }).join('');
    syncRail();
  }
  let railScrolledTo = null;
  function revealActiveRailItem() {
    if (railScrolledTo === current || railList.scrollWidth <= railList.clientWidth + 2) return;
    const b = railList.querySelector(`[data-model="${CSS.escape(current)}"]`);
    if (!b) return;
    railScrolledTo = current;
    const lr = railList.getBoundingClientRect(), br = b.parentElement.getBoundingClientRect();
    railList.scrollBy({ left: br.left + br.width / 2 - (lr.left + lr.width / 2), behavior: reduced ? 'auto' : 'smooth' });
  }
  function syncRail() {
    requestAnimationFrame(revealActiveRailItem);
    $$('.studio-rail__item', railList).forEach((b) => {
      const id = b.dataset.model;
      b.setAttribute('aria-pressed', String(mode === 'explore' && id === current));
      b.classList.toggle('is-unavailable', status[id] === 'error');
      b.classList.toggle('is-loading', mode === 'explore' && id === current && engineState?.loading === true);
    });
  }
  function setThumb(id, url) {
    if (!url) return;
    store.set(THUMB_KEY(id), url, 'session');
    const box = railList.querySelector(`[data-model="${CSS.escape(id)}"] .studio-rail__thumb`);
    if (!box || box.querySelector('img')) return;
    box.insertAdjacentHTML('beforeend', `<img src="${esc(url)}" alt="" width="320" height="200" decoding="async">`);
    box.classList.add('has-img');
  }
  railList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-model]');
    if (btn) go(btn.dataset.model);
  });

  /* ============================================================ info card (explore) */
  function renderInfo(id, { animate = false } = {}) {
    const entry = entryOf(id);
    if (!entry) return;
    const meta = metas[id];
    const project = projectFor(id, meta);
    const name = nameOf(id);
    const tagline = t(meta?.tagline || entry.tagline || '');
    // two short facts at most: the card stays calm; the "illustrative" line covers the model itself
    const desc = (meta?.descriptors || [])
      .filter((d) => d && d.label && d.value && !/^model$/i.test(String(d.label.en || '').trim()))
      .slice(0, 2);
    const location = project?.location ? `<p class="studio__loc">${icon('map-pin', 'icon--sm')}<span>${esc(t(project.location))}</span></p>` : '';
    infoBody.innerHTML = `
      <h2 class="studio__name">${esc(name)}</h2>
      ${tagline ? `<p class="studio__tagline">${esc(tagline)}</p>` : ''}
      ${location}
      ${desc.length ? `<dl class="studio__desc">${desc.map((d) => `<div><dt>${esc(t(d.label))}</dt><dd>${esc(t(d.value))}</dd></div>`).join('')}</dl>` : ''}
      <p class="studio__note">${esc(t(S.illustrative))}</p>
      ${project ? `<a class="link-arrow studio__project-link" href="${esc(projectUrl(project))}"><span>${esc(t(S.seeProject))}</span><span class="link-arrow__icon">${icon('arrow-right', 'icon--dir')}</span></a>` : ''}`;
    if (animate && !reduced) { infoBody.classList.remove('is-swapping'); void infoBody.offsetWidth; infoBody.classList.add('is-swapping'); }
    scan(infoBody);
    labelCanvas();
    requestAnimationFrame(updateInsets);
  }
  function labelCanvas() {
    if (engine) engine.canvas.setAttribute('aria-label', fmt(t(S.canvasLabel), { name: mode === 'build' ? t(S.yourProject) : nameOf(current) }));
  }

  /* ============================================================ loader / states */
  const loaderLabel = $('[data-loader-label]', loader);
  const loaderName = $('[data-loader-name]', loader);
  const loaderBar = $('[data-loader-bar]', loader);
  let loaderTimer = 0;
  function showLoader(id, { soft = false } = {}) {
    clearTimeout(loaderTimer);
    loader.classList.remove('is-hidden');
    loader.classList.toggle('is-soft', soft);
    loaderLabel.removeAttribute('data-ar');
    loaderLabel.textContent = t(S.loading);
    loaderName.textContent = nameOf(id);
    setProgress(0.04);
  }
  const setProgress = (v) => loaderBar.style.setProperty('--p', v.toFixed(3));
  function hideLoader() {
    setProgress(1);
    loaderTimer = setTimeout(() => loader.classList.add('is-hidden'), reduced ? 0 : 220);
  }
  function showError(on) {
    errorEl.hidden = !on;
    root.classList.toggle('has-error', on);
  }

  /* ============================================================ modes */
  const modeBtns = $$('[data-studio-mode]', root);
  function renderMode() {
    root.dataset.mode = mode;
    modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.studioMode === mode)));
    if (form) form.hidden = mode !== 'build';
    if (rail) rail.hidden = mode === 'build';
    labelCanvas();
    syncRail();
    requestAnimationFrame(updateInsets);
  }
  modeBtns.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.studioMode)));

  function setMode(next, { push = true } = {}) {
    if (next !== 'build' && next !== 'explore') return;
    if (next === mode && (shown === (next === 'build' ? BUILDER : current) || engineState?.loading)) return;
    mode = next;
    closeHotcard();
    renderMode();
    onModelChange(mode === 'build' ? BUILDER : current, { push, mode });
    if (mode === 'build') loadBuilder();
    else go(current, { push: false, force: true });
  }

  /* ============================================================ model switching (explore) */
  function go(id, { push = true, autoFallback = false, force = false } = {}) {
    const entry = entryOf(id);
    if (!entry) return;
    if (mode === 'build') { mode = 'explore'; renderMode(); force = true; }
    if (!force && id === current && (shown === id || engineState?.loading) && !autoFallback) return;
    current = id;
    closeHotcard();
    renderInfo(id, { animate: true });
    syncRail();
    onModelChange(id, { push, mode });
    updateProjects();
    if (!engine) { showFallbackImage(id); fireReady(false); return; }
    showError(false);
    loadModel(id, { autoFallback });
  }

  function loadModel(id, { retry = false, autoFallback = false } = {}) {
    const seq = ++loadSeq;
    showLoader(id, { soft: !!shown });
    engineState = { ...engineState, loading: true };
    syncRail();
    viewTouched = false; currentView = 'aerial';
    engine.load(id, { retry: retry || status[id] === 'error' }).then((meta) => {
      if (seq !== loadSeq || !meta) return;
      metas[id] = meta;
      status[id] = 'ok';
      shown = id;
      root.classList.add('is-live');
      hideLoader();
      showError(false);
      renderInfo(id);
      syncRail();
      reapplyViewOptions();
      announce(fmt(t(S.loaded), { name: nameOf(id) }));
      fireReady(true);
      window.dispatchEvent(new CustomEvent('studio:modelchange', { detail: { model: id, mode } }));
      queueThumbnails();
    }).catch((err) => {
      if (seq !== loadSeq) return;
      console.warn(`[studio] model "${id}" is unavailable:`, err?.message || err);
      status[id] = 'error';
      engineState = { ...engineState, loading: false };
      syncRail();
      if (autoFallback) {
        const next = entries.find((e) => status[e.id] !== 'error' && e.id !== id);
        if (next) { go(next.id, { push: false, autoFallback: true }); return; }
      }
      hideLoader();
      showError(true);
      if (!shown) root.classList.add('is-live');
      fireReady(false);
    });
  }

  function nextModelId(dir = 1) {
    const i = entries.findIndex((e) => e.id === current);
    return entries[(i + dir + entries.length) % entries.length].id;
  }
  $('[data-action="retry"]', errorEl)?.addEventListener('click', () => {
    showError(false);
    if (mode === 'build') loadBuilder(); else loadModel(current, { retry: true });
  });
  $('[data-action="next-model"]', errorEl)?.addEventListener('click', () => go(nextModelId(1)));

  /* ============================================================ builder (build mode) */
  // Every change rebuilds the sketch through engine.load('builder'); the camera, light and floor separation
  // the visitor chose are carried over, so the model simply changes in place.
  let building = false, buildQueued = false, rebuilding = false;
  const builder = form ? createBuilderUI({ form, onChange: (cfg) => { setBuilderConfig(cfg); if (mode === 'build') queueRebuild(); } }) : null;
  if (builder) setBuilderConfig(builder.config);

  function loadBuilder() {
    if (!engine) { showFallbackImage(current); fireReady(false); return; }
    const seq = ++loadSeq;
    showError(false);
    showLoader(BUILDER, { soft: !!shown });
    engineState = { ...engineState, loading: true };
    viewTouched = false; currentView = 'aerial';
    building = true;
    engine.load(BUILDER).then((meta) => {
      building = false;
      if (seq !== loadSeq || !meta) return;
      shown = BUILDER;
      root.classList.add('is-live');
      hideLoader();
      reapplyViewOptions();
      labelCanvas();
      fireReady(true);
      window.dispatchEvent(new CustomEvent('studio:modelchange', { detail: { model: BUILDER, mode } }));
      if (buildQueued) { buildQueued = false; rebuild(); }
    }).catch((err) => {
      building = false;
      if (seq !== loadSeq) return;
      console.error('[studio] the builder sketch failed', err);
      hideLoader();
      showError(true);
      root.classList.add('is-live');
      fireReady(false);
    });
  }
  const queueRebuild = debounce(() => rebuild(), engine?.lowPower ? 220 : 90);
  async function rebuild() {
    if (!engine || mode !== 'build') return;
    if (building || shown !== BUILDER) { buildQueued = true; return; }
    building = true;
    const seq = ++loadSeq;
    const st = engine.getState();
    const cam = engine.camera.position.clone();
    const target = engine.controls.target.clone();
    const keepView = viewTouched;
    const view = currentView;
    viewport.classList.add('is-updating');
    try {
      rebuilding = true;
      await engine.load(BUILDER, { instantCamera: true });
      if (seq !== loadSeq) return;
      engine.setTime(st.hour);
      if (st.explode > 0) engine.setExplode(st.explode, { instant: true });
      if (keepView) {
        engine.camera.position.copy(cam);
        engine.controls.target.copy(target);
        engine.controls.update();
      } else {
        // the preset was never moved: re-frame it so a taller or wider sketch still fits
        engine.setView(view, { instant: true });
      }
      viewTouched = keepView;
      engine.invalidate();
      announce(t(S.updated));
      window.dispatchEvent(new CustomEvent('studio:modelchange', { detail: { model: BUILDER, mode, update: true } }));
    } catch (err) {
      console.error('[studio] the builder sketch failed to update', err);
    } finally {
      rebuilding = false;
      building = false;
      viewport.classList.remove('is-updating');
      if (buildQueued) { buildQueued = false; rebuild(); }
    }
  }
  $('[data-builder-save]', form || root)?.addEventListener('click', () => screenshot());

  /* ============================================================ no-WebGL fallback */
  function showFallbackImage(id) {
    const e = entryOf(id);
    if (!poster || !e) return;
    const pic = poster.parentElement;
    pic.querySelector('source')?.setAttribute('srcset', `assets/img/${e.image}.webp`);
    poster.src = `assets/img/${e.image}.jpg`;
    poster.style.objectPosition = e.pos || '50% 50%';
    poster.alt = t(e.name);
  }
  if (!engine) {
    root.classList.add('is-fallback');
    fallbackEl.hidden = false;
    loader.classList.add('is-hidden');
    [toolbar, panel, hint, zoomBox].forEach((el) => { if (el) el.hidden = true; });
    $('.studio-modes', root)?.setAttribute('hidden', '');
  }

  /* ============================================================ view options (compact panel) */
  const explodeInput = $('[data-control="explode"]', panel);
  const linesInput = $('[data-control="lines"]', panel);
  const viewBtns = $$('[data-view]', panel);
  const lightBtns = $$('[data-light]', panel);
  let wantExplode = false, wantLines = false, wantLight = 'day';

  function markView(name) { viewBtns.forEach((b) => b.classList.toggle('is-current', b.dataset.view === name)); }
  function markLight(name) { lightBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.light === name))); }
  /** After a model loads the engine resets to its defaults: re-apply what the visitor picked. */
  function reapplyViewOptions() {
    if (!engine) return;
    if (wantLight !== 'day') engine.setTime(LIGHT[wantLight]);
    if (wantLines) engine.setMode('blueprint');
    if (wantExplode && !rebuilding) engine.setExplode(0.6);
    markView('aerial');
  }
  if (engine) {
    viewBtns.forEach((b) => b.addEventListener('click', () => {
      currentView = b.dataset.view;
      viewTouched = false;
      engine.setView(currentView);
      markView(currentView);
    }));
    lightBtns.forEach((b) => b.addEventListener('click', () => {
      wantLight = b.dataset.light;
      engine.setTime(LIGHT[wantLight]);
      markLight(wantLight);
    }));
    explodeInput?.addEventListener('change', () => { wantExplode = explodeInput.checked; engine.setExplode(wantExplode ? 0.6 : 0); });
    linesInput?.addEventListener('change', () => { wantLines = linesInput.checked; engine.setMode(wantLines ? 'blueprint' : 'realistic'); });
  }
  function syncControls(st) {
    if (!st) return;
    if (explodeInput) explodeInput.checked = st.explode > 0.02;
    if (linesInput) linesInput.checked = st.mode === 'blueprint';
    markLight(lightOf(st.hour));
  }

  // small screens: the options fold away under one button
  function setPanelOpen(open) {
    if (!panelToggle || !panelBody) return;
    panelToggle.setAttribute('aria-expanded', String(open));
    panelBody.classList.toggle('is-closed', !open); // CSS folds it on small screens only
  }
  panelToggle?.addEventListener('click', () => setPanelOpen(panelToggle.getAttribute('aria-expanded') !== 'true'));
  setPanelOpen(false);

  /* ============================================================ zoom buttons */
  zoomBox?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-zoom]');
    if (!b || !engine) return;
    engine.zoom(b.dataset.zoom === 'in' ? 0.8 : 1.25, { duration: 360 });
    viewTouched = true;
  });

  /* ============================================================ toolbar */
  const fsBtn = $('[data-action="fullscreen"]', toolbar);
  const panelBtn = $('[data-action="panel"]', toolbar);
  toolbar?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const a = b.dataset.action;
    if (a === 'screenshot') screenshot();
    else if (a === 'fullscreen') toggleFullscreen();
    else if (a === 'reset') reset();
    else if (a === 'panel') togglePanel();
  });
  toolbar?.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const btns = $$('.studio-tool', toolbar).filter((b) => b.offsetParent !== null && !b.disabled);
    const i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const fwd = (e.key === 'ArrowRight') !== (getLang() === 'ar');
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? btns.length - 1 : (i + (fwd ? 1 : -1) + btns.length) % btns.length;
    btns[n].focus();
  });

  function labelButton(btn, s) {
    if (!btn) return;
    btn.removeAttribute('data-ar-aria-label');
    btn.removeAttribute('data-ar-tooltip');
    btn.setAttribute('aria-label', t(s));
    btn.setAttribute('data-tooltip', t(s));
  }
  function renderToolbarLabels() {
    labelButton(fsBtn, immersive ? S.exitFullscreen : S.fullscreen);
    fsBtn?.querySelector('use')?.setAttribute('href', `assets/icons/sprite.svg#${immersive ? 'minimize' : 'maximize'}`);
    fsBtn?.setAttribute('aria-pressed', String(immersive));
    labelButton(panelBtn, collapsed ? S.showControls : S.hideControls);
    panelBtn?.setAttribute('aria-expanded', String(!collapsed));
  }
  function togglePanel(force) {
    collapsed = force ?? !collapsed;
    root.classList.toggle('is-panel-collapsed', collapsed);
    renderToolbarLabels();
    updateInsets();
  }

  function reset() {
    if (!engine) return;
    closeHotcard();
    engine.reset();
    wantExplode = false; wantLines = false; wantLight = 'day';
    currentView = 'aerial'; viewTouched = false;
    markView('aerial');
  }

  async function screenshot() {
    if (!engine || !shown) return;
    try {
      const shot = engine.snapshot();
      const ctx = shot.getContext('2d');
      const W = shot.width, H = shot.height;
      const s = Math.max(1, W / 1400);
      const band = Math.round(96 * s);
      const grad = ctx.createLinearGradient(0, H - band * 1.7, 0, H);
      grad.addColorStop(0, 'rgba(22,22,42,0)');
      grad.addColorStop(1, 'rgba(22,22,42,0.84)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, H - band * 1.7, W, band * 1.7);
      const ar = getLang() === 'ar';
      const fam = ar ? '"IBM Plex Sans Arabic", sans-serif' : 'Manrope, Inter, sans-serif';
      ctx.direction = ar ? 'rtl' : 'ltr';
      ctx.textAlign = ar ? 'right' : 'left';
      const x = ar ? W - 32 * s : 32 * s;
      const build = shown === BUILDER;
      ctx.fillStyle = '#5fb2b8';
      ctx.font = `700 ${Math.round(13 * s)}px ${fam}`;
      ctx.fillText(t(S.screenshotCaption).toUpperCase(), x, H - (build ? 76 : 56) * s);
      ctx.fillStyle = '#ffffff';
      ctx.font = `600 ${Math.round(22 * s)}px ${fam}`;
      ctx.fillText(nameOf(shown), x, H - (build ? 48 : 28) * s);
      if (build && builder) {
        ctx.fillStyle = 'rgba(255,255,255,0.84)';
        ctx.font = `500 ${Math.round(14 * s)}px ${fam}`;
        let line = builder.summary();
        while (ctx.measureText(line).width > W * 0.62 && line.length > 20) line = `${line.slice(0, -2)}`;
        if (line !== builder.summary()) line = `${line.trim()}…`;
        ctx.fillText(line, x, H - 24 * s);
      }
      ctx.textAlign = ar ? 'left' : 'right';
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.font = `500 ${Math.round(13 * s)}px ${fam}`;
      ctx.fillText(t(build ? S.concept : S.illustrative), ar ? 32 * s : W - 32 * s, H - 24 * s);
      const blob = await new Promise((r) => shot.toBlob(r, 'image/png'));
      if (!blob) throw new Error('toBlob failed');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = build ? 'mobco-project-sketch.png' : `mobco-${shown}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast(S.screenshotSaved, { type: 'success' });
    } catch (e) {
      console.warn('[studio] screenshot failed', e);
    }
  }

  /* ============================================================ full screen (immersive) */
  function setImmersive(on) {
    if (on === immersive) return;
    immersive = on;
    root.classList.toggle('is-immersive', on);
    document.documentElement.classList.toggle('studio-immersive', on);
    if (on) stopScroll(); else startScroll();
    if (on) setEngaged(true); else if (!touchOnly) setEngaged(false);
    renderToolbarLabels();
    requestAnimationFrame(updateInsets);
  }
  async function toggleFullscreen() {
    if (!engine) return;
    if (!immersive) {
      setImmersive(true);
      try { await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); } catch { /* CSS immersive only */ }
    } else {
      if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch { /* ignore */ } }
      setImmersive(false);
    }
  }
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && immersive) setImmersive(false); });

  /* ============================================================ wheel-zoom engagement & hint */
  function setEngaged(on) {
    engaged = on;
    if (!engine) return;
    engine.setControlsEnabled({ zoom: on || touchOnly });
    engine.canvas.toggleAttribute('data-lenis-prevent-wheel', on);
  }
  let hintTimer = 0;
  function renderHint() { if (hintText) hintText.textContent = t(S.zoomHint); }
  function showHint(ms) {
    if (!hint || !engine) return;
    renderHint();
    hint.classList.remove('is-hidden');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => hint.classList.add('is-hidden'), ms);
  }
  if (engine) {
    setEngaged(touchOnly);
    engine.canvas.addEventListener('pointerdown', () => { setEngaged(true); });
    viewport.addEventListener('pointerleave', () => { if (!immersive && !touchOnly) setEngaged(false); });
    viewport.addEventListener('wheel', (e) => {
      if (engaged) return;
      if (e.ctrlKey || e.metaKey) {
        engine.setControlsEnabled({ zoom: true });
        setTimeout(() => { if (!engaged) engine.setControlsEnabled({ zoom: false }); }, 0);
        return;
      }
      if (e.target === engine.canvas) showHint(2600);
    }, { capture: true, passive: true });
    engine.canvas.addEventListener('keydown', (e) => {
      if (e.key === '+' || e.key === '=') { e.preventDefault(); engine.zoom(0.85); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); engine.zoom(1.18); }
    });
    let lastTap = 0, lastTapXY = [0, 0];
    engine.canvas.addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'touch') return;
      const nowT = performance.now();
      if (nowT - lastTap < 320 && Math.hypot(e.clientX - lastTapXY[0], e.clientY - lastTapXY[1]) < 28) {
        engine.focusAt(e.clientX, e.clientY);
        lastTap = 0;
      } else { lastTap = nowT; lastTapXY = [e.clientX, e.clientY]; }
    });
  }

  /* ============================================================ hotspots (explore) */
  function buildHotspots(list) {
    closeHotcard();
    hotLayer.innerHTML = '';
    hotspots = (list || []).map((h, i) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'studio-hotspot is-off';
      el.dataset.hotspot = h.id;
      el.setAttribute('aria-expanded', 'false');
      el.innerHTML = `<span class="studio-hotspot__dot num-ltr" aria-hidden="true">${i + 1}</span>`;
      el.addEventListener('click', (ev) => { ev.stopPropagation(); toggleHotcard(h.id); });
      hotLayer.appendChild(el);
      return { ...h, index: i + 1, el, last: { x: -1, y: -1, cls: 'init' } };
    });
    labelHotspots();
  }
  function labelHotspots() {
    hotspots.forEach((h) => h.el.setAttribute('aria-label', fmt(t(S.hotspotLabel), { n: h.index, title: t(h.title) })));
  }
  function positionHotspots(list) {
    for (const p of list) {
      const h = hotspots.find((x) => x.id === p.id);
      if (!h) continue;
      const x = Math.round(p.x * 2) / 2, y = Math.round(p.y * 2) / 2;
      if (x !== h.last.x || y !== h.last.y) { h.el.style.transform = `translate3d(${x}px, ${y}px, 0)`; h.last.x = x; h.last.y = y; }
      const off = !p.visible;
      const cls = `${off ? 'o' : ''}${p.occluded ? 'c' : ''}`;
      if (cls !== h.last.cls) {
        h.el.classList.toggle('is-off', off);
        h.el.classList.toggle('is-occluded', !off && p.occluded);
        h.el.tabIndex = off ? -1 : 0;
        h.last.cls = cls;
        if (off && openHot === h.id) closeHotcard();
      }
    }
    if (openHot) placeHotcard();
  }
  function toggleHotcard(id) { if (openHot === id) closeHotcard(true); else openHotcard(id); }
  function openHotcard(id) {
    const h = hotspots.find((x) => x.id === id);
    if (!h) return;
    closeHotcard();
    openHot = id;
    h.el.setAttribute('aria-expanded', 'true');
    hotcard = document.createElement('div');
    hotcard.className = 'studio-hotcard';
    hotcard.id = 'studio-hotcard';
    hotcard.setAttribute('role', 'dialog');
    hotcard.setAttribute('aria-labelledby', 'studio-hotcard-title');
    hotcard.tabIndex = -1;
    renderHotcard();
    hotcard.addEventListener('click', (e) => { if (e.target.closest('[data-hot-close]')) closeHotcard(true); });
    hotcard.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeHotcard(true); } });
    viewport.appendChild(hotcard);
    h.el.setAttribute('aria-controls', 'studio-hotcard');
    placeHotcard();
    hotcard.focus({ preventScroll: true });
  }
  function renderHotcard() {
    const h = hotspots.find((x) => x.id === openHot);
    if (!h || !hotcard) return;
    hotcard.innerHTML = `
      <span class="studio-hotcard__num">${esc(fmt(t(S.hotspotNum), { n: pad(h.index) }))}</span>
      <h3 class="studio-hotcard__title" id="studio-hotcard-title">${esc(t(h.title))}</h3>
      <p class="studio-hotcard__text">${esc(t(h.text))}</p>
      <button class="studio-hotcard__close" type="button" data-hot-close aria-label="${esc(t(S.close))}">${icon('x')}</button>`;
  }
  function placeHotcard() {
    if (!hotcard) return;
    const h = hotspots.find((x) => x.id === openHot);
    const p = h && h.last.x >= 0 ? h.last : null;
    if (!p) { hotcard.style.visibility = 'hidden'; engine?.invalidate(); return; }
    hotcard.style.visibility = '';
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    const cw = hotcard.offsetWidth, ch = hotcard.offsetHeight;
    const rtl = getLang() === 'ar';
    const ins = lastInsets;
    const minX = Math.max(12, ins.left), maxX = Math.min(vw - 12, vw - ins.right) - cw;
    const after = p.x + 26, before = p.x - cw - 26;
    let x = rtl ? before : after;
    if (x > maxX) x = before;
    if (x < minX) x = after <= maxX ? after : before;
    x = Math.max(minX, Math.min(maxX, x));
    let y = p.y - ch / 2;
    y = Math.max(12 + Math.max(ins.top, isDesktopLayout() ? 80 : 60), Math.min(vh - Math.max(12, ins.bottom) - ch, y));
    hotcard.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
  }
  function closeHotcard(returnFocus = false) {
    if (!openHot) return;
    const h = hotspots.find((x) => x.id === openHot);
    h?.el.setAttribute('aria-expanded', 'false');
    h?.el.removeAttribute('aria-controls');
    hotcard?.remove();
    hotcard = null;
    openHot = null;
    if (returnFocus && h && !h.el.classList.contains('is-off')) h.el.focus({ preventScroll: true });
  }
  viewport.addEventListener('pointerdown', (e) => {
    if (openHot && !e.target.closest('.studio-hotcard, .studio-hotspot')) closeHotcard();
  });

  /* ============================================================ floor chip */
  const levelNum = $('[data-level-num]', levelChip);
  const levelLabel = $('[data-level-label]', levelChip);
  const floorLabel = (f) => (!f ? '' : f.label ? t(f.label) : fmt(t(S.levelN), { n: f.level + 1 }));
  function renderLevel() {
    const f = selectedFloor || hoverFloor;
    if (!f) { levelChip.hidden = true; return; }
    levelChip.hidden = false;
    const sel = !!selectedFloor;
    $$('button', levelChip).forEach((b) => { b.hidden = !sel; });
    levelNum.textContent = fmt(t(S.levelOf), { n: pad(f.index + 1), total: pad(f.count) });
    levelLabel.textContent = floorLabel(f);
    labelButton($('[data-level-prev]', levelChip), S.prevLevel);
    labelButton($('[data-level-next]', levelChip), S.nextLevel);
    labelButton($('[data-level-clear]', levelChip), S.showAll);
    $$('button', levelChip).forEach((b) => b.removeAttribute('data-tooltip'));
  }
  $('[data-level-prev]', levelChip)?.addEventListener('click', () => engine?.selectStep(-1));
  $('[data-level-next]', levelChip)?.addEventListener('click', () => engine?.selectStep(1));
  $('[data-level-clear]', levelChip)?.addEventListener('click', () => engine?.select(-1));

  /* ============================================================ insets (keep the model centred in the free area) */
  function updateInsets() {
    if (!engine) return;
    const vr = viewport.getBoundingClientRect();
    if (!vr.width) return;
    const ins = { left: 0, right: 0, top: 0, bottom: 0 };
    const headerH = immersive ? 0 : parseFloat(getComputedStyle(root).getPropertyValue('--studio-top')) || 72;
    ins.top = Math.min(vr.height * 0.25, headerH);
    if (isDesktopLayout()) {
      const els = [side];
      if (!collapsed) els.push(panel);
      els.forEach((el) => {
        if (!el || el.hidden) return;
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        const mid = r.left + r.width / 2 - vr.left;
        if (mid < vr.width / 2) ins.left = Math.max(ins.left, r.right - vr.left + 16);
        else ins.right = Math.max(ins.right, vr.right - r.left + 16);
      });
      const rr = rail && !rail.hidden ? rail.getBoundingClientRect() : null;
      if (rr && rr.height) ins.bottom = Math.max(0, vr.bottom - rr.top + 8);
      const maxSide = vr.width * 0.3;
      ins.left = Math.min(ins.left, maxSide);
      ins.right = Math.min(ins.right, maxSide);
    }
    lastInsets = ins;
    engine.setInsets(ins);
  }
  const onResize = debounce(updateInsets, 120);
  window.addEventListener('resize', onResize);
  new ResizeObserver(onResize).observe(root);

  /* ============================================================ engine events */
  if (engine) {
    engine.on('progress', ({ value }) => { if (!rebuilding) setProgress(value); });
    engine.on('change', (st) => { engineState = st; syncControls(st); syncRail(); });
    engine.on('load', ({ hotspots: hs }) => {
      buildHotspots(mode === 'build' ? [] : hs);
      selectedFloor = null; hoverFloor = null; renderLevel();
      if (!rebuilding) markView('aerial');
    });
    engine.on('frame', ({ hotspots: list }) => { if (list.length) positionHotspots(list); });
    engine.on('hover', ({ floor }) => { hoverFloor = floor; renderLevel(); });
    engine.on('select', ({ floor }) => {
      selectedFloor = floor;
      renderLevel();
      if (floor) announce(fmt(t(S.levelSelected), { label: floorLabel(floor) }));
    });
    engine.on('interact', () => {
      viewTouched = true;
      hint?.classList.add('is-hidden');
      markView('');
    });
    engine.on('contextlost', () => {
      const p = $('.studio-card__text', errorEl);
      if (p) { p.removeAttribute('data-ar'); p.textContent = t(S.contextLost); }
      showError(true);
    });
  }

  /* ============================================================ thumbnails (idle, sequential) */
  let thumbsQueued = false;
  function queueThumbnails() {
    if (!engine || thumbsQueued || engine.lowPower) return; // keep software renderers responsive (icons stay)
    if (navigator.connection?.saveData) return;
    thumbsQueued = true;
    const ids = entries.map((e) => e.id).filter((id) => !store.get(THUMB_KEY(id), 'session'));
    let tries = 0;
    const idle = (fn, ms) => setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2500 }) : fn()), ms);
    const step = () => {
      if (!ids.length || tries > 40) return;
      const id = ids[0];
      if (status[id] === 'error' || engineState?.loading || building || document.hidden) {
        if (status[id] === 'error') ids.shift();
        tries++;
        idle(step, 1500);
        return;
      }
      engine.renderThumbnail(id, { w: 320, h: 200 }).then((url) => {
        if (url) { setThumb(id, url); ids.shift(); } else tries++;
        idle(step, 700);
      }).catch(() => {
        if (status[id] !== 'ok') { status[id] = 'error'; syncRail(); }
        ids.shift();
        idle(step, 700);
      });
    };
    idle(step, 1600);
  }

  /* ============================================================ projects list sync hook */
  let updateProjects = () => {};
  function setProjectsUpdater(fn) { updateProjects = fn; }

  /* ============================================================ language */
  function relocalize() {
    renderRail();
    renderInfo(current);
    renderToolbarLabels();
    renderLevel();
    renderHint();
    labelHotspots();
    labelCanvas();
    if (openHot) { renderHotcard(); placeHotcard(); }
    if (!loader.classList.contains('is-hidden') && engine) { loaderLabel.textContent = t(S.loading); loaderName.textContent = nameOf(shown || current); }
    if (!engine) showFallbackImage(current);
    requestAnimationFrame(updateInsets);
  }
  onLang(relocalize);

  /* ============================================================ boot */
  renderRail();
  renderInfo(current);
  renderMode();
  renderToolbarLabels();
  renderHint();
  if (engine) {
    loaderName.textContent = nameOf(mode === 'build' ? BUILDER : current);
    if (mode === 'build') { onModelChange(BUILDER, { push: false, mode }); loadBuilder(); }
    else go(current, { push: false, autoFallback: !deepLinked, force: true });
  } else {
    showFallbackImage(current);
    onModelChange(current, { push: false, mode });
    fireReady(false);
  }
  requestAnimationFrame(updateInsets);

  return {
    go,
    setMode,
    get mode() { return mode; },
    get current() { return current; },
    get builder() { return builder; },
    nextModelId,
    reset,
    toggleFullscreen,
    togglePanel,
    screenshot,
    closeHotcard,
    setProjectsUpdater,
    isImmersive: () => immersive,
    hasHotcard: () => !!openHot,
    exitImmersive: () => toggleFullscreen(),
    get state() { return engineState; },
  };
}
