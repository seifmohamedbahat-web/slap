/* Keeps It Real Estate — shared runtime
   Preloader · Lenis · custom cursor · nav condense · scroll reveals ·
   count-up stats · magnetic hover · SplitText hero · device tiering. */
import Lenis from '../vendor/lenis.mjs';

gsap.registerPlugin(ScrollTrigger, SplitText);

export const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches;

export const DEVICE_TIER = (() => {
  const w = window.innerWidth;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  if (w < 640 || cores <= 4 || mem <= 4) return 'low';
  if (w < 1200 || cores <= 8) return 'mid';
  return 'high';
})();

export const TIER_SCALE = { low: 0.45, mid: 0.75, high: 1 }[DEVICE_TIER];

/* ---------------------------------------------------------------- Preloader */
const preloadTokens = new Map();
let preloadResolved = false;
const preloadReadyCallbacks = [];

export function registerPreloadToken(name) {
  preloadTokens.set(name, 0);
  updatePreloaderUI();
  return {
    set(fraction) { preloadTokens.set(name, Math.max(0, Math.min(1, fraction))); updatePreloaderUI(); },
    done() { preloadTokens.set(name, 1); updatePreloaderUI(); },
  };
}

export function onPreloadComplete(fn) {
  if (preloadResolved) fn();
  else preloadReadyCallbacks.push(fn);
}

function currentProgress() {
  if (preloadTokens.size === 0) return 1;
  let sum = 0;
  preloadTokens.forEach(v => sum += v);
  return sum / preloadTokens.size;
}

let fillEl, pctEl;
function updatePreloaderUI() {
  if (!fillEl) return;
  const pct = Math.round(currentProgress() * 100);
  gsap.to(fillEl, { width: pct + '%', duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
  if (pctEl) pctEl.textContent = String(pct).padStart(3, '0');
}

export function initPreloader() {
  document.body.classList.add('is-loading');
  const wrap = document.createElement('div');
  wrap.className = 'preloader';
  wrap.innerHTML = `
    <div class="preloader-mark">Keeps It Real</div>
    <div class="preloader-bar"><div class="preloader-bar-fill"></div></div>
    <div class="preloader-pct">000%</div>`;
  document.body.appendChild(wrap);
  fillEl = wrap.querySelector('.preloader-bar-fill');
  pctEl = wrap.querySelector('.preloader-pct');

  const curtain = document.createElement('div');
  curtain.className = 'preloader-curtain';
  document.body.appendChild(curtain);

  const fontsToken = registerPreloadToken('fonts');
  document.fonts.ready.then(() => fontsToken.done()).catch(() => fontsToken.done());

  const minTimeToken = registerPreloadToken('min-time');
  setTimeout(() => minTimeToken.done(), REDUCED_MOTION ? 200 : 900);

  const domToken = registerPreloadToken('dom');
  if (document.readyState === 'complete') domToken.done();
  else window.addEventListener('load', () => domToken.done());

  const poll = setInterval(() => {
    if (currentProgress() >= 1) {
      clearInterval(poll);
      reveal();
    }
  }, 80);

  function reveal() {
    preloadResolved = true;
    const tl = gsap.timeline({
      onComplete: () => {
        wrap.remove();
        curtain.remove();
        document.body.classList.remove('is-loading');
        preloadReadyCallbacks.forEach(fn => fn());
      }
    });
    if (REDUCED_MOTION) {
      tl.to(wrap, { opacity: 0, duration: 0.2 })
        .set(curtain, { opacity: 0 }, '<');
      return;
    }
    tl.to(wrap, { opacity: 0, duration: 0.45, ease: 'power2.out' })
      .to(curtain, { yPercent: -100, duration: 1.0, ease: 'power4.inOut' }, '-=0.15');
  }
}

/* -------------------------------------------------------------- Lenis + ScrollTrigger sync */
export function initLenis() {
  document.documentElement.classList.add('has-lenis');
  if (REDUCED_MOTION) {
    ScrollTrigger.normalizeScroll(false);
    return null;
  }
  const lenis = new Lenis({
    duration: 1.1,
    smoothWheel: true,
    syncTouch: false,
    touchMultiplier: 1,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  window.__lenis = lenis;
  return lenis;
}

/* --------------------------------------------------------------------- Cursor */
export function initCursor() {
  if (IS_TOUCH) return;
  document.body.classList.add('has-custom-cursor');
  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  document.body.append(dot, ring);

  const setDot = gsap.quickTo(dot, 'x', { duration: 0.05, ease: 'none' });
  const setDotY = gsap.quickTo(dot, 'y', { duration: 0.05, ease: 'none' });
  const setRing = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3.out' });
  const setRingY = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3.out' });

  window.addEventListener('mousemove', (e) => {
    setDot(e.clientX); setDotY(e.clientY);
    setRing(e.clientX); setRingY(e.clientY);
  });

  document.addEventListener('mouseleave', () => { gsap.to([dot, ring], { opacity: 0, duration: 0.2 }); });
  document.addEventListener('mouseenter', () => { gsap.to([dot, ring], { opacity: 1, duration: 0.2 }); });

  const hoverables = 'a, button, [data-magnetic], .filter-chip, input, textarea, select';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest && e.target.closest(hoverables)) ring.classList.add('is-magnetic');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest && e.target.closest(hoverables)) ring.classList.remove('is-magnetic');
  });
}

