/* eslint-disable @typescript-eslint/no-explicit-any */
import ScreenWrapper from "../components/screenWrapper";
import { Card, CardContent } from "@/components/ui/card";

import { CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import AiImg from "@/assets/globemesh.png";
import { useRestaurant } from "@/hooks/useFetchData";
import { allMonths, axiosInstance, curerntMonthData } from "@/lib/utils";
import apiRoutes from "@/apiRoutes";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";
// import { useMemo } from "react";

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
  // const [selectedYear, setSelectedYear] = useState("2025");
  const strokeColors = [
    "#8884d8", // soft purple
    "#82ca9d", // mint green
    "#ffc658", // golden yellow
    "#ff7300", // orange
    "#0088FE", // blue
  ];

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

  const {
    data: subsData,
    isLoading,
    // isFetching
  } = useQuery({
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

  return (
    <ScreenWrapper
      title="Dashboard"
      loading={loading || isLoading}
    >
      {/* top side  */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-stretch ">
        {/*  left container  */}
        <Card className="lg:col-span-4 bg-white rounded-2xl ">
          <CardContent className="flex-1 p-6 py-0">
            <div className="flex justify-between gap-2 items-center mb-2">
              <h2 className="font-medium text-xl mb-2">Subscriptions Overview</h2>
              {/* <Button
                size="sm"
                className="bg-transparent hover:bg-transparent text-black  rounded-md flex items-center gap-1 h-8"
              >
                <DropdownMenu>
                  <DropdownMenuTrigger>{selectedYear}</DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {years.map((year) => (
                      <DropdownMenuItem
                        onClick={() => setSelectedYear(year.key)}
                      >
                        {year.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <ChevronDown className="h-4 w-4" />
              </Button> */}
            </div>
            {/* <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                {Object.keys(chartData[0] ?? {})
                  .filter((k) => k !== "month")
                  .map((plan) => (
                    <Line
                      key={plan}
                      type="monotone"
                      dataKey={plan}
                      stroke="#000"
                    />
                  ))}

              </LineChart>
            </ResponsiveContainer> */}
            <ChartContainer
              className=" max-h-[35vh] w-full"
              config={chartConfig}
            >
              <LineChart data={chartData}>
                <CartesianGrid vertical={false} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => format(new Date(value), "MMM yyyy")}
                />
                <ChartTooltip cursor={true} content={<ChartTooltipContent />} />
                {planNames.map((plan, idx) => (
                  <Line
                    key={plan}
                    type="monotone"
                    dataKey={plan}
                    stroke={strokeColors[idx]}
                    strokeWidth={4}
                  />
                ))}
                <Legend />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
        {/*  right container  */}
        <Card className="rounded-2xl overflow-hidden bg-white lg:col-span-2">
          <CardContent className="px-7 flex flex-col justify-between h-full">
            <div>
              <div className="flex flex-wrap justify-between items-start gap-2">
                <h3 className="max-w-1/4 text-xl font-medium">
                  Total Restaurants
                </h3>
                <div className="max-w-1/2 flex flex-col items-end">
                  {" "}
                  <span className="flex items-center gap-x-1 text-lg">
                    {" "}
                    {"+ " + Number(totalsData?.data.restaurantsThisMonth ?? 0)}
                    <ArrowUp className="text-green-500 size-5" />
                  </span>
                  <p className="text-xs text-gray-400">
                    From start of {allMonths[curerntMonthData.getMonth()]}
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <span className="text-5xl font-semibold text-[#F7C384]">
                  {totalsData?.data?.totalRestaurants}
                </span>
              </div>
            </div>

            <hr />
            <div>
              <div className="flex flex-wrap justify-between items-start gap-2">
                <h3 className="max-w-1/2 text-xl font-medium">
                  Total User Sessions
                </h3>
                <div className="max-w-1/2 flex flex-col items-end">
                  {" "}
                  <span className="flex items-center gap-x-1 text-lg">
                    {" "}
                    {"+ " + Number(totalsData?.data.sessionsThisMonth ?? 0)}
                    <ArrowUp className="text-green-500 size-5" />
                  </span>
                  <p className="text-xs text-gray-400">
                    From start of {allMonths[curerntMonthData.getMonth()]}
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <span className="text-5xl font-semibold text-[#128281]">
                  {totalsData?.data.totalSessions}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* bottom side  */}
      <div className="py-2 grid grid-cols-1 lg:grid-cols-7 gap-4 items-stretch">
        {/*  left container  */}
        <Card className="py-0 lg:col-span-4 bg-white rounded-2xl overflow-y-auto h-[400px]">
          <CardContent className="px-0 relative">
            <div className="backdrop-blur-sm bg-white/50 h-auto w-full sticky top-0 z-10 px-6 py-6" >
                <h2 className="font-medium text-xl ">Recent Restaurants</h2>
            </div>
            
            <div className="space-y-4 divide-y">
              {(Array.isArray(data?.data) ? data.data.slice(0, 4) : []).map((restaurant) => (
                <div key={restaurant.name}>
                  <div className="flex items-center justify-between py-2 px-6">
                    <div className="flex items-center ">
                      <div
                        className={`w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-green-400 mr-4`}
                      ></div>
                      <div>
                        <h2 className="text-lg font-medium">
                          {restaurant.name}
                        </h2>
                        <p className="text-gray-400 text-xs">
                          {restaurant.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      asChild
                      className="px-6 py-2 bg-[#FFA600] text-white font-medium rounded-lg hover:bg-orange-400 hover:cursor-pointer transition-colors"
                    >
                      <Link to={`/admin/restaurants/${restaurant.id}`}>
                        View
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        {/*  right container  */}

        <Card className="lg:col-span-3 bg-black h-[300px] md:h-auto rounded-2xl overflow-hidden relative">
          <CardContent className="flex-1 relative">
            <div className="flex flex-col gap-1 lg:pl-5 lg:pt-5 pl-2.5 pt-2.5 z-10 relative">
              <h2 className="text-white font-medium text-2xl lg:text-xl">
                Overall AI Credits Used
              </h2>
              <div className="text-[#DAB689] font-semibold text-7xl">
                {totalsData?.data.totalCreditsUsed}
              </div>
            </div>
            <div className="w-full absolute left-24">
              <img
                src={AiImg}
                alt="globe image"
                className="h-full object-cover"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </ScreenWrapper>
  );
}

export default Dashboard;
