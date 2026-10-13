-- ════════════════════════════════════════════════════════════════════
--  AreaCare — database update: soakaway evacuation bookings
--
--  For a database you ALREADY set up with the earlier neon-setup.sql.
--    Neon console → SQL Editor (database: neondb) → paste → Run. Once only.
--  Nothing is deleted. Members, payments and pickups are kept.
-- ════════════════════════════════════════════════════════════════════

CREATE TYPE "public"."soakaway_status" AS ENUM('AWAITING_PAYMENT', 'PENDING_APPROVAL', 'SCHEDULED', 'COMPLETED', 'REJECTED', 'CANCELLED');
ALTER TYPE "public"."payment_type" ADD VALUE 'SOAKAWAY';
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

-- Record the update so `npm run db:migrate` won't try to apply it again
INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") SELECT '297925d91a8c3ce5f540c0c5c32770ef23a6f8b7988e9c548174ce9dd2c686a9', 1791894826895 WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE "created_at" = 1791894826895);

-- Default soakaway evacuation price (change it in the app under Prices)
INSERT INTO "settings" ("key", "value") VALUES ('soakaway_fee', '25000') ON CONFLICT ("key") DO NOTHING;

-- Neighbourhood lists help "Use my current location" pick the right area.
-- Only areas you haven't edited yourself are updated.
UPDATE "zones" SET "description" = 'Wuse, Wuse II, Zone 1, Zone 2, Zone 3, Zone 4, Zone 5, Zone 6, Zone 7' WHERE "name" = 'Wuse' AND "description" = 'Wuse I & II, Zone 1–7';
UPDATE "zones" SET "description" = 'Garki, Garki II, Area 1, Area 2, Area 3, Area 7, Area 8, Area 10, Area 11' WHERE "name" = 'Garki' AND "description" = 'Garki I & II, Area 1–11';
UPDATE "zones" SET "description" = 'Maitama, Mpape' WHERE "name" = 'Maitama' AND "description" = 'Maitama and Mpape axis';
UPDATE "zones" SET "description" = 'Asokoro, Guzape' WHERE "name" = 'Asokoro' AND "description" = 'Asokoro and Guzape';
UPDATE "zones" SET "description" = 'Gwarinpa, Life Camp, Dawaki' WHERE "name" = 'Gwarinpa' AND "description" = 'Gwarinpa estate and Life Camp';
UPDATE "zones" SET "description" = 'Jabi, Utako, Wuye, Mabushi' WHERE "name" = 'Jabi & Utako' AND "description" = 'Jabi, Utako, Wuye';
UPDATE "zones" SET "description" = 'Kubwa, Dutse, Byazhin, Bwari' WHERE "name" = 'Kubwa' AND "description" = 'Kubwa, Dutse, Byazhin';
UPDATE "zones" SET "description" = 'Lugbe, Kyami, Pyakasa, Airport Road' WHERE "name" = 'Lugbe & Airport Road' AND "description" = 'Lugbe, Kyami, Pyakasa';
