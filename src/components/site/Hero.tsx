import Icon from "@/components/Icon";
import Reveal from "@/components/Reveal";
import OrbitGraphic from "./OrbitGraphic";

export default function Hero() {
  return (
    <section id="home" className="relative overflow-hidden bg-ink pt-[72px] text-white">
      {/* starfield / glow backdrop */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-brand/25 blur-[140px]" />
        <div className="absolute -bottom-32 -left-24 h-[380px] w-[380px] rounded-full bg-accent/15 blur-[120px]" />
        <div className="absolute top-[22%] left-[8%] h-1 w-1 rounded-full bg-white/70" />
        <div className="absolute top-[12%] right-[22%] h-1.5 w-1.5 rounded-full bg-accent/80" />
        <div className="absolute top-[58%] left-[30%] h-1 w-1 rounded-full bg-white/50" />
        <div className="absolute right-[8%] bottom-[24%] h-1 w-1 rounded-full bg-brand-light/80" />
        <div className="absolute top-[38%] right-[42%] h-1 w-1 rounded-full bg-white/40" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pt-16 pb-20 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:pt-24 lg:pb-28">
        <div className="max-w-xl">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-wide text-white/85">
              <Icon name="rocket" size={14} className="text-accent" />
              Your business, in orbit
            </p>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="font-display mt-6 text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Launch your business into the <span className="text-gradient">digital space</span>.
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-6 text-lg leading-relaxed text-white/70">
              We design websites, brands, and apps that make small businesses look big — and turn
              visitors into customers. Professional online presence, without enterprise pricing.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a href="#contact" className="btn-primary">
                Get a Free Quote
                <Icon name="arrow-right" size={16} />
              </a>
              <a href="#book" className="btn-dark-ghost">
                <Icon name="calendar" size={16} />
                Book a Free Call
              </a>
            </div>
          </Reveal>
          <Reveal delay={400}>
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-white/10 pt-8">
              {[
                ["120+", "Projects launched"],
                ["98%", "Happy clients"],
                ["6 yrs", "Building online"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="sr-only">{label}</dt>
                  <dd className="font-display text-2xl font-bold text-white">{value}</dd>
                  <dd className="mt-1 text-xs text-white/55">{label}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <Reveal delay={200} className="hidden sm:block">
          <OrbitGraphic />
        </Reveal>
      </div>

      {/* curve into the light section */}
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
  );
}
