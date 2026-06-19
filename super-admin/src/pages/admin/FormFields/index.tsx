import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/utils";
import apiRoutes from "@/apiRoutes";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowDown, ArrowUp } from "lucide-react";

interface OptionsSource {
  type: "lookup" | "freetext";
  endpoint?: string;
}

interface FieldConfig {
  key: string;
  label: string;
  visible: boolean;
  required: boolean;
  sortOrder: number;
  optionsSource: OptionsSource;
}

const FORM_KEY = "dish_item";

function FormFields() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["super_form_field_config", FORM_KEY],
    queryFn: async () => {
      const res = await axiosInstance.get(apiRoutes.formConfig(FORM_KEY));
      return (res.data?.data ?? res.data) as { fields: FieldConfig[] };
    },
  });

  const [fields, setFields] = useState<FieldConfig[]>([]);

  useEffect(() => {
    if (data?.fields) {
      setFields([...data.fields].sort((a, b) => a.sortOrder - b.sortOrder));
    }
  }, [data?.fields]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: async (reorderedFields: FieldConfig[]) => {
      const payload = {
        fields: reorderedFields.map((f, i) => ({ ...f, sortOrder: i })),
      };
      const res = await axiosInstance.put(apiRoutes.formConfig(FORM_KEY), payload);
      return res.data;
    },
    onSuccess: (resData) => {
      if (resData.success) {
        toast.success(resData.data?.message ?? "Saved");
        queryClient.invalidateQueries({ queryKey: ["super_form_field_config", FORM_KEY] });
      } else {
        toast.error(resData.data?.message ?? "Failed to save");
      }
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err.response?.data?.message ?? "Failed to save");
    },
  });

  const moveUp = (index: number) => {
    if (index === 0) return;
    setFields((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index: number) => {
    setFields((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const updateField = (index: number, patch: Partial<FieldConfig>) => {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-bold mb-4">Dish Form Fields</h1>
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div
            key={field.key}
            className="flex items-center gap-4 border border-gray-200 rounded-lg p-4 bg-white"
          >
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => moveUp(index)}
                disabled={index === 0}
                className="disabled:opacity-30"
                aria-label={`Move ${field.key} up`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => moveDown(index)}
                disabled={index === fields.length - 1}
                className="disabled:opacity-30"
                aria-label={`Move ${field.key} down`}
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1">
              <Input
                value={field.label}
                onChange={(e) => updateField(index, { label: e.target.value })}
                className="mb-1"
              />
              <span className="text-xs text-gray-400">{field.key}</span>
            </div>
            <label className="flex items-center gap-2 text-sm">
              Visible
              <Checkbox
                checked={field.visible}
                onCheckedChange={(checked) => updateField(index, { visible: checked === true })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              Required
              <Checkbox
                checked={field.required}
                onCheckedChange={(checked) => updateField(index, { required: checked === true })}
              />
            </label>
          </div>
        ))}
      </div>
      <Button className="mt-6" loading={isPending} onClick={() => save(fields)}>
        Save
      </Button>
    </div>
  );
}

export default FormFields;
