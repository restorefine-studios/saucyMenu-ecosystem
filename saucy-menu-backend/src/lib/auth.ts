import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import { admin, customSession } from "better-auth/plugins";
import { getUserCurrencyAndLanguage } from "../api/admin/auth/auth.service";
import { emailOTP } from "better-auth/plugins"
import { plunk } from "../../helpers";
import { renderOtpEmail } from "../../utils/renderEmail";
import { eq } from "drizzle-orm";
import { users } from "../db/schema/users";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
    }),

    baseURL: process.env.BETTER_AUTH_URL!,
    databaseHooks: {
        session: {
            create: {
                before: async (session) => {
                    // Fetch the user's restaurant
                    const user = await db.query.users.findFirst({
                        where: eq(users.id, session.userId),
                        with: { restaurant: true },
                    });

                    if (user?.restaurant?.suspended) {
                        throw new APIError("FORBIDDEN", {
                            message: "Your restaurant has been suspended.",
                        });
                    }

                    return { data: session };
                },
            }
        }
    },
    emailAndPassword: {
        enabled: true,

        // requireEmailVerification: true,
        password: {
            hash: async (password) => {
                return await Bun.password.hash(password)
            },
            verify: async (data) => {
                return await Bun.password.verify(data.password, data.hash)
            },
        }
    },
    plugins: [
        admin(),
        customSession(async ({ user, session }) => {
            const { currency } = await getUserCurrencyAndLanguage(user.id)
            return {
                session,
                user: {
                    ...user,
                    currency,
                    // language
                }
            }
        }),
        emailOTP({
            changeEmail: {
                enabled: true
            },
            async sendVerificationOTP({ email, otp, type }) {
                console.log(email, otp, type)
                await plunk.emails.send({
                    to: email,
                    subject: 'Change Email',
                    body: await renderOtpEmail(email, otp, type === 'change-email' ? 'Change Email' : type === 'forget-password' ? 'Reset Password' : 'Email Verification')
                })

            }
        })
    ],
    user: {
        modelName: "users",
        additionalFields: {
            // role: {
            //     type: ['SUPER_ADMIN', 'ADMIN'],
            //     defaultValue: 'ADMIN',
            //     input: false,
            // },
            restaurantId: {
                type: 'string'
            },
            languageId: {
                type: 'string',
            },
            setupComplete: {
                type: 'boolean',
            },
        }
    },
    advanced: {
        database: {
            generateId: "uuid"
        },
        cookiePrefix: 'saucy-menu-auth',
        crossSubDomainCookies: {
            enabled: false, // Disable for now - Cloudflare Pages subdomains don't work well with this
        },
        // Add default cookie attributes
        defaultCookieAttributes: {
            sameSite: 'none', // Required for cross-origin
            secure: true, // Required for production HTTPS
            domain: undefined, // Let it auto-detect
        },
    },
    trustedOrigins: [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://dashboard.saucymenu.com',
        'https://saucymenu.com',
        'https://super-admin-79d.pages.dev'

    ]
});