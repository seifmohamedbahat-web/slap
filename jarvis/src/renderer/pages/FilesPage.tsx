import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { formatBytes, relativeTime } from "../lib/format";
import type { FileEntry } from "@shared/types";
import { Badge, Button, EmptyState, GlassCard, IconButton, LoadingState, PageHeader, cx, useToast } from "../components/ui";
import { Icon } from "../components/Icon";

export function FilesPage() {
  const { push } = useToast();
  const [dir, setDir] = useState<string>("");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(target: string) {
    setLoading(true);
    setError(null);
    try {
      const { entries: list, dir: resolved } = await api.invoke("files:list", { dir: target });
      setEntries(list);
      setDir(resolved);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void api.invoke("files:home", undefined).then(({ home }) => load(home));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parent = useMemo(() => {
    if (!dir) return null;
    const parts = dir.split(/[\\/]/).filter(Boolean);
    if (parts.length <= 1) return null;
    const sep = dir.includes("\\") ? "\\" : "/";
    const isUnc = dir.startsWith("/");
    return (isUnc ? "/" : "") + parts.slice(0, -1).join(sep);
  }, [dir]);

  const filtered = entries.filter((e) => e.name.toLowerCase().includes(filter.toLowerCase()));

  async function goHome() {
    const { downloads } = await api.invoke("files:home", undefined);
    void load(downloads);
  }

  async function organize() {
    setBusy(true);
    try {
      const result = await api.invoke("files:organizeDownloads", undefined);
      push(`Organized — moved ${result.moved.length}, skipped ${result.skipped.length}`, "success");
      const { downloads } = await api.invoke("files:home", undefined);
      void load(downloads);
    } catch (err) {
      push(err instanceof Error ? err.message : String(err), "error");
    } finally {
      setBusy(false);
    }
  }

  async function findDuplicates() {
    setBusy(true);
    try {
      const groups = await api.invoke("files:findDuplicates", { dir });
      const redundant = groups.reduce((n, g) => n + g.paths.length - 1, 0);
      push(
        groups.length === 0
          ? "No duplicates found here."
          : `${groups.length} duplicate group(s), ${redundant} redundant file(s).`,
        groups.length === 0 ? "info" : "success",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(entry: FileEntry) {
    const result = await api.invoke("files:delete", { path: entry.path });
    if (result.cancelled) return;
    if (result.ok) {
      push(result.output, "success");
      void load(dir);
    } else {
      push(result.output, "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="File Manager"
        subtitle="Browse, organize and clean up your files."
        icon="files"
        actions={
          <div className="flex gap-2">
            <Button icon="folder" onClick={goHome}>
              Downloads
            </Button>
            <Button icon="sparkles" onClick={organize} disabled={busy}>
              Organize
            </Button>
            <Button icon="search" onClick={findDuplicates} disabled={busy}>
              Find duplicates
            </Button>
          </div>
        }
      />

      <GlassCard className="mb-4 flex items-center gap-3 px-4 py-2.5">
        <IconButton icon="chevron" label="Up" onClick={() => parent && load(parent)} />
        <span className="flex-1 truncate font-mono text-sm text-ink-secondary" title={dir}>
          {dir || "…"}
        </span>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter…"
          className="input w-48 py-1.5"
        />
      </GlassCard>

      <GlassCard className="overflow-hidden">
        {loading ? (
          <div className="p-5">
            <LoadingState />
          </div>
        ) : error ? (
          <div className="p-5">
            <p className="text-sm text-status-critical">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState icon="folder" title="Empty folder" hint="Nothing matches your filter here." />
          </div>
        ) : (
          <div className="scroll-area max-h-[62vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-abyss-850/90 text-left text-xs uppercase tracking-wide text-ink-muted backdrop-blur">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium tabular-nums">Size</th>
                  <th className="px-4 py-2.5 font-medium">Modified</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.path} className="border-t border-white/5 hover:bg-white/4">
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        className={cx("flex items-center gap-2.5 text-left", e.isDirectory && "text-ink-primary")}
                        onClick={() => (e.isDirectory ? load(e.path) : api.invoke("app:openPath", { path: e.path }))}
                      >
                        <Icon
                          name={e.isDirectory ? "folder" : "files"}
                          size={16}
                          className={e.isDirectory ? "text-neon-400" : "text-ink-muted"}
                        />
                        <span className="truncate">{e.name}</span>
                      </button>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-ink-muted">
                      {e.isDirectory ? <Badge>dir</Badge> : formatBytes(e.sizeBytes)}
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">{relativeTime(e.modifiedAt)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <IconButton icon="trash" label="Move to trash" danger onClick={() => remove(e)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
