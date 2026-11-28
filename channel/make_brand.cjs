// Channel branding (owner 2026-11-28: the banner is for the whole channel, not one video).
// Our guy as the host, presenting cutaways of the machines the channel covers, on a dark blueprint background.
// usage: node channel/make_brand.cjs [outdir]
const { chromium } = require('playwright');
const G = require('/home/user/forge/lib/components/guide2d.js');
const OUT = process.argv[2] || '/home/user/forge/channel';
const INK = '#121317';
const font = `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@800;900&display=swap" rel="stylesheet">`;
const grid = (w, h, step, col, op) => { let o = ''; for (let x = 0; x <= w; x += step) o += `<path d="M${x},0 L${x},${h}" stroke="${col}" stroke-opacity="${op}" stroke-width="2"/>`; for (let y = 0; y <= h; y += step) o += `<path d="M0,${y} L${w},${y}" stroke="${col}" stroke-opacity="${op}" stroke-width="2"/>`; return o; };
const gearPath = (cx, cy, r, n) => { let d = ''; for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r * 0.8 : r, a0 = a - Math.PI / (n * 2) * 0.5, a1 = a + Math.PI / (n * 2) * 0.5; d += `${i ? 'L' : 'M'}${(cx + Math.cos(a0) * rr).toFixed(1)},${(cy + Math.sin(a0) * rr).toFixed(1)}L${(cx + Math.cos(a1) * rr).toFixed(1)},${(cy + Math.sin(a1) * rr).toFixed(1)}`; } return d + 'Z'; };

// ---- machine cutaway icons (flat, thick outlines), each drawn in a 200×180 box at (x, y)
function card(x, y, inner) {
  return `<g transform="translate(${x} ${y})"><rect x="0" y="0" width="210" height="182" rx="22" fill="#1C2440" stroke="#3A4A78" stroke-width="4"/>${inner}</g>`;
}
const lockIcon = () => {   // pin-tumbler cutaway: housing, brass plug, 4 pin stacks, green shear line
  let o = `<rect x="28" y="34" width="154" height="114" rx="12" fill="#AEB6C1" stroke="${INK}" stroke-width="6"/><rect x="40" y="96" width="130" height="40" rx="8" fill="#D8AD4F" stroke="${INK}" stroke-width="6"/>`;
  [62, 92, 122, 152].forEach((x, i) => { const k = [22, 12, 28, 16][i]; o += `<rect x="${x - 9}" y="44" width="18" height="${52 - k * 0.4}" rx="4" fill="#E0393E" stroke="${INK}" stroke-width="4"/><rect x="${x - 9}" y="${96 - k * 0.4}" width="18" height="${k + 10}" rx="4" fill="#1F4FE0" stroke="${INK}" stroke-width="4"/>`; });
  return o + `<path d="M34,96 L176,96" stroke="#2EE07A" stroke-width="5" stroke-dasharray="10 7"/>`;
};
const escalatorIcon = () => {   // truss, steps, handrail
  let steps = 'M30,150 '; for (let i = 0; i < 6; i++) steps += `L${48 + i * 22},${150 - i * 18} L${70 + i * 22},${150 - i * 18} `;
  steps += 'L182,42 L182,150 Z';
  return `<path d="M24,160 L74,160 L186,58 L186,40 L150,40 L40,140 L24,140 Z" fill="#5D6A86" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>` +
    `<path d="${steps}" fill="#C9D0D8" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>` +
    `<path d="M26,124 Q30,110 44,108 L160,22 Q176,14 186,24" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round"/><path d="M26,124 Q30,110 44,108 L160,22 Q176,14 186,24" fill="none" stroke="#2B2E36" stroke-width="5" stroke-linecap="round"/>`;
};
const elevatorIcon = () =>   // shaft, car, cables over a pulley, counterweight
  `<rect x="38" y="24" width="134" height="140" fill="#262F4E" stroke="${INK}" stroke-width="6"/>` +
  `<circle cx="105" cy="36" r="16" fill="#AEB6C1" stroke="${INK}" stroke-width="5"/>` +
  `<path d="M92,38 L92,78 M118,38 L118,64 M150,38 L150,64" stroke="#C9D0D8" stroke-width="4"/>` +
  `<rect x="56" y="78" width="72" height="72" rx="6" fill="#1F4FE0" stroke="${INK}" stroke-width="6"/><path d="M92,84 L92,144" stroke="${INK}" stroke-width="4"/>` +
  `<rect x="138" y="64" width="24" height="44" rx="4" fill="#8A93A0" stroke="${INK}" stroke-width="5"/>` +
  `<path d="M118,38 L150,38" stroke="#C9D0D8" stroke-width="4"/>`;
