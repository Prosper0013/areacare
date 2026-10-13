import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

export type Fees = { registrationFee: number; monthlyFee: number };

const DEFAULTS: Fees = {
  registrationFee: Number(process.env.DEFAULT_REGISTRATION_FEE ?? 5000),
  monthlyFee: Number(process.env.DEFAULT_MONTHLY_FEE ?? 2000),
};

export async function getFees(): Promise<Fees> {
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, ["registration_fee", "monthly_fee"]));
  const map = Object.fromEntries(rows.map((r) => [r.key, Number(r.value)]));
  return {
    registrationFee: Number.isFinite(map.registration_fee) ? map.registration_fee : DEFAULTS.registrationFee,
    monthlyFee: Number.isFinite(map.monthly_fee) ? map.monthly_fee : DEFAULTS.monthlyFee,
  };
}

export async function setFees(fees: Fees) {
  for (const [key, value] of [
    ["registration_fee", fees.registrationFee],
    ["monthly_fee", fees.monthlyFee],
  ] as const) {
    await db
      .insert(settings)
      .values({ key, value: String(value) })
      .onConflictDoUpdate({ target: settings.key, set: { value: String(value) } });
  }
}
