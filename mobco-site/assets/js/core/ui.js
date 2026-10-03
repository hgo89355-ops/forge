// MOBCO core/ui.js — declarative, accessible UI components.
//
//   data-tabs                 tabs (roles, arrows/Home/End, RTL aware, animated indicator) → 'tabchange'
//   data-accordion[="single"] accordion (aria-expanded, animated height)                  → 'accordionchange'
//   data-modal / data-modal-open="id" / data-modal-close           modal dialog (focus trap, Esc, scroll lock)
//   data-drawer / data-drawer-open="id" / data-drawer-close        side drawer (same behaviours)
//   data-lightbox="group" (on <a href="img.jpg" data-webp data-caption data-ar-caption>) → openLightbox
//   data-copy="text" | data-copy-target="#sel"                     copy to clipboard + toast
//   data-compare[="50"]       before/after slider (pointer + keyboard, RTL aware)
//   data-carousel             drag carousel (inertia, snap, arrows, progress, counter)
//   data-validate             form validation (EN/AR messages) → 'validsubmit' {detail:{data, formData, form}}
//   data-dropzone             file drop zone (accept, data-max-size MB, data-max-files)
//   data-tooltip="…" data-ar-tooltip="…"
//   data-chip-group[="single|multi"]  toggle chips (aria-pressed)                         → 'chipchange' {values}
//   .range__input             range fill + live output
//
// JS API: initUI(), scanUI(root), openModal(id|el), closeModal(el?), openDrawer(id|el), closeDrawer(el?),
//         openLightbox(items, index), closeLightbox(), toast(msg, opts), copyText(text), validateForm(form)

import { $, $$, clamp, uid, icon, esc, focusables, isRTL, prefersReducedMotion, formatBytes, h } from './utils.js';
import { t, getLang, onLang, localize } from './i18n.js';
import { stopScroll, startScroll } from './motion.js';

const S = {
  close: { en: 'Close', ar: 'إغلاق' },
  next: { en: 'Next image', ar: 'الصورة التالية' },
  prev: { en: 'Previous image', ar: 'الصورة السابقة' },
  zoomIn: { en: 'Zoom in', ar: 'تكبير' },
  zoomOut: { en: 'Zoom out', ar: 'تصغير' },
  viewer: { en: 'Image viewer', ar: 'عارض الصور' },
  lbHint: { en: 'Scroll or double-click to zoom · Drag to pan · ← → to navigate', ar: 'مرّر أو انقر مرتين للتكبير · اسحب للتحريك · ← → للتنقل' },
  copied: { en: 'Copied to clipboard', ar: 'تم النسخ إلى الحافظة' },
  copyFail: { en: 'Could not copy — please copy manually', ar: 'تعذّر النسخ، يُرجى النسخ يدويًا' },
  required: { en: 'This field is required.', ar: 'هذا الحقل مطلوب.' },
  requiredCheck: { en: 'Please tick this box to continue.', ar: 'يُرجى تحديد هذا الخيار للمتابعة.' },
  requiredFile: { en: 'Please attach a file.', ar: 'يُرجى إرفاق ملف.' },
  requiredSelect: { en: 'Please choose an option.', ar: 'يُرجى اختيار أحد الخيارات.' },
  email: { en: 'Enter a valid email address, e.g. name@company.com.', ar: 'أدخل بريدًا إلكترونيًا صحيحًا، مثل name@company.com.' },
  phone: { en: 'Enter a valid phone number (7–15 digits, + allowed).', ar: 'أدخل رقم هاتف صحيحًا (من 7 إلى 15 رقمًا، ويمكن استخدام +).' },
  minlength: { en: 'Please enter at least {n} characters.', ar: 'يُرجى إدخال {n} أحرف على الأقل.' },
  pattern: { en: 'Please match the requested format.', ar: 'يُرجى الالتزام بالصيغة المطلوبة.' },
  match: { en: 'The values do not match.', ar: 'القيمتان غير متطابقتين.' },
  fixErrors: { en: 'Please review the highlighted fields.', ar: 'يُرجى مراجعة الحقول المظللة.' },
  fileType: { en: '“{f}” is not an accepted file type.', ar: 'نوع الملف «{f}» غير مقبول.' },
  fileSize: { en: '“{f}” is larger than {n} MB.', ar: 'حجم الملف «{f}» أكبر من {n} ميغابايت.' },
  fileCount: { en: 'You can attach up to {n} files.', ar: 'يمكنك إرفاق {n} ملفات كحدٍّ أقصى.' },
  removeFile: { en: 'Remove file', ar: 'إزالة الملف' },
  sliderLabel: { en: 'Comparison position', ar: 'موضع المقارنة' },
};
const fmt = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

let initialized = false;

/* ======================================================================
   Layer manager (modal, drawer, lightbox share: focus trap, Esc, scroll lock)
   ====================================================================== */
const layers = [];
function pushLayer(layer) {
  layers.push(layer);
  if (layers.length === 1) { document.documentElement.classList.add('is-locked'); stopScroll(); }
}
function popLayer(layer) {
  const i = layers.indexOf(layer);
  if (i >= 0) layers.splice(i, 1);
  if (!layers.length) { document.documentElement.classList.remove('is-locked'); startScroll(); }
}
document.addEventListener('keydown', (e) => {
  const top = layers[layers.length - 1];
  if (!top) return;
  if (e.key === 'Escape') { e.preventDefault(); top.close(); return; }
  if (e.key === 'Tab') {
    const items = focusables(top.el);
    if (!items.length) { e.preventDefault(); return; }
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !top.el.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !top.el.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  }
}, true);

function transitionOut(el, cls, done) {
  el.classList.remove(cls);
  const ms = prefersReducedMotion() ? 0 : 650;
  clearTimeout(el.__outTimer);
  el.__outTimer = setTimeout(() => { el.__outTimer = 0; done(); }, ms);
}

/* ======================================================================
   Modal & drawer
   ====================================================================== */
