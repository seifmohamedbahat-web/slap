const STATUS_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  DISCOVERED: { bg: "bg-avexa-border", fg: "text-avexa-fg-muted", label: "Discovered" },
  VERIFYING: { bg: "bg-avexa-warning/15", fg: "text-avexa-warning", label: "Verifying" },
  VERIFIED_NO_WEBSITE: { bg: "bg-avexa-success/15", fg: "text-avexa-success", label: "Verified" },
  REJECTED_HAS_WEBSITE: { bg: "bg-avexa-error/15", fg: "text-avexa-error", label: "Rejected" },
  ANALYZED: { bg: "bg-avexa-accent/15", fg: "text-avexa-accent", label: "Analyzed" },
  ASSETS_GENERATED: { bg: "bg-avexa-accent/15", fg: "text-avexa-accent", label: "Assets Ready" },
  OUTREACH_READY: { bg: "bg-avexa-warning/15", fg: "text-avexa-warning", label: "Outreach Ready" },
  OUTREACH_SENT: { bg: "bg-avexa-warning/15", fg: "text-avexa-warning", label: "Outreach Sent" },
  REPLIED: { bg: "bg-avexa-success/15", fg: "text-avexa-success", label: "Replied" },
  MEETING_BOOKED: { bg: "bg-avexa-success/15", fg: "text-avexa-success", label: "Meeting Booked" },
  WON: { bg: "bg-avexa-success/20", fg: "text-avexa-success", label: "Won" },
  LOST: { bg: "bg-avexa-error/15", fg: "text-avexa-error", label: "Lost" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? {
    bg: "bg-avexa-border",
    fg: "text-avexa-fg-muted",
    label: status,
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${s.bg} ${s.fg}`}
    >
      {s.label}
    </span>
  );
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "text-avexa-error",
  high: "text-avexa-accent",
  medium: "text-avexa-warning",
  low: "text-avexa-fg-muted",
};

export function PriorityDot({ priority }: { priority: string }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${
        PRIORITY_STYLES[priority] ? "" : "bg-avexa-fg-muted"
      }`}
      style={{
        backgroundColor:
          priority === "urgent"
            ? "#FF3B30"
            : priority === "high"
            ? "#E10600"
            : priority === "medium"
            ? "#F5A623"
            : "#5a5a5a",
      }}
    />
  );
}
