import Elysia, { t } from "elysia";
import { superAdminAuthPlugin } from "../../../middleware/auth";
import { db } from "../../../db";
import { allergens } from "../../../db/schema/allergens";
import { eq } from "drizzle-orm";

const router = new Elysia({ prefix: '/menu/allergens', tags: ['Super Admin Menu Allergens'] })
    .use(superAdminAuthPlugin)

router.get('/', async ({ status }) => {
    try {
        const allAllergens = await db.query.allergens.findMany()
        return { success: true, data: allAllergens }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
}, {
})

router.post('/', async ({ body, status }) => {
    try {
        const inserted = await db.insert(allergens).values(body)
        if (!inserted) {
            throw new Error('Failed to create allergen');
        }
        return { success: true, message: 'Allergen created successfully' }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
}, {
    body: t.Object({
        name: t.String({
            error: 'Name is required',
            minLength: 2
        })
    })
})

router.put('/:id', async ({ params: { id }, body, status }) => {
    try {
        const updated = await db.update(allergens).set(body).where(eq(allergens.id, id))
        if (!updated) {
            throw new Error('Failed to update allergen');
        }
        return { success: true, message: 'Allergen updated successfully' }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
}, {
    params: t.Object({
        id: t.String({
            error: 'Allergen ID is required',
            minLength: 2,
            format: 'uuid'
        })
    }),
    body: t.Object({
        name: t.String({
            error: 'Name is required',
            minLength: 2
        })
    })
})

router.delete('/:id', async ({ params: { id }, status }) => {
    try {
        const deleted = await db.delete(allergens).where(eq(allergens.id, id))
        if (!deleted) {
            throw new Error('Failed to delete allergen');
        }
        return { success: true, message: 'Allergen deleted successfully' }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
    }
}, {
    params: t.Object({
        id: t.String({
            error: 'Allergen ID is required',
            minLength: 2,
            format: 'uuid'
        })
    })
})
export default router;