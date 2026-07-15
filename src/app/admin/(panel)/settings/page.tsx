import Icon from "@/components/Icon";
import PageHeader from "@/components/admin/PageHeader";
import { getSettings } from "@/lib/db";
import { saveSettings } from "../../actions";

export const dynamic = "force-dynamic";

const GROUPS: {
  title: string;
  note?: string;
  fields: { key: string; label: string; placeholder: string; type?: string; hint?: string }[];
}[] = [
  {
    title: "Site identity",
    fields: [
      { key: "site_name", label: "Site name", placeholder: "DigitalOrbit" },
      { key: "tagline", label: "Tagline", placeholder: "Websites & Digital Services" },
    ],
  },
  {
    title: "Notifications",
    note: "Where new contact messages, project requests, and bookings are emailed.",
    fields: [
      {
        key: "notify_email",
        label: "Notification email",
        placeholder: "digitaorionsupport@gmail.com",
        type: "email",
        hint: "Every inquiry and booking is sent here with all its details.",
      },
    ],
  },
  {
    title: "Contact details",
    fields: [
      { key: "contact_email", label: "Public contact email (shown on the site)", placeholder: "digitaorionsupport@gmail.com", type: "email" },
      { key: "phone", label: "Phone", placeholder: "+20 101 264 8914" },
      { key: "address", label: "Location / address", placeholder: "City, Country" },
      { key: "hours", label: "Business hours", placeholder: "Mon–Fri, 9:00–18:00" },
    ],
  },
  {
    title: "Social links",
    fields: [
      { key: "social_facebook", label: "Facebook", placeholder: "https://facebook.com/…", type: "url" },
      { key: "social_instagram", label: "Instagram", placeholder: "https://instagram.com/…", type: "url" },
      { key: "social_twitter", label: "X (Twitter)", placeholder: "https://x.com/…", type: "url" },
      { key: "social_linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/…", type: "url" },
    ],
  },
];

export default function SettingsAdminPage() {
  const settings = getSettings();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Site-wide info used in the footer, contact section, and SEO tags."
      />

      <form action={saveSettings} className="space-y-6">
        {GROUPS.map((group) => (
          <section key={group.title} className="admin-card">
            <h2 className="font-display font-semibold text-ink">{group.title}</h2>
            {group.note && <p className="mt-1 text-xs text-ink-soft">{group.note}</p>}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {group.fields.map((field) => (
                <div key={field.key}>
                  <label htmlFor={`setting-${field.key}`} className="field-label">
                    {field.label}
                  </label>
                  <input
                    id={`setting-${field.key}`}
                    name={field.key}
                    type={field.type ?? "text"}
                    defaultValue={settings[field.key] ?? ""}
                    placeholder={field.placeholder}
                    className="field"
                  />
                  {field.hint && <p className="mt-1.5 text-xs text-ink-soft">{field.hint}</p>}
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="flex justify-end">
          <button type="submit" className="btn-admin !px-6 !py-2.5">
            <Icon name="check" size={15} />
            Save settings
          </button>
        </div>
      </form>
    </>
  );
}
