import { z } from "zod";
import { db } from "@/db";
import { teamZones, teams } from "@/db/schema";
import { HttpError, apiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";

const teamSchema = z.object({
  name: z.string().trim().min(2, "Give the team a name."),
  description: z.string().trim().max(200).optional().default(""),
  zoneIds: z.array(z.string()).default([]),
});

export const POST = handler(async (req: Request) => {
  await apiUser(["SUPER_ADMIN"]);
  const input = teamSchema.parse(await req.json());
  const [team] = await db
    .insert(teams)
    .values({ name: input.name, description: input.description || null })
    .onConflictDoNothing()
    .returning();
  if (!team) throw new HttpError(409, "A team with that name already exists.");
  if (input.zoneIds.length) {
    await db.insert(teamZones).values(input.zoneIds.map((zoneId) => ({ teamId: team.id, zoneId })));
  }
  return ok({ team }, { status: 201 });
});
