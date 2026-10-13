import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { soakawayBookings } from "@/db/schema";
import { HttpError, MANAGEMENT_ROLES, apiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";
import { approveBooking, cancelUnpaidBooking, completeBooking, rejectBooking } from "@/lib/soakaway";
import { soakawayCheckout } from "@/lib/soakaway-checkout";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.discriminatedUnion("action", [
  // management
  z.object({ action: z.literal("approve"), scheduledFor: z.string().datetime({ offset: true }), note: z.string().max(400).nullable().optional() }),
  z.object({ action: z.literal("reject"), reason: z.string().trim().min(3, "Tell the member why.").max(400) }),
  z.object({ action: z.literal("complete") }),
  // member
  z.object({ action: z.literal("pay") }),
  z.object({ action: z.literal("cancel") }),
]);

export const POST = handler(async (req: Request, { params }: Ctx) => {
  const user = await apiUser();
  const { id } = await params;
  const input = schema.parse(await req.json());
  const isManagement = MANAGEMENT_ROLES.includes(user.role);

  if (input.action === "pay" || input.action === "cancel") {
    const booking = await db.query.soakawayBookings.findFirst({
      where: and(eq(soakawayBookings.id, id), eq(soakawayBookings.userId, user.id)),
    });
    if (!booking) throw new HttpError(404, "Booking not found.");
    if (input.action === "cancel") {
      const r = await cancelUnpaidBooking(id, user);
      if ("error" in r) throw new HttpError(409, r.error);
      return ok({ booking: r.booking });
    }
    if (booking.status !== "AWAITING_PAYMENT") throw new HttpError(409, "This booking is already paid.");
    return ok({ link: await soakawayCheckout(booking, user, new URL(req.url).origin) });
  }

  // Only management can approve, decline or complete evacuations.
  if (!isManagement) throw new HttpError(403, "Only AreaCare management can do this.");
  const r =
    input.action === "approve"
      ? await approveBooking(id, user, new Date(input.scheduledFor), input.note)
      : input.action === "reject"
        ? await rejectBooking(id, input.reason)
        : await completeBooking(id);
  if ("error" in r) throw new HttpError(409, r.error);
  return ok({ booking: r.booking });
});
