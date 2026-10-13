import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { confirmPayment } from "@/lib/payments";

export const runtime = "nodejs";

function sameSecret(a: string | null, b: string | undefined) {
  if (!a || !b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// Set this URL as the webhook in Flutterwave dashboard → Settings → Webhooks,
// with the same "Secret hash" as FLW_SECRET_HASH.
export async function POST(req: Request) {
  if (!sameSecret(req.headers.get("verif-hash"), process.env.FLW_SECRET_HASH)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = (await req.json().catch(() => null)) as {
    event?: string;
    data?: { id?: number; tx_ref?: string; status?: string };
  } | null;

  const txRef = event?.data?.tx_ref;
  if (txRef && event?.event === "charge.completed") {
    try {
      // Never trust the webhook body on its own — confirmPayment re-verifies with Flutterwave.
      await confirmPayment(txRef, event.data?.id ?? null);
    } catch (err) {
      console.error("webhook confirm failed", err);
      return NextResponse.json({ error: "retry" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
