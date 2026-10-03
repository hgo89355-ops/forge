// MOBCO pages/subsidiaries.js — Subsidiaries page behaviour.
//
//  1. Hero: logo tiles ↔ background photo strips (hover / focus spotlight)
//  2. Data hydration: company names, taglines, descriptions and focus areas come from SUBSIDIARIES
//     (site-data.js) and re-render on language change. Static English in the HTML is the no-JS fallback.
//  3. Org chart: SVG connector lines computed from the live layout (row ⇄ stacked, LTR ⇄ RTL),
//     drawn progressively with scroll; hovering a company lights its branch; clicking scrolls to it.
//  4. Showcase: scroll-spy side nav with per-company progress, deep links (#construction or the
//     cross-page ids #mobco-construction …) scroll + highlight on load, on click and on hashchange.
//  5. Capabilities accordion ↔ representative image crossfade.
//  6. "Which MOBCO company do I need?" two-step finder with recommendation + office contact.

import { t, onLang } from '../core/i18n.js';
import { scan, onScroll, getLenis } from '../core/motion.js';
import { scanUI } from '../core/ui.js';
import { $, $$, esc, icon, clamp, debounce, rafThrottle, prefersReducedMotion, isRTL, wait } from '../core/utils.js';
import { whenLoaded } from '../core/preloader.js';
import { getSubsidiary, getOffice } from '../data/site-data.js';

/* ------------------------------------------------------------------ page config */
// slug = section id on this page; id = SUBSIDIARIES id (also used as cross-page anchor by the footer/search)
const COS = [
  { slug: 'construction', id: 'mobco-construction', icons: ['hard-hat', 'building-2', 'landmark'] },
  { slug: 'developments', id: 'mobco-developments', icons: ['trees', 'layers', 'briefcase'] },
  { slug: 'real-estate', id: 'mobco-real-estate', icons: ['house', 'building', 'chart-line'] },
  { slug: 'education', id: 'elite-education', icons: ['school', 'drafting-compass', 'book-open'] },
];
const BY_SLUG = Object.fromEntries(COS.map((c) => [c.slug, c]));
const ALIAS = Object.fromEntries(COS.flatMap((c) => [[c.slug, c.slug], [c.id, c.slug]]));

const reduced = prefersReducedMotion();
const nf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

/**
 * Scroll so `el` sits just below the fixed header. Uses a numeric target on purpose: with an element
 * target Lenis also adds html scroll-padding and :target scroll-margin, which would double the header
 * offset (see docs/requests/subsidiaries.md).
 */
function scrollToEl(el, { immediate = false } = {}) {
  if (typeof el === 'string') el = document.querySelector(el);
  if (!el) return;
  const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72;
  const lenis = getLenis();
  // rect is relative to the real scroll position (Lenis' own value can lag behind a native jump)
  const y = Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY - headerH - 16));
  if (lenis) lenis.scrollTo(y, { immediate: immediate || reduced, duration: 1.2, force: true });
  else window.scrollTo({ top: y, behavior: immediate || reduced ? 'auto' : 'smooth' });
}

