import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1 px-6 py-24">
        <div className="mx-auto max-w-lg">
          <h1 className="text-4xl font-extrabold tracking-tight">Get in touch</h1>
          <p className="mt-4 text-avexa-fg-muted">
            Tell us about your business and we&apos;ll get back to you.
          </p>
          <form className="mt-10 space-y-5">
            <div>
              <label className="mb-1.5 block text-sm text-avexa-fg-muted">Name</label>
              <input
                className="w-full rounded-lg border border-avexa-border bg-avexa-card px-4 py-2.5 outline-none transition focus:border-avexa-accent"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-avexa-fg-muted">Email</label>
              <input
                type="email"
                className="w-full rounded-lg border border-avexa-border bg-avexa-card px-4 py-2.5 outline-none transition focus:border-avexa-accent"
                placeholder="jane@business.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-avexa-fg-muted">Message</label>
              <textarea
                rows={5}
                className="w-full rounded-lg border border-avexa-border bg-avexa-card px-4 py-2.5 outline-none transition focus:border-avexa-accent"
                placeholder="Tell us about your business..."
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-avexa-accent py-3 text-sm font-semibold text-white transition hover:bg-avexa-accent-hover"
            >
              Send Message
            </button>
          </form>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
