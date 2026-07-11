/* Home page — "Blueprint to Skyline" hero + pinned gallery dolly. */
import { THREE, DEVICE_TIER, REDUCED_MOTION, makeRenderer, sizeToParent, watchResize, runLoop } from './webgl-base.js';
import { createDistortionMaterial } from './distortion-material.js';
import { getListingTexture } from './elevations.js';
import { LISTINGS } from './listings-data.js';
import { registerPreloadToken } from './core.js';

const BUILDING_COUNT = { low: 26, mid: 42, high: 60 }[DEVICE_TIER];

/* ------------------------------------------------------------ Hero scene */
export function initHeroScene(canvas) {
  const token = registerPreloadToken('hero-scene');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 400);
  camera.position.set(0, 26, 58);
  camera.lookAt(0, 6, -10);

  const renderer = makeRenderer(canvas);
  sizeToParent(renderer, camera, canvas);

  scene.add(new THREE.AmbientLight(0x3e5a93, 0.9));
  const key = new THREE.DirectionalLight(0xfbfbfc, 1.1);
  key.position.set(30, 50, 20);
  scene.add(key);
  const rim = new THREE.PointLight(0x9aa1ab, 1.4, 200);
  rim.position.set(-40, 30, -40);
  scene.add(rim);

  // ground grid — the "blueprint" plan
  const grid = new THREE.GridHelper(240, 40, 0x3e5a93, 0x1b2e56);
  grid.position.y = 0;
  grid.material.transparent = true;
  grid.material.opacity = 0.5;
  scene.add(grid);

  const rand = mulberry32(7);
  const buildings = [];
  const rows = Math.ceil(Math.sqrt(BUILDING_COUNT));
  const spacing = 200 / rows;

  for (let i = 0; i < BUILDING_COUNT; i++) {
    const gx = (i % rows) - rows / 2;
    const gz = Math.floor(i / rows) - rows / 2;
    const jitterX = (rand() - 0.5) * spacing * 0.5;
    const jitterZ = (rand() - 0.5) * spacing * 0.5;
    const x = gx * spacing + jitterX;
    const z = gz * spacing + jitterZ;
    const dist = Math.hypot(x, z);
    if (dist < 10) continue;

    const w = 3 + rand() * 5;
    const d = 3 + rand() * 5;
    const targetH = 6 + rand() * 34 * (1 - Math.min(dist / 140, 0.7));

    const geo = new THREE.BoxGeometry(w, 1, d);
    geo.translate(0, 0.5, 0);

    const ghostMat = new THREE.LineBasicMaterial({ color: 0x3e5a93, transparent: true, opacity: 0.55 });
    const ghost = new THREE.LineSegments(new THREE.EdgesGeometry(geo), ghostMat);
    ghost.position.set(x, 0, z);
    ghost.scale.set(1, targetH, 1);
    scene.add(ghost);

    const solidMat = new THREE.MeshStandardMaterial({
      color: 0xd6dadf, metalness: 0.7, roughness: 0.32,
      emissive: 0x0b1730, emissiveIntensity: 0.15,
    });
    const solid = new THREE.Mesh(geo, solidMat);
    solid.position.set(x, 0, z);
    solid.scale.set(1, 0.001, 1);
    scene.add(solid);

    buildings.push({ ghost, solid, targetH, delay: Math.min(dist / 140, 1) });
  }

  function setProgress(p) {
    buildings.forEach((b) => {
      const local = Math.max(0, Math.min(1, (p - b.delay * 0.4) / 0.6));
      const eased = local * local * (3 - 2 * local);
      b.solid.scale.y = Math.max(0.001, eased) * b.targetH;
      b.ghost.material.opacity = 0.55 * (1 - eased * 0.85);
    });
    const camZ = 58 - p * 46;
    const camY = 26 - p * 16;
    camera.position.set(mouse.x * 4, camY, camZ);
    camera.lookAt(mouse.y * 2, 6 - p * 2, -10);
  }

  const mouse = { x: 0, y: 0 };
  if (!REDUCED_MOTION) {
    window.addEventListener('mousemove', (e) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5);
      mouse.y = (e.clientY / window.innerHeight - 0.5);
    });
  }

  let progress = 0;
  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    end: '+=140%',
    pin: true,
    scrub: 0.6,
    onUpdate: (self) => { progress = self.progress; },
  });

  watchResize(() => sizeToParent(renderer, camera, canvas));

  runLoop(() => {
    setProgress(progress);
    renderer.render(scene, camera);
  }, canvas);

  requestAnimationFrame(() => token.done());
}

