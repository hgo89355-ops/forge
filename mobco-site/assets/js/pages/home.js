// assets/js/pages/home.js: HOME page, part A behaviours.
//   initHero()  zoomable photo of the real Eastmain building, with depth tilt (home-hero.js)
//   initSteps()   "We plan. We build. We manage.": the three lines are tabs; the photo crossfades with the step
// Core modules are singletons initialised by core/main.js (loaded first). Part B lives in home-b.js.

import { $, $$, hasFinePointer } from '../core/utils.js';
import { initHero } from './home-hero.js';

/* =========================================================================
   04 · WE PLAN. WE BUILD. WE MANAGE.
   Tabs pattern (roles added here so the no-JS page simply lists every step). Hover previews on fine pointers.
   ========================================================================= */
function initSteps() {
  const sec = $('[data-ha-steps]');
  if (!sec) return;
  const list = $('[data-ha-tabs]', sec);
  const tabs = $$('[data-ha-tab]', sec);
  const panels = $$('[data-ha-panel]', sec);
  const photos = $$('[data-ha-photo]', sec);
  if (!list || !tabs.length) return;
  let active = 0;

  list.setAttribute('role', 'tablist');
  list.setAttribute('aria-labelledby', 'ha-steps-title');
  tabs.forEach((tab, i) => {
    tab.setAttribute('role', 'tab');
    panels[i]?.setAttribute('role', 'tabpanel');
    panels[i]?.setAttribute('tabindex', '0');
  });
  sec.classList.add('is-tabs');

  function select(i, { focus = false } = {}) {
    active = (i + tabs.length) % tabs.length;
    tabs.forEach((tab, k) => {
      const on = k === active;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      tab.classList.toggle('is-active', on);
    });
    panels.forEach((p, k) => { p.hidden = k !== active; p.classList.toggle('is-active', k === active); });
    photos.forEach((p, k) => p.classList.toggle('is-active', k === active));
    if (focus) tabs[active].focus();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i));
    if (hasFinePointer()) tab.addEventListener('pointerenter', () => { if (i !== active) select(i); });
  });
  list.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowLeft' || k === 'Home' || k === 'End') {
      e.preventDefault();
      if (k === 'Home') select(0, { focus: true });
      else if (k === 'End') select(tabs.length - 1, { focus: true });
      else {
        const rtl = document.documentElement.dir === 'rtl';
        const fwd = k === 'ArrowDown' || (k === 'ArrowRight' && !rtl) || (k === 'ArrowLeft' && rtl);
        select(active + (fwd ? 1 : -1), { focus: true });
      }
    }
  });
  // warm the other photos once the section is near, so the crossfade never waits on the network
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      photos.forEach((p) => { const img = $('img', p); if (img) img.loading = 'eager'; });
      io.disconnect();
    }, { rootMargin: '600px 0px' });
    io.observe(sec);
  }
  select(0);
}

/* ========================================================================= */
for (const [name, fn] of [['hero', initHero], ['steps', initSteps]]) {
  try { fn(); } catch (err) { console.error(`[home] ${name} failed to initialise`, err); }
}
