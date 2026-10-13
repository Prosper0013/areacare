import { after } from "next/server";
import { maybeSweepReminders } from "@/lib/reminder-sweep";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { apiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";

export const GET = handler(async () => {
  after(maybeSweepReminders);
  const user = await apiUser();
  const [items, [{ unread }]] = await Promise.all([
    db.query.notifications.findMany({
      where: eq(notifications.userId, user.id),
      orderBy: desc(notifications.createdAt),
      limit: 30,
    }),
    db
      .select({ unread: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), eq(notifications.read, false))),
  ]);
  return ok({ items, unread });
});

// Mark some (ids) or all notifications as read.
export const POST = handler(async (req: Request) => {
  const user = await apiUser();
  const { ids } = z.object({ ids: z.array(z.string()).optional() }).parse(await req.json().catch(() => ({})));
  await db
    .update(notifications)
    .set({ read: true })
    .where(
      ids?.length
        ? and(eq(notifications.userId, user.id), inArray(notifications.id, ids))
        : eq(notifications.userId, user.id),
    );
  return ok();
});
