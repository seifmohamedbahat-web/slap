import { api } from "../lib/api";
import { Button, GlassCard, PageHeader, useToast } from "../components/ui";
import { Icon, type IconName } from "../components/Icon";

const APPS: { name: string; label: string; icon: IconName }[] = [
  { name: "chrome", label: "Chrome", icon: "browser" },
  { name: "edge", label: "Edge", icon: "browser" },
  { name: "firefox", label: "Firefox", icon: "browser" },
  { name: "vs code", label: "VS Code", icon: "computer" },
  { name: "cursor", label: "Cursor", icon: "computer" },
  { name: "explorer", label: "File Explorer", icon: "folder" },
  { name: "terminal", label: "Terminal", icon: "logs" },
  { name: "powershell", label: "PowerShell", icon: "logs" },
  { name: "notepad", label: "Notepad", icon: "notes" },
  { name: "calculator", label: "Calculator", icon: "cpu" },
  { name: "spotify", label: "Spotify", icon: "bolt" },
  { name: "discord", label: "Discord", icon: "chat" },
];

const POWER: { action: "shutdown" | "restart" | "sleep" | "lock"; label: string; icon: IconName; danger?: boolean }[] = [
  { action: "lock", label: "Lock", icon: "shield" },
  { action: "sleep", label: "Sleep", icon: "battery" },
  { action: "restart", label: "Restart", icon: "refresh", danger: true },
  { action: "shutdown", label: "Shut Down", icon: "bolt", danger: true },
];

export function ComputerPage() {
  const { push } = useToast();

  async function launch(name: string) {
    const result = await api.invoke("automation:run", { input: `open ${name}` });
    push(result.output, result.ok ? "success" : "error");
  }

  async function power(action: "shutdown" | "restart" | "sleep" | "lock") {
    const result = await api.invoke("system:power", { action });
    if (result.cancelled) push("Cancelled", "info");
    else push(result.output, result.ok ? "success" : "error");
  }

  async function screenshot() {
    try {
      const { path } = await api.invoke("system:screenshot", undefined);
      push(`Screenshot saved to ${path}`, "success");
    } catch (err) {
      push(err instanceof Error ? err.message : String(err), "error");
    }
  }

  async function volume(direction: "up" | "down" | "mute") {
    const result = await api.invoke("automation:run", {
      input: direction === "mute" ? "mute" : `volume ${direction}`,
    });
    push(result.output, result.ok ? "success" : "error");
  }

  return (
    <div>
      <PageHeader title="Computer Control" subtitle="Launch apps, capture the screen, and manage power." icon="computer" />

      <div className="grid grid-cols-12 gap-4">
        <GlassCard className="col-span-12 p-5 lg:col-span-8">
          <h2 className="mb-4 font-semibold text-ink-primary">Launch Applications</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {APPS.map((app) => (
              <button
                key={app.name}
                type="button"
                onClick={() => launch(app.name)}
                className="glass glass-hover flex flex-col items-center gap-2 rounded-2xl px-2 py-4 text-center"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-500/12 text-neon-400">
                  <Icon name={app.icon} size={20} />
                </span>
                <span className="text-xs font-medium text-ink-secondary">{app.label}</span>
              </button>
            ))}
          </div>
        </GlassCard>

        <div className="col-span-12 space-y-4 lg:col-span-4">
          <GlassCard className="p-5">
            <h2 className="mb-3 font-semibold text-ink-primary">Quick Controls</h2>
            <div className="space-y-2">
              <Button icon="monitor" className="w-full justify-start" onClick={screenshot}>
                Take screenshot
              </Button>
              <div className="grid grid-cols-3 gap-2">
                <Button onClick={() => volume("down")}>Vol −</Button>
                <Button onClick={() => volume("mute")}>Mute</Button>
                <Button onClick={() => volume("up")}>Vol +</Button>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h2 className="mb-3 font-semibold text-ink-primary">Power</h2>
            <div className="grid grid-cols-2 gap-2">
              {POWER.map((p) => (
                <Button
                  key={p.action}
                  variant={p.danger ? "danger" : "ghost"}
                  icon={p.icon}
                  className="justify-start"
                  onClick={() => power(p.action)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              Restart and shutdown require confirmation (toggle in Settings).
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
