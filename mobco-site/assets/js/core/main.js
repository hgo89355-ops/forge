// MOBCO core/main.js — entry point loaded on every page (after the deferred GSAP/ScrollTrigger/Lenis UMDs).
// Order matters: i18n first (so text is final before splitting), then preloader, motion, chrome, widgets.
// Every init is idempotent; a failure in one module never blocks the others.

import { initI18n, setLang, getLang, t } from './i18n.js';
import { initPreloader } from './preloader.js';
import { initMotion, scan, refresh } from './motion.js';
import { initHeader } from './header.js';
import { initUI, toast, openLightbox, openModal } from './ui.js';
import { initSearch, openSearch } from './search.js';
import { initCursor } from './cursor.js';
import { initTransitions } from './transitions.js';
import { initConsent } from './consent.js';

const html = document.documentElement;
html.classList.add('js');
html.classList.remove('no-js');

const steps = [
  ['i18n', initI18n],
  ['preloader', initPreloader],
  ['motion', initMotion],
  ['header', initHeader],
  ['ui', initUI],
  ['search', initSearch],
  ['cursor', initCursor],
  ['transitions', initTransitions],
  ['consent', initConsent],
];
for (const [name, fn] of steps) {
  try { fn(); } catch (err) { console.error(`[mobco] ${name} failed to initialise`, err); }
}
html.classList.add('is-ready');

// Small debug/QA handle (not an API for pages — import the modules instead).
window.MOBCO = Object.freeze({ setLang, getLang, t, toast, openLightbox, openModal, openSearch, scan, refresh });
