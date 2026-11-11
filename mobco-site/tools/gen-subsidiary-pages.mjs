// Generator for the three subsidiary detail pages (mobco-construction / -developments / -real-estate).
// Reads verbatim copy from assets/js/data/site-data.js and writes static, SEO-friendly HTML (EN text + data-ar*).
// Run: node tools/gen-subsidiary-pages.mjs  (then: node tools/build.mjs <the three pages> to inline header/footer)
// NOTE: the pages were reviewed and hand-tuned after generation, running this OVERWRITES them.
// Commit first and review the git diff afterwards (or edit the HTML directly for small copy changes).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

globalThis.location = { search: '' };
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const D = await import(`${ROOT}/assets/js/data/site-data.js`);
const U = await import(`${ROOT}/assets/js/core/utils.js`);
const { SUBSIDIARIES, PROJECTS, PROJECT_CATEGORIES, getSubsidiary, getProject, getRegion, getCategory, projectsBy, projectUrl, studioUrl } = D;
const { picture } = U;

/* ------------------------------------------------------------------ helpers */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const L = (o) => (typeof o === 'string' ? { en: o, ar: o } : o);
const attrs = (a) => (a ? ` ${a}` : '');
/** text element: EN text + data-ar */
const tx = (tag, o, a = '') => { o = L(o); return `<${tag}${attrs(a)} data-ar="${esc(o.ar)}">${esc(o.en)}</${tag}>`; };
/** html element: trusted EN markup + data-ar-html */
const th = (tag, o, a = '') => `<${tag}${attrs(a)} data-ar-html="${esc(o.ar)}">${o.en}</${tag}>`;
const ic = (name, cls = '') => `<svg class="icon${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false"><use href="assets/icons/sprite.svg#${name}"></use></svg>`;
const arrow = (name = 'arrow-right') => ic(name, 'icon--dir');
const linkArrow = (href, label, extra = '') => `<a class="link-arrow" href="${href}"${attrs(extra)}>${tx('span', label)}<span class="link-arrow__icon">${arrow()}</span></a>`;
const btn = (href, label, cls = 'btn--primary', { icon = 'arrow-right', dir = true, extra = '' } = {}) =>
  `<a class="btn ${cls}" href="${href}"${attrs(extra)}>${tx('span', label)}${icon ? ic(icon, dir ? 'icon--dir' : '') : ''}</a>`;
const pad = (n) => String(n).padStart(2, '0');
const SITE = 'https://mobco-group.com';
const indent = (s, n) => s.split('\n').map((l) => (l ? ' '.repeat(n) + l : l)).join('\n');

/* ------------------------------------------------------------------ shared copy */
const S = {
  home: { en: 'Home', ar: 'الرئيسية' },
  subs: { en: 'Subsidiaries', ar: 'الشركات التابعة' },
  breadcrumb: { en: 'Breadcrumb', ar: 'مسار التنقل' },
  scroll: { en: 'Scroll', ar: 'مرّر للأسفل' },
  about: { en: 'About the company', ar: 'عن الشركة' },
  facts: { en: 'Key facts', ar: 'حقائق رئيسية' },
  group: { en: 'The group', ar: 'شركات المجموعة' },
  others: { en: 'Explore other <em>MOBCO companies</em>', ar: 'اكتشف <em>شركات موبكو</em> الأخرى' },
  othersLead: { en: 'One vertically integrated group in construction, development, real estate and education.', ar: 'مجموعة واحدة متكاملة رأسيًا في الإنشاءات والتطوير والعقارات والتعليم.' },
  allSubs: { en: 'All subsidiaries', ar: 'جميع الشركات التابعة' },
  visit: { en: 'Visit company', ar: 'زيارة صفحة الشركة' },
  start: { en: 'Start a project', ar: 'ابدأ مشروعك' },
  allProjects: { en: 'All projects', ar: 'جميع المشاريع' },
  letsTalk: { en: 'Let’s talk', ar: 'لنتحدّث' },
  prev: { en: 'Previous slide', ar: 'الشريحة السابقة' },
  next: { en: 'Next slide', ar: 'الشريحة التالية' },
};

/* ------------------------------------------------------------------ per-page config */
const ksaFeatured = projectsBy({ region: 'ksa', featured: true });
const count = (f) => PROJECTS.filter(f).length;

