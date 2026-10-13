import Link from "next/link";
import { coverageFor, monthName } from "@/lib/billing";
import { desc, eq } from "drizzle-orm";
import clsx from "clsx";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { canRequestPickup, daysLeft } from "@/lib/membership";
import { memberPaymentSummary } from "@/lib/payment-stats";
import { getFees } from "@/lib/settings";
import { naira, shortDate } from "@/lib/format";
import { AppShell, PageTitle } from "@/components/shell/AppShell";
import { PaymentsTable } from "@/components/payments/PaymentsTable";

export const metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

export default async function MemberPaymentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser(["USER"]);
  const { status } = await searchParams;
  const filter = status === "paid" ? "SUCCESSFUL" : status === "pending" ? "PENDING" : status === "failed" ? "FAILED" : null;

  const [summary, fees, all] = await Promise.all([
    memberPaymentSummary(user.id),
    getFees(),
    db.query.payments.findMany({ where: eq(payments.userId, user.id), orderBy: desc(payments.createdAt), limit: 500 }),
  ]);
  const rows = filter ? all.filter((p) => p.status === filter) : all;
  const active = canRequestPickup(user);
  const left = daysLeft(user);

  return (
    <AppShell user={user}>
      <PageTitle
        title="Payments"
        subtitle="Every payment you've made to AreaCare, what it covered, and a receipt for each."
        action={
          <Link href="/membership" className="btn-vest">
            {user.registeredAt ? "Pay monthly dues" : "Pay registration"}
          </Link>
        }
      />

      <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-2xl bg-forest-900 p-5 text-white">
          <dt className="text-sm text-white/70">Total paid</dt>
          <dd className="mt-1 font-display text-xl font-extrabold sm:text-3xl">{naira(summary.totalPaid)}</dd>
          <p className="mt-1 text-sm text-white/70">
            {summary.successfulCount} payment{summary.successfulCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-ring">
          <dt className="text-sm text-moss">Paid through</dt>
          <dd className="mt-1 font-display text-xl font-extrabold sm:text-3xl">{user.paidThrough ? shortDate(user.paidThrough) : "—"}</dd>
          <p className={clsx("mt-1 text-sm", active ? "text-moss" : "font-semibold text-ember-600")}>
            {!user.registeredAt ? "Not registered yet" : active ? `${left} day${left === 1 ? "" : "s"} left` : "Dues overdue"}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-ring">
          <dt className="text-sm text-moss">Next payment</dt>
          <dd className="mt-1 font-display text-xl font-extrabold sm:text-3xl">
            {naira(user.registeredAt ? fees.monthlyFee : fees.registrationFee)}
          </dd>
          <p className="mt-1 text-sm text-moss">
            {user.registeredAt
              ? `For ${monthName(coverageFor(user.paidThrough, 1).start)} · pay by ${shortDate(active ? user.paidThrough : new Date())}`
              : "Registration fee"}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-ring">
          <dt className="text-sm text-moss">Last payment</dt>
          <dd className="mt-1 font-display text-xl font-extrabold sm:text-3xl">
            {summary.lastPayment ? naira(summary.lastPayment.amount) : "—"}
          </dd>
          <p className="mt-1 text-sm text-moss">
            {summary.lastPayment ? shortDate(summary.lastPayment.verifiedAt) : "No payments yet"}
          </p>
        </div>
      </dl>

      <section className="panel mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-forest-900/5 px-5 py-4">
          <h2 className="text-xl font-bold">History</h2>
          <nav className="flex flex-wrap gap-1.5" aria-label="Filter payments">
            {[
              ["", "All", all.length],
              ["paid", "Paid", all.filter((p) => p.status === "SUCCESSFUL").length],
              ["pending", "Pending", summary.pendingCount],
              ["failed", "Failed", all.filter((p) => p.status === "FAILED").length],
            ].map(([key, label, n]) => (
              <Link
                key={label as string}
                href={key ? `/payments?status=${key}` : "/payments"}
                className={clsx(
                  "rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
                  (status ?? "") === key ? "bg-forest-900 text-white" : "bg-forest-900/5 text-forest-900 hover:bg-forest-900/10",
                )}
              >
                {label} <span className="opacity-60">{n}</span>
              </Link>
            ))}
          </nav>
        </div>
        {summary.pendingCount > 0 && !filter && (
          <p className="border-b border-forest-900/5 bg-vest-100/50 px-5 py-3 text-sm">
            A pending payment is waiting for Flutterwave to confirm it. Bank transfers can take a few minutes — use{" "}
            <span className="font-semibold">Check again</span> to refresh it.
          </p>
        )}
        <PaymentsTable
          rows={rows}
          view="member"
          empty={filter ? "No payments match this filter." : "You haven't made any payments yet."}
        />
      </section>
    </AppShell>
  );
}
