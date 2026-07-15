/**
 * CRUD for the productivity domain (notes, tasks, calendar events, projects,
 * reminders) and JARVIS's long-term memory. Electron-free and unit-testable.
 */
import type { Database } from "../../core/db";
import { newId, nowIso } from "../../core/db";
import type {
  CalendarEvent,
  CommandHistoryEntry,
  MemoryEntry,
  Note,
  Project,
  Reminder,
  TaskItem,
} from "@shared/types";

type Row = Record<string, unknown>;

// -- notes -------------------------------------------------------------------

export function listNotes(db: Database, kind?: Note["kind"]): Note[] {
  const rows = (
    kind
      ? db.prepare("SELECT * FROM notes WHERE kind = ? ORDER BY pinned DESC, updated_at DESC").all(kind)
      : db.prepare("SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC").all()
  ) as Row[];
  return rows.map(rowToNote);
}

export function saveNote(db: Database, patch: Partial<Note> & { id?: string }): Note {
  const existing = patch.id
    ? ((db.prepare("SELECT * FROM notes WHERE id = ?").get(patch.id) as Row | undefined) ?? null)
    : null;
  const base = existing ? rowToNote(existing) : null;
  const note: Note = {
    id: base?.id ?? newId(),
    title: patch.title ?? base?.title ?? "Untitled",
    content: patch.content ?? base?.content ?? "",
    tags: patch.tags ?? base?.tags ?? [],
    pinned: patch.pinned ?? base?.pinned ?? false,
    kind: patch.kind ?? base?.kind ?? "note",
    createdAt: base?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
  db.prepare(
    `INSERT INTO notes (id, title, content, tags, pinned, kind, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title, content = excluded.content, tags = excluded.tags,
       pinned = excluded.pinned, kind = excluded.kind, updated_at = excluded.updated_at`,
  ).run(
    note.id,
    note.title,
    note.content,
    JSON.stringify(note.tags),
    note.pinned ? 1 : 0,
    note.kind,
    note.createdAt,
    note.updatedAt,
  );
  return note;
}

export function deleteNote(db: Database, id: string): void {
  db.prepare("DELETE FROM notes WHERE id = ?").run(id);
}

/** Finds or creates today's daily note. */
export function dailyNote(db: Database): Note {
  const today = new Date().toISOString().slice(0, 10);
  const title = `Daily note — ${today}`;
  const row = db.prepare("SELECT * FROM notes WHERE title = ?").get(title) as Row | undefined;
  if (row) return rowToNote(row);
  return saveNote(db, { title, content: `# ${title}\n\n`, kind: "journal" });
}

function rowToNote(r: Row): Note {
  return {
    id: r.id as string,
    title: r.title as string,
    content: r.content as string,
    tags: JSON.parse((r.tags as string) || "[]"),
    pinned: r.pinned === 1,
    kind: r.kind as Note["kind"],
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

// -- tasks -------------------------------------------------------------------

export function listTasks(db: Database): TaskItem[] {
  const rows = db
    .prepare(
      "SELECT * FROM tasks ORDER BY CASE status WHEN 'done' THEN 1 ELSE 0 END, due_date IS NULL, due_date ASC, created_at DESC",
    )
    .all() as Row[];
  return rows.map(rowToTask);
}

export function saveTask(db: Database, patch: Partial<TaskItem> & { id?: string }): TaskItem {
  const existing = patch.id
    ? ((db.prepare("SELECT * FROM tasks WHERE id = ?").get(patch.id) as Row | undefined) ?? null)
    : null;
  const base = existing ? rowToTask(existing) : null;
  const status = patch.status ?? base?.status ?? "todo";
  const task: TaskItem = {
    id: base?.id ?? newId(),
    title: patch.title ?? base?.title ?? "Untitled task",
    notes: patch.notes ?? base?.notes ?? "",
    dueDate: patch.dueDate !== undefined ? patch.dueDate : (base?.dueDate ?? null),
    priority: patch.priority ?? base?.priority ?? "medium",
    status,
    projectId: patch.projectId !== undefined ? patch.projectId : (base?.projectId ?? null),
    createdAt: base?.createdAt ?? nowIso(),
    completedAt: status === "done" ? (base?.completedAt ?? nowIso()) : null,
  };
  db.prepare(
    `INSERT INTO tasks (id, title, notes, due_date, priority, status, project_id, created_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title, notes = excluded.notes, due_date = excluded.due_date,
       priority = excluded.priority, status = excluded.status, project_id = excluded.project_id,
       completed_at = excluded.completed_at`,
  ).run(
    task.id, task.title, task.notes, task.dueDate, task.priority,
    task.status, task.projectId, task.createdAt, task.completedAt,
  );
  return task;
}

export function deleteTask(db: Database, id: string): void {
  db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
}

function rowToTask(r: Row): TaskItem {
  return {
    id: r.id as string,
    title: r.title as string,
    notes: r.notes as string,
    dueDate: (r.due_date as string) ?? null,
    priority: r.priority as TaskItem["priority"],
    status: r.status as TaskItem["status"],
    projectId: (r.project_id as string) ?? null,
    createdAt: r.created_at as string,
    completedAt: (r.completed_at as string) ?? null,
  };
}

// -- calendar events ---------------------------------------------------------

export function listEvents(db: Database): CalendarEvent[] {
  const rows = db.prepare("SELECT * FROM events ORDER BY start ASC").all() as Row[];
  return rows.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    start: r.start as string,
    end: r.end as string,
    allDay: r.all_day === 1,
    location: r.location as string,
    notes: r.notes as string,
    createdAt: r.created_at as string,
  }));
}

