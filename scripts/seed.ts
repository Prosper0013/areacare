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
import * as schema from "../src/db/schema";

const ZONES = [
  ["Wuse", "Wuse I & II, Zone 1–7"],
  ["Garki", "Garki I & II, Area 1–11"],
  ["Maitama", "Maitama and Mpape axis"],
  ["Asokoro", "Asokoro and Guzape"],
  ["Gwarinpa", "Gwarinpa estate and Life Camp"],
  ["Jabi & Utako", "Jabi, Utako, Wuye"],
  ["Kubwa", "Kubwa, Dutse, Byazhin"],
  ["Lugbe & Airport Road", "Lugbe, Kyami, Pyakasa"],
];

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL first.");
  const sql = postgres(url, { max: 1, prepare: false });
  const db = drizzle(sql, { schema });

  await db
    .insert(schema.settings)
    .values([
      { key: "registration_fee", value: process.env.DEFAULT_REGISTRATION_FEE ?? "5000" },
      { key: "monthly_fee", value: process.env.DEFAULT_MONTHLY_FEE ?? "2000" },
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
