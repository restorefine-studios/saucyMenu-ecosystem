/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import ScreenWrapper from "../../components/screenWrapper";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ArrowLeft, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useNavigate, useParams } from "react-router-dom";
import { axiosInstance } from "@/lib/utils";
import apiRoutes from "@/apiRoutes";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import { format } from "date-fns";
import Spinner from "@/components/Spinner";
import EnableDisable from "./enable-disable";

const years = [
  { key: "2025", label: "2025" },
  { key: "2024", label: "2024" },
  { key: "2023", label: "2023" },
];

// const chartData = [
//   { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
//   { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
//   { browser: "firefox", visitors: 187, fill: "var(--color-firefox)" },
// ];

// const barChartData = [
//   { month: "January", desktop: 186 },
//   { month: "February", desktop: 305 },
//   { month: "March", desktop: 237 },
//   { month: "April", desktop: 73 },
//   { month: "May", desktop: 209 },
//   { month: "June", desktop: 214 },
//   { month: "Jul", desktop: 73 },
//   { month: "Aug", desktop: 209 },
//   { month: "Sept", desktop: 214 },
//   { month: "Oct", desktop: 73 },
//   { month: "Nov", desktop: 209 },
//   { month: "Dec", desktop: 214 },
// ];

// const chartConfig = {
//   visitors: {
//     label: "Visitors",
//   },
//   chrome: {
//     label: "Chrome",
//     color: "#F7C384",
//   },
//   safari: {
//     label: "Safari",
//     color: "#917654",
//   },
//   firefox: {
//     label: "Firefox",
//     color: "#33210B",
//   },
// } satisfies ChartConfig;

