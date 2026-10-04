// assets/js/pages/contact.js · Contact page behaviour (owned by the contact builder).
//
//   1. Local time in the Riyadh and Cairo offices (Intl, no network)
//   2. Map: WORLD dot-matrix map zoomed to the selected office (tabs), consent-gated Google Maps iframe
//   3. "Start a project" wizard (#inquiry): 3 steps, inline validation (core ui.js), sessionStorage,
//      deep-link prefill (?company=…&office=…&type=…), region routing, mailto: hand-off, success screen
//
// Every visible string is bilingual via t({en, ar}) and re-rendered on 'langchange'.
// HONESTY: the site has no backend. The inquiry is handed to the visitor's own mail app (mailto:), and the
// reference is generated in the browser only. Budget bands are input options, not company claims.

import { t, getLang, onLang } from '../core/i18n.js';
import { scrollTo } from '../core/motion.js';
import { toast, copyText, validateForm } from '../core/ui.js';
import { $, $$, esc, prefersReducedMotion, store, getParam, debounce } from '../core/utils.js';
import { onConsent } from '../core/consent.js';
import * as DATA from '../data/site-data.js';
import { WORLD } from '../data/world-map.js';

const fmt = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
const pad2 = (n) => String(n).padStart(2, '0');
const headerH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72;

/* =====================================================================
   1. Local time in each office
   ===================================================================== */
const ZONES = { ksa: 'Asia/Riyadh', egypt: 'Africa/Cairo' };
const DAYS = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
};
const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fmtCache = new Map();
function zoned(tz) {
  if (!fmtCache.has(tz)) {
    fmtCache.set(tz, new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }));
  }
  const parts = fmtCache.get(tz).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return { h: parseInt(get('hour'), 10) % 24, m: parseInt(get('minute'), 10), wd: SHORT.indexOf(get('weekday')) };
}
function gmtOffset(tz) {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value || '';
  } catch { return ''; }
}
function initClocks() {
  if (!$('[data-clock-time]')) return;
  let last = '';
  const render = (force = false) => {
    const key = `${getLang()}|${new Date().getHours()}:${new Date().getMinutes()}`;
    if (!force && key === last) return;
    last = key;
    for (const [id, tz] of Object.entries(ZONES)) {
      const z = zoned(tz);
      $$(`[data-clock-time="${id}"]`).forEach((el) => { el.textContent = `${pad2(z.h)}:${pad2(z.m)}`; });
      const day = (getLang() === 'ar' ? DAYS.ar : DAYS.en)[z.wd] || '';
      $$(`[data-clock-meta="${id}"]`).forEach((el) => { el.innerHTML = `${esc(day)} · <bdi dir="ltr">${esc(gmtOffset(tz))}</bdi>`; });
    }
  };
  render(true);
  let timer = setInterval(render, 1000);
  document.addEventListener('visibilitychange', () => {
    clearInterval(timer);
    if (!document.hidden) { render(true); timer = setInterval(render, 1000); }
  });
  onLang(() => render(true));
}

/* =====================================================================
   2. Map: dot-matrix WORLD map + consent-gated Google Maps
   ===================================================================== */
const MAP_S = {
  showDots: { en: 'Show dot map', ar: 'عرض الخريطة النقطية' },
  showGoogle: { en: 'Show Google map', ar: 'عرض خريطة Google' },
  mapLoaded: { en: 'Google map loaded', ar: 'تم تحميل خريطة Google' },
};
// d3-geo naturalEarth1 raw projection; scale/translate solved from the WORLD office markers.
function ne1(lon, lat) {
  const l = (lon * Math.PI) / 180, p = (lat * Math.PI) / 180;
  const p2 = p * p, p4 = p2 * p2;
  return [
    l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4))),
    p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4))),
  ];
}
const PROJ = (() => {
  const a = WORLD.offices.ksa, b = WORLD.offices.canada;
  const A = ne1(...a.lonlat), B = ne1(...b.lonlat);
  const kx = (a.xy[0] - b.xy[0]) / (A[0] - B[0]);
  const ky = (a.xy[1] - b.xy[1]) / (B[1] - A[1]);
  const k = (kx + ky) / 2;
  return { k, tx: a.xy[0] - k * A[0], ty: a.xy[1] + k * A[1] };
})();
const project = (lon, lat) => { const [x, y] = ne1(lon, lat); return [PROJ.tx + PROJ.k * x, PROJ.ty - PROJ.k * y]; };

