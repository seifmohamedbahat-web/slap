/**
 * Electron main entry point. Boots the database, core services, IPC registry,
 * the AI router, and background loops (system-stats ticks, reminder polling),
 * then creates the hardened BrowserWindow.
 */
import { app, BrowserWindow, session } from "electron";
import path from "node:path";
import { openDatabase } from "./core/db";
import { initLogger, logger } from "./core/logger";
import { getApiKey } from "./core/keystore";
import { getSettings } from "./core/settings";
import { registerIpc } from "./ipc";
import type { AppContext } from "./context";
import { AiRouter } from "./modules/ai/router";
import { initPlugins } from "./modules/plugins/loader";
import { initAutoUpdates } from "./modules/updater";
import { collectStats } from "./modules/system/stats";
import { dueReminders, markReminderFired, memoryContext } from "./modules/data/store";
import type { AiStreamEvent, Reminder } from "@shared/types";

let win: BrowserWindow | null = null;
let statsTimer: NodeJS.Timeout | null = null;
let reminderTimer: NodeJS.Timeout | null = null;

// Single-instance lock: focus the existing window instead of opening a second.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(bootstrap).catch((err) => {
    logger.error("main", "Fatal error during startup", { err: String(err) });
    app.quit();
  });
}

async function bootstrap(): Promise<void> {
  const userData = app.getPath("userData");
  const db = openDatabase(path.join(userData, "jarvis.db"));
  initLogger({
    dir: path.join(userData, "logs"),
    database: db,
    level: app.isPackaged ? "info" : "debug",
  });
  logger.info("main", `JARVIS starting — v${app.getVersion()} on ${process.platform}`);

  const ctx: AppContext = {
    db,
    router: null as unknown as AiRouter,
    getApiKey: (provider) => getApiKey(db, provider),
  };
  ctx.router = new AiRouter({
    db,
    getApiKey: (provider) => getApiKey(db, provider),
    getMemoryContext: () => memoryContext(db),
    emit: (event: AiStreamEvent) => win?.webContents.send("ai:stream", event),
  });

  initPlugins(db, path.join(userData, "plugins"));
  registerIpc(ctx);
  hardenSession();
  createWindow();
  startBackgroundLoops(db);
  initAutoUpdates();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1040,
    minHeight: 680,
    show: false,
    backgroundColor: "#04060d",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // preload needs Node built-ins for the bridge; renderer stays isolated
    },
  });

  win.once("ready-to-show", () => win?.show());

  const devUrl = process.env.JARVIS_DEV_SERVER_URL;
  if (devUrl) {
    void win.loadURL(devUrl);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    void win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  win.on("closed", () => {
    win = null;
  });
}

/** Blocks unexpected navigation, new windows, and permission requests. */
function hardenSession(): void {
  app.on("web-contents-created", (_e, contents) => {
    contents.setWindowOpenHandler(() => ({ action: "deny" }));
    contents.on("will-navigate", (event, url) => {
      const dev = process.env.JARVIS_DEV_SERVER_URL;
      if (dev && url.startsWith(dev)) return;
      event.preventDefault();
    });
  });
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    // Microphone is required for the voice assistant; everything else is denied.
    callback(permission === "media");
  });
}

function startBackgroundLoops(db: ReturnType<typeof openDatabase>): void {
  const tick = async () => {
    try {
      const stats = await collectStats();
      win?.webContents.send("system:stats:tick", stats);
    } catch (err) {
      logger.debug("stats", "stats tick failed", { err: String(err) });
    }
  };
  void tick();
  statsTimer = setInterval(tick, 2000);

  const pollReminders = () => {
    try {
      for (const reminder of dueReminders(db)) {
        markReminderFired(db, reminder.id);
        win?.webContents.send("reminder:fired", reminder satisfies Reminder);
        logger.info("reminder", `Reminder fired: ${reminder.message}`);
      }
    } catch (err) {
      logger.debug("reminder", "reminder poll failed", { err: String(err) });
    }
  };
  reminderTimer = setInterval(pollReminders, 15_000);

  // Apply launch-at-login preference on boot.
  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: getSettings(db).launchAtLogin });
  }
}

app.on("window-all-closed", () => {
  if (statsTimer) clearInterval(statsTimer);
  if (reminderTimer) clearInterval(reminderTimer);
  if (process.platform !== "darwin") app.quit();
});
