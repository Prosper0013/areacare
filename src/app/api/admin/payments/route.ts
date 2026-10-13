import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { payments, users } from "@/db/schema";
import { HttpError, apiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";
import { applySuccessfulPayment } from "@/lib/membership";
import { naira, shortDate } from "@/lib/format";
import { notifyUsers } from "@/lib/notify";

const schema = z.object({
  userId: z.string().min(1),
  type: z.enum(["REGISTRATION", "MONTHLY"]),
  months: z.number().int().min(1).max(24).default(1),
  amount: z.number().int().min(0, "Amount can't be negative.").max(10_000_000),
});

/**
 * Records a payment the member made outside Flutterwave (cash or direct transfer)
 * and extends their membership exactly as an online payment would.
 */
export const POST = handler(async (req: Request) => {
  const admin = await apiUser(["SUPER_ADMIN"]);
  const input = schema.parse(await req.json());

  const member = await db.query.users.findFirst({ where: eq(users.id, input.userId) });
  if (!member || member.role !== "USER") throw new HttpError(404, "Member not found.");
  if (input.type === "REGISTRATION" && member.registeredAt) throw new HttpError(409, "This member is already registered.");
  if (input.type === "MONTHLY" && !member.registeredAt) throw new HttpError(409, "Record the registration payment first.");

  const txRef = `AC-CASH-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 6)}`.toUpperCase();
  const [created] = await db
    .insert(payments)
    .values({
      userId: member.id,
      txRef,
      type: input.type,
      months: input.type === "REGISTRATION" ? 1 : input.months,
      amount: input.amount,
    })
    .returning();

  const { payment } = await applySuccessfulPayment(created.id, `manual:${admin.email}`);
  await notifyUsers([member.id], {
    kind: "payment",
    title: "Payment recorded",
    body: `${naira(payment.amount)} was recorded on your account. Your membership is active until ${shortDate(payment.periodEnd)}.`,
    link: "/payments",
  });
  return ok({ payment }, { status: 201 });
});
