import { Button } from "@/components/ui/button";

import { renderMediaUrl } from "@/lib/utils";
// import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useAtom } from "jotai";
import { userAtom } from "@/atoms/user";
import { useTranslation } from "react-i18next";

interface Props {
  selectedDrink: Drink | undefined;
}

const PreviewDrink = ({ selectedDrink }: Props) => {
  const [user] = useAtom(userAtom);
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!selectedDrink) return null;

  const handleEdit = () => {
    navigate(`edit-drink/${selectedDrink.id}`);
  };
  return (
    <div className="flex flex-col w-full max-h-[80vh] overflow-y-auto">
      <div className="border rounded-xl relative w-full h-[320px]">
        <img
          src={renderMediaUrl(selectedDrink.images[0], "drink")}
          alt={selectedDrink?.name}
          className="w-full h-full rounded-xl object-cover aspect-square overflow-auto"
        />
      </div>

      <div className="py-3 flex flex-col gap-y-5 ">
      <div>
       <div className="flex justify-between items-start">
          <h2 className="text-xl font-medium">{selectedDrink.name}</h2>
          {/* <span className="text-lg font-semibold">${selectedDrink}</span> */}
        </div>
        <div>
          <h3 className="hidden text-sm font-medium text-muted-foreground mb-2">
            {t("admin.menu.drinks.previewDrink.description")}
          </h3>
          <p className="text-sm text-gray-400">{selectedDrink.description}</p>
        </div>
        {selectedDrink.tags && (
            <div className="mt-3 flex flex-wrap gap-1">
              {selectedDrink.tags?.map((tag) => (
                <div className="bg-gray-200 w-fit h-auto p-1 px-3 text-black text-xs rounded-sm capitalize" key={tag.id}>{tag?.name}</div>
              ))}
            </div>

        )}
      </div>
       

        {/* <Separator /> */}

        

        {selectedDrink.variants && (
          <div>
            <h3 className="text-md font-medium mt-3 mb-0">
              {t("admin.menu.drinks.previewDrink.variants")}
            </h3>
            <div className="mt-2 flex-wrap gap-1 grid">
              {selectedDrink.variants?.map((variant, index) => (
                <div key={index} className="flex items-center gap-1 text-muted-foreground text-sm">
                  <span className="bg-orange-400 rounded-full w-1.5 h-1.5" ></span> {variant.quantity} {variant.unitSymbol} -{" "}
                  <span className="font-medium text-sm">
                    {user?.currency?.symbol}
                    {variant.price}
                  </span>
                  {!variant?.available && (
                    <Badge className="ml-5 py-0" variant={"destructive"}>
                      {t("admin.menu.drinks.previewDrink.notAvailable")}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end ">
          <Button onClick={handleEdit} className="hover:cursor-pointer">
            {t("admin.menu.drinks.previewDrink.editDrink")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PreviewDrink;
