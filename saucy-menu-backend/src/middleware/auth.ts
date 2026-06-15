import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { auth } from "../lib/auth";

export interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    restaurantId: string | null;
    languageId: string | null;
    setupComplete: boolean;
}


// const betterAuth = new Elysia()
//     .mount(auth.handler)
//     .state("user", null as User | null)
//     .derive({ as: "global" }, async ({ store }) => {
//         return {
//             user: store.user,
//         };
//     })
//     .macro({
//         auth: {
//             async resolve({ status, request: { headers }, store }) {
//                 const session = await auth.api.getSession({
//                     headers,
//                 });
//                 if (!session) return status(401);
//                 store.user = session.user;
//                 // return {
//                 //     user: session.user,
//                 //     session: session.session,
//                 // };
//             },
//         },
//     });


export const jwtPlugin = new Elysia().use(
    jwt({
        name: "jwt",
        secret: process.env.JWT_SECRET, // Replace with a secure secret
    })
)

// export const authPlugin = betterAuth

export const authPlugin = new Elysia()
    // .use(
    //     jwt({
    //         name: "jwt",
    //         secret: process.env.JWT_SECRET, // Replace with a secure secret
    //     })
    // )
    .state("user", null as any)
    .state("lang", '')
    .derive({ as: "scoped" }, async ({ store, request: { headers }, status }) => {
        const session = await auth.api.getSession({
            headers,
        });
        if (!session) return status(401);
        if (session.user) {
            store.user = session.user;
        }
        const lang = headers.get('lang') as string ?? 'en';
        store.lang = lang as string ?? 'en';


        if (store.user?.role !== "user") {
            throw new Error("Unauthorized: You are not authorized to access this route");
        }

    });
export const superAdminAuthPlugin = new Elysia()
    // .use(
    //     jwt({
    //         name: "jwt",
    //         secret: process.env.JWT_SECRET, // Replace with a secure secret
    //     })
    // )
    .state("user", null as any | null)
    .derive({ as: "scoped" }, async ({ request: { headers }, store, set }) => {


        const session = await auth.api.getSession({
            headers,
        });
        if (!session) {
            set.status = 401;
            throw new Error("Unauthorized: Invalid token");
        }
        store.user = session.user as any;
        if (store.user?.role !== "admin") {
            throw new Error("Unauthorized: You are not authorized to access this route");
        }


    });
export const userAuthPlugin = new Elysia()
    .use(
        jwt({
            name: "jwt",
            secret: process.env.JWT_SECRET, // Replace with a secure secret
        })
    )
    .state("user", null as User & { sessionId: string } | null)
    .state("lang", '')
    .derive({ as: "scoped" }, async ({ jwt, headers, store, set }) => {
        const token = headers.authorization?.split(" ")[1];
        const lang = headers.lang

        if (!lang) {
            store.lang = "en";
        }

        if (!token) {
            set.status = 401;
            throw new Error("Unauthorized: No token provided");
        }

        const user = await jwt.verify(token); // Ensure `User` type is applied
        if (!user) {
            set.status = 401;
            throw new Error("Unauthorized: Invalid token");
        }
        store.user = user as any;
        store.lang = lang as string;
        if (store.user?.role !== "END_USER") {
            throw new Error("Unauthorized: You are not authorized to access this route");
        }

    });
