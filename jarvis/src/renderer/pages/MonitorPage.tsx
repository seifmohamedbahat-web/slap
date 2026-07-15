import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useSystemStats } from "../lib/hooks";
import { formatBytes, formatDuration, formatRate } from "../lib/format";
import type { ProcessInfo } from "@shared/types";
import { GlassCard, PageHeader } from "../components/ui";
import { Gauge, Sparkline, StatTile } from "../components/viz";

export function MonitorPage() {
  const { latest, history } = useSystemStats(60);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = () => api.invoke("system:processes", undefined).then((p) => mounted && setProcesses(p));
    void load();
    const id = setInterval(load, 4000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const cpuSeries = useMemo(() => history.map((h) => h.cpuUsagePercent), [history]);
  const ramSeries = useMemo(
    () => history.map((h) => (h.memTotalBytes ? (h.memUsedBytes / h.memTotalBytes) * 100 : 0)),
    [history],
  );
  const rxSeries = useMemo(() => history.map((h) => h.netRxBytesPerSec), [history]);
  const ramPct = latest && latest.memTotalBytes ? (latest.memUsedBytes / latest.memTotalBytes) * 100 : 0;
  const diskPct = latest && latest.diskTotalBytes ? (latest.diskUsedBytes / latest.diskTotalBytes) * 100 : 0;

  return (
    <div>
      <PageHeader
        title="System Monitor"
        subtitle={latest ? `${latest.cpuModel} · ${latest.platform}` : "Reading telemetry…"}
        icon="monitor"
      />

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="CPU" value={(latest?.cpuUsagePercent ?? 0).toFixed(0)} unit="%" icon="cpu" values={cpuSeries} max={100} />
        <StatTile label="Memory" value={ramPct.toFixed(0)} unit="%" icon="ram" values={ramSeries} max={100} />
        <StatTile label="Download" value={formatBytes(latest?.netRxBytesPerSec ?? 0)} unit="/s" icon="network" values={rxSeries} />
        <StatTile
          label="Uptime"
          value={latest ? formatDuration(latest.uptimeSeconds) : "—"}
          icon="refresh"
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <GlassCard className="col-span-12 p-5 lg:col-span-4">
          <h2 className="mb-4 font-semibold text-ink-primary">Resource Gauges</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex justify-center">
              <Gauge value={latest?.cpuUsagePercent ?? 0} label="CPU" size={104} />
            </div>
            <div className="flex justify-center">
              <Gauge value={ramPct} label="RAM" size={104} />
            </div>
            <div className="flex justify-center">
              <Gauge value={diskPct} label="Disk" size={104} />
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <Row label="Total memory" value={latest ? formatBytes(latest.memTotalBytes) : "—"} />
            <Row label="Used memory" value={latest ? formatBytes(latest.memUsedBytes) : "—"} />
            <Row label="Disk used" value={latest ? `${formatBytes(latest.diskUsedBytes)} / ${formatBytes(latest.diskTotalBytes)}` : "—"} />
            <Row label="Load avg" value={latest ? latest.loadAverage.map((n) => n.toFixed(2)).join(" · ") : "—"} />
            <Row label="Upload" value={formatRate(latest?.netTxBytesPerSec ?? 0)} />
          </div>
        </GlassCard>

        <GlassCard className="col-span-12 p-5 lg:col-span-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-ink-primary">CPU history (last 60 samples)</h2>
            <span className="text-xs text-ink-muted tabular-nums">{(latest?.cpuUsagePercent ?? 0).toFixed(0)}%</span>
          </div>
          <Sparkline values={cpuSeries} max={100} width={640} height={120} className="w-full" />

          <div className="mt-5 flex items-center justify-between">
            <h2 className="font-semibold text-ink-primary">Top processes</h2>
          </div>
          <div className="scroll-area mt-2 max-h-64">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-abyss-850/90 text-left text-xs uppercase tracking-wide text-ink-muted backdrop-blur">
                <tr>
                  <th className="px-3 py-2 font-medium">Process</th>
                  <th className="px-3 py-2 font-medium tabular-nums">PID</th>
                  <th className="px-3 py-2 font-medium tabular-nums">CPU</th>
                  <th className="px-3 py-2 font-medium tabular-nums">Memory</th>
                </tr>
              </thead>
              <tbody>
                {processes.map((p) => (
                  <tr key={p.pid} className="border-t border-white/5">
                    <td className="px-3 py-1.5 text-ink-secondary">{p.name}</td>
                    <td className="px-3 py-1.5 tabular-nums text-ink-muted">{p.pid}</td>
                    <td className="px-3 py-1.5 tabular-nums text-ink-secondary">{p.cpuPercent.toFixed(1)}</td>
                    <td className="px-3 py-1.5 tabular-nums text-ink-muted">{formatBytes(p.memBytes)}</td>
                  </tr>
                ))}
                {processes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-ink-muted">
                      Process list unavailable on this platform.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-muted">{label}</span>
      <span className="tabular-nums text-ink-secondary">{value}</span>
    </div>
  );
}