/* ------------------------------------------------------------------ strings (finder) */
const S = {
  recommendation: { en: 'Our recommendation', ar: 'توصيتنا' },
  match: { en: 'Best match', ar: 'الأنسب لك' },
  yourNeed: { en: 'Your need', ar: 'احتياجك' },
  location: { en: 'Location', ar: 'الموقع' },
  office: { en: 'Your contact office', ar: 'مكتب التواصل المقترح' },
  inquiry: { en: 'Send an inquiry', ar: 'أرسل استفسارك' },
  profile: { en: 'View company profile', ar: 'عرض ملف الشركة' },
  restart: { en: 'Start over', ar: 'ابدأ من جديد' },
  changeLoc: { en: 'Change location', ar: 'تغيير الموقع' },
  call: { en: 'Call', ar: 'اتصل' },
  email: { en: 'Email', ar: 'راسلنا' },
  live: { en: 'Recommended company:', ar: 'الشركة المقترحة:' },
  step2: { en: 'Step 2 of 2: Where is your project?', ar: 'الخطوة 2 من 2: أين يقع مشروعك؟' },
  step1: { en: 'Step 1 of 2: What would you like to do?', ar: 'الخطوة 1 من 2: ماذا تريد أن تفعل؟' },
};
const NEEDS = {
  build: {
    slug: 'construction',
    label: { en: 'Build', ar: 'البناء' },
    why: {
      en: 'You’re planning to build — MOBCO Construction carries the group’s contracting heritage, from high-rise and commercial to civic and educational buildings.',
      ar: 'تخطّط للبناء — وموبكو للإنشاءات تحمل إرث المجموعة في المقاولات، من الأبراج والمنشآت التجارية إلى المباني الحكومية والتعليمية.',
    },
  },
  develop: {
    slug: 'developments',
    label: { en: 'Develop', ar: 'التطوير' },
    why: {
      en: 'You’re creating a place — MOBCO Developments focuses on communities and mixed-use destinations.',
      ar: 'تسعى إلى إنشاء وجهة متكاملة — وموبكو للتطوير تركّز على تطوير المجتمعات والوجهات متعددة الاستخدامات.',
    },
  },
  invest: {
    slug: 'real-estate',
    label: { en: 'Invest', ar: 'الاستثمار' },
    why: {
      en: 'You’re looking for real estate value — MOBCO Real Estate Development creates residential and commercial assets for long-term value.',
      ar: 'تبحث عن قيمة عقارية — وموبكو للتطوير العقاري تُنشئ أصولًا سكنية وتجارية ذات قيمة طويلة الأمد.',
    },
  },
  educate: {
    slug: 'education',
    label: { en: 'Educate', ar: 'التعليم' },
    why: {
      en: 'You’re focused on learning — Elite Education Group is the group’s education arm, developing and managing learning environments.',
      ar: 'تهتمّ بالتعليم — ومجموعة النخبة التعليمية هي الذراع التعليمية للمجموعة، وتُعنى بتطوير البيئات التعليمية وإدارتها.',
    },
  },
};
const REGIONS = {
  ksa: { office: 'ksa', label: { en: 'Saudi Arabia', ar: 'المملكة العربية السعودية' } },
  egypt: { office: 'egypt', label: { en: 'Egypt', ar: 'مصر' } },
  other: {
    office: 'ksa',
    label: { en: 'Elsewhere', ar: 'مكان آخر' },
    note: {
      en: 'For projects outside Saudi Arabia and Egypt, please contact our Riyadh headquarters.',
      ar: 'للمشاريع خارج المملكة العربية السعودية ومصر، يُرجى التواصل مع مقرّنا الرئيسي في الرياض.',
    },
  },
};

/* ------------------------------------------------------------------ 2. hydration from data */
function hydrate() {
  $$('[data-sub]').forEach((root) => {
    const s = getSubsidiary(root.getAttribute('data-sub'));
    if (!s) return;
    $$('[data-sub-field]', root).forEach((el) => {
      const v = s[el.getAttribute('data-sub-field')];
      if (v) el.textContent = t(v);
    });
    const focus = $('[data-sub-focus]', root);
    if (focus) {
      const cfg = COS.find((c) => c.id === s.id);
      focus.innerHTML = s.focus.map((f, i) => `<li><span class="subs-co__focus-icon">${icon(cfg?.icons[i] || 'check')}</span><span>${esc(t(f))}</span></li>`).join('');
    }
  });
}

/* ------------------------------------------------------------------ 1. hero spotlight */
function initHero() {
  const hero = $('[data-subs-hero]');
  if (!hero) return;
  const set = (slug) => { if (slug) hero.setAttribute('data-focus', slug); else hero.removeAttribute('data-focus'); };
  $$('[data-hero-logo]', hero).forEach((a) => {
    const slug = a.getAttribute('data-hero-logo');
    a.addEventListener('pointerenter', () => set(slug));
    a.addEventListener('pointerleave', () => set(null));
    a.addEventListener('focus', () => set(slug));
    a.addEventListener('blur', () => set(null));
  });
}

