-- ════════════════════════════════════════════════════════════════════
--  AreaCare — database update (pay-as-you-go credit, soakaway bookings,
--  cancelled payments)
--
--  Neon console → SQL Editor (database: neondb) → paste all → Run.
--  Safe to run more than once, and safe whether or not you ran an
--  earlier update. Nothing is deleted.
-- ════════════════════════════════════════════════════════════════════

-- New status values
ALTER TYPE "public"."payment_type" ADD VALUE IF NOT EXISTS 'SOAKAWAY';
ALTER TYPE "public"."payment_status" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "public"."payment_type" ADD VALUE IF NOT EXISTS 'TOPUP';
DO $$ BEGIN
  CREATE TYPE "public"."soakaway_status" AS ENUM('AWAITING_PAYMENT', 'PENDING_APPROVAL', 'SCHEDULED', 'COMPLETED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Soakaway bookings
CREATE TABLE IF NOT EXISTS "soakaway_bookings" (
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
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "booking_id" text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'soakaway_bookings_user_id_users_id_fk') THEN
    ALTER TABLE "soakaway_bookings" ADD CONSTRAINT "soakaway_bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'soakaway_bookings_zone_id_zones_id_fk') THEN
    ALTER TABLE "soakaway_bookings" ADD CONSTRAINT "soakaway_bookings_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'soakaway_bookings_approved_by_id_users_id_fk') THEN
    ALTER TABLE "soakaway_bookings" ADD CONSTRAINT "soakaway_bookings_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_booking_id_soakaway_bookings_id_fk') THEN
    ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_soakaway_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."soakaway_bookings"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "soakaway_status_idx" ON "soakaway_bookings" USING btree ("status","created_at");
CREATE INDEX IF NOT EXISTS "soakaway_user_idx" ON "soakaway_bookings" USING btree ("user_id","created_at");

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

-- Record the updates so `npm run db:migrate` won't try them again
INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") SELECT '297925d91a8c3ce5f540c0c5c32770ef23a6f8b7988e9c548174ce9dd2c686a9', 1791894826895 WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE "created_at" = 1791894826895);
INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") SELECT '01745902ef587ea6365e442cd62205de0d8a5f62bed0df5bec5ea20d7b88ee13', 1791896546033 WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE "created_at" = 1791896546033);
INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") SELECT 'b2701c91d2caa05beb397d84ce5d617fc9371c4c322c691b64629cac4a99eb34', 1791899933348 WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE "created_at" = 1791899933348);

-- Default soakaway price (change it in the app under Prices)
INSERT INTO "settings" ("key", "value") VALUES ('soakaway_fee', '25000') ON CONFLICT ("key") DO NOTHING;

-- Neighbourhood lists for "Use my current location" (only areas you haven't edited)
UPDATE "zones" SET "description" = 'Wuse, Wuse II, Zone 1, Zone 2, Zone 3, Zone 4, Zone 5, Zone 6, Zone 7' WHERE "name" = 'Wuse' AND "description" = 'Wuse I & II, Zone 1–7';
UPDATE "zones" SET "description" = 'Garki, Garki II, Area 1, Area 2, Area 3, Area 7, Area 8, Area 10, Area 11' WHERE "name" = 'Garki' AND "description" = 'Garki I & II, Area 1–11';
UPDATE "zones" SET "description" = 'Maitama, Mpape' WHERE "name" = 'Maitama' AND "description" = 'Maitama and Mpape axis';
UPDATE "zones" SET "description" = 'Asokoro, Guzape' WHERE "name" = 'Asokoro' AND "description" = 'Asokoro and Guzape';
UPDATE "zones" SET "description" = 'Gwarinpa, Life Camp, Dawaki' WHERE "name" = 'Gwarinpa' AND "description" = 'Gwarinpa estate and Life Camp';
UPDATE "zones" SET "description" = 'Jabi, Utako, Wuye, Mabushi' WHERE "name" = 'Jabi & Utako' AND "description" = 'Jabi, Utako, Wuye';
UPDATE "zones" SET "description" = 'Kubwa, Dutse, Byazhin, Bwari' WHERE "name" = 'Kubwa' AND "description" = 'Kubwa, Dutse, Byazhin';
UPDATE "zones" SET "description" = 'Lugbe, Kyami, Pyakasa, Airport Road' WHERE "name" = 'Lugbe & Airport Road' AND "description" = 'Lugbe, Kyami, Pyakasa';

-- Pay-as-you-go prices (change them in the app under Prices)
INSERT INTO "settings" ("key", "value") VALUES ('registration_credit', '2000'), ('bin_price', '500') ON CONFLICT ("key") DO NOTHING;

-- Monthly dues are gone: everyone who registered is simply active now
UPDATE "users" SET "membership_status" = 'ACTIVE' WHERE "membership_status" = 'OVERDUE';

-- Old monthly checkouts that are still unpaid: if the money arrives later, it becomes credit
UPDATE "payments" SET "credit_amount" = "amount" WHERE "type" = 'MONTHLY' AND "status"::text IN ('PENDING', 'CANCELLED') AND "credit_amount" = 0;

-- Optional: give members who registered under the old monthly plan ₦2,000 starting credit.
-- To use it, delete the "-- " at the start of the 6 lines below, then run. Running it twice does nothing extra.
-- WITH eligible AS (
--   SELECT "id" FROM "users" WHERE "registered_at" IS NOT NULL AND "role" = 'USER'
--     AND NOT EXISTS (SELECT 1 FROM "wallet_entries" w WHERE w."user_id" = "users"."id")
-- ), topped AS (
--   UPDATE "users" SET "credit_balance" = "credit_balance" + 2000 WHERE "id" IN (SELECT "id" FROM eligible) RETURNING "id", "credit_balance"
-- ) INSERT INTO "wallet_entries" ("id", "user_id", "type", "amount", "balance_after", "note") SELECT gen_random_uuid()::text, "id", 'ADJUSTMENT', 2000, "credit_balance", 'Starting credit (moved to pay-as-you-go)' FROM topped;
