/* eslint-disable @typescript-eslint/no-explicit-any */
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ReactFormExtendedApi } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";

interface Variant {
  id?: string;
  name: string;
  price: string | number;
  isAvailable: boolean;
}

interface VariantsManagerProps {
  form: ReactFormExtendedApi<any, any, any, any, any, any, any, any, any, any>;
}

export function VariantsManager({ form }: VariantsManagerProps) {
  const { t } = useTranslation();
  const variants: Variant[] = form.state.values.variants ?? [];

  const handleAddVariant = () => {
    const currentVariants: Variant[] = form.state.values.variants ?? [];
    form.setFieldValue("variants", [
      ...currentVariants,
      {
        id: Date.now().toString(),
        name: "",
        price: "",
        isAvailable: true,
      },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    const currentVariants: Variant[] = form.state.values.variants ?? [];
    form.setFieldValue(
      "variants",
      currentVariants.filter((_, i) => i !== index)
    );
  };

  return (
    <div className="space-y-6 rounded-lg bg-card mt-8">
      <div className="space-y-2">
        <Label>{t("admin.menus.items.add.components.variants.title")}</Label>
        <p className="text-sm text-muted-foreground">
          {t("admin.menus.items.add.components.variants.description")}
        </p>
      </div>

      <form.Field
        listeners={{
          onChange: ({ value }) => console.log(value),
        }}
        name="variants"
        mode="array"
      >
        {(field) => (
          <div>
            <div className="space-y-4">
              {field.state.value.map((variant: any, index: number) => (
                <VariantRow
                  key={variant.id}
                  index={index}
                  form={form}
                  onRemove={handleRemoveVariant}
                />
              ))}
            </div>
            {variants.length === 0 && (
              <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("admin.menus.items.add.components.variants.empty")}
                </p>
              </div>
            )}
          </div>
        )}
      </form.Field>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddVariant}
        className="w-full bg-transparent"
      >
        <Plus className="size-4" />
        {t("admin.menus.items.add.components.variants.button")}
      </Button>
    </div>
  );
}

interface VariantRowProps {
  index: number;
  form: {
    state: {
      values: {
        variants?: Variant[];
      };
    };
    setFieldValue: (field: string, value: any) => void;
  };
  onRemove: (index: number) => void;
}

function VariantRow({ index, form, onRemove }: VariantRowProps) {
  const { t } = useTranslation();
  const variants: Variant[] = form.state.values.variants ?? [];
  const variant = variants[index];

  if (!variant) return null;

  const handleNameChange = (value: string) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], name: value };
    form.setFieldValue("variants", updated);
  };

  const handlePriceChange = (value: string) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], price: value };
    form.setFieldValue("variants", updated);
  };

  const handleAvailabilityChange = (checked: boolean) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], isAvailable: checked };
    form.setFieldValue("variants", updated);
  };

  return (
    <div className="rounded-lg border border-border/50 bg-background p-4">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {t("admin.menus.items.add.components.variants.variant")} {index + 1}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          className="h-8 w-8"
        >
          <Trash2 className="size-4 text-destructive" />
          <span className="sr-only">
            {t("admin.menus.items.add.components.variants.remove")} {index + 1}
          </span>
        </Button>
      </div>

      <div className="space-y-4">
        {/* Variant Name Field */}
        <div>
          <label className="text-sm font-medium">
            {t("admin.menus.items.add.components.variants.form.name.label")}
          </label>
          <Input
            placeholder={t(
              "admin.menus.items.add.components.variants.form.name.placeholder"
            )}
            value={variant.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="mt-2"
          />
        </div>

        {/* Variant Price Field */}
        <div>
          <label className="text-sm font-medium">
            {t("admin.menus.items.add.components.variants.form.price.label")}
          </label>
          <div className="mt-2 flex items-center">
            <span className="text-sm text-muted-foreground">$</span>
            <Input
              type="number"
              step="0.01"
              placeholder={t(
                "admin.menus.items.add.components.variants.form.price.placeholder"
              )}
              value={variant.price}
              onChange={(e) => handlePriceChange(e.target.value)}
              className="ml-2"
            />
          </div>
        </div>

        {/* Availability Toggle */}
        <div className="flex flex-row items-center space-x-2">
          <Checkbox
            checked={variant.isAvailable}
            onCheckedChange={handleAvailabilityChange}
          />
          <label className="text-sm font-normal cursor-pointer">
            {t(
              "admin.menus.items.add.components.variants.form.available.label"
            )}
          </label>
        </div>
      </div>
    </div>
  );
}
