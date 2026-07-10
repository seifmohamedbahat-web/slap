/* Keeps It Real Estate — WebGL hero scenes (Three.js, ES module)
   Renders a distinct luxury real-estate themed 3D scene per page. */
import * as THREE from '../vendor/three.module.min.js';

const NAVY = 0x0e2c5c;
const NAVY_DEEP = 0x0a1a3a;
const SILVER = 0xd9dee6;
const SILVER_DEEP = 0x9aa1ad;
const GOLD = 0xb7924a;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dpr = Math.min(window.devicePixelRatio || 1, 2);

function baseSetup(canvas, { alpha = true, cameraZ = 14, fov = 42 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha });
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, canvas.clientWidth / canvas.clientHeight || 1, 0.1, 200);
  camera.position.set(0, 0, cameraZ);

  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(6, 10, 8);
  const rim = new THREE.PointLight(GOLD, 1.4, 60);
  rim.position.set(-8, 4, 6);
  const fill = new THREE.PointLight(SILVER, 0.7, 60);
  fill.position.set(4, -6, 6);
  scene.add(ambient, key, rim, fill);

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

function metalMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color, metalness: 0.75, roughness: 0.32, ...opts
  });
}

/* ---------------- HOME: luxury skyline + floating listing sparks ---------------- */
function buildHomeScene(canvas) {
  const { renderer, scene, camera, mouse } = baseSetup(canvas, { cameraZ: 19 });

  const group = new THREE.Group();
  group.position.x = 6.5;
  scene.add(group);

  const count = 26;
  const towers = [];
  for (let i = 0; i < count; i++) {
    const w = THREE.MathUtils.randFloat(0.5, 1.1);
    const h = THREE.MathUtils.randFloat(1.5, 8);
    const d = THREE.MathUtils.randFloat(0.5, 1.1);
    const geo = new THREE.BoxGeometry(w, h, d);
    const isAccent = i % 6 === 0;
    const mat = metalMat(isAccent ? SILVER : NAVY, { roughness: isAccent ? 0.2 : 0.5, metalness: isAccent ? 0.9 : 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    /* bias the arc so towers cluster to the right/rear of the frame,
       leaving the left third clear for the headline */
    const angle = -Math.PI * 0.55 + (i / count) * Math.PI * 1.3;
    const radius = THREE.MathUtils.randFloat(4.5, 8.5);
    mesh.position.set(Math.cos(angle) * radius, -h / 2 + THREE.MathUtils.randFloat(-0.5, 0.5), Math.sin(angle) * radius * 0.4 - 2);
    mesh.userData.baseY = mesh.position.y;
    mesh.userData.speed = THREE.MathUtils.randFloat(0.4, 1.1);
    mesh.userData.offset = Math.random() * Math.PI * 2;
    group.add(mesh);
    towers.push(mesh);

    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.18 }));
    mesh.add(line);
  }

  // sparkle particles = "listings"
  const sparkCount = 90;
  const positions = new Float32Array(sparkCount * 3);
  for (let i = 0; i < sparkCount; i++) {
    positions[i * 3] = THREE.MathUtils.randFloatSpread(20);
    positions[i * 3 + 1] = THREE.MathUtils.randFloat(-2, 9);
    positions[i * 3 + 2] = THREE.MathUtils.randFloatSpread(10) - 2;
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const sparkMat = new THREE.PointsMaterial({ color: GOLD, size: 0.09, transparent: true, opacity: 0.85, sizeAttenuation: true });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  scene.add(sparks);

  const ringGeo = new THREE.RingGeometry(9.6, 9.68, 90);
  const ringMat = new THREE.MeshBasicMaterial({ color: SILVER_DEEP, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2.15;
  ring.position.y = -3.4;
  scene.add(ring);

  group.rotation.y = -0.4;

  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();
    if (!reducedMotion) {
      group.rotation.y += 0.0012;
      towers.forEach((m) => {
        m.position.y = m.userData.baseY + Math.sin(t * m.userData.speed + m.userData.offset) * 0.18;
      });
      sparks.rotation.y += 0.0006;
      ring.rotation.z += 0.0009;
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      camera.position.x = mouse.x * 1.6;
      camera.position.y = 1.2 - mouse.y * 1.1;
      camera.lookAt(0, 0.5, 0);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}

/* ---------------- LISTINGS: floating property panels ---------------- */
function buildListingsScene(canvas) {
  const { renderer, scene, camera, mouse } = baseSetup(canvas, { cameraZ: 13 });
  const group = new THREE.Group();
  group.position.x = 4.5;
  scene.add(group);

  const panels = [];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const geo = new THREE.BoxGeometry(1.9, 1.25, 0.06);
    const mat = metalMat(i % 3 === 0 ? GOLD : (i % 2 === 0 ? SILVER : NAVY), { roughness: 0.35 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      THREE.MathUtils.randFloat(-2, 7),
      THREE.MathUtils.randFloatSpread(7),
      THREE.MathUtils.randFloatSpread(8) - 2
    );
    mesh.rotation.set(Math.random() * 0.6 - 0.3, Math.random() * Math.PI, Math.random() * 0.3 - 0.15);
    mesh.userData.spin = THREE.MathUtils.randFloat(0.05, 0.18) * (Math.random() > 0.5 ? 1 : -1);
    mesh.userData.float = THREE.MathUtils.randFloat(0.3, 0.8);
    mesh.userData.offset = Math.random() * Math.PI * 2;
    mesh.userData.baseY = mesh.position.y;
    group.add(mesh);
    panels.push(mesh);

    const edges = new THREE.EdgesGeometry(geo);
    mesh.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 })));
  }

  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();
    if (!reducedMotion) {
      panels.forEach((m) => {
        m.rotation.y += 0.0025 * m.userData.spin * 10 * 0.01;
        m.rotation.y += m.userData.spin * 0.003;
        m.position.y = m.userData.baseY + Math.sin(t * m.userData.float + m.userData.offset) * 0.35;
      });
      group.rotation.y += 0.0009;
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      camera.position.x = mouse.x * 1.4;
      camera.position.y = -mouse.y * 1.0;
      camera.lookAt(0, 0, 0);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}

