import Icon from "@/components/Icon";
import Reveal from "@/components/Reveal";
import SectionHeader from "./SectionHeader";
import type { Service } from "@/lib/db";

export default function Services({ services }: { services: Service[] }) {
  return (
    <section id="services" className="bg-mist py-20 sm:py-28" aria-label="Services">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHeader
          eyebrow="What we do"
          title="Everything your business needs to win online"
          sub="One team for your entire digital presence — design, build, launch, and grow. Pick one service or bundle them for a complete liftoff."
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
            <Reveal key={service.id} delay={(i % 3) * 100}>
              <article className="group shadow-card hover:shadow-card-hover relative h-full overflow-hidden rounded-2xl border border-ink/5 bg-white p-8 transition-all duration-300 hover:-translate-y-1.5">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand to-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-brand-faint text-brand transition-colors duration-300 group-hover:bg-brand group-hover:text-white">
                  <Icon name={service.icon} size={24} />
                </div>
                <h3 className="font-display mt-6 text-lg font-semibold text-ink">{service.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{service.description}</p>
                {service.price && (
                  <p className="mt-5 inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent-dark">
                    {service.price}
                  </p>
                )}
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
