import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { StatusBadge, PriorityDot } from "@/components/dashboard/StatusBadge";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;

  const leads = await prisma.lead.findMany({
    where: {
      status: status ? (status as never) : undefined,
      businessName: q ? { contains: q } : undefined,
    },
    include: { score: true, website: true, bookingSystem: true, adminDashboard: true },
    orderBy: { createdAt: "desc" },
  });

  const statusFilters = [
    "VERIFIED_NO_WEBSITE",
    "ANALYZED",
    "ASSETS_GENERATED",
    "OUTREACH_READY",
    "OUTREACH_SENT",
    "WON",
  ];

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="mt-1 text-sm text-avexa-fg-muted">{leads.length} in the CRM</p>
        </div>
        <Link
          href="/dashboard/discover"
          className="rounded-full bg-avexa-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-avexa-accent-hover"
        >
          Discover Leads
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/dashboard/leads"
          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
            !status
              ? "border-avexa-accent text-avexa-accent"
              : "border-avexa-border text-avexa-fg-muted hover:text-avexa-fg"
          }`}
        >
          All
        </Link>
        {statusFilters.map((s) => (
          <Link
            key={s}
            href={`/dashboard/leads?status=${s}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              status === s
                ? "border-avexa-accent text-avexa-accent"
                : "border-avexa-border text-avexa-fg-muted hover:text-avexa-fg"
            }`}
          >
            {s.replace(/_/g, " ")}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-avexa-border">
        <table className="w-full text-sm">
          <thead className="bg-avexa-bg-secondary text-left text-xs uppercase tracking-wide text-avexa-fg-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Business</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Location</th>
              <th className="px-5 py-3 font-medium">Score</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Assets</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-avexa-border">
            {leads.map((lead) => (
              <tr key={lead.id} className="transition hover:bg-avexa-card">
                <td className="px-5 py-4">
                  <Link href={`/dashboard/leads/${lead.id}`} className="font-medium hover:text-avexa-accent">
                    {lead.businessName}
                  </Link>
                </td>
                <td className="px-5 py-4 text-avexa-fg-muted">{lead.category}</td>
                <td className="px-5 py-4 text-avexa-fg-muted">
                  {[lead.city, lead.state].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-5 py-4">
                  {lead.score ? (
                    <span className="inline-flex items-center gap-1.5">
                      <PriorityDot priority={lead.score.priority} />
                      {lead.score.leadScore}
                    </span>
                  ) : (
                    <span className="text-avexa-fg-muted">—</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={lead.status} />
                </td>
                <td className="px-5 py-4 text-xs text-avexa-fg-muted">
                  {[
                    lead.website?.status === "READY" && "Website",
                    lead.bookingSystem?.status === "READY" && "Booking",
                    lead.adminDashboard?.status === "READY" && "Dashboard",
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-avexa-fg-muted">
                  No leads yet. Run a discovery pass to find businesses without a website.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
