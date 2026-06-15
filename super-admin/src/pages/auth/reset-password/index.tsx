// import { useNavigate } from "react-router-dom";
import { useForm } from "@tanstack/react-form";

import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/utils";
import { toast } from "sonner";
import apiRoutes from "@/apiRoutes";
import { LoadingSubmitButton } from "@/components/LoadingSubmitButton";
import { PasswordInput } from "@/components/PasswordInput";
import { useNavigate } from "react-router-dom";

interface ResetValues {
  password: string;
  confirmPassword: string;
}

const resetSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const ResetPassword = ({ onComplete }: { onComplete: () => void }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const resetEmail = localStorage.getItem("resetEmail");
  const resetCode = localStorage.getItem("resetOtp");

  const { mutate, isPending } = useMutation({
    mutationFn: async (resetData: ResetValues) => {
      const response = await axiosInstance.post(
        apiRoutes.resetPassword,
        resetData
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success("Password reset successfully.", {
          duration: 6000,
        });
        form.reset();
        onComplete();
        navigate("/");
      } else {
        toast.error(data?.message);
      }
      localStorage.setItem("resetOtp", "");
      localStorage.setItem("resetEmail", "");
    },
    // onError: (err: AxiosError<{ message: string }>) => {
    //   toast.error(err?.response?.data?.message);
    // },
  });

  const form = useForm({
    defaultValues: {
      password: "",
    } as ResetValues,
    validators: {
      onSubmit: resetSchema,
    },
    onSubmit: async ({ value }) => {
      const payload = {
        ...value,
        email: resetEmail,
        code: resetCode,
      };
      mutate(payload);
    },
  });
  return (
    <div className="mt-12 max-w-md mx-auto w-full flex flex-col justify-between  h-full">
      <div>
        <h1 className="text-3xl font-inter  font-semibold mb-8 ">
          Change To A
          <br />
          New Password
        </h1>
      </div>

      <div className="space-y-6">
        {/* email */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field
            name="password"
            children={(field) => (
              <PasswordInput
                name="password"
                id="password"
                label={t("auth.reset.form.password.label")}
                value={field.state.value ?? ""}
                onChange={field.handleChange}
                onBlur={field.handleBlur}
                placeholder={t("auth.login.form.password.placeholder")}
              />
            )}
          />
          <form.Field
            name="confirmPassword"
            children={(field) => (
              <PasswordInput
                name="confirmPassword"
                id="confirmPassword"
                label={t("auth.reset.form.confirmPassword.label")}
                value={field.state.value ?? ""}
                onChange={field.handleChange}
                onBlur={field.handleBlur}
                placeholder={t("auth.login.form.password.placeholder")}
              />
            )}
          />

          <div className="flex flex-row space-x-5">
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit]) => (
                <LoadingSubmitButton
                  isLoading={isPending}
                  canSubmit={canSubmit}
                  label={t("auth.reset.form.submit")}
                />
              )}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
