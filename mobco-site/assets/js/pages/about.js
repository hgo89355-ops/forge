// assets/js/pages/about.js — About page behaviours (owned by the About builder).
// Core modules are singletons initialised by core/main.js (loaded first).
//
//  1. Key figures: STATS counters (site-data) + dot-matrix "three continents" map (world-map data)
//  2. Vision & mission split panel: image wipe synced to the core tabs component
//  3. Core values: accessible flip cards (+ pointer tilt on fine pointers)
//  4. Vertically integrated model: interactive SVG/HTML diagram (hover/focus/click/keyboard/touch, RTL aware)
//  5. Journey timeline: chapter chips + current-chapter tracking on top of the core carousel
// All copy comes from bilingual {en, ar} objects rendered with t(); everything re-renders on 'langchange'.

import { t, onLang } from '../core/i18n.js';
import { scan } from '../core/motion.js';
import { $, $$, icon, esc, prefersReducedMotion, hasFinePointer, rafThrottle, clamp, isRTL } from '../core/utils.js';
import { STATS, getSubsidiary } from '../data/site-data.js';
import { LOGO } from '../data/logo-data.js';
import { WORLD } from '../data/world-map.js';

const safe = (name, fn) => { try { fn(); } catch (err) { console.error(`[about] ${name} failed`, err); } };

/* ======================================================================
   1. Key figures
   ====================================================================== */
function initStats() {
  const mount = $('[data-about-stats]');
  if (!mount) return;
  mount.innerHTML = STATS.map((s) => `
    <div class="stat">
      <div class="stat__value"><span data-count="${s.value}">${s.value.toLocaleString('en-US')}</span><span class="stat__suffix">${esc(s.suffix)}</span></div>
      <p class="stat__label" data-stat-label="${esc(s.id)}">${esc(t(s.label))}</p>
    </div>`).join('');
  scan(mount);
  // patch labels only (no re-count) when the language changes
  onLang(() => {
    $$('[data-stat-label]', mount).forEach((el) => {
      const s = STATS.find((x) => x.id === el.getAttribute('data-stat-label'));
      if (s) el.textContent = t(s.label);
    });
  });
}

function initMap() {
  const mount = $('[data-about-map]');
  if (!mount || !WORLD?.dots) return;
  // crop: from Canada (west) to Saudi Arabia (east). Maps are never mirrored in RTL.
  const vb = { x: 200, y: 40, w: 500, h: 210 };
  const inView = ([x, y]) => x >= vb.x - 4 && x <= vb.x + vb.w + 4 && y >= vb.y - 4 && y <= vb.y + vb.h + 4;
  const hl = new Set(['ksa', 'egypt', 'canada']);
  const dots = WORLD.dots.filter(inView).map(([x, y, k]) =>
    `<circle class="d${k && hl.has(k) ? ' is-hl' : ''}" cx="${x}" cy="${y}" r="2.1"/>`).join('');
  const o = WORLD.offices || {};
  const pts = ['canada', 'egypt', 'ksa'].map((k) => o[k]?.xy).filter(Boolean);
  const arc = (a, b) => {
    const mx = (a[0] + b[0]) / 2, my = Math.min(a[1], b[1]) - Math.abs(b[0] - a[0]) * 0.22;
    return `<path class="arc" d="M${a[0]},${a[1]} Q${mx},${my} ${b[0]},${b[1]}"/>`;
  };
  const arcs = pts.length === 3 ? arc(pts[0], pts[1]) + arc(pts[1], pts[2]) : '';
  const pins = pts.map(([x, y]) => `<circle class="pulse" cx="${x}" cy="${y}" r="7"/><circle class="pin" cx="${x}" cy="${y}" r="3.4"/>`).join('');
  mount.innerHTML = `<svg viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" preserveAspectRatio="xMidYMid slice" focusable="false">${dots}${arcs}${pins}</svg>`;
}

/* ======================================================================
   2. Vision & mission
   ====================================================================== */
function initVisionMission() {
  const root = $('[data-about-vm]');
  if (!root) return;
  const imgs = $$('[data-vm-img]', root);
  root.addEventListener('tabchange', (e) => {
    const id = e.detail?.id;
    imgs.forEach((img) => img.classList.toggle('is-active', img.getAttribute('data-vm-img') === id));
  });
  // swipe on the image panel (touch) switches between vision and mission
  const aside = $('.about-vm__aside', root);
  let sx = null, sy = null;
  aside?.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  aside?.addEventListener('touchend', (e) => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    sx = sy = null;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    const forward = isRTL() ? dx > 0 : dx < 0;
    root.__selectTab?.(forward ? 'mission' : 'vision');
  }, { passive: true });
}

/* ======================================================================
   3. Core values — flip cards
   ====================================================================== */
