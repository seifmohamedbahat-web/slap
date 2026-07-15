/**
 * Plugin system. A plugin is a folder inside <userData>/plugins containing:
 *   plugin.json  — manifest { name, version, description, commands? }
 *   main.js      — script evaluated in a restricted vm context
 *
 * Plugins register command handlers via the injected `jarvis` API:
 *   jarvis.registerCommand("hello", async (input) => "Hi from plugin!");
 *
 * The vm context has no `require` and no Node globals, which keeps casual
 * plugins contained. This is containment, not a hard security boundary —
 * users should only install plugins they trust.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import type { Database } from "../../core/db";
import { logger } from "../../core/logger";
import type { PluginInfo, PluginManifest } from "@shared/types";

interface PluginCommand {
  pluginId: string;
  command: string;
  handler: (input: string) => Promise<string>;
}

const loaded = new Map<string, PluginInfo>();
const commands = new Map<string, PluginCommand>();
let pluginsRoot = "";

export function pluginsDir(): string {
  return pluginsRoot;
}

export function initPlugins(db: Database, root: string): void {
  pluginsRoot = root;
  fs.mkdirSync(root, { recursive: true });
  loaded.clear();
  commands.clear();

  const dirs = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  for (const dir of dirs) {
    const id = dir.name;
    const manifestPath = path.join(root, id, "plugin.json");
    const mainPath = path.join(root, id, "main.js");
    let manifest: PluginManifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as PluginManifest;
      if (!manifest.name || !manifest.version) throw new Error("name and version are required");
    } catch (err) {
      loaded.set(id, {
        id,
        manifest: { name: id, version: "?", description: "Invalid manifest" },
        path: path.join(root, id),
        enabled: false,
        loaded: false,
        error: `Invalid plugin.json: ${String(err)}`,
      });
      continue;
    }

    const row = db.prepare("SELECT enabled FROM plugins WHERE id = ?").get(id) as
      | { enabled: number }
      | undefined;
    const enabled = row ? row.enabled === 1 : false;
    if (!row) db.prepare("INSERT INTO plugins (id, enabled) VALUES (?, 0)").run(id);

    const info: PluginInfo = {
      id,
      manifest,
      path: path.join(root, id),
      enabled,
      loaded: false,
    };

    if (enabled && fs.existsSync(mainPath)) {
      try {
        runPluginScript(id, fs.readFileSync(mainPath, "utf8"));
        info.loaded = true;
        logger.info("plugins", `Loaded plugin ${manifest.name}@${manifest.version}`);
      } catch (err) {
        info.error = String(err);
        logger.error("plugins", `Failed to load plugin ${id}`, { err: String(err) });
      }
    }
    loaded.set(id, info);
  }
}

function runPluginScript(pluginId: string, source: string): void {
  const api = {
    registerCommand(command: string, handler: (input: string) => Promise<string> | string) {
      if (typeof command !== "string" || typeof handler !== "function") return;
      commands.set(command.toLowerCase(), {
        pluginId,
        command,
        handler: async (input: string) => String(await handler(input)),
      });
    },
    log(message: string) {
      logger.info(`plugin:${pluginId}`, String(message));
    },
  };
  const context = vm.createContext({ jarvis: api, console: { log: api.log } });
  new vm.Script(source, { filename: `plugin:${pluginId}/main.js` }).runInContext(context, {
    timeout: 2000,
  });
}

export function listPlugins(): PluginInfo[] {
  return [...loaded.values()];
}

export function setPluginEnabled(db: Database, id: string, enabled: boolean): void {
  db.prepare(
    "INSERT INTO plugins (id, enabled) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET enabled = excluded.enabled",
  ).run(id, enabled ? 1 : 0);
  initPlugins(db, pluginsRoot);
}

/** Matches "<command> ..." style plugin invocations. */
export function getPluginCommand(input: string): PluginCommand | null {
  const first = input.trim().toLowerCase().split(/\s+/)[0];
  return commands.get(first) ?? null;
}
