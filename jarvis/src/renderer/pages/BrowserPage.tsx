import { useState } from "react";
import { api } from "../lib/api";
import { Button, GlassCard, PageHeader, useToast } from "../components/ui";
import { Icon } from "../components/Icon";

const SHORTCUTS = [
  { label: "GitHub", url: "https://github.com" },
  { label: "Gmail", url: "https://mail.google.com" },
  { label: "YouTube", url: "https://youtube.com" },
  { label: "ChatGPT", url: "https://chat.openai.com" },
  { label: "Drive", url: "https://drive.google.com" },
  { label: "Calendar", url: "https://calendar.google.com" },
  { label: "Maps", url: "https://maps.google.com" },
  { label: "Docs", url: "https://docs.google.com" },
];

const SEARCH_ENGINES = [
  { id: "google", label: "Google", prefix: "https://www.google.com/search?q=" },
  { id: "bing", label: "Bing", prefix: "https://www.bing.com/search?q=" },
  { id: "ddg", label: "DuckDuckGo", prefix: "https://duckduckgo.com/?q=" },
];

export function BrowserPage() {
  const { push } = useToast();
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const [engine, setEngine] = useState(SEARCH_ENGINES[0]);

  async function open(target: string) {
    const { ok, error } = await api.invoke("app:openExternal", { url: target });
    if (!ok) push(error ?? "Failed to open", "error");
  }

  async function openUrl() {
    if (!url.trim()) return;
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url.trim()}`;
    await open(normalized);
    setUrl("");
  }

  async function search() {
    if (!query.trim()) return;
    await open(engine.prefix + encodeURIComponent(query.trim()));
    setQuery("");
  }

  return (
    <div>
      <PageHeader
        title="Browser Control"
        subtitle="Open sites and run web searches in your default browser."
        icon="browser"
      />

      <div className="grid grid-cols-12 gap-4">
        <GlassCard className="col-span-12 p-5 lg:col-span-6">
          <h2 className="mb-3 font-semibold text-ink-primary">Open a website</h2>
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && openUrl()}
              placeholder="example.com"
              className="input flex-1"
            />
            <Button variant="primary" icon="browser" onClick={openUrl} disabled={!url.trim()}>
              Open
            </Button>
          </div>
        </GlassCard>

        <GlassCard className="col-span-12 p-5 lg:col-span-6">
          <h2 className="mb-3 font-semibold text-ink-primary">Web search</h2>
          <div className="flex gap-2">
            <select
              value={engine.id}
              onChange={(e) => setEngine(SEARCH_ENGINES.find((s) => s.id === e.target.value) ?? SEARCH_ENGINES[0])}
              className="input w-36"
            >
              {SEARCH_ENGINES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Search the web…"
              className="input flex-1"
            />
            <Button variant="primary" icon="search" onClick={search} disabled={!query.trim()}>
              Go
            </Button>
          </div>
        </GlassCard>

        <GlassCard className="col-span-12 p-5">
          <h2 className="mb-3 font-semibold text-ink-primary">Bookmarks</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SHORTCUTS.map((s) => (
              <button
                key={s.url}
                type="button"
                onClick={() => open(s.url)}
                className="glass glass-hover flex items-center gap-2.5 rounded-xl px-3 py-3 text-left"
              >
                <Icon name="browser" size={18} className="text-neon-400/80" />
                <span className="text-sm text-ink-secondary">{s.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            Deeper automation (form-filling, multi-tab control, stored logins) integrates through the
            plugin system and n8n workflows.
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
