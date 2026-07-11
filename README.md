# AVEXA — Autonomous AI Web Agency

AVEXA finds businesses that don't have a website, verifies that with independent
checks, then generates a premium website, an optional booking system, and an
optional admin dashboard for them — all tracked in a CRM with agency analytics
and a human-approval gate before any outreach goes out.

This is a working prototype of the full pipeline described in the project spec,
scoped to run end-to-end without requiring paid API keys or third-party lead-gen
services, while being structured so real integrations (Claude, Resend,
Postgres/Supabase) drop in cleanly.

## What's real vs. what needs a key

| Piece | Without any keys | With a key |
|---|---|---|
| Lead discovery | **Always real, no key needed** — AVEXA's own scraper (`lib/integrations/scraper.ts`) searches Google Maps, Facebook, Instagram, LinkedIn, and Yelp listings via DuckDuckGo's HTML search endpoint. Falls back to a small curated sample only if that search host is unreachable from wherever this is running. | — |
| No-website verification | **Always real** — every candidate also gets a live HTTP probe of `name.com` / `.net` / `.co` before being accepted, independent of how it was discovered | same |
| Business analysis / lead scoring / outreach copy | Deterministic heuristics + templates | `ANTHROPIC_API_KEY` → Claude generates the profile, score reasoning, and outreach copy |
| Outreach sending | Simulated send (message still moves DRAFT → APPROVED → SENT in the CRM) | `RESEND_API_KEY` → actually delivers the email |
| Database | SQLite (`dev.db`) via a Prisma driver adapter | Point `DATABASE_URL` at Postgres (e.g. Supabase) — schema is Postgres-compatible, no code changes needed |
| Website / booking / dashboard generation | **Always real** — see below | — |

Website, booking, and admin dashboard "generation" isn't mocked: each lead gets
real generated content (page copy, services, availability, dashboard sections)
based on its business data, stored in the DB, and rendered live at
`/preview/[slug]`, `/preview/[slug]/booking`, and `/preview/[slug]/admin`. There's
no external deployment step (no Vercel/GitHub project-per-lead) — previews are
served from this app itself, which is the practical stand-in for "live preview"
without provisioning per-lead infrastructure.

Outreach is never auto-sent: every message sits in `DRAFT` until a human clicks
Approve, and only an `APPROVED` message can be Sent — matching the spec's
"wait for manual approval" requirement.

## Architecture

```
app/
  page.tsx, services/, pricing/, contact/     Public AVEXA marketing site
  dashboard/                                  Internal agency CRM + analytics
    page.tsx                                  Overview: KPIs, top industries, activity feed
    leads/, leads/[id]/                       Lead list + detail workspace (actions, score, outreach)
    discover/                                 Trigger a discovery pass
    activity/                                 Full audit log
  preview/[slug]/                             Generated business website (+ /booking, /admin)
  api/                                        Route handlers wrapping the pipeline (for the action buttons)
lib/
  pipeline/        discover, verifyNoWebsite, analyzeBusiness, qualify,
                   generateWebsite, generateBooking, generateDashboard, outreach
  integrations/    scraper.ts (self-built lead discovery, no third-party
                   lead-gen API), sampleLeads.ts (offline fallback),
                   anthropic.ts, resend.ts — real clients with template
                   fallbacks when a key isn't configured
  db/client.ts     Prisma client (SQLite adapter for dev)
prisma/schema.prisma  CRM data model: Lead, BusinessProfile, LeadScore,
                      WebsiteProject, BookingSystem, AdminDashboardProject,
                      OutreachMessage, Appointment, ActivityEvent
prisma/seed.ts        Runs the full pipeline against the sample data to populate a demo CRM
```

Every pipeline stage writes an `ActivityEvent`, which powers the live activity
feed and gives an audit trail of exactly what the AI did and why (see
`reasoning` on `LeadScore` and `summary` on `BusinessProfile`).

### Lead discovery

`lib/integrations/scraper.ts` is AVEXA's own discovery tool — it queries
DuckDuckGo's no-JS HTML search endpoint (a static results page, no API key or
account) for `site:google.com/maps`, `site:facebook.com`, `site:instagram.com`,
`site:linkedin.com/company`, and `site:yelp.com/biz` listings matching an
industry + location keyword (run in parallel, deduped by business name), and
parses candidate business names out of the result titles. It never calls a
paid lead-gen API. If that search host is unreachable, `lib/pipeline/discover.ts`
falls back to `lib/integrations/sampleLeads.ts`, a small curated sample, so the
rest of the pipeline stays demoable — the discovery API response includes
`usedFallback` so the UI can say so.

### No-website verification

A candidate is only ever saved as a lead if **two independent checks** both
agree there's no website: the scraper found no site of its own in the search
results, *and* a live HEAD request to the most likely domain guesses
(`businessname.com/.net/.co`) gets no response. Anything that fails either
check is rejected and logged, never stored as a lead — see
`lib/pipeline/verifyNoWebsite.ts`.

## Setup

```bash
npm install
cp .env.example .env
npm run db:migrate   # creates dev.db from the schema
npm run db:seed       # runs the full pipeline against sample businesses
npm run dev
```

Then open:
- `/` — the AVEXA marketing site
- `/dashboard` — the agency CRM and analytics
- `/dashboard/leads/[id]` — a seeded lead with score, profile, and outreach draft
- `/preview/[slug]` — that lead's generated website (e.g. `/preview/bright-smile-family-dental-dallas`)

Lead discovery works out of the box — no key required. To use Claude for
analysis/scoring/outreach copy and to actually deliver outreach emails, fill in
`ANTHROPIC_API_KEY` and/or `RESEND_API_KEY` in `.env` — no code changes needed.

> **Note on sandboxed/locked-down networks:** the scraper needs outbound HTTPS
> to `html.duckduckgo.com`. Some sandboxes/CI runners restrict egress to an
> allowlist that doesn't include general web hosts — there, discovery will log
> `usedFallback: true` and use the local sample every time. This is a network
> policy limitation of that environment, not a bug; it works normally on a
> regular machine, CI runner, or hosting platform (e.g. Vercel).

## Brand

Black `#000000` background, white `#FFFFFF` text, red `#E10600` accent (CTAs,
active nav, the "X" in the logo, charts, highlights) — defined as CSS custom
properties in `app/globals.css` and consumed as Tailwind utilities (`bg-avexa-*`,
`text-avexa-*`).

## Not in this build

Live per-lead deployment to Vercel/GitHub, Yellow Pages/Apple Maps/Bing Places
scraping (Google Maps, Facebook, Instagram, LinkedIn, and Yelp are the five
wired discovery sources), SMS/DM sending, Supabase Auth and role-based access
control, and n8n workflow orchestration are out of scope for this pass. The
pipeline and data model are structured so each can be added without
restructuring what's here — e.g. add another entry to the `SITES` array in
`lib/integrations/scraper.ts` for another directory, or add a deploy step
after `generateWebsite`.
