// assets/js/pages/home.js — HOME page, PART A behaviours (owned by the home-A builder).
//   initHero()   cinematic slider: Ken Burns, clip-path wipes, split headlines, autoplay with pause
//                (hover over controls / focus / visible button / tab hidden / off-screen), progress bars,
//                prev/next, swipe, keyboard, aria-live announcements on user-initiated changes.
//   initSubs()   pointer spotlight on the subsidiary tiles (hover/focus reveal is pure CSS).
//   initSteps()  WE PLAN · WE BUILD · WE MANAGE — panels rendered from CAPABILITIES; pinned scroll-driven
//                sequence on desktop (sticky + progress), stacked elsewhere.
// Core modules are singletons initialised by core/main.js (loaded first). Part B lives in home-b.js.

import { t, onLang } from '../core/i18n.js';
import { scan, refresh, onScroll, scrollTo } from '../core/motion.js';
import { scanUI } from '../core/ui.js';
import { $, $$, clamp, esc, icon, isRTL, prefersReducedMotion, hasFinePointer, rafThrottle } from '../core/utils.js';
import { whenLoaded } from '../core/preloader.js';
import { CAPABILITIES } from '../data/site-data.js';

const REDUCED = prefersReducedMotion();
const smoothstep = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };

/* =========================================================================
   01 · HERO
   ========================================================================= */
