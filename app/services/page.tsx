import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Globe, CalendarClock, LayoutDashboard, Bot } from "lucide-react";

const services = [
  {
    icon: Globe,
    title: "Premium Websites",
    body: "Homepage, About, Services, Testimonials, Gallery, FAQ, and Contact — fully responsive, SEO-optimized, and built around what makes your business trustworthy.",
    items: ["Custom brand-matched design", "SEO + Open Graph + Schema", "Mobile-first, fast, accessible"],
  },
  {
    icon: CalendarClock,
    title: "Booking Systems",
    body: "For appointment-driven businesses — real availability, staff, services, and a customer-facing calendar with confirmations.",
    items: ["Live availability calendar", "Staff & service management", "Customer + admin views"],
  },
  {
    icon: LayoutDashboard,
    title: "Admin Dashboards",
    body: "A back office built for your industry — jobs, patients, clients, quotes, revenue — whatever your business actually runs on.",
    items: ["Industry-specific modules", "Analytics & reporting", "Role-based access"],
  },
  {
    icon: Bot,
    title: "AI Automation & CRM",
    body: "Every lead, deployment, and conversation lives in one CRM, with AI recommending next steps and follow-up timing.",
    items: ["Centralized CRM", "AI lead scoring", "Automated follow-ups"],
  },
];

export default function ServicesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1 px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            What AVEXA builds
          </h1>
          <p className="mt-4 text-avexa-fg-muted">
            Only the services a business actually needs — decided by AI, reviewed by us.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
          {services.map((s) => (
            <div key={s.title} className="rounded-2xl border border-avexa-border bg-avexa-card p-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-avexa-accent/10 text-avexa-accent">
                <s.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-xl font-bold">{s.title}</h2>
              <p className="mt-2 text-sm text-avexa-fg-muted">{s.body}</p>
              <ul className="mt-5 space-y-2">
                {s.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <span className="h-1 w-1 rounded-full bg-avexa-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
