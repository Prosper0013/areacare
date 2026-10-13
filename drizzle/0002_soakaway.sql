CREATE TYPE "public"."soakaway_status" AS ENUM('AWAITING_PAYMENT', 'PENDING_APPROVAL', 'SCHEDULED', 'COMPLETED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
ALTER TYPE "public"."payment_type" ADD VALUE 'SOAKAWAY';--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "booking_id" text;--> statement-breakpoint
ALTER TABLE "soakaway_bookings" ADD CONSTRAINT "soakaway_bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soakaway_bookings" ADD CONSTRAINT "soakaway_bookings_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soakaway_bookings" ADD CONSTRAINT "soakaway_bookings_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "soakaway_status_idx" ON "soakaway_bookings" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "soakaway_user_idx" ON "soakaway_bookings" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_soakaway_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."soakaway_bookings"("id") ON DELETE set null ON UPDATE no action;