import Elysia, { t } from "elysia";
import { db } from "../../../db";
import { authPlugin } from "../../../middleware/auth";
import { addons } from "../../../db/schema";
import { translationQueue } from "../../../queues/translations";
import { and, asc, eq, sql } from "drizzle-orm";
import { pickTruthy } from "../../../../utils";
import { resolveTranslatedField } from "../../../../utils/translations";
import _ from "lodash";
import { audit } from "../../../../utils/audit";

const router = new Elysia({ prefix: '/addons', tags: ['Addons'] })
    .use(authPlugin)

router.post('/', async ({ body, store: { user, lang }, status }) => {
    try {
        const inserted = await db.insert(addons).values({
            name: sql`lower(${body.name})`,
            restaurantId: user?.restaurantId as string,
            price: body.price?.toString() ?? '0.00'
        }).returning({
            id: addons.id
        })
        translationQueue.add({
            name: body.name,
        }, inserted[0].id as string, lang).then(async (result) => {
            await db.update(addons).set({
                translations: result.translations,
                translationStatus: 'completed'
            }).where(eq(addons.id, inserted[0].id as string));
        }).catch(async (error) => {
            await db.update(addons).set({
                translationStatus: 'failed'
            }).where(eq(addons.id, inserted[0].id as string));
            throw new Error(`Failed to translate addon: ${error.message}`);
        });
        audit.created({ entity: 'addons', entityId: inserted[0].id as string, after: body, performedBy: user?.id as string, restaurantId: user?.restaurantId as string ?? undefined })
        return { success: true, message: 'Addon created successfully' }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
}, {
    body: t.Object({
        name: t.String({
            error: 'Name is required',
            minLength: 2
        }),
        price: t.Optional(t.String())
    })
})

router.get('/', async ({ store: { user, lang }, status }) => {
    try {
        const allAddons = await db.select().from(addons).where(eq(addons.restaurantId, user?.restaurantId as string)).orderBy(asc(addons.createdAt))
        const translatedAddons = allAddons.map((addon) => {
            const newAddon = _.omit(addon, ['translations', 'translationStatus'])
            return {
                ...newAddon,
                name: resolveTranslatedField(addon.name, addon.translations, 'name', lang),
            }
        })
        return { success: true, data: translatedAddons }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
})

router.get('/:id', async ({ params: { id }, store: { lang }, status }) => {
    try {
        const addon = await db.select().from(addons).where(eq(addons.id, id))
        if (!addon) {
            throw status(404, 'Addon not found')
        }
        const translatedAddons = addon.map((addon) => {
            return {
                ...addon,
                name: resolveTranslatedField(addon.name, addon.translations, 'name', lang),
            }
        })
        return { success: true, data: translatedAddons }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
})

router.put('/:id', async ({ params: { id }, body, store: { user, lang }, status }) => {
    try {
        const updated = await db.update(addons).set({
            name: body.name,
            price: body.price?.toString(),
            translationStatus: 'pending'
        }).where(and(eq(addons.id, id), eq(addons.restaurantId, user?.restaurantId as string)))

        if (!updated) {
            throw status(400, 'Failed to update addon');
        }
        const omittedBody = _.omit(body, ['price']);
        const translationBody = pickTruthy(omittedBody);
        translationQueue.add({ ...translationBody }, id, lang).then(async (result) => {
            await db.update(addons).set({
                translations: result.translations,
                translationStatus: 'completed'
            }).where(eq(addons.id, id));
        }).catch(async () => {
            await db.update(addons).set({
                translationStatus: 'failed'
            }).where(eq(addons.id, id));
        });
        audit.updated({ entity: 'addons', entityId: id, before: {}, after: body, performedBy: user?.id as string, restaurantId: user?.restaurantId as string ?? undefined })
        return { success: true, message: 'Addon updated successfully' }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
}, {
    params: t.Object({
        id: t.String({
            error: 'Addon ID is required',
            format: 'uuid'
        })
    }),
    body: t.Object({
        name: t.Optional(t.String({
            error: 'Name is required',
            minLength: 2
        })),
        price: t.Optional(t.String())
    })
})

router.delete('/:id', async ({ params: { id }, store: { user }, status }) => {
    try {
        const deleted = await db.delete(addons).where(and(eq(addons.id, id), eq(addons.restaurantId, user?.restaurantId as string))).returning()
        if (!deleted) {
            throw status(400, 'Failed to delete addon')
        }
        audit.deleted({ entity: 'addons', entityId: id, performedBy: user?.id as string, restaurantId: user?.restaurantId as string ?? undefined, before: deleted[0] })
        return { success: true, message: 'Addon deleted successfully' }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
}, {
    tags: ['Addons'],
    params: t.Object({
        id: t.String({
            error: 'Addon ID is required',
            format: 'uuid'
        })
    })
})

export default router