const resolve = (x) => (typeof x === 'string' ? document.getElementById(x.replace(/^#/, '')) : x);

function openPanel(el, kind, trigger) {
  el = resolve(el);
  if (!el || el.__layer) return;
  clearTimeout(el.__outTimer); // reopened while the close transition was still running: keep it visible
  const returnTo = trigger || document.activeElement;
  el.hidden = false;
  el.removeAttribute('inert');
  const dialog = el.querySelector(kind === 'modal' ? '.modal__dialog' : '.drawer__panel') || el;
  if (!dialog.hasAttribute('role')) dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');
  const layer = {
    el,
    close: () => closePanel(el, kind),
    returnTo,
  };
  el.__layer = layer;
  pushLayer(layer);
  void el.offsetWidth; // flush for transition
  requestAnimationFrame(() => el.classList.add('is-open'));
  const autofocus = el.querySelector('[autofocus]') || focusables(dialog).find((f) => !f.matches('[data-modal-close],[data-drawer-close]')) || dialog;
  setTimeout(() => autofocus.focus({ preventScroll: true }), 60);
  el.dispatchEvent(new CustomEvent(`${kind}open`, { bubbles: true }));
}
function closePanel(el, kind) {
  el = resolve(el);
  if (!el || !el.__layer) return;
  const layer = el.__layer;
  el.__layer = null;
  popLayer(layer);
  transitionOut(el, 'is-open', () => { el.hidden = true; });
  if (layer.returnTo && layer.returnTo.isConnected) layer.returnTo.focus({ preventScroll: true });
  el.dispatchEvent(new CustomEvent(`${kind}close`, { bubbles: true }));
}
export const openModal = (el, trigger) => openPanel(el, 'modal', trigger);
export const closeModal = (el) => closePanel(el || layers.filter((l) => l.el.matches('[data-modal]')).pop()?.el, 'modal');
export const openDrawer = (el, trigger) => openPanel(el, 'drawer', trigger);
export const closeDrawer = (el) => closePanel(el || layers.filter((l) => l.el.matches('[data-drawer]')).pop()?.el, 'drawer');

function initPanels() {
  document.addEventListener('click', (e) => {
    const openM = e.target.closest('[data-modal-open]');
    if (openM) { e.preventDefault(); openModal(openM.getAttribute('data-modal-open'), openM); return; }
    const openD = e.target.closest('[data-drawer-open]');
    if (openD) { e.preventDefault(); openDrawer(openD.getAttribute('data-drawer-open'), openD); return; }
    const closeM = e.target.closest('[data-modal-close]');
    if (closeM) { e.preventDefault(); closeModal(closeM.closest('[data-modal]')); return; }
    const closeD = e.target.closest('[data-drawer-close]');
    if (closeD) { e.preventDefault(); closeDrawer(closeD.closest('[data-drawer]')); }
  });
}

/* ======================================================================
   Tabs
   ====================================================================== */
function setupTabs(root) {
  if (root.__tabs) return;
  root.__tabs = true;
  const list = root.querySelector('.tabs__list, [role="tablist"]');
  const tabs = $$('[data-tab]', root).filter((t) => t.closest('[data-tabs]') === root);
  const panels = $$('[data-tab-panel]', root).filter((p) => p.closest('[data-tabs]') === root);
  if (!list || !tabs.length) return;
  list.setAttribute('role', 'tablist');
  let indicator = list.querySelector('.tabs__indicator');
  if (!indicator && root.classList.contains('tabs')) {
    indicator = document.createElement('span');
    indicator.className = 'tabs__indicator';
    indicator.setAttribute('aria-hidden', 'true');
    list.appendChild(indicator);
  }
  tabs.forEach((tab) => {
    const id = tab.getAttribute('data-tab');
    const panel = panels.find((p) => p.getAttribute('data-tab-panel') === id);
    tab.id ||= uid('tab');
    tab.setAttribute('role', 'tab');
    tab.setAttribute('type', 'button');
    if (panel) {
      panel.id ||= uid('panel');
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.setAttribute('tabindex', '0');
      tab.setAttribute('aria-controls', panel.id);
    }
  });
  const moveIndicator = () => {
    const active = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
    if (!indicator || !active) return;
    const lr = list.getBoundingClientRect(), tr = active.getBoundingClientRect();
    const x = isRTL() ? tr.right - lr.right + list.scrollLeft : tr.left - lr.left + list.scrollLeft;
    indicator.style.setProperty('--tab-x', `${x}px`);
    indicator.style.setProperty('--tab-w', `${tr.width}px`);
  };
  const select = (tab, { focus = false, emit = true } = {}) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.setAttribute('tabindex', on ? '0' : '-1');
      const p = panels.find((x) => x.getAttribute('data-tab-panel') === t.getAttribute('data-tab'));
      if (p) {
        p.hidden = !on;
        if (on && emit) { p.classList.remove('is-entering'); void p.offsetWidth; p.classList.add('is-entering'); }
      }
    });
    if (focus) tab.focus({ preventScroll: true });
    if (emit) { // keep the active tab visible inside a horizontally scrolling tab list (never scroll the page)
      const lr = list.getBoundingClientRect(), tr = tab.getBoundingClientRect();
      if (tr.left < lr.left) list.scrollLeft -= lr.left - tr.left + 16;
      else if (tr.right > lr.right) list.scrollLeft += tr.right - lr.right + 16;
    }
    moveIndicator();
    if (emit) root.dispatchEvent(new CustomEvent('tabchange', { bubbles: true, detail: { id: tab.getAttribute('data-tab'), tab } }));
  };
  const initial = tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0];
  select(initial, { emit: false });
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      const i = tabs.indexOf(tab);
      let next = null;
      const fwd = isRTL() ? 'ArrowLeft' : 'ArrowRight';
      const back = isRTL() ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === fwd || e.key === 'ArrowDown' && list.getAttribute('aria-orientation') === 'vertical') next = tabs[(i + 1) % tabs.length];
      else if (e.key === back || e.key === 'ArrowUp' && list.getAttribute('aria-orientation') === 'vertical') next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') next = tabs[0];
      else if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); select(next, { focus: true }); }
    });
  });
  new ResizeObserver(moveIndicator).observe(list);
  onLang(() => requestAnimationFrame(moveIndicator));
  document.fonts?.ready?.then(moveIndicator);
  root.__selectTab = (id) => { const tab = tabs.find((t) => t.getAttribute('data-tab') === id); if (tab) select(tab); };
}

/* ======================================================================
   Accordion
   ====================================================================== */
function setupAccordion(root) {
  if (root.__acc) return;
  root.__acc = true;
  const single = root.getAttribute('data-accordion') === 'single';
  const items = $$('.accordion__item', root).filter((i) => i.closest('[data-accordion]') === root);
  const set = (item, open, emit = true) => {
    const trigger = item.querySelector('.accordion__trigger');
    item.classList.toggle('is-open', open);
    trigger?.setAttribute('aria-expanded', String(open));
    if (emit) root.dispatchEvent(new CustomEvent('accordionchange', { bubbles: true, detail: { item, open } }));
  };
  items.forEach((item) => {
    const trigger = item.querySelector('.accordion__trigger');
    const panel = item.querySelector('.accordion__panel');
    if (!trigger || !panel) return;
    trigger.id ||= uid('acc');
    panel.id ||= uid('accp');
    trigger.setAttribute('aria-controls', panel.id);
    trigger.setAttribute('type', 'button');
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', trigger.id);
    set(item, item.classList.contains('is-open') || trigger.getAttribute('aria-expanded') === 'true', false);
    trigger.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      if (single && open) items.forEach((other) => other !== item && other.classList.contains('is-open') && set(other, false));
      set(item, open);
    });
  });
}

