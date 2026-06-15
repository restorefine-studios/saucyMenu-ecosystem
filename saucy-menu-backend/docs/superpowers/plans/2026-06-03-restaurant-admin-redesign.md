# Restaurant Admin UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sidebar layout with an orange top navbar and redesign all 6 admin pages to a modern, clean white + orange design system.

**Architecture:** Replace `SidebarProvider` + `AppSidebar` in `pages/admin/index.tsx` with a new `AdminNavbar` component. Replace `ScreenWrapper` usage in each page with direct layout using the new design system. Build shared components (`StatCard`, `PageTabs`, `DataTable`) reused across pages.

**Tech Stack:** React, TanStack Query, React Router, Tailwind CSS, Lucide icons, Recharts (already installed), Jotai

---

## File Map

**Create:**
- `restaurant-admin/src/components/AdminNavbar.tsx` — top orange navbar with logo, restaurant name, nav links, avatar
- `restaurant-admin/src/components/StatCard.tsx` — reusable stat number card
- `restaurant-admin/src/components/PageTabs.tsx` — reusable tab bar component

**Modify:**
- `restaurant-admin/src/pages/admin/index.tsx` — replace SidebarProvider + AppSidebar with AdminNavbar
- `restaurant-admin/src/pages/admin/dashboard/index.tsx` — full rewrite
- `restaurant-admin/src/pages/admin/review/index.tsx` — full rewrite
- `restaurant-admin/src/pages/admin/audit/index.tsx` — full rewrite
- `restaurant-admin/src/pages/admin/settings/index.tsx` — full rewrite
- `restaurant-admin/src/pages/admin/menus/index.tsx` — add tab bar, restyle
- `restaurant-admin/src/pages/admin/subscriptions/index.tsx` — restyle cards only

---

## Task 1: AdminNavbar component

**Files:**
- Create: `restaurant-admin/src/components/AdminNavbar.tsx`

- [ ] **Step 1: Create AdminNavbar**

