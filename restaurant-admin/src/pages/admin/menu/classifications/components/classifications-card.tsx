import { ClassificationsItem } from "../types";
import EditClassificationItem from "./edit-classification-item";
import { useTranslation } from "react-i18next";

interface Props {
  title: "cuisine" | "diet" | "dishType" | "drinkType" | "allergen";
  data: ClassificationsItem[] | undefined;
}

const ClassificationCard = ({ data, title }: Props) => {
  const { t } = useTranslation();
  const options = {
    cuisine: {
      title: t("admin.menu.menuClassifications.card.title.cuisine"),
      description: t("admin.menu.menuClassifications.card.subTitle"),
      key: "cuisines",
    },
    diet: {
      title: t("admin.menu.menuClassifications.card.title.diet"),
      description: t("admin.menu.menuClassifications.card.subTitle"),
      key: "diets",
    },
    allergen: {
      title: t("admin.menu.menuClassifications.card.title.allergen"),
      description: t("admin.menu.menuClassifications.card.subTitle"),
      key: "allergens",
    },
    dishType: {
      title: t("admin.menu.menuClassifications.card.title.dishType"),
      description: t("admin.menu.menuClassifications.card.subTitle"),
      key: "dish-types",
    },
    drinkType: {
      title: t("admin.menu.menuClassifications.card.title.drinkType"),
      description: t("admin.menu.menuClassifications.card.subTitleDrink"),
      key: "drink-types",
    },
  };

  const activeOption = options[title];

  return (
    <>
      <div className="bg-gray-100 p-8 rounded-2xl">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h1 className="text-xl font-medium">{activeOption.title}</h1>
            <p className="text-gray-500 text-xs">
              {t("admin.menu.menuClassifications.card.description")}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-300 pt-4">
          <div className=" gap-y-4 grid grid-cols-1 lg:grid-cols-3">
            {data?.map((item) => (
              <EditClassificationItem
                itemKey={activeOption.key}
                item={item}
                key={item?.id}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default ClassificationCard;
