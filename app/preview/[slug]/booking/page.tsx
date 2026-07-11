import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { PreviewBanner } from "@/components/preview/PreviewBanner";
import { BookingCalendar } from "@/components/preview/BookingCalendar";

export const dynamic = "force-dynamic";

export default async function BookingPreview({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lead = await prisma.lead.findUnique({
    where: { slug },
    include: { bookingSystem: true, profile: true },
  });

  if (!lead || !lead.bookingSystem || lead.bookingSystem.status !== "READY") notFound();

  const services = JSON.parse(lead.bookingSystem.servicesJson!);
  const staff = JSON.parse(lead.bookingSystem.staffJson!);
  const availability = JSON.parse(lead.bookingSystem.availability!);
  const palette: string[] = lead.profile?.colorPalette ? JSON.parse(lead.profile.colorPalette) : [];
  const accent = palette[0] ?? "#111111";

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <PreviewBanner businessName={lead.businessName} leadId={lead.id} />
      <div className="px-6 py-16">
        <h1 className="mb-1 text-center text-3xl font-bold">Book with {lead.businessName}</h1>
        <p className="mb-10 text-center text-sm text-neutral-500">Pick a service and a time that works.</p>
        <BookingCalendar
          leadId={lead.id}
          businessName={lead.businessName}
          services={services}
          staff={staff}
          availability={availability}
          accent={accent}
        />
      </div>
    </div>
  );
}
