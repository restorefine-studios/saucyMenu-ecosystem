/* eslint-disable @typescript-eslint/no-explicit-any */
import { Modal } from "@/components/modal";
import { ItemRow } from "./list-item";

import { useState } from "react";
import { InputComponent } from "@/components/ui/input";
import { axiosInstance } from "@/lib/utils";
import apiRoutes from "@/apiRoutes";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQueryState } from "nuqs";
import { useTranslation } from "react-i18next";

const Diets = () => {
  const { t } = useTranslation();
  const [searchQuery] = useQueryState("search");
  const getDiets = async () => {
    const res = await axiosInstance.get(apiRoutes.diets);
    return res.data;
  };
  const { data: dietsData } = useQuery({
    queryKey: ["get_diets"],
    queryFn: getDiets,
  });
  const [open, setOpen] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [name, setName] = useState("");
  const [selectedDiet, setSelectedDiet] = useState<any>(null);
  const queryClient = useQueryClient();
  const updateDiet = async () => {
    const res = await axiosInstance.put(
      apiRoutes.diets + "/" + selectedDiet.id,
      {
        name,
      },
    );
    return res.data;
  };

  const { mutate, isPending } = useMutation({
    mutationFn: updateDiet,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data?.message);
        setOpen(false);
        queryClient.invalidateQueries({
          queryKey: ["get_diets"],
        });
      }
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err.response?.data.message);
    },
  });

  const { mutate: deleteDiet } = useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosInstance.delete(apiRoutes.diets + "/" + id);
      return res.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data?.message);
        setOpenDelete(false);
        queryClient.invalidateQueries({
          queryKey: ["get_diets"],
        });
      } else {
        toast.error(data?.message);
      }
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err.response?.data.message);
    },
  });

  const handleSubmit = () => {
    mutate();
  };
  const items =
    dietsData?.data?.filter((item: any) =>
      item.name.toLowerCase().includes(searchQuery?.toLowerCase() ?? ""),
    ) ?? [];

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center rounded-xl bg-muted/30">
          {searchQuery
            ? "No diets match your search."
            : "No diets yet. Create one to get started."}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          {items.map((item: any) => (
            <ItemRow
              key={item.id}
              name={item.name}
              description={item.description}
              price={item.price}
              icon={item.icon}
              onEdit={() => {
                setSelectedDiet(item);
                setName(item.name);
                setOpen(true);
              }}
              showEdit={!item?.isSystem}
              showDelete={!item?.isSystem}
              onDelete={() => {
                setOpenDelete(true);
                setSelectedDiet(item);
              }}
            />
          ))}
        </div>
      )}
      <Modal
        open={open}
        setOpen={setOpen}
        title={t("admin.menus.classifications.diets.edit.title")}
        footer={
          <Button disabled={!name} loading={isPending} onClick={handleSubmit}>
            {t("admin.menus.classifications.diets.edit.button")}
          </Button>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="h-24 mt-5 px-4">
            <InputComponent
              label={t(
                "admin.menus.classifications.diets.edit.form.name.label",
              )}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </form>
      </Modal>

      <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.menus.classifications.diets.delete.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.menus.classifications.diets.delete.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("admin.menus.classifications.diets.delete.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDiet(selectedDiet.id)}>
              {t("admin.menus.classifications.diets.delete.continue")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Diets;
