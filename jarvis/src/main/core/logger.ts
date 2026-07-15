/**
 * Structured logging with three sinks: console, a rotating log file, and the
 * activity_logs table (which powers the Activity Logs page). Electron-free.
 */
import fs from "node:fs";
import path from "node:path";
import type { Database } from "./db";
import type { LogLevel } from "@shared/types";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MAX_LOG_FILE_BYTES = 2 * 1024 * 1024;

let logDir: string | null = null;
let db: Database | null = null;
let minLevel: LogLevel = "info";

export function initLogger(options: { dir?: string; database?: Database; level?: LogLevel }): void {
  if (options.dir) {
    logDir = options.dir;
    fs.mkdirSync(logDir, { recursive: true });
  }
  if (options.database) db = options.database;
  if (options.level) minLevel = options.level;
}

function writeFileSink(line: string): void {
  if (!logDir) return;
  const file = path.join(logDir, "jarvis.log");
  try {
    if (fs.existsSync(file) && fs.statSync(file).size > MAX_LOG_FILE_BYTES) {
      fs.renameSync(file, path.join(logDir, "jarvis.log.1"));
    }
    fs.appendFileSync(file, line + "\n");
  } catch {
    // Logging must never take the app down.
  }
}

function writeDbSink(level: LogLevel, category: string, message: string, meta?: unknown): void {
  if (!db) return;
  try {
    db.prepare(
      "INSERT INTO activity_logs (level, category, message, meta, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(
      level,
      category,
      message,
      meta === undefined ? null : JSON.stringify(meta),
      new Date().toISOString(),
    );
  } catch {
    // ignore
  }
}

export function log(level: LogLevel, category: string, message: string, meta?: unknown): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;
  const ts = new Date().toISOString();
  const line = `${ts} [${level.toUpperCase()}] [${category}] ${message}${
    meta !== undefined ? " " + safeJson(meta) : ""
  }`;
  // eslint-disable-next-line no-console
  (level === "error" ? console.error : console.log)(line);
  writeFileSink(line);
  writeDbSink(level, category, message, meta);
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export const logger = {
  debug: (category: string, message: string, meta?: unknown) => log("debug", category, message, meta),
  info: (category: string, message: string, meta?: unknown) => log("info", category, message, meta),
  warn: (category: string, message: string, meta?: unknown) => log("warn", category, message, meta),
  error: (category: string, message: string, meta?: unknown) => log("error", category, message, meta),
};
