import { prisma } from "@/lib/db/client";

const DEFAULT_AVAILABILITY = {
  mon: ["09:00-17:00"],
  tue: ["09:00-17:00"],
  wed: ["09:00-17:00"],
  thu: ["09:00-17:00"],
  fri: ["09:00-17:00"],
  sat: ["10:00-14:00"],
  sun: [],
};

function servicesForCategory(category: string): { name: string; durationMins: number; price: number }[] {
  const c = category.toLowerCase();
  if (c.includes("dent")) {
    return [
      { name: "Checkup & Cleaning", durationMins: 45, price: 120 },
      { name: "Teeth Whitening", durationMins: 60, price: 250 },
      { name: "Emergency Visit", durationMins: 30, price: 150 },
    ];
  }
  if (c.includes("med spa") || c.includes("spa")) {
    return [
      { name: "Signature Facial", durationMins: 60, price: 140 },
      { name: "Injectables Consult", durationMins: 30, price: 0 },
      { name: "Body Contouring", durationMins: 90, price: 400 },
    ];
  }
  if (c.includes("salon") || c.includes("barber")) {
    return [
      { name: "Haircut", durationMins: 30, price: 45 },
      { name: "Color", durationMins: 90, price: 120 },
      { name: "Beard Trim", durationMins: 15, price: 20 },
    ];
  }
  if (c.includes("plumb") || c.includes("contract") || c.includes("electric")) {
    return [
      { name: "On-Site Estimate", durationMins: 30, price: 0 },
      { name: "Standard Service Call", durationMins: 60, price: 95 },
      { name: "Emergency Call-Out", durationMins: 60, price: 175 },
    ];
  }
  return [{ name: "Consultation", durationMins: 30, price: 0 }];
}

export async function generateBookingSystem(leadId: string) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  const services = servicesForCategory(lead.category);

  const staff = [
    { name: lead.ownerName ?? "Front Desk", role: "Primary" },
  ];

  await prisma.bookingSystem.upsert({
    where: { leadId },
    create: {
      leadId,
      status: "READY",
      staffJson: JSON.stringify(staff),
      servicesJson: JSON.stringify(services),
      availability: JSON.stringify(DEFAULT_AVAILABILITY),
      generatedAt: new Date(),
    },
    update: {
      status: "READY",
      staffJson: JSON.stringify(staff),
      servicesJson: JSON.stringify(services),
      availability: JSON.stringify(DEFAULT_AVAILABILITY),
      generatedAt: new Date(),
    },
  });

  await prisma.activityEvent.create({
    data: {
      leadId,
      type: "booking_generated",
      message: `Generated booking system for ${lead.businessName} (${services.length} services)`,
    },
  });

  return { staff, services, availability: DEFAULT_AVAILABILITY };
}
