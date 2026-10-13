import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { isGenuine, verifyByReference, verifyTransaction } from "./flutterwave";
import { applySuccessfulPayment } from "./membership";
import { naira, shortDate } from "./format";
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

  const { payment: applied, alreadyApplied } = await applySuccessfulPayment(payment.id, String(tx!.id));
  if (!alreadyApplied && applied.type === "SOAKAWAY") {
    if (applied.bookingId) await onBookingPaid(applied.bookingId);
  } else if (!alreadyApplied) {
    await notifyUsers([payment.userId], {
      kind: "payment",
      title: payment.type === "REGISTRATION" ? "Welcome to AreaCare" : "Payment received",
      body: `${naira(payment.amount)} received. Your membership is active until ${shortDate(applied.periodEnd)}.`,
      link: "/membership",
      email: true,
    });
  }
  return { status: "successful" as const, payment: applied };
}
