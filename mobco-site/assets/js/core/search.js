// MOBCO core/search.js — site search overlay (Ctrl/⌘+K or "/").
// Fuzzy search over PAGES + PROJECTS + SUBSIDIARIES + project categories (+ sectors) from data/site-data.js, EN/AR.
// Results are de-duplicated by URL (a company page found as both a page and a company shows once).
// Triggers: any [data-search-open] element. API: openSearch(query?), closeSearch()

import { $$, esc, icon, normalize, trapFocus } from './utils.js';
import { t, getLang, onLang } from './i18n.js';
import { stopScroll, startScroll } from './motion.js';
import { PAGES, PROJECTS, SUBSIDIARIES, SECTORS, PROJECT_CATEGORIES, QUICK_LINKS, projectUrl, getCategory } from '../data/site-data.js';

const S = {
  label: { en: 'Search the site', ar: 'ابحث في الموقع' },
  placeholder: { en: 'Search pages, projects, companies…', ar: 'ابحث في الصفحات والمشاريع والشركات…' },
  pages: { en: 'Pages', ar: 'الصفحات' },
  projects: { en: 'Projects', ar: 'المشاريع' },
  companies: { en: 'Group companies', ar: 'شركات المجموعة' },
  categories: { en: 'Project categories', ar: 'فئات المشاريع' },
  sectors: { en: 'Sectors', ar: 'القطاعات' },
  projectCount: { en: '{n} projects', ar: 'عدد المشاريع: {n}' },
  quick: { en: 'Quick links', ar: 'روابط سريعة' },
  empty: { en: 'No results for “{q}”. Try “projects”, “Riyadh” or “careers”.', ar: 'لا توجد نتائج لـ «{q}». جرّب «المشاريع» أو «الرياض» أو «الوظائف».' },
  navigate: { en: 'to navigate', ar: 'للتنقل' },
  open: { en: 'to open', ar: 'للفتح' },
  close: { en: 'to close', ar: 'للإغلاق' },
  closeBtn: { en: 'Close search', ar: 'إغلاق البحث' },
  results: { en: '{n} results', ar: 'عدد النتائج: {n}' },
};

let index = null;
let el, input, list, live, release, lastFocus;
let results = [];
let active = -1;
let initialized = false;

function buildIndex() {
  const items = [];
  PAGES.forEach((p) => items.push({ group: 'pages', url: p.url, title: p.title, desc: p.description, keywords: p.keywords, icon: p.icon }));
  PROJECTS.forEach((p) => {
    const cat = getCategory(p.category);
    items.push({
      group: 'projects', url: projectUrl(p), title: p.name,
      desc: p.location || p.typology,
      keywords: {
        en: [p.typology?.en, p.summary?.en, cat?.name.en, ...(p.highlights || []).map((h) => h.en), p.region || ''].filter(Boolean),
        ar: [p.typology?.ar, p.summary?.ar, cat?.name.ar, ...(p.highlights || []).map((h) => h.ar)].filter(Boolean),
      },
      thumb: `assets/img/thumbs/${p.image}.webp`,
    });
  });
  SUBSIDIARIES.forEach((s) => items.push({
    group: 'companies', url: s.page || `subsidiaries.html#${s.id}`, title: s.name, desc: s.tagline || s.short,
    keywords: {
      en: [...s.focus.map((f) => f.en), s.short?.en, ...(s.facts || []).map((f) => f.en)].filter(Boolean),
      ar: [...s.focus.map((f) => f.ar), s.short?.ar, ...(s.facts || []).map((f) => f.ar)].filter(Boolean),
    },
    icon: s.icon,
  }));
  PROJECT_CATEGORIES.forEach((c) => {
    const n = PROJECTS.filter((p) => p.category === c.id).length;
    if (!n) return;
    const count = { en: S.projectCount.en.replace('{n}', n), ar: S.projectCount.ar.replace('{n}', n) };
    items.push({ group: 'categories', url: `projects.html?category=${c.id}`, title: c.name, desc: count, keywords: { en: ['category', 'projects'], ar: ['فئة', 'مشاريع'] }, icon: c.icon });
  });
  SECTORS.forEach((s) => items.push({
    group: 'sectors', url: `projects.html?sector=${s.id}`, title: s.name, desc: s.text, keywords: { en: [], ar: [] }, icon: s.icon,
  }));
  return items.map((it) => ({
    ...it,
    _n: {
      en: { title: normalize(it.title.en), desc: normalize(it.desc?.en || ''), kw: normalize((it.keywords?.en || []).join(' ')) },
      ar: { title: normalize(it.title.ar), desc: normalize(it.desc?.ar || ''), kw: normalize((it.keywords?.ar || []).join(' ')) },
    },
  }));
}

