import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { HttpError, apiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";
import { confirmPayment } from "@/lib/payments";

// Lets a member re-check a payment that is still pending (e.g. a slow bank transfer).
export const POST = handler(async (req: Request) => {
  const user = await apiUser();
  const { txRef } = z.object({ txRef: z.string().min(1) }).parse(await req.json());
  const payment = await db.query.payments.findFirst({
    where: and(eq(payments.txRef, txRef), eq(payments.userId, user.id)),
  });
  if (!payment) throw new HttpError(404, "Payment not found.");
  const result = await confirmPayment(txRef);
  return ok({ status: result.status });
});
