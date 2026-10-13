import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { sendConfirmationReminders } from "@/lib/pickups";
import { remindTodaysEvacuations } from "@/lib/soakaway";
import { expireStalePayments } from "@/lib/payments";
import { startOfLagosDay } from "@/lib/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Runs once a day via Vercel Cron (see vercel.json).
 * 1. Keeps the free database awake (Supabase pauses projects after 7 idle days).
 * 2. Pickup confirmation reminders.
 * 3. Morning reminders for soakaway evacuations.
 * 4. Cancels payments still pending after 3 days.
 * (Billing is pay-as-you-go, so there are no dues to chase.)
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

  // 2. Pickup confirmation reminders (also run every 30 min by GitHub Actions)
  const confirmations = await sendConfirmationReminders();

  // 3. Morning reminders for soakaway evacuations scheduled today
  const evacuationsToday = await remindTodaysEvacuations(startOfLagosDay(now));

  // 4. Cancel payments (and unpaid soakaway bookings) still pending after 3 days
  const expired = await expireStalePayments(now);

  return NextResponse.json({
    ok: true,
    at: now.toISOString(),
    confirmations,
    evacuationsToday,
    expired,
  });
}
