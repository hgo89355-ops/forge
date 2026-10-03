// MOBCO pages/projects.js — "Project Explorer"
//
//  1. Hero ring ............ 3D CircularCarousel of the FEATURED projects (shared component, not edited here)
//  2. Category tabs ........ role=tablist over PROJECT_CATEGORIES (+ All), counts, arrows/Home/End, RTL-mirrored
//     Toolbar .............. country chips · search (EN+AR, normalised) · sort · view toggle (Grid|Ring|Map|List)
//  3. Grid view ............ FLIP-animated filtering (own implementation), "load more", lazy thumbs
//     Ring view ............ second CircularCarousel (preset 'orbit') of the filtered set, capped at RING_CAP
//     Map view ............. dot world map, region pins (KSA clustered → zoom to KSA city pins), TBC side list
//     List view ............ FLIP rows + pointer-following preview (fine pointers)
//  4. Project viewer ....... full-screen overlay: pan/zoom stage, crop thumbnails, Image|Compare|Blueprint
//                            slider, facts, 3D link, prev/next in context, copy link, keyboard, deep links (#slug)
//  URL sync: ?category=&region=&view=&q=&sort=  (+ legacy ?sector=<SECTORS id> → category) and #<slug>.
//  Everything user-facing is bilingual via t() and re-rendered on langchange.

import { t, getLang, onLang } from '../core/i18n.js';
import { scan, refresh, scrollTo } from '../core/motion.js';
import { scanUI, toast, openModal, closeModal, copyText } from '../core/ui.js';
import { $, $$, esc, icon, debounce, normalize, IMAGES, clamp, hasFinePointer, prefersReducedMotion } from '../core/utils.js';
import { PROJECTS, PROJECT_CATEGORIES, REGIONS, getProject, getCategory, getRegion, studioUrl } from '../data/site-data.js';
import { WORLD } from '../data/world-map.js';
import { createCircularCarousel } from '../components/circular-carousel.js';
import { whenLoaded } from '../core/preloader.js';

/* ======================================================================
   Constants & strings
   ====================================================================== */
const PAGE = 12; // grid "load more" step
const RING_CAP = 24; // max cards in the explorer ring
const EASE = 'cubic-bezier(.16, 1, .3, 1)';
const HERO_BG = '#0b1620';
const VIEWS = ['grid', 'ring', 'map', 'list'];
const SORTS = ['featured', 'az', 'category'];
const reduced = () => prefersReducedMotion();
const isAr = () => getLang() === 'ar';
const pad = (n) => String(n).padStart(2, '0');

const S = {
  all: { en: 'All', ar: 'الكل' },
  allProjects: { en: 'All projects', ar: 'جميع المشاريع' },
  featured: { en: 'Featured projects', ar: 'المشاريع المميّزة' },
  pause: { en: 'Pause rotation', ar: 'إيقاف الدوران مؤقتًا' },
  play: { en: 'Resume rotation', ar: 'استئناف الدوران' },
  view: { en: 'View', ar: 'عرض' },
  open: { en: 'Open project', ar: 'افتح المشروع' },
  tbc: { en: 'Location to be confirmed', ar: 'الموقع قيد التأكيد' },
  cityNotStated: { en: 'City not stated', ar: 'المدينة غير محددة' },
  showing: { en: 'Showing {shown} of {total}', ar: 'عرض {shown} من أصل {total}' },
  loadMore: { en: 'Load more projects', ar: 'عرض المزيد من المشاريع' },
  remaining: { en: '{n} more', ar: '{n} إضافية' },
  ringCap: {
    en: 'The ring shows the first {cap} of {total} projects — refine the filters or switch to Grid to see them all.',
    ar: 'تعرض الحلقة أول {cap} من أصل {total} مشروعًا — استخدم المرشّحات أو انتقل إلى عرض الشبكة لرؤيتها جميعًا.',
  },
  ringHint: { en: 'Drag or use the arrow keys to spin · select a project to open it', ar: 'اسحب أو استخدم مفاتيح الأسهم للتدوير · اختر مشروعًا لفتحه' },
  whereWeBuild: { en: 'Where we build', ar: 'أين نبني' },
  mapIntro: { en: 'Select a pin or a country to list its projects.', ar: 'اختر دبوسًا أو دولةً لعرض مشاريعها.' },
  showAllKsa: { en: 'All of Saudi Arabia', ar: 'كل المملكة العربية السعودية' },
  noneHere: { en: 'No projects here with the current filters.', ar: 'لا توجد مشاريع هنا ضمن المرشّحات الحالية.' },
  search: { en: 'Search', ar: 'البحث' },
  category: { en: 'Category', ar: 'الفئة' },
  country: { en: 'Country', ar: 'الدولة' },
  location: { en: 'Location', ar: 'الموقع' },
  type: { en: 'Type', ar: 'النوع' },
  highlights: { en: 'Highlights', ar: 'أبرز الملامح' },
  explore3d: { en: 'Explore in 3D', ar: 'استكشف بالأبعاد الثلاثية' },
  illustrative: { en: 'Illustrative massing model', ar: 'نموذج كتلي توضيحي' },
  enquire: { en: 'Enquire about a similar project', ar: 'استفسر عن مشروع مماثل' },
  prev: { en: 'Previous', ar: 'السابق' },
  next: { en: 'Next', ar: 'التالي' },
  prevProject: { en: 'Previous project', ar: 'المشروع السابق' },
  nextProject: { en: 'Next project', ar: 'المشروع التالي' },
  copied: { en: 'Project link copied', ar: 'تم نسخ رابط المشروع' },
  copyFail: { en: 'Could not copy the link', ar: 'تعذّر نسخ الرابط' },
  fullView: { en: 'Full view', ar: 'المنظر الكامل' },
  detail: { en: 'detail', ar: 'تفصيل' },
  viewer: { en: 'image viewer', ar: 'عارض الصور' },
  ringRegion: { en: 'Featured projects — 3D ring', ar: 'المشاريع المميّزة — حلقة ثلاثية الأبعاد' },
  ring2Region: { en: 'Filtered projects — 3D ring', ar: 'المشاريع المُرشَّحة — حلقة ثلاثية الأبعاد' },
  blueprintPct: { en: '{n}% blueprint', ar: '{n}٪ مخطط أزرق' },
};
const fmt = (obj, vars) => t(obj).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : ''));

/* Bilingual counted nouns (Arabic: 1 / 2 / 3–10 / 11+). */
const NOUN = {
  project: { en: ['project', 'projects'], ar: ['مشروع واحد', 'مشروعان', 'مشاريع', 'مشروعًا'] },
  sector: { en: ['sector', 'sectors'], ar: ['قطاع واحد', 'قطاعان', 'قطاعات', 'قطاعًا'] },
  country: { en: ['country', 'countries'], ar: ['دولة واحدة', 'دولتان', 'دول', 'دولة'] },
};
function counted(n, noun) {
  const f = NOUN[noun];
  if (!isAr()) return `${n} ${n === 1 ? f.en[0] : f.en[1]}`;
  if (n === 1) return f.ar[0];
  if (n === 2) return f.ar[1];
  if (n >= 3 && n <= 10) return `${n} ${f.ar[2]}`;
  return `${n} ${f.ar[3]}`;
}
/** Noun only (for "33 | projects" split layouts). */
function nounFor(n, noun) {
  const f = NOUN[noun];
  if (!isAr()) return n === 1 ? f.en[0] : f.en[1];
  if (n >= 3 && n <= 10) return f.ar[2];
  return f.ar[3];
}

/* ======================================================================
   Data helpers
   ====================================================================== */
const CATS = PROJECT_CATEGORIES.filter((c) => PROJECTS.some((p) => p.category === c.id));
const FEATURED = PROJECTS.filter((p) => p.featured);
const ORDER = new Map(PROJECTS.map((p, i) => [p.slug, i]));
const catOf = (p) => getCategory(p.category);
const catName = (p) => (catOf(p) ? t(catOf(p).name) : t(p.typology));
const catIcon = (p) => catOf(p)?.icon || 'landmark';
const regionName = (p) => (p.region ? t(getRegion(p.region)?.name) : '');
const locText = (p) => (p.location ? t(p.location) : '');

/** Known cities (approximate coordinates — map pins only). Matched against the English location. */
const CITIES = [
  { id: 'riyadh', region: 'ksa', re: /riyadh/i, lonlat: [46.6753, 24.7136], name: { en: 'Riyadh', ar: 'الرياض' } },
  { id: 'jeddah', region: 'ksa', re: /jeddah/i, lonlat: [39.1925, 21.4858], name: { en: 'Jeddah', ar: 'جدة' } },
  { id: 'thuwal', region: 'ksa', re: /thuwal|kaust/i, lonlat: [39.104, 22.3095], name: { en: 'KAUST, Thuwal', ar: 'كاوست، ثول' } },
  { id: 'taif', region: 'ksa', re: /taif/i, lonlat: [40.4158, 21.2703], name: { en: 'Taif', ar: 'الطائف' } },
  { id: 'neom', region: 'ksa', re: /neom/i, lonlat: [35.25, 27.95], name: { en: 'NEOM', ar: 'نيوم' } },
  { id: 'khobar', region: 'ksa', re: /khobar/i, lonlat: [50.2083, 26.2172], name: { en: 'Al Khobar', ar: 'الخبر' } },
  { id: 'new-cairo', region: 'egypt', re: /new cairo/i, lonlat: [31.47, 30.03], name: { en: 'New Cairo', ar: 'القاهرة الجديدة' } },
  { id: 'whitby', region: 'canada', re: /whitby/i, lonlat: [-78.9429, 43.8975], name: { en: 'Port Whitby', ar: 'بورت ويتبي' } },
];
const cityOf = (p) => (p.location ? CITIES.find((c) => c.region === p.region && c.re.test(p.location.en)) || null : null);

