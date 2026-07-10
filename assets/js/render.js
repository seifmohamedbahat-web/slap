/* Keeps It Real Estate — renders listing & review cards from data files */
(function () {
  const specIcons = {
    bed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18v-6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6"/><path d="M2 18v2M22 18v2M4 12V8a2 2 0 0 1 2-2h3v4M13 6h3a2 2 0 0 1 2 2v4"/></svg>',
    bath: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-2.5 1V12"/><path d="M4 12h17a1 1 0 0 1 1 1 6 6 0 0 1-6 6H9a6 6 0 0 1-6-6 1 1 0 0 1 1-1Z"/><path d="M6 19v2M18 19v2"/></svg>',
    sqft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h4V3M21 9h-4V3M3 15h4v6M21 15h-4v6"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>'
  };

  function starRow(rating) {
    const full = Math.round(rating);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }

  function initials(name) {
    return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  }

  function listingCard(item) {
    return `
    <article class="listing-card reveal" data-status="${item.status}">
      <div class="listing-media">
        <img src="${item.img}" alt="${item.title} — ${item.location}" loading="lazy">
        <span class="listing-tag">${item.status}</span>
        <span class="listing-price">${item.price}</span>
      </div>
      <div class="listing-body">
        <h3 class="listing-title">${item.title}</h3>
        <div class="listing-loc">${specIcons.pin}${item.location}</div>
        <p style="font-size:.85rem; margin-bottom:16px;">${item.blurb}</p>
        <div class="listing-specs">
          <span>${specIcons.bed} ${item.beds} Beds</span>
          <span>${specIcons.bath} ${item.baths} Baths</span>
          <span>${specIcons.sqft} ${item.sqft} Sqft</span>
        </div>
      </div>
    </article>`;
  }

  function reviewCard(r) {
    return `
    <div class="review-card">
      <div class="review-stars">${starRow(r.rating)}</div>
      <p class="review-text">"${r.text}"</p>
      <div class="review-person">
        <div class="review-avatar">${initials(r.name)}</div>
        <div>
          <div class="review-name">${r.name}</div>
          <div class="review-loc">${r.loc}</div>
        </div>
      </div>
    </div>`;
  }

  // Runs synchronously — this script tag sits at the end of <body>, after
  // the DOM it targets, so no DOMContentLoaded wrapper is needed. Keeping it
  // synchronous also guarantees animations.js (loaded right after) sees the
  // injected markup when it wires up reveals, tilt and the reviews marquee.
  const listings = window.LISTINGS || [];
  const reviews = window.REVIEWS || [];
  const stats = window.REVIEW_STATS || {};

  const featured = document.getElementById('featured-listings');
  if (featured) featured.innerHTML = listings.slice(0, 6).map(listingCard).join('');

  const all = document.getElementById('all-listings');
  if (all) all.innerHTML = listings.map(listingCard).join('');

  const track = document.getElementById('reviews-track');
  if (track) {
    const subset = reviews.slice(0, 10);
    const html = subset.map(reviewCard).join('') + subset.map(reviewCard).join('');
    track.innerHTML = html;
  }

  document.querySelectorAll('[data-review-count]').forEach((el) => { el.textContent = stats.count; });
  document.querySelectorAll('[data-review-avg]').forEach((el) => { el.textContent = stats.average; });
  document.querySelectorAll('[data-review-link]').forEach((el) => { el.href = stats.profileUrl; });
})();
