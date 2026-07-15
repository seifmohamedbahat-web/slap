import { api } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { Badge, Button, EmptyState, GlassCard, LoadingState, PageHeader, Toggle, useToast } from "../components/ui";
import { Icon } from "../components/Icon";

export function PluginsPage() {
  const { push } = useToast();
  const plugins = useAsync(() => api.invoke("plugins:list", undefined), []);

  async function toggle(id: string, enabled: boolean) {
    await api.invoke("plugins:setEnabled", { id, enabled });
    await plugins.reload();
  }

  async function openDir() {
    await api.invoke("plugins:openDir", undefined);
    push("Opened the plugins folder", "info");
  }

  return (
    <div>
      <PageHeader
        title="Plugins"
        subtitle="Extend JARVIS with sandboxed command plugins."
        icon="plugins"
        actions={
          <div className="flex gap-2">
            <Button icon="folder" onClick={openDir}>Open folder</Button>
            <Button icon="refresh" onClick={() => plugins.reload()}>Rescan</Button>
          </div>
        }
      />

      <GlassCard className="mb-4 p-5">
        <h2 className="mb-2 font-semibold text-ink-primary">How plugins work</h2>
        <p className="text-sm text-ink-secondary">
          Drop a folder into the plugins directory with a <code className="text-neon-300">plugin.json</code> manifest
          and a <code className="text-neon-300">main.js</code> script. Register commands with{" "}
          <code className="text-neon-300">jarvis.registerCommand(name, handler)</code>. Enabled plugins run in a
          restricted VM context with no filesystem or network access. Then invoke them from the Automation page by
          typing the command name.
        </p>
      </GlassCard>

      {plugins.loading ? (
        <LoadingState />
      ) : (plugins.data ?? []).length === 0 ? (
        <EmptyState
          icon="plugins"
          title="No plugins installed"
          hint="Add a plugin folder to the plugins directory, then rescan."
          action={<Button icon="folder" onClick={openDir}>Open plugins folder</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {(plugins.data ?? []).map((p) => (
            <GlassCard key={p.id} className="flex items-start gap-4 p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-500/12 text-neon-400">
                <Icon name="plugins" size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-ink-primary">{p.manifest.name}</h3>
                  <Badge>v{p.manifest.version}</Badge>
                  {p.loaded && <Badge tone="good">loaded</Badge>}
                  {p.error && <Badge tone="critical">error</Badge>}
                </div>
                <p className="mt-1 text-sm text-ink-secondary">{p.manifest.description || "No description"}</p>
                {p.manifest.commands && p.manifest.commands.length > 0 && (
                  <p className="mt-1 text-xs text-ink-muted">Commands: {p.manifest.commands.join(", ")}</p>
                )}
                {p.error && <p className="mt-1 text-xs text-status-critical">{p.error}</p>}
              </div>
              <Toggle checked={p.enabled} onChange={(v) => toggle(p.id, v)} label={`Enable ${p.manifest.name}`} />
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