/** Search haystack per project (EN + AR names, locations, categories, regions). */
const HAY = new Map(PROJECTS.map((p) => {
  const c = catOf(p);
  const r = p.region ? getRegion(p.region) : null;
  const parts = [p.name.en, p.name.ar, p.location?.en, p.location?.ar, c?.name.en, c?.name.ar, p.typology?.en, p.typology?.ar,
    r?.name.en, r?.name.ar, r?.short.en, r?.short.ar, p.slug.replace(/-/g, ' ')];
  return [p.slug, normalize(parts.filter(Boolean).join(' | '))];
}));

/** Image src for a base name (thumb = 480px version). */
const imgSrc = (base, thumb, ext = 'webp') => `assets/img/${thumb && base !== 'aerial-panorama' ? 'thumbs/' : ''}${base}.${ext}`;
const dims = (base) => IMAGES[base] || { w: 1022, h: 688 };

/** <picture> with a thumb + full-size srcset (cards are up to ~440px wide → 2× on retina). */
function cardPicture(p, { sizes, eager = false, alt = '' } = {}) {
  const { w, h } = dims(p.image);
  const tw = 480, th = Math.round((480 * h) / w);
  const srcset = (ext) => `assets/img/thumbs/${p.image}.${ext} 480w, assets/img/${p.image}.${ext} ${w}w`;
  return `<picture><source type="image/webp" srcset="${srcset('webp')}" sizes="${sizes}">` +
    `<img src="assets/img/thumbs/${p.image}.jpg" srcset="${srcset('jpg')}" sizes="${sizes}" alt="${esc(alt)}" width="${tw}" height="${th}"` +
    ` loading="${eager ? 'eager' : 'lazy'}" decoding="async" style="object-position:${esc(p.pos || '50% 50%')}"></picture>`;
}

/* ======================================================================
   State, URL & filtering
   ====================================================================== */
const state = { category: 'all', region: 'all', q: '', sort: 'featured', view: 'grid', limit: PAGE };

function readUrl() {
  const u = new URLSearchParams(location.search);
  const cat = u.get('category');
  if (cat && CATS.some((c) => c.id === cat)) state.category = cat;
  const sector = u.get('sector'); // cross-page contract: projects.html?sector=<SECTORS id>
  if (!cat && sector) {
    const match = CATS.find((c) => c.sectors?.includes(sector));
    if (match) state.category = match.id;
  }
  const region = u.get('region');
  if (region && REGIONS.some((r) => r.id === region)) state.region = region;
  const view = u.get('view');
  if (VIEWS.includes(view)) state.view = view;
  const sort = u.get('sort');
  if (SORTS.includes(sort)) state.sort = sort;
  state.q = (u.get('q') || '').slice(0, 80);
}

function syncUrl() {
  try {
    const url = new URL(location.href);
    const set = (k, v, d) => (v && v !== d ? url.searchParams.set(k, v) : url.searchParams.delete(k));
    set('category', state.category, 'all');
    set('region', state.region, 'all');
    set('view', state.view, 'grid');
    set('q', state.q.trim(), '');
    set('sort', state.sort, 'featured');
    url.searchParams.delete('sector');
    history.replaceState(history.state, '', url);
  } catch { /* ignore */ }
}

const matchesQuery = (p, q) => !q || q.split(/\s+/).every((w) => HAY.get(p.slug).includes(w));
function filtered({ category = state.category, region = state.region, q = state.q } = {}) {
  const nq = normalize(q);
  return PROJECTS.filter((p) => (category === 'all' || p.category === category)
    && (region === 'all' || p.region === region) && matchesQuery(p, nq));
}
function sorted(list) {
  const coll = new Intl.Collator(isAr() ? 'ar' : 'en', { sensitivity: 'base', numeric: true });
  const byName = (a, b) => coll.compare(t(a.name), t(b.name));
  const out = [...list];
  if (state.sort === 'az') out.sort(byName);
  else if (state.sort === 'category') {
    const ci = (p) => { const i = PROJECT_CATEGORIES.findIndex((c) => c.id === p.category); return i < 0 ? 99 : i; };
    out.sort((a, b) => ci(a) - ci(b) || byName(a, b));
  } else out.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || ORDER.get(a.slug) - ORDER.get(b.slug));
  return out;
}
const results = () => sorted(filtered());
const isFiltered = () => state.category !== 'all' || state.region !== 'all' || state.q.trim() !== '';

function contextLabel() {
  const parts = [];
  if (state.category !== 'all') parts.push(t(getCategory(state.category)?.name));
  if (state.region !== 'all') parts.push(t(getRegion(state.region)?.name));
  if (state.q.trim()) parts.push(`“${state.q.trim()}”`);
  return parts.length ? parts.join(' · ') : t(S.allProjects);
}

/* ======================================================================
   Elements
   ====================================================================== */
const E = {
  hero: $('[data-pj-hero]'),
  ring: $('[data-pj-ring]'),
  ringControls: $('[data-pj-ring-controls]'),
  ringToggle: $('[data-pj-ring-toggle]'),
  ringToggleLabel: $('[data-pj-ring-toggle-label]'),
  ringHint: $('[data-pj-ring-hint]'),
  total: $('[data-pj-total]'),
  totalLabel: $('[data-pj-total-label]'),
  facets: $('[data-pj-facets]'),
  explorer: $('#explore'),
  tabs: $('[data-pj-tabs]'),
  tablist: $('[data-pj-tablist]'),
  tabScroller: $('[data-pj-tabs-scroller]'),
  indicator: $('[data-pj-tabs-indicator]'),
  regions: $('[data-pj-regions]'),
  search: $('[data-pj-search]'),
  searchClear: $('[data-pj-search-clear]'),
  sort: $('[data-pj-sort]'),
  viewToggle: $('[data-pj-viewtoggle]'),
  status: $('[data-pj-status]'),
  results: $('[data-pj-results]'),
  grid: $('[data-pj-grid]'),
  more: $('[data-pj-more]'),
  moreBtn: $('[data-pj-more-btn]'),
  moreLabel: $('[data-pj-more-label]'),
  moreProgress: $('[data-pj-more-progress]'),
  ring2: $('[data-pj-ring2]'),
  ring2Note: $('[data-pj-ring2-note]'),
  mapCanvas: $('[data-pj-map-canvas]'),
  mapSvg: $('[data-pj-map-svg]'),
  mapPins: $('[data-pj-map-pins]'),
  mapBack: $('[data-pj-map-back]'),
  mapPanel: $('[data-pj-map-panel]'),
  list: $('[data-pj-list]'),
  preview: $('[data-pj-preview]'),
  empty: $('[data-pj-empty]'),
  cats: $('[data-pj-cats]'),
};

/* ======================================================================
   1. HERO RING
   ====================================================================== */
let heroRing = null;
let heroUserPaused = false;

const ringLabels = (region) => (isAr()
  ? {
    region: t(region), carousel: 'عرض دوّار', slideRole: 'شريحة',
    slide: ({ title, index, count }) => `${title}، ${index} من ${count}`,
    live: ({ title, index, count }) => `${title}، ${index} من ${count}`,
    untitled: 'مشروع {index}',
  }
  : { region: t(region), carousel: 'carousel', slideRole: 'slide', slide: '{title}, {index} of {count}', live: '{title}, {index} of {count}', untitled: 'Project {index}' });

const ringItem = (p, thumb) => ({
  src: imgSrc(p.image, thumb),
  alt: p.imageNote ? t(p.imageNote) : '',
  title: t(p.name),
  subtitle: [catName(p), locText(p)].filter(Boolean).join(' · '),
  data: { slug: p.slug },
});
const heroCardWidth = () => (innerWidth < 640 ? 172 : innerWidth < 1024 ? 220 : innerWidth < 1800 ? 264 : 300);
const heroItems = () => FEATURED.map((p) => ringItem(p, innerWidth < 768));

function updateRingToggle() {
  if (!heroRing || !E.ringToggle) return;
  const paused = heroRing.paused;
  E.ringToggle.classList.toggle('is-paused', paused);
  E.ringToggleLabel.textContent = t(paused ? S.play : S.pause);
}

