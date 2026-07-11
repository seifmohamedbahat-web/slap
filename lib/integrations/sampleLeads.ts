import type { DiscoveredCompany } from "@/lib/types";

/**
 * Local fallback used only when the live scraper (lib/integrations/scraper.ts)
 * can't reach its search host — e.g. this process's network policy blocks it.
 * Kept small and realistic so the rest of the pipeline (verification, scoring,
 * generation) stays fully exercisable without live internet access.
 */
const SAMPLE_COMPANIES: DiscoveredCompany[] = [
  {
    businessName: "Ridgeline Plumbing & Rooter",
    category: "Plumber",
    phone: "(503) 555-0142",
    city: "Portland",
    state: "OR",
    country: "US",
    websiteUrl: null,
    domain: null,
    facebookUrl: "https://facebook.com/ridgelineplumbing",
    instagramUrl: null,
    googleMapsUrl: "https://maps.google.com/?cid=1029384756",
    employeeEstimate: "5-10",
    revenueEstimate: "$500K-$1M",
    description: "Family-owned residential plumbing and drain service since 2011.",
    googleRating: 4.8,
    reviewCount: 63,
    source: "MANUAL",
  },
  {
    businessName: "Bright Smile Family Dental",
    category: "Dentist",
    phone: "(214) 555-0199",
    city: "Dallas",
    state: "TX",
    country: "US",
    websiteUrl: null,
    domain: null,
    facebookUrl: "https://facebook.com/brightsmilefamilydental",
    instagramUrl: "https://instagram.com/brightsmilefamilydental",
    googleMapsUrl: "https://maps.google.com/?cid=2938475610",
    employeeEstimate: "10-20",
    revenueEstimate: "$1M-$2M",
    description: "General & cosmetic dentistry serving Dallas families for 15 years.",
    googleRating: 4.9,
    reviewCount: 214,
    source: "MANUAL",
  },
  {
    businessName: "Glow Med Spa & Wellness",
    category: "Med Spa",
    phone: "(305) 555-0177",
    city: "Miami",
    state: "FL",
    country: "US",
    websiteUrl: null,
    domain: null,
    facebookUrl: "https://facebook.com/glowmedspamiami",
    instagramUrl: "https://instagram.com/glowmedspamiami",
    googleMapsUrl: "https://maps.google.com/?cid=3847561029",
    employeeEstimate: "5-10",
    revenueEstimate: "$750K-$1.5M",
    description: "Boutique med spa offering facials, injectables, and body contouring.",
    googleRating: 4.7,
    reviewCount: 128,
    source: "MANUAL",
  },
  {
    businessName: "Summit Contracting Group",
    category: "General Contractor",
    phone: "(720) 555-0163",
    city: "Denver",
    state: "CO",
    country: "US",
    websiteUrl: null,
    domain: null,
    facebookUrl: "https://facebook.com/summitcontractingco",
    instagramUrl: null,
    googleMapsUrl: "https://maps.google.com/?cid=4756102938",
    employeeEstimate: "20-50",
    revenueEstimate: "$3M-$5M",
    description: "Residential remodels and custom builds across the Denver metro.",
    googleRating: 4.6,
    reviewCount: 89,
    source: "MANUAL",
  },
  {
    businessName: "The Copper Fork Kitchen",
    category: "Restaurant",
    phone: "(615) 555-0188",
    city: "Nashville",
    state: "TN",
    country: "US",
    websiteUrl: null,
    domain: null,
    facebookUrl: "https://facebook.com/copperforknashville",
    instagramUrl: "https://instagram.com/copperforknashville",
    googleMapsUrl: "https://maps.google.com/?cid=5610293847",
    employeeEstimate: "10-20",
    revenueEstimate: "$1M-$2M",
    description: "Farm-to-table Southern kitchen, family-run since 2018.",
    googleRating: 4.9,
    reviewCount: 341,
    source: "MANUAL",
  },
  {
    businessName: "Luxe Cuts Salon & Barber",
    category: "Hair Salon",
    phone: "(602) 555-0155",
    city: "Phoenix",
    state: "AZ",
    country: "US",
    websiteUrl: null,
    domain: null,
    facebookUrl: "https://facebook.com/luxecutsphoenix",
    instagramUrl: "https://instagram.com/luxecutsphoenix",
    googleMapsUrl: "https://maps.google.com/?cid=6102938475",
    employeeEstimate: "5-10",
    revenueEstimate: "$400K-$800K",
    description: "Modern salon and barbershop specializing in color and fades.",
    googleRating: 4.8,
    reviewCount: 97,
    source: "MANUAL",
  },
];

export function sampleCandidates(params: {
  industryKeyword?: string;
  locationKeyword?: string;
}): DiscoveredCompany[] {
  const kw = params.industryKeyword?.toLowerCase().trim();
  const locParts = (params.locationKeyword ?? "")
    .toLowerCase()
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  return SAMPLE_COMPANIES.filter((c) => {
    const matchesKw = !kw || c.category.toLowerCase().includes(kw);
    const matchesLoc =
      locParts.length === 0 ||
      locParts.some(
        (part) =>
          c.city?.toLowerCase().includes(part) || c.state?.toLowerCase().includes(part)
      );
    return matchesKw && matchesLoc;
  });
}
