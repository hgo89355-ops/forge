// assets/js/pages/careers.js: Careers page behaviours (careers.html). Owned by the careers builder.
// Core modules are singletons already initialised by core/main.js (loaded first).
//
//   1. Hero skyline      pointer parallax on the three photo towers (fine pointers, motion-safe)
//   2. Benefit panels    expanding panels (hover intent / focus / click; arrow keys), desktop only
//   3. Disciplines       chip filter + search with FLIP re-layout, live status, drawer with prev/next + "Apply"
//   4. Locations         dot/land map with office markers synced to the KSA / Egypt tabs
//   5. Hiring journey    scroll-driven progress line + active steps
//   6. Application form  routing card, live checklist, dial-code sync, experience label, CV chip,
//                        note counter, validsubmit → success panel + pre-filled mailto: to the right team
//   Deep links: careers.html?discipline=<id>&location=ksa|egypt#apply
import { t, getLang, onLang } from '../core/i18n.js';
import { scan, refresh, scrollTo, onScroll } from '../core/motion.js';
import { toast, openDrawer, closeDrawer } from '../core/ui.js';
import { $, $$, esc, icon, picture, clamp, normalize, prefersReducedMotion, hasFinePointer, isRTL, rafThrottle, getParam, debounce } from '../core/utils.js';
import { CAREERS, OFFICES } from '../data/site-data.js';
import { WORLD } from '../data/world-map.js';

const fmt = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
const pad = (n) => String(n).padStart(2, '0');
const comma = () => (getLang() === 'ar' ? '، ' : ', ');
const EASE = 'cubic-bezier(.16, 1, .3, 1)';

/* ------------------------------------------------------------------ strings */
const S = {
  statusAll: { en: '<strong>{t}</strong> disciplines', ar: '<strong>{t}</strong> تخصصات' },
  status: { en: '<strong>{n}</strong> of {t} disciplines', ar: '<strong>{n}</strong> من {t} تخصصات' },
  statusNone: { en: 'No matches', ar: 'لا توجد نتائج' },
  areas: { en: 'Areas of work', ar: 'مجالات العمل' },
  where: { en: 'Where to apply', ar: 'جهة التقديم' },
  teamKsa: { en: 'KSA careers team', ar: 'فريق التوظيف في السعودية' },
  teamEgypt: { en: 'Egypt careers team', ar: 'فريق التوظيف في مصر' },
  selectedDisc: { en: '{d} selected', ar: 'تم اختيار {d}' },
  selectedLoc: { en: '{l} selected', ar: 'تم اختيار {l}' },
  routeEmpty: { en: 'Choose a location', ar: 'اختر الموقع' },
  progress: { en: '{n} of {t} complete', ar: '{n} من {t} مكتملة' },
  mapHead: { en: 'Our hiring teams', ar: 'فرق التوظيف لدينا' },
  mapShow: { en: 'Show the {o}', ar: 'عرض {o}' },
  // success
  okTitle: { en: 'Almost there, {name}', ar: 'اقتربت من الانتهاء يا {name}' },
  okLead: { en: 'Your email app should now open with a pre-filled message to <strong>{email}</strong>.', ar: 'من المفترض أن يُفتح تطبيق البريد الآن برسالة مُعبّأة مسبقًا إلى <strong>{email}</strong>.' },
  okStep1: { en: 'Attach your CV (<strong>{file}</strong>).', ar: 'أرفق سيرتك الذاتية (<strong>{file}</strong>).' },
  okStep2: { en: 'Check the details.', ar: 'راجع البيانات.' },
  okStep3: { en: 'Press send.', ar: 'اضغط «إرسال».' },
  okOpen: { en: 'Open email again', ar: 'افتح البريد مجددًا' },
  okCopy: { en: 'Copy email address', ar: 'نسخ عنوان البريد' },
  okNew: { en: 'Start a new application', ar: 'ابدأ طلبًا جديدًا' },
  okNote: { en: 'If your email app didn’t open, send your CV to {link}.', ar: 'إذا لم يُفتح تطبيق البريد، أرسل سيرتك الذاتية إلى {link}.' },
  okSummary: { en: 'Application summary', ar: 'ملخّص الطلب' },
  // mail
  mSubject: { en: 'Job application | {disc} | {name}', ar: 'طلب توظيف | {disc} | {name}' },
  mHello: { en: 'Dear MOBCO careers team,', ar: 'فريق التوظيف في مجموعة موبكو المحترم،' },
  mIntro: { en: 'Please find my application details below. My CV is attached to this email.', ar: 'أرجو الاطلاع على بيانات طلبي أدناه، وتجدون سيرتي الذاتية مرفقة بهذه الرسالة.' },
  mName: { en: 'Name', ar: 'الاسم' },
  mEmail: { en: 'Email', ar: 'البريد الإلكتروني' },
  mPhone: { en: 'Phone', ar: 'الهاتف' },
  mLoc: { en: 'Preferred location', ar: 'الموقع المفضّل' },
  mDisc: { en: 'Discipline', ar: 'التخصص' },
  mExp: { en: 'Experience', ar: 'الخبرة' },
  mLinkedIn: { en: 'LinkedIn', ar: 'LinkedIn' },
  mCv: { en: 'CV file', ar: 'ملف السيرة الذاتية' },
  mCvAttach: { en: '{file} (attached)', ar: '{file} (مرفق)' },
  mNote: { en: 'Cover note', ar: 'الرسالة التعريفية' },
  mTrim: { en: '[Shortened. Full note available on request.]', ar: '[تم اختصار الرسالة. النص الكامل متاح عند الطلب.]' },
  mFooter: { en: 'Sent via the MOBCO Group careers page.', ar: 'أُرسلت عبر صفحة الوظائف في موقع مجموعة موبكو.' },
  mNone: { en: 'Not provided', ar: 'غير متوفر' },
};

