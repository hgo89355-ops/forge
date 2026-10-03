// assets/js/pages/media.js — Media centre (media.html).
//
//  1. Showreel hero: cinematic image stage (Ken Burns + crossfades + kinetic typography), play/pause,
//     segmented progress, prev/next, keyboard (←/→, mirrored in RTL), swipe, pauses off-screen/hidden tab.
//  2. Gallery: justified rows computed from each image's aspect ratio, filter chips (sector/region),
//     hover captions, opens the core lightbox with the filtered set; re-renders on language change.
//  3. Brand kit: logo preview background toggle, palette copy format (HEX/RGB), type tester.
//  4. Newsroom: newsletter form (core validation → local success state + toast; nothing is sent).
//
// Everything visible is bilingual (t({en, ar}) here; data-ar* in the markup). Honest content only
// (BRIEF §2): project names/locations/captions come from data/site-data.js.

import { t, getLang, onLang } from '../core/i18n.js';
import { scan, refresh } from '../core/motion.js';
import { scanUI, toast, openLightbox } from '../core/ui.js';
import { $, $$, esc, icon, picture, prefersReducedMotion, isRTL, debounce, clamp, IMAGES } from '../core/utils.js';
import { whenLoaded } from '../core/preloader.js';
import { PROJECTS, PROJECT_CATEGORIES, REGIONS, getProject, getCategory, getSubsidiary, projectUrl } from '../data/site-data.js';

const reduced = prefersReducedMotion();
const pad = (n) => String(n).padStart(2, '0');

/* ======================================================================
   1 · SHOWREEL
   ====================================================================== */
const S = {
  carousel: { en: 'carousel', ar: 'عرض دوّار' },
  slide: { en: 'scene', ar: 'مشهد' },
  reel: { en: 'MOBCO showreel', ar: 'العرض المرئي لموبكو' },
  pause: { en: 'Pause showreel', ar: 'إيقاف العرض المرئي مؤقتًا' },
  play: { en: 'Play showreel', ar: 'تشغيل العرض المرئي' },
  scene: { en: 'Scene', ar: 'المشهد' },
  goTo: { en: 'Go to scene {n}: {name}', ar: 'الانتقال إلى المشهد {n}: {name}' },
  of: { en: '{n} of {total}', ar: '{n} من {total}' },
  view: { en: 'View project', ar: 'عرض المشروع' },
};
const fmt = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

// A curated reel from the project library (art-directed order; names/locations come from site-data).
// Kinetic words are verbatim brand lines or facts from BRIEF §2 (tagline, motto, "three continents", 2001).
const SCENES = [
  { project: 'lagoon-villa-community', base: 'aerial-compound', pos: '50% 50%',
    words: { en: ['A legacy', '*of trust'], ar: ['إرثٌ', '*من الثقة'] },
    kb: ['scale(1.04) translate3d(0,0,0)', 'scale(1.16) translate3d(-2%,-1.5%,0)'] },
  { project: 'raffles-hotel-residence', base: 'raffles-hotel-residence', pos: '50% 45%',
    words: { en: ['Integrity', '*& excellence'], ar: ['النزاهة', '*والتميّز'] },
    kb: ['scale(1.18) translate3d(1.5%,1%,0)', 'scale(1.04) translate3d(0,0,0)'] },
  { project: 'sofitel-hotel', base: 'sofitel-hotel', pos: '40% 35%',
    words: { en: ['Shaping', '*skylines'], ar: ['نرسم', '*الأفق'] },
    kb: ['scale(1.06) translate3d(0,2%,0)', 'scale(1.2) translate3d(1%,-2%,0)'] },
  { project: 'as-safiyyah-museum-park', base: 'as-safiyyah-museum-park', pos: '60% 45%',
    words: { en: ['Elevating', '*standards'], ar: ['نرتقي', '*بالمعايير'] },
    kb: ['scale(1.05) translate3d(1%,0,0)', 'scale(1.17) translate3d(-1.5%,1%,0)'] },
  { project: 'eastmain', base: 'eastmain', pos: '50% 56%',
    words: { en: ['*We plan.'], ar: ['*نخطّط.'] },
    kb: ['scale(1.2) translate3d(0,2%,0)', 'scale(1.05) translate3d(0,-1%,0)'] },
  { project: 'al-moosa-specialist-hospital', base: 'al-moosa-specialist-hospital', pos: '60% 40%',
    words: { en: ['*We build.'], ar: ['*نبني.'] },
    kb: ['scale(1.04) translate3d(-1%,0,0)', 'scale(1.16) translate3d(1.5%,-1%,0)'] },
  { project: 'red-palace-redevelopment', base: 'red-palace-redevelopment', pos: '50% 50%',
    words: { en: ['*We manage.'], ar: ['*نُدير.'] },
    kb: ['scale(1.16) translate3d(0,-2%,0)', 'scale(1.04) translate3d(0,1%,0)'] },
  { project: 'victoria-101', base: 'victoria-101', pos: '50% 46%',
    words: { en: ['Three', '*continents'], ar: ['ثلاث', '*قارات'] },
    kb: ['scale(1.06) translate3d(-1%,1%,0)', 'scale(1.2) translate3d(1.5%,-1%,0)'] },
  { project: 'innovation-campus', base: 'campus', pos: '50% 38%',
    words: { en: ['Since', '*2001'], ar: ['منذ', '*2001'] },
    kb: ['scale(1.2) translate3d(0,2%,0)', 'scale(1.05) translate3d(0,-1%,0)'] },
  { project: 'lagoon-villa-community', base: 'aerial-panorama', pos: '50% 50%', gallery: 3, pano: true,
    words: { en: ['Our global', '*footprint'], ar: ['بصمتنا', '*العالمية'] },
    kb: ['none', 'none'] },
].filter((s) => getProject(s.project));
const SCENE_MS = 6800;
const FADE_MS = 1600;

