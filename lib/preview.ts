import { prisma } from "@/lib/db/client";
import { notFound } from "next/navigation";

export async function getLeadWithWebsite(slug: string) {
  const lead = await prisma.lead.findUnique({
    where: { slug },
    include: { website: true, bookingSystem: true, adminDashboard: true, profile: true },
  });
  if (!lead || !lead.website || lead.website.status !== "READY") notFound();
  return lead;
}

export function parsePages(pagesJson: string) {
  return JSON.parse(pagesJson) as Record<
    string,
    { title: string; sections: WebsiteSectionData[] }
  >;
}

export type WebsiteSectionData = {
  type: string;
  heading: string;
  body?: string;
  items?: { title: string; body: string }[];
};

export const PAGE_ORDER = [
  ["home", "Home"],
  ["about", "About"],
  ["services", "Services"],
  ["gallery", "Gallery"],
  ["testimonials", "Testimonials"],
  ["faq", "FAQ"],
  ["contact", "Contact"],
] as const;
