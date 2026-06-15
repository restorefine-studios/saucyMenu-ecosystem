import Elysia from "elysia";
import authRoutes from './auth/route'
import preferencesRoutes from './preferences/route'
import reviewRoutes from './reviews/route'

import menuClassificationRoutes from './menu/classifications.route'
import menuRoutes from './menu/menu.route'
import menuItemsRoutes from './menu/menu-items.route'
import menuSectionsRoutes from './menu/menu-sections.route'
import menuAIRoutes from './menu/ai.route'

const router = new Elysia({ prefix: '/user' })
    .use(authRoutes)
    .use(preferencesRoutes)
    .use(reviewRoutes)
    .use(menuClassificationRoutes)
    .use(menuRoutes)
    .use(menuItemsRoutes)
    .use(menuSectionsRoutes)
    .use(menuAIRoutes)
export default router;