/* ======================================================================
   Toast
   ====================================================================== */
let toastRegion;
/**
 * toast('Saved', { type: 'success'|'info'|'warning'|'error', duration: 4200 })
 * msg may be a string or {en, ar}. Returns { close }.
 */
export function toast(msg, { type = 'success', duration = 4200 } = {}) {
  if (!toastRegion) {
    toastRegion = document.createElement('div');
    toastRegion.className = 'toast-region';
    toastRegion.setAttribute('role', 'status');
    toastRegion.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastRegion);
  }
  const iconName = { success: 'circle-check', info: 'info', warning: 'triangle-alert', error: 'circle-alert' }[type] || 'info';
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  if (type === 'error') el.setAttribute('role', 'alert');
  el.innerHTML = `${icon(iconName)}<div class="toast__msg">${esc(t(msg))}</div>` +
    `<button class="toast__close" type="button" aria-label="${esc(t(S.close))}">${icon('x')}</button>`;
  toastRegion.appendChild(el);
  let timer;
  const close = () => {
    clearTimeout(timer);
    if (!el.isConnected || el.classList.contains('is-leaving')) return;
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), prefersReducedMotion() ? 0 : 340);
  };
  el.querySelector('.toast__close').addEventListener('click', close);
  if (duration) {
    timer = setTimeout(close, duration);
    el.addEventListener('pointerenter', () => clearTimeout(timer));
    el.addEventListener('pointerleave', () => { timer = setTimeout(close, 1800); });
  }
  return { close, el };
}

/* ======================================================================
   Copy to clipboard
   ====================================================================== */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;opacity:0;inset:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}
function initCopy() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy],[data-copy-target]');
    if (!btn) return;
    e.preventDefault();
    let text = btn.getAttribute('data-copy');
    if (!text && btn.hasAttribute('data-copy-target')) text = $(btn.getAttribute('data-copy-target'))?.textContent.trim();
    if (!text) return;
    const ok = await copyText(text);
    toast(ok ? S.copied : S.copyFail, { type: ok ? 'success' : 'error', duration: 2600 });
    btn.classList.add('is-copied');
    setTimeout(() => btn.classList.remove('is-copied'), 1600);
  });
}

/* ======================================================================
   Tooltips
   ====================================================================== */
let tip, tipTarget;
function showTip(el) {
  const text = getLang() === 'ar' ? el.getAttribute('data-ar-tooltip') || el.getAttribute('data-tooltip') : el.getAttribute('data-tooltip');
  if (!text) return;
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'tooltip';
    tip.id = 'tooltip';
    tip.setAttribute('role', 'tooltip');
    document.body.appendChild(tip);
  }
  tipTarget = el;
  tip.textContent = text;
  tip.classList.remove('is-below');
  tip.style.left = '0px'; tip.style.top = '0px'; tip.style.right = 'auto';
  const r = el.getBoundingClientRect();
  const tr = tip.getBoundingClientRect();
  let top = r.top - tr.height - 10;
  if (top < 8) { top = r.bottom + 10; tip.classList.add('is-below'); }
  let left = r.left + r.width / 2 - tr.width / 2;
  left = clamp(left, 8, window.innerWidth - tr.width - 8);
  // tooltip uses inset-inline-start; in RTL set physical coordinates explicitly
  tip.style.insetInlineStart = 'auto';
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
  const arrowX = r.left + r.width / 2 - left;
  tip.style.setProperty('--arrow-x', `${isRTL() ? tr.width - arrowX : arrowX}px`);
  el.setAttribute('aria-describedby', 'tooltip');
  requestAnimationFrame(() => tip.classList.add('is-visible'));
}
function hideTip() {
  if (!tip) return;
  tip.classList.remove('is-visible');
  tipTarget?.removeAttribute('aria-describedby');
  tipTarget = null;
}
let tipPressed = null; // element pressed with a pointer: its tooltip stays hidden until the pointer leaves it
function initTooltips() {
  document.addEventListener('pointerover', (e) => { const el = e.target.closest?.('[data-tooltip]'); if (el && el !== tipTarget && el !== tipPressed) showTip(el); });
  document.addEventListener('pointerout', (e) => {
    const el = e.target.closest?.('[data-tooltip]');
    if (el && !el.contains(e.relatedTarget)) { hideTip(); if (el === tipPressed) tipPressed = null; }
  });
  // pressing the trigger (e.g. a toolbar button that opens a modal) hides the tooltip; the focus that follows the
  // press does not bring it back
  document.addEventListener('pointerdown', (e) => { tipPressed = e.target.closest?.('[data-tooltip]') || null; hideTip(); }, true);
  document.addEventListener('focusin', (e) => { const el = e.target.closest?.('[data-tooltip]'); if (el && el !== tipPressed) showTip(el); });
  document.addEventListener('focusout', (e) => { if (e.target.closest?.('[data-tooltip]')) hideTip(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideTip(); });
  window.addEventListener('scroll', hideTip, { passive: true });
}

/* ======================================================================
   Chips (toggle groups)
   ====================================================================== */
function setupChips(group) {
  if (group.__chips) return;
  group.__chips = true;
  const mode = group.getAttribute('data-chip-group') || 'single';
  group.setAttribute('role', 'group');
  const chips = $$('.chip, [data-value]', group).filter((c) => c.tagName === 'BUTTON');
  chips.forEach((c) => { c.setAttribute('type', 'button'); if (!c.hasAttribute('aria-pressed')) c.setAttribute('aria-pressed', 'false'); });
  group.addEventListener('click', (e) => {
    const chip = e.target.closest('button');
    if (!chip || !chips.includes(chip)) return;
    if (mode === 'single') chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    else {
      const all = chip.getAttribute('data-value') === 'all';
      if (all) chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      else {
        chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true'));
        chips.filter((c) => c.getAttribute('data-value') === 'all').forEach((c) => c.setAttribute('aria-pressed', 'false'));
        if (!chips.some((c) => c.getAttribute('aria-pressed') === 'true')) chips.find((c) => c.getAttribute('data-value') === 'all')?.setAttribute('aria-pressed', 'true');
      }
    }
    const values = chips.filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.getAttribute('data-value'));
    group.dispatchEvent(new CustomEvent('chipchange', { bubbles: true, detail: { values, chip } }));
  });
}

