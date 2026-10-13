import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pickups } from "@/db/schema";
import { HttpError, apiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";
import { confirmPickup } from "@/lib/pickups";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  cleared: z.boolean(),
  note: z.string().max(280).nullable().optional(),
});

// The member answers "Has your bin been cleared?" — yes closes it, no sends the crew back.
export const POST = handler(async (req: Request, { params }: Ctx) => {
  const user = await apiUser(["USER"]);
  const { id } = await params;
  const input = schema.parse(await req.json());
  const pickup = await db.query.pickups.findFirst({ where: eq(pickups.id, id) });
  if (!pickup || pickup.userId !== user.id) throw new HttpError(404, "Request not found.");

  const result = await confirmPickup(pickup, user, input.cleared, input.note);
  if ("error" in result) throw new HttpError(409, result.error!);
  return ok({ pickup: result.pickup });
});
