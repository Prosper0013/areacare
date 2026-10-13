import "server-only";
import { and, eq, lt, or, isNull } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { sendConfirmationReminders } from "./pickups";

const KEY = "last_reminder_sweep";
const MIN_GAP_MS = 5 * 60_000;

/**
 * Runs the confirmation reminders at most once every 5 minutes, piggy-backing on normal
 * app traffic (crew boards and notification bells poll constantly). This keeps reminders
 * flowing between the scheduled runs, which Vercel's free plan limits to once a day.
 */
export async function maybeSweepReminders() {
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - MIN_GAP_MS).toISOString();
    await db.insert(settings).values({ key: KEY, value: "1970-01-01T00:00:00.000Z" }).onConflictDoNothing();
    // Atomically claim the slot: only one request wins per 5-minute window.
    const claimed = await db
      .update(settings)
      .set({ value: now.toISOString() })
      .where(and(eq(settings.key, KEY), or(isNull(settings.value), lt(settings.value, cutoff))))
      .returning({ key: settings.key });
    if (claimed.length) await sendConfirmationReminders();
  } catch (err) {
    console.error("reminder sweep failed", err);
  }
}
