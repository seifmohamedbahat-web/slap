/* Listings page — renders the grid, syncs a single WebGL canvas to the
   live DOM tile positions (photo-plane grid), instant filter chips, and
   the property detail modal. */
import { THREE, makeRenderer, watchResize, runLoop, REDUCED_MOTION } from './webgl-base.js';
import { createDistortionMaterial } from './distortion-material.js';
import { getElevationCanvas } from './elevations.js';
import { LISTINGS } from './listings-data.js';
import { registerPreloadToken } from './core.js';

const specIcon = {
  bed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 18v2M21 18v2M3 13h18M7 13V9a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4"/></svg>',
  bath: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-3ZM7 12V6a2 2 0 0 1 3.6-1.2M4 21h16"/></svg>',
  sqft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h4M9 3v4"/></svg>',
};

function tileHTML(l) {
  return `
    <div class="listing-tile" data-id="${l.id}" data-neighborhood="${l.neighborhood}" data-status="${l.status}">
      <div class="listing-media" data-media="${l.id}">
        <span class="listing-tag">${l.status}</span>
        <span class="listing-price spec">${l.price}</span>
      </div>
      <div class="listing-body">
        <h3 class="listing-title">${l.title}</h3>
        <div class="listing-loc">${l.location}</div>
        <div class="listing-specs">
          <span>${specIcon.bed}${l.beds} Beds</span>
          <span>${specIcon.bath}${l.baths} Baths</span>
          <span>${specIcon.sqft}${l.sqft.toLocaleString()} Sq Ft</span>
        </div>
      </div>
    </div>`;
}

export function renderListingGrid(gridEl, list = LISTINGS) {
  gridEl.innerHTML = list.map(tileHTML).join('');
}

