// MOBCO 3D Studio — ui.js
// Binds the studio page markup (studio.html) to the engine: model library rail with runtime thumbnails,
// info panel, controls panel, toolbar (screenshot / full screen / reset / help), projected hotspots and
// their cards, level chip, loader, error + no-WebGL states, hints, wheel-zoom engagement, view insets.
// Fully bilingual: every string comes from strings.js through t() and is re-rendered on 'langchange'.

import { t, getLang, onLang } from '../core/i18n.js';
import { scan, stopScroll, startScroll } from '../core/motion.js';
import { toast, openModal } from '../core/ui.js';
import { $, $$, esc, icon, store, isTouch, hasFinePointer, prefersReducedMotion, debounce } from '../core/utils.js';
import { projectUrl } from '../data/site-data.js';
import { S, fmt } from './strings.js';
import { modelIcon, projectFor } from './registry.js';
import { DEFAULT_HOUR } from './environment.js';

const pad = (n) => String(n).padStart(2, '0');
const THUMB_KEY = (id) => `mobco-studio-thumb-v1:${id}`;

export function createStudioUI({ root, engine, entries, initialId, deepLinked = false, onModelChange = () => {} }) {
  const viewport = $('[data-studio-viewport]', root);
  const canvasHost = $('[data-studio-canvas]', root);
  const loader = $('[data-studio-loader]', root);
  const errorEl = $('[data-studio-error]', root);
  const fallbackEl = $('[data-studio-fallback]', root);
  const hotLayer = $('[data-studio-hotspots]', root);
  const levelChip = $('[data-studio-level]', root);
  const hint = $('[data-studio-hint]', root);
  const hintText = $('[data-studio-hint-text]', root);
  const live = $('[data-studio-live]', root);
  const infoBody = $('[data-studio-info-body]', root);
  const panel = $('[data-studio-panel]', root);
  const railList = $('[data-rail-list]', root);
  const toolbar = $('[data-studio-toolbar]', root);
  const info = $('[data-studio-info]', root);
  const poster = $('[data-studio-poster-img]', root);

  const metas = {};            // id → normalized meta (after a successful load)
  const status = {};           // id → 'ok' | 'error'
  let current = initialId;
  let shown = null;            // id currently displayed by the engine
  let readyFired = false;
  let loadSeq = 0;
  let engineState = engine ? engine.getState() : null;
  let hotspots = [];           // [{id, title, text, el}]
  let openHot = null;          // hotspot id with an open card
  let hotcard = null;
  let lastFrameHot = [];
  let hoverFloor = null, selectedFloor = null;
  let immersive = false;
  let collapsed = false;
  let engaged = false;
  let syncing = false;
  let lastInsets = { left: 0, right: 0, top: 0, bottom: 0 }; // canvas px covered by the floating panels

  const reduced = prefersReducedMotion() || !!engine?.lowPower;
  if (engine?.lowPower) root.classList.add('is-lowpower'); // CPU rasteriser: skip UI fades as well
  const touchOnly = isTouch() && !hasFinePointer();

  /* ============================================================ helpers */
  const entryOf = (id) => entries.find((e) => e.id === id) || null;
  // The project name (site-data.js) is the public title; the module's own name is used only without a project.
  const nameOf = (id) => { const e = entryOf(id); return t(e?.project ? e.name : metas[id]?.name || e?.name || id); };
  const announce = (msg) => { if (live) { live.textContent = ''; requestAnimationFrame(() => { live.textContent = msg; }); } };
  const isDesktopLayout = () => matchMedia('(min-width: 1024px)').matches;

  function fireReady(ok) {
    if (readyFired) return;
    readyFired = true;
    root.dataset.ready = 'true';
    window.dispatchEvent(new CustomEvent('studio:ready', { detail: { model: current, ok, webgl: !!engine } }));
  }

  /* ============================================================ rail */
  function renderRail() {
    railScrolledTo = null;
    railList.innerHTML = entries.map((e) => {
      const thumb = store.get(THUMB_KEY(e.id), 'session');
      const name = t(e.name);
      return `<li><button class="studio-rail__item${status[e.id] === 'error' ? ' is-unavailable' : ''}" type="button" data-model="${esc(e.id)}" aria-pressed="${e.id === current}">
        <span class="studio-rail__thumb${thumb ? ' has-img' : ''}">${modelIcon(e.id)}${thumb ? `<img src="${esc(thumb)}" alt="" width="320" height="200" decoding="async">` : ''}</span>
        <span class="studio-rail__meta"><span class="studio-rail__num num-ltr">${pad(e.index)}</span><span class="studio-rail__name">${esc(name)}</span></span>
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
    const delta = br.left + br.width / 2 - (lr.left + lr.width / 2);
    railList.scrollBy({ left: delta, behavior: reduced ? 'auto' : 'smooth' }); // horizontal only: never scrolls the page
  }
  function syncRail() {
    requestAnimationFrame(revealActiveRailItem);
    $$('.studio-rail__item', railList).forEach((b) => {
      const id = b.dataset.model;
      b.setAttribute('aria-pressed', String(id === current));
      b.classList.toggle('is-unavailable', status[id] === 'error');
      b.classList.toggle('is-loading', id === current && engineState?.loading === true);
    });
  }
  function setThumb(id, url) {
    if (!url) return;
    store.set(THUMB_KEY(id), url, 'session');
    const btn = railList.querySelector(`[data-model="${CSS.escape(id)}"]`);
    const box = btn?.querySelector('.studio-rail__thumb');
    if (!box || box.querySelector('img')) return;
    box.insertAdjacentHTML('beforeend', `<img src="${esc(url)}" alt="" width="320" height="200" decoding="async">`);
    box.classList.add('has-img');
  }
  railList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-model]');
    if (btn) go(btn.dataset.model);
  });

  /* ============================================================ info panel */
  function renderInfo(id, { animate = false } = {}) {
    const entry = entryOf(id);
    if (!entry) return;
    const meta = metas[id];
    const project = projectFor(id, meta);
    const name = nameOf(id);
    const tagline = t(meta?.tagline || entry.tagline || '');
    // the "illustrative" disclaimer has its own line below, so a model's own "Model: illustrative…" row is redundant
    let desc = (meta?.descriptors || []).filter((d) => d && d.label && d.value && !/^model$/i.test(String(d.label.en || '').trim()));
    if (!desc.length && project) {
      desc = [
        { label: { en: 'Typology', ar: 'النمط' }, value: project.typology },
        project.location ? { label: { en: 'Location', ar: 'الموقع' }, value: project.location } : null,
      ].filter(Boolean);
    }
    const location = project?.location && meta ? `<p class="studio__loc"><svg class="icon icon--sm" aria-hidden="true" focusable="false"><use href="assets/icons/sprite.svg#map-pin"></use></svg><span>${esc(t(project.location))}</span></p>` : '';
    infoBody.innerHTML = `
      <p class="studio__index num-ltr"><span class="visually-hidden">${esc(fmt(t(S.modelOf), { n: entry.index, total: entries.length }))}</span><span data-info-num aria-hidden="true">${pad(entry.index)}</span><span class="studio__index-sep" aria-hidden="true"></span><span aria-hidden="true">${pad(entries.length)}</span></p>
      <h2 class="studio__name">${esc(name)}</h2>
      ${tagline ? `<p class="studio__tagline">${esc(tagline)}</p>` : ''}
      ${location}
      <dl class="studio__desc">${desc.map((d) => `<div><dt>${esc(t(d.label))}</dt><dd>${esc(t(d.value))}</dd></div>`).join('')}</dl>
      <p class="studio__note">${icon('info', 'icon--sm')}<span>${esc(t(S.illustrative))}</span></p>
      ${project ? `<a class="link-arrow studio__project-link" href="${esc(projectUrl(project))}"><span>${esc(t(S.seeProject))}</span><span class="link-arrow__icon">${icon('arrow-right', 'icon--dir')}</span></a>` : ''}`;
    if (animate && !reduced) { infoBody.classList.remove('is-swapping'); void infoBody.offsetWidth; infoBody.classList.add('is-swapping'); }
    scan(infoBody);
    if (engine) engine.canvas.setAttribute('aria-label', fmt(t(S.canvasLabel), { name }));
    requestAnimationFrame(updateInsets);
  }

  /* ============================================================ loader / states */
  const loaderLabel = $('[data-loader-label]', loader);
  const loaderName = $('[data-loader-name]', loader);
  const loaderBar = $('[data-loader-bar]', loader);
  const loaderPct = $('[data-loader-pct]', loader);
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
  function setProgress(v) {
    loaderBar.style.setProperty('--p', v.toFixed(3));
    loaderPct.textContent = `${Math.round(v * 100)}%`;
  }
  function hideLoader() {
    setProgress(1);
    loaderTimer = setTimeout(() => loader.classList.add('is-hidden'), reduced ? 0 : 220);
  }
  function showError(on) {
    errorEl.hidden = !on;
    if (on) { root.classList.add('has-error'); }
    else root.classList.remove('has-error');
  }

  /* ============================================================ model switching */
  function go(id, { push = true, autoFallback = false } = {}) {
    const entry = entryOf(id);
    if (!entry) return;
    if (id === current && (shown === id || engineState?.loading) && !autoFallback) return;
    current = id;
    closeHotcard();
    renderInfo(id, { animate: true });
    syncRail();
    onModelChange(id, { push });
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
      announce(fmt(t(S.loaded), { name: nameOf(id) }));
      fireReady(true);
      window.dispatchEvent(new CustomEvent('studio:modelchange', { detail: { model: id } }));
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

  $('[data-action="retry"]', errorEl)?.addEventListener('click', () => { showError(false); loadModel(current, { retry: true }); });
  $('[data-action="next-model"]', errorEl)?.addEventListener('click', () => go(nextModelId(1)));

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
    [toolbar, panel, hint].forEach((el) => { if (el) el.hidden = true; });
  }

  /* ============================================================ controls panel */
  const inputs = {
    explode: $('[data-control="explode"]', panel),
    section: $('[data-control="section"]', panel),
    time: $('[data-control="time"]', panel),
    autorotate: $('[data-control="autorotate"]', panel),
    hotspots: $('[data-control="hotspots"]', panel),
  };
  const outputs = {
    explode: $('[data-out="explode"]', panel),
    section: $('[data-out="section"]', panel),
    time: $('[data-out="time"]', panel),
  };
  const timeRange = $('[data-time-range]', panel);
  const timeNote = $('[data-time-note]', panel);
  const timeIcon = $('[data-time-icon] use', panel);
  const isolateBtn = $('[data-action="isolate"]', panel);

  function formatHour(h) {
    const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    const h12 = ((hh + 11) % 12) + 1;
    return `${h12}:${String(mm).padStart(2, '0')} ${t(hh < 12 ? S.am : S.pm)}`;
  }
  function renderOutputs() {
    const ex = +inputs.explode.value;
    outputs.explode.textContent = `${ex}%`;
    const sec = +inputs.section.value;
    outputs.section.textContent = sec >= 100 ? t(S.sectionOff) : fmt(t(S.sectionAt), { n: sec });
    const h = +inputs.time.value;
    outputs.time.textContent = formatHour(h);
    // the raw values (0–100, 6–22 in quarter hours) mean little when read aloud: speak the formatted readouts
    inputs.explode.setAttribute('aria-valuetext', outputs.explode.textContent);
    inputs.section.setAttribute('aria-valuetext', outputs.section.textContent);
    inputs.time.setAttribute('aria-valuetext', outputs.time.textContent);
    // Arabic reads "2:30 م" right-to-left (time first, then the meridiem): no forced LTR run there
    outputs.time.classList.toggle('num-ltr', getLang() !== 'ar');
    timeIcon?.setAttribute('href', `assets/icons/sprite.svg#${h >= 19.25 || h < 6.5 ? 'moon' : h >= 17.5 ? 'sunset' : h < 8 ? 'sunrise' : 'sun'}`);
  }
  function setInput(input, value) {
    if (String(input.value) === String(value)) return;
    syncing = true;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    syncing = false;
  }
  if (engine) {
    inputs.explode.addEventListener('input', () => { renderOutputs(); if (!syncing) engine.setExplode(+inputs.explode.value / 100); });
    inputs.section.addEventListener('input', () => { renderOutputs(); if (!syncing) engine.setSection(+inputs.section.value / 100); });
    inputs.time.addEventListener('input', () => { renderOutputs(); if (!syncing) engine.setTime(+inputs.time.value); });
    inputs.autorotate.addEventListener('change', () => engine.setAutoRotate(inputs.autorotate.checked));
    inputs.hotspots.addEventListener('change', () => { engine.setHotspots(inputs.hotspots.checked); if (!inputs.hotspots.checked) closeHotcard(); renderHotspotVisibility(); });
    $$('[data-view]', panel).forEach((b) => b.addEventListener('click', () => {
      engine.setView(b.dataset.view);
      $$('[data-view]', panel).forEach((x) => x.classList.toggle('is-current', x === b));
    }));
    $$('[data-mode]', panel).forEach((b) => b.addEventListener('click', () => engine.setMode(b.dataset.mode)));
    isolateBtn?.addEventListener('click', () => {
      if (!engineState?.floors) return;
      if (engineState.selected >= 0) engine.select(-1); else engine.select(0);
    });
  }
  renderOutputs();

  function syncControls(st) {
    if (!st) return;
    setInput(inputs.explode, Math.round(st.explode * 100));
    setInput(inputs.section, Math.round(st.section * 100));
    setInput(inputs.time, st.hour);
    inputs.autorotate.checked = !!st.autoRotate;
    inputs.hotspots.checked = !!st.hotspots;
    $$('[data-mode]', panel).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === st.mode)));
    const flat = st.mode === 'blueprint' || st.mode === 'xray';
    inputs.time.disabled = flat;
    timeRange.classList.toggle('is-disabled', flat);
    if (timeNote.hidden !== !flat) { timeNote.hidden = !flat; requestAnimationFrame(syncPanelOverflow); }
    if (isolateBtn) {
      isolateBtn.disabled = !st.floors;
      isolateBtn.setAttribute('aria-pressed', String(st.selected >= 0));
    }
    renderOutputs();
  }

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
    else if (a === 'help') openHelp(b);
    else if (a === 'panel') togglePanel();
  });

  // role="toolbar": arrow keys / Home / End move between the tools (mirrored in RTL)
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

  function openHelp(trigger) { openModal('studio-help', trigger || document.activeElement); }

  function reset() {
    if (!engine) return;
    closeHotcard();
    engine.reset();
    $$('[data-view]', panel).forEach((x) => x.classList.toggle('is-current', x.dataset.view === 'aerial'));
  }

  async function screenshot() {
    if (!engine || !shown) return;
    try {
      const shot = engine.snapshot();
      const ctx = shot.getContext('2d');
      const W = shot.width, H = shot.height;
      const s = Math.max(1, W / 1400);
      const band = Math.round(86 * s);
      const grad = ctx.createLinearGradient(0, H - band * 1.6, 0, H);
      grad.addColorStop(0, 'rgba(11,22,32,0)');
      grad.addColorStop(1, 'rgba(11,22,32,0.82)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, H - band * 1.6, W, band * 1.6);
      const ar = getLang() === 'ar';
      const fam = ar ? '"IBM Plex Sans Arabic", sans-serif' : 'Manrope, Inter, sans-serif';
      ctx.direction = ar ? 'rtl' : 'ltr';
      ctx.textAlign = ar ? 'right' : 'left';
      const x = ar ? W - 32 * s : 32 * s;
      ctx.fillStyle = '#6fd1c5';
      ctx.font = `700 ${Math.round(13 * s)}px ${fam}`;
      ctx.fillText(t(S.screenshotCaption).toUpperCase(), x, H - 56 * s);
      ctx.fillStyle = '#ffffff';
      ctx.font = `600 ${Math.round(22 * s)}px ${fam}`;
      ctx.fillText(nameOf(shown), x, H - 28 * s);
      ctx.textAlign = ar ? 'left' : 'right';
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.font = `500 ${Math.round(13 * s)}px ${fam}`;
      ctx.fillText(t(S.illustrative), ar ? 32 * s : W - 32 * s, H - 28 * s);
      const blob = await new Promise((r) => shot.toBlob(r, 'image/png'));
      if (!blob) throw new Error('toBlob failed');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mobco-studio-${shown}.png`;
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

  /* ============================================================ wheel-zoom engagement & hints */
  function setEngaged(on) {
    engaged = on;
    if (!engine) return;
    engine.setControlsEnabled({ zoom: on || touchOnly });
    engine.canvas.toggleAttribute('data-lenis-prevent-wheel', on);
  }
  let hintTimer = 0, hintMode = 'intro';
  function renderHint() {
    if (!hintText) return;
    hintText.textContent = t(hintMode === 'zoom' ? S.zoomHint : touchOnly ? S.hintTouch : S.hintMouse);
    hint?.classList.toggle('is-warn', hintMode === 'zoom');
  }
  function showHint(mode, ms) {
    if (!hint || !engine) return;
    hintMode = mode;
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
      if (e.target === engine.canvas) showHint('zoom', 2600);
    }, { capture: true, passive: true });
    engine.canvas.addEventListener('keydown', (e) => {
      if (e.key === '+' || e.key === '=') { e.preventDefault(); engine.zoom(0.85); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); engine.zoom(1.18); }
    });
    // double-tap to focus on touch screens
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

  /* ============================================================ hotspots */
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
  function renderHotspotVisibility() {
    const on = inputs.hotspots.checked;
    hotLayer.hidden = !on;
  }
  function positionHotspots(list) {
    lastFrameHot = list;
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
  function toggleHotcard(id) {
    if (openHot === id) { closeHotcard(true); return; }
    openHotcard(id);
  }
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
    hotcard.focus({ preventScroll: true }); // synchronous: a rAF can lag seconds behind on slow GPUs
  }
  function renderHotcard() {
    const h = hotspots.find((x) => x.id === openHot);
    if (!h || !hotcard) return;
    hotcard.innerHTML = `
      <span class="studio-hotcard__num">${esc(fmt(t({ en: 'Point {n}', ar: 'النقطة {n}' }), { n: pad(h.index) }))}</span>
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
    // keep the card inside the canvas area that the floating panels leave free (they stack above it)
    const ins = lastInsets;
    const minX = Math.max(12, ins.left), maxX = Math.min(vw - 12, vw - ins.right) - cw;
    const after = p.x + 26, before = p.x - cw - 26; // physical right / left of the dot
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

  /* ============================================================ level chip */
  const levelNum = $('[data-level-num]', levelChip);
  const levelLabel = $('[data-level-label]', levelChip);
  function floorLabel(f) {
    if (!f) return '';
    return f.label ? t(f.label) : fmt(t(S.levelN), { n: f.level + 1 });
  }
  function renderLevel() {
    const f = selectedFloor || hoverFloor;
    if (!f) { levelChip.hidden = true; return; }
    levelChip.hidden = false;
    const sel = !!selectedFloor;
    levelChip.classList.toggle('is-hover', !sel);
    $$('button', levelChip).forEach((b) => { b.hidden = !sel; });
    levelNum.textContent = fmt(t(S.levelOf), { n: pad(f.index + 1), total: pad(f.count) });
    levelLabel.textContent = floorLabel(f);
    // localized aria labels for chip buttons
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
      const els = [info];
      if (!collapsed) els.push(panel);
      els.forEach((el) => {
        if (!el || el.hidden) return;
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        const mid = r.left + r.width / 2 - vr.left;
        if (mid < vr.width / 2) ins.left = Math.max(ins.left, r.right - vr.left + 16);
        else ins.right = Math.max(ins.right, vr.right - r.left + 16);
      });
      const rail = $('[data-studio-rail]', root);
      const rr = rail?.getBoundingClientRect();
      if (rr && rr.height && !immersive) ins.bottom = Math.max(0, vr.bottom - rr.top + 8);
      else if (immersive && rr && rr.height) ins.bottom = Math.max(0, vr.bottom - rr.top + 8);
      // never squeeze the free area below 40% of the width
      const maxSide = vr.width * 0.3;
      ins.left = Math.min(ins.left, maxSide);
      ins.right = Math.min(ins.right, maxSide);
    }
    lastInsets = ins;
    engine.setInsets(ins);
  }
  // desktop controls panel: fade its lower edge while more controls are hidden below the fold
  function syncPanelOverflow() {
    if (!panel) return;
    const more = isDesktopLayout() && panel.scrollHeight - panel.clientHeight - panel.scrollTop > 4;
    panel.classList.toggle('has-more', more);
  }
  panel?.addEventListener('scroll', syncPanelOverflow, { passive: true });
  const onResize = debounce(() => { updateInsets(); syncPanelOverflow(); }, 120);
  window.addEventListener('resize', onResize);
  new ResizeObserver(onResize).observe(root);

  /* ============================================================ engine events */
  if (engine) {
    engine.on('progress', ({ value }) => setProgress(value));
    engine.on('change', (st) => { engineState = st; syncControls(st); syncRail(); });
    engine.on('load', ({ id, hotspots: hs }) => {
      buildHotspots(hs);
      renderHotspotVisibility();
      selectedFloor = null; hoverFloor = null; renderLevel();
      $$('[data-view]', panel).forEach((x) => x.classList.toggle('is-current', x.dataset.view === 'aerial'));
      if (!engagedOnce) showHint('intro', 7000);
    });
    engine.on('frame', ({ hotspots: list }) => { if (list.length) positionHotspots(list); });
    engine.on('hover', ({ floor }) => { hoverFloor = floor; renderLevel(); });
    engine.on('select', ({ floor }) => {
      selectedFloor = floor;
      renderLevel();
      if (floor) announce(fmt(t(S.levelSelected), { label: floorLabel(floor) }));
    });
    engine.on('interact', () => {
      engagedOnce = true;
      hint?.classList.add('is-hidden');
      $$('[data-view]', panel).forEach((x) => x.classList.remove('is-current'));
    });
    engine.on('contextlost', () => {
      const p = $('.studio-card__text', errorEl);
      if (p) { p.removeAttribute('data-ar'); p.textContent = t(S.contextLost); }
      showError(true);
    });
  }
  let engagedOnce = false;

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
      if (status[id] === 'error' || engineState?.loading || document.hidden) {
        if (status[id] === 'error') ids.shift();
        tries++;
        idle(step, 1500);
        return;
      }
      engine.renderThumbnail(id, { w: 320, h: 200 }).then((url) => {
        if (url) { setThumb(id, url); ids.shift(); } else tries++;
        idle(step, 700);
      }).catch(() => {
        // module missing or failed to build → flag it in the library (a click still retries the load)
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
    renderOutputs();
    renderToolbarLabels();
    renderLevel();
    renderHint();
    labelHotspots();
    if (openHot) { renderHotcard(); placeHotcard(); }
    if (!loader.classList.contains('is-hidden') && engine) { loaderLabel.textContent = t(S.loading); loaderName.textContent = nameOf(current); }
    if (!engine) showFallbackImage(current);
    requestAnimationFrame(() => { updateInsets(); syncPanelOverflow(); });
  }
  onLang(relocalize);

  /* ============================================================ boot */
  renderRail();
  renderInfo(current);
  renderToolbarLabels();
  renderHint();
  if (engine) {
    loaderName.textContent = nameOf(current);
    engine.ready?.then?.(() => {});
    go(current, { push: false, autoFallback: !deepLinked });
  } else {
    showFallbackImage(current);
    onModelChange(current, { push: false });
    fireReady(false);
  }
  requestAnimationFrame(() => { updateInsets(); syncPanelOverflow(); });

  return {
    go,
    get current() { return current; },
    nextModelId,
    reset,
    openHelp,
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
