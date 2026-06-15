import Elysia, { t } from "elysia";
import { authPlugin, jwtPlugin } from "../../../middleware/auth";
import { db } from "../../../db";
import { users } from "../../../db/schema/users";
import { eq, or } from "drizzle-orm";
import _ from "lodash";
import { allergens, restaurants, tags } from "../../../db/schema";
import { generateRandomNumerics, plunk, redisClient } from "../../../../helpers";
import { renderOtpEmail } from "../../../../utils/renderEmail";
import { getLoginUser } from "./auth.service";
import slugify from "slugify";

// class Logger {
//     log(value: string) {
//         console.log(value)
//     }
// }

const router = new Elysia({ prefix: '/auth', tags: ['Auth'] })
    // .decorate("logger", new Logger())
    .use(jwtPlugin)

const otpOptionsValues = {
    "change-email": "Change Email",
    "change-password": "Change Password",
    "reset-password": "Reset Password"
}
enum otpOptions {
    changeEmail = 'change-email',
    changePassword = 'change-password',
    resetPassword = 'reset-password'
}

// router.post('/signup', async ({ body, status }) => {
//     try {
//         const foundUser = await db.select().from(users).where(or(eq(users.email, body.email), eq(users.name, body.name)))
//         if (foundUser.length > 0) {
//             // throw new Error('User already exists');
//             throw status(400, 'User already exists')
//         }
//         const hashedPassword = await Bun.password.hash(body.password)
//         const inserted = await db.insert(users).values({ ...body, password: hashedPassword, role: 'ADMIN' }).returning({
//             id: users.id
//         })

//         if (!inserted || inserted.length === 0) {
//             // throw new Error('Failed to create admin');
//             throw status(400, 'Failed to create admin')
//         }

//         // const allAllergens = await db.query.allergens.findMany({

//         //     columns: {
//         //         name: true,
//         //     }
//         // })

//         // for (const allergen of allAllergens) {
//         //     await db.insert(tags).values({
//         //         ...allergen,
//         //         restaurantId: inserted[0].id,
//         //         type: 'allergen',
//         //         key: slugify(allergen.name, {
//         //             lower: true,
//         //             trim: true,
//         //             strict: true
//         //         }).replace(/-/g, "_")

//         //     })
//         // }

//         return { success: true, message: 'Admin Created Successfully' }
//     } catch (e) {
//         throw status(400, e instanceof Error ? e.message : `${e}`)
//     }
// }, {
//     body: t.Object({
//         name: t.String({
//             error: 'Name is required',
//             minLength: 2
//         }),
//         email: t.String({
//             error: 'Email is required',
//             minLength: 2
//         }),
//         password: t.String({
//             error: 'Password is required',
//             minLength: 4
//         })
//     }),
//     tags: ['Auth']
// })

// router.post('/login', async ({ body, jwt, status }) => {
//     const foundUser = await getLoginUser(body.email)
//     if (!foundUser || foundUser.role !== 'ADMIN') {
//         throw status(400, 'User not found')
//     }
//     if (foundUser.restaurant?.suspended) {
//         throw status(400, 'Restaurant suspended')
//     }
//     const verified = await Bun.password.verify(body.password, foundUser.password)
//     if (!verified) {
//         throw status(400, 'Incorrect password')
//     }
//     const user = _.omit(foundUser, ['password'])
//     const userToPresent = _.omit(user, ['id'])
//     const token = await jwt.sign(user as any)
//     return { success: true, message: 'Login Successful', data: { ...userToPresent, token } }
// }, {
//     body: t.Object({
//         email: t.String({
//             error: 'Email is required',
//             minLength: 2,
//             format: 'email'
//         }),
//         password: t.String({
//             error: 'Password is required',
//             minLength: 4
//         })
//     }),
//     tags: ['Auth']
// })


