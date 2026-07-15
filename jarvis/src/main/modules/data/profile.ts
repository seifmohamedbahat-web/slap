/**
 * User profile with optional PIN protection. The PIN is stored only as a
 * salted scrypt hash — never in plaintext.
 */
import crypto from "node:crypto";
import type { Database } from "../../core/db";
import type { UserProfile } from "@shared/types";

type Row = {
  name: string;
  email: string;
  pin_hash: string | null;
  pin_salt: string | null;
  onboarded: number;
};

function row(db: Database): Row {
  return db.prepare("SELECT * FROM profile WHERE id = 1").get() as Row;
}

export function getProfile(db: Database): UserProfile {
  const r = row(db);
  return {
    name: r.name,
    email: r.email,
    hasPin: !!r.pin_hash,
    onboarded: r.onboarded === 1,
  };
}

export function updateProfile(db: Database, name: string, email: string): UserProfile {
  db.prepare("UPDATE profile SET name = ?, email = ? WHERE id = 1").run(name, email);
  return getProfile(db);
}

export function completeOnboarding(db: Database): void {
  db.prepare("UPDATE profile SET onboarded = 1 WHERE id = 1").run();
}

function hashPin(pin: string, salt: string): string {
  return crypto.scryptSync(pin, salt, 32).toString("hex");
}

export function setPin(db: Database, pin: string | null): void {
  if (pin === null || pin === "") {
    db.prepare("UPDATE profile SET pin_hash = NULL, pin_salt = NULL WHERE id = 1").run();
    return;
  }
  const salt = crypto.randomBytes(16).toString("hex");
  db.prepare("UPDATE profile SET pin_hash = ?, pin_salt = ? WHERE id = 1").run(
    hashPin(pin, salt),
    salt,
  );
}

export function verifyPin(db: Database, pin: string): boolean {
  const r = row(db);
  if (!r.pin_hash || !r.pin_salt) return true; // no PIN set → always unlocked
  const candidate = hashPin(pin, r.pin_salt);
  return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(r.pin_hash, "hex"));
}
