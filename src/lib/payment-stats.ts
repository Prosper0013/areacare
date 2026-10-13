import "server-only";
import { and, count, desc, eq, sum } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";

/** Totals for one member's payments. */
export async function memberPaymentSummary(userId: string) {
  const [[paid], [pending], last] = await Promise.all([
    db
      .select({ total: sum(payments.amount), n: count() })
      .from(payments)
      .where(and(eq(payments.userId, userId), eq(payments.status, "SUCCESSFUL"))),
    db
      .select({ n: count() })
      .from(payments)
      .where(and(eq(payments.userId, userId), eq(payments.status, "PENDING"))),
    db.query.payments.findFirst({
      where: and(eq(payments.userId, userId), eq(payments.status, "SUCCESSFUL")),
      orderBy: desc(payments.verifiedAt),
    }),
  ]);
  return {
    totalPaid: Number(paid?.total ?? 0),
    successfulCount: paid?.n ?? 0,
    pendingCount: pending?.n ?? 0,
    lastPayment: last ?? null,
  };
}
