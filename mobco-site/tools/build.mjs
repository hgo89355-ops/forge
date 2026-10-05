#!/usr/bin/env node
// MOBCO tools/build.mjs: inline shared partials into static pages.
//
//   node tools/build.mjs                 → every *.html in the site root (except partials)
//   node tools/build.mjs about.html …    → ONLY the listed files (use this from page builders; safe in parallel)
//   node tools/build.mjs --check [files] → exit 1 if any file is out of date (no writes)
//
// Markers (must be on their own lines in the page):
//   <!-- @include header -->  …anything…  <!-- /@include header -->
//   <!-- @include footer -->  …anything…  <!-- /@include footer -->
// Content between markers is replaced by partials/<name>.html. Idempotent: re-running changes nothing.

import { readFileSync, writeFileSync, readdirSync, existsSync, renameSync } from 'node:fs';
import { dirname, join, resolve, basename, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const files = args.filter((a) => !a.startsWith('--'));

const partialCache = new Map();
function partial(name) {
  if (!partialCache.has(name)) {
    const p = join(ROOT, 'partials', `${name}.html`);
    if (!existsSync(p)) throw new Error(`Missing partial: partials/${name}.html`);
    partialCache.set(name, readFileSync(p, 'utf8').replace(/\s+$/, ''));
  }
  return partialCache.get(name);
}

// Sanity checks on partial content that mirrors data (kept static for SEO / no-JS): the header's
// "View all N projects" link must match PROJECTS.length in assets/js/data/site-data.js.
async function checkPartials() {
  const problems = [];
  try {
    const { PROJECTS } = await import(pathToFileURL(join(ROOT, 'assets/js/data/site-data.js')).href);
    const header = partial('header');
    for (const m of header.matchAll(/View all (\d+) projects|المشاريع \((\d+)\)/g)) {
      const n = parseInt(m[1] || m[2], 10);
      if (n !== PROJECTS.length) problems.push(`partials/header.html says ${n} projects ("${m[0]}") but PROJECTS has ${PROJECTS.length}`);
    }
  } catch (err) { problems.push(`partial checks failed: ${err.message}`); }
  return problems;
}

const RE = /([ \t]*)<!--\s*@include\s+([\w-]+)\s*-->[\s\S]*?<!--\s*\/@include\s+\2\s*-->/g;

function processFile(file) {
  const abs = resolve(ROOT, file);
  if (!existsSync(abs)) { console.error(`✗ ${file}: not found`); return 'error'; }
  const src = readFileSync(abs, 'utf8');
  let count = 0;
  const out = src.replace(RE, (_m, indent, name) => {
    count++;
    return `${indent}<!-- @include ${name} -->\n${partial(name)}\n${indent}<!-- /@include ${name} -->`;
  });
  const rel = relative(ROOT, abs);
  if (!count) { console.log(`· ${rel}: no include markers`); return 'skip'; }
  if (out === src) { console.log(`= ${rel}: up to date (${count} include${count > 1 ? 's' : ''})`); return 'same'; }
  if (checkOnly) { console.log(`✗ ${rel}: out of date`); return 'stale'; }
  const tmp = `${abs}.tmp-${process.pid}`;
  writeFileSync(tmp, out);
  renameSync(tmp, abs); // atomic replace
  console.log(`✓ ${rel}: ${count} include${count > 1 ? 's' : ''} updated`);
  return 'written';
}

const targets = files.length
  ? files
  : readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();
let bad = 0;
for (const p of await checkPartials()) { console.error(`✗ ${p}`); bad++; }
for (const f of targets) {
  try {
    const r = processFile(f);
    if (r === 'error' || r === 'stale') bad++;
  } catch (err) {
    console.error(`✗ ${basename(f)}: ${err.message}`);
    bad++;
  }
}
process.exit(bad ? 1 : 0);
