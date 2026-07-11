import Link from "next/link";
import Icon from "@/components/Icon";
import PageHeader from "@/components/admin/PageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import { getDb, type Lead } from "@/lib/db";

export const dynamic = "force-dynamic";

function count(sql: string): number {
  return (getDb().prepare(sql).get() as { n: number }).n;
}

function lastNDays(n: number): { day: string; label: string; count: number }[] {
  const rows = getDb()
    .prepare("SELECT day, count FROM pageviews WHERE day >= date('now', ?)")
    .all(`-${n - 1} days`) as { day: string; count: number }[];
  const byDay = new Map(rows.map((r) => [r.day, r.count]));
  const days: { day: string; label: string; count: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({
      day: iso,
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      count: byDay.get(iso) ?? 0,
    });
  }
  return days;
}

export default function DashboardPage() {
  const newLeads = count("SELECT COUNT(*) AS n FROM leads WHERE status = 'new' AND archived = 0");
  const weekLeads = count(
    "SELECT COUNT(*) AS n FROM leads WHERE created_at >= datetime('now', '-7 days')"
  );
  const quoteRequests = count(
    "SELECT COUNT(*) AS n FROM leads WHERE service != '' AND archived = 0"
  );
  const views = lastNDays(14);
  const views7 = views.slice(-7).reduce((sum, d) => sum + d.count, 0);
  const maxViews = Math.max(...views.map((d) => d.count), 1);
  const peakDay = views.reduce((a, b) => (b.count > a.count ? b : a), views[0]);

  const recentLeads = getDb()
    .prepare("SELECT * FROM leads WHERE archived = 0 ORDER BY created_at DESC, id DESC LIMIT 5")
    .all() as Lead[];

  const tiles = [
    { icon: "inbox", label: "New inquiries", value: newLeads, sub: "awaiting first contact" },
    { icon: "zap", label: "Leads this week", value: weekLeads, sub: "last 7 days" },
    { icon: "tag", label: "Quote requests", value: quoteRequests, sub: "named a service" },
    { icon: "bar-chart", label: "Page views", value: views7, sub: "last 7 days" },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="What's happening across the DigitalOrbit site right now."
      >
        <Link href="/admin/leads" className="btn-admin">
          <Icon name="inbox" size={15} />
          Review leads
        </Link>
      </PageHeader>

      {/* stat tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="admin-card flex items-start gap-4 !p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-faint text-brand">
              <Icon name={tile.icon} size={19} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">{tile.label}</p>
              <p className="font-display mt-0.5 text-3xl font-bold text-ink tabular-nums">{tile.value}</p>
              <p className="text-xs text-ink-soft">{tile.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* page views bar chart */}
        <section className="admin-card lg:col-span-3" aria-label="Page views, last 14 days">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display font-semibold text-ink">Page views · last 14 days</h2>
            <p className="text-xs text-ink-soft">
              peak {peakDay.count} on {peakDay.label}
            </p>
          </div>
          <div className="mt-6 flex h-40 items-end gap-[3px] border-b border-ink/10 pb-px">
            {views.map((d) => (
              <div key={d.day} className="group relative flex h-full flex-1 items-end" title={`${d.label}: ${d.count} views`}>
                <div
                  className="w-full rounded-t bg-brand transition-colors group-hover:bg-brand-dark"
                  style={{ height: `${Math.max((d.count / maxViews) * 100, d.count > 0 ? 4 : 2)}%` }}
                />
                <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-ink px-2 py-0.5 text-[0.65rem] font-semibold whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {d.count}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-[3px]">
            {views.map((d, i) => (
              <span key={d.day} className="flex-1 text-center text-[0.6rem] text-ink-soft">
                {i % 2 === 1 ? d.label.split(" ")[1] : ""}
              </span>
            ))}
          </div>
          {/* accessible data table fallback */}
          <table className="sr-only">
            <caption>Page views per day, last 14 days</caption>
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Views</th>
              </tr>
            </thead>
            <tbody>
              {views.map((d) => (
                <tr key={d.day}>
                  <td>{d.label}</td>
                  <td>{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* recent leads */}
        <section className="admin-card lg:col-span-2" aria-label="Recent leads">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-ink">Recent leads</h2>
            <Link href="/admin/leads" className="text-xs font-semibold text-brand hover:underline">
              View all →
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="mt-6 text-sm text-ink-soft">
              No inquiries yet — they&apos;ll appear here as soon as someone submits the contact form.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-ink/5">
              {recentLeads.map((lead) => (
                <li key={lead.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className={`truncate text-sm text-ink ${lead.is_read ? "font-medium" : "font-bold"}`}>
                      {lead.name}
                    </p>
                    <p className="truncate text-xs text-ink-soft">
                      {lead.service || "General inquiry"} · {lead.created_at.slice(0, 10)}
                    </p>
                  </div>
                  <StatusBadge status={lead.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
