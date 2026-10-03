// MOBCO core/motion.js — smooth scroll + scroll-driven motion.
//
// Declarative attributes (wired by scan(root); main.js scans the whole document):
//   data-reveal="up|fade|left|right|scale|clip|mask|mask-up"  reveal once when entering the viewport
//   data-reveal-delay="200"                 extra delay (ms)
//   data-reveal-stagger[="90"]              on a parent: children with data-reveal get incremental delays (step ms)
//   data-split[="words|lines"]              split headline into masked words; reveals on enter; re-splits on langchange
//   data-count="10000" [data-suffix="+"] [data-prefix=""] [data-decimals="0"] [data-native]  count-up number
//   data-parallax="0.15"                    translateY by speed × scroll offset (negative = opposite)
//   data-kenburns[="out"]                   slow zoom drift on the <img> inside; paused off-screen
//   data-marquee [data-speed="60"]          infinite marquee (px/s); clones the first .marquee__group
//   data-magnetic[="0.35"]                  element follows the pointer slightly (fine pointers)
//   data-draw                               SVG path stroke draw-in on enter
//
// API: scan(root), refresh(), scrollTo(target, {gap, offset, immediate}), getLenis(), gsapReady(),
//      stopScroll(), startScroll(), onScroll(cb) → unsubscribe, reveal(el)
// Same-page hash links scroll below the header (opt out with data-no-scroll on the link); a hash on load is
// re-aligned after document.fonts.ready and window load.

import { $$, clamp, prefersReducedMotion, hasFinePointer, isQA, rafThrottle, debounce, formatNumber } from './utils.js';
import { onLang, getLang } from './i18n.js';
import { whenLoaded } from './preloader.js';

let lenis = null;
let initialized = false;
let revealIO = null;
let kbIO = null;
const parallaxEls = new Set();
const scrollSubs = new Set();
let reduced = false;

/* ---------------------------------------------------------------- scroll */
export const getLenis = () => lenis;
export function gsapReady() {
  return window.gsap ? { gsap: window.gsap, ScrollTrigger: window.ScrollTrigger || null } : null;
}

function emitScroll() {
  const y = lenis ? lenis.scroll : window.scrollY;
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = clamp(y / max, 0, 1);
  for (const cb of scrollSubs) cb({ y, progress, max });
}
/** Subscribe to scroll ticks: cb({y, progress, max}). Returns unsubscribe. */
export function onScroll(cb) {
  scrollSubs.add(cb);
  return () => scrollSubs.delete(cb);
}

function initLenis() {
  if (reduced || !window.Lenis || !hasFinePointer()) return;
  try {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true, syncTouch: false });
    const g = gsapReady();
    if (g && g.ScrollTrigger) {
      lenis.on('scroll', g.ScrollTrigger.update);
      g.gsap.ticker.add((time) => lenis.raf(time * 1000));
      g.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    lenis.on('scroll', emitScroll);
  } catch (err) {
    console.warn('[motion] Lenis disabled:', err);
    lenis = null;
  }
}

/**
 * Smoothly scroll to an element, selector or y position, clearing the fixed header.
 *
 *   scrollTo(el)                      → el's top lands `--header-h + 16px` below the viewport top (Lenis or native)
 *   scrollTo(el, { gap: 24 })         → same, with a custom gap below the header
 *   scrollTo(1200)                    → absolute y (no header offset is applied to numbers unless `gap` is given)
 *   scrollTo(el, { offset })          → legacy raw offset (kept for compatibility): with Lenis the offset is passed to
 *                                       lenis.scrollTo() unchanged, which also subtracts html scroll-padding
 *                                       (= header + 16px); without Lenis the element lands at -offset. Prefer `gap`.
 *
 * Element targets are converted to a numeric y from getBoundingClientRect() + window.scrollY, so the header offset
 * is applied exactly once (Lenis would otherwise subtract html scroll-padding / :target scroll-margin on top of it),
 * and a stale Lenis position after a native jump does not skew the result.
 */
