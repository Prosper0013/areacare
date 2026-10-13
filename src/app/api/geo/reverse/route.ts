import { z } from "zod";
import { db } from "@/db";
import { zones } from "@/db/schema";
import { HttpError, apiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";
import { reverseGeocode } from "@/lib/geocode";

// Turns the member's GPS position into a street address and the matching service area.
export const GET = handler(async (req: Request) => {
  await apiUser();
  const sp = new URL(req.url).searchParams;
  const { lat, lng } = z
    .object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) })
    .parse({ lat: sp.get("lat"), lng: sp.get("lng") });

  const zoneList = await db.select({ id: zones.id, name: zones.name, description: zones.description }).from(zones);
  try {
    return ok({ address: await reverseGeocode(lat, lng, zoneList) });
  } catch (err) {
    console.error("reverse geocode failed", err);
    throw new HttpError(502, "We pinned your location but couldn't look up the street. Please type your address.");
  }
});
