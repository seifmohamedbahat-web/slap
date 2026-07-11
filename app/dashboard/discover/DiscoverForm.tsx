"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Radar, Loader2 } from "lucide-react";

export function DiscoverForm() {
  const router = useRouter();
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ discovered: number; verified: number; rejected: number } | null>(
    null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/leads/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industryKeyword: industry, locationKeyword: location }),
      });
      const data = await res.json();
      setResult(data);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-avexa-border bg-avexa-card p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-sm text-avexa-fg-muted">Industry keyword</label>
          <input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g. plumber, dentist, salon"
            className="w-full rounded-lg border border-avexa-border bg-avexa-bg px-4 py-2.5 outline-none transition focus:border-avexa-accent"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-sm text-avexa-fg-muted">Location keyword</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Portland, TX"
            className="w-full rounded-lg border border-avexa-border bg-avexa-bg px-4 py-2.5 outline-none transition focus:border-avexa-accent"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-full bg-avexa-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-avexa-accent-hover disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
          {loading ? "Searching..." : "Run Discovery"}
        </button>
      </form>

      {result && (
        <div className="mt-5 flex gap-6 border-t border-avexa-border pt-4 text-sm">
          <span>
            <span className="font-semibold">{result.discovered}</span>{" "}
            <span className="text-avexa-fg-muted">candidates scanned</span>
          </span>
          <span className="text-avexa-success">
            <span className="font-semibold">{result.verified}</span> verified no-website
          </span>
          <span className="text-avexa-error">
            <span className="font-semibold">{result.rejected}</span> rejected (has website)
          </span>
        </div>
      )}
    </div>
  );
}
