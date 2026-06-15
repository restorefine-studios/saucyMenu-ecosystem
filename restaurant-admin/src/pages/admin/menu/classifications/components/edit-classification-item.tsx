import { Modal } from "@/components/modal";

import { ClassificationsItem, ClassificationsItemResponse } from "../types";

import { useState } from "react";
import AddDishToClassificationItem from "./add-dish-to-class-item";
import { Trash2, Edit2 } from "lucide-react";
import { axiosInstance, cn } from "@/lib/utils";
import apiRoutes from "@/apiRoutes";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import AddDrinkToClassificationItem from "./add-drink-to-class-item";
import { useTranslation } from "react-i18next";
import { RemoveTag } from "./remove-tag";
import EditTag from "./edit-tag";

interface Props {
  item: ClassificationsItem;
  itemKey: string;
}

const EditClassificationItem = ({ item, itemKey }: Props) => {
  const [open, setOpen] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  return (
    <>
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
        <button onClick={() => setOpen(true)} className="flex items-center">
          <div className="h-2 w-2 rounded-full bg-amber-500 mr-2"></div>
          <span className="hover:underline hover:cursor-pointer capitalize text-sm text-left">
            {item?.name}
          </span>
        </button>
        <div className="flex gap-2">
          <Edit2
            className="h-4 w-4 text-blue-500 cursor-pointer hover:text-blue-700"
            onClick={() => setOpenEdit(true)}
          />
          <Trash2
            className="h-4 w-4 text-red-500 cursor-pointer hover:text-red-700"
            onClick={() => setOpenDelete(true)}
          />
        </div>
      </div>
      <RemoveTag open={openDelete} setOpen={setOpenDelete} id={item?.id} />
      <EditTag open={openEdit} setOpen={setOpenEdit} item={item} />
      {open && (
        <ClassificationItem
          open={open}
          setOpen={setOpen}
          itemKey={itemKey}
          item={item}
        />
      )}
    </>
  );
};

const ClassificationItem = ({
  open,
  setOpen,
  itemKey,
  item,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  itemKey: string;
  item: ClassificationsItem;
}) => {
  const queryClient = useQueryClient();
  // const { data, refetch } = useDishTagItemData(item?.id);
  const { t } = useTranslation();

  const getDishTagData = async () => {
    const res = await axiosInstance.get(apiRoutes.fetchDishTagItem(item?.id));
    return res.data;
  };
  const { data: dishTagData, refetch } = useQuery<ClassificationsItemResponse>({
    queryKey: ["get_dish_tag_item"],
    queryFn: getDishTagData,
    enabled: itemKey !== "drink-types",
  });

  const getDrinkTagData = async () => {
    const res = await axiosInstance.get(apiRoutes.fetchDrinkTagItem(item?.id));
    return res.data;
  };
  const { data: drinkTagData } = useQuery<ClassificationsItemResponse>({
    queryKey: ["get_drink_tag_item"],
    queryFn: getDrinkTagData,
    enabled: itemKey === "drink-types",
  });

  const activeOption = {
    cuisines: "Cuisine Preferences",
    diets: "Diet Preferences",
    "dish-types": "Dish Types",
    allergens: "Allergen Preferences",
    "drink-types": "Drink Preferences",
  };

  const removeFood = async (dishId: string) => {
    const res = await axiosInstance.delete(
      apiRoutes.removeDishFromTag(dishId, item?.id)
    );
    return res.data;
  };
  const removeDrink = async (dishId: string) => {
    const res = await axiosInstance.delete(
      apiRoutes.removeDrinkFromTag(dishId, item?.id)
    );
    return res.data;
  };

  const { mutate, isPending } = useMutation({
    mutationFn: itemKey === "drink-types" ? removeDrink : removeFood,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data?.message);
        refetch();
        queryClient.invalidateQueries({
          //   {
          predicate: (query) =>
            query.queryKey[0] === "get_dish_tags" ||
            query.queryKey[0] === "get_drink_tag_item" ||
            query.queryKey[0] === "get_dish_tag_item" ||
            query.queryKey[0] === "get_tag_dishes",
        });
      } else {
        toast.error(data?.message);
      }
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err.response?.data.message);
    },
  });

  return (
    <Modal title="" open={open} setOpen={setOpen} size={"xxl"}>
      <div className="grid md:grid-cols-2 px-5 gap-5">
        <div className="divide-y">
          <div className="grid pb-3">
            <div className="flex items-center gap-x-2">
              <h2 className="text-xl font-medium">
                {activeOption[itemKey as keyof typeof activeOption]}
              </h2>
              <span className="text-md text-[#F7941D] capitalize">
                {itemKey === "drink-types"
                  ? drinkTagData?.name
                  : dishTagData?.name}
              </span>
            </div>

            <span className="text-sm text-gray-400">
              {t("admin.menu.menuClassifications.editClassTitle")}{" "}
              {itemKey === "drink-types"
                ? drinkTagData?.name
                : dishTagData?.name}
            </span>
          </div>
          <div className="h-[395px] pt-3 grid gap-3 overflow-y-auto">
            <div className="space-y-3 overflow-auto">
              {itemKey === "drink-types"
                ? drinkTagData?.data?.map((drink) => (
                    <div
                      key={drink?.drink?.name}
                      className="flex items-center gap-1.5"
                    >
                      <span className="p-1.5 rounded-full bg-[#FFD097]"></span>
                      <span className="text-sm">{drink?.drink?.name}</span>
                      <Trash2
                        className={cn(
                          "h-4 w-4 text-red-500 cursor-pointer",
                          isPending && "cursor-wait"
                        )}
                        onClick={() => mutate(drink.drink?.id as string)}
                      />
                    </div>
                  ))
                : dishTagData?.data?.map((dish) => (
                    <div className="flex items-center gap-1.5">
                      <span className="p-1.5 rounded-full bg-[#FFD097]"></span>
                      <span className="text-sm">{dish.dish?.name}</span>
                      <Trash2
                        className={cn(
                          "h-4 w-4 text-red-500 cursor-pointer",
                          isPending && "cursor-wait"
                        )}
                        onClick={() => mutate(dish.dish?.id as string)}
                      />
                    </div>
                  ))}
            </div>
          </div>
        </div>
        <div>
          {itemKey === "drink-types" ? (
            <AddDrinkToClassificationItem
              itemKey={itemKey}
              id={drinkTagData?.id}
            />
          ) : (
            <AddDishToClassificationItem
              itemKey={itemKey}
              id={dishTagData?.id}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};

export default EditClassificationItem;
