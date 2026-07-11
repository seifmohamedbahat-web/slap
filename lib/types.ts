export type DiscoveredCompany = {
  businessName: string;
  category: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  websiteUrl?: string | null;
  domain?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  googleMapsUrl?: string | null;
  linkedinUrl?: string | null;
  employeeEstimate?: string | null;
  revenueEstimate?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  googleRating?: number | null;
  reviewCount?: number | null;
  source: "GOOGLE_MAPS" | "FACEBOOK" | "INSTAGRAM" | "LINKEDIN" | "YELP" | "MANUAL";
};

export type VerificationResult = {
  websiteVerified: boolean; // true = confirmed NO website (safe to keep as a lead)
  note: string;
  sourcesChecked: string[];
};

export type QualificationResult = {
  leadScore: number;
  closingProbability: number;
  businessQuality: number;
  growthPotential: number;
  priority: "low" | "medium" | "high" | "urgent";
  aiConfidence: number;
  needsWebsite: boolean;
  needsBooking: boolean;
  needsDashboard: boolean;
  needsCrm: boolean;
  needsAutomation: boolean;
  reasoning: string;
  suggestedPriceLow: number;
  suggestedPriceHigh: number;
};

export type BusinessProfileResult = {
  industry: string;
  brandStyle: string;
  toneOfVoice: string;
  usp: string;
  targetCustomers: string;
  personality: string;
  competitors: string[];
  services: string[];
  colorPalette: string[];
  summary: string;
};

export type GeneratedWebsite = {
  pages: Record<string, { title: string; sections: WebsiteSection[] }>;
};

export type WebsiteSection = {
  type:
    | "hero"
    | "about"
    | "services"
    | "testimonials"
    | "gallery"
    | "faq"
    | "contact"
    | "cta";
  heading: string;
  body?: string;
  items?: { title: string; body: string }[];
};

export type DashboardTemplateKey =
  | "plumber"
  | "dentist"
  | "medspa"
  | "contractor"
  | "restaurant"
  | "salon"
  | "generic";
