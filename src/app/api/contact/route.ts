import { NextRequest, NextResponse } from "next/server";
import { getDb, getSettings } from "@/lib/db";
import { sendLeadNotification } from "@/lib/email";

const MAX = { name: 120, email: 200, phone: 40, service: 120, budget: 60, message: 4000 };

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const field = (key: keyof typeof MAX) =>
    String(body[key] ?? "")
      .trim()
      .slice(0, MAX[key]);

  const lead = {
    name: field("name"),
    email: field("email"),
    phone: field("phone"),
    service: field("service"),
    budget: field("budget"),
    message: field("message"),
  };

  if (!lead.name || !lead.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return NextResponse.json(
      { error: "Please fill in your name, a valid email, and a message." },
      { status: 400 }
    );
  }

  getDb()
    .prepare(
      "INSERT INTO leads (name, email, phone, service, budget, message) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(lead.name, lead.email, lead.phone, lead.service, lead.budget, lead.message);

  // Placeholder email notification — never fails the request; the lead is
  // already stored and visible in the admin panel.
  try {
    const settings = getSettings();
    await sendLeadNotification(lead, settings.contact_email || "hello@digitalorbit.agency");
  } catch (err) {
    console.error("Lead email notification failed:", err);
  }

  return NextResponse.json({ ok: true });
}
