import { useState } from "react";
import { api } from "../lib/api";
import { VoiceOrb } from "../components/VoiceOrb";
import { Button, Field, GlassCard } from "../components/ui";

/**
 * First-run onboarding: capture the operator's name and (optionally) the first
 * AI provider key so JARVIS is usable immediately after setup.
 */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<"openai" | "gemini" | "claude">("openai");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    try {
      await api.invoke("profile:update", { name: name.trim() || "Operator", email: "" });
      if (key.trim()) {
        await api.invoke("keys:set", { provider, key: key.trim() });
      }
      await api.invoke("profile:completeOnboarding", undefined);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <GlassCard className="w-full max-w-md animate-slide-up p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <VoiceOrb state="idle" size={140} />
          <h1 className="mt-4 text-2xl font-semibold text-glow">Welcome to JARVIS</h1>
          <p className="mt-1 text-sm text-ink-secondary">Your personal AI operating system</p>
        </div>

        {step === 0 && (
          <div className="space-y-5">
            <Field label="What should I call you?">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tony"
                className="input"
                onKeyDown={(e) => e.key === "Enter" && setStep(1)}
              />
            </Field>
            <Button variant="primary" className="w-full" onClick={() => setStep(1)}>
              Continue
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <Field label="Connect an AI provider (optional)">
              <div className="mb-2 grid grid-cols-3 gap-2">
                {(["openai", "gemini", "claude"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProvider(p)}
                    className={`rounded-xl border px-3 py-2 text-sm capitalize transition-colors ${
                      provider === p
                        ? "border-neon-400/50 bg-neon-500/12 text-ink-primary"
                        : "border-white/10 text-ink-secondary hover:border-white/20"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Paste your API key (stored encrypted)"
                className="input"
              />
            </Field>
            <p className="text-xs text-ink-muted">
              Keys are encrypted with your OS keychain and never leave this machine. You can add
              more providers later in Settings.
            </p>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button variant="primary" className="flex-1" onClick={finish} disabled={busy}>
                {busy ? "Setting up…" : "Launch JARVIS"}
              </Button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
