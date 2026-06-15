import slugify from "slugify";
import { db } from "../db";
import { tags } from "../db/schema";
import { translationQueue } from "../queues/translations";
import { eq, sql } from "drizzle-orm";


const defaultDiets = [
    "omnivore",
    "vegetarian",
    "vegan",
    "pescatarian",
    "flexitarian",
    "halal",
    "kosher",
    "gluten-free",
    "dairy-free",
    "lactose-free",
    "egg-free",
    "nut-free",
    "peanut-free",
    "soy-free",
    "sesame-free",
    "low-carb",
    "keto",
    "paleo",
    "low-fat",
    "low-sugar",
    "no-added-sugar",
    "high-protein",
    "low-sodium",
    "heart-healthy",
    "diabetic-friendly",
    "raw-vegan",
    "plant-based"
];

export async function seedDiets() {
    for (const name of defaultDiets) {
        const key = slugify(name, {
            lower: true,
            trim: true,
            strict: true
        }).replace(/-/g, "_")

        // const exists = await db.query.tags.findFirst({
        //     where: (dt, { eq }) => eq(dt.key, key),
        // });


        const inserted = await db.insert(tags).values({
            name: sql`lower(${name})`,
            key,
            type: 'diet',
            isSystem: true,
        }).returning({
            id: tags.id
        });
        if (inserted) {
            translationQueue.add({ name }, inserted[0].id as string, 'en').then(async (result) => {
                await db.update(tags).set({
                    translations: result.translations,
                    translationStatus: 'completed'
                }).where(eq(tags.id, inserted[0].id as string))
            }).catch(async () => {
                await db.update(tags).set({
                    translationStatus: 'failed'
                }).where(eq(tags.id, inserted[0].id as string))
            });
        }

    }

    console.log("✅ Diets seeded");
}