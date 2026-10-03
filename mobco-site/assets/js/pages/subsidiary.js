// MOBCO pages/subsidiary.js — shared by mobco-construction.html, mobco-developments.html, mobco-real-estate.html.
// Copy is static in the HTML (EN + data-ar*); this module only adds interactions:
//   · hero: scroll drift of the photo (motion-safe)
//   · Construction: interactive footprint dot map (WORLD) + country tabs (ARIA tabs, arrows/Home/End)
//   · Developments: Egypt & Canada split showcase — blueprint → render lens (pointer), reveal toggle, touch auto-reveal
//   · Real Estate: illustrative common-core floor plate — parts highlight (hover/tap/legend) + tenancy layouts
// Every widget re-renders its JS-generated strings on `langchange` via t().

import { t, onLang } from '../core/i18n.js';
import { scan, onScroll, refresh } from '../core/motion.js';
import { $, $$, prefersReducedMotion, hasFinePointer, rafThrottle, clamp } from '../core/utils.js';
import { WORLD } from '../data/world-map.js';

const reduced = prefersReducedMotion();
const SVGNS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};
const safe = (name, fn) => { try { fn(); } catch (err) { console.error(`[subsidiary] ${name} failed`, err); } };

/* ======================================================================
   Hero — slow drift of the photo while the hero scrolls away
   ====================================================================== */
function initHero() {
  const bg = $('[data-sd-hero-bg]');
  const hero = bg?.closest('.sd-hero');
  if (!bg || !hero || reduced) return;
  let lastP = -1;
  onScroll(({ y }) => {
    const h = hero.offsetHeight || 1;
    if (y > h * 1.2 && lastP === 1) return;
    const p = clamp(y / h, 0, 1);
    if (Math.abs(p - lastP) < 0.001) return;
    lastP = p;
    bg.style.transform = `translate3d(0, ${(p * h * 0.22).toFixed(1)}px, 0)`;
  });
}

/* ======================================================================
   Construction — footprint map
   ====================================================================== */
// London ≈ lon -0.13, lat 51.5, projected with the same naturalEarth1 projection as WORLD
// (scale/translate fitted to WORLD.offices: Riyadh, New Cairo, Whitby → x 499.7, y 94.8).
const UK = { xy: [499.7, 94.8], dots: [[491.3, 78.8], [498.8, 86.3], [491.3, 93.8], [498.8, 93.8]] };
const VIEW = { x0: 105, y0: 8, x1: 720, y1: 260 };

