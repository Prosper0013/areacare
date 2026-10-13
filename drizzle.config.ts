import { defineConfig } from "drizzle-kit";
import { cleanDbUrl } from "./src/db/url";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Use the direct (non-pooled) connection for migrations.
    url: cleanDbUrl(process.env.DIRECT_URL ?? process.env.DATABASE_URL) ?? "",
  },
});
