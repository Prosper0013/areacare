/**
 * Accepts a Postgres URL exactly as Neon, Supabase etc. hand it out.
 * - Removes `channel_binding`, which Neon adds by default but the `postgres` driver
 *   would otherwise forward to the server as an unknown setting.
 * - Makes sure SSL is required for hosted databases.
 */
export function cleanDbUrl(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  try {
    const url = new URL(raw);
    url.searchParams.delete("channel_binding");
    const local = ["localhost", "127.0.0.1"].includes(url.hostname);
    if (!local && !url.searchParams.has("sslmode")) url.searchParams.set("sslmode", "require");
    return url.toString();
  } catch {
    return raw;
  }
}
