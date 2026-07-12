# Static previews

Self-contained HTML snapshots of the DigitalOrbit site and admin panel —
open either file in any browser (no server needed, fonts/images embedded)
or send the file to someone to show them the design.

| File | What it shows |
|---|---|
| `website-preview.html` | The full public site, including the booking section. Scroll animations, navbar, mobile menu, and the slot picker work; submitting a form shows a note instead of saving. |
| `admin-panel-preview.html` | All admin screens with demo data: dashboard analytics, leads, bookings, customers, portfolio/services/pricing/testimonials managers, settings. Sign In enters the preview; buttons show a "static preview" toast. |

These are **snapshots, not the app**. They are generated from a running
instance and go stale when the site changes — the live, fully-connected
experience (forms saving to the database, admin editing content) is the
Next.js app itself: `npm install && npm run dev`, admin at `/admin`
(see the root README for credentials).
