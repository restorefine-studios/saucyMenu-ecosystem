import Elysia from "elysia"
import { db } from "../../../db"
import { userAuthPlugin } from "../../../middleware/auth";
import { and, eq, or } from "drizzle-orm";
import { allergens, tags } from "../../../db/schema";
import { resolveTranslatedField } from "../../../../utils/translations";

const router = new Elysia({ prefix: '/classifications', tags: ['User Menu Classifications'] })
    .use(userAuthPlugin)

router.get('/allergens', async ({ store: { lang }, status }) => {
    try {
        const allAllergens = await db.query.allergens.findMany({
            columns: {
                id: true,
                name: true,
                translations: true,
                translationStatus: true,
            }
        })
        const formattedAllergens = allAllergens.map((allergen) => {
            return {
                ...allergen,
                name: resolveTranslatedField(allergen.name, allergen.translations, 'name', lang),
            }
        })

        return { success: true, data: formattedAllergens }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }

})


router.get('/diets', async ({ store: { lang, user }, status }) => {
    try {
        const allDiets = await db.query.tags.findMany({
            where: or(and(eq(tags.type, 'diet'), eq(tags.restaurantId, user?.restaurantId as string)), and(eq(tags.type, 'diet'), eq(tags.isSystem, true))),
            columns: {
                id: true,
                name: true,
                translations: true,
                description: true,
            }
        })
        const formattedDiets = allDiets.map((diet) => {
            return {
                ...diet,
                name: resolveTranslatedField(diet.name, diet.translations, 'name', lang),
                description: resolveTranslatedField(diet.description ?? '', diet.translations, 'description', lang),
            }
        })
        return { success: true, data: formattedDiets }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
})



export default router;