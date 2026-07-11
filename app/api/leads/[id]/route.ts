import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      profile: true,
      score: true,
      website: true,
      bookingSystem: true,
      adminDashboard: true,
      outreachMessages: { orderBy: { createdAt: "desc" } },
      activity: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
      appointments: { orderBy: { startsAt: "asc" } },
    },
  });

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  return NextResponse.json({ lead });
}
