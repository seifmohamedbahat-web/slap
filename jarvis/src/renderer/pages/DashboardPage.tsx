import { useMemo } from "react";
import { api } from "../lib/api";
import { useAsync, useClock, useSystemStats } from "../lib/hooks";
import type { RouteId } from "../lib/nav";
import { formatBytes, formatClock, formatDuration, formatRate, relativeTime } from "../lib/format";
import { GlassCard, PageHeader } from "../components/ui";
import { Icon, type IconName } from "../components/Icon";
import { Gauge, Meter, StatTile } from "../components/viz";

function go(route: RouteId) {
  window.__jarvisNav?.(route);
}

const QUICK_ACTIONS: { label: string; icon: IconName; route: RouteId }[] = [
  { label: "New chat", icon: "chat", route: "chat" },
  { label: "Voice", icon: "voice", route: "voice" },
  { label: "Run command", icon: "automation", route: "automation" },
  { label: "Files", icon: "files", route: "files" },
  { label: "Notes", icon: "notes", route: "notes" },
  { label: "Tasks", icon: "tasks", route: "tasks" },
];

export function DashboardPage() {
  const now = useClock();
  const { latest, history } = useSystemStats();
  const tasks = useAsync(() => api.invoke("tasks:list", undefined), []);
  const notes = useAsync(() => api.invoke("notes:list", undefined), []);
  const projects = useAsync(() => api.invoke("projects:list", undefined), []);
  const events = useAsync(() => api.invoke("events:list", undefined), []);
  const keys = useAsync(() => api.invoke("keys:list", undefined), []);

  const cpuHistory = useMemo(() => history.map((h) => h.cpuUsagePercent), [history]);
  const ramHistory = useMemo(
    () => history.map((h) => (h.memTotalBytes ? (h.memUsedBytes / h.memTotalBytes) * 100 : 0)),
    [history],
  );
  const ramPct = latest && latest.memTotalBytes ? (latest.memUsedBytes / latest.memTotalBytes) * 100 : 0;
  const diskPct = latest && latest.diskTotalBytes ? (latest.diskUsedBytes / latest.diskTotalBytes) * 100 : 0;

  const todaysTasks = (tasks.data ?? []).filter((t) => t.status !== "done").slice(0, 5);
  const upcomingEvents = (events.data ?? [])
    .filter((e) => new Date(e.start).getTime() >= Date.now() - 86_400_000)
    .slice(0, 4);
  const aiReady = (keys.data ?? []).some(
    (k) => ["openai", "gemini", "claude"].includes(k.provider) && k.configured,
  );

  return (
    <div>
      <PageHeader
        title={greeting(now)}
        subtitle={now.toLocaleDateString("en", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
        actions={
          <div className="text-right">
            <p className="font-mono text-2xl font-semibold tabular-nums text-glow">{formatClock(now)}</p>
            <p className="text-xs text-ink-muted">{latest?.hostname ?? "…"}</p>
          </div>
        }
      />

      {/* Quick actions */}
      <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {QUICK_ACTIONS.map((qa) => (
          <button
            key={qa.route}
            type="button"
            onClick={() => go(qa.route)}
            className="glass glass-hover flex flex-col items-center gap-2 rounded-2xl px-2 py-4 text-center"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-500/12 text-neon-400">
              <Icon name={qa.icon} size={20} />
            </span>
            <span className="text-xs font-medium text-ink-secondary">{qa.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* System vitals */}
        <GlassCard className="col-span-12 p-5 lg:col-span-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-ink-primary">System Vitals</h2>
            <button className="text-xs text-neon-400 hover:underline" onClick={() => go("monitor")}>
              Open monitor →
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex justify-center">
              <Gauge value={latest?.cpuUsagePercent ?? 0} label="CPU" sublabel={`${latest?.cpuCount ?? 0} cores`} />
            </div>
            <div className="flex justify-center">
              <Gauge value={ramPct} label="RAM" sublabel={latest ? formatBytes(latest.memUsedBytes) : "—"} />
            </div>
            <div className="flex justify-center">
              <Gauge value={diskPct} label="Disk" sublabel={latest ? formatBytes(latest.diskUsedBytes) : "—"} />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <StatTile
              label="CPU trend"
              value={(latest?.cpuUsagePercent ?? 0).toFixed(0)}
              unit="%"
              icon="cpu"
              values={cpuHistory}
              max={100}
            />
            <StatTile
              label="Memory trend"
              value={ramPct.toFixed(0)}
              unit="%"
              icon="ram"
              values={ramHistory}
              max={100}
            />
          </div>
        </GlassCard>

        {/* AI status + network */}
        <div className="col-span-12 space-y-4 lg:col-span-4">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-ink-primary">AI Status</h2>
              <span
                className={`flex items-center gap-1.5 text-xs font-medium ${aiReady ? "text-status-good" : "text-status-warning"}`}
              >
                <span className={`h-2 w-2 rounded-full ${aiReady ? "bg-status-good" : "bg-status-warning"}`} />
                {aiReady ? "Online" : "Setup needed"}
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-secondary">
              {aiReady
                ? "Providers connected and ready. Ask me anything in Chat or by voice."
                : "Add an API key to unlock chat, voice and AI-parsed commands."}
            </p>
            <button
              className="mt-3 text-xs text-neon-400 hover:underline"
              onClick={() => go(aiReady ? "chat" : "keys")}
            >
              {aiReady ? "Start a conversation →" : "Add API keys →"}
            </button>
          </GlassCard>

          <GlassCard className="p-5">
            <h2 className="mb-3 font-semibold text-ink-primary">Network & Power</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-ink-secondary">
                  <Icon name="network" size={16} className="text-neon-400/80" /> Download
                </span>
                <span className="tabular-nums text-ink-primary">{formatRate(latest?.netRxBytesPerSec ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-ink-secondary">
                  <Icon name="bolt" size={16} className="text-neon-400/80" /> Upload
                </span>
                <span className="tabular-nums text-ink-primary">{formatRate(latest?.netTxBytesPerSec ?? 0)}</span>
              </div>
              {latest?.batteryPercent !== null && latest?.batteryPercent !== undefined && (
                <Meter value={latest.batteryPercent} label="Battery" valueText={`${latest.batteryPercent}%`} />
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-ink-secondary">
                  <Icon name="refresh" size={16} className="text-neon-400/80" /> Uptime
                </span>
                <span className="tabular-nums text-ink-primary">
                  {latest ? formatDuration(latest.uptimeSeconds) : "—"}
                </span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Today's tasks */}
        <GlassCard className="col-span-12 p-5 md:col-span-6 lg:col-span-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-ink-primary">Today&apos;s Tasks</h2>
            <button className="text-xs text-neon-400 hover:underline" onClick={() => go("tasks")}>
              All →
            </button>
          </div>
          {todaysTasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">Nothing pending. Nice.</p>
          ) : (
            <ul className="space-y-2">
              {todaysTasks.map((t) => (
                <li key={t.id} className="flex items-center gap-2.5 text-sm">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      t.priority === "high"
                        ? "bg-status-critical"
                        : t.priority === "medium"
                          ? "bg-status-warning"
                          : "bg-neon-400"
                    }`}
                  />
                  <span className="flex-1 truncate text-ink-secondary">{t.title}</span>
                  {t.dueDate && <span className="text-xs text-ink-muted">{relativeTime(t.dueDate)}</span>}
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        {/* Upcoming events */}
        <GlassCard className="col-span-12 p-5 md:col-span-6 lg:col-span-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-ink-primary">Calendar</h2>
            <button className="text-xs text-neon-400 hover:underline" onClick={() => go("calendar")}>
              Open →
            </button>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">No upcoming events.</p>
          ) : (
            <ul className="space-y-2.5">
              {upcomingEvents.map((e) => (
                <li key={e.id} className="flex items-center gap-3 text-sm">
                  <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-neon-500/10 text-neon-300">
                    <span className="text-[10px] uppercase">
                      {new Date(e.start).toLocaleString("en", { month: "short" })}
                    </span>
                    <span className="text-sm font-semibold leading-none">{new Date(e.start).getDate()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-ink-secondary">{e.title}</p>
                    <p className="text-xs text-ink-muted">
                      {e.allDay
                        ? "All day"
                        : new Date(e.start).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        {/* Recent projects + notes */}
        <GlassCard className="col-span-12 p-5 lg:col-span-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-ink-primary">Recent Work</h2>
            <button className="text-xs text-neon-400 hover:underline" onClick={() => go("projects")}>
              Projects →
            </button>
          </div>
          <div className="space-y-2">
            {(projects.data ?? []).slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 text-sm">
                <Icon name="projects" size={16} className="text-neon-400/80" />
                <span className="flex-1 truncate text-ink-secondary">{p.name}</span>
                <span className="text-xs text-ink-muted">{relativeTime(p.updatedAt)}</span>
              </div>
            ))}
            {(notes.data ?? []).slice(0, 3).map((n) => (
              <div key={n.id} className="flex items-center gap-2.5 text-sm">
                <Icon name="notes" size={16} className="text-neon-400/80" />
                <span className="flex-1 truncate text-ink-secondary">{n.title}</span>
                <span className="text-xs text-ink-muted">{relativeTime(n.updatedAt)}</span>
              </div>
            ))}
            {(projects.data ?? []).length === 0 && (notes.data ?? []).length === 0 && (
              <p className="py-6 text-center text-sm text-ink-muted">No recent work yet.</p>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 5) return "Still up?";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
