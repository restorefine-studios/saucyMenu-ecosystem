import apiRoutes from "@/apiRoutes";
import { authClient } from "@/lib/auth-client";
import { axiosInstance } from "@/lib/utils";
import { ResetValues } from "@/pages/auth/reset";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

// reset password  mutation
export const useResetPassword = (onNext: () => void) => {
  return useMutation({
    mutationFn: async (email: ResetValues) => {
      return await authClient.emailOtp.requestPasswordReset({
        email: email.email,
      });
    },
    onSuccess: (data) => {
      if (data.data) {
        toast.success("We've sent a verification code to your email...", {
          duration: 6000,
        });
        onNext();
      } else if (data.error) {
        toast.error(data.error?.message);
      }
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err.message);
    },
  });
};

// verify otp mutation
// export const useVerifyOtp = (onSuccessCallback: () => void) => {
//   return useMutation({
//     mutationFn: async (ResetData: OtpResetValues) => {
//       return await authClient.emailOtp.checkVerificationOtp({
//         email: '',
//         type: "forget-password",
//         otp: ResetData.code,
//       });
//     },
//     onSuccess: (data) => {
//       if (data.data) {
//         toast.success(
//           "OTP verified successfully! You can now reset your password.",
//           { duration: 6000 }
//         );
//         onSuccessCallback();
//       } else {
//         toast.error(data.error?.message);
//       }
//     },
//     onError: (err: AxiosError<{ message: string }>) => {
//       toast.error(err.message);
//     },
//   });
// };


export const useUpdateMenuSection = (menuId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string, data: { name: string, description: string } }) => {
      const response = await axiosInstance.put(apiRoutes.updateMenuSection(id), data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Section updated successfully");
      queryClient.invalidateQueries({ queryKey: ["menuSections", menuId] });
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err?.response?.data?.message || "Failed to update section");
    },
  });
};

// delete menu section mutation
export const useDeleteMenuSection = (menuId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(apiRoutes.deleteMenuSection(id));
      return response.data;
    },
    onSuccess: () => {
      toast.success("Section deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["menuSections", menuId] });
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err?.response?.data?.message || "Failed to delete section");
    },
  });
};
