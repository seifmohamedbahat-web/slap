import Icon from "@/components/Icon";
import PageHeader from "@/components/admin/PageHeader";
import { getSettings } from "@/lib/db";
import { saveSettings } from "../../actions";

export const dynamic = "force-dynamic";

const GROUPS: { title: string; fields: { key: string; label: string; placeholder: string; type?: string }[] }[] = [
  {
    title: "Site identity",
    fields: [
      { key: "site_name", label: "Site name", placeholder: "DigitalOrbit" },
      { key: "tagline", label: "Tagline", placeholder: "Websites & Digital Services" },
    ],
  },
  {
    title: "Contact details",
    fields: [
      { key: "contact_email", label: "Contact email", placeholder: "hello@digitalorbit.agency", type: "email" },
      { key: "phone", label: "Phone", placeholder: "+1 (555) 010-7788" },
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
            <h2 className="font-display mb-5 font-semibold text-ink">{group.title}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
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
