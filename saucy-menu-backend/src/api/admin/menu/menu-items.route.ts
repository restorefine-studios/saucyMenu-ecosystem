import Elysia, { t } from "elysia";
import { authPlugin } from "../../../middleware/auth";
import { allergens, menuItemAddons, menuItemAllergens, menuItems, menuItemTags, menuItemVariants, tags } from "../../../db/schema";
import { db } from "../../../db";
import { and, desc, eq, inArray, like, sql } from "drizzle-orm";
import { translationQueue } from "../../../queues/translations";
import { resolveTranslatedField } from "../../../../utils/translations";
import { paginationDto, paginationResponse } from "../../../lib/paginator";
import { pickTruthy } from "../../../../utils";
import _ from "lodash";
import { bulkMenuItemSchema, bulkUploadMenuItems } from "./bulk-menu.service";
import { audit } from "../../../../utils/audit";

const addMenuItemDto = t.Object({
    name: t.String({
        error: 'Name is required',
        minLength: 2
    }),
    description: t.Optional(t.String()),
    sectionId: t.String({
        error: 'Section ID is required',
        minLength: 2,
        format: 'uuid'
    }),
    images: t.Optional(t.Array(t.String())),
    price: t.Any({
        error: 'Price is required',
        minLength: 1,
        // precision: 10,
        // scale: 2,
    }),
    type: t.Enum({ dish: 'dish', drink: 'drink' }, {
        default: 'dish'
    }),
    discountType: t.Optional(t.Enum({ percentage: 'percentage', fixed: 'fixed' })),
    discountValue: t.Optional(t.Any({
    })),
    discountStartAt: t.Optional(t.Date({
    })),
    discountEndAt: t.Optional(t.Date({
    })),
    discountLabel: t.Optional(t.String()),
    ingredients: t.Optional(t.Array(t.String())),
    isAvailable: t.Optional(t.Boolean()),
    spiceLevel: t.Optional(t.String()),
    cookTime: t.Optional(t.Number()),
    isAlcoholic: t.Optional(t.Boolean()),
    hasVariants: t.Optional(t.Boolean()),
    isChefsRecommended: t.Optional(t.Boolean()),
    isPopular: t.Optional(t.Boolean()),
    isNew: t.Optional(t.Boolean()),
    isLimitedTime: t.Optional(t.Boolean()),
    allergens: t.Optional(t.Array(t.String())),
    addOns: t.Optional(t.Array(t.String())),
    tags: t.Optional(t.Array(t.String())),
    variants: t.Optional(t.Array(t.Object({
        name: t.String(),
        price: t.Any(),
        isAvailable: t.Optional(t.Boolean()),
    }))),
})
const router = new Elysia({ prefix: '/menu-items', tags: ['Menu Items'] })
    .use(authPlugin)