/* ------------------------------------------------------------------ 4a. highlight a company */
const hlTimers = new WeakMap();
function highlight(slug, delay = 0) {
  const el = document.getElementById(slug);
  if (!el) return;
  const link = $(`[data-spy="${slug}"]`);
  clearTimeout(hlTimers.get(el));
  const run = () => {
    [el, link].forEach((x) => { if (!x) return; x.classList.remove('is-highlight'); void x.offsetWidth; x.classList.add('is-highlight'); });
    hlTimers.set(el, setTimeout(() => { el.classList.remove('is-highlight'); link?.classList.remove('is-highlight'); }, 2600));
  };
  if (delay && !reduced) hlTimers.set(el, setTimeout(run, delay)); else run();
}

function goTo(slug, { immediate = false, focus = false } = {}) {
  const el = document.getElementById(slug);
  if (!el) return;
  scrollToEl(el, { immediate: immediate || reduced });
  if (focus) {
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }
  setActive(slug);
  highlight(slug, immediate || reduced ? 120 : 700);
}

/* ------------------------------------------------------------------ 3. org chart */
function initOrg() {
  const org = $('[data-org]');
  const svg = $('[data-org-lines]', org || document);
  const parent = $('[data-org-parent]', org || document);
  if (!org || !svg || !parent) return;
  const nodes = $$('[data-org-node]', org);
  const NS = 'http://www.w3.org/2000/svg';
  let segs = []; // { el, len, from, to, key }
  let dots = []; // { el, at }
  let hot = null;
  let progress = reduced ? 1 : 0;

  // layout boxes relative to the org container, ignoring transforms (reveal / hover offsets)
  const rel = (el) => {
    let l = 0, t = 0, n = el;
    while (n && n !== org) { l += n.offsetLeft; t += n.offsetTop; n = n.offsetParent; }
    const w = el.offsetWidth, h = el.offsetHeight;
    return { l, r: l + w, t, b: t + h, cx: l + w / 2, cy: t + h / 2 };
  };
  const rowMQ = window.matchMedia('(min-width: 1024px)');

  function layout() {
    const W = org.offsetWidth, H = org.offsetHeight;
    if (!W) return;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    const P = rel(parent);
    const N = nodes.map(rel);
    const row = rowMQ.matches;
    const defs = [];
    const junctions = [];
    if (row) {
      // parent → trunk → horizontal bus → drops into each company
      const busY = Math.round(P.b + (Math.min(...N.map((n) => n.t)) - P.b) / 2);
      const xs = N.map((n) => n.cx);
      defs.push({ d: `M${P.cx} ${P.b} V${busY}`, from: 0, to: 0.28 });
      defs.push({ d: `M${P.cx} ${busY} H${Math.min(...xs)}`, from: 0.28, to: 0.56 });
      defs.push({ d: `M${P.cx} ${busY} H${Math.max(...xs)}`, from: 0.28, to: 0.56 });
      junctions.push({ x: P.cx, y: busY, at: 0.28 });
      // order the drops by distance from the centre so they land outward
      N.forEach((n, i) => {
        const dist = Math.abs(n.cx - P.cx) / Math.max(1, Math.max(...xs) - Math.min(...xs));
        const from = 0.5 + dist * 0.28;
        defs.push({ d: `M${n.cx} ${busY} V${n.t}`, from, to: Math.min(1, from + 0.22), key: nodes[i].getAttribute('data-org-node') });
        junctions.push({ x: n.cx, y: busY, at: from });
      });
    } else {
      // stacked: a spine on the inline-start side with a branch to each company
      const rtl = isRTL();
      const inset = parseFloat(getComputedStyle(org).getPropertyValue('--spine')) || 28;
      const sx = rtl ? P.r - inset : P.l + inset;
      const lastY = N[N.length - 1].cy;
      const span = Math.max(1, lastY - P.b);
      defs.push({ d: `M${sx} ${P.b} V${lastY}`, from: 0, to: 0.8 });
      N.forEach((n, i) => {
        const at = ((n.cy - P.b) / span) * 0.8;
        const ex = rtl ? n.r : n.l;
        defs.push({ d: `M${sx} ${n.cy} H${ex}`, from: at, to: Math.min(1, at + 0.16), key: nodes[i].getAttribute('data-org-node') });
        junctions.push({ x: sx, y: n.cy, at });
      });
    }
    svg.textContent = '';
    segs = defs.map((def) => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', def.d);
      p.setAttribute('class', 'subs-org__path');
      if (def.key) p.setAttribute('data-branch', def.key);
      svg.appendChild(p);
      const len = Math.max(1, p.getTotalLength());
      p.style.strokeDasharray = `${len}`;
      return { el: p, len, from: def.from, to: def.to, key: def.key };
    });
    dots = junctions.map((j) => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', j.x);
      c.setAttribute('cy', j.y);
      c.setAttribute('r', 3.5);
      c.setAttribute('class', 'subs-org__junction');
      svg.appendChild(c);
      return { el: c, at: j.at };
    });
    org.classList.toggle('is-row', row);
    org.classList.toggle('is-stacked', !row);
    paint();
    setHot(hot);
  }

  function paint() {
    for (const s of segs) {
      const local = clamp((progress - s.from) / Math.max(0.0001, s.to - s.from), 0, 1);
      s.el.style.strokeDashoffset = `${(s.len * (1 - local)).toFixed(1)}`;
      if (s.key) {
        const node = nodes.find((n) => n.getAttribute('data-org-node') === s.key);
        node?.classList.toggle('is-linked', local >= 0.999);
      }
    }
    for (const d of dots) d.el.classList.toggle('is-on', progress >= d.at + 0.02);
    parent.classList.toggle('is-linked', progress > 0.02);
  }

  function measureProgress() {
    if (reduced) { progress = 1; return; }
    // starts when the parent enters; completes when the companies reach ~72% of the viewport
    const vh = window.innerHeight;
    const o = org.getBoundingClientRect().top;
    const P = rel(parent);
    const N = nodes.map(rel);
    const top = o + P.t;
    const anchor = o + (org.classList.contains('is-row') ? Math.min(...N.map((n) => n.t)) : N[N.length - 1].cy);
    progress = clamp((vh * 0.88 - top) / Math.max(1, anchor - top + vh * 0.16), 0, 1);
  }

  function setHot(key) {
    hot = key;
    org.classList.toggle('has-hot', !!key);
    for (const s of segs) s.el.classList.toggle('is-hot', !!key && (!s.key || s.key === key));
    nodes.forEach((n) => n.classList.toggle('is-hot', n.getAttribute('data-org-node') === key));
  }

  nodes.forEach((n) => {
    const key = n.getAttribute('data-org-node');
    n.addEventListener('pointerenter', () => setHot(key));
    n.addEventListener('pointerleave', () => setHot(null));
    n.addEventListener('focus', () => setHot(key));
    n.addEventListener('blur', () => setHot(null));
  });

  const onS = rafThrottle(() => { measureProgress(); paint(); });
  onScroll(onS);
  window.addEventListener('scroll', onS, { passive: true });
  const relayout = debounce(() => { layout(); measureProgress(); paint(); }, 80);
  window.addEventListener('resize', relayout);
  rowMQ.addEventListener?.('change', relayout);
  if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(org);
  onLang(() => nf().then(() => { layout(); measureProgress(); paint(); }));
  document.fonts?.ready?.then(relayout);
  layout();
  measureProgress();
  paint();
  // expose for QA scripts
  org.__orgState = () => ({ progress, segs: segs.length, row: org.classList.contains('is-row') });
}

