import Icon from "@/components/Icon";
import PageHeader from "@/components/admin/PageHeader";
import { getCustomers } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function CustomersPage() {
  const customers = getCustomers();

  return (
    <>
      <PageHeader
        title="Customers"
        description="Everyone who has contacted you or booked a call — one row per email address."
      />

      {customers.length === 0 ? (
        <div className="admin-card py-16 text-center">
          <Icon name="users" size={32} className="mx-auto text-ink/20" />
          <p className="mt-4 text-sm font-medium text-ink">No customers yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            People appear here automatically when they send an inquiry or book an appointment.
          </p>
        </div>
      ) : (
        <div className="admin-card overflow-x-auto !p-0">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/8 text-xs tracking-wide text-ink-soft uppercase">
                <th scope="col" className="px-5 py-3.5 font-semibold">Customer</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Phone</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Interested in</th>
                <th scope="col" className="px-5 py-3.5 text-center font-semibold">Inquiries</th>
                <th scope="col" className="px-5 py-3.5 text-center font-semibold">Bookings</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Last activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {customers.map((c) => (
                <tr key={c.email} className="transition hover:bg-mist/60">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-accent text-xs font-bold text-white">
                        {(c.name || c.email)
                          .split(" ")
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{c.name || "—"}</span>
                        <a href={`mailto:${c.email}`} className="block truncate text-xs text-brand hover:underline">
                          {c.email}
                        </a>
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-ink-soft">{c.phone || "—"}</td>
                  <td className="max-w-[220px] px-5 py-4">
                    <span className="block truncate text-ink-soft" title={c.services || undefined}>
                      {c.services ? c.services.split(",").join(", ") : "—"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center font-semibold text-ink tabular-nums">{c.leads}</td>
                  <td className="px-5 py-4 text-center font-semibold text-ink tabular-nums">{c.bookings}</td>
                  <td className="px-5 py-4 whitespace-nowrap text-ink-soft">
                    {c.last_activity.slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
