import apiRoutes from "@/apiRoutes";
import { axiosInstance } from "@/lib/utils";
import {
  Classifications,
} from "@/pages/admin/menu/classifications/types";
import { useQuery } from "@tanstack/react-query";
import _ from "lodash";
import { useQueryState } from "nuqs";
import { useDebounceValue } from "usehooks-ts";

export const useSetup = () => {
  const getSetup = async () => {
    const res = await axiosInstance.get(apiRoutes.setup);
    return res.data;
  };
  return useQuery<Setup>({
    queryKey: ["get_setup"],
    queryFn: getSetup,
  });
};

export const useDish = (offset?: number, name?: string) => {
  const [dishType] = useQueryState("dishType");
  const [debName] = useDebounceValue(name, 1500);
  const getDish = async () => {
    const offsetValid = _.isEmpty(name) && { offset: offset }
    const res = await axiosInstance.get(apiRoutes.fetchDish, {
      params: {
        search: debName,
        tagIds: dishType,
        ...offsetValid
      },
    });
    return res.data;
  };
  return useQuery<Dish>({
    queryKey: ["get_dish", dishType, debName, offset],
    queryFn: getDish,
  });
};

export const useDrinks = (offset: number, name?: string) => {
  const [t] = useQueryState("tagId");
  const [debName] = useDebounceValue(name, 1500);
  const getDrinks = async () => {
    const res = await axiosInstance.get(apiRoutes.fetchDrinks, {
      params: {
        search: debName,
        offset: offset,
        tagIds: t,
      },
    });
    return res.data;
  };
  return useQuery<Drinks>({
    queryKey: ["drinks", debName, offset, t],
    queryFn: getDrinks,
  });
};

export const useMenuClassDishes = ({
  id,
  search,
}: {
  id: string;
  search: string;
}) => {
  const getDish = async () => {
    const res = await axiosInstance.get(apiRoutes.fetchDish, {
      params: {
        tagIds: id,
        operation: "notInArray",
        search,
      },
    });
    return res.data;
  };
  return useQuery<Dish>({
    queryKey: ["get_tag_dishes", search],
    queryFn: getDish,
    enabled: !!id,
  });
};

export const useMenuClassifications = () => {
  const getMenuClass = async () => {
    const res = await axiosInstance.get(apiRoutes.dishTags);
    return res.data;
  };
  return useQuery<MenuClass>({
    queryKey: ["get_dish_tags"],
    queryFn: getMenuClass,
  });
};

export const useClassficationCuisine = () => {
  const getCuisine = async () => {
    const res = await axiosInstance.get(apiRoutes.fetchMenuClassification);
    return res.data;
  };
  return useQuery<Classifications>({
    queryKey: ["get_classifications"],
    queryFn: getCuisine,
  });
};

export const useDishTags = () => {
  const getDishTags = async () => {
    const res = await axiosInstance.get(apiRoutes.dishTags);
    return res.data;
  };
  return useQuery<TagResponse>({
    queryKey: ["get_dish_tags"],
    queryFn: getDishTags,
  });
};

export const useAllergens = () => {
  const getAllergens = async () => {
    const res = await axiosInstance.get(apiRoutes.allegens);
    return res.data;
  };
  return useQuery<TagResponse>({
    queryKey: ["get_allergens"],
    queryFn: getAllergens,
  });
};

export const useDiets = () => {
  const getDiets = async () => {
    const res = await axiosInstance.get(apiRoutes.diets);
    return res.data;
  };
  return useQuery<TagResponse>({
    queryKey: ["get_diets"],
    queryFn: getDiets,
  });
};

export const useAddons = () => {
  const getAddons = async () => {
    const res = await axiosInstance.get(apiRoutes.addOns());
    return res.data;
  };
  return useQuery<TagResponse>({
    queryKey: ["get_addons"],
    queryFn: getAddons,
  });
};