router.use(authPlugin).post('/setup', async ({ body, store: { user }, jwt, status }) => {
    if (user?.setupComplete) {
        throw status(400, 'Brand has already been setup');
    }

    try {
        let restaurantId = user?.restaurantId;

        // If user already has a restaurant, update it
        if (restaurantId) {
            const updated = await db
                .update(restaurants)
                .set({ ...body, status: "COMPLETED" })
                .where(eq(restaurants.id, restaurantId))
                .returning({ id: restaurants.id });

            if (updated.length === 0) {
                // throw new Error('Failed to update existing brand');
                throw status(400, "Failed to update existing brand")
            }

            restaurantId = updated[0].id;
        } else {
            // Otherwise, create a new restaurant
            const inserted = await db
                .insert(restaurants)
                .values({ ...body, status: "COMPLETED" })
                .returning({ id: restaurants.id });

            if (inserted.length === 0) {
                // throw new Error('Failed to create new brand');
                throw status(400, "Failed to create new brand")
            }

            restaurantId = inserted[0].id;
        }

        // Update user to link to restaurant
        const result = await db
            .update(users)
            .set({
                restaurantId,
                languageId: body.languageId,
                setupComplete: true
            })
            .where(eq(users.id, user?.id as string))

        if (result.rowCount === 0) {
            // throw new Error('Failed to update user profile');
            throw status(400, "Failed to update user profile")
        }

        const foundUser = await getLoginUser(user?.email as string)
        const userToPresent = _.omit(foundUser, ['password', 'id'])

        const token = await jwt.sign(user as any)

        return { success: true, message: 'Brand setup complete', data: { ...userToPresent, token } };
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
}
    , {
        body: t.Object({
            name: t.String({
                error: 'Name is required',
                minLength: 2
            }),
            description: t.String({
                error: 'Email is required',
                minLength: 2
            }),
            image: t.Optional(t.String()),
            currencyId: t.String({
                error: 'A currency is required',
                minLength: 2,
                format: 'uuid'
            }),
            languageId: t.String({
                error: 'A language is required',
                minLength: 2,
                format: 'uuid'
            }),

        }),
        tags: ['Auth']
    }
)


router.use(authPlugin).get('/profile', async ({ store: { user }, status }) => {
    const profileInfo = await db.query.users.findFirst({
        where: () => eq(users.id, user?.id as string),
        columns: {
            email: true,
            name: true,
            role: true,
            languageId: true,
        },
        with: {
            restaurant: {
                columns: {
                    id: true,
                    address: true,
                    name: true,
                    currencyId: true,
                    image: true,
                    description: true,
                }
            }
        }
    })

    if (!profileInfo) {
        throw status(404, "User not found")
    }
    return { success: true, data: profileInfo }


})

router.use(authPlugin).put('/profile', async ({ body, store: { user }, status }) => {
    try {
        const code = await redisClient.get(`change-email:${user?.email}`)
        if (code !== body.code) {
            // throw new Error('Incorrect code');
            return { success: false, message: "Incorrect code" }
        }
        const updated = await db.update(users).set({
            email: body.email,
        }).where(eq(users.id, user?.id as string))
        if (!updated) {
            throw status(400, "Failed to update user")
        }
        return { success: true, message: "User updated successfully" }
    } catch (err) {
        throw status(400, err instanceof Error ? err.message : `${err}`)
    }
}, {
    body: t.Object({
        email: t.String({
            error: 'Email is required',
            minLength: 2,
            format: 'email'
        }),
        code: t.String({
            error: 'Code is required',
            minLength: 6,
        }),
        // password: t.String({
        //     error: 'Password is required',
        //     minLength: 4
        // }),
        // name: t.String({
        //     error: 'Name is required',
        //     minLength: 2
        // }),
    }),
    tags: ['Auth']
})

router.use(authPlugin).put('/setup', async ({ body, store: { user }, status }) => {

    try {
        const updated = await db.update(restaurants).set({
            ...body,
        }).where(eq(restaurants.id, user?.restaurantId as string)).returning({
            id: restaurants.id
        })
        if (!updated) {
            // throw new Error('Failed to create brand');
            throw status(400, "Failed to create brand")
        }
        if (body.languageId) {
            const userUpdated = await db.update(users).set({ languageId: body?.languageId }).where(eq(users.id, user?.id as string))
            if (!userUpdated) {
                // throw new Error('Failed to update user');
                throw status(400, "Failed to update user")
            }
        }
        return { success: true, message: 'Info Updated Successfully' }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
}, {
    body: t.Object({
        name: t.Optional(t.String({
        })),
        description: t.Optional(t.String({
        })),
        image: t.Optional(t.String({
        })),
        currencyId: t.Optional(t.String({
            format: 'uuid'
        })),
        languageId: t.Optional(t.String({
            format: 'uuid'
        })),
        address: t.Optional(t.String()),
        bannerUrl: t.Optional(t.String()),
    }),
    tags: ['Auth']
}
)

// router.use(authPlugin).post('reset-otp', async ({ body, store: { user } }) => {
//     try {
//         const code = generateRandomAlphanumeric(6);
//         await redisClient.set(`otp:${user?.email}`, code as string, 'EX', 60 * 5);
//         const emailSent = await plunk.emails.send({
//             to: user?.email as string,
//             subject: "Reset Password",
//             body: code,
//         })
//         if (!emailSent) {
//             throw new Error('Failed to send email');
//         }
//         return { success: true, message: 'Password reset email sent' }
//     } catch (e) {
//         return error(400, { message: `${e}` })
//     }
// }, {
//     tags: ['Auth']
// })

router.use(authPlugin).post('otp', async ({ body, store: { user }, status }) => {
    try {
        const code = generateRandomNumerics(6);
        const exists = await redisClient.exists(`${body.type}:${user?.email}`)
        if (exists) {
            return { success: false, message: "Try again in a few minutes" }
        }
        await redisClient.set(`${body.type}:${user?.email}`, code as string, 'EX', 60 * 5);
        const emailSent = await plunk.emails.send({
            to: user?.email as string,
            subject: otpOptionsValues[body.type],
            body: await renderOtpEmail(user?.name as string, code, otpOptionsValues[body.type])
        })
        if (!emailSent) {
            throw status(400, "Error occurred when sending email")
        }
        return { success: true, message: 'Otp Sent' }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)
    }
}, {
    tags: ['Auth'],
    body: t.Object({
        type: t.Enum(otpOptions)
    })
})

// router.use(authPlugin).post('change-password', async ({ body, store: { user }, status }) => {
//     const foundUser = await db.select().from(users).where(eq(users.id, user?.id as string))
//     if (!foundUser.length) {
//         // throw new Error('User not found');
//         return { success: false, message: "User not found" }
//     }
//     const code = await redisClient.get(`change-password:${user?.email}`)
//     if (code?.trim() !== body?.code?.trim()) {
//         // throw new Error('Incorrect code');
//         return { success: false, message: "Incorrect code" }
//     }
//     try {
//         const confirmOldPassword = await Bun.password.verify(body.oldPassword, foundUser[0].password)
//         if (!confirmOldPassword) {
//             // throw new Error('Incorrect old password');
//             return { success: false, message: "Incorrect old password" }
//         }
//         const hashedPassword = await Bun.password.hash(body.password)
//         const updated = await db.update(users).set({ password: hashedPassword }).where(eq(users.id, user?.id as string))
//         await redisClient.del(`change-password:${user?.email}`)
//         if (updated.rowCount === 0) {
//             // throw new Error('Failed to update user');
//             throw status(400, "Failed to update user")
//         }
//         return { success: true, message: 'Password updated successfully' }
//     } catch (e) {
//         throw status(400, e instanceof Error ? e.message : `${e}`)
//     }
// }, {
//     body: t.Object({
//         password: t.String({
//             error: 'Password should be at least 4 characters',
//             minLength: 4
//         }),
//         code: t.String({
//             error: 'Code should be 6 characters',
//             minLength: 6,
//         }),
//         oldPassword: t.String(),
//     }),
//     tags: ['Auth']
// })

router.use(authPlugin).get('/status', async ({ store: { user }, status }) => {
    try {
        const foundUser = await db.query.users.findFirst({
            where: () => eq(users.id, user?.id as string),
            with: {
                restaurant: {
                    columns: {
                        suspended: true
                    }
                }
            }
        })
        if (!foundUser) {
            // return error(404, { message: "User not found" })
            return { success: false, message: "User not found" }
        }
        return {
            success: true, data: {
                suspended: foundUser.restaurant?.suspended
            }
        }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`)

    }
}, {
    tags: ['Auth']
})



export default router;