export function scrollTo(target, { offset, gap, immediate = false } = {}) {
  const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72;
  let el = null;
  if (typeof target === 'string') { try { el = document.querySelector(target); } catch { el = null; } if (!el) return; }
  else if (target && typeof target === 'object' && target.nodeType === 1) el = target;
  const instant = immediate || reduced;
  // legacy explicit offset on an element target with Lenis: preserve the previous behaviour exactly
  if (el && lenis && offset !== undefined && gap === undefined) {
    lenis.scrollTo(el, { offset, immediate: instant, duration: 1.2 });
    return;
  }
  let y;
  if (el) {
    const off = gap !== undefined ? -(headerH + gap) : (offset ?? -(headerH + 16));
    y = el.getBoundingClientRect().top + window.scrollY + off;
  } else {
    y = Number(target) || 0;
    if (gap !== undefined) y -= headerH + gap;
    else if (offset) y += offset;
  }
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  y = Math.round(clamp(y, 0, max));
  if (lenis) { lenis.scrollTo(y, { immediate: instant, duration: 1.2 }); return; }
  window.scrollTo({ top: y, behavior: instant ? 'instant' : 'smooth' });
}
export function stopScroll() { lenis?.stop(); }
export function startScroll() { lenis?.start(); }

function initAnchors() {
  // Same-page hash links scroll smoothly below the header. Opt out per link with [data-no-scroll] (the click is
  // left alone, so the browser updates the hash natively and fires 'hashchange' — e.g. for hash-driven overlays).
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href*="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.hasAttribute('data-no-scroll')) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash || url.hash === '#') return;
    let target;
    try { target = document.querySelector(decodeURIComponent(url.hash)); } catch { return; }
    if (!target) return;
    e.preventDefault();
    scrollTo(target);
    history.pushState(null, '', url.hash);
    if (!target.matches('a,button,input,select,textarea,[tabindex]')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
}

// Deep link on load: jump below the header once layout is known, then re-align after web fonts and late images
// settle (they shift everything above the target). Stops re-aligning as soon as the user scrolls themselves.
function initHashOnLoad() {
  if (!location.hash || location.hash.length < 2) return;
  let el = null;
  try { el = document.querySelector(decodeURIComponent(location.hash)); } catch { return; }
  if (!el) return;
  let userScrolled = false;
  const stop = () => { userScrolled = true; };
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((ev) => window.addEventListener(ev, stop, { once: true, passive: true }));
  // skipped while a modal/overlay holds the page (html.is-locked), e.g. a hash-driven project viewer
  const align = () => { if (!userScrolled && el.isConnected && !document.documentElement.classList.contains('is-locked')) scrollTo(el, { immediate: true }); };
  setTimeout(align, 60);
  document.fonts?.ready?.then(() => requestAnimationFrame(align));
  if (document.readyState === 'complete') setTimeout(align, 250);
  else window.addEventListener('load', () => setTimeout(align, 120), { once: true });
}

/* ---------------------------------------------------------------- reveal */
/** Reveal an element immediately (adds .is-revealed and runs counters/draw inside). */
export function reveal(el) {
  if (el.classList.contains('is-revealed')) return;
  el.classList.add('is-revealed');
  if (el.hasAttribute('data-count')) runCounter(el);
}

function makeRevealIO() {
  if (revealIO || !('IntersectionObserver' in window)) return;
  revealIO = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      revealIO.unobserve(entry.target);
      reveal(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
}

// Reveals start only once the first-visit preloader has lifted, so the hero animates in view.
// IntersectionObserver ignores fully clipped targets (clip-path: inset(0 100% 0 0) → zero area), so
// mask variants are checked against their bounding box on scroll instead.
const manualReveal = new Set();
function checkManual() {
  if (!manualReveal.size) return;
  const vh = window.innerHeight;
  for (const el of manualReveal) {
    if (!el.isConnected) { manualReveal.delete(el); continue; }
    const r = el.getBoundingClientRect();
    if (r.top < vh * 0.92 && r.bottom > 0 && (r.width || r.height)) { manualReveal.delete(el); reveal(el); }
  }
}
const onManual = rafThrottle(checkManual);
// Safety net: when scrolling settles, reveal anything in view that IO has not reported yet
// (IO can miss elements during very fast programmatic scrolls or on a busy main thread).
const pendingReveal = new Set();
const settle = debounce(() => {
  const vh = window.innerHeight;
  for (const el of pendingReveal) {
    if (el.classList.contains('is-revealed') || !el.isConnected) { pendingReveal.delete(el); continue; }
    const r = el.getBoundingClientRect();
    if (r.top < vh && r.bottom > 0 && (r.width || r.height)) { pendingReveal.delete(el); revealIO?.unobserve(el); reveal(el); }
  }
}, 140);
// second pass: a programmatic jump can end after the 140ms debounce fired (smooth scroll still in flight, busy
// main thread) — check again once scrolling has really ended (scrollend, or 450ms after the last scroll event).
const settleLate = debounce(() => settle(), 450);
function onSettle() { settle(); settleLate(); }
function observeAfterLoad(el) {
  whenLoaded().then(() => {
    if (/^mask/.test(el.getAttribute('data-reveal') || '')) { manualReveal.add(el); checkManual(); }
    else { revealIO.observe(el); pendingReveal.add(el); }
  });
}

function wireReveal(root) {
  // stagger: children with data-reveal get --stagger-i; children without get data-reveal="up"
  $$('[data-reveal-stagger]', root).forEach((parent) => {
    if (parent.__staggered) return;
    parent.__staggered = true;
    const step = parseInt(parent.getAttribute('data-reveal-stagger'), 10);
    if (step) parent.style.setProperty('--stagger-step', `${step}ms`);
    Array.from(parent.children).forEach((child, i) => {
      if (!child.hasAttribute('data-reveal')) child.setAttribute('data-reveal', parent.getAttribute('data-reveal-variant') || 'up');
      child.style.setProperty('--stagger-i', i);
    });
  });
  const els = $$('[data-reveal],[data-count],[data-draw]', root);
  if (root.nodeType === 1 && root.matches('[data-reveal],[data-count],[data-draw]')) els.unshift(root);
  for (const el of els) {
    if (el.__revealWired) continue;
    el.__revealWired = true;
    const d = el.getAttribute('data-reveal-delay');
    if (d) el.style.setProperty('--reveal-delay', `${parseInt(d, 10)}ms`);
    if (el.hasAttribute('data-draw') && typeof el.getTotalLength === 'function') {
      try { el.style.setProperty('--len', Math.ceil(el.getTotalLength())); } catch { /* ignore */ }
    }
    if (reduced || !revealIO) { reveal(el); continue; }
    observeAfterLoad(el);
  }
}

/* ---------------------------------------------------------------- split text */
function splitTextNodes(node, words) {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3) {
      const parts = child.textContent.split(/(\s+)/);
      if (!parts.some((p) => p.trim())) continue;
      const frag = document.createDocumentFragment();
      for (const part of parts) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); continue; }
        const w = document.createElement('span');
        w.className = 'split-word';
        const inner = document.createElement('span');
        inner.className = 'split-inner';
        inner.textContent = part;
        w.appendChild(inner);
        frag.appendChild(w);
        words.push(w);
      }
      child.replaceWith(frag);
    } else if (child.nodeType === 1 && !child.classList.contains('split-word') && child.tagName !== 'BR') {
      splitTextNodes(child, words);
    }
  }
}

