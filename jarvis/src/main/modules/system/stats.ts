/**
 * System telemetry: CPU, memory, disk, battery and network throughput.
 * Fast paths use the os module; disk/battery/processes shell out per
 * platform with caching, and every probe degrades gracefully.
 */
import os from "node:os";
import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ProcessInfo, SystemStats } from "@shared/types";

const execFileAsync = promisify(execFile);

let lastCpu = cpuTimes();
let lastNet: { rx: number; tx: number; at: number } | null = null;
let diskCache: { total: number; used: number; at: number } = { total: 0, used: 0, at: 0 };
let batteryCache: { percent: number | null; onBattery: boolean | null; at: number } = {
  percent: null,
  onBattery: null,
  at: 0,
};

function cpuTimes(): { idle: number; total: number } {
  let idle = 0;
  let total = 0;
  for (const cpu of os.cpus()) {
    idle += cpu.times.idle;
    total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
  }
  return { idle, total };
}

function cpuUsagePercent(): number {
  const current = cpuTimes();
  const idleDelta = current.idle - lastCpu.idle;
  const totalDelta = current.total - lastCpu.total;
  lastCpu = current;
  if (totalDelta <= 0) return 0;
  return Math.min(100, Math.max(0, (1 - idleDelta / totalDelta) * 100));
}

async function diskUsage(): Promise<{ total: number; used: number }> {
  if (Date.now() - diskCache.at < 30_000) return diskCache;
  try {
    if (process.platform === "win32") {
      const { stdout } = await execFileAsync("powershell", [
        "-NoProfile",
        "-Command",
        "$d = Get-PSDrive -Name C; Write-Output \"$($d.Used) $($d.Free)\"",
      ]);
      const [used, free] = stdout.trim().split(/\s+/).map(Number);
      diskCache = { total: used + free, used, at: Date.now() };
    } else {
      const { stdout } = await execFileAsync("df", ["-k", "/"]);
      const parts = stdout.trim().split("\n").at(-1)?.split(/\s+/) ?? [];
      const total = Number(parts[1]) * 1024;
      const used = Number(parts[2]) * 1024;
      if (Number.isFinite(total) && total > 0) {
        diskCache = { total, used, at: Date.now() };
      }
    }
  } catch {
    // keep previous values
  }
  return diskCache;
}

async function battery(): Promise<{ percent: number | null; onBattery: boolean | null }> {
  if (Date.now() - batteryCache.at < 30_000) return batteryCache;
  try {
    if (process.platform === "linux") {
      const base = "/sys/class/power_supply";
      const entries = fs.existsSync(base) ? fs.readdirSync(base) : [];
      const bat = entries.find((e) => e.startsWith("BAT"));
      if (bat) {
        const percent = Number(fs.readFileSync(`${base}/${bat}/capacity`, "utf8").trim());
        const status = fs.readFileSync(`${base}/${bat}/status`, "utf8").trim();
        batteryCache = { percent, onBattery: status === "Discharging", at: Date.now() };
      } else {
        batteryCache = { percent: null, onBattery: null, at: Date.now() };
      }
    } else if (process.platform === "win32") {
      const { stdout } = await execFileAsync("powershell", [
        "-NoProfile",
        "-Command",
        "$b = Get-CimInstance Win32_Battery; if ($b) { Write-Output \"$($b.EstimatedChargeRemaining) $($b.BatteryStatus)\" }",
      ]);
      const [percent, status] = stdout.trim().split(/\s+/).map(Number);
      batteryCache = Number.isFinite(percent)
        ? { percent, onBattery: status === 1, at: Date.now() }
        : { percent: null, onBattery: null, at: Date.now() };
    } else if (process.platform === "darwin") {
      const { stdout } = await execFileAsync("pmset", ["-g", "batt"]);
      const match = stdout.match(/(\d+)%/);
      batteryCache = {
        percent: match ? Number(match[1]) : null,
        onBattery: stdout.includes("Battery Power"),
        at: Date.now(),
      };
    }
  } catch {
    batteryCache = { ...batteryCache, at: Date.now() };
  }
  return batteryCache;
}

function networkThroughput(): { rx: number; tx: number } {
  try {
    if (process.platform === "linux") {
      const raw = fs.readFileSync("/proc/net/dev", "utf8");
      let rx = 0;
      let tx = 0;
      for (const line of raw.split("\n").slice(2)) {
        const [iface, rest] = line.split(":");
        if (!rest || iface.trim() === "lo") continue;
        const cols = rest.trim().split(/\s+/);
        rx += Number(cols[0]);
        tx += Number(cols[8]);
      }
      const now = Date.now();
      const prev = lastNet;
      lastNet = { rx, tx, at: now };
      if (prev) {
        const dt = (now - prev.at) / 1000;
        if (dt > 0) {
          return { rx: Math.max(0, (rx - prev.rx) / dt), tx: Math.max(0, (tx - prev.tx) / dt) };
        }
      }
    }
  } catch {
    // unsupported platform or read failure
  }
  return { rx: 0, tx: 0 };
}

export async function collectStats(): Promise<SystemStats> {
  const [disk, batt] = await Promise.all([diskUsage(), battery()]);
  const net = networkThroughput();
  return {
    cpuUsagePercent: cpuUsagePercent(),
    cpuCount: os.cpus().length,
    cpuModel: os.cpus()[0]?.model ?? "unknown",
    memTotalBytes: os.totalmem(),
    memUsedBytes: os.totalmem() - os.freemem(),
    diskTotalBytes: disk.total,
    diskUsedBytes: disk.used,
    uptimeSeconds: os.uptime(),
    platform: `${os.type()} ${os.release()}`,
    hostname: os.hostname(),
    loadAverage: os.loadavg(),
    batteryPercent: batt.percent,
    onBattery: batt.onBattery,
    netRxBytesPerSec: net.rx,
    netTxBytesPerSec: net.tx,
    timestamp: new Date().toISOString(),
  };
}

export async function listProcesses(): Promise<ProcessInfo[]> {
  try {
    if (process.platform === "win32") {
      const { stdout } = await execFileAsync("powershell", [
        "-NoProfile",
        "-Command",
        "Get-Process | Sort-Object CPU -Descending | Select-Object -First 20 Id,ProcessName,CPU,WorkingSet64 | ConvertTo-Json",
      ]);
      const rows = JSON.parse(stdout) as {
        Id: number;
        ProcessName: string;
        CPU: number | null;
        WorkingSet64: number;
      }[];
      return rows.map((r) => ({
        pid: r.Id,
        name: r.ProcessName,
        cpuPercent: r.CPU ?? 0,
        memBytes: r.WorkingSet64,
      }));
    }
    const { stdout } = await execFileAsync("ps", ["axo", "pid,pcpu,rss,comm", "--sort=-pcpu"]);
    return stdout
      .trim()
      .split("\n")
      .slice(1, 21)
      .map((line) => {
        const [pid, pcpu, rss, ...comm] = line.trim().split(/\s+/);
        return {
          pid: Number(pid),
          name: comm.join(" ").split("/").at(-1) ?? "unknown",
          cpuPercent: Number(pcpu),
          memBytes: Number(rss) * 1024,
        };
      });
  } catch {
    return [];
  }
}
