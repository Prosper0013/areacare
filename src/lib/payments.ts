import "server-only";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { payments, soakawayBookings, type Payment } from "@/db/schema";
import { isGenuine, verifyByReference, verifyTransaction } from "./flutterwave";
import { applySuccessfulPayment } from "./membership";
import { naira } from "./format";
import { notifyUsers } from "./notify";
import { onBookingPaid } from "./soakaway";

/**
 * Confirms a payment with Flutterwave and applies it. Called from both the redirect
 * callback and the webhook, so it must be safe to run more than once.
 */
export async function confirmPayment(txRef: string, transactionId?: string | number | null) {
  const payment = await db.query.payments.findFirst({ where: eq(payments.txRef, txRef) });
  if (!payment) return { status: "unknown" as const };
  if (payment.status === "SUCCESSFUL") return { status: "successful" as const, payment };

  const tx = transactionId ? await verifyTransaction(transactionId) : await verifyByReference(txRef);

  if (!isGenuine(tx, { txRef: payment.txRef, amount: payment.amount })) {
    if (tx && ["failed", "cancelled"].includes(tx.status)) {
      await db.update(payments).set({ status: "FAILED" }).where(eq(payments.id, payment.id));
      return { status: "failed" as const, payment };
    }
    return { status: "pending" as const, payment };
  }

  const { payment: applied, alreadyApplied, balanceAfter } = await applySuccessfulPayment(payment.id, String(tx!.id));
  if (!alreadyApplied && applied.type === "SOAKAWAY") {
    if (applied.bookingId) await onBookingPaid(applied.bookingId);
  } else if (!alreadyApplied) {
    await notifyUsers([payment.userId], paymentMessage(applied, balanceAfter));
  }
  return { status: "successful" as const, payment: applied };
}

/** What the member is told once a registration or top-up is applied. */
export function paymentMessage(p: Pick<Payment, "type" | "amount" | "creditAmount">, balanceAfter: number | null) {
  const balance = balanceAfter != null ? ` Your credit is now ${naira(balanceAfter)}.` : "";
  return {
    kind: "payment" as const,
    title: p.type === "REGISTRATION" ? "Welcome to AreaCare" : "Credit added",
    body:
      p.type === "REGISTRATION"
        ? `${naira(p.amount)} received. Your home is registered and ${naira(p.creditAmount)} pickup credit has been added.${balance}`
        : `${naira(p.amount)} received and added to your credit.${balance}`,
    link: "/wallet",
    email: true,
  };
}

/** How long a checkout can stay "Pending" before it's cancelled. */
export const PENDING_PAYMENT_DAYS = Number(process.env.PENDING_PAYMENT_DAYS ?? 3);

/**
 * Cancels payments that are still unconfirmed after PENDING_PAYMENT_DAYS, and unpaid
 * soakaway bookings of the same age. Each payment gets one last check with Flutterwave
 * first, so a slow bank transfer that did go through is still credited.
 * Runs from the daily cron. If money arrives after cancellation, the webhook still credits it.
 */
export async function expireStalePayments(now = new Date()) {
  const cutoff = new Date(now.getTime() - PENDING_PAYMENT_DAYS * 86_400_000);

  const stale = await db
    .select({ id: payments.id, txRef: payments.txRef })
    .from(payments)
    .where(and(eq(payments.status, "PENDING"), lt(payments.createdAt, cutoff)))
    .limit(200);

  let cancelled = 0;
  let recovered = 0;
  for (const p of stale) {
    const result = await confirmPayment(p.txRef).catch(() => ({ status: "pending" as const }));
    if (result.status === "successful") {
      recovered++;
      continue;
    }
    if (result.status === "failed") continue; // already marked FAILED by confirmPayment
    const done = await db
      .update(payments)
      .set({ status: "CANCELLED" })
      .where(and(eq(payments.id, p.id), eq(payments.status, "PENDING")))
      .returning({ id: payments.id });
    cancelled += done.length;
  }

  const bookings = await db
    .update(soakawayBookings)
    .set({ status: "CANCELLED", cancelledAt: now })
    .where(and(eq(soakawayBookings.status, "AWAITING_PAYMENT"), lt(soakawayBookings.createdAt, cutoff)))
    .returning({ id: soakawayBookings.id, userId: soakawayBookings.userId });
  for (const b of bookings) {
    await notifyUsers([b.userId], {
      kind: "payment",
      title: "Unpaid booking cancelled",
      body: `Your soakaway evacuation booking wasn't paid within ${PENDING_PAYMENT_DAYS} days, so it has been cancelled. You can book again any time.`,
      link: "/soakaway",
    });
  }

  return { cancelledPayments: cancelled, recoveredPayments: recovered, cancelledBookings: bookings.length };
}
