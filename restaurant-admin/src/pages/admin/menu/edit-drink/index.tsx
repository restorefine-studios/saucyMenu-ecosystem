/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { InputComponent } from "@/components/ui/input";
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
import { PlusCircle, Trash, Trash2, Upload } from "lucide-react";
import { axiosInstance, mediaUrl } from "@/lib/utils";

import {
  useDishTags,
  useDrinkUnits,
  useSpecificDrink,
} from "@/hooks/useFetchData";

import { useMutation } from "@tanstack/react-query";
import apiRoutes from "@/apiRoutes";
import { toast } from "sonner";
import { AxiosError } from "axios";
import Back from "@/components/back";
import DrinkType from "./drink-types";
import { useEffect, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";
import Spinner from "@/components/Spinner";
import Delete from "./deleteDrink";
import { useAtom } from "jotai";
import { userAtom } from "@/atoms/user";
import { useTranslation } from "react-i18next";

const formSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
  isAlcoholic: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  tagIds: z.array(z.string()).optional(),
  variants: z
    .array(
      z.object({
        price: z.number().optional(),
        unitId: z.string().uuid().optional(),
        quantity: z.string().optional(),
        isAvailable: z.boolean().optional(),
      })
    )

    .optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditDrink() {
  const [user] = useAtom(userAtom);
  const navigate = useNavigate();
  const { data: drinkUnits } = useDrinkUnits();
  const [tagIds, setTagIds] = useState<string[]>([]);
  const { data, isLoading } = useDishTags();
  const { t } = useTranslation();

  const { id } = useParams();

  const { data: drinkData } = useSpecificDrink(id);
  // console.log("fetched drink data:", drinkData);

  const form = useForm({
    defaultValues: drinkData
      ? {
          name: drinkData.data.name ?? "",
          description: drinkData.data.description ?? "",
          images: drinkData.data.images ?? [],
          isAlcoholic: drinkData.data.isAlcoholic ?? false,
          isAvailable: drinkData.data.isAvailable ?? false,
          tagIds: drinkData.data.tagIds ?? [],
          variants: drinkData.data.variants.map((variant) => ({
            price: Number(variant.price ?? 0),
            unitId: variant.unitId ?? "",
            quantity: variant.quantity ?? 0,
            isAvailable: variant.isAvailable ?? false,
          })),
        }
      : ({
          name: "",
          description: "",
          images: [],
          isAlcoholic: false,
          isAvailable: false,
          tagIds: [],
          variants: [
            {
              price: 0,
              unitId: "",
              quantity: "",
              isAvailable: false,
            },
          ],
        } as FormValues),
    validators: {
      onSubmit: formSchema,
      onChange: formSchema,
    },
    onSubmit: async ({ value }) => {
      mutate({
        ...value,
        tagIds,
      });
      form.reset();
    },
  });

  useEffect(() => {
    if (drinkData) {
      const initialTagIds =
        drinkData.data.tags?.map((tag: { tagId: string }) => tag.tagId) || [];
      setTagIds(initialTagIds);
      //   console.log("initial ids:", initialTagIds);
      //   console.log("tag ids:", initialTagIds);
    }
  }, [drinkData]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (formData: FormValues) => {
      const response = await axiosInstance.put(
        apiRoutes.editDrink(id),
        formData
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data?.message);
        navigate(-1);
      } else {
        toast.error(data?.message);
      }
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err?.response?.data?.message);
    },
  });

  const drinkTypesList = data?.data.filter(
    (item) => item.type === "drink_type"
  );

  console.log(form.state.values);

  if (!data || isLoading) return <Spinner />;

  return (
    <ScreenWrapper title={t("admin.menu.editDrink.header.header")}>
      <div className="container mx-auto">
        <div className=" mx-auto border-none">
          <div className="flex items-center justify-between">
            <Back title={t("admin.menu.editDrink.header.title")} />
            <Delete id={id ?? ""} />
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
                  children={(field) => (
                    <div className="space-y-2 ">
                      <InputComponent
                        label={t("admin.menu.editDrink.form.nameLabel")}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder={t(
                          "admin.menu.editDrink.form.namePlaceholder"
                        )}
                      />
                    </div>
                  )}
                />
              </div>

              <form.Field
                name="description"
                children={(field) => (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-600">
                      {t("admin.menu.editDrink.form.descriptionLabel")}
                    </p>
                    <Textarea
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder={t(
                        "admin.menu.editDrink.form.descriptionPlaceholder"
                      )}
                      className="min-h-[120px]"
                    />
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
                        {t("admin.menu.editDrink.form.available.label")}
                      </p>
                      <div className="flex justify-between items-center">
                        <p className="text-gray-600 text-md">
                          {t("admin.menu.editDrink.form.available.description")}
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
                    <div className="space-y-2 flex flex-col  justify-between rounded-lg border p-4">
                      <p className="text-xl font-semibold">
                        {t("admin.menu.editDrink.form.alcoholic.label")}
                      </p>
                      <div className="flex justify-between items-center">
                        <p className="text-gray-600 text-md">
                          {t("admin.menu.editDrink.form.alcoholic.description")}
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
                          <h3 className="text-xl font-medium">
                            {" "}
                            {t("admin.menu.editDrink.variants.header.title")}
                          </h3>
                        </div>
                          <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={() =>
                            field.pushValue({
                              price: 0,
                              unitId: "",
                              quantity: 0,
                              isAvailable: true,
                            })
                          }
        >
          <PlusCircle className="h-4 w-4" />
          {t("admin.menu.editDrink.variants.header.btn")}
        </Button>
                        
                      </div>
                      {field.state.value.map((_: any, index: number) => {
                        return (
                          <>
                            <div
                              key={index}
                              className="border p-3 my-2  rounded grid grid-cols-1 md:grid-cols-2 gap-6"
                            >
                              <form.Field name={`variants[${index}].quantity`}>
                                {(subField) => (
                                  <div className="space-y-2">
                                    <InputComponent
                                      label={t(
                                        "admin.menu.editDrink.variants.form.quantityLabel"
                                      )}
                                      value={subField.state.value}
                                      onChange={(e) =>
                                        subField.handleChange(e.target.value)
                                      }
                                      type="number"
                                      placeholder="0"
                                    />
                                  </div>
                                )}
                              </form.Field>
                              <form.Field name={`variants[${index}].unitId`}>
                                {(subField) => (
                                  <div className="space-y-2">
                                    <p className="text-sm font-semibold text-gray-600">
                                      {t(
                                        "admin.menu.editDrink.variants.form.unitLabel"
                                      )}
                                    </p>
                                    <Select
                                      onValueChange={(value) =>
                                        subField.handleChange(value)
                                      }
                                      defaultValue={subField.state.value}
                                    >
                                      <SelectTrigger className="w-full py-6 hover:cursor-pointer">
                                        <SelectValue placeholder="Select a unit" />
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
                                  </div>
                                )}
                              </form.Field>
                              <form.Field name={`variants[${index}].price`}>
                                {(subField) => (
                                  <div className="space-y-2">
                                    <InputComponent
                                      label={`${t(
                                        "admin.menu.editDrink.variants.form.priceLabel"
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
                                      placeholder="0"
                                    />
                                  </div>
                                )}
                              </form.Field>
                              <form.Field
                                name={`variants[${index}].isAvailable`}
                              >
                                {(subField) => (
                                  <div className="flex justify-between items-center border px-6 py-3 rounded-lg">
                                    <div className="flex flex-col">
                                      <p className="text-lg font-semibold">
                                        {t(
                                          "admin.menu.editDrink.variants.form.available.title"
                                        )}
                                      </p>
                                      <p className="text-gray-800 text-md">
                                        {t(
                                          "admin.menu.editDrink.variants.form.available.description"
                                        )}
                                      </p>
                                    </div>
                                    <Switch
                                      className="hover:cursor-pointer "
                                      checked={subField.state.value}
                                      onCheckedChange={(checked) =>
                                        subField.handleChange(checked)
                                      }
                                    />
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
                                  {t("admin.menu.editDrink.remove")}
                                </button>
                              </div>
                            )}
                          </>
                        );
                      })}
                    </div>
                  )}
                </form.Field>
              </div>
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
                          {t("admin.menu.editDrink.upload")}
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
              {/* <Button
                // className="bg-transparent border text-black border-gray-200"
                type="button"
                variant={"ghost"}
              >
                Cancel
              </Button> */}
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
                children={([canSubmit]) => {
                  console.log("can submit?", canSubmit);

                  return (
                    <>
                      <Button
                        loading={isPending}
                        type="submit"
                        className="bg-[#F7941D] hover:bg-amber-600 px-6 hover:cursor-pointer"
                      >
                        {t("admin.menu.editDrink.save")}
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
