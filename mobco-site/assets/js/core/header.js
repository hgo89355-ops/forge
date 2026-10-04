// MOBCO core/header.js: site header behaviour.
//
// The eight tabs are always a horizontal bar (there is no burger or drawer):
//   ≥1100px  one row: logo · tabs · search, EN | ع, "Start a project"
//   <1100px  two rows: logo + tools on top, the tabs below as a horizontal scroller (edge fades,
//            active tab scrolled into view). Dropdowns open as a compact sheet attached to the bar.
//
// - .is-solid after 40px of scroll (transparent over dark heroes: body[data-hero="dark"])
// - .is-hidden on scroll down (after 240px), shown again on scroll up
// - active tab from body[data-page] ([data-nav] links get .is-active + aria-current); on the company pages
//   (body[data-subsidiary]) "Subsidiaries" gets aria-current="true" and the matching dropdown link "page"
// - dropdowns ([data-mega]: Subsidiaries, Projects): mouse hover on desktop, click on the chevron, first tap on
//   the tab itself with touch / pen (or any pointer in the tab bar) opens it and the next tap follows the link,
//   keyboard: Enter/Space on the chevron, ArrowDown on the tab or chevron, arrows/Home/End inside, Escape,
//   Tab out. Tap or click outside closes.
//
// API: openMega(item), closeMega(item?), isTabBar().
// openMobileNav() / closeMobileNav() are kept as harmless shims so older page code that imports them still loads.

import { $, $$, rafThrottle } from './utils.js';
import { onScroll } from './motion.js';
import { onLang } from './i18n.js';

const BAR_QUERY = '(max-width: 1099.98px)';
let header, nav, scroller, barMQ;
let initialized = false;
let lastY = 0;
let openedAtY = null;
let lastPointer = 'mouse';
const megaItems = [];

/** True when the tabs sit in their own scrollable row (below 1100px). */
export const isTabBar = () => !!barMQ?.matches;

const dirOf = (el) => getComputedStyle(el).direction;

/* ---------------------------------------------------------------- scroll states */
function keyboardFocusInside() {
  try { return !!header.querySelector(':focus-visible'); } catch { return header.matches(':focus-within'); }
}

function onScrollState({ y }) {
  if (!header) return;
  header.classList.toggle('is-solid', y > 40);
  const goingDown = y > lastY + 4;
  const goingUp = y < lastY - 4;
  const menuOpen = header.classList.contains('mega-open');
  // a sheet attached to the tab bar should not follow the page around
  if (menuOpen && isTabBar() && openedAtY !== null && Math.abs(y - openedAtY) > 80) closeMega();
  if (goingDown && y > 240 && !keyboardFocusInside() && !header.classList.contains('mega-open')) header.classList.add('is-hidden');
  else if (goingUp || y <= 240) header.classList.remove('is-hidden');
  if (Math.abs(y - lastY) > 4) lastY = y;
}

/* ---------------------------------------------------------------- active tab */
function markActive() {
  const page = document.body.dataset.page;
  if (!page) return;
  const isChild = !!document.body.dataset.subsidiary;
  $$('[data-nav]').forEach((a) => {
    const on = a.getAttribute('data-nav') === page;
    a.classList.toggle('is-active', on);
    if (on) a.setAttribute('aria-current', isChild ? 'true' : 'page');
    else a.removeAttribute('aria-current');
  });
  if (isChild) {
    const file = location.pathname.split('/').pop();
    $$('.nav-menu__link', header).forEach((a) => {
      if (a.getAttribute('href') === file) a.setAttribute('aria-current', 'page');
    });
  }
}

/* ---------------------------------------------------------------- tab bar (scroller) */
function scrollState() {
  const max = scroller.scrollWidth - scroller.clientWidth;
  if (max <= 1) return { max: 0, fromLeft: 0 };
  const sl = scroller.scrollLeft;
  // RTL scrollers run from 0 (start, right edge) to -max; normalise to "distance from the left edge"
  const fromLeft = dirOf(scroller) === 'rtl' ? max + Math.min(0, sl) : sl;
  return { max, fromLeft };
}

