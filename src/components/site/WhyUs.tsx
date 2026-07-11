import Icon from "@/components/Icon";
import Reveal from "@/components/Reveal";

const VALUES = [
  {
    icon: "zap",
    title: "Fast delivery",
    text: "Most websites launch in 2–4 weeks. Clear timelines, weekly updates, zero ghosting.",
  },
  {
    icon: "sparkles",
    title: "Modern design",
    text: "Custom designs that follow today's standards — not recycled templates from 2015.",
  },
  {
    icon: "tag",
    title: "Honest pricing",
    text: "Agency quality at small-business prices. Fixed quotes up front, no surprise invoices.",
  },
  {
    icon: "headphones",
    title: "Ongoing support",
    text: "We stick around after launch — updates, fixes, and advice whenever you need us.",
  },
];

export default function WhyUs() {
  return (
    <section id="about" className="relative overflow-hidden bg-white py-20 sm:py-28" aria-label="About DigitalOrbit">
      {/* decorative orbit ring */}
      <div
        className="pointer-events-none absolute -top-40 -right-48 h-[480px] w-[480px] rounded-full border border-brand/10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-24 -right-32 h-[300px] w-[300px] rounded-full border border-accent/15"
        aria-hidden="true"
      />

      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-2 lg:gap-20 lg:px-8">
        <Reveal>
          <p className="text-xs font-bold tracking-[0.22em] text-brand uppercase">Why DigitalOrbit</p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            A digital partner that treats your business like its own
          </h2>
          <p className="mt-5 leading-relaxed text-ink-soft">
            DigitalOrbit is a tight-knit team of designers, developers, and marketers who help small
            and medium businesses look professional online — and get real results from it. No
            bloated agency process, no jargon, no enterprise price tag. Just sharp work, delivered
            fast, by people who answer your messages.
          </p>
          <ul className="mt-7 space-y-3">
            {[
              "Direct line to the people doing the work",
              "You own everything we build — code, design, accounts",
              "Results measured in leads and sales, not buzzwords",
            ].map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm font-medium text-ink">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-dark">
                  <Icon name="check" size={12} />
                </span>
                {point}
              </li>
            ))}
          </ul>
          <a href="#contact" className="btn-primary mt-9">
            Work With Us
            <Icon name="arrow-right" size={16} />
          </a>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2">
          {VALUES.map((value, i) => (
            <Reveal key={value.title} delay={i * 100}>
              <div className="shadow-card hover:shadow-card-hover h-full rounded-2xl border border-ink/5 bg-white p-6 transition-all duration-300 hover:-translate-y-1">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-accent text-white">
                  <Icon name={value.icon} size={20} />
                </div>
                <h3 className="font-display mt-4 font-semibold text-ink">{value.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{value.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
