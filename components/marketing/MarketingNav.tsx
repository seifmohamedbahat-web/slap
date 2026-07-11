import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

const links = [
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-avexa-border bg-avexa-bg/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo />
        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-avexa-fg-muted transition hover:text-avexa-fg"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <Link
          href="/dashboard"
          className="rounded-full bg-avexa-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-avexa-accent-hover"
        >
          Agency Login
        </Link>
      </nav>
    </header>
  );
}
