import type { Booking, Lead } from "./db";

/**
 * Placeholder email handler.
 *
 * Swap the body of `sendLeadNotification` for a real provider when ready,
 * e.g. Resend, SendGrid, or plain SMTP via nodemailer:
 *
 *   const resend = new Resend(process.env.RESEND_API_KEY);
 *   await resend.emails.send({ from, to, subject, text });
 *
 * The contact API awaits this but never fails the request if email
 * delivery breaks — the lead is already safe in the database.
 */
export async function sendLeadNotification(
  lead: Pick<Lead, "name" | "email" | "phone" | "service" | "budget" | "message">,
  notifyAddress: string
): Promise<void> {
  const subject = `New inquiry from ${lead.name}${lead.service ? ` — ${lead.service}` : ""}`;
  const body = [
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    lead.phone && `Phone: ${lead.phone}`,
    lead.service && `Service: ${lead.service}`,
    lead.budget && `Budget: ${lead.budget}`,
    "",
    lead.message,
  ]
    .filter(Boolean)
    .join("\n");

  console.log(`[email placeholder] To: ${notifyAddress}\nSubject: ${subject}\n${body}`);
}

/** Same placeholder pattern for appointment bookings. */
export async function sendBookingNotification(
  booking: Pick<Booking, "name" | "email" | "phone" | "service" | "date" | "time" | "notes">,
  notifyAddress: string
): Promise<void> {
  const subject = `New appointment: ${booking.name} — ${booking.date} at ${booking.time}`;
  const body = [
    `Name: ${booking.name}`,
    `Email: ${booking.email}`,
    booking.phone && `Phone: ${booking.phone}`,
    booking.service && `Service: ${booking.service}`,
    `When: ${booking.date} at ${booking.time}`,
    booking.notes && `\n${booking.notes}`,
  ]
    .filter(Boolean)
    .join("\n");

  console.log(`[email placeholder] To: ${notifyAddress}\nSubject: ${subject}\n${body}`);
}
