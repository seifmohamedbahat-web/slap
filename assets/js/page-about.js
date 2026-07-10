import { bootShared, splitHero } from './core.js';
import { initCornerstone } from './scene-about.js';

bootShared();
splitHero('[data-split-hero]');
initCornerstone(document.getElementById('cornerstone-canvas'), document.getElementById('cornerstone-section'));
