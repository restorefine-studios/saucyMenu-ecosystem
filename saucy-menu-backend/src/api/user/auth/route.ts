import Elysia, { t } from "elysia";
import { aiUsageLogs, restaurants, sessions, users, userSubscriptions } from "../../../db/schema";
import { db } from "../../../db";
import { jwtPlugin, userAuthPlugin } from "../../../middleware/auth";
import { eq } from "drizzle-orm";
import { stripe } from "../../../../helpers";

const router = new Elysia({ prefix: "/auth", tags: ['User Auth'] })
    .use(jwtPlugin)

router.post('/session', async ({ body, jwt, status }) => {
    try {
        const insertedSession = await db.insert(sessions).values({
            restaurantId: body.restaurantId
        }).returning({
            id: sessions.id
        })
        const restaurant = await db.query.restaurants.findFirst({
            where: () => eq(restaurants.id, body.restaurantId),
            columns: {
                currencyId: true,

            },
            with: {
                currencies: {
                    columns: {
                        code: true,
                        name: true,
                        symbol: true
                    }
                }
            }
        })
        const token = await jwt.sign({ id: insertedSession[0]?.id, restaurantId: body.restaurantId, role: 'END_USER', sessionId: insertedSession[0]?.id })
        return { success: true, data: { sessionId: insertedSession[0]?.id, token, currency: restaurant?.currencies } }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
}, {
    body: t.Object({
        restaurantId: t.String({
            error: 'Auth id is required',
            minLength: 2,
            format: 'uuid'
        }),
    }),
})


router.use(userAuthPlugin).post('/ai/generate', async ({ body, store: { user }, status }) => {
    const { tokensUsed } = body;

    const { sessionId } = user!
    try {
        // 1. Lookup session
        const session = await db.query.sessions.findFirst({
            where: (s, { eq }) => eq(s.id, sessionId),
        });

        if (!session) throw status(400, 'Invalid session');

        // 2. Lookup Stripe subscription from restaurant
        // const sub = await db.query.userSubscriptions.findFirst({
        //     where: (sub, { eq }) => eq(sub?.userId, session.restaurantId as string),
        // });

        const sub = await db.select({
            id: restaurants.id,
            stripeCustomerId: userSubscriptions.stripeCustomerId,
            stripeSubscriptionId: userSubscriptions.stripeSubscriptionId,
        }).from(restaurants)
            .leftJoin(users, eq(restaurants.id, users.restaurantId))
            .leftJoin(userSubscriptions, eq(users.id, userSubscriptions.userId))
            .where(eq(restaurants.id, session.restaurantId as string))

        if (sub.length === 0) throw status(404, 'No subscription found');

        // 3. Log usage to Stripe
        //   await stripe.subscriptionItems.createUsageRecord(
        //     sub.subscriptionItemId,
        //     {
        //       quantity: tokensUsed,
        //       timestamp: Math.floor(Date.now() / 1000),
        //       action: 'increment',
        //     }
        //   );
        await stripe.billing.meterEvents.create({
            event_name: 'saucy_ai_tokens',
            payload: {
                value: '1',
                stripe_customer_id: sub[0]?.stripeCustomerId as string,
            },
        });

        // 4. Optional internal log
        await db.insert(aiUsageLogs).values({
            sessionId,
            subscriptionId: sub[0]?.stripeSubscriptionId as string,
            usedTokens: tokensUsed,
            createdAt: new Date(),
            restaurantId: user?.restaurantId as string,
        });

        return { success: true, message: 'logged' };
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
}, {
    body: t.Object({
        tokensUsed: t.Number({
            error: 'Tokens used is required',
            minLength: 1,
            format: 'number'
        }),
    }),
});

router.use(userAuthPlugin).get('/restaurant', async ({ store: { user }, status }) => {
    try {
        const restaurant = await db.query.restaurants.findFirst({
            where: () => eq(restaurants.id, user?.restaurantId as string),
            columns: {
                id: true,
                name: true,
                description: true,
                image: true,
                bannerUrl: true,

            },
        })
        return { success: true, data: restaurant }
    } catch (err) {
        throw status(400, err instanceof Error ? err.message : `${err}`);
    }
})


export default router;