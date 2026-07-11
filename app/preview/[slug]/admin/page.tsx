import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { PreviewBanner } from "@/components/preview/PreviewBanner";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPreview({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lead = await prisma.lead.findUnique({
    where: { slug },
    include: { adminDashboard: true, profile: true, appointments: { orderBy: { startsAt: "asc" } } },
  });

  if (!lead || !lead.adminDashboard || lead.adminDashboard.status !== "READY") notFound();

  const sections: string[] = JSON.parse(lead.adminDashboard.sectionsJson!);
  const seedData: { records: { id: number; name: string; status: string; value: number }[] } = JSON.parse(
    lead.adminDashboard.seedDataJson!
  );
  const palette: string[] = lead.profile?.colorPalette ? JSON.parse(lead.profile.colorPalette) : [];
  const accent = palette[0] ?? "#111111";

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <PreviewBanner businessName={lead.businessName} leadId={lead.id} />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{lead.businessName} — Admin</h1>
            <p className="mt-1 text-sm text-neutral-500">{lead.adminDashboard.templateKey} dashboard</p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Records", value: seedData.records.length },
            { label: "Active", value: seedData.records.filter((r) => r.status === "Active").length },
            {
              label: "Est. Value",
              value: `$${seedData.records.reduce((s, r) => s + r.value, 0).toLocaleString()}`,
            },
            { label: "Appointments", value: lead.appointments.length },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                {kpi.label}
              </div>
              <div className="mt-2 text-2xl font-bold" style={{ color: accent }}>
                {kpi.value}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-4 flex flex-wrap gap-2">
              {sections.map((s) => (
                <span
                  key={s}
                  className="rounded-full border px-3 py-1.5 text-xs font-medium"
                  style={{ borderColor: accent, color: accent }}
                >
                  {s}
                </span>
              ))}
            </div>
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {seedData.records.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3">{r.name}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs">{r.status}</span>
                      </td>
                      <td className="px-4 py-3">${r.value.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">Upcoming Appointments</h3>
            <div className="space-y-2">
              {lead.appointments.length === 0 && (
                <p className="text-sm text-neutral-500">No appointments booked yet.</p>
              )}
              {lead.appointments.map((a) => (
                <div key={a.id} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
                  <p className="font-medium">{a.customerName}</p>
                  <p className="text-neutral-500">
                    {a.service} — {new Date(a.startsAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
