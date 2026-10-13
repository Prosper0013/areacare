import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { CalendarCheck, CheckCircle2, MapPin, Truck } from "lucide-react";
import { db } from "@/db";
import { soakawayBookings } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { hasHouseDetails } from "@/lib/membership";
import { getFees } from "@/lib/settings";
import { addressLine, appointment, dateTime, naira } from "@/lib/format";
import { AppShell, PageTitle } from "@/components/shell/AppShell";
import { StatusBanner } from "@/components/StatusBanner";
import { BookSoakaway } from "@/components/soakaway/BookSoakaway";
import { MemberBookingActions } from "@/components/soakaway/MemberBookingActions";
import { SoakawayChip, TIME_LABEL } from "@/components/soakaway/SoakawayStatus";

export const metadata = { title: "Soakaway evacuation" };
export const dynamic = "force-dynamic";

const PAYMENT_MESSAGES: Record<string, { tone: "good" | "wait" | "bad"; text: string }> = {
  successful: { tone: "good", text: "Payment received. AreaCare will approve your booking and send you the date and time." },
  pending: { tone: "wait", text: "We're waiting for Flutterwave to confirm your payment. This page updates once it does." },
  failed: { tone: "bad", text: "The payment didn't go through. No money was taken — use Pay on your booking to try again." },
  cancelled: { tone: "bad", text: "You closed the checkout before paying. Use Pay on your booking when you're ready." },
};

export default async function SoakawayPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const user = await requireUser(["USER"]);
  const [{ payment }, fees, bookings] = await Promise.all([
    searchParams,
    getFees(),
    db.query.soakawayBookings.findMany({
      where: eq(soakawayBookings.userId, user.id),
      orderBy: desc(soakawayBookings.createdAt),
      limit: 50,
    }),
  ]);
  const banner = payment ? PAYMENT_MESSAGES[payment] : null;
  const ready = hasHouseDetails(user);

  return (
    <AppShell user={user}>
      <PageTitle
        title="Soakaway evacuation"
        subtitle="Book a truck to empty your soakaway or septic pit. Pay online, and we'll confirm the date and time."
      />
      {banner && <StatusBanner tone={banner.tone} text={banner.text} className="mb-6" />}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="rounded-[28px] bg-forest-900 p-6 text-white sm:p-8">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-vest-500 text-forest-900">
            <Truck size={24} />
          </span>
          <p className="mt-5 text-white/70">Price per evacuation</p>
          <p className="font-display text-6xl font-extrabold">{naira(fees.soakawayFee)}</p>
          <ol className="mt-8 space-y-4">
            {[
              ["Book and pay", "Choose a preferred day and pay securely with Flutterwave."],
              ["We approve and schedule", "AreaCare confirms the exact date and time and notifies you."],
              ["We evacuate", "Our truck empties your soakaway. You're notified when it's done."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 font-display font-bold text-vest-400">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold">{t}</p>
                  <p className="text-sm text-white/70">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel p-6 sm:p-8">
          <h2 className="text-2xl font-bold">Book an evacuation</h2>
          {ready ? (
            <>
              <div className="mb-6 mt-3 rounded-xl bg-canvas p-4">
                <p className="flex items-start gap-2 font-semibold">
                  <MapPin size={18} className="mt-0.5 shrink-0 text-forest-600" />
                  {addressLine(user)}
                </p>
                <Link href="/onboarding" className="ml-6 mt-1 inline-block text-sm font-semibold text-forest-600 hover:underline">
                  Wrong address? Edit house details
                </Link>
              </div>
              <BookSoakaway fee={fees.soakawayFee} />
            </>
          ) : (
            <div className="mt-4 rounded-xl bg-vest-100 p-5">
              <p className="font-semibold">Add your house details first</p>
              <p className="mt-1 text-sm">The team needs your address to come to you.</p>
              <Link href="/onboarding" className="btn-dark btn-sm mt-4">
                Add house details
              </Link>
            </div>
          )}
        </section>
      </div>

      <section className="panel mt-6 overflow-hidden">
        <h2 className="border-b border-forest-900/5 px-5 py-4 text-xl font-bold">Your bookings</h2>
        {bookings.length === 0 ? (
          <p className="px-5 py-10 text-center text-moss">No bookings yet.</p>
        ) : (
          <ul className="divide-y divide-forest-900/5">
            {bookings.map((b) => (
              <li key={b.id} className="px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    {b.status === "SCHEDULED" || b.status === "COMPLETED" ? (
                      <p className="flex items-center gap-2 font-display text-xl font-bold">
                        {b.status === "COMPLETED" ? <CheckCircle2 size={20} className="text-forest-600" /> : <CalendarCheck size={20} className="text-forest-600" />}
                        {appointment(b.scheduledFor)}
                      </p>
                    ) : (
                      <p className="font-display text-xl font-bold">
                        {b.preferredDate ? `Preferred ${b.preferredDate}` : "Any day"} · {TIME_LABEL[b.preferredTime ?? "any"]}
                      </p>
                    )}
                    <p className="text-sm text-moss">
                      Booked {dateTime(b.createdAt)} · {naira(b.amount)}
                      {b.paidAt ? " · paid" : ""}
                    </p>
                  </div>
                  <SoakawayChip status={b.status} />
                </div>
                {b.status === "PENDING_APPROVAL" && (
                  <p className="mt-3 text-sm">Paid. AreaCare will approve it and send you the date and time.</p>
                )}
                {b.adminNote && (b.status === "SCHEDULED" || b.status === "COMPLETED") && (
                  <p className="mt-3 rounded-lg bg-forest-50 px-3 py-2 text-sm">
                    <span className="font-semibold">From AreaCare:</span> “{b.adminNote}”
                  </p>
                )}
                {b.status === "REJECTED" && (
                  <p className="mt-3 rounded-lg bg-ember-100 px-3 py-2 text-sm text-ember-600">
                    {b.rejectReason} AreaCare will contact you about your refund.
                  </p>
                )}
                {b.status === "AWAITING_PAYMENT" && (
                  <div className="mt-3">
                    <MemberBookingActions id={b.id} amount={b.amount} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
