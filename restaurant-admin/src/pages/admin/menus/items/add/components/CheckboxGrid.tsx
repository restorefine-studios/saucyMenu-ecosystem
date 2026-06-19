import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/input";

interface Option {
  id: string;
  name: string;
}

interface CheckboxGridProps {
  label: string;
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  headerAction?: React.ReactNode;
}

export function CheckboxGrid({
  label,
  options,
  value,
  onChange,
  headerAction,
}: CheckboxGridProps) {
  const toggle = (id: string) => {
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {headerAction}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
        {options.map((item) => (
          <div key={item.id} className="flex items-center space-x-2 capitalize">
            <Checkbox
              id={item.id}
              name={item.name}
              checked={value.includes(item.id)}
              onCheckedChange={() => toggle(item.id)}
            />
            <Label htmlFor={item.id} className="text-sm font-normal capitalize">
              {item.name}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
