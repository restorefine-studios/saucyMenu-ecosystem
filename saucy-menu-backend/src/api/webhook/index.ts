import Elysia from "elysia";
import stripeRoutes from "./stripe/route";

const router = new Elysia({ prefix: "/webhook" })
    .use(stripeRoutes)

// router.use('/stripe', stripeRoutes)

export default router;