function initHeroRing() {
  if (!E.hero || !E.ring) return;
  E.hero.setAttribute('data-ring-state', 'pending');
  whenLoaded().then(() => {
    try {
      heroRing = createCircularCarousel(E.ring, {
        items: heroItems(),
        preset: 'cylinder',
        intro: 'rise',
        captions: true,
        fadeColor: HERO_BG,
        cardWidth: heroCardWidth(),
        aspectRatio: 1.4,
        cornerRadius: 2,
        gap: 22,
        autoplay: 'drift',
        speed: 10,
        depthFade: 0.7,
        labels: ringLabels(S.ringRegion),
        rtl: isAr(),
        style: { '--cc-focus': 'var(--teal-400)', '--cc-placeholder': 'var(--navy-800)' },
        onItemClick: (item) => openProject(item.data.slug, { list: FEATURED, context: t(S.featured), trigger: heroRing?.element }),
      });
      E.hero.setAttribute('data-ring-state', 'ready');
      E.ringControls.hidden = false;
      E.ringHint.hidden = false;
      // Reduced motion: the component never autoplays → no pause button needed.
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) E.ringToggle.hidden = true;
      updateRingToggle();
    } catch (err) {
      console.error('[projects] hero ring failed — showing the static fallback', err);
      E.hero.setAttribute('data-ring-state', 'failed');
    }
  });

  E.ringToggle?.addEventListener('click', () => {
    if (!heroRing) return;
    if (heroRing.paused) { heroRing.play(); heroUserPaused = false; } else { heroRing.pause(); heroUserPaused = true; }
    updateRingToggle();
  });
  $('[data-pj-ring-prev]')?.addEventListener('click', () => heroRing?.prev());
  $('[data-pj-ring-next]')?.addEventListener('click', () => heroRing?.next());

  let lastW = innerWidth;
  addEventListener('resize', debounce(() => {
    if (!heroRing || innerWidth === lastW) return;
    const crossed = (lastW < 768) !== (innerWidth < 768);
    lastW = innerWidth;
    heroRing.update(crossed ? { cardWidth: heroCardWidth(), items: heroItems() } : { cardWidth: heroCardWidth() });
  }, 200));
}

/* ======================================================================
   Hero counts (live from data)
   ====================================================================== */
function renderHeroCounts() {
  const n = PROJECTS.length;
  const sectors = CATS.length;
  const countries = new Set(PROJECTS.map((p) => p.region).filter(Boolean)).size;
  if (E.total) E.total.textContent = String(n);
  if (E.totalLabel) E.totalLabel.textContent = nounFor(n, 'project');
  if (E.facets) E.facets.textContent = `${counted(sectors, 'sector')} · ${counted(countries, 'country')}`;
}

/* ======================================================================
   2. CATEGORY TABS + TOOLBAR
   ====================================================================== */
const TAB_DEFS = () => [{ id: 'all', icon: 'layout-grid', name: S.all }, ...CATS];

function buildTabs() {
  E.tablist.innerHTML = TAB_DEFS().map((c) => `
    <button class="pj-tab" type="button" role="tab" id="pj-tab-${c.id}" data-cat="${c.id}" aria-controls="pj-results" aria-selected="false" tabindex="-1">
      <span class="pj-tab__top">${icon(c.icon, 'pj-tab__icon')}<span class="pj-tab__count num" data-count></span></span>
      <span class="pj-tab__label">${esc(t(c.name))}</span>
    </button>`).join('');
  updateTabs();
}

function updateTabs() {
  const base = filtered({ category: 'all' });
  $$('.pj-tab', E.tablist).forEach((btn) => {
    const id = btn.dataset.cat;
    const n = id === 'all' ? base.length : base.filter((p) => p.category === id).length;
    const sel = id === state.category;
    btn.setAttribute('aria-selected', String(sel));
    btn.tabIndex = sel ? 0 : -1;
    btn.classList.toggle('is-empty', n === 0);
    const c = $('[data-count]', btn);
    c.textContent = pad(n);
    btn.setAttribute('aria-label', `${btn.querySelector('.pj-tab__label').textContent} (${counted(n, 'project')})`);
  });
  E.results.setAttribute('aria-labelledby', `pj-tab-${state.category}`);
  E.results.removeAttribute('aria-label');
  requestAnimationFrame(positionIndicator);
}

function positionIndicator(scrollIntoView = false) {
  const btn = $(`.pj-tab[data-cat="${state.category}"]`, E.tablist);
  if (!btn || !E.indicator) return;
  // Physical geometry on purpose (works the same in LTR and RTL).
  const sr = E.tabScroller.getBoundingClientRect();
  const br = btn.getBoundingClientRect();
  const x = br.left - sr.left + E.tabScroller.scrollLeft;
  E.indicator.style.width = `${br.width}px`;
  E.indicator.style.transform = `translateX(${x}px)`;
  if (scrollIntoView) {
    const pad2 = 48;
    if (br.left < sr.left + pad2) E.tabScroller.scrollBy({ left: br.left - sr.left - pad2, behavior: reduced() ? 'auto' : 'smooth' });
    else if (br.right > sr.right - pad2) E.tabScroller.scrollBy({ left: br.right - sr.right + pad2, behavior: reduced() ? 'auto' : 'smooth' });
  }
  updateTabFades();
}

function updateTabFades() {
  const el = E.tabScroller;
  const kids = el.firstElementChild?.children;
  if (!kids?.length) return;
  const r = el.getBoundingClientRect();
  const first = kids[0].getBoundingClientRect();
  const last = kids[kids.length - 1].getBoundingClientRect();
  const minL = Math.min(first.left, last.left), maxR = Math.max(first.right, last.right);
  E.tabs.classList.toggle('fade-left', minL < r.left - 2);
  E.tabs.classList.toggle('fade-right', maxR > r.right + 2);
}

function initTabs() {
  buildTabs();
  E.tablist.addEventListener('click', (e) => {
    const btn = e.target.closest('.pj-tab');
    if (!btn) return;
    setCategory(btn.dataset.cat, { scroll: false });
  });
  E.tablist.addEventListener('keydown', (e) => {
    const tabs = $$('.pj-tab', E.tablist);
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const fwd = isAr() ? 'ArrowLeft' : 'ArrowRight';
    const back = isAr() ? 'ArrowRight' : 'ArrowLeft';
    let j = null;
    if (e.key === fwd) j = (i + 1) % tabs.length;
    else if (e.key === back) j = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = tabs.length - 1;
    if (j === null) return;
    e.preventDefault();
    tabs[j].focus();
    setCategory(tabs[j].dataset.cat, { scroll: false });
  });
  E.tabScroller.addEventListener('scroll', () => requestAnimationFrame(updateTabFades), { passive: true });
  addEventListener('resize', debounce(() => positionIndicator(), 120));
  if ('ResizeObserver' in window) new ResizeObserver(() => positionIndicator()).observe(E.tablist);
}

function setCategory(id, { scroll = false } = {}) {
  if (!TAB_DEFS().some((c) => c.id === id)) id = 'all';
  const changed = id !== state.category;
  state.category = id;
  updateTabs();
  requestAnimationFrame(() => positionIndicator(true));
  if (changed) update();
  if (scroll) scrollTo(E.explorer);
}

/* Country chips */
function buildRegions() {
  const defs = [{ id: 'all', name: S.all }, ...REGIONS.map((r) => ({ id: r.id, name: r.short }))];
  E.regions.innerHTML = defs.map((r) => `
    <button class="chip chip--sm pj-region" type="button" data-region="${r.id}" aria-pressed="false">
      ${r.id === 'all' ? icon('globe-2', 'icon--sm') : ''}<span>${esc(t(r.name))}</span><span class="chip__count num" data-count></span>
    </button>`).join('');
  updateRegions();
}
function updateRegions() {
  const base = filtered({ region: 'all' });
  $$('.pj-region', E.regions).forEach((b) => {
    const id = b.dataset.region;
    const n = id === 'all' ? base.length : base.filter((p) => p.region === id).length;
    b.setAttribute('aria-pressed', String(id === state.region));
    $('[data-count]', b).textContent = String(n);
    b.classList.toggle('is-empty', n === 0);
  });
}

function initToolbar() {
  buildRegions();
  E.regions.addEventListener('click', (e) => {
    const b = e.target.closest('.pj-region');
    if (!b || b.dataset.region === state.region) return;
    state.region = b.dataset.region;
    update();
  });

  E.search.value = state.q;
  E.searchClear.hidden = !state.q;
  const onSearch = debounce(() => { state.q = E.search.value.slice(0, 80); update(); }, 140);
  E.search.addEventListener('input', () => { E.searchClear.hidden = !E.search.value; onSearch(); });
  E.search.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && E.search.value) { e.preventDefault(); e.stopPropagation(); clearSearch(); }
  });
  E.searchClear.addEventListener('click', () => { clearSearch(); E.search.focus(); });

  E.sort.value = state.sort;
  E.sort.addEventListener('change', () => { state.sort = SORTS.includes(E.sort.value) ? E.sort.value : 'featured'; update(); });

  E.viewToggle.addEventListener('click', (e) => {
    const b = e.target.closest('[data-view-btn]');
    if (b) setView(b.dataset.viewBtn);
  });

  $$('[data-pj-reset]').forEach((b) => b.addEventListener('click', resetFilters));
  E.moreBtn.addEventListener('click', loadMore);
}
function clearSearch() {
  E.search.value = '';
  E.searchClear.hidden = true;
  state.q = '';
  update();
}
function resetFilters() {
  state.category = 'all';
  state.region = 'all';
  state.q = '';
  E.search.value = '';
  E.searchClear.hidden = true;
  updateTabs();
  requestAnimationFrame(() => positionIndicator(true));
  update();
}
function localizeSortOptions() {
  const labels = { featured: { en: 'Featured first', ar: 'المميّزة أولًا' }, az: { en: 'A–Z', ar: 'أبجديًا' }, category: { en: 'By category', ar: 'حسب الفئة' } };
  $$('option', E.sort).forEach((o) => { o.textContent = t(labels[o.value]); });
}

