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
import { useAddons } from "@/hooks/useFetchData";

interface Props {
  setData: Dispatch<SetStateAction<string[]>>;
  data: string[];
}
const Addons = ({ data, setData }: Props) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const queryClient = useQueryClient();

  const { t } = useTranslation();

  const { data: addonsData } = useAddons();

  const add = async () => {
    const res = await axiosInstance.post(apiRoutes.addOns(), {
      name,
    });
    return res.data;
  };

  const { mutate, isPending } = useMutation({
    mutationFn: add,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data?.message);
        queryClient.invalidateQueries({ queryKey: ["get_addons"] });
        setOpen(false);
      } else {
        toast.error(data?.message);
      }
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err.response?.data.message);
    },
  });

  const toggleAddon = (id: string) => {
    setData(
      (prev) =>
        prev.includes(id)
          ? prev.filter((typeId) => typeId !== id) // remove if already selected
          : [...prev, id] // add if not selected
    );
  };
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>{t("admin.menus.items.add.components.addons.label")}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={() => setOpen(true)}
        >
          <PlusCircle className="h-4 w-4" />
          {t("admin.menus.items.add.components.addons.button")}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {addonsData?.data?.map((item) => (
          <div
            key={item?.id}
            className="flex items-center space-x-2 capitalize"
          >
            <Checkbox
              id={item?.id}
              name={item?.name}
              checked={data?.includes(item?.id)}
              onCheckedChange={() => toggleAddon(item?.id)}
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
        title={t("admin.menus.items.add.components.addons.modal.title")}
        footer={
          <Button disabled={!name} loading={isPending} onClick={() => mutate()}>
            {t("admin.menus.items.add.components.addons.modal.button")}
          </Button>
        }
      >
        <div className="h-24 mt-5 px-4">
          <InputComponent
            label={t(
              "admin.menus.items.add.components.addons.modal.form.name.label"
            )}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};

export default Addons;
