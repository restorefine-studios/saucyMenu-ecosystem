import Elysia, { error, t } from "elysia";
import { userAuthPlugin } from "../../../middleware/auth";
import { and, eq, inArray, like, sql } from "drizzle-orm";
import { drinks, drinkTags, drinkUnits, drinkVariants, tags } from "../../../db/schema";
import { db } from "../../../db";
import { paginate } from "../../../lib/paginate";

const router = new Elysia({ prefix: '/drinks' }).use(userAuthPlugin)

router.get('/', async ({ query: { search: searchVal, limit, offset, tagIds }, store: { user } }) => {
    const newLimit = limit ?? 10;
    const newOffset = offset ?? 0;
    const search = searchVal ? (searchVal as string) : undefined;

    const searchCondition = search
        ? like(sql`lower(${drinks.name})`, `%${search.toLowerCase()}%`)
        : undefined;

    try {
        let filteredDrinkIds: string[] = [];

        if (tagIds && tagIds.length > 0) {
            const taggedDrinkRows = await db
                .select({
                    drinkId: drinkTags.drinkId,
                    tagCount: sql<number>`count(${drinkTags.tagId})`
                })
                .from(drinkTags)
                .where(inArray(drinkTags.tagId, tagIds))
                .groupBy(drinkTags.drinkId)
                .having(sql`count(${drinkTags.tagId}) = ${tagIds.length}`);

            filteredDrinkIds = taggedDrinkRows.map(row => row.drinkId);
            if (filteredDrinkIds.length === 0) {
                return { success: true, total: 0, data: [] };
            }
        }

        const drinkCondition = filteredDrinkIds.length > 0 ? inArray(drinks.id, filteredDrinkIds) : undefined;

        const allDrinks = await db.selectDistinct({
            drink: {
                id: drinks.id,
                name: drinks.name,
                description: drinks.description,
                images: drinks.images,
                isAvailable: drinks.isAvailable,
                isAlcoholic: drinks.isAlcoholic,
            },
            tag: {
                id: tags.id,
                name: tags.name
            },
            variants: {
                id: drinkVariants.id,
                quantity: drinkVariants.quantity,
                unitName: drinkUnits.name,
                unitSymbol: drinkUnits.symbol,
                unitId: drinkUnits.id,
                price: drinkVariants.price,
                available: drinkVariants.isAvailable
            }
        })
            .from(drinks)
            .leftJoin(drinkTags, eq(drinks.id, drinkTags.drinkId))
            .leftJoin(tags, eq(drinkTags.tagId, tags.id))
            .leftJoin(drinkVariants, eq(drinks.id, drinkVariants.drinkId))
            .leftJoin(drinkUnits, eq(drinkVariants.unitId, drinkUnits.id))
            .where(and(
                eq(drinks.restaurantId, user?.restaurantId as string),
                drinkCondition,
                searchCondition
            ));

        const drinkMap = new Map<string, {
            id: string;
            name: string;
            description: string | null;
            images: string[] | null;
            isAvailable: boolean | null;
            isAlcoholic: boolean | null;
            tags: { id: string; name: string }[];
            variants: { id: string | null; quantity: string | null; unitName: string | null; unitSymbol: string | null; unitId: string | null, available: boolean | null }[];
        }>();

        for (const row of allDrinks) {
            const { drink, tag, variants } = row;
            const entry = drinkMap.get(drink.id);

            if (!entry) {
                drinkMap.set(drink.id, {
                    ...drink,
                    tags: tag ? [tag] : [],
                    variants: variants ? [variants] : [],
                });
            } else {
                if (tag && !entry.tags.some(t => t.id === tag.id)) {
                    entry.tags.push(tag);
                }
                if (variants && !entry.variants.some(v => v.id === variants.id)) {
                    entry.variants.push(variants);
                }
            }
        }

        const totalCount = drinkMap.size;
        const result = Array.from(drinkMap.values());
        const paginatedResult = paginate(result, { limit: newLimit, offset: newOffset, totalItems: totalCount });

        return { success: true, ...paginatedResult };
    } catch (e) {
        console.log(e);
        return error(400, { message: `${e}` });
    }
}, {
    tags: ['User Drinks'],
    query: t.Object({
        search: t.Optional(t.String()),
        limit: t.Optional(t.Number()),
        offset: t.Optional(t.Number()),
        tagIds: t.Optional(t.Array(t.String({ format: "uuid" }))),
    })
});


export default router;