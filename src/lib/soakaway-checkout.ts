import "server-only";
import { db } from "@/db";
import { payments, type SoakawayBooking, type User } from "@/db/schema";
import { createCheckout } from "./flutterwave";

/** Starts a Flutterwave checkout for a booking and returns the payment link. */
export async function soakawayCheckout(booking: SoakawayBooking, user: User, origin: string) {
  const txRef = `AC-SOAK-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`.toUpperCase();
  await db.insert(payments).values({
    userId: user.id,
    txRef,
    type: "SOAKAWAY",
    amount: booking.amount,
    months: 0,
    bookingId: booking.id,
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin;
  return createCheckout({
    txRef,
    amount: booking.amount,
    redirectUrl: `${appUrl}/api/payments/callback`,
    customer: { email: user.email, name: user.name, phone: user.phone },
    title: "AreaCare",
    description: "Soakaway evacuation",
    meta: { userId: user.id, type: "SOAKAWAY", bookingId: booking.id },
  });
}
