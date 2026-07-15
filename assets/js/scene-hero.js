/* Fit Zone (FZ) — WebGL hero scenes (Three.js, ES module)
   Neon-lime-on-black, night-gym energy. One scene per page. */
import * as THREE from '../vendor/three.module.min.js';

const NEON = 0xb6ff00;
const NEON_DIM = 0x5a7f00;
const CHARCOAL = 0x181a14;
const GREY = 0x2a2d26;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dpr = Math.min(window.devicePixelRatio || 1, 2);

function baseSetup(canvas, { cameraZ = 14, fov = 42 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, canvas.clientWidth / canvas.clientHeight || 1, 0.1, 200);
  camera.position.set(0, 0, cameraZ);

  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  const key = new THREE.DirectionalLight(0xffffff, 0.8);
  key.position.set(6, 10, 8);
  const neonLight = new THREE.PointLight(NEON, 2.2, 70);
  neonLight.position.set(-6, 5, 8);
  const fill = new THREE.PointLight(0x445533, 0.6, 60);
  fill.position.set(5, -6, 5);
  scene.add(ambient, key, neonLight, fill);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  return { renderer, scene, camera, mouse };
}

/* Lightning-bolt extruded shape (the FZ mark motif) */
function boltGeometry(depth = 0.28) {
  const pts = [
    [0.1, 1], [-0.9, -0.2], [0, -0.2], [-0.1, -1], [0.9, 0.2], [0, 0.2]
  ];
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
}

function neonParticles(count, spread = 22, ySpread = [-3, 9]) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = THREE.MathUtils.randFloatSpread(spread);
    positions[i * 3 + 1] = THREE.MathUtils.randFloat(ySpread[0], ySpread[1]);
    positions[i * 3 + 2] = THREE.MathUtils.randFloatSpread(12) - 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: NEON, size: 0.08, transparent: true, opacity: 0.8,
    sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false
  });
  return new THREE.Points(geo, mat);
}

/* ---------------- HOME: neon bolt field over a glowing floor grid ---------------- */
function buildHomeScene(canvas) {
  const { renderer, scene, camera, mouse } = baseSetup(canvas, { cameraZ: 15 });

  const group = new THREE.Group();
  group.position.x = 5.2;
  scene.add(group);

  // one hero bolt, fully lit neon — flickers like a sign
  const heroBoltMat = new THREE.MeshBasicMaterial({ color: NEON, transparent: true, opacity: 0.95 });
  const heroBolt = new THREE.Mesh(boltGeometry(0.35), heroBoltMat);
  heroBolt.scale.setScalar(2.6);
  heroBolt.position.set(0, 0.6, 0);
  group.add(heroBolt);

  // satellite bolts: dark bodies with neon edges (unlit "sign off" look)
  const bolts = [];
  for (let i = 0; i < 9; i++) {
    const geo = boltGeometry(0.22);
    const body = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: CHARCOAL, metalness: 0.6, roughness: 0.45 }));
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo, 20),
      new THREE.LineBasicMaterial({ color: NEON, transparent: true, opacity: 0.55 })
    );
    body.add(edges);
    const angle = (i / 9) * Math.PI * 2;
    const radius = THREE.MathUtils.randFloat(3.2, 6.4);
    body.position.set(Math.cos(angle) * radius, THREE.MathUtils.randFloat(-2.5, 4.5), Math.sin(angle) * 2.4 - 1.5);
    body.scale.setScalar(THREE.MathUtils.randFloat(0.5, 1.15));
    body.rotation.z = THREE.MathUtils.randFloat(-0.5, 0.5);
    body.userData = {
      baseY: body.position.y,
      speed: THREE.MathUtils.randFloat(0.4, 1.0),
      offset: Math.random() * Math.PI * 2,
      spin: THREE.MathUtils.randFloat(-0.004, 0.004)
    };
    group.add(body);
    bolts.push(body);
  }

  const sparks = neonParticles(150);
  scene.add(sparks);

  const grid = new THREE.GridHelper(40, 34, NEON_DIM, GREY);
  grid.position.y = -4.2;
  grid.material.transparent = true;
  grid.material.opacity = 0.22;
  scene.add(grid);

  const clock = new THREE.Clock();
  let nextFlicker = 2 + Math.random() * 4;
  let flickerEnd = 0;
  function tick() {
    const t = clock.getElapsedTime();
    if (!reducedMotion) {
      group.rotation.y += 0.0012;
      heroBolt.rotation.y = Math.sin(t * 0.4) * 0.35;
      heroBolt.position.y = 0.6 + Math.sin(t * 0.8) * 0.2;

      // neon-sign flicker: brief random dips in the hero bolt's brightness
      if (t > nextFlicker) { flickerEnd = t + 0.18; nextFlicker = t + 3 + Math.random() * 5; }
      heroBoltMat.opacity = t < flickerEnd ? 0.35 + Math.random() * 0.5 : 0.95;

      bolts.forEach((m) => {
        m.position.y = m.userData.baseY + Math.sin(t * m.userData.speed + m.userData.offset) * 0.3;
        m.rotation.y += m.userData.spin;
      });
      sparks.rotation.y += 0.0006;
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      camera.position.x = mouse.x * 1.5;
      camera.position.y = 0.8 - mouse.y * 1.0;
      camera.lookAt(0, 0.4, 0);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}

/* ---------------- SERVICES: floating dumbbells ---------------- */
function makeDumbbell() {
  const db = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: CHARCOAL, metalness: 0.85, roughness: 0.3 });
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.5, 20), dark);
  bar.rotation.z = Math.PI / 2;
  db.add(bar);
  [[0.5, 0.95], [0.4, 1.13], [0.3, 1.28]].forEach(([r, x]) => {
    [-1, 1].forEach((side) => {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.14, 28), dark);
      plate.rotation.z = Math.PI / 2;
      plate.position.x = x * side;
      db.add(plate);
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.014, 8, 40),
        new THREE.MeshBasicMaterial({ color: NEON, transparent: true, opacity: 0.7 })
      );
      rim.rotation.y = Math.PI / 2;
      rim.position.x = (x + 0.075) * side;
      db.add(rim);
    });
  });
  return db;
}

