/**
 * Encrypted API-key storage. Uses Electron's safeStorage (OS keychain-backed:
 * DPAPI on Windows, Keychain on macOS, libsecret on Linux) when available.
 * When the OS provides no encryption backend we still store the key but flag
 * it as unencrypted so the UI can warn the user.
 */
import { safeStorage } from "electron";
import type { Database } from "./db";
import { nowIso } from "./db";
import { logger } from "./logger";
import type { ApiKeyStatus } from "@shared/types";

export const KNOWN_PROVIDERS = ["openai", "gemini", "claude", "elevenlabs"] as const;

export function encryptionAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

export function setApiKey(db: Database, provider: string, key: string): ApiKeyStatus {
  const trimmed = key.trim();
  if (!trimmed) throw new Error("API key is empty");
  let ciphertext: string;
  let encrypted = false;
  if (encryptionAvailable()) {
    ciphertext = safeStorage.encryptString(trimmed).toString("base64");
    encrypted = true;
  } else {
    ciphertext = Buffer.from(trimmed, "utf8").toString("base64");
    logger.warn("keystore", `OS encryption unavailable; storing ${provider} key unencrypted`);
  }
  db.prepare(
    `INSERT INTO api_keys (provider, ciphertext, encrypted, last_four, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(provider) DO UPDATE SET
       ciphertext = excluded.ciphertext,
       encrypted = excluded.encrypted,
       last_four = excluded.last_four,
       created_at = excluded.created_at`,
  ).run(provider, ciphertext, encrypted ? 1 : 0, trimmed.slice(-4), nowIso());
  logger.info("keystore", `API key stored for ${provider}`);
  return { provider, configured: true, lastFour: trimmed.slice(-4), encrypted };
}

export function getApiKey(db: Database, provider: string): string | null {
  const row = db
    .prepare("SELECT ciphertext, encrypted FROM api_keys WHERE provider = ?")
    .get(provider) as { ciphertext: string; encrypted: number } | undefined;
  if (!row) return null;
  try {
    const buf = Buffer.from(row.ciphertext, "base64");
    return row.encrypted ? safeStorage.decryptString(buf) : buf.toString("utf8");
  } catch (err) {
    logger.error("keystore", `Failed to decrypt ${provider} key`, { err: String(err) });
    return null;
  }
}

export function deleteApiKey(db: Database, provider: string): void {
  db.prepare("DELETE FROM api_keys WHERE provider = ?").run(provider);
  logger.info("keystore", `API key deleted for ${provider}`);
}

export function listApiKeys(db: Database): ApiKeyStatus[] {
  const rows = db
    .prepare("SELECT provider, encrypted, last_four FROM api_keys")
    .all() as { provider: string; encrypted: number; last_four: string | null }[];
  const byProvider = new Map(rows.map((r) => [r.provider, r]));
  return KNOWN_PROVIDERS.map((provider) => {
    const row = byProvider.get(provider);
    return {
      provider,
      configured: !!row,
      lastFour: row?.last_four ?? null,
      encrypted: row ? row.encrypted === 1 : encryptionAvailable(),
    };
  });
}
