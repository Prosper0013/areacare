import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { Navigation, Phone } from "lucide-react";
import clsx from "clsx";
import { db } from "@/db";
import { soakawayBookings, type SoakawayStatus } from "@/db/schema";
import { MANAGEMENT_ROLES, requireUser } from "@/lib/auth";
import { addressLine, appointment, dateTime, mapsLink, naira } from "@/lib/format";
import { AppShell, PageTitle } from "@/components/shell/AppShell";
import { ManageBooking } from "@/components/soakaway/ManageBooking";
import { SoakawayChip, TIME_LABEL } from "@/components/soakaway/SoakawayStatus";

export const metadata = { title: "Soakaway bookings" };
export const dynamic = "force-dynamic";

const TABS: { key: SoakawayStatus; label: string }[] = [
  { key: "PENDING_APPROVAL", label: "To approve" },
  { key: "SCHEDULED", label: "Scheduled" },
  { key: "COMPLETED", label: "Completed" },
  { key: "AWAITING_PAYMENT", label: "Not paid" },
  { key: "REJECTED", label: "Declined" },
  { key: "CANCELLED", label: "Cancelled" },
];

/** Lagos-local "yyyy-mm-ddThh:mm" for the reschedule picker. */
function lagosLocal(d: Date | null) {
  if (!d) return null;
  return new Date(d.getTime() + 60 * 60_000).toISOString().slice(0, 16);
}

export default async function ManageSoakaway({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser(MANAGEMENT_ROLES);
  const { tab } = await searchParams;
  const active = TABS.find((t) => t.key === tab)?.key ?? "PENDING_APPROVAL";

  const [rows, counts] = await Promise.all([
    db.query.soakawayBookings.findMany({
      where: eq(soakawayBookings.status, active),
      orderBy: active === "SCHEDULED" ? soakawayBookings.scheduledFor : desc(soakawayBookings.createdAt),
      limit: 200,
      with: { approvedBy: { columns: { name: true } } },
    }),
    db.select({ status: soakawayBookings.status, n: count() }).from(soakawayBookings).groupBy(soakawayBookings.status),
  ]);
  const n = Object.fromEntries(counts.map((c) => [c.status, c.n])) as Partial<Record<SoakawayStatus, number>>;

  return (
    <AppShell user={user}>
      <PageTitle
        title="Soakaway bookings"
        subtitle="Approve paid bookings with a date and time. The member is notified straight away and reminded on the morning."
        action={
          user.role === "SUPER_ADMIN" ? (
            <Link href="/admin/settings" className="btn-outline btn-sm">
              Change price
            </Link>
          ) : undefined
        }
      />

      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Booking status">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/ops/soakaway?tab=${t.key}`}
            className={clsx(
              "rounded-full px-4 py-2 text-sm font-semibold transition",
              active === t.key ? "bg-forest-900 text-white" : "bg-white text-forest-900 shadow-ring hover:bg-forest-50",
            )}
          >
            {t.label} <span className="ml-1 opacity-60">{n[t.key] ?? 0}</span>
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className="panel p-10 text-center text-moss">
          {active === "PENDING_APPROVAL" ? "No bookings waiting for approval." : "Nothing here yet."}
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((b) => (
            <li key={b.id} className={clsx("panel p-5", b.status === "PENDING_APPROVAL" && "hazard-edge pt-6")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold">{b.address.name}</p>
                  <p className="text-sm text-moss">{addressLine(b.address)}</p>
                  {b.address.landmark && <p className="text-sm">Landmark: {b.address.landmark}</p>}
                </div>
                <SoakawayChip status={b.status} />
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-moss">{b.scheduledFor ? "Scheduled for" : "Member prefers"}</dt>
                  <dd className="font-semibold">
                    {b.scheduledFor
                      ? appointment(b.scheduledFor)
                      : `${b.preferredDate ?? "Any day"} · ${TIME_LABEL[b.preferredTime ?? "any"]}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-moss">Payment</dt>
                  <dd className="font-semibold">
                    {naira(b.amount)} {b.paidAt ? `· paid ${dateTime(b.paidAt)}` : "· not paid"}
                  </dd>
                </div>
                <div>
                  <dt className="text-moss">Area</dt>
                  <dd className="font-semibold">{b.address.zone ?? "—"}</dd>
                </div>
              </dl>

              {b.note && <p className="mt-3 rounded-lg bg-vest-100 px-3 py-2 text-sm">“{b.note}”</p>}
              {b.adminNote && <p className="mt-3 text-sm text-moss">Message sent: “{b.adminNote}”</p>}
              {b.rejectReason && <p className="mt-3 text-sm text-ember-600">Declined: {b.rejectReason}</p>}
              {b.approvedBy && (
                <p className="mt-2 text-xs text-moss">
                  Approved by {b.approvedBy.name} {b.approvedAt ? `· ${dateTime(b.approvedAt)}` : ""}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {b.lat != null && b.lng != null && (
                  <a href={mapsLink(b.lat, b.lng)} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm">
                    <Navigation size={15} /> Directions
                  </a>
                )}
                <a href={`tel:${b.address.phone}`} className="btn-outline btn-sm">
                  <Phone size={15} /> Call
                </a>
              </div>
              <div className="mt-3">
                <ManageBooking
                  id={b.id}
                  status={b.status}
                  preferredDate={b.preferredDate}
                  preferredTime={b.preferredTime}
                  scheduledLocal={lagosLocal(b.scheduledFor)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
