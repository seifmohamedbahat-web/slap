import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { LayoutGrid, Users, Radar, Activity } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/discover", label: "Discover", icon: Radar },
  { href: "/dashboard/activity", label: "Activity", icon: Activity },
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-avexa-border bg-avexa-bg-secondary md:flex md:flex-col">
      <div className="border-b border-avexa-border px-6 py-5">
        <Logo href="/dashboard" />
        <p className="mt-1 text-xs text-avexa-fg-muted">Agency Dashboard</p>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-avexa-fg-muted transition hover:bg-avexa-card hover:text-avexa-fg"
          >
            <l.icon className="h-4 w-4" />
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-avexa-border px-6 py-4 text-xs text-avexa-fg-muted">
        <Link href="/" className="hover:text-avexa-fg">
          ← Back to site
        </Link>
      </div>
    </aside>
  );
}
