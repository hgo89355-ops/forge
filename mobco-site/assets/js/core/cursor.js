// MOBCO core/cursor.js — custom cursor (dot + lagging ring) for fine pointers only.
// States: hovering links/buttons → .cursor-link; [data-cursor="view|drag|open|play|zoom"] → label bubble.
// Custom label: data-cursor-label="…" (+ data-ar-cursor-label). Disabled for touch, reduced motion and ?qa=1.

import { hasFinePointer, prefersReducedMotion, lerp } from './utils.js';
import { t } from './i18n.js';

const LABELS = {
  view: { en: 'View', ar: 'عرض' },
  drag: { en: 'Drag', ar: 'اسحب' },
  open: { en: 'Open', ar: 'افتح' },
  play: { en: 'Play', ar: 'تشغيل' },
  zoom: { en: 'Zoom', ar: 'تكبير' },
  explore: { en: 'Explore', ar: 'استكشف' },
};
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
  ring.innerHTML = '<div class="cursor-ring__inner"><span class="cursor-ring__label"></span></div>';
  dot.setAttribute('aria-hidden', 'true');
  ring.setAttribute('aria-hidden', 'true');
  document.body.append(ring, dot);
  html.classList.add('has-cursor');
  const label = ring.querySelector('.cursor-ring__label');

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
      const key = special.getAttribute('data-cursor');
      const custom = special.getAttribute('data-cursor-label');
      const text = custom ? t({ en: custom, ar: special.getAttribute('data-ar-cursor-label') || custom }) : t(LABELS[key] || LABELS.view);
      label.textContent = text;
      html.classList.add('cursor-label');
      html.classList.remove('cursor-link');
      return;
    }
    html.classList.remove('cursor-label');
    html.classList.toggle('cursor-link', !!e.target.closest?.(INTERACTIVE));
  });
}
