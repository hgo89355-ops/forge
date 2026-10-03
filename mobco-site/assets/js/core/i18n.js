// MOBCO core/i18n.js — attribute-based EN/AR switching with full RTL.
//
// Markup carries English. Arabic lives in attributes:
//   data-ar             → textContent        (element must contain text only — wrap text in a <span> next to icons)
//   data-ar-html        → innerHTML          (trusted, authored markup only)
//   data-ar-placeholder → placeholder attr
//   data-ar-aria-label  → aria-label attr
//   data-ar-title       → title attr; on <title> it sets document.title
//   data-ar-alt         → alt attr
//   data-ar-content     → content attr (<meta name="description">, og:*)
//   data-ar-value       → value attr (input[type=submit|button])
//
// API: getLang(), setLang(lang), toggleLang(), t({en, ar}), onLang(cb) → unsubscribe, localize(root), isRTL()
// Event: document 'langchange' { detail: { lang, dir } }

import { store, getParam } from './utils.js';

const KEY = 'mobco-lang';
const SUPPORTED = ['en', 'ar'];
const ATTRS = [
  ['data-ar-placeholder', 'placeholder'],
  ['data-ar-aria-label', 'aria-label'],
  ['data-ar-title', 'title'],
  ['data-ar-alt', 'alt'],
  ['data-ar-content', 'content'],
  ['data-ar-value', 'value'],
];
const SELECTOR = '[data-ar],[data-ar-html],' + ATTRS.map(([a]) => `[${a}]`).join(',');
const originals = new WeakMap();
let current = 'en';
let initialized = false;

function detect() {
  const fromUrl = getParam('lang');
  if (SUPPORTED.includes(fromUrl)) return fromUrl;
  const saved = store.get(KEY);
  if (SUPPORTED.includes(saved)) return saved;
  const htmlLang = (document.documentElement.getAttribute('lang') || 'en').slice(0, 2);
  return SUPPORTED.includes(htmlLang) ? htmlLang : 'en';
}

function remember(el) {
  let o = originals.get(el);
  if (o) return o;
  o = {};
  if (el.hasAttribute('data-ar')) o.text = el.tagName === 'TITLE' ? document.title : el.textContent;
  if (el.hasAttribute('data-ar-html')) o.html = el.innerHTML;
  for (const [src, attr] of ATTRS) {
    if (el.hasAttribute(src)) o[attr] = el.tagName === 'TITLE' && attr === 'title' ? document.title : el.getAttribute(attr);
  }
  originals.set(el, o);
  return o;
}

function applyEl(el, lang) {
  const o = remember(el);
  const ar = lang === 'ar';
  if ('text' in o) {
    const v = ar ? el.getAttribute('data-ar') : o.text;
    if (el.tagName === 'TITLE') document.title = v;
    else if (el.textContent !== v) el.textContent = v;
  }
  if ('html' in o) {
    const v = ar ? el.getAttribute('data-ar-html') : o.html;
    if (el.innerHTML !== v) el.innerHTML = v;
  }
  for (const [src, attr] of ATTRS) {
    if (!(attr in o)) continue;
    const v = ar ? el.getAttribute(src) : o[attr];
    if (el.tagName === 'TITLE' && attr === 'title') { document.title = v; continue; }
    if (v == null) el.removeAttribute(attr);
    else if (attr === 'value' && 'value' in el) el.value = v;
    else el.setAttribute(attr, v);
  }
}

/** Apply the current language to `root` and its descendants (use after inserting markup with data-ar*). */
export function localize(root = document, lang = current) {
  if (root.nodeType === 1 && root.matches?.(SELECTOR)) applyEl(root, lang);
  // (document scope also covers <title data-ar-title> and <meta data-ar-content> in <head>)
  root.querySelectorAll?.(SELECTOR).forEach((el) => applyEl(el, lang));
}

function setDocumentLang(lang) {
  const html = document.documentElement;
  html.lang = lang;
  html.dir = lang === 'ar' ? 'rtl' : 'ltr';
  html.classList.toggle('is-ar', lang === 'ar');
  html.classList.remove('i18n-pending');
  document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
    btn.setAttribute('aria-label', lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
    btn.setAttribute('lang', lang === 'ar' ? 'en' : 'ar');
  });
}

function syncUrl(lang) {
  try {
    const url = new URL(location.href);
    if (url.searchParams.has('lang')) {
      url.searchParams.set('lang', lang);
      history.replaceState(history.state, '', url);
    }
  } catch { /* ignore */ }
}

/** Current language: 'en' | 'ar'. */
export const getLang = () => current;
export const isRTL = () => current === 'ar';
export const getDir = () => (current === 'ar' ? 'rtl' : 'ltr');

/** Pick the right string from a bilingual object. t({en:'Hello', ar:'مرحبا'}) — strings pass through. */
export function t(obj, lang = current) {
  if (obj == null) return '';
  if (typeof obj === 'string' || typeof obj === 'number') return String(obj);
  return obj[lang] ?? obj.en ?? '';
}

/** Switch language, persist, update <html lang dir>, swap all strings, dispatch 'langchange'. */
export function setLang(lang, { persist = true, silent = false } = {}) {
  if (!SUPPORTED.includes(lang)) return;
  const changed = lang !== current;
  current = lang;
  if (persist) store.set(KEY, lang);
  setDocumentLang(lang);
  localize(document, lang);
  syncUrl(lang);
  if ((changed || !initialized) && !silent) {
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang, dir: getDir() } }));
  }
}

export const toggleLang = () => setLang(current === 'ar' ? 'en' : 'ar');

/** Subscribe to language changes. cb(lang, dir). Returns an unsubscribe function. */
export function onLang(cb) {
  const handler = (e) => cb(e.detail.lang, e.detail.dir);
  document.addEventListener('langchange', handler);
  return () => document.removeEventListener('langchange', handler);
}

/** Initialise once (main.js calls this first). */
export function initI18n() {
  if (initialized) return current;
  const lang = detect();
  current = lang;
  // capture English originals before any swap
  document.querySelectorAll(SELECTOR).forEach(remember);
  if (lang === 'ar') { setDocumentLang('ar'); localize(document, 'ar'); }
  else setDocumentLang('en');
  if (getParam('lang') && SUPPORTED.includes(getParam('lang'))) store.set(KEY, lang);
  // Language toggles anywhere on the page
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lang-toggle]');
    if (!btn) return;
    e.preventDefault();
    const target = btn.getAttribute('data-lang-toggle');
    setLang(SUPPORTED.includes(target) ? target : current === 'ar' ? 'en' : 'ar');
  });
  initialized = true;
  return current;
}