function sceneMeta(s) {
  const p = getProject(s.project);
  const name = t(p.name);
  const meta = s.gallery != null ? t(p.gallery[s.gallery].caption) : t(p.location || p.typology);
  return { p, name, meta };
}
const sceneAlt = (s) => { const { name, meta } = sceneMeta(s); return meta && !meta.startsWith(name) ? `${name} — ${meta}` : name; };

function initReel() {
  const root = $('[data-reel]');
  if (!root) return;
  const stageEl = $('[data-reel-slides]', root);
  // scene 0 is static markup (LCP image); the rest are built from SCENES
  SCENES.slice(1).forEach((sc, k) => {
    const el = document.createElement('div');
    el.className = `mreel__slide${sc.pano ? ' mreel__slide--pano' : ''}`;
    el.dataset.scene = String(k + 1);
    el.innerHTML = sc.pano
      ? `<div class="mreel__pano-bg" aria-hidden="true">${picture(sc.base, { alt: '' })}</div><div class="mreel__pano-strip">${picture(sc.base, { alt: '' })}</div>`
      : picture(sc.base, { alt: '' });
    stageEl.appendChild(el);
  });
  const slides = $$('.mreel__slide', root);
  const setAlts = () => slides.forEach((sl, i) => {
    const img = sl.querySelector(sl.classList.contains('mreel__slide--pano') ? '.mreel__pano-strip img' : ':scope > picture img');
    if (img && i > 0 && SCENES[i]) img.alt = sceneAlt(SCENES[i]);
  });
  setAlts();
  const kinetic = $('[data-reel-kinetic]', root);
  const segsEl = $('[data-reel-segs]', root);
  const toggle = $('[data-reel-toggle]', root);
  const caption = $('[data-reel-caption]', root);
  const elNum = $('[data-reel-num]', root);
  const elTitle = $('[data-reel-title]', root);
  const elMeta = $('[data-reel-meta]', root);
  const elCount = $('[data-reel-count]', root);
  const elTotal = $('[data-reel-total]', root);
  const stage = $('[data-reel-slides]', root);
  const total = Math.min(slides.length, SCENES.length);

  // caption text is now JS-managed: drop the static data-ar so i18n doesn't fight our renders
  [elTitle, elMeta].forEach((el) => el?.removeAttribute('data-ar'));
  // view-project link (added once; href/label updated per scene)
  const link = document.createElement('a');
  link.className = 'link-arrow link-arrow--plain mreel__cap-link';
  caption.appendChild(link);

  stage.setAttribute('role', 'region');
  elTotal.textContent = pad(total);

  slides.forEach((sl, i) => {
    const s = SCENES[i];
    if (!s) return;
    sl.style.setProperty('--kb-from', s.kb[0]);
    sl.style.setProperty('--kb-to', s.kb[1]);
    sl.style.setProperty('--kb-dur', `${SCENE_MS + FADE_MS + 600}ms`);
    const img = sl.querySelector(':scope > picture img');
    if (img) img.style.setProperty('--pos', s.pos);
    sl.setAttribute('role', 'group');
  });

  // segments
  segsEl.innerHTML = SCENES.slice(0, total).map((_, i) => `
    <li class="mreel__seg-item"><button class="mreel__seg" type="button" data-seg="${i}">
      <span class="mreel__seg-num num-ltr" aria-hidden="true">${pad(i + 1)}</span>
      <span class="mreel__seg-track" aria-hidden="true"><span class="mreel__seg-fill"></span></span>
    </button></li>`).join('');
  const segs = $$('.mreel__seg', segsEl);

  let index = 0;
  let elapsed = 0;
  let playing = !reduced;      // user intent
  let suspended = false;       // off-screen / tab hidden
  let last = 0;
  let raf = 0;
  let leaveTimer = 0;

  const label = () => {
    root.querySelector('[data-reel-slides]').setAttribute('aria-roledescription', t(S.carousel));
    stage.setAttribute('aria-label', t(S.reel));
    slides.forEach((sl, i) => {
      if (!SCENES[i]) return;
      sl.setAttribute('aria-roledescription', t(S.slide));
      sl.setAttribute('aria-label', `${fmt(t(S.of), { n: i + 1, total })}: ${sceneMeta(SCENES[i]).name}`);
    });
    segs.forEach((b, i) => b.setAttribute('aria-label', fmt(t(S.goTo), { n: i + 1, name: sceneMeta(SCENES[i]).name })));
    toggle.setAttribute('aria-label', t(playing ? S.pause : S.play));
  };

  // kinetic word: chars for Latin (masked rise), whole words for Arabic (letters must stay joined)
  const buildWord = (s, animate) => {
    const lang = getLang();
    const lines = s.words[lang] || s.words.en;
    const word = document.createElement('p');
    word.className = 'mreel__word';
    let i = 0;
    word.innerHTML = lines.map((raw) => {
      const accent = raw.startsWith('*');
      const text = accent ? raw.slice(1) : raw;
      const units = lang === 'ar' ? text.split(/(\s+)/) : Array.from(text);
      const inner = units.map((u) => (/^\s+$/.test(u) ? ' ' : `<span class="mreel__ch" style="--i:${i++}">${esc(u)}</span>`)).join('');
      return `<span class="mreel__line">${accent ? `<em>${inner}</em>` : inner}</span>`;
    }).join('');
    const old = $$('.mreel__word', kinetic);
    old.forEach((o) => {
      o.classList.remove('is-in');
      o.classList.add('is-out');
      setTimeout(() => o.remove(), reduced || !animate ? 0 : 900);
    });
    kinetic.appendChild(word);
    if (reduced || !animate) word.classList.add('is-in');
    else requestAnimationFrame(() => requestAnimationFrame(() => word.classList.add('is-in')));
  };

  const renderCaption = () => {
    const s = SCENES[index];
    const { p, name, meta } = sceneMeta(s);
    elNum.textContent = pad(index + 1);
    elTitle.textContent = name;
    elMeta.textContent = meta;
    elCount.textContent = pad(index + 1);
    link.href = projectUrl(p);
    link.innerHTML = `<span>${esc(t(S.view))}</span><span class="link-arrow__icon">${icon('arrow-up-right', 'icon--dir')}</span>`;
    link.setAttribute('aria-label', `${t(S.view)}: ${name}`);
    segs.forEach((b, i) => {
      if (i === index) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
      b.closest('li').classList.toggle('is-done', i < index);
    });
  };

  const paintProgress = () => {
    const p = clamp(elapsed / SCENE_MS, 0, 1);
    segs.forEach((b, i) => b.style.setProperty('--p', i < index ? 1 : i === index ? p.toFixed(4) : 0));
  };

  const pano = (sl) => {
    // horizontal camera pan across the panorama strip (physical direction; media is never mirrored)
    const strip = sl.querySelector('.mreel__pano-strip');
    const img = strip?.querySelector('img');
    if (!img) return;
    const h = strip.clientHeight;
    const w = h * (2000 / 233);
    img.style.width = `${w}px`;
    sl.style.setProperty('--pano-shift', `${Math.max(0, w - strip.clientWidth)}px`);
  };

  const show = (next, { animate = true, user = false } = {}) => {
    next = (next + total) % total;
    if (next === index && slides[next].classList.contains('is-active')) return;
    const prev = slides[index];
    const cur = slides[next];
    clearTimeout(leaveTimer);
    slides.forEach((sl) => sl !== prev && sl !== cur && sl.classList.remove('is-leaving', 'is-active'));
    if (prev !== cur) {
      prev.classList.remove('is-active');
      prev.classList.add('is-leaving');
      leaveTimer = setTimeout(() => prev.classList.remove('is-leaving'), reduced ? 0 : FADE_MS + 100);
    }
    // restart Ken Burns on the incoming slide
    cur.classList.remove('is-active');
    void cur.offsetWidth;
    cur.classList.add('is-active');
    if (cur.classList.contains('mreel__slide--pano')) pano(cur);
    // warm the following scene so its photo is decoded before the crossfade (slides are lazy by default)
    slides[(next + 1) % total]?.querySelectorAll('img[loading="lazy"]').forEach((im) => { im.loading = 'eager'; });
    slides.forEach((sl, i) => sl.setAttribute('aria-hidden', String(i !== next)));
    index = next;
    elapsed = 0;
    buildWord(SCENES[index], animate);
    renderCaption();
    paintProgress();
    // announce only for user-initiated changes or while paused (WAI carousel pattern)
    caption.setAttribute('aria-live', user || !playing ? 'polite' : 'off');
  };

  const loop = (now) => {
    raf = 0;
    if (!playing || suspended) return;
    if (!last) last = now;
    elapsed += Math.min(100, now - last);
    last = now;
    if (elapsed >= SCENE_MS) show(index + 1);
    paintProgress();
    raf = requestAnimationFrame(loop);
  };
  const run = () => {
    root.classList.toggle('is-paused', !playing || suspended);
    if (playing && !suspended && !raf) { last = 0; raf = requestAnimationFrame(loop); }
    if ((!playing || suspended) && raf) { cancelAnimationFrame(raf); raf = 0; }
  };
  const setPlaying = (v) => {
    playing = v;
    toggle.setAttribute('aria-label', t(playing ? S.pause : S.play));
    toggle.classList.toggle('is-playing', playing);
    caption.setAttribute('aria-live', playing ? 'off' : 'polite');
    run();
  };

  toggle.addEventListener('click', () => setPlaying(!playing));
  $('[data-reel-prev]', root).addEventListener('click', () => show(index - 1, { user: true }));
  $('[data-reel-next]', root).addEventListener('click', () => show(index + 1, { user: true }));
  segsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-seg]');
    if (b) show(parseInt(b.dataset.seg, 10), { user: true });
  });
  // keyboard: arrows while focus is inside the reel controls / caption
  root.addEventListener('keydown', (e) => {
    if (!e.target.closest('.mreel__bar')) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.target.matches('input, textarea')) return;
    e.preventDefault();
    const fwd = isRTL() ? 'ArrowLeft' : 'ArrowRight';
    show(index + (e.key === fwd ? 1 : -1), { user: true });
  });
  // swipe on the stage (touch / pen / mouse drag) — vertical scrolling stays native (touch-action: pan-y)
  let sx = null, sy = 0, st = 0;
  root.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button, input, label')) return;
    sx = e.clientX; sy = e.clientY; st = performance.now();
  });
  root.addEventListener('pointerup', (e) => {
    if (sx == null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    sx = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.4 || performance.now() - st > 2000) return;
    const forward = isRTL() ? dx > 0 : dx < 0;
    show(index + (forward ? 1 : -1), { user: true });
  });
  root.addEventListener('pointercancel', () => { sx = null; });
  root.addEventListener('dragstart', (e) => { if (e.target.closest('.mreel__slides')) e.preventDefault(); });

  // suspend while off-screen or the tab is hidden
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => { suspended = !en.isIntersecting || document.hidden; run(); }, { threshold: 0.15 }).observe(root);
  }
  document.addEventListener('visibilitychange', () => { suspended = document.hidden; run(); });
  window.addEventListener('resize', debounce(() => { const sl = slides[index]; if (sl.classList.contains('mreel__slide--pano')) pano(sl); }, 150));

  // initial state (scene 0 is already visible in the static markup)
  slides[0].classList.add('is-active');
  slides.forEach((sl, i) => sl.setAttribute('aria-hidden', String(i !== 0)));
  kinetic.innerHTML = '';
  buildWord(SCENES[0], false);
  renderCaption();
  paintProgress();
  label();
  setPlaying(playing);
  if (!reduced) {
    suspended = true; run();
    whenLoaded().then(() => { suspended = document.hidden; buildWord(SCENES[index], true); run(); });
  }

  onLang(() => {
    setAlts();
    label();
    renderCaption();
    buildWord(SCENES[index], false);
  });
}

