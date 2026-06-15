import Elysia from "elysia";
import BaseRoute from "./base/base.routes";
import AuthRoute from "./auth/route";

const router = new Elysia({ prefix: '/shared' })
    .use(BaseRoute)
    .use(AuthRoute)

export default router;