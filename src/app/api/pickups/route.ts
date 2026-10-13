import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pickups } from "@/db/schema";
import { HttpError, apiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";
import { canRequestPickup, hasHouseDetails } from "@/lib/membership";
import { createPickup, openPickupFor } from "@/lib/pickups";

const schema = z.object({
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  accuracy: z.number().min(0).nullable().optional(),
  note: z.string().max(280).nullable().optional(),
});

// "Trash filled" — raise a pickup request.
export const POST = handler(async (req: Request) => {
  const user = await apiUser(["USER"]);
  if (!hasHouseDetails(user)) throw new HttpError(409, "Add your house details first.");
  if (!canRequestPickup(user)) {
    throw new HttpError(
      402,
      user.registeredAt ? "Your monthly dues are due. Renew to request a pickup." : "Complete registration to request pickups.",
    );
  }

  const open = await openPickupFor(user.id);
  if (open) return ok({ pickup: open, existing: true });

  const input = schema.parse(await req.json().catch(() => ({})));
  const pickup = await createPickup(user, input);
  return ok({ pickup, existing: false }, { status: 201 });
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
