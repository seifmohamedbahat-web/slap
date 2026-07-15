"use client";

import { useEffect, useState, type FormEvent } from "react";
import Icon from "@/components/Icon";

const SLOTS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function BookingForm({ serviceOptions }: { serviceOptions: string[] }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [taken, setTaken] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState({ date: "", time: "" });

  // grey out slots that are already booked for the chosen day
  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    fetch(`/api/bookings?date=${date}`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && Array.isArray(j.taken)) setTaken(j.taken);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [date]);

  useEffect(() => {
    if (time && taken.includes(time)) setTime("");
  }, [taken, time]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    if (!time) {
      setStatus("error");
      setError("Please pick a time slot for your call.");
      return;
    }

    setStatus("submitting");
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, date, time }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Something went wrong. Please try again.");
      setConfirmed({ date, time });
      setStatus("success");
      form.reset();
      setDate("");
      setTime("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      // refresh availability in case the slot was taken meanwhile
      if (date) {
        fetch(`/api/bookings?date=${date}`)
          .then((r) => r.json())
          .then((j) => Array.isArray(j.taken) && setTaken(j.taken))
          .catch(() => {});
      }
    }
  }

  if (status === "success") {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-3xl border border-white/15 bg-white/5 p-10 text-center backdrop-blur">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-ink">
          <Icon name="calendar" size={24} />
        </span>
        <h3 className="font-display mt-5 text-xl font-semibold text-white">
          You&apos;re booked for {confirmed.date} at {confirmed.time} 🚀
        </h3>
        <p className="mt-2 max-w-sm text-sm text-white/65">
          We&apos;ve saved your appointment and will confirm it by email shortly. Talk soon!
        </p>
        <button type="button" onClick={() => setStatus("idle")} className="btn-dark-ghost mt-7 !py-2.5 text-sm">
          Book another call
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-white/15 bg-white/5 p-7 backdrop-blur sm:p-9">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="bk-name" className="mb-1.5 block text-xs font-semibold tracking-wide text-white/60 uppercase">
            Name *
          </label>
          <input id="bk-name" name="name" required maxLength={120} placeholder="Jane Cooper" className="booking-field" />
        </div>
        <div>
          <label htmlFor="bk-email" className="mb-1.5 block text-xs font-semibold tracking-wide text-white/60 uppercase">
            Email *
          </label>
          <input id="bk-email" name="email" type="email" required maxLength={200} placeholder="jane@company.com" className="booking-field" />
        </div>
        <div>
          <label htmlFor="bk-phone" className="mb-1.5 block text-xs font-semibold tracking-wide text-white/60 uppercase">
            Phone
          </label>
          <input id="bk-phone" name="phone" type="tel" maxLength={40} placeholder="+1 555 000 0000" className="booking-field" />
        </div>
        <div>
          <label htmlFor="bk-service" className="mb-1.5 block text-xs font-semibold tracking-wide text-white/60 uppercase">
            Topic
          </label>
          <select id="bk-service" name="service" defaultValue="" className="booking-field">
            <option value="" className="text-ink">
              What&apos;s the call about?
            </option>
            {serviceOptions.map((s) => (
              <option key={s} value={s} className="text-ink">
                {s}
              </option>
            ))}
            <option value="Something else" className="text-ink">
              Something else
            </option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="bk-date" className="mb-1.5 block text-xs font-semibold tracking-wide text-white/60 uppercase">
            Pick a day *
          </label>
          <input
            id="bk-date"
            type="date"
            required
            min={todayIso()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="booking-field [color-scheme:dark]"
          />
        </div>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-xs font-semibold tracking-wide text-white/60 uppercase">
            Pick a time * <span className="font-normal normal-case">(your local business hours)</span>
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {SLOTS.map((slot) => {
              const isTaken = taken.includes(slot);
              const selected = time === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={!date || isTaken}
                  onClick={() => setTime(slot)}
                  className={`rounded-xl border px-2 py-2.5 text-sm font-semibold transition ${
                    selected
                      ? "border-accent bg-accent text-ink"
                      : isTaken
                        ? "cursor-not-allowed border-white/10 text-white/25 line-through"
                        : "border-white/20 text-white/85 hover:border-accent/70 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
          {!date && <p className="mt-2 text-xs text-white/45">Choose a day first to see available times.</p>}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="bk-notes" className="mb-1.5 block text-xs font-semibold tracking-wide text-white/60 uppercase">
            Anything we should know?
          </label>
          <textarea
            id="bk-notes"
            name="notes"
            rows={3}
            maxLength={2000}
            placeholder="Tell us briefly about your business or project…"
            className="booking-field resize-y"
          />
        </div>
      </div>

      {status === "error" && (
        <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-3 text-sm font-medium text-red-200" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={status === "submitting"} className="btn-primary mt-6 w-full disabled:cursor-wait disabled:opacity-60">
        {status === "submitting" ? "Booking…" : "Book My Free Call"}
        <Icon name="calendar" size={16} />
      </button>
      <p className="mt-3 text-center text-xs text-white/45">
        15–30 minutes, free, no obligation — reschedule or cancel anytime.
      </p>
    </form>
  );
}
