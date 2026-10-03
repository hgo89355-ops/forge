#!/usr/bin/env node
// MOBCO tools/check.mjs — Playwright QA for static pages (Chromium is preinstalled; never run `playwright install`).
//
//   node tools/check.mjs                                   → all root *.html, desktop+mobile, EN+AR
//   node tools/check.mjs --pages about.html --port 8123 --shots /tmp/qa/about
//   flags: --pages <f…>  --port <n> (default 8100)  --shots <dir>  --no-mobile  --no-ar  --no-desktop
//          --strict (missing planned pages = error, not warning)  --qa (load pages with ?qa=1: no animations)
//          --concurrency <n> (default 4)
//
// Each page × viewport (desktop 1440×900, mobile 390×844) × language (EN, ?lang=ar) is loaded, scrolled
// top→bottom to trigger lazy images and reveals, then checked for:
//   console errors · page errors · failed / 4xx-5xx requests · horizontal overflow (+ offending elements)
//   broken images · internal links to missing files · anchors to missing ids · [data-reveal]/[data-split] still
//   hidden after scrolling · <img> without alt · duplicate ids · data-ar on non-leaf elements (would wipe children)
// With --shots: <page>-<desktop|mobile>-<en|ar>.png (full page) and, for tall pages, viewport-sized section
// shots <page>-<vp>-<lang>-s01.png … every ~viewport height. Exit code 1 if any error.

import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PLANNED = ['index.html', 'about.html', 'subsidiaries.html', 'projects.html', 'studio.html', 'media.html', 'careers.html', 'contact.html', '404.html'];

/* ---------------------------------------------------------------- args */
const argv = process.argv.slice(2);
const opt = { pages: [], port: 8100, shots: null, mobile: true, desktop: true, ar: true, strict: false, qa: false, concurrency: 4 };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--pages') { while (argv[i + 1] && !argv[i + 1].startsWith('--')) opt.pages.push(argv[++i]); }
  else if (a === '--port') opt.port = parseInt(argv[++i], 10);
  else if (a === '--shots') opt.shots = resolve(argv[++i]);
  else if (a === '--no-mobile') opt.mobile = false;
  else if (a === '--no-desktop') opt.desktop = false;
  else if (a === '--no-ar') opt.ar = false;
  else if (a === '--strict') opt.strict = true;
  else if (a === '--qa') opt.qa = true;
  else if (a === '--concurrency') opt.concurrency = parseInt(argv[++i], 10) || 4;
  else if (a.endsWith('.html')) opt.pages.push(a);
}
if (!opt.pages.length) opt.pages = readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();
opt.pages = opt.pages.map((p) => p.replace(/^\.?\//, ''));
if (opt.shots) mkdirSync(opt.shots, { recursive: true });

/* ---------------------------------------------------------------- static server */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.hdr': 'application/octet-stream', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml', '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.md': 'text/markdown; charset=utf-8',
};
const server = createServer((req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(file));
  } catch (e) {
    res.writeHead(500);
    res.end(String(e));
  }
});
await new Promise((r, j) => server.listen(opt.port, '127.0.0.1', r).on('error', j));
const BASE = `http://127.0.0.1:${opt.port}`;

/* ---------------------------------------------------------------- helpers */
const idCache = new Map();
function idsIn(file) {
  if (!idCache.has(file)) {
    const html = readFileSync(join(ROOT, file), 'utf8');
    idCache.set(file, new Set([...html.matchAll(/\sid=["']([^"']+)["']/g)].map((m) => m[1])));
  }
  return idCache.get(file);
}

