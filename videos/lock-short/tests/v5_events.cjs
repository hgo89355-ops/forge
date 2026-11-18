// Computes v5 sound-event times from the word anchors + lock physics (same formulas as film5.js)
global.window = {}; global.document = {};
require('../assets/components/lock-cutaway.js'); require('../assets/film-script.js');
const L = window.LockCutaway, FS = window.FilmScript;
const words = require('../assets/v5-words.json');
const ORDER = ['your','metal','inside','pin','pairs','springs','and','top','block','cylinder','wrong','one','short','line','and','jams','right','lifts','exactly','height','so','gap','lines','line','click','door','open','five','heights','almost','possible','keys','only','yours','fits','which','why'];
const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
const A = {}, seen = {}; let i = 0, last = { start: 0, end: 0.3 };
for (const w of ORDER) { let j = i; while (j < words.length && norm(words[j].text) !== w) j++; const k = seen[w] ? w + (seen[w] + 1) : w; seen[w] = (seen[w] || 0) + 1; if (j < words.length) { A[k] = words[j]; last = words[j]; i = j + 1; } else A[k] = { start: last.end + 0.3, end: last.end + 0.6 }; }
const c = (w, d = 0.06) => Math.max(0, A[w].start - d);
const DUR = Math.round((A.why.end + 0.3) * 30) / 30;
const cuts = [c('inside'), c('and'), c('wrong'), c('one'), c('and2'), c('right', 0.22), c('lifts'), c('so'), c('click'), c('door', 0.2), c('five'), c('possible'), c('only', 0.22), c('which')];
const o3 = (p) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
function clicks(t0, t1, sFn, bit) {
  const out = []; let prev = null, prev2 = null;
  for (let t = t0; t < t1; t += 1 / 240) {
    const st = L.stacks({ s: sFn(t), bitting: bit });
    if (prev && prev2) st.forEach((p, k) => { if (prev[k].kb - prev2[k].kb > 1e-4 && p.kb - prev[k].kb < -1e-4) out.push(+t.toFixed(3)); });
    prev2 = prev; prev = st;
  }
  return out;
}
const ev = {
  DUR, cuts, A: Object.fromEntries(Object.entries(A).map(([k, v]) => [k, [v.start, v.end]])),
  hookClicks: clicks(0, cuts[0], (t) => 24 - 16 * (t / cuts[0]), FS.RIGHT),
  wrongClicks: clicks(cuts[3], cuts[3] + 0.6, (t) => 18 * (1 - o3((t - cuts[3]) / 0.55)), FS.WRONG),
  rightClicks: clicks(cuts[6], cuts[6] + 1.0, (t) => 20 * (1 - o3((t - cuts[6]) / 0.9)), FS.RIGHT),
  loopClicks: clicks(cuts[13], DUR, (t) => 30 - 6 * ((t - cuts[13]) / (DUR - cuts[13])), FS.RIGHT),
};
console.log(JSON.stringify(ev));
