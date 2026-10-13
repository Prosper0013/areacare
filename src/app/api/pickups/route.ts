import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pickups } from "@/db/schema";
import { HttpError, apiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";
import { naira } from "@/lib/format";
import { binsAffordable, hasHouseDetails, pickupBlock } from "@/lib/membership";
import { createPickup, openPickupFor } from "@/lib/pickups";
import { MAX_BINS_PER_REQUEST, getFees } from "@/lib/settings";
import { InsufficientCredit } from "@/lib/wallet";

const schema = z.object({
  bins: z.number().int().min(1, "Choose at least one trash can.").max(MAX_BINS_PER_REQUEST, `At most ${MAX_BINS_PER_REQUEST} trash cans per request.`).default(1),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  accuracy: z.number().min(0).nullable().optional(),
  note: z.string().max(280).nullable().optional(),
});

// "Trash filled" — raise a pickup request, paid from the member's credit.
export const POST = handler(async (req: Request) => {
  const user = await apiUser(["USER"]);
  if (!hasHouseDetails(user)) throw new HttpError(409, "Add your house details first.");

  const fees = await getFees();
  const block = pickupBlock(user, fees.binPrice);
  if (block === "suspended") throw new HttpError(403, "Your account is suspended. Contact AreaCare support.");
  if (block === "register") throw new HttpError(402, "Register your home to request pickups.");

  const open = await openPickupFor(user.id);
  if (open) return ok({ pickup: open, existing: true, balance: user.creditBalance });

  const input = schema.parse(await req.json().catch(() => ({})));
  const cost = input.bins * fees.binPrice;
  if (user.creditBalance < cost) {
    const can = binsAffordable(user.creditBalance, fees.binPrice);
    throw new HttpError(
      402,
      `${input.bins} trash can${input.bins === 1 ? "" : "s"} cost${input.bins === 1 ? "s" : ""} ${naira(cost)} but you have ${naira(user.creditBalance)}. ${
        can ? `Choose ${can} or fewer, or top up.` : "Top up your credit first."
      }`,
    );
  }

  try {
    const result = await createPickup(user, input);
    return ok({ pickup: result.pickup, existing: result.existing, balance: result.balanceAfter }, { status: result.existing ? 200 : 201 });
  } catch (err) {
    if (err instanceof InsufficientCredit) throw new HttpError(402, "Not enough credit for that many trash cans. Top up and try again.");
    throw err;
  }
});

// The member's own request history.
export const GET = handler(async () => {
  const user = await apiUser();
  const rows = await db.query.pickups.findMany({
    where: eq(pickups.userId, user.id),
    orderBy: desc(pickups.createdAt),
    limit: 50,
  });
  return ok({ pickups: rows });
});
