import { z } from "zod";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { HttpError, apiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";
import { createCheckout } from "@/lib/flutterwave";
import { hasHouseDetails } from "@/lib/membership";
import { getFees } from "@/lib/settings";
import { coverageFor, periodLabel } from "@/lib/billing";

const schema = z.object({
  type: z.enum(["REGISTRATION", "MONTHLY"]),
  months: z.number().int().min(1).max(12).default(1),
});

export const POST = handler(async (req: Request) => {
  const user = await apiUser(["USER"]);
  const input = schema.parse(await req.json());

  if (!hasHouseDetails(user)) throw new HttpError(409, "Add your house details before paying.");
  if (user.membershipStatus === "SUSPENDED") throw new HttpError(403, "Your account is suspended. Contact AreaCare support.");
  if (input.type === "REGISTRATION" && user.registeredAt) throw new HttpError(409, "You're already registered.");
  if (input.type === "MONTHLY" && !user.registeredAt) throw new HttpError(409, "Pay the registration fee first.");

  const fees = await getFees();
  const months = input.type === "REGISTRATION" ? 1 : input.months;
  const amount = input.type === "REGISTRATION" ? fees.registrationFee : fees.monthlyFee * months;
  const txRef = `AC-${input.type === "REGISTRATION" ? "REG" : "MTH"}-${Date.now().toString(36)}-${crypto
    .randomUUID()
    .slice(0, 8)}`.toUpperCase();

  await db.insert(payments).values({ userId: user.id, txRef, type: input.type, amount, months });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const link = await createCheckout({
    txRef,
    amount,
    redirectUrl: `${appUrl}/api/payments/callback`,
    customer: { email: user.email, name: user.name, phone: user.phone },
    title: "AreaCare",
    description:
      input.type === "REGISTRATION"
        ? `Membership registration (covers ${periodLabel(coverageFor(null, 1).start, coverageFor(null, 1).end)})`
        : `Monthly dues for ${(() => {
            const c = coverageFor(user.paidThrough, months);
            return periodLabel(c.start, c.end);
          })()}`,
    meta: { userId: user.id, type: input.type },
  });

  return ok({ link });
});
