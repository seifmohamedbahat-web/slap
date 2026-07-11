import { formatDistanceToNow } from "date-fns";

type ActivityItem = {
  id: string;
  type: string;
  message: string;
  createdAt: Date | string;
  lead?: { businessName: string; slug: string } | null;
};

const TYPE_COLOR: Record<string, string> = {
  lead_verified: "#16C784",
  lead_rejected: "#FF3B30",
  lead_scored: "#E10600",
  business_analyzed: "#E10600",
  website_generated: "#E10600",
  booking_generated: "#E10600",
  dashboard_generated: "#E10600",
  outreach_drafted: "#F5A623",
  outreach_approved: "#F5A623",
  outreach_sent: "#16C784",
  appointment_booked: "#16C784",
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="rounded-2xl border border-avexa-border bg-avexa-card p-6">
      <h3 className="text-sm font-semibold">Live Activity</h3>
      <ul className="mt-5 max-h-[420px] space-y-4 overflow-y-auto scrollbar-thin pr-2">
        {items.length === 0 && (
          <p className="text-sm text-avexa-fg-muted">No activity yet — run a discovery pass to get started.</p>
        )}
        {items.map((item) => (
          <li key={item.id} className="flex gap-3">
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: TYPE_COLOR[item.type] ?? "#5a5a5a" }}
            />
            <div>
              <p className="text-sm text-avexa-fg">{item.message}</p>
              <p className="mt-0.5 text-xs text-avexa-fg-muted">
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
