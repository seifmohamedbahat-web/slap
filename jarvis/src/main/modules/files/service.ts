/**
 * File management: listing, safe deletes (OS trash), organize-downloads with
 * undo, duplicate detection, and zip/unzip via platform tooling.
 */
import { shell } from "electron";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { DuplicateGroup, FileEntry, OrganizeResult } from "@shared/types";
import { logger } from "../../core/logger";

const execFileAsync = promisify(execFile);

export function homeDirs() {
  const home = os.homedir();
  return {
    home,
    downloads: path.join(home, "Downloads"),
    documents: path.join(home, "Documents"),
  };
}

export async function listDir(dir: string): Promise<FileEntry[]> {
  const resolved = path.resolve(dir);
  const entries = await fsp.readdir(resolved, { withFileTypes: true });
  const out: FileEntry[] = [];
  for (const entry of entries) {
    const full = path.join(resolved, entry.name);
    try {
      const stat = await fsp.stat(full);
      out.push({
        name: entry.name,
        path: full,
        isDirectory: entry.isDirectory(),
        sizeBytes: entry.isDirectory() ? 0 : stat.size,
        modifiedAt: stat.mtime.toISOString(),
      });
    } catch {
      // Broken symlinks etc. — skip.
    }
  }
  return out.sort((a, b) =>
    a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name) : a.isDirectory ? -1 : 1,
  );
}

export async function readTextFile(
  file: string,
  maxBytes = 512 * 1024,
): Promise<{ content: string; truncated: boolean }> {
  const stat = await fsp.stat(file);
  const handle = await fsp.open(file, "r");
  try {
    const size = Math.min(stat.size, maxBytes);
    const buf = Buffer.alloc(size);
    await handle.read(buf, 0, size, 0);
    return { content: buf.toString("utf8"), truncated: stat.size > maxBytes };
  } finally {
    await handle.close();
  }
}

export async function makeDir(dir: string): Promise<void> {
  await fsp.mkdir(dir, { recursive: true });
  logger.info("files", `Created folder ${dir}`);
}

export async function renamePath(from: string, to: string): Promise<void> {
  await fsp.rename(from, to);
  logger.info("files", `Renamed ${from} → ${to}`);
}

export async function copyPath(from: string, to: string): Promise<void> {
  await fsp.cp(from, to, { recursive: true });
  logger.info("files", `Copied ${from} → ${to}`);
}

export async function movePath(from: string, to: string): Promise<void> {
  await fsp.mkdir(path.dirname(to), { recursive: true });
  try {
    await fsp.rename(from, to);
  } catch {
    // Cross-device move: copy then remove.
    await fsp.cp(from, to, { recursive: true });
    await fsp.rm(from, { recursive: true });
  }
  logger.info("files", `Moved ${from} → ${to}`);
}

/** Deletes to the OS trash so the action is recoverable. */
export async function trashPath(target: string): Promise<void> {
  await shell.trashItem(path.resolve(target));
  logger.warn("files", `Moved to trash: ${target}`);
}

const CATEGORY_BY_EXT: Record<string, string> = {
  ".jpg": "Images", ".jpeg": "Images", ".png": "Images", ".gif": "Images", ".webp": "Images", ".svg": "Images",
  ".mp4": "Video", ".mkv": "Video", ".mov": "Video", ".avi": "Video", ".webm": "Video",
  ".mp3": "Audio", ".wav": "Audio", ".flac": "Audio", ".m4a": "Audio", ".ogg": "Audio",
  ".pdf": "Documents", ".doc": "Documents", ".docx": "Documents", ".xls": "Documents",
  ".xlsx": "Documents", ".ppt": "Documents", ".pptx": "Documents", ".txt": "Documents", ".md": "Documents", ".csv": "Documents",
  ".zip": "Archives", ".rar": "Archives", ".7z": "Archives", ".tar": "Archives", ".gz": "Archives",
  ".exe": "Installers", ".msi": "Installers", ".dmg": "Installers", ".deb": "Installers", ".appimage": "Installers",
  ".js": "Code", ".ts": "Code", ".py": "Code", ".java": "Code", ".cpp": "Code", ".html": "Code", ".css": "Code", ".json": "Code",
};

