import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

/**
 * SQLite database singleton. The file lives in /data and is created and
 * seeded automatically on first access, so `npm run dev` / `npm start`
 * work with zero setup. All public-site content (services, portfolio,
 * pricing, testimonials, settings) is read from here, so changes made in
 * the admin panel go live immediately.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "digitalorbit.db");

declare global {
  // eslint-disable-next-line no-var
  var __digitalorbitDb: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (global.__digitalorbitDb) return global.__digitalorbitDb;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  migrate(db);
  seed(db);
  global.__digitalorbitDb = db;
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      service TEXT NOT NULL DEFAULT '',
      budget TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'new',
      is_read INTEGER NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'globe',
      description TEXT NOT NULL DEFAULT '',
      price TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      published INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS portfolio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      image TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      link TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      published INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS pricing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price TEXT NOT NULL,
      period TEXT NOT NULL DEFAULT '',
      tagline TEXT NOT NULL DEFAULT '',
      features TEXT NOT NULL DEFAULT '[]',
      highlighted INTEGER NOT NULL DEFAULT 0,
      cta_label TEXT NOT NULL DEFAULT 'Get Started',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS testimonials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      company TEXT NOT NULL DEFAULT '',
      quote TEXT NOT NULL,
      rating INTEGER NOT NULL DEFAULT 5,
      sort_order INTEGER NOT NULL DEFAULT 0,
      published INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      service TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS pageviews (
      day TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0
    );
  `);
}

function seed(db: Database.Database) {
  const hasUsers = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (hasUsers.n === 0) {
    const email = process.env.ADMIN_EMAIL || "admin@digitalorbit.agency";
    const password = process.env.ADMIN_PASSWORD || "orbit2026";
    db.prepare(
      "INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, 'admin')"
    ).run(email.toLowerCase(), bcrypt.hashSync(password, 10), "DigitalOrbit Admin");
  }

  const hasServices = db.prepare("SELECT COUNT(*) AS n FROM services").get() as { n: number };
  if (hasServices.n === 0) {
    const insert = db.prepare(
      "INSERT INTO services (title, icon, description, price, sort_order) VALUES (?, ?, ?, ?, ?)"
    );
    const rows: [string, string, string, string][] = [
      [
        "Website Design & Development",
        "code",
        "Custom, lightning-fast websites built to convert — from sleek landing pages to full e-commerce stores, designed around your brand and your customers.",
        "From $900",
      ],
      [
        "Branding & Logo Design",
        "palette",
        "A memorable identity that makes you look established from day one: logo, color system, typography, and brand guidelines you can use everywhere.",
        "From $400",
      ],
      [
        "SEO",
        "search",
        "Get found by the people already searching for you. Technical SEO, on-page optimization, and content strategy that climbs rankings and stays there.",
        "From $350/mo",
      ],
      [
        "Digital Marketing & Social Media",
        "megaphone",
        "Campaigns and content that grow your audience — social media management, paid ads, and email marketing measured by real results, not vanity metrics.",
        "From $450/mo",
      ],
      [
        "App Development",
        "smartphone",
        "iOS, Android, and web apps that feel native and scale with you. From MVP to launch, we handle design, development, and store deployment.",
        "Custom quote",
      ],
    ];
    rows.forEach((r, i) => insert.run(r[0], r[1], r[2], r[3], i));
  }

  const hasPortfolio = db.prepare("SELECT COUNT(*) AS n FROM portfolio").get() as { n: number };
  if (hasPortfolio.n === 0) {
    const insert = db.prepare(
      "INSERT INTO portfolio (title, image, description, category, link, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
    );
    const rows: [string, string, string, string][] = [
      [
        "Nova IA",
        "/portfolio/novaia.jpg",
        "Landing page for an AI voice-agent platform — dark, product-led design built to convert visitors into sign-ups.",
        "Web Design",
      ],
      [
        "Via Roma Ristorante",
        "/portfolio/viaroma.jpg",
        "Warm, elegant website for an Italian restaurant — menu, table booking, and a connected owner dashboard.",
        "Web Design",
      ],
      [
        "Via Roma Admin",
        "/portfolio/viaroma-admin.jpg",
        "Custom restaurant admin panel — live bookings, orders, traffic analytics, and a conversion funnel in real time.",
        "Web App",
      ],
      [
        "Ahlan Apparel",
        "/portfolio/ahlan-admin.jpg",
        "E-commerce analytics suite for a clothing brand — revenue, orders, best sellers, and traffic sources at a glance.",
        "E-commerce",
      ],
      [
        "VELO Sportswear",
        "/portfolio/velo.jpg",
        "Bold storefront for a performance sportswear brand — engineered for movement, designed for style.",
        "E-commerce",
      ],
      [
        "Dental Clinic Website",
        "/portfolio/dental-clinic.jpg",
        "Clean, trust-building site for dental practices — doctor profile, services, reviews, and one-tap WhatsApp booking.",
        "Web Design",
      ],
    ];
    rows.forEach((r, i) => insert.run(r[0], r[1], r[2], r[3], "#", i));
  }

  const hasPricing = db.prepare("SELECT COUNT(*) AS n FROM pricing").get() as { n: number };
  if (hasPricing.n === 0) {
    const insert = db.prepare(
      "INSERT INTO pricing (name, price, period, tagline, features, highlighted, cta_label, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    insert.run(
      "Starter",
      "$900",
      "one-time",
      "Perfect for getting your business online fast.",
      JSON.stringify([
        "5-page custom website",
        "Mobile-responsive design",
        "Basic on-page SEO",
        "Contact form & Google Maps",
        "1 month of free support",
      ]),
      0,
      "Start Small",
      0
    );
    insert.run(
      "Growth",
      "$2,400",
      "one-time",
      "For businesses ready to stand out and scale.",
      JSON.stringify([
        "Up to 12 pages + blog",
        "Custom design & animations",
        "Full SEO setup & analytics",
        "Branding refresh (logo + colors)",
        "Copywriting assistance",
        "3 months of free support",
      ]),
      1,
      "Grow With Us",
      1
    );
    insert.run(
      "Pro",
      "$5,000+",
      "custom",
      "Full digital partner for ambitious brands.",
      JSON.stringify([
        "Unlimited pages / web app",
        "E-commerce or booking systems",
        "Complete brand identity",
        "Monthly SEO & marketing",
        "Priority support & maintenance",
        "Dedicated project manager",
      ]),
      0,
      "Go Pro",
      2
    );
  }

  const hasTestimonials = db.prepare("SELECT COUNT(*) AS n FROM testimonials").get() as { n: number };
  if (hasTestimonials.n === 0) {
    const insert = db.prepare(
      "INSERT INTO testimonials (author, role, company, quote, rating, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
    );
    const rows: [string, string, string, string, number][] = [
      [
        "Sarah Mitchell",
        "Owner",
        "Lumen Fitness",
        "DigitalOrbit rebuilt our website in three weeks and our online bookings tripled. They explained everything in plain English and never missed a deadline.",
        5,
      ],
      [
        "Omar Hassan",
        "Founder",
        "Harvest & Co.",
        "We went from no online presence to a full e-commerce store that pays for itself every month. Worth every penny — and their support after launch is genuinely fast.",
        5,
      ],
      [
        "Jessica Tran",
        "Marketing Director",
        "Nova Legal",
        "The rebrand made us look like a firm twice our size. Clients mention the website all the time. Professional, creative, and refreshingly easy to work with.",
        5,
      ],
      [
        "David Okafor",
        "CEO",
        "PulsePay",
        "They took our app from a rough idea to the App Store in four months. Clear communication, honest pricing, and the product quality speaks for itself.",
        4,
      ],
    ];
    rows.forEach((r, i) => insert.run(r[0], r[1], r[2], r[3], r[4], i));
  }

  // Missing keys are added without touching existing values, so new
  // settings (like notify_email) appear on already-initialized databases.
  const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  const settingDefaults: Record<string, string> = {
    site_name: "DigitalOrbit",
    tagline: "Websites & Digital Services",
    contact_email: "digitaoribionsupport@gmail.com",
    notify_email: "digitaoribionsupport@gmail.com",
    phone: "+20 101 264 8914",
    address: "Remote-first · Serving clients worldwide",
    hours: "Mon–Fri, 9:00–18:00",
    social_facebook: "https://facebook.com/digitalorbit",
    social_instagram: "https://instagram.com/digitalorbit",
    social_twitter: "https://x.com/digitalorbit",
    social_linkedin: "https://linkedin.com/company/digitalorbit",
  };
  for (const [k, v] of Object.entries(settingDefaults)) insertSetting.run(k, v);
}

/* ---------------------------------- types --------------------------------- */

