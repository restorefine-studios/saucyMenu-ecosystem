import Elysia, { t } from "elysia";
import { authPlugin } from "../../../middleware/auth";
import { stripe } from "../../../../helpers";
import { subscriptionPlans, userSubscriptions } from "../../../db/schema";
import { and, eq } from "drizzle-orm";
import { db } from "../../../db";

const router = new Elysia({ prefix: '/subscriptions' })
    .use(authPlugin)


router.get('/system', async ({ store: { user }, status }) => {
    try {
        const allSubs = await db.select({
            name: subscriptionPlans.name,
            stripePriceId: subscriptionPlans.stripePriceId,
            stripeProductId: subscriptionPlans.stripeProductId,
            status: userSubscriptions.status,
        }).from(subscriptionPlans)
            .leftJoin(userSubscriptions, and(
                eq(subscriptionPlans.stripePriceId, userSubscriptions.priceId),
                eq(userSubscriptions.userId, user?.id as string),
            ))
        let finalSubs
        if (allSubs) {
            finalSubs = allSubs.map(sub => ({
                ...sub,
                subscribed: sub.status && sub.status !== 'canceled',
            }));
        }
        return { success: true, data: finalSubs }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
})

router.post('/', async ({ store: { user }, body, status }) => {
    // const [foundSubscription] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, user?.id as string))
    const [foundSubscription] = await db.select({
        priceId: subscriptionPlans.stripePriceId,
        subscriptionId: subscriptionPlans.stripePriceId,
        status: userSubscriptions.status,
        product: subscriptionPlans.stripeProductId,
    }).from(userSubscriptions)
        .leftJoin(subscriptionPlans, eq(userSubscriptions.priceId, subscriptionPlans.stripePriceId))
        .where(eq(userSubscriptions.userId, user?.id as string))


    if (foundSubscription && foundSubscription.status !== "canceled") {
        return { success: false, message: 'Already subscribed to a plan' }
    }
    try {

        const price = await stripe.prices.list({
            active: true,
            product: body.product as string,
            limit: 1
        });
        const subscriptions = await stripe.checkout.sessions.create({
            success_url: body.success_url,
            line_items: [
                {
                    price: price.data[0].id,
                },
            ],
            payment_method_types: ['card', 'paypal'],
            mode: 'subscription',
            customer_email: user?.email as string,
            metadata: {
                userId: user?.id as string,
                priceId: price.data[0].id,

            }
        });
        return { success: true, data: subscriptions, url: subscriptions.url }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
}, {
    tags: ['Subscriptions'],
    body: t.Object({
        product: t.String(),
        success_url: t.String(),
    })
})

// router.get('/status/:id', async ({ store: { user }, params }) => {
//     try {
//         const subscriptions = await stripe.subscriptions.retrieve(params.id);

//         return { success: true, data: subscriptions, status: subscriptions.status }
//     } catch (e) {
//         return error(400, { message: `${e}` })
//     }
// }, {
//     tags: ['Subscriptions'],
// })


router.post('/cancel', async ({ store: { user }, status }) => {
    const foundSubscription = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, user?.id as string))
    if (!foundSubscription.length) {
        throw status(404, 'No subscription found');
    }
    try {
        const subscriptions = await stripe.subscriptions.update(foundSubscription[0].stripeSubscriptionId, {
            cancel_at_period_end: true,
            metadata: {
                userId: user?.id as string,
            }
        });
        return { success: true, data: subscriptions }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
}, {
    tags: ['Subscriptions'],
    // body: t.Object({
    //     subscriptionId: t.String(),
    // })
})


export default router;