function initValues() {
  const cards = $$('.about-value');
  if (!cards.length) return;
  const tilt = hasFinePointer() && !prefersReducedMotion();
  cards.forEach((card) => {
    const front = $('.about-value__face--front', card);
    const back = $('.about-value__face--back', card);
    if (!front || !back) return;
    const set = (flipped, focus = false) => {
      card.classList.toggle('is-flipped', flipped);
      front.inert = flipped;
      back.inert = !flipped;
      front.setAttribute('aria-hidden', String(flipped));
      back.setAttribute('aria-hidden', String(!flipped));
      if (focus) $(flipped ? '[data-flip="close"]' : '[data-flip="open"]', card)?.focus({ preventScroll: true });
    };
    set(false);
    card.__flip = set;
    card.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-flip]');
      if (!btn) return;
      set(btn.getAttribute('data-flip') === 'open', true);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && card.classList.contains('is-flipped')) { e.preventDefault(); set(false, true); }
    });
    if (tilt) {
      const move = rafThrottle((x, y) => {
        card.style.setProperty('--rx', `${(-(y - 0.5) * 7).toFixed(2)}deg`);
        card.style.setProperty('--ry', `${((x - 0.5) * 9).toFixed(2)}deg`);
      });
      card.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = card.getBoundingClientRect();
        card.classList.add('is-tilting');
        move(clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1));
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    }
  });
}

/* ======================================================================
   4. Vertically integrated model
   ====================================================================== */
const NODES = [
  {
    id: 'construction', a: -90, icon: 'hard-hat',
    name: { en: 'Construction', ar: 'الإنشاءات' },
    text: {
      en: 'Contracting and construction delivery for projects ranging from skyscrapers and commercial malls to residential compounds, governmental and educational institutions, and luxury hotels.',
      ar: 'المقاولات وتنفيذ الإنشاءات لمشاريع تتنوّع بين ناطحات السحاب والمراكز التجارية والمجمّعات السكنية والمؤسسات الحكومية والتعليمية والفنادق الفاخرة.',
    },
    verb: { en: 'We build', ar: 'نبني' },
    subs: ['mobco-construction'],
  },
  {
    id: 'development', a: -30, icon: 'landmark',
    name: { en: 'Real Estate Development', ar: 'التطوير العقاري' },
    text: {
      en: 'Acquiring, developing and managing exceptional communities, along with commercial, medical, business and educational facilities for diverse clients worldwide.',
      ar: 'الاستحواذ على مجتمعات استثنائية وتطويرها وإدارتها، إلى جانب منشآت تجارية وطبية وأعمال وتعليمية لعملاء متنوّعين حول العالم.',
    },
    subs: ['mobco-developments', 'mobco-real-estate'],
  },
  {
    id: 'fm', a: 30, icon: 'cog',
    name: { en: 'Facility Management', ar: 'إدارة المرافق' },
    text: {
      en: 'Keeping communities and buildings performing long after handover — part of more than 25 years of premium projects in Saudi Arabia.',
      ar: 'الحفاظ على أداء المجتمعات والمباني لما بعد التسليم بوقتٍ طويل — ضمن أكثر من 25 عامًا من المشاريع المتميّزة في المملكة العربية السعودية.',
    },
    verb: { en: 'We manage', ar: 'نُدير' },
    subs: [],
  },
  {
    id: 'hospitality', a: 90, icon: 'hotel',
    name: { en: 'Hospitality', ar: 'الضيافة' },
    text: {
      en: 'Luxury hotels and hospitality projects, where finish quality and detailing matter most.',
      ar: 'الفنادق الفاخرة ومشاريع الضيافة، حيث تتصدّر جودة التشطيب ودقّة التفاصيل.',
    },
    subs: [],
  },
  {
    id: 'pm', a: 150, icon: 'gauge',
    name: { en: 'Project Management', ar: 'إدارة المشاريع' },
    text: {
      en: 'Planning, controls and coordination that deliver projects on time, within budget and to the highest quality standards.',
      ar: 'تخطيطٌ وضبطٌ وتنسيق يضمن تسليم المشاريع في مواعيدها وضمن ميزانياتها وبأعلى معايير الجودة.',
    },
    verb: { en: 'We plan', ar: 'نخطّط' },
    subs: [],
  },
  {
    id: 'education', a: 210, icon: 'graduation-cap',
    name: { en: 'Education', ar: 'التعليم' },
    text: {
      en: 'One of the group’s three specialisms alongside construction and real estate development — developing and managing educational facilities.',
      ar: 'أحد تخصصات المجموعة الثلاثة إلى جانب الإنشاءات والتطوير العقاري — عبر تطوير المنشآت التعليمية وإدارتها.',
    },
    subs: ['elite-education'],
  },
];
// ring = the integrated loop between neighbours; tri = "we plan · we build · we manage"
const LINKS = [
  ['construction', 'development', 'ring'], ['development', 'fm', 'ring'], ['fm', 'hospitality', 'ring'],
  ['hospitality', 'pm', 'ring'], ['pm', 'education', 'ring'], ['education', 'construction', 'ring'],
  ['pm', 'construction', 'tri'], ['construction', 'fm', 'tri'], ['fm', 'pm', 'tri'],
];
const L = {
  connects: { en: 'Connects with', ar: 'يرتبط بـ' },
  companies: { en: 'Group companies', ar: 'شركات المجموعة' },
  select: { en: 'Show', ar: 'عرض' },
};

