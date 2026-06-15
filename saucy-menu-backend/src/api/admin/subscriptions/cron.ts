import { Elysia } from 'elysia'
import { cron } from '@elysiajs/cron'
import { db } from '../../../db'
import { pendingStripeEvents, userSubscriptions } from '../../../db/schema'
import { eq } from 'drizzle-orm'
import { stripe } from '../../../../helpers'

const cronJob = new Elysia()
    .use(
        cron({
            name: 'check-subscription validity',
            pattern: '0 */6 * * *'
            ,
            run() {
                syncSubscriptions()
            }
        })
    )
    .use(cron({
        name: 'sync-subscriptions',
        pattern: '*/5 * * * *'
        ,
        run() {
            processPendingStripeEvents()
        }
    }))

async function syncSubscriptions() {
    try {
        // Step 1: Fetch all active subscriptions from the database
        const subscriptions = await db
            .select()
            .from(userSubscriptions)
            .where(eq(userSubscriptions.status, 'active')) // Only active subscriptions

        // Step 2: Iterate over each subscription and check its status
        for (const sub of subscriptions) {
            try {
                // Fetch subscription details from Stripe
                const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId)

                // Check if subscription is still active
                const isActive =
                    stripeSub.status === 'active'

                // Step 3: If subscription is no longer active, update the status in the DB
                if (!isActive) {
                    const updatedStatus = stripeSub.status === 'canceled' ? 'canceled' : 'expired'
                    await db
                        .update(userSubscriptions)
                        .set({
                            status: updatedStatus,
                            updatedAt: new Date(), // Update the timestamp of the change
                        })
                        .where(eq(userSubscriptions.id, sub.id))

                    console.log(`Marked subscription ${sub.stripeSubscriptionId} as ${updatedStatus}.`)
                }
            } catch (err) {
                console.error('Error fetching subscription from Stripe', err)
            }
        }
    } catch (err) {
        console.error('Error syncing subscriptions:', err)
    }
}

async function processPendingStripeEvents() {
    const pendings = await db.select().from(pendingStripeEvents)

    for (const event of pendings) {
        const subscription = await db.query.userSubscriptions.findFirst({
            where: eq(userSubscriptions.stripeSubscriptionId, event.relatedId as string),
        })

        if (subscription) {
            const invoice = JSON.parse(event.payload)

            if (event.eventType === 'invoice.paid') {
                await db.update(userSubscriptions)
                    .set({
                        status: 'paid',
                        currentPeriodEnd: new Date(invoice.lines.data[0].period.end * 1000),
                        currentPeriodStart: new Date(invoice.lines.data[0].period.start * 1000),
                    })
                    .where(eq(userSubscriptions.id, subscription.id))
            }

            await db.delete(pendingStripeEvents).where(eq(pendingStripeEvents.id, event.id))
        }
    }
}

export default cronJob