const PAGES = {
  'mobco-construction': {
    file: 'mobco-construction.html',
    title: { en: 'MOBCO Construction | MOBCO Group', ar: 'موبكو للإنشاءات | مجموعة موبكو' },
    desc: {
      en: 'MOBCO Construction, the construction arm of MOBCO Group since 2001: tier-one status and 438 projects completed across Saudi Arabia, Canada, the UK and Egypt.',
      ar: 'موبكو للإنشاءات، الذراع الإنشائية لمجموعة موبكو منذ عام 2001: تصنيف من الفئة الأولى و438 مشروعًا مُنجزًا في المملكة العربية السعودية وكندا والمملكة المتحدة ومصر.',
    },
    eyebrow: { en: 'The construction arm of MOBCO Group', ar: 'الذراع الإنشائية لمجموعة موبكو' },
    h1: { en: '<span class="sd-hero__pre">MOBCO</span> <span class="sd-hero__name">Construction</span>', ar: '<span class="sd-hero__pre">موبكو</span> <span class="sd-hero__name">للإنشاءات</span>' },
    actions: [
      ['contact.html#inquiry', S.start, 'btn--primary', 'arrow-right'],
      ['#footprint', { en: 'Our footprint', ar: 'حضورنا الدولي' }, 'btn--ghost', 'arrow-down'],
    ],
    plateNote: { en: 'Est. 2001', ar: 'تأسّست عام 2001' },
    meta: [
      [{ en: 'Founded', ar: 'التأسيس' }, '2001'],
      [{ en: 'Projects completed', ar: 'المشاريع المُنجزة' }, '438'],
      [{ en: 'Markets', ar: 'الأسواق' }, { en: 'KSA · Canada · UK · Egypt', ar: 'السعودية · كندا · المملكة المتحدة · مصر' }],
    ],
    aboutTitle: { en: 'MOBCO <em>Construction</em>', ar: 'موبكو <em>للإنشاءات</em>' },
    quote: {
      en: 'Having completed 438 projects across four continents, our portfolio reflects a strong commitment to excellence and delivering exceptional results.',
      ar: 'مع إنجاز 438 مشروعًا في أربع قارات، تعكس محفظة أعمالنا التزامًا راسخًا بالتميّز وتحقيق نتائج استثنائية.',
    },
    quoteAfter: 1,
    figure: { pos: '50% 60%', alt: { en: 'Night render of a low-rise building with a timber-toned façade, lit from below and framed by palm trees', ar: 'تصوّر ليلي لمبنى منخفض الارتفاع بواجهة بلون الخشب، مضاء من الأسفل وتحيط به أشجار النخيل' }, caption: { en: 'Night render, low-rise building with a timber-toned façade', ar: 'تصوّر ليلي, مبنى منخفض الارتفاع بواجهة بلون الخشب' } },
    facts: [
      { icon: 'calendar', value: '2001', label: { en: 'Founded', ar: 'سنة التأسيس' } },
      { icon: 'hard-hat', value: '438', count: 438, label: { en: 'Projects completed', ar: 'مشروعًا مُنجزًا' } },
      { icon: 'globe-2', value: '4', count: 4, label: { en: 'Countries: Saudi Arabia · Canada · UK · Egypt', ar: 'دول: السعودية · كندا · المملكة المتحدة · مصر' } },
      { icon: 'award', text: { en: 'Tier one', ar: 'الفئة الأولى' }, label: { en: 'Status in the global construction industry', ar: 'تصنيفها في قطاع الإنشاءات العالمي' } },
    ],
    cta: {
      eyebrow: S.letsTalk,
      title: { en: 'Planning your next <em>project?</em>', ar: 'هل تخطّط لمشروعك <em>القادم؟</em>' },
      bgPos: '30% 40%',
      actions: [['contact.html#inquiry', S.start, 'btn--primary', 'arrow-right'], ['projects.html', S.allProjects, 'btn--ghost', '']],
    },
  },
  'mobco-developments': {
    file: 'mobco-developments.html',
    title: { en: 'MOBCO Developments | MOBCO Group', ar: 'موبكو للتطوير | مجموعة موبكو' },
    desc: {
      en: 'MOBCO Developments is MOBCO Group’s strategic entry into the Egyptian market, transforming prime locations in Egypt and Canada through innovative, high-quality projects.',
      ar: 'موبكو للتطوير هي دخول مجموعة موبكو الاستراتيجي إلى السوق المصرية، وتحويل مواقع متميّزة في مصر وكندا عبر مشاريع مبتكرة عالية الجودة.',
    },
    eyebrow: { en: 'The development arm of MOBCO Group', ar: 'ذراع التطوير في مجموعة موبكو' },
    h1: { en: '<span class="sd-hero__pre">MOBCO</span> <span class="sd-hero__name">Developments</span>', ar: '<span class="sd-hero__pre">موبكو</span> <span class="sd-hero__name">للتطوير</span>' },
    actions: [
      ['#showcase', { en: 'Explore our markets', ar: 'استكشف أسواقنا' }, 'btn--primary', 'arrow-down'],
      ['contact.html#inquiry', { en: 'Get in touch', ar: 'تواصل معنا' }, 'btn--ghost', 'arrow-right'],
    ],
    plateNote: { en: 'Egypt · Canada', ar: 'مصر · كندا' },
    meta: [
      [{ en: 'Markets', ar: 'الأسواق' }, { en: 'Egypt & Canada', ar: 'مصر وكندا' }],
      [{ en: 'Projects', ar: 'المشاريع' }, { en: 'Eastmain · Victoria 101', ar: 'إيست مين · فيكتوريا 101' }],
      [{ en: 'Commitment', ar: 'التزامنا' }, { en: 'Safety & sustainability', ar: 'السلامة والاستدامة' }],
    ],
    aboutTitle: { en: 'MOBCO <em>Developments</em>', ar: 'موبكو <em>للتطوير</em>' },
    quote: {
      en: 'Our mission is to create transformative developments that not only meet but surpass the highest industry standards.',
      ar: 'رسالتنا هي إنشاء مشاريع تطوير تحويلية لا تكتفي بتلبية أعلى معايير الصناعة بل تتجاوزها.',
    },
    quoteAfter: 2,
    figure: { pos: '50% 50%', alt: { en: 'Evening render of Eastmain, New Cairo: a glazed office and retail building with a landscaped plaza', ar: 'تصوّر مسائي لمشروع إيست مين بالقاهرة الجديدة: مبنى مكاتب ومحلات بواجهات زجاجية مع ساحة منسّقة' }, caption: { en: 'Eastmain, New Cairo, evening render', ar: 'إيست مين، القاهرة الجديدة, تصوّر مسائي' } },
    facts: [
      { icon: 'earth', text: { en: 'Egypt & Canada', ar: 'مصر وكندا' }, label: { en: 'Markets', ar: 'الأسواق' } },
      { icon: 'building-2', text: { en: 'Eastmain', ar: 'إيست مين' }, label: { en: 'Golden Square, New Cairo', ar: 'المربع الذهبي، القاهرة الجديدة' } },
      { icon: 'house', text: { en: 'Victoria 101', ar: 'فيكتوريا 101' }, label: { en: 'Port Whitby, Ontario', ar: 'بورت ويتبي، أونتاريو' } },
    ],
    cta: {
      eyebrow: S.letsTalk,
      title: { en: 'Let’s shape the next <em>landmark</em>', ar: 'لنصنع معًا <em>المَعلم القادم</em>' },
      bgPos: '70% 30%',
      actions: [['contact.html#inquiry', { en: 'Get in touch', ar: 'تواصل معنا' }, 'btn--primary', 'arrow-right'], ['projects.html', S.allProjects, 'btn--ghost', '']],
    },
  },
  'mobco-real-estate': {
    file: 'mobco-real-estate.html',
    title: { en: 'MOBCO Real Estate Development | MOBCO Group', ar: 'موبكو للتطوير العقاري | مجموعة موبكو' },
    desc: {
      en: 'MOBCO Real Estate Development, established in 2002 in Cairo. Leasing and property management for multi-functional buildings, including the flagship Mivida Business Park, B1.',
      ar: 'موبكو للتطوير العقاري، تأسّست عام 2002 في القاهرة. تأجير وإدارة العقارات للمباني متعددة الوظائف، ومنها المشروع الرئيسي مجمّع ميفيدا للأعمال، المبنى B1.',
    },
    eyebrow: { en: 'Leasing & property management · Cairo', ar: 'التأجير وإدارة العقارات · القاهرة' },
    h1: { en: '<span class="sd-hero__pre">MOBCO</span> <span class="sd-hero__name">Real Estate Development</span>', ar: '<span class="sd-hero__pre">موبكو</span> <span class="sd-hero__name">للتطوير العقاري</span>' },
    actions: [
      ['contact.html#inquiry', { en: 'Leasing enquiry', ar: 'استفسار عن التأجير' }, 'btn--primary', 'arrow-right'],
      ['#flagship', { en: 'Explore B1', ar: 'استكشف المبنى B1' }, 'btn--ghost', 'arrow-down'],
    ],
    plateNote: { en: 'Since 2002 · Cairo', ar: 'منذ 2002 · القاهرة' },
    meta: [
      [{ en: 'Established', ar: 'التأسيس' }, '2002'],
      [{ en: 'Based in', ar: 'المقر' }, { en: 'Cairo, Egypt', ar: 'القاهرة، مصر' }],
      [{ en: 'Flagship', ar: 'المشروع الرئيسي' }, { en: 'Mivida Business Park, B1', ar: 'مجمّع ميفيدا للأعمال، B1' }],
    ],
    aboutTitle: { en: 'MOBCO <em>Real Estate</em> Development', ar: 'موبكو <em>للتطوير العقاري</em>' },
    quote: {
      en: 'This design allows us to tailor office environments to meet the unique needs of each tenant.',
      ar: 'يتيح لنا هذا التصميم تهيئة بيئات العمل بما يلبّي الاحتياجات الخاصة بكل مستأجر.',
    },
    quoteAfter: 1,
    figure: { pos: '50% 50%', alt: { en: 'Bright, modern office interior with floor-to-ceiling glazing, a meeting table and plants', ar: 'مساحة مكتبية حديثة ومضيئة بواجهات زجاجية من الأرض حتى السقف وطاولة اجتماعات ونباتات' }, caption: { en: 'Modern office interior (illustrative image)', ar: 'مساحة مكتبية حديثة (صورة توضيحية)' } },
    facts: [
      { icon: 'calendar', value: '2002', label: { en: 'Established in Cairo', ar: 'سنة التأسيس في القاهرة' } },
      { icon: 'handshake', text: { en: 'Leasing & property management', ar: 'التأجير وإدارة العقارات' }, label: { en: 'For multi-functional buildings', ar: 'للمباني متعددة الوظائف' } },
      { icon: 'building', text: { en: 'B1', ar: 'B1' }, big: true, label: { en: 'Flagship: Mivida Business Park', ar: 'المشروع الرئيسي: مجمّع ميفيدا للأعمال' } },
    ],
    cta: {
      eyebrow: { en: 'Leasing', ar: 'التأجير' },
      title: { en: 'Leasing at <em>Mivida Business Park</em>', ar: 'التأجير في <em>مجمّع ميفيدا للأعمال</em>' },
      bgPos: '80% 40%',
      actions: [
        ['contact.html#inquiry', { en: 'Leasing enquiry', ar: 'استفسار عن التأجير' }, 'btn--primary', 'arrow-right'],
        ['tel:+20223866591', { en: 'Call the Egypt office', ar: 'اتصل بمكتب مصر' }, 'btn--ghost', 'phone', false],
      ],
    },
  },
};
const ORDER = ['mobco-construction', 'mobco-developments', 'mobco-real-estate'];

