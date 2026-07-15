import { useState } from "react";
import { api } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { relativeTime } from "../lib/format";
import type { LogLevel } from "@shared/types";
import { Badge, Button, EmptyState, GlassCard, LoadingState, PageHeader, cx, useToast } from "../components/ui";

const LEVEL_TONE: Record<LogLevel, "neutral" | "warning" | "critical" | "accent"> = {
  debug: "neutral",
  info: "accent",
  warn: "warning",
  error: "critical",
};

export function LogsPage() {
  const { push } = useToast();
  const [level, setLevel] = useState<LogLevel | "all">("all");
  const logs = useAsync(
    () => api.invoke("logs:list", { limit: 300, level: level === "all" ? undefined : level }),
    [level],
  );

  async function clear() {
    await api.invoke("logs:clear", undefined);
    await logs.reload();
    push("Logs cleared", "info");
  }

  return (
    <div>
      <PageHeader
        title="Activity Logs"
        subtitle="Everything JARVIS does is recorded here for transparency and debugging."
        icon="logs"
        actions={<Button icon="trash" variant="danger" onClick={clear}>Clear logs</Button>}
      />

      <div className="mb-4 flex gap-2">
        {(["all", "info", "warn", "error", "debug"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLevel(l)}
            className={cx(
              "rounded-lg px-3 py-1.5 text-sm capitalize transition-colors",
              level === l ? "bg-neon-500/15 text-ink-primary" : "text-ink-muted hover:text-ink-secondary",
            )}
          >
            {l}
          </button>
        ))}
      </div>

      <GlassCard className="overflow-hidden">
        {logs.loading ? (
          <div className="p-5">
            <LoadingState />
          </div>
        ) : (logs.data ?? []).length === 0 ? (
          <div className="p-5">
            <EmptyState icon="logs" title="No log entries" hint="Activity will appear here as you use JARVIS." />
          </div>
        ) : (
          <div className="scroll-area max-h-[70vh] divide-y divide-white/5">
            {(logs.data ?? []).map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 px-4 py-2.5 text-sm hover:bg-white/3">
                <Badge tone={LEVEL_TONE[entry.level]}>{entry.level}</Badge>
                <span className="shrink-0 font-mono text-xs text-ink-muted">{entry.category}</span>
                <span className="min-w-0 flex-1 text-ink-secondary">
                  {entry.message}
                  {entry.meta && <span className="ml-2 font-mono text-xs text-ink-muted">{entry.meta}</span>}
                </span>
                <span className="shrink-0 text-xs text-ink-muted">{relativeTime(entry.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
