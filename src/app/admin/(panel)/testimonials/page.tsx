import Icon from "@/components/Icon";
import PageHeader from "@/components/admin/PageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import { getAllTestimonials, type Testimonial } from "@/lib/db";
import { deleteTestimonial, saveTestimonial } from "../../actions";

export const dynamic = "force-dynamic";

function TestimonialForm({ testimonial }: { testimonial?: Testimonial }) {
  return (
    <form action={saveTestimonial.bind(null, testimonial?.id ?? null)} className="grid gap-4 sm:grid-cols-3">
      <div>
        <label className="field-label">Client name *</label>
        <input name="author" required defaultValue={testimonial?.author} className="field" placeholder="Jane Cooper" />
      </div>
      <div>
        <label className="field-label">Role</label>
        <input name="role" defaultValue={testimonial?.role} className="field" placeholder="Owner" />
      </div>
      <div>
        <label className="field-label">Company</label>
        <input name="company" defaultValue={testimonial?.company} className="field" placeholder="Acme Inc." />
      </div>
      <div className="sm:col-span-3">
        <label className="field-label">Quote *</label>
        <textarea
          name="quote"
          required
          rows={3}
          defaultValue={testimonial?.quote}
          className="field resize-y"
          placeholder="What did the client say?"
        />
      </div>
      <div>
        <label className="field-label">Rating</label>
        <select name="rating" defaultValue={testimonial?.rating ?? 5} className="field">
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {"★".repeat(n)}
              {"☆".repeat(5 - n)} ({n}/5)
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-end justify-between gap-3 sm:col-span-2">
        <label className="flex cursor-pointer items-center gap-2 pb-3 text-sm font-medium text-ink">
          <input
            type="checkbox"
            name="published"
            defaultChecked={testimonial ? testimonial.published === 1 : true}
            className="h-4 w-4 rounded accent-[#6D5EF2]"
          />
          Show on the public site
        </label>
        <button type="submit" className="btn-admin mb-1.5">
          <Icon name="check" size={15} />
          {testimonial ? "Save changes" : "Add testimonial"}
        </button>
      </div>
    </form>
  );
}

export default function TestimonialsAdminPage() {
  const testimonials = getAllTestimonials();

  return (
    <>
      <PageHeader
        title="Testimonials"
        description="Client quotes and star ratings shown on the public site."
      />

      <details className="admin-card group mb-6">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-brand select-none">
          <Icon name="plus" size={16} />
          Add a new testimonial
          <Icon name="chevron-down" size={16} className="ml-auto transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-5 border-t border-ink/5 pt-5">
          <TestimonialForm />
        </div>
      </details>

      <div className="grid gap-5 md:grid-cols-2">
        {testimonials.map((t) => (
          <article key={t.id} className="admin-card flex flex-col !p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-ink">{t.author}</h2>
                  <StatusBadge status={t.published ? "published" : "draft"} />
                </div>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {[t.role, t.company].filter(Boolean).join(", ") || "—"}
                </p>
                <div className="mt-1.5 flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Icon key={i} name="star" size={13} className={i < t.rating ? "text-amber-400" : "text-ink/15"} />
                  ))}
                </div>
              </div>
              <form action={deleteTestimonial.bind(null, t.id)}>
                <button type="submit" className="btn-admin-danger" title="Delete" aria-label={`Delete testimonial by ${t.author}`}>
                  <Icon name="trash" size={14} />
                </button>
              </form>
            </div>
            <blockquote className="mt-3 flex-1 rounded-xl bg-mist px-4 py-3 text-sm leading-relaxed text-ink">
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <details className="group mt-4 border-t border-ink/5 pt-4">
              <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-brand select-none">
                Edit testimonial
                <Icon name="chevron-down" size={14} className="transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-4">
                <TestimonialForm testimonial={t} />
              </div>
            </details>
          </article>
        ))}
      </div>
    </>
  );
}
