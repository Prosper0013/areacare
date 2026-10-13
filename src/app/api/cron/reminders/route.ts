import { NextResponse } from "next/server";
import { sendConfirmationReminders } from "@/lib/pickups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Re-buzzes members who haven't confirmed their bin was cleared.
 * Called every 30 minutes by the GitHub Action in .github/workflows/reminders.yml
 * (and also opportunistically by the app itself — see lib/reminder-sweep.ts).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await sendConfirmationReminders();
  return NextResponse.json({ ok: true, ...result });
}
