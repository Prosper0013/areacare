import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import clsx from "clsx";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { daysLeft, hasHouseDetails } from "@/lib/membership";
import { getFees } from "@/lib/settings";
import { naira, shortDate } from "@/lib/format";
import { AppShell, PageTitle } from "@/components/shell/AppShell";
import { Stepper } from "@/components/Stepper";
import { PayButton } from "@/components/PayButton";
import { PaymentsTable } from "@/components/payments/PaymentsTable";
import { MonthlyPay } from "@/components/MonthlyPay";
import { coverageFor, monthName } from "@/lib/billing";
import { StatusBanner } from "@/components/StatusBanner";

export const metadata = { title: "Membership" };
export const dynamic = "force-dynamic";

const PAYMENT_MESSAGES: Record<string, { tone: "good" | "wait" | "bad"; text: string }> = {
  successful: { tone: "good", text: "Payment confirmed. Your membership is active." },
  pending: { tone: "wait", text: "We're waiting for Flutterwave to confirm your payment. This page updates once it does." },
  failed: { tone: "bad", text: "The payment didn't go through. No money was taken — try again." },
  cancelled: { tone: "bad", text: "You closed the checkout before paying. Try again when you're ready." },
  unknown: { tone: "bad", text: "We couldn't match that payment. If you were debited, contact support with your reference." },
};

export default async function MembershipPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const user = await requireUser(["USER"]);
  if (!hasHouseDetails(user)) redirect("/onboarding");
  const [{ payment: paymentFlag }, fees, history] = await Promise.all([
    searchParams,
    getFees(),
    db.query.payments.findMany({ where: eq(payments.userId, user.id), orderBy: desc(payments.createdAt), limit: 24 }),
  ]);
  const banner = paymentFlag ? PAYMENT_MESSAGES[paymentFlag] : null;
  const registered = Boolean(user.registeredAt);
  const left = daysLeft(user);
  const next = coverageFor(user.paidThrough, 1);

  return (
    <AppShell user={user}>
      {!registered && <Stepper current={3} />}
      <PageTitle
        title={registered ? "Membership" : "Register your home"}
        subtitle={
          registered
            ? "Keep your dues paid to request pickups any time."
            : `One payment activates your home and covers pickups for ${monthName(new Date())}.`
        }
      />

      {banner && <StatusBanner tone={banner.tone} text={banner.text} className="mb-6" />}

      {user.membershipStatus === "SUSPENDED" && (
        <StatusBanner tone="bad" text="Your account is suspended. Contact AreaCare support to restore it." className="mb-6" />
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {!registered ? (
          <section className="panel hazard-edge overflow-hidden p-6 pt-8 sm:p-8 sm:pt-10">
            <p className="text-moss">Registration fee</p>
            <p className="mt-1 font-display text-6xl font-extrabold">{naira(fees.registrationFee)}</p>
            <ul className="mt-6 space-y-3 text-[15px]">
              {[
                "Your home is added to your area crew's route",
                `Unlimited Trash filled requests for the rest of ${monthName(new Date())}`,
                `Then ${naira(fees.monthlyFee)} a month, paid before each new month starts`,
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <CheckCircle2 size={20} className="shrink-0 text-forest-600" />
                  {t}
                </li>
              ))}
            </ul>
            <PayButton type="REGISTRATION" label={`Pay ${naira(fees.registrationFee)} with Flutterwave`} className="mt-8 w-full py-4 text-base" />
            <p className="mt-3 text-center text-xs text-moss">Card, bank transfer or USSD. Secured by Flutterwave.</p>
          </section>
        ) : (
          <>
            <section
              className={clsx(
                "rounded-2xl p-6 sm:p-8",
                user.membershipStatus === "ACTIVE" ? "bg-forest-900 text-white" : "bg-ember-100 text-forest-900",
              )}
            >
              <p className={user.membershipStatus === "ACTIVE" ? "text-white/70" : "text-ember-600"}>
                {user.membershipStatus === "ACTIVE" ? "Active member" : "Dues overdue"}
              </p>
              <p className="mt-2 font-display text-5xl font-extrabold">
                {user.membershipStatus === "ACTIVE" && user.paidThrough ? `${monthName(user.paidThrough)} paid` : "Renew now"}
              </p>
              <p className={clsx("mt-2", user.membershipStatus === "ACTIVE" ? "text-white/80" : "text-forest-900")}>
                {user.membershipStatus === "ACTIVE"
                  ? `Pay for ${monthName(next.start)} by ${shortDate(user.paidThrough)} to keep your Trash filled button active.`
                  : `Your Trash filled button is off until you pay for ${monthName(next.start)}.`}
              </p>
              <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="opacity-70">Covered until</dt>
                  <dd className="mt-0.5 text-base font-semibold">
                    {shortDate(user.paidThrough)}
                    {user.membershipStatus === "ACTIVE" ? ` · ${left} day${left === 1 ? "" : "s"}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="opacity-70">Member since</dt>
                  <dd className="mt-0.5 text-base font-semibold">{shortDate(user.registeredAt)}</dd>
                </div>
              </dl>
            </section>
            <section className="panel p-6 sm:p-8">
              <h2 className="text-2xl font-bold">Pay monthly dues</h2>
              <p className="mb-6 mt-1 text-moss">
                {naira(fees.monthlyFee)} per calendar month. Paying ahead adds the following months.
              </p>
              <MonthlyPay monthlyFee={fees.monthlyFee} paidThrough={user.paidThrough?.toISOString() ?? null} />
            </section>
          </>
        )}

        <section className={clsx("panel overflow-hidden", registered && "lg:col-span-2")}>
          <div className="flex items-center justify-between border-b border-forest-900/5 px-5 py-4">
            <h2 className="text-xl font-bold">Recent payments</h2>
            <Link href="/payments" className="text-sm font-semibold text-forest-600 hover:underline">
              See all payments
            </Link>
          </div>
          <PaymentsTable rows={history.slice(0, 5)} view="member" empty="Your payments will be listed here." />
        </section>
      </div>
    </AppShell>
  );
}
