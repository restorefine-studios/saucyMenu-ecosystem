-- >>> ../saucy-menu-backend/drizzle/0000_soft_robin_chapel.sql
CREATE TYPE "public"."setup_status" AS ENUM('PENDING', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."user_roles" AS ENUM('SUPER_ADMIN', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."retaurantSetupStatus" AS ENUM('PENDING', 'COMPLETED', 'RELEASED');--> statement-breakpoint
CREATE TYPE "public"."tag_type" AS ENUM('diet', 'cuisine', 'dish_type', 'allergen', 'drink_type');--> statement-breakpoint
CREATE TYPE "public"."spice_level" AS ENUM('', 'mild', 'medium', 'spicy', 'very_spicy');--> statement-breakpoint
CREATE TYPE "public"."translation_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "ai_usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"subscription_id" text NOT NULL,
	"used_tokens" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"restaurant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_stripe_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"related_id" text,
	"payload" text NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pending_stripe_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "session_tags" (
	"session_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"preference_setup_complete" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "subscriptions_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"price_id" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "subscriptions_plans_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"price_id" text,
	"status" text,
	"cancel_at_period_end" boolean DEFAULT false,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"plan_id" uuid,
	"canceled" boolean DEFAULT false,
	CONSTRAINT "user_subscriptions_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "user_subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"role" "user_roles" NOT NULL,
	"restaurant_id" uuid,
	"language_id" uuid,
	"setup_complete" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"suspended" boolean DEFAULT false,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"address" text,
	"phone" text,
	"website" text,
	"image" text,
	"banner_url" text,
	"description" text,
	"color" text,
	"created_at" timestamp DEFAULT now(),
	"currencyId" uuid NOT NULL,
	"status" "retaurantSetupStatus" DEFAULT 'PENDING',
	"admin_email" text,
	"suspended" boolean DEFAULT false,
	CONSTRAINT "restaurants_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reviewable_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text NOT NULL,
	"email" text,
	"restaurant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "allergens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"translations" jsonb DEFAULT '{}'::jsonb,
	"translation_status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "allergens_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_session_allergens" (
	"session_id" uuid NOT NULL,
	"allergen_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	CONSTRAINT "currencies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"flag" text,
	CONSTRAINT "languages_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "menu_item_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"type" "tag_type" NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"description" text,
	"translations" jsonb,
	"translation_status" "translation_status" DEFAULT 'pending',
	"restaurant_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_session_tags" (
	"session_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid,
	"name" text NOT NULL,
	"translations" jsonb DEFAULT '{}'::jsonb,
	"translation_status" text DEFAULT 'pending',
	"price" numeric(10, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"translations" jsonb DEFAULT '{}'::jsonb,
	"translation_status" text DEFAULT 'pending',
	"active" boolean DEFAULT true,
	"start_time" varchar(10),
	"end_time" varchar(10),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_item_addons" (
	"item_id" uuid NOT NULL,
	"addon_id" uuid
);
--> statement-breakpoint
CREATE TABLE "menu_item_allergens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"allergen_id" uuid NOT NULL,
	"severity" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "menu_item_units_new" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"translations" jsonb DEFAULT '{}'::jsonb,
	"translation_status" text DEFAULT 'pending',
	"symbol" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_item_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"translations" jsonb DEFAULT '{}'::jsonb,
	"translation_status" text DEFAULT 'pending',
	"name" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"is_available" boolean DEFAULT true,
	"image" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid,
	"restaurant_id" uuid NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"translations" jsonb DEFAULT '{}'::jsonb,
	"translation_status" text DEFAULT 'pending',
	"ingredients" text[] DEFAULT '{}',
	"images" text[],
	"price" numeric(10, 2),
	"discount_type" text,
	"discount_value" numeric,
	"discount_start_at" timestamp,
	"discount_end_at" timestamp,
	"discount_label" text,
	"is_available" boolean DEFAULT true,
	"spice_level" "spice_level",
	"cook_time" integer,
	"is_alcoholic" boolean,
	"has_variants" boolean DEFAULT false,
	"is_chefs_recommended" boolean DEFAULT false,
	"is_popular" boolean DEFAULT false,
	"is_new" boolean DEFAULT false,
	"is_limited_time" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"translations" jsonb DEFAULT '{}'::jsonb,
	"translation_status" text DEFAULT 'pending',
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_tags" ADD CONSTRAINT "session_tags_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_tags" ADD CONSTRAINT "session_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_plan_id_subscriptions_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscriptions_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_language_id_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_currencyId_currencies_id_fk" FOREIGN KEY ("currencyId") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_session_allergens" ADD CONSTRAINT "user_session_allergens_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_session_allergens" ADD CONSTRAINT "user_session_allergens_allergen_id_allergens_id_fk" FOREIGN KEY ("allergen_id") REFERENCES "public"."allergens"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_tags" ADD CONSTRAINT "menu_item_tags_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_tags" ADD CONSTRAINT "menu_item_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_session_tags" ADD CONSTRAINT "user_session_tags_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_session_tags" ADD CONSTRAINT "user_session_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addons" ADD CONSTRAINT "addons_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu" ADD CONSTRAINT "menu_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_addons" ADD CONSTRAINT "menu_item_addons_item_id_menu_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_addons" ADD CONSTRAINT "menu_item_addons_addon_id_addons_id_fk" FOREIGN KEY ("addon_id") REFERENCES "public"."addons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_allergens" ADD CONSTRAINT "menu_item_allergens_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_allergens" ADD CONSTRAINT "menu_item_allergens_allergen_id_allergens_id_fk" FOREIGN KEY ("allergen_id") REFERENCES "public"."allergens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_variants" ADD CONSTRAINT "menu_item_variants_item_id_menu_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_section_id_menu_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."menu_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_sections" ADD CONSTRAINT "menu_sections_menu_id_menu_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_usage_restaurant_id" ON "ai_usage_logs" USING btree ("restaurant_id");
-- >>> ../saucy-menu-backend/drizzle/0001_skinny_red_ghost.sql
ALTER TABLE "menu_items" DROP CONSTRAINT "menu_items_section_id_menu_sections_id_fk";
--> statement-breakpoint
ALTER TABLE "menu_sections" DROP CONSTRAINT "menu_sections_menu_id_menu_id_fk";
--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_section_id_menu_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."menu_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_sections" ADD CONSTRAINT "menu_sections_menu_id_menu_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menu"("id") ON DELETE cascade ON UPDATE no action;
-- >>> ../saucy-menu-backend/drizzle/0002_wet_freak.sql
ALTER TABLE "languages" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "languages" ADD COLUMN "sort_order" integer DEFAULT 0;
-- >>> ../saucy-menu-backend/drizzle/0003_icy_firebrand.sql
CREATE TYPE "public"."audit_action" AS ENUM('CREATE', 'UPDATE', 'DELETE');--> statement-breakpoint
CREATE TYPE "public"."audit_entity" AS ENUM('menu', 'menu_item', 'menu_section', 'user', 'diets', 'allergens', 'addons');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity" "audit_entity" NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"performed_by" uuid,
	"before" jsonb,
	"after" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_performed_by_idx" ON "audit_logs" USING btree ("performed_by");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");
-- >>> ../saucy-menu-backend/drizzle/0004_chemical_network.sql
ALTER TABLE "audit_logs" ADD COLUMN "restaurant_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE set null ON UPDATE no action;
-- >>> ../saucy-menu-backend/drizzle/0005_thin_justin_hammer.sql
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role_new" text;

UPDATE "users" SET "role_new" = "role"::text;
ALTER TABLE "users" DROP COLUMN "role";
ALTER TABLE "users" RENAME COLUMN "role_new" TO "role";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'ADMIN';
DROP TYPE IF EXISTS "user_roles";

ALTER TABLE "users" ALTER COLUMN "role" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ban_expires" timestamp;
-- >>> ../saucy-menu-backend/drizzle/0006_optimal_invaders.sql
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" RENAME TO "user_sessions";--> statement-breakpoint
ALTER TABLE "session_tags" DROP CONSTRAINT "session_tags_session_id_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "user_sessions" DROP CONSTRAINT "sessions_restaurant_id_restaurants_id_fk";
--> statement-breakpoint
ALTER TABLE "user_session_allergens" DROP CONSTRAINT "user_session_allergens_session_id_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "user_session_tags" DROP CONSTRAINT "user_session_tags_session_id_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
ALTER TABLE "session_tags" ADD CONSTRAINT "session_tags_session_id_user_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."user_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_session_allergens" ADD CONSTRAINT "user_session_allergens_session_id_user_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."user_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_session_tags" ADD CONSTRAINT "user_session_tags_session_id_user_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."user_sessions"("id") ON DELETE no action ON UPDATE no action;
-- >>> ../saucy-menu-backend/drizzle/0007_messy_enchantress.sql
INSERT INTO "account" (
    id,
    account_id,
    provider_id,
    user_id,
    password,
    created_at,
    updated_at
)
SELECT
    pg_catalog.gen_random_uuid(),  -- generate new UUID for each account
    id::text,                       -- accountId = the user's own id (credential provider convention)
    'credential',                   -- providerId for email/password auth in better-auth
    id,                             -- userId foreign key
    password,                       -- migrate the password across
    created_at,
    updated_at
FROM "users"
WHERE password IS NOT NULL;        -- only users with a password (skip OAuth-only users)

ALTER TABLE "users" DROP COLUMN "password";--> statement-breakpoint
-- >>> ../saucy-menu-backend/drizzle/0008_youthful_lady_ursula.sql
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';
-- >>> ../saucy-menu-backend/drizzle/0009_bored_jean_grey.sql
ALTER TABLE "restaurants" ALTER COLUMN "suspended" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "suspended_at" timestamp;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "suspended_reason" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "suspended_by" uuid;--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_suspended_by_users_id_fk" FOREIGN KEY ("suspended_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
-- >>> slug column for friendly URLs
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "slug" text;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_restaurants_slug" ON "restaurants" ("slug");
-- >>> ../saucy-menu-backend/drizzle/0010_multitenant_indexes.sql
CREATE INDEX IF NOT EXISTS "idx_menu_restaurant_id" ON "menu" USING btree ("restaurant_id");
CREATE INDEX IF NOT EXISTS "idx_menu_items_restaurant_id" ON "menu_items" USING btree ("restaurant_id");
CREATE INDEX IF NOT EXISTS "idx_menu_sections_menu_id" ON "menu_sections" USING btree ("menu_id");
CREATE INDEX IF NOT EXISTS "idx_menu_items_section_id" ON "menu_items" USING btree ("section_id");
CREATE INDEX IF NOT EXISTS "idx_tags_restaurant_id" ON "tags" USING btree ("restaurant_id");
CREATE INDEX IF NOT EXISTS "idx_addons_restaurant_id" ON "addons" USING btree ("restaurant_id");
CREATE INDEX IF NOT EXISTS "idx_reviews_restaurant_id" ON "reviews" USING btree ("restaurant_id");
CREATE INDEX IF NOT EXISTS "idx_user_sessions_restaurant_id" ON "user_sessions" USING btree ("restaurant_id");
CREATE INDEX IF NOT EXISTS "idx_users_restaurant_id" ON "users" USING btree ("restaurant_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_restaurant_id" ON "audit_logs" USING btree ("restaurant_id");
CREATE INDEX IF NOT EXISTS "idx_user_subscriptions_user_id" ON "user_subscriptions" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_tags_type_restaurant_id" ON "tags" USING btree ("type", "restaurant_id");
CREATE INDEX IF NOT EXISTS "idx_menu_item_tags_menu_item_id" ON "menu_item_tags" USING btree ("menu_item_id");
CREATE INDEX IF NOT EXISTS "idx_menu_item_allergens_menu_item_id" ON "menu_item_allergens" USING btree ("menu_item_id");
CREATE INDEX IF NOT EXISTS "idx_menu_item_addons_item_id" ON "menu_item_addons" USING btree ("item_id");
CREATE INDEX IF NOT EXISTS "idx_menu_item_variants_item_id" ON "menu_item_variants" USING btree ("item_id");

-- >>> passkey_credentials for WebAuthn / Face ID login
CREATE TABLE IF NOT EXISTS passkey_credentials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key    BYTEA NOT NULL,
  sign_count    BIGINT NOT NULL DEFAULT 0,
  aaguid        TEXT NOT NULL DEFAULT '',
  device_name   TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS passkey_credentials_user_id_idx ON passkey_credentials(user_id);

-- >>> form_field_configs for metadata-driven dish-item picker fields
CREATE TABLE IF NOT EXISTS form_field_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_key    TEXT UNIQUE NOT NULL,
  config      JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID
);

INSERT INTO form_field_configs (form_key, config)
VALUES (
  'dish_item',
  '{
    "fields": [
      { "key": "allergens", "label": "Allergens", "visible": true, "required": false, "sortOrder": 0, "optionsSource": { "type": "lookup", "endpoint": "/admin/classifications/allergens" } },
      { "key": "diets", "label": "Diets", "visible": true, "required": false, "sortOrder": 1, "optionsSource": { "type": "lookup", "endpoint": "/admin/classifications/diets" } },
      { "key": "addons", "label": "Add-ons", "visible": true, "required": false, "sortOrder": 2, "optionsSource": { "type": "lookup", "endpoint": "/admin/addons" } },
      { "key": "ingredients", "label": "Ingredients", "visible": true, "required": false, "sortOrder": 3, "optionsSource": { "type": "freetext" } }
    ]
  }'::jsonb
)
ON CONFLICT (form_key) DO NOTHING;
