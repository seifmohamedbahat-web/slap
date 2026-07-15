/**
 * App settings persisted as JSON values in the settings table, merged over
 * safe defaults so new options never break existing installs.
 */
import type { Database } from "./db";
import type { AppSettings } from "@shared/types";

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  accent: "blue",
  defaultProvider: "openai",
  defaultModels: {
    openai: "gpt-4o",
    gemini: "gemini-2.0-flash",
    claude: "claude-opus-4-8",
  },
  taskRouting: {
    chat: "openai",
    coding: "claude",
    research: "gemini",
    automation: "openai",
  },
  fallbackOrder: ["openai", "claude", "gemini"],
  voice: {
    wakeWordEnabled: false,
    doubleClapEnabled: true,
    ttsVoiceId: "21m00Tcm4TlvDq8ikWAM",
    sttProvider: "elevenlabs",
    language: "auto",
  },
  confirmDangerousActions: true,
  launchAtLogin: false,
  telemetry: false,
};

const KEY = "app_settings";

export function getSettings(db: Database): AppSettings {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(KEY) as
    | { value: string }
    | undefined;
  if (!row) return structuredClone(DEFAULT_SETTINGS);
  try {
    return deepMerge(structuredClone(DEFAULT_SETTINGS), JSON.parse(row.value));
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function updateSettings(db: Database, patch: Partial<AppSettings>): AppSettings {
  const merged = deepMerge(getSettings(db), patch);
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(KEY, JSON.stringify(merged));
  return merged;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return (patch === undefined ? base : (patch as T)) as T;
  }
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = isPlainObject(v) && isPlainObject(out[k]) ? deepMerge(out[k], v) : v;
  }
  return out as T;
}
