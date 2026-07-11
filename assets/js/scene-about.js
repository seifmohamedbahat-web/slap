/* About page — rotating faceted "cornerstone" (metallic icosahedron +
   wireframe), continuously spinning and additionally driven by scroll
   progress in place of a portrait photo. */
import { THREE, makeRenderer, sizeToParent, watchResize, runLoop, REDUCED_MOTION } from './webgl-base.js';
import { registerPreloadToken } from './core.js';

export function initCornerstone(canvas, sectionEl) {
  const token = registerPreloadToken('cornerstone-scene');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 7.5);

  const renderer = makeRenderer(canvas);
  sizeToParent(renderer, camera, canvas);

  scene.add(new THREE.AmbientLight(0x9aa1ab, 1.1));
  const key = new THREE.DirectionalLight(0xfbfbfc, 1.6);
  key.position.set(4, 6, 5);
  scene.add(key);
  const rim = new THREE.PointLight(0x3e5a93, 2, 30);
  rim.position.set(-5, -3, 4);
  scene.add(rim);

  const group = new THREE.Group();
  scene.add(group);

  const coreGeo = new THREE.IcosahedronGeometry(2.15, 1);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xd6dadf, metalness: 0.85, roughness: 0.22,
    emissive: 0x0b1730, emissiveIntensity: 0.1, flatShading: true,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  const wireGeo = new THREE.IcosahedronGeometry(2.32, 1);
  const wireMat = new THREE.LineBasicMaterial({ color: 0xfbfbfc, transparent: true, opacity: 0 });
  const wire = new THREE.LineSegments(new THREE.EdgesGeometry(wireGeo), wireMat);
  group.add(wire);

  let scrollProgress = 0;
  if (!REDUCED_MOTION && sectionEl) {
    ScrollTrigger.create({
      trigger: sectionEl,
      start: 'top bottom',
      end: 'bottom top',
      scrub: 0.6,
      onUpdate: (self) => { scrollProgress = self.progress; },
    });
  }

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
    if (!REDUCED_MOTION) {
      group.rotation.y = t * 0.25 + scrollProgress * Math.PI * 1.4;
      group.rotation.x = Math.sin(t * 0.18) * 0.18 + scrollProgress * 0.6 + mouse.y * 0.3;
      group.rotation.z = mouse.x * 0.08;
      wireMat.opacity = 0.15 + scrollProgress * 0.75;
      const s = 1 + Math.sin(t * 0.5) * 0.015;
      group.scale.setScalar(s);
    } else {
      group.rotation.set(0.4, 0.6, 0);
      wireMat.opacity = 0.55;
    }
    renderer.render(scene, camera);
  }, canvas);

  requestAnimationFrame(() => token.done());
}
