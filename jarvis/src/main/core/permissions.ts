/**
 * Permission gate for risky operations. Dangerous actions (delete, shutdown,
 * power state changes, …) require an explicit native confirmation dialog
 * unless the renderer already collected confirmation from the user.
 */
import { BrowserWindow, dialog } from "electron";
import type { AutomationRisk } from "@shared/types";
import { logger } from "./logger";

export interface PermissionRequest {
  summary: string;
  risk: AutomationRisk;
  /** Renderer-side confirmation already collected. */
  preConfirmed?: boolean;
  /** Settings toggle: when false, dangerous actions run without prompting. */
  confirmDangerous: boolean;
}

export async function requestPermission(req: PermissionRequest): Promise<boolean> {
  if (req.risk === "safe") return true;
  if (req.preConfirmed) {
    logger.info("permissions", `Pre-confirmed: ${req.summary}`);
    return true;
  }
  if (req.risk === "sensitive") return true;
  if (!req.confirmDangerous) {
    logger.warn("permissions", `Dangerous action allowed without prompt (setting off): ${req.summary}`);
    return true;
  }

  const win = BrowserWindow.getAllWindows()[0];
  const options = {
    type: "warning" as const,
    buttons: ["Cancel", "Proceed"],
    defaultId: 0,
    cancelId: 0,
    title: "JARVIS — Confirm action",
    message: "JARVIS wants to perform a potentially destructive action",
    detail: req.summary,
  };
  const { response } = win
    ? await dialog.showMessageBox(win, options)
    : await dialog.showMessageBox(options);
  const granted = response === 1;
  logger.info("permissions", `${granted ? "Granted" : "Denied"}: ${req.summary}`);
  return granted;
}
