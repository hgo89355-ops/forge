// MOBCO Explore in 3D · models/_kit.js
// Shared detail kit for the project models: tracked materials and geometry, a profile loft (sweeps and
// banded shells), instancing helpers, canvas textures, layered trees, palms, shrubs, cars and street lamps.
// Not a model (it exports no meta/build); THREE is passed in by each model's build().

/** Deterministic PRNG (mulberry32). */
export function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** Profile point helper: [u, v, sharp, materialIndex]. */
export const P = (u, v, sharp = 0, mat = 0) => [u, v, sharp ? 1 : 0, mat];

/**
 * A closed band profile between two height-dependent faces: uIn(v) (courtyard / inner side, usually negative)
 * and uOut(v) (outer side). Counter-clockwise in (u, v), so a loft along a path faces outwards.
 * mats: { bot, out, top, in } material indices for each side.
 */
export function bandProfile(uIn, uOut, y0, y1, K = 8, mats = {}, ease = 0) {
  const mb = mats.bot ?? 0, mo = mats.out ?? 0, mt = mats.top ?? 0, mi = mats.in ?? 0;
  const vAt = (k) => {
    const t = k / K;
    const e = ease > 0 ? 1 - Math.pow(1 - t, 1 + ease) : t; // ease > 0 packs samples towards y1
    return y0 + (y1 - y0) * e;
  };
  const pts = [P(uIn(y0), y0, 1, mb), P(uOut(y0), y0, 1, mo)];
  for (let k = 1; k < K; k++) { const v = vAt(k); pts.push(P(uOut(v), v, 0, mo)); }
  pts.push(P(uOut(y1), y1, 1, mt), P(uIn(y1), y1, 1, mi));
  for (let k = K - 1; k >= 1; k--) { const v = vAt(k); pts.push(P(uIn(v), v, 0, mi)); }
  return pts;
}

/** Rectangle profile (u0..u1, v0..v1), counter-clockwise, sharp corners. */
export function rectProfile(u0, u1, v0, v1, mats = {}) {
  return [P(u0, v0, 1, mats.bot ?? 0), P(u1, v0, 1, mats.out ?? 0), P(u1, v1, 1, mats.top ?? 0), P(u0, v1, 1, mats.in ?? 0)];
}

