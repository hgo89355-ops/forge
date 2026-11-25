/* 5-second motion test for Hero3D: idle → walk → point → reach + turn key → door springs open → jump back → celebrate.
 * Pure function of time (seek-safe). Same studio lighting as the lock scenes. */
const MotionTest = (function () {
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
    const hero = Hero3D.create(THREE); scene.add(hero.root);
    const camera = new THREE.PerspectiveCamera(30, W / H, 1, 4000);
    const A = Hero3D.ANIM, E = Hero3D.ease, mix = Hero3D.mix;
    const c01 = (x) => Math.max(0, Math.min(1, x)), lerp = (a, b, u) => a + (b - a) * u, win = (t, a, b) => c01((t - a) / (b - a));
    const lockFace = () => Math.atan2(DX - 25 - 2, -8 - 16);   // face toward the key from the standing spot

    function renderAt(t) {
      let st, ikW = 0, keyTurn = 0, door = 0;
      const stand = { x: 2, z: 16 };
      if (t < 0.75) {                                         // idle, looking at camera, blink
        st = Object.assign(A.idle(t), { x: -52, z: 18, face: 0.25, expr: t > 0.35 ? 'curious' : 'neutral', gaze: [0.5 * win(t, 0.35, 0.6), 0] });
      } else if (t < 1.95) {                                  // walk to the door
        const u = win(t, 0.75, 1.95);
        st = Object.assign(A.walk(t - 0.75, 1.75), { x: lerp(-52, stand.x, E.io(u)), z: lerp(18, stand.z, u), face: lerp(1.1, 0.35, E.io(win(t, 1.7, 1.95))), expr: 'curious' });
        st = mix(Object.assign(A.idle(t), { x: -52, z: 18, face: 0.25, expr: 'curious' }), st, E.io(win(t, 0.75, 0.9)));
      } else if (t < 2.55) {                                  // point at the lock (left arm: the door is on his left)
        st = Object.assign(A.idle(t), A.point(win(t, 1.95, 2.45), 'L'), { x: stand.x, z: stand.z, face: 0.35 });
      } else if (t < 3.35) {                                  // reach for the key and turn it
        const r = E.io(win(t, 2.55, 2.85));
        st = Object.assign(A.idle(t), A.reach(r), { x: stand.x, z: stand.z, face: lerp(0.35, lockFace(), r), expr: 'confident' });
        if (t > 2.85) Object.assign(st, A.turnKey(win(t, 2.85, 3.3), 'L'), { x: stand.x, z: stand.z, face: lockFace() });
        ikW = r; keyTurn = E.spring(win(t, 2.85, 3.3), 16, 7);
      } else if (t < 3.95) {                                  // the door springs open toward him → jump back
        keyTurn = 1; door = E.spring(win(t, 3.35, 3.8), 9, 4);
        const j = A.jumpBack(win(t, 3.38, 3.95));
        st = Object.assign(j, { x: stand.x + j.z * 0.85, z: stand.z - j.z * 0.3, face: lerp(lockFace(), 0.3, win(t, 3.38, 3.6)) });
      } else {                                                // celebrate
        keyTurn = 1; door = 1;
        const P0 = { x: stand.x - 27.2, z: stand.z + 9.6 }; st = mix(Object.assign(A.jumpBack(1), P0, { face: 0.3 }), Object.assign(A.celebrate(t - 3.95), P0, { face: 0.25 }), E.io(win(t, 3.95, 4.15)));
      }
      st.blink = st.blink || ((t + 0.2) % 2.6 < 0.1 ? 1 : 0);
      hinge.rotation.y = -1.2 * door;
      keyG.rotation.z = -Math.PI / 2 * keyTurn;
      hero.pose(st);
      if (ikW > 0) { scene.updateMatrixWorld(true); hero.reach('L', bow.getWorldPosition(new THREE.Vector3()), ikW); }
      // camera travels: slow push-in with a small orbit
      const u = t / 5, d = lerp(540, 470, E.io(u));
      const az = lerp(0.12, 0.85, E.io(win(t, 1.4, 2.9))) - 0.35 * E.io(win(t, 3.6, 4.4));
      const tx = lerp(st.x, 22, 0.45), tz = lerp(st.z, -4, 0.4);
      camera.position.set(tx + Math.sin(az) * d, 118, tz + Math.cos(az) * d); camera.lookAt(tx, 96, tz); camera.updateMatrixWorld();
      renderer.render(scene, camera);
    }
    return { renderAt };
  }
  return { mount };
})();
if (typeof window !== 'undefined') window.MotionTest = MotionTest;
