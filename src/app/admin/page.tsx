import Link from "next/link";
import { and, asc, between, count, desc, eq, gte, inArray, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import { payments, pickups, soakawayBookings, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { OPEN_STATUSES } from "@/lib/pickups";
import { startOfLagosDay } from "@/lib/ops";
import { dateTime, naira, shortDate } from "@/lib/format";
import { revenueByMonth } from "@/lib/admin-payments";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { AppShell, PageTitle } from "@/components/shell/AppShell";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const user = await requireUser(["SUPER_ADMIN"]);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const since = new Date(Date.now() - 13 * 86_400_000);
  since.setHours(0, 0, 0, 0);

  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 86_400_000);
  const [[{ clearedToday }], [{ soakToApprove }]] = await Promise.all([
    db
      .select({ clearedToday: count() })
      .from(pickups)
      .where(and(eq(pickups.status, "COMPLETED"), gte(pickups.completedAt, startOfLagosDay()))),
    db.select({ soakToApprove: count() }).from(soakawayBookings).where(eq(soakawayBookings.status, "PENDING_APPROVAL")),
  ]);
  const [memberCounts, [{ open, awaiting, reopened }], [{ revenue }], daily, recentPayments, months, dueSoon, overdue] = await Promise.all([
    db
      .select({ status: users.membershipStatus, n: count() })
      .from(users)
      .where(eq(users.role, "USER"))
      .groupBy(users.membershipStatus),
    db
      .select({
        open: count(),
        awaiting: sql<number>`count(*) filter (where ${pickups.status} = 'AWAITING_CONFIRMATION')`.mapWith(Number),
        reopened: sql<number>`count(*) filter (where ${pickups.reopenedCount} > 0 and ${pickups.status} <> 'AWAITING_CONFIRMATION')`.mapWith(Number),
      })
      .from(pickups)
      .where(inArray(pickups.status, OPEN_STATUSES)),
    db
      .select({ revenue: sum(payments.amount) })
      .from(payments)
      .where(and(eq(payments.status, "SUCCESSFUL"), gte(payments.verifiedAt, monthStart))),
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${pickups.createdAt} at time zone 'Africa/Lagos'), 'YYYY-MM-DD')`,
        n: count(),
      })
      .from(pickups)
      .where(gte(pickups.createdAt, since))
      .groupBy(sql`1`),
    db.query.payments.findMany({
      where: eq(payments.status, "SUCCESSFUL"),
      orderBy: desc(payments.verifiedAt),
      limit: 6,
      with: { user: { columns: { id: true, name: true } } },
    }),
    revenueByMonth(6),
    db
      .select({ id: users.id, name: users.name, phone: users.phone, paidThrough: users.paidThrough })
      .from(users)
      .where(and(eq(users.role, "USER"), eq(users.membershipStatus, "ACTIVE"), between(users.paidThrough, now, weekAhead)))
      .orderBy(asc(users.paidThrough))
      .limit(8),
    db
      .select({ id: users.id, name: users.name, phone: users.phone, paidThrough: users.paidThrough })
      .from(users)
      .where(and(eq(users.role, "USER"), eq(users.membershipStatus, "OVERDUE")))
      .orderBy(desc(users.paidThrough))
      .limit(8),
  ]);

  const byStatus = Object.fromEntries(memberCounts.map((m) => [m.status, m.n]));
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(since.getTime() + i * 86_400_000);
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(d);
    return { key, label: d.toLocaleDateString("en-NG", { weekday: "narrow", timeZone: "Africa/Lagos" }), n: daily.find((x) => x.day === key)?.n ?? 0 };
  });
  const max = Math.max(1, ...days.map((d) => d.n));

  return (
    <AppShell user={user}>
      <PageTitle title="Overview" subtitle="How AreaCare is running today." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Link href="/ops" className="rounded-2xl bg-forest-900 p-5 text-white transition hover:bg-forest-800">
          <p className="text-sm text-white/70">Open requests</p>
          <p className="mt-1 font-display text-4xl font-extrabold">{open}</p>
          <p className="mt-2 text-sm text-white/70">
            {awaiting} awaiting member confirmation
            {reopened ? ` · ${reopened} sent back` : ""}
          </p>
          <p className="mt-1 text-sm font-semibold text-vest-400">Go to live board</p>
        </Link>
        <Link href="/ops/soakaway" className={soakToApprove ? "rounded-2xl bg-vest-500 p-5 text-forest-900 transition hover:bg-vest-400" : "rounded-2xl bg-white p-5 shadow-ring transition hover:shadow-lift"}>
          <p className="text-sm opacity-80">Soakaway to approve</p>
          <p className="mt-1 font-display text-4xl font-extrabold">{soakToApprove}</p>
          <p className="mt-2 text-sm font-semibold">{soakToApprove ? "Approve and schedule" : "See bookings"}</p>
        </Link>
        <Kpi label="Cleared & confirmed today" value={clearedToday} hint={`${byStatus.ACTIVE ?? 0} active members`} />
        <Kpi label="Dues overdue" value={byStatus.OVERDUE ?? 0} hint={`${byStatus.UNREGISTERED ?? 0} not yet registered`} />
        <Link href="/admin/payments" className="rounded-2xl bg-white p-5 shadow-ring transition hover:shadow-lift">
          <p className="text-sm text-moss">Received this month</p>
          <p className="mt-1 font-display text-4xl font-extrabold">{naira(Number(revenue ?? 0))}</p>
          <p className="mt-2 text-sm font-semibold text-forest-600">See all payments</p>
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel p-6">
          <h2 className="text-xl font-bold">Requests, last 14 days</h2>
          <div className="mt-6 flex h-48 items-end gap-2" role="img" aria-label="Daily pickup requests over the last 14 days">
            {days.map((d) => (
              <div key={d.key} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-semibold text-moss">{d.n || ""}</span>
                <div
                  className="w-full rounded-t-md bg-forest-600 transition-all"
                  style={{ height: `${(d.n / max) * 100}%`, minHeight: d.n ? 6 : 2, opacity: d.n ? 1 : 0.15 }}
                  title={`${d.key}: ${d.n}`}
                />
                <span className="text-xs text-moss">{d.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-6">
          <h2 className="text-xl font-bold">Latest payments</h2>
          {recentPayments.length === 0 ? (
            <p className="mt-4 text-moss">No payments yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-forest-900/5">
              {recentPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link href={`/admin/users/${p.user.id}`} className="font-semibold hover:underline">
                      {p.user.name}
                    </Link>
                    <p className="text-xs text-moss">
                      {p.type === "REGISTRATION" ? "Registration" : p.type === "SOAKAWAY" ? "Soakaway" : `Dues × ${p.months}`} · {dateTime(p.verifiedAt)}
                    </p>
                  </div>
                  <span className="font-display font-bold">{naira(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr_1fr]">
        <section className="panel p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-bold">Received per month</h2>
            <Link href="/admin/payments" className="text-sm font-semibold text-forest-600 hover:underline">
              Payments
            </Link>
          </div>
          <RevenueChart months={months} />
        </section>
        <MemberList
          title="Dues ending this week"
          empty="No one's dues run out in the next 7 days."
          rows={dueSoon}
          note={(d) => `Ends ${shortDate(d)}`}
        />
        <MemberList
          title="Dues overdue"
          empty="Everyone is paid up."
          rows={overdue}
          note={(d) => (d ? `Lapsed ${shortDate(d)}` : "Lapsed")}
          tone="ember"
          more={(byStatus.OVERDUE ?? 0) > overdue.length ? "/admin/users?status=OVERDUE" : undefined}
        />
      </div>
    </AppShell>
  );
}

function MemberList({
  title,
  rows,
  empty,
  note,
  tone,
  more,
}: {
  title: string;
  rows: { id: string; name: string; phone: string; paidThrough: Date | null }[];
  empty: string;
  note: (d: Date | null) => string;
  tone?: "ember";
  more?: string;
}) {
  return (
    <section className="panel p-6">
      <h2 className="text-xl font-bold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-moss">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-forest-900/5">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
              <Link href={`/admin/users/${r.id}`} className="min-w-0 hover:underline">
                <p className="truncate font-semibold">{r.name}</p>
                <p className="text-xs text-moss">{r.phone}</p>
              </Link>
              <span className={tone === "ember" ? "chip shrink-0 bg-ember-100 text-ember-600" : "chip shrink-0 bg-vest-100 text-forest-900"}>
                {note(r.paidThrough)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {more && (
        <Link href={more} className="mt-3 inline-block text-sm font-semibold text-forest-600 hover:underline">
          See all
        </Link>
      )}
    </section>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-ring">
      <p className="text-sm text-moss">{label}</p>
      <p className="mt-1 font-display text-4xl font-extrabold">{value}</p>
      {hint && <p className="mt-2 text-sm text-moss">{hint}</p>}
    </div>
  );
}