function initModel() {
  const root = $('[data-about-model]');
  const card = $('[data-model-card]');
  if (!root || !card) return;
  const svgLinks = $('[data-model-links]', root);
  const buttons = $$('[data-node]', root);
  const mark = $('[data-model-mark]', root);
  if (mark && LOGO?.mark) mark.innerHTML = `<path d="${LOGO.mark}"/>`;

  // --- geometry (SVG units; the CSS places the HTML nodes at the same polar positions, r = 37%)
  const C = 300, R = 222, CORE = 96, DOT = 40;
  const pos = (a, r = R) => [C + Math.cos((a * Math.PI) / 180) * r, C + Math.sin((a * Math.PI) / 180) * r];
  const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));
  const fmt = (p) => p.map((v) => v.toFixed(1)).join(',');
  let markup = '';
  NODES.forEach((n) => {
    markup += `<path class="about-model__link about-model__link--spoke" data-link="core:${n.id}" d="M${fmt(pos(n.a, CORE + 4))} L${fmt(pos(n.a, R - DOT))}"/>`;
  });
  LINKS.forEach(([a, b, kind]) => {
    const A = byId[a], B = byId[b];
    if (kind === 'ring') {
      // arc along the orbit, trimmed so it never runs under the node discs
      let a1 = A.a, a2 = B.a;
      if (a2 < a1) a2 += 360;
      const trim = 12;
      markup += `<path class="about-model__link about-model__link--ring" data-link="${a}:${b}" d="M${fmt(pos(a1 + trim))} A${R},${R} 0 0 1 ${fmt(pos(a2 - trim))}"/>`;
    } else {
      const p1 = pos(A.a), p2 = pos(B.a);
      const dx = p2[0] - p1[0], dy = p2[1] - p1[1], len = Math.hypot(dx, dy), k = (DOT + 6) / len;
      markup += `<path class="about-model__link about-model__link--tri" data-link="${a}:${b}" d="M${fmt([p1[0] + dx * k, p1[1] + dy * k])} L${fmt([p2[0] - dx * k, p2[1] - dy * k])}"/>`;
    }
  });
  svgLinks.innerHTML = markup;
  const linkEls = $$('[data-link]', svgLinks);
  const neighbours = (id) => LINKS.filter(([a, b]) => a === id || b === id).map(([a, b]) => (a === id ? b : a));

  let selected = buttons.find((b) => b.getAttribute('aria-selected') === 'true')?.getAttribute('data-node') || NODES[0].id;

  const highlight = (id) => {
    const near = new Set(neighbours(id));
    linkEls.forEach((el) => {
      const [a, b] = el.getAttribute('data-link').split(':');
      const on = (a === 'core' && b === id) || a === id || b === id;
      el.classList.toggle('is-active', on);
      el.classList.toggle('is-dim', !on);
    });
    buttons.forEach((btn) => btn.classList.toggle('is-linked', near.has(btn.getAttribute('data-node'))));
  };

  const renderCard = (animate) => {
    const n = byId[selected];
    const i = NODES.indexOf(n);
    const pad = (x) => String(x).padStart(2, '0');
    const near = neighbours(n.id).map((id) => byId[id]);
    const subs = n.subs.map(getSubsidiary).filter(Boolean);
    card.innerHTML = `
      <div class="about-model__card-head">
        <span class="about-model__card-icon">${icon(n.icon)}</span>
        <span class="about-model__card-index">${pad(i + 1)} / ${pad(NODES.length)}</span>
      </div>
      ${n.verb ? `<p class="eyebrow">${esc(t(n.verb))}</p>` : ''}
      <h3 class="about-model__card-title">${esc(t(n.name))}</h3>
      <p class="about-model__card-text">${esc(t(n.text))}</p>
      <div class="about-model__card-sub">
        <p class="about-model__card-sub-title">${esc(t(L.connects))}</p>
        <ul class="about-model__chips" role="list">
          ${near.map((m) => `<li><button class="chip chip--sm" type="button" data-goto-node="${m.id}" aria-label="${esc(`${t(L.select)}: ${t(m.name)}`)}">${icon(m.icon, 'icon--sm')}<span>${esc(t(m.name))}</span></button></li>`).join('')}
        </ul>
      </div>
      ${subs.length ? `<div class="about-model__card-sub">
        <p class="about-model__card-sub-title">${esc(t(L.companies))}</p>
        <ul class="about-model__links-list" role="list">
          ${subs.map((s) => `<li><a class="link-arrow link-arrow--plain" href="subsidiaries.html#${esc(s.id)}"><span>${esc(t(s.name))}</span><span class="link-arrow__icon">${icon('arrow-right', 'icon--dir')}</span></a></li>`).join('')}
        </ul>
      </div>` : ''}`;
    card.setAttribute('aria-labelledby', `model-node-${n.id}`);
    if (animate && !prefersReducedMotion()) {
      card.classList.remove('is-swapping');
      void card.offsetWidth;
      card.classList.add('is-swapping');
    }
  };

  const select = (id, { focus = false } = {}) => {
    if (!byId[id]) return;
    const changed = id !== selected;
    selected = id;
    buttons.forEach((btn) => {
      const on = btn.getAttribute('data-node') === id;
      btn.setAttribute('aria-selected', String(on));
      btn.tabIndex = on ? 0 : -1;
      if (on && focus) btn.focus({ preventScroll: true });
    });
    highlight(id);
    if (changed) renderCard(true);
  };

  buttons.forEach((btn, i) => {
    const id = btn.getAttribute('data-node');
    btn.addEventListener('click', () => select(id));
    btn.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') highlight(id); });
    btn.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') highlight(selected); });
    btn.addEventListener('keydown', (e) => {
      // ring order is clockwise in LTR; in RTL the diagram is mirrored, so horizontal arrows swap
      const fwdKeys = isRTL() ? ['ArrowLeft', 'ArrowDown'] : ['ArrowRight', 'ArrowDown'];
      const backKeys = isRTL() ? ['ArrowRight', 'ArrowUp'] : ['ArrowLeft', 'ArrowUp'];
      let next = null;
      if (fwdKeys.includes(e.key)) next = buttons[(i + 1) % buttons.length];
      else if (backKeys.includes(e.key)) next = buttons[(i - 1 + buttons.length) % buttons.length];
      else if (e.key === 'Home') next = buttons[0];
      else if (e.key === 'End') next = buttons[buttons.length - 1];
      if (!next) return;
      e.preventDefault();
      select(next.getAttribute('data-node'), { focus: true });
    });
  });
  card.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-goto-node]');
    if (chip) select(chip.getAttribute('data-goto-node'), { focus: true });
  });

  highlight(selected);
  renderCard(false);
  onLang(() => renderCard(false));
}

