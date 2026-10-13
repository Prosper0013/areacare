CREATE TYPE "public"."wallet_entry_type" AS ENUM('REGISTRATION_CREDIT', 'TOPUP', 'PICKUP_CHARGE', 'PICKUP_REFUND', 'ADJUSTMENT');--> statement-breakpoint
ALTER TYPE "public"."payment_type" ADD VALUE 'TOPUP';--> statement-breakpoint
CREATE TABLE "wallet_entries" (
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
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "credit_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD COLUMN "bin_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD COLUMN "bin_price" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD COLUMN "charge" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD COLUMN "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "credit_balance" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_pickup_id_pickup_requests_id_fk" FOREIGN KEY ("pickup_id") REFERENCES "public"."pickup_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wallet_user_idx" ON "wallet_entries" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_credit_balance_nonneg" CHECK ("credit_balance" >= 0);--> statement-breakpoint
UPDATE "users" SET "membership_status" = 'ACTIVE' WHERE "membership_status" = 'OVERDUE';--> statement-breakpoint
INSERT INTO "settings" ("key", "value") VALUES ('registration_credit', '2000'), ('bin_price', '500') ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
UPDATE "payments" SET "credit_amount" = "amount" WHERE "type" = 'MONTHLY' AND "status" IN ('PENDING', 'CANCELLED');
