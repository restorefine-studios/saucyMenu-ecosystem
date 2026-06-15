import { Elysia, t } from 'elysia';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { addons, allergens, menuItemAddons, menuItemAllergens, menuItems, menuItemTags, menuItemVariants, menuSections, tags } from '../../../db/schema';
import { db } from '../../../db';
import { translationQueue } from '../../../queues/translations';
import { authPlugin } from '../../../middleware/auth';
import slugify from 'slugify';
import { pickTruthy } from '../../../../utils';

// Type for transaction - inferred from db.transaction callback
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Type definitions for bulk upload
interface BulkMenuItemVariant {
    name: string;
    price: number;
    isAvailable?: boolean;
    translations?: Record<string, any>;
}

interface BulkMenuItemAddon {
    name: string;
    price?: number;
    translations?: Record<string, any>;
}

interface BulkMenuItemAllergen {
    name: string;
    severity?: 'contains' | 'may_contain' | 'cross_contact';
}

interface BulkMenuItemDiet {
    name: string;
}

interface BulkMenuItem {
    // Required fields
    name: string;
    type: 'dish' | 'drink';

    // Optional basic fields
    description?: string;
    translations?: Record<string, any>;
    ingredients?: string[];
    images?: string[];
    price?: number;

    // Discount fields
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    discountStartAt?: string;
    discountEndAt?: string;
    discountLabel?: string;
    section?: string;

    // Availability & attributes
    isAvailable?: boolean;
    spiceLevel?: string;
    cookTime?: number;
    isAlcoholic?: boolean;
    isChefsRecommended?: boolean;
    isPopular?: boolean;
    isNew?: boolean;
    isLimitedTime?: boolean;

    // Related entities
    variants?: BulkMenuItemVariant[];
    addons?: BulkMenuItemAddon[];
    allergens?: BulkMenuItemAllergen[];
    diets?: BulkMenuItemDiet[];
}

interface BulkUploadResponse {
    success: boolean;
    created: number;
    failed: number;
    errors: Array<{
        row: number;
        item: string;
        error: string;
    }>;
    items: string[]; // IDs of created items
}

// Validation schema
const variantSchema = t.Object({
    name: t.String(),
    price: t.Number(),
    isAvailable: t.Optional(t.Boolean()),
    translations: t.Optional(t.Record(t.String(), t.Any())),
});

const addonSchema = t.Object({
    name: t.String(),
    price: t.Optional(t.Number()),
    translations: t.Optional(t.Record(t.String(), t.Any())),
});

const allergenSchema = t.Object({
    name: t.String(),
    severity: t.Optional(t.Union([
        t.Literal('contains'),
        t.Literal('may_contain'),
        t.Literal('cross_contact')
    ])),
});

const bulkMenuItemSchema = t.Object({
    name: t.String(),
    type: t.Union([t.Literal('dish'), t.Literal('drink')]),
    description: t.Optional(t.String()),
    translations: t.Optional(t.Record(t.String(), t.Any())),
    ingredients: t.Optional(t.Array(t.String())),
    images: t.Optional(t.Array(t.String())),
    price: t.Optional(t.Any()),
    section: t.Optional(t.String()),
    // discountType: t.Optional(t.Union([t.Literal('percentage'), t.Literal('fixed')])),
    // discountValue: t.Optional(t.Number()),
    // discountStartAt: t.Optional(t.String()),
    // discountEndAt: t.Optional(t.String()),
    // discountLabel: t.Optional(t.String()),
    // isAvailable: t.Optional(t.Boolean()),
    spiceLevel: t.Optional(t.String()),
    cookTime: t.Optional(t.Integer()),
    variants: t.Optional(t.Array(variantSchema)),
    addons: t.Optional(t.Array(addonSchema)),
    allergens: t.Optional(t.Array(allergenSchema)),
});

// Helper function to get or create addon
async function getOrCreateAddon(
    addonData: BulkMenuItemAddon,
    restaurantId: string,
    lang: string,
    tx: Transaction
): Promise<string> {
    // Check if addon exists
    const existing = await tx
        .select()
        .from(addons)
        .where(eq(addons.name, sql`lower(${addonData.name})`))
        .limit(1);

    if (existing.length > 0) {
        return existing[0].id;
    }

    // Create new addon
    const [newAddon] = await tx
        .insert(addons)
        .values({
            restaurantId,
            name: sql`lower(${addonData.name})`,
            price: addonData.price?.toString() || '0',
            translations: addonData.translations || {},
        })
        .returning({ id: addons.id });

    if (newAddon) {
        // Queue translation after transaction commits
        translationQueue.add({
            name: addonData.name,
        }, newAddon.id, lang).then(async (result) => {
            await db.update(addons).set({
                translations: result.translations,
                translationStatus: 'completed'
            }).where(eq(addons.id, newAddon.id));
        }).catch(async () => {
            await db.update(addons).set({
                translationStatus: 'failed'
            }).where(eq(addons.id, newAddon.id));
        });
    }

    return newAddon.id;
}