function unsplit(el) {
  el.querySelectorAll('.split-word').forEach((w) => w.replaceWith(document.createTextNode(w.textContent)));
  el.normalize();
}

function split(el) {
  // always start from clean, unsplit markup (i18n may have replaced part or all of the text)
  unsplit(el);
  el.__splitSource = el.innerHTML;
  el.__splitLang = getLang();
  const words = [];
  splitTextNodes(el, words);
  const mode = el.getAttribute('data-split') || 'words';
  if (mode === 'lines') {
    let line = -1, lastTop = null;
    for (const w of words) {
      const top = w.offsetTop;
      if (lastTop === null || Math.abs(top - lastTop) > 4) { line++; lastTop = top; }
      w.firstChild.style.setProperty('--i', line);
    }
    el.style.setProperty('--split-step', '120ms');
  } else {
    words.forEach((w, i) => w.firstChild.style.setProperty('--i', i));
  }
  if (!el.hasAttribute('aria-label') && !el.querySelector('a,button')) {
    // keep the heading readable as a whole by assistive tech
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    el.__splitAria = true;
  }
  el.classList.add('is-split');
}

function wireSplit(root) {
  const els = $$('[data-split]', root);
  if (root.nodeType === 1 && root.matches('[data-split]')) els.unshift(root);
  for (const el of els) {
    if (el.__splitWired) continue;
    el.__splitWired = true;
    if (reduced) { el.classList.add('is-split', 'is-revealed'); continue; }
    split(el);
    if (revealIO) observeAfterLoad(el); else reveal(el);
  }
}

