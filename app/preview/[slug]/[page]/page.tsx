import { notFound } from "next/navigation";
import { getLeadWithWebsite, parsePages } from "@/lib/preview";
import { PreviewBanner } from "@/components/preview/PreviewBanner";
import { BusinessSite } from "@/components/preview/BusinessSite";

export const dynamic = "force-dynamic";

export default async function WebsitePreviewPage({
  params,
}: {
  params: Promise<{ slug: string; page: string }>;
}) {
  const { slug, page: pageKey } = await params;
  const lead = await getLeadWithWebsite(slug);
  const pages = parsePages(lead.website!.pagesJson!);
  const page = pages[pageKey];
  if (!page) notFound();

  const palette: string[] = lead.profile?.colorPalette ? JSON.parse(lead.profile.colorPalette) : [];
  const accent = palette[0] ?? "#111111";

  return (
    <>
      <PreviewBanner businessName={lead.businessName} leadId={lead.id} />
      <BusinessSite
        businessName={lead.businessName}
        slug={lead.slug}
        currentPage={pageKey}
        page={page}
        accent={accent}
      />
    </>
  );
}
