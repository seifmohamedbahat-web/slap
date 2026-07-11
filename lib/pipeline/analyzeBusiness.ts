import { prisma } from "@/lib/db/client";
import { askClaude, extractJson, hasAnthropicKey } from "@/lib/integrations/anthropic";
import type { BusinessProfileResult } from "@/lib/types";
import type { Lead } from "@/app/generated/prisma/client";

const CATEGORY_PALETTES: Record<string, string[]> = {
  plumber: ["#0B3C5D", "#1D8FE1", "#F2F4F7"],
  dentist: ["#0E7C7B", "#FFFFFF", "#EAF6F6"],
  "med spa": ["#B76E79", "#F7E7E3", "#2D2A2A"],
  contractor: ["#3A3A3A", "#E8A33D", "#F5F5F5"],
  restaurant: ["#7A1E1E", "#F4E9DA", "#2B2B2B"],
  salon: ["#7B2D8B", "#F6E7F9", "#1E1E1E"],
  default: ["#111111", "#E10600", "#FFFFFF"],
};

function paletteFor(category: string): string[] {
  const key = Object.keys(CATEGORY_PALETTES).find((k) =>
    category.toLowerCase().includes(k)
  );
  return CATEGORY_PALETTES[key ?? "default"];
}

function heuristicProfile(lead: Lead): BusinessProfileResult {
  const category = lead.category;
  const city = lead.city ?? "the area";
  const rating = lead.googleRating;

  return {
    industry: category,
    brandStyle: rating && rating >= 4.7 ? "Premium & polished" : "Warm & approachable",
    toneOfVoice: "Friendly, trustworthy, straightforward — speaks like a local expert, not a corporation.",
    usp: `Highly-rated, established ${category.toLowerCase()} serving ${city} with a strong word-of-mouth reputation and zero online presence to show for it.`,
    targetCustomers: `Local residents and businesses in ${city} searching for a reliable ${category.toLowerCase()}.`,
    personality: "Reliable, personal, community-rooted",
    competitors: [],
    services: inferServices(category),
    colorPalette: paletteFor(category),
    summary: `${lead.businessName} is a ${category.toLowerCase()} in ${city}${
      rating ? ` with a ${rating}★ reputation` : ""
    } and no website today. A premium site should lean on trust signals (reviews, years in business, local roots) since that's their real competitive edge, not price.`,
  };
}

function inferServices(category: string): string[] {
  const c = category.toLowerCase();
  if (c.includes("plumb")) return ["Drain Cleaning", "Water Heater Repair", "Leak Detection", "Emergency Plumbing"];
  if (c.includes("dent")) return ["General Checkups", "Cosmetic Dentistry", "Teeth Whitening", "Emergency Care"];
  if (c.includes("med spa") || c.includes("spa")) return ["Facials", "Injectables", "Body Contouring", "Skin Rejuvenation"];
  if (c.includes("contract")) return ["Kitchen Remodels", "Bathroom Remodels", "Additions", "Custom Builds"];
  if (c.includes("restaurant")) return ["Dine-In", "Catering", "Private Events", "Takeout"];
  if (c.includes("salon") || c.includes("barber")) return ["Haircuts", "Color", "Styling", "Beard Trims"];
  return ["Consultations", "Custom Solutions", "Ongoing Support"];
}

async function claudeProfile(lead: Lead): Promise<BusinessProfileResult | null> {
  try {
    const text = await askClaude({
      system:
        "You are AVEXA's AI business analyst. Study the business signals given and produce a brand profile a web designer could use immediately. Respond with strict JSON only.",
      prompt: `Business: ${lead.businessName}
Category: ${lead.category}
City/State: ${lead.city ?? "unknown"}, ${lead.state ?? "unknown"}
Rating: ${lead.googleRating ?? "unknown"} (${lead.reviewCount ?? 0} reviews)
Description: ${lead.description ?? "none"}

Return JSON matching:
{
  "industry": string,
  "brandStyle": string,
  "toneOfVoice": string,
  "usp": string,
  "targetCustomers": string,
  "personality": string,
  "competitors": string[],
  "services": string[] (4-6 realistic services for this business),
  "colorPalette": string[] (3 hex colors fitting the industry),
  "summary": string (2-3 sentences)
}`,
      maxTokens: 1024,
    });
    return extractJson<BusinessProfileResult>(text);
  } catch {
    return null;
  }
}

export async function analyzeBusiness(leadId: string): Promise<BusinessProfileResult> {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });

  const result = hasAnthropicKey()
    ? (await claudeProfile(lead)) ?? heuristicProfile(lead)
    : heuristicProfile(lead);

  await prisma.businessProfile.upsert({
    where: { leadId },
    create: {
      leadId,
      industry: result.industry,
      brandStyle: result.brandStyle,
      toneOfVoice: result.toneOfVoice,
      usp: result.usp,
      targetCustomers: result.targetCustomers,
      personality: result.personality,
      competitors: JSON.stringify(result.competitors),
      services: JSON.stringify(result.services),
      colorPalette: JSON.stringify(result.colorPalette),
      summary: result.summary,
    },
    update: {
      industry: result.industry,
      brandStyle: result.brandStyle,
      toneOfVoice: result.toneOfVoice,
      usp: result.usp,
      targetCustomers: result.targetCustomers,
      personality: result.personality,
      competitors: JSON.stringify(result.competitors),
      services: JSON.stringify(result.services),
      colorPalette: JSON.stringify(result.colorPalette),
      summary: result.summary,
    },
  });

  await prisma.lead.update({ where: { id: leadId }, data: { status: "ANALYZED" } });

  await prisma.activityEvent.create({
    data: {
      leadId,
      type: "business_analyzed",
      message: `Generated business profile for ${lead.businessName}`,
    },
  });

  return result;
}