const LOC = {
  ksa: { name: { en: 'Saudi Arabia (Riyadh)', ar: 'المملكة العربية السعودية (الرياض)' }, team: S.teamKsa, city: { en: 'Riyadh', ar: 'الرياض' }, dial: '+966' },
  egypt: { name: { en: 'Egypt (Cairo)', ar: 'مصر (القاهرة)' }, team: S.teamEgypt, city: { en: 'Cairo', ar: 'القاهرة' }, dial: '+20' },
};
const careersEmail = (loc) => CAREERS.find((c) => c.id === loc)?.email || '';

const CATS = {
  technical: { en: 'Technical', ar: 'التخصصات الفنية' },
  management: { en: 'Management', ar: 'الإدارة' },
  commercial: { en: 'Commercial', ar: 'الشؤون التجارية' },
  corporate: { en: 'Corporate', ar: 'الوظائف المؤسسية' },
};

/* ------------------------------------------------------------------ disciplines (generic, not vacancies) */
const DISCIPLINES = [
  {
    id: 'engineering', cat: 'technical', icon: 'drafting-compass', image: 'campus', pos: '50% 40%',
    title: { en: 'Engineering', ar: 'الهندسة' },
    tags: [{ en: 'Civil', ar: 'مدنية' }, { en: 'Structural', ar: 'إنشائية' }, { en: 'MEP', ar: 'كهروميكانيكية' }],
    long: {
      en: 'Civil, structural and MEP engineers plan construction methods, coordinate drawings and trades, and supervise the works so every element is built safely and to specification.',
      ar: 'يخطّط المهندسون المدنيون والإنشائيون والكهروميكانيكيون أساليب التنفيذ، وينسّقون المخططات والأعمال، ويشرفون على التنفيذ ليُنجز كل عنصر بأمان ووفق المواصفات.',
    },
    focus: [
      { en: 'Structural & civil works', ar: 'الأعمال الإنشائية والمدنية' },
      { en: 'MEP coordination', ar: 'تنسيق الأعمال الكهروميكانيكية' },
      { en: 'Design coordination & value engineering', ar: 'تنسيق التصاميم والهندسة القيمية' },
      { en: 'Testing, commissioning & handover', ar: 'الاختبار والتشغيل والتسليم' },
    ],
  },
  {
    id: 'project-management', cat: 'management', icon: 'gauge', image: 'aerial-compound', pos: '45% 60%',
    title: { en: 'Project management & controls', ar: 'إدارة المشاريع وضبطها' },
    tags: [{ en: 'Planning', ar: 'التخطيط' }, { en: 'Scheduling', ar: 'الجدولة' }, { en: 'Cost control', ar: 'ضبط التكاليف' }],
    long: {
      en: 'Project teams lead delivery through to handover. Planning and controls specialists track programme, cost and risk so decisions are made early.',
      ar: 'تقود فرق المشاريع التنفيذ حتى التسليم، ويتابع متخصصو التخطيط وضبط المشاريع البرامج الزمنية والتكاليف والمخاطر لتُتّخذ القرارات مبكرًا.',
    },
    focus: [
      { en: 'Project management & controls', ar: 'إدارة المشاريع وضبطها' },
      { en: 'Pre-construction planning', ar: 'التخطيط لمرحلة ما قبل التنفيذ' },
      { en: 'Cost planning & scheduling', ar: 'تخطيط التكاليف والجدولة الزمنية' },
      { en: 'Contract & risk management', ar: 'إدارة العقود والمخاطر' },
    ],
  },
  {
    id: 'quantity-surveying', cat: 'commercial', icon: 'chart-bar', image: 'eastmain', pos: '60% 45%',
    title: { en: 'Quantity surveying & commercial', ar: 'حصر الكميات والشؤون التجارية' },
    tags: [{ en: 'Cost', ar: 'التكاليف' }, { en: 'Contracts', ar: 'العقود' }, { en: 'Valuations', ar: 'التقييمات' }],
    long: {
      en: 'Commercial teams estimate, measure and value the works, manage variations and subcontract accounts, and keep project leaders clear on cost through to the final account.',
      ar: 'تتولّى الفرق التجارية تقدير الأعمال وحصرها وتقييمها، وإدارة الأوامر التغييرية وحسابات مقاولي الباطن، وتُطلع قادة المشاريع على التكاليف حتى الحساب الختامي.',
    },
    focus: [
      { en: 'Estimating & tendering', ar: 'التقدير وإعداد المناقصات' },
      { en: 'Measurement & valuations', ar: 'حصر الأعمال والتقييمات' },
      { en: 'Variations & final accounts', ar: 'الأوامر التغييرية والحسابات الختامية' },
      { en: 'Contract & risk management', ar: 'إدارة العقود والمخاطر' },
    ],
  },
  {
    id: 'hse', cat: 'technical', icon: 'shield-check', image: 'victoria-101', pos: '50% 60%',
    title: { en: 'Health, safety & environment', ar: 'الصحة والسلامة والبيئة' },
    tags: [{ en: 'HSE', ar: 'السلامة' }, { en: 'Quality', ar: 'الجودة' }, { en: 'Environment', ar: 'البيئة' }],
    long: {
      en: 'Safety is one of our core values. HSE professionals plan safe ways of working, run inductions and inspections, and work with site teams to protect our people, partners and the public.',
      ar: 'السلامة إحدى قيمنا الجوهرية. يخطّط متخصصو الصحة والسلامة والبيئة أساليب عمل آمنة، ويديرون برامج التعريف والتفتيش، ويعملون مع فرق المواقع لحماية أفرادنا وشركائنا والمجتمع.',
    },
    focus: [
      { en: 'Quality, health, safety & environment', ar: 'الجودة والصحة والسلامة والبيئة' },
      { en: 'Site inspections & audits', ar: 'التفتيش والتدقيق في المواقع' },
      { en: 'Inductions & safety training', ar: 'برامج التعريف والتدريب على السلامة' },
      { en: 'Environmental management', ar: 'الإدارة البيئية' },
    ],
  },
  {
    id: 'design-bim', cat: 'technical', icon: 'layers', image: 'campus', pos: '20% 85%',
    title: { en: 'Design & BIM', ar: 'التصميم ونمذجة معلومات البناء' },
    tags: [{ en: 'Architecture', ar: 'العمارة' }, { en: 'BIM', ar: 'BIM' }, { en: 'Coordination', ar: 'التنسيق' }],
    long: {
      en: 'Design and BIM teams coordinate drawings and models across disciplines and resolve clashes early, so sites build from clear, reliable information.',
      ar: 'تنسّق فرق التصميم ونمذجة معلومات البناء (BIM) المخططات والنماذج بين التخصصات وتعالج التعارضات مبكرًا، لتعمل المواقع وفق معلومات واضحة وموثوقة.',
    },
    focus: [
      { en: 'Design coordination & value engineering', ar: 'تنسيق التصاميم والهندسة القيمية' },
      { en: 'BIM modelling & clash detection', ar: 'النمذجة وكشف التعارضات' },
      { en: 'Shop drawings', ar: 'المخططات التنفيذية' },
      { en: 'Document control', ar: 'ضبط الوثائق' },
    ],
  },
  {
    id: 'procurement', cat: 'commercial', icon: 'boxes', image: 'aerial-compound-portrait', pos: '50% 40%',
    title: { en: 'Procurement', ar: 'المشتريات' },
    tags: [{ en: 'Sourcing', ar: 'التوريد' }, { en: 'Suppliers', ar: 'الموردون' }, { en: 'Logistics', ar: 'الخدمات اللوجستية' }],
    long: {
      en: 'Procurement teams source and evaluate suppliers and subcontractors and coordinate logistics, so materials reach site when the programme needs them.',
      ar: 'تستقطب فرق المشتريات الموردين ومقاولي الباطن وتقيّمهم، وتنسّق الخدمات اللوجستية لتصل المواد إلى الموقع في الوقت الذي يتطلّبه البرنامج الزمني.',
    },
    focus: [
      { en: 'Procurement strategy', ar: 'استراتيجية المشتريات' },
      { en: 'Supplier & subcontractor sourcing', ar: 'استقطاب الموردين ومقاولي الباطن' },
      { en: 'Logistics coordination', ar: 'تنسيق الخدمات اللوجستية' },
      { en: 'Contract & risk management', ar: 'إدارة العقود والمخاطر' },
    ],
  },
  {
    id: 'facility-management', cat: 'management', icon: 'wrench', image: 'aerial-compound', pos: '85% 35%',
    title: { en: 'Facility management', ar: 'إدارة المرافق' },
    tags: [{ en: 'Operations', ar: 'التشغيل' }, { en: 'Maintenance', ar: 'الصيانة' }, { en: 'Services', ar: 'الخدمات' }],
    long: {
      en: 'Operations and maintenance teams look after buildings, systems and services, so the communities and facilities we deliver keep performing for years.',
      ar: 'تعتني فرق التشغيل والصيانة بالمباني والأنظمة والخدمات، لتواصل المجتمعات والمنشآت التي ننفّذها أداءها لسنوات.',
    },
    focus: [
      { en: 'Facility management', ar: 'إدارة المرافق' },
      { en: 'Planned & reactive maintenance', ar: 'الصيانة الدورية والطارئة' },
      { en: 'Building systems operation', ar: 'تشغيل أنظمة المباني' },
      { en: 'Testing, commissioning & handover', ar: 'الاختبار والتشغيل والتسليم' },
    ],
  },
  {
    id: 'corporate', cat: 'corporate', icon: 'briefcase', image: 'ksa-landmark', pos: '50% 35%',
    title: { en: 'Corporate functions', ar: 'الوظائف المؤسسية' },
    tags: [{ en: 'Finance', ar: 'المالية' }, { en: 'HR', ar: 'الموارد البشرية' }, { en: 'Legal', ar: 'الشؤون القانونية' }, { en: 'IT', ar: 'تقنية المعلومات' }],
    long: {
      en: 'Finance, HR, legal, IT, business development and administration teams provide the systems and support our projects depend on.',
      ar: 'توفّر فرق المالية والموارد البشرية والشؤون القانونية وتقنية المعلومات وتطوير الأعمال والإدارة الأنظمة والدعم اللذين تعتمد عليهما مشاريعنا.',
    },
    focus: [
      { en: 'Finance & accounting', ar: 'المالية والمحاسبة' },
      { en: 'Human resources', ar: 'الموارد البشرية' },
      { en: 'Legal & contracts', ar: 'الشؤون القانونية والعقود' },
      { en: 'IT & digital systems', ar: 'تقنية المعلومات والأنظمة الرقمية' },
    ],
  },
];
const getDisc = (id) => DISCIPLINES.find((d) => d.id === id);
const OTHER_DISC = { en: 'Other', ar: 'أخرى' };
const discLabel = (id) => (id === 'other' ? t(OTHER_DISC) : t(getDisc(id)?.title || ''));

