import type { DiscoveredCompany } from "@/lib/types";

const APOLLO_BASE_URL = "https://api.apollo.io/api/v1";

function hasApolloKey(): boolean {
  return Boolean(process.env.APOLLO_API_KEY);
}

/**
 * Apollo's organization search returns a `website_url` field when a company
 * has a known site. Businesses AVEXA targets must have that field empty —
 * this is one real, checkable "no website" signal, not a guess.
 */
type ApolloOrganization = {
  name?: string;
  website_url?: string | null;
  primary_domain?: string | null;
  phone?: string | null;
  industry?: string | null;
  linkedin_url?: string | null;
  facebook_url?: string | null;
  twitter_url?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  estimated_num_employees?: number | null;
  short_description?: string | null;
  logo_url?: string | null;
};

async function apolloFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${APOLLO_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.APOLLO_API_KEY!,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Apollo API error ${res.status}: ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}

function mapOrganization(org: ApolloOrganization): DiscoveredCompany {
  return {
    businessName: org.name ?? "Unknown Business",
    category: org.industry ?? "General Business",
    phone: org.phone ?? undefined,
    address: undefined,
    city: org.city ?? undefined,
    state: org.state ?? undefined,
    country: org.country ?? undefined,
    websiteUrl: org.website_url ?? null,
    domain: org.primary_domain ?? null,
    facebookUrl: org.facebook_url ?? null,
    instagramUrl: null,
    googleMapsUrl: null,
    linkedinUrl: org.linkedin_url ?? null,
    employeeEstimate: org.estimated_num_employees
      ? String(org.estimated_num_employees)
      : null,
    revenueEstimate: null,
    description: org.short_description ?? null,
    logoUrl: org.logo_url ?? null,
    googleRating: null,
    reviewCount: null,
    source: "APOLLO",
  };
}

/**
 * Searches Apollo for companies matching a query (industry keyword, location, etc).
 * Only returns organizations Apollo reports as having NO website_url — everything
 * else is filtered out here so nothing downstream ever sees a lead with a site.
 *
 * Falls back to a small curated mock set when APOLLO_API_KEY isn't configured,
 * so the rest of the pipeline (verification/scoring/generation) is exercisable
 * without live credentials. Set APOLLO_API_KEY to switch to real results.
 */
export async function searchNoWebsiteCompanies(params: {
  industryKeyword?: string;
  locationKeyword?: string;
  perPage?: number;
}): Promise<DiscoveredCompany[]> {
  if (!hasApolloKey()) {
    return mockDiscoveredCompanies(params);
  }

  const data = await apolloFetch<{ organizations?: ApolloOrganization[] }>(
    "/mixed_companies/search",
    {
      q_organization_keyword_tags: params.industryKeyword
        ? [params.industryKeyword]
        : undefined,
      organization_locations: params.locationKeyword
        ? [params.locationKeyword]
        : undefined,
      per_page: params.perPage ?? 25,
    }
  );

  const orgs = data.organizations ?? [];
  return orgs
    .filter((org) => !org.website_url)
    .map(mapOrganization);
}

/**
 * Re-checks a single company by name/domain guess to confirm no website exists.
 * Used as a second verification pass before a lead is accepted.
 */
export async function enrichCompany(
  businessName: string,
  domainGuess?: string
): Promise<DiscoveredCompany | null> {
  if (!hasApolloKey()) return null;

  const data = await apolloFetch<{ organization?: ApolloOrganization }>(
    "/organizations/enrich",
    {
      name: businessName,
      domain: domainGuess,
    }
  );

  if (!data.organization) return null;
  return mapOrganization(data.organization);
}

function mockDiscoveredCompanies(params: {
  industryKeyword?: string;
  locationKeyword?: string;
}): DiscoveredCompany[] {
  const pool: DiscoveredCompany[] = [
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

  const kw = params.industryKeyword?.toLowerCase();
  const loc = params.locationKeyword?.toLowerCase();
  return pool.filter((c) => {
    const matchesKw = !kw || c.category.toLowerCase().includes(kw);
    const matchesLoc =
      !loc ||
      c.city?.toLowerCase().includes(loc) ||
      c.state?.toLowerCase().includes(loc);
    return matchesKw && matchesLoc;
  });
}
