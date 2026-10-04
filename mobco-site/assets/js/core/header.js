// MOBCO core/header.js — site header behaviour.
// - .is-solid after 40px scroll (transparent over dark heroes: body[data-hero="dark"])
// - .is-hidden on scroll down (after 240px), shown on scroll up
// - active link from body[data-page] (matches [data-nav] on links) → .is-active + aria-current="page"
// - Projects mega menu: hover (fine pointer) / click toggle / keyboard (Enter, Space, ArrowDown, Esc)
// - Mobile full-screen nav: focus trap, Esc, scroll lock, staggered links (CSS)
// API: openMobileNav(), closeMobileNav(), closeMega()

import { $, $$, hasFinePointer, isRTL } from './utils.js';
import { onScroll, stopScroll, startScroll } from './motion.js';
import { onLang } from './i18n.js';

let header, mobileNav, burger, releaseTrap, lastFocus;
let initialized = false;
let lastY = 0;

/* ---------------------------------------------------------------- scroll states */
function onScrollState({ y }) {
  if (!header) return;
  header.classList.toggle('is-solid', y > 40);
  const goingDown = y > lastY + 4;
  const goingUp = y < lastY - 4;
  if (goingDown && y > 240 && !header.matches(':focus-within') && !header.classList.contains('mega-open')) header.classList.add('is-hidden');
  else if (goingUp || y <= 240) header.classList.remove('is-hidden');
  if (Math.abs(y - lastY) > 4) lastY = y;
}

/* ---------------------------------------------------------------- active link */
function markActive() {
  const page = document.body.dataset.page;
  if (!page) return;
  // On a section's child page (e.g. mobco-construction.html, body[data-subsidiary]) the section link stays
  // highlighted but is not the current page itself: aria-current="true"; the child link gets "page".
  const isChild = !!document.body.dataset.subsidiary;
  $$('[data-nav]').forEach((a) => {
    const on = a.getAttribute('data-nav') === page;
    a.classList.toggle('is-active', on);
    if (on) a.setAttribute('aria-current', isChild ? 'true' : 'page');
    else a.removeAttribute('aria-current');
  });
  if (isChild) {
    const file = location.pathname.split('/').pop();
    $$('.mega__card, .mobile-nav__sub a').forEach((a) => {
      if (a.getAttribute('href') === file) a.setAttribute('aria-current', 'page');
    });
  }
}

/* ---------------------------------------------------------------- mega menu */
const megaItems = [];
export function closeMega(item, { focusToggle = false } = {}) {
  const list = item ? [item] : megaItems;
  list.forEach((it) => {
    it.classList.remove('is-open');
    it.querySelector('[data-mega-toggle]')?.setAttribute('aria-expanded', 'false');
    if (focusToggle) it.querySelector('[data-mega-toggle]')?.focus();
  });
  if (!megaItems.some((it) => it.classList.contains('is-open'))) header?.classList.remove('mega-open');
}
function openMega(item) {
  megaItems.forEach((it) => it !== item && closeMega(it));
  item.classList.add('is-open');
  item.querySelector('[data-mega-toggle]')?.setAttribute('aria-expanded', 'true');
  header?.classList.add('mega-open');
  header?.classList.remove('is-hidden');
}

function initMega() {
  $$('[data-mega]', header).forEach((item) => {
    megaItems.push(item);
    const toggle = item.querySelector('[data-mega-toggle]');
    const panel = item.querySelector('.mega');
    if (!toggle || !panel) return;
    let timer;
    if (hasFinePointer()) {
      item.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(timer);
        timer = setTimeout(() => openMega(item), 90);
      });
      item.addEventListener('pointerleave', (e) => {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(timer);
        timer = setTimeout(() => closeMega(item), 180);
      });
    }
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      item.classList.contains('is-open') ? closeMega(item) : openMega(item);
    });
    const firstLink = () => panel.querySelector('a[href]');
    toggle.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        openMega(item);
        requestAnimationFrame(() => firstLink()?.focus());
      }
    });
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && item.classList.contains('is-open')) {
        e.stopPropagation();
        closeMega(item, { focusToggle: true });
      }
      // arrow navigation between mega links
      if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key) && panel.contains(document.activeElement)) {
        const links = $$('a[href]', panel);
        const i = links.indexOf(document.activeElement);
        if (i < 0) return;
        e.preventDefault();
        let dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
        if (isRTL() && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) dir *= -1;
        links[(i + dir + links.length) % links.length].focus();
      }
    });
    item.addEventListener('focusout', (e) => {
      if (!item.contains(e.relatedTarget)) closeMega(item);
    });
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-mega]')) closeMega();
  });
}