```tsx
// restaurant-admin/src/components/AdminNavbar.tsx
import { useAtom } from 'jotai'
import { userAtom } from '@/atoms/user'
import { NavLink, useNavigate } from 'react-router-dom'
import { axiosInstance } from '@/lib/utils'
import apiRoutes from '@/apiRoutes'
import { useQuery } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { Search, Bell, LogOut, Settings, User } from 'lucide-react'
import { useState } from 'react'
import logo from '@/assets/4f02a2e6c6acd8a847d3ddaba33f3830.png'

const NAV_LINKS = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/menus',     label: 'Menus' },
  { to: '/admin/review',    label: 'Reviews' },
  { to: '/admin/subscription', label: 'Subscription' },
  { to: '/admin/audit',     label: 'Audit' },
  { to: '/admin/settings',  label: 'Settings' },
]

export function AdminNavbar() {
  const [user] = useAtom(userAtom)
  const navigate = useNavigate()
  const [avatarOpen, setAvatarOpen] = useState(false)

  const { data: profileData } = useQuery({
    queryKey: ['adminProfile'],
    queryFn: () => axiosInstance.get(apiRoutes.getAdminProfile).then(r => r.data),
  })

  const restaurantName = profileData?.data?.restaurant?.name ?? ''
  const initials = (user?.name ?? 'U').slice(0, 2).toUpperCase()

  const handleLogout = async () => {
    await authClient.signOut()
    localStorage.removeItem('user')
    navigate('/')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#F7941D] h-16 flex items-center px-6">
      {/* Left: Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <img src={logo} alt="SaucyMenu" className="h-8 w-8 object-contain" />
        <span className="text-white font-bold text-lg hidden sm:block">Saucy Menu</span>
      </div>

      {/* Center: nav links + restaurant name */}
      <div className="flex-1 flex flex-col items-center">
        <span className="text-white font-bold text-sm tracking-wide">{restaurantName}</span>
        <div className="flex items-center gap-1 mt-0.5">
          {NAV_LINKS.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `px-3 py-1 text-xs font-medium rounded transition-colors ${
                  isActive
                    ? 'text-white underline underline-offset-4 font-bold'
                    : 'text-white/80 hover:text-white'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-3 shrink-0">
        <button className="text-white/80 hover:text-white">
          <Search className="w-5 h-5" />
        </button>
        <button className="text-white/80 hover:text-white">
          <Bell className="w-5 h-5" />
        </button>
        <div className="relative">
          <button
            onClick={() => setAvatarOpen(o => !o)}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold hover:bg-white/30"
          >
            {initials}
          </button>
          {avatarOpen && (
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
          )}
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Verify it renders without errors**

```bash
cd "/Users/prabishdangi/Desktop/Personal/RestoRefine - UK/saucy-menu/restaurant-admin"
npx tsc --noEmit 2>&1 | grep "AdminNavbar" | head -5
```
Expected: no errors for this file.

---

## Task 2: Replace sidebar with AdminNavbar in Admin layout

**Files:**
- Modify: `restaurant-admin/src/pages/admin/index.tsx`

- [ ] **Step 1: Replace the file**

```tsx
// restaurant-admin/src/pages/admin/index.tsx
import { Outlet, useNavigate } from 'react-router-dom'
import { AdminNavbar } from '@/components/AdminNavbar'
import { axiosInstance } from '@/lib/utils'
import apiRoutes from '@/apiRoutes'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAtom } from 'jotai'
import { userAtom } from '@/atoms/user'
import { authClient } from '@/lib/auth-client'

const Admin = () => {
  const [, setUser] = useAtom(userAtom)
  const navigate = useNavigate()

  const { data } = useQuery({
    queryKey: ['status'],
    queryFn: () => axiosInstance.get(apiRoutes.status).then(r => r.data),
  })

  useEffect(() => {
    authClient.getSession({
      fetchOptions: {
        onSuccess: (data) => setUser(data?.data?.user),
      },
    })
  }, [])

  useEffect(() => {
    if (data?.data?.suspended) {
      navigate('/')
      localStorage.removeItem('user')
    }
  }, [data])

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  )
}

export default Admin
```

- [ ] **Step 2: Open browser at `localhost:5174/admin/dashboard`**

Expected: orange top navbar visible, all nav links present, no sidebar, restaurant name centered, content shifted down by `pt-16`.

---

## Task 3: StatCard shared component

**Files:**
- Create: `restaurant-admin/src/components/StatCard.tsx`

- [ ] **Step 1: Create StatCard**

```tsx
// restaurant-admin/src/components/StatCard.tsx
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  sub?: string
  iconColor?: string
  iconBg?: string
}

export function StatCard({ icon: Icon, label, value, sub, iconColor = 'text-[#F7941D]', iconBg = 'bg-orange-50' }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-start gap-4">
      <div className={`${iconBg} rounded-xl p-3 shrink-0`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}
```

---

## Task 4: PageTabs shared component

**Files:**
- Create: `restaurant-admin/src/components/PageTabs.tsx`

- [ ] **Step 1: Create PageTabs**

```tsx
// restaurant-admin/src/components/PageTabs.tsx
interface Tab {
  key: string
  label: string
}

interface PageTabsProps {
  tabs: Tab[]
  active: string
  onChange: (key: string) => void
}

export function PageTabs({ tabs, active, onChange }: PageTabsProps) {
  return (
    <div className="flex gap-1 border-b border-gray-200 mb-6">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            active === tab.key
              ? 'border-[#F7941D] text-[#F7941D] font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
```

---

## Task 5: Dashboard rewrite

**Files:**
- Modify: `restaurant-admin/src/pages/admin/dashboard/index.tsx`

- [ ] **Step 1: Rewrite the dashboard**

```tsx
// restaurant-admin/src/pages/admin/dashboard/index.tsx
import { Users, UtensilsCrossed, Bot, Star, Plus, Upload, Eye, CreditCard } from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { useAdminStats, useFetchAdminLineChart, useAdminProfile } from '@/hooks/useFetchData'
import { useNavigate } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import moment from 'moment'
import Spinner from '@/components/Spinner'

const QUICK_ACTIONS = [
  { label: '+ Add Menu Item', icon: Plus,         to: '/admin/menus' },
  { label: '📤 Bulk Upload',  icon: Upload,       to: '/admin/menus' },
  { label: '👁 View Menu',    icon: Eye,          to: null, external: true },
  { label: '💳 Subscription', icon: CreditCard,  to: '/admin/subscription' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const startDate = moment('2026-01-01').format('YYYY-MM-DD HH:mm:ss')
  const endDate   = moment('2026-12-31').format('YYYY-MM-DD HH:mm:ss')

  const { data: statsData,  isLoading: statsLoading  } = useAdminStats()
  const { data: chartData,  isLoading: chartLoading  } = useFetchAdminLineChart(startDate, endDate)
  const { data: profileData } = useAdminProfile()

  const stats = statsData?.data
  const restaurantId = profileData?.data?.restaurant?.id

  if (statsLoading) return <div className="flex justify-center items-center h-96"><Spinner /></div>

  const chartRows = (chartData?.data ?? []).map((row: any) => ({
    month: moment(row.month).format('MMM'),
    sessions: row.count,
  }))

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users}           label="Diner Sessions"  value={stats?.totalUsers ?? 0}     sub="total scans" />
        <StatCard icon={UtensilsCrossed} label="Menu Items"      value={stats?.totalDishes ?? 0}    sub="on your menu" />
        <StatCard icon={Bot}             label="AI Credits Used" value={stats?.totalAiCredits ?? 0} sub="this period" />
        <StatCard icon={Star}            label="Reviews"         value="—"                          sub="coming soon" iconColor="text-amber-500" iconBg="bg-amber-50" />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        {QUICK_ACTIONS.map(action => (
          <button
            key={action.label}
            onClick={() => action.to && navigate(action.to)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-[#F7941D] hover:text-[#F7941D] transition-colors shadow-sm"
          >
            {action.label}
          </button>
        ))}
        {restaurantId && (
          <a
            href={`http://localhost:3000/r/${restaurantId}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-[#F7941D] hover:text-[#F7941D] transition-colors shadow-sm"
          >
            👁 View Live Menu
          </a>
        )}
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Chart */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Customer Sessions</h2>
          {chartLoading ? (
            <div className="flex justify-center items-center h-48"><Spinner /></div>
          ) : chartRows.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No session data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="sessions" stroke="#F7941D" strokeWidth={2} dot={{ fill: '#F7941D', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Activity feed */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[
              { icon: '👥', text: 'New diner sessions this week', time: 'Just now' },
              { icon: '⭐', text: 'Check your latest reviews', time: 'Today' },
              { icon: '💳', text: 'Subscription active — Premium', time: 'This month' },
              { icon: '🍽', text: `${stats?.totalDishes ?? 0} items on your menu`, time: 'Always' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xl">{item.icon}</span>
                <div>
                  <p className="text-sm text-gray-700">{item.text}</p>
                  <p className="text-xs text-gray-400">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Check it loads**

Open `http://localhost:5174/admin/dashboard`  
Expected: 4 stat cards, quick action buttons, line chart, activity feed. No sidebar.

---

## Task 6: Reviews rewrite

**Files:**
- Modify: `restaurant-admin/src/pages/admin/review/index.tsx`

- [ ] **Step 1: Rewrite reviews page**

```tsx
// restaurant-admin/src/pages/admin/review/index.tsx
import { Star } from 'lucide-react'
import { useState } from 'react'
import { useReviews } from '@/hooks/useFetchData'
import Spinner from '@/components/Spinner'
import { renderMediaUrl } from '@/lib/utils'
import emptyDish from '@/assets/emptydish.jpg'

const RATING_FILTERS = [
  { key: null, label: 'All' },
  { key: 5,    label: '★★★★★' },
  { key: 4,    label: '★★★★' },
  { key: 3,    label: '★★★' },
  { key: 2,    label: '★★' },
  { key: 1,    label: '★' },
]

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
      ))}
    </div>
  )
}

export default function ReviewPage() {
  const [activeRating, setActiveRating] = useState<number | null>(null)
  const { data: reviewsData, isLoading } = useReviews()

  const reviews = reviewsData?.data ?? []
  const filtered = activeRating != null ? reviews.filter(r => r.review.rating === activeRating) : reviews
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.review.rating, 0) / reviews.length).toFixed(1)
    : '—'

  if (isLoading) return <div className="flex justify-center items-center h-96"><Spinner /></div>

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-sm text-gray-500">{reviews.length} total reviews</p>
        </div>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 rounded-2xl px-5 py-3">
            <span className="text-3xl font-bold text-amber-500">{avgRating}</span>
            <div>
              <StarRow rating={Math.round(Number(avgRating))} />
              <p className="text-xs text-gray-400 mt-0.5">Average rating</p>
            </div>
          </div>
        )}
      </div>

      {/* Rating filter pills */}
      <div className="flex gap-2 mb-6">
        {RATING_FILTERS.map(f => (
          <button
            key={String(f.key)}
            onClick={() => setActiveRating(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              activeRating === f.key
                ? 'bg-[#F7941D] text-white border-[#F7941D]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#F7941D]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Reviews table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">⭐</p>
          <p className="font-medium">No reviews yet</p>
          <p className="text-sm mt-1">Share your QR code to get your first review</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rating</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Comment</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((rev: any) => (
                <tr key={rev.review.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={rev.menuItem?.images?.[0] ? renderMediaUrl(rev.menuItem.images[0]) : emptyDish}
                        alt={rev.menuItem?.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <span className="text-sm font-medium text-gray-900 capitalize">{rev.menuItem?.name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4"><StarRow rating={rev.review.rating} /></td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{rev.review.comment || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{new Date(rev.review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

---

## Task 7: Audit rewrite

**Files:**
- Modify: `restaurant-admin/src/pages/admin/audit/index.tsx`

- [ ] **Step 1: Rewrite audit page**

```tsx
// restaurant-admin/src/pages/admin/audit/index.tsx
import { axiosInstance } from '@/lib/utils'
import apiRoutes from '@/apiRoutes'
import { useQuery } from '@tanstack/react-query'
import Spinner from '@/components/Spinner'
import { useQueryState } from 'nuqs'
import Paginator from '@/components/paginator'
import { useState } from 'react'

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
}

const ACTION_FILTERS = ['All', 'CREATE', 'UPDATE', 'DELETE']

export default function AuditPage() {
  const [action, setAction] = useState('All')
  const [offset, setOffset] = useQueryState('offset', { defaultValue: 0, parse: Number })

  const { data, isLoading } = useQuery({
    queryKey: ['audit', action, offset],
    queryFn: () =>
      axiosInstance.get(apiRoutes.audit, {
        params: { action: action === 'All' ? undefined : action, offset, limit: 15 },
      }).then(r => r.data),
  })

  const logs = data?.data ?? []
  const total = data?.meta?.total ?? 0

  if (isLoading) return <div className="flex justify-center items-center h-96"><Spinner /></div>

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <div className="flex gap-2">
          {ACTION_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => { setAction(f); setOffset(0) }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                action === f
                  ? 'bg-[#F7941D] text-white border-[#F7941D]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#F7941D]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">No audit logs yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Entity</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">By</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 capitalize">{log.entity}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{log.user?.name ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(log.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-6 py-4 border-t border-gray-100">
            <Paginator totalItems={total} limit={15} offset={offset} hasNextPage={offset + 15 < total} hasPreviousPage={offset > 0} />
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## Task 8: Settings rewrite

**Files:**
- Modify: `restaurant-admin/src/pages/admin/settings/index.tsx`

- [ ] **Step 1: Rewrite settings page**

```tsx
// restaurant-admin/src/pages/admin/settings/index.tsx
import { useState } from 'react'
import { PageTabs } from '@/components/PageTabs'
import { useAdminProfile } from '@/hooks/useFetchData'
import Spinner from '@/components/Spinner'
import Brand from './components/brand'
import Email from './components/email'
import Password from './components/password'

const TABS = [
  { key: 'brand',    label: 'Brand' },
  { key: 'password', label: 'Password' },
  { key: 'email',    label: 'Email' },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState('brand')
  const { data, isLoading } = useAdminProfile()

  if (isLoading) return <div className="flex justify-center items-center h-96"><Spinner /></div>

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <PageTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
        {activeTab === 'brand'    && <Brand data={data} />}
        {activeTab === 'password' && <Password />}
        {activeTab === 'email'    && <Email data={data} />}
      </div>
    </div>
  )
}
```

---

## Task 9: Menus page — add tab bar header

**Files:**
- Modify: `restaurant-admin/src/pages/admin/menus/index.tsx`

- [ ] **Step 1: Read current menus/index.tsx**

```bash
head -30 "/Users/prabishdangi/Desktop/Personal/RestoRefine - UK/saucy-menu/restaurant-admin/src/pages/admin/menus/index.tsx"
```

- [ ] **Step 2: Add page header with title**

Find the outermost return div and wrap contents with:
```tsx
<div className="px-8 py-8 max-w-7xl mx-auto">
  <h1 className="text-2xl font-bold text-gray-900 mb-6">Menus</h1>
  {/* existing content */}
</div>
```

Remove any `<ScreenWrapper>` wrapper — replace with the plain div above.

- [ ] **Step 3: Verify in browser**

Open `http://localhost:5174/admin/menus`  
Expected: "Menus" heading, existing tabs still work, no sidebar.

---

## Task 10: Final verification

- [ ] **Step 1: Check all pages load without errors**

Visit each page in the browser:
- `localhost:5174/admin/dashboard` — 4 stats, chart, activity feed
- `localhost:5174/admin/menus` — menus with tabs
- `localhost:5174/admin/review` — table with star filter
- `localhost:5174/admin/audit` — table with action filters
- `localhost:5174/admin/settings` — 3-tab settings
- `localhost:5174/admin/subscription` — plan cards

- [ ] **Step 2: Check navbar on all pages**

Orange navbar should be visible and fixed on every page. Restaurant name appears centered. Active nav link is bold + underlined.

- [ ] **Step 3: Check TypeScript**

```bash
cd "/Users/prabishdangi/Desktop/Personal/RestoRefine - UK/saucy-menu/restaurant-admin"
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "node_modules" | head -20
```

Expected: zero new errors.
