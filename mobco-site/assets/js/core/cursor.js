// MOBCO core/cursor.js: custom cursor (dot + lagging ring) for fine pointers only.
// States: hovering links/buttons → .cursor-link; [data-cursor="view|drag|open|play|zoom|explore"] → the ring grows
// into a teal disc with a thin-stroke icon (no words). data-cursor-label is ignored here: the cursor is decorative
// (aria-hidden), so targets must carry their own accessible name. Disabled for touch, reduced motion and ?qa=1.

import { hasFinePointer, prefersReducedMotion, lerp } from './utils.js';

// 24×24 stroke icons (drawn with currentColor)
const ICONS = {
  drag: '<path d="M3 12h18"/><path d="M7 8l-4 4 4 4"/><path d="M17 8l4 4-4 4"/>',
  view: '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
  zoom: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  play: '<path d="M8.5 5.5v13l10.5-6.5z"/>',
};
const KEY_ICON = { drag: 'drag', view: 'view', open: 'view', explore: 'view', zoom: 'zoom', play: 'play' };
const INTERACTIVE = 'a[href], button, [role="button"], label[for], select, summary, input[type="checkbox"], input[type="radio"], input[type="range"], [data-tooltip]';
let initialized = false;

export function initCursor() {
  if (initialized || !hasFinePointer() || prefersReducedMotion()) return;
  initialized = true;
  const html = document.documentElement;
  const dot = document.createElement('div');
  dot.className = 'cursor';
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  ring.innerHTML = '<div class="cursor-ring__inner"><svg class="cursor-ring__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" focusable="false"></svg></div>';
  dot.setAttribute('aria-hidden', 'true');
  ring.setAttribute('aria-hidden', 'true');
  document.body.append(ring, dot);
  html.classList.add('has-cursor');
  const icon = ring.querySelector('.cursor-ring__icon');
  let currentIcon = '';

  let x = -100, y = -100, rx = -100, ry = -100, running = false;
  const loop = () => {
    rx = lerp(rx, x, 0.2);
    ry = lerp(ry, y, 0.2);
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    ring.style.transform = `translate3d(${rx.toFixed(2)}px, ${ry.toFixed(2)}px, 0)`;
    if (Math.abs(rx - x) > 0.1 || Math.abs(ry - y) > 0.1) requestAnimationFrame(loop);
    else running = false;
  };
  const kick = () => { if (!running) { running = true; requestAnimationFrame(loop); } };

  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (!html.classList.contains('cursor-visible')) { rx = e.clientX; ry = e.clientY; }
    x = e.clientX; y = e.clientY;
    html.classList.add('cursor-visible');
    kick();
  }, { passive: true });
  document.addEventListener('pointerdown', () => html.classList.add('cursor-down'));
  document.addEventListener('pointerup', () => html.classList.remove('cursor-down'));
  document.documentElement.addEventListener('pointerleave', () => html.classList.remove('cursor-visible'));
  window.addEventListener('blur', () => html.classList.remove('cursor-visible'));

  document.addEventListener('pointerover', (e) => {
    const special = e.target.closest?.('[data-cursor]');
    if (special) {
      const name = KEY_ICON[special.getAttribute('data-cursor')] || 'view';
      if (name !== currentIcon) {
        icon.innerHTML = ICONS[name];
        icon.setAttribute('data-icon', name);
        currentIcon = name;
      }
      html.classList.add('cursor-label');
      html.classList.remove('cursor-link');
      return;
    }
    html.classList.remove('cursor-label');
    html.classList.toggle('cursor-link', !!e.target.closest?.(INTERACTIVE));
  });
}
