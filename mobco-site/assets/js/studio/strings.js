// MOBCO 3D Studio — strings.js
// Every UI string rendered from JS, as { en, ar }. Render with t() from core/i18n.js; fmt() fills {tokens}.

export const fmt = (s, vars = {}) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));

export const S = {
  studio: { en: '3D Project Studio', ar: 'الاستوديو ثلاثي الأبعاد' },
  modelOf: { en: 'Model {n} / {total}', ar: 'النموذج {n} / {total}' },
  illustrative: { en: 'Illustrative massing model — not to scale', ar: 'نموذج كتلي توضيحي — ليس بمقياس رسم' },
  illustrativeShort: { en: 'Illustrative model', ar: 'نموذج توضيحي' },
  seeProject: { en: 'See the project', ar: 'استعرض المشروع' },
  relatedProject: { en: 'Related project', ar: 'المشروع المرتبط' },
  atAGlance: { en: 'At a glance', ar: 'لمحة سريعة' },
  loading: { en: 'Loading model', ar: 'جارٍ تحميل النموذج' },
  loadingEngine: { en: 'Preparing the studio', ar: 'جارٍ تجهيز الاستوديو' },
  loaded: { en: 'Model loaded: {name}', ar: 'تم تحميل النموذج: {name}' },
  canvasLabel: {
    en: 'Interactive 3D illustrative model of {name}. Drag to orbit, scroll to zoom, arrow keys to pan.',
    ar: 'نموذج توضيحي تفاعلي ثلاثي الأبعاد لـ{name}. اسحب للدوران، ومرّر للتكبير، واستخدم مفاتيح الأسهم للتحريك.',
  },
  // views
  view: { en: 'View', ar: 'زاوية العرض' },
  aerial: { en: 'Aerial', ar: 'جوي' },
  street: { en: 'Street', ar: 'الشارع' },
  top: { en: 'Plan', ar: 'مسقط' },
  front: { en: 'Front', ar: 'واجهة' },
  // modes
  render: { en: 'Render', ar: 'نمط العرض' },
  realistic: { en: 'Realistic', ar: 'واقعي' },
  clay: { en: 'Clay', ar: 'مجسّم' },
  blueprint: { en: 'Blueprint', ar: 'مخطط' },
  xray: { en: 'X-ray', ar: 'شفاف' },
  // sliders
  explode: { en: 'Explode levels', ar: 'تفكيك الطوابق' },
  section: { en: 'Section cut', ar: 'مقطع أفقي' },
  sectionOff: { en: 'Off', ar: 'متوقف' },
  sectionAt: { en: '{n}% height', ar: '{n}% من الارتفاع' },
  time: { en: 'Time of day', ar: 'وقت اليوم' },
  timeFlat: { en: 'Time of day applies to the Realistic and Clay modes.', ar: 'يُطبَّق وقت اليوم على نمطَي العرض الواقعي والمجسّم.' },
  am: { en: 'AM', ar: 'ص' },
  pm: { en: 'PM', ar: 'م' },
  // toggles
  autorotate: { en: 'Auto-rotate', ar: 'دوران تلقائي' },
  hotspots: { en: 'Points of interest', ar: 'نقاط الاهتمام' },
  isolate: { en: 'Isolate a level', ar: 'عزل طابق' },
  levelN: { en: 'Level {n}', ar: 'الطابق {n}' },
  levelOf: { en: '{n} of {total}', ar: '{n} من {total}' },
  showAll: { en: 'Show all levels', ar: 'عرض جميع الطوابق' },
  prevLevel: { en: 'Previous level', ar: 'الطابق السابق' },
  nextLevel: { en: 'Next level', ar: 'الطابق التالي' },
  levelSelected: { en: '{label} isolated', ar: 'تم عزل {label}' },
  levelHint: { en: 'Click a level to isolate it', ar: 'انقر على طابق لعزله' },
  noLevels: { en: 'This model has no separable levels.', ar: 'لا يحتوي هذا النموذج على طوابق قابلة للفصل.' },
  // toolbar
  screenshot: { en: 'Save a screenshot', ar: 'حفظ لقطة للشاشة' },
  screenshotSaved: { en: 'Screenshot saved', ar: 'تم حفظ اللقطة' },
  screenshotCaption: { en: 'MOBCO Group · 3D Project Studio', ar: 'مجموعة موبكو · الاستوديو ثلاثي الأبعاد' },
  fullscreen: { en: 'Full screen', ar: 'ملء الشاشة' },
  exitFullscreen: { en: 'Exit full screen', ar: 'الخروج من ملء الشاشة' },
  reset: { en: 'Reset the view', ar: 'إعادة ضبط العرض' },
  help: { en: 'Controls and shortcuts', ar: 'عناصر التحكم والاختصارات' },
  showControls: { en: 'Show controls', ar: 'إظهار عناصر التحكم' },
  hideControls: { en: 'Hide controls', ar: 'إخفاء عناصر التحكم' },
  // hints
  hintMouse: { en: 'Drag to orbit · Click a level · Double-click to focus', ar: 'اسحب للدوران · انقر على طابق · انقر مرتين للتركيز' },
  hintTouch: { en: 'Drag to orbit · Pinch to zoom · Tap a level', ar: 'اسحب للدوران · قرّب بإصبعين للتكبير · المس طابقًا' },
  zoomHint: { en: 'Click the model first, or hold Ctrl and scroll, to zoom', ar: 'انقر على النموذج أولًا، أو اضغط Ctrl مع التمرير، للتكبير' },
  // states
  errorTitle: { en: 'This model is not available yet', ar: 'هذا النموذج غير متاح بعد' },
  errorText: { en: 'It may still be in preparation. Try again, or explore another model from the library.', ar: 'قد يكون قيد الإعداد. أعد المحاولة، أو استكشف نموذجًا آخر من المكتبة.' },
  retry: { en: 'Try again', ar: 'إعادة المحاولة' },
  nextModel: { en: 'Next model', ar: 'النموذج التالي' },
  noWebglTitle: { en: 'Interactive 3D is not available on this device', ar: 'العرض التفاعلي ثلاثي الأبعاد غير متاح على هذا الجهاز' },
  noWebglText: {
    en: 'Your browser could not start WebGL 2, so we are showing the project imagery instead. You can still browse the models and their details.',
    ar: 'تعذّر على متصفحك تشغيل تقنية WebGL 2، لذا نعرض صور المشروع بدلًا من ذلك. ويمكنك مع ذلك تصفّح النماذج وتفاصيلها.',
  },
  contextLost: { en: 'The 3D view was paused by the browser. Reload the page to continue.', ar: 'أوقف المتصفح العرض ثلاثي الأبعاد مؤقتًا. أعد تحميل الصفحة للمتابعة.' },
  close: { en: 'Close', ar: 'إغلاق' },
  hotspotLabel: { en: 'Point of interest {n}: {title}', ar: 'نقطة اهتمام {n}: {title}' },
  openInStudio: { en: 'Open in the studio', ar: 'افتح في الاستوديو' },
  viewing: { en: 'Now viewing', ar: 'المعروض الآن' },
  thumbAlt: { en: 'Rendered preview of the {name} model', ar: 'معاينة مُصيَّرة لنموذج {name}' },
};
