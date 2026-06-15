import Elysia, { t } from "elysia"
import { authPlugin } from "../../../middleware/auth";
import { tags } from "../../../db/schema";
import { db } from "../../../db";
import { and, eq } from "drizzle-orm";
import slugify from "slugify";
import { translationQueue } from "../../../queues/translations";
import { resolveTranslatedField } from "../../../../utils/translations";
import { audit } from "../../../../utils/audit";

const router = new Elysia({ prefix: '/menu-item-tags', tags: ['Menu Item Tags'] })
    .use(authPlugin)


router.get('/', async ({ store: { user, lang }, status }) => {
    try {
        const allTags = await db.query.tags.findMany({
            where: eq(tags.restaurantId, user?.restaurantId as string),
            columns: {
                id: true,
                name: true,
                type: true,
                translations: true,
                description: true,
            }
        })

        const translatedTags = allTags.map(tag => ({
            ...tag,
            name: resolveTranslatedField(tag?.name ?? '', tag?.translations ?? {}, 'name', lang),
            description: resolveTranslatedField(tag?.description ?? '', tag?.translations ?? {}, 'description', lang)
        }))
        return { success: true, data: translatedTags }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
}, {
    tags: ['Menu Item Tags']
})

router.post('/diet', async ({ body, store: { user, lang }, status }) => {
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
            type: 'diet',
            restaurantId: user?.restaurantId as string,
            key
        }).returning({
            id: tags.id
        })
        if (!inserted) {
            throw status(400, 'Failed to create menu item tag')
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
        return { success: true, message: 'Menu item tag created successfully' }
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

export default router;