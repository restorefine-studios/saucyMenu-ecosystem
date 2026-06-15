import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { allergens } from "../db/schema";
import { translationQueue } from "../queues/translations";


const defaultAllergens = [
    "Celery",
    "Cereals containing gluten",
    "Crustaceans",
    "Eggs",
    "Fish",
    "Lupin",
    "Milk",
    "Molluscs",
    "Mustard",
    "Nuts",
    "Peanuts",
    "Sesame seeds",
    "Soya",
    "Sulphur dioxide"
];

export async function seedAllergens() {
    for (const name of defaultAllergens) {
        const exists = await db.query.allergens.findFirst({
            where: (da, { eq }) => eq(da.name, name),
        });

        if (!exists) {
            const inserted = await db.insert(allergens).values({
                name: sql`lower(${name})`,
            }).returning({
                id: allergens.id
            });
            if (inserted) {
                translationQueue.add({ name }, inserted[0].id as string, 'en').then(async (result) => {
                    await db.update(allergens).set({
                        translations: result.translations,
                        translationStatus: 'completed'
                    }).where(eq(allergens.id, inserted[0].id as string))
                }).catch(async () => {
                    await db.update(allergens).set({
                        translationStatus: 'failed'
                    }).where(eq(allergens.id, inserted[0].id as string))
                });
            }
        }
    }

    console.log("✅ Allergens seeded");
}