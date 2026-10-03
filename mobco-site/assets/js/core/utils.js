// MOBCO core/utils.js — tiny, dependency-free helpers shared by every module.
// Foundation-owned. Import from page modules: import { $, $$, picture } from '../core/utils.js';

/** querySelector shorthand. */
export const $ = (sel, root = document) => root.querySelector(sel);
/** querySelectorAll → real Array. */
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, t) => a + (b - a) * t;
/** Map v from [inMin,inMax] to [outMin,outMax] (unclamped). */
export const mapRange = (v, inMin, inMax, outMin, outMax) => outMin + ((v - inMin) * (outMax - outMin)) / (inMax - inMin);

export function debounce(fn, wait = 150) {
  let t;
  return function debounced(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}
export function throttle(fn, wait = 100) {
  let last = 0, t;
  return function throttled(...args) {
    const now = Date.now();
    const remaining = wait - (now - last);
    clearTimeout(t);
    if (remaining <= 0) { last = now; fn.apply(this, args); }
    else t = setTimeout(() => { last = Date.now(); fn.apply(this, args); }, remaining);
  };
}
/** requestAnimationFrame-throttled callback (max once per frame). */
export function rafThrottle(fn) {
  let queued = false, lastArgs;
  return (...args) => {
    lastArgs = args;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; fn(...lastArgs); });
  };
}

const params = new URLSearchParams(location.search);
/** ?qa=1 → deterministic mode for screenshots (no preloader/transitions/animations). */
export const isQA = () => params.get('qa') === '1' || document.documentElement.classList.contains('qa');
export const prefersReducedMotion = () =>
  isQA() || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
export const isTouch = () =>
  (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
export const hasFinePointer = () => typeof matchMedia === 'function' && matchMedia('(pointer: fine) and (hover: hover)').matches;
export const isRTL = () => document.documentElement.dir === 'rtl';
export const getParam = (name) => params.get(name);

/** Escape a string for safe insertion into HTML text or attribute values. */
export function escapeHTML(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
export const esc = escapeHTML;

/**
 * Locale-aware number formatting. formatNumber(10000) → "10,000".
 * opts.native = true with lang 'ar' → Arabic-Indic digits (١٠٬٠٠٠).
 */
export function formatNumber(n, { lang, native = false, decimals = 0 } = {}) {
  const l = lang || document.documentElement.lang || 'en';
  const locale = l === 'ar' && native ? 'ar-SA' : 'en-US';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(n);
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

let uidCounter = 0;
/** Unique id with prefix (for aria-controls etc.). */
export const uid = (prefix = 'm') => `${prefix}-${++uidCounter}-${Math.random().toString(36).slice(2, 7)}`;

/** Create an element from an HTML string (first element). */
export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/** Inline SVG icon markup from the sprite. icon('arrow-right', 'icon--dir') */
export function icon(name, cls = '') {
  return `<svg class="icon ${cls}" aria-hidden="true" focusable="false"><use href="assets/icons/sprite.svg#${name}"></use></svg>`;
}

/** Photo library (BRIEF §1). Intrinsic sizes → width/height attributes (no layout shift). */
export const IMAGES = {
  'aerial-compound': { w: 1560, h: 849 },
  'aerial-compound-portrait': { w: 996, h: 912 },
  'aerial-panorama': { w: 2000, h: 233 },
  campus: { w: 999, h: 863 },
  'ksa-landmark': { w: 790, h: 710 },
  eastmain: { w: 790, h: 710 },
  'victoria-101': { w: 790, h: 710 },
};

/**
 * <picture> markup (webp + jpg fallback) for a photo base name in assets/img/.
 * picture('eastmain', { alt: 'Eastmain', loading: 'eager', className: 'x', imgClass: 'y',
 *                       position: '30% 50%', sizes: '100vw', fetchpriority: 'high', altAr: 'إيست مين' })
 * thumb: true → 480px-wide version from assets/img/thumbs/ (all photos except aerial-panorama).
 */
export function picture(base, opts = {}) {
  const {
    alt = '', loading = 'lazy', className = '', imgClass = '', position = '', sizes = '',
    fetchpriority = '', width, height, altAr, thumb = false,
  } = opts;
  const meta = IMAGES[base] || {};
  const w = width || (thumb ? 480 : meta.w) || '';
  const ht = height || (thumb && meta.w ? Math.round((480 * meta.h) / meta.w) : meta.h) || '';
  const dir = thumb ? 'assets/img/thumbs' : 'assets/img';
  const style = position ? ` style="object-position:${esc(position)}"` : '';
  return `<picture${className ? ` class="${esc(className)}"` : ''}>` +
    `<source type="image/webp" srcset="${dir}/${base}.webp"${sizes ? ` sizes="${esc(sizes)}"` : ''}>` +
    `<img src="${dir}/${base}.jpg" alt="${esc(alt)}"${altAr ? ` data-ar-alt="${esc(altAr)}"` : ''}` +
    `${w ? ` width="${w}"` : ''}${ht ? ` height="${ht}"` : ''} loading="${loading}" decoding="async"` +
    `${fetchpriority ? ` fetchpriority="${fetchpriority}"` : ''}${imgClass ? ` class="${esc(imgClass)}"` : ''}${style}>` +
    `</picture>`;
}

/** Wait n ms. */
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** Resolve on next animation frame (x2 for style flush). */
export const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

/** Focusable descendants (visible). */
export function focusables(root) {
  return $$(
    'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]',
    root,
  ).filter((el) => el.offsetParent !== null || el === document.activeElement || getComputedStyle(el).position === 'fixed');
}

/**
 * Trap Tab focus inside `root`. Returns a release() function.
 */
export function trapFocus(root) {
  const onKey = (e) => {
    if (e.key !== 'Tab') return;
    const items = focusables(root);
    if (!items.length) { e.preventDefault(); return; }
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', onKey, true);
  return () => document.removeEventListener('keydown', onKey, true);
}

/** Storage helpers that never throw (private mode etc.). */
export const store = {
  get(key, area = 'local') { try { return (area === 'session' ? sessionStorage : localStorage).getItem(key); } catch { return null; } },
  set(key, val, area = 'local') { try { (area === 'session' ? sessionStorage : localStorage).setItem(key, val); } catch { /* ignore */ } },
  remove(key, area = 'local') { try { (area === 'session' ? sessionStorage : localStorage).removeItem(key); } catch { /* ignore */ } },
};

/** Run fn once DOM is parsed. */
export function onReady(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
  else fn();
}

/** Normalise text for search: lowercase, strip Latin accents & Arabic diacritics, unify alef/ya/ta-marbuta. */
export function normalize(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .trim();
}
