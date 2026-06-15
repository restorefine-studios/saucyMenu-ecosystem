import { Check } from "lucide-react"
import ScreenWrapper from "../components/screenWrapper"
import { axiosInstance, cn } from "@/lib/utils"
import apiRoutes from "@/apiRoutes"
import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { useState } from "react"
import { AxiosError } from "axios"

// ─── Plan config ──────────────────────────────────────────────────────────────

const MONTHLY_PLANS = [
  {
    id: "standard",
    name: "Standard",
    monthlyPrice: 29,
    annualPrice: 249,
    description: "Perfect for small restaurants going digital",
    features: [
      "QR digital menu — unlimited scans",
      "Multi-language support (12 languages)",
      "Allergen & diet filtering for diners",
      "100 AI menu chat queries per month",
    ],
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 59,
    annualPrice: 499,
    description: "For growing restaurants that want more",
    features: [
      "Everything in Standard",
      "Unlimited menus & sections",
      "500 AI menu chat queries per month",
      "Analytics — sessions, popular dishes & trends",
      "Bulk menu upload via CSV",
    ],
    popular: true,
  },
  {
    id: "premium",
    name: "Premium",
    monthlyPrice: 99,
    annualPrice: 849,
    description: "For busy restaurants that want it all",
    features: [
      "Everything in Pro",
      "Unlimited AI menu chat queries",
      "Full audit logs & activity history",
      "Priority support",
      "Early access to new features",
    ],
    popular: false,
  },
]

// ─── Subscription page ────────────────────────────────────────────────────────

function Subscription() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly")

  const getSubscriptionList = async () => {
    const response = await axiosInstance.get(apiRoutes.subscriptionList)
    return response.data
  }

  const { data, isLoading, refetch } = useQuery<SubscriptionList>({
    queryKey: ["subscriptionList"],
    queryFn: getSubscriptionList,
    refetchOnWindowFocus: false,
  })

  const subscribe = async (product: string) => {
    const response = await axiosInstance.post(apiRoutes.subscribe, {
      product,
      success_url: window.location.href,
    })
    return response.data
  }

  const { mutate, isPending } = useMutation({
    mutationFn: subscribe,
    onSuccess: (data) => {
      if (data?.url) window.location.href = data.url
      else toast.error("Something went wrong")
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err?.response?.data?.message ?? "Something went wrong")
    },
  })

  const cancelSubscription = async () => {
    const response = await axiosInstance.post(apiRoutes.cancelSubscription)
    return response.data
  }

  const { mutate: mutateCancel, isPending: cancelPend } = useMutation({
    mutationFn: cancelSubscription,
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

  // Match backend plan name to local config
  const getBackendPlan = (localName: string) => {
    const suffix = billing === "annual" ? " Annual" : ""
    return data?.data?.find(
      (p) => p.name.toLowerCase() === `${localName.toLowerCase()}${suffix.toLowerCase()}`
    )
  }

  return (
    <ScreenWrapper title="Subscriptions" loading={isLoading}>

      {/* Monthly / Annual toggle */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex bg-gray-100 rounded-full p-1 gap-1">
          <button
            onClick={() => setBilling("monthly")}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-semibold transition-all",
              billing === "monthly"
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2",
              billing === "annual"
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            )}
          >
            Yearly
            <span className="text-xs font-bold text-green-500 bg-green-50 px-1.5 py-0.5 rounded-full">
              3 months free
            </span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
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
                plan.popular
                  ? "shadow-2xl scale-105 ring-2 ring-[#F7941D]/30"
                  : "shadow-sm border border-gray-200"
              )}
            >
              {/* Card header */}
              <div
                className={cn(
                  "p-8 relative",
                  plan.popular
                    ? "bg-gradient-to-br from-[#F7941D] to-[#e07010]"
                    : "bg-white"
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

              {/* Features */}
              <div className={cn("px-8 py-6 flex flex-col flex-1", plan.popular ? "bg-[#F7941D]/5" : "bg-white")}>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className={cn(
                        "rounded-full p-0.5 shrink-0 mt-0.5",
                        plan.popular ? "bg-[#F7941D]" : "bg-gray-900"
                      )}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isSubscribed ? (
                  <div>
                    <div className="w-full bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-3">
                      <p className="text-green-700 font-semibold text-sm">Active plan</p>
                      {backendPlan?.currentPeriodEnd && (
                        <p className="text-green-600 text-xs mt-0.5">
                          {backendPlan.cancelAtPeriodEnd ? `Cancels on ${backendPlan.currentPeriodEnd}` : `Renews on ${backendPlan.currentPeriodEnd}`}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => mutateCancel()}
                      disabled={cancelPend}
                      className="w-full py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      {cancelPend ? "Cancelling..." : "Cancel plan"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => backendPlan?.stripeProductId && mutate(backendPlan.stripeProductId)}
                    disabled={isPending || !backendPlan?.stripeProductId}
                    className={cn(
                      "w-full py-3.5 rounded-2xl text-sm font-bold transition-all",
                      plan.popular
                        ? "bg-white text-[#F7941D] hover:bg-gray-50 shadow-sm"
                        : "bg-gray-900 text-white hover:bg-gray-800"
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
    </ScreenWrapper>
  )
}

export default Subscription
