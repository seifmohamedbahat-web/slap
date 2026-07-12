import { NextRequest, NextResponse } from "next/server";
import { BOOKING_SLOTS, createBooking, getSettings, getTakenSlots, isSlotTaken } from "@/lib/db";
import { sendBookingNotification } from "@/lib/email";

const MAX = { name: 120, email: 200, phone: 40, service: 120, notes: 2000 };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** GET /api/bookings?date=YYYY-MM-DD → which slots are already taken. */
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }
  return NextResponse.json({ taken: getTakenSlots(date) });
}

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

  const booking = {
    name: field("name"),
    email: field("email"),
    phone: field("phone"),
    service: field("service"),
    date: String(body.date ?? "").trim(),
    time: String(body.time ?? "").trim(),
    notes: field("notes"),
  };

  if (!booking.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.email)) {
    return NextResponse.json({ error: "Please fill in your name and a valid email." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.date) || booking.date < todayIso()) {
    return NextResponse.json({ error: "Please pick a valid date (today or later)." }, { status: 400 });
  }
  if (!(BOOKING_SLOTS as readonly string[]).includes(booking.time)) {
    return NextResponse.json({ error: "Please pick a time slot." }, { status: 400 });
  }
  if (isSlotTaken(booking.date, booking.time)) {
    return NextResponse.json(
      { error: "That slot was just booked — please pick another time." },
      { status: 409 }
    );
  }

  createBooking(booking);

  try {
    const settings = getSettings();
    await sendBookingNotification(booking, settings.contact_email || "hello@digitalorbit.agency");
  } catch (err) {
    console.error("Booking email notification failed:", err);
  }

  return NextResponse.json({ ok: true });
}
