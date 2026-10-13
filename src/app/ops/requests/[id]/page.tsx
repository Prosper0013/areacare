import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowLeft, Navigation, Phone } from "lucide-react";
import { db } from "@/db";
import { pickups } from "@/db/schema";
import { STAFF_ROLES, requireUser } from "@/lib/auth";
import { visibleZoneIds } from "@/lib/ops";
import { addressLine, binsLabel, dateTime, mapsLink, naira } from "@/lib/format";
import { AppShell } from "@/components/shell/AppShell";
import { StatusChip } from "@/components/StatusChip";
import { Map } from "@/components/map/Map";
import { PickupTimeline } from "@/components/PickupTimeline";
import { RequestActions } from "@/components/ops/RequestActions";

export const metadata = { title: "Pickup request" };
export const dynamic = "force-dynamic";

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(STAFF_ROLES);
  const { id } = await params;
  const p = await db.query.pickups.findFirst({
    where: eq(pickups.id, id),
    with: { team: true, handledBy: { columns: { name: true } }, clearedBy: { columns: { name: true } } },
  });
  if (!p) notFound();
  const zones = await visibleZoneIds(user);
  if (zones && (!p.zoneId || !zones.includes(p.zoneId))) notFound();

  const a = p.address;
  const hasPin = p.lat != null && p.lng != null;

  return (
    <AppShell user={user}>
      <Link href="/ops" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-moss hover:text-forest-900">
        <ArrowLeft size={16} /> Live board
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="panel hazard-edge overflow-hidden p-6 pt-8 sm:p-8 sm:pt-10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">{a.name}</h1>
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-vest-500 px-3 py-1 font-display text-lg font-bold text-forest-900">
                {binsLabel(p.binCount)}
              </p>
              <p className="mt-1 text-moss">Requested {dateTime(p.createdAt)}</p>
            </div>
            <StatusChip status={p.status} />
          </div>

          <dl className="mt-6 space-y-4">
            <Detail
              label="Trash cans"
              value={`${binsLabel(p.binCount)}${user.role !== "STAFF" && p.charge ? ` · ${naira(p.charge)} charged${p.refundedAt ? " (refunded)" : ""}` : ""}`}
            />
            <Detail label="Address" value={addressLine(a) || "Not provided"} />
            {a.landmark && <Detail label="Landmark" value={a.landmark} />}
            {a.houseDescription && <Detail label="Finding the bin" value={a.houseDescription} />}
            <Detail label="Zone" value={[a.zone, p.team?.name].filter(Boolean).join(" · ") || "—"} />
            <Detail label="Phone" value={a.phone} />
            {p.note && <Detail label="Note from member" value={`“${p.note}”`} />}
            <Detail
              label="Location"
              value={
                hasPin
                  ? `${p.locationSource === "live" ? "Live GPS from the member's phone" : "Saved house pin"}${
                      p.accuracy ? ` (±${Math.round(p.accuracy)} m)` : ""
                    }`
                  : "No location shared"
              }
            />
            {p.handledBy && <Detail label="Handled by" value={p.handledBy.name} />}
            {p.clearedAt && (
              <Detail
                label="Reported cleared"
                value={`${dateTime(p.clearedAt)}${p.clearedBy ? ` by ${p.clearedBy.name}` : ""}${p.clearedNote ? `\n“${p.clearedNote}”` : ""}`}
              />
            )}
            {p.status === "AWAITING_CONFIRMATION" && (
              <Detail
                label="Member confirmation"
                value={`Waiting · ${p.confirmReminders} reminder${p.confirmReminders === 1 ? "" : "s"} sent${p.escalatedAt ? " · management alerted" : ""}`}
              />
            )}
            {p.status === "COMPLETED" && (
              <Detail
                label="Confirmed"
                value={`${dateTime(p.completedAt)} by ${p.confirmedBy === "management" ? "management (on the member's behalf)" : "the member"}`}
              />
            )}
            {p.reopenedCount > 0 && (
              <Detail
                label="Reopened"
                value={`${p.reopenedCount}× by the member${p.reopenNote ? ` — “${p.reopenNote}”` : ""}`}
              />
            )}
          </dl>

          <div className="mt-6 grid grid-cols-2 gap-2">
            {hasPin && (
              <a href={mapsLink(p.lat!, p.lng!)} target="_blank" rel="noopener noreferrer" className="btn-dark">
                <Navigation size={17} /> Directions
              </a>
            )}
            <a href={`tel:${a.phone}`} className="btn-outline">
              <Phone size={17} /> Call member
            </a>
          </div>

          <div className="mt-4">
            <RequestActions id={p.id} status={p.status} canCancel={user.role !== "STAFF"} reminders={p.confirmReminders} />
          </div>
        </section>

        <div className="space-y-6">
          <div className="panel overflow-hidden p-2">
            <div className="h-[360px] overflow-hidden rounded-xl">
              {hasPin ? (
                <Map pins={[{ id: p.id, lat: p.lat!, lng: p.lng!, tone: "ember", label: a.name }]} accuracy={p.accuracy} className="h-full w-full" />
              ) : (
                <div className="grid h-full place-items-center bg-forest-50 text-moss">No location on this request</div>
              )}
            </div>
          </div>
          <section className="panel p-6">
            <h2 className="mb-5 text-xl font-bold">Progress</h2>
            <PickupTimeline pickup={p} viewer="staff" />
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[140px_1fr]">
      <dt className="text-sm text-moss">{label}</dt>
      <dd className="whitespace-pre-line font-medium">{value}</dd>
    </div>
  );
}
