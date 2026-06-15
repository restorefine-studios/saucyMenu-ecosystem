import { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useIngredients } from "@/hooks/useFetchData";
import { Modal } from "@/components/modal";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/utils";
import apiRoutes from "@/apiRoutes";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { useDebounceValue } from "usehooks-ts";
import { useTranslation } from "react-i18next";

function Ingredients({
  value = [],
  onChange,
}: {
  value?: string[];
  onChange?: (val: string[]) => void;
}) {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [debSearch] = useDebounceValue(searchQuery, 1500);

  const [tempSelected, setTempSelected] = useState<string[]>([]);

  const { data, refetch } = useIngredients(debSearch);

  const handleOpenModal = () => {
    setTempSelected([...value]);
    setIsModalOpen(true);
  };

  const toggleIngredient = (id: string) => {
    setTempSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const handleSaveSelections = () => {
    onChange?.(tempSelected);
    setIsModalOpen(false);
  };

  const removeIngredient = (id: string) => {
    const newVal = value.filter((item) => item !== id);
    onChange?.(newVal);
  };

  const getIngredientName = (id: string) => {
    return data?.data.find((ingredient) => ingredient.id === id)?.name || "";
  };

  const { mutate, isPending } = useMutation({
    mutationFn: async (ingredient: string) => {
      const response = await axiosInstance.post(apiRoutes.addIngredient, {
        name: ingredient,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success(t("admin.menus.items.add.components.ingredients.toast.success"));
      refetch();
      setSearchQuery("");
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err?.response?.data?.message);
    },
  });

  const { mutate: deleteMutate } = useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(
        apiRoutes.deleteIngredient(id)
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(t("admin.menus.items.add.components.ingredients.toast.deleteSuccess"));
        refetch();
      }
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err?.response?.data?.message);
    },
  });

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const showAddButton =
    normalizedQuery.length > 0 &&
    !data?.data.some(
      (ingredient) => ingredient.name.toLowerCase() === normalizedQuery
    );

  return (
    <>
      <Card
        className="w-full cursor-pointer hover:shadow-md transition-shadow py-12 bg-gray-100"
        onClick={handleOpenModal}
      >
        {/* <CardHeader>
          <CardTitle>Ingredients</CardTitle>
        </CardHeader> */}
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {value.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("admin.menus.items.add.components.ingredients.empty")}
              </p>
            ) : (
              value.map((id) => (
                <Badge
                  key={id}
                  variant="secondary"
                  className="flex items-center gap-1 bg-gray-200"
                >
                  {getIngredientName(id)}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeIngredient(id);
                    }}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">
                      {t("admin.menus.items.add.components.ingredients.modal.remove")} {getIngredientName(id)}
                    </span>
                  </Button>
                </Badge>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Modal
        open={isModalOpen}
        setOpen={setIsModalOpen}
        title={t("admin.menus.items.add.components.ingredients.modal.title")}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              {t("admin.menus.items.add.components.ingredients.modal.buttons.cancel")}
            </Button>
            <Button onClick={handleSaveSelections}>{t("admin.menus.items.add.components.ingredients.modal.buttons.done")}</Button>
          </>
        }
      >
        <div className="relative  mb-9 mt-3 flex gap-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t("admin.menus.items.add.components.ingredients.modal.search.placeholder")}
            className="pl-8 pr-12 w-2/3"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {showAddButton && (
            <Button
              size="sm"
              className=" hover:cursor-pointer"
              onClick={() => mutate(searchQuery)}
              loading={isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t("admin.menus.items.add.components.ingredients.modal.add")}
            </Button>
          )}
        </div>

        <div className="gap-4 grid md:grid-cols-3 lg:grid-cols-4">
          {data?.data.map((ingredient) => (
            <div key={ingredient.id} className="flex items-center space-x-2">
              <Checkbox
                id={`ingredient-${ingredient.id}`}
                checked={tempSelected.includes(ingredient.id)}
                onCheckedChange={() => toggleIngredient(ingredient.id)}
              />
              <label
                htmlFor={`ingredient-${ingredient.id}`}
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {ingredient.name}
              </label>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => deleteMutate(ingredient.id)}
              >
                <X className="h-4 w-4" color="red" />
              </Button>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}

export default Ingredients;