/* ======================================================================
   5. Journey timeline (core carousel + chapter chips)
   ====================================================================== */
function initJourney() {
  const root = $('[data-about-journey]');
  if (!root) return;
  const vp = $('.carousel__viewport', root);
  const slides = $$('.about-chapter', vp);
  const chips = $$('[data-goto]', root);
  if (!vp || !slides.length) return;
  let current = -1;

  const offsetOf = (slide) => {
    const vr = vp.getBoundingClientRect(), r = slide.getBoundingClientRect();
    return isRTL() ? vr.right - r.right : r.left - vr.left;
  };
  const setCurrent = (i) => {
    if (i === current) return;
    current = i;
    slides.forEach((s, k) => s.classList.toggle('is-current', k === i));
    chips.forEach((c, k) => {
      c.classList.toggle('is-active', k === i);
      if (k === i) c.setAttribute('aria-current', 'step'); else c.removeAttribute('aria-current');
    });
  };
  const detect = () => {
    const max = vp.scrollWidth - vp.clientWidth;
    if (max > 2 && Math.abs(vp.scrollLeft) >= max - 2) { setCurrent(slides.length - 1); return; }
    let best = 0, bestD = Infinity;
    slides.forEach((s, k) => { const d = Math.abs(offsetOf(s)); if (d < bestD) { bestD = d; best = k; } });
    setCurrent(best);
  };
  const go = (i, immediate = false) => {
    const s = slides[clamp(i, 0, slides.length - 1)];
    const d = offsetOf(s);
    vp.scrollBy({ left: isRTL() ? -d : d, behavior: immediate || prefersReducedMotion() ? 'auto' : 'smooth' });
    setCurrent(i);
  };
  chips.forEach((c) => c.addEventListener('click', () => go(parseInt(c.getAttribute('data-goto'), 10))));
  vp.addEventListener('scroll', rafThrottle(detect), { passive: true });
  new ResizeObserver(rafThrottle(detect)).observe(vp);
  onLang(() => requestAnimationFrame(() => go(Math.max(0, current), true)));
  detect();
}

/* ---------------------------------------------------------------- boot */
safe('stats', initStats);
safe('map', initMap);
safe('vision-mission', initVisionMission);
safe('values', initValues);
safe('model', initModel);
safe('journey', initJourney);
