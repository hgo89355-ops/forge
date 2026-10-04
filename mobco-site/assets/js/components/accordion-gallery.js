// assets/js/components/accordion-gallery.js: image accordion (vanilla port of React Bits "AccordionGallery").
//
//   import { initAccordionGallery } from '../components/accordion-gallery.js';
//   const ag = initAccordionGallery(rootEl, { defaultIndex: 0 });   // ag.setActive(i), ag.destroy()
//
// Markup (static, readable without JS; styles in assets/css/components/accordion-gallery.css):
//   <ul class="accordion-gallery" data-accordion-gallery>
//     <li class="ag-panel">
//       <a class="ag-panel__link" href="...">
//         <span class="ag-panel__frame"><span class="ag-panel__media"><picture>...</picture></span><span class="ag-panel__overlay"></span></span>
//         <span class="ag-panel__tag" aria-hidden="true">Short name</span>          (optional: vertical label on closed panels)
//         <span class="ag-panel__label"><span class="ag-panel__bar"></span>
//           <span class="ag-panel__copy"><h3 class="ag-panel__text">Name</h3> ...optional extra lines...</span></span>
//       </a>
//     </li>
//   </ul>
// Colours and sizes come from CSS custom properties on the root (--ag-accent, --ag-overlay, --ag-height, --ag-gap,
// --ag-radius), so pages theme it with tokens.
//
// Behaviour: the active panel grows (flex-grow), the others tilt away in 3D and drift their photo (parallax) and
// lose part of their colour. Hover (fine pointers), focus, click / tap (a tap on a closed panel opens it, a second
// tap follows the link) and arrow keys select a panel. A ResizeObserver keeps the photo size in step with the
// layout. Below `stackAt` px the panels stack vertically. RTL mirrors the tilt and drift. Reduced motion: the layout
// changes instantly. Uses the GSAP global when present; without it, the same values are set as inline styles.

const clampN = (v, a, b) => Math.min(Math.max(v, a), b);

const DEFAULTS = {
  defaultIndex: 0,
  expandRatio: 0.52,   // share of the row the open panel takes (0.2 to 0.9)
  duration: 0.7,
  ease: 'power3.out',
  parallax: 0.5,
  tilt: 6,             // degrees
  stagger: 0.06,
  trigger: 'hover',    // 'hover' | 'click'
  gray: 0.7,           // desaturation of closed panels (0 to 1)
  dim: 0.3,            // extra overlay on closed panels (0 to 1)
  stackAt: 520,        // px: at or below this root width the panels stack vertically
  onChange: null,      // (index, panelEl) => void
};

