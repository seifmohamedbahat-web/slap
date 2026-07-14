import type { Metadata } from "next";
import Navbar from "@/components/site/Navbar";
import ContactSection from "@/components/site/ContactSection";
import Footer from "@/components/site/Footer";
import PageViewTracker from "@/components/site/PageViewTracker";
import Reveal from "@/components/Reveal";
import Icon from "@/components/Icon";
import { getPublishedServices, getSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Start Your Project",
  description:
    "Tell DigitalOrbit about your project and get a free quote within one business day — websites, branding, SEO, marketing, and apps.",
};

export default function ContactPage() {
  const services = getPublishedServices();
  const settings = getSettings();

  return (
    <>
      <PageViewTracker />
      <Navbar />
      <main>
        {/* dark page header (keeps the transparent navbar legible) */}
        <section className="relative overflow-hidden bg-ink pt-[72px] text-white">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand/25 blur-[130px]" />
            <div className="absolute -bottom-24 right-[8%] h-[240px] w-[240px] rounded-full bg-accent/15 blur-[90px]" />
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full border border-white/8" />
            <div className="absolute top-[30%] left-[12%] h-1.5 w-1.5 rounded-full bg-accent/80" />
            <div className="absolute top-[55%] right-[28%] h-1 w-1 rounded-full bg-white/50" />
          </div>
          <div className="relative mx-auto max-w-7xl px-5 pt-14 pb-16 lg:px-8 lg:pt-20 lg:pb-20">
            <Reveal>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-wide text-white/85">
                <Icon name="rocket" size={14} className="text-accent" />
                Start your project
              </p>
              <h1 className="font-display mt-5 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
                Let&apos;s build something <span className="text-gradient">great together</span>.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">
                Tell us what you have in mind and we&apos;ll reply within one business day with a
                free quote and honest advice — no pressure, no jargon.
              </p>
            </Reveal>
          </div>
          <svg
            className="relative block w-full text-mist"
            viewBox="0 0 1440 64"
            fill="currentColor"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M0 64h1440V22C1200 2 960 0 720 12S240 44 0 22v42z" />
          </svg>
        </section>

        <div className="bg-mist pt-14 sm:pt-16">
          <ContactSection serviceOptions={services.map((s) => s.title)} settings={settings} />
        </div>
      </main>
      <Footer settings={settings} services={services} />
    </>
  );
}
