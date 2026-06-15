import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoadingSubmitButton } from "@/components/LoadingSubmitButton";
import { PasswordInput } from "@/components/PasswordInput";
import { authClient } from "@/lib/auth-client";
import { useQueryState } from "nuqs";
import OtpInputBlock from "../verify-otp/components/OtpInputBlock";

interface ResetValues {
  password: string;
  confirmPassword: string;
  otp: string;
}

interface ResetPasswordProps {
  onComplete?: () => void;
  onBack?: () => void;
}

const resetSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    otp: z.string().min(6, { message: "Please enter the 6-digit OTP" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const ResetPassword = ({ onComplete, onBack }: ResetPasswordProps) => {
  const [resetEmail] = useQueryState("resetEmail");
  const { t } = useTranslation();

  const { mutate, isPending } = useMutation({
    mutationFn: async (resetData: ResetValues) => {
      return await authClient.emailOtp.resetPassword({
        email: (resetEmail as string) ?? "",
        otp: resetData.otp,
        password: resetData.password,
      });
    },
    onSuccess: (data) => {
      if (data?.data) {
        toast.success("Password reset successfully.", {
          duration: 6000,
        });
        form.reset();
        onComplete?.();
        localStorage.removeItem("resetOtp");
        localStorage.removeItem("resetEmail");
      } else {
        toast.error((data as { message?: string })?.message ?? "Something went wrong.");
      }
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const form = useForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
      otp: "",
    } as ResetValues,
    validators: {
      onSubmit: resetSchema,
    },
    onSubmit: async ({ value }) => {
      mutate(value);
    },
  });

  return (
    <div className="mt-12 max-w-md mx-auto w-full">
      <h1 className="text-3xl font-inter font-semibold mb-8 tracking-tight">
        Change To A
        <br />
        New Password
      </h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <div className="space-y-6">
          <form.Field
            name="otp"
            children={(field) => (
              <div className="space-y-2">
                <OtpInputBlock
                  value={field.state.value ?? ""}
                  onChange={field.handleChange}
                />
              </div>
            )}
          />
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

          <div
            className={
              onBack
                ? "grid grid-cols-[auto_1fr] gap-3 items-stretch pt-2"
                : "pt-2"
            }
          >
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors font-medium text-sm min-h-[3.5rem]"
              >
                {t("auth.reset.form.back")}
              </button>
            )}
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit]) => (
                <div className={onBack ? "min-w-0" : ""}>
                  <LoadingSubmitButton
                    isLoading={isPending}
                    canSubmit={canSubmit}
                    label={t("auth.reset.form.submit")}
                  />
                </div>
              )}
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export default ResetPassword;
