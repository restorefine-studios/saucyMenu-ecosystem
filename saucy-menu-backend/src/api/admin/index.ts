import Elysia from "elysia";
import AuthRoute from "./auth/auth.route";
import ReviewsRoute from "./reviews/route";
import StatsRoute from "./stats/route";
import SubscriptionRoutes from "./subscriptions/route";
import subCron from "./subscriptions/cron";
import menuRoutes from "./menu/menu.route";
import menuSectionsRoutes from "./menu/menu-sections.route";
import menuItemsRoutes from "./menu/menu-items.route";
import menuTagsRoutes from "./menu/menu-tags.route";
import addonsRoutes from "./menu/addons.route";
import classificationsRoutes from "./classifications/route";
import auditRoutes from "./audit/route";

const router = new Elysia({ prefix: '/admin' })
    // .use(loggingPlugin)
    .use(AuthRoute)
    .use(ReviewsRoute)
    .use(StatsRoute)
    .use(SubscriptionRoutes)
    .use(subCron)
    .use(menuRoutes)
    .use(menuSectionsRoutes)
    .use(menuItemsRoutes)
    .use(menuTagsRoutes)
    .use(addonsRoutes)
    .use(classificationsRoutes)
    .use(auditRoutes)
export default router;