/* --------------------------------------------------------------- Magnetic hover */
export function initMagnetic() {
  if (IS_TOUCH || REDUCED_MOTION) return;
  document.querySelectorAll('[data-magnetic], .btn').forEach((el) => {
    const strength = parseFloat(el.dataset.magneticStrength || '0.35');
    const moveX = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const moveY = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      moveX((e.clientX - r.left - r.width / 2) * strength);
      moveY((e.clientY - r.top - r.height / 2) * strength);
    });
    el.addEventListener('mouseleave', () => { moveX(0); moveY(0); });
  });
}

/* -------------------------------------------------------------------- Nav */
export function initNav() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 30);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  if (window.__lenis) window.__lenis.on('scroll', onScroll);

  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    const setOpen = (open) => {
      links.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'primary-nav');
    links.id = 'primary-nav';
    toggle.addEventListener('click', () => setOpen(!links.classList.contains('open')));
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  }
}

/* ---------------------------------------------------------------- SplitText hero */
export function splitHero(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  if (REDUCED_MOTION) { el.style.opacity = 1; return; }

  const split = new SplitText(el, { type: 'chars, words', charsClass: 'char' });
  gsap.set(split.chars, { opacity: 0, yPercent: 130, rotateZ: 4 });
  onPreloadComplete(() => {
    gsap.to(split.chars, {
      opacity: 1, yPercent: 0, rotateZ: 0,
      duration: 1.1, ease: 'power4.out',
      stagger: 0.018, delay: 0.25,
    });
  });
}

/* ---------------------------------------------------------------- Scroll reveals */
export function initReveals() {
  if (REDUCED_MOTION) return;
  ScrollTrigger.batch('.reveal', {
    start: 'top 88%',
    onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12 }),
    once: true,
  });
  ScrollTrigger.batch('.reveal-fade', {
    start: 'top 90%',
    onEnter: (batch) => gsap.to(batch, { opacity: 1, duration: 1.1, ease: 'power2.out', stagger: 0.1 }),
    once: true,
  });
  ScrollTrigger.batch('.reveal-scale', {
    start: 'top 88%',
    onEnter: (batch) => gsap.to(batch, { opacity: 1, scale: 1, duration: 1, ease: 'power3.out', stagger: 0.12 }),
    once: true,
  });
  document.querySelectorAll('[data-reveal-stagger]').forEach((group) => {
    ScrollTrigger.create({
      trigger: group,
      start: 'top 85%',
      once: true,
      onEnter: () => gsap.to(group.children, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1 }),
    });
  });
}

/* ---------------------------------------------------------------- Count-up stats */
export function initCounters() {
  document.querySelectorAll('[data-counter]').forEach((el) => {
    const target = parseFloat(el.dataset.counter);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const obj = { val: 0 };
    if (REDUCED_MOTION) { el.textContent = target.toFixed(decimals); return; }
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        gsap.to(obj, {
          val: target, duration: 1.8, ease: 'power2.out',
          onUpdate: () => { el.textContent = obj.val.toFixed(decimals); },
        });
      },
    });
  });
}

/* ------------------------------------------------------------------ Boot */
export function bootShared() {
  initPreloader();
  initLenis();
  initCursor();
  initNav();
  initMagnetic();
  initReveals();
  initCounters();
}
