import Link from "next/link";
import Icon from "@/components/Icon";
import PageHeader from "@/components/admin/PageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import { getDb, type Lead } from "@/lib/db";
import { deleteLead, setLeadStatus, toggleLeadArchived, toggleLeadRead } from "../../actions";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "closed", label: "Closed" },
  { key: "archived", label: "Archived" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function getLeads(filter: FilterKey): Lead[] {
  const db = getDb();
  if (filter === "archived") {
    return db.prepare("SELECT * FROM leads WHERE archived = 1 ORDER BY created_at DESC, id DESC").all() as Lead[];
  }
  if (filter === "all") {
    return db.prepare("SELECT * FROM leads WHERE archived = 0 ORDER BY created_at DESC, id DESC").all() as Lead[];
  }
  return db
    .prepare("SELECT * FROM leads WHERE archived = 0 AND status = ? ORDER BY created_at DESC, id DESC")
    .all(filter) as Lead[];
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter: FilterKey = (FILTERS.find((f) => f.key === params.filter)?.key ?? "all") as FilterKey;
  const leads = getLeads(filter);

  const counts = Object.fromEntries(
    FILTERS.map((f) => [f.key, getLeads(f.key).length])
  ) as Record<FilterKey, number>;

  return (
    <>
      <PageHeader
        title="Leads & Inquiries"
        description="Contact form submissions and quote requests from the public site."
      />

      {/* filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/admin/leads" : `/admin/leads?filter=${f.key}`}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              filter === f.key
                ? "bg-ink text-white"
                : "border border-ink/10 bg-white text-ink-soft hover:border-brand/40 hover:text-brand"
            }`}
          >
            {f.label} <span className="opacity-60">({counts[f.key]})</span>
          </Link>
        ))}
      </div>

      {leads.length === 0 ? (
        <div className="admin-card py-16 text-center">
          <Icon name="inbox" size={32} className="mx-auto text-ink/20" />
          <p className="mt-4 text-sm font-medium text-ink">Nothing here yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            {filter === "all"
              ? "New contact form submissions will land in this inbox."
              : `No ${filter} leads at the moment.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {leads.map((lead) => (
            <article
              key={lead.id}
              className={`admin-card !p-5 ${lead.is_read ? "" : "ring-2 ring-brand/25"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {!lead.is_read && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-brand" title="Unread" />
                    )}
                    <h2 className={`text-sm text-ink ${lead.is_read ? "font-semibold" : "font-bold"}`}>
                      {lead.name}
                    </h2>
                    <StatusBadge status={lead.archived ? "archived" : lead.status} />
                  </div>
                  <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
                    <a href={`mailto:${lead.email}`} className="font-medium text-brand hover:underline">
                      {lead.email}
                    </a>
                    {lead.phone && <span>{lead.phone}</span>}
                    <span>{lead.created_at.slice(0, 16).replace("T", " ")} UTC</span>
                  </p>
                  <p className="mt-2 flex flex-wrap gap-2">
                    {lead.service && (
                      <span className="rounded-full bg-brand-faint px-2.5 py-0.5 text-[0.68rem] font-semibold text-brand">
                        {lead.service}
                      </span>
                    )}
                    {lead.budget && (
                      <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[0.68rem] font-semibold text-accent-dark">
                        {lead.budget}
                      </span>
                    )}
                  </p>
                </div>

                {/* status controls */}
                <form action={setLeadStatus.bind(null, lead.id)} className="flex shrink-0 gap-1.5">
                  {(["new", "contacted", "closed"] as const).map((status) => (
                    <button
                      key={status}
                      type="submit"
                      name="status"
                      value={status}
                      disabled={lead.status === status && !lead.archived}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                        lead.status === status
                          ? "bg-ink text-white"
                          : "border border-ink/10 bg-white text-ink-soft hover:border-brand/40 hover:text-brand"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </form>
              </div>

              <p className="mt-4 rounded-xl bg-mist px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-ink">
                {lead.message}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <form action={toggleLeadRead.bind(null, lead.id)}>
                  <button type="submit" className="btn-admin-ghost">
                    <Icon name="eye" size={13} />
                    Mark as {lead.is_read ? "unread" : "read"}
                  </button>
                </form>
                <form action={toggleLeadArchived.bind(null, lead.id)}>
                  <button type="submit" className="btn-admin-ghost">
                    <Icon name="archive" size={13} />
                    {lead.archived ? "Restore" : "Archive"}
                  </button>
                </form>
                {lead.archived === 1 && (
                  <form action={deleteLead.bind(null, lead.id)}>
                    <button type="submit" className="btn-admin-danger">
                      <Icon name="trash" size={13} />
                      Delete permanently
                    </button>
                  </form>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
