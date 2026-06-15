import apiRoutes from "@/apiRoutes";
import { axiosInstance } from "@/lib/utils";

import { useQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";

export const useRestaurant = (status?: string, search?: string) => {
  const [offset] = useQueryState("offset", {
    defaultValue: 0,
    parse: Number,
  });
  const fetchRestaurants = async () => {
    const res = await axiosInstance.get(apiRoutes.fetchRestaurant, {
      params: {
        status: status,
        search: search,
        offset
      },
    });
    return res.data;
  };
  return useQuery<RestaurantResponse>({
    queryKey: ["get_restaurants", status, search, offset],
    queryFn: fetchRestaurants,
  });
};

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

export const useSubscriptions = (search: string, plan: string) => {
  const getSubscriptions = async () => {
    const res = await axiosInstance.get(apiRoutes.fetchSubscriptions, {
      params: {
        plan: plan,
        search: search,
      },
    });
    return res.data;
  };
  return useQuery<Subs>({
    queryKey: ["subscriptions", plan, search],
    queryFn: getSubscriptions,
  });
};
