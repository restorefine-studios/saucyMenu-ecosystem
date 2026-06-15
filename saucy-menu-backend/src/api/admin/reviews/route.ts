import Elysia, { t } from "elysia"
import { authPlugin } from "../../../middleware/auth"
import { and, eq } from "drizzle-orm"
import { db } from "../../../db"
import { menuItems, reviews } from "../../../db/schema"
import { paginate } from "../../../lib/paginate"

const router = new Elysia({ prefix: '/reviews' })
    .use(authPlugin)

router.get('/', async ({ store: { user }, query: { limit, offset, rating } }) => {
    const hasRating = rating ? eq(reviews.rating, rating) : undefined
    const conditons = [eq(reviews.restaurantId, user?.restaurantId as string), hasRating]

    const allReviews = await db.select({
        review: reviews,
        menuItem: {
            name: menuItems.name,
            id: menuItems.id,
        },
    })
        .from(reviews)
        .leftJoin(menuItems, eq(reviews.reviewableId, menuItems.id))
        .where(() => and(...conditons))
    const totalReviews = await db.$count(reviews, eq(reviews.restaurantId, user?.restaurantId as string))
    const paginatedReviews = paginate(allReviews, {
        limit: limit ?? 10,
        offset: offset ?? 0,
        totalItems: totalReviews
    })
    return { success: true, ...paginatedReviews }

}, {
    tags: ['Reviews'],
    query: t.Object({
        limit: t.Optional(t.Integer()),
        offset: t.Optional(t.Integer()),
        rating: t.Optional(t.Integer()),
    })
})


export default router;