/* ======================================================================
   Update cycle
   ====================================================================== */
function update({ animate = true, resetLimit = true } = {}) {
  if (resetLimit) state.limit = PAGE;
  updateTabs();
  updateRegions();
  const list = results();
  E.empty.hidden = list.length > 0;
  $$('[data-pj-reset]').forEach((b) => { if (!b.closest('[data-pj-empty]')) b.hidden = !isFiltered(); });
  renderView(list, animate);
  renderStatus(list);
  syncUrl();
}

function renderStatus(list) {
  const total = list.length;
  let text;
  if (state.view === 'grid' && total > state.limit) text = `${fmt(S.showing, { shown: state.limit, total })} ${nounFor(total, 'project')}`;
  else if (state.view === 'ring' && total > RING_CAP) text = `${fmt(S.showing, { shown: RING_CAP, total })} ${nounFor(total, 'project')}`;
  else text = counted(total, 'project');
  if (isFiltered()) text += ` — ${contextLabel()}`;
  E.status.textContent = text;
}

function setView(view, { initial = false } = {}) {
  if (!VIEWS.includes(view)) view = 'grid';
  const prev = state.view;
  state.view = view;
  $$('[data-view-btn]', E.viewToggle).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.viewBtn === view)));
  $$('.pj-view', E.results).forEach((v) => { v.hidden = v.dataset.view !== view; });
  if (prev === 'ring' && view !== 'ring') destroyRing2();
  if (prev === 'map' && view !== 'map') hidePreview();
  if (!initial) update({ animate: false, resetLimit: false });
  refresh();
}

function renderView(list, animate) {
  const v = state.view;
  if (v === 'grid') renderGrid(list, animate);
  else if (v === 'list') renderList(list, animate);
  else if (v === 'ring') renderRing2(list);
  else if (v === 'map') renderMap(list);
  const empty = list.length === 0;
  $$('.pj-view', E.results).forEach((el) => el.classList.toggle('is-empty', empty));
}

/* ======================================================================
   FLIP (First, Last, Invert, Play) — own implementation, Web Animations API
   ====================================================================== */
function flip(container, nextEls, animate) {
  const doAnim = animate && !reduced() && typeof Element.prototype.animate === 'function';
  $$(':scope > .is-ghost', container).forEach((g) => g.remove());
  const prev = new Map();
  if (doAnim) {
    for (const el of container.children) {
      if (el.hidden) continue;
      const r = el.getBoundingClientRect();
      if (r.width || r.height) prev.set(el, r);
    }
  }
  const keep = new Set(nextEls);
  const cRect = container.getBoundingClientRect();
  const ghosts = [];
  if (doAnim) {
    for (const el of container.children) {
      if (keep.has(el)) continue;
      const r = prev.get(el);
      if (!r || r.bottom < 0 || r.top > innerHeight) continue;
      const g = el.cloneNode(true);
      g.classList.add('is-ghost');
      g.setAttribute('aria-hidden', 'true');
      g.inert = true;
      g.style.cssText = `position:absolute;left:${r.left - cRect.left}px;top:${r.top - cRect.top}px;width:${r.width}px;height:${r.height}px;margin:0;pointer-events:none;`;
      ghosts.push(g);
    }
  }
  for (const el of container.children) el.getAnimations?.().forEach((a) => a.cancel());
  container.replaceChildren(...nextEls);
  if (!doAnim) return;
  ghosts.forEach((g) => {
    container.append(g);
    const a = g.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.94)' }], { duration: 260, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
    a.finished.then(() => g.remove(), () => g.remove());
  });
  let entering = 0;
  nextEls.forEach((el) => {
    if (el.hidden) return;
    const first = prev.get(el);
    const last = el.getBoundingClientRect();
    if (first) {
      const dx = first.left - last.left, dy = first.top - last.top;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 640, easing: EASE });
      }
    } else if (last.bottom > 0 && last.top < innerHeight) {
      el.animate([{ opacity: 0, transform: 'translateY(28px) scale(.97)' }, { opacity: 1, transform: 'none' }],
        { duration: 640, delay: 80 + Math.min(entering++, 10) * 45, easing: EASE, fill: 'backwards' });
    }
  });
}

/* ======================================================================
   3. GRID VIEW
   ====================================================================== */
let cardCache = new Map();
function cardEl(p) {
  let li = cardCache.get(p.slug);
  if (li) return li;
  li = document.createElement('li');
  li.className = 'pj-item';
  li.id = p.slug;
  li.dataset.slug = p.slug;
  const loc = locText(p) || t(S.tbc);
  li.innerHTML = `
    <a class="pj-card${p.location ? '' : ' is-tbc'}" href="projects.html#${esc(p.slug)}" data-slug="${esc(p.slug)}" data-cursor="view" data-cursor-label="${esc(t(S.view))}">
      <span class="pj-card__media">
        ${cardPicture(p, { sizes: '(min-width: 1024px) 420px, (min-width: 640px) 46vw, 92vw', alt: t(p.name) })}
        <span class="pj-card__idx num" data-idx></span>
        <span class="pj-card__open" aria-hidden="true">${icon('arrow-up-right', 'icon--dir')}</span>
      </span>
      <span class="pj-card__body">
        <span class="pj-card__cat">${icon(catIcon(p), 'icon--sm')}<span>${esc(catName(p))}</span></span>
        <span class="pj-card__title" role="heading" aria-level="3">${esc(t(p.name))}</span>
        <span class="pj-card__loc">${icon('map-pin', 'icon--sm')}<span>${esc(loc)}</span></span>
      </span>
    </a>`;
  cardCache.set(p.slug, li);
  return li;
}

function renderGrid(list, animate) {
  // Every result stays in the DOM (so #<slug> anchors always resolve); cards past the "load more" limit are hidden.
  const els = list.map(cardEl);
  els.forEach((el, i) => {
    el.querySelector('[data-idx]').textContent = pad(i + 1);
    el.hidden = i >= state.limit;
  });
  flip(E.grid, els, animate);
  const shown = list.slice(0, state.limit);
  const rest = list.length - shown.length;
  E.more.hidden = rest <= 0;
  if (rest > 0) {
    E.moreLabel.textContent = `${t(S.loadMore)} · ${fmt(S.remaining, { n: rest })}`;
    E.moreProgress.style.transform = `scaleX(${shown.length / list.length})`;
  }
  scan(E.grid);
}

function loadMore() {
  const before = state.limit;
  state.limit += PAGE;
  const list = results();
  renderGrid(list, true);
  renderStatus(list);
  // Move focus to the first newly shown card (keyboard users keep their place).
  const first = E.grid.children[before]?.querySelector('a');
  first?.focus({ preventScroll: true });
}

/* ======================================================================
   LIST VIEW
   ====================================================================== */
let rowCache = new Map();
function rowEl(p) {
  let li = rowCache.get(p.slug);
  if (li) return li;
  li = document.createElement('li');
  li.className = 'pj-li';
  li.dataset.slug = p.slug;
  li.innerHTML = `
    <a class="pj-row" href="projects.html#${esc(p.slug)}" data-slug="${esc(p.slug)}">
      <span class="pj-row__idx num" data-idx></span>
      <span class="pj-row__thumb"><img src="${imgSrc(p.image, true, 'jpg')}" alt="" width="96" height="64" loading="lazy" decoding="async" style="object-position:${esc(p.pos || '50% 50%')}"></span>
      <span class="pj-row__name"><span class="pj-row__title">${esc(t(p.name))}</span><span class="pj-row__sub">${esc(catName(p))}${p.location ? ` · ${esc(locText(p))}` : ''}</span></span>
      <span class="pj-row__cat">${icon(catIcon(p), 'icon--sm')}<span>${esc(catName(p))}</span></span>
      <span class="pj-row__loc${p.location ? '' : ' is-tbc'}">${esc(locText(p) || t(S.tbc))}</span>
      <span class="pj-row__arrow" aria-hidden="true">${icon('arrow-right', 'icon--dir')}</span>
    </a>`;
  rowCache.set(p.slug, li);
  return li;
}
function renderList(list, animate) {
  const els = list.map(rowEl);
  els.forEach((el, i) => { el.querySelector('[data-idx]').textContent = pad(i + 1); });
  flip(E.list, els, animate);
  scan(E.list);
}

