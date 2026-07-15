/**
 * Computer control: launching/closing applications, screenshots, volume and
 * power state. Windows-first (per the JARVIS spec) with macOS/Linux paths so
 * development works anywhere. Every command is logged by the executor.
 */
import { desktopCapturer, screen, shell } from "electron";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { logger } from "../../core/logger";

const execFileAsync = promisify(execFile);

/** Friendly-name → per-platform launch spec. */
const APP_ALIASES: Record<
  string,
  { win: string; mac?: string; linux?: string; process: string }
> = {
  chrome: { win: "chrome", mac: "Google Chrome", linux: "google-chrome", process: "chrome" },
  edge: { win: "msedge", mac: "Microsoft Edge", linux: "microsoft-edge", process: "msedge" },
  firefox: { win: "firefox", mac: "Firefox", linux: "firefox", process: "firefox" },
  "vs code": { win: "code", mac: "Visual Studio Code", linux: "code", process: "Code" },
  code: { win: "code", mac: "Visual Studio Code", linux: "code", process: "Code" },
  cursor: { win: "cursor", mac: "Cursor", linux: "cursor", process: "Cursor" },
  explorer: { win: "explorer", process: "explorer" },
  "file explorer": { win: "explorer", process: "explorer" },
  terminal: { win: "wt", mac: "Terminal", linux: "x-terminal-emulator", process: "WindowsTerminal" },
  powershell: { win: "powershell", process: "powershell" },
  cmd: { win: "cmd", process: "cmd" },
  notepad: { win: "notepad", process: "notepad" },
  calculator: { win: "calc", mac: "Calculator", linux: "gnome-calculator", process: "Calculator" },
  spotify: { win: "spotify", mac: "Spotify", linux: "spotify", process: "Spotify" },
  discord: { win: "discord", mac: "Discord", linux: "discord", process: "Discord" },
};

export function resolveApp(name: string) {
  return APP_ALIASES[name.trim().toLowerCase()] ?? null;
}

export async function openApp(name: string): Promise<string> {
  const alias = resolveApp(name);
  const target = alias
    ? process.platform === "win32"
      ? alias.win
      : process.platform === "darwin"
        ? (alias.mac ?? alias.win)
        : (alias.linux ?? alias.win)
    : name.trim();

  if (process.platform === "win32") {
    // `start` resolves App Paths registry entries, so bare names like
    // "chrome" or "cursor" work without a full path.
    spawn("cmd", ["/c", "start", "", target], { detached: true, stdio: "ignore" }).unref();
  } else if (process.platform === "darwin") {
    await execFileAsync("open", ["-a", target]);
  } else {
    spawn(target, [], { detached: true, stdio: "ignore" }).unref();
  }
  logger.info("control", `Launched application: ${target}`);
  return `Opened ${name}.`;
}

export async function closeApp(name: string): Promise<string> {
  const alias = resolveApp(name);
  const proc = alias?.process ?? name.trim();
  if (process.platform === "win32") {
    await execFileAsync("taskkill", ["/IM", `${proc}.exe`, "/F"]);
  } else {
    await execFileAsync("pkill", ["-f", proc]);
  }
  logger.info("control", `Closed application: ${proc}`);
  return `Closed ${name}.`;
}

export async function restartApp(name: string): Promise<string> {
  await closeApp(name).catch(() => undefined);
  await new Promise((r) => setTimeout(r, 800));
  return openApp(name);
}

export async function openUrl(url: string): Promise<string> {
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  await shell.openExternal(normalized);
  return `Opened ${normalized}.`;
}

export async function webSearch(query: string): Promise<string> {
  await shell.openExternal(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
  return `Searching Google for “${query}”.`;
}

export async function openPath(target: string): Promise<string> {
  const error = await shell.openPath(target);
  if (error) throw new Error(error);
  return `Opened ${target}.`;
}

export async function takeScreenshot(saveDir: string): Promise<string> {
  const display = screen.getPrimaryDisplay();
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: {
      width: display.size.width * display.scaleFactor,
      height: display.size.height * display.scaleFactor,
    },
  });
  const source = sources[0];
  if (!source) throw new Error("No screen source available");
  fs.mkdirSync(saveDir, { recursive: true });
  const file = path.join(saveDir, `screenshot-${Date.now()}.png`);
  fs.writeFileSync(file, source.thumbnail.toPNG());
  logger.info("control", `Screenshot saved to ${file}`);
  return file;
}

export async function setVolume(direction: "up" | "down" | "mute"): Promise<string> {
  if (process.platform === "win32") {
    const key = direction === "mute" ? 173 : direction === "down" ? 174 : 175;
    // Each keypress is ~2%; send five for a noticeable step.
    const presses = direction === "mute" ? 1 : 5;
    const script = `$w = New-Object -ComObject WScript.Shell; 1..${presses} | ForEach-Object { $w.SendKeys([char]${key}) }`;
    await execFileAsync("powershell", ["-NoProfile", "-Command", script]);
  } else if (process.platform === "darwin") {
    const script =
      direction === "mute"
        ? "set volume output muted true"
        : `set volume output volume ((output volume of (get volume settings)) ${direction === "up" ? "+" : "-"} 10)`;
    await execFileAsync("osascript", ["-e", script]);
  } else {
    const arg = direction === "mute" ? "toggle" : direction === "up" ? "5%+" : "5%-";
    await execFileAsync("amixer", ["-q", "sset", "Master", arg === "toggle" ? "toggle" : arg]);
  }
  return direction === "mute" ? "Toggled mute." : `Volume ${direction}.`;
}

export async function powerAction(
  action: "shutdown" | "restart" | "sleep" | "lock",
): Promise<string> {
  const platform = process.platform;
  const run = (cmd: string, args: string[]) => execFileAsync(cmd, args);
  if (platform === "win32") {
    if (action === "shutdown") await run("shutdown", ["/s", "/t", "0"]);
    else if (action === "restart") await run("shutdown", ["/r", "/t", "0"]);
    else if (action === "sleep")
      await run("rundll32", ["powrprof.dll,SetSuspendState", "0,1,0"]);
    else await run("rundll32", ["user32.dll,LockWorkStation"]);
  } else if (platform === "darwin") {
    const scripts: Record<typeof action, string[]> = {
      shutdown: ["-e", 'tell app "System Events" to shut down'],
      restart: ["-e", 'tell app "System Events" to restart'],
      sleep: ["-e", 'tell app "System Events" to sleep'],
      lock: ["-e", 'tell app "System Events" to keystroke "q" using {command down, control down}'],
    };
    await run("osascript", scripts[action]);
  } else {
    if (action === "shutdown") await run("systemctl", ["poweroff"]);
    else if (action === "restart") await run("systemctl", ["reboot"]);
    else if (action === "sleep") await run("systemctl", ["suspend"]);
    else await run("loginctl", ["lock-session"]);
  }
  logger.warn("control", `Power action executed: ${action}`);
  return `Executing ${action}.`;
}

export function screenshotDir(): string {
  return path.join(os.homedir(), "Pictures", "JARVIS Screenshots");
}