export function initAccordionGallery(root, options = {}) {
  if (!root || root.__ag) return root?.__ag || null;
  const opts = { ...DEFAULTS, ...options };
  const panels = Array.from(root.querySelectorAll(':scope > .ag-panel'));
  const count = panels.length;
  if (!count) return null;

  const gsap = window.gsap || null;
  const reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const finePointer = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : { matches: true };
  const parts = panels.map((panel) => ({
    panel,
    link: panel.querySelector('.ag-panel__link') || panel,
    media: panel.querySelector('.ag-panel__media'),
    bar: panel.querySelector('.ag-panel__bar'),
    copy: panel.querySelector('.ag-panel__copy'),
    tag: panel.querySelector('.ag-panel__tag'),
  }));

  let active = clampN(opts.defaultIndex | 0, 0, count - 1);
  let mediaSize = 320;
  let stacked = false;
  let firstRun = true;
  let tl = null;

  root.__ag = null;
  root.style.setProperty('--ag-count', String(count));
  root.classList.add('is-ready');
  if (!gsap) root.classList.add('is-css');

  const isRTL = () => (root.closest('[dir]')?.getAttribute('dir') || document.documentElement.dir) === 'rtl';
  const growFor = () => {
    const r = clampN(opts.expandRatio, 0.2, 0.9);
    return count > 1 ? (r * (count - 1)) / (1 - r) : 1;
  };

  // one place that writes values, through GSAP (tweened) or as plain inline styles (CSS transitions)
  function put(target, vars, dur, delay = 0) {
    if (!target) return;
    if (gsap) {
      if (dur > 0) tl.to(target, { ...vars, duration: dur, ease: opts.ease, overwrite: 'auto' }, delay);
      else gsap.set(target, { ...vars, overwrite: 'auto' });
      return;
    }
    const s = target.style;
    for (const [k, v] of Object.entries(vars)) {
      if (k === 'flexGrow') s.flexGrow = String(v);
      else if (k.startsWith('--')) s.setProperty(k, String(v));
      else if (k === 'opacity') s.opacity = String(v);
    }
    const t = [];
    if ('xPercent' in vars) t.push(`translate(${vars.xPercent}%, ${vars.yPercent}%)`);
    if ('x' in vars || 'y' in vars) t.push(`translate3d(${vars.x || 0}px, ${vars.y || 0}px, 0)`);
    if ('rotateY' in vars) t.push(`rotateY(${vars.rotateY}deg)`);
    if ('rotateX' in vars) t.push(`rotateX(${vars.rotateX}deg)`);
    if (t.length) s.transform = t.join(' ');
  }

  function apply(animate) {
    const reduced = reduceMQ.matches;
    const dur = animate && !reduced ? opts.duration : 0;
    const rtl = isRTL();
    const dir = rtl ? -1 : 1;
    const grow = growFor();
    if (tl) tl.kill();
    tl = gsap ? gsap.timeline() : null;

    parts.forEach(({ panel, link, media, bar, copy, tag }, i) => {
      const on = i === active;
      panel.classList.toggle('is-active', on);
      if (on) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');

      // tilt: closed panels turn away from the open one (mirrored in RTL); none when stacked or reduced
      const tiltDeg = stacked || reduced ? 0 : opts.tilt;
      const rot = on ? 0 : (i < active ? tiltDeg : -tiltDeg) * dir;
      put(panel, stacked ? { flexGrow: on ? grow : 1, rotateX: 0, rotateY: 0 } : { flexGrow: on ? grow : 1, rotateY: rot, rotateX: 0 }, dur);

      if (media) {
        const drift = clampN(active - i, -1.5, 1.5);
        const shift = on || reduced ? 0 : drift * opts.parallax * mediaSize * 0.06;
        put(media, {
          xPercent: -50,
          yPercent: -50,
          x: stacked ? 0 : shift * dir,
          y: stacked ? shift : 0,
          '--ag-gray': on ? 0 : opts.gray,
          '--ag-dim': on ? 0 : opts.dim,
        }, dur);
      }

      // label: the open panel shows its bar + copy; closed panels show their vertical tag. Stacked rows keep
      // every name visible (a closed row is still wide enough for it).
      const showCopy = on || stacked;
      const off = 14 * dir;
      if (bar) put(bar, { opacity: on ? 1 : 0, x: on ? 0 : -off }, on ? dur : dur * 0.6, 0);
      if (copy) {
        put(copy, { opacity: showCopy ? 1 : 0, x: showCopy ? 0 : -off }, showCopy ? dur : dur * 0.6, on && !reduced ? opts.stagger : 0);
      }
      if (tag) put(tag, { opacity: on || stacked ? 0 : 1 }, dur * 0.6, on ? 0 : dur * 0.3);
    });
  }

  function measure() {
    const rect = root.getBoundingClientRect();
    const wasStacked = stacked;
    stacked = rect.width <= opts.stackAt;
    root.classList.toggle('is-stacked', stacked);
    const gap = parseFloat(getComputedStyle(root).getPropertyValue('--ag-gap')) || 10;
    const total = stacked ? rect.height : rect.width;
    const usable = Math.max(total - gap * (count - 1), 120);
    mediaSize = Math.max(140, usable * clampN(opts.expandRatio, 0.2, 0.9) * 1.22);
    root.style.setProperty('--ag-media-size', `${Math.round(mediaSize)}px`);
    apply(!firstRun && wasStacked === stacked);
  }

  function setActive(i, { focus = false } = {}) {
    const next = ((i % count) + count) % count;
    if (focus) parts[next].link.focus({ preventScroll: false });
    if (next === active) return;
    active = next;
    apply(true);
    if (typeof opts.onChange === 'function') opts.onChange(active, panels[active]);
  }

  /* ---------------------------------------------------------------- events */
  const ac = new AbortController();
  const on = (el, type, fn, o) => el.addEventListener(type, fn, { ...o, signal: ac.signal });
  let downOpen = true; // was the pressed panel already open when the pointer went down?
  parts.forEach(({ panel, link }, i) => {
    on(panel, 'pointerenter', (e) => {
      if (opts.trigger === 'hover' && e.pointerType === 'mouse' && finePointer.matches) setActive(i);
    });
    on(link, 'pointerdown', () => { downOpen = i === active; });
    on(link, 'focus', () => setActive(i));
    on(link, 'click', (e) => {
      // pointer: a closed panel opens first, the link is followed once it is open. Keyboard (detail 0): the panel
      // opened on focus, so Enter follows the link.
      const opened = e.detail === 0 ? i === active : downOpen && i === active;
      if (!opened) { e.preventDefault(); setActive(i); }
      downOpen = true;
    });
    on(link, 'keydown', (e) => {
      const rtl = isRTL();
      const k = e.key;
      let step = 0;
      if (k === 'ArrowDown' || (k === 'ArrowRight' && !rtl) || (k === 'ArrowLeft' && rtl)) step = 1;
      else if (k === 'ArrowUp' || (k === 'ArrowLeft' && !rtl) || (k === 'ArrowRight' && rtl)) step = -1;
      else if (k === 'Home') { e.preventDefault(); setActive(0, { focus: true }); return; }
      else if (k === 'End') { e.preventDefault(); setActive(count - 1, { focus: true }); return; }
      if (step) { e.preventDefault(); setActive(i + step, { focus: true }); }
    });
  });
  const relayout = () => apply(false);
  on(document, 'langchange', () => requestAnimationFrame(relayout));
  if (reduceMQ.addEventListener) on(reduceMQ, 'change', relayout);

  let ro = null;
  if ('ResizeObserver' in window) {
    ro = new ResizeObserver(() => measure());
    ro.observe(root);
  } else {
    on(window, 'resize', measure);
  }
  measure();
  firstRun = false;

  const api = {
    get index() { return active; },
    setActive,
    refresh: measure,
    destroy() {
      ac.abort();
      ro?.disconnect();
      tl?.kill();
      root.classList.remove('is-ready', 'is-css', 'is-stacked');
      parts.forEach(({ panel, media, bar, copy, tag }) => [panel, media, bar, copy, tag].forEach((el) => el?.removeAttribute('style')));
      root.__ag = null;
    },
  };
  root.__ag = api;
  return api;
}
