// assets/js/pages/home-b.js — HOME page, PART B (sections 6–11). Owned by the home-b builder.
// Core modules are singletons initialised by core/main.js; this module only wires page-specific behaviour:
//   · sectors   — cards ⇄ phrases of the verbatim "delivered iconic projects…" sentence light each other up
//   · footprint — dot-matrix world map (WORLD) + arcs from Riyadh, markers ⇄ region tabs, coordinate readout
//   · projects  — image parallax inside the core drag carousel
//   · studio    — axonometric drawing draws itself on scroll (+ pointer tilt) inside #studio-embed
//   · values    — giant outlined words fill as they scroll into view
// Everything degrades to static, fully readable content without JS or with reduced motion.

import { t, onLang } from '../core/i18n.js';
import { onScroll, refresh } from '../core/motion.js';
import { $, $$, clamp, rafThrottle, prefersReducedMotion, hasFinePointer } from '../core/utils.js';
import { WORLD } from '../data/world-map.js';

const reduced = prefersReducedMotion();
const vh = () => window.innerHeight || document.documentElement.clientHeight;

/* ================================================================ 6. Sectors */
function initSectors() {
  const grid = $('[data-hb-sectors]');
  const statement = $('[data-hb-statement]');
  if (!grid || !statement) return;
  const light = (id, fromTerm = false) => {
    statement.classList.toggle('has-lit', !!id);
    $$('.hb-term', statement).forEach((el) => el.classList.toggle('is-lit', !!id && el.dataset.sector === id));
    $$('.hb-sector', grid).forEach((el) => el.classList.toggle('is-linked', fromTerm && el.dataset.sector === id));
  };
  // card → sentence
  grid.addEventListener('pointerover', (e) => { const c = e.target.closest('.hb-sector'); if (c) light(c.dataset.sector); });
  grid.addEventListener('pointerleave', () => light(null));
  grid.addEventListener('focusin', (e) => { const c = e.target.closest('.hb-sector'); if (c) light(c.dataset.sector); });
  grid.addEventListener('focusout', (e) => { if (!grid.contains(e.relatedTarget)) light(null); });
  // sentence → card (delegated: i18n swaps the sentence's innerHTML on language change)
  statement.addEventListener('pointerover', (e) => { const term = e.target.closest('.hb-term'); if (term) light(term.dataset.sector, true); });
  statement.addEventListener('pointerout', (e) => { if (!e.relatedTarget?.closest?.('.hb-term')) light(null); });
  onLang(() => light(null));
}

/* ================================================================ 7. Global footprint */
const REGION_INFO = {
  ksa: { name: { en: 'Riyadh · HQ', ar: 'الرياض · المقر الرئيسي' }, lonlat: WORLD.offices?.ksa?.lonlat || [46.6753, 24.7136] },
  egypt: { name: { en: 'New Cairo', ar: 'القاهرة الجديدة' }, lonlat: WORLD.offices?.egypt?.lonlat || [31.47, 30.03] },
  canada: { name: { en: 'Port Whitby', ar: 'بورت ويتبي' }, lonlat: WORLD.offices?.canada?.lonlat || [-78.9429, 43.8975] },
};
const fmtCoord = ([lon, lat]) => {
  const ns = t(lat >= 0 ? { en: 'N', ar: 'ش' } : { en: 'S', ar: 'ج' });
  const ew = t(lon >= 0 ? { en: 'E', ar: 'ق' } : { en: 'W', ar: 'غ' });
  return `≈ ${Math.abs(lat).toFixed(2)}° ${ns} · ${Math.abs(lon).toFixed(2)}° ${ew}`;
};

