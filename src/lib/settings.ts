import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

export type Fees = { registrationFee: number; monthlyFee: number; soakawayFee: number };

const KEYS = { registrationFee: "registration_fee", monthlyFee: "monthly_fee", soakawayFee: "soakaway_fee" } as const;

const DEFAULTS: Fees = {
  registrationFee: Number(process.env.DEFAULT_REGISTRATION_FEE ?? 5000),
  monthlyFee: Number(process.env.DEFAULT_MONTHLY_FEE ?? 2000),
  soakawayFee: Number(process.env.DEFAULT_SOAKAWAY_FEE ?? 25000),
};

export async function getFees(): Promise<Fees> {
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, Object.values(KEYS)));
  const map = Object.fromEntries(rows.map((r) => [r.key, Number(r.value)]));
  const pick = (k: keyof Fees) => (Number.isFinite(map[KEYS[k]]) ? map[KEYS[k]] : DEFAULTS[k]);
  return { registrationFee: pick("registrationFee"), monthlyFee: pick("monthlyFee"), soakawayFee: pick("soakawayFee") };
}

export async function setFees(fees: Partial<Fees>) {
  for (const k of Object.keys(KEYS) as (keyof Fees)[]) {
    const value = fees[k];
    if (value === undefined) continue;
    await db
      .insert(settings)
      .values({ key: KEYS[k], value: String(value) })
      .onConflictDoUpdate({ target: settings.key, set: { value: String(value) } });
  }
}
