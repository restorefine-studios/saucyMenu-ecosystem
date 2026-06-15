import ScreenWrapper from "../components/screenWrapper";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

import { Download, SearchIcon } from "lucide-react";
import { columns } from "./components/columns";

import DataTable from "@/components/ui/dataTable";
import { useRestaurant } from "@/hooks/useFetchData";
import AddRestaurant from "./components/AddRestaurant";
import { useDebounce } from "use-debounce";
import { Input } from "@/components/ui/input";
import Paginator from "@/components/paginator";
import { useQueryState } from "nuqs";

function AllRestaurants() {
  const [open, setOpen] = useState(false);
  const cols = useMemo(() => columns, []);
  const [activeTab, setActiveTab] = useState("All");
  const [status, setStatus] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [, setOffset] = useQueryState("offset", {
    defaultValue: 0,
    parse: Number,
  });

  const [search] = useDebounce(searchValue, 1000);

  const { data, isLoading } = useRestaurant(status, search);

  // if (!data || isLoading) return <></>;

  return (
    <ScreenWrapper title="Restaurants" >
      <div className="bg-white rounded-3xl p-0">
        <div className="flex flex-col space-y-6">
          {/* Header with filters and actions */}
          <div className="flex flex-wrap justify-between items-center gap-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <Button
                  variant={activeTab === "All" ? "default" : "outline"}
                  onClick={() => {
                    setActiveTab("All");
                    setStatus("");
                  }}
                  className={`rounded-full px-6 ${
                    activeTab === "All"
                      ? "bg-black text-white hover:bg-black/90 hover:cursor-pointer"
                      : "bg-gray-100 border-0 hover:bg-gray-200 hover:cursor-pointer"
                  }`}
                >
                  All
                </Button>
                <Button
                  variant={activeTab === "Pending" ? "default" : "outline"}
                  onClick={() => {
                    setActiveTab("Pending");
                    setStatus("PENDING");
                  }}
                  className={`rounded-full px-6 ${
                    activeTab === "Pending"
                      ? "bg-black text-white hover:bg-black/90 hover:cursor-pointer"
                      : "bg-gray-100 border-0 hover:bg-gray-200 hover:cursor-pointer"
                  }`}
                >
                  Pending
                </Button>
                <Button
                  variant={activeTab === "Approved" ? "default" : "outline"}
                  onClick={() => {
                    setActiveTab("Approved");
                    setStatus("COMPLETED");
                  }}
                  className={`rounded-full px-6 ${
                    activeTab === "Approved"
                      ? "bg-black text-white hover:bg-black/90 hover:cursor-pointer"
                      : "bg-gray-100 border-0 hover:bg-gray-200 hover:cursor-pointer"
                  }`}
                >
                  Completed
                </Button>
                <Button
                  variant={activeTab === "Released" ? "default" : "outline"}
                  onClick={() => {
                    setActiveTab("Released");
                    setStatus("RELEASED");
                  }}
                  className={`rounded-full px-6 ${
                    activeTab === "Released"
                      ? "bg-black text-white hover:bg-black/90 hover:cursor-pointer"
                      : "bg-gray-100 border-0 hover:bg-gray-200 hover:cursor-pointer"
                  }`}
                >
                  Released
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex items-center gap-2 flex-1">
                <Input
                  placeholder="Search Restaurants"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  className="indent-5 max-w-sm w-[280px]"
                />
                <SearchIcon className="absolute left-3 h-4 w-4 text-gray-400"/>
              </div>
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setOpen(true)}
                      className={`rounded-lg px-6 hover:bg-orange-500 hover:cursor-pointer h-11`}
                    >
                      Add Restaurant
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Divider */}
          <div className="hidden border-t border-gray-200"></div>
          {/* Table */}

          <DataTable
            data={Array.isArray(data?.data) ? data.data : []}
            columns={cols}
            headerItems={
              <Button
                disabled
                variant="outline"
                className="bg-gray-100 border-0 hover:bg-gray-200 gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            }
            filter
            searchKey="name"
            search={searchValue}
            setSearch={setSearchValue}
            addButton
            loading={isLoading}
          />
          {data?.pagination && (
            <Paginator
              totalItems={parseFloat(data.pagination.totalItems)}
              limit={data.pagination.limit}
              offset={data.pagination.offset}
              hasNextPage={data.pagination.hasNextPage}
              hasPreviousPage={data.pagination.hasPreviousPage}
              onPageChange={(newOffset) => {
                setOffset(newOffset);
              }}
            />
          )}
        </div>
      </div>
      <AddRestaurant open={open} setOpen={setOpen} />
    </ScreenWrapper>
  );
}

export default AllRestaurants;
