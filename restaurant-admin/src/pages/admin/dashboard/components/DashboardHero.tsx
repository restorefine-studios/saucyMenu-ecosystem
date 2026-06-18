/* eslint-disable @typescript-eslint/no-explicit-any */
import { Settings, ArrowUpRight, Check, Star, History, Bell } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { axiosInstance } from "@/lib/utils"
import apiRoutes from "@/apiRoutes"
import { MONTHLY_PLANS, getNextPlan } from "@/lib/plans"
import { useAdminStats, useAdminProfile } from "@/hooks/useFetchData"

export default function DashboardHero() {
  const navigate = useNavigate()

  const { data: profileData } = useAdminProfile()
  const restaurantName = (profileData as any)?.data?.restaurant?.name

  const { data: subscriptionData } = useQuery<SubscriptionList>({
    queryKey: ["subscriptionList"],
    queryFn: async () => {
      const res = await axiosInstance.get(apiRoutes.subscriptionList)
      return res.data
    },
    refetchOnWindowFocus: false,
  })

  const { data: statsData } = useAdminStats()
  const aiCreditsUsed = (statsData as any)?.data?.totalAiCredits ?? 0

  const foundSubscription = subscriptionData?.data?.find((item) => item.subscribed)
  const baseName = foundSubscription?.name?.replace(/\s+Annual$/i, "")
  const currentPlan = MONTHLY_PLANS.find((p) => p.name.toLowerCase() === baseName?.toLowerCase())
  const nextPlan = getNextPlan(currentPlan?.id)

  if (!foundSubscription || !currentPlan) {
    return null
  }

  const usageLimit = currentPlan.aiQueryLimit
  const usagePercent = usageLimit ? Math.min((aiCreditsUsed / usageLimit) * 100, 100) : 100

  return (
    <div className="rounded-none md:rounded-3xl -mx-10 md:mx-0 overflow-hidden shadow-sm border-0 md:border border-gray-100 mb-8 bg-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#F7941D] to-[#e07010] px-6 pt-8 pb-20 relative">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-black/60 text-sm">Welcome to</p>
            <h2 className="text-black text-2xl font-bold">{restaurantName ?? `Saucy ${currentPlan.name}`}</h2>
          </div>
          <div className="flex items-center gap-3 text-black/70">
            <button onClick={() => navigate("/admin/audit")} aria-label="Activity history">
              <History className="w-5 h-5" />
            </button>
            <button aria-label="Notifications">
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white px-6 pb-6">
        {/* Floating stat card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 px-5 py-4 flex items-center justify-between -mt-14 mb-4 relative">
          <div className="flex items-center gap-3">
            <Star className="w-6 h-6 text-gray-700" strokeWidth={1.5} />
            <span className="text-gray-700 font-medium">Plan price</span>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">£{currentPlan.monthlyPrice}</p>
            <p className="text-xs text-gray-400">per month</p>
          </div>
        </div>

        {foundSubscription.currentPeriodEnd && (
          <p className="text-xs text-gray-400 text-center mb-4">
            {foundSubscription.cancelAtPeriodEnd ? "Cancels on " : "Renews on "}
            <span className="text-gray-600 font-medium">{foundSubscription.currentPeriodEnd}</span>
          </p>
        )}

        {/* Action tiles */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => navigate("/admin/subscription")}
            className="bg-gray-50 hover:bg-gray-100 transition-colors rounded-2xl p-4 text-left"
          >
            <Settings className="w-5 h-5 text-gray-700 mb-2" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">Manage</span>
              <ArrowUpRight className="w-4 h-4 text-gray-400" />
            </div>
          </button>
          <button
            onClick={() => navigate("/admin/subscription?view=plans")}
            className="bg-[#F7941D]/10 hover:bg-[#F7941D]/20 transition-colors rounded-2xl p-4 text-left"
          >
            <ArrowUpRight className="w-5 h-5 text-[#F7941D] mb-2" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">{nextPlan ? "Upgrade" : "Plans"}</span>
              <ArrowUpRight className="w-4 h-4 text-[#F7941D]" />
            </div>
          </button>
        </div>

        {/* Usage progress */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-900">AI queries used</span>
            <span className="text-xs text-gray-500">
              {aiCreditsUsed} / {usageLimit ?? "Unlimited"}
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#F7941D] rounded-full transition-all" style={{ width: `${usagePercent}%` }} />
          </div>
        </div>

        {/* Upgrade benefits */}
        {nextPlan && (
          <div className="border border-gray-100 rounded-2xl p-4">
            <p className="text-sm font-semibold text-gray-900 mb-2">Unlock with {nextPlan.name}</p>
            <ul className="space-y-1.5">
              {nextPlan.features.slice(0, 3).map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-xs text-gray-600">
                  <Check className="w-3.5 h-3.5 text-[#F7941D] shrink-0 mt-0.5" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