function subseq(hay, needle) {
  let i = 0;
  for (const ch of hay) { if (ch === needle[i]) i++; if (i === needle.length) return true; }
  return false;
}
function scoreField(f, tok) {
  if (!tok) return 0;
  if (f.title.startsWith(tok)) return 100;
  if (f.title.split(/\s+/).some((w) => w.startsWith(tok))) return 85;
  if (f.title.includes(tok)) return 65;
  if (f.kw.split(/\s+/).some((w) => w.startsWith(tok))) return 45;
  if (f.kw.includes(tok)) return 35;
  if (f.desc.includes(tok)) return 25;
  if (tok.length > 2 && subseq(f.title, tok)) return 12;
  return 0;
}
function search(q) {
  const tokens = normalize(q).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const lang = getLang();
  const other = lang === 'ar' ? 'en' : 'ar';
  const scored = [];
  for (const it of index) {
    let total = 0, ok = true;
    for (const tok of tokens) {
      const s = Math.max(scoreField(it._n[lang], tok), scoreField(it._n[other], tok) * 0.8);
      if (!s) { ok = false; break; }
      total += s;
    }
    if (ok) scored.push({ it, score: total + (it.group === 'pages' ? 5 : 0) });
  }
  const seen = new Set();
  return scored.sort((a, b) => b.score - a.score)
    .filter((s) => (seen.has(s.it.url) ? false : seen.add(s.it.url)))
    .slice(0, 12).map((s) => s.it);
}

function highlight(text, q) {
  const tokens = q.trim().split(/\s+/).filter((x) => x.length > 0);
  let out = esc(text);
  for (const tok of tokens) {
    const i = text.toLowerCase().indexOf(tok.toLowerCase());
    if (i >= 0) {
      const raw = text.slice(i, i + tok.length);
      out = out.replace(esc(raw), `<mark>${esc(raw)}</mark>`);
    }
  }
  return out;
}

function itemHTML(it, i, q) {
  const thumb = it.thumb
    ? `<span class="search__thumb"><img src="${esc(it.thumb)}" alt="" loading="lazy" width="44" height="44"></span>`
    : `<span class="search__thumb">${icon(it.icon || 'file-text')}</span>`;
  const title = t(it.title);
  return `<a class="search__item" role="option" id="search-opt-${i}" href="${esc(it.url)}" aria-selected="false" data-i="${i}">
    ${thumb}<span class="search__text"><span class="search__title">${q ? highlight(title, q) : esc(title)}</span>
    <span class="search__desc">${esc(t(it.desc))}</span></span>${icon('arrow-right', 'search__go icon--dir')}</a>`;
}

function render() {
  const q = input.value;
  const groupsOrder = ['pages', 'companies', 'projects', 'categories', 'sectors'];
  let html = '';
  if (!q.trim()) {
    results = QUICK_LINKS.map((l) => ({ ...l, desc: l.description, group: 'quick' }))
      .concat(PROJECTS.slice(0, 5).map((p) => ({ group: 'projects', url: projectUrl(p), title: p.name, desc: p.location || p.typology, thumb: `assets/img/thumbs/${p.image}.webp` })));
    html += `<p class="search__group-title" role="presentation">${esc(t(S.quick))}</p>`;
    results.forEach((r, i) => {
      if (i === QUICK_LINKS.length) html += `<p class="search__group-title" role="presentation">${esc(t(S.projects))}</p>`;
      html += itemHTML(r, i, '');
    });
  } else {
    const found = search(q);
    results = [];
    for (const g of groupsOrder) {
      const items = found.filter((f) => f.group === g);
      if (!items.length) continue;
      html += `<p class="search__group-title" role="presentation">${esc(t(S[g]))}</p>`;
      items.forEach((it) => { html += itemHTML(it, results.length, q); results.push(it); });
    }
    if (!results.length) html = `<p class="search__empty">${esc(t(S.empty).replace('{q}', q))}</p>`;
    live.textContent = t(S.results).replace('{n}', String(results.length));
  }
  list.innerHTML = html;
  setActive(results.length ? 0 : -1);
}

