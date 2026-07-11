import { bootShared, splitHero } from './core.js';
import { initListingsPage } from './listings-app.js';

bootShared();
splitHero('[data-split-hero]');

initListingsPage({
  gridWrap: document.getElementById('grid-wrap'),
  gridEl: document.getElementById('listing-grid'),
  canvas: document.getElementById('listings-canvas'),
  filterBar: document.getElementById('filter-bar'),
  resultsCount: document.getElementById('results-count'),
  modalRoot: document.getElementById('modal-root'),
});
