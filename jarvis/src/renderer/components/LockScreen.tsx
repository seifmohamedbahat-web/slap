/**
 * PIN lock screen shown at boot when the user has set a PIN. Verification runs
 * in the main process against a salted scrypt hash.
 */
import { useState } from "react";
import { api } from "../lib/api";
import { VoiceOrb } from "./VoiceOrb";
import { Button, Field } from "./ui";

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { valid } = await api.invoke("profile:verifyPin", { pin });
      if (valid) onUnlock();
      else setError("Incorrect PIN. Try again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      setPin("");
    }
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-8">
      <VoiceOrb state="idle" size={180} />
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-glow">JARVIS</h1>
        <p className="mt-1 text-sm text-ink-secondary">Enter your PIN to unlock</p>
      </div>
      <form onSubmit={submit} className="w-64 space-y-4">
        <Field label="PIN">
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="input text-center text-lg tracking-[0.4em]"
            aria-label="PIN"
          />
        </Field>
        {error && <p className="text-center text-sm text-status-critical">{error}</p>}
        <Button type="submit" variant="primary" disabled={busy || pin.length === 0} className="w-full">
          Unlock
        </Button>
      </form>
    </div>
  );
}
