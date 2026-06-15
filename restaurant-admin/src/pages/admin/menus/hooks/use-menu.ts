import apiRoutes from "@/apiRoutes";
import { axiosInstance } from "@/lib/utils";
import { Menu, MenuSection, MenuData, ClassifiedMenuItems } from "@/pages/admin/menus/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { useDebounceValue } from "usehooks-ts";

export const useMenu = () => {
    const getMenus = async () => {
        const res = await axiosInstance.get(apiRoutes.menus);
        return res.data;
    };
    return useQuery<Menu>({
        queryKey: ["menus"],
        queryFn: getMenus,
    });
};

export const useMenuSections = (menuId: string) => {
    const getMenuSections = async () => {
        const res = await axiosInstance.get(apiRoutes.menuSections(menuId));
        return res.data;
    };
    return useQuery<APIResponse<MenuSection[]>>({
        queryKey: ["menuSections", menuId],
        queryFn: getMenuSections,
        enabled: !!menuId, // this is to prevent the query from running if the menuId is not provided
    });
};

export const useMenuItems = (sectionId: string, searchQuery?: string) => {
    // const [sId] = useQueryState("sectionId", {
    //     defaultValue: sectionId,
    // });
    const [offset] = useQueryState("offset")
    const [debSearchQuery] = useDebounceValue(searchQuery, 1000);
    const hasSectionId = sectionId && { sectionId: sectionId }
    const getMenuItems = async () => {
        const res = await axiosInstance.get(apiRoutes.menuItems, {
            params: {
                ...hasSectionId,
                search: debSearchQuery,
                offset: offset,
            },
        });
        return res.data;
    };
    return useQuery({
        queryKey: ["menuItems", sectionId, debSearchQuery, offset],
        queryFn: getMenuItems,
        // enabled: !!sectionId,
    });
};

export const useMenusAndSections = () => {
    const getMenusAndSections = async () => {
        const res = await axiosInstance.get(apiRoutes.menusAndSections);
        return res.data;
    };
    return useQuery<APIResponse<ClassifiedMenuItems[]>>({
        queryKey: ["menusAndSections"],
        queryFn: getMenusAndSections,
    });
};

export const useEditMenu = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<MenuData> }) => {
            const res = await axiosInstance.put(apiRoutes.editMenu(id), data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["menus"] });
        },
    });
};

export const useDeleteMenu = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await axiosInstance.delete(apiRoutes.deleteMenu(id));
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["menus"] });
        },
        onError: (error) => {
            console.error("Delete menu error:", error);
        },
    });
};