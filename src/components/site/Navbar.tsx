"use client";

import { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import Icon from "@/components/Icon";

const LINKS = [
  { href: "#home", label: "Home" },
  { href: "#services", label: "Services" },
  { href: "#portfolio", label: "Portfolio" },
  { href: "#about", label: "About" },
  { href: "#pricing", label: "Pricing" },
  { href: "#contact", label: "Contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Over the dark hero the bar is transparent, so text must be light until
  // the white scrolled/open background appears.
  const solid = scrolled || open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        solid ? "border-b border-ink/5 bg-white/85 shadow-sm backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8" aria-label="Main">
        <Logo size={38} on={solid ? "light" : "dark"} />

        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  solid
                    ? "text-ink-soft hover:bg-brand-faint hover:text-brand"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <a href="#contact" className="btn-primary hidden !px-5 !py-2.5 sm:inline-flex">
            Get a Free Quote
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border lg:hidden ${
              solid ? "border-ink/10 text-ink" : "border-white/25 text-white"
            }`}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            <Icon name={open ? "x" : "menu"} size={20} />
          </button>
        </div>
      </nav>

      {/* mobile menu */}
      <div
        className={`overflow-hidden border-ink/5 bg-white/95 backdrop-blur-xl transition-all duration-300 lg:hidden ${
          open ? "max-h-[420px] border-b" : "max-h-0"
        }`}
      >
        <ul className="space-y-1 px-5 py-4">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-medium text-ink transition hover:bg-brand-faint hover:text-brand"
              >
                {link.label}
              </a>
            </li>
          ))}
          <li className="pt-2">
            <a href="#contact" onClick={() => setOpen(false)} className="btn-primary w-full">
              Get a Free Quote
            </a>
          </li>
        </ul>
      </div>
    </header>
  );
}
