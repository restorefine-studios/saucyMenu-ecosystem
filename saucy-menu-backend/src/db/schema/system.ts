import { boolean, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const currencies = pgTable("currencies", {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),       // e.g., 'USD', 'EUR', 'GHS'
    name: text("name").notNull(),                // e.g., 'US Dollar'
    symbol: text("symbol").notNull(),            // e.g., '$'
});

export const languages = pgTable("languages", {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),       // e.g., 'en', 'fr', 'es'
    name: text("name").notNull(),                // e.g., 'English', 'French', 'Spanish'
    flag: text("flag"),                // e.g., '🇺🇸', '🇫🇷', '🇪🇸'
    isActive: boolean("is_active").default(true),
    sortOrder: integer("sort_order").default(0),
});