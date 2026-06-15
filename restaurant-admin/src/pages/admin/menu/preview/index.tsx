import { Button } from "@/components/ui/button";

import { renderMediaUrl } from "@/lib/utils";
// import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
// import { Badge } from "@/components/ui/badge";
import { useAtom } from "jotai";
import { userAtom } from "@/atoms/user";
import { useTranslation } from "react-i18next";

interface Props {
  selectedDish: DishData | undefined;
}

const PreviewDish = ({ selectedDish }: Props) => {
  const [user] = useAtom(userAtom);
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!selectedDish) return null;

  const handleEdit = () => {
    navigate(`/admin/menu/edit-dish/${selectedDish.id}`);
  };

  const diets = selectedDish?.tags.filter((tag) => tag.type === "diet");
  const dishType = selectedDish?.tags.filter((tag) => tag.type === "dish_type");
  const cuisine = selectedDish?.tags.filter((tag) => tag.type === "cuisine");
  return (
    <div className="flex flex-col w-full max-h-[80vh] overflow-y-auto p-0">
      <div className="border rounded-xl relative w-full h-[320px]">
        <img
          src={renderMediaUrl(selectedDish.images[0])}
          alt={selectedDish.name}
          className="w-full h-full rounded-xl object-cover aspect-square"
        />
      </div>

      <div className="py-3 flex flex-col gap-y-5 ">
        <div className="flex justify-between items-start">
          <div className="" >
          <h2 className="text-xl font-medium">{selectedDish.name}</h2>
          
          <h3 className="hidden text-sm font-medium text-gray-500 mt-0">
            {t("admin.menu.dishes.previewDish.description")}
          </h3>
          <p className="text-sm text-gray-400">{selectedDish.description}</p>
        </div>
          <span className="text-xl text-orange-500 font-medium">
            {user?.currency?.symbol} {selectedDish.price}
          </span>
        </div>
        
        {/* <Separator /> */}

        {diets.length > 0 && (
          <div className="flex flex-col items-start gap-0" >
            <h4 className="font-medium text-sm text-gray-600 mb-0">
              {t("admin.menu.dishes.previewDish.diet")}
            </h4>
        
              <div className="flex flex-wrap gap-1">
                {diets.map((tag) => (
                  <div className="bg-gray-200 w-fit h-auto p-1 px-3 text-black text-xs rounded-sm capitalize" key={tag.name}>{tag.name}</div>
                ))}
              </div>
          
          </div>
        )}
        {dishType.length > 0 && (
          <div className="flex flex-col items-start gap-0" >
            <h4 className="font-medium text-sm text-gray-600 mb-0">
              {t("admin.menu.dishes.previewDish.dishType")}
            </h4>
            <div>
              <div className="flex flex-wrap gap-1">
                {dishType.map((tag) => (
                  <div className="bg-gray-200 w-fit h-auto p-1 px-3 text-black text-xs rounded-sm capitalize" key={tag.name}>{tag.name}</div>
                ))}
              </div>
            </div>
          </div>
        )}
        {cuisine.length > 0 && (
           <div className="flex flex-col items-start gap-0" >
            <h4 className="font-medium text-sm text-gray-600 mb-0">
              {t("admin.menu.dishes.previewDish.cuisine")}
            </h4>
            <div>
              <div className="flex flex-wrap gap-1">
                {cuisine.map((tag) => (
                  <div className="bg-gray-200 w-fit h-auto p-1 px-3 text-black text-xs rounded-sm capitalize" key={tag.name}>{tag.name}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedDish.ingredients &&
          selectedDish.ingredients.filter((i) => i.trim() !== "").length >
            0 && (
           <div className="flex flex-col items-start gap-0" >
              <h4 className="font-medium text-sm text-gray-600 mb-0">
                {t("admin.menu.dishes.previewDish.ingredients")}
              </h4>
              <div className="flex flex-wrap gap-1">
                {selectedDish.ingredients.map((ingredient) => (
                  <div className="bg-gray-200 w-fit h-auto p-1 px-3 text-black text-xs rounded-sm capitalize" key={ingredient}>{ingredient}</div>
                ))}
              </div>
            </div>
          )}
        <div className="flex justify-end ">
          <Button onClick={handleEdit} className="hover:cursor-pointer">
            {t("admin.menu.dishes.previewDish.editDish")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PreviewDish;
