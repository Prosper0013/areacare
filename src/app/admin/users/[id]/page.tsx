import { notFound } from "next/navigation";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import clsx from "clsx";
import { db } from "@/db";
import { payments, pickups, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { daysLeft } from "@/lib/membership";
import { memberPaymentSummary } from "@/lib/payment-stats";
import { getFees } from "@/lib/settings";
import { addressLine, dateTime, mapsLink, naira, shortDate } from "@/lib/format";
import { AppShell } from "@/components/shell/AppShell";
import { PaymentsTable } from "@/components/payments/PaymentsTable";
import { StatusChip } from "@/components/StatusChip";
import { Map } from "@/components/map/Map";
import { MemberActions } from "@/components/admin/MemberActions";
import { RecordPayment } from "@/components/admin/RecordPayment";

export const metadata = { title: "Member" };
export const dynamic = "force-dynamic";

const STATUS = {
  ACTIVE: ["Active", "bg-forest-100 text-forest-700"],
  OVERDUE: ["Dues overdue", "bg-ember-100 text-ember-600"],
  UNREGISTERED: ["Not registered", "bg-forest-900/5 text-moss"],
  SUSPENDED: ["Suspended", "bg-forest-900 text-white"],
} as const;

const ROLE_LABEL = { USER: "Member", STAFF: "Crew", ADMIN: "Management", SUPER_ADMIN: "Super admin" } as const;

export default async function MemberProfile({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser(["SUPER_ADMIN"]);
  const { id } = await params;
  const u = await db.query.users.findFirst({
    where: eq(users.id, id),
    with: { zone: true, teams: { with: { team: { columns: { name: true } } } } },
  });
  if (!u) notFound();

  const [paymentRows, pickupRows, summary, fees] = await Promise.all([
    db.query.payments.findMany({ where: eq(payments.userId, u.id), orderBy: desc(payments.createdAt), limit: 200 }),
    db.query.pickups.findMany({
      where: eq(pickups.userId, u.id),
      orderBy: desc(pickups.createdAt),
      limit: 50,
      with: { handledBy: { columns: { name: true } } },
    }),
    memberPaymentSummary(u.id),
    getFees(),
  ]);

  const isMember = u.role === "USER";
  const [statusLabel, statusCls] = STATUS[u.membershipStatus];
  const left = daysLeft(u);
  const collected = pickupRows.filter((p) => p.status === "COMPLETED").length;

  return (
    <AppShell user={me}>
      <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-moss hover:text-forest-900">
        <ArrowLeft size={16} /> People
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[34px] font-bold leading-tight sm:text-[40px]">{u.name}</h1>
            <span className="chip bg-forest-900/5 text-forest-900">{ROLE_LABEL[u.role]}</span>
            {(isMember || u.membershipStatus === "SUSPENDED") && <span className={clsx("chip", statusCls)}>{statusLabel}</span>}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-moss">
            <a href={`mailto:${u.email}`} className="inline-flex items-center gap-1.5 hover:text-forest-900">
              <Mail size={15} /> {u.email}
            </a>
            {u.phone && (
              <a href={`tel:${u.phone}`} className="inline-flex items-center gap-1.5 hover:text-forest-900">
                <Phone size={15} /> {u.phone}
              </a>
            )}
            <span>Joined {shortDate(u.createdAt)}</span>
          </div>
        </div>
        <MemberActions userId={u.id} role={u.role} suspended={u.membershipStatus === "SUSPENDED"} isSelf={u.id === me.id} />
      </div>

      {isMember && (
        <dl className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <div className="rounded-2xl bg-forest-900 p-5 text-white">
            <dt className="text-sm text-white/70">Total paid</dt>
            <dd className="mt-1 font-display text-xl font-extrabold sm:text-3xl">{naira(summary.totalPaid)}</dd>
            <p className="mt-1 text-sm text-white/70">
              {summary.successfulCount} payment{summary.successfulCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-ring">
            <dt className="text-sm text-moss">Paid through</dt>
            <dd className="mt-1 font-display text-xl font-extrabold sm:text-3xl">{shortDate(u.paidThrough)}</dd>
            <p className={clsx("mt-1 text-sm", u.membershipStatus === "OVERDUE" ? "font-semibold text-ember-600" : "text-moss")}>
              {!u.registeredAt ? "Never registered" : u.membershipStatus === "ACTIVE" ? `${left} days left` : "Overdue"}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-ring">
            <dt className="text-sm text-moss">Registered</dt>
            <dd className="mt-1 font-display text-xl font-extrabold sm:text-3xl">{u.registeredAt ? shortDate(u.registeredAt) : "—"}</dd>
            <p className="mt-1 text-sm text-moss">{summary.pendingCount} pending payment{summary.pendingCount === 1 ? "" : "s"}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-ring">
            <dt className="text-sm text-moss">Pickups</dt>
            <dd className="mt-1 font-display text-xl font-extrabold sm:text-3xl">{pickupRows.length}</dd>
            <p className="mt-1 text-sm text-moss">{collected} cleared & confirmed</p>
          </div>
        </dl>
      )}

      {isMember ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <section className="panel p-6">
            <h2 className="text-xl font-bold">House</h2>
            <p className="mt-3 flex items-start gap-2 font-semibold">
              <MapPin size={18} className="mt-0.5 shrink-0 text-forest-600" />
              {addressLine({ ...u, zone: u.zone?.name ?? null }) || "No address added yet"}
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <dt className="text-moss">Zone</dt>
                <dd>{u.zone?.name ?? "—"}</dd>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <dt className="text-moss">Landmark</dt>
                <dd>{u.landmark ?? "—"}</dd>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <dt className="text-moss">Finding the bin</dt>
                <dd>{u.houseDescription ?? "—"}</dd>
              </div>
            </dl>
            {u.homeLat != null && u.homeLng != null && (
              <a href={mapsLink(u.homeLat, u.homeLng)} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm mt-4">
                Open in Google Maps
              </a>
            )}
          </section>
          <div className="panel overflow-hidden p-2">
            <div className="h-[280px] overflow-hidden rounded-xl">
              {u.homeLat != null && u.homeLng != null ? (
                <Map pins={[{ id: u.id, lat: u.homeLat, lng: u.homeLng, tone: "vest", label: u.name }]} className="h-full w-full" />
              ) : (
                <div className="grid h-full place-items-center bg-forest-50 text-moss">No house pin saved</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <section className="panel p-6">
          <h2 className="text-xl font-bold">Teams</h2>
          <p className="mt-2 text-moss">
            {u.teams.length ? u.teams.map((t) => t.team.name).join(", ") : "Not on any team yet. Add them on the Teams & zones page."}
          </p>
        </section>
      )}

      {isMember && (
        <>
          <section className="panel mt-6 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-forest-900/5 px-5 py-4">
              <h2 className="text-xl font-bold">Payments</h2>
              {u.membershipStatus !== "SUSPENDED" && <RecordPayment userId={u.id} registered={Boolean(u.registeredAt)} fees={fees} />}
            </div>
            <PaymentsTable rows={paymentRows} view="admin" hideMember empty="This member hasn't made any payments." />
          </section>

          <section className="panel mt-6 overflow-hidden">
            <h2 className="border-b border-forest-900/5 px-5 py-4 text-xl font-bold">Pickup requests</h2>
            {pickupRows.length === 0 ? (
              <p className="px-5 py-10 text-center text-moss">No pickup requests yet.</p>
            ) : (
              <ul className="divide-y divide-forest-900/5">
                {pickupRows.map((p) => (
                  <li key={p.id}>
                    <Link href={`/ops/requests/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-forest-50">
                      <div>
                        <p className="font-semibold">Requested {dateTime(p.createdAt)}</p>
                        <p className="text-sm text-moss">
                          {p.completedAt
                            ? `Cleared · confirmed ${dateTime(p.completedAt)} by ${p.confirmedBy === "management" ? "management" : "member"}`
                            : p.status === "AWAITING_CONFIRMATION"
                              ? "Reported cleared · waiting for member"
                              : p.cancelledAt
                                ? "Cancelled"
                                : "In progress"}
                          {p.handledBy ? ` · ${p.handledBy.name}` : ""}
                        </p>
                      </div>
                      <StatusChip status={p.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
