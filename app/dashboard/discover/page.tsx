import { DiscoverForm } from "./DiscoverForm";

export default function DiscoverPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Discover Leads</h1>
        <p className="mt-1 text-sm text-avexa-fg-muted">
          Searches Facebook and Yelp business listings for your keywords using AVEXA&apos;s
          own scraper (no third-party lead-gen API), verifies each candidate has no live
          website through an independent domain probe, and only saves the ones that pass.
        </p>
      </div>
      <DiscoverForm />
      <p className="mt-4 text-xs text-avexa-fg-muted">
        If the search engine AVEXA scrapes can&apos;t be reached from this environment
        (e.g. a locked-down network), discovery falls back to a small curated sample so
        the rest of the pipeline stays fully demoable.
      </p>
    </div>
  );
}
