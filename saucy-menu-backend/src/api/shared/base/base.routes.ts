import Elysia from "elysia"
import { db } from "../../../db";
import { asc } from "drizzle-orm";
import { languages } from "../../../db/schema";
import { redisClient } from "../../../../helpers";

const router = new Elysia({ prefix: '/base' })


router.get('/setup', async ({ status }) => {
    try {
        let allLanguages: any;
        const languagesCacheKey = 'setup:languages';
        const cacheExpiry = 60 * 60 * 1; // 1 hour

        const existsInRedis = await redisClient.exists(languagesCacheKey);

        if (!existsInRedis) {
            // Fetch from database
            allLanguages = await db.query.languages.findMany({
                orderBy: asc(languages.sortOrder),
                where: (la, { eq }) => eq(la.isActive, true)
            });

            // Cache the result with error handling
            try {
                await redisClient.set(
                    languagesCacheKey,
                    JSON.stringify(allLanguages),
                    'EX',
                    cacheExpiry
                );
            } catch (cacheError) {
                // Log cache error but don't fail the request
                console.warn('Failed to cache languages:', cacheError);
            }
        } else {
            // Get from cache with error handling
            const redisLanguages = await redisClient.get(languagesCacheKey);
            if (redisLanguages) {
                try {
                    allLanguages = JSON.parse(redisLanguages);
                } catch (parseError) {
                    console.warn('Failed to parse cached languages, fetching from DB:', parseError);
                    // Fallback to database if cache is corrupted
                    allLanguages = await db.query.languages.findMany({
                        orderBy: asc(languages.code)
                    });
                    // Clear the corrupted cache
                    await redisClient.del(languagesCacheKey);
                }
            } else {
                // Cache key exists but value is null/undefined
                allLanguages = await db.query.languages.findMany({
                    orderBy: asc(languages.sortOrder),
                    where: (la, { eq }) => eq(la.isActive, true)
                });
            }
        }

        // Cache currencies too since they rarely change
        let currencies: any;
        const currenciesCacheKey = 'setup:currencies';

        const currenciesExistInRedis = await redisClient.exists(currenciesCacheKey);

        if (!currenciesExistInRedis) {
            // Fetch currencies from database
            currencies = await db.query.currencies.findMany();

            // Cache currencies with error handling
            try {
                await redisClient.set(
                    currenciesCacheKey,
                    JSON.stringify(currencies),
                    'EX',
                    cacheExpiry // Same TTL as languages, or could be longer
                );
            } catch (cacheError) {
                console.warn('Failed to cache currencies:', cacheError);
            }
        } else {
            // Get currencies from cache
            const redisCurrencies = await redisClient.get(currenciesCacheKey);
            if (redisCurrencies) {
                try {
                    currencies = JSON.parse(redisCurrencies);
                } catch (parseError) {
                    console.warn('Failed to parse cached currencies, fetching from DB:', parseError);
                    currencies = await db.query.currencies.findMany();
                    await redisClient.del(currenciesCacheKey);
                }
            } else {
                currencies = await db.query.currencies.findMany();
            }
        }

        return {
            success: true,
            data: {
                languages: allLanguages,
                currencies
            }
        };

    } catch (e) {

        throw status(400, e instanceof Error ? e.message : `${e}`);

    }
});

export default router;