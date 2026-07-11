import { prisma } from "@/lib/db/client";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RankedBarList } from "@/components/dashboard/RankedBarList";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import {
  Users,
  ShieldCheck,
  Globe,
  CalendarClock,
  LayoutDashboard,
  Send,
  Handshake,
  DollarSign,
  TrendingUp,
  Percent,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardOverview() {
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
    wonLeads,
    byCategory,
    bySource,
    activity,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.lead.count({ where: { websiteVerified: true } }),
    prisma.websiteProject.count({ where: { status: "READY" } }),
    prisma.bookingSystem.count({ where: { status: "READY" } }),
    prisma.adminDashboardProject.count({ where: { status: "READY" } }),
    prisma.outreachMessage.count({ where: { status: "SENT" } }),
    prisma.lead.count({ where: { status: "MEETING_BOOKED" } }),
    prisma.lead.findMany({ where: { status: "WON" }, select: { dealValue: true } }),
    prisma.lead.groupBy({ by: ["category"], _count: { category: true } }),
    prisma.lead.groupBy({ by: ["source"], _count: { source: true } }),
    prisma.activityEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { lead: { select: { businessName: true, slug: true } } },
    }),
  ]);

  const revenue = wonLeads.reduce((sum, l) => sum + (l.dealValue ?? 0), 0);
  const dealsClosed = wonLeads.length;
  const conversionRate = totalLeads > 0 ? Math.round((dealsClosed / totalLeads) * 1000) / 10 : 0;

  const pipelineLeads = await prisma.lead.findMany({
    where: { status: { notIn: ["WON", "LOST"] } },
    select: { score: { select: { suggestedPriceHigh: true } } },
  });
  const pipelineValue = pipelineLeads.reduce((s, l) => s + (l.score?.suggestedPriceHigh ?? 0), 0);

  const topIndustries = byCategory
    .map((c) => ({ label: c.category, count: c._count.category }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const leadSources = bySource
    .map((s) => ({ label: s.source.replace(/_/g, " "), count: s._count.source }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="mt-1 text-sm text-avexa-fg-muted">
          Live status of AVEXA&apos;s discovery-to-deal pipeline.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Today's Leads" value={todaysLeads} icon={Users} />
        <KpiCard label="Verified No-Website" value={verifiedLeads} icon={ShieldCheck} accent />
        <KpiCard label="Websites Generated" value={websitesGenerated} icon={Globe} />
        <KpiCard label="Booking Systems" value={bookingSystemsGenerated} icon={CalendarClock} />
        <KpiCard label="Dashboards Built" value={dashboardsGenerated} icon={LayoutDashboard} />
        <KpiCard label="Messages Sent" value={messagesSent} icon={Send} />
        <KpiCard label="Meetings Booked" value={meetingsBooked} icon={Handshake} />
        <KpiCard label="Deals Closed" value={dealsClosed} icon={Handshake} accent />
        <KpiCard label="Revenue" value={`$${revenue.toLocaleString()}`} icon={DollarSign} accent />
        <KpiCard label="Pipeline Value" value={`$${pipelineValue.toLocaleString()}`} icon={TrendingUp} />
        <KpiCard label="Conversion Rate" value={`${conversionRate}%`} icon={Percent} />
        <KpiCard label="Total Leads" value={totalLeads} icon={Users} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <RankedBarList title="Top Industries" items={topIndustries} />
          <RankedBarList title="Lead Sources" items={leadSources} />
        </div>
        <ActivityFeed items={activity} />
      </div>
    </div>
  );
}
