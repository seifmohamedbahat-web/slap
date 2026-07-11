import { prisma } from "@/lib/db/client";
import { searchNoWebsiteCompanies } from "@/lib/integrations/apollo";
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
    case "APOLLO":
      return LeadSource.APOLLO;
    case "GOOGLE_MAPS":
      return LeadSource.GOOGLE_MAPS;
    default:
      return LeadSource.MANUAL;
  }
}

/**
 * Runs one discovery pass: searches for candidate businesses, verifies each
 * one has no website through multiple signals, and persists only the leads
 * that survive verification. Rejected leads are logged (not stored as leads)
 * so the reason is auditable.
 */
export async function runDiscovery(params: {
  industryKeyword?: string;
  locationKeyword?: string;
}): Promise<{ discovered: number; verified: number; rejected: number }> {
  const candidates = await searchNoWebsiteCompanies({
    industryKeyword: params.industryKeyword,
    locationKeyword: params.locationKeyword,
    perPage: 25,
  });

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
  };
}