/* -------------------------------------------------------- Gallery dolly */
export function initGalleryDolly(section, canvas, captionRoot) {
  const token = registerPreloadToken('gallery-scene');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);

  const renderer = makeRenderer(canvas, { alpha: true });
  sizeToParent(renderer, camera, canvas);
  scene.add(new THREE.AmbientLight(0xffffff, 1));

  const spacing = 14;
  const planeAspect = 9.5 / 6.4;
  const planes = LISTINGS.map((listing, i) => {
    const texture = getListingTexture(listing, planeAspect);
    const material = createDistortionMaterial(texture);
    const geo = new THREE.PlaneGeometry(9.5, 6.4, 24, 16);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(i % 2 === 0 ? -2.4 : 2.4, i % 3 === 0 ? 0.6 : -0.6, -i * spacing);
    scene.add(mesh);
    return { mesh, material, listing, z: -i * spacing };
  });

  camera.position.set(0, 0, 6);

  // captions
  const captionEls = LISTINGS.map((listing) => {
    const el = document.createElement('div');
    el.className = 'gallery-caption';
    el.innerHTML = `
      <span class="gallery-caption-eyebrow">${listing.neighborhood} · ${listing.status}</span>
      <h3>${listing.title}</h3>
      <span class="gallery-caption-price spec">${listing.price}</span>`;
    captionRoot.appendChild(el);
    return el;
  });
  gsap.set(captionEls, { opacity: 0, y: 24 });
  gsap.set(captionEls[0], { opacity: 1, y: 0 });

  let lastZ = 0, velocity = 0, activeIndex = 0;

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => '+=' + (LISTINGS.length * spacing * 90),
    pin: true,
    scrub: 0.7,
    onUpdate: (self) => {
      const totalZ = (LISTINGS.length - 1) * spacing;
      const camZ = 6 - self.progress * (totalZ + 10);
      velocity = camZ - lastZ;
      lastZ = camZ;
      camera.position.z = camZ;
      camera.position.x = Math.sin(self.progress * Math.PI * 2) * 0.6;

      const idx = Math.max(0, Math.min(LISTINGS.length - 1, Math.round(self.progress * (LISTINGS.length - 1))));
      if (idx !== activeIndex) {
        gsap.to(captionEls[activeIndex], { opacity: 0, y: -24, duration: 0.4, ease: 'power2.out' });
        gsap.to(captionEls[idx], { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
        activeIndex = idx;
      }
    },
  });

  watchResize(() => sizeToParent(renderer, camera, canvas));

  runLoop((time) => {
    velocity *= 0.85;
    const v = REDUCED_MOTION ? 0 : velocity * 6;
    planes.forEach(({ mesh, material }) => {
      material.uniforms.uVelocity.value = THREE.MathUtils.lerp(material.uniforms.uVelocity.value, v, 0.15);
      material.uniforms.uTime.value = time / 1000;
      const dist = Math.abs(mesh.position.z - camera.position.z);
      material.uniforms.uOpacity.value = THREE.MathUtils.clamp(1.4 - dist / 16, 0, 1);
    });
    renderer.render(scene, camera);
  }, canvas);

  requestAnimationFrame(() => token.done());
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