function updateFades() {
  if (!scroller || !nav) return;
  const { max, fromLeft } = scrollState();
  nav.classList.toggle('is-scrollable', max > 0);
  nav.classList.toggle('is-fade-left', max > 0 && fromLeft > 6);
  nav.classList.toggle('is-fade-right', max > 0 && fromLeft < max - 6);
}

/** Bring a tab into view inside the scroller (centred, or just enough to be fully visible). */
function revealTab(el, { center = true } = {}) {
  if (!scroller || !el || scroller.scrollWidth <= scroller.clientWidth + 1) return;
  const r = scroller.getBoundingClientRect();
  const tr = el.getBoundingClientRect();
  const pad = 24;
  let delta = 0;
  if (center) delta = (tr.left + tr.width / 2) - (r.left + r.width / 2);
  else if (tr.left < r.left + pad) delta = tr.left - (r.left + pad);
  else if (tr.right > r.right - pad) delta = tr.right - (r.right - pad);
  if (Math.abs(delta) > 1) scroller.scrollBy({ left: delta, behavior: 'auto' });
}

function revealActive() {
  if (!isTabBar()) return;
  const active = $('.site-nav__link.is-active', scroller);
  if (active) revealTab(active.closest('.site-nav__item'));
  updateFades();
}

/* ---------------------------------------------------------------- dropdowns */
/** In the tab bar the menu is positioned against the nav row; align it under its tab (clamped to the gutters). */
function placePanel(item) {
  const panel = item.querySelector('[data-mega-panel]');
  if (!panel) return;
  if (!isTabBar()) { panel.style.removeProperty('--drop-x'); return; }
  const n = nav.getBoundingClientRect();
  const link = item.querySelector('.site-nav__link') || item;
  const lr = link.getBoundingClientRect();
  const ir = item.getBoundingClientRect();
  const w = panel.offsetWidth;
  const gutter = parseFloat(getComputedStyle(scroller).paddingInlineStart) || 16;
  let x = dirOf(nav) === 'rtl' ? ir.right - n.left - w : lr.left - n.left;
  x = Math.max(gutter, Math.min(x, n.width - w - gutter));
  panel.style.setProperty('--drop-x', `${Math.round(x)}px`);
}

export function closeMega(item, { focusToggle = false } = {}) {
  const list = item ? [item] : megaItems;
  list.forEach((it) => {
    if (!it.classList.contains('is-open')) return;
    it.classList.remove('is-open');
    const toggle = it.querySelector('[data-mega-toggle]');
    toggle?.setAttribute('aria-expanded', 'false');
    if (focusToggle) toggle?.focus();
  });
  if (!megaItems.some((it) => it.classList.contains('is-open'))) {
    header?.classList.remove('mega-open', 'is-opaque');
    openedAtY = null;
  }
}

export function openMega(item) {
  if (!item) return;
  megaItems.forEach((it) => it !== item && closeMega(it));
  if (isTabBar()) { revealTab(item, { center: false }); placePanel(item); }
  item.classList.add('is-open');
  item.querySelector('[data-mega-toggle]')?.setAttribute('aria-expanded', 'true');
  header?.classList.add('mega-open');
  header?.classList.toggle('is-opaque', isTabBar()); // the sheet hangs off a solid bar
  header?.classList.remove('is-hidden');
  openedAtY = window.scrollY;
}

const panelLinks = (item) => $$('[data-mega-panel] a[href]', item);

function focusPanelLink(item, which) {
  const links = panelLinks(item);
  if (!links.length) return;
  const el = which === 'last' ? links[links.length - 1] : links[0];
  requestAnimationFrame(() => el.focus({ preventScroll: true }));
}

