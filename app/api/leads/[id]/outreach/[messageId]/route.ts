import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { sendEmail } from "@/lib/integrations/resend";
import { OutreachChannel } from "@/app/generated/prisma/enums";

/**
 * Outreach only ever leaves DRAFT via an explicit human action here — the
 * pipeline never auto-sends. `action: "approve"` marks it ready; `action:
 * "send"` (only valid once approved) actually dispatches it.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const { id, messageId } = await params;
  const { action } = await req.json();

  const message = await prisma.outreachMessage.findUniqueOrThrow({
    where: { id: messageId },
    include: { lead: true },
  });

  if (action === "approve") {
    const updated = await prisma.outreachMessage.update({
      where: { id: messageId },
      data: { status: "APPROVED", approvedAt: new Date() },
    });
    await prisma.activityEvent.create({
      data: { leadId: id, type: "outreach_approved", message: `Outreach to ${message.lead.businessName} approved` },
    });
    return NextResponse.json({ message: updated });
  }

  if (action === "send") {
    if (message.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Message must be approved before it can be sent" },
        { status: 400 }
      );
    }

    let simulated = true;
    if (message.channel === OutreachChannel.EMAIL && message.lead.email) {
      const result = await sendEmail({
        to: message.lead.email,
        subject: message.subject ?? `A note from AVEXA`,
        body: message.body,
      });
      simulated = result.simulated;
    }

    const updated = await prisma.outreachMessage.update({
      where: { id: messageId },
      data: { status: "SENT", sentAt: new Date() },
    });

    await prisma.lead.update({ where: { id }, data: { status: "OUTREACH_SENT" } });

    await prisma.activityEvent.create({
      data: {
        leadId: id,
        type: "outreach_sent",
        message: `${simulated ? "(simulated) " : ""}Outreach sent to ${message.lead.businessName}`,
      },
    });

    return NextResponse.json({ message: updated, simulated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
