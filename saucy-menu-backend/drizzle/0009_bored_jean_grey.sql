ALTER TABLE "restaurants" ALTER COLUMN "suspended" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "suspended_at" timestamp;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "suspended_reason" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "suspended_by" uuid;--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_suspended_by_users_id_fk" FOREIGN KEY ("suspended_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;