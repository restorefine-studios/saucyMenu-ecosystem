import { boolean, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { restaurants } from "./restaurants";
import { relations } from "drizzle-orm";
import { menuItemTags, tags } from "./tags";
import { allergens } from "./allergens";

export const spiceLevel = pgEnum("spice_level", ["", "mild", "medium", "spicy", "very_spicy"]);
export const translationStatusEnum = pgEnum("translation_status", ["pending", "completed", "failed"]);

export const menu = pgTable('menu', {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id').references(() => restaurants.id).notNull(),
    name: text('name').notNull(),
    description: text('description'),
    translations: jsonb("translations").default({}),
    translationStatus: text("translation_status").$type<'pending' | 'completed' | 'failed'>().default('pending'),
    active: boolean("active").default(true),
    startTime: varchar("start_time", { length: 10 }),
    endTime: varchar("end_time", { length: 10 }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

export const menuSections = pgTable("menu_sections", {
    id: uuid("id").primaryKey().defaultRandom(),
    menuId: uuid("menu_id").references(() => menu.id, { onDelete: "cascade" }).notNull(),
    name: text("name").notNull(),
    description: text("description"),
    translations: jsonb("translations").default({}),
    translationStatus: text("translation_status").$type<'pending' | 'completed' | 'failed'>().default('pending'),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
});

export const menuItems = pgTable('menu_items', {
    id: uuid('id').defaultRandom().primaryKey(),
    sectionId: uuid("section_id").references(() => menuSections.id, { onDelete: "cascade" }),
    restaurantId: uuid('restaurant_id')
        .references(() => restaurants.id, { onDelete: 'cascade' })
        .notNull(),
    type: text('type').$type<'dish' | 'drink'>().notNull(),
    name: text('name').notNull(),
    description: text('description'),
    translations: jsonb("translations").default({}),
    translationStatus: text("translation_status").$type<'pending' | 'completed' | 'failed'>().default('pending'),
    ingredients: text('ingredients').array().default([]),
    images: text('images').array(),
    price: numeric('price', { precision: 10, scale: 2 }),
    discountType: text("discount_type").$type<'percentage' | 'fixed'>(),
    discountValue: numeric("discount_value"),
    discountStartAt: timestamp("discount_start_at"),
    discountEndAt: timestamp("discount_end_at"),
    discountLabel: text("discount_label"),// e.g. "20% OFF", "Happy Hour", "Chef Special"
    isAvailable: boolean('is_available').default(true),
    spiceLevel: spiceLevel('spice_level'),
    cookTime: integer('cook_time'),
    isAlcoholic: boolean('is_alcoholic'),
    hasVariants: boolean('has_variants').default(false),
    isChefsRecommended: boolean("is_chefs_recommended").default(false),
    isPopular: boolean("is_popular").default(false),
    isNew: boolean("is_new").default(false),
    isLimitedTime: boolean("is_limited_time").default(false),
    createdAt: timestamp('created_at').defaultNow(),
});

export const menuItemVariants = pgTable('menu_item_variants', {
    id: uuid('id').defaultRandom().primaryKey(),
    itemId: uuid('item_id').references(() => menuItems.id, { onDelete: "cascade" }).notNull(),
    translations: jsonb("translations").default({}),
    translationStatus: text("translation_status").$type<'pending' | 'completed' | 'failed'>().default('pending'),
    name: text('name').notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    isAvailable: boolean('is_available').default(true),
    createdAt: timestamp('created_at').defaultNow(),
});

export const menuItemUnits = pgTable('menu_item_units_new', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    translations: jsonb("translations").default({}),
    translationStatus: text("translation_status").$type<'pending' | 'completed' | 'failed'>().default('pending'),
    symbol: text('symbol'),
    createdAt: timestamp('created_at').defaultNow(),

});

export const addons = pgTable("addons", {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id").references(() => restaurants.id),
    name: text("name").notNull(),
    translations: jsonb("translations").default({}),
    translationStatus: text("translation_status").$type<'pending' | 'completed' | 'failed'>().default('pending'),
    price: numeric("price", { precision: 10, scale: 2 }).default("0"),
    createdAt: timestamp('created_at').defaultNow(),
});

export const menuItemAddons = pgTable("menu_item_addons", {
    itemId: uuid("item_id").references(() => menuItems.id, { onDelete: "cascade" }).notNull(),
    addonId: uuid("addon_id").references(() => addons.id),
});

export const menuItemAllergens = pgTable("menu_item_allergens", {
    id: uuid("id").defaultRandom().primaryKey(),
    menuItemId: uuid("menu_item_id")
        .references(() => menuItems.id, { onDelete: "cascade" })
        .notNull(),
    allergenId: uuid("allergen_id")
        .references(() => allergens.id, { onDelete: "cascade" })
        .notNull(),
    severity: varchar("severity", { length: 20 }),
    // "contains" | "may_contain" | "cross_contact"
});

export const menuRelations = relations(menu, ({ one, many }) => ({
    items: many(menuItems),
    restaurant: one(restaurants, {
        fields: [menu.restaurantId],
        references: [restaurants.id]
    }),
    sections: many(menuSections),
}))


export const menuItemRelations = relations(menuItems, ({ one, many }) => ({
    variants: many(menuItemVariants),
    restaurants: one(restaurants, {
        fields: [menuItems.restaurantId],
        references: [restaurants.id]
    }),
    tags: many(menuItemTags),
    section: one(menuSections, {
        fields: [menuItems.sectionId],
        references: [menuSections.id],
    }),
    allergens: many(menuItemAllergens),
    addons: many(menuItemAddons),
}))

export const menuItemAllergensRelations = relations(menuItemAllergens, ({ one }) => ({
    allergen: one(allergens, {
        fields: [menuItemAllergens.allergenId],
        references: [allergens.id],
    }),
    menuItem: one(menuItems, {
        fields: [menuItemAllergens.menuItemId],
        references: [menuItems.id],
    }),
}))



export const menuItemAddonsRelations = relations(menuItemAddons, ({ one }) => ({
    addon: one(addons, {
        fields: [menuItemAddons.addonId],
        references: [addons.id],
    }),
    menuItem: one(menuItems, {
        fields: [menuItemAddons.itemId],
        references: [menuItems.id],
    }),
}))

export const menuSectionRelations = relations(menuSections, ({ one, many }) => ({
    menu: one(menu, {
        fields: [menuSections.menuId],
        references: [menu.id],
    }),
    items: many(menuItems),
}))

// export const menuItemVariantsRelations = relations(menuItemVariants, ({ one, many }) => ({
//     drink: one(menuItems, {
//         fields: [menuItemVariants.menuItemId],
//         references: [menuItems.id]
//     }),
//     unit: one(menuItemUnits, {
//         fields: [menuItemVariants.unitId],
//         references: [menuItemUnits.id]
//     }),
// }))
