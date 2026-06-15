import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { restaurants } from "./restaurants";
import { relations } from "drizzle-orm";
import { menuItems, translationStatusEnum } from "./menu";
import { sessions } from "./users";


export const tagTypeEnum = pgEnum("tag_type", [
    "diet",
    "cuisine",
    "dish_type",
    "allergen",
    "drink_type"
]);

export const tags = pgTable("tags", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    key: text("key").notNull(),
    type: tagTypeEnum("type").notNull(),
    isSystem: boolean("is_system").default(false).notNull(),
    description: text("description"),
    translations: jsonb("translations"),
    translationStatus: translationStatusEnum("translation_status").default('pending'),
    restaurantId: uuid("restaurant_id")
        .references(() => restaurants.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
});

export const userSessionTags = pgTable("user_session_tags", {
    sessionId: uuid("session_id").references(() => sessions.id).notNull(),
    tagId: uuid("tag_id").references(() => tags.id).notNull(),
});

export const userSessionTagsRelations = relations(userSessionTags, ({ one }) => ({
    session: one(sessions, {
        fields: [userSessionTags.sessionId],
        references: [sessions.id],
    }),
    tag: one(tags, {
        fields: [userSessionTags.tagId],
        references: [tags.id],
    }),
}));


export const menuItemTags = pgTable("menu_item_tags", {
    id: uuid("id").defaultRandom().primaryKey(),
    menuItemId: uuid("menu_item_id")
        .references(() => menuItems.id, { onDelete: "cascade" })
        .notNull(),
    tagId: uuid("tag_id")
        .references(() => tags.id, { onDelete: "cascade" })
        .notNull(),
});

export const menuItemTagsRelations = relations(menuItemTags, ({ one }) => ({
    tag: one(tags, {
        fields: [menuItemTags.tagId],
        references: [tags.id],
    }),
    menuItem: one(menuItems, {
        fields: [menuItemTags.menuItemId],
        references: [menuItems.id],
    }),
}));


// export const dishesRelations = relations(dishes, ({ many }) => ({
// }));
