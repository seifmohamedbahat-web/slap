import Icon from "@/components/Icon";
import Reveal from "@/components/Reveal";
import SectionHeader from "./SectionHeader";
import type { Testimonial } from "@/lib/db";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Icon key={i} name="star" size={15} className={i < rating ? "text-amber-400" : "text-ink/15"} />
      ))}
    </div>
  );
}

export default function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <section id="testimonials" className="bg-white py-20 sm:py-28" aria-label="Client testimonials">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHeader
          eyebrow="Testimonials"
          title="Loved by the businesses we launch"
          sub="Real words from real clients — the kind of results we want to get you too."
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((t, i) => (
            <Reveal key={t.id} delay={(i % 4) * 100}>
              <figure className="shadow-card hover:shadow-card-hover flex h-full flex-col rounded-2xl border border-ink/5 bg-white p-6 transition-all duration-300 hover:-translate-y-1">
                <Stars rating={t.rating} />
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink-soft">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-ink/5 pt-4">
                  <span className="font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-accent text-sm font-bold text-white">
                    {t.author
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">{t.author}</span>
                    <span className="block text-xs text-ink-soft">
                      {[t.role, t.company].filter(Boolean).join(", ")}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
