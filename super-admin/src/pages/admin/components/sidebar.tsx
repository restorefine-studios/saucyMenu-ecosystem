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
} from "@/components/ui/sidebar";

import { LayoutDashboard, Wallet, CornerDownLeft, Salad } from "lucide-react";

import { NavLink, useNavigate, useLocation } from "react-router-dom";
import logo from "../../../assets/4f02a2e6c6acd8a847d3ddaba33f3830.png";
import { useAtom } from "jotai";
import { userAtom } from "@/atoms/user";
import { authClient } from "@/lib/auth-client";
const AppSidebar = () => {
  const { pathname } = useLocation();
  const [, setUser] = useAtom(userAtom);
  const navigate = useNavigate();
  const items = [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: LayoutDashboard,
    },

    // {
    //   title: "Restaurants",
    //   url: "",
    //   icon: ChefHat,
    //   hasSubMenu: true,
    //   submenuItems: [
    //     { title: "Pending", url: "/admin/restaurants/pending" },
    //     { title: "Approved ", url: "/admin/restaurants/approved" },
    //   ],
    // },
    {
      title: "Restaurants",
      url: "/admin/restaurants/all-restaurants",
      icon: Salad,
    },

    {
      title: "Subscriptions",
      url: "/admin/subscriptions",
      icon: Wallet,
    },
  ];

  function urlIsSimilar(url: string) {
    return url.replace(/\/$/, "") === pathname.replace(/\/$/, "");
  }

  async function signOut() {
    await authClient.signOut({
      fetchOptions:{
        onSuccess:()=>{
          setUser(null);
          navigate("/");
        }
      }
    });
 
  }
  return (
    <Sidebar className="bg-gray-100 pt-4 pl-4 pb-4" variant="inset">
      <section className="h-full flex flex-col justify-between rounded-3xl bg-white">
        <SidebarHeader className="h-auto mx-auto border-b-0 p-8">
          <img className="w-36 h-16 " src={logo} alt="Logo" />
        </SidebarHeader>
        <SidebarContent className="px-4">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {/* {item.hasSubMenu ? (
                    <Collapsible
                      key={item.title}
                      asChild
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={item.title}>
                            {item.icon && <item.icon />}
                            <p className="md:text-lg text-md">{item.title}</p>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          {item.submenuItems?.map((subItem) => (
                            <SidebarMenuItem key={subItem.title}>
                              <NavLink to={subItem.url}>
                                <SidebarMenuButton
                                  asChild
                                  isActive={urlIsSimilar(subItem.url)}
                                  className="data-[active=true]:bg-[#F7941D] data-[active=true]:text-white py-5 pl-10"
                                >
                                  <div className="flex items-center gap-2">
                                    <span>{subItem.title}</span>
                                  </div>
                                </SidebarMenuButton>
                              </NavLink>
                            </SidebarMenuItem>
                          ))}
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ) : ( */}
                    <NavLink to={item.url}>
                      {/* {({ isActive }) => ( */}
                      <SidebarMenuButton
                        asChild
                        isActive={urlIsSimilar(item?.url)}
                        className="data-[active=true]:bg-[#F7941D] data-[active=true]:text-white py-6"
                      >
                        <div className={` ${item?.url?.includes(pathname) ? "text-white" : "text-gray-400 hover:text-gray-400" } flex items-center gap-2`}>
                          <item.icon />
                          <div className={` ${item?.url?.includes(pathname) ? "text-white" : "text-gray-400" }  md:text-lg font-normal text-md`}>{item.title}</div>
                        </div>
                      </SidebarMenuButton>
                      {/* )} */}
                    </NavLink>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <Button
            onClick={signOut}
            className="flex items-center justify-start bg-transaprent text-[#F7941D] hover:cursor-pointer hover:bg-red-500 hover:text-white"
          >
            <CornerDownLeft className="h-4 w-4" />
            Logout
          </Button>
        </SidebarFooter>
      </section>
    </Sidebar>
  );
};

export default AppSidebar;