/* ------------------------------------------------------------------ sections */
function head(id, P, sub) {
  const url = `${SITE}/${P.file}`;
  const img = `${SITE}/assets/img/${sub.hero}.jpg`;
  const ld = [
    {
      '@context': 'https://schema.org', '@type': 'Organization', name: t(sub.name, 'en'), alternateName: t(sub.name, 'ar'),
      url, logo: `${SITE}/${sub.logo.color}`, description: t(sub.short, 'en'),
      ...(id === 'mobco-construction' ? { foundingDate: '2001' } : {}),
      ...(id === 'mobco-real-estate' ? { foundingDate: '2002', foundingLocation: { '@type': 'Place', name: 'Cairo, Egypt' } } : {}),
      parentOrganization: { '@type': 'Organization', name: 'MOBCO Group', url: `${SITE}/` },
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/index.html` },
        { '@type': 'ListItem', position: 2, name: 'Subsidiaries', item: `${SITE}/subsidiaries.html` },
        { '@type': 'ListItem', position: 3, name: t(sub.name, 'en'), item: url },
      ],
    },
  ];
  return `<!doctype html>
<html lang="en" dir="ltr" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title data-ar-title="${esc(P.title.ar)}">${esc(P.title.en)}</title>
  <meta name="description" content="${esc(P.desc.en)}" data-ar-content="${esc(P.desc.ar)}">
  <!-- TODO(deploy): confirm production domain for canonical / og:url / og:image -->
  <link rel="canonical" href="${url}">
  <link rel="alternate" hreflang="en" href="${url}">
  <link rel="alternate" hreflang="ar" href="${url}?lang=ar">
  <link rel="alternate" hreflang="x-default" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="MOBCO Group">
  <meta property="og:title" content="${esc(P.title.en)}" data-ar-content="${esc(P.title.ar)}">
  <meta property="og:description" content="${esc(P.desc.en)}" data-ar-content="${esc(P.desc.ar)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${img}">
  <meta property="og:image:width" content="${U.IMAGES[sub.hero].w}">
  <meta property="og:image:height" content="${U.IMAGES[sub.hero].h}">
  <meta property="og:image:alt" content="${esc(t(sub.name, 'en'))}" data-ar-content="${esc(t(sub.name, 'ar'))}">
  <meta property="og:locale" content="en_US">
  <meta property="og:locale:alternate" content="ar_SA">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(P.title.en)}" data-ar-content="${esc(P.title.ar)}">
  <meta name="twitter:description" content="${esc(P.desc.en)}" data-ar-content="${esc(P.desc.ar)}">
  <meta name="twitter:image" content="${img}">
  <meta name="theme-color" content="#1f1f38">
  <link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
  <link rel="manifest" href="site.webmanifest">
  <link rel="preload" href="assets/fonts/manrope-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="assets/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="assets/img/${sub.hero}.webp" as="image" type="image/webp" fetchpriority="high">
  <link rel="stylesheet" href="assets/vendor/lenis/lenis.css">
  <link rel="stylesheet" href="assets/css/main.css">
  <link rel="stylesheet" href="assets/css/pages/subsidiary.css">
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
  <!-- Boot (keep verbatim in every page): js class, early lang/dir, first-visit preloader, transition, QA mode -->
  <script>
    (function (d) {
      var h = d.documentElement, c = h.classList;
      c.add('js'); c.remove('no-js');
      try {
        var u = new URLSearchParams(location.search), l = u.get('lang') || localStorage.getItem('mobco-lang');
        var qa = u.get('qa') === '1', rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (l === 'ar') { h.lang = 'ar'; h.dir = 'rtl'; c.add('i18n-pending'); }
        if (qa) c.add('qa');
        if (!qa && !rm && !sessionStorage.getItem('mobco-visited')) c.add('preload');
        if (sessionStorage.getItem('mobco-transition')) { sessionStorage.removeItem('mobco-transition'); if (!qa && !rm) c.add('is-entering'); }
      } catch (e) {}
    })(document);
  </script>
  <script src="assets/vendor/gsap/gsap.min.js" defer></script>
  <script src="assets/vendor/gsap/ScrollTrigger.min.js" defer></script>
  <script src="assets/vendor/gsap/SplitText.min.js" defer></script>
  <script src="assets/vendor/lenis/lenis.min.js" defer></script>
  <script type="module" src="assets/js/core/main.js"></script>
  <script type="module" src="assets/js/pages/subsidiary.js"></script>
</head>
<body data-page="subsidiaries" data-subsidiary="${id}" data-hero="dark">
  <!-- @include header -->
  <!-- /@include header -->
`;
}
function t(o, lang) { return typeof o === 'string' ? o : o[lang]; }

function logoImg(sub, variant, { cls = '', eager = false } = {}) {
  const src = sub.logo[variant] || sub.logo.color;
  return `<img${cls ? ` class="${cls}"` : ''} src="${src}" alt="${esc(t(sub.name, 'en'))}" data-ar-alt="${esc(t(sub.name, 'ar'))}" width="${sub.logo.w}" height="${sub.logo.h}"${eager ? '' : ' loading="lazy"'} decoding="async">`;
}

function hero(id, P, sub) {
  const light = !!sub.logo.needsLightTile;
  const meta = P.meta.map(([k, v]) => `<div>${tx('dt', k)}${typeof v === 'string' ? `<dd>${esc(v)}</dd>` : tx('dd', v)}</div>`).join('\n          ');
  const actions = P.actions.map(([h, l, c, i]) => btn(h, l, c, { icon: i, dir: !/down|up/.test(i), extra: c === 'btn--primary' ? 'data-magnetic' : '' })).join('\n          ');
  return `
  <main id="main" tabindex="-1">
    <!-- 01 · Hero ============================================================ -->
    <section class="page-hero sd-hero" aria-labelledby="sd-title">
      <div class="page-hero__bg sd-hero__bg" data-kenburns data-sd-hero-bg>
        ${picture(sub.hero, { loading: 'eager', fetchpriority: 'high', sizes: '100vw' })}
      </div>
      <div class="sd-hero__lines" aria-hidden="true"></div>
      <div class="container page-hero__inner sd-hero__inner">
        <div class="sd-hero__copy">
          <nav class="breadcrumb" aria-label="Breadcrumb" data-ar-aria-label="مسار التنقل" data-reveal="fade">
            <ol>
              <li>${tx('a', S.home, 'href="index.html"')}</li>
              <li>${tx('a', S.subs, 'href="subsidiaries.html"')}</li>
              <li>${tx('span', sub.name, 'aria-current="page"')}</li>
            </ol>
          </nav>
          ${tx('p', P.eyebrow, 'class="eyebrow sd-hero__eyebrow" data-reveal="fade" data-reveal-delay="100"')}
          ${th('h1', P.h1, 'class="display page-hero__title sd-hero__title" id="sd-title" data-split')}
          ${tx('p', sub.tagline, 'class="sd-hero__tagline" data-split data-reveal-delay="280"')}
          ${tx('p', sub.short, 'class="lead page-hero__lead sd-hero__lead" data-reveal="up" data-reveal-delay="420"')}
          <div class="page-hero__actions" data-reveal="up" data-reveal-delay="540">
          ${actions}
          </div>
        </div>
        <div class="sd-hero__plate${light ? ' sd-hero__plate--light' : ''}" data-reveal="scale" data-reveal-delay="380">
          <div class="sd-hero__logo">${logoImg(sub, light ? 'color' : 'white', { eager: true })}</div>
          ${tx('p', P.plateNote, 'class="sd-hero__plate-note"')}
        </div>
      </div>
      <div class="container page-hero__foot">
        <span class="scroll-cue"><span class="scroll-cue__line" aria-hidden="true"></span>${tx('span', S.scroll)}</span>
        <dl class="page-hero__meta">
          ${meta}
        </dl>
      </div>
    </section>
`;
}

function about(id, P, sub) {
  const paras = sub.about.map((p, i) => tx('p', p, i === 0 ? 'class="lead sd-about__lead"' : 'class="sd-about__p"'));
  const quote = `<figure class="sd-quote" data-reveal="up">
              <svg class="sd-quote__mark" viewBox="0 0 48 36" aria-hidden="true" focusable="false"><path d="M0 36V22C0 9.6 6.4 2.3 19.2 0l2 4.7C14 7 10.6 11.1 10.2 17.2H20V36H0Zm27.6 0V22c0-12.4 6.4-19.7 19.2-22L48 4.7c-7.2 2.3-10.6 6.4-11 12.5h9.6V36H27.6Z"/></svg>
              ${tx('blockquote', P.quote, 'class="sd-quote__text"')}
              ${tx('figcaption', sub.name, 'class="sd-quote__cite"')}
            </figure>`;
  const body = [];
  paras.forEach((p, i) => { body.push(p); if (i + 1 === P.quoteAfter) body.push(quote); });
  if (P.quoteAfter > paras.length) body.push(quote);
  return `
    <!-- 02 · About (verbatim client copy) ================================== -->
    <section class="section has-gridlines sd-about" id="about" aria-labelledby="sd-about-title">
      <div class="container">
        <div class="grid grid--loose sd-about__grid">
          <div class="col-lg-5 sd-about__media">
            <figure class="sd-about__figure">
              <div class="sd-about__imgwrap">
                <div class="sd-about__frame" aria-hidden="true"></div>
                <div class="media sd-about__img" data-reveal="mask">
                  ${picture(sub.image, { alt: P.figure.alt.en, altAr: P.figure.alt.ar, position: P.figure.pos, sizes: '(min-width: 1024px) 40vw, 100vw' })}
                </div>
              </div>
              ${tx('figcaption', P.figure.caption, 'class="caption"')}
            </figure>
          </div>
          <div class="col-lg-6 start-lg-7 sd-about__copy">
            ${tx('p', S.about, 'class="eyebrow"')}
            ${th('h2', P.aboutTitle, 'class="h2 sd-about__title" id="sd-about-title" data-split')}
            <div class="sd-about__text">
            ${body.join('\n            ')}
            </div>
          </div>
        </div>
      </div>
    </section>
`;
}

function facts(id, P) {
  const items = P.facts.map((f, i) => {
    let value;
    if (f.count != null) value = `<p class="sd-fact__value num"><span data-count="${f.count}">${esc(f.value)}</span></p>`;
    else if (f.value) value = `<p class="sd-fact__value num">${esc(f.value)}</p>`;
    else value = tx('p', f.text, `class="sd-fact__value ${f.big ? 'num' : 'sd-fact__value--text'}"`);
    return `<li class="sd-fact">
            <div class="sd-fact__head"><span class="sd-fact__icon">${ic(f.icon)}</span><span class="sd-fact__index num" aria-hidden="true">${pad(i + 1)}</span></div>
            ${value}
            ${tx('p', f.label, 'class="sd-fact__label"')}
          </li>`;
  }).join('\n          ');
  return `
    <!-- 03 · Key facts (from SUBSIDIARIES[].facts) =========================== -->
    <section class="section section--sand section--sm sd-facts" aria-labelledby="sd-facts-title">
      <div class="container">
        <div class="sd-facts__head">
          ${tx('h2', S.facts, 'class="eyebrow sd-facts__title" id="sd-facts-title"')}
        </div>
        <ul class="sd-facts__list" role="list" data-reveal-stagger="110" style="--n:${P.facts.length}">
          ${items}
        </ul>
      </div>
    </section>
`;
}

/* ---------- Construction: footprint map + featured KSA projects ---------- */
function footprint() {
  const R = { ksa: getRegion('ksa'), egypt: getRegion('egypt'), canada: getRegion('canada') };
  const C = [
    { id: 'ksa', name: R.ksa.name, meta: { en: 'Headquarters · Riyadh', ar: 'المقر الرئيسي · الرياض' }, tab: { en: 'Headquarters', ar: 'المقر الرئيسي' }, text: R.ksa.blurb,
      link: ['projects.html?region=ksa', { en: 'View projects in Saudi Arabia', ar: 'عرض المشاريع في السعودية' }], n: count((p) => p.region === 'ksa') },
    { id: 'canada', name: R.canada.name, meta: { en: 'Port Whitby, Ontario', ar: 'بورت ويتبي، أونتاريو' }, tab: { en: 'North America', ar: 'أمريكا الشمالية' }, text: R.canada.blurb,
      link: ['projects.html?region=canada', { en: 'View projects in Canada', ar: 'عرض المشاريع في كندا' }], n: count((p) => p.region === 'canada') },
    { id: 'uk', name: { en: 'United Kingdom', ar: 'المملكة المتحدة' }, meta: { en: 'International projects', ar: 'مشاريع دولية' }, tab: { en: 'Europe', ar: 'أوروبا' },
      text: { en: 'Part of MOBCO Construction’s international project footprint, alongside Saudi Arabia, Canada and Egypt.', ar: 'جزءٌ من الحضور الدولي لمشاريع موبكو للإنشاءات، إلى جانب المملكة العربية السعودية وكندا ومصر.' },
      link: ['contact.html#inquiry', { en: 'Discuss a project', ar: 'ناقش مشروعك معنا' }], n: null, todo: 'TODO(content): client to supply UK project(s) / city for MOBCO Construction (only "the UK" is stated).' },
    { id: 'egypt', name: R.egypt.name, meta: { en: 'Regional office · Cairo', ar: 'المكتب الإقليمي · القاهرة' }, tab: { en: 'Regional office', ar: 'المكتب الإقليمي' }, text: R.egypt.blurb,
      link: ['projects.html?region=egypt', { en: 'View projects in Egypt', ar: 'عرض المشاريع في مصر' }], n: count((p) => p.region === 'egypt') },
  ];
  const tabs = C.map((c, i) => `<button class="sd-country" type="button" role="tab" id="sd-tab-${c.id}" aria-controls="sd-panel-${c.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-sd-country="${c.id}">
                <span class="sd-country__index num" aria-hidden="true">${pad(i + 1)}</span>
                <span class="sd-country__text">${tx('span', c.name, 'class="sd-country__name"')}${tx('span', c.tab, 'class="sd-country__meta"')}</span>
                ${ic('arrow-right', 'icon--dir sd-country__arrow')}
              </button>`).join('\n              ');
  const panels = C.map((c, i) => `<div class="sd-panel" role="tabpanel" id="sd-panel-${c.id}" aria-labelledby="sd-tab-${c.id}" data-sd-panel="${c.id}" tabindex="0">${c.todo ? `\n              <!-- ${c.todo} -->` : ''}
              ${tx('p', c.meta, 'class="sd-panel__meta"')}
              ${tx('h3', c.name, 'class="h4 sd-panel__title"')}
              ${tx('p', c.text, 'class="sd-panel__text"')}
              <div class="sd-panel__foot">
                ${linkArrow(c.link[0], c.link[1])}${c.n ? `\n                <span class="sd-panel__count"><span class="num">${c.n}</span> ${tx('span', { en: c.n === 1 ? 'project in the portfolio' : 'projects in the portfolio', ar: c.n === 1 ? 'مشروع في محفظة الأعمال' : 'مشروعًا في محفظة الأعمال' })}</span>` : ''}
              </div>
            </div>`).join('\n            ');
  const labels = {
    ksa: { en: 'Saudi Arabia', ar: 'السعودية' }, egypt: { en: 'Egypt', ar: 'مصر' }, canada: { en: 'Canada', ar: 'كندا' }, uk: { en: 'UK', ar: 'المملكة المتحدة' },
  };
  const pos = { ksa: [646, 206, 'middle'], egypt: [571, 152, 'end'], canada: [301, 104, 'middle'], uk: [488, 80, 'end'] };
  const svgLabels = Object.entries(labels).map(([k, v]) => tx('text', v, `class="sd-map__label sd-map__label--${k}" data-sd-label="${k}" x="${pos[k][0]}" y="${pos[k][1]}" text-anchor="${pos[k][2]}"`)).join('');
  return `
    <!-- 04 · Footprint: interactive dot map (Construction) =================== -->
    <section class="section section--deep sd-footprint" id="footprint" aria-labelledby="sd-footprint-title" data-sd-footprint>
      <div class="container">
        <header class="section-header section-header--split">
          ${tx('p', { en: 'Global footprint', ar: 'حضورنا الدولي' }, 'class="eyebrow"')}
          ${th('h2', { en: 'Projects spanning <em>four countries</em>', ar: 'مشاريع تمتد عبر <em>أربع دول</em>' }, 'class="h2" id="sd-footprint-title" data-split')}
          <div class="section-header__aside">
            ${tx('p', { en: 'Select a country on the list or the map to see where MOBCO Construction builds.', ar: 'اختر دولةً من القائمة أو على الخريطة لتتعرّف على أماكن عمل موبكو للإنشاءات.' }, 'class="lead" data-reveal="up"')}
          </div>
        </header>
        <div class="sd-footprint__grid">
          <figure class="sd-map" data-reveal="fade">
            <svg class="sd-map__svg" viewBox="105 8 615 252" role="img" aria-labelledby="sd-map-title" data-sd-map data-active="ksa">
              <title id="sd-map-title" data-ar="خريطة تُظهر مواقع مشاريع موبكو للإنشاءات: المملكة العربية السعودية وكندا والمملكة المتحدة ومصر">Map showing MOBCO Construction’s project countries: Saudi Arabia, Canada, the United Kingdom and Egypt</title>
              <g class="sd-map__labels" aria-hidden="true">${svgLabels}</g>
            </svg>
            <figcaption class="sd-map__caption">
              <span class="sd-map__legend"><span class="sd-map__key sd-map__key--hq" aria-hidden="true"></span>${tx('span', { en: 'Headquarters', ar: 'المقر الرئيسي' })}</span>
              <span class="sd-map__legend"><span class="sd-map__key" aria-hidden="true"></span>${tx('span', { en: 'Project countries', ar: 'دول المشاريع' })}</span>
              ${tx('span', { en: 'Marker positions are indicative.', ar: 'مواقع العلامات تقريبية.' }, 'class="sd-map__note"')}
            </figcaption>
          </figure>
          <div class="sd-footprint__side">
            <div class="sd-countries" role="tablist" aria-orientation="vertical" aria-label="Countries" data-ar-aria-label="الدول">
              ${tabs}
            </div>
            ${panels}
          </div>
        </div>
      </div>
    </section>
`;
}

function cardMarkup(p, { wide = false } = {}) {
  const cat = getCategory(p.category);
  const badge = cat ? cat.name : p.typology;
  return `<a class="project-card${wide ? ' project-card--wide' : ''}" href="${projectUrl(p)}" data-cursor="view" data-cursor-label="View" data-ar-cursor-label="عرض">
                <div class="project-card__media">${picture(p.image, { alt: '', thumb: !wide, position: p.pos, sizes: wide ? '(min-width: 768px) 50vw, 100vw' : '' })}</div>
                <span class="project-card__arrow">${ic('arrow-up-right', 'icon--dir')}</span>
                <div class="project-card__body">
                  <div class="project-card__meta">${tx('span', badge, 'class="badge badge--glass"')}</div>
                  ${tx('h3', p.name, 'class="project-card__title"')}
                  <p class="project-card__loc">${ic('map-pin')}${tx('span', p.location || { en: 'Location to be confirmed', ar: 'الموقع قيد التأكيد' })}</p>
                </div>
              </a>`;
}

function relatedConstruction() {
  const cats = PROJECT_CATEGORIES.map((c) => ({ c, n: count((p) => p.category === c.id) })).filter((x) => x.n);
  const chips = cats.map(({ c, n }) => `<a class="chip sd-sector" href="projects.html?category=${c.id}">${ic(c.icon)}${tx('span', c.name)}<span class="chip__count num">${n}</span></a>`).join('\n            ');
  const slides = ksaFeatured.map((p) => `<div class="carousel__slide">
              ${cardMarkup(p)}
            </div>`).join('\n            ');
  return `
    <!-- 05 · Sectors + featured KSA projects =================================== -->
    <section class="section sd-related" id="projects" aria-labelledby="sd-related-title">
      <div class="container">
        <header class="section-header section-header--split">
          ${tx('p', { en: 'Selected work', ar: 'أعمال مختارة' }, 'class="eyebrow"')}
          ${th('h2', { en: 'Featured projects in <em>Saudi Arabia</em>', ar: 'مشاريع مميّزة في <em>المملكة العربية السعودية</em>' }, 'class="h2" id="sd-related-title" data-split')}
          <div class="section-header__aside">
            ${tx('p', { en: 'A selection of featured projects from the group’s portfolio in the Kingdom.', ar: 'مختاراتٌ من المشاريع المميّزة في محفظة أعمال المجموعة داخل المملكة.' }, 'class="lead" data-reveal="up"')}
            ${linkArrow('projects.html?region=ksa', S.allProjects)}
          </div>
        </header>
        <div class="sd-sectors" data-reveal="up">
          ${tx('h3', { en: 'Sectors we deliver', ar: 'القطاعات التي نخدمها' }, 'class="h6 sd-sectors__title"')}
          <nav class="sd-sectors__list" aria-label="Browse projects by sector" data-ar-aria-label="تصفّح المشاريع حسب القطاع">
            ${chips}
          </nav>
        </div>
        <div class="carousel carousel--bleed sd-carousel" data-carousel data-reveal="up">
          <div class="carousel__head">
            ${tx('p', { en: 'Featured · Saudi Arabia', ar: 'مشاريع مميّزة · السعودية' }, 'class="label muted"')}
            <div class="carousel__nav">
              <button class="icon-btn" type="button" data-carousel-prev aria-label="Previous slide" data-ar-aria-label="الشريحة السابقة">${arrow('arrow-left')}</button>
              <button class="icon-btn" type="button" data-carousel-next aria-label="Next slide" data-ar-aria-label="الشريحة التالية">${arrow('arrow-right')}</button>
            </div>
          </div>
          <div class="carousel__viewport" data-cursor="drag" data-cursor-label="Drag" data-ar-cursor-label="اسحب" aria-label="Featured projects in Saudi Arabia" data-ar-aria-label="مشاريع مميّزة في المملكة العربية السعودية">
            ${slides}
          </div>
          <div class="carousel__foot"><span class="carousel__count">01 / ${pad(ksaFeatured.length)}</span><div class="carousel__progress"><span></span></div></div>
        </div>
      </div>
    </section>
`;
}

/* ---------- Developments: Egypt & Canada split showcase + related ---------- */
function showcase() {
  const items = [
    { p: getProject('eastmain'), r: getRegion('egypt') },
    { p: getProject('victoria-101'), r: getRegion('canada') },
  ];
  const panels = items.map(({ p, r }, i) => `<article class="sd-split__panel" data-sd-split-panel aria-labelledby="sd-split-${p.slug}">
            <div class="sd-split__layer sd-split__layer--base" aria-hidden="true">${picture(p.image, { alt: '', position: p.pos, sizes: '(min-width: 900px) 60vw, 100vw' })}</div>
            <div class="sd-split__layer sd-split__layer--reveal">${picture(p.image, { alt: t(p.imageNote, 'en'), altAr: t(p.imageNote, 'ar'), position: p.pos, sizes: '(min-width: 900px) 60vw, 100vw' })}</div>
            <div class="sd-split__shade" aria-hidden="true"></div>
            <div class="sd-split__top">
              <span class="sd-split__index num" aria-hidden="true">${pad(i + 1)}</span>
              ${tx('span', r.name, 'class="badge badge--glass sd-split__country"')}
              <button class="sd-split__toggle" type="button" aria-pressed="false" data-sd-reveal>${ic('eye')}<span data-sd-reveal-label data-ar="أظهِر التصوّر">Show render</span></button>
            </div>
            <div class="sd-split__body">
              ${tx('h3', p.name, `class="sd-split__title" id="sd-split-${p.slug}"`)}
              <p class="sd-split__loc">${ic('map-pin')}${tx('span', p.location)}</p>
              ${tx('p', p.summary, 'class="sd-split__text"')}
              <a class="link-arrow sd-split__link card-link" href="${projectUrl(p)}">${tx('span', { en: 'Related projects', ar: 'مشاريع ذات صلة' })}<span class="link-arrow__icon">${arrow()}</span></a>
            </div>
          </article>`).join('\n          ');
  return `
    <!-- 04 · Egypt & Canada split showcase (Developments) ===================== -->
    <section class="section section--deep sd-showcase" id="showcase" aria-labelledby="sd-showcase-title">
      <div class="container">
        <header class="section-header section-header--split">
          ${tx('p', { en: 'Egypt & Canada', ar: 'مصر وكندا' }, 'class="eyebrow"')}
          ${th('h2', { en: 'Transforming <em>prime locations</em>', ar: 'نحوّل <em>مواقع متميّزة</em>' }, 'class="h2" id="sd-showcase-title" data-split')}
          <div class="section-header__aside">
            ${tx('p', { en: 'Two markets, one commitment to quality and safety. Move across each render to reveal it from its blueprint.', ar: 'سوقان والتزامٌ واحد بالجودة والسلامة. حرّك المؤشر فوق كل تصوّر لتكشفه من مخططه الأوّلي.' }, 'class="lead" data-reveal="up"')}
          </div>
        </header>
      </div>
      <div class="sd-split" data-sd-split data-reveal="fade">
          ${panels}
        <span class="sd-split__seam" aria-hidden="true"><span data-ar="و">&amp;</span></span>
      </div>
    </section>
`;
}

function relatedDevelopments() {
  const ps = [getProject('eastmain'), getProject('victoria-101')];
  return `
    <!-- 05 · Related projects (Developments) =================================== -->
    <section class="section sd-related" id="projects" aria-labelledby="sd-related-title">
      <div class="container">
        <header class="section-header section-header--split">
          ${tx('p', { en: 'Related projects', ar: 'مشاريع ذات صلة' }, 'class="eyebrow"')}
          ${th('h2', { en: 'Eastmain &amp; <em>Victoria 101</em>', ar: 'إيست مين و<em>فيكتوريا 101</em>' }, 'class="h2" id="sd-related-title" data-split')}
          <div class="section-header__aside">
            ${tx('p', { en: 'See both projects in the portfolio: imagery, location and highlights.', ar: 'استكشف المشروعين في محفظة الأعمال: الصور والموقع وأبرز الملامح.' }, 'class="lead" data-reveal="up"')}
            ${linkArrow('projects.html', S.allProjects)}
          </div>
        </header>
        <div class="grid-2 sd-related__pair" data-reveal-stagger="120">
          ${ps.map((p) => `<div>
              ${cardMarkup(p, { wide: true })}
            </div>`).join('\n          ')}
        </div>
        <div class="sd-studio" data-reveal="up">
          <span class="sd-studio__icon">${ic('rotate-3d')}</span>
          <div class="sd-studio__text">
            ${tx('p', { en: 'See them in 3D', ar: 'شاهدهما بالأبعاد الثلاثية' }, 'class="sd-studio__title"')}
            ${tx('p', { en: 'Illustrative massing models in the 3D Project Studio.', ar: 'نماذج كتلية توضيحية في استوديو المشاريع ثلاثي الأبعاد.' }, 'class="small muted"')}
          </div>
          <div class="sd-studio__links">
            ${ps.map((p) => linkArrow(studioUrl(p), p.name)).join('\n            ')}
          </div>
        </div>
      </div>
    </section>
`;
}

/* ---------- Real Estate: Mivida Business Park B1 common-core diagram ---------- */
function flagship() {
  const parts = [
    ['lifts', 'arrow-up-down', { en: 'Lifts', ar: 'المصاعد' }],
    ['stairs', 'layers', { en: 'Stairs', ar: 'السلالم' }],
    ['mep', 'cog', { en: 'MEP & services', ar: 'الخدمات الكهروميكانيكية' }],
    ['wc', 'users', { en: 'Washrooms', ar: 'دورات المياه' }],
    ['wings', 'layout-grid', { en: 'Office wings', ar: 'الأجنحة المكتبية' }],
  ];
  const legend = parts.map(([id, icn, lab]) => `<li><button class="sd-core__part" type="button" aria-pressed="false" data-sd-part="${id}" aria-describedby="sd-core-readout"><span class="sd-core__swatch sd-core__swatch--${id}" aria-hidden="true"></span>${tx('span', lab)}</button></li>`).join('\n                ');
  const tenancy = [['1', { en: 'One tenant', ar: 'مستأجر واحد' }], ['2', { en: 'Two tenants', ar: 'مستأجران' }], ['4', { en: 'Four tenants', ar: 'أربعة مستأجرين' }]]
    .map(([v, lab], i) => `<label class="sd-seg__opt"><input class="sd-seg__input" type="radio" name="sd-tenancy" value="${v}"${i === 0 ? ' checked' : ''} data-sd-tenancy>${tx('span', lab, 'class="sd-seg__label"')}</label>`).join('');
  // Illustrative floor plate (viewBox 0 0 800 520): plate 20..780 × 20..500, core 280..520 × 180..340.
  const ticks = [];
  for (let x = 60; x <= 740; x += 40) { ticks.push(`M${x} 20v10`, `M${x} 500v-10`); }
  for (let y = 60; y <= 460; y += 40) { ticks.push(`M20 ${y}h10`, `M780 ${y}h-10`); }
  const stairs = (x0) => { const s = []; for (let y = 196; y <= 324; y += 12) s.push(`M${x0 + 6} ${y}h38`); return s.join(''); };
  const svg = `<svg class="sd-plan" viewBox="0 0 800 520" role="img" aria-labelledby="sd-plan-title sd-plan-desc" data-sd-plan data-active="" data-tenancy="1">
                <title id="sd-plan-title" data-ar="مخطط توضيحي لطابق مكتبي حول نواة مشتركة">Illustrative floor plate around a common core</title>
                <desc id="sd-plan-desc" data-ar="رسم توضيحي غير مطابق لمخطط المبنى B1: نواة مركزية تضم المصاعد والسلالم والخدمات الكهروميكانيكية ودورات المياه، تحيط بها أجنحة مكتبية مرنة.">Illustrative diagram, not the actual plan of B1: a central core with lifts, stairs, MEP services and washrooms, surrounded by flexible office wings.</desc>
                <defs>
                  <pattern id="sd-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0v8" class="sd-plan__hatch"/></pattern>
                  <pattern id="sd-desks" x="44" y="44" width="56" height="40" patternUnits="userSpaceOnUse"><rect class="sd-plan__desk" x="6" y="8" width="40" height="14" rx="1"/><circle class="sd-plan__desk" cx="16" cy="30" r="3.5"/><circle class="sd-plan__desk" cx="36" cy="30" r="3.5"/></pattern>
                </defs>
                <g class="sd-plan__wings" data-part="wings">
                  <path class="sd-plan__wing" data-wing="nw" d="M20 20H400V180H280V260H20Z"/>
                  <path class="sd-plan__wing" data-wing="ne" d="M400 20H780V260H520V180H400Z"/>
                  <path class="sd-plan__wing" data-wing="se" d="M780 260V500H400V340H520V260Z"/>
                  <path class="sd-plan__wing" data-wing="sw" d="M400 500H20V260H280V340H400Z"/>
                </g>
                <path class="sd-plan__desks" aria-hidden="true" d="M44 44H376V156H256V284H44ZM424 44H756V284H544V156H424ZM756 284V476H424V364H544V284ZM376 476H44V284H256V364H376Z"/>
                <g class="sd-plan__tenants" aria-hidden="true">
                  <text class="sd-plan__tlabel" data-t="nw" x="150" y="130">A</text>
                  <text class="sd-plan__tlabel" data-t="ne" x="650" y="130">B</text>
                  <text class="sd-plan__tlabel" data-t="se" x="650" y="410">C</text>
                  <text class="sd-plan__tlabel" data-t="sw" x="150" y="410">D</text>
                </g>
                <path class="sd-plan__ticks" d="${ticks.join('')}"/>
                <rect class="sd-plan__outline" x="20" y="20" width="760" height="480"/>
                <rect class="sd-plan__corridor" x="256" y="156" width="288" height="208"/>
                <g class="sd-plan__core">
                  <rect class="sd-plan__core-bg" x="280" y="180" width="240" height="160"/>
                  <g class="sd-plan__part" data-part="stairs">
                    <rect x="280" y="180" width="50" height="160"/><rect x="470" y="180" width="50" height="160"/>
                    <path class="sd-plan__line" d="${stairs(280)}${stairs(470)}"/>
                  </g>
                  <g class="sd-plan__part" data-part="lifts">
                    <rect x="340" y="190" width="27" height="44"/><rect x="371" y="190" width="27" height="44"/><rect x="402" y="190" width="27" height="44"/><rect x="433" y="190" width="27" height="44"/>
                    <path class="sd-plan__line" d="M340 190l27 44M367 190l-27 44M371 190l27 44M398 190l-27 44M402 190l27 44M429 190l-27 44M433 190l27 44M460 190l-27 44"/>
                  </g>
                  <g class="sd-plan__part" data-part="mep">
                    <rect x="340" y="244" width="120" height="24"/>
                    <rect class="sd-plan__fill-hatch" x="340" y="244" width="120" height="24"/>
                  </g>
                  <g class="sd-plan__part" data-part="wc">
                    <rect x="340" y="278" width="58" height="52"/><rect x="402" y="278" width="58" height="52"/>
                    <text class="sd-plan__wc" x="369" y="309">WC</text><text class="sd-plan__wc" x="431" y="309">WC</text>
                  </g>
                </g>
                <g class="sd-plan__dim" aria-hidden="true">
                  <path d="M280 352v10M520 352v10M280 357h240"/>
                </g>
                ${tx('text', { en: 'COMMON CORE', ar: 'النواة المشتركة' }, 'class="sd-plan__core-label" x="400" y="384"')}
              </svg>`;
  return `
    <!-- 04 · Flagship: Mivida Business Park B1, illustrative common-core diagram (Real Estate) -->
    <section class="section section--deep sd-flagship" id="flagship" aria-labelledby="sd-flagship-title" data-sd-core>
      <div class="container">
        <div class="grid grid--loose sd-flagship__grid">
          <div class="col-lg-5 sd-flagship__copy">
            ${tx('p', { en: 'Flagship project', ar: 'المشروع الرئيسي' }, 'class="eyebrow"')}
            ${th('h2', { en: 'Mivida Business Park, <em>B1</em>', ar: 'مجمّع ميفيدا للأعمال، <em>B1</em>' }, 'class="h2" id="sd-flagship-title" data-split')}
            ${tx('p', { en: 'Modern office spaces designed with a common core that provides essential services, ensuring maximum efficiency and flexibility for our clients.', ar: 'مساحات مكتبية حديثة مصمّمة حول نواة مشتركة توفّر الخدمات الأساسية، بما يضمن أقصى درجات الكفاءة والمرونة لعملائنا.' }, 'class="lead" data-reveal="up"')}
            <div class="sd-core" data-reveal="up">
              ${tx('h3', { en: 'Explore the common core', ar: 'استكشف النواة المشتركة' }, 'class="h6 sd-core__title"')}
              <ul class="sd-core__parts" role="list">
                ${legend}
              </ul>
              <fieldset class="sd-seg">
                ${tx('legend', { en: 'Tailor the floor', ar: 'هيّئ الطابق' }, 'class="h6 sd-seg__legend"')}
                <div class="sd-seg__opts">${tenancy}</div>
              </fieldset>
              <p class="sd-core__readout" id="sd-core-readout" aria-live="polite" data-sd-readout data-ar="مرّر المؤشر فوق المخطط أو المسه لاستكشاف النواة المشتركة.">Hover or tap the plan to explore the common core.</p>
            </div>
          </div>
          <div class="col-lg-7 sd-flagship__visual">
            <figure class="sd-planbox" data-reveal="clip">
              <div class="sd-planbox__head">
                <span class="badge badge--outline sd-planbox__badge">${ic('drafting-compass')}${tx('span', { en: 'Illustrative diagram', ar: 'رسم توضيحي' })}</span>
                ${tx('span', { en: 'Typical office floor', ar: 'طابق مكتبي نموذجي' }, 'class="sd-planbox__kicker"')}
              </div>
              ${svg}
              ${tx('figcaption', { en: 'Not to scale. An illustration of the common-core concept, not the actual floor plan of B1.', ar: 'ليس بمقياس رسم. توضيحٌ لمفهوم النواة المشتركة، وليس المخطط الفعلي للمبنى B1.' }, 'class="sd-planbox__note"')}
            </figure>
          </div>
        </div>
        <div class="sd-lease" data-reveal="up">
          <div class="sd-lease__office">
            ${tx('p', { en: 'Egypt Office', ar: 'مكتب مصر' }, 'class="label sd-lease__label"')}
            <p class="sd-lease__addr">${ic('map-pin')}${tx('span', { en: 'B1 Building, Mivida Compound, New Cairo, Egypt', ar: 'مبنى B1، كمبوند ميفيدا، القاهرة الجديدة، مصر' })}</p>
          </div>
          <div class="sd-lease__lines">
            <a class="contact-line" href="tel:+20223866591">${ic('phone')}<span dir="ltr">02-23866591</span></a>
            <a class="contact-line" href="mailto:info.egy@mobco-group.com">${ic('mail')}<span>info.egy@mobco-group.com</span></a>
          </div>
          ${btn('contact.html#inquiry', { en: 'Leasing enquiry', ar: 'استفسار عن التأجير' }, 'btn--primary', { extra: 'data-magnetic' })}
        </div>
      </div>
    </section>
`;
}

function cta(id, P, sub) {
  const actions = P.cta.actions.map(([h, l, c, i, dir]) => btn(h, l, c, { icon: i || null, dir: dir !== false })).join('\n            ');
  return `
    <!-- 06 · CTA band ======================================================== -->
    <section class="cta-band sd-cta" aria-labelledby="sd-cta-title">
      <div class="cta-band__bg sd-cta__bg">${picture(sub.hero, { alt: '', position: P.cta.bgPos, sizes: '100vw' })}</div>
      <div class="container cta-band__inner">
        <div>
          ${tx('p', P.cta.eyebrow, 'class="eyebrow"')}
          ${th('h2', P.cta.title, 'class="cta-band__title" id="sd-cta-title" data-split')}
        </div>
        <div class="cta-band__actions" data-reveal="up">
            ${actions}
        </div>
      </div>
    </section>
`;
}

function switcher(id) {
  const others = SUBSIDIARIES.filter((s) => s.id !== id);
  const cards = others.map((s, i) => {
    const href = s.page || 'subsidiaries.html#education';
    const light = !!s.logo.needsLightTile;
    const tagline = s.tagline || s.short;
    const bg = s.hero ? `<div class="sd-co__bg" aria-hidden="true">${picture(s.hero, { alt: '', thumb: true })}</div>` : '<div class="sd-co__bg sd-co__bg--pattern" aria-hidden="true"></div>';
    const logos = light
      ? `<span class="sd-co__tile"><img src="${s.logo.color}" alt="" width="${s.logo.w}" height="${s.logo.h}" loading="lazy" decoding="async"></span>`
      : `<img class="sd-co__logo sd-co__logo--navy" src="${s.logo.navy}" alt="" width="${s.logo.w}" height="${s.logo.h}" loading="lazy" decoding="async"><img class="sd-co__logo sd-co__logo--white" src="${s.logo.white}" alt="" width="${s.logo.w}" height="${s.logo.h}" loading="lazy" decoding="async">`;
    return `<li class="sd-co${light ? ' sd-co--tile' : ''}">
            <div class="sd-co__visual">${bg}<div class="sd-co__logos">${logos}</div></div>
            <div class="sd-co__body">
              <span class="sd-co__index num" aria-hidden="true">${pad(i + 1)}</span>
              ${tx('h3', s.name, 'class="sd-co__name"')}
              ${tx('p', tagline, 'class="sd-co__tagline"')}
              <a class="link-arrow sd-co__link card-link" href="${href}" aria-label="${esc(t(s.name, 'en'))}" data-ar-aria-label="${esc(t(s.name, 'ar'))}">${tx('span', S.visit)}<span class="link-arrow__icon">${arrow()}</span></a>
            </div>
          </li>`;
  }).join('\n          ');
  return `
    <!-- 07 · Other MOBCO companies ============================================ -->
    <section class="section section--sand sd-others" aria-labelledby="sd-others-title">
      <div class="container">
        <header class="section-header section-header--split">
          ${tx('p', S.group, 'class="eyebrow"')}
          ${th('h2', S.others, 'class="h2" id="sd-others-title" data-split')}
          <div class="section-header__aside">
            ${tx('p', S.othersLead, 'class="lead" data-reveal="up"')}
            ${linkArrow('subsidiaries.html', S.allSubs)}
          </div>
        </header>
        <ul class="sd-others__list" role="list" data-reveal-stagger="120">
          ${cards}
        </ul>
      </div>
    </section>
  </main>
`;
}

const FOOT = `
  <!-- @include footer -->
  <!-- /@include footer -->
</body>
</html>
`;

for (const id of ORDER) {
  const P = PAGES[id];
  const sub = getSubsidiary(id);
  let html = head(id, P, sub) + hero(id, P, sub) + about(id, P, sub) + facts(id, P);
  if (id === 'mobco-construction') html += footprint() + relatedConstruction();
  if (id === 'mobco-developments') html += showcase() + relatedDevelopments();
  if (id === 'mobco-real-estate') html += flagship();
  html += cta(id, P, sub) + switcher(id) + FOOT;
  writeFileSync(`${ROOT}/${P.file}`, html);
  console.log('wrote', P.file, html.length);
}
