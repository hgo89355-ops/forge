// assets/js/pages/contact.js — Contact page behaviour (owned by the contact builder).
//
//   1. Live local time + open/closed status for Riyadh and Cairo (Intl, no network)
//   2. Map: WORLD dot-matrix map zoomed to the selected office (tabs), consent-gated Google Maps iframe
//   3. Project inquiry wizard (#inquiry): 5 steps, per-step validation (core ui.js), sessionStorage,
//      review, region routing, mailto: hand-off, success screen with a client-generated reference
//   4. General enquiries quick form → mailto: to the right inbox
//
// Everything user-facing is bilingual via t({en, ar}) and re-rendered/patched on 'langchange'.
// HONESTY: opening hours, budget bands and size bands are assumptions/inputs — see docs/content-notes/contact.md.

import { t, getLang, onLang } from '../core/i18n.js';
import { scrollTo } from '../core/motion.js';
import { toast, copyText, validateForm } from '../core/ui.js';
import { $, $$, esc, icon, prefersReducedMotion, store, getParam, debounce } from '../core/utils.js';
import { onConsent } from '../core/consent.js';
import { SECTORS } from '../data/site-data.js';
import { WORLD } from '../data/world-map.js';

const EMAIL = { ksa: 'info.ksa@mobco-group.com', egypt: 'info.egy@mobco-group.com' };
const CAREERS_EMAIL = { ksa: 'careers@mobco-group.com', egypt: 'hr.egy@mobco-group.com' };
const DAYS = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
};
const DAYS_SHORT = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], ar: DAYS.ar };
const fmt = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
const pad2 = (n) => String(n).padStart(2, '0');

const S = {
  open: { en: 'Open now', ar: 'مفتوح الآن' },
  closing: { en: 'Closes in {n} min', ar: 'يُغلق خلال {n} دقيقة' },
  closedToday: { en: 'Closed · opens {time}', ar: 'مغلق · يفتح الساعة {time}' },
  closedTomorrow: { en: 'Closed · opens tomorrow {time}', ar: 'مغلق · يفتح غدًا الساعة {time}' },
  closedDay: { en: 'Closed · opens {day} {time}', ar: 'مغلق · يفتح {day} الساعة {time}' },
  localTime: { en: 'Local time', ar: 'التوقيت المحلي' },
  // map
  showDots: { en: 'Show dot map', ar: 'عرض الخريطة النقطية' },
  showGoogle: { en: 'Show Google map', ar: 'عرض خريطة Google' },
  mapLoaded: { en: 'Google Maps loaded', ar: 'تم تحميل خرائط Google' },
  // wizard
  stepOf: { en: 'Step {n} of {total}', ar: 'الخطوة {n} من {total}' },
  continue: { en: 'Continue', ar: 'متابعة' },
  send: { en: 'Send inquiry', ar: 'إرسال الطلب' },
  fixStep: { en: 'Please complete the highlighted fields to continue.', ar: 'يُرجى إكمال الحقول المظللة للمتابعة.' },
  edit: { en: 'Edit', ar: 'تعديل' },
  notProvided: { en: 'Not provided', ar: 'لم يُذكر' },
  chooseRange: { en: 'Choose a range…', ar: 'اختر نطاقًا…' },
  route: {
    en: 'Your inquiry will be addressed to our <strong>{office}</strong> — <strong>{email}</strong>.',
    ar: 'سيُوجَّه طلبك إلى <strong>{office}</strong> — <strong>{email}</strong>.',
  },
  routeOther: {
    en: 'Projects outside Saudi Arabia and Egypt are handled by our <strong>headquarters in Riyadh</strong> — <strong>{email}</strong>.',
    ar: 'تتولّى <strong>المقر الرئيسي في الرياض</strong> المشاريع خارج السعودية ومصر — <strong>{email}</strong>.',
  },
  officeKsa: { en: 'KSA office in Riyadh', ar: 'مكتبنا في الرياض' },
  officeEgypt: { en: 'Egypt office in Cairo', ar: 'مكتبنا في القاهرة' },
  successText: {
    en: 'Your email app should now open with the inquiry addressed to <strong>{email}</strong> — just press send. Please keep this reference for your records.',
    ar: 'يُفترض أن يُفتح تطبيق البريد لديك الآن وقد وُجّه الطلب إلى <strong>{email}</strong> — ما عليك سوى الضغط على «إرسال». يُرجى الاحتفاظ بهذا الرقم المرجعي.',
  },
  successAlt: {
    en: 'No email app? Copy the inquiry text and send it to {email} from any mail service.',
    ar: 'لا يوجد تطبيق بريد؟ انسخ نص الطلب وأرسله إلى {email} من أي خدمة بريد.',
  },
  truncated: {
    en: 'Your description was long, so the full inquiry text has also been copied to your clipboard — paste it into the email.',
    ar: 'كان الوصف طويلًا، لذا نُسخ نص الطلب كاملًا إلى الحافظة أيضًا — الصقه في رسالة البريد.',
  },
  copiedInquiry: { en: 'Inquiry text copied', ar: 'تم نسخ نص الطلب' },
  copiedRef: { en: 'Reference copied', ar: 'تم نسخ الرقم المرجعي' },
  ready: { en: 'Inquiry {ref} is ready to send', ar: 'الطلب {ref} جاهز للإرسال' },
  restored: { en: 'We restored your unfinished inquiry.', ar: 'استعدنا طلبك غير المكتمل.' },
  // quick form
  quickNote: { en: 'Opens your email app, addressed to: {email}', ar: 'سيُفتح تطبيق البريد لديك وقد وُجّهت الرسالة إلى: {email}' },
  quickDone: {
    en: 'Your email app should open with your message addressed to {email}. If nothing happens, write to us directly at that address.',
    ar: 'يُفترض أن يُفتح تطبيق البريد لديك وقد وُجّهت رسالتك إلى {email}. إذا لم يحدث ذلك، راسلنا مباشرةً على هذا العنوان.',
  },
  quickToast: { en: 'Message ready in your email app', ar: 'رسالتك جاهزة في تطبيق البريد' },
};

