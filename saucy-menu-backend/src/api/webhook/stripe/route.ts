import Elysia from "elysia";

import Stripe from "stripe";
import { pendingStripeEvents, subscriptionPlans, userSubscriptions } from "../../../db/schema";
import { db } from "../../../db";
import { eq } from "drizzle-orm";

const router = new Elysia()

const webCrypto = Stripe.createSubtleCryptoProvider();


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: '2025-04-30.basil',
});


router.post('/stripe', async ({ request, set }) => {
    const signature = request.headers.get('stripe-signature')
    const body = await request.text() // important for signature verification


    let event

    try {

        if (!signature) {
            set.status = 400
            return 'Webhook Error'
        }
        event = await stripe.webhooks.constructEventAsync(
            body,
            signature!,
            process.env.STRIPE_WEBHOOK_SECRET,
            undefined,
            webCrypto
        )

    } catch (err) {
        console.error('Webhook signature verification failed.', err)
        set.status = 400
        return 'Webhook Error'
    }
    // Handle different event types
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object
            console.log('Payment succeeded:', paymentIntent)
            break

        case 'checkout.session.completed':
            const session = event.data.object

            const foundPlan = await db.query.subscriptionPlans.findFirst({
                where: eq(subscriptionPlans.stripePriceId, session.metadata?.priceId as string),
                columns: {
                    id: true,
                    stripePriceId: true,
                }
            })

            const existingPlanSub = await db.query.userSubscriptions.findFirst({
                where: eq(userSubscriptions.userId, session.metadata?.userId as string),
            })

            if (existingPlanSub) {
                await db.update(userSubscriptions).set({
                    status: 'active',
                    stripeSubscriptionId: session.subscription as string,
                    planId: foundPlan?.id as string,
                    priceId: session.metadata?.priceId,
                    updatedAt: new Date(),
                }).where(eq(userSubscriptions.userId, session.metadata?.userId as string))
            } else {
                await db.insert(userSubscriptions).values({
                    stripeSubscriptionId: session.subscription as string,
                    stripeCustomerId: session.customer as string,
                    userId: session.metadata?.userId as string,
                    priceId: session.metadata?.priceId,
                    status: 'active',
                    planId: foundPlan?.id as string,
                })
            }
            break

        case 'product.created':
            const productObject = event.data.object
            await db.insert(subscriptionPlans).values({
                name: productObject.name ?? 'Unnamed Product',
                stripeProductId: productObject.id,
            })
            console.log('Product saved to DB');
            break

        case 'product.deleted':
            const deletedProduct = event.data.object
            await db.delete(subscriptionPlans).where(eq(subscriptionPlans.stripeProductId, deletedProduct.id))
            break

        case 'product.updated':

            const stripeProduct = event.data.object


            const [existingProduct] = await db.select({
                id: subscriptionPlans.id,
            }).from(subscriptionPlans)
                .leftJoin(userSubscriptions, eq(subscriptionPlans.id, userSubscriptions.planId))
                .where(eq(subscriptionPlans.stripeProductId, stripeProduct.id))

            if (!existingProduct) {
                console.warn(`No matching product in DB for Stripe product ID: ${stripeProduct.id}`);
                break;
            }
            db.transaction(async (trx) => {
                await trx.update(userSubscriptions).set({
                    priceId: stripeProduct.default_price as string,
                }).where(eq(userSubscriptions.planId, existingProduct?.id as string))
                await trx.update(subscriptionPlans).set({
                    name: stripeProduct.name,
                    stripePriceId: stripeProduct.default_price as string,
                    stripeProductId: stripeProduct.id,
                }).where(eq(subscriptionPlans.stripeProductId, stripeProduct.id))
            })
            break

        case 'price.created':
            const priceObject = event.data.object
            const productId = priceObject.product as string
            const existing = await db.query.subscriptionPlans.findFirst({
                where: eq(subscriptionPlans.stripeProductId, productId),
            })
            if (existing) {
                await db.update(subscriptionPlans).set({
                    stripePriceId: priceObject.id,
                }).where(eq(subscriptionPlans.stripeProductId, productId))
            } else {
                await db.insert(subscriptionPlans).values({
                    stripeProductId: productId,
                    stripePriceId: priceObject.id,
                    name: 'Unknown (from price.created)',
                })
            }
            break

        // case 'price.updated':
        //   const updatedPrice = event.data.object
        //   const productToUpdateId = updatedPrice.product as string
        //   const existingProduct = await db.query.subscriptionPlans.findFirst({
        //     where: eq(subscriptionPlans.stripeProductId, productToUpdateId),
        //   })
        //   if (existingProduct) {
        //     await db.update(subscriptionPlans).set({
        //       stripePriceId: updatedPrice.id,
        //     }).where(eq(subscriptionPlans.stripeProductId, productToUpdateId))
        //     db.transaction(async (trx) => {
        //       await trx.update(userSubscriptions).set({
        //         priceId: updatedPrice.id,
        //       }).where(eq(userSubscriptions.priceId, existingProduct.stripePriceId as string))
        //       await trx.update(subscriptionPlans).set({
        //         stripePriceId: updatedPrice.id,
        //       }).where(eq(subscriptionPlans.stripeProductId, productToUpdateId))
        //     })
        //   } else {
        //     await db.insert(subscriptionPlans).values({
        //       stripeProductId: productToUpdateId,
        //       stripePriceId: updatedPrice.id,
        //       name: 'Unknown (from price.updated)',
        //     })
        //   }
        //   break

        case 'invoice.paid':
            const invoice = event.data.object
            const subscriptionId = invoice.parent?.subscription_details?.subscription as string

            const existingSub = await db.query.userSubscriptions.findFirst({
                where: eq(userSubscriptions.stripeSubscriptionId, subscriptionId),
            })

            if (existingSub) {
                await db.update(userSubscriptions)
                    .set({
                        status: 'paid',
                        priceId: invoice.lines.data[0].pricing?.price_details?.price,
                        updatedAt: new Date(),
                        currentPeriodEnd: new Date(invoice.lines.data[0].period.end * 1000),
                        currentPeriodStart: new Date(invoice.lines.data[0].period.start * 1000),
                    })
                    .where(eq(userSubscriptions.id, existingSub.id))
            } else {
                await db.insert(pendingStripeEvents).values({
                    eventType: 'invoice.paid',
                    payload: JSON.stringify(invoice),
                    relatedId: subscriptionId,
                    eventId: event.id,
                })
            }
            break

        case 'customer.subscription.updated':
            const updatedCustomer = event.data.object
            const activeItem = updatedCustomer.items.data.find(
                (item) => item.price && item.price.active
            )
            if (updatedCustomer.cancel_at_period_end) {
                await db.update(userSubscriptions).set({
                    status: 'canceled',
                    canceledAt: updatedCustomer.canceled_at ? new Date(updatedCustomer?.canceled_at as number * 1000) : null,
                }).where(eq(userSubscriptions.userId, updatedCustomer.metadata?.userId as string))
            } else {
                await db.update(userSubscriptions).set({
                    status: updatedCustomer?.status,
                    currentPeriodEnd: activeItem?.current_period_end ? new Date(activeItem?.current_period_end as number * 1000) : null,
                    currentPeriodStart: activeItem?.current_period_start ? new Date(activeItem?.current_period_start as number * 1000) : null,
                    canceledAt: updatedCustomer?.canceled_at ? new Date(updatedCustomer?.canceled_at as number * 1000) : null,
                    priceId: activeItem?.price?.id,
                    stripeSubscriptionId: updatedCustomer?.id,
                }).where(eq(userSubscriptions.stripeSubscriptionId, updatedCustomer.id as string))
            }
            break

        default:
            console.log(`Unhandled event type: ${event.type}`)
    }

    return 'Webhook received successfully'

})

export default router;
