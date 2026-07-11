import type { LucideIcon } from "lucide-react";
import clsx from "clsx";

export function KpiCard({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-avexa-border bg-avexa-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-avexa-fg-muted">
          {label}
        </span>
        {Icon && (
          <Icon
            className={clsx("h-4 w-4", accent ? "text-avexa-accent" : "text-avexa-fg-muted")}
          />
        )}
      </div>
      <div
        className={clsx(
          "mt-3 text-3xl font-extrabold tabular-nums",
          accent && "text-avexa-accent"
        )}
      >
        {value}
      </div>
    </div>
  );
}
