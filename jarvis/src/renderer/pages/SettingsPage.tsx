import { api } from "../lib/api";
import { useAsync } from "../lib/hooks";
import type { AiProviderId, AiTask, AppSettings } from "@shared/types";
import { GlassCard, LoadingState, PageHeader, Toggle } from "../components/ui";

const PROVIDERS: AiProviderId[] = ["openai", "gemini", "claude"];
const PROVIDER_LABEL: Record<AiProviderId, string> = { openai: "OpenAI", gemini: "Gemini", claude: "Claude" };
const TASKS: { id: AiTask; label: string }[] = [
  { id: "chat", label: "General chat" },
  { id: "coding", label: "Coding" },
  { id: "research", label: "Research" },
  { id: "automation", label: "Command parsing" },
];

export function SettingsPage() {
  const settings = useAsync(() => api.invoke("settings:get", undefined), []);

  async function update(patch: Partial<AppSettings>) {
    await api.invoke("settings:update", patch);
    await settings.reload();
  }

  if (settings.loading || !settings.data) {
    return (
      <div>
        <PageHeader title="Settings" icon="settings" />
        <LoadingState />
      </div>
    );
  }

  const s = settings.data;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Tune AI routing, voice, security and appearance." icon="settings" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* AI routing */}
        <GlassCard className="p-5">
          <h2 className="mb-4 font-semibold text-ink-primary">AI Providers</h2>
          <label className="mb-4 block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">Default provider</span>
            <select
              value={s.defaultProvider}
              onChange={(e) => update({ defaultProvider: e.target.value as AiProviderId })}
              className="input"
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_LABEL[p]}
                </option>
              ))}
            </select>
          </label>

          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">Route by task</p>
          <div className="space-y-2">
            {TASKS.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink-secondary">{t.label}</span>
                <select
                  value={s.taskRouting[t.id]}
                  onChange={(e) => update({ taskRouting: { ...s.taskRouting, [t.id]: e.target.value as AiProviderId } })}
                  className="input w-40"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {PROVIDER_LABEL[p]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Default models */}
        <GlassCard className="p-5">
          <h2 className="mb-4 font-semibold text-ink-primary">Default Models</h2>
          <div className="space-y-3">
            {PROVIDERS.map((p) => (
              <label key={p} className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {PROVIDER_LABEL[p]}
                </span>
                <input
                  value={s.defaultModels[p]}
                  onChange={(e) => update({ defaultModels: { ...s.defaultModels, [p]: e.target.value } })}
                  className="input"
                />
              </label>
            ))}
          </div>
        </GlassCard>

        {/* Voice */}
        <GlassCard className="p-5">
          <h2 className="mb-4 font-semibold text-ink-primary">Voice</h2>
          <div className="space-y-3">
            <ToggleRow
              label='Wake word ("Hey JARVIS")'
              checked={s.voice.wakeWordEnabled}
              onChange={(v) => update({ voice: { ...s.voice, wakeWordEnabled: v } })}
            />
            <ToggleRow
              label="Double-clap activation"
              checked={s.voice.doubleClapEnabled}
              onChange={(v) => update({ voice: { ...s.voice, doubleClapEnabled: v } })}
            />
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">Speech-to-text</span>
              <select
                value={s.voice.sttProvider}
                onChange={(e) => update({ voice: { ...s.voice, sttProvider: e.target.value as "elevenlabs" | "openai" } })}
                className="input"
              >
                <option value="elevenlabs">ElevenLabs (Scribe)</option>
                <option value="openai">OpenAI Whisper</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">Language</span>
              <select
                value={s.voice.language}
                onChange={(e) => update({ voice: { ...s.voice, language: e.target.value as AppSettings["voice"]["language"] } })}
                className="input"
              >
                <option value="auto">Auto-detect (English + Egyptian Arabic)</option>
                <option value="en">English</option>
                <option value="ar">Arabic</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">ElevenLabs voice ID</span>
              <input
                value={s.voice.ttsVoiceId}
                onChange={(e) => update({ voice: { ...s.voice, ttsVoiceId: e.target.value } })}
                className="input"
              />
            </label>
          </div>
        </GlassCard>

        {/* Security & general */}
        <GlassCard className="p-5">
          <h2 className="mb-4 font-semibold text-ink-primary">Security & General</h2>
          <div className="space-y-3">
            <ToggleRow
              label="Confirm dangerous actions"
              hint="Prompt before deleting files or powering off"
              checked={s.confirmDangerousActions}
              onChange={(v) => update({ confirmDangerousActions: v })}
            />
            <ToggleRow
              label="Launch at login"
              checked={s.launchAtLogin}
              onChange={(v) => update({ launchAtLogin: v })}
            />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-ink-secondary">Theme</p>
                <p className="text-xs text-ink-muted">Iron Man dark · blue neon (fixed)</p>
              </div>
              <span className="chip text-neon-300">Dark</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-ink-muted">Changes save automatically.</p>
        </GlassCard>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm text-ink-secondary">{label}</p>
        {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}