/* ======================================================================
   Range inputs (fill + output)
   ====================================================================== */
// Output text: data-prefix / data-suffix, localised with data-ar-prefix / data-ar-suffix (re-rendered on langchange).
// data-format="none" leaves the <output> to the page (core only updates the fill).
function setupRange(input) {
  if (input.__range) return;
  input.__range = true;
  const out = input.closest('.range')?.querySelector('.range__value, output');
  const manual = input.getAttribute('data-format') === 'none';
  const affix = (name) => (getLang() === 'ar' && input.hasAttribute(`data-ar-${name}`) ? input.getAttribute(`data-ar-${name}`) : input.getAttribute(`data-${name}`)) || '';
  const update = () => {
    const min = parseFloat(input.min || 0), max = parseFloat(input.max || 100);
    const pct = ((parseFloat(input.value) - min) / (max - min)) * 100;
    input.style.setProperty('--val', `${pct}%`);
    if (out && !manual) out.textContent = `${affix('prefix')}${input.value}${affix('suffix')}`;
  };
  input.addEventListener('input', update);
  if (!manual && (input.hasAttribute('data-ar-prefix') || input.hasAttribute('data-ar-suffix'))) onLang(update);
  update();
}

/* ======================================================================
   Compare slider
   ====================================================================== */
function setupCompare(root) {
  if (root.__compare) return;
  root.__compare = true;
  let pos = clamp(parseFloat(root.getAttribute('data-compare')) || 50, 0, 100);
  let handle = root.querySelector('.compare__handle');
  if (!handle) {
    handle = h(`<div class="compare__handle"><span class="compare__knob">${icon('chevron-left', 'icon--xs')}${icon('chevron-right', 'icon--xs')}</span></div>`);
    root.appendChild(handle);
  }
  handle.setAttribute('role', 'slider');
  handle.setAttribute('tabindex', '0');
  handle.setAttribute('aria-valuemin', '0');
  handle.setAttribute('aria-valuemax', '100');
  if (!handle.hasAttribute('aria-label')) handle.setAttribute('aria-label', t(S.sliderLabel));
  const set = (v) => {
    pos = clamp(v, 0, 100);
    root.style.setProperty('--pos', `${pos}%`);
    handle.setAttribute('aria-valuenow', String(Math.round(pos)));
    handle.setAttribute('aria-valuetext', `${Math.round(pos)}%`);
  };
  const fromEvent = (e) => {
    const r = root.getBoundingClientRect();
    const x = isRTL() ? r.right - e.clientX : e.clientX - r.left;
    return (x / r.width) * 100;
  };
  let dragging = false;
  root.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    root.classList.add('is-dragging');
    root.setPointerCapture(e.pointerId);
    set(fromEvent(e));
  });
  root.addEventListener('pointermove', (e) => { if (dragging) { e.preventDefault(); set(fromEvent(e)); } });
  const end = () => { dragging = false; root.classList.remove('is-dragging'); };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);
  handle.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 10 : 2;
    const right = isRTL() ? -step : step;
    const map = { ArrowRight: right, ArrowLeft: -right, ArrowUp: step, ArrowDown: -step, PageUp: 10, PageDown: -10 };
    if (e.key in map) { e.preventDefault(); set(pos + map[e.key]); }
    if (e.key === 'Home') { e.preventDefault(); set(0); }
    if (e.key === 'End') { e.preventDefault(); set(100); }
  });
  onLang(() => { if (!handle.hasAttribute('data-ar-aria-label')) handle.setAttribute('aria-label', t(S.sliderLabel)); });
  set(pos);
}

/* ======================================================================
   Carousel
   ====================================================================== */
function setupCarousel(root) {
  if (root.__carousel) return;
  root.__carousel = true;
  const vp = root.querySelector('[data-carousel-track], .carousel__viewport');
  if (!vp) return;
  const prev = root.querySelector('[data-carousel-prev]');
  const next = root.querySelector('[data-carousel-next]');
  const bar = root.querySelector('.carousel__progress');
  const count = root.querySelector('.carousel__count');
  const slides = () => $$('.carousel__slide', vp);
  if (!vp.hasAttribute('tabindex')) vp.setAttribute('tabindex', '0');
  if (!vp.hasAttribute('role')) vp.setAttribute('role', 'region');
  vp.setAttribute('aria-roledescription', 'carousel');

  const step = () => {
    const s = slides();
    if (s.length < 2) return vp.clientWidth * 0.8;
    return Math.abs(s[1].getBoundingClientRect().left - s[0].getBoundingClientRect().left);
  };
  const maxScroll = () => Math.max(0, vp.scrollWidth - vp.clientWidth);
  const update = () => {
    const max = maxScroll();
    const x = Math.abs(vp.scrollLeft);
    const p = max ? (x + vp.clientWidth) / vp.scrollWidth : 1;
    bar?.style.setProperty('--progress', clamp(p, 0, 1).toFixed(3));
    if (prev) prev.disabled = x <= 2;
    if (next) next.disabled = x >= max - 2;
    if (count) {
      const total = slides().length;
      const i = max ? Math.min(total, Math.round(x / step()) + 1) : 1;
      const pad = (n) => String(n).padStart(2, '0');
      count.textContent = `${pad(x >= max - 2 ? total : i)} / ${pad(total)}`;
    }
  };
  const go = (dir) => {
    const d = isRTL() ? -dir : dir;
    vp.scrollBy({ left: d * step(), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };
  prev?.addEventListener('click', () => go(-1));
  next?.addEventListener('click', () => go(1));
  vp.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  new ResizeObserver(update).observe(vp);

  // mouse drag with inertia (touch uses native scrolling)
  let down = false, moved = false, startX = 0, startScroll = 0, lastX = 0, lastT = 0, vel = 0, raf = 0, glideEnd = 0;
  const snapToNearest = () => {
    const vr = vp.getBoundingClientRect();
    let best = null, bestD = Infinity;
    for (const s of slides()) {
      const r = s.getBoundingClientRect();
      const d = isRTL() ? vr.right - r.right : r.left - vr.left;
      if (Math.abs(d) < Math.abs(bestD)) { bestD = d; best = s; }
    }
    // keep scroll-snap off (.is-gliding) until the smooth snap has finished: re-enabling mandatory snap while the
    // smooth scrollBy is in flight makes Chrome re-snap to the previously snapped slide (drag "snaps back").
    clearTimeout(glideEnd);
    const done = () => { clearTimeout(glideEnd); vp.removeEventListener('scrollend', done); vp.classList.remove('is-gliding'); };
    if (!best || Math.abs(bestD) < 1) { done(); return; }
    vp.addEventListener('scrollend', done, { once: true });
    glideEnd = setTimeout(done, 900);
    vp.scrollBy({ left: isRTL() ? -bestD : bestD, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };
  vp.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    cancelAnimationFrame(raf);
    clearTimeout(glideEnd);
    down = true; moved = false;
    startX = lastX = e.clientX; startScroll = vp.scrollLeft; lastT = performance.now(); vel = 0;
  });
  vp.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) > 5) { moved = true; vp.classList.add('is-dragging'); vp.setPointerCapture(e.pointerId); }
    if (!moved) return;
    e.preventDefault();
    vp.scrollLeft = startScroll - dx;
    const now = performance.now();
    vel = (e.clientX - lastX) / Math.max(1, now - lastT) * 16;
    lastX = e.clientX; lastT = now;
  });
  const release = () => {
    if (!down) return;
    down = false;
    if (!moved) return;
    vp.classList.remove('is-dragging');
    vp.classList.add('is-gliding');
    let v = vel;
    const glide = () => {
      v *= 0.92;
      vp.scrollLeft -= v;
      if (Math.abs(v) > 0.6) raf = requestAnimationFrame(glide);
      else snapToNearest();
    };
    if (prefersReducedMotion()) snapToNearest(); else raf = requestAnimationFrame(glide);
  };
  vp.addEventListener('pointerup', release);
  vp.addEventListener('pointercancel', release);
  vp.addEventListener('lostpointercapture', release);
  vp.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  vp.addEventListener('dragstart', (e) => e.preventDefault());
  vp.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      go(isRTL() ? -dir : dir);
    }
  });
  onLang(() => requestAnimationFrame(update));
  update();
}

