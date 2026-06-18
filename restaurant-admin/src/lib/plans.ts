export interface PlanConfig {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
  popular: boolean;
  aiQueryLimit: number | null; // null = unlimited
}

export const MONTHLY_PLANS: PlanConfig[] = [
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
    aiQueryLimit: 100,
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
    aiQueryLimit: 500,
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
    aiQueryLimit: null,
  },
];

export const getNextPlan = (currentPlanId?: string) => {
  const index = MONTHLY_PLANS.findIndex((p) => p.id === currentPlanId);
  if (index === -1) return MONTHLY_PLANS[0];
  return MONTHLY_PLANS[index + 1];
};