router.post('/', async ({ body, store: { user, lang }, status }) => {
    try {
        const price = parseFloat(String(body.price).replace(",", "."));
        const discountValue = body.discountValue !== undefined
            ? parseFloat(String(body.discountValue).replace(",", "."))
            : undefined;

        const transaction = await db.transaction(async (tx) => {
            const inserted = await tx.insert(menuItems).values({
                ...body,
                spiceLevel: body.spiceLevel as any,
                restaurantId: user?.restaurantId as string,
                price: price as any,
                discountValue: discountValue !== undefined ? discountValue as any : undefined,
                ingredients: body.ingredients ?? [],
            }).returning({
                id: menuItems.id
            })
            if (body.allergens) {
                for (const allergen of body.allergens) {
                    await tx.insert(menuItemAllergens).values({
                        menuItemId: inserted[0].id,
                        allergenId: allergen,
                    })
                }
            }
            if (body.variants) {
                for (const variant of body.variants) {

                    await tx.insert(menuItemVariants).values({
                        itemId: inserted[0].id,
                        name: variant.name,
                        price: variant.price as any,
                    })
                }
            }
            if (body.addOns) {
                for (const addOn of body.addOns) {
                    await tx.insert(menuItemAddons).values({
                        itemId: inserted[0].id,
                        addonId: addOn,
                    })
                }
            }
            if (body.tags) {
                for (const tag of body.tags) {
                    await tx.insert(menuItemTags).values({
                        menuItemId: inserted[0].id,
                        tagId: tag,
                    })
                }
            }
            return inserted;
        })
        if (!transaction) {
            throw status(400, 'Failed to create menu item');
        }
        const itemsToTranslate = pickTruthy({
            description: body.description,
            ingredients: body.ingredients
        })
        translationQueue.add(itemsToTranslate, transaction[0]?.id as string, lang).then(async (result) => {
            await db.update(menuItems).set({
                translations: result.translations,
                translationStatus: 'completed',
                ingredients: result.ingredients?.join(',') ?? ''
            }).where(eq(menuItems.id, transaction[0]?.id as string))
        }).catch(async () => {
            await db.update(menuItems).set({
                translationStatus: 'failed'
            }).where(eq(menuItems.id, transaction[0].id as string))
        })
        if (body?.variants) {
            for (const variant of body.variants) {
                translationQueue.add(pickTruthy({
                    name: variant.name,
                }), transaction[0]?.id as string, lang).then(async (result) => {
                    await db.update(menuItemVariants).set({
                        translations: result.translations,
                        translationStatus: 'completed'
                    }).where(eq(menuItemVariants.itemId, transaction[0]?.id as string))
                }).catch(async () => {
                    await db.update(menuItemVariants).set({
                        translationStatus: 'failed'
                    }).where(eq(menuItemVariants.itemId, transaction[0]?.id as string))
                })
            }
        }
        audit.created({ entity: 'menu_item', entityId: transaction[0]?.id as string, after: body, performedBy: user?.id as string, restaurantId: user?.restaurantId as string ?? undefined })
        return { success: true, message: 'Menu item created successfully' }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
}, {
    body: addMenuItemDto
})

// fetch all menu items
router.get('/', async ({ store: { user, lang }, query, status }) => {
    try {
        const searchCondition = query.search ? like(sql`lower(${menuItems.name})`, `%${query.search.toLowerCase()}%`) : undefined;
        const sectionIdCondition = query.sectionId ? eq(menuItems.sectionId, query.sectionId) : undefined;
        const filters = [eq(menuItems.restaurantId, user?.restaurantId as string), sectionIdCondition, searchCondition]
        const [totalItems, allMenuItems] = await Promise.all([
            db.$count(menuItems, and(...filters)),
            db.select().from(menuItems).where(and(...filters)).orderBy(desc(menuItems.createdAt)).limit(query.limit ?? 10).offset(query.offset ?? 0)
        ])

        // Early return if no items
        if (allMenuItems.length === 0) {
            const response = paginationResponse([], totalItems, query.limit ?? 10, query.offset ?? 0);
            return { success: true, data: response };
        }

        const itemIds = allMenuItems.map((item) => item.id)

        // Fetch tags and allergens separately
        const [itemTagsData, itemAllergensData] = await Promise.all([
            db.select({
                menuItemId: menuItemTags.menuItemId,
                tag: tags
            })
                .from(menuItemTags)
                .innerJoin(tags, eq(menuItemTags.tagId, tags.id))
                .where(inArray(menuItemTags.menuItemId, itemIds)),

            db.select({
                menuItemId: menuItemAllergens.menuItemId,
                allergen: allergens
            })
                .from(menuItemAllergens)
                .innerJoin(allergens, eq(menuItemAllergens.allergenId, allergens.id))
                .where(inArray(menuItemAllergens.menuItemId, itemIds))
        ]);

        // Group by menu item
        const tagsMap = itemTagsData.reduce((map, { menuItemId, tag }) => {
            if (!map.has(menuItemId)) map.set(menuItemId, []);
            map.get(menuItemId)!.push(tag);
            return map;
        }, new Map<string, typeof tags.$inferSelect[]>());

        const allergensMap = itemAllergensData.reduce((map, { menuItemId, allergen }) => {
            if (!map.has(menuItemId)) map.set(menuItemId, []);
            map.get(menuItemId)!.push(allergen);
            return map;
        }, new Map<string, typeof allergens.$inferSelect[]>());



        // Helper function to translate an item with nested relations
        const translateItem = (item: typeof allMenuItems[0]) => {
            const { translations, name, description, translationStatus, restaurantId, ingredients, ...rest } = item;
            const omittedItem = _.omit(item, ['description', 'translationStatus', 'restaurantId', 'translations']);

            return {
                ...omittedItem,
                description: resolveTranslatedField(description ?? '', translations, 'description', lang),
                tags: (tagsMap.get(item.id) ?? []).map(tag => ({
                    id: tag.id,
                    name: resolveTranslatedField(tag.name, tag.translations, 'name', lang),
                })),
                allergens: (allergensMap.get(item.id) ?? []).map(allergen => ({
                    id: allergen.id,
                    name: resolveTranslatedField(allergen.name, allergen.translations, 'name', lang),
                })),
                ingredients: resolveTranslatedField(ingredients?.join(',') ?? '', translations, 'ingredients', lang).split(','),
            };
        };

        const translatedMenuItems = allMenuItems.map(translateItem);
        const response = paginationResponse(translatedMenuItems, totalItems, query.limit ?? 10, query.offset ?? 0)

        return { success: true, data: response }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
}, {
    tags: ['Menu Items'],
    query: t.Composite([t.Object({
        sectionId: t.Optional(t.String({
            format: 'uuid'
        })),
        search: t.Optional(t.String())
    }), paginationDto]),
})

router.get('/:id', async ({ params: { id }, store: { lang }, status }) => {

    const item = await db.query.menuItems.findFirst({
        where: eq(menuItems.id, id),
    })
    const itemTags = await db.query.menuItemTags.findMany({
        where: eq(menuItemTags.menuItemId, id),
        with: {
            tag: true,
        }
    })
    const itemAllergens = await db.query.menuItemAllergens.findMany({
        where: eq(menuItemAllergens.menuItemId, id),
        with: {
            allergen: true,
        }
    })
    const itemAddons = await db.query.menuItemAddons.findMany({
        where: eq(menuItemAddons.itemId, id),
        with: {
            addon: true,
        }
    })
    const itemVariants = await db.query.menuItemVariants.findMany({
        where: eq(menuItemVariants.itemId, id)
    })
    const translatedIngredients = resolveTranslatedField(item?.ingredients?.join(',') ?? '', item?.translations ?? {}, 'ingredients', lang).split(',');
    if (!item) {
        throw status(404, 'Menu item not found');
    }
    const translatedItem = {
        ...item,
        description: resolveTranslatedField(item?.description ?? '', item?.translations ?? {}, 'description', lang),
    }
    const translatedTags = itemTags.map(tag => ({
        id: tag.tag.id,
        name: resolveTranslatedField(tag.tag.name, tag.tag.translations, 'name', lang),
    }))
    const translatedAllergens = itemAllergens.map(allergen => ({
        id: allergen.allergen.id,
        name: resolveTranslatedField(allergen.allergen.name, allergen.allergen.translations, 'name', lang),
    }))
    const translatedAddons = itemAddons.map(addon => ({
        id: addon.addon?.id,
        name: resolveTranslatedField(addon.addon?.name ?? '', addon.addon?.translations ?? {}, 'name', lang),
    }))
    const translatedVariants = itemVariants.map(variant => ({
        id: variant.id,
        name: resolveTranslatedField(variant.name, variant.translations, 'name', lang),
        price: variant.price,
        isAvailable: variant.isAvailable,
    }))
    return {
        success: true, data: {
            ..._.omit(translatedItem, ['translations', 'translationStatus', 'restaurantId']),
            tags: translatedTags,
            allergens: translatedAllergens,
            addOns: translatedAddons,
            variants: translatedVariants,
            ingredients: translatedIngredients,
        }
    }

}, {
    tags: ['Menu Items'],
    params: t.Object({
        id: t.String({
            error: 'Menu item ID is required',
            minLength: 2,
            format: 'uuid'
        })
    })
})

router.put('/:id', async ({ params: { id }, body, status, store: { lang, user } }) => {
    try {
        // Parse numeric fields only if they're provided
        const updateData: any = { ...body };
        if (body.price !== undefined) {
            updateData.price = parseFloat(String(body.price).replace(",", "."));
        }
        if (body.discountValue !== undefined) {
            updateData.discountValue = parseFloat(String(body.discountValue).replace(",", "."));
        }

        // const updated = await db.update(menuItems).set(body).where(eq(menuItems.id, id))
        const updated = await db.transaction(async (tx) => {
            const updated = await tx.update(menuItems).set(updateData).where(eq(menuItems.id, id)).returning({
                id: menuItems.id
            })
            if (body.allergens) {
                await tx.delete(menuItemAllergens).where(eq(menuItemAllergens.menuItemId, updated[0].id))
                for (const allergen of body.allergens) {
                    await tx.insert(menuItemAllergens).values({
                        menuItemId: updated[0].id,
                        allergenId: allergen,
                    })
                }
            }
            if (body.variants) {
                await tx.delete(menuItemVariants).where(eq(menuItemVariants.itemId, updated[0].id))
                for (const variant of body.variants) {
                    await tx.insert(menuItemVariants).values({
                        itemId: updated[0].id,
                        name: variant.name,
                        price: variant.price as any,
                    })
                }
            }
            if (body.addOns) {
                await tx.delete(menuItemAddons).where(eq(menuItemAddons.itemId, updated[0].id))
                for (const addOn of body.addOns) {
                    await tx.insert(menuItemAddons).values({
                        itemId: updated[0].id,
                        addonId: addOn,
                    })
                }
            }
            if (body.tags) {
                await tx.delete(menuItemTags).where(eq(menuItemTags.menuItemId, updated[0].id))
                for (const tag of body.tags) {
                    await tx.insert(menuItemTags).values({
                        menuItemId: updated[0].id,
                        tagId: tag,
                    })
                }
            }
            return updated[0];
        })
        if (!updated) {
            throw new Error('Failed to update menu item');
        }
        const itemsToTranslate = pickTruthy({
            description: body.description,
            ingredients: body.ingredients
        })
        translationQueue.add(itemsToTranslate, updated?.id as string, lang).then(async (result) => {
            await db.update(menuItems).set({
                translations: result.translations,
                translationStatus: 'completed',
            }).where(eq(menuItems.id, updated?.id as string))
        }).catch(async () => {
            await db.update(menuItems).set({
                translationStatus: 'failed'
            }).where(eq(menuItems.id, updated?.id as string))
        })
        if (body?.variants) {
            for (const variant of body.variants) {
                translationQueue.add(pickTruthy({
                    name: variant.name,
                }), updated?.id as string, lang).then(async (result) => {
                    await db.update(menuItemVariants).set({
                        translations: result.translations,
                        translationStatus: 'completed'
                    }).where(eq(menuItemVariants.itemId, updated?.id as string))
                }).catch(async () => {
                    await db.update(menuItemVariants).set({
                        translationStatus: 'failed'
                    }).where(eq(menuItemVariants.itemId, updated?.id as string))
                })
            }
        }
        if (!updated) {
            throw new Error('Failed to update menu item');
        }
        audit.updated({ entity: 'menu_item', entityId: updated?.id as string, before: body, after: updateData, performedBy: user?.id as string, restaurantId: user?.restaurantId as string })
        return { success: true, message: 'Menu item updated successfully' }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
}, {
    tags: ['Menu Items'],
    params: t.Object({
        id: t.String({
            error: 'Menu item ID is required',
            minLength: 2,
            format: 'uuid'
        })
    }),
    body: t.Partial(addMenuItemDto)
})

router.delete('/:id', async ({ params: { id }, status, store: { user } }) => {
    try {
        const deleted = await db.delete(menuItems).where(eq(menuItems.id, id)).returning();
        if (!deleted) {
            throw status(400, 'Failed to delete menu item');
        }
        audit.deleted({ entity: 'menu_item', entityId: id, performedBy: user?.id as string, before: deleted[0], restaurantId: user?.restaurantId as string ?? undefined })
        return { success: true, message: 'Menu item deleted successfully' }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
}, {
    tags: ['Menu Items'],
    params: t.Object({
        id: t.String({
            error: 'Menu item ID is required',
            minLength: 2,
            format: 'uuid'
        })
    })
})

router.post(
    '/bulk-upload',
    async ({ body, store: { lang, user } }) => {
        const result = await bulkUploadMenuItems(user?.restaurantId as string, body.sectionId, body.menuId, body.items, lang);
        return result;
    },
    {
        body: t.Object({
            items: t.Array(bulkMenuItemSchema),
            sectionId: t.String({
                error: 'Section ID is required',
                // minLength: 2,
                format: 'uuid'
            }),
            menuId: t.String({
                error: 'Menu ID is required',
                // minLength: 2,
                format: 'uuid'
            })
        }),
    }
)


export default router;