import { useState } from "react";
import { api } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { Badge, Button, GlassCard, PageHeader, useToast } from "../components/ui";
import { Icon } from "../components/Icon";

const PROVIDER_META: Record<string, { label: string; hint: string; url: string }> = {
  openai: { label: "OpenAI", hint: "GPT-4o and o-series · general chat", url: "https://platform.openai.com/api-keys" },
  gemini: { label: "Google Gemini", hint: "Gemini 2.0 · research & long context", url: "https://aistudio.google.com/apikey" },
  claude: { label: "Anthropic Claude", hint: "Claude Opus 4.8 · coding", url: "https://console.anthropic.com/settings/keys" },
  elevenlabs: { label: "ElevenLabs", hint: "Text-to-speech & transcription", url: "https://elevenlabs.io/app/settings/api-keys" },
};

export function KeysPage() {
  const { push } = useToast();
  const keys = useAsync(() => api.invoke("keys:list", undefined), []);
  const appInfo = useAsync(() => api.invoke("app:info", undefined), []);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState<string | null>(null);

  async function saveKey(provider: string) {
    const key = drafts[provider]?.trim();
    if (!key) return;
    await api.invoke("keys:set", { provider, key });
    setDrafts((d) => ({ ...d, [provider]: "" }));
    await keys.reload();
    push(`${PROVIDER_META[provider].label} key saved`, "success");
  }

  async function deleteKey(provider: string) {
    await api.invoke("keys:delete", { provider });
    await keys.reload();
    push(`${PROVIDER_META[provider].label} key removed`, "info");
  }

  async function testKey(provider: string) {
    setTesting(provider);
    try {
      const { ok, error } = await api.invoke("keys:test", { provider });
      push(ok ? `${PROVIDER_META[provider].label} key works` : `Test failed: ${error}`, ok ? "success" : "error");
    } finally {
      setTesting(null);
    }
  }

  const encAvailable = appInfo.data?.encryptionAvailable ?? true;

  return (
    <div>
      <PageHeader title="API Keys & AI Providers" subtitle="Connect your AI and voice providers. Keys are stored encrypted." icon="keys" />

      {!encAvailable && (
        <GlassCard className="mb-4 flex items-center gap-3 border-status-warning/30 p-4">
          <Icon name="warning" className="text-status-warning" />
          <p className="text-sm text-ink-secondary">
            OS-level encryption isn&apos;t available on this system, so keys are stored obfuscated but not encrypted.
            On Linux, install a keyring (e.g. gnome-keyring) for full protection.
          </p>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(keys.data ?? []).map((k) => {
          const meta = PROVIDER_META[k.provider];
          return (
            <GlassCard key={k.provider} className="p-5">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-500/12 text-neon-400">
                    <Icon name="keys" size={20} />
                  </span>
                  <div>
                    <h3 className="font-medium text-ink-primary">{meta.label}</h3>
                    <p className="text-xs text-ink-muted">{meta.hint}</p>
                  </div>
                </div>
                {k.configured ? (
                  <Badge tone={k.encrypted ? "good" : "warning"}>
                    {k.encrypted ? "Encrypted" : "Stored"} ····{k.lastFour}
                  </Badge>
                ) : (
                  <Badge>Not set</Badge>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="password"
                  value={drafts[k.provider] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [k.provider]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && saveKey(k.provider)}
                  placeholder={k.configured ? "Enter a new key to replace" : "Paste API key"}
                  className="input flex-1"
                />
                <Button variant="primary" onClick={() => saveKey(k.provider)} disabled={!drafts[k.provider]?.trim()}>
                  Save
                </Button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {k.configured && k.provider !== "elevenlabs" && (
                  <Button icon="check" onClick={() => testKey(k.provider)} disabled={testing === k.provider}>
                    {testing === k.provider ? "Testing…" : "Test"}
                  </Button>
                )}
                {k.configured && (
                  <Button icon="trash" variant="danger" onClick={() => deleteKey(k.provider)}>
                    Remove
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => api.invoke("app:openExternal", { url: meta.url })}
                  className="ml-auto text-xs text-neon-400 hover:underline"
                >
                  Get a key →
                </button>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
