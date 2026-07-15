import Icon from "@/components/Icon";
import PageHeader from "@/components/admin/PageHeader";
import { getPricing, type PricingTier } from "@/lib/db";
import { deletePricingTier, savePricingTier } from "../../actions";

export const dynamic = "force-dynamic";

function featuresText(tier?: PricingTier): string {
  if (!tier) return "";
  try {
    const parsed = JSON.parse(tier.features);
    return Array.isArray(parsed) ? parsed.join("\n") : "";
  } catch {
    return "";
  }
}

function TierForm({ tier }: { tier?: PricingTier }) {
  return (
    <form action={savePricingTier.bind(null, tier?.id ?? null)} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="field-label">Plan name *</label>
        <input name="name" required defaultValue={tier?.name} className="field" placeholder="Starter" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Price *</label>
          <input name="price" required defaultValue={tier?.price} className="field" placeholder="$900" />
        </div>
        <div>
          <label className="field-label">Period</label>
          <input name="period" defaultValue={tier?.period} className="field" placeholder="one-time / per month" />
        </div>
      </div>
      <div>
        <label className="field-label">Tagline</label>
        <input name="tagline" defaultValue={tier?.tagline} className="field" placeholder="Perfect for getting online fast." />
      </div>
      <div>
        <label className="field-label">Button label</label>
        <input name="cta_label" defaultValue={tier?.cta_label} className="field" placeholder="Get Started" />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label">Features — one per line</label>
        <textarea
          name="features"
          rows={6}
          defaultValue={featuresText(tier)}
          className="field resize-y font-mono text-xs"
          placeholder={"5-page custom website\nMobile-responsive design\nBasic on-page SEO"}
        />
      </div>
      <div className="flex items-center justify-between sm:col-span-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            name="highlighted"
            defaultChecked={tier?.highlighted === 1}
            className="h-4 w-4 rounded accent-[#6D5EF2]"
          />
          Highlight as “Most popular”
        </label>
        <button type="submit" className="btn-admin">
          <Icon name="check" size={15} />
          {tier ? "Save changes" : "Add plan"}
        </button>
      </div>
    </form>
  );
}

export default function PricingAdminPage() {
  const tiers = getPricing();

  return (
    <>
      <PageHeader
        title="Pricing"
        description="Edit plans, prices, and feature lists — changes appear on the site instantly."
      />

      <details className="admin-card group mb-6">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-brand select-none">
          <Icon name="plus" size={16} />
          Add a new plan
          <Icon name="chevron-down" size={16} className="ml-auto transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-5 border-t border-ink/5 pt-5">
          <TierForm />
        </div>
      </details>

      <div className="grid gap-5 lg:grid-cols-3">
        {tiers.map((tier) => (
          <article key={tier.id} className="admin-card flex flex-col !p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-semibold text-ink">{tier.name}</h2>
                  {tier.highlighted === 1 && (
                    <span className="rounded-full bg-gradient-to-r from-brand to-accent px-2.5 py-0.5 text-[0.62rem] font-bold tracking-wide text-white uppercase">
                      Popular
                    </span>
                  )}
                </div>
                <p className="mt-1 text-2xl font-bold text-ink">
                  {tier.price}{" "}
                  {tier.period && <span className="text-xs font-medium text-ink-soft">{tier.period}</span>}
                </p>
              </div>
              <form action={deletePricingTier.bind(null, tier.id)}>
                <button type="submit" className="btn-admin-danger" title="Delete plan" aria-label={`Delete ${tier.name}`}>
                  <Icon name="trash" size={14} />
                </button>
              </form>
            </div>
            <details className="group mt-4 flex-1 border-t border-ink/5 pt-4">
              <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-brand select-none">
                Edit plan
                <Icon name="chevron-down" size={14} className="transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-4">
                <TierForm tier={tier} />
              </div>
            </details>
          </article>
        ))}
      </div>
    </>
  );
}
