import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users, zones } from "@/db/schema";
import { HttpError, apiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";

const schema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^(\+?234|0)[789][01]\d{8}$/, "Enter a Nigerian phone number, e.g. 0803 123 4567.")
    .optional(),
  houseNumber: z.string().trim().min(1, "Enter your house or plot number.").max(40),
  street: z.string().trim().min(2, "Enter your street.").max(120),
  estate: z.string().trim().max(120).optional().default(""),
  city: z.string().trim().min(2, "Enter your city or district.").max(80),
  state: z.string().trim().min(2).max(60).default("FCT"),
  landmark: z.string().trim().max(160).optional().default(""),
  houseDescription: z.string().trim().max(300).optional().default(""),
  zoneId: z.string().min(1, "Choose your service zone."),
  homeLat: z.number().min(-90).max(90).nullable().optional(),
  homeLng: z.number().min(-180).max(180).nullable().optional(),
});

export const PUT = handler(async (req: Request) => {
  const user = await apiUser();
  const input = schema.parse(await req.json());

  const zone = await db.query.zones.findFirst({ where: eq(zones.id, input.zoneId) });
  if (!zone) throw new HttpError(422, "Choose a service zone from the list.");

  await db
    .update(users)
    .set({
      phone: input.phone?.replace(/\s/g, "") ?? user.phone,
      houseNumber: input.houseNumber,
      street: input.street,
      estate: input.estate || null,
      city: input.city,
      state: input.state,
      landmark: input.landmark || null,
      houseDescription: input.houseDescription || null,
      zoneId: zone.id,
      homeLat: input.homeLat ?? user.homeLat,
      homeLng: input.homeLng ?? user.homeLng,
    })
    .where(eq(users.id, user.id));

  return ok({ redirect: user.registeredAt ? "/dashboard" : "/wallet" });
});
