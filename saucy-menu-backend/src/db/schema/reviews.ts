import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { restaurants } from "./restaurants";


export const reviews = pgTable("reviews", {
    id: uuid("id").defaultRandom().primaryKey(),
    reviewableId: uuid('reviewable_id').notNull(),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull(),
    restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
});