// Approximate pin positions (the iframe query is what matters for directions).
const PLACES = {
  ksa: {
    xy: WORLD.offices.ksa.xy, zoom: 92,
    query: 'Al Ebdaa Tower, King Fahd Road, Olaya, Riyadh',
    title: { en: 'Map of the Riyadh office', ar: 'خريطة مكتب الرياض' },
    label: { en: 'Riyadh', ar: 'الرياض' }, sub: { en: 'Headquarters', ar: 'المقر الرئيسي' },
  },
  'new-cairo': {
    xy: project(31.52, 30.013), zoom: 30,
    query: 'B1 Building, Mivida Compound, New Cairo, Egypt',
    title: { en: 'Map of the New Cairo office', ar: 'خريطة مكتب القاهرة الجديدة' },
    label: { en: 'New Cairo', ar: 'القاهرة الجديدة' }, sub: { en: 'Egypt office', ar: 'مكتب مصر' },
  },
  'nasr-city': {
    xy: project(31.34, 30.056), zoom: 24,
    query: '2 Ahmed Hassan St., Ninth District, Nasr City, Cairo, Egypt',
    title: { en: 'Map of the Nasr City office', ar: 'خريطة مكتب مدينة نصر' },
    label: { en: 'Nasr City', ar: 'مدينة نصر' }, sub: { en: 'Egypt office', ar: 'مكتب مصر' }, flip: true,
  },
};
const GEO_LABELS = [
  { lonlat: [44.2, 22.6], text: { en: 'Saudi Arabia', ar: 'المملكة العربية السعودية' } },
  { lonlat: [29.2, 26.4], text: { en: 'Egypt', ar: 'مصر' } },
  { lonlat: [38.6, 20.2], text: { en: 'Red Sea', ar: 'البحر الأحمر' }, water: true },
  { lonlat: [28.5, 33.6], text: { en: 'Mediterranean Sea', ar: 'البحر الأبيض المتوسط' }, water: true },
  { lonlat: [36.3, 31.2], text: { en: 'Jordan', ar: 'الأردن' }, small: true },
];
const embedUrl = (p) => `https://www.google.com/maps?q=${encodeURIComponent(p.query)}&output=embed&hl=${getLang()}`;
const searchUrl = (p) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.query)}`;

function initMap() {
  const root = $('[data-contact-map]');
  if (!root) return;
  const stage = $('[data-map-stage]', root);
  const dotsBox = $('[data-map-dots]', root);
  const frameBox = $('[data-map-frame]', root);
  const toggle = $('[data-map-toggle]', root);
  const ext = $('[data-map-ext]', root);
  const insetBox = $('[data-map-inset]', root);
  const ids = Object.keys(PLACES);
  let current = { ksa: 'ksa', egypt: 'new-cairo', 'new-cairo': 'new-cairo', 'nasr-city': 'nasr-city' }[getParam('office')] || 'ksa';

  /* --- build the SVG dot map */
  const NS = 'http://www.w3.org/2000/svg';
  const arcA = PLACES.ksa.xy, arcB = PLACES['new-cairo'].xy;
  const arcC = [(arcA[0] + arcB[0]) / 2, Math.min(arcA[1], arcB[1]) - 16];
  dotsBox.innerHTML = `
    <svg class="contact-map__svg" xmlns="${NS}" preserveAspectRatio="none" viewBox="0 0 1000 520" focusable="false">
      <defs>
        <pattern id="cm-dot" patternUnits="userSpaceOnUse" width="1" height="1"><circle cx=".5" cy=".5" r=".2" fill="rgba(255,255,255,.3)"/></pattern>
        <pattern id="cm-dot-hl" patternUnits="userSpaceOnUse" width="1" height="1"><circle cx=".5" cy=".5" r=".24" fill="#6fd1c5"/></pattern>
        <clipPath id="cm-land"><path d="${WORLD.land}"/></clipPath>
      </defs>
      <path d="${WORLD.land}" fill="rgba(255,255,255,.025)"/>
      <rect x="0" y="0" width="1000" height="520" fill="url(#cm-dot)" clip-path="url(#cm-land)"/>
      <path d="${WORLD.highlight.ksa}" fill="url(#cm-dot-hl)" fill-opacity=".72"/>
      <path d="${WORLD.highlight.egypt}" fill="url(#cm-dot-hl)" fill-opacity=".72"/>
      <path d="${WORLD.land}" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="1" vector-effect="non-scaling-stroke"/>
      <path d="${WORLD.borders}" fill="none" stroke="rgba(255,255,255,.13)" stroke-width="1" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/>
      <path d="${WORLD.highlight.ksa}" fill="none" stroke="rgba(111,209,197,.55)" stroke-width="1" vector-effect="non-scaling-stroke"/>
      <path d="${WORLD.highlight.egypt}" fill="none" stroke="rgba(111,209,197,.55)" stroke-width="1" vector-effect="non-scaling-stroke"/>
      <path class="contact-map__arc" d="M${arcA[0]},${arcA[1]} Q${arcC[0]},${arcC[1]} ${arcB[0]},${arcB[1]}" fill="none" stroke="rgba(111,209,197,.75)" stroke-width="1.25" stroke-dasharray="5 6" vector-effect="non-scaling-stroke"/>
    </svg>
    <div class="contact-map__overlay"></div>`;
  const svg = $('svg', dotsBox);
  const overlay = $('.contact-map__overlay', dotsBox);
  const pat = [$('#cm-dot', svg), $('#cm-dot-hl', svg)];
  const arc = $('.contact-map__arc', svg);

  // HTML overlay: pins + geographic labels (constant screen size at any zoom)
  const pins = ids.map((id) => {
    const p = PLACES[id];
    const el = document.createElement('div');
    el.className = `contact-pin${p.flip ? ' contact-pin--flip' : ''}`;
    el.innerHTML = '<span class="contact-pin__ring"></span><span class="contact-pin__ring contact-pin__ring--2"></span><span class="contact-pin__core"></span><span class="contact-pin__label"><b></b><small></small></span>';
    overlay.appendChild(el);
    return { id, el, xy: p.xy };
  });
  const geos = GEO_LABELS.map((g) => {
    const el = document.createElement('span');
    el.className = `contact-map__geo${g.water ? ' contact-map__geo--water' : ''}`;
    overlay.appendChild(el);
    return { el, xy: project(...g.lonlat), g };
  });
  const renderLabels = () => {
    pins.forEach((p) => { $('b', p.el).textContent = t(PLACES[p.id].label); $('small', p.el).textContent = t(PLACES[p.id].sub); });
    geos.forEach((g) => { g.el.textContent = t(g.g.text); });
  };
  renderLabels();

  // mini locator (coarse WORLD.dots): shows the current window on the whole world
  const dotsMarkup = WORLD.dots.filter((d) => d[1] < 440).map(([x, y, k]) => `<circle cx="${x}" cy="${y}" r="2.3"${k === 'ksa' || k === 'egypt' ? ' fill="#6fd1c5"' : ''}/>`).join('');
  insetBox.innerHTML = `<svg viewBox="0 0 1000 440" xmlns="${NS}" focusable="false"><g fill="rgba(255,255,255,.28)">${dotsMarkup}</g><rect class="contact-map__window" x="0" y="0" width="10" height="10" fill="rgba(111,209,197,.12)" stroke="#6fd1c5" stroke-width="5"/></svg>`;
  const win = $('.contact-map__window', insetBox);

  /* --- camera: viewBox matched to the stage aspect so pins land exactly at --pin-x/--pin-y */
  const cam = { x: PLACES[current].xy[0], y: PLACES[current].xy[1], w: PLACES[current].zoom };
  let size = { w: 1, h: 1 }, focus = { x: 0.6, y: 0.46 };
  const measure = () => {
    const r = dotsBox.getBoundingClientRect();
    size = { w: Math.max(1, r.width), h: Math.max(1, r.height) };
    const cs = getComputedStyle(stage);
    focus = { x: parseFloat(cs.getPropertyValue('--pin-x')) || 0.6, y: parseFloat(cs.getPropertyValue('--pin-y')) || 0.46 };
    dotsBox.style.setProperty('--glow-x', `${focus.x * 100}%`);
  };
  const draw = () => {
    const W = cam.w, H = W * (size.h / size.w);
    const vx = cam.x - W * focus.x, vy = cam.y - H * focus.y;
    svg.setAttribute('viewBox', `${vx.toFixed(3)} ${vy.toFixed(3)} ${W.toFixed(3)} ${H.toFixed(3)}`);
    // LED-style matrix: dot grid fixed in screen space (about 10px pitch), the land slides underneath
    const pitchPx = size.w < 640 ? 8 : 10;
    const s = (pitchPx * W) / size.w;
    pat.forEach((p, i) => {
      p.setAttribute('x', vx.toFixed(3)); p.setAttribute('y', vy.toFixed(3));
      p.setAttribute('width', s.toFixed(4)); p.setAttribute('height', s.toFixed(4));
      const c = p.firstElementChild;
      c.setAttribute('cx', (s / 2).toFixed(4)); c.setAttribute('cy', (s / 2).toFixed(4));
      c.setAttribute('r', (s * (i ? 0.25 : 0.19)).toFixed(4));
    });
    const k = size.w / W;
    const toScreen = ([x, y]) => [(x - vx) * k, (y - vy) * k];
    const active = pins.find((p) => p.id === current);
    // labels never collide: the active pin is labelled first, others only if they have room
    const labelled = [];
    [active, ...pins.filter((p) => p !== active)].forEach((p) => {
      const [sx, sy] = toScreen(p.xy);
      p.el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
      p.el.classList.toggle('is-active', p === active);
      const clash = p !== active && labelled.some(([x, y]) => Math.abs(sx - x) < 170 && Math.abs(sy - y) < 44);
      p.el.classList.toggle('is-dim', clash);
      if (!clash) labelled.push([sx, sy]);
      p.el.style.visibility = sx < -40 || sy < -40 || sx > size.w + 40 || sy > size.h + 40 ? 'hidden' : '';
    });
    geos.forEach((g) => {
      const [sx, sy] = toScreen(g.xy);
      g.el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translate(-50%, -50%)`;
      const near = pins.some((p) => Math.hypot(...toScreen(p.xy).map((v, i) => v - [sx, sy][i])) < 70);
      g.el.style.opacity = near || (g.g.small && W > 60) ? '0' : '1';
    });
    win.setAttribute('x', vx.toFixed(1)); win.setAttribute('y', vy.toFixed(1));
    win.setAttribute('width', Math.max(14, W).toFixed(1)); win.setAttribute('height', Math.max(10, H).toFixed(1));
    arc.style.opacity = W > 60 ? '1' : '0';
  };
  let raf = 0;
  const flyTo = (id, immediate = false) => {
    const p = PLACES[id];
    cancelAnimationFrame(raf);
    const from = { ...cam }, to = { x: p.xy[0], y: p.xy[1], w: p.zoom };
    if (immediate || prefersReducedMotion()) { Object.assign(cam, to); draw(); return; }
    const dur = 1300, t0 = performance.now();
    const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    // zoom out a little mid-flight when travelling between offices
    const travel = Math.hypot(to.x - from.x, to.y - from.y);
    const lift = Math.min(70, travel * 1.1);
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = ease(k);
      cam.x = from.x + (to.x - from.x) * e;
      cam.y = from.y + (to.y - from.y) * e;
      cam.w = from.w + (to.w - from.w) * e + Math.sin(Math.PI * k) * lift;
      draw();
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  };
  measure();
  draw();
  new ResizeObserver(() => { measure(); draw(); }).observe(dotsBox);
  onLang(() => { renderLabels(); draw(); });

  /* --- Google Maps iframe (consent-gated) */
  let iframe = null;
  const setExt = () => { ext.href = searchUrl(PLACES[current]); };
  const renderToggle = () => {
    $('[data-map-toggle-label]', toggle).textContent = t(root.classList.contains('is-dotview') ? MAP_S.showGoogle : MAP_S.showDots);
  };
  const loadMap = () => {
    if (iframe) return;
    iframe = document.createElement('iframe');
    iframe.title = t(PLACES[current].title);
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.setAttribute('allowfullscreen', '');
    iframe.src = embedUrl(PLACES[current]);
    frameBox.appendChild(iframe);
    root.classList.add('is-live');
    root.classList.remove('is-dotview');
    toggle.hidden = false;
    renderToggle();
  };
  $('[data-map-load]', root)?.addEventListener('click', () => {
    store.set('mobco-contact-map', '1', 'session'); // explicit, per-session opt-in for this embed only
    loadMap();
    toast(MAP_S.mapLoaded, { type: 'info', duration: 2200 });
    requestAnimationFrame(() => toggle.focus({ preventScroll: true }));
  });
  toggle.addEventListener('click', () => {
    root.classList.toggle('is-dotview');
    renderToggle();
    if (root.classList.contains('is-dotview')) { measure(); draw(); }
  });
  onConsent(loadMap); // global consent from the cookie banner (core consent.js)
  if (store.get('mobco-contact-map', 'session') === '1') loadMap();
  onLang(() => {
    if (iframe) iframe.title = t(PLACES[current].title);
    if (!toggle.hidden) renderToggle();
  });

  /* --- tabs, camera and iframe stay in sync */
  const select = (id, { immediate = false } = {}) => {
    if (!PLACES[id]) return;
    current = id;
    flyTo(id, immediate);
    setExt();
    if (iframe) { iframe.src = embedUrl(PLACES[id]); iframe.title = t(PLACES[id].title); }
  };
  root.addEventListener('tabchange', (e) => select(e.detail.id));
  if (current !== 'ksa') requestAnimationFrame(() => root.__selectTab?.(current)); // after core wired the tabs
  select(current, { immediate: true });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-map-show]');
    if (!a) return;
    const id = a.getAttribute('data-map-show');
    if (root.__selectTab) root.__selectTab(id); else select(id);
    stage.classList.remove('is-flash');
    void stage.offsetWidth;
    stage.classList.add('is-flash');
  });
}

