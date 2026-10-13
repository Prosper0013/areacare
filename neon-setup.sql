-- ════════════════════════════════════════════════════════════════════
--  AreaCare — one-time database setup for Neon (or any PostgreSQL)
--
--  How to use:
--    1. Neon console → your project → SQL Editor (database: neondb)
--    2. Paste this whole file and click Run.
--    3. Sign up in the app with the email you set as SUPER_ADMIN_EMAIL in
--       Vercel — that account becomes the super admin automatically.
--
--  Run it once, on an empty database. Running it twice will fail with
--  "already exists" errors (nothing gets damaged).
-- ════════════════════════════════════════════════════════════════════

-- ── Tables ──────────────────────────────────────────────────────────
CREATE TYPE "public"."membership_status" AS ENUM('UNREGISTERED', 'ACTIVE', 'OVERDUE', 'SUSPENDED');
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'SUCCESSFUL', 'FAILED');
CREATE TYPE "public"."payment_type" AS ENUM('REGISTRATION', 'MONTHLY');
CREATE TYPE "public"."pickup_status" AS ENUM('PENDING', 'ACKNOWLEDGED', 'EN_ROUTE', 'AWAITING_CONFIRMATION', 'COMPLETED', 'CANCELLED');
CREATE TYPE "public"."role" AS ENUM('USER', 'STAFF', 'ADMIN', 'SUPER_ADMIN');
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" text,
	"kind" text DEFAULT 'info' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tx_ref" text NOT NULL,
	"flw_transaction_id" text,
	"type" "payment_type" NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"months" integer DEFAULT 1 NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone,
	CONSTRAINT "payments_tx_ref_unique" UNIQUE("tx_ref")
);

CREATE TABLE "pickup_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" "pickup_status" DEFAULT 'PENDING' NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"accuracy" double precision,
	"location_source" text DEFAULT 'live' NOT NULL,
	"note" text,
	"address" jsonb NOT NULL,
	"zone_id" text,
	"team_id" text,
	"handled_by_id" text,
	"acknowledged_at" timestamp with time zone,
	"en_route_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);

CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "team_members" (
	"user_id" text NOT NULL,
	"team_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_members_user_id_team_id_pk" PRIMARY KEY("user_id","team_id")
);

CREATE TABLE "team_zones" (
	"team_id" text NOT NULL,
	"zone_id" text NOT NULL,
	CONSTRAINT "team_zones_team_id_zone_id_pk" PRIMARY KEY("team_id","zone_id")
);

CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teams_name_unique" UNIQUE("name")
);

CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'USER' NOT NULL,
	"membership_status" "membership_status" DEFAULT 'UNREGISTERED' NOT NULL,
	"registered_at" timestamp with time zone,
	"paid_through" timestamp with time zone,
	"house_number" text,
	"street" text,
	"estate" text,
	"city" text,
	"state" text,
	"landmark" text,
	"house_description" text,
	"home_lat" double precision,
	"home_lng" double precision,
	"zone_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE "zones" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zones_name_unique" UNIQUE("name")
);

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_handled_by_id_users_id_fk" FOREIGN KEY ("handled_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "team_zones" ADD CONSTRAINT "team_zones_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "team_zones" ADD CONSTRAINT "team_zones_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "users" ADD CONSTRAINT "users_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","read","created_at");
CREATE INDEX "payments_user_idx" ON "payments" USING btree ("user_id","created_at");
CREATE INDEX "pickups_status_idx" ON "pickup_requests" USING btree ("status","created_at");
CREATE INDEX "pickups_user_idx" ON "pickup_requests" USING btree ("user_id","created_at");
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");
CREATE INDEX "users_zone_idx" ON "users" USING btree ("zone_id");

ALTER TABLE "pickup_requests" ADD COLUMN "cleared_at" timestamp with time zone;
ALTER TABLE "pickup_requests" ADD COLUMN "cleared_by_id" text;
ALTER TABLE "pickup_requests" ADD COLUMN "cleared_note" text;
ALTER TABLE "pickup_requests" ADD COLUMN "confirmed_by" text;
ALTER TABLE "pickup_requests" ADD COLUMN "confirm_reminders" integer DEFAULT 0 NOT NULL;
ALTER TABLE "pickup_requests" ADD COLUMN "last_reminder_at" timestamp with time zone;
ALTER TABLE "pickup_requests" ADD COLUMN "escalated_at" timestamp with time zone;
ALTER TABLE "pickup_requests" ADD COLUMN "reopened_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "pickup_requests" ADD COLUMN "reopen_note" text;
ALTER TABLE "pickup_requests" ADD COLUMN "reopened_at" timestamp with time zone;
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_cleared_by_id_users_id_fk" FOREIGN KEY ("cleared_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

-- ── Mark migrations as applied (so `npm run db:migrate` skips them) ──
CREATE SCHEMA IF NOT EXISTS "drizzle";
CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
  "id" SERIAL PRIMARY KEY,
  "hash" text NOT NULL,
  "created_at" bigint
);
INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") VALUES ('070ad5c07472e889a21c62120bf20ab239d829e44fe21bde8dd26e9e21fd1e39', 1791886365252);
INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") VALUES ('3071cb3b0760df98034ce761be238bf25b653e8c39a644e8a0c46cde070b9062', 1791889780822);

-- ── Starting data ───────────────────────────────────────────────────
-- Fees in naira (change any time in the app under Fees)
INSERT INTO "settings" ("key", "value") VALUES
  ('registration_fee', '5000'),
  ('monthly_fee', '2000')
ON CONFLICT ("key") DO NOTHING;

-- Service zones (edit or add more later under Teams & zones)
INSERT INTO "zones" ("id", "name", "description") VALUES
  (gen_random_uuid()::text, 'Wuse', 'Wuse I & II, Zone 1–7'),
  (gen_random_uuid()::text, 'Garki', 'Garki I & II, Area 1–11'),
  (gen_random_uuid()::text, 'Maitama', 'Maitama and Mpape axis'),
  (gen_random_uuid()::text, 'Asokoro', 'Asokoro and Guzape'),
  (gen_random_uuid()::text, 'Gwarinpa', 'Gwarinpa estate and Life Camp'),
  (gen_random_uuid()::text, 'Jabi & Utako', 'Jabi, Utako, Wuye'),
  (gen_random_uuid()::text, 'Kubwa', 'Kubwa, Dutse, Byazhin'),
  (gen_random_uuid()::text, 'Lugbe & Airport Road', 'Lugbe, Kyami, Pyakasa')
ON CONFLICT ("name") DO NOTHING;

-- A starter crew that covers every zone
INSERT INTO "teams" ("id", "name", "description")
VALUES (gen_random_uuid()::text, 'Central crew', 'Default crew covering every zone')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "team_zones" ("team_id", "zone_id")
SELECT t."id", z."id" FROM "teams" t CROSS JOIN "zones" z WHERE t."name" = 'Central crew'
ON CONFLICT DO NOTHING;

-- ── Optional ────────────────────────────────────────────────────────
-- If you already created an account before setting SUPER_ADMIN_EMAIL,
-- remove the two dashes below, put in your email, and run just that line:
-- UPDATE "users" SET "role" = 'SUPER_ADMIN' WHERE "email" = 'you@example.com';
