import { bootShared, splitHero } from './core.js';
import { initHeroScene, initGalleryDolly } from './scene-home.js';

bootShared();
splitHero('[data-split-hero]');
initHeroScene(document.getElementById('hero-canvas'));
initGalleryDolly(
  document.getElementById('gallery-dolly'),
  document.getElementById('gallery-canvas'),
  document.getElementById('gallery-captions')
);
