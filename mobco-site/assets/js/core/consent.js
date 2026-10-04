// MOBCO core/consent.js: cookie / third-party embed consent.
// Stores 'accepted' | 'declined' in localStorage 'mobco-consent'. A small bar (one sentence, Accept / Decline)
// appears until a choice is made
// (hidden in ?qa=1 unless &consent=1). Re-open with any [data-consent-open]; accept with [data-consent-accept].
// Consent-gated embeds: <div class="consent-gate" data-consent-gate data-src="https://…" data-title="Map">placeholder…</div>
// → the iframe is injected only after consent.
// API: hasConsent(), getConsent(), setConsent('accepted'|'declined'), onConsent(cb) → unsubscribe, openConsent()

import { store, esc, icon, isQA, getParam } from './utils.js';
import { t, onLang } from './i18n.js';

const KEY = 'mobco-consent';
const S = {
  text: {
    en: 'We use cookies for your settings and Google Maps.',
    ar: 'نستخدم ملفات تعريف الارتباط لحفظ إعداداتك ولعرض خرائط Google.',
  },
  accept: { en: 'Accept', ar: 'موافقة' },
  decline: { en: 'Decline', ar: 'رفض' },
  region: { en: 'Cookie consent', ar: 'الموافقة على ملفات تعريف الارتباط' },
};
const subs = new Set();
let banner = null;
let initialized = false;

export const getConsent = () => store.get(KEY);
export const hasConsent = () => getConsent() === 'accepted';

/** Call cb() when consent is (or already was) accepted. Returns unsubscribe. */
export function onConsent(cb) {
  if (hasConsent()) { queueMicrotask(cb); return () => {}; }
  subs.add(cb);
  return () => subs.delete(cb);
}

export function setConsent(value) {
  store.set(KEY, value);
  document.dispatchEvent(new CustomEvent('consentchange', { detail: { value } }));
  if (value === 'accepted') {
    subs.forEach((cb) => { try { cb(); } catch (e) { console.error(e); } });
    subs.clear();
    loadGates();
  }
  hideBanner();
}

function loadGates(root = document) {
  if (!hasConsent()) return;
  root.querySelectorAll('[data-consent-gate]:not(.is-loaded)').forEach((gate) => {
    const src = gate.getAttribute('data-src');
    if (!src) return;
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.title = t({ en: gate.getAttribute('data-title') || 'Embedded content', ar: gate.getAttribute('data-ar-title-text') || gate.getAttribute('data-title') || 'محتوى مضمَّن' });
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.setAttribute('allowfullscreen', '');
    gate.appendChild(iframe);
    gate.classList.add('is-loaded');
    gate.querySelector('.consent-gate__placeholder')?.setAttribute('hidden', '');
  });
}

function renderBanner() {
  if (!banner) return;
  banner.setAttribute('aria-label', t(S.region));
  banner.innerHTML = `${icon('cookie', 'consent__icon')}
    <p class="consent__text">${esc(t(S.text))}</p>
    <div class="consent__actions">
      <button type="button" class="consent__btn consent__btn--accept" data-consent-choice="accepted">${esc(t(S.accept))}</button>
      <button type="button" class="consent__btn" data-consent-choice="declined">${esc(t(S.decline))}</button>
    </div>`;
}

/** Show the consent banner (e.g. from a "Cookie settings" link). */
export function openConsent() {
  if (banner) return;
  banner = document.createElement('section');
  banner.className = 'consent';
  banner.setAttribute('role', 'region');
  renderBanner();
  document.body.appendChild(banner);
  document.documentElement.classList.add('has-consent-banner');
  banner.addEventListener('click', (e) => {
    const b = e.target.closest('[data-consent-choice]');
    if (b) setConsent(b.getAttribute('data-consent-choice'));
  });
}
function hideBanner() {
  if (!banner) return;
  const b = banner;
  banner = null;
  document.documentElement.classList.remove('has-consent-banner');
  b.classList.add('is-leaving');
  setTimeout(() => b.remove(), 320);
}

export function initConsent() {
  if (initialized) return;
  initialized = true;
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-consent-open]')) { e.preventDefault(); openConsent(); }
    if (e.target.closest('[data-consent-accept]')) { e.preventDefault(); setConsent('accepted'); }
  });
  onLang(renderBanner);
  loadGates();
  const suppressed = isQA() && getParam('consent') !== '1';
  if (!getConsent() && !suppressed) setTimeout(openConsent, 1400);
}