/* =====================================================================
   1. Live clocks + open / closed status
   ===================================================================== */
// TODO(content): opening hours are assumptions (Sun–Thu) — confirm with the client (content notes).
const HOURS = {
  ksa: { tz: 'Asia/Riyadh', open: 8 * 60, close: 17 * 60, days: [0, 1, 2, 3, 4] },
  egypt: { tz: 'Africa/Cairo', open: 9 * 60, close: 17 * 60, days: [0, 1, 2, 3, 4] },
};
const fmtCache = new Map();
function zoned(tz, date = new Date()) {
  if (!fmtCache.has(tz)) {
    fmtCache.set(tz, new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }));
  }
  const parts = fmtCache.get(tz).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return { h: parseInt(get('hour'), 10) % 24, m: parseInt(get('minute'), 10), wd: DAYS_SHORT.en.indexOf(get('weekday')) };
}
function gmtOffset(tz) {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value || '';
  } catch { return ''; }
}
const hhmm = (mins) => `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`;
function officeStatus(id) {
  const H = HOURS[id];
  const z = zoned(H.tz);
  const mins = z.h * 60 + z.m;
  const workday = H.days.includes(z.wd);
  if (workday && mins >= H.open && mins < H.close) {
    const left = H.close - mins;
    return left <= 60 ? { state: 'closing', text: fmt(t(S.closing), { n: left }) } : { state: 'open', text: t(S.open) };
  }
  const time = hhmm(H.open);
  if (workday && mins < H.open) return { state: 'closed', text: fmt(t(S.closedToday), { time }) };
  let wd = z.wd, d = 0;
  do { wd = (wd + 1) % 7; d++; } while (!H.days.includes(wd) && d < 8);
  if (d === 1) return { state: 'closed', text: fmt(t(S.closedTomorrow), { time }) };
  return { state: 'closed', text: fmt(t(S.closedDay), { day: (getLang() === 'ar' ? DAYS.ar : DAYS_SHORT.en)[wd], time }) };
}
let lastClockKey = '';
function renderClocks(force = false) {
  const key = `${getLang()}|${new Date().getMinutes()}|${new Date().getHours()}`;
  if (!force && key === lastClockKey) return;
  lastClockKey = key;
  for (const id of Object.keys(HOURS)) {
    const H = HOURS[id];
    const z = zoned(H.tz);
    const time = `${pad2(z.h)}<span class="contact-colon">:</span>${pad2(z.m)}`;
    $$(`[data-clock-time="${id}"]`).forEach((el) => {
      el.innerHTML = el.closest('.contact-clocks') ? time : `${pad2(z.h)}:${pad2(z.m)}`;
    });
    const st = officeStatus(id);
    $$(`[data-clock-status="${id}"]`).forEach((el) => {
      el.classList.remove('is-open', 'is-closed', 'is-closing');
      el.classList.add(`is-${st.state}`);
      const txt = el.querySelector('.contact-status__text');
      if (txt) txt.textContent = st.text;
    });
    const day = (getLang() === 'ar' ? DAYS.ar : DAYS.en)[z.wd] || '';
    $$(`[data-clock-meta="${id}"]`).forEach((el) => {
      el.innerHTML = `<bdi dir="ltr">${esc(gmtOffset(H.tz))}</bdi> · ${esc(day)}`;
    });
  }
}
function initClocks() {
  if (!$('[data-clock-time]')) return;
  renderClocks(true);
  let timer = setInterval(() => renderClocks(), 1000);
  document.addEventListener('visibilitychange', () => {
    clearInterval(timer);
    if (!document.hidden) { renderClocks(true); timer = setInterval(() => renderClocks(), 1000); }
  });
  onLang(() => renderClocks(true));
}