const IN_PAGE = () => {
  const out = { overflow: [], hiddenReveal: [], brokenImages: [], noAlt: [], dupIds: [], links: [], nonLeafAr: [], scrollW: 0, vw: 0 };
  const vw = document.documentElement.clientWidth;
  out.vw = vw;
  out.scrollW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  const sel = (el) => {
    if (el.id) return `#${el.id}`;
    const cls = [...el.classList].slice(0, 2).join('.');
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`;
  };
  const path = (el) => {
    const parts = [];
    for (let n = el; n && n !== document.body && parts.length < 4; n = n.parentElement) parts.unshift(sel(n));
    return parts.join(' > ');
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const clippedByAncestor = (el) => {
    for (let n = el.parentElement; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflowX !== 'visible' || cs.clipPath !== 'none') return true;
      if (cs.position === 'fixed') return true;
      if (cs.visibility === 'hidden') return true;
    }
    return false;
  };
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
    const r = el.getBoundingClientRect();
    if ((r.right > vw + 1 || r.left < -1) && r.width > 0 && visible(el) && getComputedStyle(el).position !== 'fixed' && !clippedByAncestor(el)) {
      out.overflow.push(`${path(el)} (left ${Math.round(r.left)}, right ${Math.round(r.right)})`);
    }
  }
  out.overflow = out.overflow.slice(0, 10);
  document.querySelectorAll('[data-reveal]:not(.is-revealed), [data-split]:not(.is-revealed)').forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || el.closest('[hidden]')) return;
    if (el.closest('.mobile-nav, .mega, [data-modal], [data-drawer]')) return;
    if (parseFloat(cs.opacity) < 0.05 || (el.hasAttribute('data-split') && !el.classList.contains('is-revealed')) || cs.clipPath !== 'none' && cs.clipPath !== 'inset(0px)') out.hiddenReveal.push(path(el));
  });
  document.querySelectorAll('img').forEach((img) => {
    if (!img.hasAttribute('alt')) out.noAlt.push(img.getAttribute('src'));
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) out.brokenImages.push(img.currentSrc || img.getAttribute('src'));
  });
  const seen = new Map();
  document.querySelectorAll('[id]').forEach((el) => seen.set(el.id, (seen.get(el.id) || 0) + 1));
  for (const [id, n] of seen) if (n > 1) out.dupIds.push(`${id} ×${n}`);
  document.querySelectorAll('a[href]').forEach((a) => out.links.push(a.getAttribute('href')));
  document.querySelectorAll('[data-ar]').forEach((el) => { if (el.children.length && el.tagName !== 'TITLE') out.nonLeafAr.push(path(el)); });
  out.ids = [...seen.keys()];
  return out;
};

/* ---------------------------------------------------------------- run one combination */
async function run(browser, page, vpName, lang) {
  const vp = vpName === 'desktop' ? { width: 1440, height: 900 } : { width: 390, height: 844 };
  const ctx = await browser.newContext({
    viewport: vp,
    deviceScaleFactor: 1,
    isMobile: vpName === 'mobile',
    hasTouch: vpName === 'mobile',
    reducedMotion: 'no-preference',
  });
  await ctx.addInitScript(() => {
    try { sessionStorage.setItem('mobco-visited', '1'); localStorage.setItem('mobco-consent', 'declined'); } catch { /* ignore */ }
  });
  const p = await ctx.newPage();
  const issues = { errors: [], warnings: [] };
  const err = (m) => issues.errors.push(m);
  const warn = (m) => issues.warnings.push(m);
  p.on('console', (msg) => { if (msg.type() === 'error') err(`console: ${msg.text().slice(0, 300)}`); });
  p.on('pageerror', (e) => err(`pageerror: ${String(e.message || e).slice(0, 300)}`));
  p.on('requestfailed', (r) => {
    const f = r.failure()?.errorText || '';
    if (/ERR_ABORTED/.test(f) && /\.(jpg|webp|png)$/.test(r.url())) return; // lazy image cancelled by navigation
    err(`request failed: ${r.url().replace(BASE, '')} (${f})`);
  });
  p.on('response', (r) => { if (r.status() >= 400) err(`HTTP ${r.status()}: ${r.url().replace(BASE, '')}`); });

  const qs = new URLSearchParams();
  if (lang === 'ar') qs.set('lang', 'ar');
  if (opt.qa) qs.set('qa', '1');
  const url = `${BASE}/${page}${qs.toString() ? '?' + qs : ''}`;
  try {
    await p.goto(url, { waitUntil: 'load', timeout: 30000 });
  } catch (e) {
    err(`navigation: ${e.message.split('\n')[0]}`);
    await ctx.close();
    return issues;
  }
  await p.evaluate(() => document.fonts?.ready);
  await p.waitForTimeout(400);
  // scroll through to trigger reveals & lazy media
  await p.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const step = Math.round(innerHeight * 0.55);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await sleep(110);
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
    await sleep(400);
  });
  await p.waitForTimeout(1300);
  const data = await p.evaluate(IN_PAGE);
  if (data.scrollW > data.vw + 1) err(`horizontal scroll: scrollWidth ${data.scrollW} > ${data.vw}`);
  data.overflow.forEach((o) => err(`overflow: ${o}`));
  data.hiddenReveal.slice(0, 8).forEach((h) => err(`still hidden after scroll: ${h}`));
  data.brokenImages.forEach((s) => err(`broken image: ${s}`));
  data.noAlt.forEach((s) => err(`img without alt: ${s}`));
  data.dupIds.forEach((d) => err(`duplicate id: ${d}`));
  data.nonLeafAr.slice(0, 8).forEach((d) => err(`data-ar on element with child elements (children would be wiped): ${d}`));
  // links
  if (vpName === 'desktop' && lang === 'en') {
    const pageIds = new Set(data.ids);
    for (const href of new Set(data.links)) {
      if (/^(mailto:|tel:|javascript:|data:)/i.test(href)) continue;
      if (/^https?:\/\//i.test(href) && !href.startsWith(BASE)) continue;
      const u = new URL(href, `${BASE}/${page}`);
      const file = decodeURIComponent(u.pathname.replace(/^\//, '')) || 'index.html';
      const hash = decodeURIComponent(u.hash.replace(/^#/, ''));
      if (file === page) {
        if (hash && !pageIds.has(hash)) err(`anchor to missing id: ${href}`);
        if (!hash && href === '#') warn(`empty link href="#"`);
        continue;
      }
      if (!existsSync(join(ROOT, file))) {
        if (PLANNED.includes(file) && !opt.strict) warn(`link to planned page not built yet: ${href}`);
        else err(`link to missing file: ${href}`);
        continue;
      }
      if (hash && file.endsWith('.html') && !idsIn(file).has(hash)) {
        // ids rendered by JS can't be verified statically → warning
        warn(`anchor id not found statically: ${href}`);
      }
    }
  }
  // screenshots
  if (opt.shots) {
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(700);
    const name = page.replace(/\.html$/, '').replace(/[^\w-]/g, '_');
    const base = `${opt.shots}/${name}-${vpName}-${lang}`;
    await p.screenshot({ path: `${base}.png`, fullPage: true });
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    if (H > vp.height * 2.2) {
      const step = vp.height;
      let i = 1;
      for (let y = 0; y < H && i <= 40; y += step, i++) {
        await p.evaluate((yy) => window.scrollTo(0, yy), y);
        await p.waitForTimeout(350);
        await p.screenshot({ path: `${base}-s${String(i).padStart(2, '0')}.png` });
      }
    }
  }
  await ctx.close();
  return issues;
}

/* ---------------------------------------------------------------- main */
const browser = await chromium.launch();
const combos = [];
for (const page of opt.pages) {
  for (const vpName of [opt.desktop && 'desktop', opt.mobile && 'mobile'].filter(Boolean)) {
    for (const lang of ['en', opt.ar && 'ar'].filter(Boolean)) combos.push({ page, vpName, lang });
  }
}
const results = [];
let cursor = 0;
async function worker() {
  while (cursor < combos.length) {
    const c = combos[cursor++];
    if (!existsSync(join(ROOT, c.page))) { results.push({ ...c, issues: { errors: [`page not found: ${c.page}`], warnings: [] } }); continue; }
    const issues = await run(browser, c.page, c.vpName, c.lang).catch((e) => ({ errors: [`runner: ${e.message}`], warnings: [] }));
    results.push({ ...c, issues });
  }
}
await Promise.all(Array.from({ length: Math.min(opt.concurrency, combos.length) }, worker));
await browser.close();
server.close();

/* ---------------------------------------------------------------- report */
let errors = 0, warnings = 0;
results.sort((a, b) => combos.indexOf(combos.find((c) => c.page === a.page && c.vpName === a.vpName && c.lang === a.lang)) - combos.indexOf(combos.find((c) => c.page === b.page && c.vpName === b.vpName && c.lang === b.lang)));
console.log(`\nMOBCO QA — ${opt.pages.length} page(s), ${combos.length} run(s)${opt.qa ? ' [qa mode]' : ''}\n`);
for (const r of results) {
  const e = [...new Set(r.issues.errors)], w = [...new Set(r.issues.warnings)];
  errors += e.length; warnings += w.length;
  const tag = `${r.page} · ${r.vpName} · ${r.lang}`;
  console.log(`${e.length ? '✗' : '✓'} ${tag}${e.length ? `  ${e.length} error(s)` : ''}${w.length ? `  ${w.length} warning(s)` : ''}`);
  e.slice(0, 25).forEach((m) => console.log(`    ERROR  ${m}`));
  if (e.length > 25) console.log(`    … ${e.length - 25} more errors`);
  w.slice(0, 12).forEach((m) => console.log(`    warn   ${m}`));
}
console.log(`\n${errors ? '✗' : '✓'} ${errors} error(s), ${warnings} warning(s)${opt.shots ? ` — screenshots in ${opt.shots}` : ''}\n`);
process.exit(errors ? 1 : 0);