/* Pointer-following preview (fine pointers only) */
let previewSlug = null, previewRaf = 0, px = 0, py = 0;
function hidePreview() { E.preview?.classList.remove('is-visible'); previewSlug = null; }
function initListPreview() {
  if (!E.preview) return;
  E.list.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !hasFinePointer() || reduced()) return;
    const row = e.target.closest('.pj-row');
    if (!row) { hidePreview(); return; }
    px = e.clientX; py = e.clientY;
    if (row.dataset.slug !== previewSlug) {
      previewSlug = row.dataset.slug;
      const p = getProject(previewSlug);
      E.preview.innerHTML = `<img src="${imgSrc(p.image, true)}" alt="" width="480" height="${Math.round(480 * dims(p.image).h / dims(p.image).w)}" decoding="async">`;
    }
    E.preview.classList.add('is-visible');
    if (!previewRaf) previewRaf = requestAnimationFrame(() => {
      previewRaf = 0;
      const r = E.list.getBoundingClientRect();
      E.preview.style.transform = `translate(${px - r.left + 28}px, ${py - r.top - 90}px)`;
    });
  });
  E.list.addEventListener('pointerleave', hidePreview);
}

/* ======================================================================
   RING VIEW (second carousel)
   ====================================================================== */
let ring2 = null;
const ring2CardWidth = () => (innerWidth < 640 ? 150 : innerWidth < 1024 ? 180 : 210);
function renderRing2(list) {
  const items = list.slice(0, RING_CAP).map((p) => ringItem(p, true));
  E.ring2Note.textContent = list.length > RING_CAP ? fmt(S.ringCap, { cap: RING_CAP, total: list.length }) : t(S.ringHint);
  if (!items.length) { destroyRing2(); return; }
  const opts = {
    items, labels: ringLabels(S.ring2Region), rtl: isAr(), cardWidth: ring2CardWidth(),
  };
  if (ring2) { ring2.update(opts); return; }
  try {
    ring2 = createCircularCarousel(E.ring2, {
      ...opts,
      preset: 'orbit',
      intro: 'assemble',
      captions: true,
      fadeColor: HERO_BG,
      aspectRatio: 1.4,
      cornerRadius: 2,
      gap: 18,
      autoplay: 'drift',
      speed: 7,
      style: { '--cc-focus': 'var(--teal-400)', '--cc-placeholder': 'var(--navy-800)' },
      onItemClick: (item) => openProject(item.data.slug, { list: results(), context: contextLabel(), trigger: ring2?.element }),
    });
  } catch (err) {
    console.error('[projects] ring view failed', err);
    setView('grid');
  }
}
function destroyRing2() { if (ring2) { ring2.destroy(); ring2 = null; } }

/* ======================================================================
   MAP VIEW
   ====================================================================== */
// Natural Earth projection (d3 naturalEarth1 raw), calibrated on the office markers of WORLD.
function neRaw(lon, lat) {
  const l = (lon * Math.PI) / 180, p = (lat * Math.PI) / 180, p2 = p * p, p4 = p2 * p2;
  return [
    l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4))),
    p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4))),
  ];
}
const PROJ = (() => {
  const a = WORLD.offices.ksa, b = WORLD.offices.canada;
  const A = neRaw(...a.lonlat), B = neRaw(...b.lonlat);
  const k = (a.xy[0] - b.xy[0]) / (A[0] - B[0]);
  return { k, tx: a.xy[0] - k * A[0], ty: a.xy[1] + k * A[1] };
})();
const project = ([lon, lat]) => { const [X, Y] = neRaw(lon, lat); return [PROJ.tx + PROJ.k * X, PROJ.ty - PROJ.k * Y]; };

const MAP = { built: false, vb: [0, 0, 1000, 440], anim: 0, zoom: null /* 'ksa' | null */, region: null, city: null };
const WORLD_VB = () => (E.mapCanvas.clientWidth < 720 ? [255, 62, 470, 206.8] : [0, 0, 1000, 440]);
const KSA_VB = (() => {
  const pts = [[34.4, 16.2], [55.8, 16.2], [34.4, 32.3], [55.8, 32.3], [45, 32.3], [45, 16.2]].map(project);
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
  let w = (x1 - x0) * 1.5, h = (y1 - y0) * 1.3;
  const ratio = 1000 / 440;
  if (w / h < ratio) w = h * ratio; else h = w / ratio;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return [cx - w / 2, cy - h / 2, w, h];
})();
const REGION_PINS = {
  ksa: { xy: WORLD.offices.ksa.xy, label: 'end' },
  egypt: { xy: WORLD.offices.egypt.xy, label: 'start' },
  canada: { xy: WORLD.offices.canada.xy, label: 'end' },
};

function buildMap() {
  if (MAP.built) return;
  MAP.built = true;
  const dots = WORLD.dots.filter(([, y]) => y < 445)
    .map(([x, y, k]) => `<circle cx="${x}" cy="${y}" r="1.55"${k ? ` class="is-hl"` : ''}/>`).join('');
  E.mapSvg.innerHTML = `
    <g class="pj-map__land"><path d="${WORLD.land}"/></g>
    <g class="pj-map__borders"><path d="${WORLD.borders}"/></g>
    <g class="pj-map__ksa"><path d="${WORLD.highlight.ksa}"/></g>
    <g class="pj-map__dots">${dots}</g>`;
  MAP.vb = WORLD_VB();
  E.mapSvg.setAttribute('viewBox', MAP.vb.join(' '));
  E.mapBack.addEventListener('click', () => { MAP.region = null; MAP.city = null; zoomMap(null); renderMap(results()); });
  E.mapPins.addEventListener('click', onMapClick);
  E.mapPanel.addEventListener('click', onMapClick);
  if ('ResizeObserver' in window) {
    let w = 0;
    new ResizeObserver(() => {
      if (E.mapCanvas.clientWidth === w) return;
      w = E.mapCanvas.clientWidth;
      if (!MAP.zoom) { MAP.vb = WORLD_VB(); E.mapSvg.setAttribute('viewBox', MAP.vb.join(' ')); }
      placePins();
    }).observe(E.mapCanvas);
  }
}

function onMapClick(e) {
  const proj = e.target.closest('[data-open-slug]');
  if (proj) {
    e.preventDefault();
    const list = mapListFor(results());
    openProject(proj.dataset.openSlug, { list, context: proj.dataset.context || contextLabel(), trigger: proj });
    return;
  }
  const reg = e.target.closest('[data-map-region]');
  if (reg) {
    const id = reg.dataset.mapRegion;
    MAP.region = id === MAP.region && !MAP.city ? null : id;
    MAP.city = null;
    zoomMap(MAP.region === 'ksa' ? 'ksa' : null);
    renderMap(results());
    return;
  }
  const city = e.target.closest('[data-map-city]');
  if (city) {
    MAP.city = city.dataset.mapCity === MAP.city ? null : city.dataset.mapCity;
    renderMap(results());
  }
}

/** Projects in the order the map panel lists them (viewer prev/next follow this order). */
function mapListFor(list) {
  if (MAP.region) {
    let l = list.filter((p) => p.region === MAP.region);
    if (MAP.city) l = l.filter((p) => (cityOf(p)?.id || 'none') === MAP.city);
    return l;
  }
  return list;
}

function zoomMap(target) {
  MAP.zoom = target;
  E.mapSvg.classList.toggle('is-zoomed', !!target);
  E.mapCanvas.classList.toggle('is-zoomed', !!target);
  E.mapBack.hidden = !target;
  const to = target === 'ksa' ? KSA_VB : WORLD_VB();
  const from = [...MAP.vb];
  cancelAnimationFrame(MAP.anim);
  if (reduced()) { MAP.vb = to; E.mapSvg.setAttribute('viewBox', to.join(' ')); placePins(); return; }
  const t0 = performance.now(), dur = 950;
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const step = (now) => {
    const k = ease(Math.min(1, (now - t0) / dur));
    MAP.vb = from.map((v, i) => v + (to[i] - v) * k);
    E.mapSvg.setAttribute('viewBox', MAP.vb.join(' '));
    placePins();
    if (k < 1) MAP.anim = requestAnimationFrame(step);
  };
  MAP.anim = requestAnimationFrame(step);
}

function placePins() {
  const [vx, vy, vw, vh] = MAP.vb;
  $$('.pj-pin', E.mapPins).forEach((pin) => {
    const x = +pin.dataset.x, y = +pin.dataset.y;
    // Physical left/top on purpose: the map is never mirrored.
    pin.style.left = `${((x - vx) / vw) * 100}%`;
    pin.style.top = `${((y - vy) / vh) * 100}%`;
  });
}

function mapRow(p, context) {
  return `<li><button class="pj-mrow" type="button" data-open-slug="${esc(p.slug)}" data-context="${esc(context)}">
    <span class="pj-mrow__thumb"><img src="${imgSrc(p.image, true, 'jpg')}" alt="" width="72" height="48" loading="lazy" decoding="async" style="object-position:${esc(p.pos || '50% 50%')}"></span>
    <span class="pj-mrow__text"><span class="pj-mrow__name">${esc(t(p.name))}</span><span class="pj-mrow__meta">${esc(catName(p))}</span></span>
    ${icon('arrow-right', 'icon--sm icon--dir pj-mrow__arrow')}</button></li>`;
}

