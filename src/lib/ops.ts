import "server-only";
import { and, desc, eq, gte, inArray, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { pickups, teamMembers, teamZones, type User } from "@/db/schema";
import { OPEN_STATUSES } from "./pickups";

/** Zones a staff member can see; null means "all zones" (management). */
export async function visibleZoneIds(user: User): Promise<string[] | null> {
  if (user.role !== "STAFF") return null;
  const rows = await db
    .select({ zoneId: teamZones.zoneId })
    .from(teamMembers)
    .innerJoin(teamZones, eq(teamZones.teamId, teamMembers.teamId))
    .where(eq(teamMembers.userId, user.id));
  return [...new Set(rows.map((r) => r.zoneId))];
}

/** Midnight today in Lagos (UTC+1, no daylight saving). */
export function startOfLagosDay(now = new Date()) {
  const lagos = new Date(now.getTime() + 60 * 60_000);
  return new Date(Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), lagos.getUTCDate()) - 60 * 60_000);
}

export async function boardPickups(user: User, scope: "open" | "recent" | "cleared" = "open") {
  const zoneIds = await visibleZoneIds(user);
  if (zoneIds && zoneIds.length === 0) return [];
  const filters: SQL[] = [
    scope === "open"
      ? inArray(pickups.status, OPEN_STATUSES)
      : scope === "cleared"
        ? and(eq(pickups.status, "COMPLETED"), gte(pickups.completedAt, startOfLagosDay()))!
        : gte(pickups.createdAt, new Date(Date.now() - 30 * 86_400_000)),
  ];
  if (zoneIds) filters.push(inArray(pickups.zoneId, zoneIds));
  return db.query.pickups.findMany({
    where: and(...filters),
    orderBy: desc(pickups.createdAt),
    limit: 300,
    with: {
      team: { columns: { id: true, name: true } },
      handledBy: { columns: { id: true, name: true } },
      clearedBy: { columns: { id: true, name: true } },
    },
  });
}