// export const useDishTagItemData = (id: string) => {
//   const getData = async () => {
//     const res = await axiosInstance.get(apiRoutes.fetchDishTagItem(id));
//     return res.data;
//   };
//   return useQuery<ClassificationsItemResponse>({
//     queryKey: ["get__dish_tag_item", id],
//     queryFn: getData,
//   });
// };

// export const useDrinkTagItemData = (id: string) => {
//   const getData = async () => {
//     const res = await axiosInstance.get(apiRoutes.fetchDrinkTagItem(id));
//     return res.data;
//   };
//   return useQuery<ClassificationsItemResponse>({
//     queryKey: ["get__drink_tag_item", id],
//     queryFn: getData,
//   });
// };
export const useIngredients = (name: string) => {
  const getIngredients = async () => {
    const res = await axiosInstance.get(apiRoutes.fetchIngredients, {
      params: {
        search: name,
      },
    });
    return res.data;
  };
  return useQuery<IngredientsResponse>({
    queryKey: ["get_ingredients", name],
    queryFn: getIngredients,
  });
};

export const useReviews = () => {
  const [offset] = useQueryState('offset')
  const getReviews = async () => {
    const res = await axiosInstance.get(apiRoutes.fetchReviews, {
      params: {
        offset,
        limit: 4
      }
    });
    return res.data;
  };
  return useQuery<ReviewsResponse>({
    queryKey: ["get_reviews"],
    queryFn: getReviews,
  });
};

export const useAdminStats = () => {
  const getAdminStats = async () => {
    const res = await axiosInstance.get(apiRoutes.fetchAdminStats);
    return res.data;
  };
  return useQuery<AdminStats>({
    queryKey: ["admin_stats"],
    queryFn: getAdminStats,
  });
};

export const useFetchAdminLineChart = (startDate: string, endDate: string) => {
  const getAdminChart = async () => {
    const res = await axiosInstance.get(apiRoutes.fetchAdminLineChart, {
      params: { startDate, endDate },
    });
    return res.data;
  };

  return useQuery<Chart>({
    queryKey: ["admin_chart", startDate, endDate],
    queryFn: getAdminChart,
  });
};

export const useDrinkTypes = () => {
  const getDrinkTypes = async () => {
    const res = await axiosInstance.get(apiRoutes.fetchDrinkTypes);
    return res.data;
  };
  return useQuery({
    queryKey: ["drink_types"],
    queryFn: getDrinkTypes,
  });
};

export const useDrinkUnits = () => {
  const getDrinkUnits = async () => {
    const res = await axiosInstance.get(apiRoutes.fetchDrinkUnits);
    return res.data;
  };
  return useQuery<DrinkUnits>({
    queryKey: ["units"],
    queryFn: getDrinkUnits,
  });
};

export const useSpecificDish = (id: string | undefined) => {
  const getDish = async () => {
    const res = await axiosInstance.get(apiRoutes.fetchSpecificDish(id), {
      params: { id },
    });
    return res.data;
  };

  return useQuery({
    queryKey: ["dish", id],
    queryFn: getDish,
    enabled: !!id,
  });
};

export const useSpecificMenuItem = (id: string | undefined) => {
  const getMenuItem = async () => {
    const res = await axiosInstance.get(apiRoutes.fetchSpecificMenuItem(id), {
      params: { id },
    });
    return res.data;
  };
  return useQuery<APIResponse<DishData>>({
    queryKey: ["menuItem", id],
    queryFn: getMenuItem,
  });
};

export const useSpecificDrink = (id: string | undefined) => {
  const getDrink = async () => {
    const res = await axiosInstance.get(apiRoutes.fetchSpecificDrink(id), {
      params: { id },
    });
    return res.data;
  };

  return useQuery<OneDrinkResponse>({
    queryKey: ["drink", id],
    queryFn: getDrink,
    enabled: !!id,
  });
};

export const useAdminProfile = () => {
  const getAdminProfile = async () => {
    const res = await axiosInstance.get(apiRoutes.getAdminProfile);
    return res.data;
  };
  return useQuery<ProfileResponse>({
    queryKey: ["adminProfile"],
    queryFn: getAdminProfile,
  });
};
