// MOBCO core/transitions.js — page-transition curtain.
// Leaving: same-origin link clicks drop a navy curtain, then navigate. Entering: the inline <head> script adds
// html.is-entering when the previous page set the session flag; CSS slides the cover away (no JS needed).
// Skipped for: modifier clicks, target≠_self, download, hash-only/same-page links, mailto/tel, [data-no-transition],
// reduced motion and ?qa=1.

import { LOGO } from '../data/logo-data.js';
import { store, prefersReducedMotion } from './utils.js';

let initialized = false;
const FLAG = 'mobco-transition';

function shouldHandle(e, a) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  if (!a || !a.href || a.hasAttribute('download') || a.hasAttribute('data-no-transition') || a.hasAttribute('data-lightbox')) return false;
  const target = a.getAttribute('target');
  if (target && target !== '_self') return false;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return false;
  if (url.pathname === location.pathname && url.search === location.search) return false; // hash or same page
  if (/\.(jpe?g|png|webp|svg|pdf|zip|docx?|pptx?)$/i.test(url.pathname)) return false;
  return true;
}

export function initTransitions() {
  if (initialized) return;
  initialized = true;
  const html = document.documentElement;
  if (html.classList.contains('is-entering')) setTimeout(() => html.classList.remove('is-entering'), 1100);
  if (prefersReducedMotion()) return;

  let curtain;
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href]');
    if (!shouldHandle(e, a)) return;
    e.preventDefault();
    const href = a.href;
    if (!curtain) {
      curtain = document.createElement('div');
      curtain.className = 'page-curtain';
      curtain.setAttribute('aria-hidden', 'true');
      curtain.innerHTML = `<svg viewBox="${LOGO.markViewBox}" fill="currentColor"><path d="${LOGO.mark}"/></svg>`;
      document.body.appendChild(curtain);
    }
    void curtain.offsetWidth;
    curtain.classList.add('is-active');
    store.set(FLAG, '1', 'session');
    setTimeout(() => { location.href = href; }, 520);
  });
  // back/forward cache: never leave a curtain up
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && curtain) curtain.classList.remove('is-active');
    html.classList.remove('is-entering');
  });
}
