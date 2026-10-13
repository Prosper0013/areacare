/**
 * Applies the SQL migrations in ./drizzle to the database.
 * Run with: npm run db:migrate   (uses DIRECT_URL, falling back to DATABASE_URL)
 */
import "./load-env";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { cleanDbUrl } from "../src/db/url";

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Set DIRECT_URL or DATABASE_URL before running migrations.");
  const sql = postgres(cleanDbUrl(url)!, { max: 1, prepare: false });
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  await sql.end();
  console.log("✓ Database is up to date");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