// Helper function to get or create allergen
async function getOrCreateAllergen(
    allergenName: string,
    lang: string,
    tx: Transaction
): Promise<string> {
    // Check if allergen exists
    const existing = await tx
        .select()
        .from(allergens)
        .where(eq(allergens.name, sql`lower(${allergenName})`))
        .limit(1);

    if (existing.length > 0) {
        return existing[0].id;
    }

    // Create new allergen
    const [newAllergen] = await tx
        .insert(allergens)
        .values({ name: allergenName })
        .returning({ id: allergens.id });
    if (newAllergen) {
        // Queue translation after transaction commits
        translationQueue.add({
            name: allergenName,
        }, newAllergen.id, lang).then(async (result) => {
            await db.update(allergens).set({
                translations: result.translations,
                translationStatus: 'completed'
            }).where(eq(allergens.id, newAllergen.id));
        }).catch(async () => {
            await db.update(allergens).set({
                translationStatus: 'failed'
            }).where(eq(allergens.id, newAllergen.id));
        });
    }

    return newAllergen.id;
}

async function getOrCreateSection(
    sectionName: string,
    menuId: string,
    lang: string,
    tx: Transaction
): Promise<string> {
    const existing = await tx
        .select()
        .from(menuSections)
        .where(and(eq(menuSections.name, sql`lower(${sectionName})`), eq(menuSections.menuId, menuId)))
        .limit(1);
    if (existing.length > 0) {
        return existing[0].id;
    }

    // Create new section
    const [newSection] = await tx
        .insert(menuSections)
        .values({ name: sql`lower(${sectionName})`, menuId })
        .returning({ id: menuSections.id });
    if (newSection) {
        // Queue translation after transaction commits
        translationQueue.add({
            name: sectionName,
        }, newSection.id as string, lang).then(async (result) => {
            await db.update(menuSections).set({
                translations: result.translations,
                translationStatus: 'completed'
            }).where(eq(menuSections.id, newSection.id));
        }).catch(async () => {
            await db.update(menuSections).set({
                translationStatus: 'failed'
            }).where(eq(menuSections.id, newSection.id));
        });
    }
    return newSection.id;
}

async function getOrCreateDiet(
    dietName: string,
    restaurantId: string,
    lang: string,
    tx: Transaction
): Promise<string> {
    const existing = await tx
        .select()
        .from(tags)
        .where(and(eq(tags.name, sql`lower(${dietName})`), eq(tags.type, 'diet')))
        .limit(1);
    if (existing.length > 0) {
        return existing[0].id;
    }

    // Create new diet
    const [newDiet] = await tx
        .insert(tags)
        .values({ name: sql`lower(${dietName})`, type: 'diet', key: slugify(dietName, { lower: true, trim: true, strict: true }).replace(/-/g, "_"), restaurantId: restaurantId })
        .returning({ id: tags.id });
    if (newDiet) {
        // Queue translation after transaction commits
        translationQueue.add({
            name: dietName,
        }, newDiet.id as string, lang).then(async (result) => {
            await db.update(tags).set({
                translations: result.translations,
                translationStatus: 'completed'
            }).where(eq(tags.id, newDiet.id));
        }).catch(async () => {
            await db.update(tags).set({
                translationStatus: 'failed'
            }).where(eq(tags.id, newDiet.id));
        });
    }
    return newDiet.id;
}


