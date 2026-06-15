import Elysia, { t } from "elysia";
import { db } from "../../../db";
import { superAdminAuthPlugin } from "../../../middleware/auth";
import { restaurants, subscriptionPlans, users, userSubscriptions } from "../../../db/schema";
import { and, eq, like, or, sql } from "drizzle-orm";
import { paginate } from "../../../lib/paginate";

const router = new Elysia({ prefix: '/subscriptions', tags: ['Super Admin Subscriptions'] })
    .use(superAdminAuthPlugin)


router.get('/', async ({ query, status }) => {
    try {
        const plans = await db.query.subscriptionPlans.findMany({
            columns: { name: true },
        });
        const conditions = [];

        if (query.search) {
            conditions.push(like(restaurants.name, `%${query.search}%`));
        }

        if (query.plan) {
            conditions.push(eq(subscriptionPlans.name, query.plan));
        }

        const finalConditions = conditions.length > 0 ? and(...conditions) : undefined
        const subscriptions = await db
            .select({
                status: userSubscriptions.status,
                stripeSubscriptionId: userSubscriptions.stripeSubscriptionId,
                currentPeriodStart: userSubscriptions.currentPeriodStart,
                currentPeriodEnd: userSubscriptions.currentPeriodEnd,
                userName: users.name,
                restaurantName: restaurants.name,
                planName: subscriptionPlans.name,
            })
            .from(userSubscriptions)
            .leftJoin(users, eq(userSubscriptions.userId, users.id))
            .leftJoin(restaurants, eq(users.restaurantId, restaurants.id))
            .leftJoin(subscriptionPlans, eq(subscriptionPlans.id, userSubscriptions.planId))
            .where(() => finalConditions);

        const totalCount = await db.select({ count: sql<number>`count(distinct ${userSubscriptions.id})` }).from(userSubscriptions)

        const finalData = paginate(subscriptions, { limit: Number(query.limit), offset: Number(query?.offset), totalItems: totalCount[0].count ?? 0 })

        return { success: true, ...finalData, plans };
    } catch (e) {
        console.error(e);
        // return { success: false, message: e, data: [] };
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
}, {
    tags: ['Subscriptions'],
    query: t.Object({
        limit: t.Optional(t.Integer({
            default: 10
        })),
        offset: t.Optional(t.Integer({
            default: 0
        })),
        search: t.Optional(t.String()),
        plan: t.Optional(t.String()),
    })
});

export default router;