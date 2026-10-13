import { eq } from "drizzle-orm";
import { db } from "@/db";
import { zones } from "@/db/schema";
import { apiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  await apiUser(["SUPER_ADMIN"]);
  const { id } = await params;
  await db.delete(zones).where(eq(zones.id, id));
  return ok();
});
