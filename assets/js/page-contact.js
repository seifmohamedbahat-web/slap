import { bootShared, splitHero, REDUCED_MOTION } from './core.js';
import { initParticleField } from './scene-contact.js';

bootShared();
splitHero('[data-split-hero]');
initParticleField(document.getElementById('contact-canvas'));

const form = document.getElementById('contact-form');
const statusBox = document.getElementById('form-status');
const statusText = document.getElementById('form-status-text');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const subject = `New inquiry from ${data.fname} ${data.lname} — ${data.interest}`;
  const body = [
    `Name: ${data.fname} ${data.lname}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone || '—'}`,
    `Interested in: ${data.interest}`,
    '',
    'Message:',
    data.message || '(no message provided)',
  ].join('\n');
  const mailto = `mailto:hello@keepsitrealestate.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  statusBox.classList.add('show');
  statusText.textContent = 'Opening your email client with your message pre-filled…';
  if (!REDUCED_MOTION) gsap.from(statusBox, { opacity: 0, y: -10, duration: 0.4, ease: 'power2.out' });
  window.location.href = mailto;
});
