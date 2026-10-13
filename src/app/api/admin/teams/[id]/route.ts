import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { teamMembers, teamZones, teams, users } from "@/db/schema";
import { HttpError, apiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  name: z.string().trim().min(2).optional(),
  description: z.string().trim().max(200).optional(),
  zoneIds: z.array(z.string()).optional(),
  memberIds: z.array(z.string()).optional(),
});

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  await apiUser(["SUPER_ADMIN"]);
  const { id } = await params;
  const input = schema.parse(await req.json());
  const team = await db.query.teams.findFirst({ where: eq(teams.id, id) });
  if (!team) throw new HttpError(404, "Team not found.");

  if (input.name || input.description !== undefined) {
    await db
      .update(teams)
      .set({ name: input.name ?? team.name, description: input.description ?? team.description })
      .where(eq(teams.id, id));
  }
  if (input.zoneIds) {
    await db.delete(teamZones).where(eq(teamZones.teamId, id));
    if (input.zoneIds.length) await db.insert(teamZones).values(input.zoneIds.map((zoneId) => ({ teamId: id, zoneId })));
  }
  if (input.memberIds) {
    await db.delete(teamMembers).where(eq(teamMembers.teamId, id));
    if (input.memberIds.length) {
      await db.insert(teamMembers).values(input.memberIds.map((userId) => ({ teamId: id, userId })));
      // Anyone added to a crew who is still a plain member becomes staff.
      for (const userId of input.memberIds) {
        const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
        if (u?.role === "USER") await db.update(users).set({ role: "STAFF" }).where(eq(users.id, userId));
      }
    }
  }
  return ok();
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  await apiUser(["SUPER_ADMIN"]);
  const { id } = await params;
  await db.delete(teams).where(eq(teams.id, id));
  return ok();
});
