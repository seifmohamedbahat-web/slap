import { prisma } from "../lib/db/client";
import { runDiscovery } from "../lib/pipeline/discover";
import { analyzeBusiness } from "../lib/pipeline/analyzeBusiness";
import { qualifyLead } from "../lib/pipeline/qualify";
import { generateWebsite } from "../lib/pipeline/generateWebsite";
import { generateBookingSystem } from "../lib/pipeline/generateBooking";
import { generateAdminDashboard } from "../lib/pipeline/generateDashboard";
import { generateOutreach } from "../lib/pipeline/outreach";
import { OutreachChannel } from "../app/generated/prisma/enums";

async function main() {
  console.log("Running discovery...");
  const discovery = await runDiscovery({});
  console.log(
    `Discovered ${discovery.discovered}, verified ${discovery.verified}, rejected ${discovery.rejected}` +
      (discovery.usedFallback ? " (live search unreachable — used local sample)" : "")
  );

  const leads = await prisma.lead.findMany({ orderBy: { createdAt: "asc" } });

  for (const lead of leads) {
    console.log(`\nProcessing ${lead.businessName}...`);
    await analyzeBusiness(lead.id);
    const score = await qualifyLead(lead.id);
    await generateWebsite(lead.id);
    if (score.needsBooking) await generateBookingSystem(lead.id);
    if (score.needsDashboard) await generateAdminDashboard(lead.id);
  }

  // Fill in contact info + a bit of pipeline progression so the CRM/analytics
  // don't look empty on first load.
  const [plumber, dentist, medspa, contractor, restaurant, salon] = leads;

  if (dentist) {
    await prisma.lead.update({
      where: { id: dentist.id },
      data: { email: "hello@brightsmilefamilydental.example", ownerName: "Dr. Amara Osei" },
    });
    const msg = await generateOutreach(dentist.id, OutreachChannel.EMAIL);
    await prisma.outreachMessage.update({
      where: { id: msg.id },
      data: { status: "APPROVED", approvedAt: new Date() },
    });
    await prisma.outreachMessage.update({
      where: { id: msg.id },
      data: { status: "SENT", sentAt: new Date() },
    });
    await prisma.lead.update({
      where: { id: dentist.id },
      data: { status: "MEETING_BOOKED" },
    });
    await prisma.activityEvent.create({
      data: { leadId: dentist.id, type: "meeting_booked", message: "Dr. Osei booked a 15-min intro call" },
    });
  }

  if (plumber) {
    await prisma.lead.update({
      where: { id: plumber.id },
      data: { email: "office@ridgelineplumbing.example", ownerName: "Mike Delgado" },
    });
    await generateOutreach(plumber.id, OutreachChannel.SMS);
  }

  if (medspa) {
    await prisma.lead.update({
      where: { id: medspa.id },
      data: {
        email: "info@glowmedspamiami.example",
        ownerName: "Isabella Cruz",
        status: "WON",
        dealValue: 3200,
        closedAt: new Date(),
      },
    });
    await prisma.activityEvent.create({
      data: { leadId: medspa.id, type: "deal_won", message: "Glow Med Spa signed the Full System package — $3,200" },
    });
  }

  if (contractor) {
    await prisma.lead.update({
      where: { id: contractor.id },
      data: { email: "info@summitcontractingco.example" },
    });
  }

  if (restaurant) {
    await prisma.lead.update({
      where: { id: restaurant.id },
      data: { email: "hello@copperforknashville.example" },
    });
  }

  if (salon) {
    await prisma.lead.update({
      where: { id: salon.id },
      data: {
        email: "book@luxecutsphoenix.example",
        status: "WON",
        dealValue: 1900,
        closedAt: new Date(),
      },
    });
    await prisma.activityEvent.create({
      data: { leadId: salon.id, type: "deal_won", message: "Luxe Cuts signed the Website + Booking package — $1,900" },
    });
  }

  console.log("\nSeed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
