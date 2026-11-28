// v6 sound-event times from the word anchors + lock physics (same anchors/shots as assets/film6.js)
global.window = {}; global.document = {};
require('../assets/components/lock-cutaway.js'); require('../assets/film-script.js');
const L = window.LockCutaway, FS = window.FilmScript;
const words = require(process.env.WORDS ? require('path').resolve(process.env.WORDS) : '../assets/v6-words.json');
const ORDER = ['wrong','lock','wont','and','inside','every','pins','stacked','pairs','springs','top','block','cylinder','until','right','lifts','exactly','height','then','gap','line','click','turns','the','wrong','less','so','tiny','pin','all','out','and','why'];
const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
const A = {}, seen = {}; let i = 0, last = { start: 0, end: 0.3 };
for (const item of (process.env.ORDER ? process.env.ORDER.split(',') : ORDER)) { const [w, as] = item.includes('>') ? item.split('>') : [item, item]; let j = i; while (j < words.length && norm(words[j].text) !== w) j++; const k = seen[as] ? as + (seen[as] + 1) : as; seen[as] = (seen[as] || 0) + 1; if (j < words.length) { A[k] = words[j]; last = words[j]; i = j + 1; } else A[k] = { start: last.end + 0.3, end: last.end + 0.6 }; }
const c = (w, d = 0.06) => Math.max(0, A[w].start - d);
const DUR = Math.round((A.why.end + 0.3) * 30) / 30;
const shots = { hookJam: c('lock'), dive: c('and'), reveal: c('inside'), pinsA: c('every'), pinsB: c('stacked'), block: c('top', 0.18), rightIn: c('until'),
  height: c('exactly'), align: c('then'), click: c('click'), doorOpen: c('turns', 0.1), wrongIn: c('the'), tiny: c('so'), lockedOut: c('all'), loop: c('and2') };
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
const R = shots.reveal, P = shots.pinsA, rs = A.right.start - 0.12, W = shots.wrongIn;
console.log(JSON.stringify({
  DUR, shots, A: Object.fromEntries(Object.entries(A).map(([k, v]) => [k, [v.start, v.end]])),
  revealClicks: clicks(R, P, (t) => 16 * (1 - o3((t - R) / (P - 0.1 - R))), FS.WRONG),
  rightClicks: clicks(rs, rs + 1.0, (t) => 20 * (1 - o3((t - rs) / 0.97)), FS.RIGHT),
  wrongClicks: clicks(W, W + 0.6, (t) => 18 * (1 - o3((t - W) / 0.55)), FS.WRONG),
}));
