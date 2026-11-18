import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';
import fs from 'fs';
const G = { R: 6.35, shear: 6.35, chamberTop: 16.2, pinX: [5.84, 9.8, 13.76, 17.72, 21.68], bladeBot: -5.6, keywayTop: 3.35, plugLen: 28.5 };
const mBody = new THREE.MeshStandardMaterial({ name: 'body' });
const mCut = new THREE.MeshStandardMaterial({ name: 'cut' });
const mBore = new THREE.MeshStandardMaterial({ name: 'bore' });
const ev = new Evaluator(); ev.useGroups = true; ev.attributes = ['position', 'normal'];
const brush = (geo, mat) => { const b = new Brush(geo, mat); b.updateMatrixWorld(); return b; };
const cylX = (r, x0, x1, seg = 64) => { const g = new THREE.CylinderGeometry(r, r, x1 - x0, seg, 1); g.rotateZ(Math.PI / 2); g.translate((x0 + x1) / 2, 0, 0); return g; };
const cylY = (r, x, y0, y1, seg = 32) => { const g = new THREE.CylinderGeometry(r, r, y1 - y0, seg, 1); g.translate(x, (y0 + y1) / 2, 0); return g; };
const box = (x0, x1, y0, y1, z0, z1) => { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return g; };

// housing end profile: circle R11 + bible (rounded top), extruded along X
const sh = new THREE.Shape();
const R = 11, bw = 4.6, top = 18.4, rr = 2.2;
const a0 = Math.asin(bw / R);
sh.moveTo(-bw, Math.cos(a0) * R);
sh.absarc(0, 0, R, Math.PI / 2 + a0, Math.PI * 2 + Math.PI / 2 - a0, false);
sh.lineTo(bw, top - rr); sh.quadraticCurveTo(bw, top, bw - rr, top);
sh.lineTo(-bw + rr, top); sh.quadraticCurveTo(-bw, top, -bw, top - rr); sh.closePath();
let hg = new THREE.ExtrudeGeometry(sh, { depth: 31.0, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 3, curveSegments: 72 });
hg.rotateY(Math.PI / 2); hg.translate(-0.6, 0, 0);
hg = hg.toNonIndexed(); hg.computeVertexNormals();
let housing = brush(hg, mBody);
housing = ev.evaluate(housing, brush(cylX(6.42, -2, 33), mBore), SUBTRACTION);
for (const x of G.pinX) housing = ev.evaluate(housing, brush(cylY(1.64, x, 4.0, G.chamberTop), mBore), SUBTRACTION);
housing = ev.evaluate(housing, brush(box(-3, 34, -15, 25, 0, 20), mCut), SUBTRACTION);

let plug = brush(cylX(G.R, 0, G.plugLen, 96), mBody);
plug = ev.evaluate(plug, brush(box(-1, G.plugLen - 1.2, G.bladeBot - 0.35, G.keywayTop, -1.15, 1.15), mBore), SUBTRACTION);
for (const x of G.pinX) plug = ev.evaluate(plug, brush(cylY(1.64, x, 1.0, 8.0), mBore), SUBTRACTION);
plug = ev.evaluate(plug, brush(box(-3, 34, -15, 25, 0, 20), mCut), SUBTRACTION);

const out = {};
for (const [name, b] of Object.entries({ housing, plug })) {
  const g = b.geometry; g.computeBoundingBox();
  const mats = (Array.isArray(b.material) ? b.material : [b.material]).map((m) => m.name);
  out[name] = { json: g.toJSON(), mats };
  console.log(name, g.attributes.position.count, 'verts, groups', g.groups.length, mats, g.boundingBox.min.toArray().map(v=>v.toFixed(1)), g.boundingBox.max.toArray().map(v=>v.toFixed(1)));
}
fs.writeFileSync('/home/user/lock-short/assets/lock-geo.js', 'window.LOCK_GEO = ' + JSON.stringify(out) + ';\n');
console.log('bytes', fs.statSync('/home/user/lock-short/assets/lock-geo.js').size);
