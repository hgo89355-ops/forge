// MOBCO core/preloader.js — first visit per session only.
// The inline <head> script adds html.preload (a navy cover via CSS) when this is the first page view of the
// session (and not reduced motion / ?qa=1). This module replaces the cover with the animated logo mark
// (stroke draw → fill) and a 000→100 counter, then lifts it (≈1.6s max). If JS fails, CSS removes the
// cover after 3.5s so content is never blocked.
// API: initPreloader(), whenLoaded() → Promise resolved when the preloader is gone (or immediately).

import { LOGO } from '../data/logo-data.js';
import { store, prefersReducedMotion } from './utils.js';

let done;
const ready = new Promise((r) => { done = r; });
let initialized = false;

/** Resolves once the preloader has lifted (immediately if none ran). */
export const whenLoaded = () => ready;

export function initPreloader() {
  if (initialized) return ready;
  initialized = true;
  const html = document.documentElement;
  store.set('mobco-visited', '1', 'session');
  if (!html.classList.contains('preload') || prefersReducedMotion()) {
    html.classList.remove('preload');
    done();
    return ready;
  }
  const el = document.createElement('div');
  el.className = 'preloader';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="preloader__inner">
      <svg class="preloader__mark" viewBox="${LOGO.markViewBox}" xmlns="http://www.w3.org/2000/svg"><path d="${LOGO.mark}"/></svg>
      <div class="preloader__meta">
        <span class="preloader__count">000</span>
        <span class="preloader__bar"><span></span></span>
        <span class="preloader__tag">${html.lang === 'ar' ? 'النزاهة والتميّز' : 'Integrity &amp; Excellence'}</span>
      </div>
    </div>`;
  document.body.appendChild(el);
  const path = el.querySelector('path');
  try { path.style.setProperty('--len', Math.ceil(path.getTotalLength())); } catch { /* ignore */ }
  html.classList.remove('preload');
  html.classList.add('is-preloading');

  const count = el.querySelector('.preloader__count');
  const bar = el.querySelector('.preloader__bar');
  const MIN = 1250, MAX = 1600;
  const t0 = performance.now();
  let loaded = document.readyState === 'complete';
  window.addEventListener('load', () => { loaded = true; }, { once: true });
  const tick = (now) => {
    const elapsed = now - t0;
    // progress eases toward 90% until load fires, then completes
    const target = loaded || elapsed > MAX ? 1 : Math.min(0.9, elapsed / MIN);
    const p = Math.min(target, elapsed / MIN);
    count.textContent = String(Math.round(p * 100)).padStart(3, '0');
    bar.style.setProperty('--p', p.toFixed(3));
    if ((p >= 1 && elapsed >= MIN) || elapsed >= MAX) {
      count.textContent = '100';
      bar.style.setProperty('--p', '1');
      el.classList.add('is-leaving');
      html.classList.remove('is-preloading');
      setTimeout(done, 250);
      setTimeout(() => el.remove(), 1000);
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return ready;
}
