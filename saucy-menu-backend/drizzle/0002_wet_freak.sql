ALTER TABLE "languages" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "languages" ADD COLUMN "sort_order" integer DEFAULT 0;