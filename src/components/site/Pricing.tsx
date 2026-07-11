import Icon from "@/components/Icon";
import Reveal from "@/components/Reveal";
import SectionHeader from "./SectionHeader";
import type { PricingTier } from "@/lib/db";

function parseFeatures(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export default function Pricing({ tiers }: { tiers: PricingTier[] }) {
  return (
    <section id="pricing" className="bg-mist py-20 sm:py-28" aria-label="Pricing">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHeader
          eyebrow="Pricing"
          title="Simple plans, no surprise invoices"
          sub="Every project is quoted up front. Not sure which fits? Tell us your goals and we'll recommend one — the quote is free either way."
        />

        <div className="mx-auto mt-14 grid max-w-5xl items-stretch gap-7 lg:grid-cols-3">
          {tiers.map((tier, i) => {
            const highlighted = tier.highlighted === 1;
            return (
              <Reveal key={tier.id} delay={i * 100} className="h-full">
                <article
                  className={`relative flex h-full flex-col rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1.5 ${
                    highlighted
                      ? "bg-ink text-white shadow-2xl shadow-brand/30 ring-2 ring-brand"
                      : "shadow-card hover:shadow-card-hover border border-ink/5 bg-white text-ink"
                  }`}
                >
                  {highlighted && (
                    <p className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand to-accent px-4 py-1 text-[0.68rem] font-bold tracking-wider text-white uppercase">
                      Most popular
                    </p>
                  )}
                  <h3 className="font-display text-lg font-semibold">{tier.name}</h3>
                  <p className={`mt-1 text-sm ${highlighted ? "text-white/60" : "text-ink-soft"}`}>
                    {tier.tagline}
                  </p>
                  <p className="mt-6 flex items-baseline gap-2">
                    <span className="font-display text-4xl font-bold">{tier.price}</span>
                    {tier.period && (
                      <span className={`text-sm ${highlighted ? "text-white/55" : "text-ink-soft"}`}>
                        {tier.period}
                      </span>
                    )}
                  </p>
                  <ul className="mt-7 flex-1 space-y-3">
                    {parseFeatures(tier.features).map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm">
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                            highlighted ? "bg-accent/25 text-accent" : "bg-brand-faint text-brand"
                          }`}
                        >
                          <Icon name="check" size={12} />
                        </span>
                        <span className={highlighted ? "text-white/85" : "text-ink-soft"}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#contact"
                    className={`mt-8 w-full ${highlighted ? "btn-primary" : "btn-ghost"}`}
                  >
                    {tier.cta_label || "Get Started"}
                  </a>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
