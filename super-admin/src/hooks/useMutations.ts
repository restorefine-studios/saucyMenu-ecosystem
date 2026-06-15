import apiRoutes from "@/apiRoutes";
import { axiosInstance } from "@/lib/utils";
import { ResetValues } from "@/pages/auth/reset";
import { OtpResetValues } from "@/pages/auth/verify-otp";

import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

// reset password  mutation
export const useResetPassword = (onNext: () => void) => {
  return useMutation({
    mutationFn: async (email: ResetValues) => {
      const response = await axiosInstance.post(
        apiRoutes.forgotPassword,
        email
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success("We've sent a verification code to your email...", {
          duration: 6000,
        });
        onNext();
      } else {
        toast.error(data?.message);
      }
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err?.response?.data?.message);
    },
  });
};

// verify otp mutation
export const useVerifyOtp = (onSuccessCallback: () => void) => {
  return useMutation({
    mutationFn: async (ResetData: OtpResetValues) => {
      const response = await axiosInstance.post(apiRoutes.verifyOtp, ResetData);
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success(
          "OTP verified successfully! You can now reset your password.",
          { duration: 6000 }
        );
        onSuccessCallback();
      } else {
        toast.error(data?.message);
      }
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err?.response?.data?.message || "Something went wrong.");
    },
  });
};
