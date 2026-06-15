import Elysia, { t } from "elysia"
import { userAuthPlugin } from "../../../middleware/auth"
import { db } from "../../../db"
import { and, eq, getTableColumns, ilike, inArray, isNotNull, sql } from "drizzle-orm"
import { menu, menuItems, menuItemTags, menuSections, tags } from "../../../db/schema"
import { resolveTranslatedField } from "../../../../utils/translations"
import _ from "lodash"


const router = new Elysia({ prefix: '/menu', tags: ['User Menu'] })
    .use(userAuthPlugin)

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
        const menusData = await db.select({
            ...getTableColumns(menu),
        })
            .from(menu)
            .where(and(
                eq(menu.restaurantId, user.restaurantId),
                searchCondition
            ))
            .groupBy(menu.id);

        // Get menu IDs
        const menuIds = menusData.map(m => m.id);

        if (menuIds.length === 0) {
            return { success: true, data: [] };
        }

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
                sql`array_length(${menuItems.images}, 1) > 0` // Ensures the array is not empty
            ));

        // Create a map of menuId -> first image
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

        return {
            success: true,
            data: menusData.map((menuItem) => {
                const omittedMenu = _.omit(menuItem, ['translations', 'translationStatus']);
                return {
                    ...omittedMenu,
                    name: resolveTranslatedField(menuItem.name, menuItem.translations, 'name', lang),
                    description: resolveTranslatedField(menuItem.description ?? '', menuItem.translations, 'description', lang),
                    image: menuImagesMap.get(menuItem.id) ?? null, // First menu item image
                }
            })
        };
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
}, {
    query: t.Object({
        search: t.Optional(t.String()),
    })
})

router.get('menu-items/all', async ({ store: { user, lang }, status }) => {
    try {
        // const mI = await db.query.menuItems.findMany({
        //     where: eq(menuItems.restaurantId, user?.restaurantId as string),

        // })
        const mI = await db.select({
            ...getTableColumns(menuItems),
            section: {
                name: menuSections.name,
                id: menuSections.id,
                sortOrder: menuSections.sortOrder,
                translations: menuSections.translations,
            },
            tags: {
                name: tags.name,
                description: tags.description,
                translations: tags.translations,
            },
        }).from(menuItems)
            .leftJoin(menuSections, eq(menuItems.sectionId, menuSections.id))
            .leftJoin(menuItemTags, eq(menuItems.id, menuItemTags.menuItemId))
            .leftJoin(tags, eq(menuItemTags.tagId, tags.id))
            .where(eq(menuItems.restaurantId, user?.restaurantId as string))
        const formattedItems = mI.map((item) => {
            const omittedItem = _.omit(item, ['translations', 'name', 'description', 'translationStatus', 'restaurantId', 'sectionId', 'section', 'section.translations']);
            return {
                name: resolveTranslatedField(item.name, item.translations, 'name', lang),
                description: resolveTranslatedField(item.description ?? '', item.translations, 'description', lang),
                section: item.section ? {
                    id: item.section.id,
                    name: resolveTranslatedField(item.section.name, item.section.translations, 'name', lang),
                } : null,

                ...omittedItem,
            }
        })
        return { success: true, data: formattedItems }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
})

router.get('/items/:menuId', async ({ store: { user, lang }, params: { menuId }, status }) => {
    try {
        const items = await db.query.menuItems.findMany({
            where: and(eq(menuItems.restaurantId, user?.restaurantId as string), eq(menuItems.id, menuId)),
            with: {
                section: {
                    columns: {
                        name: true,
                        id: true,
                        sortOrder: true,
                        translations: true
                    }
                },
                tags: {
                    with: {
                        tag: {
                            columns: {
                                name: true,
                                id: true,
                                description: true,
                                translations: true
                            }
                        }
                    }
                }
            }
        })

        const formattedItems = items.map((item) => {
            return {
                ...item,
                name: resolveTranslatedField(item.name, item.translations, 'name', lang),
                description: resolveTranslatedField(item.description ?? '', item.translations, 'description', lang),
                section: {
                    ...item.section,
                    name: resolveTranslatedField(item.section?.name ?? '', item.section?.translations ?? {}, 'name', lang),
                },
                tags: item.tags.map((tag) => {
                    return {
                        ...tag.tag,
                        name: resolveTranslatedField(tag.tag.name, tag.tag.translations, 'name', lang),
                        description: resolveTranslatedField(tag.tag.description ?? '', tag.tag.translations, 'description', lang),
                    }
                })
            }
        })

        return { success: true, data: formattedItems }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
})

export default router