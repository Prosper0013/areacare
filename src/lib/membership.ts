import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, users, type Payment, type User } from "@/db/schema";
import { moveCredit } from "./wallet";

/**
 * Pay-as-you-go membership:
 *  - registering (one payment) activates the home and adds starting credit
 *  - each Trash filled request takes (number of cans × price per can) from credit
 *  - members top up credit whenever they like
 */

/** Kept for the session loader; memberships no longer expire, so there's nothing to sync. */
export async function refreshMembership(user: User): Promise<User> {
  if (user.membershipStatus === "OVERDUE") {
    const [updated] = await db.update(users).set({ membershipStatus: "ACTIVE" }).where(eq(users.id, user.id)).returning();
    return updated ?? user;
  }
  return user;
}

export function isRegistered(user: Pick<User, "registeredAt" | "membershipStatus">) {
  return Boolean(user.registeredAt) && user.membershipStatus !== "SUSPENDED";
}

/** Why the Trash filled button is off, or null when it's on. */
export function pickupBlock(
  user: Pick<User, "registeredAt" | "membershipStatus" | "creditBalance">,
  binPrice: number,
): "register" | "topup" | "suspended" | null {
  if (user.membershipStatus === "SUSPENDED") return "suspended";
  if (!user.registeredAt) return "register";
  if (user.creditBalance < binPrice) return "topup";
  return null;
}

export function canRequestPickup(user: Pick<User, "registeredAt" | "membershipStatus" | "creditBalance">, binPrice: number) {
  return pickupBlock(user, binPrice) === null;
}

/** How many cans the current balance pays for. */
export function binsAffordable(balance: number, binPrice: number) {
  return binPrice > 0 ? Math.floor(balance / binPrice) : 0;
}

export function hasHouseDetails(user: User) {
  return Boolean(user.street && user.city && user.zoneId);
}

/**
 * Marks a verified payment as successful and applies it:
 *  - REGISTRATION → member becomes ACTIVE and gets the starting credit
 *  - TOPUP        → credit added
 *  - SOAKAWAY     → just marked paid (the booking flow takes over)
 * Idempotent: calling it twice for the same payment has no extra effect.
 */
export async function applySuccessfulPayment(paymentId: string, flwTransactionId: string) {
  return db.transaction(async (tx) => {
    const [payment] = await tx.select().from(payments).where(eq(payments.id, paymentId)).for("update");
    if (!payment) throw new Error("Payment not found");
    if (payment.status === "SUCCESSFUL") return { payment, alreadyApplied: true, balanceAfter: null as number | null };

    const now = new Date();
    let balanceAfter: number | null = null;

    if (payment.type === "REGISTRATION" || payment.type === "TOPUP" || payment.type === "MONTHLY") {
      const [user] = await tx.select().from(users).where(eq(users.id, payment.userId)).for("update");
      if (!user) throw new Error("User not found");

      if (payment.type === "REGISTRATION") {
        await tx
          .update(users)
          .set({
            registeredAt: user.registeredAt ?? now,
            membershipStatus: user.membershipStatus === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
          })
          .where(eq(users.id, user.id));
      }

      if (payment.creditAmount > 0) {
        ({ balanceAfter } = await moveCredit(tx, {
          userId: user.id,
          amount: payment.creditAmount,
          type: payment.type === "REGISTRATION" ? "REGISTRATION_CREDIT" : "TOPUP",
          paymentId: payment.id,
          note: payment.txRef,
        }));
      }
    }

    const [updated] = await tx
      .update(payments)
      .set({ status: "SUCCESSFUL", flwTransactionId, verifiedAt: now })
      .where(eq(payments.id, payment.id))
      .returning();

    return { payment: updated as Payment, alreadyApplied: false, balanceAfter };
  });
}
