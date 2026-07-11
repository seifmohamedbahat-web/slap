import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const activity = await prisma.activityEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { lead: { select: { businessName: true, slug: true } } },
  });
  return NextResponse.json({ activity });
}
