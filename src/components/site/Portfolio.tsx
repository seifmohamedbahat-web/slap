import Icon from "@/components/Icon";
import Reveal from "@/components/Reveal";
import SectionHeader from "./SectionHeader";
import type { PortfolioItem } from "@/lib/db";

export default function Portfolio({ items }: { items: PortfolioItem[] }) {
  return (
    <section id="portfolio" className="bg-mist py-20 sm:py-28" aria-label="Our work">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHeader
          eyebrow="Our work"
          title="Recent launches from mission control"
          sub="A few of the businesses we've helped get off the ground — websites, brands, stores, and apps."
        />

        <div className="mt-14 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <Reveal key={item.id} delay={(i % 3) * 100}>
              <article className="group shadow-card hover:shadow-card-hover overflow-hidden rounded-2xl border border-ink/5 bg-white transition-all duration-300 hover:-translate-y-1.5">
                <div className="relative aspect-[16/10] overflow-hidden bg-brand-faint">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={`${item.title} — ${item.category} project by DigitalOrbit`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="p-6">
                  <p className="inline-flex rounded-full bg-brand-faint px-3 py-1 text-[0.68rem] font-bold tracking-wide text-brand uppercase">
                    {item.category}
                  </p>
                  <h3 className="font-display mt-3 text-lg font-semibold text-ink">
                    {item.link && item.link !== "#" ? (
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="transition hover:text-brand">
                        {item.title}
                      </a>
                    ) : (
                      item.title
                    )}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand opacity-0 transition-all duration-300 group-hover:opacity-100">
                    View project <Icon name="arrow-right" size={14} />
                  </span>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