function initFootprint() {
  const root = $('[data-sd-footprint]');
  if (!root) return;
  const svg = $('[data-sd-map]', root);
  const tabs = $$('[data-sd-country]', root);
  const panels = $$('[data-sd-panel]', root);
  if (!svg || !tabs.length) return;

  const markers = {
    ksa: { xy: WORLD.offices.ksa.xy, hq: true },
    egypt: { xy: WORLD.offices.egypt.xy },
    canada: { xy: WORLD.offices.canada.xy },
    uk: { xy: UK.xy },
  };
  const labelsGroup = $('.sd-map__labels', svg);

  // --- country shapes (subtle fill + hit areas)
  const shapes = svgEl('g', { class: 'sd-map__shapes' });
  for (const key of ['ksa', 'egypt', 'canada']) {
    shapes.appendChild(svgEl('path', { d: WORLD.highlight[key], class: 'sd-map__area sd-map__area--shape', 'data-sd-hit': key }));
  }

  // --- dot matrix (only the cropped window)
  const ukSet = new Set(UK.dots.map(([x, y]) => `${x},${y}`));
  const dots = svgEl('g', { class: 'sd-map__dots', 'aria-hidden': 'true' });
  const frag = document.createDocumentFragment();
  for (const [x, y, key] of WORLD.dots) {
    if (x < VIEW.x0 - 4 || x > VIEW.x1 + 4 || y < VIEW.y0 - 4 || y > VIEW.y1 + 4) continue;
    const k = key || (ukSet.has(`${x},${y}`) ? 'uk' : null);
    const c = svgEl('circle', { cx: x, cy: y, r: 2, class: 'sd-map__dot' });
    if (k) c.setAttribute('data-key', k);
    frag.appendChild(c);
  }
  dots.appendChild(frag);

  // --- arcs from the Riyadh HQ
  const arcs = svgEl('g', { class: 'sd-map__arcs', 'aria-hidden': 'true' });
  const [hx, hy] = markers.ksa.xy;
  const arcEls = {};
  for (const key of ['egypt', 'uk', 'canada']) {
    const [x, y] = markers[key].xy;
    const dist = Math.hypot(x - hx, y - hy);
    const cx = (x + hx) / 2;
    const cy = Math.min(y, hy) - dist * 0.32;
    const d = `M${hx} ${hy}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x} ${y}`;
    const base = svgEl('path', { d, class: 'sd-map__arc', 'data-draw': '' });
    const flow = svgEl('path', { d, class: 'sd-map__flow' });
    arcs.append(base, flow);
    arcEls[key] = [base, flow];
  }

  // --- markers (decorative for AT: the tabs are the accessible control)
  const mk = svgEl('g', { class: 'sd-map__markers' });
  const markerEls = {};
  for (const [key, m] of Object.entries(markers)) {
    const [x, y] = m.xy;
    const g = svgEl('g', { class: `sd-map__marker${m.hq ? ' sd-map__marker--hq' : ''}`, 'data-sd-hit': key, 'aria-hidden': 'true' });
    g.append(
      svgEl('circle', { cx: x, cy: y, r: 16, class: 'sd-map__area' }),
      svgEl('circle', { cx: x, cy: y, r: 7, class: 'sd-map__pulse' }),
      svgEl('circle', { cx: x, cy: y, r: 7, class: 'sd-map__pulse' }),
      svgEl('circle', { cx: x, cy: y, r: m.hq ? 6 : 5, class: 'sd-map__pin' }),
      svgEl('circle', { cx: x, cy: y, r: m.hq ? 2.2 : 1.8, class: 'sd-map__core' }),
    );
    mk.appendChild(g);
    markerEls[key] = g;
  }
  svg.insertBefore(shapes, labelsGroup);
  svg.insertBefore(dots, labelsGroup);
  svg.insertBefore(arcs, labelsGroup);
  svg.insertBefore(mk, labelsGroup);
  scan(svg); // arc draw-in (data-draw)

  // --- tabs
  let active = tabs.find((b) => b.getAttribute('aria-selected') === 'true')?.dataset.sdCountry || 'ksa';
  function select(id, { focus = false } = {}) {
    active = id;
    tabs.forEach((b) => {
      const on = b.dataset.sdCountry === id;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    panels.forEach((p) => { p.hidden = p.dataset.sdPanel !== id; });
    svg.setAttribute('data-active', id);
    for (const [key, g] of Object.entries(markerEls)) g.classList.toggle('is-active', key === id);
    for (const [key, [base, flow]] of Object.entries(arcEls)) {
      const on = key === id;
      base.classList.toggle('is-active', on);
      flow.classList.toggle('is-active', on && !reduced);
    }
  }
  select(active);

  tabs.forEach((b) => b.addEventListener('click', () => select(b.dataset.sdCountry)));
  const list = $('[role="tablist"]', root);
  list?.addEventListener('keydown', (e) => {
    const i = tabs.findIndex((b) => b.dataset.sdCountry === active);
    const rtl = document.documentElement.dir === 'rtl';
    let n = null;
    if (e.key === 'ArrowDown' || e.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) n = (i + 1) % tabs.length;
    else if (e.key === 'ArrowUp' || e.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = tabs.length - 1;
    if (n === null) return;
    e.preventDefault();
    select(tabs[n].dataset.sdCountry, { focus: true });
  });

  // --- map pointer: preview on hover, select on click/tap
  const hitOf = (e) => e.target?.closest?.('[data-sd-hit]')?.getAttribute('data-sd-hit') || null;
  svg.addEventListener('pointerover', (e) => {
    const k = hitOf(e);
    if (k) svg.setAttribute('data-preview', k);
  });
  svg.addEventListener('pointerout', (e) => {
    if (!svg.contains(e.relatedTarget)) svg.removeAttribute('data-preview');
    else if (!hitOf({ target: e.relatedTarget })) svg.removeAttribute('data-preview');
  });
  svg.addEventListener('click', (e) => {
    const k = hitOf(e);
    if (k) select(k);
  });
}

/* ======================================================================
   Developments — split showcase (blueprint → render)
   ====================================================================== */
const SPLIT = {
  show: { en: 'Show render', ar: 'أظهِر التصوّر' },
  hide: { en: 'Show blueprint', ar: 'أظهِر المخطط' },
};
function initSplit() {
  const root = $('[data-sd-split]');
  if (!root) return;
  const panels = $$('[data-sd-split-panel]', root);
  const fine = hasFinePointer();

  const setLabel = (btn) => {
    const on = btn.getAttribute('aria-pressed') === 'true';
    const lab = $('[data-sd-reveal-label]', btn);
    if (lab) lab.textContent = t(on ? SPLIT.hide : SPLIT.show);
  };

  panels.forEach((panel) => {
    const btn = $('[data-sd-reveal]', panel);
    let raf = 0;
    let tx = 0, ty = 0, cx = null, cy = null;
    const tick = () => {
      raf = 0;
      if (cx === null) { cx = tx; cy = ty; }
      cx += (tx - cx) * (reduced ? 1 : 0.22);
      cy += (ty - cy) * (reduced ? 1 : 0.22);
      panel.style.setProperty('--sd-x', `${cx.toFixed(1)}px`);
      panel.style.setProperty('--sd-y', `${cy.toFixed(1)}px`);
      if (Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) raf = requestAnimationFrame(tick);
    };
    panel.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = panel.getBoundingClientRect();
      tx = e.clientX - r.left;
      ty = e.clientY - r.top;
      if (!raf) raf = requestAnimationFrame(tick);
    });
    panel.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = panel.getBoundingClientRect();
      tx = e.clientX - r.left; ty = e.clientY - r.top; cx = tx; cy = ty;
      tick();
      panel.classList.add('is-lens');
    });
    panel.addEventListener('pointerleave', () => panel.classList.remove('is-lens'));

    btn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(on));
      panel.classList.toggle('is-revealed', on);
      panel.dataset.manual = '1';
      setLabel(btn);
    });
    if (btn) setLabel(btn);
  });

  // Touch / no-hover devices: reveal each render as it scrolls into the middle of the screen.
  if (!fine && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        const panel = en.target;
        if (panel.dataset.manual) continue;
        const on = en.isIntersecting;
        panel.classList.toggle('is-revealed', on);
        const btn = $('[data-sd-reveal]', panel);
        if (btn) { btn.setAttribute('aria-pressed', String(on)); setLabel(btn); }
      }
    }, { rootMargin: '-35% 0px -35% 0px', threshold: 0 });
    panels.forEach((p) => io.observe(p));
  }

  onLang(() => panels.forEach((p) => { const b = $('[data-sd-reveal]', p); if (b) setLabel(b); }));
}