function initHero() {
  const root = $('#ha-hero');
  const stage = root && $('[data-ha-carousel]', root);
  if (!stage) return;

  const slides = $$('[data-ha-slide]', stage);
  const copies = $$('[data-ha-copy]', stage);
  const caps = $$('[data-ha-cap]', stage);
  const bars = $$('[data-ha-goto]', stage);
  const fills = bars.map((b) => $('.ha-dock__fill', b));
  const live = $('[data-ha-live]', stage);
  const wipe = $('.ha-hero__wipe', stage);
  const pauseBtn = $('[data-ha-pause]', stage);
  const hoverZones = $$('.ha-hero__bar, .ha-hero__actions, .ha-caps', stage);
  const N = slides.length;
  const DURATION = 7000;
  const WIPE = 1150;
  const EASE = 'cubic-bezier(.77, 0, .18, 1)';

  let index = 0;
  let elapsed = 0;
  let last = performance.now();
  let userPaused = REDUCED;          // reduced motion / ?qa=1: never auto-advance
  let hovering = false;
  let focused = false;
  let offscreen = false;
  let started = false;
  let anims = [];
  let seq = 0;

  /* split headlines: .ha-src keeps the (localized) authored text for AT; .ha-split is the visual copy */
  function splitTitle(title) {
    const src = $('.ha-src', title);
    if (!src) return;
    let out = $('.ha-split', title);
    if (!out) {
      out = document.createElement('span');
      out.className = 'ha-split';
      out.setAttribute('aria-hidden', 'true');
      title.appendChild(out);
    }
    const words = src.textContent.trim().split(/\s+/).filter(Boolean);
    out.innerHTML = words.map((w, i) => `<span class="ha-w"><span class="ha-w__i" style="--i:${i}">${esc(w)}</span></span>`).join(' ');
    title.classList.add('is-split');
  }
  const splitAll = () => $$('[data-ha-title]', stage).forEach(splitTitle);

  const titleOf = (i) => ($('.ha-src', copies[i])?.textContent || '').trim();
  const paused = () => userPaused || hovering || focused || offscreen || document.hidden;

  function setAria(i) {
    copies.forEach((c, k) => {
      const on = k === i;
      c.inert = !on;
      if (on) c.removeAttribute('aria-hidden'); else c.setAttribute('aria-hidden', 'true');
    });
    caps.forEach((c, k) => {
      const on = k === i;
      c.classList.toggle('is-active', on);
      c.inert = !on;
      if (on) { c.removeAttribute('aria-hidden'); c.removeAttribute('tabindex'); }
      else { c.setAttribute('aria-hidden', 'true'); c.setAttribute('tabindex', '-1'); }
    });
    bars.forEach((b, k) => {
      if (k === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      b.classList.toggle('is-done', k < i);
      fills[k]?.style.removeProperty('--p');
    });
    root.style.setProperty('--ha-i', i);
  }

  function announce(i) {
    if (!live) return;
    live.textContent = t({ en: `Slide ${i + 1} of ${N}: ${titleOf(i)}`, ar: `الشريحة ${i + 1} من ${N}: ${titleOf(i)}` });
  }

  function go(to, dir, source = 'user') {
    to = ((to % N) + N) % N;
    if (to === index) return;
    anims.forEach((a) => { try { a.finish(); } catch { /* already done */ } });
    anims = [];
    const from = index;
    const token = ++seq;
    index = to;
    elapsed = 0;

    const inc = slides[to];
    const out = slides[from];
    slides.forEach((s) => { if (s !== out) s.classList.remove('is-leaving'); });
    out.classList.remove('is-active');
    out.classList.add('is-leaving');
    inc.classList.remove('is-leaving');
    inc.classList.add('is-active');
    // restart the Ken Burns drift on the incoming image
    inc.classList.remove('is-kb');
    void inc.offsetWidth;
    inc.classList.add('is-kb');

    // copy: outgoing words lift away, incoming words rise in (CSS transitions, staggered)
    const cOut = copies[from], cIn = copies[to];
    cOut.classList.remove('is-active');
    cOut.classList.add('is-leaving');
    cIn.classList.remove('is-leaving');
    cIn.style.setProperty('--ha-in-delay', REDUCED ? '0ms' : '420ms');
    cIn.classList.add('is-active');
    setTimeout(() => { if (!cOut.classList.contains('is-active')) cOut.classList.remove('is-leaving'); }, 900);

    setAria(to);
    if (source !== 'auto') announce(to);

    const finish = () => {
      if (!out.classList.contains('is-active')) out.classList.remove('is-leaving');
    };
    if (REDUCED || typeof inc.animate !== 'function') { finish(); return; }

    // clip-path wipe from the edge we travel towards (mirrored in RTL)
    const fromEnd = (dir > 0) !== isRTL();          // physical: true → reveal from the right edge
    const W = stage.clientWidth;
    const opts = { duration: WIPE, easing: EASE };
    const a1 = inc.animate([{ clipPath: fromEnd ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], opts);
    const a2 = $('.ha-slide__media', inc).animate([{ transform: `translate3d(${fromEnd ? 14 : -14}%, 0, 0)` }, { transform: 'translate3d(0, 0, 0)' }], opts);
    const a3 = $('.ha-slide__media', out).animate([{ transform: 'translate3d(0, 0, 0)', opacity: 1 }, { transform: `translate3d(${fromEnd ? -10 : 10}%, 0, 0)`, opacity: .55 }], opts);
    const a4 = wipe?.animate([
      { transform: `translate3d(${fromEnd ? W : 0}px, 0, 0)`, opacity: 0 },
      { opacity: 1, offset: .12 },
      { opacity: 1, offset: .82 },
      { transform: `translate3d(${fromEnd ? 0 : W}px, 0, 0)`, opacity: 0 },
    ], opts);
    anims = [a1, a2, a3, a4].filter(Boolean);
    a1.finished.then(() => { finish(); if (token === seq) anims = []; }).catch(() => finish());
  }

  const next = (source) => go(index + 1, 1, source);
  const prev = (source) => go(index - 1, -1, source);

  /* autoplay loop (progress fill + advance) */
  function tick(now) {
    const dt = Math.min(64, now - last);
    last = now;
    if (started && !paused()) {
      elapsed += dt;
      const p = Math.min(1, elapsed / DURATION);
      fills[index]?.style.setProperty('--p', p.toFixed(4));
      if (elapsed >= DURATION) next('auto');
    }
    requestAnimationFrame(tick);
  }

  /* pause button */
  function syncPauseLabel() {
    if (!pauseBtn) return;
    pauseBtn.setAttribute('aria-label', userPaused
      ? t({ en: 'Play slideshow', ar: 'تشغيل العرض' })
      : t({ en: 'Pause slideshow', ar: 'إيقاف العرض مؤقتًا' }));
  }
  function setUserPaused(v) {
    userPaused = v;
    root.classList.toggle('is-user-paused', v);
    syncPauseLabel();
    if (live) live.textContent = v ? t({ en: 'Slideshow paused', ar: 'تم إيقاف العرض مؤقتًا' }) : t({ en: 'Slideshow playing', ar: 'العرض قيد التشغيل' });
  }
  pauseBtn?.addEventListener('click', () => setUserPaused(!userPaused));

  /* controls */
  $('[data-ha-next]', stage)?.addEventListener('click', () => next('user'));
  $('[data-ha-prev]', stage)?.addEventListener('click', () => prev('user'));
  bars.forEach((b) => b.addEventListener('click', () => {
    const to = parseInt(b.getAttribute('data-ha-goto'), 10);
    go(to, to > index ? 1 : -1, 'user');
  }));

  /* keyboard: ←/→ on any hero control (mirrored in RTL) */
  stage.addEventListener('keydown', (e) => {
    if (!e.target.closest('.ha-hero__bar')) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const forward = (e.key === 'ArrowRight') !== isRTL();
    if (forward) next('user'); else prev('user');
  });

  /* pause on hover (controls only — the hero is full-screen) and on keyboard focus anywhere inside */
  if (hasFinePointer()) {
    hoverZones.forEach((z) => {
      z.addEventListener('pointerenter', () => { hovering = true; });
      z.addEventListener('pointerleave', () => { hovering = false; });
    });
  }
  stage.addEventListener('focusin', () => { focused = true; });
  stage.addEventListener('focusout', (e) => { if (!stage.contains(e.relatedTarget)) focused = false; });

  /* swipe / drag (touch, pen, mouse) — horizontal only; vertical scroll stays native via touch-action */
  let sx = 0, sy = 0, sid = null;
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('a, button')) return;
    sid = e.pointerId; sx = e.clientX; sy = e.clientY;
  });
  stage.addEventListener('pointerup', (e) => {
    if (e.pointerId !== sid) return;
    sid = null;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    const forward = isRTL() ? dx > 0 : dx < 0;
    if (forward) next('swipe'); else prev('swipe');
  });
  stage.addEventListener('pointercancel', () => { sid = null; });
  stage.addEventListener('dragstart', (e) => e.preventDefault());

  /* off-screen: stop the clock and the Ken Burns drift */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      offscreen = !entry.isIntersecting;
      root.classList.toggle('is-offscreen', offscreen);
    }, { threshold: 0.2 }).observe(stage);
  }

  /* language: re-split headlines from the localized source text; refresh dynamic labels */
  onLang(() => { splitAll(); syncPauseLabel(); });

  /* boot */
  splitAll();
  setAria(0);
  syncPauseLabel();
  root.classList.toggle('is-user-paused', userPaused);
  copies[0].classList.remove('is-active');
  whenLoaded().then(() => {
    requestAnimationFrame(() => {
      root.classList.add('is-ready');
      copies[0].style.setProperty('--ha-in-delay', REDUCED ? '0ms' : '160ms');
      copies[0].classList.add('is-active');
      started = true;
      last = performance.now();
    });
  });
  requestAnimationFrame(tick);
}

