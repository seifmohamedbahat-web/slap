import type { DiscoveredCompany } from "@/lib/types";

/**
 * AVEXA's own lead-discovery tool — no third-party lead-gen API/SaaS.
 *
 * It queries DuckDuckGo's no-JS HTML endpoint (a plain static search results
 * page — no API key, no account) for business listings on Google Maps,
 * Facebook, Instagram, LinkedIn, and Yelp, which is where small local
 * businesses without a website of their own tend to show up. Every candidate
 * this turns up is still just that — a *candidate* — and gets run through
 * `verifyNoWebsite`'s independent domain probe before it's ever allowed into
 * the CRM as a lead.
 *
 * If the search host can't be reached (e.g. this process's network policy
 * blocks it), discovery falls back to a small curated sample so the rest of
 * the pipeline (verification, scoring, generation) stays exercisable.
 */

const SEARCH_URL = "https://html.duckduckgo.com/html/";
const FETCH_TIMEOUT_MS = 8000;

type SearchResult = { title: string; url: string; snippet: string };

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .trim();
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ""));
}

/** DuckDuckGo's html endpoint wraps real URLs behind a redirect link with a `uddg` param. */
function resolveResultUrl(href: string): string {
  try {
    const url = new URL(href.startsWith("//") ? `https:${href}` : href);
    const target = url.searchParams.get("uddg");
    return target ? decodeURIComponent(target) : url.toString();
  } catch {
    return href;
  }
}

async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${SEARCH_URL}?q=${encodeURIComponent(query)}`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AVEXALeadBot/1.0; +https://avexa.ai)",
      },
    });
    if (!res.ok) return [];

    const html = await res.text();
    const results: SearchResult[] = [];

    const blockRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let match: RegExpExecArray | null;
    while ((match = blockRegex.exec(html)) !== null) {
      results.push({
        url: resolveResultUrl(match[1]),
        title: stripTags(match[2]),
        snippet: stripTags(match[3]),
      });
    }
    return results;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function businessNameFromTitle(title: string, suffixPattern: RegExp): string | null {
  const cleaned = title
    .replace(suffixPattern, "")
    .replace(/\(@[\w.]+\)/g, "") // strip Instagram "(@handle)"
    .trim();
  if (!cleaned || cleaned.length < 2 || cleaned.length > 80) return null;
  return cleaned;
}

type SourceKey = "GOOGLE_MAPS" | "FACEBOOK" | "INSTAGRAM" | "LINKEDIN" | "YELP";

type SiteConfig = {
  source: SourceKey;
  siteFilter: string;
  urlMustInclude: string;
  titleSuffix: RegExp;
  urlField: "googleMapsUrl" | "facebookUrl" | "instagramUrl" | "linkedinUrl" | undefined;
};

const SITES: SiteConfig[] = [
  {
    source: "GOOGLE_MAPS",
    siteFilter: "site:google.com/maps",
    urlMustInclude: "google.com/maps",
    titleSuffix: /\s*[|-]\s*Google Maps\s*$/i,
    urlField: "googleMapsUrl",
  },
  {
    source: "FACEBOOK",
    siteFilter: "site:facebook.com",
    urlMustInclude: "facebook.com/",
    titleSuffix: /\s*[|-]\s*Facebook\s*$/i,
    urlField: "facebookUrl",
  },
  {
    source: "INSTAGRAM",
    siteFilter: "site:instagram.com",
    urlMustInclude: "instagram.com/",
    titleSuffix: /\s*[•|]\s*Instagram( photos and videos)?\s*$/i,
    urlField: "instagramUrl",
  },
  {
    source: "LINKEDIN",
    siteFilter: "site:linkedin.com/company",
    urlMustInclude: "linkedin.com/company",
    titleSuffix: /\s*[|-]\s*LinkedIn\s*$/i,
    urlField: "linkedinUrl",
  },
  {
    source: "YELP",
    siteFilter: "site:yelp.com/biz",
    urlMustInclude: "yelp.com/biz",
    titleSuffix: /\s*[|-]\s*Yelp\s*$/i,
    urlField: undefined,
  },
];

async function findSiteCandidates(
  config: SiteConfig,
  industry: string,
  location: string
): Promise<DiscoveredCompany[]> {
  const results = await searchDuckDuckGo(
    `${config.siteFilter} ${industry} ${location}`.trim()
  );

  const out: DiscoveredCompany[] = [];
  for (const r of results) {
    if (!r.url.includes(config.urlMustInclude)) continue;
    const name = businessNameFromTitle(r.title, config.titleSuffix);
    if (!name) continue;

    const candidate: DiscoveredCompany = {
      businessName: name,
      category: industry || "Local Business",
      city: location.split(",")[0]?.trim() || undefined,
      state: location.split(",")[1]?.trim() || undefined,
      country: "US",
      websiteUrl: null,
      domain: null,
      facebookUrl: null,
      instagramUrl: null,
      googleMapsUrl: null,
      description: r.snippet || undefined,
      source: config.source,
    };

    if (config.urlField) {
      candidate[config.urlField] = r.url.split("?")[0];
    }

    out.push(candidate);
  }
  return out;
}

function dedupeByName(companies: DiscoveredCompany[]): DiscoveredCompany[] {
  const seen = new Set<string>();
  const out: DiscoveredCompany[] = [];
  for (const c of companies) {
    const key = c.businessName.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

/**
 * Finds candidate businesses for a given industry/location by searching
 * Google Maps, Facebook, Instagram, LinkedIn, and Yelp listings via
 * DuckDuckGo. Returns an empty array (never throws) if the search engine
 * can't be reached — callers should fall back to a local sample in that case.
 */
export async function findCandidateBusinesses(params: {
  industryKeyword: string;
  locationKeyword: string;
}): Promise<DiscoveredCompany[]> {
  const { industryKeyword, locationKeyword } = params;

  const results = await Promise.all(
    SITES.map((site) => findSiteCandidates(site, industryKeyword, locationKeyword))
  );

  return dedupeByName(results.flat());
}
