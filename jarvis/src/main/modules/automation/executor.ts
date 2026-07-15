/**
 * Executes parsed automation intents behind the permission gate, records
 * command history, and registers undo handlers where reversal is possible.
 */
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Database } from "../../core/db";
import { newId } from "../../core/db";
import { logger } from "../../core/logger";
import { getSettings } from "../../core/settings";
import { requestPermission } from "../../core/permissions";
import type { AutomationIntent, AutomationResult, Reminder } from "@shared/types";
import { parseCommand, validateAiIntent, KNOWN_INTENTS } from "./engine";
import * as control from "../system/control";
import * as files from "../files/service";
import * as store from "../data/store";
import { collectStats } from "../system/stats";
import { getPluginCommand } from "../plugins/loader";

const execFileAsync = promisify(execFile);

type UndoFn = () => Promise<void>;
const undoRegistry = new Map<string, UndoFn>();

export interface ExecutorDeps {
  db: Database;
  /** Ask the configured AI to parse an unrecognized command into an intent. */
  aiParse?: (input: string) => Promise<unknown | null>;
  onReminderCreated?: (reminder: Reminder) => void;
}

export async function runCommand(
  deps: ExecutorDeps,
  input: string,
  preConfirmed = false,
): Promise<AutomationResult> {
  const { db } = deps;
  let intent: AutomationIntent | null = parseCommand(input);

  // Plugin-registered commands get a chance before the AI fallback.
  if (!intent) {
    const plugin = getPluginCommand(input);
    if (plugin) {
      try {
        const output = await plugin.handler(input);
        store.recordCommand(db, {
          input,
          intentKind: `plugin:${plugin.pluginId}`,
          status: "ok",
          output,
        });
        return {
          ok: true,
          intent: {
            kind: `plugin:${plugin.command}`,
            summary: `Plugin command ${plugin.command}`,
            risk: "safe",
            params: {},
            source: "rules",
          },
          output,
        };
      } catch (err) {
        const output = err instanceof Error ? err.message : String(err);
        store.recordCommand(db, {
          input,
          intentKind: `plugin:${plugin.pluginId}`,
          status: "error",
          output,
        });
        return { ok: false, intent: null, output };
      }
    }
  }

  if (!intent && deps.aiParse) {
    try {
      const raw = await deps.aiParse(input);
      intent = validateAiIntent(raw);
    } catch (err) {
      logger.warn("automation", "AI intent parse failed", { err: String(err) });
    }
  }

  if (!intent) {
    store.recordCommand(db, { input, intentKind: null, status: "unrecognized", output: "" });
    return {
      ok: false,
      intent: null,
      output:
        "I couldn't map that to an action. Try rephrasing, or ask me in the chat instead.",
    };
  }

  const settings = getSettings(db);
  const granted = await requestPermission({
    summary: intent.summary,
    risk: intent.risk,
    preConfirmed,
    confirmDangerous: settings.confirmDangerousActions,
  });
  if (!granted) {
    store.recordCommand(db, {
      input,
      intentKind: intent.kind,
      status: "cancelled",
      output: "User declined",
    });
    return { ok: false, intent, output: "Cancelled.", cancelled: true };
  }

  try {
    const { output, undo } = await execute(deps, intent);
    let undoToken: string | undefined;
    if (undo) {
      undoToken = newId();
      undoRegistry.set(undoToken, undo);
      // Undo windows are short-lived; drop after 10 minutes.
      setTimeout(() => undoRegistry.delete(undoToken!), 10 * 60_000).unref?.();
    }
    store.recordCommand(db, { input, intentKind: intent.kind, status: "ok", output });
    logger.info("automation", `Executed ${intent.kind}`, { input });
    return { ok: true, intent, output, undoToken };
  } catch (err) {
    const output = err instanceof Error ? err.message : String(err);
    store.recordCommand(db, { input, intentKind: intent.kind, status: "error", output });
    logger.error("automation", `Failed ${intent.kind}`, { input, error: output });
    return { ok: false, intent, output: `That failed: ${output}` };
  }
}

export async function undoCommand(token: string): Promise<boolean> {
  const undo = undoRegistry.get(token);
  if (!undo) return false;
  undoRegistry.delete(token);
  await undo();
  logger.info("automation", "Undo executed");
  return true;
}

