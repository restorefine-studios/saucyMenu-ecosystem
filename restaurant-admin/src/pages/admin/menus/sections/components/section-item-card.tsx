import { Link } from "react-router-dom";
import { useState } from "react";
import { MenuSection } from "../../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputComponent } from "@/components/ui/input";
import {
  useUpdateMenuSection,
  useDeleteMenuSection,
} from "@/hooks/useMutations";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { z } from "zod";
import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";

const formSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

const SectionItemCard = ({
  section,
  index = 0,
}: {
  section: MenuSection;
  index?: number;
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isDelete, setIsDelete] = useState(false);
  // const [name, setName] = useState(section.name);
  // const [description, setDescription] = useState(section.description);

  const updateMutation = useUpdateMenuSection(section.menuId);
  const deleteMutation = useDeleteMenuSection(section.menuId);

  const form = useForm({
    defaultValues: section,

    onSubmit: async ({ value }) => {
      updateMutation.mutate({ id: section.id, data: value });
      setIsOpen(false);
    },
  });

  // const handleEdit = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   updateMutation.mutate({ id: section.id, data: { name, description } });
  //   setIsOpen(false);
  // };

  const handleDelete = () => {
    deleteMutation.mutate(section.id);
    setIsDelete(false);
  };

  return (
    <div
      className={` ${
        index < 3
          ? "border-b border-b-black/0 py-3"
          : "border-b border-b-black/10 py-5"
      } px-3 hover:bg-slate-100 rounded-lg transition-all duration-500 ease-in-out flex items-center justify-between `}
    >
      <Link
        to={`/admin/menus/${section.menuId}/items/${section.id}`}
        className="w-full"
      >
        {index + 1}. {section.name}
      </Link>

      <div className="flex items-center gap-2">
        <button
          className="bg-[#F7941D] rounded-md px-4 py-2 text-white text-sm"
          onClick={() => {
            setIsOpen(true);
          }}
        >
          {t("admin.menus.sections.card.edit")}
        </button>
        <button
          className="bg-[#7C7C7C] rounded-md px-4 py-2 text-[#CECECE] text-sm"
          onClick={() => {
            setIsDelete(true);
          }}
        >
          {t("admin.menus.sections.card.delete")}
        </button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("admin.menus.sections.card.editDialog.title")}
            </DialogTitle>
          </DialogHeader>
          {/* <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={updateMutation.isPending}>
              Save
            </Button>
          </form> */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="grid gap-4"
          >
            <form.Field
              name="name"
              validators={{
                onSubmit: formSchema.shape.name,
              }}
              children={(field) => (
                <InputComponent
                  label={t(
                    "admin.menus.sections.card.editDialog.form.name.label"
                  )}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              )}
            />
            <form.Field
              name="description"
              children={(field) => (
                <InputComponent
                  label={t(
                    "admin.menus.sections.card.editDialog.form.description.label"
                  )}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              )}
            />
            <div className="flex justify-end">
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
                children={([canSubmit]) => (
                  <Button
                    type="submit"
                    disabled={!canSubmit || updateMutation.isPending}
                  >
                    {t("admin.menus.sections.card.editDialog.form.button")}
                  </Button>
                )}
              />
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDelete} onOpenChange={setIsDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.menus.sections.card.deleteDialog.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.menus.sections.card.deleteDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("admin.menus.sections.card.deleteDialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("admin.menus.sections.card.deleteDialog.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
export default SectionItemCard;