export async function organizeDownloads(): Promise<OrganizeResult> {
  const downloads = homeDirs().downloads;
  const result: OrganizeResult = { moved: [], skipped: [] };
  const entries = await fsp.readdir(downloads, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isFile() || entry.name.startsWith(".")) {
      result.skipped.push(entry.name);
      continue;
    }
    const category = CATEGORY_BY_EXT[path.extname(entry.name).toLowerCase()] ?? "Other";
    const destDir = path.join(downloads, category);
    const from = path.join(downloads, entry.name);
    let to = path.join(destDir, entry.name);
    try {
      await fsp.mkdir(destDir, { recursive: true });
      if (fs.existsSync(to)) {
        const ext = path.extname(entry.name);
        to = path.join(destDir, `${path.basename(entry.name, ext)}-${Date.now()}${ext}`);
      }
      await fsp.rename(from, to);
      result.moved.push({ from, to });
    } catch (err) {
      logger.warn("files", `Skipped ${entry.name} while organizing`, { err: String(err) });
      result.skipped.push(entry.name);
    }
  }
  logger.info("files", `Organized Downloads: ${result.moved.length} moved`);
  return result;
}

const SKIP_DIRS = new Set(["node_modules", ".git", ".cache", "__pycache__"]);

export async function findDuplicates(root: string, maxFiles = 5000): Promise<DuplicateGroup[]> {
  const bySize = new Map<number, string[]>();
  let seen = 0;

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > 6 || seen >= maxFiles) return;
    const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (seen >= maxFiles) return;
      if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full, depth + 1);
      } else if (entry.isFile()) {
        seen++;
        const stat = await fsp.stat(full).catch(() => null);
        if (stat && stat.size > 0) {
          const list = bySize.get(stat.size) ?? [];
          list.push(full);
          bySize.set(stat.size, list);
        }
      }
    }
  }

  await walk(path.resolve(root), 0);

  const groups: DuplicateGroup[] = [];
  for (const [size, paths] of bySize) {
    if (paths.length < 2) continue;
    const byHash = new Map<string, string[]>();
    for (const file of paths) {
      const hash = await hashFilePrefix(file).catch(() => null);
      if (!hash) continue;
      const list = byHash.get(hash) ?? [];
      list.push(file);
      byHash.set(hash, list);
    }
    for (const [hash, dupes] of byHash) {
      if (dupes.length > 1) groups.push({ hash, sizeBytes: size, paths: dupes });
    }
  }
  return groups.sort((a, b) => b.sizeBytes - a.sizeBytes);
}

async function hashFilePrefix(file: string, bytes = 1024 * 1024): Promise<string> {
  const handle = await fsp.open(file, "r");
  try {
    const buf = Buffer.alloc(bytes);
    const { bytesRead } = await handle.read(buf, 0, bytes, 0);
    return crypto.createHash("sha256").update(buf.subarray(0, bytesRead)).digest("hex");
  } finally {
    await handle.close();
  }
}

export async function zipPath(source: string, dest: string): Promise<void> {
  if (process.platform === "win32") {
    await execFileAsync("powershell", [
      "-NoProfile",
      "-Command",
      `Compress-Archive -Path '${source.replace(/'/g, "''")}' -DestinationPath '${dest.replace(/'/g, "''")}' -Force`,
    ]);
  } else {
    const cwd = path.dirname(source);
    await execFileAsync("zip", ["-r", dest, path.basename(source)], { cwd });
  }
  logger.info("files", `Compressed ${source} → ${dest}`);
}

export async function unzipPath(source: string, destDir: string): Promise<void> {
  await fsp.mkdir(destDir, { recursive: true });
  if (process.platform === "win32") {
    await execFileAsync("powershell", [
      "-NoProfile",
      "-Command",
      `Expand-Archive -Path '${source.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`,
    ]);
  } else {
    await execFileAsync("unzip", ["-o", source, "-d", destDir]);
  }
  logger.info("files", `Extracted ${source} → ${destDir}`);
}
