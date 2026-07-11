import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { LeadWorkspace } from "./LeadWorkspace";
import { ArrowLeft, Phone, MapPin, Star, Link2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
    },
  });

  if (!lead) notFound();

  return (
    <div className="p-8">
      <Link
        href="/dashboard/leads"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-avexa-fg-muted hover:text-avexa-fg"
      >
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{lead.businessName}</h1>
            <StatusBadge status={lead.status} />
          </div>
          <p className="mt-1 text-sm text-avexa-fg-muted">{lead.category}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-avexa-fg-muted">
            {(lead.city || lead.state) && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {[lead.city, lead.state].filter(Boolean).join(", ")}
              </span>
            )}
            {lead.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                {lead.phone}
              </span>
            )}
            {lead.googleRating && (
              <span className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-avexa-warning" />
                {lead.googleRating} ({lead.reviewCount ?? 0})
              </span>
            )}
            {lead.facebookUrl && (
              <a href={lead.facebookUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-avexa-fg">
                <Link2 className="h-3.5 w-3.5" /> Facebook
              </a>
            )}
            {lead.instagramUrl && (
              <a href={lead.instagramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-avexa-fg">
                <Link2 className="h-3.5 w-3.5" /> Instagram
              </a>
            )}
            {lead.linkedinUrl && (
              <a href={lead.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-avexa-fg">
                <Link2 className="h-3.5 w-3.5" /> LinkedIn
              </a>
            )}
            {lead.googleMapsUrl && (
              <a href={lead.googleMapsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-avexa-fg">
                <Link2 className="h-3.5 w-3.5" /> Google Maps
              </a>
            )}
          </div>
        </div>
      </div>

      {lead.verificationNote && (
        <div className="mb-6 rounded-xl border border-avexa-success/30 bg-avexa-success/5 px-4 py-3 text-sm text-avexa-success">
          Verified no-website: {lead.verificationNote}
        </div>
      )}

      <LeadWorkspace lead={lead} />
    </div>
  );
}
