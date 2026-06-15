import apiRoutes from "@/apiRoutes";
import { Input } from "@/components/ui/input";
import { useDrinks } from "@/hooks/useFetchData";
import { axiosInstance, cn, renderMediaUrl } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface Props {
  itemKey: string;
  id: string | undefined;
}
const AddDrinkToClassificationItem = ({ itemKey, id }: Props) => {
  const [search, setSearch] = useState("");

  const { data } = useDrinks(0, search);

  return (
    <section>
      <div className="relative pb-0 ">
        <Input
          placeholder="Search Drink"
          className="relative h-11 indent-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Search className="absolute left-4 inset-y-3.5 size-4.5 text-gray-400" />
      </div>
      <div className="pt-4 h-full overflow-y-scroll grid gap-3 divide-y">
        {data?.data?.map((item) => (
          <DrinkComponent
            {...item}
            key={item.id}
            itemKey={itemKey}
            classItemId={id}
          />
        ))}
      </div>
    </section>
  );
};

const DrinkComponent = ({
  description,
  name,
  images,
  classItemId,
  id,
}: Drink & { itemKey: string; classItemId: string | undefined }) => {
  const queryClient = useQueryClient();
  const add = async () => {
    const res = await axiosInstance.post(
      apiRoutes.addDrinkToTag(id, classItemId as string)
    );
    return res.data;
  };

  const { t } = useTranslation();

  const { mutate, isPending } = useMutation({
    mutationFn: add,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data?.message);
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === "get_dish_tags" ||
            query.queryKey[0] === "get_drink_tag_item" ||
            query.queryKey[0] === "get_tag_item",
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
    <div className="flex flex-1 gap-4 pb-0">
      {/* left side */}
      <div className="h-24 w-[150px]">
        <img
          className="h-full w-full rounded-xl"
          src={renderMediaUrl(images[0])}
          alt=""
        />
      </div>
      <div className="flex flex-row justify-between w-full gap-3">
        {/* middle side */}
        <div className=" space-y-1">
          <div className="mt-1 gap-1">
            <h4 className="font-medium text-md capitalize">{name}</h4>
            <p className="mt-1 font-normal text-gray-400 text-sm">
              {description}
            </p>
          </div>
          <div className="flex gap-2.5 items-center">
            {/* <div className="text-gray-300 flex items-center">
              <Star size={14} />
              4.3
            </div> */}
          </div>
          <div>
            <button
              onClick={() => mutate()}
              className={cn(
                "bg-gray-200 p-2 px-3 text-[10px] text-gray-500 font-medium flex items-center gap-x-1 rounded-md",
                isPending && "cursor-wait"
              )}
            >
              <Plus className="h-3 w-3" />{" "}
              {t("admin.menu.menuClassifications.addToList")}
            </button>
          </div>
        </div>
        {/* <div className="text-[#F7941D] text-2xl">£ {price}</div> */}
      </div>
    </div>
  );
};

export default AddDrinkToClassificationItem;