/* ======================================================================
   2 · GALLERY
   ====================================================================== */
const G = {
  open: { en: 'Open image: {c}', ar: 'فتح الصورة: {c}' },
  dl: { en: 'Download image (JPG): {c}', ar: 'تنزيل الصورة (JPG): {c}' },
  status: { en: 'Showing {n} of {total} images', ar: 'عرض {n} من أصل {total} صورة' },
  more: { en: 'Show {n} more', ar: 'عرض {n} صورة إضافية' },
  descriptive: { en: 'descriptive name', ar: 'اسم وصفي' },
  filter: { en: 'Filter images', ar: 'تصفية الصور' },
  all: { en: 'All', ar: 'الكل' },
  ksa: { en: 'KSA portfolio', ar: 'محفظة السعودية' },
};
const PAGE = 16;
// natural aspect ratios (utils IMAGES) — art-directed crops for the detail views
const CROP_AR = {
  'eastmain:1': 0.8, 'eastmain:2': 1,
  'victoria-101:1': 0.78, 'victoria-101:2': 1.6,
  'lagoon-villa-community:2': 1,
  'innovation-campus:1': 0.8, 'innovation-campus:2': 1.6,
  'classical-landmark:1': 1.4, 'classical-landmark:2': 0.8,
};
const natAR = (base) => (IMAGES[base] ? IMAGES[base].w / IMAGES[base].h : 1.4);
// detail crops of the same render are zoomed in (object-position = focal point) so they read as real details
const DETAIL_ZOOM = 1.55;

