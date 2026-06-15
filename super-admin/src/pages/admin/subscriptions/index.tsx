import ScreenWrapper from "../components/screenWrapper";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

import { Download, Funnel, SearchIcon } from "lucide-react";

import DataTable from "@/components/ui/dataTable";
import { columns } from "./components/columns";
import { useSubscriptions } from "@/hooks/useFetchData";

import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import Paginator from "@/components/paginator";
import { useQueryState } from "nuqs";

function Subscriptions() {
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("");
  const [, setOffset] = useQueryState("offset", {
    defaultValue: 0,
    parse: Number,
  });

  const { data, isLoading } = useSubscriptions(search, plan);

  const cols = useMemo(() => columns, []);

  return (
    <ScreenWrapper title="Subscriptions">
      <div className="bg-white rounded-3xl p-0 w-full mx-auto">
        <div className="flex flex-col space-y-6">
          {/* Header with filters and actions */}
          <div className="flex flex-wrap justify-between items-center gap-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <Button
                  variant={activeTab === "All" ? "default" : "outline"}
                  onClick={() => {
                    setActiveTab("All");
                    setPlan("");
                  }}
                  className={`rounded-full px-6 hover:cursor-pointer ${
                    activeTab === "All"
                      ? "bg-black text-white hover:bg-black/90"
                      : "bg-gray-100 border-0 hover:bg-gray-200"
                  }`}
                >
                  All
                </Button>
                {data?.plans?.map((item) => (
                  <Button
                    variant={activeTab === item?.name ? "default" : "outline"}
                    onClick={() => {
                      setActiveTab(item?.name);
                      setPlan(item?.name);
                    }}
                    className={`rounded-full px-6 hover:cursor-pointer bg-gray-200 ${
                      activeTab === item?.name
                        ? "bg-black text-white hover:bg-black/90"
                        : "bg-gray-100 border-0 hover:bg-gray-200"
                    }`}
                  >
                    {item?.name}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex items-center gap-2 flex-1">
                <Input
                  placeholder="Search Subscriptions"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                className="indent-5 max-w-sm w-[280px]"
                />
                <SearchIcon className="absolute left-3 h-4 w-4 text-gray-400"/>
              </div>
              <Button className="hidden bg-gray-200 text-black hover:cursor-pointer hover:bg-gray-300">
                <Download />
                Export
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="hidden ml-auto hover:cursor-pointer bg-gray-200 hover:bg-gray-300"
                  >
                    <Funnel />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">dsd</DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden border-t border-gray-200"></div>

          {/* Table */}
          <div className="overflow-x-auto">
            <DataTable
              data={data?.data ?? []}
              columns={cols}
              loading={isLoading}
              searchKey="subscriptions"
              filter
              headerItems={
                <Button
                  variant="outline"
                  className="bg-gray-100 border-0 hover:bg-gray-200 gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              }
            />
            {data?.pagination && (
              <Paginator
                totalItems={parseFloat(data?.pagination.totalItems ?? "0")}
                limit={data?.pagination.limit ?? 0}
                offset={data?.pagination.offset ?? 0}
                hasNextPage={data?.pagination.hasNextPage ?? false}
                hasPreviousPage={data?.pagination.hasPreviousPage ?? false}
                onPageChange={(newOffset) => {
                  setOffset(newOffset);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </ScreenWrapper>
  );
}

export default Subscriptions;
