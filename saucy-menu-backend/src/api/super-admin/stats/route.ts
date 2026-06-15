import Elysia from "elysia"
import { superAdminAuthPlugin } from "../../../middleware/auth"
import { db } from "../../../db"
import { aiUsageLogs, restaurants, sessions, subscriptionPlans, userSubscriptions } from "../../../db/schema"
import { asc, eq, sql } from "drizzle-orm"

const router = new Elysia({ prefix: '/stats', tags: ['Super Admin Stats'] })
    .use(superAdminAuthPlugin)

router.get('/subscriptions', async ({ store: { user }, status }) => {
    try {
        const chartData = await db.select({
            count: sql<number>`COUNT(${userSubscriptions.id})`,
            month: sql`DATE_TRUNC('month', ${userSubscriptions.createdAt})`,
            planName: subscriptionPlans.name,
        })
            .from(userSubscriptions)
            .innerJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
            .groupBy(subscriptionPlans.name, sql`DATE_TRUNC('month', ${userSubscriptions.createdAt})`)
            .orderBy(
                asc(sql`DATE_TRUNC('month', ${userSubscriptions.createdAt})`),
                asc(subscriptionPlans.name)
            )
        return { success: true, data: chartData }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
})

router.get('/total', async ({ status }) => {
    try {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // All-time totals
        const [totalRestaurants] = await db
            .select({ count: sql<number>`count(distinct ${restaurants.id})` })
            .from(restaurants);

        const [totalSessions] = await db
            .select({ count: sql<number>`count(distinct ${sessions.id})` })
            .from(sessions);

        const [totalCreditsUsed] = await db
            .select({ count: sql<number>`count(distinct ${aiUsageLogs.id})` })
            .from(aiUsageLogs);

        // Restaurants added this month
        const [restaurantsThisMonth] = await db
            .select({ count: sql<number>`count(distinct ${restaurants.id})` })
            .from(restaurants)
            .where(sql`${restaurants.createdAt} >= ${currentMonthStart}`);


        // Sessions this month
        const [sessionsThisMonth] = await db
            .select({ count: sql<number>`count(distinct ${sessions.id})` })
            .from(sessions)
            .where(sql`${sessions.createdAt} >= ${currentMonthStart}`);

        // Credits used this month
        const [creditsThisMonth] = await db
            .select({ count: sql<number>`count(distinct ${aiUsageLogs.id})` })
            .from(aiUsageLogs)
            .where(sql`${aiUsageLogs.createdAt} >= ${currentMonthStart}`);



        return {
            success: true,
            data: {
                totalRestaurants: totalRestaurants.count,
                totalSessions: totalSessions.count,
                totalCreditsUsed: totalCreditsUsed.count,
                creditsThisMonth: creditsThisMonth.count,
                restaurantsThisMonth: restaurantsThisMonth.count,
                sessionsThisMonth: sessionsThisMonth.count,
            },
        };
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
}, {});


export default router