function resplitAll() {
  $$('[data-split].is-split').forEach((el) => {
    if (reduced) return;
    if (el.__splitAria) el.removeAttribute('aria-label');
    const wasRevealed = el.classList.contains('is-revealed');
    split(el);
    if (wasRevealed) el.classList.add('is-revealed');
  });
}

/* ---------------------------------------------------------------- counters */
function runCounter(el) {
  if (el.__counted) return;
  el.__counted = true;
  const target = parseFloat(el.getAttribute('data-count'));
  if (Number.isNaN(target)) return;
  const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
  const suffix = el.getAttribute('data-suffix') || '';
  const prefix = el.getAttribute('data-prefix') || '';
  const native = el.hasAttribute('data-native');
  const render = (v) => {
    el.textContent = prefix + formatNumber(v, { decimals, native, lang: getLang() }) + suffix;
  };
  el.__renderCount = () => render(target);
  if (reduced) { render(target); return; }
  const dur = parseFloat(el.getAttribute('data-duration') || '2000');
  const start = performance.now();
  const ease = (x) => 1 - Math.pow(1 - x, 4);
  const tick = (now) => {
    const p = clamp((now - start) / dur, 0, 1);
    render(decimals ? target * ease(p) : Math.round(target * ease(p)));
    if (p < 1) requestAnimationFrame(tick);
  };
  render(0);
  requestAnimationFrame(tick);
}

/* ---------------------------------------------------------------- parallax */
const updateParallax = () => {
  const vh = window.innerHeight;
  for (const el of parallaxEls) {
    if (!el.isConnected) { parallaxEls.delete(el); continue; }
    const frame = el.parentElement || el;
    const r = frame.getBoundingClientRect();
    if (r.bottom < -200 || r.top > vh + 200) continue;
    const speed = parseFloat(el.getAttribute('data-parallax')) || 0.15;
    const center = r.top + r.height / 2 - vh / 2;
    el.style.transform = `translate3d(0, ${(-center * speed).toFixed(1)}px, 0)`;
  }
};
const onParallax = rafThrottle(updateParallax);

function wireParallax(root) {
  if (reduced) return;
  $$('[data-parallax]', root).forEach((el) => parallaxEls.add(el));
  if (parallaxEls.size) updateParallax();
}

/* ---------------------------------------------------------------- Ken Burns */
function wireKenBurns(root) {
  const els = $$('[data-kenburns]', root);
  if (!els.length) return;
  if (!kbIO && 'IntersectionObserver' in window) {
    kbIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.target.classList.toggle('is-paused', !e.isIntersecting));
    });
  }
  els.forEach((el) => { if (!el.__kb) { el.__kb = true; kbIO?.observe(el); } });
}

/* ---------------------------------------------------------------- marquee */
function setupMarquee(m) {
  const track = m.querySelector('.marquee__track');
  const group = track?.querySelector('.marquee__group');
  if (!track || !group) return;
  track.querySelectorAll('.marquee__group[data-clone]').forEach((c) => c.remove());
  const groupW = group.getBoundingClientRect().width;
  if (!groupW) return;
  const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
  const needed = Math.max(1, Math.ceil(m.clientWidth / (groupW + gap)) + 1);
  for (let i = 0; i < needed; i++) {
    const c = group.cloneNode(true);
    c.setAttribute('data-clone', '');
    c.setAttribute('aria-hidden', 'true');
    c.querySelectorAll('a,button').forEach((x) => x.setAttribute('tabindex', '-1'));
    track.appendChild(c);
  }
  const distance = groupW + gap;
  const speed = parseFloat(m.getAttribute('data-speed') || '60');
  m.style.setProperty('--marquee-distance', `${distance}px`);
  m.style.setProperty('--marquee-duration', `${(distance / speed).toFixed(2)}s`);
  m.classList.add('is-ready');
}
function wireMarquee(root) {
  if (reduced) return;
  $$('[data-marquee]', root).forEach((m) => {
    if (m.__marquee) return;
    m.__marquee = true;
    setupMarquee(m);
    m.addEventListener('focusin', () => m.classList.add('is-paused'));
    m.addEventListener('focusout', () => m.classList.remove('is-paused'));
  });
}

