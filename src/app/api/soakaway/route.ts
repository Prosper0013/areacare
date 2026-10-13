import { z } from "zod";
import { HttpError, apiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";
import { hasHouseDetails } from "@/lib/membership";
import { createBooking } from "@/lib/soakaway";
import { soakawayCheckout } from "@/lib/soakaway-checkout";

const schema = z.object({
  preferredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a preferred date.")
    .nullable()
    .optional(),
  preferredTime: z.enum(["morning", "afternoon", "any"]).default("any"),
  note: z.string().max(400).nullable().optional(),
});

// Book a soakaway evacuation and go straight to payment.
export const POST = handler(async (req: Request) => {
  const user = await apiUser(["USER"]);
  if (!hasHouseDetails(user)) throw new HttpError(409, "Add your house details first so the team knows where to come.");
  if (user.membershipStatus === "SUSPENDED") throw new HttpError(403, "Your account is suspended. Contact AreaCare support.");
  const input = schema.parse(await req.json());

  if (input.preferredDate) {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
    if (input.preferredDate < today) throw new HttpError(422, "Pick today or a later date.");
  }

  const booking = await createBooking(user, input);
  const link = await soakawayCheckout(booking, user, new URL(req.url).origin);
  return ok({ booking, link }, { status: 201 });
});
