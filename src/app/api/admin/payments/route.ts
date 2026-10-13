import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { payments, users } from "@/db/schema";
import { HttpError, apiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";
import { applySuccessfulPayment } from "@/lib/membership";
import { paymentMessage } from "@/lib/payments";
import { MAX_TOPUP, getFees } from "@/lib/settings";
import { notifyUsers } from "@/lib/notify";

const schema = z.object({
  userId: z.string().min(1),
  type: z.enum(["REGISTRATION", "TOPUP"]),
  amount: z.number().int().min(1, "Enter the amount received.").max(MAX_TOPUP),
});

/**
 * Records money a member paid outside Flutterwave (cash or direct transfer) and applies
 * it exactly as an online payment would: registration activates the home and adds the
 * starting credit; a top-up adds the amount to their credit.
 */
export const POST = handler(async (req: Request) => {
  const admin = await apiUser(["SUPER_ADMIN"]);
  const input = schema.parse(await req.json());

  const member = await db.query.users.findFirst({ where: eq(users.id, input.userId) });
  if (!member || member.role !== "USER") throw new HttpError(404, "Member not found.");
  if (input.type === "REGISTRATION" && member.registeredAt) throw new HttpError(409, "This member is already registered.");
  if (input.type === "TOPUP" && !member.registeredAt) throw new HttpError(409, "Record the registration payment first.");

  const fees = await getFees();
  // Registration: the starting credit is fixed; anything paid above the fee is added as extra credit.
  const creditAmount =
    input.type === "REGISTRATION"
      ? Math.max(0, Math.min(fees.registrationCredit, input.amount)) + Math.max(0, input.amount - fees.registrationFee)
      : input.amount;

  const txRef = `AC-CASH-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 6)}`.toUpperCase();
  const [created] = await db
    .insert(payments)
    .values({ userId: member.id, txRef, type: input.type, months: 0, amount: input.amount, creditAmount })
    .returning();

  const { payment, balanceAfter } = await applySuccessfulPayment(created.id, `manual:${admin.email}`);
  await notifyUsers([member.id], { ...paymentMessage(payment, balanceAfter), title: "Payment recorded", email: false });
  return ok({ payment, balance: balanceAfter }, { status: 201 });
});
