import { prisma } from "@/lib/db/client";
import { findCandidateBusinesses } from "@/lib/integrations/scraper";
import { sampleCandidates } from "@/lib/integrations/sampleLeads";
import { verifyNoWebsite } from "@/lib/pipeline/verifyNoWebsite";
import { LeadSource, LeadStatus } from "@/app/generated/prisma/enums";
import type { DiscoveredCompany } from "@/lib/types";

function slugify(name: string, city?: string | null): string {
  const base = `${name}-${city ?? ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || `lead-${Date.now()}`;
}

function mapSource(source: DiscoveredCompany["source"]): LeadSource {
  switch (source) {
    case "FACEBOOK":
      return LeadSource.FACEBOOK;
    case "YELP":
      return LeadSource.YELP;
    default:
      return LeadSource.MANUAL;
  }
}

/**
 * Runs one discovery pass: searches for candidate businesses using AVEXA's
 * own scraper (lib/integrations/scraper.ts — no third-party lead-gen API),
 * verifies each one has no website through an independent domain probe, and
 * persists only the leads that survive verification. Rejected leads are
 * logged (not stored as leads) so the reason is auditable.
 */
export async function runDiscovery(params: {
  industryKeyword?: string;
  locationKeyword?: string;
}): Promise<{ discovered: number; verified: number; rejected: number; usedFallback: boolean }> {
  const scraped = await findCandidateBusinesses({
    industryKeyword: params.industryKeyword ?? "",
    locationKeyword: params.locationKeyword ?? "",
  });

  const usedFallback = scraped.length === 0;
  const candidates = usedFallback
    ? sampleCandidates({
        industryKeyword: params.industryKeyword,
        locationKeyword: params.locationKeyword,
      })
    : scraped;

  let verifiedCount = 0;
  let rejectedCount = 0;

  for (const candidate of candidates) {
    const slug = slugify(candidate.businessName, candidate.city);

    const existing = await prisma.lead.findUnique({ where: { slug } });
    if (existing) continue;

    const verification = await verifyNoWebsite(candidate);

    if (!verification.websiteVerified) {
      rejectedCount += 1;
      await prisma.activityEvent.create({
        data: {
          type: "lead_rejected",
          message: `Rejected "${candidate.businessName}" — ${verification.note}`,
        },
      });
      continue;
    }

    const lead = await prisma.lead.create({
      data: {
        businessName: candidate.businessName,
        category: candidate.category,
        slug,
        phone: candidate.phone,
        address: candidate.address,
        city: candidate.city,
        state: candidate.state,
        country: candidate.country,
        source: mapSource(candidate.source),
        status: LeadStatus.VERIFIED_NO_WEBSITE,
        websiteVerified: true,
        verificationNote: verification.note,
        sourcesChecked: JSON.stringify(verification.sourcesChecked),
        facebookUrl: candidate.facebookUrl ?? undefined,
        instagramUrl: candidate.instagramUrl ?? undefined,
        googleMapsUrl: candidate.googleMapsUrl ?? undefined,
        googleRating: candidate.googleRating ?? undefined,
        reviewCount: candidate.reviewCount ?? undefined,
        employeeEstimate: candidate.employeeEstimate ?? undefined,
        revenueEstimate: candidate.revenueEstimate ?? undefined,
        description: candidate.description ?? undefined,
        logoUrl: candidate.logoUrl ?? undefined,
      },
    });

    verifiedCount += 1;

    await prisma.activityEvent.create({
      data: {
        leadId: lead.id,
        type: "lead_verified",
        message: `Verified "${lead.businessName}" has no website — added to CRM`,
      },
    });
  }

  return {
    discovered: candidates.length,
    verified: verifiedCount,
    rejected: rejectedCount,
    usedFallback,
  };
}
