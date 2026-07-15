import { useState } from "react";
import { api } from "../lib/api";
import { relativeTime } from "../lib/format";
import type { TaskItem, TaskPriority, TaskStatus } from "@shared/types";
import { useAsync } from "../lib/hooks";
import { Badge, Button, EmptyState, GlassCard, IconButton, LoadingState, PageHeader, cx, useToast } from "../components/ui";
import { Icon } from "../components/Icon";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To Do" },
  { status: "in_progress", label: "In Progress" },
  { status: "done", label: "Done" },
];

const PRIORITY_TONE: Record<TaskPriority, "good" | "warning" | "critical"> = {
  low: "good",
  medium: "warning",
  high: "critical",
};

export function TasksPage() {
  const { push } = useToast();
  const tasks = useAsync(() => api.invoke("tasks:list", undefined), []);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");

  async function add() {
    if (!title.trim()) return;
    await api.invoke("tasks:save", { title: title.trim(), priority });
    setTitle("");
    await tasks.reload();
    push("Task added", "success");
  }

  async function move(task: TaskItem, status: TaskStatus) {
    await api.invoke("tasks:save", { id: task.id, status });
    await tasks.reload();
  }

  async function remove(id: string) {
    await api.invoke("tasks:delete", { id });
    await tasks.reload();
  }

  const byStatus = (status: TaskStatus) => (tasks.data ?? []).filter((t) => t.status === status);

  return (
    <div>
      <PageHeader title="Tasks & To-Do" subtitle="Track work across three stages." icon="tasks" />

      <GlassCard className="mb-5 p-4">
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Add a task…"
            className="input flex-1"
          />
          <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="input w-32">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <Button variant="primary" icon="plus" onClick={add} disabled={!title.trim()}>
            Add
          </Button>
        </div>
      </GlassCard>

      {tasks.loading ? (
        <LoadingState />
      ) : (tasks.data ?? []).length === 0 ? (
        <EmptyState icon="tasks" title="No tasks yet" hint="Add your first task above." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const items = byStatus(col.status);
            return (
              <GlassCard key={col.status} className="flex flex-col p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-ink-primary">{col.label}</h2>
                  <Badge>{items.length}</Badge>
                </div>
                <div className="scroll-area max-h-[60vh] space-y-2">
                  {items.map((t) => (
                    <div key={t.id} className="glass rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cx("text-sm", t.status === "done" ? "text-ink-muted line-through" : "text-ink-primary")}>
                          {t.title}
                        </p>
                        <IconButton icon="trash" label="Delete" danger onClick={() => remove(t.id)} />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
                        {t.dueDate && <span className="text-xs text-ink-muted">{relativeTime(t.dueDate)}</span>}
                      </div>
                      <div className="mt-2 flex gap-1">
                        {COLUMNS.filter((c) => c.status !== t.status).map((c) => (
                          <button
                            key={c.status}
                            type="button"
                            onClick={() => move(t, c.status)}
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-ink-muted transition-colors hover:bg-neon-500/12 hover:text-neon-300"
                          >
                            <Icon name="chevron" size={11} /> {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <p className="py-6 text-center text-xs text-ink-muted">Nothing here.</p>}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
