import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Trash2 } from "lucide-react";
import clsx from "clsx";
import { requireUser } from "@/lib/auth";
import { binsAffordable, hasHouseDetails } from "@/lib/membership";
import { MAX_TOPUP, getFees } from "@/lib/settings";
import { walletHistory } from "@/lib/wallet";
import { CreditHistory } from "@/components/wallet/CreditHistory";
import { binsLabel, naira, shortDate } from "@/lib/format";
import { AppShell, PageTitle } from "@/components/shell/AppShell";
import { Stepper } from "@/components/Stepper";
import { PayButton } from "@/components/PayButton";
import { TopUp } from "@/components/TopUp";
import { StatusBanner } from "@/components/StatusBanner";

export const metadata = { title: "Credit" };
export const dynamic = "force-dynamic";

const PAYMENT_MESSAGES: Record<string, { tone: "good" | "wait" | "bad"; text: string }> = {
  successful: { tone: "good", text: "Payment confirmed and your credit has been updated." },
  pending: { tone: "wait", text: "We're waiting for Flutterwave to confirm your payment. Your credit updates once it does." },
  failed: { tone: "bad", text: "The payment didn't go through. No money was taken — try again." },
  cancelled: { tone: "bad", text: "You closed the checkout before paying. Try again when you're ready." },
  unknown: { tone: "bad", text: "We couldn't match that payment. If you were debited, contact support with your reference." },
};

export default async function WalletPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const user = await requireUser(["USER"]);
  if (!hasHouseDetails(user)) redirect("/onboarding");
  const [{ payment: paymentFlag }, fees, history] = await Promise.all([searchParams, getFees(), walletHistory(user.id, 100)]);
  const banner = paymentFlag ? PAYMENT_MESSAGES[paymentFlag] : null;
  const registered = Boolean(user.registeredAt);
  const cans = binsAffordable(user.creditBalance, fees.binPrice);
  const startCans = binsAffordable(fees.registrationCredit, fees.binPrice);

  return (
    <AppShell user={user}>
      {!registered && <Stepper current={3} />}
      <PageTitle
        title={registered ? "Your credit" : "Register your home"}
        subtitle={
          registered
            ? `Pay as you go: each trash can we collect costs ${naira(fees.binPrice)}, taken from your credit.`
            : `One payment registers your home and gives you ${naira(fees.registrationCredit)} pickup credit to start.`
        }
      />

      {banner && <StatusBanner tone={banner.tone} text={banner.text} className="mb-6" />}
      {user.membershipStatus === "SUSPENDED" && (
        <StatusBanner tone="bad" text="Your account is suspended. Contact AreaCare support to restore it." className="mb-6" />
      )}

      {!registered ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="panel hazard-edge overflow-hidden p-6 pt-8 sm:p-8 sm:pt-10">
            <p className="text-moss">Registration</p>
            <p className="mt-1 font-display text-6xl font-extrabold">{naira(fees.registrationFee)}</p>
            <ul className="mt-6 space-y-3 text-[15px]">
              {[
                "Your home is added to your area crew's route",
                `${naira(fees.registrationCredit)} goes straight into your pickup credit — that's ${binsLabel(startCans)}`,
                `After that, ${naira(fees.binPrice)} per trash can. Top up any amount, any time`,
                "No monthly fees. Your credit never expires",
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
          <HowItWorks fees={fees} />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <section
            className={clsx(
              "relative overflow-hidden rounded-[28px] p-6 sm:p-8",
              cans > 0 ? "bg-forest-900 text-white" : "bg-ember-100 text-forest-900",
            )}
          >
            <p className={cans > 0 ? "text-white/70" : "font-semibold text-ember-600"}>{cans > 0 ? "Available credit" : "Out of credit"}</p>
            <p className="mt-2 font-display text-6xl font-extrabold tracking-tight">{naira(user.creditBalance)}</p>
            <p className={clsx("mt-2 text-lg", cans > 0 ? "text-white/85" : "")}>
              {cans > 0
                ? `Enough for ${binsLabel(cans)}.`
                : `Top up at least ${naira(fees.binPrice - user.creditBalance)} to switch your Trash filled button back on.`}
            </p>
            <div className="mt-8 flex flex-wrap gap-2" aria-hidden>
              {Array.from({ length: Math.min(cans, 20) }, (_, i) => (
                <span
                  key={i}
                  className={clsx(
                    "grid h-10 w-9 place-items-center rounded-lg animate-pop-in",
                    cans > 0 ? "bg-white/10 text-vest-400" : "",
                  )}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <Trash2 size={18} />
                </span>
              ))}
              {cans > 20 && <span className="grid h-10 place-items-center px-2 text-sm font-semibold text-white/70">+{cans - 20}</span>}
            </div>
            <dl className={clsx("mt-8 grid grid-cols-2 gap-4 border-t pt-5 text-sm", cans > 0 ? "border-white/10" : "border-forest-900/10")}>
              <div>
                <dt className="opacity-70">Price per trash can</dt>
                <dd className="mt-0.5 text-base font-semibold">{naira(fees.binPrice)}</dd>
              </div>
              <div>
                <dt className="opacity-70">Member since</dt>
                <dd className="mt-0.5 text-base font-semibold">{shortDate(user.registeredAt)}</dd>
              </div>
            </dl>
          </section>
          <section className="panel p-6 sm:p-8">
            <h2 className="text-2xl font-bold">Top up</h2>
            <p className="mb-6 mt-1 text-moss">Add credit now and use it whenever your bins fill up.</p>
            <TopUp binPrice={fees.binPrice} balance={user.creditBalance} max={MAX_TOPUP} />
          </section>
        </div>
      )}

      {registered && (
        <section className="panel mt-6 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-forest-900/5 px-5 py-4">
            <h2 className="text-xl font-bold">Credit history</h2>
            <Link href="/payments" className="text-sm font-semibold text-forest-600 hover:underline">
              Payments & receipts
            </Link>
          </div>
          <CreditHistory rows={history} />
        </section>
      )}
    </AppShell>
  );
}

function HowItWorks({ fees }: { fees: { registrationFee: number; registrationCredit: number; binPrice: number } }) {
  return (
    <section className="rounded-[28px] bg-forest-900 p-6 text-white sm:p-8">
      <h2 className="text-2xl font-bold">How pay-as-you-go works</h2>
      <ol className="mt-6 space-y-5">
        {[
          ["Register once", `Pay ${naira(fees.registrationFee)}. ${naira(fees.registrationCredit)} of it becomes your pickup credit.`],
          ["Tap Trash filled", "Say how many trash cans are full. Your crew gets your address and live location."],
          ["Pay per can", `${naira(fees.binPrice)} per can comes off your credit. Cancel before the crew sets off and it's refunded.`],
          ["Top up any time", "Add credit whenever it runs low. It never expires."],
        ].map(([t, d], i) => (
          <li key={t} className="flex gap-4">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 font-display font-bold text-vest-400">{i + 1}</span>
            <div>
              <p className="font-semibold">{t}</p>
              <p className="text-sm text-white/70">{d}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
