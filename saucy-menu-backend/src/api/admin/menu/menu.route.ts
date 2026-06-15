import Elysia, { t } from "elysia";
import { authPlugin } from "../../../middleware/auth";
import { db } from "../../../db";
import { menu, menuItems, menuSections } from "../../../db/schema";
import { and, eq, ilike, inArray, sql } from "drizzle-orm";
import { resolveTranslatedField } from "../../../../utils/translations";
import { translationQueue } from "../../../queues/translations";
import { pickTruthy } from "../../../../utils";
import { audit } from "../../../../utils/audit";
import _ from "lodash";

const router = new Elysia({ prefix: '/menu' })
    .use(authPlugin)

router.post('/', async ({ body, store: { user, lang }, status }) => {
    try {
        const inserted = await db.insert(menu).values({
            ...body,
            restaurantId: user?.restaurantId as string,
            translationStatus: 'pending'
        }).returning({
            id: menu.id
        })

        translationQueue.add(pickTruthy(body), inserted[0].id as string, lang).then(async (result) => {
            await db.update(menu).set({
                translations: result.translations,
                translationStatus: 'completed'
            }).where(eq(menu.id, inserted[0].id as string))

        }).catch(async () => {
            await db.update(menu).set({
                translationStatus: 'failed'
            }).where(eq(menu.id, inserted[0].id as string))
        });
        await audit.created({ entity: 'menu', entityId: inserted[0].id as string, after: body, performedBy: user?.id as string, restaurantId: user?.restaurantId as string ?? undefined })
        return { success: true, message: 'Menu Created Successfully', translationStatus: 'pending' }
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
    }),
    tags: ['Menu']
})

router.get('/', async ({ store: { user, lang }, query: { search }, status }) => {
    try {
        // Validate user
        if (!user?.restaurantId) {
            throw status(401, 'Unauthorized');
        }

        const searchCondition = search
            ? ilike(sql`lower(${menu.name})`, `%${search.toLowerCase()}%`)
            : undefined;

        // First, get the menus
        const menus = await db.select()
            .from(menu)
            .where(and(
                eq(menu.restaurantId, user.restaurantId),
                searchCondition
            ));

        if (menus.length === 0) {
            return { success: true, data: [] };
        }

        // Get menu IDs
        const menuIds = menus.map(m => m.id);

        // Fetch menu items with images for these menus
        const menuItemsWithImages = await db.select({
            menuId: menuSections.menuId,
            itemId: menuItems.id,
            images: menuItems.images,
        })
            .from(menuSections)
            .innerJoin(menuItems, eq(menuItems.sectionId, menuSections.id))
            .where(and(
                inArray(menuSections.menuId, menuIds),
                sql`array_length(${menuItems.images}, 1) > 0`, // Has at least one element
                sql`${menuItems.images}[1] != ''` // First element is not an empty string
            ));

        // Create a map of menuId -> first valid image
        const menuImagesMap = new Map<string, string | null>();

        for (const item of menuItemsWithImages) {
            if (!menuImagesMap.has(item.menuId) && item.images && item.images.length > 0) {
                // Filter out empty strings and malformed JSON strings
                const validImage = item.images.find(img =>
                    img &&
                    img.trim() !== '' &&
                    !img.startsWith('[') // Skip malformed JSON like "[\"FoodImage/...\"]"
                );

                if (validImage) {
                    menuImagesMap.set(item.menuId, validImage);
                }
            }
        }

        const translatedMenus = menus.map((menuItem) => {
            return {
                id: menuItem.id,
                name: resolveTranslatedField(menuItem.name, menuItem.translations, 'name', lang),
                description: resolveTranslatedField(menuItem.description ?? '', menuItem.translations, 'description', lang),
                startTime: menuItem.startTime,
                endTime: menuItem.endTime,
                active: menuItem.active,
                image: menuImagesMap.get(menuItem.id) ?? null, // First valid menu item image
            }
        });

        return { success: true, data: translatedMenus };
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
}, {
    tags: ['Menu'],
    query: t.Object({
        search: t.Optional(t.String()),
    })
})
router.get('/:id', async ({ params: { id }, store: { lang }, status }) => {
    try {
        const item = await db.query.menu.findFirst({
            where: eq(menu.id, id),
            with: {
                items: true
            }
        })
        if (!item) {
            throw status(404, 'Menu not found');
        }
        const translatedItem = {
            ...item,
            name: resolveTranslatedField(item?.name ?? '', item?.translations ?? {}, 'name', lang),
            description: resolveTranslatedField(item?.description ?? '', item?.translations ?? {}, 'description', lang),
            items: item?.items?.map((menuItem) => {
                return {
                    ...menuItem,
                    name: resolveTranslatedField(menuItem?.name ?? '', menuItem?.translations ?? {}, 'name', lang),
                    description: resolveTranslatedField(menuItem?.description ?? '', menuItem?.translations ?? {}, 'description', lang),
                }
            })
        }
        return { success: true, data: translatedItem }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
}, {
    tags: ['Menu'],
    params: t.Object({
        id: t.String({
            error: 'Menu ID is required',
            minLength: 2,
            format: 'uuid'
        })
    })
})

router.put('/:id', async ({ params: { id }, body, store: { user, lang }, status }) => {
    try {

        const updated = await db.update(menu).set(body).where(
            and(eq(menu.id, id),
                eq(menu.restaurantId, user?.restaurantId as string)))
        translationQueue.add(body, id, lang).then(async (result) => {
            await db.update(menu).set({
                translations: result.translations,
                translationStatus: 'completed'
            }).where(eq(menu.id, id))
        }).catch(async (error) => {
            await db.update(menu).set({
                translationStatus: 'failed'
            }).where(eq(menu.id, id))
            throw new Error(`Failed to translate menu: ${error.message}`)
        });
        if (!updated) {
            throw new Error('Failed to update menu');
        }
        audit.updated({ entity: 'menu', entityId: id, before: body, after: body, performedBy: user?.id as string, restaurantId: user?.restaurantId as string ?? undefined })
        return { success: true, message: 'Menu Updated Successfully' }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
}, {
    tags: ['Menu'],
    params: t.Object({
        id: t.String({
            error: 'Menu ID is required',
            minLength: 2,
            format: 'uuid'
        })
    }),
    body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String())
    })
})