// Main bulk upload handler
async function bulkUploadMenuItems(
    restaurantId: string,
    sectionId: string,
    menuId: string,
    items: BulkMenuItem[],
    lang: string
): Promise<BulkUploadResponse> {
    const response: BulkUploadResponse = {
        success: true,
        created: 0,
        failed: 0,
        errors: [],
        items: [],
    };

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        try {
            await db.transaction(async (tx) => {

                // 6. Handle Section
                if (item.section) {
                    sectionId = await getOrCreateSection(item.section, menuId, lang, tx);

                }
                // 1. Insert menu item
                const [createdItem] = await tx
                    .insert(menuItems)
                    .values({
                        restaurantId: restaurantId,
                        sectionId: sectionId,
                        type: item.type,
                        name: item.name,
                        description: item.description,
                        translations: item.translations || {},
                        ingredients: item.ingredients || [],
                        images: item.images ?? [],
                        price: item.price?.toString(),
                        // discountType: item.discountType,
                        // discountValue: item.discountValue?.toString(),
                        // discountStartAt: item.discountStartAt ? new Date(item.discountStartAt) : undefined,
                        // discountEndAt: item.discountEndAt ? new Date(item.discountEndAt) : undefined,
                        // discountLabel: item.discountLabel,
                        isAvailable: true,
                        spiceLevel: item.spiceLevel as any,
                        cookTime: item.cookTime,
                    })
                    .returning({ id: menuItems.id });

                const menuItemId = createdItem.id;

                const itemsToTranslate = pickTruthy({
                    description: item.description ?? '',
                    ingredients: item.ingredients ?? '',
                })

                translationQueue.add(itemsToTranslate, menuItemId, lang).then(async (result) => {
                    await db.update(menuItems).set({
                        translations: result.translations,
                        translationStatus: 'completed',
                    }).where(eq(menuItems.id, menuItemId));
                }).catch(async () => {
                    await db.update(menuItems).set({
                        translationStatus: 'failed'
                    }).where(eq(menuItems.id, menuItemId));
                });

                // 2. Insert variants if any
                if (item.variants && item.variants.length > 0) {
                    await tx.insert(menuItemVariants).values(
                        item.variants.map((variant) => ({
                            itemId: menuItemId,
                            name: variant.name,
                            price: variant.price.toString(),
                            isAvailable: variant.isAvailable ?? true,
                            translations: variant.translations || {},
                        }))
                    );
                }

                // 3. Handle addons
                if (item.addons && item.addons.length > 0) {
                    const addonIds: string[] = [];

                    for (const addonData of item.addons) {
                        const addonId = await getOrCreateAddon(addonData, restaurantId, lang, tx);
                        addonIds.push(addonId);
                    }

                    // Link addons to menu item
                    await tx.insert(menuItemAddons).values(
                        addonIds.map((addonId) => ({
                            itemId: menuItemId,
                            addonId,
                        }))
                    );
                }

                // 4. Handle allergens
                if (item.allergens && item.allergens.length > 0) {
                    const allergenData: Array<{
                        menuItemId: string;
                        allergenId: string;
                        severity: string | null;
                    }> = [];

                    for (const allergenInfo of item.allergens) {
                        const allergenId = await getOrCreateAllergen(allergenInfo.name, lang, tx);
                        allergenData.push({
                            menuItemId,
                            allergenId,
                            severity: allergenInfo.severity || null,
                        });
                    }

                    await tx.insert(menuItemAllergens).values(allergenData);
                }

                // 5. Handle diets
                if (item.diets && item.diets.length > 0) {
                    const dietIds: string[] = [];
                    for (const dietInfo of item.diets) {
                        const dietId = await getOrCreateDiet(dietInfo.name, restaurantId, lang, tx);
                        dietIds.push(dietId);
                    }
                    await tx.insert(menuItemTags).values(
                        dietIds.map((dietId) => ({
                            menuItemId: menuItemId,
                            tagId: dietId,
                        }))
                    );
                }


                response.created++;
                response.items.push(menuItemId);
            });
        } catch (error) {
            response.failed++;
            response.success = false;
            response.errors.push({
                row: i + 1,
                item: item.name,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    return response;
}

// Elysia route setup
export const menuUploadRoutes = new Elysia({ prefix: '/api/menu' }).use(authPlugin)
// .post(
//     '/bulk-upload',
//     async ({ body, store: { lang } }) => {
//         const result = await bulkUploadMenuItems(body.items, lang);
//         return result;
//     },
//     {
//         body: t.Object({
//             items: t.Array(bulkMenuItemSchema),
//         }),
//     }
// )
// .post(
//     '/bulk-upload-csv',
//     async ({ body, store: { lang } }) => {
//         // Parse CSV file
//         const file = body.file;
//         const text = await file.text();

//         // You can use a library like papaparse or csv-parse
//         // For this example, assuming you have parsed CSV to JSON
//         const items: BulkMenuItem[] = parseCSVToMenuItems(text);

//         const result = await bulkUploadMenuItems(items, lang);
//         return result;
//     },
//     {
//         body: t.Object({
//             file: t.File(),
//         }),
//     }
// );

// Helper function to parse CSV (basic example)
function parseCSVToMenuItems(csvText: string): BulkMenuItem[] {
    // Implement CSV parsing logic here
    // This is a placeholder - use a proper CSV parser
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');

    return lines.slice(1).map(line => {
        const values = line.split(',');
        const item: any = {};

        headers.forEach((header, index) => {
            item[header.trim()] = values[index]?.trim();
        });

        return item as BulkMenuItem;
    });
}

// Export for use in main app
export { bulkUploadMenuItems, BulkMenuItem, BulkUploadResponse, bulkMenuItemSchema };