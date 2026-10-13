import { z } from "zod";
import { db } from "@/db";
import { zones } from "@/db/schema";
import { HttpError, apiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";

export const POST = handler(async (req: Request) => {
  await apiUser(["SUPER_ADMIN"]);
  const input = z
    .object({
      name: z.string().trim().min(2, "Give the zone a name."),
      description: z.string().trim().max(200).optional().default(""),
    })
    .parse(await req.json());
  const [zone] = await db
    .insert(zones)
    .values({ name: input.name, description: input.description || null })
    .onConflictDoNothing()
    .returning();
  if (!zone) throw new HttpError(409, "A zone with that name already exists.");
  return ok({ zone }, { status: 201 });
});
