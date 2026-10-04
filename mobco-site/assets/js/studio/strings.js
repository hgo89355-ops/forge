// MOBCO Explore in 3D · strings.js
// Every UI string rendered from JS, as { en, ar }. Render with t() from core/i18n.js; fmt() fills {tokens}.

export const fmt = (s, vars = {}) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));

export const S = {
  studio: { en: 'Explore in 3D', ar: 'استكشف بتقنية ثلاثية الأبعاد' },
  illustrative: { en: 'Illustrative model, not to scale.', ar: 'نموذج توضيحي، ليس بمقياس رسم.' },
  seeProject: { en: 'See the project', ar: 'استعرض المشروع' },
  loading: { en: 'Loading model', ar: 'جارٍ تحميل النموذج' },
  loaded: { en: 'Model loaded: {name}', ar: 'تم تحميل النموذج: {name}' },
  canvasLabel: {
    en: 'Interactive 3D model of {name}. The arrow keys move the view.',
    ar: 'نموذج تفاعلي ثلاثي الأبعاد لـ{name}. حرّك العرض بمفاتيح الأسهم.',
  },
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
  screenshotCaption: { en: 'MOBCO Group · Explore in 3D', ar: 'مجموعة موبكو · تجوّل ثلاثي الأبعاد' },
  fullscreen: { en: 'Full screen', ar: 'ملء الشاشة' },
  exitFullscreen: { en: 'Exit full screen', ar: 'الخروج من ملء الشاشة' },
  reset: { en: 'Reset view', ar: 'إعادة ضبط العرض' },
  showControls: { en: 'Show view options', ar: 'إظهار خيارات العرض' },
  hideControls: { en: 'Hide view options', ar: 'إخفاء خيارات العرض' },
  zoomIn: { en: 'Zoom in', ar: 'تكبير' },
  zoomOut: { en: 'Zoom out', ar: 'تصغير' },
  // hints
  zoomHint: { en: 'Click the model, then scroll to zoom', ar: 'انقر على النموذج ثم مرّر للتكبير' },
  // states
  contextLost: { en: 'The browser paused the 3D view. Reload the page to continue.', ar: 'أوقف المتصفح العرض ثلاثي الأبعاد مؤقتًا. أعد تحميل الصفحة للمتابعة.' },
  close: { en: 'Close', ar: 'إغلاق' },
  hotspotLabel: { en: 'Highlight {n}: {title}', ar: 'عنصر بارز {n}: {title}' },
  hotspotNum: { en: 'Highlight {n}', ar: 'العنصر {n}' },
  openInStudio: { en: 'Open in 3D', ar: 'افتح بالأبعاد الثلاثية' },
};
