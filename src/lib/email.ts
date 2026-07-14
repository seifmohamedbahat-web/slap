import type { Booking, Lead } from "./db";

/**
 * Email notifications for new inquiries and bookings.
 *
 * The destination address is the `notify_email` setting, editable in the
 * admin panel under Settings → Notifications.
 *
 * Delivery: if RESEND_API_KEY is set, mail is sent for real through the
 * Resend API (https://resend.com — free tier available; set EMAIL_FROM to
 * a sender on your verified domain). Without a key, the message is logged
 * to the server console so nothing is silently lost in development.
 * Callers never fail the user's request on email errors — the lead or
 * booking is already stored in the database either way.
 */
async function deliver(to: string, subject: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(
      `[email placeholder — set RESEND_API_KEY to send for real]\nTo: ${to}\nSubject: ${subject}\n${text}`
    );
    return;
  }

  const from = process.env.EMAIL_FROM || "DigitalOrbit <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!res.ok) {
    throw new Error(`Resend API ${res.status}: ${await res.text()}`);
  }
}

export async function sendLeadNotification(
  lead: Pick<Lead, "name" | "email" | "phone" | "service" | "budget" | "message">,
  notifyAddress: string
): Promise<void> {
  const subject = `New inquiry from ${lead.name}${lead.service ? ` — ${lead.service}` : ""}`;
  const lines = [
    "You have a new message from the DigitalOrbit website:",
    "",
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
  ];
  if (lead.phone) lines.push(`Phone: ${lead.phone}`);
  if (lead.service) lines.push(`Service: ${lead.service}`);
  if (lead.budget) lines.push(`Budget: ${lead.budget}`);
  lines.push("", lead.message, "", "— Manage this lead in the admin panel: /admin/leads");

  await deliver(notifyAddress, subject, lines.join("\n"));
}

export async function sendBookingNotification(
  booking: Pick<Booking, "name" | "email" | "phone" | "service" | "date" | "time" | "notes">,
  notifyAddress: string
): Promise<void> {
  const subject = `New appointment: ${booking.name} — ${booking.date} at ${booking.time}`;
  const lines = [
    "Someone booked a call on the DigitalOrbit website:",
    "",
    `Name: ${booking.name}`,
    `Email: ${booking.email}`,
  ];
  if (booking.phone) lines.push(`Phone: ${booking.phone}`);
  if (booking.service) lines.push(`Topic: ${booking.service}`);
  lines.push(`When: ${booking.date} at ${booking.time}`);
  if (booking.notes) lines.push("", booking.notes);
  lines.push("", "— Manage this booking in the admin panel: /admin/bookings");

  await deliver(notifyAddress, subject, lines.join("\n"));
}