export function initListingsPage({ gridWrap, gridEl, canvas, filterBar, resultsCount, modalRoot }) {
  renderListingGrid(gridEl);

  /* ---------------------------------------------------------- WebGL sync */
  const token = registerPreloadToken('listings-scene');
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -1000, 1000);
  camera.position.z = 100;
  const renderer = makeRenderer(canvas);

  const planeMap = new Map();

  function buildPlanes() {
    planeMap.forEach(({ mesh }) => scene.remove(mesh));
    planeMap.clear();
    LISTINGS.forEach((l) => {
      const texture = new THREE.CanvasTexture(getElevationCanvas(l.id));
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = createDistortionMaterial(texture, { rounded: true, radius: 12, width: 100, height: 100 });
      const geo = new THREE.PlaneGeometry(1, 1, 20, 14);
      const mesh = new THREE.Mesh(geo, material);
      mesh.visible = false;
      scene.add(mesh);
      planeMap.set(l.id, { mesh, material });
    });
  }
  buildPlanes();

  function layout() {
    const rect = gridWrap.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    renderer.setSize(w, h, false);
    camera.left = 0; camera.right = w; camera.top = h; camera.bottom = 0;
    camera.updateProjectionMatrix();

    gridEl.querySelectorAll('.listing-media').forEach((mediaEl) => {
      const id = mediaEl.dataset.media;
      const entry = planeMap.get(id);
      if (!entry) return;
      const tile = mediaEl.closest('.listing-tile');
      const hidden = tile.classList.contains('is-filtered-out');
      if (hidden) { entry.mesh.visible = false; return; }
      const mRect = mediaEl.getBoundingClientRect();
      const localX = mRect.left - rect.left;
      const localY = mRect.top - rect.top;
      entry.mesh.visible = true;
      entry.mesh.scale.set(mRect.width, mRect.height, 1);
      // Three's Y axis points up; DOM rects are measured from the top, so flip.
      entry.mesh.position.set(localX + mRect.width / 2, h - (localY + mRect.height / 2), 0);
      entry.material.uniforms.uPlanePx.value.set(mRect.width, mRect.height);
    });
  }

  const ro = new ResizeObserver(() => requestAnimationFrame(layout));
  ro.observe(gridWrap);
  watchResize(layout);
  requestAnimationFrame(() => { layout(); requestAnimationFrame(layout); });

  runLoop((time) => {
    planeMap.forEach(({ material }) => { material.uniforms.uTime.value = time / 1000; });
    renderer.render(scene, camera);
  });

  gridEl.addEventListener('mouseover', (e) => {
    const tile = e.target.closest('.listing-tile');
    if (!tile) return;
    const entry = planeMap.get(tile.dataset.id);
    if (!entry) return;
    gsap.to(entry.mesh.position, { z: 18, duration: 0.5, ease: 'power3.out' });
    gsap.to(entry.material.uniforms.uHover, { value: 1, duration: 0.5, ease: 'power3.out' });
  });
  gridEl.addEventListener('mouseout', (e) => {
    const tile = e.target.closest('.listing-tile');
    if (!tile) return;
    const entry = planeMap.get(tile.dataset.id);
    if (!entry) return;
    gsap.to(entry.mesh.position, { z: 0, duration: 0.6, ease: 'power3.out' });
    gsap.to(entry.material.uniforms.uHover, { value: 0, duration: 0.6, ease: 'power3.out' });
  });

  requestAnimationFrame(() => token.done());

  /* ------------------------------------------------------------- Reveal */
  if (!REDUCED_MOTION) {
    ScrollTrigger.batch('.listing-tile', {
      start: 'top 92%',
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' }),
      once: true,
    });
    gsap.set('.listing-tile', { opacity: 0, y: 40 });
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }

  /* ------------------------------------------------------------- Filters */
  let activeFilter = 'all';
  filterBar.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    filterBar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.dataset.filter;
    applyFilter();
  });

  function applyFilter() {
    const tiles = [...gridEl.querySelectorAll('.listing-tile')];
    let visible = 0;
    tiles.forEach((tile) => {
      const match = activeFilter === 'all' || tile.dataset.neighborhood === activeFilter || tile.dataset.status === activeFilter;
      tile.classList.toggle('is-filtered-out', !match);
      if (match) {
        visible++;
        gsap.to(tile, { display: 'block', opacity: 1, scale: 1, height: 'auto', duration: 0.4, ease: 'power2.out' });
      } else {
        gsap.to(tile, { opacity: 0, scale: 0.94, duration: 0.3, ease: 'power2.in', onComplete: () => { tile.style.display = 'none'; } });
      }
    });
    resultsCount.textContent = `Showing ${visible} of ${LISTINGS.length} properties`;
    setTimeout(() => requestAnimationFrame(layout), 350);
  }
  applyFilter();

  /* -------------------------------------------------------------- Modal */
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card">
      <div class="modal-media">
        <button class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body"></div>
    </div>`;
  modalRoot.appendChild(overlay);
  const modalCard = overlay.querySelector('.modal-card');
  const modalMedia = overlay.querySelector('.modal-media');
  const modalBody = overlay.querySelector('.modal-body');

  function openModal(listing) {
    const canvas2d = getElevationCanvas(listing.id);
    modalMedia.querySelectorAll('img').forEach(n => n.remove());
    const img = document.createElement('img');
    img.src = canvas2d.toDataURL('image/jpeg', 0.9);
    img.alt = listing.title + ' — placeholder elevation, replace with listing photography';
    modalMedia.insertBefore(img, modalMedia.firstChild);

    modalBody.innerHTML = `
      <div class="modal-price spec">${listing.price}</div>
      <div class="modal-loc">${listing.location}</div>
      <div class="modal-specs">
        <div><strong>${listing.beds}</strong><span>Beds</span></div>
        <div><strong>${listing.baths}</strong><span>Baths</span></div>
        <div><strong>${listing.sqft.toLocaleString()}</strong><span>Sq Ft</span></div>
      </div>
      <p>${listing.blurb}</p>
      <div class="modal-tags">${listing.tags.map(t => `<span>${t}</span>`).join('')}</div>
      <div class="hero-actions" style="margin-top:8px;">
        <a class="btn btn-primary" href="tel:16197876628">Call (619) 787-6628</a>
        <a class="btn btn-outline" href="contact.html">Inquire About This Home</a>
      </div>`;

    overlay.classList.add('is-open');
    gsap.set(overlay, { opacity: 0 });
    gsap.to(overlay, { opacity: 1, duration: 0.35, ease: 'power2.out' });
    gsap.fromTo(modalCard, { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'power3.out' });
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    gsap.to(modalCard, { scale: 0.94, opacity: 0, duration: 0.3, ease: 'power2.in' });
    gsap.to(overlay, {
      opacity: 0, duration: 0.3, ease: 'power2.in',
      onComplete: () => { overlay.classList.remove('is-open'); document.body.style.overflow = ''; },
    });
  }

  gridEl.addEventListener('click', (e) => {
    const tile = e.target.closest('.listing-tile');
    if (!tile) return;
    const listing = LISTINGS.find(l => l.id === tile.dataset.id);
    if (listing) openModal(listing);
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  overlay.querySelector('.modal-close').addEventListener('click', closeModal);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
}
