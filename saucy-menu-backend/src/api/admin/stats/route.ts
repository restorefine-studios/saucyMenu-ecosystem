import { and, count, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { authPlugin } from "../../../middleware/auth";
import { db } from "../../../db";
import { aiUsageLogs, menuItems, menuItemTags, sessions, tags } from "../../../db/schema";


const router = new Elysia({ prefix: '/stats' })
    .use(authPlugin)
router.get('/', async ({ store: { user } }) => {
    console.log(user)
    const TotalSessions = await db.$count(sessions, and(eq(sessions.restaurantId, user?.restaurantId as string)))
    const TotalDishes = await db.$count(menuItems, eq(menuItems.restaurantId, user?.restaurantId as string))
    const totalAICredits = await db.$count(aiUsageLogs, eq(aiUsageLogs?.restaurantId, user?.restaurantId as string))
    return { success: true, data: { totalUsers: TotalSessions, totalDishes: TotalDishes, totalAiCredits: totalAICredits } }

}, {
    tags: ['Stats']
})

router.get('/customers/chart', async ({ store: { user }, query }) => {
    const startDate = new Date(query?.startDate ?? "")
    const endDate = new Date(query?.endDate ?? "")

    const dateFilter = query.startDate || query.endDate ? and(gte(sessions.createdAt, startDate), lte(sessions.createdAt, endDate)) : undefined

    const monthlyCustomerCounts = await db
        .select({
            month: sql`DATE_TRUNC('month', ${sessions.createdAt})`.as("month"),
            count: sql<number>`COUNT(*)`.as("count"),
        })
        .from(sessions)
        .groupBy(sql`DATE_TRUNC('month', ${sessions.createdAt})`)
        .orderBy(sql`DATE_TRUNC('month', ${sessions.createdAt})`).where(and(eq(sessions.restaurantId, user?.restaurantId as string), dateFilter))
    return { success: true, data: monthlyCustomerCounts }

}, {
    tags: ['Stats'],
    query: t.Object({
        startDate: t.Optional(t.String({
            error: 'Start date is required',
        })),
        endDate: t.Optional(t.String({
            error: 'End date is required',
        })),
    })
})

router.get('/dishes-by-tags', async ({ store: { user } }) => {

    const result = await db
        .select({
            tagName: tags.name,
            count: count(menuItemTags.menuItemId).as('count'),
        })
        .from(menuItemTags)
        .innerJoin(tags, eq(menuItemTags.tagId, tags.id))
        .where(and(
            or(eq(tags.restaurantId, user?.restaurantId as string), eq(tags.isSystem, true)),
            eq(tags.type, "diet"),
        ))
        .groupBy(tags.name)
        .orderBy(desc(count(menuItemTags.menuItemId)));

    return { success: true, data: result }

}, {
    tags: ['Stats'],
})

export default router