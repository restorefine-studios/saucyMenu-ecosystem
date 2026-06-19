/* eslint-disable @typescript-eslint/no-explicit-any */
import { FieldInfo, InputComponent, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ReactFormExtendedApi, useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { axiosInstance, mediaUrl } from "@/lib/utils";
import apiRoutes from "@/apiRoutes";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { FileUpload } from "@/components/file-upload";
import React, { useMemo, useState } from "react";
// import Category from "./components/category";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Back from "@/components/back";
// import Bulk from "./bulk";
import { useAtom } from "jotai";
import { userAtom } from "@/atoms/user";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMenusAndSections } from "../../hooks/use-menu";
import type { ClassifiedMenuItems } from "../../types";
import ScreenWrapper from "@/pages/admin/components/screenWrapper";
import { VariantsManager } from "./components/variants-manager";
import { DiscountManager } from "./components/discount-manager";
import { useFormFieldConfig } from "@/hooks/useFetchData";
import { MetaPickerField } from "./components/MetaPickerField";

function SwitchCard({
  title,
  subtitle,
  checked,
  onCheckedChange,
  field,
}: {
  title: string;
  subtitle: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  field?: React.ComponentProps<typeof FieldInfo>["field"];
}) {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-gray-200 bg-gray-50/50 p-4 transition-colors hover:border-gray-300">
      <Label className="text-base font-semibold">{title}</Label>
      <div className="flex justify-between items-center mt-2">
        <Label className="text-gray-600 text-xs">{subtitle}</Label>
        <Switch
          className="hover:cursor-pointer"
          checked={checked}
          onCheckedChange={onCheckedChange}
        />
      </div>
      {field && <FieldInfo field={field} />}
    </div>
  );
}

