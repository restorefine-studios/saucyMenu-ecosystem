import { useAtom } from 'jotai'
import { userAtom } from '@/atoms/user'
import { NavLink, useNavigate } from 'react-router-dom'
import { axiosInstance } from '@/lib/utils'
import apiRoutes from '@/apiRoutes'
import { useQuery } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { Search, Bell, LogOut, Settings } from 'lucide-react'
import { useState } from 'react'
import logo from '@/assets/4f02a2e6c6acd8a847d3ddaba33f3830.png'

const NAV_LINKS = [
  { to: '/admin/dashboard',    label: 'Dashboard' },
  { to: '/admin/menus',        label: 'Menus' },
  { to: '/admin/review',       label: 'Reviews' },
  { to: '/admin/subscription', label: 'Subscription' },
  { to: '/admin/audit',        label: 'Audit' },
  { to: '/admin/settings',     label: 'Settings' },
]

export function AdminNavbar() {
  const [user] = useAtom(userAtom)
  const navigate = useNavigate()
  const [avatarOpen, setAvatarOpen] = useState(false)

  const { data: profileData } = useQuery({
    queryKey: ['adminProfile'],
    queryFn: () => axiosInstance.get(apiRoutes.getAdminProfile).then(r => r.data),
  })

  const restaurantName = (profileData as any)?.data?.restaurant?.name ?? ''
  const initials = ((user as any)?.name ?? 'U').slice(0, 2).toUpperCase()

  const handleLogout = async () => {
    await authClient.signOut()
    localStorage.removeItem('user')
    navigate('/')
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 shadow-sm">
      {/* Top bar — white */}
      <div className="bg-white h-14 flex items-center px-8 border-b border-gray-100">
        {/* Left: Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <img src={logo} alt="SaucyMenu" className="h-8 w-8 object-contain rounded" />
          <span className="text-gray-900 font-bold text-lg hidden sm:block">Saucy Menu</span>
        </div>

        {/* Center: restaurant name */}
        <div className="flex-1 flex justify-center">
          {restaurantName && (
            <span className="text-gray-800 font-bold text-sm tracking-wide">{restaurantName}</span>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button className="text-gray-500 hover:text-gray-800 transition-colors">
            <Search className="w-5 h-5" />
          </button>
          <button className="text-gray-500 hover:text-gray-800 transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <div className="relative">
            <button
              onClick={() => setAvatarOpen(o => !o)}
              className="w-8 h-8 rounded-full bg-[#F7941D] flex items-center justify-center text-white text-xs font-bold hover:bg-[#e8850a] transition-colors"
            >
              {initials}
            </button>
            {avatarOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAvatarOpen(false)} />
                <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-44 z-50">
                  <NavLink
                    to="/admin/settings"
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Settings className="w-4 h-4" /> Settings
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Nav strip — orange background with pill links */}
      <div className="bg-[#F7941D] px-8 py-2 flex items-center justify-center gap-2">
        {NAV_LINKS.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white text-[#F7941D] font-bold shadow-sm'
                  : 'text-white hover:bg-white/20'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
