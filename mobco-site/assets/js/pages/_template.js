// assets/js/pages/_template.js — example page module. Copy to assets/js/pages/<page>.js.
// Core modules are singletons already initialised by core/main.js (which loads first).
import { t, onLang } from '../core/i18n.js';
import { scan } from '../core/motion.js';
import { scanUI, toast } from '../core/ui.js';
import { $ } from '../core/utils.js';
import { STATS } from '../data/site-data.js';

const mount = $('[data-template-stats]');
function render() {
  if (!mount) return;
  mount.innerHTML = STATS.map((s) => `
    <div class="stat">
      <div class="stat__value"><span data-count="${s.value}">${s.value.toLocaleString('en-US')}</span><span class="stat__suffix">${s.suffix}</span></div>
      <p class="stat__label">${t(s.label)}</p>
    </div>`).join('');
  scan(mount);   // wire data-count / data-reveal inside the new markup
  scanUI(mount); // wire components (no-op here) and localize data-ar attributes
}
render();
onLang(render); // data-driven markup re-renders on language change

$('[data-template-toast]')?.addEventListener('click', () => toast({ en: 'Hello from the template page', ar: 'مرحبًا من صفحة القالب' }));