/* =====================================================================
   3. Start a project: 3-step inquiry wizard
   ===================================================================== */
const EMAIL = { ksa: 'info.ksa@mobco-group.com', egypt: 'info.egy@mobco-group.com' };
const PHONE = {
  ksa: { display: '+966 11 293 5966', href: 'tel:+966112935966' },
  egypt: { display: '02-23866591', href: 'tel:+20223866591' },
};
const TOTAL = 3;
const STORE_KEY = 'mobco-inquiry-v2';
const FIELDS = ['type', 'region', 'city', 'budget', 'timeline', 'message', 'name', 'company', 'email', 'phone'];

const S = {
  steps: [
    { en: 'Your need', ar: 'احتياجك' },
    { en: 'Project', ar: 'المشروع' },
    { en: 'Your details', ar: 'بياناتك' },
  ],
  stepOf: { en: 'Step {n} of {total}: {name}', ar: 'الخطوة {n} من {total}: {name}' },
  continue: { en: 'Continue', ar: 'متابعة' },
  toSummary: { en: 'Back to summary', ar: 'العودة إلى الملخص' },
  send: { en: 'Send inquiry', ar: 'إرسال الطلب' },
  fixStep: { en: 'Please complete the highlighted fields.', ar: 'يُرجى إكمال الحقول المحددة.' },
  restored: { en: 'Your answers are still here.', ar: 'إجاباتك السابقة محفوظة.' },
  forCompany: { en: 'Inquiry for {name}', ar: 'طلب موجّه إلى {name}' },
  // summary
  summary: { en: 'Your inquiry', ar: 'ملخص طلبك' },
  edit: { en: 'Edit', ar: 'تعديل' },
  notGiven: { en: 'Not given', ar: 'لم يُحدَّد' },
  rows: {
    type: { en: 'Need', ar: 'الاحتياج' },
    location: { en: 'Location', ar: 'الموقع' },
    budget: { en: 'Budget', ar: 'الميزانية' },
    timeline: { en: 'Start', ar: 'البدء' },
    message: { en: 'Brief', ar: 'الوصف' },
  },
  route: { en: 'Goes to our {office} at {email}.', ar: 'يصل طلبك إلى {office} على {email}.' },
  office: {
    ksa: { en: 'Riyadh headquarters', ar: 'المقر الرئيسي في الرياض' },
    egypt: { en: 'Cairo office', ar: 'مكتبنا في القاهرة' },
  },
  // success
  thanks: { en: 'Thank you, {name}', ar: 'شكرًا لك، {name}' },
  thanksAnon: { en: 'Thank you', ar: 'شكرًا لك' },
  doneText: {
    en: 'We opened your email app with the inquiry addressed to {email}. Press send to deliver it.',
    ar: 'فتحنا تطبيق البريد لديك وفيه طلبك موجّهًا إلى {email}. اضغط «إرسال» لإيصاله.',
  },
  doneAlt: {
    en: 'If no email app opened, copy the text and send it to {email}.',
    ar: 'إن لم يُفتح تطبيق البريد، انسخ النص وأرسله إلى {email}.',
  },
  doneCall: { en: 'To talk sooner, call {office} on {phone}.', ar: 'للتحدث معنا الآن، اتصل بـ{office} على {phone}.' },
  truncated: {
    en: 'Your description was long, so the full text is also on your clipboard. Paste it into the email.',
    ar: 'كان الوصف طويلًا، لذا نسخنا النص كاملًا إلى الحافظة أيضًا. الصقه في الرسالة.',
  },
  copiedInquiry: { en: 'Inquiry text copied', ar: 'تم نسخ نص الطلب' },
  copiedRef: { en: 'Reference copied', ar: 'تم نسخ الرقم المرجعي' },
  copyFail: { en: 'Could not copy. Please copy it by hand.', ar: 'تعذّر النسخ. يُرجى نسخه يدويًا.' },
  ready: { en: 'Inquiry {ref} is ready in your email app.', ar: 'الطلب {ref} جاهز في تطبيق البريد لديك.' },
  // mail
  mailSubject: { en: 'Project inquiry', ar: 'طلب مشروع' },
  mailRef: { en: 'Reference', ar: 'الرقم المرجعي' },
  mailFor: { en: 'For', ar: 'موجّه إلى' },
  mailName: { en: 'Name', ar: 'الاسم' },
  mailCompany: { en: 'Company', ar: 'الشركة' },
  mailEmail: { en: 'Email', ar: 'البريد الإلكتروني' },
  mailPhone: { en: 'Phone', ar: 'الهاتف' },
  mailBrief: { en: 'Project description', ar: 'وصف المشروع' },
  mailClip: { en: 'full text on your clipboard, please paste it here', ar: 'النص الكامل في الحافظة، يُرجى لصقه هنا' },
};