/* ==================================================================
   1. Hero skyline: pointer parallax
   ================================================================== */
function initHero() {
  const hero = $('.careers-hero');
  const towers = $$('.careers-tower__inner', hero || document);
  if (!hero || !towers.length || prefersReducedMotion() || !hasFinePointer()) return;
  const depth = [10, 22, 15];
  const move = rafThrottle((e) => {
    const r = hero.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
    towers.forEach((el, i) => {
      el.style.setProperty('--tx', `${(-nx * depth[i]).toFixed(1)}px`);
      el.style.setProperty('--ty', `${(-ny * depth[i] * 0.6).toFixed(1)}px`);
    });
  });
  hero.addEventListener('pointermove', move);
  hero.addEventListener('pointerleave', () => towers.forEach((el) => { el.style.setProperty('--tx', '0px'); el.style.setProperty('--ty', '0px'); }));
}

/* ==================================================================
   2. Benefit panels
   ================================================================== */
function initBenefits() {
  const root = $('[data-benefits]');
  if (!root) return;
  const items = $$('[data-benefit]', root);
  const triggers = items.map((it) => $('.careers-benefit__trigger', it));
  const mq = matchMedia('(min-width: 1200px)'); // keep in sync with careers.css (expanding panels)
  let active = Math.max(0, items.findIndex((it) => it.classList.contains('is-active')));
  let intent;
  const apply = () => {
    items.forEach((it, i) => {
      const on = i === active;
      it.classList.toggle('is-active', on);
      triggers[i].setAttribute('aria-expanded', String(mq.matches ? on : true));
    });
  };
  const activate = (i) => { if (i === active) return; active = i; apply(); };
  items.forEach((it, i) => {
    triggers[i].addEventListener('click', () => activate(i));
    triggers[i].addEventListener('focus', () => { if (mq.matches) activate(i); });
    it.addEventListener('pointerenter', (e) => {
      if (!mq.matches || e.pointerType !== 'mouse') return;
      clearTimeout(intent);
      intent = setTimeout(() => activate(i), 140);
    });
    it.addEventListener('pointerleave', () => clearTimeout(intent));
    it.addEventListener('pointermove', rafThrottle((e) => {
      const r = it.getBoundingClientRect();
      it.style.setProperty('--mx', `${Math.round(e.clientX - r.left)}px`);
      it.style.setProperty('--my', `${Math.round(e.clientY - r.top)}px`);
    }));
  });
  root.addEventListener('keydown', (e) => {
    if (!mq.matches) return;
    const i = triggers.indexOf(document.activeElement);
    if (i < 0) return;
    const fwd = isRTL() ? 'ArrowLeft' : 'ArrowRight';
    const back = isRTL() ? 'ArrowRight' : 'ArrowLeft';
    let n = null;
    if (e.key === fwd) n = (i + 1) % items.length;
    else if (e.key === back) n = (i - 1 + items.length) % items.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = items.length - 1;
    if (n === null) return;
    e.preventDefault();
    triggers[n].focus();
  });
  mq.addEventListener?.('change', apply);
  apply();
}

