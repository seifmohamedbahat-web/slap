import { prisma } from "@/lib/db/client";
import type { GeneratedWebsite } from "@/lib/types";

function buildTemplateSite(params: {
  businessName: string;
  category: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  rating: number | null;
  reviewCount: number | null;
  services: string[];
  usp: string;
  summary: string;
  toneOfVoice: string;
}): GeneratedWebsite {
  const { businessName, category, city, state, phone, rating, reviewCount, services, usp, summary } =
    params;
  const location = [city, state].filter(Boolean).join(", ") || "your area";

  return {
    pages: {
      home: {
        title: `${businessName} | ${category} in ${location}`,
        sections: [
          {
            type: "hero",
            heading: `${location}'s Trusted ${category}`,
            body: usp,
          },
          {
            type: "services",
            heading: "What We Do",
            items: services.map((s) => ({ title: s, body: `Professional ${s.toLowerCase()} you can count on.` })),
          },
          {
            type: "testimonials",
            heading: "What Our Customers Say",
            body: rating
              ? `Rated ${rating}★ from ${reviewCount ?? 0}+ happy customers.`
              : "Trusted by the local community for years.",
          },
          {
            type: "cta",
            heading: "Ready to Get Started?",
            body: phone ? `Call us today at ${phone}` : "Reach out to book your appointment today.",
          },
        ],
      },
      about: {
        title: `About ${businessName}`,
        sections: [
          {
            type: "about",
            heading: `About ${businessName}`,
            body: summary,
          },
        ],
      },
      services: {
        title: `Services | ${businessName}`,
        sections: [
          {
            type: "services",
            heading: "Our Services",
            items: services.map((s) => ({
              title: s,
              body: `Learn more about our ${s.toLowerCase()} service and how it can help you.`,
            })),
          },
        ],
      },
      gallery: {
        title: `Gallery | ${businessName}`,
        sections: [{ type: "gallery", heading: "Our Work" }],
      },
      testimonials: {
        title: `Reviews | ${businessName}`,
        sections: [
          {
            type: "testimonials",
            heading: "Customer Reviews",
            body: rating ? `${rating}★ average across ${reviewCount ?? 0} reviews.` : undefined,
          },
        ],
      },
      faq: {
        title: `FAQ | ${businessName}`,
        sections: [
          {
            type: "faq",
            heading: "Frequently Asked Questions",
            items: [
              { title: "Where are you located?", body: `We proudly serve ${location} and the surrounding area.` },
              { title: "How do I book?", body: "Use the contact form or call us directly to schedule." },
              { title: "Do you offer free estimates?", body: "Yes — reach out and we'll get you a quote." },
            ],
          },
        ],
      },
      contact: {
        title: `Contact | ${businessName}`,
        sections: [
          {
            type: "contact",
            heading: "Get In Touch",
            body: phone ? `Call ${phone} or send us a message below.` : "Send us a message below.",
          },
        ],
      },
      privacy: {
        title: `Privacy Policy | ${businessName}`,
        sections: [
          {
            type: "about",
            heading: "Privacy Policy",
            body: `${businessName} respects your privacy. We only collect information you provide to us directly and never sell your data to third parties.`,
          },
        ],
      },
      terms: {
        title: `Terms of Service | ${businessName}`,
        sections: [
          {
            type: "about",
            heading: "Terms of Service",
            body: `By using this site or booking services with ${businessName}, you agree to our standard terms of service. Contact us with any questions.`,
          },
        ],
      },
      notFound: {
        title: `Page Not Found | ${businessName}`,
        sections: [
          {
            type: "about",
            heading: "404 — Page Not Found",
            body: "The page you're looking for doesn't exist. Head back to the homepage.",
          },
        ],
      },
    },
  };
}

export async function generateWebsite(leadId: string): Promise<GeneratedWebsite> {
  const start = Date.now();
  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: leadId },
    include: { profile: true },
  });

  const services: string[] = lead.profile?.services ? JSON.parse(lead.profile.services) : [];

  const site = buildTemplateSite({
    businessName: lead.businessName,
    category: lead.category,
    city: lead.city,
    state: lead.state,
    phone: lead.phone,
    rating: lead.googleRating,
    reviewCount: lead.reviewCount,
    services: services.length ? services : ["Our Services"],
    usp: lead.profile?.usp ?? `${lead.businessName} — quality ${lead.category.toLowerCase()} service.`,
    summary:
      lead.profile?.summary ??
      `${lead.businessName} is a ${lead.category.toLowerCase()} serving ${lead.city ?? "the local area"}.`,
    toneOfVoice: lead.profile?.toneOfVoice ?? "Friendly and professional",
  });

  const generationMs = Date.now() - start;

  await prisma.websiteProject.upsert({
    where: { leadId },
    create: {
      leadId,
      status: "READY",
      pagesJson: JSON.stringify(site.pages),
      previewPath: `/preview/${lead.slug}`,
      generatedAt: new Date(),
      generationMs,
    },
    update: {
      status: "READY",
      pagesJson: JSON.stringify(site.pages),
      previewPath: `/preview/${lead.slug}`,
      generatedAt: new Date(),
      generationMs,
    },
  });

  await prisma.lead.update({ where: { id: leadId }, data: { status: "ASSETS_GENERATED" } });

  await prisma.activityEvent.create({
    data: {
      leadId,
      type: "website_generated",
      message: `Generated premium website for ${lead.businessName} in ${generationMs}ms`,
    },
  });

  return site;
}
