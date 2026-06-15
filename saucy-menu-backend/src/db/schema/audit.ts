import { pgTable, uuid, text, timestamp, jsonb, pgEnum, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { restaurants } from "./restaurants";
import { relations } from "drizzle-orm";


// --- Enums ---

export const auditActionEnum = pgEnum("audit_action", [
    "CREATE",
    "UPDATE",
    "DELETE",
]);

export const auditEntityEnum = pgEnum("audit_entity", [
    "menu",
    "menu_item",
    "menu_section",
    "user",
    "diets",
    "allergens",
    "addons",
]);

// --- Audit Log Table ---

export const auditLogs = pgTable(
    "audit_logs",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        entity: auditEntityEnum("entity").notNull(),
        entityId: uuid("entity_id").notNull(),
        action: auditActionEnum("action").notNull(),
        performedBy: uuid("performed_by").references(() => users.id, {
            onDelete: "set null",
        }),

        before: jsonb("before"), // null on CREATE
        after: jsonb("after"),   // null on DELETE
        metadata: jsonb("metadata"),
        restaurantId: uuid("restaurant_id").references(() => restaurants.id, {
            onDelete: "set null",
        }),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        // Efficiently query all audit logs for a specific record
        index("audit_logs_entity_entity_id_idx").on(
            table.entity,
            table.entityId
        ),
        // Efficiently query all actions by a specific user
        index("audit_logs_performed_by_idx").on(table.performedBy),
        // Efficiently query logs within a time range
        index("audit_logs_created_at_idx").on(table.createdAt),
    ]
);

// relations

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
    user: one(users, {
        fields: [auditLogs.performedBy],
        references: [users.id],
    }),
    restaurant: one(restaurants, {
        fields: [auditLogs.restaurantId],
        references: [restaurants.id],
    }),
}));

// --- Types ---

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type AuditAction = (typeof auditActionEnum.enumValues)[number];
export type AuditEntity = (typeof auditEntityEnum.enumValues)[number];