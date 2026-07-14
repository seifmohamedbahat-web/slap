# Fit Zone (FZ) Gym — Website

High-energy, conversion-focused website for **Fit Zone**, the 24/7 gym on Faisal St
(Talatini St), Giza, Egypt — [@fitzo.ne100](https://www.instagram.com/fitzo.ne100).
Brand: neon lime green (`#B6FF00`) on true black, tagline **"Welcome to ur zone."**

## Pages

| File | Page |
| --- | --- |
| `index.html` | Homepage — hero, stats, why FZ, services preview, gallery, coaches, plans, testimonials, map, CTA |
| `services.html` | Services — 8 detailed service blocks, access schedule, plan comparison |
| `about.html` | About — story, values, facility, full coach grid, milestones |
| `contact.html` | Contact — details, WhatsApp-routed form, full-width map, FAQ |
| `team.html` | The Team — full coach grid (linked from "Meet The Full Team") |

## Stack

Static HTML + CSS + vanilla JS. No build step — open `index.html` or serve the folder.

- `assets/css/style.css` — full design system (dark neon theme, mobile-first, RTL-friendly logical properties)
- `assets/js/animations.js` — GSAP + ScrollTrigger: reveals, counters, testimonial marquee, lightbox, mobile nav, contact-form → WhatsApp handoff, hero parallax, scroll progress bar, service info bubbles
- `assets/js/scene-hero.js` — Three.js hero scenes per page (bolt field / dumbbells / community sphere / map pin)
- `assets/vendor/` — gsap, ScrollTrigger, three.js (local, no CDN)
- `assets/fonts/` — self-hosted Archivo Black (headings) + Inter variable (body), latin subset

Conversion paths: floating WhatsApp button on every page, click-to-call phone links,
Google Maps embed + directions, and a contact form that opens a prefilled WhatsApp chat
(no backend required). SEO: per-page meta, semantic headings, `ExerciseGym` JSON-LD schema.

## Content still needed from the client (before launch)

- [ ] Real photos: exterior, gym floor, equipment zones, locker rooms, coaches, training action
      → the site currently uses free-license Unsplash gym photography (hotlinked
      `images.unsplash.com` URLs; no attribution required). Swap each `<img>` inside the
      `.ph.has-img` tiles for the gym's own photos before launch — if any image fails to
      load, the tile automatically falls back to its neon placeholder
- [ ] Coach names, certifications, specialties + photos → `about.html#coaches` and homepage coach cards
- [ ] Exact **ladies-only hours** (which 6-hour window) → currently shown as "call to confirm"
- [ ] Exact **recovery services** offered (massage / stretching / sauna…) → `services.html#recovery`
- [ ] **Membership pricing** per tier → plan cards (`index.html#plans-teaser`, `services.html#plans`)
- [ ] Whether structured **group classes** exist → add a weekly timetable to `services.html#schedule` if so
- [ ] **Online payment** link/provider → wire the "Pay / Join Online" CTAs to the real payment flow
- [ ] 3–5 real **member testimonials** (with permission) → replace sample quotes on the homepage
- [ ] Official FZ **logo files** → swap the inline bolt SVG in the nav/footer if desired
- [ ] Exact **Google Maps pin** for the business listing → tighten the map embed query
- [ ] Branch 2 details when available → branch tabs are already in place

## Bilingual (Arabic/RTL) readiness

English-first copy. The CSS uses logical properties (`inset-inline`, `padding-inline`, …)
in key components, so an Arabic version can be added later by duplicating pages with
`<html lang="ar" dir="rtl">` and translating copy.
