/* Fit Zone (FZ) — GSAP interactions & scroll animations */
(function () {
  gsap.registerPlugin(ScrollTrigger);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header scroll state + progress bar ---------- */
  const header = document.querySelector('.site-header');
  const progress = document.querySelector('.scroll-progress');
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 40);
    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile nav ---------- */
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      navToggle.classList.toggle('active', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    navLinks.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
      })
    );
  }

  /* Split headline words into spans for stagger — must run before the hero
     timeline below, which animates the resulting .word spans. */
  document.querySelectorAll('[data-split-words]').forEach((el) => {
    const nodes = Array.from(el.childNodes);
    el.innerHTML = '';
    nodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.trim().split(/\s+/).filter(Boolean).forEach((w) => {
          const span = document.createElement('span');
          span.className = 'word';
          span.style.display = 'inline-block';
          span.textContent = w;
          el.appendChild(span);
          el.appendChild(document.createTextNode(' '));
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        node.classList.add('word');
        node.style.display = 'inline-block';
        el.appendChild(node);
        el.appendChild(document.createTextNode(' '));
      } else if (node.nodeName === 'BR') {
        el.appendChild(node);
      }
    });
  });

  /* ---------- Hero entrance timeline ---------- */
  const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  if (document.querySelector('.hero-eyebrow')) {
    heroTl
      .from('.hero-eyebrow', { opacity: 0, y: 18, duration: 0.7 })
      .from('.hero-title .word', { opacity: 0, y: 52, stagger: 0.06, duration: 0.9 }, '-=0.4')
      .from('.hero-lede', { opacity: 0, y: 24, duration: 0.8 }, '-=0.5')
      .from('.hero-actions > *', { opacity: 0, y: 20, stagger: 0.08, duration: 0.6 }, '-=0.4')
      .from('.hero-badges > *', { opacity: 0, y: 20, stagger: 0.08, duration: 0.6 }, '-=0.35');
    if (document.querySelector('.hero-strip-card')) {
      heroTl.from('.hero-strip-card', { opacity: 0, y: 30, duration: 0.7 }, '-=0.3');
    }
  }

  /* Hero parallax: content drifts and fades as you scroll away */
  if (document.querySelector('.hero .hero-content') && !reducedMotion) {
    gsap.to('.hero .hero-content', {
      yPercent: 16, opacity: 0.3, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  /* Sub-page hero entrance */
  const pageHero = document.querySelector('.page-hero');
  if (pageHero) {
    gsap.from(pageHero.querySelectorAll('.breadcrumb, h1, .lede, .hero-actions'), {
      opacity: 0, y: 30, stagger: 0.1, duration: 0.85, ease: 'power3.out'
    });
  }

  /* ---------- Generic scroll reveals ---------- */
  gsap.utils.toArray('.reveal').forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 1, ease: 'power3.out',
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
    gsap.from(group.children, {
      opacity: 0, y: 40, duration: 0.9, stagger: 0.12, ease: 'power3.out',
      scrollTrigger: { trigger: group, start: 'top 84%' }
    });
  });

  /* Section headers */
  gsap.utils.toArray('.section-head').forEach((el) => {
    gsap.from(el.children, {
      opacity: 0, y: 30, duration: 0.9, stagger: 0.1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });

  /* Alternating service blocks slide from their image side */
  gsap.utils.toArray('.service-block').forEach((block) => {
    const media = block.querySelector('.service-media');
    const copy = block.querySelector('.service-copy');
    const flip = block.classList.contains('flip');
    if (media) {
      gsap.from(media, {
        opacity: 0, x: flip ? 60 : -60, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: block, start: 'top 80%' }
      });
    }
    if (copy) {
      gsap.from(copy.children, {
        opacity: 0, y: 30, stagger: 0.08, duration: 0.85, ease: 'power3.out',
        scrollTrigger: { trigger: block, start: 'top 80%' }
      });
    }
  });

  /* ---------- Animated counters ---------- */
  gsap.utils.toArray('[data-counter]').forEach((el) => {
    const target = parseFloat(el.getAttribute('data-counter'));
    const suffix = el.getAttribute('data-suffix') || '';
    const prefix = el.getAttribute('data-prefix') || '';
    const useComma = el.hasAttribute('data-comma');
    const obj = { val: 0 };
    const fmt = (v) => {
      const n = Math.round(v);
      return prefix + (useComma ? n.toLocaleString('en-US') : String(n)) + suffix;
    };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        gsap.to(obj, {
          val: target, duration: 1.8, ease: 'power2.out',
          onUpdate: () => { el.textContent = fmt(obj.val); }
        });
      }
    });
  });

  /* ---------- Card hover tilt (coaches / services) ---------- */
  if (window.matchMedia('(hover: hover)').matches && !reducedMotion) {
    document.querySelectorAll('.tilt').forEach((card) => {
      const maxTilt = 6;
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        gsap.to(card, {
          rotateX: -py * maxTilt, rotateY: px * maxTilt,
          duration: 0.5, ease: 'power2.out', transformPerspective: 900
        });
      });
      card.addEventListener('mouseleave', () => {
        gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.6, ease: 'power3.out' });
      });
    });
  }

  /* ---------- Testimonials marquee (auto scroll + pause on hover) ---------- */
  const track = document.querySelector('.reviews-track');
  if (track && !reducedMotion) {
    const half = track.scrollWidth / 2; // cards are duplicated for a seamless loop
    const tween = gsap.to(track, {
      x: -half,
      duration: Math.max(22, half / 55),
      ease: 'none',
      repeat: -1
    });
    track.addEventListener('mouseenter', () => tween.pause());
    track.addEventListener('mouseleave', () => tween.resume());
  }

  /* ---------- CTA banner reveal ---------- */
  gsap.utils.toArray('.cta-banner .container > *').forEach((el, i) => {
    gsap.from(el, {
      opacity: 0, y: 34, duration: 0.9, delay: i * 0.06, ease: 'power3.out',
      scrollTrigger: { trigger: el.closest('.cta-banner'), start: 'top 82%' }
    });
  });

  /* ---------- Timeline items ---------- */
  gsap.utils.toArray('.timeline-item').forEach((el) => {
    gsap.from(el, {
      opacity: 0, x: -40, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  /* ---------- Gallery lightbox ---------- */
  const lightbox = document.querySelector('.lightbox');
  if (lightbox) {
    const inner = lightbox.querySelector('.lightbox-inner');
    const closeBtn = lightbox.querySelector('.lightbox-close');
    function openLightbox(tile) {
      inner.innerHTML = '';
      const clone = tile.cloneNode(true);
      clone.classList.remove('tile');
      inner.appendChild(clone);
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }
    function closeLightbox() {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
    }
    document.querySelectorAll('.gallery-grid .tile').forEach((tile) => {
      tile.addEventListener('click', () => openLightbox(tile));
      tile.setAttribute('tabindex', '0');
      tile.setAttribute('role', 'button');
      tile.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(tile); }
      });
    });
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
    closeBtn.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
  }

  /* ---------- Info bubbles (service pop-ups) ----------
     Links with [data-bubble] open the matching <template> in a modal
     bubble instead of navigating. The href stays as a no-JS fallback. */
  const bubbleOverlay = document.querySelector('.bubble-overlay');
  if (bubbleOverlay) {
    const slot = bubbleOverlay.querySelector('.bubble-body');
    const bubbleClose = bubbleOverlay.querySelector('.bubble-close');
    function closeBubble() {
      bubbleOverlay.classList.remove('open');
      document.body.style.overflow = '';
    }
    document.querySelectorAll('[data-bubble]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const tpl = document.querySelector('template[data-bubble-content="' + link.getAttribute('data-bubble') + '"]');
        if (!tpl) return;
        e.preventDefault();
        slot.innerHTML = '';
        slot.appendChild(tpl.content.cloneNode(true));
        bubbleOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        bubbleClose.focus();
      });
    });
    bubbleOverlay.addEventListener('click', (e) => { if (e.target === bubbleOverlay) closeBubble(); });
    bubbleClose.addEventListener('click', closeBubble);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeBubble(); });
  }

  /* ---------- Contact form → WhatsApp handoff ----------
     No backend needed: the enquiry is composed into a prefilled
     WhatsApp message to the gym's number (primary conversion path). */
  const form = document.querySelector('#contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const lines = [
        'Hi Fit Zone! New enquiry from the website:',
        '— Name: ' + (data.get('name') || '-'),
        '— Phone: ' + (data.get('phone') || '-'),
        data.get('email') ? '— Email: ' + data.get('email') : '',
        '— Interested in: ' + (data.get('interest') || '-'),
        data.get('message') ? '— Message: ' + data.get('message') : ''
      ].filter(Boolean);
      const url = 'https://wa.me/201154251716?text=' + encodeURIComponent(lines.join('\n'));
      window.open(url, '_blank', 'noopener');
      const success = document.querySelector('.form-success');
      if (success) success.classList.add('show');
      form.reset();
    });
  }

  /* ---------- Footer year ---------- */
  const yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
