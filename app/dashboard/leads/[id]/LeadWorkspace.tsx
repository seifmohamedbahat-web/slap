"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Globe,
  CalendarClock,
  LayoutDashboard,
  Send,
  Loader2,
  ExternalLink,
  Check,
  Mail,
} from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

type OutreachMessage = {
  id: string;
  channel: string;
  status: string;
  subject: string | null;
  body: string;
};

type LeadData = {
  id: string;
  slug: string;
  businessName: string;
  category: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  status: string;
  googleRating: number | null;
  reviewCount: number | null;
  verificationNote: string | null;
  profile: {
    industry: string | null;
    brandStyle: string | null;
    toneOfVoice: string | null;
    usp: string | null;
    targetCustomers: string | null;
    summary: string | null;
    services: string | null;
  } | null;
  score: {
    leadScore: number;
    closingProbability: number;
    businessQuality: number;
    growthPotential: number;
    priority: string;
    aiConfidence: number;
    needsBooking: boolean;
    needsDashboard: boolean;
    reasoning: string;
    suggestedPriceLow: number | null;
    suggestedPriceHigh: number | null;
  } | null;
  website: { status: string; previewPath: string | null } | null;
  bookingSystem: { status: string } | null;
  adminDashboard: { status: string; templateKey: string | null } | null;
  outreachMessages: OutreachMessage[];
};

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function LeadWorkspace({ lead }: { lead: LeadData }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    fn()
      .then(() => router.refresh())
      .finally(() => setBusy(null));
  }

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex flex-wrap gap-3">
        <ActionButton
          icon={Sparkles}
          label="Analyze Business"
          busy={busy === "analyze"}
          onClick={() => run("analyze", () => postJson(`/api/leads/${lead.id}/analyze`))}
        />
        <ActionButton
          icon={Globe}
          label={lead.website?.status === "READY" ? "Regenerate Website" : "Generate Website"}
          busy={busy === "website"}
          disabled={!lead.profile}
          onClick={() => run("website", () => postJson(`/api/leads/${lead.id}/generate-website`))}
        />
        <ActionButton
          icon={CalendarClock}
          label="Generate Booking System"
          busy={busy === "booking"}
          disabled={!lead.score?.needsBooking}
          onClick={() => run("booking", () => postJson(`/api/leads/${lead.id}/generate-booking`))}
        />
        <ActionButton
          icon={LayoutDashboard}
          label="Generate Admin Dashboard"
          busy={busy === "dashboard"}
          disabled={!lead.score?.needsDashboard}
          onClick={() => run("dashboard", () => postJson(`/api/leads/${lead.id}/generate-dashboard`))}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {lead.score && <ScorePanel score={lead.score} />}
          {lead.profile && <ProfilePanel profile={lead.profile} />}
          <AssetsPanel lead={lead} />
        </div>
        <OutreachPanel leadId={lead.id} messages={lead.outreachMessages} onChange={() => router.refresh()} />
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  busy,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className="flex items-center gap-2 rounded-full border border-avexa-border bg-avexa-card px-4 py-2 text-sm font-medium transition hover:border-avexa-accent disabled:cursor-not-allowed disabled:opacity-40"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </button>
  );
}

function ScorePanel({ score }: { score: NonNullable<LeadData["score"]> }) {
  const metrics = [
    { label: "Lead Score", value: score.leadScore },
    { label: "Closing Probability", value: score.closingProbability },
    { label: "Business Quality", value: score.businessQuality },
    { label: "Growth Potential", value: score.growthPotential },
    { label: "AI Confidence", value: score.aiConfidence },
  ];

  return (
    <div className="rounded-2xl border border-avexa-border bg-avexa-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">AI Qualification</h3>
        <span className="rounded-full bg-avexa-accent/15 px-2.5 py-1 text-xs font-medium capitalize text-avexa-accent">
          {score.priority} priority
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="text-2xl font-bold tabular-nums">{m.value}</div>
            <div className="mt-0.5 text-xs text-avexa-fg-muted">{m.label}</div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm leading-relaxed text-avexa-fg-muted">{score.reasoning}</p>
      <p className="mt-3 text-sm">
        Suggested package:{" "}
        <span className="font-semibold text-avexa-accent">
          ${(score.suggestedPriceLow ?? 0).toLocaleString()}–${(score.suggestedPriceHigh ?? 0).toLocaleString()}
        </span>
      </p>
    </div>
  );
}

