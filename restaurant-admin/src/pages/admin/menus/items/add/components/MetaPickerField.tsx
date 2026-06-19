import { FieldConfig, useLookupOptions } from "@/hooks/useFetchData";
import { CheckboxGrid } from "./CheckboxGrid";
import { TagInput } from "./TagInput";

interface MetaPickerFieldProps {
  config: FieldConfig;
  value: string[];
  onChange: (value: string[]) => void;
  createAction?: React.ReactNode;
}

export function MetaPickerField({ config, value, onChange, createAction }: MetaPickerFieldProps) {
  if (!config.visible) return null;

  if (config.optionsSource.type === "freetext") {
    return <TagInput label={config.label} value={value} onChange={onChange} />;
  }

  const { data: options = [] } = useLookupOptions(config.optionsSource.endpoint);
  return (
    <CheckboxGrid
      label={config.label}
      options={options}
      value={value}
      onChange={onChange}
      headerAction={createAction}
    />
  );
}
