import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { HttpError, apiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";
import { naira } from "@/lib/format";
import { notifyUsers } from "@/lib/notify";
import { InsufficientCredit, moveCredit } from "@/lib/wallet";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  amount: z
    .number()
    .int()
    .refine((n) => n !== 0, "Enter an amount to add or remove.")
    .refine((n) => Math.abs(n) <= 1_000_000, "That amount is too large."),
  reason: z.string().trim().min(3, "Give a short reason — the member sees it.").max(200),
});

/** Super admin adds or removes credit by hand (goodwill, a correction, extra cans found on site). */
export const POST = handler(async (req: Request, { params }: Ctx) => {
  const admin = await apiUser(["SUPER_ADMIN"]);
  const { id } = await params;
  const input = schema.parse(await req.json());

  const member = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!member || member.role !== "USER") throw new HttpError(404, "Member not found.");

  try {
    const { balanceAfter } = await db.transaction((tx) =>
      moveCredit(tx, { userId: id, amount: input.amount, type: "ADJUSTMENT", note: input.reason, createdById: admin.id }),
    );
    await notifyUsers([id], {
      kind: "payment",
      title: input.amount > 0 ? "Credit added" : "Credit adjusted",
      body: `${input.amount > 0 ? "+" : "−"}${naira(Math.abs(input.amount))} · ${input.reason}. Your credit is now ${naira(balanceAfter)}.`,
      link: "/wallet",
    });
    return ok({ balance: balanceAfter });
  } catch (err) {
    if (err instanceof InsufficientCredit) throw new HttpError(409, `They only have ${naira(err.balance)} — you can't remove more than that.`);
    throw err;
  }
});
