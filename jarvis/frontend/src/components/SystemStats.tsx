import { useEffect, useState } from "react";
import { fetchStats } from "../api";
import type { SystemStats as Stats } from "../types";

function Meter({ label, percent, detail }: { label: string; percent: number; detail?: string }) {
  const tone =
    percent > 90 ? "bg-hud-error" : percent > 75 ? "bg-hud-warn" : "bg-hud-accent";
  return (
    <div>
      <div className="flex justify-between text-[11px] text-hud-dim">
        <span>{label}</span>
        <span>{percent.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 rounded bg-hud-line/60 mt-1">
        <div
          className={`h-full rounded ${tone} transition-all duration-700`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      {detail && <div className="text-[10px] text-hud-dim/70 mt-0.5">{detail}</div>}
    </div>
  );
}

export default function SystemStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const next = await fetchStats();
        if (!cancelled) {
          setStats(next);
          setOffline(false);
        }
      } catch {
        if (!cancelled) setOffline(true);
      }
    };
    tick();
    const timer = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <aside className="w-56 shrink-0 border-l border-hud-line p-3 flex flex-col gap-4 overflow-y-auto">
      <h2 className="text-[10px] uppercase tracking-[0.2em] text-hud-dim">System</h2>
      {offline && (
        <div className="text-xs text-hud-error">
          Backend offline — start it with{" "}
          <code className="font-mono">uvicorn app.main:app --port 8765</code>
        </div>
      )}
      {stats && (
        <>
          <Meter label="CPU" percent={stats.cpu_percent} />
          <Meter
            label="Memory"
            percent={stats.memory.used_percent}
            detail={`${stats.memory.total_gb} GB total`}
          />
          {stats.disks.map((disk) => (
            <Meter
              key={disk.mount}
              label={`Disk ${disk.mount}`}
              percent={disk.used_percent}
              detail={`${disk.free_gb} GB free of ${disk.total_gb} GB`}
            />
          ))}
        </>
      )}
      <div className="mt-auto">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-hud-dim mb-1">
          Routines
        </h2>
        <p className="text-[11px] text-hud-dim/70">
          Schedules and routines arrive in Phase 5.
        </p>
      </div>
    </aside>
  );
}
