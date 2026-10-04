// MOBCO Project Builder · strings.js
// Every UI string rendered from JS, as { en, ar }. Render with t() from core/i18n.js; fmt() fills {tokens}.

export const fmt = (s, vars = {}) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));

export const S = {
  studio: { en: 'Project Builder', ar: 'مصمّم المشاريع' },
  illustrative: { en: 'Illustrative model, not to scale.', ar: 'نموذج توضيحي، ليس بمقياس رسم.' },
  concept: { en: 'Concept sketch, not to scale.', ar: 'رسم مبدئي، ليس بمقياس رسم.' },
  seeProject: { en: 'See the project', ar: 'استعرض المشروع' },
  loading: { en: 'Loading model', ar: 'جارٍ تحميل النموذج' },
  loaded: { en: 'Model loaded: {name}', ar: 'تم تحميل النموذج: {name}' },
  updated: { en: 'Sketch updated', ar: 'تم تحديث الرسم' },
  canvasLabel: {
    en: 'Interactive 3D model of {name}. The arrow keys move the view.',
    ar: 'نموذج تفاعلي ثلاثي الأبعاد لـ{name}. حرّك العرض بمفاتيح الأسهم.',
  },
  yourProject: { en: 'Your project', ar: 'مشروعك' },
  // light
  day: { en: 'Day', ar: 'نهار' },
  sunset: { en: 'Sunset', ar: 'غروب' },
  night: { en: 'Night', ar: 'ليل' },
  // floors chip
  levelN: { en: 'Floor {n}', ar: 'الطابق {n}' },
  levelOf: { en: '{n} of {total}', ar: '{n} من {total}' },
  showAll: { en: 'Show all floors', ar: 'عرض جميع الطوابق' },
  prevLevel: { en: 'Previous floor', ar: 'الطابق السابق' },
  nextLevel: { en: 'Next floor', ar: 'الطابق التالي' },
  levelSelected: { en: 'Showing {label}', ar: 'يُعرض الآن: {label}' },
  // toolbar
  screenshot: { en: 'Save image', ar: 'حفظ صورة' },
  screenshotSaved: { en: 'Image saved', ar: 'تم حفظ الصورة' },
  screenshotCaption: { en: 'MOBCO Group · Project Builder', ar: 'مجموعة موبكو · مصمّم المشاريع' },
  fullscreen: { en: 'Full screen', ar: 'ملء الشاشة' },
  exitFullscreen: { en: 'Exit full screen', ar: 'الخروج من ملء الشاشة' },
  reset: { en: 'Reset view', ar: 'إعادة ضبط العرض' },
  showControls: { en: 'Show view options', ar: 'إظهار خيارات العرض' },
  hideControls: { en: 'Hide view options', ar: 'إخفاء خيارات العرض' },
  zoomIn: { en: 'Zoom in', ar: 'تكبير' },
  zoomOut: { en: 'Zoom out', ar: 'تصغير' },
  // hints
  hintMouse: { en: 'Drag to rotate', ar: 'اسحب للتدوير' },
  zoomHint: { en: 'Click the model, then scroll to zoom', ar: 'انقر على النموذج ثم مرّر للتكبير' },
  // states
  contextLost: { en: 'The browser paused the 3D view. Reload the page to continue.', ar: 'أوقف المتصفح العرض ثلاثي الأبعاد مؤقتًا. أعد تحميل الصفحة للمتابعة.' },
  close: { en: 'Close', ar: 'إغلاق' },
  hotspotLabel: { en: 'Highlight {n}: {title}', ar: 'عنصر بارز {n}: {title}' },
  hotspotNum: { en: 'Highlight {n}', ar: 'العنصر {n}' },
  openInStudio: { en: 'Open in 3D', ar: 'افتح بالأبعاد الثلاثية' },
  // builder summary words
  types: {
    office: { en: 'Office', ar: 'مبنى مكاتب' },
    residential: { en: 'Residential tower', ar: 'برج سكني' },
    villa: { en: 'Villa', ar: 'فيلا' },
    mixed: { en: 'Mixed-use', ar: 'مبنى متعدد الاستخدامات' },
    school: { en: 'School', ar: 'مدرسة' },
  },
  sizes: {
    s: { en: 'small footprint', ar: 'مساحة أرض صغيرة' },
    m: { en: 'medium footprint', ar: 'مساحة أرض متوسطة' },
    l: { en: 'large footprint', ar: 'مساحة أرض كبيرة' },
  },
  facades: {
    glass: { en: 'glass facade', ar: 'واجهة زجاجية' },
    stone: { en: 'stone facade', ar: 'واجهة حجرية' },
    render: { en: 'white render facade', ar: 'واجهة بلياسة بيضاء' },
    brick: { en: 'brick facade', ar: 'واجهة من الطوب' },
  },
  colours: {
    indigo: { en: 'indigo', ar: 'النيلي' },
    teal: { en: 'teal', ar: 'الفيروزي' },
    sand: { en: 'sand', ar: 'الرملي' },
    charcoal: { en: 'charcoal', ar: 'الفحمي' },
  },
  inColour: { en: '{facade} with {colour} details', ar: '{facade} بتفاصيل باللون {colour}' },
  extras: {
    terrace: { en: 'roof terrace', ar: 'تراس على السطح' },
    solar: { en: 'solar panels', ar: 'ألواح شمسية' },
    pool: { en: 'pool', ar: 'مسبح' },
    landscape: { en: 'landscaping', ar: 'تنسيق حدائق' },
    parking: { en: 'parking', ar: 'مواقف سيارات' },
  },
  floorsOne: { en: '1 floor', ar: 'طابق واحد' },
  floorsMany: { en: '{n} floors', ar: '{n} طوابق' },
  briefLead: { en: 'Project Builder sketch.', ar: 'رسم من مصمّم المشاريع.' },
  shuffled: { en: 'New idea loaded', ar: 'فكرة جديدة' },
};

/** "8 floors" / Arabic number agreement (2 → طابقان, 3 to 10 → طوابق, 11+ → طابقًا). */
export function floorsText(n, lang) {
  if (lang === 'ar') {
    if (n === 1) return 'طابق واحد';
    if (n === 2) return 'طابقان';
    if (n >= 3 && n <= 10) return `${n} طوابق`;
    return `${n} طابقًا`;
  }
  return n === 1 ? '1 floor' : `${n} floors`;
}