export function createKit(THREE, ctx = {}) {
  const high = ctx.quality !== 'low';
  const geos = new Set(), mats = new Set(), texs = new Set();
  const nightMaterials = [];
  const lamps = [];
  const g = (x) => (geos.add(x), x);
  const m = (x) => (mats.add(x), x);
  const tx = (x) => (texs.add(x), x);
  const envMap = ctx.envMap || null;

  /* ------------------------------------------------------------ materials */
  function std(p) { return m(new THREE.MeshStandardMaterial(p)); }
  function phys(p) { return m(new THREE.MeshPhysicalMaterial(p)); }
  /** Exterior glazing: tinted, reflective, slightly see-through. */
  function glass(name, color = 0x8fb0bf, opts = {}) {
    const mat = phys({
      name, color, roughness: opts.roughness ?? 0.06, metalness: opts.metalness ?? 0.15,
      transparent: true, opacity: opts.opacity ?? 0.38, envMap, envMapIntensity: opts.env ?? 1.35,
      clearcoat: high ? 0.6 : 0, clearcoatRoughness: 0.08, depthWrite: false, side: opts.side ?? THREE.FrontSide,
      reflectivity: 0.6,
    });
    mat.userData.baseEnvMapIntensity = opts.env ?? 1.35;
    return mat;
  }
  /** Interior seen through glass: a warm ceiling / room tone that glows at night. */
  function interior(name, color = 0x5a5650, emissive = 0xffd2a0, nightMax = 1) {
    const mat = std({ name, color, emissive, emissiveIntensity: 0, roughness: 0.95, metalness: 0 });
    mat.userData.__nightMax = nightMax;
    mat.userData.realism = 'plain';
    nightMaterials.push(mat);
    return mat;
  }
  /** Emissive accent (lamp heads, light lines). */
  function lampMat(name, emissive = 0xffe2b0, nightMax = 2.2) {
    const mat = std({ name, color: 0xf3f0ea, emissive, emissiveIntensity: 0, roughness: 0.4 });
    mat.userData.__nightMax = nightMax;
    nightMaterials.push(mat);
    return mat;
  }
  /** Water with a moving normal map; glows faintly at night. */
  function water(name = 'water', color = 0x4f9fb2, opts = {}) {
    const mat = phys({
      name, color, roughness: opts.roughness ?? 0.04, metalness: 0.05, envMap, envMapIntensity: 1.25,
      clearcoat: high ? 1 : 0, clearcoatRoughness: 0.05, emissive: opts.emissive ?? 0x2aa8c0, emissiveIntensity: 0,
      normalMap: waterNormal(), normalScale: new THREE.Vector2(0.16, 0.16),
    });
    mat.userData.baseEnvMapIntensity = 1.25;
    mat.userData.__nightMax = opts.nightMax ?? 0.45;
    nightMaterials.push(mat);
    return mat;
  }

  /* ------------------------------------------------------------ textures */
  function canvasTex(w, h, draw, { srgb = true, repeat = null, anisotropy = 4 } = {}) {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = tx(new THREE.CanvasTexture(c));
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = anisotropy;
    if (repeat) t.repeat.set(repeat[0], repeat[1]);
    t.needsUpdate = true;
    return t;
  }
  let _waterN = null;
  function waterNormal() {
    if (_waterN) return _waterN;
    const S = high ? 256 : 128;
    const rnd = makeRng(91);
    const waves = Array.from({ length: 14 }, () => ({ kx: (rnd() - 0.5) * 24, ky: (rnd() - 0.5) * 24, ph: rnd() * 6.28, a: 0.3 + rnd() }));
    _waterN = canvasTex(S, S, (c, w, h) => {
      const img = c.createImageData(w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let dx = 0, dy = 0;
        for (const wv of waves) {
          const kx = Math.round(wv.kx), ky = Math.round(wv.ky);
          const ph = (2 * Math.PI * (kx * x / w + ky * y / h)) + wv.ph;
          const cph = Math.cos(ph) * wv.a;
          dx += cph * kx * 0.02; dy += cph * ky * 0.02;
        }
        const nx = -dx, ny = -dy, nz = 1, l = Math.hypot(nx, ny, nz);
        const i = (y * w + x) * 4;
        img.data[i] = (nx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; img.data[i + 2] = (nz / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
      }
      c.putImageData(img, 0, 0);
    }, { srgb: false, repeat: [0.08, 0.08] });
    return _waterN;
  }

  /* ------------------------------------------------------------ rooms behind glass */
  // A COLS x ROWS atlas of rooms: by day, varied interior tones (dark rooms, pale curtains, warm walls); at night
  // about `lit` of them glow (warm, a few cool), each with a brighter ceiling band. A room box's UVs are in
  // (bay, level) cell units, so neighbouring floors and bays pick different cells.
  const ROOM_COLS = 32, ROOM_ROWS = 32;
  const _rooms = new Map();
  function roomsMaterial(name = 'rooms-interior', { seed = 7, lit = 0.55, nightMax = 1.6, tone = 0x6e6a64 } = {}) {
    const key = `${name}|${seed}|${lit}`;
    if (_rooms.has(key)) return _rooms.get(key);
    const rnd = makeRng(seed);
    const cells = [];
    for (let r = 0; r < ROOM_ROWS; r++) for (let c = 0; c < ROOM_COLS; c++) {
      cells.push({ r, c, on: rnd() < lit, warm: rnd() < 0.86, k: 0.55 + rnd() * 0.45, blind: rnd() < 0.35 ? 0.15 + rnd() * 0.5 : 0, curtain: rnd(), shade: rnd() });
    }
    const S = high ? 16 : 8;
    const draw = (emit) => (cx, w, h) => {
      cx.fillStyle = emit ? '#000' : '#3b3d40'; cx.fillRect(0, 0, w, h);
      for (const cl of cells) {
        const x0 = cl.c * S, y0 = (ROOM_ROWS - 1 - cl.r) * S;
        if (emit) {
          if (!cl.on) continue;
          const k = cl.k;
          const col = (m) => cl.warm ? `rgb(${Math.round(255 * k * m)},${Math.round(196 * k * m)},${Math.round(128 * k * m)})` : `rgb(${Math.round(200 * k * m)},${Math.round(222 * k * m)},${Math.round(255 * k * m)})`;
          const g2 = cx.createLinearGradient(0, y0, 0, y0 + S);
          g2.addColorStop(0, col(1.0)); g2.addColorStop(0.25, col(0.85)); g2.addColorStop(1, col(0.45));
          cx.fillStyle = g2; cx.fillRect(x0 + 1, y0 + 1, S - 2, S - 2);
          if (cl.blind) { cx.fillStyle = col(0.3); cx.fillRect(x0 + 1, y0 + 1, S - 2, Math.round((S - 2) * cl.blind)); }
        } else {
          // interior by day: back wall tone, a pale ceiling line, sometimes a light curtain
          const v = 26 + Math.round(cl.shade * 38);
          cx.fillStyle = `rgb(${v + 10},${v + 7},${v + 3})`; cx.fillRect(x0, y0, S, S);
          cx.fillStyle = `rgba(225,220,210,${0.25 + cl.shade * 0.2})`; cx.fillRect(x0, y0, S, Math.max(1, S / 8));
          if (cl.curtain < 0.2) { cx.fillStyle = `rgba(232,226,214,${0.6 + cl.shade * 0.3})`; cx.fillRect(x0 + (cl.curtain < 0.15 ? 0 : S / 2), y0 + 1, S / 2, S - 1); }
          if (cl.blind) { cx.fillStyle = 'rgba(220,214,204,0.85)'; cx.fillRect(x0, y0 + 1, S, Math.round((S - 1) * cl.blind)); }
        }
      }
    };
    const rep = [1 / ROOM_COLS, 1 / ROOM_ROWS];
    const map = canvasTex(ROOM_COLS * S, ROOM_ROWS * S, draw(false), { repeat: rep });
    const emissiveMap = canvasTex(ROOM_COLS * S, ROOM_ROWS * S, draw(true), { repeat: rep });
    if (map) { map.magFilter = THREE.NearestFilter; }
    const mat = std({ name, color: 0xffffff, map, emissive: 0xffffff, emissiveMap, emissiveIntensity: 0, roughness: 0.9, metalness: 0 });
    if (!map) mat.color.set(tone);
    mat.userData.__nightMax = nightMax;
    mat.userData.realism = 'plain';
    nightMaterials.push(mat);
    _rooms.set(key, mat);
    return mat;
  }
  /** Box geometry for one storey of rooms (bottom at y = 0), UVs in (bay, level) cells. */
  function roomBox(w, h, d, level = 0, bay = 3.2, shift = 0) {
    const geo = new THREE.BoxGeometry(w, h, d);
    geo.translate(0, h / 2, 0);
    const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
    const off = (level * 7 + shift) % ROOM_COLS;
    for (let i = 0; i < p.count; i++) {
      const nx = n.getX(i), ny = n.getY(i);
      const along = Math.abs(nx) > 0.5 ? p.getZ(i) + d / 2 + (nx > 0 ? 13 : 5) * bay : p.getX(i) + w / 2 + (n.getZ(i) > 0 ? 0 : 19 * bay);
      const v = Math.abs(ny) > 0.5 ? level + 0.02 : level + 0.02 + (p.getY(i) / h) * 0.96;
      uv.setXY(i, along / bay + off, v);
    }
    return g(geo);
  }

  /**
   * Remap any geometry's UVs to rooms-atlas cells: u = distance along the facade / bay, v = level + height
   * fraction (y0..y0 + h in local units). cyl: { R } maps curved walls by arc length around the local y axis.
   */
  function roomUV(geo, level, { bay = 3.2, y0 = 0, h = 1, cyl = null, shift = 0 } = {}) {
    const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
    if (!uv || !n) return geo;
    const off = (level * 7 + shift) % ROOM_COLS;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      let along;
      if (cyl) along = (Math.atan2(x, z) + Math.PI) * cyl.R;
      else along = Math.abs(n.getX(i)) > 0.5 ? z + (n.getX(i) > 0 ? 40 : 7) : x + (n.getZ(i) > 0 ? 0 : 23);
      const v = Math.abs(n.getY(i)) > 0.7 ? level + 0.02 : level + 0.02 + clamp((y - y0) / h, 0, 1) * 0.96;
      uv.setXY(i, along / bay + off, v);
    }
    uv.needsUpdate = true;
    return geo;
  }

  /* ------------------------------------------------------------ loft */
  /**
   * Loft a profile through a list of stations. Each station: { o:[x,y,z], U:[x,y,z], V:[x,y,z], prof:[[u,v,sharp,mat],...] }.
   * World point = o + U*u + V*v. Every station's profile has the same point count.
   * opts: closed (path loops), caps (end caps on an open path), capMat, openProfile, flip.
   * UVs: x = distance along the path (m), y = distance along the profile (m). Groups by profile material index.
   */
  function loft(stations, opts = {}) {
    const closed = !!opts.closed;
    const st = closed ? [...stations, stations[0]] : stations;
    const M = st.length;
    const N = st[0].prof.length;
    const openP = !!opts.openProfile;
    const pos = [], uv = [];
    const idxIn = [], idxOut = [];
    let along = 0;
    for (let i = 0; i < M; i++) {
      const s = st[i];
      if (i > 0) { const a = st[i - 1].o; along += Math.hypot(s.o[0] - a[0], s.o[1] - a[1], s.o[2] - a[2]); }
      const rowIn = [], rowOut = [];
      let pl = 0;
      for (let j = 0; j < N; j++) {
        const p = s.prof[j];
        if (j > 0) { const q = s.prof[j - 1]; pl += Math.hypot(p[0] - q[0], p[1] - q[1]); }
        const x = s.o[0] + s.U[0] * p[0] + s.V[0] * p[1];
        const y = s.o[1] + s.U[1] * p[0] + s.V[1] * p[1];
        const z = s.o[2] + s.U[2] * p[0] + s.V[2] * p[1];
        const k = pos.length / 3;
        pos.push(x, y, z); uv.push(along, pl);
        if (p[2]) { pos.push(x, y, z); uv.push(along, pl); rowIn.push(k); rowOut.push(k + 1); }
        else { rowIn.push(k); rowOut.push(k); }
      }
      idxIn.push(rowIn); idxOut.push(rowOut);
    }
    const byMat = new Map();
    const push = (mi, ...v) => { if (!byMat.has(mi)) byMat.set(mi, []); byMat.get(mi).push(...v); };
    const E = openP ? N - 1 : N;
    for (let i = 0; i < M - 1; i++) {
      for (let j = 0; j < E; j++) {
        const j2 = (j + 1) % N;
        const mi = st[0].prof[j][3] || 0;
        const a = idxOut[i][j], b = idxOut[i + 1][j], c = idxIn[i + 1][j2], d = idxIn[i][j2];
        if (opts.flip) push(mi, a, d, b, b, d, c); else push(mi, a, b, d, b, c, d);
      }
    }
    // caps (flat, separate vertices)
    if (!closed && opts.caps && !openP) {
      const capMi = opts.capMat ?? (st[0].prof[0][3] || 0);
      for (const [i, dir] of [[0, -1], [M - 1, 1]]) {
        const s = st[i];
        const contour = s.prof.map((p) => new THREE.Vector2(p[0], p[1]));
        let tris;
        try { tris = THREE.ShapeUtils.triangulateShape(contour, []); } catch { tris = []; }
        const base = pos.length / 3;
        for (const p of s.prof) {
          pos.push(s.o[0] + s.U[0] * p[0] + s.V[0] * p[1], s.o[1] + s.U[1] * p[0] + s.V[1] * p[1], s.o[2] + s.U[2] * p[0] + s.V[2] * p[1]);
          uv.push(p[0], p[1]);
        }
        const ccw = THREE.ShapeUtils.area(contour) > 0;
        for (const t of tris) {
          let [a, b, c] = t;
          // the start cap faces backwards along the path, the end cap forwards
          const forward = (dir > 0) !== !ccw;
          const f = opts.flip ? !forward : forward;
          if (f) push(capMi, base + a, base + b, base + c); else push(capMi, base + a, base + c, base + b);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const index = [];
    [...byMat.keys()].sort((a, b) => a - b).forEach((mi) => {
      const arr = byMat.get(mi);
      geo.addGroup(index.length, arr.length, mi);
      index.push(...arr);
    });
    geo.setIndex(index);
    geo.computeVertexNormals();
    if (closed) {
      // weld the seam normals (first and last station share a position)
      const n = geo.attributes.normal;
      for (let j = 0; j < N; j++) {
        for (const [a, b] of [[idxIn[0][j], idxIn[M - 1][j]], [idxOut[0][j], idxOut[M - 1][j]]]) {
          const x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b);
          const l = Math.hypot(x, y, z) || 1;
          n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l);
        }
      }
    }
    geo.computeBoundingSphere();
    return g(geo);
  }

  /**
   * Stations along a plan path ([x,z] or [x,y,z] points; y defaults to 0). U = horizontal normal pointing to the
   * right of travel when the path runs clockwise seen from above... in practice: for a loop parameterised by
   * angle a (x = R sin a, z = R cos a, a increasing), U points outwards. V = up.
   */
  function planStations(path, profFn, { closed = false } = {}) {
    const n = path.length;
    return path.map((p, i) => {
      const a = path[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
      const b = path[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      const ax = a[0], az = a.length === 3 ? a[2] : a[1];
      const bx = b[0], bz = b.length === 3 ? b[2] : b[1];
      let tx = bx - ax, tz = bz - az; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      const y = p.length === 3 ? p[1] : 0;
      const z = p.length === 3 ? p[2] : p[1];
      return { o: [p[0], y, z], U: [-tz, 0, tx], V: [0, 1, 0], prof: profFn(i / (closed ? n : Math.max(1, n - 1)), i) };
    });
  }
  function sweep(path, profFn, opts = {}) { return loft(planStations(path, profFn, opts), opts); }

  /** Points on an ellipse arc, angle a from +z towards +x (radians). */
  function arc(cx, cz, rx, rz, a0, a1, n) {
    const out = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); out.push([cx + Math.sin(a) * rx, cz + Math.cos(a) * rz]); }
    return out;
  }
  /** Catmull-Rom resample of control points ([x,z] or [x,y,z]) into n points. */
  function spline(ctrl, n, closed = false) {
    const pts = ctrl.map((p) => (p.length === 3 ? new THREE.Vector3(p[0], p[1], p[2]) : new THREE.Vector3(p[0], 0, p[1])));
    const c = new THREE.CatmullRomCurve3(pts, closed, 'centripetal');
    const three = ctrl[0].length === 3;
    return c.getSpacedPoints(closed ? n : n - 1).slice(0, closed ? n : n).map((v) => (three ? [v.x, v.y, v.z] : [v.x, v.z]));
  }

  /* ------------------------------------------------------------ geometry utils */
  /** Merge geometries (non-indexed output) keeping position, normal, uv and optional color. */
  function merge(list, { color = false } = {}) {
    const P = [], N = [], U = [], C = [];
    for (const src of list) {
      const geo = src.index ? src.toNonIndexed() : src;
      const p = geo.attributes.position, n = geo.attributes.normal, u = geo.attributes.uv, c = geo.attributes.color;
      for (let i = 0; i < p.count; i++) {
        P.push(p.getX(i), p.getY(i), p.getZ(i));
        if (n) N.push(n.getX(i), n.getY(i), n.getZ(i)); else N.push(0, 1, 0);
        if (u) U.push(u.getX(i), u.getY(i)); else U.push(0, 0);
        if (color) { if (c) C.push(c.getX(i), c.getY(i), c.getZ(i)); else C.push(1, 1, 1); }
      }
      if (geo !== src) geo.dispose();
      src.dispose();
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    out.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    if (color) out.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    out.computeBoundingSphere();
    return g(out);
  }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Euler();
  /** Matrix from position, yaw (and optional pitch/roll) and scale. */
  function mat4(x, y, z, ry = 0, sx = 1, sy = sx, sz = sx, rx = 0, rz = 0) {
    _e.set(rx, ry, rz, 'YXZ');
    _q.setFromEuler(_e);
    return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
  }
  /** InstancedMesh from a list of matrices (and optional colours). */
  function inst(name, geo, mat, matrices, { cast = true, receive = true, colors = null } = {}) {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, matrices.length));
    im.name = name;
    matrices.forEach((mx, i) => im.setMatrixAt(i, mx));
    im.count = matrices.length;
    if (colors) colors.forEach((c, i) => im.setColorAt(i, c));
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = cast; im.receiveShadow = receive;
    im.computeBoundingSphere?.();
    return im;
  }
  function mesh(name, geo, mat, { cast = true, receive = true } = {}) {
    const o = new THREE.Mesh(geo, mat);
    o.name = name; o.castShadow = cast; o.receiveShadow = receive;
    return o;
  }
  function box(w, h, d) { return g(new THREE.BoxGeometry(w, h, d)); }
  /** Flat polygon (plan points [x,z]) at height y, facing up. */
  function flat(pts, y = 0, holes = []) {
    const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    holes.forEach((h) => shape.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z)))));
    const geo = new THREE.ShapeGeometry(shape, 24);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, y, 0);
    // UVs in metres
    const p = geo.attributes.position, u = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) u.setXY(i, p.getX(i), p.getZ(i));
    return g(geo);
  }
  /** Extruded plan polygon from y0 to y1 (solid slab / block). */
  function prism(pts, y0, y1, holes = []) {
    const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    holes.forEach((h) => shape.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z)))));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false, curveSegments: 24 });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, y0, 0);
    return g(geo);
  }

  /* ------------------------------------------------------------ vegetation */
  // Layered broadleaf crown: a few lumpy blobs merged, darker underneath (vertex colour), unit height ~1.
  function crownGeo(seed, lobes = 7) {
    const rnd = makeRng(seed);
    const parts = [];
    for (let k = 0; k < lobes; k++) {
      const r = k === 0 ? 0.46 : 0.24 + rnd() * 0.16;
      const geo = new THREE.IcosahedronGeometry(r, high && k < 4 ? 1 : 0);
      const a = rnd() * Math.PI * 2, d = k === 0 ? 0 : 0.2 + rnd() * 0.2;
      const cx = Math.cos(a) * d, cz = Math.sin(a) * d, cy = k === 0 ? 0.55 : 0.35 + rnd() * 0.45;
      const p = geo.attributes.position;
      const nrm = [], col = [];
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const l = Math.hypot(x, y, z) || 1;
        // soft "foliage" normals: radial from the lobe centre, biased upwards
        const nx = x / l, ny = y / l * 0.8 + 0.35, nz = z / l, nl = Math.hypot(nx, ny, nz);
        nrm.push(nx / nl, ny / nl, nz / nl);
        const n = 1 + Math.sin(x * 13.1 + seed + k) * Math.cos(z * 11.7 - y * 5.3) * 0.16;
        x = x * n + cx; y = y * n * 0.8 + cy; z = z * n + cz;
        p.setXYZ(i, x, y, z);
        const shade = 0.58 + 0.42 * clamp((y - 0.05) / 0.95, 0, 1);
        col.push(shade, shade, shade);
      }
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      parts.push(geo);
    }
    return merge(parts, { color: true });
  }
  let _trees = null;
  function treeParts() {
    if (_trees) return _trees;
    const trunk = g(new THREE.CylinderGeometry(0.06, 0.1, 1, 6, 1));
    trunk.translate(0, 0.5, 0);
    _trees = {
      trunk,
      crowns: [crownGeo(3, high ? 6 : 5), crownGeo(17, high ? 5 : 4), crownGeo(29, high ? 7 : 5)],
      trunkMat: std({ name: 'tree-trunk-bark', color: 0x6b5a48, roughness: 1 }),
      crownMat: (() => {
        // leafy cut-out texture: the lobes read as clumps of leaves with ragged edges and gaps
        const leaf = canvasTex(256, 256, (c, w, h) => {
          const rnd = makeRng(611);
          c.clearRect(0, 0, w, h);
          for (let i = 0; i < 1350; i++) {
            const x = rnd() * w, y = rnd() * h, r = 3 + rnd() * 5, a = rnd() * Math.PI;
            const v = 150 + Math.round(rnd() * 105);
            c.fillStyle = `rgb(${v},${v},${v})`;
            for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
              c.beginPath(); c.ellipse(x + ox, y + oy, r, r * 0.55, a, 0, Math.PI * 2); c.fill();
            }
          }
        }, { repeat: [3, 3] });
        const mt = std({ name: 'tree-foliage', color: 0xffffff, vertexColors: true, roughness: 0.92, metalness: 0, map: leaf, alphaTest: leaf ? 0.45 : 0, side: leaf ? THREE.DoubleSide : THREE.FrontSide });
        return mt;
      })(),
    };
    return _trees;
  }
  /**
   * Broadleaf trees. spots: [[x, z, height, spread?], ...]. Colour varies per tree (palette of greens).
   * Returns the meshes added to parent.
   */
  function trees(parent, spots, { seed = 5, palette = [0x5f7d43, 0x6d8a4a, 0x4f6f3e, 0x7a9152, 0x587a48], name = 'trees' } = {}) {
    const T = treeParts();
    const rnd = makeRng(seed);
    const trunkM = [], crownM = [[], [], []], crownC = [[], [], []];
    for (const [x, z, h = 8, spread = 1] of spots) {
      const ry = rnd() * 6.28;
      const th = h * 0.42;
      trunkM.push(mat4(x, 0, z, ry, h * 0.09, th, h * 0.09));
      const v = Math.floor(rnd() * 3);
      const w = h * 0.78 * spread * (0.85 + rnd() * 0.3);
      crownM[v].push(mat4(x, th * 0.7, z, ry, w, h * 0.66, w));
      const c = new THREE.Color(palette[Math.floor(rnd() * palette.length)]);
      c.offsetHSL((rnd() - 0.5) * 0.03, (rnd() - 0.5) * 0.08, (rnd() - 0.5) * 0.06);
      crownC[v].push(c);
    }
    const out = [inst(`${name}-trunks`, T.trunk, T.trunkMat, trunkM)];
    crownM.forEach((list, v) => { if (list.length) out.push(inst(`${name}-crowns-${v}`, T.crowns[v], T.crownMat, list, { colors: crownC[v] })); });
    out.forEach((o) => parent.add(o));
    return out;
  }

  let _palm = null;
  function palmParts() {
    if (_palm) return _palm;
    const trunk = g(new THREE.CylinderGeometry(0.13, 0.2, 1, 7, 4));
    trunk.translate(0, 0.5, 0);
    // gentle lean
    const tp = trunk.attributes.position;
    for (let i = 0; i < tp.count; i++) { const y = tp.getY(i); tp.setX(i, tp.getX(i) + y * y * 0.18); }
    trunk.computeVertexNormals();
    const fronds = [];
    const n = high ? 11 : 8;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + (k % 2) * 0.2;
      const seg = high ? 6 : 4;
      const pos = [], uvs = [];
      const len = 2.6 + (k % 3) * 0.35;
      const up = k % 2 ? 0.55 : 0.25;
      for (let s = 0; s <= seg; s++) {
        const t = s / seg;
        const r = t * len;
        const y = 0.18 + up * Math.sin(t * Math.PI * 0.9) - t * t * 1.1;
        const w = 0.42 * Math.sin(Math.PI * Math.min(1, t * 1.08 + 0.05));
        const cx = Math.sin(a) * r, cz = Math.cos(a) * r;
        const px = Math.cos(a) * w, pz = -Math.sin(a) * w;
        pos.push(cx - px, y - w * 0.25, cz - pz, cx + px, y - w * 0.25, cz + pz, cx, y + 0.02, cz);
        uvs.push(0, t, 1, t, 0.5, t);
      }
      const idx = [];
      for (let s = 0; s < seg; s++) {
        const b = s * 3, c = b + 3;
        idx.push(b, c, b + 2, b + 2, c, c + 2, b + 2, c + 2, b + 1, b + 1, c + 2, c + 1);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      fronds.push(geo);
    }
    const crown = merge(fronds);
    _palm = {
      trunk, crown,
      trunkMat: std({ name: 'palm-trunk-bark', color: 0x8a7a64, roughness: 1 }),
      frondMat: std({ name: 'palm-frond', color: 0x557a3c, roughness: 0.85, side: THREE.DoubleSide }),
    };
    return _palm;
  }
  /** Palms. spots: [[x, z, height], ...]. */
  function palms(parent, spots, { seed = 9, name = 'palms', y = 0 } = {}) {
    const T = palmParts();
    const rnd = makeRng(seed);
    const tm = [], cm = [];
    for (const [x, z, h = 7] of spots) {
      const ry = rnd() * 6.28;
      tm.push(mat4(x, y, z, ry, 1, h, 1));
      // trunk top after the lean (x offset 0.18 * h^2 in unit space -> 0.18 * 1 at the top, scaled by 1)
      const off = 0.18;
      cm.push(mat4(x + Math.cos(ry) * off, y + h, z - Math.sin(ry) * off, ry + rnd(), 1 + h * 0.03));
    }
    const out = [inst(`${name}-trunks`, T.trunk, T.trunkMat, tm), inst(`${name}-crowns`, T.crown, T.frondMat, cm)];
    out.forEach((o) => parent.add(o));
    return out;
  }

  let _shrub = null;
  /** Low clipped shrubs / bushes. spots: [[x, z, size], ...]. */
  function shrubs(parent, spots, { seed = 13, name = 'shrubs', color = 0x5c7a45, y = 0 } = {}) {
    if (!_shrub) {
      const geo = g(new THREE.IcosahedronGeometry(0.5, high ? 1 : 0));
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const yy = p.getY(i); p.setY(i, Math.max(-0.1, yy) * 0.8 + 0.12); }
      geo.computeVertexNormals();
      _shrub = { geo, mat: std({ name: 'shrub-foliage', color: 0xffffff, roughness: 0.95 }) };
    }
    const rnd = makeRng(seed);
    const ms = [], cs = [];
    for (const [x, z, s = 1.2] of spots) {
      ms.push(mat4(x, y, z, rnd() * 6, s * (0.8 + rnd() * 0.4), s * (0.6 + rnd() * 0.3), s * (0.8 + rnd() * 0.4)));
      const c = new THREE.Color(color); c.offsetHSL((rnd() - 0.5) * 0.04, (rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.08); cs.push(c);
    }
    const o = inst(name, _shrub.geo, _shrub.mat, ms, { colors: cs });
    parent.add(o);
    return o;
  }

  /* ------------------------------------------------------------ street furniture */
  let _car = null;
  /** Simple cars. list: [[x, z, yaw], ...] (yaw 0 = driving towards +z). */
  function cars(parent, list, { seed = 21, name = 'cars' } = {}) {
    if (!_car) {
      const body = new THREE.BoxGeometry(1.8, 0.62, 4.3); body.translate(0, 0.52, 0);
      const cabin = new THREE.BoxGeometry(1.56, 0.5, 2.2); cabin.translate(0, 1.07, -0.2);
      const cp = cabin.attributes.position;
      for (let i = 0; i < cp.count; i++) if (cp.getY(i) > 1.1) cp.setX(i, cp.getX(i) * 0.9);
      cabin.computeVertexNormals();
      const glassG = new THREE.BoxGeometry(1.6, 0.36, 2.0); glassG.translate(0, 1.04, -0.2);
      _car = {
        body: merge([body, cabin]),
        glass: g(glassG),
        paint: phys({ name: 'car-paint', color: 0xffffff, roughness: 0.32, metalness: 0.5, clearcoat: high ? 1 : 0, clearcoatRoughness: 0.1, envMap, envMapIntensity: 1 }),
        glassMat: std({ name: 'car-window', color: 0x1d242b, roughness: 0.1, metalness: 0.6, envMap, envMapIntensity: 1 }),
      };
    }
    const rnd = makeRng(seed);
    const palette = [0xf2f2f0, 0xf2f2f0, 0x1d1f22, 0x8f969c, 0x3d4a5c, 0xb9bec2, 0x7a2b2b, 0xdedbd2];
    const ms = [], cs = [], gm = [];
    for (const [x, z, yaw] of list) {
      const mx = mat4(x, 0, z, yaw);
      ms.push(mx); gm.push(mx);
      cs.push(new THREE.Color(palette[Math.floor(rnd() * palette.length)]));
    }
    const a = inst(`${name}-bodies`, _car.body, _car.paint, ms, { colors: cs });
    const b = inst(`${name}-windows`, _car.glass, _car.glassMat, gm, { cast: false });
    parent.add(a, b);
    return [a, b];
  }

  let _lamp = null;
  /** Street / path lamps: instanced posts with glowing heads. Returns head positions. */
  function lampPosts(parent, list, { h = 5, name = 'lamp-posts', arm = true } = {}) {
    if (!_lamp) {
      const pole = new THREE.CylinderGeometry(0.06, 0.09, 1, 6); pole.translate(0, 0.5, 0);
      _lamp = {
        pole: g(pole),
        head: g(new THREE.BoxGeometry(0.5, 0.12, 0.26)),
        poleMat: std({ name: 'lamp-pole-metal', color: 0x4a4d52, roughness: 0.5, metalness: 0.6 }),
        headMat: lampMat('lamp-head-glow'),
      };
    }
    const pm = [], hm = [], heads = [];
    for (const [x, z, yaw = 0] of list) {
      pm.push(mat4(x, 0, z, yaw, 1, h, 1));
      const ox = arm ? Math.sin(yaw) * 0.3 : 0, oz = arm ? Math.cos(yaw) * 0.3 : 0;
      hm.push(mat4(x + ox, h, z + oz, yaw));
      heads.push([x + ox, h - 0.1, z + oz]);
    }
    parent.add(inst(`${name}-poles`, _lamp.pole, _lamp.poleMat, pm), inst(`${name}-heads`, _lamp.head, _lamp.headMat, hm, { cast: false }));
    return heads;
  }
  /** A night light (the engine ramps it); at most 8 per model are honoured. */
  function light(parent, name, x, y, z, nightIntensity = 60, dist = 30, color = 0xffd6a0) {
    if (lamps.length >= 8) return null;
    const l = new THREE.PointLight(color, 0, dist, 2);
    l.name = name; l.position.set(x, y, z); l.castShadow = false;
    l.userData.nightIntensity = nightIntensity;
    parent.add(l); lamps.push(l);
    return l;
  }

  /**
   * Draw-call batcher for one group (e.g. a floor): add(geometry, material, matrix) collects transformed copies,
   * flush() merges them into one mesh per material. Glass-like materials do not cast shadows.
   */
  function batcher(group, name = 'batch') {
    const byMat = new Map();
    return {
      isBatch: true, group,
      add(geo, mat, mtx = null) {
        if (geo && geo.isObject3D) { group.add(...arguments); return; }
        if (!byMat.has(mat)) byMat.set(mat, []);
        const c = geo.clone();
        if (mtx) c.applyMatrix4(mtx);
        byMat.get(mat).push(c);
      },
      flush() {
        for (const [mat, list] of byMat) {
          const glassy = mat.transparent && mat.opacity < 0.95;
          group.add(mesh(`${name}-${mat.name}`, merge(list), mat, { cast: !glassy && !mat.userData.noCast, receive: true }));
        }
        byMat.clear();
      },
    };
  }

  /** Floor group helper. */
  function floorGroup(parent, buildingId, level, en, ar, y = 0) {
    const fg = new THREE.Group();
    fg.name = `${buildingId}-L${level}`;
    fg.position.y = y;
    fg.userData = { level, label: { en, ar }, buildingId };
    parent.add(fg);
    return fg;
  }

  function dispose() {
    geos.forEach((x) => x.dispose());
    mats.forEach((x) => x.dispose());
    texs.forEach((x) => x.dispose());
    geos.clear(); mats.clear(); texs.clear();
  }

  return {
    THREE, high, g, m, tx, std, phys, glass, interior, lampMat, water, canvasTex, waterNormal, roomsMaterial, roomBox, roomUV,
    loft, planStations, sweep, arc, spline, merge, mat4, inst, mesh, box, flat, prism,
    crownGeo, trees, palms, shrubs, cars, lampPosts, light, floorGroup, batcher,
    nightMaterials, lamps, dispose,
  };
}
