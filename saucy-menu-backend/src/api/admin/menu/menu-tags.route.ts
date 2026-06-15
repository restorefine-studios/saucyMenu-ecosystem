import Elysia, { t } from "elysia"
import { db } from "../../../db"
import { authPlugin } from "../../../middleware/auth"
import { and, desc, eq, sql } from "drizzle-orm"
import { tags } from "../../../db/schema"
import { resolveTranslatedField } from "../../../../utils/translations"
import { translationQueue } from "../../../queues/translations"
import slugify from "slugify"
import { audit } from "../../../../utils/audit"

const router = new Elysia({ prefix: '/menu-tags', tags: ['Menu Tags'] })
    .use(authPlugin)

router.post('/diet', async ({ body, store: { user, lang }, status }) => {
    const alreadyExists = await db.select().from(tags)
        .where(and(eq(sql`lower(${tags.name})`, body.name.toLowerCase()),
            eq(tags.type, 'diet'), eq(tags.restaurantId, user?.restaurantId as string)))
    if (alreadyExists.length > 0) {
        throw status(400, 'Diet already exists')
    }
    const key = slugify(body.name, {
        lower: true,
        trim: true,
        strict: true
    }).replace(/-/g, "_")
    const inserted = await db.insert(tags).values({
        ...body,
        type: 'diet',
        restaurantId: user?.restaurantId as string,
        translationStatus: 'pending',
        key
    }).returning({
        id: tags.id
    })
    translationQueue.add(body, inserted[0].id as string, lang).then(async (result) => {
        await db.update(tags).set({
            translations: result.translations,
            translationStatus: 'completed'
        }).where(eq(tags.id, inserted[0].id as string))
    }).catch(async (error) => {
        await db.update(tags).set({
            translationStatus: 'failed'
        }).where(eq(tags.id, inserted[0].id as string))
        throw new Error(`Failed to translate diet: ${error.message}`)
    });
    audit.created({ entity: 'diets', entityId: inserted[0].id as string, after: body, performedBy: user?.id as string, restaurantId: user?.restaurantId as string ?? undefined })
    return { success: true, message: 'Diet created successfully' }

}, {
    body: t.Object({
        name: t.String({
            error: 'Name is required',
            minLength: 2
        })
    })
})

router.get('/diet', async ({ store: { user, lang }, status }) => {
    try {
        const allTags = await db.query.tags.findMany({
            where: and(eq(tags.restaurantId, user?.restaurantId as string), eq(tags.type, 'diet')),
            orderBy: desc(tags.createdAt)
        })
        const translatedTags = allTags.map(tag => ({
            ...tag,
            name: resolveTranslatedField(tag?.name ?? '', tag?.translations ?? {}, 'name', lang)
        }))
        return { success: true, data: translatedTags }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
}, {
    tags: ['Menu Tags']
})

router.put('/diet/:id', async ({ params, body, store: { user, lang }, status }) => {
    const updated = await db.update(tags).set({
        ...body,
        translationStatus: 'pending'
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
}, {
    tags: ['Menu Tags'],
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

router.delete('/diet/:id', async ({ params, store: { user }, status }) => {
    const deleted = await db.delete(tags).where(and(eq(tags.id, params.id), eq(tags.type, 'diet'))).returning()
    if (!deleted) {
        throw status(400, 'Failed to delete diet')
    }
    audit.deleted({ entity: 'diets', entityId: params.id, performedBy: user?.id as string, restaurantId: user?.restaurantId as string ?? undefined, before: deleted[0] })
    return { success: true, message: 'Diet deleted successfully' }
}, {
    tags: ['Menu Tags'],
    params: t.Object({
        id: t.String({
            error: 'Diet ID is required',
            format: 'uuid'
        })
    })
})

router.get('/allergen', async ({ store: { user, lang }, status }) => {
    try {
        const allTags = await db.query.tags.findMany({
            where: and(eq(tags.restaurantId, user?.restaurantId as string), eq(tags.type, 'allergen'))
        })
        const translatedTags = allTags.map(tag => ({
            ...tag,
            name: resolveTranslatedField(tag?.name ?? '', tag?.translations ?? {}, 'name', lang)
        }))
        return { success: true, data: translatedTags }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
})

router


export default router;