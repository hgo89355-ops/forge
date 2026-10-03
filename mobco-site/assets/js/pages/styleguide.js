// styleguide.js — demo wiring for the living component gallery.
import { t } from '../core/i18n.js';
import { toast, openLightbox } from '../core/ui.js';
import { $, $$, esc, icon } from '../core/utils.js';
import { PROJECTS } from '../data/site-data.js';

// Icon grid: list every <symbol> in the sprite (click copies the name)
const iconMount = $('[data-sg-icons]');
if (iconMount) {
  fetch('assets/icons/sprite.svg')
    .then((r) => r.text())
    .then((svg) => {
      const ids = [...svg.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]);
      iconMount.innerHTML = ids.map((id) => `<button type="button" class="sg-icon" data-copy="${esc(id)}" aria-label="${esc(id)}">${icon(id)}<span>${esc(id)}</span></button>`).join('');
      const count = $('[data-sg-icon-count]');
      if (count) count.textContent = String(ids.length);
    })
    .catch(() => { iconMount.textContent = 'Could not load sprite.'; });
}

// Toast demos
$$('[data-sg-toast]').forEach((btn) => btn.addEventListener('click', () => {
  const type = btn.getAttribute('data-sg-toast');
  const msgs = {
    success: { en: 'Your inquiry has been prepared.', ar: 'تم تجهيز استفسارك.' },
    info: { en: 'Heads up: models in the 3D Studio are illustrative.', ar: 'تنبيه: نماذج الاستوديو ثلاثي الأبعاد توضيحية.' },
    warning: { en: 'Some fields still need your attention.', ar: 'بعض الحقول لا تزال بحاجة إلى مراجعتك.' },
    error: { en: 'Something went wrong. Please try again.', ar: 'حدث خطأ ما، يُرجى المحاولة مرة أخرى.' },
  };
  toast(msgs[type], { type });
}));

// Programmatic lightbox demo (all project galleries)
$('[data-sg-lightbox]')?.addEventListener('click', () => {
  const items = PROJECTS.map((p) => ({
    src: `assets/img/${p.image}.jpg`, srcWebp: `assets/img/${p.image}.webp`,
    alt: p.name, caption: { en: `${p.name.en} — ${p.typology.en}`, ar: `${p.name.ar} — ${p.typology.ar}` },
  }));
  openLightbox(items, 0);
});

// Form demo: show the serialized payload
const form = $('[data-sg-form]');
form?.addEventListener('validsubmit', (e) => {
  const out = $('[data-sg-form-output]');
  if (out) { out.hidden = false; out.querySelector('code').textContent = JSON.stringify(e.detail.data, null, 2); }
  toast({ en: 'Valid — payload serialised below.', ar: 'البيانات صحيحة — تظهر أدناه.' });
});
$('[data-sg-chips]')?.addEventListener('chipchange', (e) => {
  const out = $('[data-sg-chip-output]');
  if (out) out.textContent = e.detail.values.join(', ');
});
document.addEventListener('langchange', () => { const c = $('[data-sg-lang]'); if (c) c.textContent = t({ en: 'English (LTR)', ar: 'العربية (من اليمين لليسار)' }); });
