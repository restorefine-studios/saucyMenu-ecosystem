import ScreenWrapper from "../../components/screenWrapper";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import Back from "@/components/back";
import Allergens from "./components/allergens";
import { useQueryState } from "nuqs";
import Diets from "./components/diets";
import AddOns from "./components/addons";
import CreateAddons from "./components/create-addons";
import CreateDiets from "./components/create-diets";
import { Card, CardContent } from "@/components/ui/card";

function Classifications() {
  const [activeType, setActiveType] = useQueryState("type", {
    defaultValue: "diet",
  });
  const [searchQuery, setSearchQuery] = useQueryState("search");
  const { t } = useTranslation();

  const types = ["diet", "addOns", "allergen"] as const;

  const addButtons = {
    addOns: <CreateAddons />,
    diet: <CreateDiets />,
    allergen: null,
  };

  const activeAddButton = addButtons[activeType as keyof typeof addButtons];

  const activeComponent = {
    diet: <Diets />,
    addOns: <AddOns />,
    allergen: <Allergens />,
  };

  return (
    <ScreenWrapper title={t("admin.menus.classifications.header.header") ?? ""}>
      <div className="space-y-6">
        {/* Header row: back + search + add button */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Back title={t("admin.menus.classifications.header.back")} />
          <div className="flex flex-1 sm:flex-initial items-center gap-3 max-w-md">
            <div className="relative flex-1 sm:w-64">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                value={searchQuery ?? ""}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-lg bg-muted/50 border-border focus-visible:ring-2"
                type="text"
                placeholder={t(
                  "admin.menus.classifications.search.placeholder",
                )}
              />
            </div>
            {activeAddButton}
          </div>
        </div>

        {/* Badge switcher: Diet | Add Ons | Allergen */}
        <div className="mt-6 w-fit h-auto flex gap-1">
          {types.map((type) => {
            const title = t(`admin.menus.classifications.card.title.${type}`);
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

        <div className="mt-6 capitalize cursor-pointer">
          <Card className="rounded-2xl border border-border/60 shadow-sm overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              {activeComponent[activeType as keyof typeof activeComponent]}
            </CardContent>
          </Card>
        </div>
      </div>
    </ScreenWrapper>
  );
}

export default Classifications;
