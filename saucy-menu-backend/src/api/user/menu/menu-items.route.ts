import { and, desc, eq, getTableColumns, inArray, like, or, sql } from "drizzle-orm";
import { userAuthPlugin } from "../../../middleware/auth";
import { db } from "../../../db";
import Elysia, { t } from "elysia";
import { allergens, menuItemAddons, menuItemAllergens, menuItems, menuItemTags, menuItemVariants, menuSections, tags, userSessionAllergens, userSessionTags } from "../../../db/schema";
import { resolveTranslatedField } from "../../../../utils/translations";
import _ from "lodash";

const router = new Elysia({ prefix: '/menu-items', tags: ['User Menu Items'] })
    .use(userAuthPlugin)

// this is for getting all menu items for a menu
router.get('/', async ({ store: { user, lang }, query, status }) => {
    try {
        const allMenuSections = await db.query.menuSections.findMany({
            where: eq(menuSections.menuId, query.menuId),
        })
        const searchCondition = query.search ? like(sql`lower(${menuItems.name})`, `%${query.search.toLowerCase()}%`) : undefined;
        if (allMenuSections.length === 0) {
            return { success: true, data: [] };
        }
        // Only fetch session data if the respective modes are enabled
        let sessionTagsByUser: typeof userSessionTags.$inferSelect[] = [];
        let sessionAllergensByUser: typeof userSessionAllergens.$inferSelect[] = [];

        if (query.dietMode) {
            sessionTagsByUser = await db.query.userSessionTags.findMany({
                where: eq(userSessionTags.sessionId, user?.sessionId as string),
            });
        }

        if (query.allergenMode) {
            sessionAllergensByUser = await db.query.userSessionAllergens.findMany({
                where: eq(userSessionAllergens.sessionId, user?.sessionId as string),
            });
        }

        const sessionTags = sessionTagsByUser.map(tag => tag?.tagId)
        const sessionAllergens = sessionAllergensByUser.map(allergen => allergen?.allergenId)

        const filters = [eq(menuItems.restaurantId, user?.restaurantId as string), inArray(menuItems.sectionId, allMenuSections.map(section => section.id)), searchCondition]
        const [allItems] = await Promise.all([
            // db.$count(menuItems, and(...filters)),
            db.select({
                ...getTableColumns(menuItems)
            }).from(menuItems).leftJoin(menuSections, eq(menuItems.sectionId, menuSections.id)).where(and(...filters)).orderBy(desc(menuItems.createdAt))
            // .limit(query.limit ?? 10).offset(query.offset ?? 0)
        ])

        const itemIds = allItems.map((item) => item.id)

        const [itemTagsData, itemAllergensData] = await Promise.all([
            // db.select().from(menuSections).where(eq(menuSections.menuId, query.menuId)),
            db.select({
                menuItemId: menuItemTags.menuItemId,
                tag: tags
            }).from(menuItemTags).innerJoin(tags, eq(menuItemTags.tagId, tags.id)).where(inArray(menuItemTags.menuItemId, itemIds)),
            db.select({
                menuItemId: menuItemAllergens.menuItemId,
                allergen: allergens
            }).from(menuItemAllergens).innerJoin(allergens, eq(menuItemAllergens.allergenId, allergens.id)).where(inArray(menuItemAllergens.menuItemId, itemIds))
        ])



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

        const filteredTags = itemTagsData.filter(tag => sessionTags.includes(tag.tag.id))
        const filteredAllergens = itemAllergensData.filter(allergen => sessionAllergens.includes(allergen.allergen.id))




        const translatedMenuItems = allItems.map((item) => {
            const omittedItem = _.omit(item, ['name', 'description', 'translationStatus', 'restaurantId']);

            const { translations, ...rest } = omittedItem;
            return {
                ...rest,
                name: resolveTranslatedField(item.name, item.translations, 'name', lang),
                description: resolveTranslatedField(item.description ?? '', item.translations, 'description', lang),
                tags: (tagsMap.get(item.id) ?? []).map(tag => ({
                    id: tag.id,
                    name: resolveTranslatedField(tag.name, tag.translations, 'name', lang),
                })),
                allergens: (allergensMap.get(item.id) ?? []).map(allergen => ({
                    id: allergen.id,
                    name: resolveTranslatedField(allergen.name, allergen.translations, 'name', lang),
                })),
                price: item.price,
                cookTime: item.cookTime,
                isAlcoholic: item.isAlcoholic,
                hasVariants: item.hasVariants,
                isChefsRecommended: item.isChefsRecommended,
                isPopular: item.isPopular,
                isNew: item.isNew,
                isLimitedTime: item.isLimitedTime,
                createdAt: item.createdAt,
                discountEndAt: item.discountEndAt,
                discountStartAt: item.discountStartAt,
                discountType: item.discountType,
                discountValue: item.discountValue,
                discountLabel: item.discountLabel,
                isAvailable: item.isAvailable,
                spiceLevel: item.spiceLevel,
                images: item.images,
                type: item.type,
            }
        })

        const filteredMenuItems = translatedMenuItems.filter(item => {
            // If dietMode is enabled AND user has selected tags, 
            // item must have at least one matching tag
            const hasMatchingTag = !query.dietMode ||
                sessionTags.length === 0 ||
                filteredTags.some(tag => tag.menuItemId === item.id);

            // If allergenMode is enabled AND user has selected allergens,
            // item must NOT contain any of the user's allergens
            const hasNoAllergens = !query.allergenMode ||
                sessionAllergens.length === 0 ||
                !filteredAllergens.some(allergen => allergen.menuItemId === item.id);

            return hasMatchingTag && hasNoAllergens;
        });

        const response = filteredMenuItems // paginationResponse(translatedMenuItems, totalItems, query.limit ?? 10, query.offset ?? 0)
        return { success: true, data: response }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
}, {
    query: t.Composite([t.Object({
        menuId: t.String({
            error: 'Menu ID is required',
            format: 'uuid'
        }),
        allergenMode: t.Optional(t.Boolean({
            default: false,
        })),
        dietMode: t.Optional(t.Boolean({
            default: false,
        })),
        search: t.Optional(t.String()),
    })])
})

router.get('/classified-items', async ({ store: { user, lang }, status }) => {
    try {
        const conditions = [eq(menuItems.isChefsRecommended, true), eq(menuItems.isPopular, true), eq(menuItems.isNew, true), eq(menuItems.isLimitedTime, true)]
        const items = await db.query.menuItems.findMany({
            where: and(eq(menuItems.restaurantId, user?.restaurantId as string), or(...conditions)),
        })
        const translatedItems = items.map((item) => {
            return {
                ...item,
                description: resolveTranslatedField(item.description ?? '', item.translations, 'description', lang),
            }
        })
        const formattedData = {
            chefsRecommended: translatedItems.filter(item => item.isChefsRecommended),
            popular: translatedItems.filter(item => item.isPopular),
            new: translatedItems.filter(item => item.isNew),
            limitedTime: translatedItems.filter(item => item.isLimitedTime),
        }
        return { success: true, data: formattedData }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
})

// this is for getting a single menu item
router.get('/:id', async ({ store: { user, lang }, params: { id }, status }) => {
    try {
        const item = await db.query.menuItems.findFirst({
            where: and(eq(menuItems.id, id), eq(menuItems.restaurantId, user?.restaurantId as string)),

        })
        const tags = await db.query.menuItemTags.findMany({
            where: eq(menuItemTags.menuItemId, id),
            with: {
                tag: true,
            }
        })
        const allergens = await db.query.menuItemAllergens.findMany({
            where: eq(menuItemAllergens.menuItemId, id),
            with: {
                allergen: true,
            }
        })

        const addons = await db.query.menuItemAddons.findMany({
            where: eq(menuItemAddons.itemId, id),
            with: {
                addon: {
                    columns: {
                        name: true,
                        id: true,
                        price: true,
                        translations: true,
                    }
                }
            }
        })
        const variants = await db.query.menuItemVariants.findMany({
            where: eq(menuItemVariants.itemId, id),
        })

        const translatedItem = {
            ..._.omit(item, ['translations', 'translationStatus', 'restaurantId']),
            name: resolveTranslatedField(item?.name ?? '', item?.translations ?? {}, 'name', lang),
            description: resolveTranslatedField(item?.description ?? '', item?.translations ?? {}, 'description', lang),
            tags: tags.map(tag => ({
                id: tag.tag.id,
                name: resolveTranslatedField(tag.tag.name, tag.tag.translations, 'name', lang),
            })),
            allergens: allergens.map(allergen => ({
                id: allergen.allergen.id,
                name: resolveTranslatedField(allergen.allergen.name, allergen.allergen.translations, 'name', lang),
            })),
            addons: addons.map(addon => ({
                id: addon.addon?.id,
                name: resolveTranslatedField(addon.addon?.name ?? '', addon.addon?.translations ?? {}, 'name', lang),
                price: addon.addon?.price,
            })),
            variants: variants.map(variant => ({
                id: variant.id,
                name: resolveTranslatedField(variant.name, variant.translations, 'name', lang),
                price: variant.price,
                isAvailable: variant.isAvailable,
            })),
            ingredients: resolveTranslatedField(item?.ingredients?.join(',') ?? '', item?.translations ?? {}, 'ingredients', lang).split(',') ?? [],
        }
        if (!item) {
            throw status(404, 'Item not found');
        }
        return { success: true, data: translatedItem }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
}, {
    params: t.Object({ id: t.String({ format: 'uuid' }) })
})

export default router;