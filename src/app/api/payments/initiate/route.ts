import { z } from "zod";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { HttpError, apiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";
import { createCheckout } from "@/lib/flutterwave";
import { hasHouseDetails } from "@/lib/membership";
import { MAX_TOPUP, getFees } from "@/lib/settings";
import { naira } from "@/lib/format";

const schema = z.object({
  type: z.enum(["REGISTRATION", "TOPUP"]),
  amount: z.number().int().optional(), // top-ups only
});

export const POST = handler(async (req: Request) => {
  const user = await apiUser(["USER"]);
  const input = schema.parse(await req.json());

  if (!hasHouseDetails(user)) throw new HttpError(409, "Add your house details before paying.");
  if (user.membershipStatus === "SUSPENDED") throw new HttpError(403, "Your account is suspended. Contact AreaCare support.");
  if (input.type === "REGISTRATION" && user.registeredAt) throw new HttpError(409, "You're already registered.");
  if (input.type === "TOPUP" && !user.registeredAt) throw new HttpError(409, "Pay the registration fee first.");

  const fees = await getFees();
  let amount: number;
  let creditAmount: number;
  if (input.type === "REGISTRATION") {
    amount = fees.registrationFee;
    creditAmount = fees.registrationCredit;
  } else {
    amount = Math.round(input.amount ?? 0);
    if (amount < fees.binPrice) throw new HttpError(400, `The smallest top-up is ${naira(fees.binPrice)} (one trash can).`);
    if (amount > MAX_TOPUP) throw new HttpError(400, `The largest single top-up is ${naira(MAX_TOPUP)}.`);
    creditAmount = amount;
  }

  const txRef = `AC-${input.type === "REGISTRATION" ? "REG" : "TOP"}-${Date.now().toString(36)}-${crypto
    .randomUUID()
    .slice(0, 8)}`.toUpperCase();

  await db.insert(payments).values({ userId: user.id, txRef, type: input.type, amount, creditAmount, months: 0 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const link = await createCheckout({
    txRef,
    amount,
    redirectUrl: `${appUrl}/api/payments/callback`,
    customer: { email: user.email, name: user.name, phone: user.phone },
    title: "AreaCare",
    description:
      input.type === "REGISTRATION"
        ? `Home registration (includes ${naira(creditAmount)} pickup credit)`
        : `Pickup credit top-up`,
    meta: { userId: user.id, type: input.type },
  });

  return ok({ link });
});
