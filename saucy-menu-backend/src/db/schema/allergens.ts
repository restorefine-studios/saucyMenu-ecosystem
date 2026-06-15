import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sessions } from "./users";
import { relations } from "drizzle-orm";
import { menuItemAllergens } from "./menu";

export const allergens = pgTable("allergens", {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text("name").unique().notNull(),
    translations: jsonb("translations").default({}),
    translationStatus: text("translation_status").$type<'pending' | 'completed' | 'failed'>().default('pending'),
    createdAt: timestamp("created_at").defaultNow(),
});


export const userSessionAllergens = pgTable("user_session_allergens", {
    sessionId: uuid("session_id").references(() => sessions.id).notNull(),
    allergenId: uuid("allergen_id").references(() => allergens.id).notNull(),
});

export const userSessionAllergensRelations = relations(userSessionAllergens, ({ one }) => ({
    session: one(sessions, {
        fields: [userSessionAllergens.sessionId],
        references: [sessions.id],
    }),
    allergen: one(allergens, {
        fields: [userSessionAllergens.allergenId],
        references: [allergens.id],
    }),
}));

export const allergensRelations = relations(allergens, ({ many }) => ({
    menuItemAllergens: many(menuItemAllergens),
}));