/* =========================================================================
   03 · SUBDIVISION TILES — pointer spotlight
   ========================================================================= */
function initSubs() {
  if (!hasFinePointer() || REDUCED) return;
  $$('[data-ha-tile]').forEach((tile) => {
    tile.addEventListener('pointermove', (e) => {
      const r = tile.getBoundingClientRect();
      tile.style.setProperty('--mx', `${Math.round(e.clientX - r.left)}px`);
      tile.style.setProperty('--my', `${Math.round(e.clientY - r.top)}px`);
    });
  });
}

/* =========================================================================
   04 · WE PLAN · WE BUILD · WE MANAGE
   ========================================================================= */
function initSteps() {
  const sec = $('[data-ha-steps]');
  if (!sec) return;
  const track = $('.ha-steps__track', sec);
  const mount = $('[data-ha-panels]', sec);
  const visual = $('.ha-steps__visual', sec);
  const lines = $$('[data-ha-line]', sec);
  const nodes = $$('[data-ha-node]', sec);
  const readout = $('[data-ha-readout]', sec);
  const fill = $('.ha-steps__rail-fill', sec);
  const mq = matchMedia('(min-width: 1024px) and (min-height: 680px)');
  let pinned = false;
  let active = 0;

  function render() {
    if (!mount) return;
    mount.innerHTML = CAPABILITIES.map((c, i) => `
      <article class="ha-step${i === active ? ' is-active' : ''}" data-ha-step="${i}">
        <div class="ha-step__head">
          <span class="icon-tile ha-step__icon">${icon(c.icon)}</span>
          <div>
            <p class="ha-step__kicker"><span class="num-ltr">${esc(c.index)}</span> · ${esc(t(c.title))}</p>
            <h3 class="ha-step__title">${esc(t(c.subtitle))}</h3>
          </div>
        </div>
        <ul class="ha-step__list" role="list">
          ${c.items.map((it) => `<li>${icon('check')}<span>${esc(t(it))}</span></li>`).join('')}
        </ul>
      </article>`).join('');
    scanUI(mount);
    scan(mount);
  }

  function setActive(i) {
    if (i === active && mount.querySelector('.ha-step.is-active')) return;
    active = i;
    $$('.ha-step', mount).forEach((p, k) => p.classList.toggle('is-active', k === i));
    lines.forEach((l, k) => { l.classList.toggle('is-active', k === i); l.classList.toggle('is-done', k < i); });
    nodes.forEach((n, k) => {
      n.classList.toggle('is-active', k === i);
      n.classList.toggle('is-done', k < i);
      if (k === i) n.setAttribute('aria-current', 'step'); else n.removeAttribute('aria-current');
    });
    if (readout) readout.textContent = `0${i + 1} / 0${CAPABILITIES.length}`;
  }

  function update() {
    const vh = window.innerHeight;
    let r;
    if (pinned) {
      const box = track.getBoundingClientRect();
      const total = Math.max(1, box.height - vh);
      const p = clamp(-box.top / total, 0, 1);
      setActive(p < 1 / 3 ? 0 : p < 2 / 3 ? 1 : 2);
      fill?.style.setProperty('--p', p.toFixed(4));
      r = smoothstep(0.1, 0.9, p);
    } else {
      const v = visual.getBoundingClientRect();
      r = smoothstep(0.15, 0.85, (vh - v.top) / (vh + v.height));
    }
    sec.style.setProperty('--r', (0.04 + r * 0.96).toFixed(4));
  }
  const onTick = rafThrottle(update);

  function setPinned() {
    const v = mq.matches && !REDUCED;
    if (v === pinned) return;
    pinned = v;
    sec.classList.toggle('is-pinned', v);
    if (!v) {
      // stacked: every panel visible, headline undimmed
      lines.forEach((l) => l.classList.remove('is-active', 'is-done'));
      $$('.ha-step', mount).forEach((p) => p.classList.add('is-active'));
    } else {
      active = -1;
      setActive(0);
    }
    refresh();
    update();
  }

  nodes.forEach((n) => n.addEventListener('click', () => {
    const i = parseInt(n.getAttribute('data-ha-node'), 10);
    if (!pinned) return;
    const box = track.getBoundingClientRect();
    const total = box.height - window.innerHeight;
    const y = window.scrollY + box.top + total * ((i + 0.5) / 3);
    scrollTo(Math.round(y), { offset: 0 });
  }));

  render();
  setPinned();
  if (!pinned) $$('.ha-step', mount).forEach((p) => p.classList.add('is-active'));
  update();
  onScroll(onTick);
  window.addEventListener('scroll', onTick, { passive: true });
  window.addEventListener('resize', rafThrottle(() => { setPinned(); update(); }));
  mq.addEventListener?.('change', setPinned);
  onLang(() => {
    render();
    if (pinned) { const i = active; active = -1; setActive(Math.max(0, i)); }
    else $$('.ha-step', mount).forEach((p) => p.classList.add('is-active'));
    update();
  });
}

/* ========================================================================= */
for (const [name, fn] of [['hero', initHero], ['subs', initSubs], ['steps', initSteps]]) {
  try { fn(); } catch (err) { console.error(`[home] ${name} failed to initialise`, err); }
}
