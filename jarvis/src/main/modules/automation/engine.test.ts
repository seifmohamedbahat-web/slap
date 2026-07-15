import { describe, expect, it } from "vitest";
import { parseCommand, validateAiIntent } from "./engine";

describe("parseCommand", () => {
  it("parses app launch commands", () => {
    const intent = parseCommand("open Chrome");
    expect(intent?.kind).toBe("open_app");
    expect(intent?.params.app).toBe("Chrome");
    expect(intent?.risk).toBe("safe");
  });

  it("parses close commands as sensitive", () => {
    const intent = parseCommand("close spotify");
    expect(intent?.kind).toBe("close_app");
    expect(intent?.risk).toBe("sensitive");
  });

  it("classifies shutdown as dangerous with the right action", () => {
    const intent = parseCommand("shut down the computer");
    expect(intent?.kind).toBe("power");
    expect(intent?.risk).toBe("dangerous");
    expect(intent?.params.action).toBe("shutdown");
  });

  it("maps reboot to the restart action", () => {
    expect(parseCommand("restart")?.params.action).toBe("restart");
    expect(parseCommand("reboot the pc")?.params.action).toBe("restart");
  });

  it("extracts search queries", () => {
    const intent = parseCommand("search google for electron security");
    expect(intent?.kind).toBe("web_search");
    expect(intent?.params.query).toBe("electron security");
  });

  it("prefers open_url over open_app for domains", () => {
    const intent = parseCommand("open github.com");
    expect(intent?.kind).toBe("open_url");
    expect(intent?.params.url).toContain("github.com");
  });

  it("routes 'open folder' to open_path, not open_app", () => {
    const intent = parseCommand("open folder Documents");
    expect(intent?.kind).toBe("open_path");
    expect(intent?.params.path).toBe("Documents");
  });

  it("parses reminders with minutes and hour conversion", () => {
    expect(parseCommand("remind me to stretch in 20 minutes")?.params.minutes).toBe("20");
    expect(parseCommand("remind me to call in 2 hours")?.params.minutes).toBe("120");
  });

  it("parses organize downloads as sensitive", () => {
    const intent = parseCommand("organize my downloads");
    expect(intent?.kind).toBe("organize_downloads");
    expect(intent?.risk).toBe("sensitive");
  });

  it("classifies delete as dangerous", () => {
    const intent = parseCommand("delete file report.pdf");
    expect(intent?.kind).toBe("delete_path");
    expect(intent?.risk).toBe("dangerous");
  });

  it("returns null for conversational text", () => {
    expect(parseCommand("what do you think about the weather?")).toBeNull();
    expect(parseCommand("")).toBeNull();
  });

  it("handles volume and mute", () => {
    expect(parseCommand("volume up")?.params.direction).toBe("up");
    expect(parseCommand("mute")?.params.direction).toBe("mute");
  });
});

describe("validateAiIntent", () => {
  it("accepts a known intent and forces risk from the table", () => {
    const intent = validateAiIntent({ kind: "power", params: { action: "sleep" }, risk: "safe" });
    expect(intent?.kind).toBe("power");
    // risk must come from our table (dangerous), never from the model's claim (safe)
    expect(intent?.risk).toBe("dangerous");
    expect(intent?.source).toBe("ai");
  });

  it("rejects unknown intent kinds", () => {
    expect(validateAiIntent({ kind: "format_hard_drive", params: {} })).toBeNull();
    expect(validateAiIntent(null)).toBeNull();
    expect(validateAiIntent("open chrome")).toBeNull();
  });

  it("drops non-string params", () => {
    const intent = validateAiIntent({ kind: "open_app", params: { app: "Chrome", extra: 42 } });
    expect(intent?.params.app).toBe("Chrome");
    expect(intent?.params.extra).toBeUndefined();
  });
});
