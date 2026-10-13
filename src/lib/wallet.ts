import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { pickups, users, walletEntries, type WalletEntryType } from "@/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class InsufficientCredit extends Error {
  constructor(
    public balance: number,
    public needed: number,
  ) {
    super("Not enough credit.");
  }
}

/**
 * Moves a member's credit up or down and writes the ledger line, inside the caller's
 * transaction. The user row is locked so two requests can never spend the same naira.
 * Throws InsufficientCredit instead of letting the balance go below zero.
 */
export async function moveCredit(
  tx: Tx,
  entry: {
    userId: string;
    amount: number; // signed naira
    type: WalletEntryType;
    pickupId?: string | null;
    paymentId?: string | null;
    note?: string | null;
    createdById?: string | null;
  },
) {
  const [user] = await tx
    .select({ id: users.id, balance: users.creditBalance })
    .from(users)
    .where(eq(users.id, entry.userId))
    .for("update");
  if (!user) throw new Error("User not found");
  const balanceAfter = user.balance + entry.amount;
  if (balanceAfter < 0) throw new InsufficientCredit(user.balance, -entry.amount);

  await tx.update(users).set({ creditBalance: balanceAfter }).where(eq(users.id, user.id));
  const [row] = await tx
    .insert(walletEntries)
    .values({
      userId: entry.userId,
      type: entry.type,
      amount: entry.amount,
      balanceAfter,
      pickupId: entry.pickupId ?? null,
      paymentId: entry.paymentId ?? null,
      note: entry.note ?? null,
      createdById: entry.createdById ?? null,
    })
    .returning();
  return { balanceBefore: user.balance, balanceAfter, entry: row };
}

/** Gives back what a cancelled pickup cost. Safe to call twice: only the first call refunds. */
export async function refundPickup(pickupId: string, note = "Pickup cancelled") {
  return db.transaction(async (tx) => {
    const [p] = await tx
      .update(pickups)
      .set({ refundedAt: new Date() })
      .where(and(eq(pickups.id, pickupId), isNull(pickups.refundedAt)))
      .returning();
    if (!p || p.charge <= 0) return null;
    const { balanceAfter } = await moveCredit(tx, {
      userId: p.userId,
      amount: p.charge,
      type: "PICKUP_REFUND",
      pickupId: p.id,
      note,
    });
    return { amount: p.charge, balanceAfter };
  });
}

export async function walletHistory(userId: string, limit = 100) {
  return db.query.walletEntries.findMany({
    where: eq(walletEntries.userId, userId),
    orderBy: desc(walletEntries.createdAt),
    limit,
    with: { pickup: { columns: { id: true, binCount: true, status: true } }, createdBy: { columns: { name: true } } },
  });
}
