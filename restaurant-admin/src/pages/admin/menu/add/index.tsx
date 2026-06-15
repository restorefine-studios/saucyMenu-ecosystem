import ScreenWrapper from "../../components/screenWrapper";
import { FieldInfo, InputComponent, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { axiosInstance, cn, mediaUrl } from "@/lib/utils";
import apiRoutes from "@/apiRoutes";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { FileUpload } from "@/components/file-upload";
import { PlusCircle, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { useDishTags } from "@/hooks/useFetchData";
import Category from "./components/category";
import Diet from "./components/diets";
import Allergens from "./components/allergens";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Back from "@/components/back";
import Bulk from "./bulk";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAtom } from "jotai";
import { userAtom } from "@/atoms/user";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { isEmpty } from "lodash";

interface Ingredient {
  id: string;
  name: string;
}

const addSchema = z.object({
  name: z.string().min(1, { message: "Please enter a valid name" }),
  description: z.string().min(1, { message: "Please enter a description" }),
  price: z.number().min(1, { message: "Please enter a valid price" }),
  images: z.array(z.string()),
  ingredients: z.array(z.string().min(1, { message: "Add the ingredients" })),
  cookTime: z.number().optional(),
  spiceLevel: z.enum(["mild", "medium", "spicy", "very_spicy", ""]).optional(),
  tagIds: z.array(z.string()),
  available: z.boolean().optional(),
});

type addValues = Partial<z.infer<typeof addSchema>>;

function Add() {
  const [user] = useAtom(userAtom);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: "1", name: "" },
  ]);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [tagIds, setTagIds] = useState<string[]>([]);
  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      images: [],
      ingredients: [],
      tagIds: [],
    } as addValues,
    validators: {
      // onSubmit: addSchema,
      // onChange: addSchema,
      onSubmit: addSchema,
    },
    onSubmit: async ({ value }) => {
      mutate({
        ...value,
        ingredients: isEmpty(ingredients[0].name)
          ? []
          : ingredients.map((ingredient) => ingredient.name),
        tagIds,
      });
      setIngredients([{ id: "1", name: "" }]);
      setTagIds([]);
    },
  });

  // const { data: classificationsData } = useMenuClassifications();
  const { data } = useDishTags();
  const { mutate, isPending } = useMutation({
    mutationFn: async (addData: addValues) => {
      const response = await axiosInstance.post(apiRoutes.addDish, addData);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data?.message);
        form.reset();
        navigate("/admin/menu");
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
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((ingredient) => ingredient.id !== id));
    }
  };

  const updateIngredient = (id: string, value: string) => {
    setIngredients(
      ingredients.map((ingredient) =>
        ingredient.id === id ? { ...ingredient, name: value } : ingredient
      )
    );
  };

  const diets = data?.data.filter((item) => item.type === "diet");
  const dishTypes = data?.data.filter((item) => item.type === "dish_type");
  const allergens = data?.data.filter((item) => item.type === "allergen");

  console.log(form.state.errors);
  return (
    <ScreenWrapper title={t("admin.menu.addDish.title")}>
      <main>
        <div className="flex items-start justify-between">
          <Back title={t("admin.menu.addDish.topSide.title")} />
          <Bulk />
        </div>
        <hr className="mb-6 mt-6 border-gray-300" />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8  py-6 ">
            <form.Field
              name="name"
              validators={{
                onSubmit: addSchema.shape.name,
              }}
              children={(field) => (
                <div>
                  <InputComponent
                    label={t("admin.menu.addDish.form.name.label")}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={t("admin.menu.addDish.form.name.label")}
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            />
            <form.Field
              name="price"
              validators={{
                onSubmit: addSchema.shape.price,
              }}
              children={(field) => (
                <div>
                  <InputComponent
                    label={`${t("admin.menu.addDish.form.price.label")} (${
                      user?.currency?.symbol
                    })`}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.handleChange(parseFloat(value));
                    }}
                    placeholder={t("admin.menu.addDish.form.price.placeholder")}
                    type="number"
                    step={0.01}
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            />
            <form.Field
              name="description"
              validators={{
                onSubmit: addSchema.shape.description,
              }}
              children={(field) => (
                <div>
                  <InputComponent
                    label={t("admin.menu.addDish.form.description.label")}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={t(
                      "admin.menu.addDish.form.description.placeholder"
                    )}
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            />
            <form.Field
              name="cookTime"
              validators={{
                onSubmit: addSchema.shape.cookTime,
              }}
              children={(field) => (
                <div>
                  <InputComponent
                    label={t("admin.menu.addDish.form.preparationTime.label")}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.handleChange(value === "" ? 0 : parseFloat(value));
                    }}
                    type="number"
                    placeholder="0"
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            />
            <form.Field
              name="spiceLevel"
              validators={{
                onSubmit: addSchema.shape.spiceLevel,
              }}
              children={(field) => (
                <div className="w-full">
                  <Label>{t("admin.menu.addDish.form.spiceLevel.label")}</Label>
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
                            "admin.menu.addDish.form.spiceLevel.placeholder"
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          {
                            value: "mild",
                            label: t(
                              "admin.menu.addDish.form.spiceLevel.spiceLevels.mild.label"
                            ),
                          },
                          {
                            value: "medium",
                            label: t(
                              "admin.menu.addDish.form.spiceLevel.spiceLevels.medium.label"
                            ),
                          },
                          {
                            value: "spicy",
                            label: t(
                              "admin.menu.addDish.form.spiceLevel.spiceLevels.spicy.label"
                            ),
                          },
                          {
                            value: "very_spicy",
                            label: t(
                              "admin.menu.addDish.form.spiceLevel.spiceLevels.verySpicy.label"
                            ),
                          },
                        ].map((item) => (
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
                        {t("admin.menu.addDish.form.spiceLevel.clear")}
                      </button>
                    )}
                  </div>
                  <FieldInfo field={field} />
                </div>
              )}
            />
            <form.Field
              name="available"
              validators={{
                onSubmit: addSchema.shape.available,
              }}
              children={(field) => (
                <div className=" flex flex-col  justify-between rounded-lg border p-4">
                  <Label className="text-lg font-semibold">
                    {t("admin.menu.addDish.form.available.title")}
                  </Label>
                  <div className="flex justify-between items-center">
                    <Label className="text-gray-600 text-xs ">
                      {t("admin.menu.addDish.form.available.subtitle")}
                    </Label>

                    <Switch
                      className="hover:cursor-pointer "
                      checked={field.state.value}
                      onCheckedChange={(checked) => field.handleChange(checked)}
                    />
                  </div>
                  <FieldInfo field={field} />
                </div>
              )}
            />
          </div>
          <div className="w-full mt-2">
            <div className="flex items-center justify-between">
              <Label>{t("admin.menu.addDish.ingredients.title")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addIngredient}
                className="flex items-center gap-1"
              >
                <PlusCircle className="h-4 w-4" />
                {t("admin.menu.addDish.ingredients.btn")}
              </Button>
            </div>
            <ScrollArea>
  <div
    className={cn(
      ingredients.length === 1
        ? "grid-cols-1"
        : ingredients.length === 2
        ? "grid-cols-2"
        : "grid-cols-3",
      "grid mt-0 max-h-[400px] overflow-y-scroll min-w-full"
    )}
  >
    {ingredients.map((ingredient) => (
      <div
        key={ingredient.id}
        className="w-full mt-1"
      >
        <div className="w-full flex items-center gap-x-2">     
            <InputComponent
            id={`ingredient-name-${ingredient.id}`}
            value={ingredient.name}
            onChange={(e) =>
              updateIngredient(ingredient.id, e.target.value)
            }
            placeholder={t(
              "admin.menu.addDish.ingredients.placeholder"
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
            <Trash2 className="h-5 w-5 text-gray-500" />
            <span className="sr-only">
              {t("admin.menu.addDish.ingredients.removeBtn")}
            </span>
          </Button>    
          
        </div>
      </div>
    ))}
  </div>
</ScrollArea>

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
            {t("admin.menu.addDish.image.title")}
          </label>

          {/* Images */}
          <form.Field name="images" mode="array">
            {(field) => (
              <div className="space-x-4 flex">
                {/* Render each image preview from the field's array value */}
                {field?.state?.value?.map((url: string, i: number) => (
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
                      {t("admin.menu.addDish.image.upload")}
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
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit]) => {
                return (
                  <>
                    <Button
                      loading={isPending}
                      type="submit"
                      disabled={!canSubmit || isPending}
                      className="bg-[#F7941D] hover:bg-amber-600 px-6 hover:cursor-pointer"
                    >
                      {t("admin.menu.addDish.saveBtn")}
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

export default Add;
