/* Contact page — ambient drifting particle field over navy, with sparse
   connecting lines and mouse parallax. */
import { THREE, DEVICE_TIER, makeRenderer, sizeToParent, watchResize, runLoop, REDUCED_MOTION } from './webgl-base.js';
import { registerPreloadToken } from './core.js';

const COUNT = { low: 70, mid: 120, high: 170 }[DEVICE_TIER];
const LINK_DIST = 3.4;

export function initParticleField(canvas) {
  const token = registerPreloadToken('contact-scene');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 60);
  camera.position.set(0, 0, 16);

  const renderer = makeRenderer(canvas);
  sizeToParent(renderer, camera, canvas);

  const base = [];
  const positions = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const x = (Math.random() - 0.5) * 22;
    const y = (Math.random() - 0.5) * 13;
    const z = (Math.random() - 0.5) * 10;
    base.push({ x, y, z, phase: Math.random() * Math.PI * 2, speed: 0.15 + Math.random() * 0.25, amp: 0.4 + Math.random() * 0.5 });
    positions.set([x, y, z], i * 3);
  }

  const pointGeo = new THREE.BufferGeometry();
  pointGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pointMat = new THREE.PointsMaterial({ color: 0xd6dadf, size: 0.09, sizeAttenuation: true, transparent: true, opacity: 0.85 });
  const points = new THREE.Points(pointGeo, pointMat);
  scene.add(points);

  // sparse connections, computed once from the initial layout
  const linkPairs = [];
  for (let i = 0; i < COUNT; i++) {
    for (let j = i + 1; j < COUNT; j++) {
      const dx = base[i].x - base[j].x, dy = base[i].y - base[j].y, dz = base[i].z - base[j].z;
      if (Math.hypot(dx, dy, dz) < LINK_DIST) linkPairs.push([i, j]);
      if (linkPairs.length > COUNT * 1.4) break;
    }
  }
  const linePositions = new Float32Array(linkPairs.length * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: 0x3e5a93, transparent: true, opacity: 0.35 });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  const mouse = { x: 0, y: 0 };
  if (!REDUCED_MOTION) {
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX / window.innerWidth - 0.5;
      mouse.y = e.clientY / window.innerHeight - 0.5;
    });
  }

  watchResize(() => sizeToParent(renderer, camera, canvas));

  runLoop((time) => {
    const t = time / 1000;
    const posAttr = pointGeo.attributes.position;
    if (!REDUCED_MOTION) {
      for (let i = 0; i < COUNT; i++) {
        const p = base[i];
        posAttr.array[i * 3] = p.x + Math.sin(t * p.speed + p.phase) * p.amp;
        posAttr.array[i * 3 + 1] = p.y + Math.cos(t * p.speed * 0.8 + p.phase) * p.amp;
        posAttr.array[i * 3 + 2] = p.z + Math.sin(t * p.speed * 0.6 + p.phase) * p.amp * 0.6;
      }
      posAttr.needsUpdate = true;

      for (let k = 0; k < linkPairs.length; k++) {
        const [a, b] = linkPairs[k];
        linePositions[k * 6] = posAttr.array[a * 3];
        linePositions[k * 6 + 1] = posAttr.array[a * 3 + 1];
        linePositions[k * 6 + 2] = posAttr.array[a * 3 + 2];
        linePositions[k * 6 + 3] = posAttr.array[b * 3];
        linePositions[k * 6 + 4] = posAttr.array[b * 3 + 1];
        linePositions[k * 6 + 5] = posAttr.array[b * 3 + 2];
      }
      lineGeo.attributes.position.needsUpdate = true;

      camera.position.x = mouse.x * 1.6;
      camera.position.y = -mouse.y * 1.2;
      camera.lookAt(0, 0, 0);
      points.rotation.y = t * 0.02;
      lines.rotation.y = t * 0.02;
    }
    renderer.render(scene, camera);
  }, canvas);

  requestAnimationFrame(() => token.done());
}