/* ==================================================================
   3. Disciplines: filter + search + drawer
   ================================================================== */
const discState = { cat: 'all', q: '' };
let ddIndex = 0;

function initDisciplines() {
  const grid = $('[data-disc-grid]');
  if (!grid) return;
  const tiles = $$('.careers-disc', grid);
  const status = $('[data-disc-status]');
  const empty = $('[data-disc-empty]');
  const chips = $('[data-disc-filter]');
  const search = $('#disc-search');

  const matches = (tile, cat, q) => {
    if (cat !== 'all' && tile.dataset.cat !== cat) return false;
    if (!q) return true;
    const hay = normalize(`${tile.dataset.keywords} ${tile.textContent}`);
    return q.split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
  };
  const renderStatus = (shown) => {
    const total = tiles.length;
    if (!shown) status.textContent = t(S.statusNone);
    else status.innerHTML = fmt(t(shown === total ? S.statusAll : S.status), { n: shown, t: total });
  };
  const renderCounts = (q) => {
    $$('.chip', chips).forEach((chip) => {
      const cat = chip.dataset.value;
      const n = tiles.filter((tile) => matches(tile, cat, q)).length;
      const c = $('.chip__count', chip);
      if (c) c.textContent = n;
    });
  };

  const apply = ({ animate = true } = {}) => {
    const q = normalize(discState.q);
    const before = new Map();
    const canAnimate = animate && !prefersReducedMotion() && typeof Element.prototype.animate === 'function';
    if (canAnimate) tiles.forEach((tile) => { if (!tile.hidden) before.set(tile, tile.getBoundingClientRect()); });
    let shown = 0;
    tiles.forEach((tile) => {
      const ok = matches(tile, discState.cat, q);
      tile.hidden = !ok;
      if (ok) shown++;
    });
    empty.hidden = shown > 0;
    renderStatus(shown);
    renderCounts(q);
    if (canAnimate) {
      tiles.forEach((tile) => {
        if (tile.hidden) return;
        const last = tile.getBoundingClientRect();
        const first = before.get(tile);
        tile.getAnimations?.().forEach((a) => a.cancel());
        if (first) {
          const dx = first.left - last.left;
          const dy = first.top - last.top;
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            tile.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 640, easing: EASE });
          }
        } else {
          tile.animate([{ opacity: 0, transform: 'translateY(16px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: EASE, delay: 60 });
        }
      });
    }
    refresh();
  };

  chips?.addEventListener('chipchange', (e) => {
    discState.cat = e.detail.values[0] || 'all';
    apply();
  });
  search?.addEventListener('input', debounce(() => { discState.q = search.value; apply(); }, 120));
  search?.addEventListener('keydown', (e) => { if (e.key === 'Escape' && search.value) { e.stopPropagation(); search.value = ''; discState.q = ''; apply(); } });
  $('[data-disc-reset]')?.addEventListener('click', () => {
    discState.cat = 'all';
    discState.q = '';
    if (search) search.value = '';
    $$('.chip', chips).forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.value === 'all')));
    apply();
    $('.chip[data-value="all"]', chips)?.focus();
  });

  // open drawer
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.careers-disc__btn');
    if (!btn) return;
    const id = btn.closest('.careers-disc')?.dataset.discipline;
    const i = DISCIPLINES.findIndex((d) => d.id === id);
    if (i < 0) return;
    ddIndex = i;
    renderDrawer();
    openDrawer('discipline-drawer', btn);
    const body = $('#discipline-drawer [data-dd-body]');
    if (body) body.scrollTop = 0; // the panel keeps its scroll offset between openings
  });

  apply({ animate: false });
  onLang(() => apply({ animate: false }));
}

