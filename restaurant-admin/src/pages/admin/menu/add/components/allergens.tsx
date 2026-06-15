import apiRoutes from "@/apiRoutes";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InputComponent, Label } from "@/components/ui/input";
import { axiosInstance } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { PlusCircle } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
interface Props {
  allergens: MenuClassItem[];
  setData: Dispatch<SetStateAction<string[]>>;
  data: string[];
}
const Allergens = ({ allergens, data, setData }: Props) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const queryClient = useQueryClient();

  const { t } = useTranslation();

  const add = async () => {
    const res = await axiosInstance.post(apiRoutes.dishTags, {
      name,
      type: "allergen",
    });
    return res.data;
  };

  const { mutate, isPending } = useMutation({
    mutationFn: add,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data?.message);
        queryClient.invalidateQueries({
          queryKey: ["get_dish_tags"],
        });
        setOpen(false);
      } else {
        toast.error(data?.message);
      }
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err.response?.data.message);
    },
  });

  const toggleDishType = (id: string) => {
    setData(
      (prev) =>
        prev.includes(id)
          ? prev.filter((typeId) => typeId !== id) // remove if already selected
          : [...prev, id] // add if not selected
    );
  };

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between">
        <Label>{t("admin.menu.addDish.types.allergens")}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={() => setOpen(true)}
        >
          <PlusCircle className="h-4 w-4" />
          {t("admin.menu.addDish.types.allergensBtn")}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {allergens?.map((item) => (
          <div
            key={item?.id}
            className="flex items-center space-x-2 capitalize"
          >
            <Checkbox
              id={item?.id}
              name={item?.name}
              checked={data?.includes(item?.id)}
              onCheckedChange={() => toggleDishType(item?.id)}
            />
            <Label
              htmlFor={item?.id}
              className="text-sm font-normal capitalize"
            >
              {item?.name}
            </Label>
          </div>
        ))}
      </div>
      <Modal
        open={open}
        setOpen={setOpen}
        title={`Add Allergens`}
        footer={
          <Button disabled={!name} loading={isPending} onClick={() => mutate()}>
            {t("admin.menu.addDish.types.add")}
          </Button>
        }
      >
        <div className="h-24 mt-5 px-4">
          <InputComponent
            label="Enter Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};

export default Allergens;
