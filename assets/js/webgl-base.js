/* Shared WebGL scaffolding used by every page's Three.js scene. */
import * as THREE from 'three';
import { DEVICE_TIER, REDUCED_MOTION } from './core.js';

const PIXEL_RATIO_CAP = { low: 1.25, mid: 1.75, high: 2 }[DEVICE_TIER];

export function makeRenderer(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: opts.alpha !== false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PIXEL_RATIO_CAP));
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

export function sizeToParent(renderer, camera, canvas) {
  const parent = canvas.parentElement;
  const w = parent.clientWidth, h = parent.clientHeight;
  renderer.setSize(w, h, false);
  if (camera.isPerspectiveCamera) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  } else if (camera.isOrthographicCamera) {
    camera.left = -w / 2; camera.right = w / 2;
    camera.top = h / 2; camera.bottom = -h / 2;
    camera.updateProjectionMatrix();
  }
  return { w, h };
}

export function watchResize(fn) {
  let raf;
  const handler = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fn); };
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}

/* Runs `fn(time)` every frame via gsap.ticker unless prefers-reduced-motion,
   in which case it renders a single static frame so the scene still reflects
   scroll-driven state without a continuous animation loop. Pass `el` (the
   canvas, or any element inside the page/section it belongs to) to skip
   rendering while that section is hidden — e.g. an inactive tab in a
   single-page build — so idle scenes don't burn GPU cycles offscreen. */
export function runLoop(fn, el) {
  if (REDUCED_MOTION) { fn(0); return () => {}; }
  const tick = (t) => {
    if (el && el.offsetParent === null) return;
    fn(t);
  };
  gsap.ticker.add(tick);
  return () => gsap.ticker.remove(tick);
}

export { THREE, DEVICE_TIER, REDUCED_MOTION };