function mapSVG() {
  const H = 440;
  const keys = ['ksa', 'egypt', 'canada'];
  const base = [];
  const focus = { ksa: [], egypt: [], canada: [] };
  for (const [x, y, k] of WORLD.dots) {
    if (y > H - 4) continue;
    (k && focus[k] ? focus[k] : base).push(`M${x} ${y}h0`);
  }
  const o = (k) => WORLD.offices[k].xy;
  const [rx, ry] = o('ksa');
  const arc = (k, lift) => {
    const [x, y] = o(k);
    const mx = (rx + x) / 2, my = (ry + y) / 2;
    const d = Math.hypot(x - rx, y - ry);
    return `M${rx} ${ry}Q${mx.toFixed(1)} ${(my - d * lift).toFixed(1)} ${x} ${y}`;
  };
  const arcs = { egypt: arc('egypt', 0.9), canada: arc('canada', 0.42) };
  return `<svg class="hb-map__svg" viewBox="0 0 1000 ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
    <path class="hb-map__dots" d="${base.join('')}"/>
    ${keys.map((k) => `<path class="hb-map__dots hb-map__dots--focus" data-key="${k}" d="${focus[k].join('')}"/>`).join('')}
    <g class="hb-map__arcs">
      ${Object.entries(arcs).map(([k, d]) => `<path class="hb-map__arc" data-key="${k}" d="${d}"/>`).join('')}
      ${Object.entries(arcs).map(([k, d]) => `<path class="hb-map__flow" data-key="${k}" d="${d}" pathLength="1"/>`).join('')}
    </g>
  </svg>`;
}

function initFootprint() {
  const map = $('[data-hb-map]');
  const canvas = $('[data-hb-map-canvas]');
  const tabsRoot = $('[data-hb-regions]');
  if (!map || !canvas || !WORLD?.dots) return;
  canvas.insertAdjacentHTML('afterbegin', mapSVG());
  const svg = $('.hb-map__svg', canvas);
  const markers = $$('[data-hb-marker]', canvas);
  const nameEl = $('[data-hb-readout-name]', map);
  const coordEl = $('[data-hb-readout-coord]', map);
  let active = 'ksa';

  // viewBox follows the CSS window (--vx/--vy/--vw/--vh switch at the mobile breakpoint)
  const syncView = () => {
    const cs = getComputedStyle(canvas);
    const v = ['--vx', '--vy', '--vw', '--vh'].map((p) => parseFloat(cs.getPropertyValue(p)));
    if (v.every((n) => !Number.isNaN(n))) svg.setAttribute('viewBox', v.join(' '));
    const [rx, ry] = WORLD.offices.ksa.xy;
    map.style.setProperty('--cx', `${(((rx - v[0]) / v[2]) * 100).toFixed(2)}%`);
    map.style.setProperty('--cy', `${(((ry - v[1]) / v[3]) * 100).toFixed(2)}%`);
  };
  syncView();
  window.addEventListener('resize', rafThrottle(syncView));

  const renderReadout = () => {
    const info = REGION_INFO[active];
    if (nameEl) nameEl.textContent = t(info.name);
    if (coordEl) coordEl.textContent = fmtCoord(info.lonlat);
  };
  const setActive = (id) => {
    if (!REGION_INFO[id]) return;
    active = id;
    markers.forEach((m) => {
      const on = m.dataset.hbMarker === id;
      m.classList.toggle('is-active', on);
      m.setAttribute('aria-pressed', String(on));
    });
    $$('.hb-map__dots--focus', svg).forEach((p) => p.classList.toggle('is-active', p.dataset.key === id));
    $$('.hb-map__arc, .hb-map__flow', svg).forEach((p) => p.classList.toggle('is-active', id === 'ksa' || p.dataset.key === id));
    renderReadout();
  };
  setActive(active);

  markers.forEach((m) => {
    const id = m.dataset.hbMarker;
    m.addEventListener('click', () => {
      if (tabsRoot?.__selectTab) tabsRoot.__selectTab(id); else setActive(id);
    });
    const hover = (on) => $(`.hb-map__dots--focus[data-key="${id}"]`, svg)?.classList.toggle('is-hover', on);
    m.addEventListener('pointerenter', () => hover(true));
    m.addEventListener('pointerleave', () => hover(false));
    m.addEventListener('focus', () => hover(true));
    m.addEventListener('blur', () => hover(false));
  });
  tabsRoot?.addEventListener('tabchange', (e) => setActive(e.detail.id));
  onLang(renderReadout);

  // reveal (radial wipe from Riyadh) + pause the looping animations while off-screen
  if (reduced || !('IntersectionObserver' in window)) { map.classList.add('is-in'); return; }
  new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) map.classList.add('is-in');
      map.classList.toggle('is-paused', !e.isIntersecting);
    }
  }, { rootMargin: '0px 0px -10% 0px' }).observe(map);
}

