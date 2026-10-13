-- ════════════════════════════════════════════════════════════════════
--  AreaCare — one-time database setup for a NEW, EMPTY Neon database
--
--    1. Neon console → your project → SQL Editor (database: neondb)
--    2. Paste this whole file and click Run.
--    3. Sign up in the app with your SUPER_ADMIN_EMAIL — that account
--       becomes the super admin automatically.
--
--  Already set up an earlier version? Use neon-update.sql instead.
-- ════════════════════════════════════════════════════════════════════

CREATE TYPE "public"."membership_status" AS ENUM('UNREGISTERED', 'ACTIVE', 'OVERDUE', 'SUSPENDED');
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'SUCCESSFUL', 'FAILED', 'CANCELLED');
CREATE TYPE "public"."payment_type" AS ENUM('REGISTRATION', 'MONTHLY', 'SOAKAWAY', 'TOPUP');
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

CREATE TYPE "public"."soakaway_status" AS ENUM('AWAITING_PAYMENT', 'PENDING_APPROVAL', 'SCHEDULED', 'COMPLETED', 'REJECTED', 'CANCELLED');
CREATE TABLE "soakaway_bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" "soakaway_status" DEFAULT 'AWAITING_PAYMENT' NOT NULL,
	"amount" integer NOT NULL,
	"preferred_date" text,
	"preferred_time" text,
	"note" text,
	"address" jsonb NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"zone_id" text,
	"paid_at" timestamp with time zone,
	"scheduled_for" timestamp with time zone,
	"admin_note" text,
	"approved_by_id" text,
	"approved_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"reject_reason" text,
	"cancelled_at" timestamp with time zone,
	"reminded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "payments" ADD COLUMN "booking_id" text;
ALTER TABLE "soakaway_bookings" ADD CONSTRAINT "soakaway_bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "soakaway_bookings" ADD CONSTRAINT "soakaway_bookings_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "soakaway_bookings" ADD CONSTRAINT "soakaway_bookings_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "soakaway_status_idx" ON "soakaway_bookings" USING btree ("status","created_at");
CREATE INDEX "soakaway_user_idx" ON "soakaway_bookings" USING btree ("user_id","created_at");
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_soakaway_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."soakaway_bookings"("id") ON DELETE set null ON UPDATE no action;

-- Pay-as-you-go credit
DO $$ BEGIN
  CREATE TYPE "public"."wallet_entry_type" AS ENUM('REGISTRATION_CREDIT', 'TOPUP', 'PICKUP_CHARGE', 'PICKUP_REFUND', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS "wallet_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "wallet_entry_type" NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"pickup_id" text,
	"payment_id" text,
	"note" text,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "credit_amount" integer DEFAULT 0 NOT NULL;
ALTER TABLE "pickup_requests" ADD COLUMN IF NOT EXISTS "bin_count" integer DEFAULT 1 NOT NULL;
ALTER TABLE "pickup_requests" ADD COLUMN IF NOT EXISTS "bin_price" integer DEFAULT 0 NOT NULL;
ALTER TABLE "pickup_requests" ADD COLUMN IF NOT EXISTS "charge" integer DEFAULT 0 NOT NULL;
ALTER TABLE "pickup_requests" ADD COLUMN IF NOT EXISTS "refunded_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "credit_balance" integer DEFAULT 0 NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallet_entries_user_id_users_id_fk') THEN
    ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallet_entries_pickup_id_pickup_requests_id_fk') THEN
    ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_pickup_id_pickup_requests_id_fk" FOREIGN KEY ("pickup_id") REFERENCES "public"."pickup_requests"("id") ON DELETE set null ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallet_entries_payment_id_payments_id_fk') THEN
    ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallet_entries_created_by_id_users_id_fk') THEN
    ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_credit_balance_nonneg') THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_credit_balance_nonneg" CHECK ("credit_balance" >= 0);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "wallet_user_idx" ON "wallet_entries" USING btree ("user_id","created_at");

-- Mark migrations as applied (so `npm run db:migrate` skips them)
CREATE SCHEMA IF NOT EXISTS "drizzle";
CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" ("id" SERIAL PRIMARY KEY, "hash" text NOT NULL, "created_at" bigint);
INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") SELECT '070ad5c07472e889a21c62120bf20ab239d829e44fe21bde8dd26e9e21fd1e39', 1791886365252 WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE "created_at" = 1791886365252);
INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") SELECT '3071cb3b0760df98034ce761be238bf25b653e8c39a644e8a0c46cde070b9062', 1791889780822 WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE "created_at" = 1791889780822);
INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") SELECT '297925d91a8c3ce5f540c0c5c32770ef23a6f8b7988e9c548174ce9dd2c686a9', 1791894826895 WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE "created_at" = 1791894826895);
INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") SELECT '01745902ef587ea6365e442cd62205de0d8a5f62bed0df5bec5ea20d7b88ee13', 1791896546033 WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE "created_at" = 1791896546033);
INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") SELECT 'b2701c91d2caa05beb397d84ce5d617fc9371c4c322c691b64629cac4a99eb34', 1791899933348 WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE "created_at" = 1791899933348);

-- Prices in naira (change any time in the app under Prices)
INSERT INTO "settings" ("key", "value") VALUES
  ('registration_fee', '5000'),     -- paid once to register a home
  ('registration_credit', '2000'),  -- part of the registration fee given back as pickup credit
  ('bin_price', '500'),             -- charged from credit per filled trash can
  ('soakaway_fee', '25000')
ON CONFLICT ("key") DO NOTHING;

-- Service areas (edit or add more later under Teams & areas)
INSERT INTO "zones" ("id", "name", "description") VALUES
  (gen_random_uuid()::text, 'Wuse', 'Wuse, Wuse II, Zone 1, Zone 2, Zone 3, Zone 4, Zone 5, Zone 6, Zone 7'),
  (gen_random_uuid()::text, 'Garki', 'Garki, Garki II, Area 1, Area 2, Area 3, Area 7, Area 8, Area 10, Area 11'),
  (gen_random_uuid()::text, 'Maitama', 'Maitama, Mpape'),
  (gen_random_uuid()::text, 'Asokoro', 'Asokoro, Guzape'),
  (gen_random_uuid()::text, 'Gwarinpa', 'Gwarinpa, Life Camp, Dawaki'),
  (gen_random_uuid()::text, 'Jabi & Utako', 'Jabi, Utako, Wuye, Mabushi'),
  (gen_random_uuid()::text, 'Kubwa', 'Kubwa, Dutse, Byazhin, Bwari'),
  (gen_random_uuid()::text, 'Lugbe & Airport Road', 'Lugbe, Kyami, Pyakasa, Airport Road')
ON CONFLICT ("name") DO NOTHING;

-- A starter crew that covers every area
INSERT INTO "teams" ("id", "name", "description")
VALUES (gen_random_uuid()::text, 'Central crew', 'Default crew covering every area')
ON CONFLICT ("name") DO NOTHING;
INSERT INTO "team_zones" ("team_id", "zone_id")
SELECT t."id", z."id" FROM "teams" t CROSS JOIN "zones" z WHERE t."name" = 'Central crew'
ON CONFLICT DO NOTHING;

-- Optional: promote an existing account to super admin
-- UPDATE "users" SET "role" = 'SUPER_ADMIN' WHERE "email" = 'you@example.com';
