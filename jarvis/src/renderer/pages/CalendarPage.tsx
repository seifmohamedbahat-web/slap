import { useMemo, useState } from "react";
import { api } from "../lib/api";
import type { CalendarEvent } from "@shared/types";
import { useAsync } from "../lib/hooks";
import { Button, Field, GlassCard, IconButton, Modal, PageHeader, cx, useToast } from "../components/ui";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarPage() {
  const { push } = useToast();
  const events = useAsync(() => api.invoke("events:list", undefined), []);
  const [cursor, setCursor] = useState(() => new Date());
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", time: "09:00", location: "" });

  const grid = useMemo(() => buildMonth(cursor), [cursor]);
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events.data ?? []) {
      const key = e.start.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return map;
  }, [events.data]);

  async function addEvent() {
    if (!modalDate || !form.title.trim()) return;
    const start = `${modalDate}T${form.time}:00`;
    const end = `${modalDate}T${incrementHour(form.time)}:00`;
    await api.invoke("events:save", { title: form.title.trim(), start, end, location: form.location });
    push("Event added", "success");
    setModalDate(null);
    setForm({ title: "", time: "09:00", location: "" });
    await events.reload();
  }

  async function remove(id: string) {
    await api.invoke("events:delete", { id });
    await events.reload();
  }

  const monthLabel = cursor.toLocaleDateString("en", { month: "long", year: "numeric" });
  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Plan events and see them on the dashboard."
        icon="calendar"
        actions={
          <div className="flex items-center gap-2">
            <IconButton icon="chevron" label="Previous month" onClick={() => setCursor(addMonths(cursor, -1))} />
            <span className="min-w-[9rem] text-center text-sm font-medium text-ink-primary">{monthLabel}</span>
            <IconButton icon="chevron" label="Next month" onClick={() => setCursor(addMonths(cursor, 1))} />
          </div>
        }
      />

      <GlassCard className="p-4">
        <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-medium uppercase tracking-wide text-ink-muted">
          {WEEKDAYS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {grid.map((day) => {
            const key = day.date.toISOString().slice(0, 10);
            const dayEvents = eventsByDay.get(key) ?? [];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setModalDate(key)}
                className={cx(
                  "flex min-h-[92px] flex-col rounded-xl border p-2 text-left transition-colors",
                  day.inMonth ? "border-white/8 hover:border-neon-400/30" : "border-transparent opacity-40",
                  key === todayKey && "border-neon-400/50 bg-neon-500/8",
                )}
              >
                <span className={cx("text-xs font-medium", key === todayKey ? "text-neon-300" : "text-ink-secondary")}>
                  {day.date.getDate()}
                </span>
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 3).map((e) => (
                    <div
                      key={e.id}
                      className="group flex items-center justify-between rounded bg-neon-500/15 px-1.5 py-0.5 text-[10px] text-ink-primary"
                    >
                      <span className="truncate">{e.title}</span>
                      <span
                        className="opacity-0 group-hover:opacity-100"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          void remove(e.id);
                        }}
                      >
                        ✕
                      </span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && <span className="text-[10px] text-ink-muted">+{dayEvents.length - 3} more</span>}
                </div>
              </button>
            );
          })}
        </div>
      </GlassCard>

      <Modal
        open={modalDate !== null}
        onClose={() => setModalDate(null)}
        title={`New event · ${modalDate ?? ""}`}
        footer={
          <>
            <Button onClick={() => setModalDate(null)}>Cancel</Button>
            <Button variant="primary" onClick={addEvent} disabled={!form.title.trim()}>
              Add event
            </Button>
          </>
        }
      >
        <Field label="Title">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Time">
            <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="input" />
          </Field>
          <Field label="Location">
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

function buildMonth(cursor: Date): { date: Date; inMonth: boolean }[] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return { date, inMonth: date.getMonth() === month };
  });
}

function addMonths(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setMonth(date.getMonth() + delta);
  return next;
}

function incrementHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