function Add() {
  const [user] = useAtom(userAtom);
  const { sectionId, menuId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: menusAndSectionsData } = useMenusAndSections();
  const menus = useMemo<ClassifiedMenuItems[]>(
    () => menusAndSectionsData?.data ?? [],
    [menusAndSectionsData?.data],
  );
  const selectedMenu = menuId
    ? menus.find((m) => m.id === menuId)
    : menus[0] ?? null;
  const sections = useMemo(
    () =>
      [...(selectedMenu?.sections ?? [])].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      ),
    [selectedMenu?.sections],
  );

  const addSchema = useMemo(
    () =>
      z.object({
    name: z
      .string()
      .min(1, { message: t("admin.menus.items.add.validation.name") }),
    description: z.string().optional(),
    price: z
      .number()
      .min(1, { message: t("admin.menus.items.add.validation.price") }),
    discountType: z.string().optional(),
    discountValue: z.number().optional(),
    discountStartAt: z.any().optional(),
    discountLabel: z.string().optional(),
    discountEndAt: z.any().optional(),
    images: z.array(z.string()),
    ingredients: z.array(
      z
        .string()
        .min(1, { message: t("admin.menus.items.add.validation.ingredients") }),
    ),
    cookTime: z.number().optional(),
    spiceLevel: z
      .enum(["mild", "medium", "spicy", "very_spicy", ""])
      .optional(),
    sectionId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    available: z.boolean().optional(),
    isChefsRecommended: z.boolean().optional(),
    isPopular: z.boolean().optional(),
    isNew: z.boolean().optional(),
    isLimitedTime: z.boolean().optional(),
    allergens: z.array(z.string()).optional(),
    addOns: z.array(z.string()).optional(),
    variants: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z
            .string()
            .min(1, { message: t("admin.menus.items.add.validation.name") }),
          price: z
            .number()
            .min(1, { message: t("admin.menus.items.add.validation.price") }),
          isAvailable: z.boolean(),
        }),
      )
      .optional(),
  }),
    [t],
  );

  type addValues = Partial<z.infer<typeof addSchema>>;

  const spiceLevelOptions = useMemo(
    () => [
      { value: "mild", label: t("admin.menu.addDish.form.spiceLevel.spiceLevels.mild.label") },
      { value: "medium", label: t("admin.menu.addDish.form.spiceLevel.spiceLevels.medium.label") },
      { value: "spicy", label: t("admin.menu.addDish.form.spiceLevel.spiceLevels.spicy.label") },
      { value: "very_spicy", label: t("admin.menu.addDish.form.spiceLevel.spiceLevels.verySpicy.label") },
    ],
    [t],
  );

  const [pickerValues, setPickerValues] = useState<Record<string, string[]>>({
    allergens: [],
    diets: [],
    addons: [],
    ingredients: [],
  });
  const { data: fieldConfigData } = useFormFieldConfig("dish_item");
  const sortedFields = useMemo(
    () =>
      [...(fieldConfigData?.fields ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [fieldConfigData?.fields],
  );
  const form = useForm({
    defaultValues: {
      name: "",
      available: true,
      description: "",
      sectionId: sectionId,
      images: [],
      ingredients: [],
      tags: [],
      allergens: [],
      addOns: [],
      isChefsRecommended: false,
      isPopular: false,
      isNew: false,
      isLimitedTime: false,
      variants: [],
      discountType: undefined,
      discountValue: undefined,
      discountStartAt: undefined,
      discountEndAt: undefined,
      discountLabel: undefined,
    } as addValues,
    validators: {
      onSubmit: addSchema,
    },
    onSubmit: async ({ value }) => {
      mutate({
        ...value,
        price: String(value.price ?? 0),
        ingredients: pickerValues.ingredients,
        tags: [...pickerValues.diets],
        allergens: pickerValues.allergens,
        addOns: pickerValues.addons,
        variants: value.variants?.map(
          (variant: {
            name?: string;
            price?: number;
            isAvailable?: boolean;
          }) => ({
            name: variant.name ?? "",
            price: String(variant.price ?? 0),
            isAvailable: variant.isAvailable ?? false,
          }),
        ),
        discountType: value.discountType,
        discountValue:
          value.discountValue !== undefined ? String(value.discountValue) : undefined,
        discountStartAt: value.discountStartAt,
        discountEndAt: value.discountEndAt,
        discountLabel: value.discountLabel,
      });
      setPickerValues({ allergens: [], diets: [], addons: [], ingredients: [] });
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (addData: Record<string, unknown>) => {
      const response = await axiosInstance.post(apiRoutes.menuItems, addData);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data?.message);
        form.reset();
        navigate(-1);
      } else {
        toast.error(data?.message);
      }
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err?.response?.data?.message);
    },
  });

  return (
    <ScreenWrapper title={t("admin.menu.addDish.title")}>
      <main>
        <div className="flex items-start justify-between gap-4">
          <Back title={t("admin.menu.addDish.topSide.title")} />
          <Button asChild>
            <Link to={`bulk`}>{t("admin.menu.addDish.topSide.btn")}</Link>
          </Button>
        </div>
        <hr className="my-6 border-gray-300" />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="mb-8">
          <label id="images-heading" className="block font-inter text-sm font-semibold text-gray-600 mb-3">
            {t("admin.menu.addDish.image.title")}
          </label>
          <form.Field name="images" mode="array">
            {(field) => (
              <FileUpload
                setKey={(url) => field.pushValue(url)}
                folder="FoodImage"
                images={form.state.values.images}
                removeImage={(index) => field.removeValue(index)}
                mediaUrl={mediaUrl}
              />
            )}
          </form.Field>
          </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-6">
            <form.Field
              name="name"
              validators={{
                onSubmit: addSchema.shape.name,
              }}
              children={(field) => (
                <div>
                  <InputComponent
                    label={t("admin.menu.addDish.form.name.label")}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={t("admin.menu.addDish.form.name.label")}
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            />
            <form.Field
              name="sectionId"
              children={(field) => (
                <div className="w-full">
                  <Label>{t("admin.menu.dishes.section", "Section")}</Label>
                  <Select
                    value={field.state.value ?? ""}
                    onValueChange={(val) => field.handleChange(val)}
                  >
                    <SelectTrigger className="w-full py-7 bg-[#f8f8f8] indent-1.5 mt-2">
                      <SelectValue
                        placeholder={t(
                          "admin.menu.dishes.sectionPlaceholder",
                          "Select section",
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((section) => (
                        <SelectItem
                          key={section.id}
                          value={section.id}
                          className="capitalize"
                        >
                          {section.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldInfo field={field} />
                </div>
              )}
            />
            <form.Field
              name="price"
              validators={{
                onSubmit: addSchema.shape.price,
              }}
              children={(field) => (
                <div>
                  <InputComponent
                    label={`${t("admin.menu.addDish.form.price.label")} (${
                      user?.currency?.symbol
                    })`}
                    value={field.state.value ?? ""}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const num = raw === "" ? undefined : parseFloat(raw);
                      field.handleChange(Number.isNaN(num) ? undefined : num);
                    }}
                    placeholder={t("admin.menu.addDish.form.price.placeholder")}
                    type="number"
                    step={0.01}
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            />
            <form.Field
              name="description"
              validators={{
                onSubmit: addSchema.shape.description,
              }}
              children={(field) => (
                <div>
                  <InputComponent
                    label={t("admin.menu.addDish.form.description.label")}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={t(
                      "admin.menu.addDish.form.description.placeholder",
                    )}
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            />
            <form.Field
              name="cookTime"
              validators={{
                onSubmit: addSchema.shape.cookTime,
              }}
              children={(field) => (
                <div>
                  <InputComponent
                    label={t("admin.menu.addDish.form.preparationTime.label")}
                    value={field.state.value ?? ""}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const num = raw === "" ? undefined : parseFloat(raw);
                      field.handleChange(Number.isNaN(num) ? undefined : num ?? 0);
                    }}
                    type="number"
                    placeholder={t(
                      "admin.menus.items.add.form.preparationTime.placeholder",
                    )}
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            />
            <form.Field
              name="spiceLevel"
              validators={{
                onSubmit: addSchema.shape.spiceLevel,
              }}
              children={(field) => (
                <div className="w-full">
                  <Label>{t("admin.menu.addDish.form.spiceLevel.label")}</Label>
                  <div className="flex items-center justify-center">
                    <Select
                      value={field.state.value}
                      onValueChange={(val) =>
                        field.handleChange(val as typeof field.state.value)
                      }
                    >
                      <SelectTrigger className="w-full py-7 bg-[#f8f8f8] indent-1.5">
                        <SelectValue
                          placeholder={t(
                            "admin.menu.addDish.form.spiceLevel.placeholder",
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {spiceLevelOptions.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.state.value && (
                      <button
                        onClick={() => field.handleChange("")}
                        className="text-sm text-red-500 hover:underline pl-2 "
                      >
                        {t("admin.menu.addDish.form.spiceLevel.clear")}
                      </button>
                    )}
                  </div>
                  <FieldInfo field={field} />
                </div>
              )}
            />
            <form.Field
              name="available"
              validators={{
                onSubmit: addSchema.shape.available,
              }}
              children={(field) => (
                <SwitchCard
                  title={t("admin.menu.addDish.form.available.title")}
                  subtitle={t("admin.menu.addDish.form.available.subtitle")}
                  checked={field.state.value}
                  onCheckedChange={(checked) => field.handleChange(checked)}
                  field={field}
                />
              )}
            />
          </div>
          <div className="mt-8">
            <DiscountManager
              form={
              form as unknown as ReactFormExtendedApi<
                any,
                any,
                any,
                any,
                any,
                any,
                any,
                any,
                any,
                any
              >
            }
            />
          </div>
          {/* <Category
            categories={dishTypes ?? []}
            setData={setTagIds}
            data={tagIds}
          /> */}

          <section className="mt-8" aria-labelledby="app-sections-heading">
            <Label id="app-sections-heading" className="text-base font-semibold mb-3 block">
              {t("admin.menus.items.add.appSections.title")}
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <form.Field
                name="isChefsRecommended"
                validators={{
                  onSubmit: addSchema.shape.isChefsRecommended,
                }}
                children={(field) => (
                  <SwitchCard
                    title={t(
                      "admin.menus.items.add.appSections.chefsRecommended.label",
                    )}
                    subtitle={t(
                      "admin.menus.items.add.appSections.chefsRecommended.subtitle",
                    )}
                    checked={field.state.value}
                    onCheckedChange={(checked) => field.handleChange(checked)}
                    field={field}
                  />
                )}
              />
              <form.Field
                name="isPopular"
                validators={{
                  onSubmit: addSchema.shape.isPopular,
                }}
                children={(field) => (
                  <SwitchCard
                    title={t("admin.menus.items.add.appSections.popular.label")}
                    subtitle={t(
                      "admin.menus.items.add.appSections.popular.subtitle",
                    )}
                    checked={field.state.value}
                    onCheckedChange={(checked) => field.handleChange(checked)}
                    field={field}
                  />
                )}
              />
              <form.Field
                name="isNew"
                validators={{
                  onSubmit: addSchema.shape.isNew,
                }}
                children={(field) => (
                  <SwitchCard
                    title={t("admin.menus.items.add.appSections.new.label")}
                    subtitle={t(
                      "admin.menus.items.add.appSections.new.subtitle",
                    )}
                    checked={field.state.value}
                    onCheckedChange={(checked) => field.handleChange(checked)}
                    field={field}
                  />
                )}
              />
              <form.Field
                name="isLimitedTime"
                validators={{
                  onSubmit: addSchema.shape.isLimitedTime,
                }}
                children={(field) => (
                  <SwitchCard
                    title="Limited Time"
                    subtitle="Show this item in the limited time spotlight carousel"
                    checked={field.state.value ?? false}
                    onCheckedChange={(checked) => field.handleChange(checked)}
                    field={field}
                  />
                )}
              />
            </div>
          </section>

          {sortedFields.map((fieldConfig) => (
            <div className="mt-8" key={fieldConfig.key}>
              <MetaPickerField
                config={fieldConfig}
                value={pickerValues[fieldConfig.key] ?? []}
                onChange={(v) =>
                  setPickerValues((prev) => ({ ...prev, [fieldConfig.key]: v }))
                }
              />
            </div>
          ))}
          <div className="mt-8">
            <VariantsManager
              form={
              form as unknown as ReactFormExtendedApi<
                any,
                any,
                any,
                any,
                any,
                any,
                any,
                any,
                any,
                any
              >
            }
            />
          </div>

          <div className="flex justify-end gap-4 pt-8 mt-8 border-t border-gray-200">
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
                      {t("admin.menu.addDish.saveBtn")}
                    </Button>
                  </>
                );
              }}
            />
          </div>
        </form>
      </main>
    </ScreenWrapper>
  );
}

export default Add;
