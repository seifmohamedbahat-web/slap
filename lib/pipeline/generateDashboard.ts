import { prisma } from "@/lib/db/client";
import type { DashboardTemplateKey } from "@/lib/types";

const TEMPLATES: Record<DashboardTemplateKey, { label: string; sections: string[] }> = {
  plumber: {
    label: "Plumber",
    sections: ["Jobs", "Customers", "Quotes", "Invoices", "Revenue", "Employees", "Reports"],
  },
  dentist: {
    label: "Dental Practice",
    sections: ["Patients", "Doctors", "Treatments", "Appointments", "Payments"],
  },
  medspa: {
    label: "Med Spa",
    sections: ["Memberships", "Clients", "Packages", "Treatments", "Revenue"],
  },
  contractor: {
    label: "Contractor",
    sections: ["Projects", "Materials", "Scheduling", "Quotes", "Reports"],
  },
  restaurant: {
    label: "Restaurant",
    sections: ["Reservations", "Menu", "Staff", "Orders", "Revenue"],
  },
  salon: {
    label: "Salon",
    sections: ["Appointments", "Stylists", "Clients", "Inventory", "Revenue"],
  },
  generic: {
    label: "Business",
    sections: ["Customers", "Jobs", "Invoices", "Revenue", "Reports"],
  },
};

export function templateKeyForCategory(category: string): DashboardTemplateKey {
  const c = category.toLowerCase();
  if (c.includes("plumb") || c.includes("electric")) return "plumber";
  if (c.includes("dent")) return "dentist";
  if (c.includes("med spa") || c.includes("spa")) return "medspa";
  if (c.includes("contract")) return "contractor";
  if (c.includes("restaurant")) return "restaurant";
  if (c.includes("salon") || c.includes("barber")) return "salon";
  return "generic";
}

function seedRecordsFor(templateKey: DashboardTemplateKey, businessName: string) {
  const names = ["Jordan Lee", "Maria Gomez", "Chris Patel", "Taylor Kim", "Sam Rivera"];
  const base = names.map((name, i) => ({
    id: i + 1,
    name,
    status: ["Active", "Pending", "Completed"][i % 3],
    value: Math.round(150 + Math.random() * 850),
  }));
  return { businessName, records: base };
}

export async function generateAdminDashboard(leadId: string) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  const templateKey = templateKeyForCategory(lead.category);
  const template = TEMPLATES[templateKey];
  const seedData = seedRecordsFor(templateKey, lead.businessName);

  await prisma.adminDashboardProject.upsert({
    where: { leadId },
    create: {
      leadId,
      status: "READY",
      templateKey,
      sectionsJson: JSON.stringify(template.sections),
      seedDataJson: JSON.stringify(seedData),
      generatedAt: new Date(),
    },
    update: {
      status: "READY",
      templateKey,
      sectionsJson: JSON.stringify(template.sections),
      seedDataJson: JSON.stringify(seedData),
      generatedAt: new Date(),
    },
  });

  await prisma.activityEvent.create({
    data: {
      leadId,
      type: "dashboard_generated",
      message: `Generated ${template.label} admin dashboard for ${lead.businessName}`,
    },
  });

  return { templateKey, sections: template.sections, seedData };
}

export { TEMPLATES as DASHBOARD_TEMPLATES };
