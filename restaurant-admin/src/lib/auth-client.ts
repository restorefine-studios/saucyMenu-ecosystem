import { createAuthClient } from "better-auth/react"
import { emailOTPClient } from "better-auth/client/plugins"
const rawServerUrl = (import.meta.env.VITE_APP_SERVER_URL || "").trim();
const serverUrl = rawServerUrl.endsWith("/") ? rawServerUrl.slice(0, -1) : rawServerUrl;

export const authClient = createAuthClient({
    /** The base URL of the server (optional if you're using the same domain) */
    baseURL: serverUrl + "/auth",
    fetchOptions: {
        credentials: 'include',
        get headers(): Record<string, string> {
            const token = localStorage.getItem("token");
            return token ? { Authorization: `Bearer ${token}` } : {};
        }
    },
    plugins: [
        emailOTPClient(),
    ]
})