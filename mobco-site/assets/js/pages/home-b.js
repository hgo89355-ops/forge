// assets/js/pages/home-b.js: HOME page, part B (sectors, footprint, featured projects, values).
// Core modules are singletons initialised by core/main.js; this module only wires page-specific behaviour:
//   · sectors: cards and the phrases of the client's "delivered iconic projects" sentence light each other up
//   · footprint: dot-matrix world map (WORLD) with arcs from Riyadh, markers linked to the region tabs
//   · projects: slides rendered from PROJECTS (featured === true) + image parallax inside the core carousel
//   · values: big outlined words fill as they scroll into view
// Everything degrades to static, readable content without JS or with reduced motion.

import { t, onLang, localize } from '../core/i18n.js';
import { onScroll, refresh } from '../core/motion.js';
import { $, $$, clamp, esc, rafThrottle, prefersReducedMotion, IMAGES } from '../core/utils.js';
import { PROJECTS, PROJECT_CATEGORIES } from '../data/site-data.js';
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
  ksa: { name: { en: 'Riyadh, HQ', ar: 'الرياض، المقر الرئيسي' }, lonlat: WORLD.offices?.ksa?.lonlat || [46.6753, 24.7136] },
  egypt: { name: { en: 'New Cairo', ar: 'القاهرة الجديدة' }, lonlat: WORLD.offices?.egypt?.lonlat || [31.47, 30.03] },
  canada: { name: { en: 'Port Whitby', ar: 'بورت ويتبي' }, lonlat: WORLD.offices?.canada?.lonlat || [-78.9429, 43.8975] },
};
const fmtCoord = ([lon, lat]) => {
  const la = Math.abs(lat).toFixed(2), lo = Math.abs(lon).toFixed(2);
  return t({
    en: `${la}° ${lat >= 0 ? 'N' : 'S'}, ${lo}° ${lon >= 0 ? 'E' : 'W'}`,
    ar: `${la}° ${lat >= 0 ? 'شمالًا' : 'جنوبًا'}، ${lo}° ${lon >= 0 ? 'شرقًا' : 'غربًا'}`,
  });
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

/* ================================================================ 8. Featured projects (data-driven carousel + parallax) */
// The slides are rendered from PROJECTS where featured === true (the static markup in partials/home-b.html is
// generated from this same template for no-JS/SEO: the code between the @tpl markers is pure, so a Node one-off can
// evaluate it with the same data and paste the output between the viewport tags).
/* @tpl-start */
const HB_CROP = { 'victoria-101': '45% 50%', 'sofitel-hotel': '30% 50%', 'neom-bay-airport': '40% 50%', 'al-moosa-specialist-hospital': '62% 50%', 'taif-municipality-building': '58% 50%', 'sulaiman-fakeeh-hospital': '42% 50%' };
function hbSlideHTML(p, i, total, { esc, IMAGES, CATEGORIES }) {
  const ico = (name, cls = 'icon') => `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="assets/icons/sprite.svg#${name}"></use></svg>`;
  const ar = (v) => (v && typeof v === 'object' ? v.ar || v.en || '' : String(v ?? ''));
  const en = (v) => (v && typeof v === 'object' ? v.en || '' : String(v ?? ''));
  const txt = (tag, cls, v, extra = '') => `<${tag}${cls ? ` class="${cls}"` : ''}${extra} data-ar="${esc(ar(v))}">${esc(en(v))}</${tag}>`;
  const cat = CATEGORIES.find((c) => c.id === p.category);
  const typo = p.typology || cat?.name || { en: 'Project', ar: 'مشروع' };
  const split = (v, k) => String(v || '').split(' · ')[k] || '';
  const badge = { en: split(en(typo), 0), ar: split(ar(typo), 0) };
  const sub = split(en(typo), 1) ? { en: split(en(typo), 1), ar: split(ar(typo), 1) } : null;
  const meta = IMAGES[p.image] || { w: 790, h: 710 };
  // the 4:5 card crops a landscape photo: the rendered image is ~k × the slide width (112% for the parallax overscan)
  const k = Math.max(1.12, (1.25 * meta.w) / meta.h).toFixed(2);
  const sizes = `(min-width: 1800px) calc(30vw * ${k}), (min-width: 1024px) calc(37vw * ${k}), (min-width: 640px) calc(54vw * ${k}), calc(84vw * ${k})`;
  const note = en(p.imageNote);
  const alt = note ? { en: `${en(p.name)}. ${note}`, ar: `${ar(p.name)}. ${ar(p.imageNote)}` } : { en: '', ar: '' };
  const todo = (p.todo || []).map((x) => String(x).replace(/--/g, '-').replace(/\s*[\u2014\u2013]\s*/g, ', ')).join(' ');
  const flag = p.nameIsDescriptive || todo
    ? `
              <!-- PROJECTS: ${esc(p.slug)} (featured)${p.nameIsDescriptive ? ' · descriptive name' : ''}. TODO(content): ${todo || 'confirm the project name'} -->`
    : '';
  const n = String(i + 1).padStart(2, '0');
  const pos = HB_CROP[p.slug] || p.pos || '50% 50%';
  const label = { en: `${i + 1} of ${total}`, ar: `${i + 1} من ${total}` };
  const foot = p.studioModel
    ? `<a class="hb-slide__3d" href="studio.html?model=${esc(p.studioModel)}" aria-label="${esc(`Explore ${en(p.name)} in the 3D Studio`)}" data-ar-aria-label="${esc(`استكشف ${ar(p.name)} في الاستوديو ثلاثي الأبعاد`)}">${ico('rotate-3d')}<span aria-hidden="true">3D</span></a>`
    : `<span class="hb-slide__cat" aria-hidden="true">${ico(cat?.icon || 'building-2')}</span>`;
  return `
            <div class="carousel__slide hb-slide" role="group" aria-roledescription="slide" aria-label="${label.en}" data-ar-aria-label="${label.ar}">${flag}
              <a class="project-card hb-card" href="projects.html#${esc(p.slug)}">
                <div class="project-card__media"><picture><source type="image/webp" srcset="assets/img/thumbs/${esc(p.image)}.webp 480w, assets/img/${esc(p.image)}.webp ${meta.w}w" sizes="${sizes}"><img src="assets/img/thumbs/${esc(p.image)}.jpg" srcset="assets/img/thumbs/${esc(p.image)}.jpg 480w, assets/img/${esc(p.image)}.jpg ${meta.w}w" sizes="${sizes}" alt="${esc(alt.en)}"${alt.ar ? ` data-ar-alt="${esc(alt.ar)}"` : ''} width="${meta.w}" height="${meta.h}" loading="lazy" decoding="async" draggable="false" style="--pos:${esc(pos)}"></picture></div>
                <span class="project-card__arrow" aria-hidden="true">${ico('arrow-up-right', 'icon icon--dir')}</span>
                <div class="project-card__body">
                  <div class="project-card__meta">${txt('span', 'badge badge--glass', badge)}</div>
                  ${txt('h3', 'project-card__title', p.name)}${p.location ? `
                  <p class="project-card__loc">${ico('map-pin')}${txt('span', '', p.location)}</p>` : ''}
                </div>
              </a>
              <div class="hb-slide__foot">
                <span class="hb-slide__num" aria-hidden="true">${n}</span>
                ${sub ? txt('span', 'hb-slide__type', sub) : '<span class="hb-slide__type"></span>'}
                ${foot}
              </div>
            </div>
`;
}
/* @tpl-end */

function renderProjects() {
  const vp = $('[data-hb-carousel]');
  if (!vp) return;
  const featured = PROJECTS.filter((p) => p.featured === true);
  if (featured.length) {
    vp.innerHTML = featured.map((p, i) => hbSlideHTML(p, i, featured.length, { esc, IMAGES, CATEGORIES: PROJECT_CATEGORIES })).join('');
    localize(vp);
  }
  // "View all N projects": the count comes from the data
  const total = $('[data-hb-projects-total]');
  if (total) {
    const n = PROJECTS.length;
    const paint = () => { total.textContent = t({ en: `View all ${n} projects`, ar: `عرض جميع المشاريع (${n})` }); };
    paint();
    onLang(paint);
  }
}

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

/* ================================================================ 9. Values */
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
for (const [name, fn] of [['sectors', initSectors], ['footprint', initFootprint], ['projects-data', renderProjects], ['projects', initProjects], ['values', initValues]]) {
  try { fn(); } catch (err) { console.error(`[home-b] ${name} failed to initialise`, err); }
}
requestAnimationFrame(refresh);
