import Link from "next/link";
import Icon from "@/components/Icon";
import PageHeader from "@/components/admin/PageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import { getDb, type Booking } from "@/lib/db";
import { deleteBooking, setBookingStatus, toggleBookingRead } from "../../actions";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function getBookings(filter: FilterKey): Booking[] {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  switch (filter) {
    case "upcoming":
      return db
        .prepare(
          "SELECT * FROM bookings WHERE date >= ? AND status != 'cancelled' ORDER BY date, time"
        )
        .all(today) as Booking[];
    case "past":
      return db
        .prepare(
          "SELECT * FROM bookings WHERE date < ? AND status != 'cancelled' ORDER BY date DESC, time"
        )
        .all(today) as Booking[];
    case "cancelled":
      return db
        .prepare("SELECT * FROM bookings WHERE status = 'cancelled' ORDER BY date DESC, time")
        .all() as Booking[];
    default:
      return db.prepare("SELECT * FROM bookings ORDER BY date DESC, time").all() as Booking[];
  }
}

function prettyDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter: FilterKey = (FILTERS.find((f) => f.key === params.filter)?.key ??
    "upcoming") as FilterKey;
  const bookings = getBookings(filter);
  const counts = Object.fromEntries(
    FILTERS.map((f) => [f.key, getBookings(f.key).length])
  ) as Record<FilterKey, number>;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Appointments booked through the “Book a free call” form on the site."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "upcoming" ? "/admin/bookings" : `/admin/bookings?filter=${f.key}`}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              filter === f.key
                ? "bg-ink text-white"
                : "border border-ink/10 bg-white text-ink-soft hover:border-brand/40 hover:text-brand"
            }`}
          >
            {f.label} <span className="opacity-60">({counts[f.key]})</span>
          </Link>
        ))}
      </div>

      {bookings.length === 0 ? (
        <div className="admin-card py-16 text-center">
          <Icon name="calendar" size={32} className="mx-auto text-ink/20" />
          <p className="mt-4 text-sm font-medium text-ink">No {filter === "all" ? "" : filter} bookings</p>
          <p className="mt-1 text-sm text-ink-soft">
            New appointments from the website will show up here with all their details.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <article
              key={booking.id}
              className={`admin-card !p-5 ${booking.is_read ? "" : "ring-2 ring-brand/25"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  {/* date/time block */}
                  <div
                    className={`flex w-20 shrink-0 flex-col items-center rounded-xl px-2 py-2.5 ${
                      booking.date === today
                        ? "bg-brand text-white"
                        : "bg-brand-faint text-brand"
                    }`}
                  >
                    <span className="text-[0.6rem] font-bold tracking-wider uppercase">
                      {prettyDate(booking.date).split(",")[0]}
                    </span>
                    <span className="font-display text-lg leading-tight font-bold">
                      {booking.date.slice(8, 10)}/{booking.date.slice(5, 7)}
                    </span>
                    <span className="text-xs font-semibold">{booking.time}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {!booking.is_read && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-brand" title="Unread" />
                      )}
                      <h2 className={`text-sm text-ink ${booking.is_read ? "font-semibold" : "font-bold"}`}>
                        {booking.name}
                      </h2>
                      <StatusBadge status={booking.status} />
                      {booking.date === today && booking.status !== "cancelled" && (
                        <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[0.68rem] font-bold text-accent-dark uppercase">
                          Today
                        </span>
                      )}
                    </div>
                    <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
                      <a href={`mailto:${booking.email}`} className="font-medium text-brand hover:underline">
                        {booking.email}
                      </a>
                      {booking.phone && <span>{booking.phone}</span>}
                      <span>{prettyDate(booking.date)} · {booking.time}</span>
                    </p>
                    {booking.service && (
                      <p className="mt-2">
                        <span className="rounded-full bg-brand-faint px-2.5 py-0.5 text-[0.68rem] font-semibold text-brand">
                          {booking.service}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <form action={setBookingStatus.bind(null, booking.id)} className="flex shrink-0 flex-wrap gap-1.5">
                  {(["pending", "confirmed", "completed", "cancelled"] as const).map((status) => (
                    <button
                      key={status}
                      type="submit"
                      name="status"
                      value={status}
                      disabled={booking.status === status}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                        booking.status === status
                          ? "bg-ink text-white"
                          : "border border-ink/10 bg-white text-ink-soft hover:border-brand/40 hover:text-brand"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </form>
              </div>

              {booking.notes && (
                <p className="mt-4 rounded-xl bg-mist px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-ink">
                  {booking.notes}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <form action={toggleBookingRead.bind(null, booking.id)}>
                  <button type="submit" className="btn-admin-ghost">
                    <Icon name="eye" size={13} />
                    Mark as {booking.is_read ? "unread" : "read"}
                  </button>
                </form>
                {booking.status === "cancelled" && (
                  <form action={deleteBooking.bind(null, booking.id)}>
                    <button type="submit" className="btn-admin-danger">
                      <Icon name="trash" size={13} />
                      Delete permanently
                    </button>
                  </form>
                )}
                <span className="ml-auto text-[0.68rem] text-ink-soft">
                  booked {booking.created_at.slice(0, 16).replace("T", " ")} UTC
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
