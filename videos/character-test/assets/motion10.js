/* 5-second motion test for Hero3D: idle → walk → point → reach + turn key → door springs open → jump back → celebrate.
 * Pure function of time (seek-safe). Same studio lighting as the lock scenes. */
const MotionTest10 = (function () {
  function mount(canvas, W = 1080, H = 1920) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1); renderer.setSize(W, H, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    { const env = new THREE.Scene(); env.add(new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100), new THREE.MeshBasicMaterial({ color: 0x9aa1aa, side: THREE.BackSide })));
      const soft = (w, h, x, y, z, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
      soft(60, 30, -30, 40, 20, 0xffffff); soft(40, 40, 45, 10, 30, 0xe9eef5); soft(80, 10, 0, -45, 0, 0x5a6068); soft(30, 60, 0, 10, -48, 0xd0d6de);
      scene.environment = new THREE.PMREMGenerator(renderer).fromScene(env, 0.02).texture; }
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9099, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-160, 320, 260); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -200, right: 200, top: 260, bottom: -60, near: 10, far: 900 }); key.shadow.bias = -0.0005; key.shadow.radius = 4; scene.add(key);
    const rim = new THREE.DirectionalLight(0xdfe8ff, 0.9); rim.position.set(200, 200, -260); scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffffff, 0.6); fill.position.set(260, 80, 220); scene.add(fill);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.ShadowMaterial({ opacity: 0.16 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    // prop: a short door section with a brass lock and a key (same materials as the lock film)
    const std = (c, m, r) => new THREE.MeshStandardMaterial({ color: c, metalness: m, roughness: r });
    const trim = std(0xf7f5f0, 0, 0.6), doorM = std(0x2f5d4e, 0.1, 0.55), brass = std(0xd8ad4f, 0.9, 0.3), steel = std(0xd3d9e0, 0.95, 0.26);
    const box = (w, h, d, x, y, z, m, p) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; (p || scene).add(b); return b; };
    const DX = 58;
    box(6, 214, 10, DX - 34, 107, -12, trim); box(6, 214, 10, DX + 34, 107, -12, trim); box(74, 6, 10, DX, 211, -12, trim);
    const hinge = new THREE.Group(); hinge.position.set(DX + 31, 0, -12); scene.add(hinge);
    box(62, 204, 4.5, -31, 102, 0, doorM, hinge);
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 1.4, 40), brass); cyl.rotation.x = Math.PI / 2; cyl.position.set(-54, 104, 2.9); hinge.add(cyl);
    const keyG = new THREE.Group(); keyG.position.set(-54, 104, 3.6); hinge.add(keyG);
    box(1.1, 0.35, 6.5, 0, 0, 3.0, steel, keyG); const bow = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.55, 10, 24), steel); bow.position.set(0, 0, 7.4); bow.rotation.y = Math.PI / 2; bow.castShadow = true; keyG.add(bow);
    const hero = Hero3D.create(THREE, { build: 'rick' }); scene.add(hero.root);
    const camera = new THREE.PerspectiveCamera(30, W / H, 1, 4000);
    const A = Hero3D.ANIM, E = Hero3D.ease, mix = Hero3D.mix;
    const c01 = (x) => Math.max(0, Math.min(1, x)), lerp = (a, b, u) => a + (b - a) * u, win = (t, a, b) => c01((t - a) / (b - a));

    // 10 s personality reel: look around → sneak → double-take → point → think → yank the key → pratfall →
    // deadpan stare → get up → headphone tap → celebrate. Pure function of t.
    const io = E.io, SP = E.spring;
    const KEY = () => bow.getWorldPosition(new THREE.Vector3());
    const lockFace = (g) => Math.atan2(DX - 25 - 2 - g.x, -8 - g.z);
    const camFace = (g) => Math.atan2(camera.position.x - g.x, camera.position.z - g.z);
    const xAt = (t) => lerp(-78, 2, io(win(t, 1.1, 2.75)));
    const blink = (t) => (((t + 0.4) % 2.7) < 0.1 ? 1 : 0);
    function clip(t) {   // [state, ikR, ikL]
      const g = { x: xAt(t), y: 0, z: 18 };
      if (t < 1.1) {   // looks around — eyes lead, then the head
        const look = Math.tanh(3 * Math.sin(t * 3.2)), lookE = Math.tanh(3 * Math.sin(t * 3.2 + 0.4));
        return [Object.assign(A.idle(t), g, { face: 0.3, head: [0, 0.55 * look, 0.05 * look], gaze: [0.9 * lookE, 0], expr: 'suspicious', blink: blink(t) }), 0, 0];
      }
      if (t < 2.75) return [Object.assign(A.sneak(t - 1.1), g, { face: 1.25 }), 0, 0];
      if (t < 3.35) {  // double-take: glance at the door → snap to camera, eyes wide → back to suspicious
        const k = t - 2.75, snap = SP(win(k, 0.18, 0.4), 14, 6);
        const st = Object.assign(A.idle(t), g, { face: lerp(lockFace(g), camFace(g), snap * 0.85), expr: k < 0.18 ? 'suspicious' : k < 0.45 ? 'shocked' : 'suspicious', lean: -0.06 * snap, bob: 3 * Math.sin(Math.PI * win(k, 0.18, 0.35)) });
        return [st, 0, 0];
      }
      if (t < 4.2) return [Object.assign(A.idle(t), A.point(win(t, 3.35, 4.0), 'L'), g, { face: lerp(camFace(g), lockFace(g), 0.45) }), 0, 0];
      if (t < 5.3) return [Object.assign(A.think(t - 4.2), g, { face: camFace(g) * 0.6 + lockFace(g) * 0.4, blink: blink(t) }), 0, 0];
      if (t < 6.6) {   // yank the stuck key with a foot on the door
        const st = Object.assign(A.tug(t - 5.3), g, { face: lockFace(g), expr: t < 5.9 ? 'determined' : 'annoyed' });
        return [st, io(win(t, 5.3, 5.55)), io(win(t, 5.4, 5.65))];
      }
      if (t < 7.2) {   // it gives — pratfall
        const f = win(t, 6.6, 6.98), g2 = { x: g.x - 24 * E.out(f), y: 0, z: g.z + 6 * f };
        return [Object.assign(A.sit(f), g2, { face: lerp(lockFace(g), camFace(g2), io(win(t, 6.9, 7.15))), expr: t < 6.95 ? 'shocked' : 'deadpan' }), 0, 0];
      }
      const g2 = { x: g.x - 24, y: 0, z: g.z + 6 };
      if (t < 8.15) return [Object.assign(A.sit(1), g2, { face: camFace(g2), expr: 'deadpan', head: [0.04, 0, 0.05 * Math.sin(Math.max(0, t - 7.6) * 2)], blink: t > 7.85 && t < 7.95 ? 1 : 0 }), 0, 0];   // hold the stare
      if (t < 8.75) {  // gets up: sit → knees under him (crouch, hands on knees) → stand with a small overshoot
        const crouchSt = Object.assign({}, g2, { crouch: 0.85, lean: 0.35, armL: { fwd: 0.6, out: 0.15, bend: 0.4 }, armR: { fwd: 0.6, out: 0.15, bend: 0.4 }, legL: { fwd: 0.15, bend: 0.2 }, legR: { fwd: 0.05, bend: 0.2 } });
        const a = io(win(t, 8.15, 8.42)), b2 = SP(win(t, 8.42, 8.75), 12, 6);
        const st = t < 8.42 ? mix(Object.assign(A.sit(1), g2), crouchSt, a) : mix(crouchSt, Object.assign(A.idle(t), g2), b2);
        return [Object.assign(st, { face: camFace(g2), expr: t < 8.5 ? 'deadpan' : 'confident' }), 0, 0];
      }
      if (t < 9.3) return [Object.assign(A.idle(t), A.adjustPhones(win(t, 8.75, 9.3)), g2, { face: camFace(g2) - 0.25 }), 0, 0];
      return [Object.assign(A.celebrate(t - 9.3), g2, { face: camFace(g2), expr: 'proud' }), 0, 0];
    }
    function renderAt(t) {
      // camera: slow travel, keeps him framed full-body
      const gx = xAt(t) - (t > 6.6 ? 24 * E.out(win(t, 6.6, 6.98)) : 0);
      const tx = lerp(gx, 30, 0.35), d = lerp(470, 400, io(win(t, 0, 10))), az = lerp(0.15, 0.55, io(win(t, 1.0, 5.5))) - 0.3 * io(win(t, 6.6, 7.6));
      camera.position.set(tx + Math.sin(az) * d, 108, 12 + Math.cos(az) * d); camera.lookAt(tx, 88, 0); camera.updateMatrixWorld();
      let st = Hero3D.lagged((tt) => clip(Math.max(0, tt))[0], t);
      st = Hero3D.human(t, st, 1);
      const [, ikR, ikL] = clip(t);
      hero.pose(st);
      keyG.rotation.z = 0; hinge.rotation.y = 0;
      if (ikR > 0 || ikL > 0) { scene.updateMatrixWorld(true); const k = KEY(); if (ikR) hero.reach('R', k, ikR); if (ikL) hero.reach('L', k.clone().add(new THREE.Vector3(-1.5, 2, 1)), ikL); }
      keyG.visible = t < 6.6 || t > 99;
      renderer.render(scene, camera);
    }
    return { renderAt };
  }
  return { mount };
})();
if (typeof window !== 'undefined') window.MotionTest10 = MotionTest10;
