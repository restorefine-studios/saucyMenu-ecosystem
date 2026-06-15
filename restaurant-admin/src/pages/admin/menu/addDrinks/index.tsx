import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FieldInfo, InputComponent, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "@tanstack/react-form";
import { FileUpload } from "@/components/file-upload";
import ScreenWrapper from "../../components/screenWrapper";
import { Trash, Trash2, Upload } from "lucide-react";
import { axiosInstance, mediaUrl } from "@/lib/utils";
import { useDishTags, useDrinkUnits } from "@/hooks/useFetchData";
import { useMutation } from "@tanstack/react-query";
import apiRoutes from "@/apiRoutes";
import { toast } from "sonner";
import { AxiosError } from "axios";
import Back from "@/components/back";
import DrinkType from "./drink-types";
import { Fragment, useState } from "react";

import { useNavigate } from "react-router-dom";
import Spinner from "@/components/Spinner";
import { useAtom } from "jotai";
import Bulk from "./bulk";
import { userAtom } from "@/atoms/user";
import { useTranslation } from "react-i18next";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, {
    message: "Description is required",
  }),
  images: z.array(z.string()),
  isAlcoholic: z.boolean(),
  isAvailable: z.boolean(),
  variants: z
    .array(
      z.object({
        price: z
          .number()
          .min(0.01, { message: "Price must be greater than 0" }),
        unitId: z.string().min(1, { message: "Unit is required" }).uuid(),
        quantity: z.string().min(1, { message: "Quantity must be at least 1" }),
        isAvailable: z.boolean(),
      })
    )
    .min(1, { message: "At least one variant is required" }),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddDrinks() {
  const [user] = useAtom(userAtom);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: drinkUnits } = useDrinkUnits();
  const [tagIds, setTagIds] = useState<string[]>([]);
  const { data, isLoading } = useDishTags();
  const { mutate, isPending } = useMutation({
    mutationFn: async (formData: FormValues) => {
      const response = await axiosInstance.post(apiRoutes.addDrink, {
        ...formData,
        tagIds,
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data?.message);
        navigate("/admin/menu?tab=drinks");
        form.reset();
      } else {
        toast.error(data?.message);
      }
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err?.response?.data?.message);
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      images: [],
      isAlcoholic: false,
      isAvailable: false,
      variants: [
        {
          price: 0,
          unitId: "",
          quantity: "",
          isAvailable: false,
        },
      ],
    } as FormValues,
    validators: {
      // onSubmit: formSchema,
      // onChange: formSchema,
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      mutate(value);
    },
  });

  const drinkTypesList = data?.data.filter(
    (item) => item.type === "drink_type"
  );

  // console.log(form.state.values, tagIds);
  if (!data || isLoading) return <Spinner />;

  return (
    <ScreenWrapper title={t("admin.menu.addDrinks.header")}>
      <div className="container mx-auto">
        <div className=" mx-auto border-none">
          <div className="flex items-center justify-between">
            <Back title="Add New Drink" />
            <Bulk />
          </div>
          <hr className="mb-6 mt-4 border-gray-300" />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <div className="space-y-6 py-6">
              {/* Basic Information */}
              <div className=" ">
                <form.Field
                  name="name"
                  validators={{
                    onSubmit: formSchema.shape.name,
                  }}
                  children={(field) => (
                    <div className="space-y-2 ">
                      <InputComponent
                        label={t("admin.menu.addDrinks.form.name.label")}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        // onBlur={field.handleBlur}
                        placeholder={t(
                          "admin.menu.addDrinks.form.name.placeholder"
                        )}
                      />
                      <FieldInfo field={field} />
                    </div>
                  )}
                />
              </div>

              <form.Field
                name="description"
                validators={{
                  onSubmit: formSchema.shape.description,
                }}
                children={(field) => (
                  <div className="space-y-2">
                    <Label>
                      {t("admin.menu.addDrinks.form.description.label")}
                    </Label>
                    <Textarea
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      // onBlur={field.handleBlur}
                      placeholder={t(
                        "admin.menu.addDrinks.form.description.placeholder"
                      )}
                      className="min-h-[120px]"
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              />

              {/* Availability and Alcohol */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form.Field
                  name="isAvailable"
                  children={(field) => (
                    <div className="space-y-2 flex flex-col  justify-between rounded-lg border p-4">
                      <p className="text-xl font-semibold">
                        {t("admin.menu.addDrinks.form.available.title")}
                      </p>
                      <div className="flex justify-between items-center">
                        <p className="text-gray-600 text-md">
                          {t("admin.menu.addDrinks.form.available.subtitle")}
                        </p>
                        <Switch
                          className="hover:cursor-pointer "
                          checked={field.state.value}
                          onCheckedChange={(checked) =>
                            field.handleChange(checked)
                          }
                        />
                      </div>
                    </div>
                  )}
                />

                <form.Field
                  name="isAlcoholic"
                  children={(field) => (
                    <div className="space-y-0 flex flex-col justify-between rounded-lg border p-4">
                      <p className="text-xl font-semibold">
                        {t("admin.menu.addDrinks.form.alcoholic.title")}
                      </p>
                      <div className="flex justify-between items-center">
                        <p className="text-gray-600 text-md md:max-w-4/5 ">
                          {" "}
                          {t("admin.menu.addDrinks.form.alcoholic.subtitle")}
                        </p>

                        <Switch
                          className="hover:cursor-pointer "
                          checked={field.state.value}
                          onCheckedChange={(checked) =>
                            field.handleChange(checked)
                          }
                        />
                      </div>
                    </div>
                  )}
                />
              </div>
              <DrinkType
                categories={drinkTypesList ?? []}
                setData={setTagIds}
                data={tagIds}
              />
              {/* Variants */}
              <div className="space-y-4 ">
                <form.Field name="variants" mode="array">
                  {(field) => (
                    <div>
                      <div className="flex justify-between w-full mt-12">
                        <div className="flex items-center justify-between">
                          <h3 className="text-md font-medium">
                            {" "}
                            {t("admin.menu.addDrinks.variants.header.title")}
                          </h3>
                        </div>
                        <button
                          className="border border-gray-200 px-3 py-2 text-sm font-medium rounded-lg hover:cursor-pointer hover:bg-gray-100"
                          type="button"
                          onClick={() =>
                            field.pushValue({
                              price: 0,
                              unitId: "",
                              quantity: "",
                              isAvailable: true,
                            })
                          }
                        >
                         <p>➕ {t("admin.menu.addDrinks.variants.header.btn")}</p> 
                        </button>
                      </div>
                      {field.state.value.map((_, index) => {
                        return (
                          <Fragment key={index}>
                            <div className="border p-3 my-2  rounded grid grid-cols-1 md:grid-cols-2 gap-6">
                              <form.Field name={`variants[${index}].quantity`}>
                                {(subField) => (
                                  <div className="space-y-2">
                                    <InputComponent
                                      label={t(
                                        "admin.menu.addDrinks.variants.form.quantity"
                                      )}
                                      value={subField.state.value}
                                      // onBlur={subField.handleBlur}
                                      onChange={(e) =>
                                        subField.handleChange(e.target.value)
                                      }
                                      placeholder="0"
                                      type="number"
                                    />
                                    <FieldInfo field={subField} />
                                  </div>
                                )}
                              </form.Field>
                              <form.Field name={`variants[${index}].unitId`}>
                                {(subField) => (
                                  <div className="space-y-1">
                                    <p className="text-sm font-semibold text-gray-600">
                                      {t(
                                        "admin.menu.addDrinks.variants.form.unit"
                                      )}
                                    </p>
                                    <Select
                                      onValueChange={(value) =>
                                        subField.handleChange(value)
                                      }
                                      defaultValue={subField.state.value}
                                    >
                                      <SelectTrigger className="w-full py-7 hover:cursor-pointer">
                                        <SelectValue
                                          placeholder={t(
                                            "admin.menu.addDrinks.variants.form.unitPlaceholder"
                                          )}
                                        />
                                      </SelectTrigger>

                                      <SelectContent>
                                        {drinkUnits?.data.map((unit) => (
                                          <SelectItem
                                            key={unit.id}
                                            value={unit.id}
                                          >
                                            {unit.symbol}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FieldInfo field={subField} />
                                  </div>
                                )}
                              </form.Field>
                              <form.Field name={`variants[${index}].price`}>
                                {(subField) => (
                                  <div className="space-y-2">
                                    <InputComponent
                                      label={`${t(
                                        "admin.menu.addDrinks.variants.form.price"
                                      )} (${
                                        user?.currency?.symbol
                                      })`}
                                      type="number"
                                      value={subField.state.value}
                                      onChange={(e) =>
                                        subField.handleChange(
                                          e.target.valueAsNumber
                                        )
                                      }
                                      // onBlur={field.handleBlur}
                                      placeholder="0"
                                    />
                                    <FieldInfo field={subField} />
                                  </div>
                                )}
                              </form.Field>

                              <form.Field
                                name={`variants[${index}].isAvailable`}
                              >
                                {(subField) => (
                                  
                                 <div>

                               

<div className="space-y-0 flex flex-col justify-between rounded-lg border p-4">
                       <p className="text-lg font-semibold">
                                        {t(
                                          "admin.menu.addDrinks.variants.form.available"
                                        )}
                                      </p>
                      <div className="flex justify-between items-center">
                        <p className="text-gray-800 text-md capitalize">
                                        {t(
                                          "admin.menu.addDrinks.variants.form.availableSub"
                                        )}
                                      </p>

                        <Switch
                          className="hover:cursor-pointer "
                           checked={subField.state.value}
                           onCheckedChange={(checked) =>
                                        subField.handleChange(checked)
                                      }
                        />
                      </div>
                    </div>
                                    
                                 
                                   
                                    <FieldInfo field={subField} />
                                  </div>
                                )}
                              </form.Field>
                            </div>

                            {field.state.value.length > 1 && (
                              <div className="w-full mb-10 mt-3 justify-end flex">
                                <button
                                  type="button"
                                  onClick={() => field.removeValue(index)}
                                  className="bg-red-500 text-sm text-white flex items-center px-4 py-2.5 rounded-lg gap-3  "
                                >
                                  <Trash />
                                  {t(
                                    "admin.menu.addDrinks.variants.form.removeVariant"
                                  )}
                                </button>
                              </div>
                            )}
                          </Fragment>
                        );
                      })}
                    </div>
                  )}
                </form.Field>
              </div>
              <label className="block font-inter text-sm text-gray-600 font-medium mb-2 mt-10">
                {t("admin.menu.addDrinks.image.title")}
              </label>
              {/* Images */}
              <form.Field name="images" mode="array">
                {(field) => (
                  <div className="space-x-4 flex">
                    {/* Render each image preview from the field's array value */}
                    {field?.state?.value?.map((url: string, i: number) => (
                      <div
                        key={i}
                        className="relative w-32 lg:w-40 h-32 lg:h-40 border rounded-lg"
                      >
                        <img
                          src={mediaUrl + url}
                          alt={`Uploaded ${i}`}
                          className="w-full h-full object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => field.removeValue(i)}
                          className="absolute top-1 right-1  text-white rounded-full p-1"
                        >
                          <Trash2
                            color="red"
                            className="w-4 h-4 hover:cursor-pointer hover:w-5 hover:h-5"
                          />
                        </button>
                      </div>
                    ))}

                    {/* Upload button to add a new image */}
                    <div className="relative w-32 lg:w-40 h-32 lg:h-40 border rounded-lg overflow-hidden">
                      {/* Overlay text */}
                      <div className="absolute inset-0 bg-gray-100 z-10 flex flex-col items-center justify-center pointer-events-none">
                        <Upload />
                        <span className="text-gray-600 text-sm font-semibold  px-2 py-1 rounded">
                          {t("admin.menu.addDrinks.image.upload")}
                        </span>
                      </div>

                      {/* FileUpload component */}
                      <FileUpload
                        setKey={(url) => field.pushValue(url)}
                        folder="DrinksImage"
                      />
                    </div>
                  </div>
                )}
              </form.Field>
            </div>
            <div className="flex justify-end gap-4 pt-4">
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
                children={([canSubmit]) => {
                  return (
                    <>
                      <Button
                        loading={isPending}
                        type="submit"
                        disabled={!canSubmit || isPending}
                        className="bg-[#F7941D] hover:bg-amber-600 px-6 hover:cursor-pointer"
                      >
                        {t("admin.menu.addDrinks.saveBtn")}
                      </Button>
                    </>
                  );
                }}
              />
            </div>
          </form>
        </div>
      </div>
    </ScreenWrapper>
  );
}
