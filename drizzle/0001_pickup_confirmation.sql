ALTER TYPE "public"."pickup_status" ADD VALUE 'AWAITING_CONFIRMATION' BEFORE 'COMPLETED';--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD COLUMN "cleared_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD COLUMN "cleared_by_id" text;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD COLUMN "cleared_note" text;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD COLUMN "confirmed_by" text;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD COLUMN "confirm_reminders" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD COLUMN "last_reminder_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD COLUMN "escalated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD COLUMN "reopened_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD COLUMN "reopen_note" text;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD COLUMN "reopened_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_cleared_by_id_users_id_fk" FOREIGN KEY ("cleared_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;