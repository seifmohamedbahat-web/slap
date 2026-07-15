/**
 * Auto-update wiring via electron-updater. Only active in packaged builds
 * with a publish target configured in electron-builder.yml; a failed check
 * never disturbs the app.
 */
import { app } from "electron";
import { logger } from "../core/logger";

export function initAutoUpdates(): void {
  if (!app.isPackaged) {
    logger.debug("updater", "Skipping auto-update wiring in development");
    return;
  }
  void (async () => {
    try {
      const { autoUpdater } = await import("electron-updater");
      autoUpdater.autoDownload = true;
      autoUpdater.autoInstallOnAppQuit = true;
      autoUpdater.on("update-available", (info) =>
        logger.info("updater", `Update available: ${info.version}`),
      );
      autoUpdater.on("update-downloaded", (info) =>
        logger.info("updater", `Update downloaded: ${info.version} (installs on quit)`),
      );
      autoUpdater.on("error", (err) =>
        logger.warn("updater", "Auto-update error", { err: String(err) }),
      );
      await autoUpdater.checkForUpdates();
    } catch (err) {
      logger.warn("updater", "Auto-update init failed", { err: String(err) });
    }
  })();
}
