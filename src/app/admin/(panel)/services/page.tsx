import Icon, { SERVICE_ICON_NAMES } from "@/components/Icon";
import PageHeader from "@/components/admin/PageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import { getAllServices, type Service } from "@/lib/db";
import { deleteService, moveService, saveService } from "../../actions";

export const dynamic = "force-dynamic";

function ServiceForm({ service }: { service?: Service }) {
  return (
    <form action={saveService.bind(null, service?.id ?? null)} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="field-label">Title *</label>
        <input name="title" required defaultValue={service?.title} className="field" placeholder="Service name" />
      </div>
      <div>
        <label className="field-label">Price label</label>
        <input name="price" defaultValue={service?.price} className="field" placeholder="From $900 · From $350/mo · Custom quote" />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label">Description</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={service?.description}
          className="field resize-y"
          placeholder="A short, benefit-driven description shown on the card."
        />
      </div>
      <fieldset className="sm:col-span-2">
        <legend className="field-label">Icon</legend>
        <div className="flex flex-wrap gap-2">
          {SERVICE_ICON_NAMES.map((iconName) => (
            <label key={iconName} className="cursor-pointer" title={iconName}>
              <input
                type="radio"
                name="icon"
                value={iconName}
                defaultChecked={(service?.icon ?? "code") === iconName}
                className="peer sr-only"
              />
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-ink/10 text-ink-soft transition peer-checked:border-brand peer-checked:bg-brand-faint peer-checked:text-brand hover:border-brand/40">
                <Icon name={iconName} size={19} />
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center justify-between sm:col-span-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            name="published"
            defaultChecked={service ? service.published === 1 : true}
            className="h-4 w-4 rounded accent-[#6D5EF2]"
          />
          Show on the public site
        </label>
        <button type="submit" className="btn-admin">
          <Icon name="check" size={15} />
          {service ? "Save changes" : "Add service"}
        </button>
      </div>
    </form>
  );
}

export default function ServicesAdminPage() {
  const services = getAllServices();

  return (
    <>
      <PageHeader
        title="Services"
        description="What appears in the Services section and the contact form's dropdown."
      />

      <details className="admin-card group mb-6">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-brand select-none">
          <Icon name="plus" size={16} />
          Add a new service
          <Icon name="chevron-down" size={16} className="ml-auto transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-5 border-t border-ink/5 pt-5">
          <ServiceForm />
        </div>
      </details>

      <div className="space-y-4">
        {services.map((service, index) => (
          <article key={service.id} className="admin-card !p-5">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-faint text-brand">
                <Icon name={service.icon} size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-ink">{service.title}</h2>
                  {service.price && (
                    <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[0.68rem] font-bold text-accent-dark">
                      {service.price}
                    </span>
                  )}
                  <StatusBadge status={service.published ? "published" : "draft"} />
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-soft">{service.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <form action={moveService.bind(null, service.id, "up")}>
                  <button type="submit" disabled={index === 0} className="btn-admin-ghost disabled:opacity-30" title="Move up" aria-label="Move up">
                    <Icon name="chevron-up" size={14} />
                  </button>
                </form>
                <form action={moveService.bind(null, service.id, "down")}>
                  <button type="submit" disabled={index === services.length - 1} className="btn-admin-ghost disabled:opacity-30" title="Move down" aria-label="Move down">
                    <Icon name="chevron-down" size={14} />
                  </button>
                </form>
                <form action={deleteService.bind(null, service.id)}>
                  <button type="submit" className="btn-admin-danger" title="Delete" aria-label={`Delete ${service.title}`}>
                    <Icon name="trash" size={14} />
                  </button>
                </form>
              </div>
            </div>
            <details className="group mt-4 border-t border-ink/5 pt-4">
              <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-brand select-none">
                Edit service
                <Icon name="chevron-down" size={14} className="transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-4">
                <ServiceForm service={service} />
              </div>
            </details>
          </article>
        ))}
      </div>
    </>
  );
}
