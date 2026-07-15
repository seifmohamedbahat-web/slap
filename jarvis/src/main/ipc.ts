/**
 * Registers every IPC handler declared in the shared contract. Keeping the
 * registry in one place makes the renderer↔main surface auditable.
 */
import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";
import type { IpcChannel, IpcInvokeMap } from "@shared/ipc";
import type { AppContext } from "./context";
import { logger } from "./core/logger";
import * as keystore from "./core/keystore";
import { getSettings, updateSettings } from "./core/settings";
import * as store from "./modules/data/store";
import * as profile from "./modules/data/profile";
import * as files from "./modules/files/service";
import * as control from "./modules/system/control";
import { collectStats, listProcesses } from "./modules/system/stats";
import { runCommand, undoCommand, aiParsePrompt } from "./modules/automation/executor";
import { listPlugins, setPluginEnabled, pluginsDir } from "./modules/plugins/loader";
import { textToSpeech, transcribe } from "./modules/voice/elevenlabs";
import { PROVIDERS } from "./modules/ai/router";
import type { ActivityLogEntry } from "@shared/types";

type Handler<C extends IpcChannel> = (
  payload: IpcInvokeMap[C][0],
) => IpcInvokeMap[C][1] | Promise<IpcInvokeMap[C][1]>;

export function registerIpc(ctx: AppContext): void {
  const { db, router } = ctx;

  function handle<C extends IpcChannel>(channel: C, handler: Handler<C>): void {
    ipcMain.handle(channel, async (_event, payload) => {
      try {
        return await handler(payload as IpcInvokeMap[C][0]);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("ipc", `${channel} failed`, { error: message });
        throw new Error(message);
      }
    });
  }

  // -- app / profile ---------------------------------------------------------
  handle("app:info", () => ({
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron ?? "",
    node: process.versions.node ?? "",
    dataDir: app.getPath("userData"),
    encryptionAvailable: keystore.encryptionAvailable(),
  }));
  handle("app:openExternal", async ({ url }) => {
    await shell.openExternal(url);
    return { ok: true };
  });
  handle("app:openPath", async ({ path: p }) => {
    const error = await shell.openPath(p);
    return { ok: !error, error: error || undefined };
  });

  handle("profile:get", () => profile.getProfile(db));
  handle("profile:update", ({ name, email }) => profile.updateProfile(db, name, email));
  handle("profile:setPin", ({ pin }) => {
    profile.setPin(db, pin);
    return { ok: true };
  });
  handle("profile:verifyPin", ({ pin }) => ({ valid: profile.verifyPin(db, pin) }));
  handle("profile:completeOnboarding", () => {
    profile.completeOnboarding(db);
    return { ok: true };
  });

  // -- settings --------------------------------------------------------------
  handle("settings:get", () => getSettings(db));
  handle("settings:update", (patch) => {
    const next = updateSettings(db, patch);
    if (patch.launchAtLogin !== undefined && app.isPackaged) {
      app.setLoginItemSettings({ openAtLogin: patch.launchAtLogin });
    }
    return next;
  });

  // -- API keys --------------------------------------------------------------
  handle("keys:list", () => keystore.listApiKeys(db));
  handle("keys:set", ({ provider, key }) => keystore.setApiKey(db, provider, key));
  handle("keys:delete", ({ provider }) => {
    keystore.deleteApiKey(db, provider);
    return { ok: true };
  });
  handle("keys:test", async ({ provider }) => {
    const key = keystore.getApiKey(db, provider);
    if (!key) return { ok: false, error: "No key stored" };
    const p = PROVIDERS[provider as keyof typeof PROVIDERS];
    if (!p) return { ok: true }; // e.g. elevenlabs — presence is enough
    try {
      const controller = new AbortController();
      await p.chat({
        apiKey: key,
        model: getSettings(db).defaultModels[p.id],
        system: "ping",
        messages: [{ role: "user", content: "Reply with OK." }],
        signal: controller.signal,
        onDelta: () => controller.abort(),
      });
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // An abort means we got a first token — the key works.
      if (/abort/i.test(message)) return { ok: true };
      return { ok: false, error: message };
    }
  });

  // -- AI --------------------------------------------------------------------
  handle("ai:conversations:list", () => router.listConversations());
  handle("ai:conversations:create", (opts) => router.createConversation(opts));
  handle("ai:conversations:delete", ({ id }) => {
    router.deleteConversation(id);
    return { ok: true };
  });
  handle("ai:conversations:rename", ({ id, title }) => {
    router.renameConversation(id, title);
    return { ok: true };
  });
  handle("ai:messages:list", ({ conversationId }) => router.listMessages(conversationId));
  handle("ai:chat:start", (request) => router.startChat(request));
  handle("ai:chat:cancel", ({ requestId }) => {
    router.cancel(requestId);
    return { ok: true };
  });
  handle("ai:models", () =>
    (Object.keys(PROVIDERS) as (keyof typeof PROVIDERS)[]).map((provider) => ({
      provider,
      models: PROVIDERS[provider].models,
    })),
  );

  // -- voice -----------------------------------------------------------------
  handle("voice:transcribe", async ({ audioBase64, mimeType }) => {
    const settings = getSettings(db);
    return transcribe({
      elevenLabsKey: keystore.getApiKey(db, "elevenlabs"),
      openaiKey: keystore.getApiKey(db, "openai"),
      preferred: settings.voice.sttProvider,
      audio: Buffer.from(audioBase64, "base64"),
      mimeType,
    });
  });
  handle("voice:speak", async ({ text }) => {
    const key = keystore.getApiKey(db, "elevenlabs");
    if (!key) throw new Error("ElevenLabs API key not configured");
    return textToSpeech({ apiKey: key, voiceId: getSettings(db).voice.ttsVoiceId, text });
  });

  // -- automation ------------------------------------------------------------
  handle("automation:run", ({ input, confirmed }) =>
    runCommand(
      {
        db,
        aiParse: (text) => aiParseViaRouter(ctx, text),
        onReminderCreated: () => undefined,
      },
      input,
      confirmed,
    ),
  );
  handle("automation:undo", async ({ token }) => ({ ok: await undoCommand(token) }));
  handle("automation:history", ({ limit }) => store.listCommandHistory(db, limit));

  // -- system ----------------------------------------------------------------
  handle("system:stats", () => collectStats());
  handle("system:processes", () => listProcesses());
  handle("system:screenshot", async () => ({
    path: await control.takeScreenshot(control.screenshotDir()),
  }));
  handle("system:power", ({ action }) =>
    runCommand({ db }, action === "lock" ? "lock" : action),
  );

  // -- files -----------------------------------------------------------------
  handle("files:list", async ({ dir }) => ({ entries: await files.listDir(dir), dir }));
  handle("files:home", () => files.homeDirs());
  handle("files:read", ({ path: p, maxBytes }) => files.readTextFile(p, maxBytes));
  handle("files:mkdir", async ({ path: p }) => {
    await files.makeDir(p);
    return { ok: true };
  });
  handle("files:rename", async ({ from, to }) => {
    await files.renamePath(from, to);
    return { ok: true };
  });
  handle("files:copy", async ({ from, to }) => {
    await files.copyPath(from, to);
    return { ok: true };
  });
  handle("files:move", async ({ from, to }) => {
    await files.movePath(from, to);
    return { ok: true };
  });
  handle("files:delete", ({ path: p }) => runCommand({ db }, `delete ${p}`));
  handle("files:organizeDownloads", () => files.organizeDownloads());
  handle("files:findDuplicates", ({ dir }) => files.findDuplicates(dir));
  handle("files:zip", async ({ source, dest }) => {
    await files.zipPath(source, dest);
    return { ok: true };
  });
  handle("files:unzip", async ({ source, destDir }) => {
    await files.unzipPath(source, destDir);
    return { ok: true };
  });

  // -- productivity ----------------------------------------------------------
  handle("notes:list", (payload) => store.listNotes(db, payload?.kind));
  handle("notes:save", (patch) => store.saveNote(db, patch));
  handle("notes:delete", ({ id }) => {
    store.deleteNote(db, id);
    return { ok: true };
  });
  handle("tasks:list", () => store.listTasks(db));
  handle("tasks:save", (patch) => store.saveTask(db, patch));
  handle("tasks:delete", ({ id }) => {
    store.deleteTask(db, id);
    return { ok: true };
  });
  handle("events:list", () => store.listEvents(db));
  handle("events:save", (patch) => store.saveEvent(db, patch));
  handle("events:delete", ({ id }) => {
    store.deleteEvent(db, id);
    return { ok: true };
  });
  handle("projects:list", () => store.listProjects(db));
  handle("projects:save", (patch) => store.saveProject(db, patch));
  handle("projects:delete", ({ id }) => {
    store.deleteProject(db, id);
    return { ok: true };
  });
  handle("reminders:list", () => store.listReminders(db));
  handle("reminders:save", ({ message, fireAt }) => store.saveReminder(db, message, fireAt));
  handle("reminders:delete", ({ id }) => {
    store.deleteReminder(db, id);
    return { ok: true };
  });

  // -- memory ----------------------------------------------------------------
  handle("memory:list", (payload) => store.listMemory(db, payload?.category));
  handle("memory:save", (patch) => store.saveMemory(db, patch));
  handle("memory:delete", ({ id }) => {
    store.deleteMemory(db, id);
    return { ok: true };
  });

  // -- plugins ---------------------------------------------------------------
  handle("plugins:list", () => listPlugins());
  handle("plugins:setEnabled", ({ id, enabled }) => {
    setPluginEnabled(db, id, enabled);
    return listPlugins();
  });
  handle("plugins:openDir", async () => {
    await shell.openPath(pluginsDir());
    return { ok: true };
  });

  // -- logs ------------------------------------------------------------------
  handle("logs:list", ({ limit = 200, level, category }) => {
    const clauses: string[] = [];
    const args: (string | number)[] = [];
    if (level) {
      clauses.push("level = ?");
      args.push(level);
    }
    if (category) {
      clauses.push("category = ?");
      args.push(category);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = db
      .prepare(`SELECT * FROM activity_logs ${where} ORDER BY id DESC LIMIT ?`)
      .all(...args, limit) as Record<string, unknown>[];
    return rows.map(
      (r): ActivityLogEntry => ({
        id: r.id as number,
        level: r.level as ActivityLogEntry["level"],
        category: r.category as string,
        message: r.message as string,
        meta: (r.meta as string) ?? null,
        createdAt: r.created_at as string,
      }),
    );
  });
  handle("logs:clear", () => {
    db.prepare("DELETE FROM activity_logs").run();
    return { ok: true };
  });

  logger.info("ipc", "IPC handlers registered");
}

/**
 * Runs a single non-streaming AI turn purely to parse a command into an
 * intent. Uses the first configured provider; returns parsed JSON or null.
 */
async function aiParseViaRouter(ctx: AppContext, input: string): Promise<unknown | null> {
  const settings = getSettings(ctx.db);
  const order = [settings.taskRouting.automation, ...settings.fallbackOrder];
  for (const provider of order) {
    const key = ctx.getApiKey(provider);
    if (!key) continue;
    try {
      const controller = new AbortController();
      const text = await PROVIDERS[provider].chat({
        apiKey: key,
        model: settings.defaultModels[provider],
        system: "You output only JSON or the literal word null. No prose.",
        messages: [{ role: "user", content: aiParsePrompt(input) }],
        signal: controller.signal,
        onDelta: () => undefined,
      });
      const trimmed = text.trim();
      if (/^null$/i.test(trimmed)) return null;
      const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      continue;
    }
  }
  return null;
}

/** Access to the primary window for pushing events. */
export function mainWindow(): BrowserWindow | null {
  return BrowserWindow.getAllWindows()[0] ?? null;
}

export const PRELOAD_PATH = path.join(__dirname, "../preload/index.cjs");
