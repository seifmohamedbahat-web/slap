/* Keeps It Real Estate — GSAP interactions & scroll animations */
(function () {
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Header scroll state ---------- */
  const header = document.querySelector('.site-header');
  function onScroll() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile nav ---------- */
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      navToggle.classList.toggle('active');
    });
    navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => navLinks.classList.remove('open')));
  }

  /* Split headline words into spans for stagger — must run before the hero
     timeline below, which animates the resulting .word spans. */
  document.querySelectorAll('[data-split-words]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) => `<span class="word" style="display:inline-block;">${w}</span>`).join(' ');
  });

  /* ---------- Hero entrance timeline ---------- */
  const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  if (document.querySelector('.hero-eyebrow')) {
    heroTl
      .from('.hero-eyebrow', { opacity: 0, y: 18, duration: 0.7 })
      .from('.hero-title .word', { opacity: 0, y: 46, stagger: 0.05, duration: 0.9 }, '-=0.4')
      .from('.hero-lede', { opacity: 0, y: 24, duration: 0.8 }, '-=0.5')
      .from('.hero-actions > *', { opacity: 0, y: 20, stagger: 0.08, duration: 0.6 }, '-=0.4')
      .from('.hero-badges > *', { opacity: 0, y: 20, stagger: 0.08, duration: 0.6 }, '-=0.35');
  }

  /* ---------- Generic scroll reveals ---------- */
  gsap.utils.toArray('.reveal').forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 86%' }
    });
  });
  gsap.utils.toArray('.reveal-fade').forEach((el) => {
    gsap.to(el, { opacity: 1, duration: 1.1, scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  gsap.utils.toArray('.reveal-scale').forEach((el) => {
    gsap.to(el, { opacity: 1, scale: 1, duration: 1, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });

  /* Stagger groups: any [data-stagger] container reveals its direct children */
  gsap.utils.toArray('[data-stagger]').forEach((group) => {
    const items = group.children;
    gsap.from(items, {
      opacity: 0,
      y: 40,
      duration: 0.9,
      stagger: 0.12,
      ease: 'power3.out',
      scrollTrigger: { trigger: group, start: 'top 84%' }
    });
  });

  /* ---------- Animated counters ---------- */
  gsap.utils.toArray('[data-counter]').forEach((el) => {
    const target = parseFloat(el.getAttribute('data-counter'));
    const decimals = el.getAttribute('data-decimals') ? parseInt(el.getAttribute('data-decimals'), 10) : 0;
    const suffix = el.getAttribute('data-suffix') || '';
    const obj = { val: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        gsap.to(obj, {
          val: target,
          duration: 1.8,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = obj.val.toFixed(decimals) + suffix;
          }
        });
      }
    });
  });

  /* ---------- Section headers / titles fade ---------- */
  gsap.utils.toArray('.section-head').forEach((el) => {
    gsap.from(el.children, {
      opacity: 0,
      y: 30,
      duration: 0.9,
      stagger: 0.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });

  /* ---------- Listing card parallax tilt ---------- */
  document.querySelectorAll('.listing-card').forEach((card) => {
    const maxTilt = 7;
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(card, {
        rotateX: -py * maxTilt,
        rotateY: px * maxTilt,
        duration: 0.5,
        ease: 'power2.out',
        transformPerspective: 900
      });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.6, ease: 'power3.out' });
    });
  });

  /* ---------- Testimonials marquee (auto scroll + pause on hover) ---------- */
  const track = document.querySelector('.reviews-track');
  if (track) {
    const cardW = 384; // width + gap
    const total = track.children.length / 2; // duplicated for loop
    const tween = gsap.to(track, {
      x: -cardW * total,
      duration: total * 4.2,
      ease: 'none',
      repeat: -1
    });
    track.addEventListener('mouseenter', () => tween.pause());
    track.addEventListener('mouseleave', () => tween.resume());
  }

  /* ---------- CTA banner reveal ---------- */
  gsap.utils.toArray('.cta-banner').forEach((el) => {
    gsap.from(el, { opacity: 0, y: 50, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });

  /* ---------- Timeline items ---------- */
  gsap.utils.toArray('.timeline-item').forEach((el, i) => {
    gsap.from(el, {
      opacity: 0,
      x: -40,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  /* ---------- Contact form (front-end only demo submit) ---------- */
  const form = document.querySelector('#contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const success = document.querySelector('.form-success');
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.textContent = 'Sending...';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
        if (success) {
          success.classList.add('show');
          gsap.from(success, { opacity: 0, y: -10, duration: 0.5 });
        }
        form.reset();
      }, 900);
    });
  }

  /* ---------- Listings filter (front-end demo) ---------- */
  const filterBar = document.querySelector('.filter-bar');
  if (filterBar) {
    filterBar.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      filterBar.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.getAttribute('data-filter');
      const cards = document.querySelectorAll('.listing-card');
      let visible = 0;
      cards.forEach((card) => {
        const match = filter === 'all' || card.getAttribute('data-status') === filter;
        if (match) visible++;
        gsap.to(card, {
          opacity: match ? 1 : 0,
          scale: match ? 1 : 0.92,
          duration: 0.4,
          ease: 'power2.out',
          onStart: () => { if (match) card.style.display = ''; },
          onComplete: () => { if (!match) card.style.display = 'none'; }
        });
      });
      const countEl = document.querySelector('.results-count strong');
      if (countEl) countEl.textContent = visible;
    });
  }
})();
