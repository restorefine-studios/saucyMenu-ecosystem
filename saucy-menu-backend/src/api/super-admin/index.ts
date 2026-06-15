import Elysia from "elysia";
import restaurantRoutes from './restaurants/restaurants.route'
import authRoutes from './auth/auth.route'
import subScriptionRoutes from './subscriptions/route'
import statsRoutes from './stats/route'
import allergensRoutes from './menu/allergens.route'


const router = new Elysia({ prefix: '/super' })
    .use(restaurantRoutes)
    .use(authRoutes)
    .use(subScriptionRoutes)
    .use(statsRoutes)
    .use(allergensRoutes)



export default router;