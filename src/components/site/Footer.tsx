import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import type { Service } from "@/lib/db";

const QUICK_LINKS = [
  { href: "/#home", label: "Home" },
  { href: "/#services", label: "Services" },
  { href: "/#portfolio", label: "Portfolio" },
  { href: "/#about", label: "About" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#book", label: "Book a Call" },
  { href: "/contact", label: "Contact" },
];

export default function Footer({
  settings,
  services,
}: {
  settings: Record<string, string>;
  services: Service[];
}) {
  const socials = [
    { icon: "facebook", href: settings.social_facebook, label: "Facebook" },
    { icon: "instagram", href: settings.social_instagram, label: "Instagram" },
    { icon: "twitter", href: settings.social_twitter, label: "X (Twitter)" },
    { icon: "linkedin", href: settings.social_linkedin, label: "LinkedIn" },
  ].filter((s) => s.href);

  return (
    <footer className="bg-ink text-white" aria-label="Footer">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:grid-cols-2 lg:grid-cols-[4fr_2fr_3fr_3fr] lg:px-8">
        <div>
          <Logo on="dark" tagline size={40} />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
            We put small and medium businesses into digital orbit — websites, brands, and apps that
            look professional and win customers.
          </p>
          {socials.length > 0 && (
            <ul className="mt-6 flex gap-3">
              {socials.map((s) => (
                <li key={s.icon}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:-translate-y-0.5 hover:border-brand hover:bg-brand hover:text-white"
                  >
                    <Icon name={s.icon} size={17} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <nav aria-label="Quick links">
          <h3 className="font-display text-sm font-semibold tracking-wider text-white/90 uppercase">Explore</h3>
          <ul className="mt-5 space-y-3">
            {QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-sm text-white/60 transition hover:text-accent">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Services">
          <h3 className="font-display text-sm font-semibold tracking-wider text-white/90 uppercase">Services</h3>
          <ul className="mt-5 space-y-3">
            {services.slice(0, 6).map((service) => (
              <li key={service.id}>
                <a href="#services" className="text-sm text-white/60 transition hover:text-accent">
                  {service.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h3 className="font-display text-sm font-semibold tracking-wider text-white/90 uppercase">Get in touch</h3>
          <ul className="mt-5 space-y-4 text-sm text-white/60">
            {settings.contact_email && (
              <li className="flex items-center gap-3">
                <Icon name="mail" size={16} className="shrink-0 text-accent" />
                <a href={`mailto:${settings.contact_email}`} className="transition hover:text-accent">
                  {settings.contact_email}
                </a>
              </li>
            )}
            {settings.phone && (
              <li className="flex items-center gap-3">
                <Icon name="phone" size={16} className="shrink-0 text-accent" />
                <a href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`} className="transition hover:text-accent">
                  {settings.phone}
                </a>
              </li>
            )}
            {settings.hours && (
              <li className="flex items-center gap-3">
                <Icon name="clock" size={16} className="shrink-0 text-accent" />
                {settings.hours}
              </li>
            )}
            {settings.address && (
              <li className="flex items-center gap-3">
                <Icon name="map-pin" size={16} className="shrink-0 text-accent" />
                {settings.address}
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-6 text-xs text-white/45 sm:flex-row lg:px-8">
          <p>
            © {new Date().getFullYear()} {settings.site_name || "DigitalOrbit"}. All rights reserved.
          </p>
          <p>Designed &amp; built in orbit 🛰️</p>
        </div>
      </div>
    </footer>
  );
}
