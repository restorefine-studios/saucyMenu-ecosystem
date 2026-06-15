import { redirect } from "react-router-dom";
import { authClient } from "./auth-client";

// export const authLoader = () => {
//     const userString = localStorage.getItem("user");

//     // Safely parse only if userString exists
//     let userData: { token?: string } | null = null;
//     try {
//         if (userString) {
//             userData = JSON.parse(userString);
//         }
//     } catch (e) {
//         // Optionally log or handle the parse error
//         console.error("Invalid user data in localStorage:", e);
//     }

//     if (!userData?.token) {
//         throw redirect("/");
//     }

//     return null;
// };

export async function authLoader() {
    const { data: session, error } = await authClient.getSession();

    if (error || !session) {
        throw redirect("/");
    }

    return { session };
}

export async function guestLoader() {
    const { data: session } = await authClient.getSession();

    if (location.pathname === '/setup') {
        return null
    }

    if (session) {
        throw redirect("/admin/dashboard");
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return null;
}