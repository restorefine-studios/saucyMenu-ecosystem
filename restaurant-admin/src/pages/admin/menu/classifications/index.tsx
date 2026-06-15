import ScreenWrapper from "../../components/screenWrapper";
import { Plus, Search } from "lucide-react";
import { useDishTags } from "@/hooks/useFetchData";
import EditClassificationItem from "./components/edit-classification-item";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import AddClassificationItem from "./components/add-classification-item";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import Back from "@/components/back";

function Classifications() {
  const { data, isLoading } = useDishTags();
  const [openAdd, setOpenAdd] = useState(false);
  const [activeType, setActiveType] = useState("cuisine");
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();

  const cuisines = data?.data.filter((item) => item.type === "cuisine");
  const diets = data?.data.filter((item) => item.type === "diet");
  const dishTypes = data?.data.filter((item) => item.type === "dish_type");
  const drinkTypes = data?.data.filter((item) => item.type === "drink_type");
  const allergens = data?.data.filter((item) => item.type === "allergen");

  const types = ["cuisine", "diet", "addOns", "allergen", "drinkType"];
  const typeData = {
    cuisine: cuisines,
    diet: diets,
    addOns: dishTypes,
    allergen: allergens,
    drinkType: drinkTypes,
  };
  const activeData = typeData[activeType as keyof typeof typeData] || [];
  const filteredData = activeData.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const options = {
    cuisine: {
      title: t("admin.menu.menuClassifications.card.title.cuisine"),
      description: t("admin.menu.menuClassifications.card.description"),
    },
    diet: {
      title: t("admin.menu.menuClassifications.card.title.diet"),
      description: t("admin.menu.menuClassifications.card.description"),
    },
    addOns: {
      title: t("admin.menu.menuClassifications.card.title.addOns"),
      description: t("admin.menu.menuClassifications.card.description"),
    },
    allergen: {
      title: t("admin.menu.menuClassifications.card.title.allergen"),
      description: t("admin.menu.menuClassifications.card.description"),
    },
    drinkType: {
      title: t("admin.menu.menuClassifications.card.title.drinkType"),
      description: t("admin.menu.menuClassifications.card.description"),
    },
  };

  const activeOption = options[activeType as keyof typeof options];

  return (
    <ScreenWrapper
      title={t("admin.menu.menuClassifications.header.header")}
      loading={isLoading}
    >
      <>
        <div className="flex items-center justify-between ">
         <Back title="Menu Classifications" />
          <div className="flex gap-2.5">
            <Button onClick={() => setOpenAdd(true)}>
              <Plus /> {t("admin.menu.menuClassifications.header.btn")}
            </Button>
          </div>
        </div>
        <hr className="mb-6 mt-4 border-gray-300" />
        <div className="w-fit h-auto flex gap-1">
          {types.map(type => {
            const title = t(`admin.menu.menuClassifications.card.title.${type}`);
            return (
              <Badge
                key={type}
                onClick={() => setActiveType(type)}
                className={`px-5 py-2.5 cursor-pointer transition whitespace-nowrap capitalize ${
                  activeType === type
                    ? "bg-black text-white hover:bg-black rounded-full"
                    : "border bg-black/5 hover:bg-gray-200 text-black rounded-full"
                }`}
              >
                {title}
              </Badge>
            );
          })}
        </div>
        <div className="hidden mt-4">
          <h1 className="text-xl font-medium">{activeOption.title}</h1>
          <p className="text-gray-500 text-xs">
            {t("admin.menu.menuClassifications.card.description")}
          </p>
        </div>
        <div className="mt-8 pl-4 pr-10 border border-gray-300 rounded-full flex items-center">
          <Search size={18} className="items-center border-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-none focus:outline-none focus:ring-0 h-12"
            type="text"
            placeholder="Search classifications"
          />
        </div>
        <div className="mt-6 grid grid-cols-4 gap-4">
          {filteredData.map((item) => (
            <EditClassificationItem
              key={item.id}
              itemKey={activeType === "addOns" ? "dish-types" : activeType === "drinkType" ? "drink-types" : activeType + "s"}
              item={item}
            />
          ))}
        </div>
      </>
      <AddClassificationItem open={openAdd} setOpen={setOpenAdd} />
    </ScreenWrapper>
  );
}

export default Classifications;