/* ======================================================================
   Real Estate — illustrative common-core diagram
   ====================================================================== */
const CORE = {
  idle: { en: 'Hover or tap the plan to explore the common core.', ar: 'مرّر المؤشر فوق المخطط أو المسه لاستكشاف النواة المشتركة.' },
  lifts: { en: 'Lifts — vertical circulation grouped in the core, serving every floor.', ar: 'المصاعد — حركة رأسية مجمّعة في النواة تخدم جميع الطوابق.' },
  stairs: { en: 'Stairs — protected stair cores for everyday circulation and safe evacuation.', ar: 'السلالم — سلالم محمية داخل النواة للتنقّل اليومي والإخلاء الآمن.' },
  mep: { en: 'MEP & services — shared risers keep essential services central and easy to maintain.', ar: 'الخدمات الكهروميكانيكية — مسارات خدمات مشتركة تُبقي الخدمات الأساسية في المركز وتُسهّل صيانتها.' },
  wc: { en: 'Washrooms — shared facilities in the core free the perimeter for workspace.', ar: 'دورات المياه — مرافق مشتركة في النواة تُتيح المحيط بالكامل لمساحات العمل.' },
  wings: { en: 'Office wings — flexible space around the core, configurable for each tenant.', ar: 'الأجنحة المكتبية — مساحات مرنة حول النواة يمكن تهيئتها لكل مستأجر.' },
  t1: { en: 'One tenant — the whole floor as a single, open workplace around the core.', ar: 'مستأجر واحد — الطابق بأكمله مساحة عمل واحدة مفتوحة حول النواة.' },
  t2: { en: 'Two tenants — the floor splits into two suites (A and B), both served by the same core.', ar: 'مستأجران — يُقسَم الطابق إلى جناحين (A وB) تخدمهما النواة ذاتها.' },
  t4: { en: 'Four tenants — four suites (A–D), each with direct access to the shared core.', ar: 'أربعة مستأجرين — أربعة أجنحة (A–D) يصل كلٌّ منها مباشرةً إلى النواة المشتركة.' },
};
function initCore() {
  const root = $('[data-sd-core]');
  if (!root) return;
  const plan = $('[data-sd-plan]', root);
  const readout = $('[data-sd-readout]', root);
  const buttons = $$('[data-sd-part]', root);
  const radios = $$('[data-sd-tenancy]', root);
  if (!plan || !readout) return;

  // tenant labels: wings share A/B in the two-tenant layout
  const T2 = { nw: 'A', sw: 'A', ne: 'B', se: 'B' };
  const T4 = { nw: 'A', ne: 'B', se: 'C', sw: 'D' };

  let pinned = null;       // part chosen by click / legend
  let hover = null;        // part under the pointer
  let base = 'idle';       // message shown when nothing is hovered (idle or the current tenancy)
  let lastMsg = 'idle';

  const say = (key) => {
    lastMsg = key;
    const txt = t(CORE[key]);
    if (readout.textContent !== txt) readout.textContent = txt;
  };

  function render() {
    const part = hover || pinned;
    plan.setAttribute('data-active', part || '');
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sdPart === pinned)));
  }
  function setTenancy(v, { announce = true } = {}) {
    plan.setAttribute('data-tenancy', v);
    const map = v === '2' ? T2 : T4;
    $$('.sd-plan__tlabel', plan).forEach((el) => { el.textContent = map[el.dataset.t]; });
    if (announce) { pinned = null; render(); say(`t${v}`); }
  }

  // legend buttons: toggle pin
  buttons.forEach((b) => {
    b.addEventListener('click', () => {
      const p = b.dataset.sdPart;
      pinned = pinned === p ? null : p;
      render();
      say(pinned || base);
    });
    if (hasFinePointer()) {
      b.addEventListener('pointerenter', () => { hover = b.dataset.sdPart; render(); say(hover); });
      b.addEventListener('pointerleave', () => { hover = null; render(); say(pinned || base); });
    }
  });
  // plan: hover previews, tap/click pins
  const partOf = (el) => el?.closest?.('[data-part]')?.getAttribute('data-part') || null;
  plan.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const p = partOf(e.target);
    if (p && p !== hover) { hover = p; render(); say(p); }
  });
  plan.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (partOf(e.relatedTarget)) return;
    hover = null; render(); say(pinned || base);
  });
  plan.addEventListener('click', (e) => {
    const p = partOf(e.target);
    if (!p) return;
    pinned = pinned === p ? null : p;
    hover = null;
    render();
    say(pinned || base);
  });

  radios.forEach((r) => r.addEventListener('change', () => {
    if (!r.checked) return;
    setTenancy(r.value);
    base = `t${r.value}`;
  }));
  setTenancy(radios.find((r) => r.checked)?.value || '1', { announce: false });
  render();

  onLang(() => { readout.textContent = t(CORE[lastMsg] || CORE.idle); });
}

/* ====================================================================== */
safe('hero', initHero);
safe('footprint', initFootprint);
safe('split', initSplit);
safe('core', initCore);
requestAnimationFrame(() => refresh());
