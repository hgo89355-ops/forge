// MOBCO pages/subsidiaries.js: Subsidiaries page behaviour.
//
//  1. Data hydration: company names, taglines and the Elite Education description come from SUBSIDIARIES
//     (site-data.js) and re-render on language change. Static English in the HTML is the no-JS fallback.
//  2. The companies: photo accordion (components/accordion-gallery.js). Deep links (#construction or the
//     cross-page ids #mobco-construction ...) scroll to the gallery and open that company.
//  3. Capabilities accordion and its photo crossfade.
//  4. "Which MOBCO company do I need?" two-step finder with recommendation + office contact.

import { t, onLang } from '../core/i18n.js';
import { scan, getLenis } from '../core/motion.js';
import { scanUI } from '../core/ui.js';
import { $, $$, esc, icon, prefersReducedMotion, wait } from '../core/utils.js';
import { whenLoaded } from '../core/preloader.js';
import { getSubsidiary, getOffice } from '../data/site-data.js';
import { initAccordionGallery } from '../components/accordion-gallery.js';

/* ------------------------------------------------------------------ page config */
// slug = section id on this page; id = SUBSIDIARIES id (also used as cross-page anchor by the footer/search)
const COS = [
  { slug: 'construction', id: 'mobco-construction' },
  { slug: 'developments', id: 'mobco-developments' },
  { slug: 'real-estate', id: 'mobco-real-estate' },
  { slug: 'education', id: 'elite-education' },
];
const BY_SLUG = Object.fromEntries(COS.map((c) => [c.slug, c]));
const ALIAS = Object.fromEntries(COS.flatMap((c) => [[c.slug, c.slug], [c.id, c.slug]]));

