import { boolean, index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { restaurants } from "./restaurants";
import { languages } from "./system";
import { relations } from "drizzle-orm";
import { tags } from "./tags";


// export const userRoles = pgEnum("user_roles", ["SUPER_ADMIN", "ADMIN"]);
export const setupStatuses = pgEnum("setup_status", ["PENDING", "COMPLETED"])

export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    // role: userRoles("role").notNull(),
    restaurantId: uuid("restaurant_id").references(() => restaurants.id), // Super admins have null
    languageId: uuid("language_id").references(() => languages.id),
    setupComplete: boolean("setup_complete").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    suspended: boolean('suspended').default(false),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
    role: text("role").default('user'),
    banned: boolean("banned").default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires"),
});


// export const subscriptions = pgTable("subscriptions", {
//     id: uuid("id").defaultRandom().primaryKey(),
//     userId: uuid("user_id").references(() => users.id).notNull(),
//     stripeId: text("stripe_id").notNull(),
//     createdAt: timestamp("created_at").defaultNow(),
//     canceledAt: timestamp("canceled_at"),

// });

export const userSubscriptions = pgTable('user_subscriptions', {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().unique().references(() => users.id), // assuming users table
    stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
    stripeCustomerId: text('stripe_customer_id').notNull(), // redundant but handy
    priceId: text('price_id'),
    status: text('status'), // active, trialing, canceled, etc.
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
    currentPeriodStart: timestamp('current_period_start', { mode: 'date' }),
    currentPeriodEnd: timestamp('current_period_end'),
    canceledAt: timestamp('canceled_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    planId: uuid('plan_id').references(() => subscriptionPlans.id),
    canceled: boolean('canceled').default(false),
})

export const subscriptionUserRelations = relations(userSubscriptions, ({ one }) => ({
    user: one(users, {
        fields: [userSubscriptions.userId],
        references: [users.id],
    }),
    plan: one(subscriptionPlans, {
        fields: [userSubscriptions.planId],
        references: [subscriptionPlans.id],
    })
}));

export const subscriptionPlans = pgTable("subscriptions_plans", {
    id: uuid("id").defaultRandom().primaryKey(),
    stripeProductId: text('product_id').notNull(),
    name: text("name").notNull().unique(),
    stripePriceId: text("price_id"),
    createdAt: timestamp("created_at").defaultNow(),
});

export const userRelations = relations(users, ({ one }) => ({
    language: one(languages, {
        fields: [users.languageId],
        references: [languages.id],
    }),
    restaurant: one(restaurants, {
        fields: [users.restaurantId],
        references: [restaurants.id],
    }),


}));

export const pendingStripeEvents = pgTable('pending_stripe_events', {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: text('event_id').notNull().unique(), // Stripe event.id, for idempotency
    eventType: text('event_type').notNull(),
    relatedId: text('related_id'), // e.g., subscriptionId or customerId
    payload: text('payload').notNull(), // JSON-stringified body
    receivedAt: timestamp('received_at').defaultNow().notNull(),
})

// Unique session for each user (scanned QR code)
export const sessions = pgTable("user_sessions", {
    id: uuid('id').defaultRandom().primaryKey(), // Randomly generated session ID
    restaurantId: uuid("restaurant_id").references(() => restaurants.id),
    createdAt: timestamp("created_at").defaultNow(),
    preferenceSetupComplete: boolean('preference_setup_complete').default(false),
});


export const sessionTags = pgTable('session_tags', {
    sessionId: uuid('session_id').references(() => sessions.id).notNull(),
    tagId: uuid('tag_id').references(() => tags.id).notNull(),
});

export const sessionTagsRelations = relations(sessionTags, ({ one }) => ({
    tags: one(tags, {
        fields: [sessionTags.tagId],
        references: [tags.id],
    })
}));


// export const sessionDiet = pgTable('session_diets', {
//     sessionId: uuid('session_id').references(() => sessions.id).notNull(),
//     dietTypeId: uuid('diet_type_id').references(() => diets.id).notNull(),
// });

// export const sessionAllergies = pgTable('session_allergies', {
//     sessionId: uuid('session_id').references(() => sessions.id).notNull(),
//     allergyId: uuid('allergy_id').references(() => ingredients.id).notNull(),
// });

// export const sessionCuisines = pgTable('session_cuisines', {
//     sessionId: uuid('session_id').references(() => sessions.id).notNull(),
//     cuisineId: uuid('cuisine_id').references(() => cuisines.id).notNull(),
// });


export const userRestaurantRelations = relations(users, ({ one }) => ({
    restaurant: one(restaurants, {
        fields: [users.restaurantId],
        references: [restaurants.id],
    })
}));


export const aiUsageLogs = pgTable('ai_usage_logs', {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: text('session_id').notNull(),
    subscriptionId: text('subscription_id').notNull(),
    usedTokens: integer('used_tokens').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    restaurantId: uuid('restaurant_id').notNull().references(() => restaurants.id)
}, (usage) =>
    [index('idx_ai_usage_restaurant_id').on(usage.restaurantId)]
);