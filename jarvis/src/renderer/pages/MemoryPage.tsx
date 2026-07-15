import { useState } from "react";
import { api } from "../lib/api";
import type { MemoryCategory } from "@shared/types";
import { useAsync } from "../lib/hooks";
import { Badge, Button, EmptyState, Field, GlassCard, IconButton, LoadingState, Modal, PageHeader, cx, useToast } from "../components/ui";

const CATEGORIES: { id: MemoryCategory; label: string }[] = [
  { id: "preference", label: "Preferences" },
  { id: "project", label: "Projects" },
  { id: "workflow", label: "Workflows" },
  { id: "fact", label: "Facts" },
  { id: "place", label: "Places" },
  { id: "business", label: "Business" },
];

export function MemoryPage() {
  const { push } = useToast();
  const [filter, setFilter] = useState<MemoryCategory | "all">("all");
  const memory = useAsync(() => api.invoke("memory:list", undefined), []);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<{ category: MemoryCategory; key: string; value: string; importance: number }>({
    category: "preference",
    key: "",
    value: "",
    importance: 3,
  });

  const list = (memory.data ?? []).filter((m) => filter === "all" || m.category === filter);

  async function save() {
    if (!form.key.trim() || !form.value.trim()) return;
    await api.invoke("memory:save", form);
    push("Memory saved — JARVIS will use this as context", "success");
    setModalOpen(false);
    setForm({ category: "preference", key: "", value: "", importance: 3 });
    await memory.reload();
  }

  async function remove(id: string) {
    await api.invoke("memory:delete", { id });
    await memory.reload();
  }

  return (
    <div>
      <PageHeader
        title="AI Memory"
        subtitle="Facts JARVIS remembers about you and injects into every conversation."
        icon="memory"
        actions={<Button variant="primary" icon="plus" onClick={() => setModalOpen(true)}>Add memory</Button>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", ...CATEGORIES.map((c) => c.id)] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={cx(
              "rounded-lg px-3 py-1.5 text-sm capitalize transition-colors",
              filter === c ? "bg-neon-500/15 text-ink-primary" : "text-ink-muted hover:text-ink-secondary",
            )}
          >
            {c === "all" ? "All" : CATEGORIES.find((cc) => cc.id === c)?.label}
          </button>
        ))}
      </div>

      {memory.loading ? (
        <LoadingState />
      ) : list.length === 0 ? (
        <EmptyState
          icon="memory"
          title="No memories yet"
          hint="Teach JARVIS your preferences, workflows and business facts. They'll shape every AI reply."
          action={<Button icon="plus" onClick={() => setModalOpen(true)}>Add memory</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.map((m) => (
            <GlassCard key={m.id} hover className="group p-4">
              <div className="mb-2 flex items-center justify-between">
                <Badge tone="accent">{m.category}</Badge>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-ink-muted">{"★".repeat(m.importance)}</span>
                  <span className="opacity-0 transition-opacity group-hover:opacity-100">
                    <IconButton icon="trash" label="Delete" danger onClick={() => remove(m.id)} />
                  </span>
                </div>
              </div>
              <p className="text-sm font-medium text-ink-primary">{m.key}</p>
              <p className="mt-1 text-sm text-ink-secondary">{m.value}</p>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add memory"
        footer={
          <>
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={save} disabled={!form.key.trim() || !form.value.trim()}>
              Save
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as MemoryCategory })}
              className="input"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Importance">
            <select
              value={form.importance}
              onChange={(e) => setForm({ ...form, importance: Number(e.target.value) })}
              className="input"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {"★".repeat(n)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Key (short label)">
          <input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} className="input" placeholder="e.g. Preferred language" autoFocus />
        </Field>
        <Field label="Value">
          <textarea
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            className="input resize-none"
            rows={3}
            placeholder="e.g. TypeScript, functional style, no semicolons"
          />
        </Field>
      </Modal>
    </div>
  );
}
