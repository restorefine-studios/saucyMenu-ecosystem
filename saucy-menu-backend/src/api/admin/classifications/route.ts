import Elysia from "elysia"
import { db } from "../../../db"
import { allergens, tags } from "../../../db/schema"
import { authPlugin } from "../../../middleware/auth"
import { and, asc, desc, eq, ne, or } from "drizzle-orm"
import { resolveTranslatedField } from "../../../../utils/translations"
import { t } from "elysia"
import slugify from "slugify"
import { translationQueue } from "../../../queues/translations"
import _ from "lodash"
import { audit } from "../../../../utils/audit"

const router = new Elysia({ prefix: '/classifications', tags: ['Classifications'] })
    .use(authPlugin)

router.get('/allergens', async ({ store: { lang }, status }) => {
    try {
        const allAllergens = await db.query.allergens.findMany({
            orderBy: asc(allergens.name)
        })
        const translatedAllergens = allAllergens.map(allergen => ({
            ...allergen,
            name: resolveTranslatedField(allergen.name, allergen.translations, 'name', lang)
        }))
        return { success: true, data: translatedAllergens }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
})

router.get('/diets', async ({ store: { lang, user }, status }) => {
    try {
        const allDiets = await db.query.tags.findMany({
            where: or(and(eq(tags.type, 'diet'), eq(tags.restaurantId, user?.restaurantId as string)), and(eq(tags.type, 'diet'), eq(tags.isSystem, true))),
            orderBy: asc(tags.createdAt)
        })
        const translatedDiets = allDiets.map(diet => {
            const newDiets = _.omit(diet, ['translations', 'translationStatus'])
            return {
                ...newDiets,
                name: resolveTranslatedField(diet.name, diet.translations, 'name', lang)
            }
        })
        return { success: true, data: translatedDiets }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
})

router.post('/diets', async ({ body, store: { user, lang }, status }) => {
    try {
        const key = slugify(body.name, {
            lower: true,
            trim: true,
            strict: true
        }).replace(/-/g, "_")

        const tagExists = await db.select().from(tags).where(and(eq(tags.key, key), eq(tags.type, 'diet'), eq(tags.restaurantId, user?.restaurantId as string)))
        if (tagExists.length > 0) {
            throw status(400, 'Tag already exists')
        }

        const inserted = await db.insert(tags).values({
            ...body,
            name: body.name.trim().toLowerCase(),
            type: 'diet',
            restaurantId: user?.restaurantId as string,
            key
        }).returning({
            id: tags.id
        })
        if (!inserted) {
            throw status(400, 'Failed to create diet')
        }
        const itemsToTranslate = { name: body.name }
        translationQueue.add(itemsToTranslate, inserted[0].id as string, lang).then(async (result) => {
            await db.update(tags).set({
                translations: result.translations,
                translationStatus: 'completed'
            }).where(eq(tags.id, inserted[0].id as string))
        }).catch(async () => {
            await db.update(tags).set({
                translationStatus: 'failed'
            }).where(eq(tags.id, inserted[0].id as string))
        });
        audit.created({ entity: 'diets', entityId: inserted[0].id as string, after: body, performedBy: user?.id as string, restaurantId: user?.restaurantId as string ?? undefined })
        return { success: true, message: 'Diet created successfully' }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
}, {
    body: t.Object({
        name: t.String({
            error: 'Name is required',
            minLength: 2
        })
    })
})

router.put('/diets/:id', async ({ params, body, store: { user, lang }, status }) => {
    try {
        const key = slugify(body.name, {
            lower: true,
            trim: true,
            strict: true
        }).replace(/-/g, "_")
        const tagExists = await db.select().from(tags).where(and(eq(tags.key, key), eq(tags.type, 'diet'), eq(tags.restaurantId, user?.restaurantId as string), ne(tags.id, params.id)))
        if (tagExists.length > 0) {
            throw status(400, 'Tag already exists')
        }
        const updated = await db.update(tags).set({
            name: body.name.trim().toLowerCase(),
            key
        }).where(and(eq(tags.id, params.id), eq(tags.type, 'diet'), eq(tags.restaurantId, user?.restaurantId as string)))
        if (!updated) {
            throw status(400, 'Failed to update diet')
        }
        translationQueue.add(body, params.id, lang).then(async (result) => {
            await db.update(tags).set({
                translations: result.translations,
                translationStatus: 'completed'
            }).where(eq(tags.id, params.id))
        }).catch(async () => {
            await db.update(tags).set({
                translationStatus: 'failed'
            }).where(eq(tags.id, params.id))
        });
        audit.updated({ entity: 'diets', entityId: params.id, before: {}, after: body, performedBy: user?.id as string, restaurantId: user?.restaurantId as string ?? undefined })
        return { success: true, message: 'Diet updated successfully' }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
}, {
    params: t.Object({
        id: t.String({
            error: 'Diet ID is required',
            format: 'uuid'
        })
    }),
    body: t.Object({
        name: t.String({
            error: 'Name is required',
            minLength: 2
        })
    })
})

router.delete('/diets/:id', async ({ params, store: { user }, status }) => {
    try {
        const deleted = await db.delete(tags).where(and(eq(tags.id, params.id), eq(tags.type, 'diet'), eq(tags.restaurantId, user?.restaurantId as string), ne(tags.isSystem, true))).returning()
        if (!deleted) {
            throw status(400, 'Failed to delete diet')
        }
        audit.deleted({ entity: 'diets', entityId: params.id, performedBy: user?.id as string, restaurantId: user?.restaurantId as string ?? undefined, before: deleted[0] })
        return { success: true, message: 'Diet deleted successfully' }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
}, {
    params: t.Object({
        id: t.String({
            error: 'Diet ID is required',
            format: 'uuid'
        })
    })
})

export default router;