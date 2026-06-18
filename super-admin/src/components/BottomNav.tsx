import { NavLink } from "react-router-dom"
import { Home, Salad, Wallet } from "lucide-react"

const TABS = [
  { to: "/admin/dashboard", label: "Home", icon: Home },
  { to: "/admin/restaurants/all-restaurants", label: "Restaurants", icon: Salad },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: Wallet },
]

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-3 items-center px-2 pt-2 pb-2">
        {TABS.map((tab) => (
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
      </div>
    </nav>
  )
}