// Budget bands: SAR for projects in Saudi Arabia, USD elsewhere (input options only, see content notes).
const BUDGETS = {
  sar: {
    b1: { en: 'Under SAR 10M', ar: 'أقل من 10 ملايين ريال' },
    b2: { en: 'SAR 10M to 50M', ar: 'من 10 إلى 50 مليون ريال' },
    b3: { en: 'SAR 50M to 250M', ar: 'من 50 إلى 250 مليون ريال' },
    b4: { en: 'Over SAR 250M', ar: 'أكثر من 250 مليون ريال' },
  },
  usd: {
    b1: { en: 'Under USD 3M', ar: 'أقل من 3 ملايين دولار' },
    b2: { en: 'USD 3M to 15M', ar: 'من 3 إلى 15 مليون دولار' },
    b3: { en: 'USD 15M to 70M', ar: 'من 15 إلى 70 مليون دولار' },
    b4: { en: 'Over USD 70M', ar: 'أكثر من 70 مليون دولار' },
  },
  unsure: { en: 'Not sure yet', ar: 'لم أحدد بعد' },
};

// Deep links: ?company=<subsidiary id> (subsidiaries finder), ?office=ksa|egypt, ?type=<need>
const COMPANY_TYPE = {
  'mobco-construction': 'construction',
  'mobco-developments': 'development',
  'mobco-real-estate': 'property',
  'elite-education': 'other',
};
const COMPANY_NAME = {
  'mobco-construction': { en: 'MOBCO Construction', ar: 'موبكو للإنشاءات' },
  'mobco-developments': { en: 'MOBCO Developments', ar: 'موبكو للتطوير' },
  'mobco-real-estate': { en: 'MOBCO Real Estate Development', ar: 'موبكو للتطوير العقاري' },
  'elite-education': { en: 'Elite Education Group', ar: 'مجموعة إيليت التعليمية' },
};
const TYPE_ALIAS = {
  construction: 'construction', build: 'construction', contracting: 'construction',
  development: 'development', developments: 'development',
  management: 'management', 'project-management': 'management', 'pre-construction': 'management',
  property: 'property', leasing: 'property', 'real-estate': 'property', 'facility-management': 'property',
  other: 'other', education: 'other',
};
const companyName = (id) => {
  try { const s = DATA.getSubsidiary?.(id); if (s?.name?.en) return s.name; } catch { /* data module changed */ }
  return COMPANY_NAME[id] || null;
};