function renderMap(list) {
  buildMap();
  const byRegion = (id) => list.filter((p) => p.region === id);
  const tbc = list.filter((p) => !p.region);
  if (MAP.region && !byRegion(MAP.region).length) { MAP.region = null; MAP.city = null; }
  if (MAP.zoom && MAP.region !== 'ksa') zoomMap(null);

  // Pins
  let pins = '';
  if (MAP.zoom === 'ksa') {
    const ksa = byRegion('ksa');
    CITIES.filter((c) => c.region === 'ksa').forEach((c) => {
      const n = ksa.filter((p) => cityOf(p)?.id === c.id).length;
      if (!n) return;
      const [x, y] = project(c.lonlat);
      const label = c.id === 'thuwal' || c.id === 'neom' ? 'start' : 'end';
      pins += pinHtml({ x, y, n, label: t(c.name), side: label, attr: `data-map-city="${c.id}"`, pressed: MAP.city === c.id, city: true });
    });
  } else {
    REGIONS.forEach((r) => {
      const n = byRegion(r.id).length;
      if (!n) return;
      const [x, y] = REGION_PINS[r.id].xy;
      pins += pinHtml({ x, y, n, label: t(r.name), side: REGION_PINS[r.id].label, attr: `data-map-region="${r.id}"`, pressed: MAP.region === r.id });
    });
  }
  E.mapPins.innerHTML = pins;
  placePins();

  // Side panel
  let html = '';
  if (MAP.region) {
    const r = getRegion(MAP.region);
    const items = byRegion(MAP.region);
    html += `<div class="pj-map__phead">
      <button class="pj-map__crumb" type="button" data-map-region="${r.id}">${icon('arrow-left', 'icon--sm icon--dir')}<span>${esc(t(S.whereWeBuild))}</span></button>
      <h3 class="pj-map__title">${esc(t(r.name))}</h3><p class="pj-map__count">${esc(counted(items.length, 'project'))}</p></div>`;
    if (MAP.region === 'ksa') {
      const groups = [];
      CITIES.filter((c) => c.region === 'ksa').forEach((c) => {
        const g = items.filter((p) => cityOf(p)?.id === c.id);
        if (g.length) groups.push({ id: c.id, name: t(c.name), items: g });
      });
      const none = items.filter((p) => !cityOf(p));
      if (none.length) groups.push({ id: 'none', name: t(S.cityNotStated), items: none });
      const shown = MAP.city ? groups.filter((g) => g.id === MAP.city) : groups;
      if (MAP.city) html += `<button class="pj-map__all" type="button" data-map-city="${esc(MAP.city)}">${icon('x', 'icon--sm')}<span>${esc(t(S.showAllKsa))}</span></button>`;
      html += shown.map((g) => `<div class="pj-map__group"><p class="pj-map__gname">${icon('map-pin', 'icon--sm')}<span>${esc(g.name)}</span><span class="num">${g.items.length}</span></p>
        <ul class="pj-map__rows" role="list">${g.items.map((p) => mapRow(p, `${t(r.name)} · ${g.name}`)).join('')}</ul></div>`).join('');
    } else {
      html += `<ul class="pj-map__rows" role="list">${items.map((p) => mapRow(p, t(r.name))).join('')}</ul>`;
    }
  } else {
    html += `<div class="pj-map__phead"><p class="eyebrow eyebrow--plain">${esc(t(S.whereWeBuild))}</p>
      <p class="pj-map__intro">${esc(t(S.mapIntro))}</p></div>
      <ul class="pj-map__regions" role="list">${REGIONS.map((r) => {
        const n = byRegion(r.id).length;
        return `<li><button class="pj-map__region" type="button" data-map-region="${r.id}"${n ? '' : ' disabled'}>
          <span class="pj-map__rname">${esc(t(r.name))}</span><span class="pj-map__rcount num">${pad(n)}</span>${icon('arrow-right', 'icon--sm icon--dir')}</button></li>`;
      }).join('')}</ul>`;
    if (!list.some((p) => p.region)) html += `<p class="pj-map__none">${esc(t(S.noneHere))}</p>`;
  }
  if (tbc.length && !MAP.region) {
    html += `<div class="pj-map__group pj-map__group--tbc"><p class="pj-map__gname">${icon('circle-help', 'icon--sm')}<span>${esc(t(S.tbc))}</span><span class="num">${tbc.length}</span></p>
      <ul class="pj-map__rows" role="list">${tbc.map((p) => mapRow(p, t(S.tbc))).join('')}</ul></div>`;
  }
  E.mapPanel.innerHTML = html;
  scan(E.mapPanel);
}

function pinHtml({ x, y, n, label, side, attr, pressed, city = false }) {
  const aria = `${label} — ${counted(n, 'project')}`;
  return `<button class="pj-pin pj-pin--${side}${city ? ' pj-pin--city' : ''}" type="button" ${attr} data-x="${x.toFixed(2)}" data-y="${y.toFixed(2)}" aria-pressed="${pressed}" aria-label="${esc(aria)}">
    <span class="pj-pin__dot"><span class="num">${n}</span></span><span class="pj-pin__label" aria-hidden="true">${esc(label)}</span></button>`;
}

/* ======================================================================
   4. PROJECT VIEWER
   ====================================================================== */
const V = {
  el: $('#pj-viewer'),
  open: false,
  list: PROJECTS,
  index: 0,
  context: '',
  p: null,
  crops: [],
  crop: 0,
  s: 1, tx: 0, ty: 0,
  fw: 0, fh: 0, sw: 0, sh: 0,
  mode: 'image',
  split: 50,
  pointers: new Map(),
  gesture: null,
  token: 0,
  ringsWerePaused: { hero: false, ring2: false },
};
const VE = V.el ? {
  dialog: $('.pj-viewer__dialog', V.el),
  counter: $('[data-pjv-counter]', V.el),
  context: $('[data-pjv-context]', V.el),
  stage: $('[data-pjv-stage]', V.el),
  frames: $$('[data-pjv-frame]', V.el),
  layerBp: $('[data-pjv-layer="blueprint"]', V.el),
  split: $('[data-pjv-split]', V.el),
  handle: $('[data-pjv-split-handle]', V.el),
  tagBp: $('[data-pjv-tag-bp]', V.el),
  tagImg: $('[data-pjv-tag-img]', V.el),
  zoomValue: $('[data-pjv-zoom-value]', V.el),
  loader: $('[data-pjv-loader]', V.el),
  thumbs: $('[data-pjv-thumbs]', V.el),
  caption: $('[data-pjv-caption]', V.el),
  panelInner: $('[data-pjv-panel-inner]', V.el),
  eyebrow: $('[data-pjv-eyebrow]', V.el),
  title: $('[data-pjv-title]', V.el),
  loc: $('[data-pjv-loc]', V.el),
  summary: $('[data-pjv-summary]', V.el),
  facts: $('[data-pjv-facts]', V.el),
  highlights: $('[data-pjv-highlights]', V.el),
  actions: $('[data-pjv-actions]', V.el),
  pager: $('[data-pjv-pager]', V.el),
} : null;

function cropsOf(p) {
  const name = t(p.name);
  const crops = p.gallery.map((g, i) => {
    const detail = i > 0 && g.base === p.image && g.pos && g.pos !== '50% 50%';
    return { base: g.base, focus: detail ? g.pos : '50% 50%', scale: detail ? 2.2 : 1, caption: t(g.caption) };
  });
  const extra = [['30% 58%', 2], ['70% 42%', 2]];
  for (let i = 0; crops.length < 3 && i < extra.length; i++) {
    crops.push({ base: p.image, focus: extra[i][0], scale: extra[i][1], caption: `${name} — ${t(S.detail)}` });
  }
  if (crops[0] && crops[0].scale === 1 && !p.gallery[0]?.caption) crops[0].caption = t(S.fullView);
  return crops;
}

function openProject(slug, { list, context, trigger } = {}) {
  const p = getProject(slug);
  if (!p || !V.el) return;
  let l = list && list.some((x) => x.slug === slug) ? list : null;
  if (!l) { const r = results(); l = r.some((x) => x.slug === slug) ? r : PROJECTS; context = l === PROJECTS ? t(S.allProjects) : contextLabel(); }
  V.list = l;
  V.context = context || contextLabel();
  V.index = l.findIndex((x) => x.slug === slug);
  showProject(p, 0);
  if (!V.open) {
    V.open = true;
    V.ringsWerePaused = { hero: heroRing?.paused ?? false, ring2: ring2?.paused ?? false };
    heroRing?.pause();
    ring2?.pause();
    openModal(V.el, trigger || document.activeElement);
    requestAnimationFrame(() => { measureStage(); applyCrop(V.crop, false); });
  }
  setHash(p.slug);
}

function closeViewer() { if (V.open) closeModal(V.el); }

function onViewerClosed() {
  V.open = false;
  V.pointers.clear();
  V.gesture = null;
  setHash('');
  if (heroRing && !V.ringsWerePaused.hero && !heroUserPaused) heroRing.play();
  if (ring2 && !V.ringsWerePaused.ring2) ring2.play();
  updateRingToggle();
}

function step(delta) {
  if (!V.list.length) return;
  V.index = (V.index + delta + V.list.length) % V.list.length;
  const p = V.list[V.index];
  showProject(p, delta);
  setHash(p.slug);
}