function renderDrawer(swap = false) {
  const drawer = $('#discipline-drawer');
  if (!drawer) return;
  const d = DISCIPLINES[ddIndex];
  const body = $('[data-dd-body]', drawer);
  $('[data-dd-count]', drawer).textContent = `${pad(ddIndex + 1)} / ${pad(DISCIPLINES.length)}`;
  const teams = [['ksa', S.teamKsa], ['egypt', S.teamEgypt]];
  body.innerHTML = `
    <div class="careers-drawer__hero">
      <div class="media careers-drawer__media">${picture(d.image, { position: d.pos, loading: 'eager' })}</div>
      <span class="icon-tile icon-tile--lg" aria-hidden="true">${icon(d.icon)}</span>
    </div>
    <div class="careers-drawer__content">
      <p class="eyebrow">${esc(t(CATS[d.cat]))}</p>
      <h2 class="h3" id="dd-title">${esc(t(d.title))}</h2>
      <div class="careers-drawer__tags">${d.tags.map((tag) => `<span class="badge badge--outline">${esc(t(tag))}</span>`).join('')}</div>
      <p class="careers-drawer__lead">${esc(t(d.long))}</p>
      <div class="careers-drawer__section">
        <p class="label muted">${esc(t(S.areas))}</p>
        <ul class="careers-drawer__list" role="list">${d.focus.map((f) => `<li>${icon('check', 'icon--sm')}<span>${esc(t(f))}</span></li>`).join('')}</ul>
      </div>
      <div class="careers-drawer__section">
        <p class="label muted">${esc(t(S.where))}</p>
        <div class="careers-drawer__teams">${teams.map(([id, label]) => `<p class="careers-drawer__team"><span>${esc(t(label))}</span><a href="mailto:${careersEmail(id)}" dir="ltr">${careersEmail(id)}</a></p>`).join('')}</div>
      </div>
    </div>`;
  // prev/next swaps the content in place: announce the new discipline to screen readers
  const live = $('[data-dd-live]', drawer);
  if (live) live.textContent = swap ? `${t(d.title)}${comma()}${ddIndex + 1} / ${DISCIPLINES.length}` : '';
  if (swap && !prefersReducedMotion()) {
    body.classList.remove('is-swapping');
    void body.offsetWidth;
    body.classList.add('is-swapping');
    body.scrollTop = 0;
  }
}

function initDrawer() {
  const drawer = $('#discipline-drawer');
  if (!drawer) return;
  const go = (delta) => {
    ddIndex = (ddIndex + delta + DISCIPLINES.length) % DISCIPLINES.length;
    renderDrawer(true);
  };
  $('[data-dd-prev]', drawer)?.addEventListener('click', () => go(-1));
  $('[data-dd-next]', drawer)?.addEventListener('click', () => go(1));
  drawer.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select')) return;
    const fwd = isRTL() ? 'ArrowLeft' : 'ArrowRight';
    const back = isRTL() ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === fwd) { e.preventDefault(); go(1); }
    else if (e.key === back) { e.preventDefault(); go(-1); }
  });
  $('[data-dd-apply]', drawer)?.addEventListener('click', () => {
    const id = DISCIPLINES[ddIndex].id;
    closeDrawer(drawer);
    preselectDiscipline(id, { scroll: true, announce: true });
  });
  onLang(() => { if (!drawer.hidden) renderDrawer(); });
}

/* ==================================================================
   4. Locations: map + tabs
   ================================================================== */
const VB = { x: 518, y: 104, w: 176, h: 136 };
let mapApi = null;

function initLocations() {
  const mapEl = $('[data-careers-map]');
  const tabs = $('[data-loc-tabs]');
  if (mapEl) mapApi = buildMap(mapEl, (id) => tabs?.__selectTab?.(id));
  tabs?.addEventListener('tabchange', (e) => mapApi?.setActive(e.detail.id));
  $$('[data-apply-location]').forEach((btn) => btn.addEventListener('click', () => {
    preselectLocation(btn.getAttribute('data-apply-location'), { scroll: true, announce: true });
  }));
}

