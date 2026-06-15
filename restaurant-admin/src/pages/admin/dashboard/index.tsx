/* eslint-disable @typescript-eslint/no-explicit-any */
import { Users, UtensilsCrossed, Bot, Star, Plus, Upload, Eye, CreditCard } from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { useAdminStats, useFetchAdminLineChart, useAdminProfile } from '@/hooks/useFetchData'
import { useNavigate } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import moment from 'moment'
import Spinner from '@/components/Spinner'

const QUICK_ACTIONS = [
  { label: 'Add Menu Item', icon: Plus,        to: '/admin/menus' },
  { label: 'Bulk Upload',   icon: Upload,      to: '/admin/menus' },
  { label: 'Subscription',  icon: CreditCard,  to: '/admin/subscription' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const startDate = moment('2026-01-01').format('YYYY-MM-DD HH:mm:ss')
  const endDate   = moment('2026-12-31').format('YYYY-MM-DD HH:mm:ss')

  const { data: statsData,   isLoading: statsLoading  } = useAdminStats()
  const { data: chartData,   isLoading: chartLoading  } = useFetchAdminLineChart(startDate, endDate)
  const { data: profileData }                            = useAdminProfile()

  const stats        = (statsData as any)?.data
  const restaurantId = (profileData as any)?.data?.restaurant?.id

  if (statsLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner />
      </div>
    )
  }

  const chartRows = ((chartData as any)?.data ?? []).map((row: any) => ({
    month:    moment(row.month).format('MMM'),
    sessions: row.count,
  }))

  return (
    <div className="px-10 md:px-16 lg:px-24 pt-10 pb-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="Diner Sessions"
          value={stats?.totalUsers ?? 0}
          sub="total scans"
        />
        <StatCard
          icon={UtensilsCrossed}
          label="Menu Items"
          value={stats?.totalDishes ?? 0}
          sub="on your menu"
        />
        <StatCard
          icon={Bot}
          label="AI Credits Used"
          value={stats?.totalAiCredits ?? 0}
          sub="this period"
        />
        <StatCard
          icon={Star}
          label="Reviews"
          value="—"
          sub="coming soon"
          iconColor="text-amber-500"
          iconBg="bg-amber-50"
        />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        {QUICK_ACTIONS.map(action => (
          <button
            key={action.label}
            onClick={() => navigate(action.to)}
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
            <Eye className="w-4 h-4" /> View Live Menu

          </a>
        )}
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Sessions chart */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Customer Sessions</h2>
          {chartLoading ? (
            <div className="flex justify-center items-center h-48">
              <Spinner />
            </div>
          ) : chartRows.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No session data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="sessions"
                  stroke="#F7941D"
                  strokeWidth={2}
                  dot={{ fill: '#F7941D', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Activity feed */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[
              { Icon: Users,           text: 'New diner sessions this week',                    time: 'Just now'   },
              { Icon: Star,            text: 'Check your latest reviews',                       time: 'Today'      },
              { Icon: CreditCard,      text: 'Subscription active',                             time: 'This month' },
              { Icon: UtensilsCrossed, text: `${stats?.totalDishes ?? 0} items on your menu`,   time: 'Always'     },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="bg-orange-50 rounded-lg p-1.5 shrink-0 mt-0.5">
                  <item.Icon className="w-4 h-4 text-[#F7941D]" />
                </div>
                <div>
                  <p className="text-sm text-gray-700">{item.text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
