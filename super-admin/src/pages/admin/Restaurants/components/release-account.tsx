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
import { axiosInstance } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

const ReleaseAccount = ({ id, email }: { id: string, email: string }) => {
  const release = async () => {
    const res = await axiosInstance.post(apiRoutes.releaseAccount, {
      restaurantId: id,
      email: email,
    });
    return res.data;
  };
  const { mutate } = useMutation({
    mutationFn: release,
    onSuccess: (data) => {
      if (data?.success) {
        toast.success(data?.message);
        window.location.reload();
      } else {
        toast.error(data?.message);
      }
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err?.response?.data?.message);
    },
  });
  return (
    <AlertDialog>
      <AlertDialogTrigger>
        {" "}
        <button className="bg-[#284b63] w-fit h-auto p-2 px-3 text-xs rounded-md text-gray-200 hover:cursor-pointer hover:underline">
          Finish Setup
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This action will reset the password
            and you will lose access.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => mutate()}>
            Release Account
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ReleaseAccount;
