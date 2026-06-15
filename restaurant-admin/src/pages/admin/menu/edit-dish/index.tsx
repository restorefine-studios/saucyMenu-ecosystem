import { useNavigate, useParams } from "react-router-dom";
import ScreenWrapper from "../../components/screenWrapper";
import { InputComponent, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { axiosInstance, mediaUrl } from "@/lib/utils";

import apiRoutes from "@/apiRoutes";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { FileUpload } from "@/components/file-upload";
import { PlusCircle, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useDishTags, useSpecificDish } from "@/hooks/useFetchData";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Category from "../add/components/category";
import Diet from "../add/components/diets";
import Allergens from "../add/components/allergens";
import Back from "@/components/back";
import Delete from "./delete";
import { userAtom } from "@/atoms/user";
import { useAtom } from "jotai";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";

interface Ingredient {
  id: string;
  name: string;
}

const editchema = z.object({
  name: z.string().min(1, { message: "Please enter a valid name" }).optional(),
  description: z.string().optional(),
  price: z.number().optional(),
  images: z.array(z.string()).optional(),
  ingredients: z.array(z.string()).optional(),
  cookTime: z.number().optional(),
  spiceLevel: z.enum(["mild", "medium", "spicy", "very_spicy"]).optional(),
  tagIds: z.array(z.string()).optional(),
  available: z.boolean().optional(),
});

type editValues = z.infer<typeof editchema>;

function EditDish() {
  const navigate = useNavigate();
  const [user] = useAtom(userAtom);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: "1", name: "" },
  ]);
  const { id } = useParams();
  const { t } = useTranslation();

  const { data: dishData } = useSpecificDish(id);
  console.log("dishData:", dishData);

  const [tagIds, setTagIds] = useState<string[]>([]);

  const form = useForm({
    defaultValues: dishData
      ? {
          name: dishData.dish.name ?? "",
          price: Number(dishData.dish.price),
          cookTime: dishData.dish.cookTime ?? 0,
          description: dishData.dish.description ?? "",
          images: dishData.dish.images ?? [],
          ingredients: dishData.dish.ingredients ?? [],
          spiceLevel: dishData.dish.spiceLevel ?? undefined,
          tagIds: dishData.dish.tagIds ?? [],
          available: dishData.dish.available ?? false,
        }
      : ({
          name: "",
          price: 0,
          cookTime: 0,
          description: "",
          images: [],
          ingredients: [],
          spiceLevel: undefined,
          tagIds: [],
        } as editValues),
    validators: {
      onSubmit: editchema,
      onChange: editchema,
    },
    onSubmit: async ({ value }) => {
      mutate({
        ...value,
        ingredients: ingredients?.map((ingredient) => ingredient.name) ?? [],
        tagIds,
      });
      form.reset();
    },
  });

  useEffect(() => {
    if (dishData) {
      if (dishData?.dish?.ingredients?.length > 0) {
        setIngredients(
          dishData.dish.ingredients?.map((name: string, index: number) => ({
            id: String(index + 1),
            name,
          }))
        );
      } else {
        setIngredients([{ id: "1", name: "" }]);
      }
      const initialTagIds =
        dishData.dish.tags?.map((tag: { id: string }) => tag.id) || [];
      setTagIds(initialTagIds);
    }
  }, [dishData]);

  const { data } = useDishTags();

  const { mutate, isPending } = useMutation({
    mutationFn: async (editData: editValues) => {
      const response = await axiosInstance.put(
        apiRoutes.editDish(id),
        editData
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data?.message);
        navigate(-1);
      } else {
        toast.error(data?.message);
      }
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err?.response?.data?.message);
    },
  });

  const addIngredient = () => {
    const newId = String(ingredients.length + 1);
    setIngredients([...ingredients, { id: newId, name: "" }]);
  };

  const removeIngredient = (id: string) => {
    if (ingredients?.length > 1) {
      setIngredients(ingredients?.filter((ingredient) => ingredient.id !== id));
    }
  };

  const updateIngredient = (id: string, value: string) => {
    setIngredients(
      ingredients?.map((ingredient) =>
        ingredient.id === id ? { ...ingredient, name: value } : ingredient
      )
    );
  };

  const diets = data?.data.filter((item) => item.type === "diet");
  const dishTypes = data?.data.filter((item) => item.type === "dish_type");
  const allergens = data?.data.filter((item) => item.type === "allergen");

  return (
    <ScreenWrapper title={t("admin.menu.editDish.header.header")}>
      <main>
        <div className="flex items-center justify-between">
          <Back title={t("admin.menu.editDish.header.title")} />
          <Delete id={id ?? ""} />
        </div>
        <hr className="mb-6 mt-4 border-gray-300" />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="capitalize grid grid-cols-1 lg:grid-cols-2 gap-8  py-6 ">
            <form.Field
              name="name"
              children={(field) => (
                <InputComponent
                  label={t("admin.menu.editDish.form.nameLabel")}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={t("admin.menu.editDish.form.namePlaceholder")}
                />  
              )}
            />
            <form.Field
              name="price"
              children={(field) => (
                <InputComponent
                  label={`${t("admin.menu.editDish.form.priceLabel")} (${
                    user?.currency?.symbol
                  })`}
                  value={field.state.value?.toString() ?? ""}
                  type="number"
                  onChange={(e) => {
                    const value = e.target.value;
                    field.handleChange(value === "" ? 0 : parseFloat(value));
                  }}
                  placeholder={t("admin.menu.editDish.form.pricePlaceholder")}
                  step={0.01}
                />
              )}
            />
            <form.Field
              name="description"
              children={(field) => (
                <InputComponent
                  label={t("admin.menu.editDish.form.descriptionLabel")}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={t(
                    "admin.menu.editDish.form.descriptionPlaceholder"
                  )}
                />
              )}
            />
            <form.Field
              name="cookTime"
              children={(field) => (
                <InputComponent
                  label={t("admin.menu.editDish.form.preparationLabel")}
                  value={field.state.value}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.handleChange(value === "" ? 0 : parseFloat(value));
                  }}
                  type="number"
                  placeholder="0"
                />
              )}
            />
            <form.Field
              name="spiceLevel"
              children={(field) => (
                <div>
                  <Label>
                    {t("admin.menu.editDish.variants.form.spiceLevel.label")}
                  </Label>
                  <div className="flex items-center justify-center">
                    <Select
                      value={field.state.value}
                      onValueChange={(val) =>
                        field.handleChange(val as typeof field.state.value)
                      }
                    >
                      <SelectTrigger className="w-full py-7 bg-[#f8f8f8] indent-1.5">
                        <SelectValue
                          placeholder={t(
                            "admin.menu.editDish.variants.form.spiceLevel.placeholder"
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          {
                            value: "mild",
                            label: t(
                              "admin.menu.editDish.variants.form.spiceLevel.spiceLevels.mild.label"
                            ),
                          },
                          {
                            value: "medium",
                            label: t(
                              "admin.menu.editDish.variants.form.spiceLevel.spiceLevels.medium.label"
                            ),
                          },
                          {
                            value: "spicy",
                            label: t(
                              "admin.menu.editDish.variants.form.spiceLevel.spiceLevels.spicy.label"
                            ),
                          },
                          {
                            value: "very_spicy",
                            label: t(
                              "admin.menu.editDish.variants.form.spiceLevel.spiceLevels.verySpicy.label"
                            ),
                          },
                        ]?.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.state.value && (
                      <button
                        onClick={() => field.handleChange("")}
                        className="text-sm text-red-500 hover:underline pl-2 "
                      >
                        {t(
                          "admin.menu.editDish.variants.form.spiceLevel.clear"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            />
            <form.Field
              name="available"
              children={(field) => (
                <div className=" flex flex-col  justify-between rounded-lg border p-4">
                  <p className="text-lg font-semibold">
                    {t("admin.menu.editDish.variants.form.available.title")}
                  </p>
                  <div className="flex justify-between items-center">
                    <p className="text-gray-600 text-xs ">
                      {t(
                        "admin.menu.editDish.variants.form.available.subtitle"
                      )}
                    </p>

                    <Switch
                      className="hover:cursor-pointer "
                      checked={field.state.value}
                      onCheckedChange={(checked) => field.handleChange(checked)}
                    />
                  </div>
                </div>
              )}
            />
          </div>
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <Label>
                {t("admin.menu.editDish.variants.ingredients.title")}
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addIngredient}
                className="flex items-center gap-1"
              >
                <PlusCircle className="h-4 w-4" />
                {t("admin.menu.editDish.variants.ingredients.btn")}
              </Button>
            </div>
             <div
                className={`
                  ${ingredients.length === 1
                    ? "grid-cols-1"
                    : ingredients.length === 2
                    ? "grid-cols-2"
                    : "grid-cols-3"}
                  grid mt-0 max-h-[400px] overflow-y-scroll min-w-full
               `}
              >
              {ingredients?.map((ingredient) => (
                <div key={ingredient.id} className="w-full mt-1">
                  <div className="w-full flex items-center gap-x-2">
                    <InputComponent
                      id={`ingredient-name-${ingredient.id}`}
                      value={ingredient.name}
                      onChange={(e) =>
                        updateIngredient(ingredient.id, e.target.value)
                      }
                      placeholder={t(
                        "admin.menu.editDish.variants.ingredients.placeholder"
                      )}
                    />
                
                 
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIngredient(ingredient.id)}
                      disabled={ingredients.length === 1}
                      className={`${
              ingredients.length < 1 ? "hidden" : "flex-shrink-0"
            } ml-0 mr-2 h-14 w-10 bg-gray-300`}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">
                        {t(
                          "admin.menu.editDish.variants.ingredients.removeBtn"
                        )}
                      </span>
                    </Button>
             
                    </div>
                </div>
              ))}
            </div>
          </div>
          <Category
            categories={dishTypes ?? []}
            setData={setTagIds}
            data={tagIds}
          />
          <Diet diets={diets ?? []} setData={setTagIds} data={tagIds} />
          <Allergens
            allergens={allergens ?? []}
            setData={setTagIds}
            data={tagIds}
          />
          <label className="block font-inter text-sm text-gray-600 font-medium mb-2 mt-10">
            {t("admin.menu.editDish.variants.image.title")}
          </label>

          {/* Images */}
          <form.Field name="images" mode="array">
            {(field) => (
              <div className="space-x-4 flex">
                {/* Render each image preview from the field's array value */}
                {field.state.value.map((url: string, i: number) => (
                  <div
                    key={i}
                    className="relative w-32 lg:w-40 h-32 lg:h-40 border rounded-lg"
                  >
                    <img
                      src={mediaUrl + url}
                      alt={`Uploaded ${i}`}
                      className="w-full h-full object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => field.removeValue(i)}
                      className="absolute top-1 right-1  text-white rounded-full p-1"
                    >
                      <Trash2
                        color="red"
                        className="w-4 h-4 hover:cursor-pointer hover:w-5 hover:h-5"
                      />
                    </button>
                  </div>
                ))}

                {/* Upload button to add a new image */}
                <div className="relative w-32 lg:w-40 h-32 lg:h-40 border rounded-lg overflow-hidden">
                  {/* Overlay text */}
                  <div className="absolute inset-0 bg-gray-100 z-10 flex flex-col items-center justify-center pointer-events-none">
                    <Upload />
                    <span className="text-gray-600 text-sm font-semibold  px-2 py-1 rounded">
                      {t("admin.menu.editDish.upload")}
                    </span>
                  </div>

                  {/* FileUpload component */}
                  <FileUpload
                    setKey={(url) => field.pushValue(url)}
                    folder="FoodImage"
                  />
                </div>
              </div>
            )}
          </form.Field>

          <div className="flex justify-end gap-4 pt-4">
            <Button
              className="bg-transparent border text-black border-gray-200"
              type="button"
            >
              {t("admin.menu.editDish.cancel")}
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit]) => {
                console.log("can submit?:", canSubmit);
                return (
                  <>
                    <Button
                      loading={isPending}
                      type="submit"
                      disabled={!canSubmit || isPending}
                      className="bg-[#F7941D] hover:bg-amber-600 px-6 hover:cursor-pointer"
                    >
                      {t("admin.menu.editDish.save")}
                    </Button>
                  </>
                );
              }}
            />
          </div>
        </form>
      </main>
    </ScreenWrapper>
  );
}

export default EditDish;
