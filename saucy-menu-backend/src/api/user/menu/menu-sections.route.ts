import { userAuthPlugin } from "../../../middleware/auth"
import { db } from "../../../db"
import { eq } from "drizzle-orm"
import { menuSections } from "../../../db/schema"
import Elysia, { t } from "elysia"
import { resolveTranslatedField } from "../../../../utils/translations"
import _ from "lodash"

const router = new Elysia({ prefix: '/menu-sections', tags: ['User Menu Sections'] })
    .use(userAuthPlugin)

router.get('/:menuId', async ({ params: { menuId }, store: { lang }, status }) => {
    try {
        const sections = await db.query.menuSections.findMany({
            where: eq(menuSections.menuId, menuId),
            with: {
                menu: {
                    columns: {
                        name: true,
                        translations: true,
                        description: true,
                    }
                }
            }
        })
        const translatedSections = sections.map((section) => {
            const omittedSection = _.omit(section, ['translations', 'translationStatus', 'menu']);
            return {
                ...omittedSection,
                name: resolveTranslatedField(section.name, section.translations ?? {}, 'name', lang),

            }
        })
        return {
            success: true,
            menuTitle: resolveTranslatedField(sections[0]?.menu?.name ?? '', sections[0]?.menu?.translations, 'name', lang),
            menuDescription: resolveTranslatedField(sections[0]?.menu?.description ?? '', sections[0]?.menu?.translations, 'description', lang),
            data: translatedSections
        }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
}, {
    params: t.Object({
        menuId: t.String({
            error: 'Menu ID is required',
            format: 'uuid'
        })
    })
})

export default router;