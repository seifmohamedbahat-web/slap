import Icon from "@/components/Icon";
import PageHeader from "@/components/admin/PageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import { getAllPortfolio, type PortfolioItem } from "@/lib/db";
import { deletePortfolioItem, movePortfolioItem, savePortfolioItem } from "../../actions";

export const dynamic = "force-dynamic";

function PortfolioForm({ item }: { item?: PortfolioItem }) {
  return (
    <form
      action={savePortfolioItem.bind(null, item?.id ?? null)}
      className="grid gap-4 sm:grid-cols-2"
    >
      <div>
        <label className="field-label">Title *</label>
        <input name="title" required defaultValue={item?.title} className="field" placeholder="Project name" />
      </div>
      <div>
        <label className="field-label">Category</label>
        <input
          name="category"
          defaultValue={item?.category}
          className="field"
          placeholder="Web Design, Branding, E-commerce…"
        />
      </div>
      <div>
        <label className="field-label">Image URL</label>
        <input
          name="image"
          defaultValue={item?.image}
          className="field"
          placeholder="/portfolio/example.svg or https://…"
        />
      </div>
      <div>
        <label className="field-label">…or upload an image</label>
        <input
          type="file"
          name="imageFile"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="field !py-2.5 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-faint file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label">Project link</label>
        <input name="link" defaultValue={item?.link} className="field" placeholder="https://client-site.com" />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label">Description</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={item?.description}
          className="field resize-y"
          placeholder="One or two sentences about the project and its results."
        />
      </div>
      <div className="flex items-center justify-between sm:col-span-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            name="published"
            defaultChecked={item ? item.published === 1 : true}
            className="h-4 w-4 rounded accent-[#6D5EF2]"
          />
          Show on the public site
        </label>
        <button type="submit" className="btn-admin">
          <Icon name="check" size={15} />
          {item ? "Save changes" : "Add project"}
        </button>
      </div>
    </form>
  );
}

export default function PortfolioAdminPage() {
  const items = getAllPortfolio();

  return (
    <>
      <PageHeader
        title="Portfolio"
        description="The projects shown in the “Our work” section — drag order with the arrows."
      />

      <details className="admin-card group mb-6">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-brand select-none">
          <Icon name="plus" size={16} />
          Add a new project
          <Icon name="chevron-down" size={16} className="ml-auto transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-5 border-t border-ink/5 pt-5">
          <PortfolioForm />
        </div>
      </details>

      <div className="space-y-4">
        {items.map((item, index) => (
          <article key={item.id} className="admin-card !p-5">
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-brand-faint">
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-ink">{item.title}</h2>
                  <StatusBadge status={item.published ? "published" : "draft"} />
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-soft">
                  {item.category || "Uncategorized"}
                  {item.description ? ` — ${item.description}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <form action={movePortfolioItem.bind(null, item.id, "up")}>
                  <button type="submit" disabled={index === 0} className="btn-admin-ghost disabled:opacity-30" title="Move up" aria-label="Move up">
                    <Icon name="chevron-up" size={14} />
                  </button>
                </form>
                <form action={movePortfolioItem.bind(null, item.id, "down")}>
                  <button type="submit" disabled={index === items.length - 1} className="btn-admin-ghost disabled:opacity-30" title="Move down" aria-label="Move down">
                    <Icon name="chevron-down" size={14} />
                  </button>
                </form>
                <form action={deletePortfolioItem.bind(null, item.id)}>
                  <button type="submit" className="btn-admin-danger" title="Delete" aria-label={`Delete ${item.title}`}>
                    <Icon name="trash" size={14} />
                  </button>
                </form>
              </div>
            </div>
            <details className="group mt-4 border-t border-ink/5 pt-4">
              <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-brand select-none">
                Edit project
                <Icon name="chevron-down" size={14} className="transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-4">
                <PortfolioForm item={item} />
              </div>
            </details>
          </article>
        ))}
      </div>
    </>
  );
}
