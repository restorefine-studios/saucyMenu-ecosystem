import Auth from "./pages/auth";
import Main from "./pages/auth/main";
import Admin from "./pages/admin";
import Dashboard from "./pages/admin/dashboard";
import Subscriptions from "./pages/admin/subscriptions";
import ViewRestaurant from "./pages/admin/Restaurants/components/view";
import AllRestaurants from "./pages/admin/Restaurants";
import { RouteObject } from "react-router-dom";
import { authLoader } from "./lib/authLoader";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Auth />,
    children: [
      {
        index: true,
        element: <Main />,
      },
    ],
  },
  {
    path: "admin",
    element: <Admin />,
    loader: authLoader,
    children: [
      {
        index: true,
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "restaurants",
        children: [
          {
            path: "all-restaurants",
            element: <AllRestaurants />,
          },
          {
            path: ":id",
            element: <ViewRestaurant />,
          },
        ],
      },

      {
        path: "subscriptions",
        element: <Subscriptions />,
      },
    ],
  },
];
