import { after } from "next/server";
import { maybeSweepReminders } from "@/lib/reminder-sweep";
import { STAFF_ROLES, apiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";
import { boardPickups } from "@/lib/ops";

/**
 * Live board for crews and management.
 * Management sees every zone; staff see the zones their teams cover.
 * ?scope=open (default) | cleared (confirmed today) | recent (last 30 days, all statuses)
 */
export const GET = handler(async (req: Request) => {
  after(maybeSweepReminders);
  const user = await apiUser(STAFF_ROLES);
  const raw = new URL(req.url).searchParams.get("scope");
  const scope = raw === "recent" || raw === "cleared" ? raw : "open";
  return ok({ pickups: await boardPickups(user, scope), scope });
});