// Photos that live outside PROJECTS[].gallery (the client's subsidiary pages, BRIEF §2b) so the gallery
// really shows every image. Captions describe only what the image shows.
const COMPANIES = { id: 'companies', label: { en: 'Group companies', ar: 'شركات المجموعة' }, icon: 'building' };
const EXTRA = [
  { base: 'sub-construction-hero', sub: 'mobco-construction', pos: '40% 50%',
    caption: { en: 'A tower under construction above the city', ar: 'برج قيد الإنشاء يطلّ على المدينة' } },
  { base: 'sub-developments-hero', project: 'victoria-101', pos: '50% 40%',
    caption: { en: 'Victoria 101 — façade close-up', ar: 'فيكتوريا 101 — لقطة قريبة للواجهة' } },
  { base: 'sub-construction-render', sub: 'mobco-construction', pos: '50% 55%',
    caption: { en: 'Night render of a timber-clad low-rise building', ar: 'تصوّر ليلي لمبنى منخفض بواجهات خشبية' } },
  { base: 'sub-real-estate-hero', sub: 'mobco-real-estate', pos: '50% 45%',
    caption: { en: 'MOBCO Developments signage on a building façade', ar: 'لافتة «موبكو للتطوير» على واجهة مبنى' } },
  { base: 'sub-real-estate-office', sub: 'mobco-real-estate', pos: '50% 50%',
    caption: { en: 'Office interior', ar: 'مساحة مكتبية من الداخل' } },
];