export function saveEvent(
  db: Database,
  patch: Partial<CalendarEvent> & { id?: string },
): CalendarEvent {
  const id = patch.id ?? newId();
  const existing = db.prepare("SELECT * FROM events WHERE id = ?").get(id) as Row | undefined;
  const start = patch.start ?? (existing?.start as string) ?? nowIso();
  const event: CalendarEvent = {
    id,
    title: patch.title ?? (existing?.title as string) ?? "Untitled event",
    start,
    end: patch.end ?? (existing?.end as string) ?? start,
    allDay: patch.allDay ?? existing?.all_day === 1,
    location: patch.location ?? (existing?.location as string) ?? "",
    notes: patch.notes ?? (existing?.notes as string) ?? "",
    createdAt: (existing?.created_at as string) ?? nowIso(),
  };
  db.prepare(
    `INSERT INTO events (id, title, start, end, all_day, location, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title, start = excluded.start, end = excluded.end,
       all_day = excluded.all_day, location = excluded.location, notes = excluded.notes`,
  ).run(
    event.id, event.title, event.start, event.end,
    event.allDay ? 1 : 0, event.location, event.notes, event.createdAt,
  );
  return event;
}

export function deleteEvent(db: Database, id: string): void {
  db.prepare("DELETE FROM events WHERE id = ?").run(id);
}

// -- projects ----------------------------------------------------------------

export function listProjects(db: Database): Project[] {
  const rows = db.prepare("SELECT * FROM projects ORDER BY updated_at DESC").all() as Row[];
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    description: r.description as string,
    path: r.path as string,
    status: r.status as Project["status"],
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }));
}

export function saveProject(db: Database, patch: Partial<Project> & { id?: string }): Project {
  const id = patch.id ?? newId();
  const existing = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Row | undefined;
  const project: Project = {
    id,
    name: patch.name ?? (existing?.name as string) ?? "Untitled project",
    description: patch.description ?? (existing?.description as string) ?? "",
    path: patch.path ?? (existing?.path as string) ?? "",
    status: patch.status ?? ((existing?.status as Project["status"]) || "active"),
    createdAt: (existing?.created_at as string) ?? nowIso(),
    updatedAt: nowIso(),
  };
  db.prepare(
    `INSERT INTO projects (id, name, description, path, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name, description = excluded.description, path = excluded.path,
       status = excluded.status, updated_at = excluded.updated_at`,
  ).run(
    project.id, project.name, project.description, project.path,
    project.status, project.createdAt, project.updatedAt,
  );
  return project;
}

export function deleteProject(db: Database, id: string): void {
  db.prepare("DELETE FROM projects WHERE id = ?").run(id);
}

// -- reminders ----------------------------------------------------------------

export function listReminders(db: Database): Reminder[] {
  const rows = db.prepare("SELECT * FROM reminders ORDER BY fire_at ASC").all() as Row[];
  return rows.map((r) => ({
    id: r.id as string,
    message: r.message as string,
    fireAt: r.fire_at as string,
    fired: r.fired === 1,
    createdAt: r.created_at as string,
  }));
}

export function saveReminder(db: Database, message: string, fireAt: string): Reminder {
  const reminder: Reminder = { id: newId(), message, fireAt, fired: false, createdAt: nowIso() };
  db.prepare(
    "INSERT INTO reminders (id, message, fire_at, fired, created_at) VALUES (?, ?, ?, 0, ?)",
  ).run(reminder.id, reminder.message, reminder.fireAt, reminder.createdAt);
  return reminder;
}

