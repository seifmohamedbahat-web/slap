import { describe, expect, it, beforeEach } from "vitest";
import { openDatabase, type Database } from "../../core/db";
import {
  deleteNote,
  dailyNote,
  listMemory,
  listNotes,
  listTasks,
  memoryContext,
  saveMemory,
  saveNote,
  saveReminder,
  dueReminders,
  markReminderFired,
  saveTask,
} from "./store";

let db: Database;

beforeEach(() => {
  db = openDatabase(":memory:");
});

describe("notes", () => {
  it("creates and lists notes, pinned first", () => {
    saveNote(db, { title: "A", content: "first" });
    const pinned = saveNote(db, { title: "B", content: "second", pinned: true });
    const notes = listNotes(db);
    expect(notes).toHaveLength(2);
    expect(notes[0].id).toBe(pinned.id);
  });

  it("updates an existing note in place", () => {
    const note = saveNote(db, { title: "Draft", content: "v1" });
    const updated = saveNote(db, { id: note.id, content: "v2" });
    expect(updated.id).toBe(note.id);
    expect(updated.content).toBe("v2");
    expect(listNotes(db)).toHaveLength(1);
  });

  it("finds or creates today's daily note idempotently", () => {
    const a = dailyNote(db);
    const b = dailyNote(db);
    expect(a.id).toBe(b.id);
    expect(a.kind).toBe("journal");
  });

  it("deletes notes", () => {
    const note = saveNote(db, { title: "Temp" });
    deleteNote(db, note.id);
    expect(listNotes(db)).toHaveLength(0);
  });
});

describe("tasks", () => {
  it("sets completedAt only when done", () => {
    const task = saveTask(db, { title: "Ship it" });
    expect(task.completedAt).toBeNull();
    const done = saveTask(db, { id: task.id, status: "done" });
    expect(done.completedAt).not.toBeNull();
  });

  it("orders done tasks last", () => {
    const a = saveTask(db, { title: "open" });
    saveTask(db, { id: a.id, status: "done" });
    saveTask(db, { title: "still open" });
    const tasks = listTasks(db);
    expect(tasks[tasks.length - 1].status).toBe("done");
  });
});

describe("memory", () => {
  it("renders a memory context string", () => {
    saveMemory(db, { category: "preference", key: "Editor", value: "VS Code", importance: 5 });
    saveMemory(db, { category: "fact", key: "City", value: "Cairo", importance: 3 });
    const ctx = memoryContext(db);
    expect(ctx).toContain("Editor");
    expect(ctx).toContain("VS Code");
    // Higher importance should sort first.
    expect(ctx.indexOf("Editor")).toBeLessThan(ctx.indexOf("City"));
  });

  it("returns empty context when no memory exists", () => {
    expect(memoryContext(db)).toBe("");
  });

  it("filters memory by category", () => {
    saveMemory(db, { category: "preference", key: "K1", value: "V1" });
    saveMemory(db, { category: "business", key: "K2", value: "V2" });
    expect(listMemory(db, "business")).toHaveLength(1);
  });
});

describe("reminders", () => {
  it("returns only due reminders and marks them fired", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    const future = new Date(Date.now() + 60_000).toISOString();
    const due = saveReminder(db, "past", past);
    saveReminder(db, "future", future);
    const list = dueReminders(db);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(due.id);
    markReminderFired(db, due.id);
    expect(dueReminders(db)).toHaveLength(0);
  });
});
