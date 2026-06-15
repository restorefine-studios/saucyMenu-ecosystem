-- Multi-tenant performance indexes
-- Every table with restaurant_id is queried with WHERE restaurant_id = $1 on every request.
-- Without indexes, Postgres does a full table scan per restaurant per query.

-- Hot read paths (diner app + admin dashboard)
CREATE INDEX IF NOT EXISTS "idx_menu_restaurant_id" ON "menu" USING btree ("restaurant_id");
CREATE INDEX IF NOT EXISTS "idx_menu_items_restaurant_id" ON "menu_items" USING btree ("restaurant_id");

-- Needed for section → menu → restaurant joins used in all section/item queries
CREATE INDEX IF NOT EXISTS "idx_menu_sections_menu_id" ON "menu_sections" USING btree ("menu_id");
-- Also needed for item lookups by section
CREATE INDEX IF NOT EXISTS "idx_menu_items_section_id" ON "menu_items" USING btree ("section_id");

-- Admin CRUD paths
CREATE INDEX IF NOT EXISTS "idx_tags_restaurant_id" ON "tags" USING btree ("restaurant_id");
CREATE INDEX IF NOT EXISTS "idx_addons_restaurant_id" ON "addons" USING btree ("restaurant_id");
CREATE INDEX IF NOT EXISTS "idx_reviews_restaurant_id" ON "reviews" USING btree ("restaurant_id");

-- Diner session paths
CREATE INDEX IF NOT EXISTS "idx_user_sessions_restaurant_id" ON "user_sessions" USING btree ("restaurant_id");

-- Auth + user lookup paths
CREATE INDEX IF NOT EXISTS "idx_users_restaurant_id" ON "users" USING btree ("restaurant_id");

-- Stats + audit paths
CREATE INDEX IF NOT EXISTS "idx_audit_logs_restaurant_id" ON "audit_logs" USING btree ("restaurant_id");
CREATE INDEX IF NOT EXISTS "idx_user_subscriptions_user_id" ON "user_subscriptions" USING btree ("user_id");

-- Tag type filter (used in diet/allergen queries alongside restaurant_id)
CREATE INDEX IF NOT EXISTS "idx_tags_type_restaurant_id" ON "tags" USING btree ("type", "restaurant_id");

-- Menu item relation tables — scanned for every item detail load
CREATE INDEX IF NOT EXISTS "idx_menu_item_tags_menu_item_id" ON "menu_item_tags" USING btree ("menu_item_id");
CREATE INDEX IF NOT EXISTS "idx_menu_item_allergens_menu_item_id" ON "menu_item_allergens" USING btree ("menu_item_id");
CREATE INDEX IF NOT EXISTS "idx_menu_item_addons_item_id" ON "menu_item_addons" USING btree ("item_id");
CREATE INDEX IF NOT EXISTS "idx_menu_item_variants_item_id" ON "menu_item_variants" USING btree ("item_id");
