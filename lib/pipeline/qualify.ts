import { prisma } from "@/lib/db/client";
import { askClaude, extractJson, hasAnthropicKey } from "@/lib/integrations/anthropic";
import type { QualificationResult } from "@/lib/types";
import type { Lead } from "@/app/generated/prisma/client";

const BOOKING_CATEGORIES = [
  "dentist",
  "med spa",
  "salon",
  "barber",
  "spa",
  "chiropractor",
  "therapist",
  "contractor",
  "plumber",
  "electrician",
  "cleaning",
  "auto repair",
  "veterinar",
];

const DASHBOARD_CATEGORIES = [
  "dentist",
  "med spa",
  "contractor",
  "plumber",
  "electrician",
  "restaurant",
  "salon",
  "auto repair",
  "veterinar",
  "general contractor",
];

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function heuristicQualify(lead: Lead): QualificationResult {
  const category = lead.category.toLowerCase();
  const rating = lead.googleRating ?? 4.3;
  const reviews = lead.reviewCount ?? 10;

  const ratingScore = ((rating - 3) / 2) * 40; // 3.0->0, 5.0->40
  const reviewScore = Math.min(30, Math.log10(reviews + 1) * 15);
  const contactScore = (lead.phone ? 10 : 0) + (lead.email ? 5 : 0);
  const socialScore = (lead.facebookUrl ? 7.5 : 0) + (lead.instagramUrl ? 7.5 : 0);

  const businessQuality = clamp(20 + ratingScore + reviewScore);
  const growthPotential = clamp(40 + reviewScore + socialScore);
  const closingProbability = clamp(35 + contactScore * 2 + (rating >= 4.5 ? 15 : 5));
  const leadScore = clamp(
    businessQuality * 0.4 + growthPotential * 0.3 + closingProbability * 0.3
  );

  const priority: QualificationResult["priority"] =
    leadScore >= 80 ? "urgent" : leadScore >= 65 ? "high" : leadScore >= 45 ? "medium" : "low";

  const needsBooking = BOOKING_CATEGORIES.some((c) => category.includes(c));
  const needsDashboard = DASHBOARD_CATEGORIES.some((c) => category.includes(c));

  const priceLow = needsBooking && needsDashboard ? 2500 : needsBooking || needsDashboard ? 1500 : 900;
  const priceHigh = priceLow + (leadScore >= 70 ? 2500 : 1200);

  const reasoning = [
    `${lead.businessName} is a ${lead.category.toLowerCase()} with a ${rating.toFixed(
      1
    )}★ rating across ${reviews} reviews, and ${
      lead.facebookUrl || lead.instagramUrl ? "an active" : "a limited"
    } social presence but zero web presence.`,
    `Business quality (${businessQuality}) reflects review volume and rating strength.`,
    `Growth potential (${growthPotential}) factors in social reach as a channel a new site can capture and convert.`,
    needsBooking
      ? "This category typically runs on appointments, so a booking system is recommended alongside the website."
      : "This category is not appointment-driven, so a booking system is not recommended initially.",
    needsDashboard
      ? "An operational admin dashboard fits this vertical's day-to-day workflow (jobs/patients/clients, scheduling, revenue)."
      : "A custom admin dashboard isn't a priority yet — a CRM entry is sufficient for now.",
    `Recommended package: $${priceLow.toLocaleString()}-$${priceHigh.toLocaleString()}.`,
  ].join(" ");

  return {
    leadScore,
    closingProbability,
    businessQuality,
    growthPotential,
    priority,
    aiConfidence: hasAnthropicKey() ? 90 : 70,
    needsWebsite: true,
    needsBooking,
    needsDashboard,
    needsCrm: true,
    needsAutomation: leadScore >= 70,
    reasoning,
    suggestedPriceLow: priceLow,
    suggestedPriceHigh: priceHigh,
  };
}

async function claudeQualify(lead: Lead): Promise<QualificationResult | null> {
  try {
    const text = await askClaude({
      system:
        "You are AVEXA's AI lead qualification engine for a web agency that only serves businesses with no website. Respond with strict JSON only, no prose, matching the exact schema requested.",
      prompt: `Score this business lead and recommend which AVEXA services it needs.

Business: ${lead.businessName}
Category: ${lead.category}
City/State: ${lead.city ?? "unknown"}, ${lead.state ?? "unknown"}
Google rating: ${lead.googleRating ?? "unknown"} (${lead.reviewCount ?? 0} reviews)
Has Facebook: ${Boolean(lead.facebookUrl)}
Has Instagram: ${Boolean(lead.instagramUrl)}
Employee estimate: ${lead.employeeEstimate ?? "unknown"}
Description: ${lead.description ?? "none"}

Return JSON exactly matching this TypeScript type:
{
  "leadScore": number (0-100),
  "closingProbability": number (0-100),
  "businessQuality": number (0-100),
  "growthPotential": number (0-100),
  "priority": "low" | "medium" | "high" | "urgent",
  "aiConfidence": number (0-100),
  "needsWebsite": boolean,
  "needsBooking": boolean,
  "needsDashboard": boolean,
  "needsCrm": boolean,
  "needsAutomation": boolean,
  "reasoning": string (2-4 sentences explaining the scores and recommendations),
  "suggestedPriceLow": number (USD),
  "suggestedPriceHigh": number (USD)
}`,
      maxTokens: 1024,
    });
    return extractJson<QualificationResult>(text);
  } catch {
    return null;
  }
}

export async function qualifyLead(leadId: string): Promise<QualificationResult> {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });

  const result = hasAnthropicKey()
    ? (await claudeQualify(lead)) ?? heuristicQualify(lead)
    : heuristicQualify(lead);

  await prisma.leadScore.upsert({
    where: { leadId },
    create: { leadId, ...result },
    update: { ...result },
  });

  await prisma.activityEvent.create({
    data: {
      leadId,
      type: "lead_scored",
      message: `Scored ${lead.businessName}: ${result.leadScore}/100 (${result.priority} priority)`,
    },
  });

  return result;
}
