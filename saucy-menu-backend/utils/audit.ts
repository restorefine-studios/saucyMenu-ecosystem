import { db } from "../src/db";
import { AuditAction, AuditEntity, auditLogs } from "../src/db/schema";


interface LogAuditParams {
    entity: AuditEntity;
    entityId: string;
    action: AuditAction;
    performedBy?: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    metadata?: Record<string, unknown>;
    restaurantId?: string;
}

export async function logAudit(params: LogAuditParams) {
    const { entity, entityId, action, performedBy, before, after, metadata, restaurantId } = params;

    await db.insert(auditLogs).values({
        entity,
        entityId,
        action,
        performedBy: performedBy ?? null,
        before: before ?? null,
        after: after ?? null,
        metadata: metadata ?? null,
        restaurantId: restaurantId ?? null,
    });
}

// --- Convenience wrappers ---

export const audit = {
    created: ({ entity, entityId, after, performedBy, metadata, restaurantId }: { entity: AuditEntity, entityId: string, after: Record<string, unknown>, performedBy?: string, metadata?: Record<string, unknown>, restaurantId?: string }) =>
        logAudit({ entity, entityId, action: "CREATE", after, performedBy, metadata, restaurantId }),

    updated: ({ entity, entityId, before, after, performedBy, metadata, restaurantId }: { entity: AuditEntity, entityId: string, before: Record<string, unknown>, after: Record<string, unknown>, performedBy?: string, metadata?: Record<string, unknown>, restaurantId?: string }) =>
        logAudit({ entity, entityId, action: "UPDATE", before, after, performedBy, metadata, restaurantId }),

    deleted: ({ entity, entityId, before, performedBy, metadata, restaurantId }: { entity: AuditEntity, entityId: string, before: Record<string, unknown>, performedBy?: string, metadata?: Record<string, unknown>, restaurantId?: string }) =>
        logAudit({ entity, entityId, action: "DELETE", before, performedBy, metadata, restaurantId }),
};