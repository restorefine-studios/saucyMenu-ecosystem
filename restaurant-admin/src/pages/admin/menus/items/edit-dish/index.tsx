/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import {
  DEFAULT_DISH_ITEM_FIELDS,
  useFormFieldConfig,
  useSpecificMenuItem,
} from "@/hooks/useFetchData";
import { MetaPickerField } from "../add/components/MetaPickerField";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Back from "@/components/back";
import Delete from "./delete";
import { userAtom } from "@/atoms/user";
import { useAtom } from "jotai";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import ScreenWrapper from "@/pages/admin/components/screenWrapper";
import { VariantsManager } from "../add/components/variants-manager";
import { DiscountManager } from "../add/components/discount-manager";
import { useMenusAndSections } from "../../hooks/use-menu";
import type { ClassifiedMenuItems } from "../../types";

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

function EditItems() {
  // const { sectionId } = useParams();
  const navigate = useNavigate();
  const [user] = useAtom(userAtom);
  const { id } = useParams();
  const { t } = useTranslation();

  const editchema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .min(1, { message: t("admin.menus.items.edit.validation.name") })
          .optional(),
        description: z.string().optional(),
        sectionId: z.string().optional(),
        price: z.number().optional(),
        images: z.array(z.string()).optional(),
        ingredients: z.array(z.string()).optional(),
        cookTime: z.number().optional(),
        spiceLevel: z.string().optional(),
        available: z.boolean().optional(),
        isChefsRecommended: z.boolean().optional(),
        isPopular: z.boolean().optional(),
        isNew: z.boolean().optional(),
        isLimitedTime: z.boolean().optional(),
        allergens: z.array(z.string()).optional(),
        addOns: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        variants: z
          .array(
            z.object({
              price: z.string().optional(),
              isAvailable: z.boolean().optional(),
              name: z.string().optional(),
            }),
          )
          .optional(),
        discountType: z.string().optional(),
        discountValue: z.number().optional(),
        discountStartAt: z.any().optional(),
        discountEndAt: z.any().optional(),
        discountLabel: z.string().optional(),
      }),
    [t],
  );

  type editValues = z.infer<typeof editchema>;

  const spiceLevelOptions = useMemo(
    () => [
      {
        value: "mild",
        label: t(
          "admin.menu.editDish.variants.form.spiceLevel.spiceLevels.mild.label",
        ),
      },
      {
        value: "medium",
        label: t(
          "admin.menu.editDish.variants.form.spiceLevel.spiceLevels.medium.label",
        ),
      },
      {
        value: "spicy",
        label: t(
          "admin.menu.editDish.variants.form.spiceLevel.spiceLevels.spicy.label",
        ),
      },
      {
        value: "very_spicy",
        label: t(
          "admin.menu.editDish.variants.form.spiceLevel.spiceLevels.verySpicy.label",
        ),
      },
    ],
    [t],
  );

  const { data: menuItemData } = useSpecificMenuItem(id);
  const { data: menusAndSectionsData } = useMenusAndSections();
  const menus = useMemo<ClassifiedMenuItems[]>(
    () => menusAndSectionsData?.data ?? [],
    [menusAndSectionsData?.data],
  );
  const dishData = menuItemData?.data;
  const menuContainingSection = useMemo(
    () =>
      dishData?.sectionId
        ? menus.find((m) =>
            m.sections?.some((s) => s.id === dishData.sectionId),
          )
        : null,
    [menus, dishData?.sectionId],
  );
  const sections = useMemo(
    () =>
      [...(menuContainingSection?.sections ?? [])].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      ),
    [menuContainingSection?.sections],
  );

  const [pickerValues, setPickerValues] = useState<Record<string, string[]>>({
    allergens: [],
    diets: [],
    addons: [],
    ingredients: [],
  });
  const { data: fieldConfigData, isError: fieldConfigErrored } = useFormFieldConfig("dish_item");
  const sortedFields = useMemo(
    () =>
      [...(fieldConfigData?.fields ?? (fieldConfigErrored ? DEFAULT_DISH_ITEM_FIELDS : []))].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      ),
    [fieldConfigData?.fields, fieldConfigErrored],
  );
  const form = useForm({
    defaultValues: dishData
      ? {
          name: dishData.name ?? "",
          price: Number(dishData.price),
          cookTime: dishData.cookTime ?? 0,
          description: dishData.description ?? "",
          sectionId: dishData.sectionId ?? "",
          images: dishData.images ?? [],
          ingredients: dishData.ingredients ?? [],
          spiceLevel: dishData.spiceLevel ?? undefined,
          available: dishData.isAvailable ?? false,
          isChefsRecommended: dishData.isChefsRecommended ?? false,
          isPopular: dishData.isPopular ?? false,
          isNew: dishData.isNew ?? false,
          isLimitedTime: dishData.isLimitedTime ?? false,
          // allergens: dishData.allergens ?? [],
          // tags: dishData?.tags ?? [],
          variants: dishData.variants ?? [],
          discountType: dishData.discountType ?? undefined,
          discountValue: dishData.discountValue
            ? Number(dishData.discountValue)
            : undefined,
          discountStartAt: dishData.discountStartAt ?? undefined,
          discountEndAt: dishData.discountEndAt ?? undefined,
        }
      : ({
          name: "",
          price: 0,
          cookTime: 0,
          description: "",
          images: [],
          ingredients: [],
          spiceLevel: undefined,
          isChefsRecommended: false,
          isPopular: false,
          isNew: false,
          // allergens: [],
          // tags: [],
          variants: [],
          discountType: undefined,
          discountValue: undefined,
          discountStartAt: undefined,
          discountEndAt: undefined,
        sectionId: "",
        } as editValues),
    validators: {
      onSubmit: editchema,
      onChange: editchema,
    },
    onSubmit: async ({ value }) => {
      mutate({
        ...value,
        price: String(value.price ?? 0),
        ingredients: pickerValues.ingredients,
        // sectionId: sectionId,
        allergens: pickerValues.allergens,
        spiceLevel: value.spiceLevel,
        addOns: pickerValues.addons,
        tags: pickerValues.diets,
        available: value.available,
        isChefsRecommended: value.isChefsRecommended,
        isPopular: value.isPopular,
        isNew: value.isNew,
        isLimitedTime: value.isLimitedTime,
        discountType: value.discountType,
        discountValue:
          value.discountValue !== undefined ? String(value.discountValue) : undefined,
        discountStartAt: value.discountStartAt ? new Date(value.discountStartAt).toISOString() : undefined  ,
        discountEndAt: value.discountEndAt ? new Date(value.discountEndAt).toISOString() : undefined,
        variants: value.variants?.map(
          (variant: {
            name?: string;
            price?: string | number;
            isAvailable?: boolean;
          }) => ({
            price: variant.price ? String(variant.price) : undefined,
            isAvailable: variant.isAvailable ?? false,
            name: variant.name ?? "",
          })
        ),
      });
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (editData: Record<string, unknown>) => {
      const response = await axiosInstance.put(
        apiRoutes.editMenuItem(id),
        editData
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

  useEffect(() => {
    if (dishData) {
      setPickerValues({
        ingredients: dishData?.ingredients ?? [],
        diets: dishData?.tags?.map((tag: { id: string }) => tag.id) ?? [],
        allergens:
          dishData?.allergens?.map((allergen: { id: string }) => allergen.id) ??
          [],
        addons: dishData?.addOns?.map((addon: { id: string }) => addon.id) ?? [],
      });
      form.setFieldValue("variants", dishData?.variants ?? []);
      form.setFieldValue("name", dishData?.name ?? "");
      form.setFieldValue("price", Number(dishData?.price));
      form.setFieldValue("cookTime", dishData?.cookTime ?? 0);
      form.setFieldValue("description", dishData?.description ?? "");
      form.setFieldValue("images", dishData?.images ?? []);
      form.setFieldValue("ingredients", dishData?.ingredients ?? []);
      form.setFieldValue("spiceLevel", dishData?.spiceLevel as any);
      form.setFieldValue("available", dishData?.isAvailable ?? false);
      form.setFieldValue(
        "isChefsRecommended",
        dishData?.isChefsRecommended ?? false
      );
      form.setFieldValue("isPopular", dishData?.isPopular ?? false);
      form.setFieldValue("isNew", dishData?.isNew ?? false);
      form.setFieldValue("sectionId", dishData?.sectionId ?? "");
      form.setFieldValue(
        "discountValue",
        dishData?.discountValue ? Number(dishData.discountValue) : undefined,
      );
      form.setFieldValue("discountType", dishData?.discountType ?? undefined);
    }
  }, [dishData, form]);

  return (
    <ScreenWrapper title={t("admin.menu.editDish.header.header")}>
      <main>
        <div className="flex items-center justify-between gap-4">
          <Back title={t("admin.menu.editDish.header.title")} />
          <Delete id={id ?? ""} />
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
          <label id="edit-images-heading" className="block font-inter text-sm font-semibold text-gray-600 mb-3">
            {t("admin.menu.editDish.variants.image.title")}
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

                    <div className="capitalize grid grid-cols-1 lg:grid-cols-2 gap-8 py-6">
            <form.Field
              name="name"
              children={(field) => (
                <div>
                <InputComponent
                  label={t("admin.menu.editDish.form.nameLabel")}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={t("admin.menu.editDish.form.namePlaceholder")}
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
              children={(field) => (
                <div>
                <InputComponent
                  label={`${t("admin.menu.editDish.form.priceLabel")} (${
                    user?.currency?.symbol
                  })`}
                  value={field.state.value ?? ""}
                  type="number"
                  onChange={(e) => {
                    const raw = e.target.value;
                    const num = raw === "" ? undefined : parseFloat(raw);
                    field.handleChange(Number.isNaN(num) ? undefined : num);
                  }}
                  placeholder={t("admin.menu.editDish.form.pricePlaceholder")}
                  step={0.01}
                />
                <FieldInfo field={field} />
                </div>
              )}
            />
            <form.Field
              name="description"
              children={(field) => (
                <div>
                <InputComponent
                  label={t("admin.menu.editDish.form.descriptionLabel")}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={t(
                    "admin.menu.editDish.form.descriptionPlaceholder"
                  )}
                />
                <FieldInfo field={field} />
                </div>
              )}
            />
            <form.Field
              name="cookTime"
              children={(field) => (
                <div>
                <InputComponent
                  label={t("admin.menu.editDish.form.preparationLabel")}
                  value={field.state.value ?? ""}
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
              children={(field) => (
                <div>
                  <Label>
                    {t("admin.menu.editDish.variants.form.spiceLevel.label")}
                  </Label>
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
                            "admin.menu.editDish.variants.form.spiceLevel.placeholder"
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
                        {t(
                          "admin.menu.editDish.variants.form.spiceLevel.clear"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            />
            <form.Field
              name="available"
              children={(field) => (
                <SwitchCard
                  title={t("admin.menu.editDish.variants.form.available.title")}
                  subtitle={t(
                    "admin.menu.editDish.variants.form.available.subtitle",
                  )}
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
                > as any
              }
            />
          </div>

          <section className="mt-8" aria-labelledby="edit-app-sections-heading">
            <Label id="edit-app-sections-heading" className="text-base font-semibold mb-3 block">
              {t("admin.menus.items.edit.appSections.title")}
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <form.Field
                name="isChefsRecommended"
                children={(field) => (
                  <SwitchCard
                    title={t(
                      "admin.menus.items.edit.appSections.chefsRecommended.label",
                    )}
                    subtitle={t(
                      "admin.menus.items.edit.appSections.chefsRecommended.subtitle",
                    )}
                    checked={field.state.value}
                    onCheckedChange={(checked) => field.handleChange(checked)}
                    field={field}
                  />
                )}
              />
              <form.Field
                name="isPopular"
                children={(field) => (
                  <SwitchCard
                    title={t(
                      "admin.menus.items.edit.appSections.popular.label",
                    )}
                    subtitle={t(
                      "admin.menus.items.edit.appSections.popular.subtitle",
                    )}
                    checked={field.state.value}
                    onCheckedChange={(checked) => field.handleChange(checked)}
                    field={field}
                  />
                )}
              />
              <form.Field
                name="isNew"
                children={(field) => (
                  <SwitchCard
                    title={t("admin.menus.items.edit.appSections.new.label")}
                    subtitle={t(
                      "admin.menus.items.edit.appSections.new.subtitle",
                    )}
                    checked={field.state.value}
                    onCheckedChange={(checked) => field.handleChange(checked)}
                    field={field}
                  />
                )}
              />
              <form.Field
                name="isLimitedTime"
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
            <Button
              className="bg-transparent border text-black border-gray-200"
              type="button"
            >
              {t("admin.menu.editDish.cancel")}
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit]) => {
                // console.log(canSubmit)
                return (
                  <>
                    <Button
                      loading={isPending}
                      type="submit"
                      disabled={!canSubmit || isPending}
                      className="bg-[#F7941D] hover:bg-amber-600 px-6 hover:cursor-pointer"
                    >
                      {t("admin.menu.editDish.save")}
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

export default EditItems;
