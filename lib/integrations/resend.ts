export function hasResendKey(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Sends an email via Resend when RESEND_API_KEY is configured. Without a key,
 * returns a "simulated" result so outreach can still move through DRAFT →
 * APPROVED → SENT in the CRM without a live provider attached.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ simulated: boolean; id?: string }> {
  if (!hasResendKey()) {
    return { simulated: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "AVEXA <outreach@avexa.ai>",
      to: params.to,
      subject: params.subject,
      text: params.body,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return { simulated: false, id: data.id };
}