/* ------------------------------------------------------------------ 4b. scroll-spy nav */
let currentSpy = null;
function setActive(slug) {
  if (!slug || slug === currentSpy) return;
  currentSpy = slug;
  $$('[data-spy]').forEach((a) => {
    const on = a.getAttribute('data-spy') === slug;
    a.classList.toggle('is-active', on);
    if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
  });
  // keep the active chip visible in the horizontal (mobile) bar without moving the page
  const list = $('.subs-nav__list');
  const link = $(`[data-spy="${slug}"]`);
  if (list && link && list.scrollWidth > list.clientWidth + 2) {
    const li = link.parentElement;
    const target = li.offsetLeft - (list.clientWidth - li.offsetWidth) / 2;
    const max = list.scrollWidth - list.clientWidth;
    const left = isRTL() ? clamp(target - max, -max, 0) : clamp(target, 0, max);
    list.scrollTo({ left, behavior: reduced ? 'auto' : 'smooth' });
  }
}

function initSpy() {
  const nav = $('[data-subs-nav]');
  const arts = COS.map((c) => document.getElementById(c.slug)).filter(Boolean);
  if (!nav || !arts.length) return;
  const bars = new Map(COS.map((c) => [c.slug, $(`[data-spy="${c.slug}"] .subs-nav__bar > span`)]));
  const update = rafThrottle(() => {
    const vh = window.innerHeight;
    const line = vh * 0.42;
    let active = null;
    for (const a of arts) {
      const r = a.getBoundingClientRect();
      const p = clamp((line - r.top) / Math.max(1, r.height), 0, 1);
      bars.get(a.id)?.style.setProperty('--p', p.toFixed(3));
      // the last company whose top has crossed the reading line (gaps between cards keep the previous one)
      if (r.top <= line) active = a.id;
    }
    if (!active) active = arts[0].id;
    setActive(active);
    const sc = $('.subs-showcase');
    if (sc) {
      const r = sc.getBoundingClientRect();
      nav.classList.toggle('is-in-view', r.top < vh * 0.6 && r.bottom > vh * 0.3);
    }
  });
  onScroll(update);
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

/* ------------------------------------------------------------------ 4c. deep links */
function slugFromHash(hash) {
  try { return ALIAS[decodeURIComponent((hash || '').replace(/^#/, ''))] || null; } catch { return null; }
}
function initDeepLinks() {
  // clicks on in-page company links (hero tiles, org nodes, side nav, finder): core/motion handles the
  // scroll + focus; we add the highlight and the active state.
  // In-page links inside <main> (hero tiles, org nodes, side nav, finder, CTAs) are handled here in the
  // capture phase so they land precisely under the header (core/motion then skips them: defaultPrevented).
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('main a[href*="#"]');
    if (!a || e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || url.search !== location.search || !url.hash || url.hash === '#') return;
    let target = null;
    try { target = document.querySelector(decodeURIComponent(url.hash)); } catch { return; }
    if (!target) return;
    e.preventDefault();
    const slug = slugFromHash(url.hash);
    const dest = slug ? document.getElementById(slug) : target;
    scrollToEl(dest);
    history.pushState(null, '', url.hash);
    if (!dest.matches('a,button,input,select,textarea,[tabindex]')) dest.setAttribute('tabindex', '-1');
    dest.focus({ preventScroll: true });
    if (slug) { setActive(slug); highlight(slug, reduced ? 0 : 750); }
  }, true);
  window.addEventListener('hashchange', () => {
    const slug = slugFromHash(location.hash);
    if (slug) requestAnimationFrame(() => goTo(slug));
  });
  const initial = slugFromHash(location.hash);
  if (!initial) return;
  setActive(initial);
  // land precisely once fonts/preloader have settled (core/motion does a first, early jump)
  Promise.all([whenLoaded(), document.fonts?.ready || Promise.resolve()])
    .then(() => wait(80))
    .then(() => {
      scrollToEl(`#${initial}`, { immediate: true });
      highlight(initial, 250);
    });
}

/* ------------------------------------------------------------------ 5. capabilities */
function initCaps() {
  const acc = $('[data-caps-accordion]');
  const media = $('[data-caps-media]');
  if (!acc || !media) return;
  const imgs = $$('[data-caps-img]', media);
  const count = $('[data-caps-count]', media);
  const items = $$('[data-caps]', acc);
  const show = (key) => {
    imgs.forEach((p) => p.classList.toggle('is-active', p.getAttribute('data-caps-img') === key));
    const i = items.findIndex((it) => it.getAttribute('data-caps') === key);
    if (count && i >= 0) count.textContent = String(i + 1).padStart(2, '0');
    media.setAttribute('data-active', key);
  };
  acc.addEventListener('accordionchange', (e) => {
    const { item, open } = e.detail || {};
    if (open && item) show(item.getAttribute('data-caps'));
  });
  // hover preview on fine pointers (does not toggle the accordion)
  items.forEach((it) => {
    it.querySelector('.accordion__trigger')?.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') show(it.getAttribute('data-caps'));
    });
  });
  acc.addEventListener('pointerleave', () => {
    const open = items.find((it) => it.classList.contains('is-open'));
    if (open) show(open.getAttribute('data-caps'));
  });
}

/* ------------------------------------------------------------------ 6. finder */
function initFinder() {
  const root = $('[data-finder]');
  const form = $('[data-finder-form]', root || document);
  if (!root || !form) return;
  root.classList.add('is-enhanced');
  const steps = { 1: $('[data-step="1"]', form), 2: $('[data-step="2"]', form) };
  const result = $('[data-finder-result]', root);
  const live = $('[data-finder-live]', root);
  const nextBtn = $('[data-finder-next]', form);
  const showBtn = $('[data-finder-show]', form);
  const backBtn = $('[data-finder-back]', form);
  const indicators = $$('[data-step-ind]');
  const state = { step: 1, need: null, region: null };
  let lastPointer = 0;

  form.addEventListener('pointerdown', (e) => { if (e.target.closest('.subs-opt')) lastPointer = performance.now(); });
  form.addEventListener('submit', (e) => e.preventDefault());

  const setIndicators = () => {
    indicators.forEach((li) => {
      const n = parseInt(li.getAttribute('data-step-ind'), 10);
      li.classList.toggle('is-current', n === state.step);
      li.classList.toggle('is-done', n < state.step);
      if (n === state.step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
  };

  const animateIn = (el) => {
    el.classList.remove('is-entering');
    void el.offsetWidth;
    el.classList.add('is-entering');
  };

  function go(step, { focus = true } = {}) {
    state.step = step;
    form.hidden = step === 3;
    steps[1].hidden = step !== 1;
    steps[2].hidden = step !== 2;
    result.hidden = step !== 3;
    setIndicators();
    if (step === 3) { renderResult(); animateIn(result); }
    else animateIn(steps[step]);
    if (live) live.textContent = step === 3 ? `${t(S.live)} ${t(getSubsidiary(BY_SLUG[NEEDS[state.need].slug].id).name)}` : t(step === 1 ? S.step1 : S.step2);
    if (!focus) return;
    if (step === 3) result.focus({ preventScroll: true });
    else {
      const name = step === 1 ? 'need' : 'region';
      const target = form.querySelector(`input[name="${name}"]:checked`) || form.querySelector(`input[name="${name}"]`);
      target?.focus({ preventScroll: true });
    }
    // keep the panel in view on small screens
    const r = root.getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight * 0.6) scrollToEl(root, { immediate: reduced });
  }

  // Selection state follows the radios (pointer, keyboard arrows, form.reset()).
  const sync = (input) => {
    if (input.name === 'need' && input.checked) { state.need = input.value; nextBtn.disabled = false; }
    if (input.name === 'region' && input.checked) { state.region = input.value; showBtn.disabled = false; }
  };
  form.addEventListener('change', (e) => { if (e.target instanceof HTMLInputElement) sync(e.target); });
  // A pointer click on an option (even the one already selected) advances automatically;
  // keyboard arrow selection (also a 'click', but without a recent pointerdown) does not.
  form.addEventListener('click', (e) => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'radio') return;
    if (performance.now() - lastPointer > 900) return;
    lastPointer = 0;
    sync(input);
    const step = input.name === 'need' ? 1 : 2;
    setTimeout(() => {
      if (state.step !== step || !input.checked) return;
      go(step + 1);
    }, reduced ? 0 : 320);
  });
  // Enter on a focused option advances (keyboard parity with the auto-advance on click)
  form.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !(e.target instanceof HTMLInputElement)) return;
    e.preventDefault();
    if (e.target.name === 'need' && state.need) go(2);
    if (e.target.name === 'region' && state.region) go(3);
  });
  nextBtn.addEventListener('click', () => { if (state.need) go(2); });
  backBtn.addEventListener('click', () => go(1));
  showBtn.addEventListener('click', () => { if (state.need && state.region) go(3); });

  result.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-finder-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-finder-action');
    if (action === 'restart') {
      form.reset();
      state.need = null; state.region = null;
      nextBtn.disabled = true; showBtn.disabled = true;
      go(1);
    } else if (action === 'location') {
      go(2);
    }
  });

  function renderResult() {
    const need = NEEDS[state.need];
    const region = REGIONS[state.region] || REGIONS.other;
    if (!need) return;
    const cfg = BY_SLUG[need.slug];
    const s = getSubsidiary(cfg.id);
    const office = getOffice(region.office);
    const gold = need.slug === 'real-estate';
    const phones = (office?.phones || []).map((p) => `<a class="contact-line" href="${esc(p.href)}">${icon('phone')}<span dir="ltr">${esc(p.display)}</span></a>`).join('');
    const mail = office ? `<a class="contact-line" href="mailto:${esc(office.email)}">${icon('mail')}<span>${esc(office.email)}</span></a>` : '';
    const inquiry = `contact.html?company=${encodeURIComponent(cfg.id)}&amp;office=${encodeURIComponent(region.office)}#inquiry`;
    result.innerHTML = `
      <div class="subs-result${gold ? ' subs-result--gold' : ''}">
        <div class="subs-result__brand">
          <div class="subs-result__logo"><img src="${esc(s.logo.color)}" alt="" width="${s.logo.w}" height="${s.logo.h}" decoding="async"></div>
          <span class="badge ${gold ? 'badge--gold' : 'badge--accent'}"><span class="badge__dot"></span>${esc(t(S.match))}</span>
        </div>
        <div class="subs-result__body">
          <p class="eyebrow">${esc(t(S.recommendation))}</p>
          <h3 class="subs-result__name">${esc(t(s.name))}</h3>
          <p class="subs-result__why">${esc(t(need.why))}</p>
          <dl class="subs-result__summary">
            <div><dt>${esc(t(S.yourNeed))}</dt><dd>${esc(t(need.label))}</dd></div>
            <div><dt>${esc(t(S.location))}</dt><dd>${esc(t(region.label))}</dd></div>
          </dl>
          ${office ? `<div class="subs-result__office">
            <p class="subs-result__office-label">${esc(t(S.office))}</p>
            <p class="subs-result__office-name">${esc(t(office.name))} <span>· ${esc(t(office.city))}${office.hq ? ` · ${esc(t(office.label))}` : ''}</span></p>
            ${region.note ? `<p class="subs-result__note">${esc(t(region.note))}</p>` : ''}
            <div class="subs-result__lines">${phones}${mail}</div>
          </div>` : ''}
          <div class="subs-result__actions">
            <a class="btn btn--primary" href="${inquiry}"><span>${esc(t(S.inquiry))}</span>${icon('arrow-right', 'icon--dir')}</a>
            <a class="btn btn--ghost" href="#${cfg.slug}"><span>${esc(t(S.profile))}</span>${icon('arrow-up')}</a>
          </div>
          <div class="subs-result__links">
            <button class="subs-result__link" type="button" data-finder-action="location">${icon('arrow-left', 'icon--dir icon--sm')}<span>${esc(t(S.changeLoc))}</span></button>
            <button class="subs-result__link" type="button" data-finder-action="restart">${icon('rotate-ccw', 'icon--sm')}<span>${esc(t(S.restart))}</span></button>
          </div>
        </div>
      </div>`;
    scanUI(result);
    scan(result);
  }

  onLang(() => {
    if (state.step === 3) renderResult();
    if (live && live.textContent) live.textContent = '';
  });
  setIndicators();
  // QA handle
  root.__finderState = () => ({ ...state });
}

/* ------------------------------------------------------------------ boot */
function init() {
  hydrate();
  initHero();
  initOrg();
  initSpy();
  initCaps();
  initFinder();
  initDeepLinks();
  onLang(() => hydrate());
}

try { init(); } catch (err) { console.error('[subsidiaries] init failed', err); }