const planeIcon = () =>   // side view: fuselage, wing, tail, engine
  `<path d="M22,98 Q22,80 44,78 L160,74 Q190,74 192,92 Q190,108 160,110 L44,112 Q22,112 22,98 Z" fill="#E8ECF2" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>` +
  `<path d="M30,80 L20,40 L48,40 L70,78" fill="#1F4FE0" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>` +
  `<path d="M88,104 L128,150 L150,150 L130,104 Z" fill="#AEB6C1" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>` +
  `<rect x="104" y="116" width="34" height="18" rx="8" fill="#5D6A86" stroke="${INK}" stroke-width="5"/>` +
  [70, 90, 110, 130, 150].map((x) => `<circle cx="${x}" cy="88" r="5" fill="#1F4FE0" stroke="${INK}" stroke-width="3"/>`).join('') +
  `<path d="M180,86 Q186,92 180,98" fill="none" stroke="${INK}" stroke-width="4"/>`;

// ---- BANNER 2560×1440. Safe area (all devices): x 507–2053, y 508–931.
const host = G.draw({ x: 1500, y: 928, s: 0.82, face: 0.45, expr: 'confident', look: [1, 0], lean: 0.02,
  armR: { x: 104, y: -34, bend: -0.15 }, handR: 'point', armL: { x: -18, y: 110, bend: 0.25 } });
const txt = (x, y, size, fill, str, sw) => `<text x="${x}" y="${y}" font-family="Inter" font-weight="900" font-size="${size}" fill="${fill}" stroke="#0B0C0F" stroke-width="${sw}" paint-order="stroke" stroke-linejoin="round" letter-spacing="-2">${str}</text>`;
const banner = `<svg width="2560" height="1440" viewBox="0 0 2560 1440" xmlns="http://www.w3.org/2000/svg">
<defs><radialGradient id="bg" cx="0.55" cy="0.5" r="0.75"><stop offset="0" stop-color="#1E2742"/><stop offset="1" stop-color="#0C1020"/></radialGradient>
<radialGradient id="spot" cx="1500" cy="640" r="520" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFB45C" stop-opacity="0.22"/><stop offset="1" stop-color="#FFB45C" stop-opacity="0"/></radialGradient></defs>
<rect width="2560" height="1440" fill="url(#bg)"/>${grid(2560, 1440, 64, '#5B7BD5', 0.10)}${grid(2560, 1440, 320, '#5B7BD5', 0.16)}
<path d="${gearPath(260, 300, 210, 12)}" fill="none" stroke="#5B7BD5" stroke-opacity="0.18" stroke-width="6"/><circle cx="260" cy="300" r="70" fill="none" stroke="#5B7BD5" stroke-opacity="0.18" stroke-width="6"/>
<path d="${gearPath(2330, 1150, 240, 14)}" fill="none" stroke="#5B7BD5" stroke-opacity="0.18" stroke-width="6"/><circle cx="2330" cy="1150" r="80" fill="none" stroke="#5B7BD5" stroke-opacity="0.18" stroke-width="6"/>
<rect width="2560" height="1440" fill="url(#spot)"/>
${txt(560, 690, 126, '#FFFFFF', 'HIDDEN', 16)}${txt(560, 818, 126, '#FFD21F', 'ENGINEERING', 16)}
<text x="566" y="890" font-family="Inter" font-weight="800" font-size="44" fill="#E8ECF4" stroke="#0B0C0F" stroke-width="10" paint-order="stroke">How everyday machines really work</text>
${host}
${card(1610, 528, lockIcon())}${card(1832, 528, escalatorIcon())}${card(1610, 730, elevatorIcon())}${card(1832, 730, planeIcon())}
</svg>`;

// ---- AVATAR 800×800: his face, warm key light, same blueprint background
const head = G.draw({ x: 400, y: 1640, s: 3.3, face: 0.25, expr: 'confident', look: [0.6, 0], armL: { x: -20, y: 112 }, armR: { x: 20, y: 112 } });
const avatar = `<svg width="800" height="800" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg"><defs>
<radialGradient id="a" cx="0.5" cy="0.45" r="0.75"><stop offset="0" stop-color="#26315A"/><stop offset="1" stop-color="#0C1020"/></radialGradient>
<radialGradient id="glow" cx="0.3" cy="0.18" r="0.75"><stop offset="0" stop-color="#FFB45C" stop-opacity="0.5"/><stop offset="1" stop-color="#FFB45C" stop-opacity="0"/></radialGradient></defs>
<rect width="800" height="800" fill="url(#a)"/>${grid(800, 800, 50, '#5B7BD5', 0.14)}
<path d="${gearPath(640, 170, 120, 10)}" fill="none" stroke="#5B7BD5" stroke-opacity="0.25" stroke-width="6"/>
${head}<rect width="800" height="800" fill="url(#glow)" style="mix-blend-mode:overlay"/></svg>`;

(async () => {
  const b = await chromium.launch();
  for (const [name, svg, w, h] of [['banner', banner, 2560, 1440], ['avatar', avatar, 800, 800]]) {
    const pg = await b.newPage({ viewport: { width: w, height: h } });
    await pg.setContent(`<html><head>${font}</head><body style="margin:0">${svg}</body></html>`); await pg.waitForTimeout(800);
    await pg.screenshot({ path: `${OUT}/${name}.png` });
  }
  await b.close();
})();
