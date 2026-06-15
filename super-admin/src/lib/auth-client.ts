import { createAuthClient } from "better-auth/react"
import { adminClient } from "better-auth/client/plugins"
export const authClient = createAuthClient({
    baseURL: import.meta.env.VITE_APP_SERVER_URL + '/auth',
    fetchOptions: {
        credentials: 'include',
        get headers(): Record<string, string> {
            const token = localStorage.getItem("token");
            return token ? { Authorization: `Bearer ${token}` } : {};
        }
    },
    plugins: [
        adminClient()
    ]
})