import { eq, sql } from "drizzle-orm"
import { db } from "../../../db"
import { currencies, languages, users } from "../../../db/schema"

export const getLoginUser = async (email: string) => {
    const foundUser = await db.query.users.findFirst({
        where: () => eq(sql`lower(${users.email})`, email.toLowerCase()),
        columns: {
            id: true,
            name: true,
            email: true,
            role: true,
            languageId: true,
            restaurantId: true,
            setupComplete: true,
            suspended: true,
        },
        with: {
            restaurant: {
                columns: {
                    name: true,
                    status: true,
                    suspended: true,
                },
                with: {
                    currencies: {
                        columns: {
                            code: true,
                            name: true,
                            symbol: true
                        }
                    },
                },
            },
        }
    })

    return foundUser
}

export const getUserCurrencyAndLanguage = async (userId: string) => {
    const user = await db.query.users.findFirst({
        where: () => eq(users.id, userId),
        with: {
            restaurant: {
                with: {
                    currencies: true
                }
            }
        }
    })
    // const currency = await db.query.currencies.findFirst({
    //     where: () => eq(currencies.id, userId),
    //     columns: {
    //         code: true,
    //         name: true,
    //         symbol: true,
    //     },
    // })
    // const language = await db.query.languages.findFirst({
    //     where: () => eq(languages.id, userId),
    //     columns: {
    //         code: true,
    //         name: true,
    //         flag: true,
    //     },
    // })
    return { currency: user?.restaurant?.currencies }
}