function initMega() {
  $$('[data-mega]', header).forEach((item) => {
    const toggle = item.querySelector('[data-mega-toggle]');
    const panel = item.querySelector('[data-mega-panel]');
    const link = item.querySelector('.site-nav__link');
    if (!toggle || !panel) return;
    megaItems.push(item);
    let timer;

    // mouse hover (desktop row only; the tab bar uses taps so a passing pointer never drops a sheet)
    item.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse' || isTabBar()) return;
      clearTimeout(timer);
      timer = setTimeout(() => openMega(item), 90);
    });
    item.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse' || isTabBar()) return;
      clearTimeout(timer);
      timer = setTimeout(() => closeMega(item), 200);
    });

    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      clearTimeout(timer);
      item.classList.contains('is-open') ? closeMega(item) : openMega(item);
    });

    // First tap on the tab opens its menu (touch / pen anywhere, any pointer in the tab bar).
    // A keyboard "click" (detail 0) always follows the link; the chevron button is the keyboard toggle.
    link?.addEventListener('click', (e) => {
      if (e.detail === 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const touchLike = lastPointer === 'touch' || lastPointer === 'pen';
      if ((touchLike || isTabBar()) && !item.classList.contains('is-open')) {
        e.preventDefault();
        clearTimeout(timer);
        openMega(item);
      }
    });

    const onArrowOpen = (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      openMega(item);
      focusPanelLink(item, e.key === 'ArrowUp' ? 'last' : 'first');
    };
    toggle.addEventListener('keydown', onArrowOpen);
    link?.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') onArrowOpen(e); });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && item.classList.contains('is-open')) {
        e.stopPropagation();
        closeMega(item, { focusToggle: true });
        return;
      }
      if (!panel.contains(document.activeElement)) return;
      const links = panelLinks(item);
      const i = links.indexOf(document.activeElement);
      if (i < 0) return;
      let next = null;
      if (e.key === 'ArrowDown') next = links[(i + 1) % links.length];
      else if (e.key === 'ArrowUp') next = links[(i - 1 + links.length) % links.length];
      else if (e.key === 'Home') next = links[0];
      else if (e.key === 'End') next = links[links.length - 1];
      if (next) { e.preventDefault(); next.focus({ preventScroll: true }); }
    });

    item.addEventListener('focusout', (e) => {
      if (e.relatedTarget && !item.contains(e.relatedTarget)) closeMega(item);
    });
  });

  document.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType || 'mouse'; }, true);
  document.addEventListener('click', (e) => {
    if (!e.target.closest?.('[data-mega]')) closeMega();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !header.classList.contains('mega-open')) return;
    const inside = megaItems.find((it) => it.contains(document.activeElement));
    closeMega(undefined, { focusToggle: false });
    inside?.querySelector('[data-mega-toggle]')?.focus();
  });
}

/* ---------------------------------------------------------------- tab bar wiring */
function initTabBar() {
  nav = $('[data-nav-bar]', header);
  scroller = $('[data-nav-scroller]', header);
  barMQ = matchMedia(BAR_QUERY);
  if (!nav || !scroller) return;

  const onBarScroll = rafThrottle(() => {
    updateFades();
    const open = megaItems.find((it) => it.classList.contains('is-open'));
    if (open && isTabBar()) placePanel(open);
  });
  scroller.addEventListener('scroll', onBarScroll, { passive: true });

  // keyboard focus on a tab that is partly hidden: bring it fully into view
  scroller.addEventListener('focusin', (e) => {
    if (!isTabBar()) return;
    const it = e.target.closest('.site-nav__item');
    if (it && it.parentElement === scroller) revealTab(it, { center: false });
  });

  const onResize = rafThrottle(() => {
    updateFades();
    const open = megaItems.find((it) => it.classList.contains('is-open'));
    if (open) (isTabBar() ? placePanel(open) : open.querySelector('[data-mega-panel]')?.style.removeProperty('--drop-x'));
  });
  window.addEventListener('resize', onResize);
  const onModeChange = () => { closeMega(); requestAnimationFrame(revealActive); };
  barMQ.addEventListener?.('change', onModeChange);

  revealActive();
  // label widths change once the web fonts are in
  document.fonts?.ready?.then(() => requestAnimationFrame(revealActive));
  onLang(() => { closeMega(); requestAnimationFrame(revealActive); });
}

/* ---------------------------------------------------------------- legacy shims */
/** @deprecated There is no mobile drawer any more; kept so older page imports keep working. */
export function openMobileNav() {}
/** @deprecated Closes any open header dropdown (there is no drawer any more). */
export function closeMobileNav() { closeMega(); }

/* ---------------------------------------------------------------- init */
export function initHeader() {
  if (initialized) return;
  header = $('[data-header]');
  if (!header) return;
  initialized = true;
  markActive();
  initTabBar();
  initMega();
  onScroll(onScrollState);
  onScrollState({ y: window.scrollY });
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
}
