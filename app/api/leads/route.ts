import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const search = searchParams.get("q");

  const leads = await prisma.lead.findMany({
    where: {
      status: status ? (status as never) : undefined,
      category: category ? { contains: category } : undefined,
      businessName: search ? { contains: search } : undefined,
    },
    include: { score: true, website: true, bookingSystem: true, adminDashboard: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ leads });
}
