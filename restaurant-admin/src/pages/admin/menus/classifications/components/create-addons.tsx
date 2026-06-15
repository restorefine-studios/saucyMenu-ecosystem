import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { useForm } from "@tanstack/react-form";
import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { InputComponent } from "@/components/ui/input";
import { axiosInstance } from "@/lib/utils";
import apiRoutes from "@/apiRoutes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";

const CreateAddons = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: async (data: { name: string; price: string }) => {
      const res = await axiosInstance.post(apiRoutes.addOns(), data);
      return res.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data?.message);
        queryClient.invalidateQueries({
          queryKey: ["get_add_ons"],
        });
        setOpen(false);
      } else {
        toast.error(data?.message);
      }
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data.message);
    },
  });
  const form = useForm({
    defaultValues: {
      name: "",
      price: "",
    },
    onSubmit: async ({ value }) => {
      mutate(value);
    },
  });
  return (
    <>
      <Button onClick={() => setOpen(true)} variant="default" size="default" className="rounded-lg shrink-0">
        <PlusIcon className="w-4 h-4 mr-2" />
        {t("admin.menus.classifications.create.addon.button")}
      </Button>
      <Modal
        title={t("admin.menus.classifications.create.addon.title")}
        open={open}
        setOpen={setOpen}
        footer={
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit]) => (
              <Button
                loading={isPending}
                disabled={!canSubmit || isPending}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  form.handleSubmit();
                }}
              >
                {t("admin.menu.addDish.types.add")}
              </Button>
            )}
          />
        }
      >
        <div className="flex flex-col gap-4">
          <form.Field
            name="name"
            children={(field) => (
              <InputComponent
                label={t("admin.menus.classifications.create.addon.form.name.label")}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            )}
          />
          <form.Field
            name="price"
            children={(field) => (
              <InputComponent
                type="number"
                label={t("admin.menus.classifications.create.addon.form.price.label")}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            )}
          />
        </div>
      </Modal>
    </>
  );
};

export default CreateAddons;
