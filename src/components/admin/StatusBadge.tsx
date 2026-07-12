const STYLES: Record<string, string> = {
  new: "bg-brand-faint text-brand",
  contacted: "bg-amber-100 text-amber-700",
  closed: "bg-emerald-100 text-emerald-700",
  archived: "bg-ink/8 text-ink-soft",
  draft: "bg-ink/8 text-ink-soft",
  published: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-brand-faint text-brand",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold tracking-wide uppercase ${
        STYLES[status] ?? "bg-ink/8 text-ink-soft"
      }`}
    >
      {status}
    </span>
  );
}