function initWizard() {
  const wizard = $('[data-wizard]');
  if (!wizard) return;
  const form = $('[data-wizard-form]', wizard);
  const panels = $$('[data-step]', form);
  const nextBtn = $('[data-wizard-next]', form);
  const nextLabel = $('[data-wizard-next-label]', nextBtn);
  const backBtn = $('[data-wizard-back]', form);
  const note = $('[data-wizard-note]', form);
  const live = $('[data-wizard-live]', wizard);
  const stepBtns = $$('[data-goto]', wizard);
  const forBox = $('[data-wizard-for]', wizard);
  const success = $('[data-wizard-success]', wizard);
  const stepsNav = $('[data-wizard-steps]', wizard);
  const review = $('[data-wizard-review]', form);
  const message = form.elements.message;
  const counter = $('[data-wizard-counter]', form);
  const anchor = wizard.closest('.inq') || wizard;

  let step = 1, maxReached = 1, toSummary = false, company = null, last = null;

  /* ---------------------------------------------------------------- helpers */
  const val = (name) => (form.elements[name]?.value || '').trim(); // RadioNodeList.value = the checked radio
  const labelOf = (name) => {
    const input = form.querySelector(`input[name="${name}"]:checked`);
    if (!input) return '';
    const box = input.closest('label').querySelector('.wiz-opt__title, .wiz-pill__box');
    return (box?.textContent || '').replace(/\s+/g, ' ').trim();
  };
  const routeOf = (region) => (region === 'egypt' ? 'egypt' : 'ksa');
  const currency = () => (val('region') === 'ksa' ? 'sar' : 'usd');
  const budgetText = (v, cur = currency()) => (v === 'unsure' ? t(BUDGETS.unsure) : BUDGETS[cur][v] ? t(BUDGETS[cur][v]) : '');

  /* ---------------------------------------------------------------- budgets follow the region's currency */
  const renderBudgets = () => {
    const cur = currency();
    $$('[data-budget-label]', form).forEach((el) => { el.textContent = budgetText(el.dataset.budgetLabel, cur); });
  };

  /* ---------------------------------------------------------------- counter */
  const renderCounter = () => {
    const n = message.value.length, max = parseInt(message.getAttribute('maxlength'), 10) || 1500;
    counter.textContent = `${n} / ${max}`;
    counter.parentElement.classList.toggle('is-near', n > max * 0.9);
  };
  message.addEventListener('input', renderCounter);

  /* ---------------------------------------------------------------- company chip (prefilled from a subsidiary) */
  const renderFor = () => {
    const name = company ? companyName(company) : null;
    forBox.hidden = !name;
    if (name) $('[data-wizard-for-text]', forBox).textContent = fmt(t(S.forCompany), { name: t(name) });
  };
  $('[data-wizard-for-clear]', forBox).addEventListener('click', () => {
    company = null;
    renderFor();
    save();
    $('.wiz__title', panels[step - 1])?.focus({ preventScroll: true });
  });

  /* ---------------------------------------------------------------- persistence (sessionStorage) */
  const snapshot = () => Object.fromEntries(FIELDS.map((k) => [k, val(k)]));
  const setValue = (name, v) => {
    const el = form.elements[name];
    if (!el || v == null) return;
    if (el instanceof RadioNodeList) { $$(`input[name="${name}"]`, form).forEach((r) => { r.checked = r.value === v; }); }
    else el.value = v;
  };
  const save = debounce(() => {
    if (!success.hidden) return;
    store.set(STORE_KEY, JSON.stringify({ step, maxReached, company, sig: prefillSig, values: snapshot() }), 'session');
  }, 120);
  const readSaved = () => {
    try { return JSON.parse(store.get(STORE_KEY, 'session') || 'null'); } catch { return null; }
  };

  /* ---------------------------------------------------------------- summary on step 3 */
  const renderReview = () => {
    const r = routeOf(val('region'));
    const location = [labelOf('region'), val('city')].filter(Boolean).join(', ');
    const brief = val('message');
    const rows = [
      ['type', 1, labelOf('type')],
      ['location', 2, location],
      ['budget', 2, budgetText(val('budget'))],
      ['timeline', 2, labelOf('timeline')],
      ['message', 2, brief.length > 160 ? `${brief.slice(0, 157).trim()}…` : brief],
    ];
    review.innerHTML = `
      <p class="wiz-review__head">${esc(t(S.summary))}</p>
      <dl class="wiz-review__list">${rows.map(([k, n, v]) => `
        <div class="wiz-review__row">
          <dt>${esc(t(S.rows[k]))}</dt>
          <dd class="${v ? '' : 'is-empty'}">${esc(v || t(S.notGiven))}</dd>
          <button class="wiz-review__edit" type="button" data-edit="${n}" aria-label="${esc(`${t(S.edit)}: ${t(S.rows[k])}`)}">${esc(t(S.edit))}</button>
        </div>`).join('')}
      </dl>
      <p class="wiz-review__route"><svg class="icon" aria-hidden="true" focusable="false"><use href="assets/icons/sprite.svg#route"></use></svg><span>${fmt(esc(t(S.route)), { office: `<strong>${esc(t(S.office[r]))}</strong>`, email: `<bdi dir="ltr">${esc(EMAIL[r])}</bdi>` })}</span></p>`;
  };

  /* ---------------------------------------------------------------- render the current step */
  const announce = (msg) => { live.textContent = ''; requestAnimationFrame(() => { live.textContent = msg; }); };
  const stepText = () => fmt(t(S.stepOf), { n: step, total: TOTAL, name: t(S.steps[step - 1]) });
  const render = ({ focus = false, dir = 0 } = {}) => {
    panels.forEach((p) => {
      const on = parseInt(p.dataset.step, 10) === step;
      p.hidden = !on;
      p.classList.remove('is-entering', 'is-back');
      if (on && dir && !prefersReducedMotion()) { void p.offsetWidth; p.classList.add('is-entering'); if (dir < 0) p.classList.add('is-back'); }
    });
    stepBtns.forEach((b) => {
      const n = parseInt(b.dataset.goto, 10);
      b.disabled = n > maxReached;
      b.classList.toggle('is-done', n < step || (n !== step && n < maxReached));
      if (n === step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    stepsNav.style.setProperty('--progress', String((step - 1) / (TOTAL - 1)));
    backBtn.hidden = step === 1;
    const final = step === TOTAL;
    if (final) toSummary = false;
    nextLabel.textContent = t(final ? S.send : toSummary ? S.toSummary : S.continue);
    nextBtn.classList.toggle('btn--primary', final);
    nextBtn.classList.toggle('btn--dark', !final);
    $('use', nextBtn)?.setAttribute('href', `assets/icons/sprite.svg#${final ? 'send' : 'arrow-right'}`);
    note.hidden = !final;
    if (final) renderReview();
    if (focus) {
      const top = anchor.getBoundingClientRect().top;
      const wtop = wizard.getBoundingClientRect().top;
      if (wtop < headerH() + 8 || top > window.innerHeight * 0.55) scrollTo(wizard, { gap: 24, immediate: prefersReducedMotion() });
      $('.wiz__title', panels[step - 1])?.focus({ preventScroll: true });
      announce(stepText());
    }
    save();
  };
  const go = (n, opts = {}) => {
    const target = Math.max(1, Math.min(TOTAL, n));
    const dir = target > step ? 1 : target < step ? -1 : 0;
    step = target;
    maxReached = Math.max(maxReached, step);
    render({ focus: true, dir, ...opts });
  };
  const validateStep = (n) => validateForm(panels[n - 1]);
  const advance = () => go(toSummary ? TOTAL : step + 1);
  const next = () => {
    if (!validateStep(step)) { announce(t(S.fixStep)); return; }
    advance();
  };

  // data-validate="manual": core keeps inline validation, the page drives the steps.
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (step < TOTAL) next(); else submit();
  });
  backBtn.addEventListener('click', () => go(step - 1));
  stepBtns.forEach((b) => b.addEventListener('click', () => {
    const n = parseInt(b.dataset.goto, 10);
    if (n <= maxReached && success.hidden && n !== step) go(n);
  }));
  form.addEventListener('click', (e) => {
    const ed = e.target.closest('[data-edit]');
    if (ed) { toSummary = true; go(parseInt(ed.dataset.edit, 10)); }
  });
  form.addEventListener('change', (e) => {
    if (e.target.name === 'region') renderBudgets();
    save();
  });
  form.addEventListener('input', save);
  // Picking a card on step 1 with the mouse or touch moves on by itself (keyboard users press Enter).
  form.addEventListener('click', (e) => {
    const opt = e.target.closest('.wiz-opt');
    if (!opt || e.detail === 0 || step !== 1) return;
    setTimeout(() => {
      if (step === 1 && success.hidden && form.querySelector('input[name="type"]:checked')) advance();
    }, prefersReducedMotion() ? 0 : 320);
  });

  /* ---------------------------------------------------------------- submit: mailto + success */
  const makeRef = (r) => {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const rnd = new Uint8Array(4);
    (window.crypto || {}).getRandomValues?.(rnd);
    const code = Array.from(rnd, (b) => A[b % A.length]).join('');
    const d = new Date();
    return `MOB-${r === 'egypt' ? 'EGY' : 'KSA'}-${String(d.getFullYear()).slice(2)}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${code}`;
  };
  const buildText = (ref, msgOverride) => {
    // The subject already names the inquiry and the email carries its date. Optional answers left empty are
    // left out (shorter mailto: URLs matter in Arabic, where every letter is percent-encoded to 6 characters).
    const line = (label, v) => (v ? [`${t(label)}: ${v}`] : []);
    const lines = [
      ...line(S.mailRef, ref),
      '',
      ...line(S.rows.type, labelOf('type')),
      ...line(S.mailFor, company && companyName(company) ? t(companyName(company)) : ''),
      ...line(S.rows.location, [labelOf('region'), val('city')].filter(Boolean).join(', ')),
      ...line(S.rows.budget, budgetText(val('budget'))),
      ...line(S.rows.timeline, labelOf('timeline')),
      '',
      ...line(S.mailName, val('name')),
      ...line(S.mailCompany, val('company')),
      ...line(S.mailEmail, val('email')),
      ...line(S.mailPhone, val('phone')),
      '',
      `${t(S.mailBrief)}:`,
      msgOverride ?? val('message'),
    ];
    return lines.join('\n');
  };
  const openMail = (href) => {
    const a = document.createElement('a');
    a.href = href;
    a.rel = 'noopener';
    a.setAttribute('data-no-transition', '');
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const submit = async () => {
    for (let n = 1; n <= TOTAL; n++) {
      if (!validateStep(n)) {
        if (n !== step) { go(n); validateStep(n); }
        announce(t(S.fixStep));
        return;
      }
    }
    const r = routeOf(val('region'));
    const ref = makeRef(r);
    const to = EMAIL[r];
    const subject = [`${t(S.mailSubject)} ${ref}`, labelOf('type'), company && companyName(company) ? t(companyName(company)) : val('company')].filter(Boolean).join(' · ');
    const full = buildText(ref);
    const mk = (body) => `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    let href = mk(full), truncated = false;
    const MAX = 2000; // conservative mailto: length (Windows mail handlers stop around 2,048 characters)
    if (href.length > MAX) {
      truncated = true;
      let msg = val('message');
      while (msg.length > 40 && mk(buildText(ref, `${msg}… [${t(S.mailClip)}]`)).length > MAX) msg = msg.slice(0, Math.floor(msg.length * 0.85));
      href = mk(buildText(ref, `${msg}… [${t(S.mailClip)}]`));
      await copyText(full);
    }
    last = { ref, to, href, text: full, region: r, name: val('name'), truncated };
    openMail(href);
    showSuccess();
  };
  const renderSuccess = () => {
    if (!last) return;
    const first = last.name.split(/\s+/)[0] || '';
    $('[data-success-title]', success).textContent = first ? fmt(t(S.thanks), { name: first }) : t(S.thanksAnon);
    $('[data-success-text]', success).innerHTML = fmt(esc(t(S.doneText)), { email: `<bdi dir="ltr">${esc(last.to)}</bdi>` }) + (last.truncated ? ` ${esc(t(S.truncated))}` : '');
    $('[data-success-ref]', success).textContent = last.ref;
    $('[data-success-alt]', success).innerHTML = fmt(esc(t(S.doneAlt)), { email: `<bdi dir="ltr">${esc(last.to)}</bdi>` });
    const ph = PHONE[last.region];
    $('[data-success-call]', success).innerHTML = fmt(esc(t(S.doneCall)), { office: esc(t(S.office[last.region])), phone: `<a class="text-link" href="${ph.href}"><bdi dir="ltr">${esc(ph.display)}</bdi></a>` });
    $('[data-success-mail]', success).setAttribute('href', last.href);
  };
  const showSuccess = () => {
    renderSuccess();
    form.hidden = true;
    stepsNav.hidden = true;
    forBox.hidden = true;
    success.hidden = false;
    store.remove(STORE_KEY, 'session');
    announce(fmt(t(S.ready), { ref: last.ref }));
    const top = wizard.getBoundingClientRect().top;
    if (top < headerH() || top > window.innerHeight * 0.5) scrollTo(wizard, { gap: 24, immediate: prefersReducedMotion() });
    success.focus({ preventScroll: true });
  };
  const copyWith = async (text, okMsg, btn) => {
    const ok = await copyText(text);
    toast(ok ? okMsg : S.copyFail, { type: ok ? 'success' : 'error', duration: 2600 });
    if (btn && ok) { btn.classList.add('is-copied'); setTimeout(() => btn.classList.remove('is-copied'), 1600); }
  };
  $('[data-success-copy]', success).addEventListener('click', (e) => last && copyWith(last.text, S.copiedInquiry, e.currentTarget));
  $('[data-success-copy-ref]', success).addEventListener('click', (e) => last && copyWith(last.ref, S.copiedRef, e.currentTarget));
  $('[data-success-reset]', success).addEventListener('click', () => {
    form.reset();
    last = null;
    company = null;
    success.hidden = true;
    form.hidden = false;
    stepsNav.hidden = false;
    step = 1; maxReached = 1; toSummary = false;
    setTimeout(() => { renderFor(); renderBudgets(); renderCounter(); render({ focus: true }); });
  });

  onLang(() => {
    renderBudgets();
    renderFor();
    if (last && !success.hidden) renderSuccess();
    else render();
  });

  /* ---------------------------------------------------------------- boot: restore, then deep-link prefill */
  const q = { company: getParam('company'), office: getParam('office'), type: getParam('type') };
  const prefillSig = [q.company, q.office, q.type].map((v) => v || '').join('|');
  const saved = readSaved();
  let restored = false;
  if (saved?.values) {
    FIELDS.forEach((k) => setValue(k, saved.values[k]));
    maxReached = Math.min(TOTAL, Math.max(1, parseInt(saved.maxReached, 10) || 1));
    step = Math.min(maxReached, Math.max(1, parseInt(saved.step, 10) || 1));
    company = COMPANY_TYPE[saved.company] ? saved.company : null;
    restored = FIELDS.some((k) => saved.values[k]);
  }
  if (prefillSig !== '||' && saved?.sig !== prefillSig) {
    // A fresh deep link (not a reload of the same one) wins over older answers for the fields it carries.
    if (COMPANY_TYPE[q.company]) { company = q.company; setValue('type', COMPANY_TYPE[q.company]); }
    if (TYPE_ALIAS[q.type]) setValue('type', TYPE_ALIAS[q.type]);
    if (q.office === 'ksa' || q.office === 'egypt') setValue('region', q.office);
    step = 1;
    restored = false;
  }
  renderFor();
  renderBudgets();
  renderCounter();
  render();
  if (restored) toast(S.restored, { type: 'info', duration: 3000 });
}

/* ===================================================================== boot */
for (const [name, fn] of [['clocks', initClocks], ['map', initMap], ['wizard', initWizard]]) {
  try { fn(); } catch (err) { console.error(`[contact] ${name} failed`, err); }
}
