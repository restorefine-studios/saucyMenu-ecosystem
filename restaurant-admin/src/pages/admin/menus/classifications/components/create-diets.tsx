import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { axiosInstance } from "@/lib/utils";
import apiRoutes from "@/apiRoutes";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { Modal } from "@/components/modal";
import { InputComponent } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
const CreateDiets = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await axiosInstance.post(apiRoutes.diets, data);
      return res.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data?.message);
        setOpen(false);
        queryClient.invalidateQueries({
          queryKey: ["get_diets"],
        });
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
    },
    onSubmit: async ({ value }) => {
      mutate(value);
    },
  });
  return (
    <>
      <Button onClick={() => setOpen(true)} variant="default" size="default" className="rounded-lg shrink-0">
        <PlusIcon className="w-4 h-4 mr-2" />
        {t("admin.menus.classifications.create.diet.button")}
      </Button>
      <Modal
        title={t("admin.menus.classifications.create.diet.title")}
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
                label={t("admin.menus.classifications.create.diet.form.name.label")}
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

export default CreateDiets;
