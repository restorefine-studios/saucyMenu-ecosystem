/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react"
import {
  Check,
  Settings,
  ArrowUpRight,
  Star,
  History,
  Bell,
  ArrowLeft,
} from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import ScreenWrapper from "../components/screenWrapper"
import { axiosInstance, cn } from "@/lib/utils"
import { MONTHLY_PLANS, getNextPlan } from "@/lib/plans"
import { useAdminStats } from "@/hooks/useFetchData"
import apiRoutes from "@/apiRoutes"
import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { AxiosError } from "axios"

function PlanGrid({
  billing,
  setBilling,
  foundSubscription,
  getBackendPlan,
  mutate,
  isPending,
}: {
  billing: "monthly" | "annual"
  setBilling: (b: "monthly" | "annual") => void
  foundSubscription: SubscriptionListData | undefined
  getBackendPlan: (name: string) => SubscriptionListData | undefined
  mutate: (product: string) => void
  isPending: boolean
}) {
  return (
    <>
      <div className="flex justify-center mb-10">
        <div className="inline-flex bg-gray-100 rounded-full p-1 gap-1">
          <button
            onClick={() => setBilling("monthly")}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-semibold transition-all",
              billing === "monthly" ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2",
              billing === "annual" ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
            )}
          >
            Yearly
            <span className="text-xs font-bold text-green-500 bg-green-50 px-1.5 py-0.5 rounded-full">
              3 months free
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {MONTHLY_PLANS.map((plan) => {
          const backendPlan = getBackendPlan(plan.name)
          const isSubscribed = backendPlan?.subscribed ?? false
          const price = billing === "monthly" ? plan.monthlyPrice : plan.annualPrice

          return (
            <div
              key={plan.id}
              className={cn(
                "rounded-3xl overflow-hidden transition-all duration-200 flex flex-col",
                plan.popular ? "shadow-2xl scale-105 ring-2 ring-[#F7941D]/30" : "shadow-sm border border-gray-200"
              )}
            >
              <div
                className={cn(
                  "p-8 relative",
                  plan.popular ? "bg-gradient-to-br from-[#F7941D] to-[#e07010]" : "bg-white"
                )}
              >
                {plan.popular && (
                  <span className="absolute top-4 right-4 text-xs font-bold bg-white text-[#F7941D] px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                {isSubscribed && (
                  <span className="absolute top-4 right-4 text-xs font-bold bg-green-500 text-white px-3 py-1 rounded-full">
                    Active
                  </span>
                )}

                <div className={cn("mb-1 text-sm font-medium", plan.popular ? "text-white/80" : "text-gray-500")}>
                  {plan.name}
                </div>
                <div className="flex items-end gap-1 mb-1">
                  <span className={cn("text-5xl font-bold", plan.popular ? "text-white" : "text-gray-900")}>
                    £{billing === "annual" ? Math.round(price / 12) : price}
                  </span>
                  <span className={cn("text-sm mb-2", plan.popular ? "text-white/70" : "text-gray-400")}>
                    /month{billing === "annual" ? " *" : ""}
                  </span>
                </div>
                {billing === "annual" && (
                  <p className={cn("text-xs mb-1", plan.popular ? "text-white/60" : "text-gray-400")}>
                    £{price}/year · Save £{plan.monthlyPrice * 12 - price}
                  </p>
                )}
                <p className={cn("text-sm", plan.popular ? "text-white/80" : "text-gray-500")}>
                  {plan.description}
                </p>
              </div>

              <div className={cn("px-8 py-6 flex flex-col flex-1", plan.popular ? "bg-[#F7941D]/5" : "bg-white")}>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className={cn("rounded-full p-0.5 shrink-0 mt-0.5", plan.popular ? "bg-[#F7941D]" : "bg-gray-900")}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {isSubscribed ? (
                  <div className="w-full bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                    <p className="text-green-700 font-semibold text-sm">Active plan</p>
                    {backendPlan?.currentPeriodEnd && (
                      <p className="text-green-600 text-xs mt-0.5">
                        {backendPlan.cancelAtPeriodEnd ? `Cancels on ${backendPlan.currentPeriodEnd}` : `Renews on ${backendPlan.currentPeriodEnd}`}
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => backendPlan?.stripeProductId && mutate(backendPlan.stripeProductId)}
                    disabled={isPending || !backendPlan?.stripeProductId}
                    className={cn(
                      "w-full py-3.5 rounded-2xl text-sm font-bold transition-all",
                      plan.popular ? "bg-white text-[#F7941D] hover:bg-gray-50 shadow-sm" : "bg-gray-900 text-white hover:bg-gray-800"
                    )}
                  >
                    {isPending ? "Loading..." : foundSubscription ? "Switch plan" : "Subscribe Now"}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function Subscription() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly")
  const [view, setView] = useState<"summary" | "plans" | "manage">(
    searchParams.get("view") === "plans" ? "plans" : "summary"
  )

  const { data, isLoading, refetch } = useQuery<SubscriptionList>({
    queryKey: ["subscriptionList"],
    queryFn: async () => {
      const response = await axiosInstance.get(apiRoutes.subscriptionList)
      return response.data
    },
    refetchOnWindowFocus: false,
  })

  const { data: statsData } = useAdminStats()
  const aiCreditsUsed = (statsData as any)?.data?.totalAiCredits ?? 0

  const { mutate, isPending } = useMutation({
    mutationFn: async (product: string) => {
      const response = await axiosInstance.post(apiRoutes.subscribe, {
        product,
        success_url: window.location.href,
      })
      return response.data
    },
    onSuccess: (data) => {
      if (data?.url) window.location.href = data.url
      else toast.error("Something went wrong")
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err?.response?.data?.message ?? "Something went wrong")
    },
  })

  const { mutate: mutateCancel, isPending: cancelPend } = useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.post(apiRoutes.cancelSubscription)
      return response.data
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success("Subscription cancelled successfully")
        refetch()
      } else {
        toast.error(data?.message)
      }
    },
  })

  const foundSubscription = data?.data?.find((item) => item.subscribed === true)

  const getBackendPlan = (localName: string) => {
    const suffix = billing === "annual" ? " Annual" : ""
    return data?.data?.find((p) => p.name.toLowerCase() === `${localName.toLowerCase()}${suffix.toLowerCase()}`)
  }

  const baseName = foundSubscription?.name?.replace(/\s+Annual$/i, "")
  const currentPlan = MONTHLY_PLANS.find((p) => p.name.toLowerCase() === baseName?.toLowerCase())
  const nextPlan = getNextPlan(currentPlan?.id)

  if (isLoading) {
    return <ScreenWrapper title="Subscription" loading children={null} />
  }

  // No active subscription — go straight to plan picker
  if (!foundSubscription || !currentPlan) {
    return (
      <ScreenWrapper title="Subscription">
        <PlanGrid
          billing={billing}
          setBilling={setBilling}
          foundSubscription={foundSubscription}
          getBackendPlan={getBackendPlan}
          mutate={mutate}
          isPending={isPending}
        />
      </ScreenWrapper>
    )
  }

  if (view === "plans") {
    return (
      <ScreenWrapper>
        <button
          onClick={() => setView("summary")}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to plan
        </button>
        <PlanGrid
          billing={billing}
          setBilling={setBilling}
          foundSubscription={foundSubscription}
          getBackendPlan={getBackendPlan}
          mutate={mutate}
          isPending={isPending}
        />
      </ScreenWrapper>
    )
  }

  const usageLimit = currentPlan.aiQueryLimit
  const usagePercent = usageLimit ? Math.min((aiCreditsUsed / usageLimit) * 100, 100) : 100

  return (
    <div className="md:px-16 lg:px-24 pt-0 md:pt-10 pb-8 max-w-2xl mx-auto">
      <div className="rounded-none md:rounded-3xl overflow-hidden shadow-sm border-0 md:border border-gray-100 mb-8 bg-white">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#F7941D] to-[#e07010] px-6 pt-5 pb-14 relative">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="text-black/70 hover:text-black transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-black/60 text-sm">Welcome to</p>
              <h2 className="text-black text-2xl font-bold">Saucy {currentPlan.name}</h2>
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
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 px-5 py-4 flex items-center justify-between -mt-10 mb-4 relative">
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
              onClick={() => setView("manage")}
              className="bg-gray-50 hover:bg-gray-100 transition-colors rounded-2xl p-4 text-left"
            >
              <Settings className="w-5 h-5 text-gray-700 mb-2" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">Manage</span>
                <ArrowUpRight className="w-4 h-4 text-gray-400" />
              </div>
            </button>
            <button
              onClick={() => setView("plans")}
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

          {view === "manage" ? (
            <div className="border border-gray-100 rounded-2xl p-4">
              <p className="text-sm font-semibold text-gray-900 mb-3">Manage subscription</p>
              <button
                onClick={() => mutateCancel()}
                disabled={cancelPend}
                className="w-full py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors mb-2"
              >
                {cancelPend ? "Cancelling..." : "Cancel plan"}
              </button>
              <button
                onClick={() => setView("summary")}
                className="w-full py-3 rounded-2xl text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
          ) : (
            nextPlan && (
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
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default Subscription
