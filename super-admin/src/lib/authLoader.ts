import { redirect } from "react-router-dom";
import { authClient } from "./auth-client";

export async function authLoader() {
    const { data: session, error } = await authClient.getSession();

    if (error || !session) {
        throw redirect("/");
    }

    // Only super-admins (role='admin') may use this app
    if ((session.user as any)?.role !== 'admin') {
        throw redirect("/?error=wrong_account");
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