const barChartConfig = {
  count: {
    label: "count",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

function Restaurants() {
  const [selectedYear, setSelectedYear] = useState("2025");
  const params = useParams<{ id: string }>();

  const navigate = useNavigate();

  const getRestaurants = async () => {
    const res = await axiosInstance.get(
      apiRoutes.viewRestaurant(params.id as string),
    );
    return res.data;
  };

  const { data, isLoading } = useQuery({
    queryKey: ["restaurant"],
    queryFn: getRestaurants,
    enabled: !!params.id,
  });

  const getAiUsage = async () => {
    const res = await axiosInstance.get(
      apiRoutes.restaurantAiUsage(params.id as string),
    );
    return res.data;
  };

  const { data: aiUsageData } = useQuery({
    queryKey: ["ai_usage"],
    queryFn: getAiUsage,
    enabled: !!params.id,
  });

  const grouped = aiUsageData?.data?.map((item: any) => {
    return {
      month: new Date(item.month).toISOString().slice(0, 7),
      count: item.count,
    };
  });

  if (isLoading) return <Spinner classname="bg-gray-100" />;

  return (
    <ScreenWrapper title="Restaurants" loading={isLoading}>
      <div className="bg-white h-auto rounded-3xl p-0 space-y-0">
        <div className="flex flex-wrap justify-between items-center gap-4 p-6">
          <div className="flex items-center gap-3 w-full px-0 justify-between">
            <div
              onClick={() => navigate(-1)}
              className="cursor-pointer text-lg font-medium flex items-center gap-x-3"
            >
              {" "}
              <ArrowLeft className="size-5" /> {data?.data?.name + "'s "}{" "}
              Profile
            </div>

            <EnableDisable id={params.id as string} />
          </div>
        </div>
        {/* Divider */}
        <hr className=" mb-6 mt-0 border-gray-300" />
        {/* top side */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 px-6">
          <Card className="lg:col-span-5 bg-gray-100 rounded-[18px]">
            <CardContent className="flex-1 flex justify-between">
              <div className="flex gap-3 items-center">
                <div className=" bg-gradient-to-br from-[#FF8B00] to-[#FF3939] h-8 lg:h-11 w-8 lg:w-11 rounded-full"></div>
                <h4 className="font-medium text-lg">{data?.data?.name}</h4>
              </div>
              <div className="mr-4 flex gap-x-8 gap-y-3 items-center">
                {data?.data?.address && (
                  <div className="flex flex-col gap-1 items-start capitalize">
                    {/* <MapPin size={20} /> */}
                    <span className="text-gray-500 text-xs">Location</span>
                    <span className="font-normal text-md">
                      {data?.data?.address}
                    </span>
                  </div>
                )}
                <div className="flex flex-col gap-1 items-start capitalize">
                  {/* <Calendar size={20} /> */}
                  <span className="text-gray-500 text-xs">Date Joined</span>
                  <span className="font-normal text-md">
                    {moment(data?.data?.createdAt).format("LL")}
                  </span>
                </div>
                <div className="flex flex-col gap-1 items-start capitalize">
                  {/* <User size={20} /> */}
                  <span className="text-gray-500 text-xs">Status</span>
                  <span className="font-normal text-md">
                    {data?.data?.status.toLowerCase()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* <Card className="lg:col-span-2 bg-gray-200 rounded-3xl  ">
            <CardContent className="flex justify-between items-center">
              Total Revenue Earned
              <p className="text-[#F7941D] font-semibold lg:text-5xl text-2xl">
                £91.3K
              </p>
            </CardContent>
          </Card> */}
        </div>
        {/* bottom side */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:min-h-3/5 px-6 py-6">
          {/* left side  */}
          <Card className="lg:col-span-3 bg-gray-100 rounded-[18px] flex flex-col">
            <CardContent className="flex flex-col flex-1 justify-between">
              <div className="flex justify-between">
                <h4 className="font-medium text-lg">AI Credits Overview</h4>
                <Button
                  size="sm"
                  className="hidden bg-transparent hover:bg-transparent text-black  rounded-md items-center gap-1 h-8"
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
                </Button>
              </div>

              <div className="flex-1 flex items-end">
                <ChartContainer config={barChartConfig} className="w-full">
                  {grouped?.length > 0 ? (
                    <BarChart
                      accessibilityLayer
                      data={grouped}
                      margin={{
                        right: 12,
                      }}
                    >
                      <CartesianGrid vertical={false} />
                      <YAxis
                        dataKey="count"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#000", fontSize: 12 }}
                      />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) =>
                          format(new Date(value), "MMM yyyy")
                        }
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Bar
                        dataKey="count"
                        fill="#FF7B7B"
                        radius={180}
                        barSize={10}
                      />
                    </BarChart>
                  ) : (
                    <div className="grid gap-1 place-items-center justify-center">
                      <img
                        src="/emptyfolder.svg"
                        alt="empty folder"
                        className="size-20 object-cover aspect-square"
                      />
                      <h4 className="font-medium text-lg flex flex-col items-center justify-center">
                        No Data Found
                      </h4>
                    </div>
                  )}
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
          {/* right side */}
          <div className="lg:col-span-2 grid lg:grid-rows-5 gap-5 ">
            <Card className="bg-gray-100 rounded-[18px] lg:row-span-1 flex">
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h4 className="font-normal text-md">Overall Users</h4>
                  <h2 className="text-[#F7941D] font-semibold text-4xl">
                    {data?.totals?.users}
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <h4 className="font-normal text-md">Total Ratings</h4>
                  <h2 className="text-[#F7941D] font-semibold text-4xl">
                    {data?.totals?.ratings}
                  </h2>
                </div>
              </CardContent>
            </Card>
            {/* <Card className="bg-black rounded-3xl lg:row-span-4 flex justify-between p-5 pt-7">
              <CardContent>
                <div className="flex justify-between">
                  <p className="text-white text-medium text-2xl">
                    Best Selling Dishes
                  </p>
                  <p className="text-white text-medium text-lg">
                    Filter category
                  </p>
                </div>
                <CardContent className="flex-1 pt-5 pb-0">
                  <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[250px]"
                  >
                    <PieChart>
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Pie
                        data={chartData}
                        dataKey="visitors"
                        nameKey="browser"
                      />
                      <ChartLegend
                        content={<ChartLegendContent nameKey="browser" />}
                        className="flex-col absolute left-0 top-0 flex text-white flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                      />
                      <div className=""></div>
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </CardContent>
            </Card> */}
          </div>
        </div>
      </div>
    </ScreenWrapper>
  );
}

export default Restaurants;
