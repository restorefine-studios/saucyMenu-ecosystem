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
import { Input } from "@/components/ui/input";
import { axiosInstance } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useState } from "react";
import { toast } from "sonner";

const EnableDisable = ({ id }: { id: string }) => {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["restaurant", id],
    queryFn: async () => {
      const res = await axiosInstance.get(apiRoutes.viewRestaurant(id));
      return res.data;
    },
    enabled: !!id,
  });

  const suspended = data?.data?.suspended ?? false;

  const [reason, setReason] = useState("");

  const alterSuspend = async (suspendedReason: string) => {
    const res = await axiosInstance.post(apiRoutes.alterSuspend(id), {
      suspendedReason,
    });
    return res.data;
  };

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: { suspendedReason: string } | null) => {
      return alterSuspend(payload?.suspendedReason ?? "");
    },
    onSuccess: (result) => {
      if (result?.success) {
        toast.success(
          suspended ? "Unsuspended successfully" : "Suspended successfully",
        );
        void queryClient.invalidateQueries({ queryKey: ["restaurant"] });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.error(result?.message ?? "Something went wrong");
      }
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err?.response?.data?.message ?? "Something went wrong");
    },
  });

  const handleConfirm = () => {
    if (suspended) {
      mutate(null);
    } else {
      if (!reason.trim()) {
        toast.error("Please enter a reason for suspending");
        return;
      }
      mutate({ suspendedReason: reason.trim() });
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={suspended ? "default" : "destructive"}>
          {suspended ? "Unsuspend" : "Suspend"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {suspended ? "Unsuspend restaurant?" : "Suspend restaurant?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {suspended
              ? "This will restore access for this restaurant."
              : "This will suspend the restaurant. Please enter a reason."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!suspended && (
          <div className="grid gap-2 py-2">
            <label className="text-sm font-medium">Reason for suspending</label>
            <Input
              placeholder="e.g. Violation of terms, Spamming..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full"
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isPending}
          >
            {isPending
              ? "Please wait..."
              : suspended
                ? "Unsuspend Restaurant"
                : "Suspend Restaurant"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default EnableDisable;