/* ================================================================ 8. Featured projects (carousel parallax) */
function initProjects() {
  const vp = $('[data-hb-carousel]');
  if (!vp || reduced) return;
  const pics = $$('.hb-card .project-card__media picture', vp);
  const update = () => {
    const vr = vp.getBoundingClientRect();
    const mid = vr.left + vr.width / 2;
    for (const pic of pics) {
      const r = pic.parentElement.getBoundingClientRect();
      if (r.right < vr.left - 200 || r.left > vr.right + 200) continue;
      const off = clamp((r.left + r.width / 2 - mid) / vr.width, -1, 1);
      pic.style.setProperty('--hb-shift', `${(-off * r.width * 0.05).toFixed(1)}px`);
    }
  };
  const tick = rafThrottle(update);
  vp.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', tick);
  onLang(() => requestAnimationFrame(update));
  update();
}

/* ================================================================ 9. 3D Studio teaser */
function initStudio() {
  const stage = $('[data-hb-stage]');
  const embed = $('[data-hb-embed]');
  if (!stage || !embed) return;
  const pctEl = $('[data-hb-draw-pct]', stage);
  let drawn = 0;
  const setP = (p) => {
    const axo = $('.hb-axo', embed); // the slot may later be replaced by a live viewer
    if (!axo) return;
    axo.style.setProperty('--p', p.toFixed(3));
    if (pctEl) pctEl.textContent = String(Math.round(p * 100)).padStart(2, '0');
  };
  if (reduced) { setP(1); return; }
  // draws itself on scroll (forward only: once drawn it stays drawn)
  const update = () => {
    const r = embed.getBoundingClientRect();
    if (!r.height) return;
    const h = vh();
    const start = h * 0.95, end = h * 0.22;
    const p = clamp((start - r.top) / (start - end), 0, 1);
    if (p > drawn) { drawn = p; setP(p); }
  };
  setP(0);
  onScroll(update);
  window.addEventListener('scroll', rafThrottle(update), { passive: true });
  window.addEventListener('resize', rafThrottle(update));
  update();

  // pointer tilt (fine pointers only): a hint of the 3D studio's orbit
  if (!hasFinePointer()) return;
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    embed.style.setProperty('--hb-ry', `${(x * 10).toFixed(2)}deg`);
    embed.style.setProperty('--hb-rx', `${(-y * 8).toFixed(2)}deg`);
  });
  stage.addEventListener('pointerleave', () => {
    embed.style.setProperty('--hb-ry', '0deg');
    embed.style.setProperty('--hb-rx', '0deg');
  });
}

/* ================================================================ 10. Values */
function initValues() {
  const rows = $$('[data-hb-value]');
  if (!rows.length) return;
  if (reduced) { rows.forEach((r) => r.style.setProperty('--hb-fill', '1')); return; }
  const fills = new Map(rows.map((r) => [r, 0]));
  const update = () => {
    const h = vh();
    for (const row of rows) {
      const r = row.getBoundingClientRect();
      const c = r.top + r.height / 2;
      const p = clamp((h * 0.9 - c) / (h * 0.42), 0, 1);
      if (p > fills.get(row)) { fills.set(row, p); row.style.setProperty('--hb-fill', p.toFixed(3)); }
    }
  };
  onScroll(update);
  window.addEventListener('scroll', rafThrottle(update), { passive: true });
  window.addEventListener('resize', rafThrottle(update));
  update();
}

/* ================================================================ boot */
for (const [name, fn] of [['sectors', initSectors], ['footprint', initFootprint], ['projects', initProjects], ['studio', initStudio], ['values', initValues]]) {
  try { fn(); } catch (err) { console.error(`[home-b] ${name} failed to initialise`, err); }
}
requestAnimationFrame(refresh);