function ProfilePanel({ profile }: { profile: NonNullable<LeadData["profile"]> }) {
  const services: string[] = profile.services ? JSON.parse(profile.services) : [];
  return (
    <div className="rounded-2xl border border-avexa-border bg-avexa-card p-6">
      <h3 className="text-sm font-semibold">Business Profile</h3>
      <p className="mt-3 text-sm leading-relaxed text-avexa-fg-muted">{profile.summary}</p>
      <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-avexa-fg-muted">Brand Style</dt>
          <dd className="mt-1 text-sm">{profile.brandStyle}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-avexa-fg-muted">Tone of Voice</dt>
          <dd className="mt-1 text-sm">{profile.toneOfVoice}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase tracking-wide text-avexa-fg-muted">USP</dt>
          <dd className="mt-1 text-sm">{profile.usp}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase tracking-wide text-avexa-fg-muted">Services</dt>
          <dd className="mt-1 flex flex-wrap gap-2">
            {services.map((s) => (
              <span key={s} className="rounded-full bg-avexa-border px-2.5 py-1 text-xs">
                {s}
              </span>
            ))}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function AssetsPanel({ lead }: { lead: LeadData }) {
  const items = [
    {
      label: "Website",
      status: lead.website?.status ?? "PENDING",
      href: lead.website?.previewPath ?? undefined,
    },
    { label: "Booking System", status: lead.bookingSystem?.status ?? "NOT_NEEDED", href: `/preview/${lead.slug}/booking` },
    {
      label: "Admin Dashboard",
      status: lead.adminDashboard?.status ?? "NOT_NEEDED",
      href: `/preview/${lead.slug}/admin`,
    },
  ];

  return (
    <div className="rounded-2xl border border-avexa-border bg-avexa-card p-6">
      <h3 className="text-sm font-semibold">Generated Assets</h3>
      <div className="mt-4 divide-y divide-avexa-border">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between py-3">
            <span className="text-sm">{item.label}</span>
            <div className="flex items-center gap-3">
              <StatusBadge status={item.status} />
              {item.status === "READY" && item.href && (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-avexa-accent hover:underline"
                >
                  Preview <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CHANNELS = ["EMAIL", "SMS", "INSTAGRAM_DM"];

function OutreachPanel({
  leadId,
  messages,
  onChange,
}: {
  leadId: string;
  messages: OutreachMessage[];
  onChange: () => void;
}) {
  const [channel, setChannel] = useState("EMAIL");
  const [busy, setBusy] = useState<string | null>(null);

  function draft() {
    setBusy("draft");
    postJson(`/api/leads/${leadId}/outreach`, { channel })
      .then(onChange)
      .finally(() => setBusy(null));
  }

  function act(messageId: string, action: "approve" | "send") {
    setBusy(messageId + action);
    fetch(`/api/leads/${leadId}/outreach/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
      .then(onChange)
      .finally(() => setBusy(null));
  }

  return (
    <div className="rounded-2xl border border-avexa-border bg-avexa-card p-6">
      <h3 className="text-sm font-semibold">Outreach</h3>
      <p className="mt-1 text-xs text-avexa-fg-muted">
        Drafts require manual approval before they can be sent.
      </p>

      <div className="mt-4 flex gap-2">
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="rounded-lg border border-avexa-border bg-avexa-bg px-3 py-2 text-sm outline-none focus:border-avexa-accent"
        >
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <button
          onClick={draft}
          disabled={busy === "draft"}
          className="flex items-center gap-2 rounded-full bg-avexa-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-avexa-accent-hover disabled:opacity-60"
        >
          {busy === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Draft
        </button>
      </div>

      <div className="mt-5 space-y-4">
        {messages.length === 0 && (
          <p className="text-sm text-avexa-fg-muted">No outreach drafted yet.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="rounded-xl border border-avexa-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-avexa-fg-muted">
                {m.channel.replace(/_/g, " ")}
              </span>
              <StatusBadge status={m.status} />
            </div>
            {m.subject && <p className="mt-2 text-sm font-medium">{m.subject}</p>}
            <p className="mt-1 whitespace-pre-wrap text-sm text-avexa-fg-muted">{m.body}</p>
            <div className="mt-3 flex gap-2">
              {m.status === "DRAFT" && (
                <button
                  onClick={() => act(m.id, "approve")}
                  disabled={busy === m.id + "approve"}
                  className="flex items-center gap-1.5 rounded-full border border-avexa-border px-3 py-1.5 text-xs font-medium transition hover:border-avexa-success hover:text-avexa-success"
                >
                  <Check className="h-3 w-3" /> Approve
                </button>
              )}
              {m.status === "APPROVED" && (
                <button
                  onClick={() => act(m.id, "send")}
                  disabled={busy === m.id + "send"}
                  className="flex items-center gap-1.5 rounded-full bg-avexa-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-avexa-accent-hover"
                >
                  <Send className="h-3 w-3" /> Send
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