export type User = {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: string;
};

export type Lead = {
  id: number;
  name: string;
  email: string;
  phone: string;
  service: string;
  budget: string;
  message: string;
  status: "new" | "contacted" | "closed";
  is_read: number;
  archived: number;
  created_at: string;
};

export type Service = {
  id: number;
  title: string;
  icon: string;
  description: string;
  price: string;
  sort_order: number;
  published: number;
};

export type PortfolioItem = {
  id: number;
  title: string;
  image: string;
  description: string;
  category: string;
  link: string;
  sort_order: number;
  published: number;
};

export type Booking = {
  id: number;
  name: string;
  email: string;
  phone: string;
  service: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  notes: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  is_read: number;
  created_at: string;
};

export type Customer = {
  email: string;
  name: string;
  phone: string;
  leads: number;
  bookings: number;
  services: string;
  first_seen: string;
  last_activity: string;
};

export type PricingTier = {
  id: number;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string; // JSON array of strings
  highlighted: number;
  cta_label: string;
  sort_order: number;
};

export type Testimonial = {
  id: number;
  author: string;
  role: string;
  company: string;
  quote: string;
  rating: number;
  sort_order: number;
  published: number;
};

/* --------------------------------- queries -------------------------------- */

export function getPublishedServices(): Service[] {
  return getDb()
    .prepare("SELECT * FROM services WHERE published = 1 ORDER BY sort_order, id")
    .all() as Service[];
}

