import type { DiscoveredCompany, VerificationResult } from "@/lib/types";

const COMMON_TLDS = [".com", ".net", ".co"];
const FETCH_TIMEOUT_MS = 3500;

function candidateDomains(businessName: string): string[] {
  const base = businessName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "");
  if (!base) return [];
  return COMMON_TLDS.map((tld) => `${base}${tld}`);
}

async function domainRespondsLive(domain: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`https://${domain}`, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Confirms a candidate truly has no website before it's allowed into the CRM.
 * Two independent checks must both pass:
 *   1. The source listing (Apollo / directory) reports no website_url/domain.
 *   2. A live probe of the most likely domain guesses (name.com/.net/.co)
 *      returns no response — i.e. nothing is actually hosted there.
 * Any confirmed website from either check rejects the lead immediately.
 */
export async function verifyNoWebsite(
  company: DiscoveredCompany
): Promise<VerificationResult> {
  const sourcesChecked: string[] = [`source_listing:${company.source.toLowerCase()}`];

  if (company.websiteUrl || company.domain) {
    return {
      websiteVerified: false,
      note: `Source listing reports an existing website (${
        company.websiteUrl ?? company.domain
      })`,
      sourcesChecked,
    };
  }

  const guesses = candidateDomains(company.businessName);
  const liveGuesses: string[] = [];

  for (const domain of guesses) {
    sourcesChecked.push(`domain_probe:${domain}`);
    const isLive = await domainRespondsLive(domain);
    if (isLive) liveGuesses.push(domain);
  }

  if (liveGuesses.length > 0) {
    return {
      websiteVerified: false,
      note: `Found a live site at guessed domain(s): ${liveGuesses.join(", ")}`,
      sourcesChecked,
    };
  }

  return {
    websiteVerified: true,
    note:
      "No website_url/domain on the source listing, and no response from common domain guesses.",
    sourcesChecked,
  };
}
