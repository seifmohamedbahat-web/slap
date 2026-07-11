import Icon from "@/components/Icon";
import Reveal from "@/components/Reveal";
import ContactForm from "./ContactForm";

export default function ContactSection({
  serviceOptions,
  settings,
}: {
  serviceOptions: string[];
  settings: Record<string, string>;
}) {
  const infoItems = [
    { icon: "mail", label: "Email us", value: settings.contact_email, href: `mailto:${settings.contact_email}` },
    { icon: "phone", label: "Call us", value: settings.phone, href: `tel:${(settings.phone || "").replace(/[^+\d]/g, "")}` },
    { icon: "clock", label: "Business hours", value: settings.hours },
    { icon: "map-pin", label: "Location", value: settings.address },
  ].filter((item) => item.value);

  return (
    <section id="contact" className="bg-mist pb-20 sm:pb-28" aria-label="Contact">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[5fr_7fr] lg:gap-16 lg:px-8">
        <Reveal>
          <p className="text-xs font-bold tracking-[0.22em] text-brand uppercase">Contact</p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Let&apos;s talk about your project
          </h2>
          <p className="mt-4 leading-relaxed text-ink-soft">
            Fill in the form and we&apos;ll get back to you within one business day with ideas,
            honest advice, and a free quote. Prefer email or a call? That works too.
          </p>

          <ul className="mt-9 space-y-5">
            {infoItems.map((item) => (
              <li key={item.label} className="flex items-center gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand shadow-sm">
                  <Icon name={item.icon} size={19} />
                </span>
                <span>
                  <span className="block text-xs font-semibold tracking-wide text-ink-soft uppercase">
                    {item.label}
                  </span>
                  {item.href ? (
                    <a href={item.href} className="text-sm font-semibold text-ink transition hover:text-brand">
                      {item.value}
                    </a>
                  ) : (
                    <span className="text-sm font-semibold text-ink">{item.value}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={150}>
          <ContactForm serviceOptions={serviceOptions} />
        </Reveal>
      </div>
    </section>
  );
}