export function deleteReminder(db: Database, id: string): void {
  db.prepare("DELETE FROM reminders WHERE id = ?").run(id);
}

export function dueReminders(db: Database): Reminder[] {
  const rows = db
    .prepare("SELECT * FROM reminders WHERE fired = 0 AND fire_at <= ?")
    .all(nowIso()) as Row[];
  return rows.map((r) => ({
    id: r.id as string,
    message: r.message as string,
    fireAt: r.fire_at as string,
    fired: false,
    createdAt: r.created_at as string,
  }));
}

export function markReminderFired(db: Database, id: string): void {
  db.prepare("UPDATE reminders SET fired = 1 WHERE id = ?").run(id);
}

// -- memory ------------------------------------------------------------------

export function listMemory(db: Database, category?: string): MemoryEntry[] {
  const rows = (
    category
      ? db.prepare("SELECT * FROM memory WHERE category = ? ORDER BY importance DESC, created_at DESC").all(category)
      : db.prepare("SELECT * FROM memory ORDER BY importance DESC, created_at DESC").all()
  ) as Row[];
  return rows.map(rowToMemory);
}

export function saveMemory(db: Database, patch: Partial<MemoryEntry> & { id?: string }): MemoryEntry {
  const id = patch.id ?? newId();
  const existing = db.prepare("SELECT * FROM memory WHERE id = ?").get(id) as Row | undefined;
  const entry: MemoryEntry = {
    id,
    category: patch.category ?? ((existing?.category as MemoryEntry["category"]) || "fact"),
    key: patch.key ?? (existing?.key as string) ?? "",
    value: patch.value ?? (existing?.value as string) ?? "",
    importance: patch.importance ?? ((existing?.importance as number) || 3),
    lastUsedAt: patch.lastUsedAt ?? ((existing?.last_used_at as string) || null),
    createdAt: (existing?.created_at as string) ?? nowIso(),
  };
  db.prepare(
    `INSERT INTO memory (id, category, key, value, importance, last_used_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       category = excluded.category, key = excluded.key, value = excluded.value,
       importance = excluded.importance, last_used_at = excluded.last_used_at`,
  ).run(entry.id, entry.category, entry.key, entry.value, entry.importance, entry.lastUsedAt, entry.createdAt);
  return entry;
}

export function deleteMemory(db: Database, id: string): void {
  db.prepare("DELETE FROM memory WHERE id = ?").run(id);
}

/** Renders top memories into a system-prompt fragment for the AI router. */
export function memoryContext(db: Database, limit = 24): string {
  const rows = db
    .prepare("SELECT category, key, value FROM memory ORDER BY importance DESC, created_at DESC LIMIT ?")
    .all(limit) as Row[];
  if (rows.length === 0) return "";
  const lines = rows.map((r) => `- [${r.category}] ${r.key}: ${r.value}`);
  return `Long-term memory about the user (use when relevant, never recite verbatim):\n${lines.join("\n")}`;
}

function rowToMemory(r: Row): MemoryEntry {
  return {
    id: r.id as string,
    category: r.category as MemoryEntry["category"],
    key: r.key as string,
    value: r.value as string,
    importance: r.importance as number,
    lastUsedAt: (r.last_used_at as string) ?? null,
    createdAt: r.created_at as string,
  };
}

// -- command history -----------------------------------------------------------

export function recordCommand(
  db: Database,
  entry: Omit<CommandHistoryEntry, "id" | "createdAt">,
): CommandHistoryEntry {
  const full: CommandHistoryEntry = { ...entry, id: newId(), createdAt: nowIso() };
  db.prepare(
    "INSERT INTO command_history (id, input, intent_kind, status, output, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(full.id, full.input, full.intentKind, full.status, full.output, full.createdAt);
  return full;
}

export function listCommandHistory(db: Database, limit = 50): CommandHistoryEntry[] {
  const rows = db
    .prepare("SELECT * FROM command_history ORDER BY created_at DESC LIMIT ?")
    .all(limit) as Row[];
  return rows.map((r) => ({
    id: r.id as string,
    input: r.input as string,
    intentKind: (r.intent_kind as string) ?? null,
    status: r.status as CommandHistoryEntry["status"],
    output: r.output as string,
    createdAt: r.created_at as string,
  }));
}
