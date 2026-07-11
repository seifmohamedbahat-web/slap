import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", icon: "dashboard", label: "Dashboard" },
  { href: "/admin/leads", icon: "inbox", label: "Leads & Inquiries" },
  { href: "/admin/portfolio", icon: "briefcase", label: "Portfolio" },
  { href: "/admin/services", icon: "layers", label: "Services" },
  { href: "/admin/pricing", icon: "dollar", label: "Pricing" },
  { href: "/admin/testimonials", icon: "quote", label: "Testimonials" },
  { href: "/admin/settings", icon: "settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-mist">
      {/* sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-ink lg:flex">
        <div className="border-b border-white/10 px-6 py-5">
          <Logo on="dark" size={34} href="/admin" />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Admin">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/65 transition hover:bg-white/10 hover:text-white"
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/65 transition hover:bg-white/10 hover:text-white"
          >
            <Icon name="external-link" size={17} />
            View live site
          </a>
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">{session.name || "Admin"}</p>
              <p className="truncate text-[0.68rem] text-white/45">{session.email}</p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/55 transition hover:bg-white/10 hover:text-white"
                title="Log out"
                aria-label="Log out"
              >
                <Icon name="logout" size={16} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* main column */}
      <div className="min-w-0 flex-1">
        {/* mobile top bar */}
        <div className="sticky top-0 z-40 bg-ink lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Logo on="dark" size={30} href="/admin" />
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white"
              >
                <Icon name="logout" size={14} />
                Log out
              </button>
            </form>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3" aria-label="Admin">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium whitespace-nowrap text-white/80"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
