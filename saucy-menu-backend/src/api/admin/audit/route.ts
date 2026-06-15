import Elysia, { t } from "elysia"
import { db } from "../../../db"
import { authPlugin } from "../../../middleware/auth"
import { AuditAction, AuditEntity, auditLogs } from "../../../db/schema"
import { and, eq } from "drizzle-orm"
import { paginate } from "../../../lib/paginate"

const router = new Elysia({ prefix: '/audit' })
    .use(authPlugin)

router.get('/', async ({ store: { user }, query: { limit, offset, entity, action } }) => {
    const totalAuditLogs = await db.$count(auditLogs, eq(auditLogs.restaurantId, user?.restaurantId as string))
    const entityCondition = entity ? eq(auditLogs.entity, entity as AuditEntity) : undefined
    const actionCondition = action ? eq(auditLogs.action, action as AuditAction) : undefined
    const audit = await db.query.auditLogs.findMany({
        where: and(eq(auditLogs.restaurantId, user?.restaurantId as string), entityCondition, actionCondition),
        limit: limit ?? 10,
        offset: offset ?? 0,
        with: {
            user: {
                columns: {
                    name: true,
                    email: true,
                    role: true,
                }
            }
        }
    })
    const paginatedAudit = paginate(audit, {
        limit: limit ?? 10,
        offset: offset ?? 0,
        totalItems: totalAuditLogs
    })
    return { success: true, ...paginatedAudit }
}, {
    query: t.Object({
        limit: t.Optional(t.Number()),
        offset: t.Optional(t.Number()),
        entity: t.Optional(t.String()),
        action: t.Optional(t.String()),
    })
})

export default router