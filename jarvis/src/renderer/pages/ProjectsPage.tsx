import { useState } from "react";
import { api } from "../lib/api";
import { relativeTime } from "../lib/format";
import type { Project } from "@shared/types";
import { useAsync } from "../lib/hooks";
import { Badge, Button, EmptyState, Field, GlassCard, IconButton, LoadingState, Modal, PageHeader, useToast } from "../components/ui";
import { Icon } from "../components/Icon";

const STATUS_TONE: Record<Project["status"], "good" | "warning" | "neutral"> = {
  active: "good",
  paused: "warning",
  done: "neutral",
};

export function ProjectsPage() {
  const { push } = useToast();
  const projects = useAsync(() => api.invoke("projects:list", undefined), []);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<{ id?: string; name: string; description: string; path: string; status: Project["status"] }>({
    name: "",
    description: "",
    path: "",
    status: "active",
  });

  function openNew() {
    setForm({ name: "", description: "", path: "", status: "active" });
    setModalOpen(true);
  }

  function openEdit(p: Project) {
    setForm({ id: p.id, name: p.name, description: p.description, path: p.path, status: p.status });
    setModalOpen(true);
  }

  async function save() {
    if (!form.name.trim()) return;
    await api.invoke("projects:save", form);
    push("Project saved", "success");
    setModalOpen(false);
    await projects.reload();
  }

  async function remove(id: string) {
    await api.invoke("projects:delete", { id });
    await projects.reload();
  }

  async function openPath(path: string) {
    if (!path) return;
    const { ok, error } = await api.invoke("app:openPath", { path });
    if (!ok) push(error ?? "Could not open path", "error");
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Track your coding and work projects."
        icon="projects"
        actions={<Button variant="primary" icon="plus" onClick={openNew}>New project</Button>}
      />

      {projects.loading ? (
        <LoadingState />
      ) : (projects.data ?? []).length === 0 ? (
        <EmptyState icon="projects" title="No projects yet" hint="Add a project to track its status and folder." action={<Button icon="plus" onClick={openNew}>New project</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(projects.data ?? []).map((p) => (
            <GlassCard key={p.id} hover className="group flex flex-col p-5">
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neon-500/12 text-neon-400">
                    <Icon name="projects" size={18} />
                  </span>
                  <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                </div>
                <span className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <IconButton icon="settings" label="Edit" onClick={() => openEdit(p)} />
                  <IconButton icon="trash" label="Delete" danger onClick={() => remove(p.id)} />
                </span>
              </div>
              <h3 className="text-base font-semibold text-ink-primary">{p.name}</h3>
              {p.description && <p className="mt-1 flex-1 text-sm text-ink-secondary">{p.description}</p>}
              <div className="mt-3 flex items-center justify-between text-xs text-ink-muted">
                <span>Updated {relativeTime(p.updatedAt)}</span>
                {p.path && (
                  <button type="button" onClick={() => openPath(p.path)} className="flex items-center gap-1 text-neon-400 hover:underline">
                    <Icon name="folder" size={12} /> Open
                  </button>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? "Edit project" : "New project"}
        footer={
          <>
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={save} disabled={!form.name.trim()}>
              Save
            </Button>
          </>
        }
      >
        <Field label="Name">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" autoFocus />
        </Field>
        <Field label="Description">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input resize-none" rows={2} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Folder path">
            <input value={form.path} onChange={(e) => setForm({ ...form, path: e.target.value })} className="input" placeholder="C:\\Projects\\app" />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Project["status"] })} className="input">
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="done">Done</option>
            </select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
