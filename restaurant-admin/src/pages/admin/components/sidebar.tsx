import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  ChevronRight,
  Settings,
  LayoutDashboard,
  Star,
  ClipboardList,
  ArrowUpRight,
  CornerDownLeft,
  CreditCard,
  FileText,
} from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import logo from "../../../assets/4f02a2e6c6acd8a847d3ddaba33f3830.png";
import { Card } from "@/components/ui/card";
import updateImg from "@/assets/updatePlanImage.jpg";
import { useAtom } from "jotai";
import { userAtom } from "@/atoms/user";
import { axiosInstance } from "@/lib/utils";
import apiRoutes from "@/apiRoutes";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { authClient } from "@/lib/auth-client";

const normalizePath = (path: string) => path.replace(/\/$/, "") || "/";

const AppSidebar = () => {
  const { pathname } = useLocation();
  const [, setUser] = useAtom(userAtom);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentPath = normalizePath(pathname);

  const items: Array<{
    title: string;
    url: string;
    icon: React.ComponentType<{ className?: string }>;
    hasSubMenu?: boolean;
    submenuItems?: Array<{ title: string; url: string }>;
  }> = [
    {
      title: t("sideNav.dashboard"),
      url: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: t("sideNav.menu"),
      url: "/admin/menus",
      icon: ClipboardList,
      hasSubMenu: true,
      submenuItems: [
        { title: t("sideNav.menusAndSections"), url: "/admin/menus" },
        { title: t("sideNav.menuItems"), url: "/admin/menus/items" },
        { title: t("sideNav.menuClass"), url: "/admin/menus/classifications" },
      ],
    },
    {
      title: t("sideNav.review"),
      url: "/admin/review",
      icon: Star,
    },
    {
      title: t("sideNav.sub"),
      url: "/admin/subscription",
      icon: CreditCard,
    },
    {
      title: t("sideNav.audit"),
      url: "/admin/audit",
      icon: FileText,
    },
    {
      title: t("sideNav.settings"),
      url: "/admin/settings",
      icon: Settings,
    },
  ];

  const isExactMatch = (url: string) => normalizePath(url) === currentPath;

  const isPathUnder = (baseUrl: string) => {
    const base = normalizePath(baseUrl);
    return currentPath === base || currentPath.startsWith(base + "/");
  };

  /** Menu items live at /admin/menus/items OR /admin/menus/:menuId/items(/:sectionId) */
  const isMenuItemsPage = () =>
    isExactMatch("/admin/menus/items") ||
    /^\/admin\/menus\/[^/]+\/items(\/.*)?$/.test(currentPath);

  const isItemActive = (item: (typeof items)[0]) =>
    item.hasSubMenu ? isPathUnder(item.url) : isExactMatch(item.url);

  async function signOut() {
    await authClient.signOut(
      {},
      {
        onSuccess: () => {
          setUser(null);
          navigate("/");
        },
        onError: (error) => {
          console.error(error);
        },
      },
    );
  }

  const getSubscriptionList = async () => {
    const response = await axiosInstance.get(apiRoutes.subscriptionList);
    return response.data;
  };

  const { data } = useQuery<SubscriptionList>({
    queryKey: ["subscriptionList"],
    queryFn: getSubscriptionList,
    refetchOnWindowFocus: false,
  });

  const foundSubscription = data?.data.find((item) => item.subscribed === true);

  return (
    <Sidebar className="bg-gray-100 pt-4 pl-4 pb-4" variant="inset">
      <section className="h-full flex flex-col justify-between rounded-3xl bg-white">
        <SidebarHeader className=" w-full grid place-items-center h-auto mx-auto border-b-0 p-8">
          <img
            className="w-36 h-16 object-cover aspect-ratio-1"
            src={logo}
            alt="Logo"
          />
        </SidebarHeader>
        <SidebarContent className="px-4">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {item.hasSubMenu ? (
                      <Collapsible
                        open={isPathUnder(item.url)}
                        className="group/collapsible"
                      >
                        <div className="flex items-center">
                          <SidebarMenuButton
                            asChild
                            isActive={isItemActive(item)}
                            className="flex-1 rounded-lg data-[active=true]:bg-[#F7941D] data-[active=true]:text-white py-5 transition-colors"
                          >
                            <Link
                              to={item.url}
                              className="flex w-full items-center gap-2"
                            >
                              <item.icon className="h-5 w-5 shrink-0" />
                              <span className="truncate md:text-base text-sm font-medium">
                                {item.title}
                              </span>
                            </Link>
                          </SidebarMenuButton>
                          <ChevronRight
                            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                            aria-hidden
                          />
                        </div>
                        <CollapsibleContent>
                          <SidebarMenuSub className="mt-0.5 border-l-2 border-[#F7941D]/30 ml-3 pl-2 space-y-0.5">
                            {item.submenuItems?.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={
                                    subItem.url === "/admin/menus/items"
                                      ? isMenuItemsPage()
                                      : isExactMatch(subItem.url)
                                  }
                                  className="rounded-md py-3 data-[active=true]:bg-[#F7941D]/15 data-[active=true]:text-[#F7941D] data-[active=true]:font-medium data-[active=true]:border-l-2 data-[active=true]:border-[#F7941D] data-[active=true]:-ml-[2px] data-[active=true]:pl-[calc(0.5rem+2px)]"
                                >
                                  <NavLink to={subItem.url}>
                                    <span className="text-sm">
                                      {subItem.title}
                                    </span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <NavLink to={item.url}>
                        <SidebarMenuButton
                          asChild
                          isActive={isExactMatch(item.url)}
                          className="rounded-lg data-[active=true]:bg-[#F7941D] data-[active=true]:text-white py-5 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <item.icon className="h-5 w-5 shrink-0" />
                            <span className="truncate md:text-base text-sm font-medium">
                              {item.title}
                            </span>
                          </div>
                        </SidebarMenuButton>
                      </NavLink>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          {!foundSubscription?.subscribed && (
            <Card className="p-0 mx-4">
              <div className=" bg-black h-[250px] flex flex-col justify-between text-white rounded-3xl overflow-hidden">
                {/* Header section with title and arrow button */}
                <div className="pt-5 px-4 pb-0 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-normal">{t("sideNav.updatePlan.title")}</h2>
                    <p className="text-gray-300 text-[10px]">
                      {t("sideNav.updatePlan.subtitle")}
                    </p>
                  </div>
                  <button className="bg-[#F7941D] rounded-full p-2 flex items-center justify-center">
                    <ArrowUpRight className="h-5 w-5 text-white" />
                  </button>
                </div>

                <div className="relative mt-1">
                  <img
                    src={updateImg}
                    alt={t("sideNav.updatePlan.imageAlt")}
                    className="w-full lg:h-44 md:h-32 h-28 object-cover object-bottom rounded-2xl p-2"
                  />

                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <Link
                      to={"/admin/subscription"}
                      className="bg-white hover:cursor-pointer hover:bg-gray-200 text-black font-medium text-md py-2 px-0 rounded-full w-[87%] text-center"
                    >
                      {t("sideNav.updatePlan.cta")}
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          )}
          <Button
            onClick={signOut}
            className="flex items-center justify-start bg-transparent text-[#F7941D] hover:cursor-pointer hover:bg-red-500 hover:text-white text-lg"
          >
            <CornerDownLeft className="h-5 w-5" />
            {t("sideNav.logout")}
          </Button>
        </SidebarFooter>
      </section>
    </Sidebar>
  );
};

export default AppSidebar;
