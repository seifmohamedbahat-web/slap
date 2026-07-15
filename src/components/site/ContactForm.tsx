"use client";

import { useState, type FormEvent } from "react";
import Icon from "@/components/Icon";

const BUDGETS = ["Under $1,000", "$1,000 – $3,000", "$3,000 – $5,000", "$5,000+", "Not sure yet"];

export default function ContactForm({ serviceOptions }: { serviceOptions: string[] }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    setStatus("submitting");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Something went wrong. Please try again.");
      }
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="flex h-full min-h-[380px] flex-col items-center justify-center rounded-3xl border border-emerald-200 bg-emerald-50 p-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Icon name="check" size={26} />
        </span>
        <h3 className="font-display mt-5 text-xl font-semibold text-ink">Message received — you&apos;re on the launchpad! 🚀</h3>
        <p className="mt-2 max-w-sm text-sm text-ink-soft">
          Thanks for reaching out. We&apos;ll reply within one business day with next steps and your
          free quote.
        </p>
        <button type="button" onClick={() => setStatus("idle")} className="btn-ghost mt-7 !py-2.5 text-sm">
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="shadow-card rounded-3xl border border-ink/5 bg-white p-7 sm:p-9">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-name" className="field-label">
            Name *
          </label>
          <input id="cf-name" name="name" required maxLength={120} className="field" placeholder="Jane Cooper" />
        </div>
        <div>
          <label htmlFor="cf-email" className="field-label">
            Email *
          </label>
          <input
            id="cf-email"
            name="email"
            type="email"
            required
            maxLength={200}
            className="field"
            placeholder="jane@company.com"
          />
        </div>
        <div>
          <label htmlFor="cf-phone" className="field-label">
            Phone <span className="font-normal normal-case">(optional)</span>
          </label>
          <input id="cf-phone" name="phone" type="tel" maxLength={40} className="field" placeholder="+1 555 000 0000" />
        </div>
        <div>
          <label htmlFor="cf-service" className="field-label">
            I&apos;m interested in
          </label>
          <select id="cf-service" name="service" className="field" defaultValue="">
            <option value="">Choose a service…</option>
            {serviceOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            <option value="Something else">Something else</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="cf-budget" className="field-label">
            Budget <span className="font-normal normal-case">(optional)</span>
          </label>
          <select id="cf-budget" name="budget" className="field" defaultValue="">
            <option value="">Choose a range…</option>
            {BUDGETS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="cf-message" className="field-label">
            Project details *
          </label>
          <textarea
            id="cf-message"
            name="message"
            required
            maxLength={4000}
            rows={5}
            className="field resize-y"
            placeholder="Tell us about your business and what you'd like to build…"
          />
        </div>
      </div>

      {status === "error" && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={status === "submitting"} className="btn-primary mt-6 w-full disabled:cursor-wait disabled:opacity-60">
        {status === "submitting" ? "Sending…" : "Request My Free Quote"}
        <Icon name="arrow-right" size={16} />
      </button>
      <p className="mt-3 text-center text-xs text-ink-soft">
        No spam, no obligation — just a friendly reply within one business day.
      </p>
    </form>
  );
}