const reduced = prefersReducedMotion();

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
  office: { en: 'Contact office', ar: 'مكتب التواصل' },
  inquiry: { en: 'Send an inquiry', ar: 'أرسل استفسارك' },
  profile: { en: 'Company profile', ar: 'صفحة الشركة' },
  restart: { en: 'Start over', ar: 'ابدأ من جديد' },
  changeLoc: { en: 'Change location', ar: 'تغيير الموقع' },
  call: { en: 'Call', ar: 'اتصل' },
  email: { en: 'Email', ar: 'راسلنا' },
  live: { en: 'Recommended company:', ar: 'الشركة المقترحة:' },
  step2: { en: 'Where is your project?', ar: 'أين يقع مشروعك؟' },
  step1: { en: 'What would you like to do?', ar: 'ماذا تريد أن تفعل؟' },
};
const NEEDS = {
  build: {
    slug: 'construction',
    label: { en: 'Build', ar: 'البناء' },
    why: {
      en: 'The construction arm of MOBCO Group, founded in 2001. It holds tier-one status, with projects in Saudi Arabia, Canada, the UK and Egypt.',
      ar: 'الذراع الإنشائية لمجموعة موبكو، تأسّست عام 2001. تحظى بتصنيف الفئة الأولى، ولها مشاريع في المملكة العربية السعودية وكندا والمملكة المتحدة ومصر.',
    },
  },
  develop: {
    slug: 'developments',
    label: { en: 'Develop', ar: 'التطوير' },
    why: {
      en: 'The group’s development arm, transforming prime locations in Canada and Egypt through innovative, high-quality projects.',
      ar: 'ذراع التطوير في المجموعة، وتعمل على تحويل مواقع متميّزة في كندا ومصر من خلال مشاريع مبتكرة عالية الجودة.',
    },
  },
  invest: {
    slug: 'real-estate',
    label: { en: 'Lease or invest', ar: 'التأجير أو الاستثمار' },
    why: {
      en: 'Leasing and property management for multi-functional buildings. Its flagship is Mivida Business Park, B1, in New Cairo.',
      ar: 'تأجير وإدارة العقارات للمباني متعددة الوظائف. ومشروعها الرئيسي مجمّع ميفيدا للأعمال، المبنى B1، في القاهرة الجديدة.',
    },
  },
  educate: {
    slug: 'education',
    label: { en: 'Educate', ar: 'التعليم' },
    why: {
      en: 'The group’s education arm. It develops and manages learning environments.',
      ar: 'الذراع التعليمية للمجموعة، وتُعنى بتطوير البيئات التعليمية وإدارتها.',
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

/* ------------------------------------------------------------------ 1. hydration from data */
function hydrate() {
  $$('[data-sub]').forEach((root) => {
    const s = getSubsidiary(root.getAttribute('data-sub'));
    if (!s) return;
    $$('[data-sub-field]', root).forEach((el) => {
      const key = el.getAttribute('data-sub-field');
      let v = s[key] ? t(s[key]) : null;
      // no client tagline yet (Elite Education): the short description, styled as a tagline (no full stop)
      if (!v && key === 'tagline' && s.short) v = t(s.short).replace(/[.。۔]\s*$/, '');
      if (v) el.textContent = v;
    });
    const about = $('[data-sub-about]', root);
    if (about) {
      const paras = s.about && s.about.length ? s.about.slice(0, 2) : [s.long || s.short].filter(Boolean);
      if (paras.length) about.innerHTML = paras.map((p) => `<p>${esc(t(p))}</p>`).join('');
    }
  });
}

/* ------------------------------------------------------------------ 2. the companies (accordion) */
let gallery = null;
function initGallery() {
  const root = $('[data-subs-gallery]');
  if (!root) return;
  gallery = initAccordionGallery(root, { defaultIndex: 0, stackAt: 640, tilt: 5, gray: 0.6, dim: 0.3, expandRatio: 0.5 });
}

function slugFromHash(hash) {
  try { return ALIAS[decodeURIComponent((hash || '').replace(/^#/, ''))] || null; } catch { return null; }
}
/** A company deep link opens its panel in the gallery (Elite Education has its own section below). */
function openCompany(slug, { immediate = false } = {}) {
  if (slug === 'education') { scrollToEl(document.getElementById('education'), { immediate }); return; }
  const i = COS.findIndex((c) => c.slug === slug);
  if (i < 0) return;
  gallery?.setActive?.(i);
  scrollToEl(document.getElementById('companies'), { immediate });
}
function initDeepLinks() {
  window.addEventListener('hashchange', () => {
    const slug = slugFromHash(location.hash);
    if (slug) requestAnimationFrame(() => openCompany(slug));
  });
  const initial = slugFromHash(location.hash);
  if (!initial) return;
  Promise.all([whenLoaded(), document.fonts?.ready || Promise.resolve()])
    .then(() => wait(80))
    .then(() => openCompany(initial, { immediate: true }));
}

/* ------------------------------------------------------------------ 3. capabilities */
function initCaps() {
  const acc = $('[data-caps-accordion]');
  const media = $('[data-caps-media]');
  if (!acc || !media) return;
  const imgs = $$('[data-caps-img]', media);
  acc.addEventListener('accordionchange', (e) => {
    const { item, open } = e.detail || {};
    if (!open || !item) return;
    const key = item.getAttribute('data-caps');
    imgs.forEach((p) => p.classList.toggle('is-active', p.getAttribute('data-caps-img') === key));
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
  const state = { step: 1, need: null, region: null };
  let lastPointer = 0;

  form.addEventListener('pointerdown', (e) => { if (e.target.closest('.subs-opt')) lastPointer = performance.now(); });
  form.addEventListener('submit', (e) => e.preventDefault());

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
        </div>
        <div class="subs-result__body">
          <h3 class="subs-result__name">${esc(t(s.name))}</h3>
          ${s.tagline ? `<p class="subs-result__tagline">${esc(t(s.tagline))}</p>` : ''}
          <p class="subs-result__why">${esc(t(need.why))}</p>
          ${office ? `<div class="subs-result__office">
            <p class="subs-result__office-label">${esc(t(S.office))}</p>
            <p class="subs-result__office-name">${esc(t(office.name))} <span>· ${esc(t(office.city))}${office.hq ? ` · ${esc(t(office.label))}` : ''}</span></p>
            ${region.note ? `<p class="subs-result__note">${esc(t(region.note))}</p>` : ''}
            <div class="subs-result__lines">${phones}${mail}</div>
          </div>` : ''}
          <div class="subs-result__actions">
            <a class="btn btn--primary" href="${inquiry}"><span>${esc(t(S.inquiry))}</span>${icon('arrow-right', 'icon--dir')}</a>
            <a class="btn btn--ghost" href="${esc(s.page || `#${cfg.slug}`)}"><span>${esc(t(S.profile))}</span>${icon('arrow-right', 'icon--dir')}</a>
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
  // QA handle
  root.__finderState = () => ({ ...state });
}

/* ------------------------------------------------------------------ boot */
function init() {
  hydrate();
  initGallery();
  initCaps();
  initFinder();
  initDeepLinks();
  onLang(() => hydrate());
}

try { init(); } catch (err) { console.error('[subsidiaries] init failed', err); }
