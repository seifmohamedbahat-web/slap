import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { relativeTime } from "../lib/format";
import type { Note } from "@shared/types";
import { Button, EmptyState, GlassCard, IconButton, LoadingState, PageHeader, cx, useToast } from "../components/ui";
import { useAsync } from "../lib/hooks";
import { Icon } from "../components/Icon";

const KINDS: { id: Note["kind"]; label: string }[] = [
  { id: "note", label: "Notes" },
  { id: "journal", label: "Journal" },
  { id: "meeting", label: "Meeting" },
];

export function NotesPage() {
  const { push } = useToast();
  const [kind, setKind] = useState<Note["kind"] | "all">("all");
  const notes = useAsync(() => api.invoke("notes:list", undefined), []);
  const [selected, setSelected] = useState<Note | null>(null);
  const [draft, setDraft] = useState<{ title: string; content: string; kind: Note["kind"] }>({
    title: "",
    content: "",
    kind: "note",
  });

  const list = (notes.data ?? []).filter((n) => kind === "all" || n.kind === kind);

  useEffect(() => {
    if (selected) setDraft({ title: selected.title, content: selected.content, kind: selected.kind });
  }, [selected]);

  async function save() {
    const saved = await api.invoke("notes:save", {
      id: selected?.id,
      title: draft.title || "Untitled",
      content: draft.content,
      kind: draft.kind,
    });
    push("Note saved", "success");
    await notes.reload();
    setSelected(saved);
  }

  async function create() {
    const note = await api.invoke("notes:save", { title: "Untitled", content: "", kind: kind === "all" ? "note" : kind });
    await notes.reload();
    setSelected(note);
  }

  async function remove(id: string) {
    await api.invoke("notes:delete", { id });
    await notes.reload();
    if (selected?.id === id) setSelected(null);
  }

  async function togglePin(note: Note) {
    await api.invoke("notes:save", { id: note.id, pinned: !note.pinned });
    await notes.reload();
  }

  return (
    <div>
      <PageHeader
        title="Notes"
        subtitle="Daily notes, meeting notes and journal entries."
        icon="notes"
        actions={<Button variant="primary" icon="plus" onClick={create}>New note</Button>}
      />

      <div className="mb-4 flex gap-2">
        {(["all", ...KINDS.map((k) => k.id)] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cx(
              "rounded-lg px-3 py-1.5 text-sm capitalize transition-colors",
              kind === k ? "bg-neon-500/15 text-ink-primary" : "text-ink-muted hover:text-ink-secondary",
            )}
          >
            {k === "all" ? "All" : KINDS.find((kk) => kk.id === k)?.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-4">
          {notes.loading ? (
            <LoadingState />
          ) : list.length === 0 ? (
            <EmptyState icon="notes" title="No notes yet" hint="Create your first note." action={<Button icon="plus" onClick={create}>New note</Button>} />
          ) : (
            <div className="space-y-2">
              {list.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setSelected(n)}
                  className={cx(
                    "glass glass-hover flex w-full flex-col gap-1 rounded-xl px-4 py-3 text-left",
                    selected?.id === n.id && "border-neon-400/40",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {n.pinned && <Icon name="pin" size={13} className="text-neon-400" />}
                    <span className="flex-1 truncate text-sm font-medium text-ink-primary">{n.title}</span>
                  </div>
                  <span className="truncate text-xs text-ink-muted">
                    {n.content.slice(0, 60) || "Empty"} · {relativeTime(n.updatedAt)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <GlassCard className="col-span-12 flex min-h-[60vh] flex-col p-5 md:col-span-8">
          {selected || draft.title || draft.content ? (
            <>
              <div className="mb-3 flex items-center gap-2">
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Note title"
                  className="input flex-1 text-lg font-medium"
                />
                <select
                  value={draft.kind}
                  onChange={(e) => setDraft({ ...draft, kind: e.target.value as Note["kind"] })}
                  className="input w-32"
                >
                  {KINDS.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.label}
                    </option>
                  ))}
                </select>
                {selected && (
                  <>
                    <IconButton icon="pin" label="Pin" onClick={() => togglePin(selected)} />
                    <IconButton icon="trash" label="Delete" danger onClick={() => remove(selected.id)} />
                  </>
                )}
              </div>
              <textarea
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                placeholder="Start writing…"
                className="input flex-1 resize-none font-mono text-sm leading-relaxed"
              />
              <div className="mt-3 flex justify-end">
                <Button variant="primary" icon="check" onClick={save}>
                  Save
                </Button>
              </div>
            </>
          ) : (
            <EmptyState icon="notes" title="Select or create a note" hint="Your note editor appears here." />
          )}
        </GlassCard>
      </div>
    </div>
  );
}