/* =====================================================================
   2. Map — dot-matrix WORLD map + consent-gated Google Maps
   ===================================================================== */
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

// Approximate pin positions (geo approx — the iframe query is what matters for directions).
const PLACES = {
  ksa: {
    xy: WORLD.offices.ksa.xy, zoom: 92,
    query: 'Al Ebdaa Tower, King Fahd Road, Olaya, Riyadh',
    title: { en: 'Map: KSA Office (Riyadh)', ar: 'خريطة: مكتب السعودية (الرياض)' },
    label: { en: 'Riyadh', ar: 'الرياض' }, sub: { en: 'Headquarters', ar: 'المقر الرئيسي' },
  },
  'new-cairo': {
    xy: project(31.52, 30.013), zoom: 30,
    query: 'B1 Building, Mivida Compound, New Cairo, Egypt',
    title: { en: 'Map: Egypt Office (New Cairo)', ar: 'خريطة: مكتب مصر (القاهرة الجديدة)' },
    label: { en: 'New Cairo', ar: 'القاهرة الجديدة' }, sub: { en: 'Egypt Office', ar: 'مكتب مصر' },
  },
  'nasr-city': {
    xy: project(31.34, 30.056), zoom: 24,
    query: '2 Ahmed Hassan St., Ninth District, Nasr City, Cairo, Egypt',
    title: { en: 'Map: Egypt Office (Nasr City)', ar: 'خريطة: مكتب مصر (مدينة نصر)' },
    label: { en: 'Nasr City', ar: 'مدينة نصر' }, sub: { en: 'Egypt Office', ar: 'مكتب مصر' }, flip: true,
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
  const initialParam = getParam('office');
  let current = { ksa: 'ksa', egypt: 'new-cairo', 'new-cairo': 'new-cairo', 'nasr-city': 'nasr-city' }[initialParam] || 'ksa';

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
    el.innerHTML = `<span class="contact-pin__ring"></span><span class="contact-pin__ring contact-pin__ring--2"></span><span class="contact-pin__core"></span><span class="contact-pin__label"><b></b><small></small></span>`;
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

  // mini locator (coarse WORLD.dots) — shows the current window on the whole world
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
    // LED-style matrix: dot grid fixed in screen space (≈10px pitch), the land slides underneath
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
    // zoom out a little mid-flight when travelling between offices ("fly" feel)
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
  const renderToggle = () => {
    const label = $('[data-map-toggle-label]', toggle);
    label.textContent = t(root.classList.contains('is-dotview') ? S.showGoogle : S.showDots);
  };
  $('[data-map-load]', root)?.addEventListener('click', () => {
    store.set('mobco-contact-map', '1', 'session'); // explicit, per-session opt-in for this embed only
    loadMap();
    toast(S.mapLoaded, { type: 'info', duration: 2200 });
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

  /* --- tabs ↔ camera ↔ iframe */
  const select = (id, { immediate = false } = {}) => {
    if (!PLACES[id]) return;
    current = id;
    flyTo(id, immediate);
    setExt();
    if (iframe) { iframe.src = embedUrl(PLACES[id]); iframe.title = t(PLACES[id].title); }
  };
  root.addEventListener('tabchange', (e) => select(e.detail.id));
  if (current !== 'ksa') {
    // wait for core/ui.js to wire the tabs, then select without animation
    requestAnimationFrame(() => root.__selectTab?.(current));
  }
  select(current, { immediate: true });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-map-show]');
    if (!a) return;
    const id = a.getAttribute('data-map-show');
    if (root.__selectTab) root.__selectTab(id); else select(id);
  });
}

/* =====================================================================
   3. Project inquiry wizard
   ===================================================================== */
