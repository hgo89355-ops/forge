/* Choreography for "How a Lock Knows It's Your Key" (9:16).
 * Pure function of time: FilmScript.stateAt(t) -> { lock, stick, scenes, title, num, old }.
 * Times are anchored to the narration's word timings (assets/transcript.json).
 */
const FilmScript = (function () {
  const DUR = 39.0;
  const P2 = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
  const spring = (z) => (p) => {
    if (p >= 1) return 1;
    const w = 12, wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * p) * (Math.cos(wd * p) + ((z * w) / wd) * Math.sin(wd * p));
  };
  const E = {
    io: P2, lin: (p) => p, o: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)), o3: (p) => 1 - Math.pow(1 - p, 3),
    i3: (p) => p * p * p, sp: spring(0.55), sp8: spring(0.8), sp4: spring(0.4),
  };
  function K(t, keys) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, e] = keys[i];
      if (t <= t1) {
        const [t0, v0] = keys[i - 1];
        const p = (E[e || 'io'])((t - t0) / Math.max(1e-6, t1 - t0));
        if (Array.isArray(v0)) return v0.map((a, j) => a + (v1[j] - a) * p);
        return v0 + (v1 - v0) * p;
      }
    }
    return keys[keys.length - 1][1];
  }
  function S(t, keys) { let v = keys[0][1]; for (const [kt, kv] of keys) { if (t >= kt) v = kv; else break; } return v; }
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const ramp = (t, a, b) => clamp01((t - a) / (b - a));

  const RIGHT = [4, 6, 2, 7, 3];
  const WRONG = [4, 6, 4, 7, 3]; // pin 3 cut two steps (0.76 mm) too deep
  const ORANGE = '#F08A24', INK = '#1E1F24', RED = '#E0393E', GREEN = '#1E9E57';

  // ---------- camera (lock scene), mm view
  const VIEW = [
    [0, [-12, 2, 0.82]], [2.75, [-12, 2, 0.82]], [3.35, [13.2, 8.0, 1.3], 'io'],
    [7.35, [13.2, 8.0, 1.36], 'lin'], [7.9, [8, 4, 1.0], 'io'], [11.45, [8, 4, 1.03], 'lin'],
    [11.85, [-3.5, 3, 0.86], 'io'], [13.75, [-1.5, 3, 0.88], 'lin'], [14.25, [13.4, 6.0, 1.34], 'io'],
    [18.9, [13.4, 6.2, 1.4], 'lin'], [19.12, [8, 4, 1.0], 'o3'], [20.35, [8, 4, 1.0]],
    [20.6, [-3.5, 3, 0.86], 'io'], [21.25, [-3, 3, 0.88], 'lin'], [21.85, [13.76, 6.6, 3.3], 'io'],
    [22.95, [13.76, 6.5, 3.45], 'lin'], [23.2, [8, 4, 1.05], 'o3'], [24.3, [8, 4, 1.08], 'lin'],
    [34.7, [8, 4, 1.0]], [39, [8, 4, 1.04], 'lin'],
  ];
  const view = (t) => { const v = K(t, VIEW); return { cx: v[0], cy: v[1], zoom: v[2] }; };

  // ---------- key
  function keyState(t) {
    if (t < 20.48) {
      const s = K(t, [[0, 22], [11.92, 22], [13.95, 0, 'io']]);
      const bump = t > 13.95 && t < 14.25 ? Math.sin(((t - 13.95) / 0.3) * Math.PI) * 0.25 : 0;
      return { s: s + bump, bitting: RIGHT, tag: null, codes: K(t, [[0.85, 0], [1.45, 1, 'lin'], [2.6, 1], [3.0, 0]]) };
    }
    if (t < 34.75) {
      const s = K(t, [[20.48, 0], [20.62, 19, 'i3'], [20.85, 19], [21.65, 0, 'io']]);
      const bump = t > 21.65 && t < 21.9 ? Math.sin(((t - 21.65) / 0.25) * Math.PI) * 0.2 : 0;
      return { s: s + bump, bitting: WRONG, tag: RED, codes: 0 };
    }
    return { s: 0, bitting: RIGHT, tag: null, codes: 0 };
  }
  function turnReq(t) {
    if (t < 9.55) return 0;
    if (t < 10.4) return 18 * Math.sin(((t - 9.55) / 0.85) * Math.PI * 3) ; // tries to twist a locked plug (clamped)
    if (t < 19.05) return 0;
    if (t < 20.4) return K(t, [[19.05, 0], [19.7, 72, 'sp8']]);
    if (t < 20.5) return K(t, [[20.4, 72], [20.5, 0, 'i3']]);
    if (t < 23.12) return 0;
    if (t < 24.1) return 30 * Math.abs(Math.sin(((t - 23.12) / 0.98) * Math.PI * 4)); // strains on the wrong key (clamped)
    if (t < 34.75) return 0;
    return 72;
  }

  // ---------- lock overlays
  function lockState(t) {
    const key = keyState(t);
    const pulse = (a, d = 0.6) => (t >= a && t < a + d ? Math.sin(((t - a) / d) * Math.PI) : 0);
    let shearState = 'neutral';
    if (t >= 10.6 && t < 11.7) shearState = 'bad';
    if (t >= 17.95 && t < 20.45) shearState = 'ok';
    if (t >= 23.12 && t < 24.4) shearState = 'bad';
    if (t >= 34.75) shearState = 'ok';
    const gapOk = [0, 1, 2, 3, 4].map((i) => {
      if (t >= 16.45 && t < 20.45) return ramp(t, 16.45 + i * 0.2, 16.7 + i * 0.2);
      if (t >= 34.75) return 1;
      if (i === 2 && t >= 21.75 && t < 24.4) return ramp(t, 21.75, 22.0);
      return 0;
    });
    const pinFlash = [0, 1, 2, 3, 4].map((i) => pulse(14.26 + i * 0.12, 0.5) + pulse(15.56 + i * 0.1, 0.45));
    const L = [];
    const lab = (text, ax, ay, tx, ty, a, color, align, size) => L.push({ text, ax, ay, tx, ty, a, color, align, size });
    // labels are placed in stage px (portrait layout)
    lab('KEY PINS', 5.84, 1.2, 70, 1075, K(t, [[3.95, 0], [4.25, 1, 'o3'], [7.35, 1], [7.6, 0]]), '#B85E0E', 'start', 44);
    lab('DRIVER PINS', 9.8, 7.4, 70, 905, K(t, [[4.75, 0], [5.05, 1, 'o3'], [7.35, 1], [7.6, 0]]), INK, 'start', 44);
    lab('SPRINGS', 13.76, 13.3, 60, 520, K(t, [[6.4, 0], [6.7, 1, 'o3'], [7.35, 1], [7.6, 0]]), INK, 'start', 44);
    lab('SHEAR LINE', 27.0, 6.35, 1020, 520, K(t, [[8.65, 0], [8.95, 1, 'o3'], [11.5, 1], [11.75, 0]]), INK, 'end', 44);
    lab('CYLINDER (PLUG)', 18.0, -4.6, 1020, 1150, K(t, [[9.2, 0], [9.5, 1, 'o3'], [11.5, 1], [11.75, 0]]), INK, 'end', 44);
    lab('SHEAR LINE', 21.0, 6.35, 1020, 520, K(t, [[17.95, 0], [18.25, 1, 'o3'], [19.0, 1], [19.2, 0]]), GREEN, 'end', 44);
    return {
      view: view(t), key,
      turn: turnReq(t),
      showShear: t < 24.4 ? K(t, [[8.25, 0], [8.8, 1, 'o3']]) : 1,
      shearState,
      crossMarks: K(t, [[8.65, 0], [8.95, 1, 'sp'], [11.6, 1], [11.9, 0]]) + (t >= 21.75 && t < 24.4 ? K(t, [[21.75, 0], [22.05, 1, 'sp']]) : 0),
      gapOk, pinFlash,
      springPush: K(t, [[6.45, 0], [6.7, 1, 'o3'], [7.2, 1], [7.45, 0]]),
      plugFlash: pulse(9.26, 0.7),
      measure: { pin: 2, a: K(t, [[22.05, 0], [22.3, 1, 'o3'], [22.95, 1], [23.15, 0]]), text: '0.76 mm' },
      labels: L,
      inset: t < 24.4 ? K(t, [[9.1, 0], [9.45, 1, 'o3']]) : 1,
      insetPin: 2,
      insetArrow: Math.max(K(t, [[9.55, 0], [9.9, 1, 'o3'], [10.6, 1], [10.9, 0]]), K(t, [[19.02, 0], [19.4, 1, 'o3'], [20.3, 1], [20.45, 0]]), K(t, [[23.12, 0], [23.4, 1, 'o3'], [24.2, 1]]), t >= 34.75 ? 1 : 0),
      insetArrowColor: (t >= 19.0 && t < 20.5) || t >= 34.75 ? GREEN : RED,
    };
  }

  // ---------- stickman (lock scene coordinates in mm; numbers/old scenes in stage px)
  function stickState(t) {
    const base = { t, eyes: 'normal', brows: 'neutral', mouth: 'smile', sweat: 0, squash: 0, crouch: 0, lean: 0, head: 0, gaze: [0.4, 0], face: 1 };
    // HOOK 0-2.75: stands on the floor between key and lock, points at the key code
    if (t < 2.75) {
      const point = K(t, [[0.7, 0], [1.0, 1, 'sp']]);
      return Object.assign(base, { mm: true, x: -3, y: -12, face: -1, gaze: [0.6, -0.6],
        armF: [K(t, [[0.7, 15], [1.0, 128, 'sp']]), -10], armB: [-10, -15], legF: [6, 0], legB: [-6, 0],
        brows: point > 0.5 ? 'raised' : 'neutral', mouth: t > 1.2 ? 'grin' : 'smile', head: K(t, [[0.4, 0], [0.9, -8, 'sp']]) });
    }
    // INSIDE 2.75-7.6: on top of the housing, peeking down into the chambers, points
    if (t < 7.6) {
      const arrive = K(t, [[2.75, 0], [3.3, 1, 'o3']]);
      const pointAt = t < 5.9 ? [5.84, 1.0] : [13.76, 13.3];
      const peek = K(t, [[3.0, 0], [3.5, 1, 'sp'], [3.9, 1], [4.1, 0.4]]);
      return Object.assign(base, { mm: true, x: K(t, [[2.75, -2], [3.3, 2.2, 'o3']]), y: 17.6, face: 1,
        lean: 30 * peek, crouch: 0.25 * peek, gaze: [0.3, 0.9], brows: t > 3.9 ? 'raised' : 'neutral', mouth: t > 3.9 ? 'O' : 'o',
        pointAt: t > 3.9 ? pointAt : null, armB: [-20, -10], legF: [10, 0], legB: [-14, 0], alpha: arrive });
    }
    // LOCKED 7.6-11.6: jumps down, tries to twist the plug face, falls on his bum
    if (t < 11.6) {
      const strain = t >= 9.5 && t < 10.55;
      const fall = K(t, [[10.6, 0], [10.95, 1, 'sp']]);
      return Object.assign(base, { mm: true, x: -4.2, y: -12, face: 1,
        lean: strain ? -18 + 6 * Math.sin(t * 40) : K(t, [[10.6, 0], [10.95, -25, 'o3']]),
        crouch: strain ? 0.35 : 0.7 * fall, squash: 0.18 * fall,
        armF: strain ? [82 + 8 * Math.sin(t * 38), -20] : [K(t, [[7.6, 20], [9.3, 70, 'sp']]), -10],
        armB: strain ? [70 + 8 * Math.sin(t * 31), -10] : [-20 + 40 * fall, -10],
        legF: strain ? [24 + 10 * Math.sin(t * 27), 0] : [8 + 30 * fall, -10 * fall], legB: strain ? [-18 - 10 * Math.sin(t * 23), 0] : [-8 + 20 * fall, 0],
        eyes: strain ? 'squint' : fall > 0.5 ? 'wide' : 'normal', brows: strain ? 'determined' : fall > 0.5 ? 'worried' : 'raised',
        mouth: strain ? 'strain' : fall > 0.5 ? 'wavy' : 'o', sweat: strain || fall > 0.3 ? 1 : 0, gaze: [0.8, 0] });
    }
    // INSERT 11.6-14.3: pushes the key in by its bow
    if (t < 14.3) {
      const k = keyState(t);
      const bowL = -15.5 - k.s;
      const walk = t > 11.92 && t < 13.95;
      const ph = t * 14;
      return Object.assign(base, { mm: true, x: bowL - 2.6, y: -12, face: 1, lean: walk ? 16 : 6,
        armF: [78, 0], armB: [70, 8], legF: walk ? [18 * Math.sin(ph), 0] : [8, 0], legB: walk ? [-18 * Math.sin(ph), 0] : [-8, 0],
        brows: 'determined', mouth: walk ? 'strain' : 'smile', gaze: [1, 0.2] });
    }
    // 14.3-19.0: offscreen (camera on the pins) — keep him by the bow
    if (t < 20.5) {
      const turning = t >= 19.0 && t < 19.65;
      const cheer = K(t, [[19.6, 0], [19.85, 1, 'sp']]);
      const hop = t > 19.65 && t < 20.3 ? Math.max(0, Math.sin(((t - 19.65) / 0.32) * Math.PI)) * 22 : 0;
      return Object.assign(base, { mm: true, x: -18.1, y: -12, liftPx: hop, face: 1,
        armF: cheer > 0.01 ? [K(t, [[19.6, 80], [19.85, 165, 'sp']]), 10] : [80, 0], armB: cheer > 0.01 ? [K(t, [[19.6, 70], [19.85, 155, 'sp']]), 10] : [70, 8],
        lean: turning ? 8 : 0, eyes: cheer > 0.5 ? 'happy' : 'normal', brows: cheer > 0.5 ? 'raised' : 'determined', mouth: cheer > 0.5 ? 'grin' : 'smile', gaze: [1, 0] });
    }
    // WRONG KEY 20.5-24.3: brings the red-tag key, pushes it in, strains when it jams
    if (t < 24.3) {
      const k = keyState(t);
      const bowL = -15.5 - k.s;
      const strain = t >= 23.12;
      const walk = t > 20.85 && t < 21.65;
      return Object.assign(base, { mm: true, x: bowL - 2.6, y: -12, face: 1,
        lean: strain ? -14 + 7 * Math.sin(t * 36) : walk ? 16 : 6,
        crouch: strain ? 0.3 : 0,
        armF: strain ? [88 + 6 * Math.sin(t * 33), -12] : [78, 0], armB: strain ? [80 + 6 * Math.sin(t * 29), -8] : [70, 8],
        legF: strain ? [26 * Math.sin(t * 25), 0] : walk ? [18 * Math.sin(t * 14), 0] : [8, 0], legB: strain ? [-26 * Math.sin(t * 25), 0] : walk ? [-18 * Math.sin(t * 14), 0] : [-8, 0],
        eyes: strain ? 'squint' : 'normal', brows: strain ? 'angry' : 'determined', mouth: strain ? 'strain' : 'smile', sweat: strain ? 1 : 0, gaze: [1, 0] });
    }
    // NUMBERS 24.3-29.0 (stage px): watches the keys pile up; one bonks him
    if (t < 29.0) {
      const bonk = K(t, [[27.95, 0], [28.1, 1, 'o3'], [28.6, 0.2]]);
      return Object.assign(base, { mm: false, x: 900, y: 1150, s: 0.95, face: -1,
        eyes: t > 26.9 ? (bonk > 0.5 ? 'squint' : 'wide') : 'normal', brows: t > 26.9 ? 'raised' : 'neutral', mouth: t > 26.9 ? (bonk > 0.5 ? 'wavy' : 'O') : 'smile',
        squash: 0.16 * bonk, crouch: 0.3 * bonk, armF: [t > 26.9 ? 40 : 15, 30], armB: [t > 26.9 ? 40 : -10, 30], legF: [6, 0], legB: [-6, 0], gaze: [0.6, -0.8], sweat: t > 27.3 ? 1 : 0, head: -10 * bonk });
    }
    // ANCIENT 29.0-34.75 (stage px): works the wooden lock's key
    if (t < 34.75) {
      const old = oldState(t);
      const handX = 120 + old.keyX - 30, handY = 862 - old.keyLift;
      return Object.assign(base, { mm: false, x: Math.min(handX - 70, 130), y: 1060, s: 1.0, face: 1,
        lean: t > 33.4 ? 10 : 4, armF: null, handTarget: [handX, handY], armB: [-20, -10], legF: [8, 0], legB: [-8, 0],
        brows: t > 32.7 ? 'raised' : 'determined', mouth: t > 33.4 ? 'grin' : 'smile', eyes: t > 33.9 ? 'happy' : 'normal', gaze: [1, -0.2] });
    }
    // OUTRO 34.75-39: on top of the housing, waves, then points up at "Follow"
    {
      const wave = Math.sin(t * 9) * 18;
      return Object.assign(base, { mm: true, x: K(t, [[34.75, 1.2], [35.2, 2.4, 'o3']]), y: 17.6, face: 1,
        armF: t < 35.5 ? [150 + wave, 10] : [K(t, [[35.5, 150], [35.75, 178, 'sp']]), 0], armB: [-15, -10],
        eyes: t > 36.2 ? 'happy' : 'normal', brows: 'raised', mouth: 'grin', gaze: [0.3, -0.6], legF: [6, 0], legB: [-6, 0] });
    }
  }

  // ---------- numbers scene (24.3-29.0)
  function numState(t) {
    const cols = 5;
    const colsIn = [0, 1, 2, 3, 4, 5].map((i) => (i < 5 ? K(t, [[24.3 + i * 0.07, 0], [24.65 + i * 0.07, 1, 'sp']]) : K(t, [[24.68, 0], [25.0, 1, 'sp']])));
    // each pin steps through heights (deterministic sequences)
    const seqs = [[4, 9, 1, 6, 3, 8, 0, 5], [6, 2, 8, 0, 7, 3, 9, 1], [2, 7, 4, 9, 0, 5, 1, 8], [7, 1, 5, 3, 9, 0, 6, 2], [3, 8, 0, 6, 2, 9, 4, 7]];
    const stepT = 0.13;
    const heights = seqs.map((sq, i) => {
      if (t < 25.5) return RIGHT[i];
      const n = Math.floor((t - 25.5 - i * 0.03) / stepT);
      return n < 0 ? RIGHT[i] : sq[n % sq.length];
    });
    const colsUp = K(t, [[26.7, 0], [27.1, 1, 'io']]);
    const count = Math.round(79666 * E.o3(ramp(t, 26.8, 28.25)));
    const grid = K(t, [[26.8, 0], [28.3, 1, 'lin']]);
    return { colsIn, heights, colsUp, count, grid, counterIn: K(t, [[26.75, 0], [27.0, 1, 'sp']]) };
  }

  // ---------- ancient wooden pin lock (29.0-34.75)
  function oldState(t) {
    return {
      keyX: K(t, [[29.0, -420], [32.1, -420], [32.65, 0, 'io']]),
      keyLift: K(t, [[32.7, 0], [33.0, 40, 'sp8']]),
      boltX: K(t, [[33.36, 0], [33.95, 150, 'io']]),
      line: K(t, [[32.95, 0], [33.15, 1, 'o3']]),
      lineOk: t > 33.0,
      labels: K(t, [[29.6, 0], [30.0, 1, 'o3']]),
      keyLabel: K(t, [[32.15, 0], [32.45, 1, 'o3']]),
    };
  }

  // ---------- scene switching with whips
  function scenes(t) {
    // x offset of each stage (px) and blur
    const w = 1080;
    const lockX = t < 24.3 ? 0 : t < 34.75 ? -w : K(t, [[34.75, w], [35.05, 0, 'o3']]);
    const whipOut = (a) => K(t, [[a, 0], [a + 0.18, -w, 'i3']]);
    const whipIn = (a) => K(t, [[a + 0.12, w], [a + 0.42, 0, 'o3']]);
    let lock = 0, num = w, old = w;
    if (t < 24.3) { lock = 0; }
    else if (t < 24.6) { lock = whipOut(24.3); num = whipIn(24.18); }
    else if (t < 29.0) { lock = -w; num = 0; }
    else if (t < 29.4) { num = whipOut(29.0); old = whipIn(28.88); lock = -w; }
    else if (t < 34.75) { lock = -w; num = -w; old = 0; }
    else { old = K(t, [[34.75, 0], [34.93, -w, 'i3']]); num = -w; lock = lockX; }
    const blur = (x) => Math.min(30, Math.abs(x) > 1 && Math.abs(x) < w - 1 ? 30 : 0);
    return { lock: { x: lock, blur: blur(lock) }, num: { x: num, blur: blur(num) }, old: { x: old, blur: blur(old) } };
  }

  function title(t) { return { a: K(t, [[0, 1], [2.55, 1], [2.75, 0, 'i3']]), blur: K(t, [[2.55, 0], [2.75, 10, 'i3']]) }; }

  function stateAt(t) {
    return { t, lock: lockState(t), stick: stickState(t), num: numState(t), old: oldState(t), scenes: scenes(t), title: title(t) };
  }
  return { DUR, stateAt, K, E, RIGHT, WRONG, keyState };
})();
if (typeof window !== 'undefined') window.FilmScript = FilmScript;
if (typeof module !== 'undefined') module.exports = FilmScript;
