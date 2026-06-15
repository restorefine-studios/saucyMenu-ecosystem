import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { InputComponent } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSetup } from "@/hooks/useFetchData";
import { axiosInstance } from "@/lib/utils";
import apiRoutes from "@/apiRoutes";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Modal } from "@/components/modal";
import { Dispatch, SetStateAction } from "react";

interface Props {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}
interface addValues {
  name: string;
  restaurantName: string;
  email: string;
  currencyId: string;
}

const addSchema = z.object({
  name: z.string().min(3, { message: "Please enter a valid restaurant Name" }),
  restaurantName: z
    .string()
    .min(3, { message: "Please enter a valid restaurant Name" }),
  email: z.string().min(1, { message: "Please enter a valid email" }),
  currencyId: z.string().min(1, "Please select a currency"),
});

function AddRestaurant({ open, setOpen }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const addRestaurant = async (restaurantData: addValues) => {
    const response = await axiosInstance.post(
      apiRoutes.createRestaurant,
      restaurantData,
    );
    return response.data;
  };

  const { mutateAsync, isPending } = useMutation({
    mutationFn: addRestaurant,
  });

  const form = useForm({
    defaultValues: {
      name: "",
      restaurantName: "",
      email: "",
      currencyId: "",
    } as addValues,
    validators: {
      onSubmit: addSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const data = await mutateAsync(value);
        if (data?.success) {
          toast.success(data?.message);
          queryClient.invalidateQueries({ queryKey: ["get_restaurants"], exact: false });
          form.reset();
          setOpen(false);
        } else {
          toast.error(data?.message);
        }
      } catch (err) {
        const axiosErr = err as AxiosError<{ message: string }>;
        toast.error(axiosErr?.response?.data?.message ?? "Something went wrong");
      }
    },
  });

  const { data } = useSetup();

  return (
    <Modal
      open={open}
      setOpen={(value) => {
        if (!value) form.reset();
        setOpen(value);
      }}
      title={t("admin.restaurants.addRestaurantModal.title")}
      description={t("admin.restaurants.addRestaurantModal.subTitle")}
      size="lg"
      // footer={

      // }
    >
      <div className="px-1 py-2">
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <form.Field
              name="name"
              validators={{
                onSubmit: addSchema.shape.name,
              }}
              children={(field) => (
                <InputComponent
                  label={t("admin.restaurants.addRestaurantModal.nameLabel")}
                  id="name"
                  type="text"
                  name="name"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={t(
                    "admin.restaurants.addRestaurantModal.namePlaceholder",
                  )}
                  className="h-11 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 transition-colors focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                />
              )}
            />
            <form.Field
              name="restaurantName"
              validators={{
                onSubmit: addSchema.shape.restaurantName,
              }}
              children={(field) => (
                <InputComponent
                  label={t(
                    "admin.restaurants.addRestaurantModal.restaurantNameLabel",
                  )}
                  id="restaurantName"
                  type="text"
                  name="restaurantName"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={t(
                    "admin.restaurants.addRestaurantModal.restaurantNamePlaceholder",
                  )}
                  className="h-11 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 transition-colors focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                />
              )}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <form.Field
              name="email"
              validators={{
                onSubmit: addSchema.shape.email,
              }}
              children={(field) => (
                <InputComponent
                  label={t("admin.restaurants.addRestaurantModal.emailLabel")}
                  id="email"
                  type="email"
                  name="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={t(
                    "admin.restaurants.addRestaurantModal.emailPlaceholder",
                  )}
                  className="h-11 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 transition-colors focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                />
              )}
            />
            <form.Field
              name="currencyId"
              children={(field) => (
                <div className="grid w-full gap-1">
                  <label
                    htmlFor="currencyId"
                    className="text-sm font-semibold capitalize text-gray-600"
                  >
                    {t("admin.restaurants.addRestaurantModal.currencyLabel")}
                  </label>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value)}
                  >
                    <SelectTrigger className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 transition-colors focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 [&>span]:line-clamp-1">
                      <SelectValue
                        placeholder={t(
                          "admin.restaurants.addRestaurantModal.currencyPlaceholder",
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {data?.data?.currencies?.map((currency) => (
                        <SelectItem key={currency.id} value={currency.id}>
                          ({currency.symbol}) {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
              className="h-10 min-w-[6rem] rounded-lg border-gray-200 font-medium"
            >
              {t("admin.restaurants.addRestaurantModal.cancelButton")}
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit]) => (
                <Button
                  type="submit"
                  loading={isPending}
                  disabled={!canSubmit}
                  className="h-10 min-w-[6rem] rounded-lg bg-[#F7941D] font-medium hover:bg-amber-600"
                >
                  {t("admin.restaurants.addRestaurantModal.saveButton")}
                </Button>
              )}
            />
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default AddRestaurant;