function extraItems() {
  return EXTRA.map((e) => {
    if (e.project) {
      const p = getProject(e.project);
      if (!p || !IMAGES[e.base]) return null;
      return { key: `x:${e.base}`, p, g: { base: e.base, pos: e.pos, caption: e.caption }, base: e.base, pos: e.pos,
        cats: [p.category, p.region].filter(Boolean), ar: natAR(e.base), link: true };
    }
    const s = getSubsidiary(e.sub);
    if (!s || !IMAGES[e.base]) return null;
    // pseudo-project so tiles, captions and the lightbox share one code path
    const p = { id: s.id, name: s.name, nameIsDescriptive: false, location: null, category: null,
      typology: { en: 'Group company', ar: 'شركة تابعة' }, gallery: [] };
    return { key: `x:${e.base}`, p, g: { base: e.base, pos: e.pos, caption: e.caption }, base: e.base, pos: e.pos,
      cats: [COMPANIES.id], catLabel: s.name, ar: natAR(e.base) };
  }).filter(Boolean);
}

function buildItems() {
  const prim = [], primRest = [], crops = [], tail = [];
  PROJECTS.forEach((p) => p.gallery.forEach((g, gi) => {
    const key = `${p.id}:${gi}`;
    const regions = p.region ? [p.region] : [];
    const detail = gi > 0 && g.base === p.gallery[0].base;
    const x = { key, p, g, gi, base: g.base, pos: g.pos, cats: [p.category, ...regions].filter(Boolean), ar: CROP_AR[key] || natAR(g.base), zoom: detail ? DETAIL_ZOOM : 1, link: true };
    if (g.base === 'aerial-panorama') tail.push(x);
    else if (gi > 0) crops.push(x);
    else (p.featured ? prim : primRest).push(x);
  }));
  // first detail of every project, then the second ones — so consecutive crops come from different projects
  crops.sort((a, b) => a.gi - b.gi);
  const extras = extraItems();
  // companies' photos are woven into the second half of the full views
  const primaries = prim.concat(primRest);
  extras.forEach((x, i) => primaries.splice(Math.min(primaries.length, prim.length + 2 + i * 4), 0, x));
  // rhythm: three full views, then an art-directed detail — never one from a project seen in the last 8 items
  const out = [];
  const recent = () => out.slice(-8).map((x) => x.p.id);
  // a detail only follows once its full view has been shown, and not right after it
  const takeCrop = () => {
    const i = crops.findIndex((c) => out.some((o) => o.p.id === c.p.id) && !recent().includes(c.p.id));
    return i < 0 ? null : crops.splice(i, 1)[0];
  };
  primaries.forEach((x, i) => {
    out.push(x);
    if (i % 3 === 2) { const c = takeCrop(); if (c) out.push(c); }
  });
  while (crops.length) { const c = takeCrop() || crops.shift(); out.push(c); }
  return out.concat(tail);
}

