/**
 * Seeds default fees, starter zones, a starter crew and the super admin account.
 * Safe to run more than once.
 *   SUPER_ADMIN_EMAIL=you@company.com SUPER_ADMIN_PASSWORD=... npm run db:seed
 */
import "./load-env";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { cleanDbUrl } from "../src/db/url";
import * as schema from "../src/db/schema";

const ZONES = [
  ["Wuse", "Wuse, Wuse II, Zone 1, Zone 2, Zone 3, Zone 4, Zone 5, Zone 6, Zone 7"],
  ["Garki", "Garki, Garki II, Area 1, Area 2, Area 3, Area 7, Area 8, Area 10, Area 11"],
  ["Maitama", "Maitama, Mpape"],
  ["Asokoro", "Asokoro, Guzape"],
  ["Gwarinpa", "Gwarinpa, Life Camp, Dawaki"],
  ["Jabi & Utako", "Jabi, Utako, Wuye, Mabushi"],
  ["Kubwa", "Kubwa, Dutse, Byazhin, Bwari"],
  ["Lugbe & Airport Road", "Lugbe, Kyami, Pyakasa, Airport Road"],
];

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL first.");
  const sql = postgres(cleanDbUrl(url)!, { max: 1, prepare: false });
  const db = drizzle(sql, { schema });

  await db
    .insert(schema.settings)
    .values([
      { key: "registration_fee", value: process.env.DEFAULT_REGISTRATION_FEE ?? "5000" },
      { key: "registration_credit", value: process.env.DEFAULT_REGISTRATION_CREDIT ?? "2000" },
      { key: "bin_price", value: process.env.DEFAULT_BIN_PRICE ?? "500" },
      { key: "soakaway_fee", value: process.env.DEFAULT_SOAKAWAY_FEE ?? "25000" },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.zones)
    .values(ZONES.map(([name, description]) => ({ name, description })))
    .onConflictDoNothing();

  const [crew] = await db
    .insert(schema.teams)
    .values({ name: "Central crew", description: "Default crew covering every zone" })
    .onConflictDoNothing()
    .returning();
  if (crew) {
    const allZones = await db.select().from(schema.zones);
    await db
      .insert(schema.teamZones)
      .values(allZones.map((z) => ({ teamId: crew.id, zoneId: z.id })))
      .onConflictDoNothing();
  }

  const email = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (email && password) {
    const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
    if (existing) {
      await db.update(schema.users).set({ role: "SUPER_ADMIN" }).where(eq(schema.users.id, existing.id));
      console.log(`✓ ${email} promoted to super admin`);
    } else {
      await db.insert(schema.users).values({
        name: "Super Admin",
        email,
        phone: "",
        passwordHash: await bcrypt.hash(password, 12),
        role: "SUPER_ADMIN",
      });
      console.log(`✓ Super admin ${email} created`);
    }
  } else {
    console.log("! SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set — skipped admin account");
  }

  await sql.end();
  console.log("✓ Seed complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
