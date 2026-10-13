import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pickups, pickupStatusEnum } from "@/db/schema";
import { HttpError, apiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";
import { updatePickupStatus } from "@/lib/pickups";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, { params }: Ctx) => {
  const user = await apiUser();
  const { id } = await params;
  const pickup = await db.query.pickups.findFirst({ where: eq(pickups.id, id) });
  if (!pickup || (user.role === "USER" && pickup.userId !== user.id)) throw new HttpError(404, "Request not found.");
  return ok({ pickup });
});

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const user = await apiUser();
  const { id } = await params;
  const { status, note } = z
    .object({ status: z.enum(pickupStatusEnum.enumValues), note: z.string().max(280).nullable().optional() })
    .parse(await req.json());

  const pickup = await db.query.pickups.findFirst({ where: eq(pickups.id, id) });
  if (!pickup || (user.role === "USER" && pickup.userId !== user.id)) throw new HttpError(404, "Request not found.");

  const result = await updatePickupStatus(pickup, status, user, note);
  if ("error" in result) throw new HttpError(409, result.error!);
  return ok({ pickup: result.pickup });
});
