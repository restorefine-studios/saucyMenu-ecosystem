/* eslint-disable @typescript-eslint/no-explicit-any */
import { useStore, type ReactFormExtendedApi } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { FieldInfo, InputComponent, Label } from "@/components/ui/input";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";

interface DiscountManagerProps {
  form: ReactFormExtendedApi<any, any, any, any, any, any, any, any, any, any>;
}

// Helper function to format ISO datetime string to datetime-local format
const formatDateForInput = (dateString: string | undefined | null): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
};

// Helper function to convert datetime-local value to ISO string
const parseDateFromInput = (dateString: string): string | undefined => {
  if (!dateString || dateString.trim() === "") return undefined;
  try {
    // datetime-local format is YYYY-MM-DDTHH:mm
    // Convert to ISO format by creating a Date object and converting to ISO
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return undefined;
    return date.toISOString();
  } catch {
    return undefined;
  }
};

export function DiscountManager({ form }: DiscountManagerProps) {
  const { t } = useTranslation();
  const realtimeValues = useStore(form.store, (state) => state.values);
  const hasDiscount =
    realtimeValues.discountType !== undefined &&
    realtimeValues.discountType !== null;

  const handleRemoveDiscount = () => {
    form.setFieldValue("discountType", undefined);
    form.setFieldValue("discountValue", undefined);
    form.setFieldValue("discountStartAt", undefined);
    form.setFieldValue("discountEndAt", undefined);
    form.setFieldValue("discountLabel", undefined);
  };

  const handleAddDiscount = () => {
    form.setFieldValue("discountType", "percentage");
    form.setFieldValue("discountValue", "");
    form.setFieldValue("discountStartAt", "");
    form.setFieldValue("discountEndAt", "");
    form.setFieldValue("discountLabel", "");
  };

  if (!hasDiscount) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6">
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm font-medium text-foreground">
            {t("admin.menus.items.add.components.discount.empty.title")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("admin.menus.items.add.components.discount.empty.description")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddDiscount}
          >
            {t("admin.menus.items.add.components.discount.empty.button")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-8">
      <div className="flex items-center justify-between">
        <Label>{t("admin.menus.items.add.components.discount.title")}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRemoveDiscount}
          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4 rounded-lg bg-muted/50 p-4 grid grid-cols-2 gap-4">
        {/* Discount Label */}
        <form.Field
          name="discountLabel"
          children={(field) => (
            <div>
              <InputComponent
                label={t(
                  "admin.menus.items.add.components.discount.form.label.label"
                )}
                value={field.state.value || ""}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="mt-1.5"
              />
              <FieldInfo field={field} />
            </div>
          )}
        />

        {/* Discount Type */}
        <form.Field
          name="discountType"
          children={(field) => (
            <div className="grid w-full gap-2.5">
              <Label>
                {t("admin.menus.items.add.components.discount.form.type.label")}
              </Label>
              <Select
                value={field.state.value || ""}
                onValueChange={(value) => field.handleChange(value)}
              >
                <SelectTrigger className="py-7 bg-[#f8f8f8] indent-1.5 w-full">
                  <SelectValue
                    placeholder={t(
                      "admin.menus.items.add.components.discount.form.type.placeholder"
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">
                    {t(
                      "admin.menus.items.add.components.discount.form.type.percentage"
                    )}
                  </SelectItem>
                  <SelectItem value="fixed">
                    {t(
                      "admin.menus.items.add.components.discount.form.type.fixed"
                    )}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        />

        {/* Discount Value */}
        <form.Field
          name="discountValue"
          children={(field) => (
            <div>
              <InputComponent
                label={t(
                  "admin.menus.items.add.components.discount.form.value.label"
                )}
                value={field.state.value || 0}
                type="number"
                step="0.01"
                min="0"
                onChange={(e) => field.handleChange(parseFloat(e.target.value))}
                onBlur={field.handleBlur}
                className="mt-1.5"
              />
                { <FieldInfo field={field} />}
            </div>
          )}
        />

        {/* Discount Start Date */}
        <form.Field
          name="discountStartAt"
          children={(field) => (
            <div>
              <InputComponent
                label={t(
                  "admin.menus.items.add.components.discount.form.startDate.label"
                )}
                value={formatDateForInput(field.state.value)}
                type="datetime-local"
                onChange={(e) => {
                  const isoDate = parseDateFromInput(e.target.value);
                  field.handleChange(isoDate);
                }}
                onBlur={field.handleBlur}
                className="mt-1.5"
              />
              <FieldInfo field={field} />
            </div>
          )}
        />

        {/* Discount End Date */}
        <form.Field
          name="discountEndAt"
          children={(field) => (
            <div>
              <InputComponent
                label={t(
                  "admin.menus.items.add.components.discount.form.endDate.label"
                )}
                value={formatDateForInput(field.state.value)}
                type="datetime-local"
                onChange={(e) => {
                  const isoDate = parseDateFromInput(e.target.value);
                  field.handleChange(isoDate);
                }}
                onBlur={field.handleBlur}
                className="mt-1.5"
              />
              <FieldInfo field={field} />
            </div>
          )}
        />
      </div>
    </div>
  );
}