/* ---------------- ABOUT: trust network sphere ---------------- */
function buildAboutScene(canvas) {
  const { renderer, scene, camera, mouse } = baseSetup(canvas, { cameraZ: 13 });
  const group = new THREE.Group();
  group.position.x = 7;
  scene.add(group);

  const radius = 4.2;
  const nodeCount = 60;
  const nodePositions = [];
  const nodeGeo = new THREE.SphereGeometry(0.045, 8, 8);
  const nodeMat = new THREE.MeshStandardMaterial({ color: GOLD, emissive: 0x3a2a10, metalness: 0.6, roughness: 0.4 });
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

  const lineMat = new THREE.LineBasicMaterial({ color: SILVER_DEEP, transparent: true, opacity: 0.22 });
  const linePts = [];
  for (let i = 0; i < nodePositions.length; i++) {
    for (let j = i + 1; j < nodePositions.length; j++) {
      if (nodePositions[i].distanceTo(nodePositions[j]) < 1.9) {
        linePts.push(nodePositions[i], nodePositions[j]);
      }
    }
  }
  const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
  group.add(new THREE.LineSegments(lineGeo, lineMat));

  const coreGeo = new THREE.IcosahedronGeometry(1.6, 1);
  const coreMat = metalMat(NAVY, { roughness: 0.25, metalness: 0.85 });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);
  const coreEdges = new THREE.LineSegments(new THREE.EdgesGeometry(coreGeo), new THREE.LineBasicMaterial({ color: SILVER, transparent: true, opacity: 0.4 }));
  core.add(coreEdges);

  const clock = new THREE.Clock();
  function tick() {
    if (!reducedMotion) {
      group.rotation.y += 0.0016;
      group.rotation.x = Math.sin(clock.getElapsedTime() * 0.15) * 0.12;
      core.rotation.y -= 0.003;
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

/* ---------------- CONTACT: map grid + dropping pin ---------------- */
function buildContactScene(canvas) {
  const { renderer, scene, camera, mouse } = baseSetup(canvas, { cameraZ: 12, fov: 46 });
  const group = new THREE.Group();
  group.position.x = 6.5;
  scene.add(group);

  const grid = new THREE.GridHelper(22, 26, SILVER_DEEP, 0xc7cdd6);
  grid.position.y = -3;
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  group.add(grid);

  const dotsGeo = new THREE.BufferGeometry();
  const dotCount = 60;
  const dp = new Float32Array(dotCount * 3);
  for (let i = 0; i < dotCount; i++) {
    dp[i * 3] = THREE.MathUtils.randFloatSpread(18);
    dp[i * 3 + 1] = -3;
    dp[i * 3 + 2] = THREE.MathUtils.randFloatSpread(14) - 2;
  }
  dotsGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dots = new THREE.Points(dotsGeo, new THREE.PointsMaterial({ color: GOLD, size: 0.1, transparent: true, opacity: 0.7 }));
  group.add(dots);

  const pinGroup = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), metalMat(NAVY, { roughness: 0.25 }));
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.4, 32), metalMat(NAVY, { roughness: 0.25 }));
  tip.position.y = -1.05;
  tip.rotation.x = Math.PI;
  const inner = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 24), new THREE.MeshStandardMaterial({ color: SILVER, metalness: 0.9, roughness: 0.15 }));
  inner.position.z = 0.05;
  pinGroup.add(head, tip, inner);
  pinGroup.position.set(0, 8, 0);
  pinGroup.scale.setScalar(0.001);
  group.add(pinGroup);

  const clock = new THREE.Clock();
  let dropped = false;
  function tick() {
    const t = clock.getElapsedTime();
    if (!reducedMotion) {
      if (t > 0.4 && !dropped) {
        dropped = true;
      }
      if (dropped) {
        const dt = t - 0.4;
        const drop = Math.min(1, dt * 1.1);
        const ease = 1 - Math.pow(1 - drop, 3);
        pinGroup.position.y = 8 - ease * 6.6;
        pinGroup.scale.setScalar(Math.min(1, drop * 1.4));
        if (drop >= 1) {
          pinGroup.position.y = 1.4 + Math.sin(t * 1.4) * 0.15;
        }
      }
      group.rotation.y += 0.0011;
      dots.rotation.y += 0.0011;
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

/* ---------------- Portrait emblem (small canvas, About page) ---------------- */
function buildPortraitScene(canvas) {
  const { renderer, scene, camera } = baseSetup(canvas, { cameraZ: 6, fov: 40 });
  const geo = new THREE.IcosahedronGeometry(1.9, 1);
  const mat = new THREE.MeshStandardMaterial({ color: SILVER, metalness: 0.9, roughness: 0.18, transparent: true, opacity: 0.9 });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.55 }));
  mesh.add(edges);

  const clock = new THREE.Clock();
  function tick() {
    if (!reducedMotion) {
      const t = clock.getElapsedTime();
      mesh.rotation.y = t * 0.28;
      mesh.rotation.x = Math.sin(t * 0.4) * 0.25;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}

const SCENES = {
  home: buildHomeScene,
  listings: buildListingsScene,
  about: buildAboutScene,
  contact: buildContactScene,
  portrait: buildPortraitScene
};

document.querySelectorAll('[data-hero-scene]').forEach((canvas) => {
  const kind = canvas.getAttribute('data-hero-scene');
  const build = SCENES[kind];
  if (build) build(canvas);
});
