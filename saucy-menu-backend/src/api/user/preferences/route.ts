import Elysia, { t } from "elysia";
import { db } from "../../../db";
import { tags, userSessionAllergens, userSessionTags } from "../../../db/schema";
import { and, eq } from "drizzle-orm";
import { userAuthPlugin } from "../../../middleware/auth";

const router = new Elysia({ prefix: '/preferences' })
    .use(userAuthPlugin)

router.get('/', async ({ store: { user }, query: { type }, status }) => {
    const tagType = type ? eq(tags.type, type as any) : undefined
    try {
        const allTags = await db.query.tags.findMany({
            where: () => and(eq(tags.restaurantId, user?.restaurantId as string), tagType),
            columns: {
                id: true,
                name: true,
                type: true,
            },
        })
        return { success: true, data: allTags }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
}, {
    tags: ['Dish Tags'],
    query: t.Object({
        type: t.Optional(t.String())
    })
})

router.post('/', async ({ body, store: { user }, status }) => {
    try {

        await db.transaction(async (trx) => {
            // Handle diets
            if (body.diets !== undefined) {
                // Delete all existing diets for this session
                await trx.delete(userSessionTags)
                    .where(eq(userSessionTags.sessionId, user?.sessionId as string));

                // Insert new diets if array is not empty
                if (body.diets.length > 0) {
                    const dietsArray = body.diets.map(diet => ({
                        sessionId: user?.sessionId as string,
                        tagId: diet,
                    }));
                    await trx.insert(userSessionTags).values(dietsArray);
                }
            }

            // Handle allergens
            if (body.allergens !== undefined) {
                // Delete all existing allergens for this session
                await trx.delete(userSessionAllergens)
                    .where(eq(userSessionAllergens.sessionId, user?.sessionId as string));

                // Insert new allergens if array is not empty
                if (body.allergens.length > 0) {
                    const allergensArray = body.allergens.map(allergen => ({
                        sessionId: user?.sessionId as string,
                        allergenId: allergen,
                    }));
                    await trx.insert(userSessionAllergens).values(allergensArray);
                }
            }
        });

        return { success: true, message: 'Preferences updated successfully' };
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
}, {
    body: t.Object({
        allergens: t.Optional(t.Array(t.String())),
        diets: t.Optional(t.Array(t.String())),
    }),
    tags: ['Preferences']
})

// router.post('/', async ({ body, store: { user }, status }) => {
//     try {
//         console.log('body', body)
//         const idsToInsert = body.tagIds.map(id => ({ sessionId: user?.id as string, tagId: id }))


//         const tagsExists = await db.select({
//             tagId: sessionTags.tagId,
//             tagType: tags.type
//         }).from(sessionTags)
//             .innerJoin(tags, eq(sessionTags.tagId, tags.id))
//             .where(and(eq(sessionTags.sessionId, user?.id as string), eq(tags.type, body.type as any)))



//         const insertTrans = await db.transaction(async (trx) => {
//             // Delete if any exist
//             if (tagsExists.length > 0) {
//                 const tagIdsToDelete = tagsExists.map(t => t.tagId);
//                 await trx
//                     .delete(sessionTags)
//                     .where(and(
//                         eq(sessionTags.sessionId, user?.id as string),
//                         inArray(sessionTags.tagId, tagIdsToDelete)
//                     ));
//             }
//             const inserted = await trx.insert(sessionTags).values(
//                 idsToInsert
//             )
//             if (body?.type == "allergen") {
//                 await trx.update(sessions).set({ preferenceSetupComplete: true }).where(eq(sessions.id, user?.id as string))
//             }
//             if (!inserted) {
//                 throw new Error('Failed to create diet');
//             }
//             return { success: true, message: 'Diet Created Successfully' }
//         })
//         if (!insertTrans) {
//             throw new Error('Failed to create diet');
//         }

//         return insertTrans
//     } catch (e) {
//         throw status(400, e instanceof Error ? e.message : `${e}`);
//     }
// }, {
//     body: t.Object({
//         tagIds: t.Array(t.String({
//             error: 'Diet id is required',
//             minLength: 2,
//             format: 'uuid'
//         })),
//         type: t.Optional(t.String())
//     }),
//     tags: ['Preferences'],
// })

export default router;