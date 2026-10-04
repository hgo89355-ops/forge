// MOBCO Project Builder · builder-ui.js
// The "Build your own" form: four short steps (type, size, facade, extras), a live plain-language summary,
// the "Send this to our team" link (contact.html?type=construction&brief=<summary>#inquiry) and "Surprise me".
// The 3D side lives in models/builder.js (setConfig) and ui.js (rebuilds the sketch on every change).

import { t, getLang, onLang } from '../core/i18n.js';
import { $, $$, store } from '../core/utils.js';
import { S, floorsText } from './strings.js';
import { FLOORS, TYPES, FACADES, COLOURS, SIZES, DEFAULTS, normalizeConfig } from './models/builder.js';

const KEY = 'mobco-builder-v1';
const EXTRAS = ['terrace', 'solar', 'pool', 'landscape', 'parking'];

/** Plain-language summary, e.g. "Mixed-use, 8 floors, medium footprint, glass facade with teal details, pool". */
export function summarize(cfg, lang = getLang()) {
  const tr = (o) => (lang === 'ar' ? o.ar : o.en);
  const facade = tr(S.inColour)
    .replace('{facade}', tr(S.facades[cfg.facade]))
    .replace('{colour}', tr(S.colours[cfg.colour]));
  const parts = [tr(S.types[cfg.type]), floorsText(cfg.floors, lang), tr(S.sizes[cfg.size]), facade];
  EXTRAS.forEach((k) => { if (cfg[k]) parts.push(tr(S.extras[k])); });
  return parts.join(lang === 'ar' ? '، ' : ', ');
}

/** The inquiry link that carries the sketch to the contact page. */
export function inquiryUrl(cfg, lang = getLang()) {
  const q = new URLSearchParams({ type: 'construction', brief: summarize(cfg, lang) });
  return `contact.html?${q.toString().replace(/\+/g, '%20')}#inquiry`;
}

function readSaved() {
  try { const v = JSON.parse(store.get(KEY, 'session') || 'null'); return v && typeof v === 'object' ? v : null; } catch { return null; }
}

export function createBuilderUI({ form, onChange = () => {} }) {
  let cfg = normalizeConfig(readSaved() || DEFAULTS);
  let step = 1;
  const tabs = $$('[data-step]', form);
  const panels = $$('[data-step-panel]', form);
  const nextBtn = $('[data-builder-next]', form);
  const floors = $('input[name="floors"]', form);
  const floorsOut = $('[data-builder-floors-out]', form);
  const summaryEl = $('[data-builder-summary]', form);
  const sendLink = $('[data-builder-send]', form);

  /* ---------------------------------------------------------------- form ↔ config */
  function writeForm() {
    $$('input[type="radio"]', form).forEach((r) => { r.checked = String(cfg[r.name]) === r.value; });
    EXTRAS.forEach((k) => { const c = $(`input[name="${k}"]`, form); if (c) c.checked = !!cfg[k]; });
    const [lo, hi] = FLOORS[cfg.type];
    floors.min = String(lo);
    floors.max = String(hi);
    floors.value = String(cfg.floors);
    renderOut();
  }
  function renderOut() {
    const lang = getLang();
    const ft = floorsText(cfg.floors, lang);
    floorsOut.textContent = ft;
    floors.setAttribute('aria-valuetext', ft);
    const pct = ((cfg.floors - +floors.min) / Math.max(1, +floors.max - +floors.min)) * 100;
    floors.style.setProperty('--val', `${pct}%`); // core range fill
    summaryEl.textContent = summarize(cfg, lang);
    sendLink.href = inquiryUrl(cfg, lang);
  }
  function commit(next, { silent = false } = {}) {
    const prevType = cfg.type;
    let merged = { ...cfg, ...next };
    if (next.type && next.type !== prevType) {
      // a new type keeps the floor count when it fits, otherwise starts from that type's usual height
      const [lo, hi, def] = FLOORS[next.type];
      if (merged.floors < lo || merged.floors > hi) merged.floors = def;
    }
    merged = normalizeConfig(merged);
    const changed = JSON.stringify(merged) !== JSON.stringify(cfg);
    cfg = merged;
    store.set(KEY, JSON.stringify(cfg), 'session');
    writeForm();
    if (changed && !silent) onChange({ ...cfg });
  }

  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('change', (e) => {
    const el = e.target;
    if (!el.name) return;
    if (el.type === 'radio') commit({ [el.name]: el.value });
    else if (el.type === 'checkbox') commit({ [el.name]: el.checked });
    else if (el.name === 'floors') commit({ floors: +el.value });
  });
  // the floor slider updates the readout live and the model once the thumb settles
  let floorTimer = 0;
  floors.addEventListener('input', () => {
    const n = +floors.value;
    floorsOut.textContent = floorsText(n, getLang());
    clearTimeout(floorTimer);
    floorTimer = setTimeout(() => commit({ floors: n }), 160);
  });

  /* ---------------------------------------------------------------- steps (tabs) */
  function setStep(n, { focus = false } = {}) {
    step = Math.max(1, Math.min(4, n));
    tabs.forEach((b) => {
      const on = +b.dataset.step === step;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    panels.forEach((p) => { p.hidden = +p.dataset.stepPanel !== step; });
    if (nextBtn) nextBtn.hidden = step >= 4;
  }
  tabs.forEach((b) => {
    b.addEventListener('click', () => setStep(+b.dataset.step));
    b.addEventListener('keydown', (e) => {
      const rtl = getLang() === 'ar';
      const k = e.key;
      let d = 0;
      if (k === 'ArrowRight') d = rtl ? -1 : 1;
      else if (k === 'ArrowLeft') d = rtl ? 1 : -1;
      else if (k === 'Home') { e.preventDefault(); setStep(1, { focus: true }); return; }
      else if (k === 'End') { e.preventDefault(); setStep(4, { focus: true }); return; }
      if (!d) return;
      e.preventDefault();
      setStep(((step - 1 + d + 4) % 4) + 1, { focus: true });
    });
  });
  nextBtn?.addEventListener('click', () => {
    setStep(step + 1);
    const first = $(`[data-step-panel="${step}"] input`, form);
    first?.focus({ preventScroll: true });
  });

  /* ---------------------------------------------------------------- surprise me */
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  $('[data-builder-shuffle]', form)?.addEventListener('click', () => {
    let next;
    for (let i = 0; i < 6; i++) {
      const type = pick(TYPES);
      const [lo, hi] = FLOORS[type];
      next = {
        type,
        floors: lo + Math.floor(Math.random() * (Math.min(hi, lo + 14) - lo + 1)),
        size: pick(SIZES), facade: pick(FACADES), colour: pick(COLOURS),
        terrace: Math.random() < 0.6, solar: Math.random() < 0.45, pool: Math.random() < 0.5,
        landscape: Math.random() < 0.8, parking: Math.random() < 0.6,
      };
      if (next.type !== cfg.type || next.facade !== cfg.facade) break;
    }
    commit(next);
  });

  onLang(renderOut);
  writeForm();
  setStep(1);

  return {
    get config() { return { ...cfg }; },
    summary: (lang) => summarize(cfg, lang),
    url: () => inquiryUrl(cfg),
    setStep,
    set: (c) => commit(c),
  };
}