function setActive(i) {
  active = i;
  $$('.search__item', list).forEach((a) => a.setAttribute('aria-selected', String(Number(a.dataset.i) === i)));
  const cur = list.querySelector(`[data-i="${i}"]`);
  if (cur) { input.setAttribute('aria-activedescendant', cur.id); cur.scrollIntoView({ block: 'nearest' }); }
  else input.removeAttribute('aria-activedescendant');
}

function build() {
  el = document.createElement('div');
  el.className = 'search';
  el.hidden = true;
  el.innerHTML = `
    <div class="search__backdrop" data-search-close></div>
    <div class="search__panel" role="dialog" aria-modal="true" aria-labelledby="search-label">
      <div class="search__head">
        ${icon('search')}
        <label id="search-label" class="visually-hidden" for="search-input">${esc(t(S.label))}</label>
        <input id="search-input" class="search__input" type="search" autocomplete="off" spellcheck="false"
          role="combobox" aria-expanded="true" aria-controls="search-results" aria-autocomplete="list"
          placeholder="${esc(t(S.placeholder))}">
        <button type="button" class="icon-btn icon-btn--sm" data-search-close aria-label="${esc(t(S.closeBtn))}">${icon('x')}</button>
      </div>
      <div class="search__results" id="search-results" role="listbox" aria-labelledby="search-label"></div>
      <div class="search__foot" aria-hidden="true">
        <span><kbd>↑</kbd><kbd>↓</kbd>${esc(t(S.navigate))}</span>
        <span><kbd>↵</kbd>${esc(t(S.open))}</span>
        <span><kbd>esc</kbd>${esc(t(S.close))}</span>
      </div>
      <p class="visually-hidden" aria-live="polite" data-search-live></p>
    </div>`;
  document.body.appendChild(el);
  input = el.querySelector('.search__input');
  list = el.querySelector('.search__results');
  live = el.querySelector('[data-search-live]');
  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (results.length) setActive((active + 1) % results.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (results.length) setActive((active - 1 + results.length) % results.length); }
    else if (e.key === 'Enter') {
      const cur = list.querySelector(`[data-i="${active}"]`);
      if (cur) { e.preventDefault(); go(cur.getAttribute('href')); }
    }
  });
  list.addEventListener('pointermove', (e) => {
    const a = e.target.closest('.search__item');
    if (a && Number(a.dataset.i) !== active) setActive(Number(a.dataset.i));
  });
  list.addEventListener('click', (e) => {
    const a = e.target.closest('.search__item');
    if (!a || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    go(a.getAttribute('href'));
  });
  el.addEventListener('click', (e) => { if (e.target.closest('[data-search-close]')) closeSearch(); });
  el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); closeSearch(); } });
}

function go(href) {
  const url = new URL(href, location.href);
  closeSearch({ restoreFocus: false });
  if (url.pathname === location.pathname && url.hash) {
    location.hash = url.hash;
    return;
  }
  // let transitions.js handle the curtain via a synthetic click on a real link
  const a = document.createElement('a');
  a.href = url.href;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Open the search overlay (optionally prefilled). */
export function openSearch(query = '') {
  if (!index) index = buildIndex();
  if (!el) build();
  if (!el.hidden) return;
  lastFocus = document.activeElement;
  el.hidden = false;
  document.documentElement.classList.add('is-locked');
  stopScroll();
  input.value = query;
  render();
  requestAnimationFrame(() => el.classList.add('is-open'));
  input.focus();
  release = trapFocus(el);
}

export function closeSearch({ restoreFocus = true } = {}) {
  if (!el || el.hidden) return;
  el.classList.remove('is-open');
  release?.();
  document.documentElement.classList.remove('is-locked');
  startScroll();
  setTimeout(() => { el.hidden = true; }, 220);
  if (restoreFocus && lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
}

export function initSearch() {
  if (initialized) return;
  initialized = true;
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-search-open]');
    if (!trigger) return;
    e.preventDefault();
    openSearch(trigger.getAttribute('data-search-open') || '');
  });
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); el && !el.hidden ? closeSearch() : openSearch(); }
    else if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); openSearch(); }
  });
  // show the right shortcut glyph
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  $$('[data-search-kbd]').forEach((k) => { k.textContent = isMac ? '⌘K' : 'Ctrl K'; });
  onLang(() => {
    if (!el) return;
    const wasOpen = !el.hidden;
    el.remove();
    el = null;
    if (wasOpen) { release?.(); build(); el.hidden = false; el.classList.add('is-open'); render(); input.focus(); release = trapFocus(el); }
  });
}
