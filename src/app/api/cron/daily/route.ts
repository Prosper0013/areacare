import { NextResponse } from "next/server";
import { and, between, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { settings, users } from "@/db/schema";
import { shortDate } from "@/lib/format";
import { notifyUsers } from "@/lib/notify";
import { sendConfirmationReminders } from "@/lib/pickups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Runs once a day via Vercel Cron (see vercel.json).
 * 1. Keeps the free database awake (Supabase pauses projects after 7 idle days).
 * 2. Marks members whose dues have lapsed as OVERDUE and tells them.
 * 3. Reminds members whose dues run out in 3 days.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // 1. Keep-alive: a real read and a real write so the provider registers activity.
  await db.execute(sql`select 1`);
  await db
    .insert(settings)
    .values({ key: "last_heartbeat", value: now.toISOString() })
    .onConflictDoUpdate({ target: settings.key, set: { value: now.toISOString() } });

  // 2. Lapsed members → OVERDUE
  const lapsed = await db
    .update(users)
    .set({ membershipStatus: "OVERDUE" })
    .where(and(eq(users.membershipStatus, "ACTIVE"), lt(users.paidThrough, now)))
    .returning({ id: users.id });
  if (lapsed.length) {
    await notifyUsers(
      lapsed.map((u) => u.id),
      {
        kind: "payment",
        title: "Your monthly dues are due",
        body: "Renew your membership to keep requesting pickups.",
        link: "/membership",
        email: true,
      },
    );
  }

  // 3. Reminders for dues ending in ~3 days (window of one day so each member gets one reminder)
  const from = new Date(now.getTime() + 2 * 86_400_000);
  const to = new Date(now.getTime() + 3 * 86_400_000);
  const dueSoon = await db
    .select({ id: users.id, paidThrough: users.paidThrough })
    .from(users)
    .where(and(eq(users.membershipStatus, "ACTIVE"), between(users.paidThrough, from, to)));
  for (const u of dueSoon) {
    await notifyUsers([u.id], {
      kind: "payment",
      title: "Dues ending soon",
      body: `Your membership runs until ${shortDate(u.paidThrough)}. Renew early to avoid interruption.`,
      link: "/membership",
    });
  }

  // 4. Pickup confirmation reminders (also run every 30 min by GitHub Actions)
  const confirmations = await sendConfirmationReminders();

  return NextResponse.json({
    ok: true,
    at: now.toISOString(),
    overdue: lapsed.length,
    reminded: dueSoon.length,
    confirmations,
  });
}
