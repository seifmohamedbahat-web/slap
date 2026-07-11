import { getLeadWithWebsite, parsePages } from "@/lib/preview";
import { PreviewBanner } from "@/components/preview/PreviewBanner";
import { BusinessSite } from "@/components/preview/BusinessSite";

export const dynamic = "force-dynamic";

export default async function WebsitePreviewHome({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lead = await getLeadWithWebsite(slug);
  const pages = parsePages(lead.website!.pagesJson!);
  const palette: string[] = lead.profile?.colorPalette ? JSON.parse(lead.profile.colorPalette) : [];
  const accent = palette[0] ?? "#111111";

  return (
    <>
      <PreviewBanner businessName={lead.businessName} leadId={lead.id} />
      <BusinessSite
        businessName={lead.businessName}
        slug={lead.slug}
        currentPage="home"
        page={pages.home}
        accent={accent}
      />
    </>
  );
}