/* ======================================================================
   Forms: validation
   ====================================================================== */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function wrapperOf(el) { return el.closest('.field, .check, .dropzone') || el.parentElement; }
/** All radios of el's group (same name, same form/document); [el] for anything else. */
function groupOf(el) {
  if (el.type !== 'radio' || !el.name) return [el];
  const scope = el.form || el.closest('form') || document;
  return $$(`input[type=radio][name="${CSS.escape(el.name)}"]`, scope);
}
// The message element for a control. A .check (checkbox/radio label) puts its message next to the label, in the
// label's parent, tagged data-for="<name>" so that one message serves the whole radio group and each checkbox keeps
// exactly one (no duplicates on repeated validation).
function errorEl(el) {
  if (el.__err?.isConnected) return el.__err;
  const w = wrapperOf(el);
  let err;
  if (w.classList.contains('check')) {
    const host = w.parentElement;
    const key = el.name || el.id || '';
    err = $$(':scope > .field__error', host).find((x) => (x.getAttribute('data-for') || '') === key);
    if (!err) {
      err = document.createElement('p');
      err.className = 'field__error';
      err.setAttribute('data-for', key);
      host.appendChild(err);
    }
  } else {
    err = w.querySelector('.field__error');
    if (!err) {
      err = document.createElement('p');
      err.className = 'field__error';
      w.appendChild(err);
    }
  }
  err.id ||= uid('err');
  el.__err = err;
  return err;
}
function ruleFor(el) {
  if (el.disabled || el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return null;
  const v = el.type === 'checkbox' || el.type === 'radio' ? null : (el.value || '').trim();
  if (el.required) {
    if (el.type === 'checkbox' && !el.checked) return { key: 'requiredCheck' };
    if (el.type === 'radio') {
      const group = el.form ? $$(`input[type=radio][name="${CSS.escape(el.name)}"]`, el.form) : [el];
      if (!group.some((r) => r.checked)) return { key: 'requiredSelect' };
    }
    if (el.type === 'file' && !el.files?.length) return { key: 'requiredFile' };
    if (el.tagName === 'SELECT' && !v) return { key: 'requiredSelect' };
    if (v === '' && el.type !== 'checkbox' && el.type !== 'radio' && el.type !== 'file') return { key: 'required' };
  }
  if (!v) return null;
  if (el.type === 'email' && !EMAIL_RE.test(v)) return { key: 'email' };
  if (el.type === 'tel' || el.getAttribute('data-type') === 'phone') {
    const digits = v.replace(/\D/g, '');
    if (!/^[+\d\s().-]+$/.test(v) || digits.length < 7 || digits.length > 15) return { key: 'phone' };
  }
  const min = parseInt(el.getAttribute('minlength'), 10);
  if (min && v.length < min) return { key: 'minlength', vars: { n: min } };
  const pattern = el.getAttribute('pattern');
  if (pattern) { try { if (!new RegExp(`^(?:${pattern})$`).test(v)) return { key: 'pattern' }; } catch { /* ignore */ } }
  const match = el.getAttribute('data-match');
  if (match && el.form && v !== (el.form.querySelector(match)?.value || '').trim()) return { key: 'match' };
  return null;
}
function messageFor(el, rule) {
  const lang = getLang();
  const custom = lang === 'ar' ? el.getAttribute('data-ar-error') : el.getAttribute('data-error');
  if (custom) return custom;
  return fmt(S[rule.key][lang] || S[rule.key].en, rule.vars || {});
}
function showFieldState(el, rule) {
  const w = wrapperOf(el);
  const err = errorEl(el);
  el.__rule = rule;
  if (rule) {
    w.classList.add('is-invalid');
    w.classList.remove('is-valid');
    el.setAttribute('aria-invalid', 'true');
    err.innerHTML = `${icon('circle-alert', 'icon--xs')}<span>${esc(messageFor(el, rule))}</span>`;
    const ids = new Set((el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    ids.add(err.id);
    el.setAttribute('aria-describedby', [...ids].join(' '));
  } else {
    w.classList.remove('is-invalid');
    el.removeAttribute('aria-invalid');
    err.textContent = '';
    if ((el.value || '').trim() && el.type !== 'checkbox' && el.type !== 'radio' && el.type !== 'file' && w.classList.contains('field')) w.classList.add('is-valid');
    else w.classList.remove('is-valid');
  }
}
function validateField(el) {
  const rule = ruleFor(el);
  // a radio group is one control: every radio gets the same state (no stale aria-invalid / errors on siblings)
  groupOf(el).forEach((r) => showFieldState(r, rule));
  return !rule;
}
const controlsOf = (form) => $$('input, select, textarea', form).filter((el) => el.name && !el.closest('[data-novalidate]'));

/**
 * Validate every named control inside `form` — any container works, e.g. one step of a multi-step form:
 * validateForm(stepEl). Shows inline errors, focuses the first invalid control, returns true when valid.
 * Controls inside [data-novalidate] are skipped.
 */
export function validateForm(form) {
  let firstBad = null;
  for (const el of controlsOf(form)) {
    if (!validateField(el) && !firstBad) firstBad = el;
  }
  if (firstBad) {
    const target = firstBad.closest('.dropzone')?.querySelector('.dropzone__area') && firstBad.type === 'file' ? firstBad : firstBad;
    target.focus({ preventScroll: false });
    return false;
  }
  return true;
}
function serialize(form) {
  const fd = new FormData(form);
  const data = {};
  for (const [k, v] of fd.entries()) {
    const val = v instanceof File ? (v.name ? { name: v.name, size: v.size, type: v.type } : null) : v;
    if (val === null) continue;
    if (k in data) data[k] = [].concat(data[k], val);
    else data[k] = val;
  }
  return { data, formData: fd };
}
function setupForm(form) {
  if (form.__validate) return;
  form.__validate = true;
  form.setAttribute('novalidate', '');
  form.addEventListener('focusout', (e) => {
    const el = e.target;
    if (!el.name || !controlsOf(form).includes(el)) return;
    if ((el.value || '').trim() || el.__rule) validateField(el);
  });
  form.addEventListener('input', (e) => { if (e.target.__rule !== undefined && e.target.__rule) validateField(e.target); });
  form.addEventListener('change', (e) => { if (['checkbox', 'radio', 'file'].includes(e.target.type) || e.target.tagName === 'SELECT') validateField(e.target); });
  // data-validate="manual": inline validation only (focusout / input / change / langchange) — the page handles
  // submit itself (e.g. a wizard calling validateForm(step)).
  if (form.getAttribute('data-validate') !== 'manual') form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateForm(form)) {
      if (controlsOf(form).filter((c) => c.__rule).length > 1) toast(S.fixErrors, { type: 'error', duration: 3200 });
      return;
    }
    const { data, formData } = serialize(form);
    const ev = new CustomEvent('validsubmit', { bubbles: true, cancelable: true, detail: { data, formData, form } });
    form.dispatchEvent(ev);
    const msg = form.getAttribute('data-toast');
    if (msg && !ev.defaultPrevented) {
      toast({ en: msg, ar: form.getAttribute('data-ar-toast') || msg });
      form.reset();
    }
  });
  form.addEventListener('reset', () => {
    setTimeout(() => {
      controlsOf(form).forEach((el) => { el.__rule = undefined; showFieldState(el, null); wrapperOf(el).classList.remove('is-valid'); });
      $$('[data-dropzone]', form).forEach((dz) => dz.__render?.());
      $$('.range__input', form).forEach((r) => r.dispatchEvent(new Event('input')));
    });
  });
  onLang(() => controlsOf(form).forEach((el) => { if (el.__rule) showFieldState(el, el.__rule); }));
}

