import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/input";
import { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { useAllergens } from "@/hooks/useFetchData";
interface Props {
  setData: Dispatch<SetStateAction<string[]>>;
  data: string[];
}
const Allergens = ({ data, setData }: Props) => {
  const { data: allergensData } = useAllergens();
  const { t } = useTranslation();

  const toggleDishType = (id: string) => {
    setData(
      (prev) =>
        prev.includes(id)
          ? prev.filter((typeId) => typeId !== id) // remove if already selected
          : [...prev, id] // add if not selected
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>{t("admin.menus.items.add.components.allergens.label")}</Label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
        {allergensData?.data?.map((item) => (
          <div
            key={item?.id}
            className="flex items-center space-x-2 capitalize"
          >
            <Checkbox
              id={item?.id}
              name={item?.name}
              checked={data?.includes(item?.id)}
              onCheckedChange={() => toggleDishType(item?.id)}
            />
            <Label
              htmlFor={item?.id}
              className="text-sm font-normal capitalize"
            >
              {item?.name}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Allergens;
