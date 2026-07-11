export function RankedBarList({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.count));

  return (
    <div className="rounded-2xl border border-avexa-border bg-avexa-card p-6">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-5 space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-avexa-fg-muted">No data yet.</p>
        )}
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-avexa-fg">{item.label}</span>
              <span className="tabular-nums text-avexa-fg-muted">{item.count}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-avexa-border">
              <div
                className="h-full rounded-full bg-avexa-accent"
                style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
