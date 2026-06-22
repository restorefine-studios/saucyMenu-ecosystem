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
    <>
      {/* Full-bleed hero header */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-gradient-to-br from-[#F7941D] to-[#e07010] px-10 md:px-16 lg:px-24 pt-10 pb-20">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-black text-2xl font-bold">Restaurants</h1>
          <p className="text-black/60 text-sm mt-1">
            Manage all restaurants on the platform
          </p>
        </div>
      </div>

      <ScreenWrapper>
        {/* Floating filters card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 -mt-14 mb-6 relative flex flex-col md:flex-row md:flex-wrap justify-between items-stretch md:items-center gap-4 px-6 py-5">
            <div className="flex items-center gap-3 overflow-x-auto">
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
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <div className="relative flex items-center gap-2 flex-1">
                <Input
                  placeholder="Search Restaurants"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  className="indent-5 w-full sm:max-w-sm sm:w-[280px]"
                />
                <SearchIcon className="absolute left-3 h-4 w-4 text-gray-400"/>
              </div>
              <Button
                onClick={() => setOpen(true)}
                className={`rounded-lg px-6 hover:bg-orange-500 hover:cursor-pointer h-11 shrink-0`}
              >
                Add Restaurant
              </Button>
            </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
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
      <AddRestaurant open={open} setOpen={setOpen} />
    </ScreenWrapper>
    </>
  );
}

export default AllRestaurants;
