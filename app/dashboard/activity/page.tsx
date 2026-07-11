import { prisma } from "@/lib/db/client";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const activity = await prisma.activityEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { lead: { select: { businessName: true, slug: true } } },
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Activity</h1>
        <p className="mt-1 text-sm text-avexa-fg-muted">Full audit log of the pipeline.</p>
      </div>
      <div className="max-w-2xl">
        <ActivityFeed items={activity} />
      </div>
    </div>
  );
}
