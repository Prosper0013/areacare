import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { cleanDbUrl } from "./url";

/**
 * One connection pool per server instance. On Vercel, point DATABASE_URL at your
 * provider's *pooled* connection string (Supabase: port 6543, "Transaction pooler").
 * `prepare: false` is required for transaction-mode poolers such as Supavisor/PgBouncer.
 */
const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

function client() {
  const url = cleanDbUrl(process.env.DATABASE_URL);
  if (!url) console.warn("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  // postgres() connects lazily, so a missing URL only fails when a query actually runs.
  return postgres(url || "postgres://missing:missing@127.0.0.1:1/missing", {
    prepare: false,
    max: Number(process.env.DB_POOL_MAX ?? 5),
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

const sql = globalForDb.pg ?? client();
if (process.env.NODE_ENV !== "production") globalForDb.pg = sql;

export const db = drizzle(sql, { schema });
export { schema };
