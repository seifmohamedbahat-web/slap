import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const appointment = await prisma.appointment.create({
    data: {
      leadId: id,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      service: body.service,
      staff: body.staff,
      startsAt: new Date(body.startsAt),
      durationMins: body.durationMins ?? 30,
    },
  });

  const lead = await prisma.lead.findUniqueOrThrow({ where: { id } });
  await prisma.activityEvent.create({
    data: {
      leadId: id,
      type: "appointment_booked",
      message: `New booking for ${lead.businessName}: ${body.customerName} — ${body.service}`,
    },
  });

  return NextResponse.json({ appointment });
}
