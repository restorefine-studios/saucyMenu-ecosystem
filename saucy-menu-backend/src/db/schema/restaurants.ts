import { AnyPgColumn, boolean, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { currencies } from "./system";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const restaurantSetupStatuses = pgEnum('retaurantSetupStatus', ['PENDING', 'COMPLETED', 'RELEASED'])

export const restaurants = pgTable("restaurants", {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text("name").unique(),
    address: text("address"),
    phone: text("phone"),
    website: text("website"),
    image: text("image"),
    bannerUrl: text("banner_url"),
    description: text("description"),
    color: text('color'),
    createdAt: timestamp("created_at").defaultNow(),
    currencyId: uuid("currencyId").references(() => currencies.id).notNull(),
    status: restaurantSetupStatuses("status").default('PENDING'),
    email: text("admin_email"),
    suspended: boolean('suspended').default(false).notNull(),
    suspendedAt: timestamp("suspended_at"),
    suspendedReason: text("suspended_reason"),
    suspendedBy: uuid("suspended_by").references((): AnyPgColumn => users.id),
});

export const restaurantsRelations = relations(restaurants, ({ one }) => ({
    currencies: one(currencies, {
        fields: [restaurants.currencyId],
        references: [currencies.id]
    }),
    user: one(users, {
        fields: [restaurants.id],
        references: [users.restaurantId]
    }),
}))