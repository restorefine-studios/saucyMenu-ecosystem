import { NavLink, useNavigate, useLocation } from "react-router-dom"
import { Home, ClipboardList, Star, Menu as MenuIcon, Plus } from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer"
import { CreditCard, FileText, Settings, X } from "lucide-react"
import { useState } from "react"

const TABS = [
  { to: "/admin/dashboard", label: "Home", icon: Home },
  { to: "/admin/menus", label: "Menus", icon: ClipboardList },
  { to: "/admin/review", label: "Reviews", icon: Star },
]

const MORE_LINKS = [
  { to: "/admin/subscription?view=plans", label: "Subscription", icon: CreditCard },
  { to: "/admin/audit", label: "Audit", icon: FileText },
  { to: "/admin/settings", label: "Settings", icon: Settings },
]

export function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)

  const isMoreActive = MORE_LINKS.some((link) => pathname.startsWith(link.to.split("?")[0]))

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)]">
        <div className="relative grid grid-cols-5 items-center px-2 pt-2 pb-2">
          {TABS.slice(0, 2).map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-1 text-xs font-medium ${
                  isActive ? "text-[#F7941D]" : "text-gray-400"
                }`
              }
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </NavLink>
          ))}

          {/* Center FAB */}
          <div className="flex justify-center">
            <button
              onClick={() => navigate("/admin/menus")}
              aria-label="Add menu item"
              className="-mt-8 w-14 h-14 rounded-full bg-[#F7941D] shadow-lg flex items-center justify-center text-white hover:bg-[#e8850a] transition-colors ring-4 ring-white"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {TABS.slice(2).map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-1 text-xs font-medium ${
                  isActive ? "text-[#F7941D]" : "text-gray-400"
                }`
              }
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </NavLink>
          ))}

          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-1 py-1 text-xs font-medium ${
              isMoreActive ? "text-[#F7941D]" : "text-gray-400"
            }`}
          >
            <MenuIcon className="w-5 h-5" />
            More
          </button>
        </div>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent>
          <DrawerHeader className="flex items-center justify-between">
            <DrawerTitle>More</DrawerTitle>
            <DrawerClose asChild>
              <button aria-label="Close" className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </DrawerClose>
          </DrawerHeader>
          <div className="px-4 pb-6 flex flex-col gap-1">
            {MORE_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium ${
                    isActive ? "bg-[#F7941D]/10 text-[#F7941D]" : "text-gray-700 hover:bg-gray-50"
                  }`
                }
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </NavLink>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
