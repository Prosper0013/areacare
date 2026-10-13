import { redirect } from "next/navigation";
import { coverageFor, monthName, periodLabel } from "@/lib/billing";
import Link from "next/link";
import { and, count, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { payments, pickups, soakawayBookings } from "@/db/schema";
import { getFees } from "@/lib/settings";
import { Truck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { canRequestPickup, daysLeft, hasHouseDetails } from "@/lib/membership";
import { addressLine, appointment, naira, shortDate } from "@/lib/format";
import { memberPaymentSummary } from "@/lib/payment-stats";
import { PaymentChip } from "@/components/payments/PaymentChip";
import { paymentLabel } from "@/components/payments/PaymentsTable";
import { openPickupFor } from "@/lib/pickups";
import { AppShell } from "@/components/shell/AppShell";
import { TrashFilledPanel } from "@/components/TrashFilledPanel";
import { PushToggle } from "@/components/shell/PushToggle";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ confirm?: string }> }) {
  const user = await requireUser(["USER"]);
  if (!hasHouseDetails(user)) redirect("/onboarding");
  const { confirm } = await searchParams;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [open, last, [{ thisMonth }], recentPayments, paySummary, nextEvacuation, fees] = await Promise.all([
    openPickupFor(user.id),
    db.query.pickups.findFirst({
      where: and(eq(pickups.userId, user.id), eq(pickups.status, "COMPLETED")),
      orderBy: desc(pickups.completedAt),
    }),
    db
      .select({ thisMonth: count() })
      .from(pickups)
      .where(and(eq(pickups.userId, user.id), gte(pickups.createdAt, monthStart))),
    db.query.payments.findMany({ where: eq(payments.userId, user.id), orderBy: desc(payments.createdAt), limit: 4 }),
    memberPaymentSummary(user.id),
    db.query.soakawayBookings.findFirst({
      where: and(
        eq(soakawayBookings.userId, user.id),
        inArray(soakawayBookings.status, ["AWAITING_PAYMENT", "PENDING_APPROVAL", "SCHEDULED"]),
      ),
      orderBy: desc(soakawayBookings.createdAt),
    }),
    getFees(),
  ]);

  // Keep showing a just-finished pickup as "cleared · confirmed" for a day.
  const recentlyCleared =
    !open && last?.completedAt && Date.now() - last.completedAt.getTime() < 86_400_000 ? last : null;

  const allowed = canRequestPickup(user);
  const lockedReason = allowed
    ? null
    : user.membershipStatus === "SUSPENDED"
      ? "suspended"
      : user.registeredAt
        ? "renew"
        : "register";
  const left = daysLeft(user);
  const firstName = user.name.split(" ")[0];

  return (
    <AppShell user={user}>
      <div className="mb-6">
        <h1 className="text-[34px] font-bold leading-tight sm:text-[40px]">Hello, {firstName}</h1>
        <p className="mt-1 text-moss">
          {open?.status === "AWAITING_CONFIRMATION"
            ? "Your crew says the bin is cleared. Please confirm below."
            : open ? "Your pickup is in progress."
            : recentlyCleared ? "Your last pickup was cleared and confirmed." : allowed ? "Your bin is covered. Tap when it's full." : "Finish setting up to start requesting pickups."}
        </p>
      </div>

      <TrashFilledPanel
        canRequest={allowed}
        lockedReason={lockedReason}
        payMonth={monthName(coverageFor(user.paidThrough, 1).start)}
        address={addressLine(user)}
        landmark={user.landmark}
        hasHomePin={user.homeLat != null}
        initialPickup={open ?? recentlyCleared ?? null}
        startWithNo={confirm === "no"}
      />

      <PushToggle className="mt-6" />

      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-ring">
          <dt className="text-sm text-moss">Membership</dt>
          <dd className="mt-1 font-display text-2xl font-bold">
            {user.registeredAt ? (allowed ? `Paid for ${monthName(user.paidThrough!)}` : "Dues overdue") : "Not registered"}
          </dd>
          <Link href="/membership" className="mt-2 inline-block text-sm font-semibold text-forest-600 hover:underline">
            {user.registeredAt ? "Pay dues" : "Register"}
          </Link>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-ring">
          <dt className="text-sm text-moss">Requests this month</dt>
          <dd className="mt-1 font-display text-2xl font-bold">{thisMonth}</dd>
          <Link href="/dashboard/history" className="mt-2 inline-block text-sm font-semibold text-forest-600 hover:underline">
            See history
          </Link>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-ring">
          <dt className="text-sm text-moss">Last collection</dt>
          <dd className="mt-1 font-display text-2xl font-bold">{last ? shortDate(last.completedAt) : "None yet"}</dd>
        </div>
      </dl>

      <section className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-forest-900 p-5 text-white">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-vest-500 text-forest-900">
          <Truck size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold">Soakaway evacuation</p>
          <p className="text-sm text-white/70">
            {nextEvacuation
              ? nextEvacuation.status === "SCHEDULED"
                ? `Booked for ${appointment(nextEvacuation.scheduledFor)}`
                : nextEvacuation.status === "PENDING_APPROVAL"
                  ? "Paid · waiting for AreaCare to confirm the date and time"
                  : "Booked · payment not completed"
              : `Book a truck to empty your soakaway · ${naira(fees.soakawayFee)}`}
          </p>
        </div>
        <Link href="/soakaway" className="btn-vest btn-sm">
          {nextEvacuation ? "View booking" : "Book now"}
        </Link>
      </section>

      <section className="panel mt-6 overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-forest-900/5 px-5 py-4">
          <div>
            <h2 className="text-xl font-bold">Recent payments</h2>
            <p className="text-sm text-moss">
              {naira(paySummary.totalPaid)} paid in total
              {paySummary.pendingCount ? ` · ${paySummary.pendingCount} waiting for confirmation` : ""}
            </p>
          </div>
          <Link href="/payments" className="text-sm font-semibold text-forest-600 hover:underline">
            See all payments
          </Link>
        </div>
        {recentPayments.length === 0 ? (
          <p className="px-5 py-8 text-center text-moss">
            No payments yet.{" "}
            <Link href="/membership" className="font-semibold text-forest-600 hover:underline">
              Register your home
            </Link>{" "}
            to get started.
          </p>
        ) : (
          <ul className="divide-y divide-forest-900/5">
            {recentPayments.map((p) => (
              <li key={p.id}>
                <Link
                  href={p.status === "SUCCESSFUL" ? `/payments/${p.id}` : "/payments"}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-forest-50"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{paymentLabel(p)}</p>
                    <p className="text-sm text-moss">
                      {shortDate(p.verifiedAt ?? p.createdAt)}
                      {p.periodEnd ? ` · ${periodLabel(p.periodStart, p.periodEnd)}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <PaymentChip status={p.status} />
                    <span className="w-24 text-right font-display text-lg font-bold">{naira(p.amount)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
