import Elysia, { t } from "elysia"
import { authPlugin } from "../../../middleware/auth"
import { db } from "../../../db"
import { menuItems, menuSections } from "../../../db/schema"
import { desc, eq, sql } from "drizzle-orm"
import { translationQueue } from "../../../queues/translations"
import { resolveTranslatedField } from "../../../../utils/translations"
import { pickTruthy } from "../../../../utils"
import { audit } from "../../../../utils/audit"

const router = new Elysia({ prefix: '/menu-sections', tags: ['Menu Sections'] })
    .use(authPlugin)

router.post('/:menuId', async ({ params: { menuId }, body, store: { user, lang }, status }) => {
    try {
        const inserted = await db.insert(menuSections).values({
            ...body,
            menuId: menuId,
            name: sql`lower(${body.name})`,
        }).returning({
            id: menuSections.id
        })
        translationQueue.add(pickTruthy(body), inserted[0].id as string, lang).then(async (result) => {
            await db.update(menuSections).set({
                translations: result.translations,
                translationStatus: 'completed'
            }).where(eq(menuSections.id, inserted[0].id as string))
        }).catch(async () => {
            await db.update(menuSections).set({
                translationStatus: 'failed'
            }).where(eq(menuSections.id, inserted[0].id as string))
        });
        if (!inserted) {
            throw status(400, 'Failed to create section');
        }
        audit.created({ entity: 'menu_section', entityId: inserted[0].id as string, after: body, performedBy: user?.id as string, restaurantId: user?.restaurantId as string ?? undefined })
        return { success: true, message: 'Menu section created successfully' }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
}, {
    body: t.Object({
        name: t.String({
            error: 'Name is required',
            minLength: 2
        }),
        description: t.Optional(t.String())
    })
})

router.get('/:menuId', async ({ params: { menuId }, store: { lang }, status }) => {
    try {
        const allSections = await db.query.menuSections.findMany({
            where: () => eq(menuSections.menuId, menuId),
            columns: {
                name: true,
                sortOrder: true,
                menuId: true,
                translations: true,
                description: true,
                id: true,
            },
            orderBy: desc(menuSections.sortOrder)
        })

        const translatedSections = allSections.map((section) => {
            return {
                id: section.id,
                name: resolveTranslatedField(section?.name ?? '', section?.translations ?? {}, 'name', lang),
                sortOrder: section?.sortOrder ?? 0,
                menuId: section?.menuId ?? '',
                description: section?.description ?? '',
            }
        })

        return { success: true, data: translatedSections }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
})

router.delete('/:id', async ({ params: { id }, store: { user }, status }) => {
    try {
        const deleted = await db.delete(menuSections).where(eq(menuSections.id, id)).returning()
        if (!deleted) {
            throw status(400, 'Failed to delete section');
        }
        audit.deleted({ entity: 'menu_section', entityId: id, performedBy: user?.id as string, restaurantId: user?.restaurantId as string ?? undefined, before: deleted[0] })
        return { success: true, message: 'Menu section deleted successfully' }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
})

router.put('/:id', async ({ params: { id }, body, store: { user, lang }, status }) => {
    try {
        const updated = await db.update(menuSections).set({
            name: sql`lower(${body.name})`,
            description: body.description,
        }).where(eq(menuSections.id, id)).returning()
        const translationBody = pickTruthy(body);
        translationQueue.add(translationBody, id, lang).then(async (result) => {
            await db.update(menuSections).set({
                translations: result.translations,
                translationStatus: 'completed'
            }).where(eq(menuSections.id, id))
        }).catch(async () => {
            await db.update(menuSections).set({
                translationStatus: 'failed'
            }).where(eq(menuSections.id, id))
        });
        if (!updated) {
            throw status(400, 'Failed to update section');
        }
        audit.updated({ entity: 'menu_section', entityId: id, before: {}, after: updated[0], performedBy: user?.id as string, restaurantId: user?.restaurantId as string ?? undefined })
        return { success: true, message: 'Menu section updated successfully' }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
}, {
    params: t.Object({
        id: t.String({
            error: 'Section ID is required',
            format: 'uuid'
        })
    }),
    body: t.Object({
        name: t.Optional(t.String({
            error: 'Name is required',
            minLength: 2
        })),
        description: t.Optional(t.String())
    })
})

router.post('/delete-and-move-items-to-other-section/:sectionId', async ({ params: { sectionId }, body, status }) => {
    try {

        const operation = await db.transaction(async (tx) => {
            const updated = await tx.update(menuItems).set({
                sectionId: body.adjacentSectionId
            }).where(eq(menuItems.sectionId, sectionId))
            if (!updated) {
                throw status(400, 'Failed to move items to other section');
            }
            const deleted = await tx.delete(menuSections).where(eq(menuSections.id, sectionId))
            if (!deleted) {
                throw status(400, 'Failed to delete section');
            }
            return { updated, deleted }
        })
        if (!operation.updated || !operation.deleted) {
            throw status(400, 'Failed to delete and move items to other section');
        }
        return { success: true, message: 'Items deleted and moved to other section successfully' }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
}, {
    params: t.Object({
        sectionId: t.String({
            error: 'Section ID is required',
            format: 'uuid'
        })
    }),
    body: t.Object({
        adjacentSectionId: t.String({
            error: 'Adjacent section ID is required',
            format: 'uuid'
        })
    })
})

export default router;