function initGallery() {
  const mount = $('[data-gallery]');
  const chipMount = $('[data-gallery-filter-mount]');
  const status = $('[data-gallery-status]');
  const moreWrap = $('[data-gallery-more-wrap]');
  const moreBtn = $('[data-gallery-more]');
  const moreLabel = $('[data-gallery-more-label]');
  if (!mount) return;
  const items = buildItems();
  let filter = 'all';
  let shown = PAGE;
  let lastW = 0;

  // filter chips from data: categories that have images, then regions
  const count = (v) => (v === 'all' ? items.length : items.filter((x) => x.cats.includes(v)).length);
  const FILTERS = [{ id: 'all', label: G.all }]
    .concat(PROJECT_CATEGORIES.filter((c) => count(c.id)).sort((a, b) => count(b.id) - count(a.id)).map((c) => ({ id: c.id, label: c.name, icon: c.icon })))
    .concat(count(COMPANIES.id) ? [COMPANIES] : [])
    .concat([{ sep: true }])
    .concat(REGIONS.filter((r) => count(r.id)).map((r) => ({ id: r.id, label: r.id === 'ksa' ? G.ksa : r.name })));
  const group = document.createElement('div');
  group.className = 'chip-group mgal-chips';
  group.setAttribute('data-chip-group', 'single');
  group.innerHTML = FILTERS.map((f) => (f.sep ? '<span class="mgal-chips__sep" aria-hidden="true"></span>'
    : `<button class="chip" type="button" data-value="${f.id}" aria-pressed="${f.id === 'all'}">${f.icon ? icon(f.icon) : ''}<span data-chip-label="${f.id}"></span><span class="chip__count">${count(f.id)}</span></button>`)).join('');
  chipMount?.replaceWith(group);
  const labelChips = () => {
    group.setAttribute('aria-label', t(G.filter));
    FILTERS.forEach((f) => { if (!f.sep) group.querySelector(`[data-chip-label="${f.id}"]`).textContent = t(f.label); });
  };
  labelChips();
  scanUI(group.parentElement);

  const filtered = () => items.filter((x) => filter === 'all' || x.cats.includes(filter));
  // "Name — caption" (captions that already start with the project name are kept as they are)
  const caption = (x, lang = getLang()) => {
    const name = t(x.p.name, lang);
    const cap = t(x.g.caption, lang);
    return cap.startsWith(name) ? cap : `${name} — ${cap}`;
  };

  const tile = (x, i, narrow) => {
    const isPano = x.base === 'aerial-panorama';
    const loc = x.p.location ? t(x.p.location) : t(x.p.typology);
    const cap = caption(x);
    const name = t(x.p.name);
    const detail = cap.startsWith(name) ? cap.slice(name.length).replace(/^\s*—\s*/, '') : t(x.g.caption);
    const label = `${cap}${x.p.nameIsDescriptive ? ` (${t(G.descriptive)})` : ''}`;
    const cat = getCategory(x.p.category);
    const catName = x.catLabel ? t(COMPANIES.label) : cat ? t(cat.name) : '';
    const detailCls = x.zoom > 1 ? ' mgal__item--detail' : '';
    return `
      <div class="mgal__item${isPano ? ' mgal__item--pano' : ''}${detailCls}" role="listitem" style="--ar:${(isPano && narrow ? 3 : x.ar).toFixed(4)}${x.zoom > 1 ? `;--zoom:${x.zoom};--focus:${esc(x.pos)}` : ''}">
        <button class="mgal__open" type="button" data-open="${i}" data-cursor="zoom" aria-label="${esc(fmt(t(G.open), { c: label }))}">
          ${picture(x.base, { alt: '', position: x.pos })}
          <span class="mgal__shade" aria-hidden="true"></span>
          <span class="mgal__cap" aria-hidden="true">
            ${catName ? `<span class="mgal__cap-cat">${esc(catName)}</span>` : ''}
            <span class="mgal__cap-name">${esc(name)}${x.p.nameIsDescriptive ? '<span class="mgal__mark">◇</span>' : ''}</span>
            ${detail ? `<span class="mgal__cap-text">${esc(detail)}</span>` : ''}
            <span class="mgal__cap-loc">${icon('map-pin', 'icon--xs')}<span>${esc(loc)}</span></span>
          </span>
          <span class="mgal__zoom" aria-hidden="true">${icon('maximize-2')}</span>
        </button>
        <a class="mgal__dl" href="assets/img/${x.base}.jpg" download="mobco-${x.base}.jpg" aria-label="${esc(fmt(t(G.dl), { c: cap }))}" data-no-transition>${icon('download')}</a>
      </div>`;
  };

  // justified rows: add images until the row height drops to the target; keep whichever break is closer
  const layout = (list, W) => {
    const gap = W < 640 ? 8 : W < 1024 ? 12 : 16;
    const target = W < 640 ? 150 : W < 1024 ? 230 : 300;
    const arOf = (x) => (x.base === 'aerial-panorama' && W < 640 ? 3 : x.ar);
    const rows = [];
    let row = [], sum = 0;
    for (const x of list) {
      const a = arOf(x);
      const hWith = (W - gap * row.length) / (sum + a);
      if (row.length && hWith < target) {
        const hWithout = (W - gap * (row.length - 1)) / sum;
        if (Math.abs(hWith - target) < Math.abs(hWithout - target) && hWith > target * 0.62) {
          row.push(x); sum += a; rows.push({ row, sum, full: true }); row = []; sum = 0; continue;
        }
        rows.push({ row, sum, full: true });
        row = [x]; sum = a; continue;
      }
      row.push(x); sum += a;
    }
    if (row.length) rows.push({ row, sum, full: false });
    return { rows, gap, target };
  };

  const render = ({ animateFrom = -1 } = {}) => {
    const all = filtered();
    const list = all.slice(0, shown);
    const W = mount.clientWidth;
    const narrow = W < 640;
    const { rows, gap, target } = layout(list, W);
    lastW = W;
    let n = 0;
    mount.style.setProperty('--gap', `${gap}px`);
    mount.innerHTML = rows.map(({ row, sum, full }) => {
      const h = (W - gap * (row.length - 1)) / sum;
      const height = full ? h : Math.min(h, target);
      const open = !full && height < h - 0.5;
      return `<div class="mgal__row${open ? ' mgal__row--open' : ''}" role="none" style="--h:${height.toFixed(2)}px">${row.map((x) => tile(x, n++, narrow)).join('')}</div>`;
    }).join('');
    mount.__all = all;
    status.textContent = fmt(t(G.status), { n: list.length, total: all.length });
    const rest = all.length - list.length;
    moreWrap.hidden = rest <= 0;
    moreLabel.textContent = fmt(t(G.more), { n: Math.min(rest, PAGE) });
    if (animateFrom >= 0 && !reduced) {
      $$('.mgal__item', mount).slice(animateFrom).forEach((el, i) => {
        el.animate([{ opacity: 0, transform: 'translate3d(0, 24px, 0) scale(.98)' }, { opacity: 1, transform: 'none' }],
          { duration: 700, delay: Math.min(i, 12) * 45, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
      });
    }
    refresh();
  };

  let busy = 0;
  group.addEventListener('chipchange', (e) => {
    const v = e.detail.values[0] || 'all';
    if (v === filter) return;
    filter = v;
    shown = PAGE;
    clearTimeout(busy);
    if (reduced) { render(); return; }
    mount.classList.add('is-filtering');
    busy = setTimeout(() => { render({ animateFrom: 0 }); mount.classList.remove('is-filtering'); }, 220);
  });
  moreBtn?.addEventListener('click', () => {
    const from = Math.min(shown, filtered().length);
    shown += PAGE;
    render({ animateFrom: from });
    // keep keyboard users in place: focus the first newly revealed image
    $$('.mgal__open', mount)[from]?.focus({ preventScroll: true });
  });

  mount.addEventListener('click', (e) => {
    const b = e.target.closest('[data-open]');
    if (!b) return;
    const all = mount.__all || [];
    const full = (x, lang) => `${caption(x, lang)}${x.p.location ? ` · ${t(x.p.location, lang)}` : ''}`;
    openLightbox(all.map((x) => ({
      src: `assets/img/${x.base}.jpg`,
      srcWebp: `assets/img/${x.base}.webp`,
      alt: { en: caption(x, 'en'), ar: caption(x, 'ar') },
      caption: { en: full(x, 'en'), ar: full(x, 'ar') },
    })), parseInt(b.getAttribute('data-open'), 10));
  });

  new ResizeObserver(debounce(() => { if (Math.abs(mount.clientWidth - lastW) > 2) render(); }, 120)).observe(mount);
  render();
  onLang(() => { labelChips(); render(); });
}

/* ======================================================================
   3 · BRAND KIT
   ====================================================================== */
function initBrandKit() {
  // logo preview background
  const grid = $('[data-logo-grid]');
  $('[data-logo-bg]')?.addEventListener('chipchange', (e) => {
    if (grid) grid.setAttribute('data-tone', e.detail.values[0] === 'navy' ? 'navy' : 'light');
  });

  // palette: copy format + localized labels (aria-label is JS-managed, not data-ar-aria-label)
  const swatches = $$('.mpal__swatch');
  let format = 'hex';
  const C = { copy: { en: 'Copy {name}: {v}', ar: 'نسخ {name}: {v}' } };
  const paint = () => {
    swatches.forEach((b) => {
      const v = format === 'rgb' ? b.dataset.rgb : b.dataset.hex.toUpperCase();
      b.setAttribute('data-copy', v);
      b.setAttribute('aria-label', fmt(t(C.copy), { name: getLang() === 'ar' ? b.dataset.nameAr : b.dataset.name, v }));
    });
    $('[data-palette]')?.setAttribute('data-format', format);
  };
  $('[data-copy-format]')?.addEventListener('chipchange', (e) => { format = e.detail.values[0] === 'rgb' ? 'rgb' : 'hex'; paint(); });
  paint();
  onLang(paint);

  // type tester
  const tester = $('[data-type-tester]');
  const tabs = $('[data-type-tabs]');
  if (!tester || !tabs) return;
  const preview = $('[data-type-preview]', tester);
  const input = $('[data-type-input]', tester);
  const weight = $('[data-type-weight]', tester);
  const size = $('[data-type-size]', tester);
  const FONTS = {
    manrope: { family: "'Manrope', sans-serif", min: 200, max: 800, upper: true, sample: { en: 'Integrity & Excellence', ar: 'Integrity & Excellence' }, dir: 'ltr' },
    inter: { family: "'Inter', sans-serif", min: 100, max: 900, upper: false, sample: { en: 'We plan. We build. We manage.', ar: 'We plan. We build. We manage.' }, dir: 'ltr' },
    plex: { family: "'IBM Plex Sans Arabic', sans-serif", min: 400, max: 700, upper: false, sample: { en: 'النزاهة والتميّز', ar: 'النزاهة والتميّز' }, dir: 'rtl' },
  };
  let font = 'manrope';
  const update = () => {
    const f = FONTS[font];
    const custom = input.value.trim();
    preview.textContent = custom || t(f.sample);
    preview.style.fontFamily = f.family;
    preview.style.fontWeight = weight.value;
    preview.style.setProperty('--size', `${size.value}px`);
    preview.dir = custom ? 'auto' : f.dir;
    preview.classList.toggle('is-upper', f.upper && !/[؀-ۿ]/.test(preview.textContent));
    tester.setAttribute('data-font', font);
  };
  const setFont = (id) => {
    font = FONTS[id] ? id : 'manrope';
    const f = FONTS[font];
    weight.min = String(f.min);
    weight.max = String(f.max);
    weight.value = String(clamp(parseInt(weight.value, 10), f.min, f.max));
    weight.dispatchEvent(new Event('input'));
    update();
  };
  tabs.addEventListener('tabchange', (e) => setFont(e.detail.id));
  [input, weight, size].forEach((el) => el.addEventListener('input', update));
  onLang(update);
  setFont('manrope');
}

/* ======================================================================
   4 · NEWSLETTER
   ====================================================================== */
function initNewsletter() {
  const form = $('[data-newsletter]');
  const success = $('[data-newsletter-success]');
  if (!form || !success) return;
  const btn = form.querySelector('[type=submit]');
  form.addEventListener('validsubmit', (e) => {
    e.preventDefault(); // static site: nothing is sent (see docs/content-notes/media.md)
    btn.classList.add('is-loading');
    btn.setAttribute('aria-busy', 'true');
    setTimeout(() => {
      btn.classList.remove('is-loading');
      btn.removeAttribute('aria-busy');
      form.hidden = true;
      success.hidden = false;
      success.querySelector('[tabindex="-1"]')?.focus({ preventScroll: true });
      toast({ en: 'Thank you — you’re subscribed to MOBCO news.', ar: 'شكرًا لك — تم اشتراكك في أخبار موبكو.' });
      refresh();
    }, reduced ? 0 : 900);
  });
  $('[data-newsletter-again]')?.addEventListener('click', () => {
    form.reset();
    success.hidden = true;
    form.hidden = false;
    form.querySelector('#mn-email')?.focus();
    refresh();
  });
}

/* ---------------------------------------------------------------- boot */
for (const [name, fn] of [['reel', initReel], ['gallery', initGallery], ['brand', initBrandKit], ['newsletter', initNewsletter]]) {
  try { fn(); } catch (err) { console.error(`[media] ${name} failed`, err); }
}
scan(document);
