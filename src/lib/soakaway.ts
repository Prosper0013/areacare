import "server-only";
import { and, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { soakawayBookings, zones, type AddressSnapshot, type SoakawayBooking, type User } from "@/db/schema";
import { addressLine, appointment, naira } from "./format";
import { notifyUsers } from "./notify";
import { managementIds } from "./pickups";
import { getFees } from "./settings";

export const TIME_WINDOWS = { morning: "Morning (8am – 12pm)", afternoon: "Afternoon (12pm – 5pm)", any: "Any time" } as const;
export type TimeWindow = keyof typeof TIME_WINDOWS;

export async function createBooking(
  user: User,
  input: { preferredDate?: string | null; preferredTime?: TimeWindow | null; note?: string | null },
) {
  const fees = await getFees();
  const zone = user.zoneId ? await db.query.zones.findFirst({ where: eq(zones.id, user.zoneId) }) : null;
  const address: AddressSnapshot = {
    name: user.name,
    phone: user.phone,
    houseNumber: user.houseNumber,
    street: user.street,
    estate: user.estate,
    city: user.city,
    state: user.state,
    landmark: user.landmark,
    houseDescription: user.houseDescription,
    zone: zone?.name ?? null,
  };
  const [booking] = await db
    .insert(soakawayBookings)
    .values({
      userId: user.id,
      amount: fees.soakawayFee,
      preferredDate: input.preferredDate || null,
      preferredTime: input.preferredTime || "any",
      note: input.note?.trim() || null,
      address,
      lat: user.homeLat,
      lng: user.homeLng,
      zoneId: user.zoneId,
    })
    .returning();
  return booking;
}

/** Called once Flutterwave confirms the booking's payment. */
export async function onBookingPaid(bookingId: string) {
  const [booking] = await db
    .update(soakawayBookings)
    .set({ status: "PENDING_APPROVAL", paidAt: new Date(), cancelledAt: null })
    // A payment can land after the member cancelled the unpaid booking; reinstate it then.
    .where(and(eq(soakawayBookings.id, bookingId), inArray(soakawayBookings.status, ["AWAITING_PAYMENT", "CANCELLED"])))
    .returning();
  if (!booking) return;

  await notifyUsers([booking.userId], {
    kind: "payment",
    title: "Soakaway evacuation booked",
    body: `${naira(booking.amount)} received. We'll confirm your date and time shortly.`,
    link: "/soakaway",
    email: true,
  });
  await notifyUsers(await managementIds(), {
    kind: "info",
    title: "New soakaway evacuation to approve",
    body: `${booking.address.name} — ${addressLine(booking.address)}${
      booking.preferredDate ? `\nPrefers ${booking.preferredDate}, ${TIME_WINDOWS[(booking.preferredTime ?? "any") as TimeWindow]}` : ""
    }`,
    link: "/ops/soakaway",
    email: true,
  });
}

type Result = { booking: SoakawayBooking } | { error: string };

/** Approve (or reschedule) a paid booking with a date and time. */
export async function approveBooking(id: string, admin: User, scheduledFor: Date, note?: string | null): Promise<Result> {
  if (scheduledFor.getTime() < Date.now() - 5 * 60_000) return { error: "Pick a date and time in the future." };
  const [booking] = await db
    .update(soakawayBookings)
    .set({
      status: "SCHEDULED",
      scheduledFor,
      adminNote: note?.trim() || null,
      approvedById: admin.id,
      approvedAt: new Date(),
      remindedAt: null,
    })
    .where(and(eq(soakawayBookings.id, id), inArray(soakawayBookings.status, ["PENDING_APPROVAL", "SCHEDULED"])))
    .returning();
  if (!booking) return { error: "Only paid bookings can be approved." };

  await notifyUsers([booking.userId], {
    kind: "info",
    title: "Soakaway evacuation approved",
    body: `Our team will come on ${appointment(scheduledFor)}.${booking.adminNote ? `\n“${booking.adminNote}”` : ""}\nPlease make sure the soakaway cover is reachable.`,
    link: "/soakaway",
    email: true,
  });
  return { booking };
}

export async function rejectBooking(id: string, reason: string): Promise<Result> {
  const [booking] = await db
    .update(soakawayBookings)
    .set({ status: "REJECTED", rejectedAt: new Date(), rejectReason: reason.trim() })
    .where(and(eq(soakawayBookings.id, id), inArray(soakawayBookings.status, ["PENDING_APPROVAL", "SCHEDULED"])))
    .returning();
  if (!booking) return { error: "This booking can't be declined now." };
  await notifyUsers([booking.userId], {
    kind: "info",
    title: "Soakaway evacuation declined",
    body: `${reason.trim()}\nAreaCare will contact you about your ${naira(booking.amount)} refund.`,
    link: "/soakaway",
    email: true,
  });
  return { booking };
}

export async function completeBooking(id: string): Promise<Result> {
  const [booking] = await db
    .update(soakawayBookings)
    .set({ status: "COMPLETED", completedAt: new Date() })
    .where(and(eq(soakawayBookings.id, id), eq(soakawayBookings.status, "SCHEDULED")))
    .returning();
  if (!booking) return { error: "Only scheduled evacuations can be marked done." };
  await notifyUsers([booking.userId], {
    kind: "info",
    title: "Soakaway evacuation completed",
    body: "Your soakaway has been evacuated. Thank you for using AreaCare.",
    link: "/soakaway",
  });
  return { booking };
}

export async function cancelUnpaidBooking(id: string, user: User): Promise<Result> {
  const [booking] = await db
    .update(soakawayBookings)
    .set({ status: "CANCELLED", cancelledAt: new Date() })
    .where(and(eq(soakawayBookings.id, id), eq(soakawayBookings.userId, user.id), eq(soakawayBookings.status, "AWAITING_PAYMENT")))
    .returning();
  if (!booking) return { error: "Only unpaid bookings can be cancelled. Contact AreaCare about paid ones." };
  return { booking };
}

/** Morning-of reminders for evacuations scheduled today (run by the daily cron). */
export async function remindTodaysEvacuations(dayStart: Date) {
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const due = await db
    .update(soakawayBookings)
    .set({ remindedAt: new Date() })
    .where(
      and(
        eq(soakawayBookings.status, "SCHEDULED"),
        gte(soakawayBookings.scheduledFor, dayStart),
        lt(soakawayBookings.scheduledFor, dayEnd),
        isNull(soakawayBookings.remindedAt),
      ),
    )
    .returning();
  for (const b of due) {
    await notifyUsers([b.userId], {
      kind: "info",
      title: "Soakaway evacuation today",
      body: `Our team is coming ${appointment(b.scheduledFor)}. Please make sure the soakaway cover is reachable.`,
      link: "/soakaway",
    });
  }
  return due.length;
}

export async function bookingWithUser(id: string) {
  return db.query.soakawayBookings.findFirst({
    where: eq(soakawayBookings.id, id),
    with: { user: { columns: { id: true, name: true, email: true, phone: true } } },
  });
}


