import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

/**
 * Pay-as-you-go prices, all in naira and all editable by the super admin.
 *  - registrationFee: paid once to join
 *  - registrationCredit: the part of the registration fee that becomes pickup credit
 *  - binPrice: charged from credit for each filled trash can collected
 *  - soakawayFee: per evacuation
 */
export type Fees = { registrationFee: number; registrationCredit: number; binPrice: number; soakawayFee: number };

const KEYS = {
  registrationFee: "registration_fee",
  registrationCredit: "registration_credit",
  binPrice: "bin_price",
  soakawayFee: "soakaway_fee",
} as const;

export const DEFAULT_FEES: Fees = {
  registrationFee: Number(process.env.DEFAULT_REGISTRATION_FEE ?? 5000),
  registrationCredit: Number(process.env.DEFAULT_REGISTRATION_CREDIT ?? 2000),
  binPrice: Number(process.env.DEFAULT_BIN_PRICE ?? 500),
  soakawayFee: Number(process.env.DEFAULT_SOAKAWAY_FEE ?? 25000),
};

/** Largest single top-up, in naira. */
export const MAX_TOPUP = 500_000;

/** Most trash cans a member can declare in one request. */
export const MAX_BINS_PER_REQUEST = Number(process.env.MAX_BINS_PER_REQUEST ?? 10);

export async function getFees(): Promise<Fees> {
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, Object.values(KEYS)));
  const map = Object.fromEntries(rows.map((r) => [r.key, Number(r.value)]));
  const pick = (k: keyof Fees) => (Number.isFinite(map[KEYS[k]]) ? map[KEYS[k]] : DEFAULT_FEES[k]);
  return {
    registrationFee: pick("registrationFee"),
    registrationCredit: Math.min(pick("registrationCredit"), pick("registrationFee")),
    binPrice: pick("binPrice"),
    soakawayFee: pick("soakawayFee"),
  };
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