function setHash(slug) {
  try {
    const url = new URL(location.href);
    url.hash = slug || '';
    const s = slug ? url.href : url.href.replace(/#.*$/, '');
    history.replaceState(history.state, '', s);
  } catch { /* ignore */ }
}

function showProject(p, dir = 0) {
  V.p = p;
  V.crops = cropsOf(p);
  V.crop = 0;
  const n = V.list.length;
  VE.counter.textContent = `${pad(V.index + 1)} / ${pad(n)}`;
  VE.context.textContent = V.context;
  renderPanel(p);
  renderThumbs();
  loadImage(V.crops[0].base);
  if (V.open) { measureStage(); applyCrop(0, false); }
  // Gentle entrance for the new content
  if (dir && !reduced()) {
    const off = (isAr() ? -dir : dir) * 24;
    VE.panelInner.animate([{ opacity: 0, transform: `translateX(${off}px)` }, { opacity: 1, transform: 'none' }], { duration: 520, easing: EASE });
    VE.stage.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
  }
  const multi = n > 1;
  $$('[data-pjv-prev],[data-pjv-next]', V.el).forEach((b) => { b.disabled = !multi; });
}

function renderPanel(p) {
  const c = catOf(p);
  VE.eyebrow.innerHTML = `${icon(catIcon(p), 'icon--sm')}<span>${esc(catName(p))}</span>`;
  VE.title.textContent = t(p.name);
  VE.loc.innerHTML = p.location
    ? `${icon('map-pin', 'icon--sm')}<span>${esc(locText(p))}</span>`
    : `${icon('circle-help', 'icon--sm')}<span>${esc(t(S.tbc))}</span>`;
  VE.loc.classList.toggle('is-tbc', !p.location);
  VE.summary.textContent = t(p.summary);

  // Facts — unknown fields are omitted (status, dates, sizes are never shown: not in the brief).
  const facts = [];
  facts.push([S.category, catName(p)]);
  if (p.region) facts.push([S.country, regionName(p)]);
  if (p.location && locText(p) !== regionName(p)) facts.push([S.location, locText(p)]);
  const typ = t(p.typology);
  if (typ && typ !== catName(p) && (!c || typ !== t(c.name))) facts.push([S.type, typ]);
  VE.facts.innerHTML = facts.map(([k, v]) => `<div><dt>${esc(t(k))}</dt><dd>${esc(v)}</dd></div>`).join('');

  const skip = new Set([catName(p), locText(p), regionName(p)].filter(Boolean));
  const hl = (p.highlights || []).map((h) => t(h)).filter((h) => h && !skip.has(h));
  VE.highlights.innerHTML = hl.length
    ? `<p class="pjv-sub">${esc(t(S.highlights))}</p><ul class="pjv-hl" role="list">${hl.map((h) => `<li>${icon('check', 'icon--sm')}<span>${esc(h)}</span></li>`).join('')}</ul>`
    : '';

  let actions = '';
  if (p.studioModel) {
    actions += `<a class="btn btn--primary pjv-3d" href="${esc(studioUrl(p))}"><span>${esc(t(S.explore3d))}</span>${icon('rotate-3d')}</a>
      <p class="pjv-note">${icon('info', 'icon--xs')}<span>${esc(t(S.illustrative))}</span></p>`;
  }
  actions += `<a class="btn btn--ghost" href="contact.html#inquiry"><span>${esc(t(S.enquire))}</span>${icon('arrow-right', 'icon--dir')}</a>`;
  VE.actions.innerHTML = actions;

  const n = V.list.length;
  if (n > 1) {
    const prev = V.list[(V.index - 1 + n) % n], next = V.list[(V.index + 1) % n];
    const card = (q, d) => `<button class="pjv-pg pjv-pg--${d}" type="button" data-pjv-go="${d}">
      <span class="pjv-pg__thumb"><img src="${imgSrc(q.image, true, 'jpg')}" alt="" width="96" height="64" loading="lazy" decoding="async"></span>
      <span class="pjv-pg__text"><span class="pjv-pg__dir">${icon(d === 'prev' ? 'arrow-left' : 'arrow-right', 'icon--xs icon--dir')}<span>${esc(t(d === 'prev' ? S.prev : S.next))}</span></span>
      <span class="pjv-pg__name">${esc(t(q.name))}</span></span></button>`;
    VE.pager.innerHTML = card(prev, 'prev') + card(next, 'next');
  } else VE.pager.innerHTML = '';
  VE.panelInner.scrollTop = 0;
  $('.pjv-panel', V.el)?.scrollTo?.({ top: 0 });
}

function renderThumbs() {
  VE.thumbs.innerHTML = V.crops.map((c, i) => {
    const thumb = c.base === 'aerial-panorama' ? `assets/img/aerial-panorama.jpg` : imgSrc(c.base, true, 'jpg');
    return `<li><button class="pjv-thumb" type="button" data-crop="${i}" aria-pressed="${i === V.crop}" aria-label="${esc(c.caption)}">
      <img src="${thumb}" alt="" width="96" height="64" loading="lazy" decoding="async" style="object-position:${esc(c.focus)};transform-origin:${esc(c.focus)};transform:scale(${c.scale > 1 ? 1.9 : 1})"></button></li>`;
  }).join('');
}

function loadImage(base) {
  const { w, h } = dims(base);
  V.nat = { w, h };
  const token = ++V.token;
  VE.stage.classList.add('is-loading');
  VE.frames.forEach((f, i) => {
    f.innerHTML = `<picture><source type="image/webp" srcset="assets/img/${base}.webp"><img src="assets/img/${base}.jpg" alt="${i === 0 ? esc(t(V.p.name)) : ''}" width="${w}" height="${h}" decoding="async" draggable="false"></picture>${i === 1 ? '<span class="pjv-grid" aria-hidden="true"></span>' : ''}`;
  });
  const img = $('img', VE.frames[0]);
  const done = () => { if (token === V.token) VE.stage.classList.remove('is-loading'); };
  if (img.complete) done(); else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
}

function measureStage() {
  const r = VE.stage.getBoundingClientRect();
  V.sw = r.width; V.sh = r.height;
  const { w, h } = V.nat || { w: 4, h: 3 };
  const k = Math.min(V.sw / w, V.sh / h) || 1;
  V.fw = w * k; V.fh = h * k;
  VE.frames.forEach((f) => { f.style.width = `${V.fw}px`; f.style.height = `${V.fh}px`; });
}

function clampPan() {
  const mx = Math.max(0, (V.fw * V.s - V.sw) / 2), my = Math.max(0, (V.fh * V.s - V.sh) / 2);
  V.tx = clamp(V.tx, -mx, mx);
  V.ty = clamp(V.ty, -my, my);
}

function applyTransform(animate = false) {
  clampPan();
  const tr = `translate(-50%, -50%) translate(${V.tx}px, ${V.ty}px) scale(${V.s})`;
  VE.stage.classList.toggle('is-animating', animate && !reduced());
  VE.frames.forEach((f) => { f.style.transform = tr; });
  VE.stage.classList.toggle('is-zoomed', V.s > 1.01);
  VE.zoomValue.textContent = `${Math.round(V.s * 100)}%`;
}

function zoomTo(s, cx = 0, cy = 0, animate = true) {
  // (cx, cy) = point relative to the stage centre that stays put.
  const s2 = clamp(s, 1, 5);
  V.tx = cx - ((cx - V.tx) * s2) / V.s;
  V.ty = cy - ((cy - V.ty) * s2) / V.s;
  V.s = s2;
  applyTransform(animate);
}

function applyCrop(i, animate = true) {
  const c = V.crops[i];
  if (!c) return;
  const changedBase = c.base !== (V.crops[V.crop]?.base);
  V.crop = i;
  if (changedBase || !$('img', VE.frames[0])?.src.includes(`/${c.base}.`)) { loadImage(c.base); measureStage(); animate = false; }
  const [fx, fy] = c.focus.split(/\s+/).map((v) => parseFloat(v) / 100);
  V.s = c.scale;
  V.tx = -(fx - 0.5) * V.fw * V.s;
  V.ty = -(fy - 0.5) * V.fh * V.s;
  applyTransform(animate);
  $$('.pjv-thumb', VE.thumbs).forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.crop === i)));
  VE.caption.textContent = c.caption + (i === 0 && V.p.imageNote ? ` — ${t(V.p.imageNote)}` : '');
}

/* Image | Compare | Blueprint */
function setMode(mode) {
  V.mode = mode;
  $$('[data-pjv-mode]', V.el).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pjvMode === mode)));
  VE.split.hidden = mode !== 'compare';
  VE.stage.dataset.mode = mode;
  setSplit(mode === 'image' ? 0 : mode === 'blueprint' ? 100 : 50);
}
function setSplit(v) {
  V.split = clamp(v, 0, 100);
  VE.stage.style.setProperty('--split', `${V.split}%`);
  VE.handle.setAttribute('aria-valuenow', String(Math.round(V.split)));
  VE.handle.setAttribute('aria-valuetext', fmt(S.blueprintPct, { n: Math.round(V.split) }));
}

function stagePoint(e) {
  const r = VE.stage.getBoundingClientRect();
  return [e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2];
}

