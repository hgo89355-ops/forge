global.window = {}; global.document = {};
require('../assets/components/lock-cutaway.js');
require('../assets/film-script.js'); const FS = window.FilmScript || globalThis.FilmScript;
const L = window.LockCutaway;
const out = [];
for (const [a, b] of [[11.9, 14.4], [20.8, 22.0]]) {
  let prev = null, prev2 = null;
  for (let t = a; t <= b; t += 1 / 240) {
    const k = FS.keyState(t);
    const st = L.stacks({ s: k.s, bitting: k.bitting });
    if (prev && prev2) st.forEach((p, i) => {
      const d1 = prev[i].kb - prev2[i].kb, d2 = p.kb - prev[i].kb;
      if (d1 > 1e-4 && d2 < -1e-4 && prev[i].kb - (L.geometry.keywayTop + 0.6 - L.KEYPIN_LEN[i]) > 0.3) out.push(+t.toFixed(3));
    });
    prev2 = prev; prev = st;
  }
}
console.log(JSON.stringify(out));
