import Elysia, { t } from "elysia";
import { redisClient } from "../../../../helpers";
// import { renderPasswordResetEmail } from "../../../../utils/renderEmail";

const router = new Elysia({ prefix: '/auth', tags: ['Shared Auth'] })

// router.post('/forgot-password', async ({ body, status }) => {
//     try {
//         const foundUser = await db.select().from(users).where(eq(users.email, body.email)).limit(1)
//         if (foundUser.length === 0) {
//             throw new Error('User not found');
//         }

//         const user = foundUser[0];
//         const redisKey = `forgot-password:${user.email}`;

//         // const codeExists = await redisClient.exists(redisKey)

//         // if (codeExists) {
//         //     throw new Error('Try again in a few minutes');
//         // }

//         const code = generateRandomNumerics(6);
//         await redisClient.set(redisKey, code, 'EX', 60 * 5);

//         const emailSent = await plunk.emails.send({
//             to: foundUser[0].email,
//             subject: "Reset Password",
//             // body: `Your reset code is: ${code}`,
//             body: await renderPasswordResetEmail(foundUser[0].name, code)

//         })
//         if (!emailSent) {
//             throw new Error('Failed to send email');
//         }
//         return { success: true, message: 'Password reset email sent' }
//     } catch (e) {
//         console.log(e)
//         throw status(400, e instanceof Error ? e.message : `${e}`);
//     }
// }, {
//     body: t.Object({
//         email: t.String({
//             error: 'Email is required',
//             minLength: 2,
//             format: 'email'
//         }),
//     }),
// })

router.post('verify-otp', async ({ body, status }) => {
    try {
        const code = await redisClient.get(`forgot-password:${body.email}`)
        if (code !== body.code) {
            throw new Error('Incorrect code');
        }
        return { success: true, message: 'OTP verified successfully' }
    } catch (e) {
        throw status(400, e instanceof Error ? e.message : `${e}`);
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
    }),
})

// router.post('/reset-password', async ({ body, status }) => {
//     try {
//         const redisKey = `forgot-password:${body.email}`
//         const foundUser = await redisClient.get(redisKey)

//         if (foundUser === body.code) {
//             const hashedPassword = await Bun.password.hash(body.password)

//             const updated = await db.update(users).set({ password: hashedPassword }).where(eq(users.email, body.email))

//             if (updated.rowCount === 0) {
//                 throw new Error('Failed to update user');
//             }

//             await redisClient.del(redisKey)

//             return { success: true, message: 'Password updated successfully' }
//         } else {
//             throw new Error(`Incorrect code ${foundUser}`);
//         }

//     } catch (e) {
//         throw status(400, e instanceof Error ? e.message : `${e}`);
//     }
// }, {
//     body: t.Object({
//         email: t.String({
//             error: 'Email is required',
//             minLength: 2,
//             format: 'email'
//         }),
//         code: t.String({
//             error: 'Code is required',
//             minLength: 6,
//         }),
//         password: t.String({
//             error: 'Password is required',
//             minLength: 4
//         })
//     }),
// })


export default router;