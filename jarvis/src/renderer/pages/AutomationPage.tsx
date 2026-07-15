import { useState } from "react";
import { api } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { relativeTime } from "../lib/format";
import type { AutomationResult } from "@shared/types";
import { Badge, Button, GlassCard, PageHeader, cx, useToast } from "../components/ui";
import { Icon } from "../components/Icon";

const EXAMPLES = [
  "Open Chrome",
  "Search Google for electron security",
  "Organize my Downloads",
  "Take a screenshot",
  "Create folder Invoices",
  "Add task Review pull request",
  "Remind me to stretch in 20 minutes",
  "Show CPU usage",
];

export function AutomationPage() {
  const { push } = useToast();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<AutomationResult | null>(null);
  const history = useAsync(() => api.invoke("automation:history", { limit: 30 }), []);

  async function run(command: string) {
    if (!command.trim() || busy) return;
    setBusy(true);
    try {
      const result = await api.invoke("automation:run", { input: command.trim() });
      setLast(result);
      if (result.ok) push(result.output || "Done", "success");
      else if (result.cancelled) push("Cancelled", "info");
      else push(result.output || "Unrecognized command", "error");
      setInput("");
      await history.reload();
    } catch (err) {
      push(err instanceof Error ? err.message : String(err), "error");
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    if (!last?.undoToken) return;
    const { ok } = await api.invoke("automation:undo", { token: last.undoToken });
    push(ok ? "Undone" : "Nothing to undo (window expired)", ok ? "success" : "info");
    if (ok) setLast({ ...last, undoToken: undefined });
  }

  return (
    <div>
      <PageHeader
        title="Automation Center"
        subtitle="Type a natural-language command. Dangerous actions ask for confirmation first."
        icon="automation"
      />

      <GlassCard className="mb-5 p-5">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run(input)}
            placeholder="e.g. Launch VS Code"
            className="input flex-1"
            autoFocus
          />
          <Button variant="primary" icon="play" onClick={() => run(input)} disabled={busy || !input.trim()}>
            Run
          </Button>
        </div>

        {last && (
          <div
            className={cx(
              "mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
              last.ok ? "border-status-good/30 bg-status-good/8" : "border-status-warning/30 bg-status-warning/8",
            )}
          >
            <Icon name={last.ok ? "check" : "warning"} size={18} className={last.ok ? "text-status-good" : "text-status-warning"} />
            <div className="flex-1">
              {last.intent && (
                <p className="mb-0.5 font-medium text-ink-primary">
                  {last.intent.summary} <Badge tone={riskTone(last.intent.risk)}>{last.intent.risk}</Badge>
                </p>
              )}
              <p className="text-ink-secondary">{last.output}</p>
            </div>
            {last.undoToken && (
              <Button icon="refresh" onClick={undo}>
                Undo
              </Button>
            )}
          </div>
        )}
      </GlassCard>

      <div className="grid grid-cols-12 gap-4">
        <GlassCard className="col-span-12 p-5 lg:col-span-5">
          <h2 className="mb-3 font-semibold text-ink-primary">Try saying</h2>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => run(ex)}
                disabled={busy}
                className="chip glass-hover text-ink-secondary hover:text-ink-primary"
              >
                {ex}
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="col-span-12 p-5 lg:col-span-7">
          <h2 className="mb-3 font-semibold text-ink-primary">Command History</h2>
          <div className="scroll-area max-h-96 space-y-1.5">
            {(history.data ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-muted">No commands run yet.</p>
            ) : (
              (history.data ?? []).map((h) => (
                <div key={h.id} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-white/4">
                  <span
                    className={cx(
                      "h-2 w-2 shrink-0 rounded-full",
                      h.status === "ok"
                        ? "bg-status-good"
                        : h.status === "cancelled"
                          ? "bg-status-warning"
                          : "bg-status-critical",
                    )}
                  />
                  <span className="flex-1 truncate text-ink-secondary">{h.input}</span>
                  <span className="text-xs text-ink-muted">{relativeTime(h.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function riskTone(risk: string): "good" | "warning" | "critical" {
  return risk === "safe" ? "good" : risk === "sensitive" ? "warning" : "critical";
}
