import { redirect } from "react-router-dom";
import { authClient } from "./auth-client";

export async function authLoader() {
    const { data: session, error } = await authClient.getSession();

    if (error || !session) {
        throw redirect("/");
    }

    return { session };
}

export async function guestLoader() {
    const { data: session } = await authClient.getSession();

    if (session) {
        throw redirect("/admin/dashboard");
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return null;
}