/* ---------------------------------------------------------------- mobile nav */
export function openMobileNav() {
  if (!mobileNav || document.documentElement.classList.contains('nav-open')) return;
  lastFocus = document.activeElement;
  document.documentElement.classList.add('nav-open', 'is-locked');
  stopScroll();
  mobileNav.removeAttribute('inert');
  mobileNav.setAttribute('aria-hidden', 'false');
  burger?.setAttribute('aria-expanded', 'true');
  burger?.setAttribute('aria-label', burger.getAttribute(document.documentElement.lang === 'ar' ? 'data-label-close-ar' : 'data-label-close') || 'Close menu');
  // trap focus within the burger (inside the header) + the mobile nav
  const scope = [burger, ...$$('a[href],button', mobileNav)];
  const onKey = (e) => {
    if (e.key === 'Escape') { closeMobileNav(); return; }
    if (e.key !== 'Tab') return;
    const items = scope.filter((el) => el && el.offsetParent !== null);
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!items.includes(document.activeElement)) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', onKey, true);
  releaseTrap = () => document.removeEventListener('keydown', onKey, true);
  setTimeout(() => mobileNav.querySelector('.mobile-nav__link')?.focus({ preventScroll: true }), 350);
}

export function closeMobileNav({ restoreFocus = true } = {}) {
  if (!mobileNav || !document.documentElement.classList.contains('nav-open')) return;
  document.documentElement.classList.remove('nav-open', 'is-locked');
  startScroll();
  mobileNav.setAttribute('inert', '');
  mobileNav.setAttribute('aria-hidden', 'true');
  burger?.setAttribute('aria-expanded', 'false');
  burger?.setAttribute('aria-label', burger.getAttribute(document.documentElement.lang === 'ar' ? 'data-label-open-ar' : 'data-label-open') || 'Open menu');
  releaseTrap?.();
  releaseTrap = null;
  if (restoreFocus) (lastFocus && lastFocus.isConnected ? lastFocus : burger)?.focus({ preventScroll: true });
}

function initMobileNav() {
  mobileNav = $('#mobile-nav');
  burger = $('[data-nav-toggle]');
  if (!mobileNav || !burger) return;
  mobileNav.setAttribute('inert', '');
  mobileNav.setAttribute('aria-hidden', 'true');
  burger.addEventListener('click', () => {
    document.documentElement.classList.contains('nav-open') ? closeMobileNav() : openMobileNav();
  });
  mobileNav.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (a) closeMobileNav({ restoreFocus: false });
  });
  const mq = matchMedia('(min-width: 1200px)');
  mq.addEventListener?.('change', (e) => { if (e.matches) closeMobileNav({ restoreFocus: false }); });
  onLang((lang) => {
    const open = document.documentElement.classList.contains('nav-open');
    const key = open ? 'close' : 'open';
    burger.setAttribute('aria-label', burger.getAttribute(`data-label-${key}${lang === 'ar' ? '-ar' : ''}`) || burger.getAttribute('aria-label'));
  });
}

/* ---------------------------------------------------------------- init */
export function initHeader() {
  if (initialized) return;
  header = $('[data-header]');
  if (!header) return;
  initialized = true;
  markActive();
  initMega();
  initMobileNav();
  onScroll(onScrollState);
  onScrollState({ y: window.scrollY });
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
}
