const { chromium } = require('playwright'); const fs = require('fs');
const G = require('/home/user/forge/lib/components/guide2d.js'); global.window = { Guide2D: G };
const D = require('/home/user/forge/lib/components/door2d.js');
const ev = JSON.parse(fs.readFileSync('/home/user/forge/videos/lock-short/assets/audio/v7_events_liam19.json'));
const A = {}; for (const [k, v] of Object.entries(ev.A)) A[k] = { start: v[0], end: v[1] };
const S = Object.assign({ hookIn: 0 }, ev.shots);
const font = `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@800;900&display=swap" rel="stylesheet">`;
const T = +process.argv[2] || 3.95;
// BANNER 2560x1440 — the real night-porch scene, him yanking the key under the lamp, title in caption style
const scene = D.render('hookJam', T, { S, A, DUR: ev.DUR, W: 2560, H: 1440, cam: { cx: -700, cy: -215, z: 0.8 } });
const txt = (x, y, size, fill, str, sw) => `<text x="${x}" y="${y}" font-family="Inter" font-weight="900" font-size="${size}" fill="${fill}" stroke="#0B0C0F" stroke-width="${sw}" paint-order="stroke" stroke-linejoin="round" letter-spacing="-2">${str}</text>`;
const banner = `<svg width="2560" height="1440" viewBox="0 0 2560 1440" xmlns="http://www.w3.org/2000/svg">${scene}
<defs><linearGradient id="lg" x1="0" x2="1"><stop offset="0" stop-color="#05070F" stop-opacity="0.75"/><stop offset="0.55" stop-color="#05070F" stop-opacity="0.35"/><stop offset="0.75" stop-color="#05070F" stop-opacity="0"/></linearGradient></defs>
<rect width="2560" height="1440" fill="url(#lg)"/>
${txt(560, 705, 150, '#FFFFFF', 'HIDDEN', 18)}${txt(560, 850, 150, '#FFD21F', 'ENGINEERING', 18)}
<text x="566" y="918" font-family="Inter" font-weight="800" font-size="46" fill="#E8ECF4" stroke="#0B0C0F" stroke-width="10" paint-order="stroke">How everyday machines really work</text></svg>`;
// AVATAR 800x800 — his face under the porch lamp, same night palette (no flat blue)
const head = G.draw({ x: 400, y: 1640, s: 3.3, face: 0.25, expr: 'confident', look: [0.6, 0], armL: { x: -20, y: 112 }, armR: { x: 20, y: 112 } });
const avatar = `<svg width="800" height="800" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg"><defs>
<radialGradient id="w" cx="0.3" cy="0.15" r="0.95"><stop offset="0" stop-color="#6A5236"/><stop offset="0.45" stop-color="#2E3550"/><stop offset="1" stop-color="#151A29"/></radialGradient>
<radialGradient id="glow" cx="0.32" cy="0.2" r="0.7"><stop offset="0" stop-color="#FFB45C" stop-opacity="0.55"/><stop offset="1" stop-color="#FFB45C" stop-opacity="0"/></radialGradient></defs>
<rect width="800" height="800" fill="url(#w)"/>${Array.from({ length: 22 }, (_, i) => `<path d="M0,${i * 38} L800,${i * 38}" stroke="#000" stroke-opacity="0.12" stroke-width="4"/>`).join('')}
${head}<rect width="800" height="800" fill="url(#glow)" style="mix-blend-mode:overlay"/>
<rect width="800" height="800" fill="none"/></svg>`;
(async () => {
  const b = await chromium.launch();
  for (const [name, svg, w, h] of [['banner', banner, 2560, 1440], ['avatar', avatar, 800, 800]]) {
    const pg = await b.newPage({ viewport: { width: w, height: h } });
    await pg.setContent(`<html><head>${font}</head><body style="margin:0">${svg}</body></html>`); await pg.waitForTimeout(800);
    await pg.screenshot({ path: `${process.argv[3] || '/home/user/forge/channel'}/${name}.png` });
  }
  await b.close();
})();
