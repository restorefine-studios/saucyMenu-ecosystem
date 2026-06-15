import Elysia, { t } from "elysia";
import { db } from "../../../db";
import { reviews } from "../../../db/schema";
import { userAuthPlugin } from "../../../middleware/auth";

const router = new Elysia({ prefix: "reviews" }).use(userAuthPlugin)

router.post("/", async ({ body, store: { user }, status }) => {
    try {
        const inserted = await db.insert(reviews).values({
            ...body,
            restaurantId: user?.restaurantId as string,
            reviewableId: body.reviewableId,
        })
        if (!inserted) {
            throw new Error('Failed to create review');
        }
        return { success: true, message: 'Review Created Successfully' }

    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
}, {
    body: t.Object({
        rating: t.Number(),
        comment: t.String(),
        reviewableId: t.String({
            error: 'Reviewable id is required',
            minLength: 2,
            format: 'uuid'
        }),
    }),
})

export default router;