/* ---------------------------------------------------------------- magnetic */
function wireMagnetic(root) {
  if (reduced || !hasFinePointer()) return;
  $$('[data-magnetic]', root).forEach((el) => {
    if (el.__magnetic) return;
    el.__magnetic = true;
    const strength = parseFloat(el.getAttribute('data-magnetic')) || 0.35;
    let raf = 0;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * strength;
      const y = (e.clientY - (r.top + r.height / 2)) * strength;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transition = 'transform .25s cubic-bezier(.16,1,.3,1)';
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
    });
    el.addEventListener('pointerleave', () => {
      cancelAnimationFrame(raf);
      el.style.transition = 'transform .8s cubic-bezier(.34,1.56,.64,1)';
      el.style.transform = '';
    });
  });
}

/* ---------------------------------------------------------------- progress UI */
function initProgress() {
  const bar = document.querySelector('.scroll-progress > span');
  const toTop = document.querySelector('[data-to-top]');
  const update = ({ y, progress }) => {
    if (bar) bar.style.setProperty('--p', progress.toFixed(4));
    if (toTop) {
      toTop.style.setProperty('--p', progress.toFixed(4));
      toTop.classList.toggle('is-visible', y > window.innerHeight * 0.8);
    }
  };
  onScroll(update);
  if (toTop) {
    toTop.addEventListener('click', (e) => {
      e.preventDefault();
      scrollTo(0, { offset: 0 });
      const target = document.getElementById('main') || document.body;
      if (target) { target.setAttribute('tabindex', '-1'); setTimeout(() => target.focus({ preventScroll: true }), 600); }
    });
  }
}

/* ---------------------------------------------------------------- public */
/** Wire every motion attribute inside `root` (idempotent). Call after inserting DOM. */
export function scan(root = document) {
  makeRevealIO();
  wireSplit(root);
  wireReveal(root);
  wireParallax(root);
  wireKenBurns(root);
  wireMarquee(root);
  wireMagnetic(root);
  refresh();
}

/** Recalculate layout-dependent motion (after DOM/size changes). */
export function refresh() {
  const g = gsapReady();
  try { g?.ScrollTrigger?.refresh(); } catch { /* ignore */ }
  lenis?.resize?.();
  updateParallax();
  emitScroll();
}

export function initMotion() {
  if (initialized) return;
  initialized = true;
  reduced = prefersReducedMotion();
  const html = document.documentElement;
  if (isQA()) html.classList.add('qa');
  if (window.gsap && window.ScrollTrigger) {
    try { window.gsap.registerPlugin(window.ScrollTrigger); } catch { /* ignore */ }
  }
  initLenis();
  window.addEventListener('scroll', () => { if (!lenis) emitScroll(); onParallax(); onManual(); onSettle(); }, { passive: true });
  window.addEventListener('scrollend', () => { settle(); checkManual(); }, { passive: true });
  if (lenis) { lenis.on('scroll', onParallax); lenis.on('scroll', onManual); lenis.on('scroll', onSettle); }
  window.addEventListener('resize', rafThrottle(() => {
    $$('[data-marquee].is-ready').forEach(setupMarquee);
    refresh();
  }));
  initAnchors();
  initProgress();
  scan(document);
  html.classList.add('motion-ready');
  onLang(() => {
    resplitAll();
    $$('[data-count]').forEach((el) => el.__renderCount?.());
    $$('[data-marquee].is-ready').forEach(setupMarquee);
    requestAnimationFrame(refresh);
  });
  // fonts change metrics → re-measure line splits & marquees
  document.fonts?.ready?.then(() => {
    $$('[data-split="lines"].is-split').forEach((el) => { const r = el.classList.contains('is-revealed'); split(el); if (r) el.classList.add('is-revealed'); });
    $$('[data-marquee].is-ready').forEach(setupMarquee);
    refresh();
  });
  // hash on load (after header offset is known), re-aligned after fonts.ready / load
  initHashOnLoad();
  emitScroll();
}
