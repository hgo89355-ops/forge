// Generates the static (no-JS / SEO) markup blocks of projects.html from site-data.js.
// Usage: node tools/gen-projects-static.mjs   (rewrites only the <!-- pj:* --> marker blocks in projects.html)
import { readFileSync, writeFileSync } from 'node:fs';

globalThis.location = { search: '' };
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { PROJECTS, PROJECT_CATEGORIES, REGIONS, SECTORS, getCategory, getRegion } = await import(`${ROOT}/assets/js/data/site-data.js`);
const { IMAGES } = await import(`${ROOT}/assets/js/core/utils.js`);

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const icon = (n, c = '') => `<svg class="icon${c ? ` ${c}` : ''}" aria-hidden="true" focusable="false"><use href="assets/icons/sprite.svg#${n}"></use></svg>`;
const ar = (o) => (o && o.ar ? ` data-ar="${esc(o.ar)}"` : '');
const pad = (n) => String(n).padStart(2, '0');
const dims = (b) => IMAGES[b] || { w: 1022, h: 688 };
const catOf = (p) => getCategory(p.category);
const catName = (p) => (catOf(p) ? catOf(p).name : p.typology);
const catIcon = (p) => catOf(p)?.icon || 'landmark';

const thumbPic = (p, { alt, sizes, srcset = true }) => {
  const { w, h } = dims(p.image);
  const th = Math.round((480 * h) / w);
  const ss = (ext) => `assets/img/thumbs/${p.image}.${ext} 480w, assets/img/${p.image}.${ext} ${w}w`;
  return `<picture><source type="image/webp" srcset="${srcset ? ss('webp') : `assets/img/thumbs/${p.image}.webp`}"${srcset ? ` sizes="${sizes}"` : ''}>` +
    `<img src="assets/img/thumbs/${p.image}.jpg"${srcset ? ` srcset="${ss('jpg')}" sizes="${sizes}"` : ''} alt="${esc(alt.en)}" data-ar-alt="${esc(alt.ar)}" width="480" height="${th}" loading="lazy" decoding="async" style="object-position:${p.pos || '50% 50%'}"></picture>`;
};

const featured = PROJECTS.filter((p) => p.featured);
const featuredFirst = [...PROJECTS].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || PROJECTS.indexOf(a) - PROJECTS.indexOf(b));

const fallback = `<ul class="pj-ring-fallback container container--wide" role="list" data-pj-ring-fallback>
${featured.map((p) => {
  const sub = { en: [catName(p).en, p.location?.en].filter(Boolean).join(' · '), ar: [catName(p).ar, p.location?.ar].filter(Boolean).join(' · ') };
  return `          <li><a class="pj-ring-fallback__item" href="projects.html#${p.slug}"><span class="pj-ring-fallback__media">${thumbPic(p, { alt: p.name, srcset: false })}</span><span class="pj-ring-fallback__name"${ar(p.name)}>${esc(p.name.en)}</span><span class="pj-ring-fallback__sub"${ar(sub)}>${esc(sub.en)}</span></a></li>`;
}).join('\n')}
        </ul>`;

const grid = featuredFirst.map((p, i) => {
  const loc = p.location;
  const locHtml = loc ? `<span class="pj-card__loc">${icon('map-pin', 'icon--sm')}<span${ar(loc)}>${esc(loc.en)}</span></span>` : '';
  return `              <li class="pj-item" id="${p.slug}" data-slug="${p.slug}"><a class="pj-card" href="projects.html#${p.slug}" data-slug="${p.slug}" data-cursor="view"><span class="pj-card__media">${thumbPic(p, { alt: p.name, sizes: '(min-width: 1024px) 420px, (min-width: 640px) 46vw, 92vw' })}<span class="pj-card__idx num">${pad(i + 1)}</span></span><span class="pj-card__body"><span class="pj-card__cat">${icon(catIcon(p), 'icon--sm')}<span${ar(catName(p))}>${esc(catName(p).en)}</span></span><span class="pj-card__title" role="heading" aria-level="3"${ar(p.name)}>${esc(p.name.en)}</span>${locHtml}</span></a></li>`;
}).join('\n');

const PROJECT_WORD = (n) => ({ en: `${n} ${n === 1 ? 'project' : 'projects'}`, ar: n === 1 ? 'مشروع واحد' : n === 2 ? 'مشروعان' : n <= 10 ? `${n} مشاريع` : `${n} مشروعًا` });
const cats = PROJECT_CATEGORIES.filter((c) => PROJECTS.some((p) => p.category === c.id)).map((c, i) => {
  const n = PROJECTS.filter((p) => p.category === c.id).length;
  const sample = PROJECTS.find((p) => p.category === c.id && p.featured) || PROJECTS.find((p) => p.category === c.id);
  const w = PROJECT_WORD(n);
  return `          <li><a class="pj-cat" href="projects.html?category=${c.id}#explore" data-pj-cat="${c.id}">
            <span class="pj-cat__media" aria-hidden="true"><img src="assets/img/thumbs/${sample.image}.jpg" alt="" width="480" height="${Math.round((480 * dims(sample.image).h) / dims(sample.image).w)}" loading="lazy" decoding="async"></span>
            <span class="pj-cat__num num" aria-hidden="true">${pad(i + 1)}</span>
            <span class="pj-cat__icon">${icon(c.icon)}</span>
            <span class="pj-cat__name"${ar(c.name)}>${esc(c.name.en)}</span>
            <span class="pj-cat__count"${ar(w)}>${esc(w.en)}</span>
            <span class="pj-cat__arrow" aria-hidden="true">${icon('arrow-up-right', 'icon--dir')}</span>
          </a></li>`;
}).join('\n') + `
          <li><a class="pj-cat pj-cat--all" href="#explore" data-pj-cat="all">
            <span class="pj-cat__num num" aria-hidden="true">${pad(PROJECTS.length)}</span>
            <span class="pj-cat__icon">${icon('layout-grid')}</span>
            <span class="pj-cat__name" data-ar="جميع المشاريع">All projects</span>
            <span class="pj-cat__count"${ar(PROJECT_WORD(PROJECTS.length))}>${esc(PROJECT_WORD(PROJECTS.length).en)}</span>
            <span class="pj-cat__arrow" aria-hidden="true">${icon('arrow-up-right', 'icon--dir')}</span>
          </a></li>`;

const marquee = SECTORS.map((s, i) => `<span class="marquee__item${i % 2 ? ' marquee__item--outline' : ''}"${ar(s.name)}>${esc(s.name.en)}</span><span class="marquee__sep" aria-hidden="true"></span>`).join('\n          ');

let html = readFileSync(`${ROOT}/projects.html`, 'utf8');
const put = (name, content) => {
  const re = new RegExp(`(<!-- pj:${name} -->)[\\s\\S]*?(\\s*<!-- /pj:${name} -->)`);
  if (!re.test(html)) throw new Error(`marker ${name} missing`);
  html = html.replace(re, `$1\n${content}$2`);
};
put('fallback', `        ${fallback}`);
put('grid', grid);
put('cats', cats);
put('marquee', `          ${marquee}`);
writeFileSync(`${ROOT}/projects.html`, html);
console.log('ok', featured.length, 'featured,', featuredFirst.length, 'cards');