const STEP_NAMES = [
  { en: 'Project type', ar: 'نوع المشروع' },
  { en: 'Sector', ar: 'القطاع' },
  { en: 'Location & scope', ar: 'الموقع والنطاق' },
  { en: 'Your details', ar: 'بياناتك' },
  { en: 'Review & send', ar: 'المراجعة والإرسال' },
];
const SIZES = [
  { en: 'Not sure yet', ar: 'غير محدّدة بعد' },
  { en: 'Under 5,000 m²', ar: 'أقل من 5,000 م²' },
  { en: '5,000 – 20,000 m²', ar: '5,000 – 20,000 م²' },
  { en: '20,000 – 100,000 m²', ar: '20,000 – 100,000 م²' },
  { en: 'Over 100,000 m²', ar: 'أكثر من 100,000 م²' },
];
const SIZE_TICKS = [
  { en: 'Not sure', ar: 'غير محدد' },
  { en: '< 5k m²', ar: '< 5 آلاف م²' },
  { en: '5k – 20k', ar: '5 – 20 ألفًا' },
  { en: '20k – 100k', ar: '20 – 100 ألف' },
  { en: '100k+ m²', ar: '+100 ألف م²' },
];
// Indicative budget bands — client-side input options only (no company claim). SAR for KSA, USD elsewhere.
const BUDGETS = {
  sar: [
    { v: 'sar-1', en: 'Under SAR 10 million', ar: 'أقل من 10 ملايين ريال' },
    { v: 'sar-2', en: 'SAR 10 – 50 million', ar: '10 – 50 مليون ريال' },
    { v: 'sar-3', en: 'SAR 50 – 250 million', ar: '50 – 250 مليون ريال' },
    { v: 'sar-4', en: 'Over SAR 250 million', ar: 'أكثر من 250 مليون ريال' },
  ],
  usd: [
    { v: 'usd-1', en: 'Under USD 3 million', ar: 'أقل من 3 ملايين دولار' },
    { v: 'usd-2', en: 'USD 3 – 15 million', ar: '3 – 15 مليون دولار' },
    { v: 'usd-3', en: 'USD 15 – 70 million', ar: '15 – 70 مليون دولار' },
    { v: 'usd-4', en: 'Over USD 70 million', ar: 'أكثر من 70 مليون دولار' },
  ],
  common: [
    { v: 'tbd', en: 'Not defined yet', ar: 'لم تُحدَّد بعد' },
    { v: 'undisclosed', en: 'Prefer not to say', ar: 'أفضّل عدم الإفصاح' },
  ],
};
const OTHER_SECTOR = { id: 'other', icon: 'ellipsis', name: { en: 'Other sector', ar: 'قطاع آخر' } };
const STORE_KEY = 'mobco-inquiry';
const TOTAL = 5;

