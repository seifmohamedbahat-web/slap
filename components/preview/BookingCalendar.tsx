"use client";

import { useMemo, useState } from "react";
import { addDays, format, setHours, setMinutes, startOfDay } from "date-fns";
import { Check, Loader2 } from "lucide-react";

type Service = { name: string; durationMins: number; price: number };
type Staff = { name: string; role: string };
type Availability = Record<string, string[]>;

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function slotsForDay(day: Date, ranges: string[], durationMins: number): Date[] {
  const slots: Date[] = [];
  for (const range of ranges) {
    const [startStr, endStr] = range.split("-");
    const [startH, startM] = startStr.split(":").map(Number);
    const [endH, endM] = endStr.split(":").map(Number);
    let cursor = setMinutes(setHours(startOfDay(day), startH), startM);
    const end = setMinutes(setHours(startOfDay(day), endH), endM);
    while (cursor < end) {
      slots.push(cursor);
      cursor = new Date(cursor.getTime() + durationMins * 60000);
    }
  }
  return slots;
}

export function BookingCalendar({
  leadId,
  businessName,
  services,
  staff,
  availability,
  accent,
}: {
  leadId: string;
  businessName: string;
  services: Service[];
  staff: Staff[];
  availability: Availability;
  accent: string;
}) {
  const [service, setService] = useState(services[0]);
  const [dayOffset, setDayOffset] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const day = useMemo(() => addDays(startOfDay(new Date()), dayOffset), [dayOffset]);
  const dayKey = DAY_KEYS[day.getDay()];
  const slots = useMemo(
    () => slotsForDay(day, availability[dayKey] ?? [], service?.durationMins ?? 30),
    [day, dayKey, availability, service]
  );

  async function submit() {
    if (!selectedSlot || !name) return;
    setSubmitting(true);
    try {
      await fetch(`/api/leads/${leadId}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerEmail: email,
          service: service.name,
          staff: staff[0]?.name,
          startsAt: selectedSlot.toISOString(),
          durationMins: service.durationMins,
        }),
      });
      setConfirmed(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-neutral-200 p-8 text-center">
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: `${accent}15`, color: accent }}
        >
          <Check className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-xl font-bold">You&apos;re booked!</h2>
        <p className="mt-2 text-sm text-neutral-600">
          {service.name} with {businessName} on {selectedSlot && format(selectedSlot, "EEEE, MMM d 'at' h:mm a")}.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium">Service</label>
        <div className="flex flex-wrap gap-2">
          {services.map((s) => (
            <button
              key={s.name}
              onClick={() => {
                setService(s);
                setSelectedSlot(null);
              }}
              className="rounded-full border px-4 py-2 text-sm"
              style={
                service?.name === s.name
                  ? { borderColor: accent, color: accent, backgroundColor: `${accent}10` }
                  : { borderColor: "#e5e5e5" }
              }
            >
              {s.name} · {s.durationMins}min{s.price > 0 ? ` · $${s.price}` : " · Free"}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium">{format(day, "EEEE, MMM d")}</label>
          <div className="flex gap-2">
            <button
              onClick={() => setDayOffset((d) => Math.max(0, d - 1))}
              className="rounded-full border border-neutral-200 px-3 py-1 text-xs"
            >
              ← Prev
            </button>
            <button
              onClick={() => setDayOffset((d) => d + 1)}
              className="rounded-full border border-neutral-200 px-3 py-1 text-xs"
            >
              Next →
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.length === 0 && (
            <p className="col-span-full text-sm text-neutral-500">No availability this day.</p>
          )}
          {slots.map((slot) => (
            <button
              key={slot.toISOString()}
              onClick={() => setSelectedSlot(slot)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={
                selectedSlot?.getTime() === slot.getTime()
                  ? { borderColor: accent, backgroundColor: accent, color: "white" }
                  : { borderColor: "#e5e5e5" }
              }
            >
              {format(slot, "h:mm a")}
            </button>
          ))}
        </div>
      </div>

      {selectedSlot && (
        <div className="space-y-3 rounded-xl border border-neutral-200 p-5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 outline-none"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-lg border border-neutral-200 px-4 py-2.5 outline-none"
          />
          <button
            onClick={submit}
            disabled={!name || submitting}
            className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: accent }}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm Booking
          </button>
        </div>
      )}
    </div>
  );
}
