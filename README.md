# DigitalOrbit — Websites & Digital Services

Full-stack site for the DigitalOrbit agency: a public marketing site plus a
password-protected admin panel that manages all site content through a SQLite
database — no code edits needed to change services, portfolio, pricing,
testimonials, or contact info.

Built with **Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · SQLite
(better-sqlite3)**.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

For production:

```bash
npm run build
npm start
```

The database (`data/digitalorbit.db`) is created and seeded automatically on
first run — services, portfolio, pricing, testimonials, settings, and one
admin account.

## Admin panel

- URL: **`/admin`** (all admin routes are protected by middleware; you're
  redirected to `/admin/login` when signed out)
- Default credentials (change these!):
  - Email: `admin@digitalorbit.agency`
  - Password: `orbit2026`

Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` **before the first run** to seed a
different account, and set `SESSION_SECRET` in production (see
`.env.example`). Sessions are signed JWTs in an httpOnly cookie (7 days).
The users table already carries a `role` column (`admin`) so an Editor role
can be added later without a migration.

### What the panel manages

| Section | What it does |
|---|---|
| Dashboard | New-inquiry / booking / customer counts, 14-day page-view chart, next appointments, recent leads |
| Leads & Inquiries | Contact form submissions with status tags (New / Contacted / Closed), mark read, archive, delete |
| Bookings | Appointments from the “Book a free call” form — date/time, contact info, notes, status (Pending / Confirmed / Completed / Cancelled); double-booked slots are rejected |
| Customers | Auto-built directory of everyone who inquired or booked (one row per email, with counts and last activity) |
| Portfolio | Add / edit / delete / reorder projects; image by URL or file upload |
| Services | Add / edit / delete / reorder services (title, icon, description, price) |
| Pricing | Edit plan names, prices, feature lists, highlighted plan; add/remove plans |
| Testimonials | Add / edit / delete quotes with star ratings |
| Settings | Contact email, phone, hours, address, social links, site name/tagline |

Public pages render fresh from the database on every request
(`force-dynamic`), so admin changes go live immediately.

## Contact form & booking email

Contact submissions are stored as leads and appointments as bookings —
both are always saved even if email fails. `src/lib/email.ts` is a
placeholder notifier that logs to the server console — swap its body for
Resend, SendGrid, or nodemailer when you're ready to send real email.

## Project layout

```
src/
  app/
    page.tsx              # public one-page site (all sections)
    api/contact/route.ts  # contact form endpoint → leads table + email stub
    api/pageview/route.ts # page-view counter for the dashboard
    admin/
      login/              # public login page
      (panel)/            # protected: dashboard, leads, portfolio, services,
                          #   pricing, testimonials, settings
      actions.ts          # all admin server actions (auth + CRUD)
  components/             # site sections, admin UI, logo, icons, reveal
  lib/db.ts               # SQLite schema, seed data, typed queries
  lib/auth.ts             # JWT session cookies, requireAdmin guard
  middleware.ts           # locks down /admin/* and /api/admin/*
data/                     # SQLite file (gitignored, auto-created)
public/portfolio/         # placeholder project mockups (SVG)
public/uploads/           # images uploaded from the admin panel
```
