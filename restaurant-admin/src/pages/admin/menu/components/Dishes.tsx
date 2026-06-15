import { useState } from "react";

import { cn } from "@/lib/utils";
import { useDish, useMenuClassifications } from "@/hooks/useFetchData";
import { useQueryState } from "nuqs";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import Paginator from "@/components/paginator";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import DishComponent from "./dishComponent";
import PreviewDish from "../preview";
import Spinner from "@/components/Spinner";
import { DataList } from "@/components/dataList";
import { useTranslation } from "react-i18next";

function Dishes({ searchQuery }: { searchQuery: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useQueryState("offset", {
    defaultValue: 0,
    parse: Number,
  });

  const [selectedDish, setSelectedDish] = useState<DishData>();

  const [dishType, setDishType] = useQueryState("dishType", {
    defaultValue: "",
  });

  const { data, isLoading, isFetching } = useDish(offset, searchQuery);
  const { data: classificationsData } = useMenuClassifications();

  const handleClickDish = (dish: DishData) => {
    setOpen(true);
    setSelectedDish(dish);
  };

  const allDishTypes = classificationsData?.data.filter(
    (item) => item.type === "dish_type"
  );

  if (!data?.data) return <Spinner />;
  if (isLoading || isFetching) return <Spinner />;

  return (
    <div>
      <ScrollArea className=" mb-6 w-full overflow-x-hidden">
        <div className="flex gap-2 pb-4">
          <Button
            className={cn(
              "rounded-full px-5 py-2.5 cursor-pointer transition whitespace-nowrap",
              dishType === ""
                ? "bg-black text-white hover:bg-black"
                : " border bg-gray-100 hover:bg-gray-200 text-black"
            )}
            onClick={() => setDishType("")}
          >
            {t("admin.menu.dishes.all")}
          </Button>

          {allDishTypes?.map((tab) => (
            <Badge
              className={cn(
                "rounded-3xl px-6 py-2.5 cursor-pointer transition whitespace-nowrap capitalize",
                dishType === tab.id
                  ? "bg-black text-white hover:bg-black"
                  : " border bg-black/5 hover:bg-gray-200 text-black"
              )}
              key={tab.id}
              onClick={() => setDishType(tab.id)}
            >
              {tab.name}
            </Badge>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <div className="mb-6 mt-4 border-gray-300">
        <DataList
          data={data?.data}
          className="grid  lg:grid-cols-2 divide-y gap-x-16 space-y-5 mt-5"
          renderItem={(dish) => (
            <DishComponent
              key={dish.id}
              data={dish}
              onclick={() => handleClickDish(dish)}
            />
          )}
        />
        <Paginator
          totalItems={data?.pagination.totalItems}
          limit={data?.pagination.limit}
          offset={data?.pagination.offset}
          hasNextPage={data?.pagination.hasNextPage}
          hasPreviousPage={data?.pagination.hasPreviousPage}
          onPageChange={(newOffset) => {
            setOffset(newOffset);
          }}
        />
      </div>

      <Modal
        open={open}
        setOpen={setOpen}
        title={t("admin.menu.dishes.modalTitle")}
        size="lg"
      >
        <PreviewDish selectedDish={selectedDish} />
      </Modal>
    </div>
  );
}

export default Dishes;
