import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    totalLeads,
    todaysLeads,
    verifiedLeads,
    websitesGenerated,
    bookingSystemsGenerated,
    dashboardsGenerated,
    messagesSent,
    meetingsBooked,
    dealsClosed,
    wonLeads,
    byCategory,
    bySource,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.lead.count({ where: { websiteVerified: true } }),
    prisma.websiteProject.count({ where: { status: "READY" } }),
    prisma.bookingSystem.count({ where: { status: "READY" } }),
    prisma.adminDashboardProject.count({ where: { status: "READY" } }),
    prisma.outreachMessage.count({ where: { status: "SENT" } }),
    prisma.lead.count({ where: { status: "MEETING_BOOKED" } }),
    prisma.lead.count({ where: { status: "WON" } }),
    prisma.lead.findMany({ where: { status: "WON" }, select: { dealValue: true } }),
    prisma.lead.groupBy({ by: ["category"], _count: { category: true } }),
    prisma.lead.groupBy({ by: ["source"], _count: { source: true } }),
  ]);

  const revenue = wonLeads.reduce((sum, l) => sum + (l.dealValue ?? 0), 0);
  const pipelineLeads = await prisma.lead.findMany({
    where: { status: { notIn: ["WON", "LOST"] } },
    select: { score: { select: { suggestedPriceHigh: true } } },
  });
  const pipelineValue = pipelineLeads.reduce(
    (sum, l) => sum + (l.score?.suggestedPriceHigh ?? 0),
    0
  );

  return NextResponse.json({
    todaysLeads,
    verifiedLeads,
    totalLeads,
    websitesGenerated,
    bookingSystemsGenerated,
    dashboardsGenerated,
    messagesSent,
    meetingsBooked,
    dealsClosed,
    revenue,
    pipelineValue,
    averageDealSize: dealsClosed > 0 ? Math.round(revenue / dealsClosed) : 0,
    conversionRate: totalLeads > 0 ? Math.round((dealsClosed / totalLeads) * 1000) / 10 : 0,
    topIndustries: byCategory
      .map((c) => ({ category: c.category, count: c._count.category }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    leadSources: bySource.map((s) => ({ source: s.source, count: s._count.source })),
  });
}
