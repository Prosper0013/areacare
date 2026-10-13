import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, users, type Payment, type User } from "@/db/schema";

export function addMonths(date: Date, months: number) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0); // clamp e.g. Jan 31 + 1 month → Feb 28
  return d;
}

/** Keeps ACTIVE/OVERDUE in sync with the paid-through date. */
export async function refreshMembership(user: User): Promise<User> {
  const now = new Date();
  let next = user.membershipStatus;
  if (user.membershipStatus === "ACTIVE" && user.paidThrough && user.paidThrough < now) next = "OVERDUE";
  if (user.membershipStatus === "OVERDUE" && user.paidThrough && user.paidThrough >= now) next = "ACTIVE";
  if (next === user.membershipStatus) return user;
  const [updated] = await db.update(users).set({ membershipStatus: next }).where(eq(users.id, user.id)).returning();
  return updated ?? user;
}

export function canRequestPickup(user: User) {
  return user.membershipStatus === "ACTIVE" && !!user.paidThrough && user.paidThrough >= new Date();
}

export function hasHouseDetails(user: User) {
  return Boolean(user.street && user.city && user.zoneId);
}

export function daysLeft(user: User) {
  if (!user.paidThrough) return 0;
  return Math.max(0, Math.ceil((user.paidThrough.getTime() - Date.now()) / 86_400_000));
}

/**
 * Marks a verified payment as successful and extends the member's paid-through date.
 * Idempotent: calling it twice for the same payment has no extra effect.
 * The registration fee activates membership and covers the first month.
 */
export async function applySuccessfulPayment(paymentId: string, flwTransactionId: string) {
  return db.transaction(async (tx) => {
    const [payment] = await tx.select().from(payments).where(eq(payments.id, paymentId)).for("update");
    if (!payment) throw new Error("Payment not found");
    if (payment.status === "SUCCESSFUL") return { payment, alreadyApplied: true };

    const [user] = await tx.select().from(users).where(eq(users.id, payment.userId)).for("update");
    if (!user) throw new Error("User not found");

    const now = new Date();
    const start = user.paidThrough && user.paidThrough > now ? user.paidThrough : now;
    const end = addMonths(start, payment.months);

    await tx
      .update(users)
      .set({
        paidThrough: end,
        membershipStatus: user.membershipStatus === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
        registeredAt: payment.type === "REGISTRATION" ? (user.registeredAt ?? now) : user.registeredAt,
      })
      .where(eq(users.id, user.id));

    const [updated] = await tx
      .update(payments)
      .set({
        status: "SUCCESSFUL",
        flwTransactionId,
        verifiedAt: now,
        periodStart: start,
        periodEnd: end,
      })
      .where(eq(payments.id, payment.id))
      .returning();

    return { payment: updated as Payment, alreadyApplied: false };
  });
}
