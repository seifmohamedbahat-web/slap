import { describe, expect, it, beforeEach } from "vitest";
import { openDatabase, type Database } from "./db";
import { DEFAULT_SETTINGS, getSettings, updateSettings } from "./settings";

let db: Database;

beforeEach(() => {
  db = openDatabase(":memory:");
});

describe("settings", () => {
  it("returns defaults for a fresh database", () => {
    expect(getSettings(db)).toEqual(DEFAULT_SETTINGS);
  });

  it("deep-merges partial updates without dropping siblings", () => {
    updateSettings(db, { voice: { ...DEFAULT_SETTINGS.voice, wakeWordEnabled: true } });
    const s = getSettings(db);
    expect(s.voice.wakeWordEnabled).toBe(true);
    // Untouched sibling keys survive.
    expect(s.voice.sttProvider).toBe(DEFAULT_SETTINGS.voice.sttProvider);
    expect(s.defaultProvider).toBe(DEFAULT_SETTINGS.defaultProvider);
  });

  it("persists task routing overrides", () => {
    updateSettings(db, { taskRouting: { ...DEFAULT_SETTINGS.taskRouting, coding: "gemini" } });
    expect(getSettings(db).taskRouting.coding).toBe("gemini");
    expect(getSettings(db).taskRouting.chat).toBe(DEFAULT_SETTINGS.taskRouting.chat);
  });

  it("backfills new default keys onto older stored settings", () => {
    // Simulate an older install that stored a subset of settings.
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
      "app_settings",
      JSON.stringify({ defaultProvider: "claude" }),
    );
    const s = getSettings(db);
    expect(s.defaultProvider).toBe("claude");
    expect(s.fallbackOrder).toEqual(DEFAULT_SETTINGS.fallbackOrder);
    expect(s.voice.ttsVoiceId).toBe(DEFAULT_SETTINGS.voice.ttsVoiceId);
  });
});
