import { RouteObject } from "react-router-dom";
import Auth from "../src/pages/auth";

import Setup from "./pages/auth/setup";
import Main from "./pages/auth/main";
import Admin from "./pages/admin";
import Dashboard from "./pages/admin/dashboard";
import Review from "./pages/admin/review";
import Menu from "./pages/admin/menu";
import Settings from "./pages/admin/settings";
// import Add from "./pages/admin/menu/add";

import Subscription from "./pages/admin/subscriptions";

import AddDrinks from "./pages/admin/menu/addDrinks";
import EditDish from "./pages/admin/menu/edit-dish";
import { authLoader, guestLoader } from "./lib/authLoader";
import EditDrink from "./pages/admin/menu/edit-drink";
import Menus from "./pages/admin/menus";
import MenuSections from "./pages/admin/menus/sections";
import MenuItems from "./pages/admin/menus/items";
import Add from "./pages/admin/menus/items/add";
import EditItems from "./pages/admin/menus/items/edit-dish";
import Classifications from "./pages/admin/menus/classifications";
import { BulkUpload } from "./pages/admin/menus/items/add/bulk-upload";
import Audit from "./pages/admin/audit";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Auth />,
    loader: guestLoader,
    children: [
      {
        index: true,
        element: <Main />,
      },
      {
        path: "setup",
        element: <Setup />,
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
        path: "menu",
        children: [
          {
            index: true,
            element: <Menu />,
          },
          // {
          //   path: "add",
          //   element: <Add />,
          // },
          {
            path: "add-drinks",
            element: <AddDrinks />,
          },
          // {
          //   path: "classifications",
          //   element: <Classifications />,
          // },
          {
            path: "edit-dish/:id",
            element: <EditDish />,
          },
          {
            path: "edit-drink/:id",
            element: <EditDrink />,
          },
        ],
      },
      {
        path: "menus",
        children: [
          {
            index: true,
            element: <Menus />,
          },
          {
            path: "sections/:menuId",
            element: <MenuSections />,
          },
          {
            path: ":menuId/items",
            element: <MenuItems />,
          },
          {
            path: ":menuId/items/:sectionId",
            element: <MenuItems />,
          },
          {
            path: "items",
            element: <MenuItems />,
          },
          {
            path: ":menuId/items/:sectionId/add",
            element: <Add />,
          },
          {
            path: ":menuId/items/:sectionId/edit/:id",
            element: <EditItems />,
          },
          {
            path: ":menuId/items/:sectionId/add/bulk",
            element: <BulkUpload />,
          },
          {
            path: "classifications",
            element: <Classifications />,
          },
        ],
      },
      {
        path: "review",
        element: <Review />,
      },
      {
        path: "subscription",
        element: <Subscription />,
      },
      {
        path: "audit",
        element: <Audit />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
    ],
  },
];
