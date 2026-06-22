/* eslint-disable @typescript-eslint/no-explicit-any */
import ScreenWrapper from "../components/screenWrapper";
import { StatCard } from "@/components/StatCard";

import { CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import { useRestaurant } from "@/hooks/useFetchData";
import { axiosInstance } from "@/lib/utils";
import apiRoutes from "@/apiRoutes";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Building2, Users, Bot, Eye } from "lucide-react";

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "#F7C384",
  },
  mobile: {
    label: "Mobile",
    color: "#917654",
  },
} satisfies ChartConfig;

function Dashboard() {
  const strokeColors = ["#F7941D", "#82ca9d", "#ffc658", "#8884d8", "#0088FE"];

  const { data } = useRestaurant();

  const getTotals = async () => {
    const res = await axiosInstance.get(apiRoutes.totals);
    return res.data;
  };

  const { data: totalsData, isLoading: loading } = useQuery<DashboardResponse>({
    queryKey: ["get_totals"],
    queryFn: getTotals,
  });

  const getSubsChartData = async () => {
    const res = await axiosInstance.get(apiRoutes.subscriptionStats);
    return res.data;
  };

  const { data: subsData, isLoading } = useQuery({
    queryKey: ["get_subscription_stats"],
    queryFn: getSubsChartData,
  });

  const subsChartData: any[] = Array.isArray(subsData?.data) ? subsData.data : [];

  const grouped = subsChartData?.reduce((acc: any, entry: any) => {
    const month = new Date(entry.month).toISOString().slice(0, 7); // 'YYYY-MM'
    if (!acc[month]) acc[month] = { month };
    acc[month][entry.planName] = Number(entry.count); // ensure numeric value
    return acc;
  }, {} as Record<string, any>);

  const chartData = Object.values(grouped);
  const planNames = Array.from(
    new Set(
      chartData.flatMap((item: any) =>
        Object.keys(item).filter((k) => k !== "month")
      )
    )
  );

  const stats = totalsData?.data;
  const recentRestaurants = Array.isArray(data?.data) ? data.data.slice(0, 4) : [];

  return (
    <>
      {/* Full-bleed hero header */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-gradient-to-br from-[#F7941D] to-[#e07010] px-10 md:px-16 lg:px-24 pt-10 pb-20">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-black text-2xl font-bold">Dashboard</h1>
          <p className="text-black/60 text-sm mt-1">
            Overview of your platform performance
          </p>
        </div>
      </div>

      <ScreenWrapper loading={loading || isLoading}>
      {/* Floating AI credits card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 px-5 py-4 flex items-center justify-between -mt-14 mb-8 relative">
        <div className="flex items-center gap-3">
          <Bot className="w-6 h-6 text-gray-700" strokeWidth={1.5} />
          <span className="text-gray-700 font-medium">AI Credits Used</span>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{stats?.totalCreditsUsed ?? 0}</p>
          <p className="text-xs text-gray-400">+{Number(stats?.creditsThisMonth ?? 0)} this month</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard
          icon={Building2}
          label="Total Restaurants"
          value={stats?.totalRestaurants ?? 0}
          sub={`+${Number(stats?.restaurantsThisMonth ?? 0)} this month`}
        />
        <StatCard
          icon={Users}
          label="Total Diner Sessions"
          value={stats?.totalSessions ?? 0}
          sub={`+${Number(stats?.sessionsThisMonth ?? 0)} this month`}
        />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Subscriptions Overview</h2>
        <ChartContainer className="max-h-[35vh] w-full" config={chartConfig}>
          <LineChart data={chartData}>
            <CartesianGrid vertical={false} stroke="#F3F4F6" />
            <YAxis
              tick={{ fontSize: 12, fill: "#9CA3AF" }}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: "#9CA3AF" }}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => format(new Date(value), "MMM yyyy")}
            />
            <ChartTooltip cursor content={<ChartTooltipContent />} />
            {planNames.map((plan, idx) => (
              <Line
                key={plan}
                type="monotone"
                dataKey={plan}
                stroke={strokeColors[idx % strokeColors.length]}
                strokeWidth={3}
                dot={{ r: 3 }}
              />
            ))}
            <Legend />
          </LineChart>
        </ChartContainer>
      </div>

      {/* Recent restaurants */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Recent Restaurants</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {recentRestaurants.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No restaurants yet</p>
          ) : (
            recentRestaurants.map((restaurant) => (
              <div key={restaurant.id} className="flex items-center justify-between py-3 px-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-green-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{restaurant.name}</p>
                    <p className="text-xs text-gray-400">{restaurant.email}</p>
                  </div>
                </div>
                <Link
                  to={`/admin/restaurants/${restaurant.id}`}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-[#F7941D] hover:text-[#F7941D] transition-colors"
                >
                  <Eye className="w-4 h-4" /> View
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </ScreenWrapper>
    </>
  );
}

export default Dashboard;
