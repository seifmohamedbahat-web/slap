import Link from "next/link";
import { Check } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

const tiers = [
  {
    name: "Website",
    price: "$900+",
    tagline: "For businesses that just need to be found online.",
    features: ["Custom premium website", "SEO + mobile optimized", "Contact & lead capture", "1 revision round"],
  },
  {
    name: "Website + Booking",
    price: "$1,900+",
    tagline: "For appointment-driven businesses.",
    features: ["Everything in Website", "Full booking system", "Staff & availability", "Email/SMS confirmations"],
    featured: true,
  },
  {
    name: "Full System",
    price: "$3,500+",
    tagline: "Website, booking, and a real back office.",
    features: ["Everything in Website + Booking", "Industry admin dashboard", "Analytics & reporting", "Priority support"],
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1 px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Pricing</h1>
          <p className="mt-4 text-avexa-fg-muted">
            AI recommends the right package per lead — final pricing is always reviewed before a proposal goes out.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl border p-8 ${
                tier.featured
                  ? "border-avexa-accent bg-avexa-card shadow-[0_0_0_1px_#e10600]"
                  : "border-avexa-border bg-avexa-card"
              }`}
            >
              {tier.featured && (
                <span className="mb-4 inline-block rounded-full bg-avexa-accent px-3 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
              )}
              <h2 className="text-lg font-bold">{tier.name}</h2>
              <p className="mt-1 text-3xl font-extrabold">{tier.price}</p>
              <p className="mt-2 text-sm text-avexa-fg-muted">{tier.tagline}</p>
              <ul className="mt-6 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-avexa-accent" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/contact"
                className="mt-8 block rounded-full border border-avexa-border py-2.5 text-center text-sm font-semibold transition hover:border-avexa-fg-muted"
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
