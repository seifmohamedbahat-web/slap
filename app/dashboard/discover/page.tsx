import { DiscoverForm } from "./DiscoverForm";

export default function DiscoverPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Discover Leads</h1>
        <p className="mt-1 text-sm text-avexa-fg-muted">
          Searches Apollo for businesses matching your keywords, verifies each one has no
          live website through two independent checks, and only saves the ones that pass.
        </p>
      </div>
      <DiscoverForm />
      <p className="mt-4 text-xs text-avexa-fg-muted">
        Without <code className="rounded bg-avexa-card px-1.5 py-0.5">APOLLO_API_KEY</code>{" "}
        configured, this runs against a small curated sample so you can see the full pipeline
        end-to-end. Set the key in your environment to search real Apollo data.
      </p>
    </div>
  );
}
