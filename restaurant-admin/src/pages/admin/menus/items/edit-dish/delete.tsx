import apiRoutes from "@/apiRoutes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { axiosInstance } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const Delete = ({ id }: { id: string }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const remove = async () => {
    const res = await axiosInstance.delete(apiRoutes.editMenuItem(id));
    return res.data;
  };

  const { mutate } = useMutation({
    mutationFn: async () => {
      return toast.promise(remove(), {
        loading: t("admin.menu.editDish.toast.loading"),
        success: (data) => {
          if (data.success) {
            navigate(-1);
            return data.message || t("admin.menu.editDish.toast.success");
          }
          throw new Error(data.message || t("admin.menu.editDish.toast.error"));
        },
        error: (err: AxiosError<{ message: string }>) => {
          return (
            err?.response?.data?.message ||
            t("admin.menu.editDish.toast.failed")
          );
        },
      });
    },
  });
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={"destructive"}>
          <Trash2 className="h-4 w-4 text-white" />
          {t("admin.menu.editDish.header.remove.btn")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("admin.menu.editDish.header.remove.alert.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("admin.menu.editDish.header.remove.alert.warning")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {t("admin.menu.editDish.header.remove.alert.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => mutate()}>
            {t("admin.menu.editDish.header.remove.alert.continue")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default Delete;