/* ======================================================================
   Dropzone
   ====================================================================== */
function setupDropzone(dz) {
  if (dz.__dz) return;
  dz.__dz = true;
  const input = dz.querySelector('input[type=file]');
  const area = dz.querySelector('.dropzone__area');
  if (!input || !area) return;
  let list = dz.querySelector('.dropzone__list');
  if (!list) { list = document.createElement('ul'); list.className = 'dropzone__list'; dz.appendChild(list); }
  const maxSize = parseFloat(dz.getAttribute('data-max-size') || '10');
  const maxFiles = parseInt(dz.getAttribute('data-max-files') || (input.multiple ? '5' : '1'), 10);
  const accept = (input.getAttribute('accept') || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  let files = [];
  const okType = (f) => !accept.length || accept.some((a) => (a.startsWith('.') ? f.name.toLowerCase().endsWith(a) : a.endsWith('/*') ? f.type.startsWith(a.slice(0, -1)) : f.type === a));
  const sync = () => {
    try {
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      input.files = dt.files;
    } catch { /* older browsers: keep native selection */ }
  };
  const render = () => {
    list.innerHTML = files.map((f, i) => `<li class="dropzone__file">${icon('file-text')}<span class="dropzone__file-name">${esc(f.name)}</span>` +
      `<span class="dropzone__file-size">${formatBytes(f.size)}</span>` +
      `<button type="button" class="dropzone__remove" data-i="${i}" aria-label="${esc(t(S.removeFile))}: ${esc(f.name)}">${icon('x', 'icon--sm')}</button></li>`).join('');
  };
  dz.__render = () => { files = Array.from(input.files || []); render(); };
  const add = (incoming) => {
    const errors = [];
    for (const f of incoming) {
      if (!okType(f)) { errors.push(fmt(t(S.fileType), { f: f.name })); continue; }
      if (f.size > maxSize * 1024 * 1024) { errors.push(fmt(t(S.fileSize), { f: f.name, n: maxSize })); continue; }
      if (!input.multiple) files = [f];
      else if (files.length >= maxFiles) { errors.push(fmt(t(S.fileCount), { n: maxFiles })); break; }
      else if (!files.some((x) => x.name === f.name && x.size === f.size)) files.push(f);
    }
    errors.forEach((m) => toast(m, { type: 'error' }));
    sync();
    render();
    notify();
  };
  let internal = false;
  const notify = () => { internal = true; input.dispatchEvent(new Event('change', { bubbles: true })); internal = false; };
  input.addEventListener('change', () => {
    if (internal) return; // our own re-dispatch after syncing files
    const picked = Array.from(input.files || []);
    if (!input.multiple) files = [];
    add(picked);
  });
  ['dragenter', 'dragover'].forEach((ev) => area.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('is-dragover'); }));
  ['dragleave', 'dragend'].forEach((ev) => area.addEventListener(ev, (e) => { if (!area.contains(e.relatedTarget)) dz.classList.remove('is-dragover'); }));
  area.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('is-dragover');
    if (e.dataTransfer?.files?.length) add(Array.from(e.dataTransfer.files));
  });
  list.addEventListener('click', (e) => {
    const b = e.target.closest('.dropzone__remove');
    if (!b) return;
    files.splice(parseInt(b.dataset.i, 10), 1);
    sync();
    render();
    notify();
    input.focus();
  });
  onLang(render);
}

/* ======================================================================
   Lightbox
   ====================================================================== */
const LB = { el: null, items: [], index: 0, s: 1, tx: 0, ty: 0, layer: null, frame: null, slide: null };

