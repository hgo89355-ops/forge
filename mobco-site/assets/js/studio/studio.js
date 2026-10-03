// MOBCO 3D Studio — studio.js (page entry for studio.html)
// Boots the engine (or the no-WebGL fallback), the studio UI, ?model= deep links + history sync,
// global keyboard shortcuts, the "How to use" try-it buttons and the "From model to project" list.

import { t, onLang } from '../core/i18n.js';
import { scan, scrollTo } from '../core/motion.js';
import { scanUI } from '../core/ui.js';
import { $, $$, esc, icon, picture, getParam, prefersReducedMotion, wait } from '../core/utils.js';
import { projectUrl } from '../data/site-data.js';
import { createStudio, hasWebGL } from './engine.js';
import { createStudioUI } from './ui.js';
import { libraryEntries, DEV_MODEL } from './registry.js';
import { S } from './strings.js';

const root = $('[data-studio]');

function boot() {
  if (!root) return;
  const requested = getParam('model');
  const dev = getParam('dev') === '1' || requested === DEV_MODEL;
  const entries = libraryEntries({ dev });
  const deepLinked = !!requested && entries.some((e) => e.id === requested);
  const initialId = deepLinked ? requested : entries[0].id;

  /* ---------------------------------------------------------------- engine (or fallback) */
  let engine = null;
  if (hasWebGL()) {
    try {
      engine = createStudio($('[data-studio-canvas]', root), {
        controls: true,
        ui: true,
        autoRotate: false,
        reducedMotion: prefersReducedMotion(),
      });
    } catch (err) {
      console.warn('[studio] WebGL engine unavailable, showing the image fallback.', err?.message || err);
      engine = null;
    }
  }

  /* ---------------------------------------------------------------- URL sync */
  let firstSync = true;
  function onModelChange(id, { push }) {
    const url = new URL(location.href);
    const same = url.searchParams.get('model') === id;
    if (firstSync && !deepLinked) { firstSync = false; if (id === entries[0].id) return; }
    firstSync = false;
    if (same) return;
    url.searchParams.set('model', id);
    try {
      if (push) history.pushState({ studioModel: id }, '', url);
      else history.replaceState({ studioModel: id }, '', url);
    } catch { /* file:// or sandboxed */ }
  }

  const ui = createStudioUI({ root, engine, entries, initialId, deepLinked, onModelChange });

  window.addEventListener('popstate', () => {
    const id = new URL(location.href).searchParams.get('model') || entries[0].id;
    if (entries.some((e) => e.id === id) && id !== ui.current) ui.go(id, { push: false });
  });

  /* ---------------------------------------------------------------- keyboard shortcuts */
  let stageVisible = true;
  new IntersectionObserver((es) => { stageVisible = es.some((e) => e.intersectionRatio > 0.25); }, { threshold: [0, 0.25, 0.5] }).observe(root);
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const el = e.target;
    const typing = el && (el.isContentEditable || /^(TEXTAREA|SELECT)$/.test(el.tagName) || (el.tagName === 'INPUT' && !/^(range|checkbox|radio|button)$/.test(el.type)));
    if (typing) return;
    const html = document.documentElement;
    if (e.key === 'Escape') {
      if (ui.hasHotcard()) { ui.closeHotcard(true); return; }
      if (engine && ui.state?.selected >= 0) { engine.select(-1); return; }
      if (ui.isImmersive() && !document.fullscreenElement) { ui.toggleFullscreen(); }
      return;
    }
    if (html.classList.contains('is-locked') || html.classList.contains('search-open') || html.classList.contains('nav-open')) return;
    if (!stageVisible && !ui.isImmersive()) return;
    const k = e.key;
    if (/^[1-9]$/.test(k)) {
      const entry = entries[+k - 1];
      if (entry) { e.preventDefault(); ui.go(entry.id); }
      return;
    }
    if (k === '?') { e.preventDefault(); ui.openHelp(); return; }
    if (!engine) return;
    switch (k.toLowerCase()) {
      case 'r': e.preventDefault(); ui.reset(); break;
      case 'a': e.preventDefault(); engine.setAutoRotate(!engine.getState().autoRotate); break;
      case 'e': e.preventDefault(); engine.setExplode(engine.getState().explode > 0.05 ? 0 : 0.65); break;
      case 'b': e.preventDefault(); engine.setMode(engine.getState().mode === 'blueprint' ? 'realistic' : 'blueprint'); break;
      case 'f': e.preventDefault(); ui.toggleFullscreen(); break;
      default: break;
    }
  });

  /* ---------------------------------------------------------------- help buttons outside the toolbar */
  $$('[data-action="help"]').forEach((b) => { if (!b.closest('[data-studio-toolbar]')) b.addEventListener('click', () => ui.openHelp(b)); });

  /* ---------------------------------------------------------------- "Try it" (guide cards) */
  async function backToStage() {
    scrollTo(root, { offset: 0, immediate: prefersReducedMotion() });
    await wait(prefersReducedMotion() ? 50 : 900);
  }
  $$('[data-try]').forEach((b) => b.addEventListener('click', async () => {
    await backToStage();
    if (!engine) return;
    const what = b.dataset.try;
    if (what === 'views') engine.setView('street');
    else if (what === 'explode') engine.setExplode(0.7);
    else if (what === 'night') { engine.setMode('realistic'); engine.setTime(20.5); }
    else if (what === 'blueprint') engine.setMode('blueprint');
    engine.canvas.focus({ preventScroll: true });
  }));

  /* ---------------------------------------------------------------- From model to project */
  const list = $('[data-studio-projects]');
  function renderProjects() {
    if (!list) return;
    list.innerHTML = entries.filter((e) => e.project).map((e) => {
      const p = e.project;
      const meta = [t(p.typology), p.location ? t(p.location) : null].filter(Boolean).join(' · ');
      return `<li class="studio-proj${e.id === ui.current ? ' is-current' : ''}" data-proj="${esc(e.id)}">
        <div class="studio-proj__media">
          ${picture(p.image, { alt: t(p.name), thumb: true, position: p.pos })}
          <span class="badge badge--glass studio-proj__badge">${esc(t(S.illustrativeShort))}</span>
        </div>
        <div class="studio-proj__body">
          <span class="studio-proj__num num-ltr">${String(e.index).padStart(2, '0')}</span>
          <h3 class="studio-proj__name">${esc(t(p.name))}</h3>
          <p class="studio-proj__meta">${esc(meta)}</p>
          <div class="studio-proj__actions">
            <button class="btn btn--dark btn--sm" type="button" data-open-model="${esc(e.id)}">${icon('rotate-3d')}<span>${esc(t(S.openInStudio))}</span></button>
            <a class="link-arrow" href="${esc(projectUrl(p))}"><span>${esc(t(S.seeProject))}</span><span class="link-arrow__icon">${icon('arrow-right', 'icon--dir')}</span></a>
          </div>
        </div>
      </li>`;
    }).join('');
    scanUI(list);
    scan(list);
  }
  function markCurrentProject() {
    $$('[data-proj]', list).forEach((li) => li.classList.toggle('is-current', li.dataset.proj === ui.current));
  }
  list?.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-open-model]');
    if (!b) return;
    ui.go(b.dataset.openModel);
    await backToStage();
  });
  renderProjects();
  ui.setProjectsUpdater(markCurrentProject);
  onLang(renderProjects);

  // debug / QA handle (read-only)
  window.MOBCO_STUDIO = Object.freeze({ engine, ui, entries });
}

try { boot(); } catch (err) { console.error('[studio] boot failed', err); }
