import Elysia, { t } from "elysia";
import { jwtPlugin } from "../../../middleware/auth";
import { auth } from "../../../lib/auth";

const router = new Elysia({ prefix: '/auth', tags: ['Super Admin Auth'] })
    .use(jwtPlugin)

router.post('signup', async ({ body, status, headers }) => {
    const internalAdminToken = headers['x-internal-admin-token']
    if (internalAdminToken !== process.env.INTERNAL_ADMIN_TOKEN) {
        throw status(401, 'Unauthorized');
    }
    const newUser = await auth.api.createUser({
        body: {
            email: body.email, // required
            password: body.password, // required
            name: body.name, // required
            role: 'admin'
        },
    });
    if (!newUser) {
        throw status(400, 'Failed to create admin');
    }
    return { success: true, message: 'Admin Created Successfully' }
}, {
    body: t.Object({
        email: t.String({
            error: 'Email is required',
            minLength: 2,
            format: 'email'
        }),
        password: t.String({
            error: 'Password is required',
            minLength: 4
        }),
        name: t.String({
            error: 'Name is required',
            minLength: 2
        }),
    })
})

// router.post('/signup', async ({ body, status, headers }) => {
//     const internalAdminToken = headers['x-internal-admin-token']
//     if (internalAdminToken !== process.env.INTERNAL_ADMIN_TOKEN) {
//         throw status(401, 'Unauthorized');
//     }
//     const foundUser = await db.select().from(users).where(or(eq(users.email, body.email), eq(users.name, body.name)))
//     if (foundUser.length > 0) {
//         throw status(400, 'User already exists');
//     }
//     const password = generateRandomAlphanumeric(9)

//     const hashedPassword = await Bun.password.hash(password)
//     const inserted = await db.insert(users).values({ ...body, password: hashedPassword, role: 'SUPER_ADMIN' })
//     if (!inserted) {
//         throw status(400, 'Failed to create admin');
//     }
//     const emailSent = await plunk.emails.send({
//         to: body?.email as string,
//         subject: "Super Admin Signup",
//         body: await renderWelcomeEmail(body.name, body.email, password)
//     })

//     if (!emailSent) {
//         throw status(400, 'Failed to send email');
//     }
//     return { success: true, message: 'Admin Created Successfully' }

// }, {
//     body: t.Object({
//         name: t.String({
//             error: 'Name is required',
//             minLength: 2
//         }),
//         email: t.String({
//             error: 'Email is required',
//             minLength: 2,
//             format: 'email'
//         }),
//         // password: t.String({
//         //     error: 'Password is required',
//         //     minLength: 4
//         // })
//     })
// })

// router.post('/login', async ({ body, jwt, status }) => {
//     try {
//         const foundUser = await db.select().from(users).where(eq(sql`lower(${users.email})`, body.email.toLowerCase()))
//         console.log(foundUser)
//         if (foundUser.length === 0) {
//             throw status(404, 'User not found');
//         }
//         if (foundUser[0].role !== 'SUPER_ADMIN') {
//             throw status(400, 'User not found');
//         }
//         if (foundUser[0].suspended) {
//             throw status(400, 'User suspended');
//         }
//         const verified = await Bun.password.verify(body.password, foundUser[0].password)
//         if (!verified) {
//             // throw new Error('Incorrect password');
//             throw status(400, 'Incorrect password');
//         }
//         const user = _.omit(foundUser[0], ['password'])
//         const userToPresent = _.omit(user, ['id'])
//         const token = await jwt.sign(user as any)
//         return { success: true, message: 'Login Successful', data: { ...userToPresent, token } }
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
//         password: t.String({
//             error: 'Password is required',
//             minLength: 4
//         })
//     }),
// })


export default router