export function getAllServices(): Service[] {
  return getDb().prepare("SELECT * FROM services ORDER BY sort_order, id").all() as Service[];
}

export function getPublishedPortfolio(): PortfolioItem[] {
  return getDb()
    .prepare("SELECT * FROM portfolio WHERE published = 1 ORDER BY sort_order, id")
    .all() as PortfolioItem[];
}

export function getAllPortfolio(): PortfolioItem[] {
  return getDb().prepare("SELECT * FROM portfolio ORDER BY sort_order, id").all() as PortfolioItem[];
}

export function getPricing(): PricingTier[] {
  return getDb().prepare("SELECT * FROM pricing ORDER BY sort_order, id").all() as PricingTier[];
}

export function getPublishedTestimonials(): Testimonial[] {
  return getDb()
    .prepare("SELECT * FROM testimonials WHERE published = 1 ORDER BY sort_order, id")
    .all() as Testimonial[];
}

export function getAllTestimonials(): Testimonial[] {
  return getDb()
    .prepare("SELECT * FROM testimonials ORDER BY sort_order, id")
    .all() as Testimonial[];
}

export function getSettings(): Record<string, string> {
  const rows = getDb().prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string;
  }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/** Appointment slots offered on the public site (also validated server-side). */
export const BOOKING_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
] as const;

export function isSlotTaken(date: string, time: string): boolean {
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) AS n FROM bookings WHERE date = ? AND time = ? AND status != 'cancelled'"
    )
    .get(date, time) as { n: number };
  return row.n > 0;
}

export function getTakenSlots(date: string): string[] {
  const rows = getDb()
    .prepare("SELECT time FROM bookings WHERE date = ? AND status != 'cancelled'")
    .all(date) as { time: string }[];
  return rows.map((r) => r.time);
}

export function createBooking(b: {
  name: string;
  email: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  notes: string;
}) {
  getDb()
    .prepare(
      "INSERT INTO bookings (name, email, phone, service, date, time, notes) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(b.name, b.email, b.phone, b.service, b.date, b.time, b.notes);
}

/** One row per unique email across leads and bookings. */
export function getCustomers(): Customer[] {
  return getDb()
    .prepare(
      `SELECT
         lower(email) AS email,
         MAX(name) AS name,
         MAX(phone) AS phone,
         SUM(kind = 'lead') AS leads,
         SUM(kind = 'booking') AS bookings,
         GROUP_CONCAT(DISTINCT NULLIF(service, '')) AS services,
         MIN(created_at) AS first_seen,
         MAX(created_at) AS last_activity
       FROM (
         SELECT name, email, phone, service, created_at, 'lead' AS kind FROM leads
         UNION ALL
         SELECT name, email, phone, service, created_at, 'booking' AS kind FROM bookings
       )
       GROUP BY lower(email)
       ORDER BY last_activity DESC`
    )
    .all() as Customer[];
}

export function recordPageView() {
  const day = new Date().toISOString().slice(0, 10);
  getDb()
    .prepare(
      "INSERT INTO pageviews (day, count) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET count = count + 1"
    )
    .run(day);
}
