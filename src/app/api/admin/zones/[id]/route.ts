import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { zones } from "@/db/schema";
import { HttpError, apiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

// Rename an area or change its description.
export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  await apiUser(["SUPER_ADMIN"]);
  const { id } = await params;
  const input = z
    .object({
      name: z.string().trim().min(2, "Give the area a name.").max(80),
      description: z.string().trim().max(200).optional().default(""),
    })
    .parse(await req.json());

  const clash = await db.query.zones.findFirst({ where: and(eq(zones.name, input.name), ne(zones.id, id)) });
  if (clash) throw new HttpError(409, "Another area already has that name.");

  const [zone] = await db
    .update(zones)
    .set({ name: input.name, description: input.description || null })
    .where(eq(zones.id, id))
    .returning();
  if (!zone) throw new HttpError(404, "Area not found.");
  revalidatePath("/");
  return ok({ zone });
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  await apiUser(["SUPER_ADMIN"]);
  const { id } = await params;
  await db.delete(zones).where(eq(zones.id, id));
  revalidatePath("/");
  return ok();
});