router.delete('/:id', async ({ params: { id }, store: { user }, status }) => {
    const foundMenu = await db.select().from(menu).where(and(eq(menu.id, id), eq(menu.restaurantId, user?.restaurantId as string)))
    if (foundMenu.length === 0) {
        throw status(404, 'Menu not found');
    }
    try {
        const deleted = await db.delete(menu).where(eq(menu.id, id))
        if (!deleted) {
            throw new Error('Failed to delete menu');
        }
        audit.deleted({ entity: 'menu', entityId: id, before: foundMenu[0], performedBy: user?.id as string, restaurantId: user?.restaurantId as string ?? undefined })
        return { success: true, message: 'Menu Deleted Successfully' }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
}, {
    tags: ['Menu'],
    params: t.Object({
        id: t.String({
            error: 'Menu ID is required',
            minLength: 2,
            format: 'uuid'
        })
    })
})

router.get('/menus-sections', async ({ store: { user, lang }, status }) => {
    try {
        const menusAndSections = await db.query.menu.findMany({
            where: eq(menu.restaurantId, user?.restaurantId as string),
            with: {
                sections: {
                    columns: {
                        name: true,
                        id: true,
                        sortOrder: true,
                        translations: true,
                    }
                }
            }
        })
        const translatedSections = menusAndSections.map((menu) => {

            return {
                id: menu.id,
                name: resolveTranslatedField(menu.name, menu.translations, 'name', lang),
                sections: menu.sections.map((section) => {
                    const omittedSection = _.omit(section, ['translations', 'translationStatus']);
                    return {
                        ...omittedSection,
                        name: resolveTranslatedField(section.name, section.translations, 'name', lang)
                    }
                })
            }
        })
        return { success: true, data: translatedSections }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
}, {
    tags: ['Menu'],
})

export default router;