function buildMap(root, onPick) {
  const inView = (x, y, m = 8) => x > VB.x - m && x < VB.x + VB.w + m && y > VB.y - m && y < VB.y + VB.h + m;
  const dots = WORLD.dots.filter(([x, y]) => inView(x, y));
  const ksa = WORLD.offices.ksa.xy;
  const egy = WORLD.offices.egypt.xy;
  const midX = (ksa[0] + egy[0]) / 2;
  const midY = Math.min(ksa[1], egy[1]) - 16;
  const svg = `
    <svg class="careers-map__svg" viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <path d="${WORLD.land}" fill="rgba(255,255,255,.045)"/>
      <path d="${WORLD.borders}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width=".25"/>
      <path class="careers-map__country" data-country="ksa" d="${WORLD.highlight.ksa}" fill="rgba(95, 178, 184,.08)" stroke="rgba(95, 178, 184,.45)" stroke-width=".3"/>
      <path class="careers-map__country" data-country="egypt" d="${WORLD.highlight.egypt}" fill="rgba(95, 178, 184,.08)" stroke="rgba(95, 178, 184,.45)" stroke-width=".3"/>
      <g>${dots.map(([x, y, k]) => `<circle class="careers-map__dot${k === 'ksa' || k === 'egypt' ? ' is-country' : ''}" data-k="${k || ''}" cx="${x}" cy="${y}" r="${k ? 1.05 : 0.7}"/>`).join('')}</g>
      <path class="careers-map__arc" d="M${egy[0]},${egy[1]} Q${midX},${midY} ${ksa[0]},${ksa[1]}" data-draw/>
    </svg>`;
  root.insertAdjacentHTML('afterbegin', svg);
  const head = document.createElement('div');
  head.className = 'careers-map__head';
  root.appendChild(head);
  const layer = document.createElement('div');
  layer.className = 'careers-map__layer';
  root.appendChild(layer);
  const coords = document.createElement('p');
  coords.className = 'careers-map__coords';
  coords.setAttribute('aria-hidden', 'true');
  root.appendChild(coords);
  const svgEl = $('svg', root);
  let active = 'ksa';

  const markers = ['egypt', 'ksa'].map((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `careers-map__marker${id === 'egypt' ? ' careers-map__marker--flip' : ''}`;
    b.dataset.office = id;
    b.addEventListener('click', () => { onPick(id); setActive(id); });
    layer.appendChild(b);
    return b;
  });

  function render() {
    head.innerHTML = `<p class="eyebrow">${esc(t(S.mapHead))}</p>`;
    markers.forEach((b) => {
      const o = OFFICES.find((x) => x.id === b.dataset.office);
      b.innerHTML = `<span class="careers-map__pin" aria-hidden="true"></span><span class="careers-map__tag"><span class="careers-map__city">${esc(t(LOC[o.id].city))}</span><span class="careers-map__role">${esc(t(o.label))}</span></span>`;
      b.setAttribute('aria-label', fmt(t(S.mapShow), { o: t(o.name) }));
      b.setAttribute('aria-pressed', String(b.dataset.office === active));
    });
    const geo = OFFICES.find((x) => x.id === active)?.geo;
    if (geo) coords.innerHTML = `<span dir="ltr">≈ ${Math.abs(geo.lat).toFixed(2)}°${geo.lat >= 0 ? 'N' : 'S'} · ${Math.abs(geo.lon).toFixed(2)}°${geo.lon >= 0 ? 'E' : 'W'}</span>`;
  }
  function place() {
    const ctm = svgEl.getScreenCTM();
    if (!ctm) return;
    const rr = root.getBoundingClientRect();
    markers.forEach((b) => {
      const [x, y] = WORLD.offices[b.dataset.office].xy;
      const pt = svgEl.createSVGPoint();
      pt.x = x; pt.y = y;
      const p = pt.matrixTransform(ctm);
      b.style.setProperty('--x', `${(p.x - rr.left).toFixed(1)}px`);
      b.style.setProperty('--y', `${(p.y - rr.top).toFixed(1)}px`);
    });
    // keep each office tag inside the frame on narrow maps (the pin stays on the city; only the tag slides)
    const m = 12;
    markers.forEach((b) => {
      const tag = $('.careers-map__tag', b);
      if (!tag) return;
      tag.style.setProperty('--nudge', '0px');
      const tr = tag.getBoundingClientRect();
      let dx = 0;
      if (tr.left < rr.left + m) dx = rr.left + m - tr.left;
      else if (tr.right > rr.right - m) dx = rr.right - m - tr.right;
      tag.style.setProperty('--nudge', `${dx.toFixed(1)}px`);
    });
  }
  function setActive(id) {
    active = id;
    markers.forEach((b) => {
      const on = b.dataset.office === id;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    $$('.careers-map__dot', svgEl).forEach((d) => d.classList.toggle('is-active', d.dataset.k === id));
    $$('.careers-map__country', svgEl).forEach((c) => c.setAttribute('fill', c.dataset.country === id ? 'rgba(95, 178, 184,.2)' : 'rgba(95, 178, 184,.06)'));
    render();
  }
  render();
  setActive(active);
  requestAnimationFrame(place);
  new ResizeObserver(() => place()).observe(root);
  document.fonts?.ready?.then(() => requestAnimationFrame(place));
  onLang(() => { render(); requestAnimationFrame(place); });
  scan(root);
  return { setActive };
}

/* ==================================================================
   5. Hiring journey: progress driven by scroll
   ================================================================== */
function initJourney() {
  const list = $('[data-journey]');
  if (!list) return;
  const steps = $$('[data-step]', list);
  const mq = matchMedia('(min-width: 1024px)');
  const setState = (p, activeCount) => {
    list.style.setProperty('--progress', p.toFixed(3));
    steps.forEach((s, i) => {
      s.classList.toggle('is-active', i < activeCount);
      s.classList.toggle('is-current', i === activeCount - 1);
    });
  };
  if (prefersReducedMotion()) { setState(1, steps.length); return; }
  const update = () => {
    const vh = window.innerHeight;
    if (mq.matches) {
      const r = list.getBoundingClientRect();
      const p = clamp((vh * 0.82 - r.top) / (vh * 0.42), 0, 1);
      const n = steps.length - 1;
      setState(p, p <= 0.001 ? 0 : Math.min(steps.length, Math.floor(p * n + 0.001) + 1));
    } else {
      const nodes = steps.map((s) => $('.careers-step__node', s).getBoundingClientRect());
      const y0 = nodes[0].top + nodes[0].height / 2;
      const y1 = nodes[nodes.length - 1].top + nodes[nodes.length - 1].height / 2;
      const line = vh * 0.7;
      const p = clamp((line - y0) / Math.max(1, y1 - y0), 0, 1);
      const count = nodes.filter((r) => r.top + r.height / 2 <= line).length;
      setState(p, count);
    }
  };
  onScroll(rafThrottle(update));
  window.addEventListener('resize', rafThrottle(update));
  update();
}

/* ==================================================================
   6. Application form
   ================================================================== */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const STAGES = [
  { max: 2, label: { en: 'Early career', ar: 'بداية المسيرة المهنية' } },
  { max: 7, label: { en: 'Experienced', ar: 'ذو خبرة' } },
  { max: 14, label: { en: 'Senior', ar: 'خبرة متقدّمة' } },
  { max: 99, label: { en: 'Leadership', ar: 'مستوى قيادي' } },
];
function formatExp(v, lang = getLang()) {
  const n = Number(v);
  const max = n >= 30;
  if (lang === 'ar') {
    if (n === 0) return 'أقل من سنة';
    if (n === 1) return 'سنة واحدة';
    if (n === 2) return 'سنتان';
    if (max) return '\u206630+\u2069 سنة';
    if (n <= 10) return `${n} سنوات`;
    return `${n} سنة`;
  }
  if (n === 0) return 'Less than 1 year';
  if (n === 1) return '1 year';
  return `${max ? '30+' : n} years`;
}
const stageOf = (v) => STAGES.find((s) => Number(v) <= s.max).label;

let form, lastSubmission = null, dialTouched = false;

function preselectDiscipline(id, { scroll = false, announce = false } = {}) {
  const sel = $('#ap-discipline');
  if (!sel || !$(`option[value="${CSS.escape(id)}"]`, sel)) return;
  sel.value = id;
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  if (announce) toast(fmt(t(S.selectedDisc), { d: discLabel(id) }), { type: 'info', duration: 3200 });
  if (scroll) focusAfterScroll(sel, $('[data-disc-field]'));
}
function preselectLocation(id, { scroll = false, announce = false } = {}) {
  const radio = $(`input[name="location"][value="${CSS.escape(id)}"]`);
  if (!radio) return;
  radio.checked = true;
  radio.dispatchEvent(new Event('change', { bubbles: true }));
  if (announce) toast(fmt(t(S.selectedLoc), { l: t(LOC[id].name) }), { type: 'info', duration: 3200 });
  if (scroll) focusAfterScroll(radio);
}
function focusAfterScroll(el, highlight) {
  const success = $('[data-apply-success]');
  if (success && !success.hidden) showForm();
  scrollTo('#apply');
  setTimeout(() => {
    el.focus({ preventScroll: true });
    if (highlight) { highlight.classList.remove('is-highlight'); void highlight.offsetWidth; highlight.classList.add('is-highlight'); }
  }, prefersReducedMotion() ? 50 : 1000);
}

function initForm() {
  form = $('[data-apply-form]');
  if (!form) return;
  const el = form.elements;
  const dial = el.dialCode;
  const range = el.experience;
  const out = $('[data-exp-out]', form);
  const stage = $('[data-exp-stage]', form);
  const note = el.note;
  const noteCount = $('[data-note-count]', form);
  const routeEmail = $('[data-route-email]');
  const routeOffice = $('[data-route-office]');
  const progText = $('[data-progress-text]');
  const progBar = $('[data-progress-bar]');
  const checklist = $('[data-checklist]');
  const dz = $('.dropzone', form);

  const renderExp = () => {
    const txt = formatExp(range.value);
    out.textContent = txt;
    range.setAttribute('aria-valuetext', `${txt}${comma()}${t(stageOf(range.value))}`);
    stage.textContent = t(stageOf(range.value));
  };
  const renderRoute = (flash = false) => {
    const loc = el.location.value;
    if (!loc) {
      routeEmail.textContent = t(S.routeEmpty);
      routeEmail.classList.add('is-empty');
      routeOffice.textContent = '';
      routeOffice.hidden = true;
      return;
    }
    routeEmail.textContent = careersEmail(loc);
    routeEmail.classList.remove('is-empty');
    routeOffice.hidden = false;
    routeOffice.textContent = `${t(LOC[loc].team)} · ${t(LOC[loc].city)}`;
    if (flash && !prefersReducedMotion()) { routeEmail.classList.remove('is-flash'); void routeEmail.offsetWidth; routeEmail.classList.add('is-flash'); }
  };
  const checks = () => ({
    name: el.name.value.trim().length >= 2,
    email: EMAIL_RE.test(el.email.value.trim()),
    phone: (() => { const d = el.phone.value.replace(/\D/g, ''); return d.length >= 7 && d.length <= 15; })(),
    location: !!el.location.value,
    discipline: !!el.discipline.value,
    cv: !!el.cv.files?.length,
    consent: el.consent.checked,
  });
  const renderProgress = () => {
    const c = checks();
    const keys = Object.keys(c);
    const done = keys.filter((k) => c[k]).length;
    keys.forEach((k) => $(`[data-check="${k}"]`, checklist)?.classList.toggle('is-done', c[k]));
    progText.textContent = fmt(t(S.progress), { n: done, t: keys.length });
    progBar.style.setProperty('--p', (done / keys.length).toFixed(3));
  };
  const renderCount = () => {
    const n = note.value.length;
    noteCount.textContent = n;
    noteCount.closest('.careers-count')?.classList.toggle('is-near', n > 1350);
  };

  range.addEventListener('input', renderExp);
  note.addEventListener('input', renderCount);
  // programmatic .value changes never fire 'change', so any change here comes from the visitor
  dial.addEventListener('change', () => { dialTouched = true; });
  form.addEventListener('input', renderProgress);
  form.addEventListener('change', (e) => {
    if (e.target.name === 'location') {
      renderRoute(true);
      const d = LOC[e.target.value]?.dial;
      if (d && !dialTouched) dial.value = d;
    }
    if (e.target.name === 'cv') dz?.classList.toggle('has-file', !!e.target.files?.length);
    renderProgress();
  });
  form.addEventListener('reset', () => {
    dialTouched = false;
    setTimeout(() => { renderExp(); renderCount(); renderRoute(); renderProgress(); dz?.classList.remove('has-file'); });
  });
  form.addEventListener('validsubmit', (e) => {
    e.preventDefault();
    const sub = collect();
    lastSubmission = sub;
    renderSuccess();
    showSuccess();
    launchMail(sub);
  });

  onLang(() => { renderExp(); renderRoute(); renderProgress(); if (lastSubmission && !$('[data-apply-success]').hidden) renderSuccess(); });
  renderExp();
  renderCount();
  renderRoute();
  renderProgress();
}

function collect() {
  const el = form.elements;
  const dial = el.dialCode.value;
  const phone = el.phone.value.trim();
  return {
    name: el.name.value.trim(),
    email: el.email.value.trim(),
    phone: dial === 'other' ? phone : `${dial} ${phone.replace(/^0+/, '')}`,
    location: el.location.value,
    discipline: el.discipline.value,
    experience: el.experience.value,
    linkedin: el.linkedin.value.trim(),
    cv: el.cv.files?.[0]?.name || '',
    note: el.note.value.trim(),
  };
}

function mailtoFor(sub, lang = getLang()) {
  const L = (o) => t(o, lang);
  const disc = sub.discipline === 'other' ? t(OTHER_DISC, lang) : t(getDisc(sub.discipline)?.title, lang);
  let note = sub.note;
  if (note.length > 700) note = `${note.slice(0, 700).trim()} ${L(S.mTrim)}`;
  const lines = [
    L(S.mHello), '', L(S.mIntro), '',
    `${L(S.mName)}: ${sub.name}`,
    `${L(S.mEmail)}: ${sub.email}`,
    `${L(S.mPhone)}: ${sub.phone}`,
    `${L(S.mLoc)}: ${t(LOC[sub.location].name, lang)}`,
    `${L(S.mDisc)}: ${disc}`,
    `${L(S.mExp)}: ${formatExp(sub.experience, lang)}`,
    `${L(S.mLinkedIn)}: ${sub.linkedin || L(S.mNone)}`,
    `${L(S.mCv)}: ${fmt(L(S.mCvAttach), { file: sub.cv })}`,
  ];
  if (note) lines.push('', `${L(S.mNote)}:`, note);
  lines.push('', L(S.mFooter));
  const subject = fmt(L(S.mSubject), { disc, name: sub.name });
  return `mailto:${careersEmail(sub.location)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\r\n'))}`;
}

function launchMail(sub) {
  // Opens the visitor's email client (user-initiated: runs inside the submit handler).
  try { window.location.href = mailtoFor(sub); } catch { /* the success panel offers a manual link */ }
}

function renderSuccess() {
  const box = $('[data-apply-success]');
  const sub = lastSubmission;
  if (!box || !sub) return;
  const email = careersEmail(sub.location);
  const first = sub.name.split(/\s+/)[0];
  const disc = discLabel(sub.discipline);
  const rows = [
    [S.mLoc, t(LOC[sub.location].name)],
    [S.mDisc, disc],
    [S.mExp, formatExp(sub.experience)],
    [S.mCv, sub.cv],
  ];
  box.innerHTML = `
    <span class="careers-success__icon" aria-hidden="true">${icon('send')}</span>
    <h3 class="h3 careers-success__title">${esc(fmt(t(S.okTitle), { name: first }))}</h3>
    <p class="careers-success__lead">${fmt(t(S.okLead), { email: `<span dir="ltr">${esc(email)}</span>` })}</p>
    <ol class="careers-success__steps" role="list">
      <li><span>${fmt(t(S.okStep1), { file: `<span dir="ltr">${esc(sub.cv)}</span>` })}</span></li>
      <li><span>${esc(t(S.okStep2))}</span></li>
      <li><span>${esc(t(S.okStep3))}</span></li>
    </ol>
    <dl class="careers-success__summary" aria-label="${esc(t(S.okSummary))}">
      ${rows.map(([k, v]) => `<dt>${esc(t(k))}</dt><dd>${esc(v)}</dd>`).join('')}
    </dl>
    <div class="careers-success__actions">
      <a class="btn btn--dark" href="${esc(mailtoFor(sub))}"><span>${esc(t(S.okOpen))}</span>${icon('mail')}</a>
      <button class="btn btn--ghost" type="button" data-copy="${esc(email)}"><span>${esc(t(S.okCopy))}</span>${icon('copy')}</button>
      <button class="btn btn--ghost" type="button" data-apply-new><span>${esc(t(S.okNew))}</span>${icon('rotate-ccw')}</button>
    </div>
    <p class="careers-success__note">${fmt(esc(t(S.okNote)), { link: `<a href="mailto:${esc(email)}" dir="ltr">${esc(email)}</a>` })}</p>`;
  $('[data-apply-new]', box)?.addEventListener('click', () => {
    form.reset();
    lastSubmission = null;
    showForm();
    form.elements.name.focus();
  });
}
function showSuccess() {
  const box = $('[data-apply-success]');
  form.hidden = true;
  box.hidden = false;
  scrollTo('#apply', { offset: -((parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72) + 24) });
  box.focus({ preventScroll: true });
  refresh();
}
function showForm() {
  const box = $('[data-apply-success]');
  box.hidden = true;
  form.hidden = false;
  refresh();
}

/* ==================================================================
   7. Deep links (?discipline=…&location=…)
   ================================================================== */
function initDeepLinks() {
  const disc = getParam('discipline');
  const loc = getParam('location');
  if (disc && (getDisc(disc) || disc === 'other')) preselectDiscipline(disc);
  if (loc && LOC[loc]) {
    preselectLocation(loc);
    $('[data-loc-tabs]')?.__selectTab?.(loc);
  }
}

/* ------------------------------------------------------------------ boot */
for (const [name, fn] of [['hero', initHero], ['benefits', initBenefits], ['disciplines', initDisciplines], ['drawer', initDrawer], ['locations', initLocations], ['journey', initJourney], ['form', initForm], ['deeplinks', initDeepLinks]]) {
  try { fn(); } catch (err) { console.error(`[careers] ${name} failed`, err); }
}
