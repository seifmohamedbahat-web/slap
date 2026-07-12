"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { getDb, type User } from "@/lib/db";
import { clearSessionCookie, requireAdmin, setSessionCookie } from "@/lib/auth";

/** Every admin mutation lives here. All actions (except login) verify the
 *  session server-side — middleware alone is never trusted. */

function refresh(pathName: string) {
  revalidatePath("/"); // public site reflects changes immediately
  revalidatePath(pathName);
}

const str = (formData: FormData, key: string, max = 500) =>
  String(formData.get(key) ?? "")
    .trim()
    .slice(0, max);

/* ---------------------------------- auth ---------------------------------- */

export async function login(formData: FormData) {
  const email = str(formData, "email", 200).toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = str(formData, "next", 200);

  const user = getDb().prepare("SELECT * FROM users WHERE email = ?").get(email) as
    | User
    | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    redirect(`/admin/login?error=1${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }

  await setSessionCookie({
    sub: String(user.id),
    email: user.email,
    name: user.name,
    role: user.role,
  });

  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logout() {
  await clearSessionCookie();
  redirect("/admin/login");
}

/* ---------------------------------- leads --------------------------------- */

export async function setLeadStatus(id: number, formData: FormData) {
  await requireAdmin();
  const status = String(formData.get("status"));
  if (!["new", "contacted", "closed"].includes(status)) return;
  getDb()
    .prepare("UPDATE leads SET status = ?, is_read = 1 WHERE id = ?")
    .run(status, id);
  refresh("/admin/leads");
}

export async function toggleLeadRead(id: number) {
  await requireAdmin();
  getDb().prepare("UPDATE leads SET is_read = 1 - is_read WHERE id = ?").run(id);
  refresh("/admin/leads");
}

export async function toggleLeadArchived(id: number) {
  await requireAdmin();
  getDb()
    .prepare("UPDATE leads SET archived = 1 - archived, is_read = 1 WHERE id = ?")
    .run(id);
  refresh("/admin/leads");
}

export async function deleteLead(id: number) {
  await requireAdmin();
  getDb().prepare("DELETE FROM leads WHERE id = ?").run(id);
  refresh("/admin/leads");
}

/* -------------------------------- bookings -------------------------------- */

export async function setBookingStatus(id: number, formData: FormData) {
  await requireAdmin();
  const status = String(formData.get("status"));
  if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) return;
  getDb()
    .prepare("UPDATE bookings SET status = ?, is_read = 1 WHERE id = ?")
    .run(status, id);
  refresh("/admin/bookings");
}

export async function toggleBookingRead(id: number) {
  await requireAdmin();
  getDb().prepare("UPDATE bookings SET is_read = 1 - is_read WHERE id = ?").run(id);
  refresh("/admin/bookings");
}

export async function deleteBooking(id: number) {
  await requireAdmin();
  getDb().prepare("DELETE FROM bookings WHERE id = ?").run(id);
  refresh("/admin/bookings");
}

/* -------------------------------- services -------------------------------- */

export async function saveService(id: number | null, formData: FormData) {
  await requireAdmin();
  const db = getDb();
  const title = str(formData, "title", 150);
  const icon = str(formData, "icon", 40) || "globe";
  const description = str(formData, "description", 1000);
  const price = str(formData, "price", 60);
  const published = formData.get("published") ? 1 : 0;
  if (!title) return;

  if (id === null) {
    const max = db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM services").get() as {
      m: number;
    };
    db.prepare(
      "INSERT INTO services (title, icon, description, price, sort_order, published) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(title, icon, description, price, max.m + 1, published);
  } else {
    db.prepare(
      "UPDATE services SET title = ?, icon = ?, description = ?, price = ?, published = ? WHERE id = ?"
    ).run(title, icon, description, price, published, id);
  }
  refresh("/admin/services");
}

export async function deleteService(id: number) {
  await requireAdmin();
  getDb().prepare("DELETE FROM services WHERE id = ?").run(id);
  refresh("/admin/services");
}

export async function moveService(id: number, direction: "up" | "down") {
  await requireAdmin();
  moveRow("services", id, direction);
  refresh("/admin/services");
}

/* -------------------------------- portfolio ------------------------------- */

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

async function storeUploadedImage(file: File): Promise<string | null> {
  const ext = IMAGE_EXTENSIONS[file.type];
  if (!ext || file.size === 0 || file.size > 5 * 1024 * 1024) return null;
  const dir = path.join(process.cwd(), "public", "uploads");
  fs.mkdirSync(dir, { recursive: true });
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  fs.writeFileSync(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

export async function savePortfolioItem(id: number | null, formData: FormData) {
  await requireAdmin();
  const db = getDb();
  const title = str(formData, "title", 150);
  const description = str(formData, "description", 1000);
  const category = str(formData, "category", 80);
  const link = str(formData, "link", 400);
  const published = formData.get("published") ? 1 : 0;
  if (!title) return;

  let image = str(formData, "image", 400);
  const upload = formData.get("imageFile");
  if (upload instanceof File && upload.size > 0) {
    const stored = await storeUploadedImage(upload);
    if (stored) image = stored;
  }

  if (id === null) {
    const max = db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM portfolio").get() as {
      m: number;
    };
    db.prepare(
      "INSERT INTO portfolio (title, image, description, category, link, sort_order, published) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(title, image, description, category, link, max.m + 1, published);
  } else {
    db.prepare(
      "UPDATE portfolio SET title = ?, image = ?, description = ?, category = ?, link = ?, published = ? WHERE id = ?"
    ).run(title, image, description, category, link, published, id);
  }
  refresh("/admin/portfolio");
}

export async function deletePortfolioItem(id: number) {
  await requireAdmin();
  getDb().prepare("DELETE FROM portfolio WHERE id = ?").run(id);
  refresh("/admin/portfolio");
}

export async function movePortfolioItem(id: number, direction: "up" | "down") {
  await requireAdmin();
  moveRow("portfolio", id, direction);
  refresh("/admin/portfolio");
}

/* --------------------------------- pricing -------------------------------- */

export async function savePricingTier(id: number | null, formData: FormData) {
  await requireAdmin();
  const db = getDb();
  const name = str(formData, "name", 80);
  const price = str(formData, "price", 40);
  const period = str(formData, "period", 40);
  const tagline = str(formData, "tagline", 200);
  const ctaLabel = str(formData, "cta_label", 60) || "Get Started";
  const highlighted = formData.get("highlighted") ? 1 : 0;
  const features = JSON.stringify(
    String(formData.get("features") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 20)
  );
  if (!name || !price) return;

  if (id === null) {
    const max = db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM pricing").get() as {
      m: number;
    };
    db.prepare(
      "INSERT INTO pricing (name, price, period, tagline, features, highlighted, cta_label, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(name, price, period, tagline, features, highlighted, ctaLabel, max.m + 1);
  } else {
    db.prepare(
      "UPDATE pricing SET name = ?, price = ?, period = ?, tagline = ?, features = ?, highlighted = ?, cta_label = ? WHERE id = ?"
    ).run(name, price, period, tagline, features, highlighted, ctaLabel, id);
  }
  refresh("/admin/pricing");
}

export async function deletePricingTier(id: number) {
  await requireAdmin();
  getDb().prepare("DELETE FROM pricing WHERE id = ?").run(id);
  refresh("/admin/pricing");
}

/* ------------------------------- testimonials ----------------------------- */

export async function saveTestimonial(id: number | null, formData: FormData) {
  await requireAdmin();
  const db = getDb();
  const author = str(formData, "author", 120);
  const role = str(formData, "role", 120);
  const company = str(formData, "company", 120);
  const quote = str(formData, "quote", 1000);
  const rating = Math.min(5, Math.max(1, Number(formData.get("rating")) || 5));
  const published = formData.get("published") ? 1 : 0;
  if (!author || !quote) return;

  if (id === null) {
    const max = db
      .prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM testimonials")
      .get() as { m: number };
    db.prepare(
      "INSERT INTO testimonials (author, role, company, quote, rating, sort_order, published) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(author, role, company, quote, rating, max.m + 1, published);
  } else {
    db.prepare(
      "UPDATE testimonials SET author = ?, role = ?, company = ?, quote = ?, rating = ?, published = ? WHERE id = ?"
    ).run(author, role, company, quote, rating, published, id);
  }
  refresh("/admin/testimonials");
}

export async function deleteTestimonial(id: number) {
  await requireAdmin();
  getDb().prepare("DELETE FROM testimonials WHERE id = ?").run(id);
  refresh("/admin/testimonials");
}

/* --------------------------------- settings ------------------------------- */

const SETTING_KEYS = [
  "site_name",
  "tagline",
  "contact_email",
  "phone",
  "address",
  "hours",
  "social_facebook",
  "social_instagram",
  "social_twitter",
  "social_linkedin",
] as const;

export async function saveSettings(formData: FormData) {
  await requireAdmin();
  const db = getDb();
  const upsert = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );
  for (const key of SETTING_KEYS) {
    upsert.run(key, str(formData, key, 400));
  }
  refresh("/admin/settings");
}

/* --------------------------------- helpers -------------------------------- */

/** Swap sort_order with the neighbouring row (tables validated against a whitelist). */
function moveRow(table: "services" | "portfolio", id: number, direction: "up" | "down") {
  const db = getDb();
  const rows = db
    .prepare(`SELECT id FROM ${table} ORDER BY sort_order, id`)
    .all() as { id: number }[];
  const index = rows.findIndex((r) => r.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= rows.length) return;

  [rows[index], rows[swapWith]] = [rows[swapWith], rows[index]];
  const update = db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`);
  const apply = db.transaction(() => {
    rows.forEach((row, i) => update.run(i, row.id));
  });
  apply();
}
