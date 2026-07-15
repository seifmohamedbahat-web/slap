import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { Badge, Button, Field, GlassCard, PageHeader, useToast } from "../components/ui";
import { Icon } from "../components/Icon";

export function ProfilePage() {
  const { push } = useToast();
  const profile = useAsync(() => api.invoke("profile:get", undefined), []);
  const appInfo = useAsync(() => api.invoke("app:info", undefined), []);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (profile.data) {
      setName(profile.data.name);
      setEmail(profile.data.email);
    }
  }, [profile.data]);

  async function saveProfile() {
    await api.invoke("profile:update", { name, email });
    await profile.reload();
    push("Profile updated", "success");
  }

  async function savePin() {
    await api.invoke("profile:setPin", { pin: pin.trim() || null });
    setPin("");
    await profile.reload();
    push(pin.trim() ? "PIN set — required on next launch" : "PIN removed", "success");
  }

  const info = appInfo.data;

  return (
    <div>
      <PageHeader title="User Profile" subtitle="Your identity, security and app info." icon="profile" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlassCard className="p-6">
          <div className="mb-5 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neon-500/15 text-neon-300 shadow-glow-sm">
              <Icon name="profile" size={30} />
            </div>
            <div>
              <p className="text-lg font-semibold text-ink-primary">{name || "Operator"}</p>
              <p className="text-sm text-ink-muted">{email || "No email set"}</p>
            </div>
          </div>
          <div className="space-y-3">
            <Field label="Name">
              <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
            </Field>
            <Field label="Email">
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="input" type="email" />
            </Field>
            <Button variant="primary" icon="check" onClick={saveProfile}>
              Save profile
            </Button>
          </div>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-ink-primary">PIN Lock</h2>
              <Badge tone={profile.data?.hasPin ? "good" : "neutral"}>
                {profile.data?.hasPin ? "Enabled" : "Off"}
              </Badge>
            </div>
            <p className="mb-3 text-sm text-ink-secondary">
              Require a PIN when JARVIS launches. Leave blank and save to disable.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={profile.data?.hasPin ? "Enter new PIN (blank to remove)" : "Set a PIN"}
                className="input flex-1"
              />
              <Button variant="primary" icon="shield" onClick={savePin}>
                {profile.data?.hasPin ? "Update" : "Set"}
              </Button>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="mb-3 font-semibold text-ink-primary">About</h2>
            <div className="space-y-2 text-sm">
              <InfoRow label="Version" value={info?.version ?? "…"} />
              <InfoRow label="Platform" value={info ? `${info.platform} · ${info.arch}` : "…"} />
              <InfoRow label="Electron" value={info?.electron ?? "…"} />
              <InfoRow label="Node" value={info?.node ?? "…"} />
              <InfoRow label="Encryption" value={info?.encryptionAvailable ? "OS keychain" : "Obfuscated"} />
              <InfoRow label="Data folder" value={info?.dataDir ?? "…"} mono />
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-ink-muted">{label}</span>
      <span className={`truncate text-ink-secondary ${mono ? "font-mono text-xs" : ""}`} title={value}>
        {value}
      </span>
    </div>
  );
}