function initWizard() {
  const wizard = $('[data-wizard]');
  if (!wizard) return;
  const form = $('[data-wizard-form]', wizard);
  const steps = $$('[data-step]', form);
  const nextBtn = $('[data-wizard-next]', form);
  const nextLabel = $('[data-wizard-next-label]', nextBtn);
  const backBtn = $('[data-wizard-back]', form);
  const bar = $('[data-wizard-bar]', wizard);
  const count = $('[data-wizard-count]', wizard);
  const name = $('[data-wizard-name]', wizard);
  const live = $('[data-wizard-live]', wizard);
  const stepper = $$('[data-goto]');
  const success = $('[data-wizard-success]', wizard);
  const progress = $('.contact-wizard__progress', wizard);
  const budget = $('[data-wizard-budget]', form);
  const size = $('[data-wizard-size]', form);
  const sizeOut = $('[data-wizard-size-out]', form);
  const ticks = $('[data-size-ticks]', form);
  const message = $('#inq-message', form);
  const counter = $('[data-wizard-counter]', form);
  let step = 1, maxReached = 1, last = null;

  /* sector tiles from SECTORS (data-driven) */
  const sectorBox = $('[data-sector-tiles]', form);
  const sectors = [...SECTORS, OTHER_SECTOR];
  sectorBox.insertAdjacentHTML('beforeend', sectors.map((s) => `
    <label class="contact-tile">
      <input class="contact-tile__input" type="radio" name="sector" value="${esc(s.id)}" required data-error="Please choose a sector." data-ar-error="يُرجى اختيار القطاع.">
      <span class="contact-tile__box">
        <span class="contact-tile__icon">${icon(s.icon)}</span>
        <span class="contact-tile__title" data-sector-name="${esc(s.id)}">${esc(t(s.name))}</span>
        <span class="contact-tile__check" aria-hidden="true">${icon('check')}</span>
      </span>
    </label>`).join(''));
  const renderSectorNames = () => sectors.forEach((s) => { const el = $(`[data-sector-name="${s.id}"]`, sectorBox); if (el) el.textContent = t(s.name); });

  /* budget options depend on region (currency) */
  const currency = () => (form.elements.region?.value === 'ksa' ? 'sar' : 'usd');
  const renderBudget = () => {
    const prev = budget.value;
    const cur = currency();
    let keep = prev;
    const m = /^(sar|usd)-(\d)$/.exec(prev);
    if (m && m[1] !== cur) keep = `${cur}-${m[2]}`; // same tier in the other currency
    const opts = [{ v: '', en: S.chooseRange.en, ar: S.chooseRange.ar }, ...BUDGETS[cur], ...BUDGETS.common];
    budget.innerHTML = opts.map((o) => `<option value="${o.v}">${esc(t(o))}</option>`).join('');
    budget.value = opts.some((o) => o.v === keep) ? keep : '';
  };

  /* size range: band label in the output + aria-valuetext */
  const renderSize = () => {
    const i = parseInt(size.value, 10) || 0;
    sizeOut.textContent = t(SIZES[i]);
    size.setAttribute('aria-valuetext', t(SIZES[i]));
    ticks.innerHTML = SIZE_TICKS.map((tk, j) => `<span class="${j === i ? 'is-on' : ''}">${esc(t(tk))}</span>`).join('');
  };
  size.addEventListener('input', renderSize);

  const renderCounter = () => {
    const n = message.value.length, max = parseInt(message.getAttribute('maxlength'), 10) || 1500;
    counter.textContent = `${n} / ${max}`;
    counter.parentElement.classList.toggle('is-near', n > max * 0.9);
  };
  message.addEventListener('input', renderCounter);

  /* persistence (sessionStorage) */
  const snapshot = () => {
    const values = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === 'radio') { if (el.checked) values[el.name] = el.value; }
      else if (el.type === 'checkbox') values[el.name] = el.checked;
      else values[el.name] = el.value;
    }
    return values;
  };
  const save = debounce(() => {
    if (!success.hidden) return;
    store.set(STORE_KEY, JSON.stringify({ step, maxReached, values: snapshot() }), 'session');
  }, 120);
  const restore = () => {
    let data = null;
    try { data = JSON.parse(store.get(STORE_KEY, 'session') || 'null'); } catch { data = null; }
    if (!data?.values) return false;
    const v = data.values;
    for (const el of form.elements) {
      if (!el.name || !(el.name in v)) continue;
      if (el.type === 'radio') el.checked = el.value === v[el.name];
      else if (el.type === 'checkbox') el.checked = !!v[el.name];
      else if (el.tagName !== 'SELECT') el.value = v[el.name];
    }
    renderBudget();
    if (v.budget) budget.value = v.budget;
    maxReached = Math.min(TOTAL, Math.max(1, parseInt(data.maxReached, 10) || 1));
    step = Math.min(maxReached, Math.max(1, parseInt(data.step, 10) || 1));
    return Object.keys(v).some((k) => v[k] && !['reply', 'size'].includes(k) && v[k] !== '0');
  };

  /* labels of the current selections (read from the DOM so they follow the language) */
  const checkedText = (nm, sel) => {
    const input = form.querySelector(`input[name="${nm}"]:checked`);
    return input ? (input.closest('label').querySelector(sel)?.textContent || '').trim() : '';
  };
  const values = () => {
    const f = form.elements;
    return {
      type: checkedText('type', '.contact-tile__title'),
      sector: checkedText('sector', '.contact-tile__title'),
      region: f.region?.value || '',
      regionText: checkedText('region', '.contact-pill__box'),
      city: f.city.value.trim(),
      size: t(SIZES[parseInt(size.value, 10) || 0]),
      budget: budget.value ? budget.options[budget.selectedIndex].textContent : '',
      timeline: checkedText('timeline', '.contact-pill__box'),
      name: f.name.value.trim(),
      company: f.company.value.trim(),
      email: f.email.value.trim(),
      phone: f.phone.value.trim(),
      reply: checkedText('reply', '.contact-pill__box'),
      message: f.message.value.trim(),
    };
  };
  const routeOf = (region) => (region === 'egypt' ? 'egypt' : 'ksa');

  const FIELDS = [
    { k: 'type', step: 1, label: { en: 'Project type', ar: 'نوع المشروع' } },
    { k: 'sector', step: 2, label: { en: 'Sector', ar: 'القطاع' } },
    { k: 'location', step: 3, label: { en: 'Location', ar: 'الموقع' } },
    { k: 'size', step: 3, label: { en: 'Built-up area', ar: 'المساحة المبنية' } },
    { k: 'budget', step: 3, label: { en: 'Indicative budget', ar: 'الميزانية التقديرية' } },
    { k: 'timeline', step: 3, label: { en: 'Timeline', ar: 'الإطار الزمني' } },
    { k: 'name', step: 4, label: { en: 'Name', ar: 'الاسم' } },
    { k: 'company', step: 4, label: { en: 'Company', ar: 'الشركة' } },
    { k: 'email', step: 4, label: { en: 'Email', ar: 'البريد الإلكتروني' } },
    { k: 'phone', step: 4, label: { en: 'Phone', ar: 'الهاتف' } },
    { k: 'reply', step: 4, label: { en: 'Preferred contact', ar: 'وسيلة التواصل المفضّلة' } },
    { k: 'message', step: 4, label: { en: 'Project description', ar: 'وصف المشروع' } },
  ];
  const fieldValue = (v, k) => (k === 'location' ? [v.regionText, v.city].filter(Boolean).join(' — ') : v[k]);

  const renderReview = () => {
    const v = values();
    $('[data-wizard-review]', form).innerHTML = FIELDS.map((f) => {
      const val = fieldValue(v, f.k);
      const ltr = ['email', 'phone'].includes(f.k) ? ' dir="ltr"' : '';
      return `<div class="contact-review__row"><dt>${esc(t(f.label))}</dt>` +
        `<dd class="${val ? '' : 'is-empty'}"${ltr}>${esc(val || t(S.notProvided))}</dd>` +
        `<button class="contact-review__edit" type="button" data-edit="${f.step}" aria-label="${esc(`${t(S.edit)}: ${t(f.label)}`)}">${icon('pencil-ruler')}<span>${esc(t(S.edit))}</span></button></div>`;
    }).join('');
    const r = routeOf(v.region);
    const tpl = v.region === 'other' ? S.routeOther : S.route;
    $('[data-wizard-route-text]', form).innerHTML = fmt(t(tpl), { office: esc(t(r === 'egypt' ? S.officeEgypt : S.officeKsa)), email: esc(EMAIL[r]) });
  };

  /* step navigation */
  const render = ({ focus = false, dir = 0 } = {}) => {
    steps.forEach((s) => {
      const on = parseInt(s.dataset.step, 10) === step;
      s.hidden = !on;
      s.classList.remove('is-entering', 'is-back');
      if (on && dir && !prefersReducedMotion()) { void s.offsetWidth; s.classList.add('is-entering'); if (dir < 0) s.classList.add('is-back'); }
    });
    bar.querySelector('span').style.setProperty('--progress', String(step / TOTAL));
    bar.setAttribute('aria-valuenow', String(step));
    bar.setAttribute('aria-valuetext', `${fmt(t(S.stepOf), { n: step, total: TOTAL })}: ${t(STEP_NAMES[step - 1])}`);
    count.textContent = `${pad2(step)} / ${pad2(TOTAL)}`;
    name.textContent = t(STEP_NAMES[step - 1]);
    backBtn.hidden = step === 1;
    nextLabel.textContent = t(step === TOTAL ? S.send : S.continue);
    $('use', nextBtn)?.setAttribute('href', `assets/icons/sprite.svg#${step === TOTAL ? 'send' : 'arrow-right'}`);
    stepper.forEach((b) => {
      const n = parseInt(b.dataset.goto, 10);
      b.disabled = n > maxReached;
      b.classList.toggle('is-done', n < step || (n <= maxReached && n !== step));
      if (n === step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    if (step === TOTAL) renderReview();
    if (focus) {
      const title = $('.contact-step__title', steps[step - 1]);
      const top = wizard.getBoundingClientRect().top;
      const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72;
      if (top < headerH || top > window.innerHeight * 0.6) scrollTo(wizard, { offset: -(headerH + 24) });
      title?.focus({ preventScroll: true });
      live.textContent = `${fmt(t(S.stepOf), { n: step, total: TOTAL })}: ${t(STEP_NAMES[step - 1])}`;
    }
    save();
  };
  const stepEl = (n) => steps[n - 1];
  const go = (n, opts = {}) => {
    const target = Math.max(1, Math.min(TOTAL, n));
    const dir = target > step ? 1 : target < step ? -1 : 0;
    step = target;
    maxReached = Math.max(maxReached, step);
    render({ focus: true, dir, ...opts });
  };
  const validateStep = (n) => validateForm(stepEl(n));
  const next = () => {
    if (!validateStep(step)) {
      live.textContent = t(S.fixStep);
      return;
    }
    go(step + 1);
  };

  // Intercept submit before core/ui.js (capture phase): Enter / Continue advance one step at a time.
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (step < TOTAL) next();
    else submit();
  }, true);
  backBtn.addEventListener('click', () => go(step - 1));
  stepper.forEach((b) => b.addEventListener('click', () => {
    const n = parseInt(b.dataset.goto, 10);
    if (n <= maxReached && success.hidden) go(n);
  }));
  form.addEventListener('click', (e) => {
    const ed = e.target.closest('[data-edit]');
    if (ed) go(parseInt(ed.dataset.edit, 10));
  });
  // Radio groups: core validates the changed radio only → clear stale state on its siblings.
  form.addEventListener('change', (e) => {
    const el = e.target;
    if (el.type === 'radio') {
      $$(`input[name="${CSS.escape(el.name)}"]`, form).forEach((r) => { if (r !== el) { r.__rule = null; r.removeAttribute('aria-invalid'); } });
      if (el.name === 'region') renderBudget();
    }
    save();
  });
  form.addEventListener('input', save);
  // Selecting a tile with the mouse on steps 1–2 moves on automatically (keyboard users press Enter).
  form.addEventListener('click', (e) => {
    const tile = e.target.closest('.contact-tile');
    if (!tile || e.detail === 0) return; // e.detail 0 = keyboard-generated click
    const at = step;
    if (at <= 2) setTimeout(() => { if (step === at && success.hidden && form.querySelector(`[data-step="${at}"] input:checked`)) go(at + 1); }, prefersReducedMotion() ? 0 : 280);
  });

  /* submit → mailto + success */
  const makeRef = (r) => {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const rnd = new Uint8Array(4);
    (window.crypto || {}).getRandomValues?.(rnd);
    const code = Array.from(rnd, (b) => A[b % A.length]).join('');
    const d = new Date();
    return `MOB-${r === 'egypt' ? 'EGY' : 'KSA'}-${String(d.getFullYear()).slice(2)}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${code}`;
  };
  const buildText = (v, ref, msgOverride) => {
    const L = (en, ar) => t({ en, ar });
    const d = new Date();
    const lines = [
      L('MOBCO Group — Project inquiry', 'مجموعة موبكو — طلب مشروع'),
      `${L('Reference', 'الرقم المرجعي')}: ${ref}`,
      `${L('Date', 'التاريخ')}: ${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
      '',
      ...FIELDS.filter((f) => f.k !== 'message').map((f) => `${t(f.label)}: ${fieldValue(v, f.k) || '—'}`),
      '',
      `${L('Project description', 'وصف المشروع')}:`,
      msgOverride ?? v.message,
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
    for (let n = 1; n < TOTAL; n++) {
      if (!validateStep(n)) { go(n); validateStep(n); live.textContent = t(S.fixStep); return; }
    }
    const v = values();
    const r = routeOf(v.region);
    const ref = makeRef(r);
    const to = EMAIL[r];
    const subject = `${t({ en: 'Project inquiry', ar: 'طلب مشروع' })} ${ref} — ${v.type}${v.company ? ` / ${v.company}` : ''}`;
    const full = buildText(v, ref);
    let body = full, truncated = false;
    const MAX = 1800; // conservative mailto: length for desktop mail clients
    const mk = (b) => `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(b)}`;
    if (mk(body).length > MAX) {
      truncated = true;
      let msg = v.message;
      while (msg.length > 40 && mk(buildText(v, ref, `${msg}…`)).length > MAX) msg = msg.slice(0, Math.floor(msg.length * 0.85));
      body = buildText(v, ref, `${msg}… [${t({ en: 'full text on your clipboard — please paste', ar: 'النص الكامل في الحافظة — يُرجى لصقه' })}]`);
      await copyText(full);
    }
    last = { ref, to, href: mk(body), text: full, region: r };
    openMail(last.href);
    showSuccess(truncated);
  };
  const renderSuccess = (truncated = false) => {
    if (!last) return;
    $('[data-success-text]', success).innerHTML = fmt(t(S.successText), { email: esc(last.to) }) + (truncated ? ` ${esc(t(S.truncated))}` : '');
    $('[data-success-ref]', success).textContent = last.ref;
    $('[data-success-alt]', success).textContent = fmt(t(S.successAlt), { email: last.to });
  };
  const showSuccess = (truncated) => {
    renderSuccess(truncated);
    form.hidden = true;
    progress.hidden = true;
    success.hidden = false;
    stepper.forEach((b) => { b.disabled = true; b.classList.add('is-done'); b.removeAttribute('aria-current'); });
    store.remove(STORE_KEY, 'session');
    live.textContent = fmt(t(S.ready), { ref: last.ref });
    scrollTo(wizard, { offset: -((parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72) + 24) });
    success.focus({ preventScroll: true });
  };
  $('[data-success-mail]', success).addEventListener('click', () => last && openMail(last.href));
  $('[data-success-copy]', success).addEventListener('click', async (e) => {
    if (!last) return;
    const ok = await copyText(last.text);
    toast(ok ? S.copiedInquiry : { en: 'Could not copy — please copy manually', ar: 'تعذّر النسخ، يُرجى النسخ يدويًا' }, { type: ok ? 'success' : 'error', duration: 2600 });
    e.currentTarget?.classList?.add('is-copied');
  });
  $('[data-success-copy-ref]', success).addEventListener('click', async (e) => {
    if (!last) return;
    const btn = e.currentTarget;
    const ok = await copyText(last.ref);
    toast(ok ? S.copiedRef : { en: 'Could not copy — please copy manually', ar: 'تعذّر النسخ، يُرجى النسخ يدويًا' }, { type: ok ? 'success' : 'error', duration: 2600 });
    btn.classList.add('is-copied');
    setTimeout(() => btn.classList.remove('is-copied'), 1600);
  });
  $('[data-success-reset]', success).addEventListener('click', () => {
    form.reset();
    last = null;
    success.hidden = true;
    form.hidden = false;
    progress.hidden = false;
    step = 1; maxReached = 1;
    setTimeout(() => { renderBudget(); renderSize(); renderCounter(); render({ focus: true }); });
  });

  onLang(() => {
    renderSectorNames();
    renderBudget();
    renderSize();
    if (last && !success.hidden) renderSuccess();
    if (success.hidden) render();
  });

  // init
  renderBudget();
  const restored = restore();
  renderSize();
  renderCounter();
  render();
  if (restored) toast(S.restored, { type: 'info', duration: 3000 });
}

/* =====================================================================
   4. General enquiries — quick form → mailto
   ===================================================================== */
function initQuickForm() {
  const form = $('[data-quickform]');
  if (!form) return;
  const note = $('[data-quickform-note]', form);
  const done = $('[data-quickform-success]');
  const doneText = $('[data-quickform-success-text]', done);
  let lastTo = '';
  const target = () => {
    const office = form.elements.office.value === 'egypt' ? 'egypt' : 'ksa';
    return form.elements.topic.value === 'careers' ? CAREERS_EMAIL[office] : EMAIL[office];
  };
  const renderNote = () => { note.textContent = fmt(t(S.quickNote), { email: target() }); };
  form.addEventListener('change', (e) => { if (['topic', 'office'].includes(e.target.name)) renderNote(); });
  form.addEventListener('validsubmit', (e) => {
    e.preventDefault(); // keep core from toasting/resetting — we hand off to the mail app instead
    const { data } = e.detail;
    const to = target();
    lastTo = to;
    const topic = form.elements.topic.options[form.elements.topic.selectedIndex].textContent.trim();
    const subject = `${topic} — ${t({ en: 'Website enquiry', ar: 'استفسار عبر الموقع' })} — ${data.name}`;
    const body = `${data.message}\n\n— ${data.name}\n${data.email}`;
    const a = document.createElement('a');
    a.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.slice(0, 1400))}`;
    document.body.appendChild(a); a.click(); a.remove();
    doneText.textContent = fmt(t(S.quickDone), { email: to });
    form.hidden = true;
    done.hidden = false;
    done.focus({ preventScroll: true });
    toast(S.quickToast, { type: 'success', duration: 3200 });
  });
  $('[data-quickform-reset]', done).addEventListener('click', () => {
    form.reset();
    done.hidden = true;
    form.hidden = false;
    setTimeout(renderNote);
    form.elements.name.focus();
  });
  onLang(() => { renderNote(); if (!done.hidden) doneText.textContent = fmt(t(S.quickDone), { email: lastTo }); });
  renderNote();
}