function lbApply(animate = false) {
  if (!LB.frame) return;
  LB.frame.style.transition = animate ? 'transform .45s cubic-bezier(.16,1,.3,1)' : 'none';
  LB.frame.style.transform = `translate3d(${LB.tx}px, ${LB.ty}px, 0) scale(${LB.s})`;
  LB.el.querySelector('.lightbox__stage').classList.toggle('is-zoomed', LB.s > 1.01);
  const zi = LB.el.querySelector('[data-lb-zoom-in]'), zo = LB.el.querySelector('[data-lb-zoom-out]');
  if (zi) zi.disabled = LB.s >= 4;
  if (zo) zo.disabled = LB.s <= 1;
}
function lbClamp() {
  if (!LB.frame) return;
  const stage = LB.el.querySelector('.lightbox__stage').getBoundingClientRect();
  const w = LB.frame.offsetWidth * LB.s, ht = LB.frame.offsetHeight * LB.s;
  const mx = Math.max(0, (w - stage.width) / 2), my = Math.max(0, (ht - stage.height) / 2);
  LB.tx = clamp(LB.tx, -mx, mx);
  LB.ty = clamp(LB.ty, -my, my);
}
function lbZoomAt(newS, clientX, clientY, animate = true) {
  newS = clamp(newS, 1, 4);
  if (!LB.frame) return;
  const stage = LB.el.querySelector('.lightbox__stage').getBoundingClientRect();
  const cx = stage.left + stage.width / 2, cy = stage.top + stage.height / 2;
  const px = (clientX ?? cx) - cx, py = (clientY ?? cy) - cy;
  const k = newS / LB.s;
  LB.tx = px - (px - LB.tx) * k;
  LB.ty = py - (py - LB.ty) * k;
  LB.s = newS;
  if (LB.s === 1) { LB.tx = 0; LB.ty = 0; }
  lbClamp();
  lbApply(animate);
}
function lbRender(dir = 0) {
  const item = LB.items[LB.index];
  const stage = LB.el.querySelector('.lightbox__stage');
  const old = LB.slide;
  const slide = document.createElement('div');
  slide.className = 'lightbox__slide';
  const alt = esc(t(item.alt) || t(item.caption) || '');
  const img = item.srcWebp
    ? `<picture><source type="image/webp" srcset="${esc(item.srcWebp)}"><img src="${esc(item.src)}" alt="${alt}" draggable="false"></picture>`
    : `<img src="${esc(item.src)}" alt="${alt}" draggable="false">`;
  slide.innerHTML = `<div class="lightbox__frame">${img}</div><span class="lightbox__loader" aria-hidden="true"></span>`;
  const imgEl = slide.querySelector('img');
  const loaded = () => slide.querySelector('.lightbox__loader')?.remove();
  if (imgEl.complete) loaded(); else { imgEl.addEventListener('load', loaded); imgEl.addEventListener('error', loaded); }
  stage.appendChild(slide);
  LB.slide = slide;
  LB.frame = slide.querySelector('.lightbox__frame');
  LB.s = 1; LB.tx = 0; LB.ty = 0;
  lbApply();
  const reduce = prefersReducedMotion();
  const sign = isRTL() ? -1 : 1;
  if (old) {
    if (reduce || !dir) old.remove();
    else {
      old.animate([{ transform: old.style.transform || 'none', opacity: 1 }, { transform: `translateX(${-dir * sign * 18}%)`, opacity: 0 }], { duration: 450, easing: 'cubic-bezier(.16,1,.3,1)' }).onfinish = () => old.remove();
    }
  }
  if (!reduce && dir) slide.animate([{ transform: `translateX(${dir * sign * 18}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 550, easing: 'cubic-bezier(.16,1,.3,1)' });
  const pad = (n) => String(n).padStart(2, '0');
  LB.el.querySelector('.lightbox__counter').innerHTML = `<b>${pad(LB.index + 1)}</b> / ${pad(LB.items.length)}`;
  LB.el.querySelector('.lightbox__caption').textContent = t(item.caption) || '';
  const multi = LB.items.length > 1;
  LB.el.querySelectorAll('.lightbox__nav').forEach((b) => { b.hidden = !multi; });
  // preload neighbours
  [LB.index + 1, LB.index - 1].forEach((i) => {
    const it = LB.items[(i + LB.items.length) % LB.items.length];
    if (it) { const p = new Image(); p.src = it.src; }
  });
}
// Re-apply every language-dependent string of an open lightbox (called on langchange).
function lbLocalize() {
  if (!LB.el) return;
  const item = LB.items[LB.index];
  const set = (sel, key) => LB.el.querySelector(sel)?.setAttribute('aria-label', t(S[key]));
  LB.el.setAttribute('aria-label', t(S.viewer));
  set('[data-lb-zoom-out]', 'zoomOut');
  set('[data-lb-zoom-in]', 'zoomIn');
  set('[data-lb-close]', 'close');
  set('[data-lb-prev]', 'prev');
  set('[data-lb-next]', 'next');
  const hint = LB.el.querySelector('.lightbox__hint');
  if (hint) hint.textContent = t(S.lbHint);
  if (item) {
    LB.el.querySelector('.lightbox__caption').textContent = t(item.caption) || '';
    const img = LB.slide?.querySelector('img');
    if (img) img.alt = t(item.alt) || t(item.caption) || '';
  }
}
function lbGo(delta) {
  if (LB.items.length < 2) return;
  LB.index = (LB.index + delta + LB.items.length) % LB.items.length;
  lbRender(delta);
}

/**
 * Open the lightbox.
 * items: [{ src, srcWebp?, alt?: string|{en,ar}, caption?: string|{en,ar} }], index: start index.
 */
export function openLightbox(items, index = 0) {
  if (!items?.length) return;
  if (LB.el) closeLightbox(true);
  LB.items = items;
  LB.index = clamp(index, 0, items.length - 1);
  const el = h(`<div class="lightbox" role="dialog" aria-modal="true" aria-label="${esc(t(S.viewer))}">
    <div class="lightbox__bar">
      <span class="lightbox__counter" aria-live="polite"></span>
      <div class="lightbox__tools">
        <button type="button" class="icon-btn icon-btn--sm" data-lb-zoom-out aria-label="${esc(t(S.zoomOut))}">${icon('zoom-out')}</button>
        <button type="button" class="icon-btn icon-btn--sm" data-lb-zoom-in aria-label="${esc(t(S.zoomIn))}">${icon('zoom-in')}</button>
        <button type="button" class="icon-btn icon-btn--sm" data-lb-close aria-label="${esc(t(S.close))}">${icon('x')}</button>
      </div>
    </div>
    <div class="lightbox__stage"></div>
    <button type="button" class="icon-btn lightbox__nav lightbox__nav--prev" data-lb-prev aria-label="${esc(t(S.prev))}">${icon('chevron-left', 'icon--dir')}</button>
    <button type="button" class="icon-btn lightbox__nav lightbox__nav--next" data-lb-next aria-label="${esc(t(S.next))}">${icon('chevron-right', 'icon--dir')}</button>
    <div class="lightbox__foot"><p class="lightbox__caption"></p><span class="lightbox__hint">${esc(t(S.lbHint))}</span></div>
  </div>`);
  document.body.appendChild(el);
  LB.el = el;
  LB.layer = { el, close: () => closeLightbox(), returnTo: document.activeElement };
  pushLayer(LB.layer);
  lbRender(0);
  requestAnimationFrame(() => el.classList.add('is-open'));
  setTimeout(() => el.querySelector('[data-lb-close]').focus({ preventScroll: true }), 50);

  el.querySelector('[data-lb-close]').addEventListener('click', () => closeLightbox());
  el.querySelector('[data-lb-prev]').addEventListener('click', () => lbGo(-1));
  el.querySelector('[data-lb-next]').addEventListener('click', () => lbGo(1));
  el.querySelector('[data-lb-zoom-in]').addEventListener('click', () => lbZoomAt(LB.s * 1.6));
  el.querySelector('[data-lb-zoom-out]').addEventListener('click', () => lbZoomAt(LB.s / 1.6));
  el.addEventListener('keydown', (e) => {
    const fwd = isRTL() ? 'ArrowLeft' : 'ArrowRight';
    const back = isRTL() ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === fwd) { e.preventDefault(); lbGo(1); }
    else if (e.key === back) { e.preventDefault(); lbGo(-1); }
    else if (e.key === '+' || e.key === '=') lbZoomAt(LB.s * 1.6);
    else if (e.key === '-') lbZoomAt(LB.s / 1.6);
    else if (e.key === '0') lbZoomAt(1);
    else if (e.key === 'Home') { LB.index = 0; lbRender(-1); }
    else if (e.key === 'End') { LB.index = LB.items.length - 1; lbRender(1); }
  });
  const stage = el.querySelector('.lightbox__stage');
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    lbZoomAt(LB.s * Math.exp(-e.deltaY * 0.0022), e.clientX, e.clientY, false);
  }, { passive: false });
  stage.addEventListener('dblclick', (e) => lbZoomAt(LB.s > 1.01 ? 1 : 2.5, e.clientX, e.clientY));
  // pointer: pan / swipe / pinch
  const pts = new Map();
  let start = null, pinch = null, lastTap = 0;
  stage.addEventListener('pointerdown', (e) => {
    stage.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: LB.s };
      start = null;
    } else if (pts.size === 1) {
      start = { x: e.clientX, y: e.clientY, tx: LB.tx, ty: LB.ty, t: performance.now() };
      if (e.pointerType === 'touch') {
        const now = performance.now();
        if (now - lastTap < 280) { lbZoomAt(LB.s > 1.01 ? 1 : 2.5, e.clientX, e.clientY); start = null; }
        lastTap = now;
      }
    }
  });
  stage.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pts.size === 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      lbZoomAt(pinch.s * (d / pinch.d), (a.x + b.x) / 2, (a.y + b.y) / 2, false);
      return;
    }
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (LB.s > 1.01) { LB.tx = start.tx + dx; LB.ty = start.ty + dy; lbClamp(); lbApply(); }
    else if (LB.items.length > 1) { LB.slide.style.transform = `translate3d(${dx}px,0,0)`; LB.slide.style.opacity = String(1 - Math.min(0.5, Math.abs(dx) / 800)); }
  });
  const up = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (!start || pts.size) { start = null; return; }
    const dx = e.clientX - start.x;
    const fast = Math.abs(dx) / Math.max(1, performance.now() - start.t) > 0.5;
    if (LB.s <= 1.01 && LB.items.length > 1 && (Math.abs(dx) > 80 || (fast && Math.abs(dx) > 30))) {
      const forward = isRTL() ? dx > 0 : dx < 0;
      LB.slide.style.transform = ''; LB.slide.style.opacity = '';
      lbGo(forward ? 1 : -1);
    } else if (LB.s <= 1.01 && LB.slide) {
      LB.slide.animate([{ transform: LB.slide.style.transform || 'none' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.16,1,.3,1)' });
      LB.slide.style.transform = ''; LB.slide.style.opacity = '';
    }
    start = null;
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
}

export function closeLightbox(immediate = false) {
  const el = LB.el;
  if (!el) return;
  const layer = LB.layer;
  LB.el = null; LB.frame = null; LB.slide = null; LB.layer = null;
  popLayer(layer);
  if (immediate) el.remove();
  else transitionOut(el, 'is-open', () => el.remove());
  if (layer?.returnTo?.isConnected) layer.returnTo.focus({ preventScroll: true });
}

function initLightboxLinks() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-lightbox]');
    if (!a || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    const group = a.getAttribute('data-lightbox');
    const links = group ? $$(`[data-lightbox="${CSS.escape(group)}"]`) : [a];
    const items = links.map((l) => ({
      src: l.getAttribute('href') || l.getAttribute('data-src'),
      srcWebp: l.getAttribute('data-webp') || undefined,
      alt: { en: l.querySelector('img')?.getAttribute('alt') || '', ar: l.querySelector('img')?.getAttribute('alt') || '' },
      caption: { en: l.getAttribute('data-caption') || '', ar: l.getAttribute('data-ar-caption') || l.getAttribute('data-caption') || '' },
    }));
    openLightbox(items, links.indexOf(a));
  });
}

/* ======================================================================
   Init / scan
   ====================================================================== */
/** Wire every declarative component inside `root` (idempotent). Call after inserting DOM. */
export function scanUI(root = document) {
  $$('[data-tabs]', root).forEach(setupTabs);
  $$('[data-accordion]', root).forEach(setupAccordion);
  $$('[data-chip-group]', root).forEach(setupChips);
  $$('.range__input', root).forEach(setupRange);
  $$('[data-compare]', root).forEach(setupCompare);
  $$('[data-carousel]', root).forEach(setupCarousel);
  $$('form[data-validate]', root).forEach(setupForm);
  $$('[data-dropzone]', root).forEach(setupDropzone);
  $$('[data-modal]', root).forEach((m) => { if (!m.classList.contains('is-open')) m.hidden = true; });
  $$('[data-drawer]', root).forEach((m) => { if (!m.classList.contains('is-open')) m.hidden = true; });
  if (root !== document) localize(root);
}

export function initUI() {
  if (initialized) return;
  initialized = true;
  initPanels();
  initCopy();
  initTooltips();
  initLightboxLinks();
  onLang(lbLocalize);
  scanUI(document);
}
