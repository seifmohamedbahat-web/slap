import Link from "next/link";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import {
  Search,
  ShieldCheck,
  Sparkles,
  CalendarClock,
  LayoutDashboard,
  Rocket,
  ArrowRight,
} from "lucide-react";

const pipeline = [
  { icon: Search, title: "Discover", body: "Scan Google Maps, Facebook, Instagram, Yelp and more for local businesses." },
  { icon: ShieldCheck, title: "Verify", body: "Cross-check every lead — only businesses with zero website survive." },
  { icon: Sparkles, title: "Analyze", body: "AI studies reviews, services, and brand personality to build a profile." },
  { icon: Rocket, title: "Generate", body: "A premium custom website is built and deployed to a live preview." },
  { icon: CalendarClock, title: "Book", body: "Appointment-driven businesses get a full booking system, automatically." },
  { icon: LayoutDashboard, title: "Manage", body: "Every business gets an admin dashboard tailored to their industry." },
];

const stats = [
  { label: "Businesses without a website", value: "40M+" },
  { label: "Avg. generation time", value: "<3 min" },
  { label: "Verified before outreach", value: "100%" },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pt-24 pb-28 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(225,6,0,0.14),transparent_60%)]"
          />
          <p className="mx-auto mb-6 w-fit rounded-full border border-avexa-border bg-avexa-card px-4 py-1.5 text-xs font-medium text-avexa-fg-muted">
            Autonomous AI Web Agency
          </p>
          <h1 className="mx-auto max-w-4xl text-balance text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
            We find businesses with{" "}
            <span className="text-avexa-accent">no website</span> — and build them one.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-avexa-fg-muted">
            AVEXA discovers, verifies, and builds premium websites, booking systems, and
            admin dashboards for businesses that don&apos;t have a web presence yet —
            fully automated, human-approved before anything goes out.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="group flex items-center gap-2 rounded-full bg-avexa-accent px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-avexa-accent-hover"
            >
              Open Agency Dashboard
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/services"
              className="rounded-full border border-avexa-border px-7 py-3.5 text-sm font-semibold text-avexa-fg transition hover:border-avexa-fg-muted"
            >
              See What We Build
            </Link>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y border-avexa-border bg-avexa-bg-secondary">
          <div className="mx-auto grid max-w-5xl grid-cols-1 divide-y divide-avexa-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {stats.map((s) => (
              <div key={s.label} className="px-6 py-10 text-center">
                <div className="text-4xl font-extrabold text-avexa-accent">{s.value}</div>
                <div className="mt-2 text-sm text-avexa-fg-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Pipeline */}
        <section className="mx-auto max-w-6xl px-6 py-28">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              One fully autonomous pipeline
            </h2>
            <p className="mt-4 text-avexa-fg-muted">
              From discovery to a live preview in your inbox — every step is automated,
              logged, and reviewable before a message ever goes out.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pipeline.map((step, i) => (
              <div
                key={step.title}
                className="group rounded-2xl border border-avexa-border bg-avexa-card p-6 transition hover:border-avexa-accent/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-avexa-accent/10 text-avexa-accent">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-mono text-avexa-fg-muted">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-avexa-fg-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-4xl px-6 pb-28 text-center">
          <div className="rounded-3xl border border-avexa-border bg-avexa-card px-8 py-16">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Never sell to a business twice.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-avexa-fg-muted">
              Every AVEXA lead is verified to have zero website before it ever reaches
              your pipeline — so every pitch starts with something they can actually see.
            </p>
            <Link
              href="/dashboard"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-avexa-accent px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-avexa-accent-hover"
            >
              Open Agency Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
