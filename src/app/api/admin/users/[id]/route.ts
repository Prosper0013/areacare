import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { roleEnum, teamMembers, users } from "@/db/schema";
import { HttpError, apiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  role: z.enum(roleEnum.enumValues).optional(),
  suspended: z.boolean().optional(),
  teamIds: z.array(z.string()).optional(),
});

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const admin = await apiUser(["SUPER_ADMIN"]);
  const { id } = await params;
  const input = schema.parse(await req.json());

  const target = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!target) throw new HttpError(404, "User not found.");
  if (target.id === admin.id && input.role && input.role !== "SUPER_ADMIN") {
    throw new HttpError(409, "You can't remove your own super admin access.");
  }

  const patch: Partial<typeof users.$inferInsert> = {};
  if (input.role) patch.role = input.role;
  if (input.suspended === true) patch.membershipStatus = "SUSPENDED";
  if (input.suspended === false && target.membershipStatus === "SUSPENDED") {
    patch.membershipStatus = target.registeredAt ? "ACTIVE" : "UNREGISTERED";
  }
  if (Object.keys(patch).length) await db.update(users).set(patch).where(eq(users.id, id));

  if (input.teamIds) {
    await db.delete(teamMembers).where(eq(teamMembers.userId, id));
    if (input.teamIds.length) {
      await db.insert(teamMembers).values(input.teamIds.map((teamId) => ({ userId: id, teamId })));
    }
  }
  return ok();
});
