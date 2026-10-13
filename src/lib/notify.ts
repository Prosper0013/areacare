import "server-only";
import { inArray } from "drizzle-orm";
import webpush from "web-push";
import { db } from "@/db";
import { notifications, pushSubscriptions, users } from "@/db/schema";

export type NotifyInput = {
  title: string;
  body: string;
  link?: string;
  kind?: "pickup" | "payment" | "info";
  /** Also send an email (needs RESEND_API_KEY). */
  email?: boolean;
  /** Push tag: a new push with the same tag replaces the old one (and buzzes again). */
  tag?: string;
  /** Pickup the push is about, so the phone can show "Yes, cleared" / "Not cleared" buttons. */
  pickupId?: string;
};

let vapidReady: boolean | null = null;
function ensureVapid() {
  if (vapidReady !== null) return vapidReady;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  vapidReady = Boolean(pub && priv);
  if (vapidReady) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@areacare.ng", pub!, priv!);
  }
  return vapidReady;
}

/** In-app notification for every recipient, plus phone/desktop push and optional email. */
export async function notifyUsers(userIds: string[], input: NotifyInput) {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return;

  await db.insert(notifications).values(
    ids.map((userId) => ({
      userId,
      title: input.title,
      body: input.body,
      link: input.link,
      kind: input.kind ?? "info",
    })),
  );

  await Promise.allSettled([sendPush(ids, input), input.email ? sendEmail(ids, input) : Promise.resolve()]);
}

async function sendPush(userIds: string[], input: NotifyInput) {
  if (!ensureVapid()) return;
  const subs = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, userIds));
  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    url: input.link ?? "/",
    tag: input.tag ?? (input.kind === "pickup" ? "pickup" : undefined),
    pickupId: input.pickupId,
    confirm: input.tag === "confirm",
  });
  const expired: string[] = [];
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 60 * 60, urgency: input.kind === "pickup" ? "high" : "normal" },
        );
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) expired.push(s.id);
      }
    }),
  );
  if (expired.length) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, expired));
}

async function sendEmail(userIds: string[], input: NotifyInput) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return;
  const recipients = await db.select({ email: users.email }).from(users).where(inArray(users.id, userIds));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const link = input.link ? `${appUrl}${input.link}` : appUrl;
  await Promise.allSettled(
    recipients
      .filter((r) => r.email)
      .map((r) =>
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from,
            to: r.email,
            subject: input.title,
            html: `<div style="font-family:system-ui,sans-serif;max-width:520px">
              <h2 style="color:#14231C;margin:0 0 8px">${escapeHtml(input.title)}</h2>
              <p style="color:#3b4a42;white-space:pre-line">${escapeHtml(input.body)}</p>
              <p><a href="${link}" style="display:inline-block;background:#1F7A4D;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none">Open AreaCare</a></p>
            </div>`,
          }),
        }),
      ),
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
