import Link from "next/link";

export function PreviewBanner({ businessName, leadId }: { businessName: string; leadId: string }) {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-avexa-border bg-avexa-accent px-4 py-2 text-xs font-medium text-white">
      <span>
        AVEXA preview for <strong>{businessName}</strong> — not affiliated, generated automatically.
      </span>
      <Link href={`/dashboard/leads/${leadId}`} className="shrink-0 underline underline-offset-2">
        Back to CRM
      </Link>
    </div>
  );
}