async function execute(
  deps: ExecutorDeps,
  intent: AutomationIntent,
): Promise<{ output: string; undo?: UndoFn }> {
  const { db } = deps;
  const p = intent.params;
  switch (intent.kind) {
    case "open_app":
      return { output: await control.openApp(p.app) };
    case "close_app":
      return { output: await control.closeApp(p.app) };
    case "restart_app":
      return { output: await control.restartApp(p.app) };
    case "open_url":
      return { output: await control.openUrl(p.url) };
    case "web_search":
      return { output: await control.webSearch(p.query) };
    case "open_path":
      return { output: await control.openPath(p.path) };
    case "screenshot": {
      const file = await control.takeScreenshot(control.screenshotDir());
      return { output: `Screenshot saved to ${file}` };
    }
    case "volume":
      return { output: await control.setVolume(p.direction as "up" | "down" | "mute") };
    case "power":
      return { output: await control.powerAction(p.action as "shutdown" | "restart" | "sleep") };
    case "lock":
      return { output: await control.powerAction("lock") };
    case "organize_downloads": {
      const result = await files.organizeDownloads();
      const undo: UndoFn = async () => {
        for (const { from, to } of result.moved) {
          await files.movePath(to, from).catch(() => undefined);
        }
      };
      return {
        output: `Organized Downloads — moved ${result.moved.length} file(s), skipped ${result.skipped.length}.`,
        undo: result.moved.length > 0 ? undo : undefined,
      };
    }
    case "find_duplicates": {
      const dir = p.dir || files.homeDirs().downloads;
      const groups = await files.findDuplicates(dir);
      const total = groups.reduce((n, g) => n + g.paths.length - 1, 0);
      return {
        output:
          groups.length === 0
            ? `No duplicates found in ${dir}.`
            : `Found ${groups.length} duplicate group(s) (${total} redundant file(s)) in ${dir}. See the File Manager for details.`,
      };
    }
    case "create_folder": {
      const target = path.isAbsolute(p.name)
        ? p.name
        : path.join(files.homeDirs().documents, p.name);
      await files.makeDir(target);
      return { output: `Created folder ${target}` };
    }
    case "delete_path": {
      const target = path.isAbsolute(p.path)
        ? p.path
        : path.join(files.homeDirs().home, p.path);
      await files.trashPath(target);
      return { output: `Moved to trash: ${target} (recoverable from the OS trash).` };
    }
    case "system_stats": {
      const stats = await collectStats();
      const gb = (n: number) => (n / 1024 ** 3).toFixed(1);
      const metric = p.metric ?? "system";
      const parts: string[] = [];
      if (metric === "cpu" || metric === "system")
        parts.push(`CPU ${stats.cpuUsagePercent.toFixed(0)}%`);
      if (metric === "ram" || metric === "memory" || metric === "system")
        parts.push(`RAM ${gb(stats.memUsedBytes)}/${gb(stats.memTotalBytes)} GB`);
      if (metric === "disk" || metric === "system")
        parts.push(`Disk ${gb(stats.diskUsedBytes)}/${gb(stats.diskTotalBytes)} GB`);
      if (metric === "battery" || metric === "system")
        parts.push(
          stats.batteryPercent === null ? "No battery" : `Battery ${stats.batteryPercent}%`,
        );
      return { output: parts.join(" · ") };
    }
    case "daily_note": {
      const note = store.dailyNote(db);
      return { output: `Today's note is ready: “${note.title}”. Open the Notes page to edit.` };
    }
    case "add_task": {
      const task = store.saveTask(db, { title: p.title });
      return { output: `Task added: “${task.title}”.` };
    }
    case "set_reminder": {
      const minutes = Math.max(1, Number(p.minutes) || 5);
      const fireAt = new Date(Date.now() + minutes * 60_000).toISOString();
      const reminder = store.saveReminder(db, p.message || "Reminder", fireAt);
      deps.onReminderCreated?.(reminder);
      return { output: `Reminder set for ${minutes} minute(s) from now.` };
    }
    case "run_command": {
      const shellBin = process.platform === "win32" ? "powershell" : "bash";
      const args = process.platform === "win32" ? ["-NoProfile", "-Command", p.command] : ["-lc", p.command];
      const { stdout, stderr } = await execFileAsync(shellBin, args, {
        timeout: 30_000,
        maxBuffer: 1024 * 1024,
      });
      return { output: (stdout + stderr).trim().slice(0, 4000) || "Command finished (no output)." };
    }
    default:
      throw new Error(`Unknown intent kind: ${intent.kind}`);
  }
}

/** Prompt for the AI intent-parsing fallback used by the router. */
export function aiParsePrompt(input: string): string {
  const kinds = KNOWN_INTENTS.map((k) => k.kind).join(", ");
  return [
    "You convert a user command into a JSON automation intent for a desktop assistant.",
    `Allowed kinds: ${kinds}.`,
    'Respond with ONLY minified JSON: {"kind":"...","params":{...}}.',
    'Params by kind: open_app/close_app/restart_app {"app"}, open_url {"url"}, web_search {"query"},',
    'open_path/delete_path {"path"}, create_folder {"name"}, volume {"direction":"up|down|mute"},',
    'power {"action":"shutdown|restart|sleep"}, system_stats {"metric"}, add_task {"title"},',
    'set_reminder {"message","minutes"}, run_command {"command"}. Others take {}.',
    'If the text is conversation rather than a command, respond with exactly: null',
    `Command: ${JSON.stringify(input)}`,
  ].join("\n");
}
