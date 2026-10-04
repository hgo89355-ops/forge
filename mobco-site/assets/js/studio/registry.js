// MOBCO Project Builder · registry.js
// The model library (ids/order fixed by the brief), project mapping and the line-art icons shown in the
// library rail until a runtime thumbnail has been rendered.

import { PROJECTS, getProject } from '../data/site-data.js';

export const MODEL_IDS = ['mixed-use', 'residential-tower', 'campus', 'villa-community', 'landmark'];
export const DEV_MODEL = '_dev-box';

const ICONS = {
  'mixed-use': `<path d="M8 34h48"/><path d="M14 34V14h30v20"/><path d="M14 20h30M14 26h30M22 14v20M30 14v20M38 14v20"/><path d="M44 34V22h8v12"/><path d="M6 38h52" opacity=".5"/>`,
  'residential-tower': `<path d="M8 36h48"/><path d="M18 36V6h14v30"/><path d="M18 12h14M18 18h14M18 24h14M18 30h14"/><path d="M32 36V20h20v16"/><path d="M32 26h20M32 31h20"/><path d="M36 20v-2h12v2" opacity=".6"/>`,
  campus: `<ellipse cx="32" cy="27" rx="22" ry="8"/><ellipse cx="32" cy="27" rx="13" ry="4.5"/><path d="M29 27V6h6v21"/><path d="M29 12h6M29 18h6" opacity=".6"/><path d="M6 38h52" opacity=".5"/>`,
  'villa-community': `<path d="M6 36h52"/><path d="M8 36V26h9v10M20 36V24h10v12M34 36V26h9v10M46 36V24h10v12"/><path d="M8 26h9M20 24h10M34 26h9M46 24h10" opacity=".6"/><path d="M14 40c6-3 14-3 20 0s14 3 20 0" opacity=".55"/>`,
  landmark: `<path d="M8 36h48"/><path d="M14 36V14h36v22"/><path d="M14 14c4-6 32-6 36 0"/><path d="M14 21h36M14 28h36" opacity=".6"/><path d="M26 36v-6h12v6"/><path d="M22 30h20" /><path d="M22 30l-4 6M42 30l4 6" opacity=".6"/>`,
  [DEV_MODEL]: `<path d="M8 36h48"/><path d="M14 36V24h30v12"/><path d="M22 24V8h16v16"/><path d="M22 14h16M22 19h16M14 30h30" opacity=".6"/>`,
};

/** Line-art SVG for a model (decorative). */
export function modelIcon(id, cls = 'studio-icon-art') {
  const body = ICONS[id] || ICONS[DEV_MODEL];
  return `<svg class="${cls}" viewBox="0 0 64 44" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** Project in site-data.js for a model: meta.projectSlug first, else the project whose studioModel === id. */
export function projectFor(id, meta) {
  if (meta && meta.projectSlug) {
    const p = getProject(meta.projectSlug);
    if (p) return p;
  }
  return PROJECTS.find((p) => p.studioModel === id) || null;
}

/** Library entries in UI order. `dev` adds the development model at the end. */
export function libraryEntries({ dev = false } = {}) {
  const ids = dev ? [...MODEL_IDS, DEV_MODEL] : MODEL_IDS.slice();
  return ids.map((id, i) => {
    const p = projectFor(id);
    return {
      id,
      index: i + 1,
      project: p,
      // fallback copy until the module's meta is known
      name: p ? p.name : id === DEV_MODEL ? { en: 'Development Block', ar: 'كتلة التطوير' } : { en: id, ar: id },
      tagline: p ? p.typology : null,
      image: p ? p.image : 'aerial-compound',
      pos: p ? p.pos : '50% 50%',
    };
  });
}
