import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { apiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

// Save this device so it receives push alerts even when the app is closed.
export const POST = handler(async (req: Request) => {
  const user = await apiUser();
  const sub = schema.parse(await req.json());
  await db
    .insert(pushSubscriptions)
    .values({ userId: user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId: user.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
  return ok();
});

export const DELETE = handler(async (req: Request) => {
  await apiUser();
  const { endpoint } = z.object({ endpoint: z.string() }).parse(await req.json());
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  return ok();
});