/* =====================================================================
   5. Office card "View on map" flash + hero chip to the wizard
   ===================================================================== */
function initMisc() {
  document.addEventListener('click', (e) => {
    const toMap = e.target.closest('[data-map-show]');
    if (toMap) {
      const stage = $('[data-map-stage]');
      stage?.classList.remove('is-flash');
      void stage?.offsetWidth;
      stage?.classList.add('is-flash');
    }
  });
}

/* =====================================================================
   6. Deep links (#inquiry, #map…): re-align once fonts/layout have settled
   ===================================================================== */
// core/motion.js jumps to the hash ~60ms after init; web fonts can still shift the layout afterwards.
function initDeepLink() {
  if (!location.hash || location.hash.length < 2) return;
  let target = null;
  try { target = document.querySelector(decodeURIComponent(location.hash)); } catch { return; }
  if (!target) return;
  let touched = false;
  const mark = () => { touched = true; };
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((ev) => window.addEventListener(ev, mark, { once: true, passive: true }));
  const realign = () => { if (!touched) scrollTo(target, { immediate: true }); };
  window.addEventListener('load', () => (document.fonts?.ready || Promise.resolve()).then(() => setTimeout(realign, 120)), { once: true });
}

/* ===================================================================== boot */
for (const [name, fn] of [['clocks', initClocks], ['map', initMap], ['wizard', initWizard], ['quickform', initQuickForm], ['misc', initMisc], ['deeplink', initDeepLink]]) {
  try { fn(); } catch (err) { console.error(`[contact] ${name} failed`, err); }
}
