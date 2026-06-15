import Elysia, { t } from "elysia";
import { superAdminAuthPlugin } from "../../../middleware/auth";
import { db } from "../../../db";
import { and, desc, eq, like, sql } from "drizzle-orm";
import { aiUsageLogs, restaurants, reviews, sessions, tags, users, } from "../../../db/schema";
import { generateRandomAlphanumeric, plunk } from "../../../../helpers";
import { paginate } from "../../../lib/paginate";
import { renderAccountReleasedEmail } from "../../../../utils/renderEmail";
import slugify from "slugify";
import { auth } from "../../../lib/auth";

const router = new Elysia({ prefix: "/restaurants", tags: ['Super Admin Restaurants'] })
    .use(superAdminAuthPlugin)

router.get("/", async ({ query, status }) => {
    try {
        const search = query.search ? like(sql`lower(${restaurants.name})`, `%${query.search.toLowerCase()}%`) : undefined
        const status = query.status ? eq(restaurants.status, query.status as any) : undefined
        const restaurantList = await db.query.restaurants.findMany({
            where: and(search, status),
            orderBy: desc(restaurants.createdAt),
        })
        const totalCount = await db.select({ count: sql<number>`count(distinct ${restaurants.id})` }).from(restaurants).where(and(search, status))
        const paginatedRestaurantList = paginate(restaurantList, { limit: Number(query.limit), offset: Number(query.offset), totalItems: totalCount[0].count ?? 0 })
        return { success: true, ...paginatedRestaurantList }
    } catch (err) {
        throw status(400, err instanceof Error ? err.message : `${err}`);
    }
}, {
    query: t.Object({
        status: t.Optional(t.String()),
        search: t.Optional(t.String()),
        limit: t.Optional(t.Number({ default: 10 })),
        offset: t.Optional(t.Number({ default: 0 }))
    }),
    tags: ['Restaurant']
})

router.post('/', async ({ body, status }) => {
    const alreadyExists = await db.select().from(restaurants).where(eq(restaurants.email, body.email))
    if (alreadyExists.length > 0) {
        return { success: false, message: 'Restaurant already exists' }
    }

    try {
        const insertedRestaurant = await db
            .insert(restaurants)
            .values({
                ...body,
                name: body.restaurantName,
                currencyId: body.currencyId,
            })
            .returning({ restaurantId: restaurants.id });

        const restaurantId = insertedRestaurant[0].restaurantId;

        // 2. Create the auth user with the now-available restaurantId
        const newUser = await auth.api.createUser({
            body: {
                email: body.email,
                password: 'test12345',
                name: body.name,
                role: 'user',
                data: {
                    restaurantId,
                },
            },
        });

        if (!newUser) {
            // Compensate — roll back the restaurant manually
            await db.delete(restaurants).where(eq(restaurants.id, restaurantId));
            throw status(400, 'Failed to create admin');
        }
        return { success: true, message: "Restaurant added successfully", id: restaurantId }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
}, {
    body: t.Object({
        name: t.String({
            error: 'Name is required',
            minLength: 2
        }),
        email: t.String({
            error: 'Email is required',
            minLength: 2,
            format: 'email'
        }),
        restaurantName: t.String({
            error: 'Restaurant name is required',
            minLength: 2
        }),
        currencyId: t.String({
            error: 'Currency id is required',
            minLength: 2,
            format: 'uuid'
        }),
    }),
    tags: ['Restaurant']
})

router.post('/release-account', async ({ body, status, request: { headers } }) => {
    // Release account only if the restaurant is in pending status
    // const foundRestaurant = await db.select().from(restaurants).where(and(eq(restaurants.id, body.restaurantId), eq(restaurants.status, 'PENDING')))
    // if (foundRestaurant.length === 0) {
    //     throw status(404, 'Restaurant not found');
    // }
    const foundUser = await db.query.users.findFirst({
        where: eq(users.email, body.email),
    })
    try {
        const code = generateRandomAlphanumeric(9)
        // const pwd = await Bun.password.hash(code)

        // const updatePwd = await db.update(users).set({
        //     password: pwd,
        // }).where(eq(restaurants.id, body.restaurantId))
        await db.transaction(async (trx) => {
            const setUserPassword = await auth.api.setUserPassword({
                body: {
                    newPassword: code,
                    userId: foundUser?.id as string
                },
                headers
            })
            if (!setUserPassword) {
                throw new Error('Failed to set user password');
            }
            await trx.update(restaurants).set({
                status: 'RELEASED'
            }).where(eq(restaurants.id, body.restaurantId))

        })
        await plunk.emails.send({
            to: foundUser?.email as string,
            subject: "First Time Login",
            body: await renderAccountReleasedEmail(foundUser?.name as string, foundUser?.email as string, code)
        })
        return { success: true, message: 'Account Release successful' }

    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
}, {
    body: t.Object({
        restaurantId: t.String({
            error: 'Restaurant id is required',
            minLength: 2,
            format: 'uuid'
        }),
        email: t.String({
            error: 'Email is required',
            minLength: 2,
            format: 'email'
        }),
    }),
    tags: ['Restaurant']
})


router.get("/:id", async ({ params, status }) => {
    try {
        // const restaurant = await db.select().from(restaurants)
        // .leftJoin(sessions, eq(restaurants.id, sessions.restaurantId))

        // .where(eq(restaurants.id, params.id))
        const restaurant = await db.query.restaurants.findFirst({
            where: eq(restaurants.id, params.id),
        })
        const totalSessions = await db.$count(sessions, eq(sessions.restaurantId, params.id))
        const totalRatings = await db.$count(reviews, eq(reviews.restaurantId, params.id))
        return {
            success: true, data: restaurant, totals: {
                users: totalSessions,
                ratings: totalRatings
            }
        }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
}, {
    params: t.Object({
        id: t.String({
            error: 'Restaurant id is required',
            minLength: 2,
            format: 'uuid'
        }),
    }),
    tags: ['Restaurant']
})

router.get('/:id/ai-usage', async ({ params, status }) => {
    try {
        const chartData = await db.select({
            count: sql<number>`COUNT(${aiUsageLogs.id})`,
            month: sql`DATE_TRUNC('month', ${aiUsageLogs.createdAt})`,
        })
            .from(aiUsageLogs)
            .where(eq(aiUsageLogs.restaurantId, params.id as string))
            .groupBy(aiUsageLogs.usedTokens, sql`DATE_TRUNC('month', ${aiUsageLogs.createdAt})`)
            .orderBy(aiUsageLogs.usedTokens, sql`DATE_TRUNC('month', ${aiUsageLogs.createdAt})`)
        return { success: true, data: chartData }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
}, {
    params: t.Object({
        id: t.String({
            error: 'Restaurant id is required',
            minLength: 2,
            format: 'uuid'
        }),
    }),
    tags: ['Restaurant']
})

router.post('/alter-suspend/:id', async ({ params, status, body, store: { user } }) => {
    try {
        const restaurant = await db.query.restaurants.findFirst({
            where: eq(restaurants.id, params.id as string),
        })
        if (!restaurant) {
            throw status(404, 'Restaurant not found');
        }
        await db.update(restaurants).set({
            suspended: !restaurant.suspended,
            suspendedReason: body.suspendedReason,
            suspendedAt: new Date(),
            suspendedBy: user?.id as string,
        })
        return { success: true, message: 'Restaurant suspended' }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
}, {
    body: t.Object({
        suspendedReason: t.Optional(t.String()),
    }),
})

export default router;