function buildServicesScene(canvas) {
  const { renderer, scene, camera, mouse } = baseSetup(canvas, { cameraZ: 13 });
  const group = new THREE.Group();
  group.position.x = 5;
  scene.add(group);

  const dumbbells = [];
  for (let i = 0; i < 6; i++) {
    const db = makeDumbbell();
    db.position.set(
      THREE.MathUtils.randFloat(-2.5, 5.5),
      THREE.MathUtils.randFloatSpread(7),
      THREE.MathUtils.randFloatSpread(7) - 2
    );
    db.rotation.set(Math.random() * 0.7 - 0.35, Math.random() * Math.PI, Math.random() * 0.6 - 0.3);
    db.scale.setScalar(THREE.MathUtils.randFloat(0.6, 1.05));
    db.userData = {
      baseY: db.position.y,
      float: THREE.MathUtils.randFloat(0.3, 0.7),
      offset: Math.random() * Math.PI * 2,
      spin: THREE.MathUtils.randFloat(0.002, 0.005) * (Math.random() > 0.5 ? 1 : -1)
    };
    group.add(db);
    dumbbells.push(db);
  }

  const sparks = neonParticles(110, 20, [-4, 6]);
  scene.add(sparks);

  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();
    if (!reducedMotion) {
      group.rotation.y += 0.0008;
      dumbbells.forEach((db) => {
        db.rotation.y += db.userData.spin;
        db.position.y = db.userData.baseY + Math.sin(t * db.userData.float + db.userData.offset) * 0.35;
      });
      sparks.rotation.y += 0.0005;
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      camera.position.x = mouse.x * 1.3;
      camera.position.y = -mouse.y * 0.9;
      camera.lookAt(0, 0, 0);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}

/* ---------------- ABOUT: community network sphere ---------------- */
function buildAboutScene(canvas) {
  const { renderer, scene, camera, mouse } = baseSetup(canvas, { cameraZ: 13 });
  const group = new THREE.Group();
  group.position.x = 6.5;
  scene.add(group);

  const radius = 4.2;
  const nodeCount = 64;
  const nodePositions = [];
  const nodeGeo = new THREE.SphereGeometry(0.05, 8, 8);
  const nodeMat = new THREE.MeshBasicMaterial({ color: NEON });
  for (let i = 0; i < nodeCount; i++) {
    const phi = Math.acos(-1 + (2 * i) / nodeCount);
    const theta = Math.sqrt(nodeCount * Math.PI) * phi;
    const p = new THREE.Vector3(
      radius * Math.cos(theta) * Math.sin(phi),
      radius * Math.sin(theta) * Math.sin(phi),
      radius * Math.cos(phi)
    );
    nodePositions.push(p);
    const node = new THREE.Mesh(nodeGeo, nodeMat);
    node.position.copy(p);
    group.add(node);
  }

  const lineMat = new THREE.LineBasicMaterial({ color: NEON_DIM, transparent: true, opacity: 0.3 });
  const linePts = [];
  for (let i = 0; i < nodePositions.length; i++) {
    for (let j = i + 1; j < nodePositions.length; j++) {
      if (nodePositions[i].distanceTo(nodePositions[j]) < 1.9) {
        linePts.push(nodePositions[i], nodePositions[j]);
      }
    }
  }
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(linePts), lineMat));

  const coreGeo = new THREE.IcosahedronGeometry(1.7, 1);
  const core = new THREE.Mesh(coreGeo, new THREE.MeshStandardMaterial({ color: CHARCOAL, metalness: 0.8, roughness: 0.3 }));
  core.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(coreGeo),
    new THREE.LineBasicMaterial({ color: NEON, transparent: true, opacity: 0.65 })
  ));
  group.add(core);

  const sparks = neonParticles(80, 18, [-5, 6]);
  scene.add(sparks);

  const clock = new THREE.Clock();
  function tick() {
    if (!reducedMotion) {
      group.rotation.y += 0.0016;
      group.rotation.x = Math.sin(clock.getElapsedTime() * 0.15) * 0.12;
      core.rotation.y -= 0.003;
      sparks.rotation.y += 0.0004;
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      camera.position.x = mouse.x * 1.2;
      camera.position.y = -mouse.y * 1.0;
      camera.lookAt(0, 0, 0);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}

/* ---------------- CONTACT: street grid + dropping neon pin ---------------- */
function buildContactScene(canvas) {
  const { renderer, scene, camera, mouse } = baseSetup(canvas, { cameraZ: 12, fov: 46 });
  const group = new THREE.Group();
  group.position.x = 6;
  scene.add(group);

  const grid = new THREE.GridHelper(24, 26, NEON_DIM, GREY);
  grid.position.y = -3;
  grid.material.transparent = true;
  grid.material.opacity = 0.4;
  group.add(grid);

  const dotsGeo = new THREE.BufferGeometry();
  const dotCount = 70;
  const dp = new Float32Array(dotCount * 3);
  for (let i = 0; i < dotCount; i++) {
    dp[i * 3] = THREE.MathUtils.randFloatSpread(18);
    dp[i * 3 + 1] = -3;
    dp[i * 3 + 2] = THREE.MathUtils.randFloatSpread(14) - 2;
  }
  dotsGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  group.add(new THREE.Points(dotsGeo, new THREE.PointsMaterial({
    color: NEON, size: 0.1, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false
  })));

  const pinGroup = new THREE.Group();
  const darkMat = new THREE.MeshStandardMaterial({ color: CHARCOAL, metalness: 0.75, roughness: 0.3 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), darkMat);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.4, 32), darkMat);
  tip.position.y = -1.05;
  tip.rotation.x = Math.PI;
  const inner = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 24), new THREE.MeshBasicMaterial({ color: NEON }));
  inner.position.z = 0.62;
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(1.06, 0.02, 8, 60),
    new THREE.MeshBasicMaterial({ color: NEON, transparent: true, opacity: 0.8 })
  );
  pinGroup.add(head, tip, inner, halo);
  pinGroup.position.set(0, 8, 0);
  pinGroup.scale.setScalar(0.001);
  group.add(pinGroup);

  // pulse ring on the ground under the pin
  const pulse = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 0.68, 48),
    new THREE.MeshBasicMaterial({ color: NEON, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
  );
  pulse.rotation.x = -Math.PI / 2;
  pulse.position.y = -2.95;
  group.add(pulse);

  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();
    if (!reducedMotion) {
      const dt = Math.max(0, t - 0.4);
      const drop = Math.min(1, dt * 1.1);
      const ease = 1 - Math.pow(1 - drop, 3);
      pinGroup.position.y = 8 - ease * 6.6;
      pinGroup.scale.setScalar(Math.min(1, drop * 1.4) || 0.001);
      if (drop >= 1) pinGroup.position.y = 1.4 + Math.sin(t * 1.4) * 0.15;

      const pt = (t % 2) / 2;
      pulse.scale.setScalar(1 + pt * 3.2);
      pulse.material.opacity = 0.7 * (1 - pt);

      group.rotation.y += 0.0011;
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      camera.position.x = mouse.x * 1.4;
      camera.position.y = 1.4 - mouse.y * 0.9;
      camera.lookAt(0, 0.5, 0);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}

const SCENES = {
  home: buildHomeScene,
  services: buildServicesScene,
  about: buildAboutScene,
  contact: buildContactScene
};

document.querySelectorAll('[data-hero-scene]').forEach((canvas) => {
  const build = SCENES[canvas.getAttribute('data-hero-scene')];
  if (build) build(canvas);
});