function initViewer() {
  if (!V.el) return;
  V.el.addEventListener('modalclose', onViewerClosed);

  $('[data-pjv-prev]', V.el).addEventListener('click', () => step(-1));
  $('[data-pjv-next]', V.el).addEventListener('click', () => step(1));
  VE.pager.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pjv-go]');
    if (b) step(b.dataset.pjvGo === 'prev' ? -1 : 1);
  });
  $('[data-pjv-share]', V.el).addEventListener('click', async () => {
    const url = new URL(location.href);
    url.hash = V.p.slug;
    url.searchParams.delete('lang');
    const ok = await copyText(url.href);
    toast(ok ? S.copied : S.copyFail, { type: ok ? 'success' : 'error' });
  });
  $$('[data-pjv-zoom]', V.el).forEach((b) => b.addEventListener('click', () => {
    const a = b.dataset.pjvZoom;
    if (a === 'in') zoomTo(V.s * 1.5);
    else if (a === 'out') zoomTo(V.s / 1.5);
    else { V.s = 1; V.tx = 0; V.ty = 0; applyTransform(true); }
  }));
  VE.thumbs.addEventListener('click', (e) => {
    const b = e.target.closest('.pjv-thumb');
    if (b) applyCrop(+b.dataset.crop, true);
  });
  $$('[data-pjv-mode]', V.el).forEach((b) => b.addEventListener('click', () => setMode(b.dataset.pjvMode)));
  setMode('image');

  // Keyboard
  VE.dialog.addEventListener('keydown', (e) => {
    if (!V.open || e.altKey || e.ctrlKey || e.metaKey) return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target === VE.handle) return;
    const next = isAr() ? 'ArrowLeft' : 'ArrowRight';
    const prev = isAr() ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === next) step(1);
    else if (e.key === prev) step(-1);
    else if (e.key === '+' || e.key === '=') zoomTo(V.s * 1.5);
    else if (e.key === '-' || e.key === '_') zoomTo(V.s / 1.5);
    else if (e.key === '0') { V.s = 1; V.tx = 0; V.ty = 0; applyTransform(true); }
    else return;
    e.preventDefault();
  });

  // Compare handle (pointer + keyboard; RTL aware: the blueprint sits on the inline-start side)
  const fromX = (clientX) => {
    const r = VE.stage.getBoundingClientRect();
    const x = isAr() ? r.right - clientX : clientX - r.left;
    return (x / r.width) * 100;
  };
  VE.handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    VE.handle.setPointerCapture(e.pointerId);
    VE.stage.classList.add('is-splitting');
    const move = (ev) => setSplit(fromX(ev.clientX));
    const up = () => {
      VE.stage.classList.remove('is-splitting');
      VE.handle.removeEventListener('pointermove', move);
      VE.handle.removeEventListener('pointerup', up);
      VE.handle.removeEventListener('pointercancel', up);
    };
    VE.handle.addEventListener('pointermove', move);
    VE.handle.addEventListener('pointerup', up);
    VE.handle.addEventListener('pointercancel', up);
  });
  VE.handle.addEventListener('keydown', (e) => {
    const st = e.shiftKey ? 10 : 2;
    const right = isAr() ? -st : st;
    const map = { ArrowRight: right, ArrowLeft: -right, ArrowUp: st, ArrowDown: -st, PageUp: 10, PageDown: -10 };
    if (e.key in map) { e.preventDefault(); e.stopPropagation(); setSplit(V.split + map[e.key]); }
    else if (e.key === 'Home') { e.preventDefault(); setSplit(0); }
    else if (e.key === 'End') { e.preventDefault(); setSplit(100); }
  });

  // Pan / pinch / swipe / wheel / double-click on the stage
  const st = VE.stage;
  st.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, .pjv-zoom')) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    st.setPointerCapture(e.pointerId);
    V.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (V.pointers.size === 1) {
      V.gesture = { type: 'pan', x0: e.clientX, y0: e.clientY, tx: V.tx, ty: V.ty, t0: performance.now(), touch: e.pointerType !== 'mouse' };
    } else if (V.pointers.size === 2) {
      const [a, b] = [...V.pointers.values()];
      const mid = stagePoint({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      V.gesture = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: V.s, tx: V.tx, ty: V.ty, mid };
    }
    st.classList.add('is-grabbing');
  });
  st.addEventListener('pointermove', (e) => {
    if (!V.pointers.has(e.pointerId)) return;
    V.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = V.gesture;
    if (!g) return;
    if (g.type === 'pan' && V.s > 1.01) {
      V.tx = g.tx + (e.clientX - g.x0);
      V.ty = g.ty + (e.clientY - g.y0);
      applyTransform(false);
    } else if (g.type === 'pinch' && V.pointers.size === 2) {
      const [a, b] = [...V.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const s2 = clamp(g.s0 * (d / g.d0), 1, 5);
      V.tx = g.mid[0] - ((g.mid[0] - g.tx) * s2) / g.s0;
      V.ty = g.mid[1] - ((g.mid[1] - g.ty) * s2) / g.s0;
      V.s = s2;
      applyTransform(false);
    }
  });
  const end = (e) => {
    if (!V.pointers.has(e.pointerId)) return;
    const g = V.gesture;
    V.pointers.delete(e.pointerId);
    if (g?.type === 'pan' && g.touch && V.s <= 1.01 && e.type === 'pointerup') {
      const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4 && performance.now() - g.t0 < 700) {
        const forward = isAr() ? dx > 0 : dx < 0;
        step(forward ? 1 : -1);
      }
    }
    if (!V.pointers.size) { V.gesture = null; st.classList.remove('is-grabbing'); }
    else if (V.pointers.size === 1) {
      const [p] = [...V.pointers.values()];
      V.gesture = { type: 'pan', x0: p.x, y0: p.y, tx: V.tx, ty: V.ty, t0: performance.now(), touch: true };
    }
  };
  st.addEventListener('pointerup', end);
  st.addEventListener('pointercancel', end);
  st.addEventListener('wheel', (e) => {
    if (!V.open) return;
    e.preventDefault();
    const [cx, cy] = stagePoint(e);
    const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0018));
    zoomTo(V.s * factor, cx, cy, false);
  }, { passive: false });
  st.addEventListener('dblclick', (e) => {
    if (e.target.closest('button')) return;
    const [cx, cy] = stagePoint(e);
    if (V.s > 1.01) { V.s = 1; V.tx = 0; V.ty = 0; applyTransform(true); } else zoomTo(2.5, cx, cy, true);
  });

  if ('ResizeObserver' in window) {
    new ResizeObserver(() => { if (V.open) { measureStage(); applyTransform(false); } }).observe(st);
  }
}

/* Deep links (#slug) & delegated "open project" clicks */
function slugFromHash() {
  const h = decodeURIComponent(location.hash.replace(/^#/, ''));
  return getProject(h) ? h : null;
}
function initLinks() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-slug]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!a.closest('[data-pj-grid], [data-pj-list]')) return;
    e.preventDefault();
    openProject(a.dataset.slug, { list: results(), context: contextLabel(), trigger: a });
  });
  addEventListener('hashchange', () => {
    const slug = slugFromHash();
    if (slug) openProject(slug);
    else if (V.open && !location.hash) closeViewer();
  });
  // Sector tiles → filter the explorer
  E.cats?.addEventListener('click', (e) => {
    const a = e.target.closest('[data-pj-cat]');
    if (!a) return;
    e.preventDefault();
    setCategory(a.dataset.pjCat, { scroll: true });
  });
}

/* ======================================================================
   Language change
   ====================================================================== */
function onLanguage() {
  cardCache = new Map();
  rowCache = new Map();
  renderHeroCounts();
  buildTabs();
  buildRegions();
  localizeSortOptions();
  update({ animate: false, resetLimit: false });
  heroRing?.update({ items: heroItems(), labels: ringLabels(S.ringRegion), rtl: isAr() });
  updateRingToggle();
  if (V.open && V.p) {
    const keep = { crop: V.crop, s: V.s, tx: V.tx, ty: V.ty };
    if (V.list === FEATURED) V.context = t(S.featured);
    else if (V.list === PROJECTS) V.context = t(S.allProjects);
    else V.context = contextLabel();
    VE.context.textContent = V.context;
    V.crops = cropsOf(V.p);
    renderPanel(V.p);
    renderThumbs();
    $$('.pjv-thumb', VE.thumbs).forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.crop === keep.crop)));
    const c = V.crops[keep.crop];
    if (c) VE.caption.textContent = c.caption + (keep.crop === 0 && V.p.imageNote ? ` — ${t(V.p.imageNote)}` : '');
    const im = $('img', VE.frames[0]);
    if (im) im.alt = t(V.p.name);
    setSplit(V.split);
  }
  VE?.stage.setAttribute('aria-roledescription', t(S.viewer));
}

/* ======================================================================
   Boot
   ====================================================================== */
function init() {
  readUrl();
  renderHeroCounts();
  initHeroRing();
  if (E.tablist) {
    initTabs();
    initToolbar();
    localizeSortOptions();
    initListPreview();
    initLinks();
    setView(state.view, { initial: true });
    update({ animate: false });
    scanUI(E.results);
  }
  initViewer();
  VE?.stage.setAttribute('aria-roledescription', t(S.viewer));
  onLang(onLanguage);
  const slug = slugFromHash();
  if (slug) whenLoaded().then(() => openProject(slug));
}

init();
