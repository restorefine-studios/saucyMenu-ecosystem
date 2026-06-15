/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { InputComponent } from "@/components/ui/input";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useAtom } from "jotai";
import { userAtom } from "@/atoms/user";
import { authClient } from "@/lib/auth-client";

const updatePasswordSchema = z.object({
  password: z.string().min(3, { message: "Please enter a password" }),
  confirmPassword: z.string().min(3, "Please confirm your new password"),
  code: z.string(),
  oldPassword: z.string(),
});
// .refine((data) => data.password === data.confirmPassword, {
//   path: ["confirmPassword"],
//   message: "Passwords do not match",
// });
const Password = () => {
  const { t } = useTranslation();

  type updatePasswordValues = z.infer<typeof updatePasswordSchema>;
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [, setUser] = useAtom(userAtom);
  const navigate = useNavigate();
  // const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function signOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          setUser(null);
          navigate("/", { replace: true });
        },
      },
    });
  }

  const updatePasswordForm = useForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
      code: "",
    } as updatePasswordValues,
    validators: {
      onSubmit: updatePasswordSchema,
    },
    onSubmit: async ({ value }: any) => {
      passwordMutate(value);
    },
  });

  const { mutate: passwordMutate, isPending: passwordPending } = useMutation({
    mutationFn: async () => {
      const response = await authClient.changePassword({
        newPassword: updatePasswordForm.state.values.password,
        currentPassword: updatePasswordForm.state.values.oldPassword,
        revokeOtherSessions: true,
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.data) {
        toast.success("Your password has been updated.");
        updatePasswordForm.reset();
        signOut();
      } else if (data.error) {
        toast.error(data.error.message);
      }
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err?.response?.data?.message);
    },
  });

  const handleUpdatePassword = () => {
    // sendOtpMutate();
    passwordMutate();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        updatePasswordForm.handleSubmit();
      }}
    >
      <div className="rounded-3xl bg-white p-6 md:p-10 w-full">
        <div className="space-y-6">
          <div className="mb-6 lg:mb-9">
            <h2 className="text-xl font-medium">
              {t("admin.settings.password.title")}
            </h2>
            <p className="text-gray-500 text-xs">
              {t("admin.settings.password.subtitle")}
            </p>
          </div>
          <updatePasswordForm.Field
            name="oldPassword"
            children={(field) => (
              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="block font-inter text-sm font-medium mb-1 "
                >
                  {t("admin.settings.password.oldPassword")}
                </label>
                <div className="w-full flex items-center bg-gray-100 border-none rounded-xl">
                  <InputComponent
                    id="oldPassword"
                    name="oldPassword"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    type={showOldPassword ? "text" : "password"}
                    placeholder="*******"
                    className="pl-4 pr-10 py-8 bg-transparent border-none rounded-xl hover:border-none focus:outline-none focus:ring-0 focus:border-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="relative right-5 text-gray-400 hover:cursor-pointer "
                  >
                    {showOldPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            )}
          />
          <updatePasswordForm.Field
            name="password"
            children={(field) => (
              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="block font-inter text-sm font-medium mb-1 "
                >
                  {t("admin.settings.password.newPassword")}
                </label>
                <div className="w-full flex items-center bg-gray-100 border-none rounded-xl">
                  <InputComponent
                    id="password"
                    name="password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder="*******"
                    className="pl-4 pr-10 py-8 bg-transparent border-none rounded-xl hover:border-none focus:outline-none focus:ring-0 focus:border-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="relative right-5 text-gray-400 hover:cursor-pointer "
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            )}
          />
          {/* <updatePasswordForm.Field
            name="confirmPassword"
            validators={{
                onSubmit: updatePasswordSchema.shape.confirmPassword,
            }}
            children={(field) => (
              <div className="space-y-1">
                <label
                  htmlFor="confirm-password"
                  className="block font-inter text-sm font-medium"
                >
                  {t("admin.settings.password.confirmPassword")}
                </label>
                <div className="w-full flex items-center bg-gray-100 border-none rounded-xl">
                  <InputComponent
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="*******"
                    className="pl-4 pr-10 py-8 bg-gray-100 border-none rounded-xl focus:outline-none focus:ring-0 focus:border-none"
                    // errors={field.state.meta.errors.join(",")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="relative right-5 text-gray-400 hover:cursor-pointer "
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <ErrorComponent
                  errors={
                    field.state.meta.errors.map((e) => e?.message).join(",") ??
                    ""
                  }
                />
              </div>
            )}
          /> */}
        </div>
        <div className="flex justify-end gap-4 pt-4">
          <Button
            disabled={updatePasswordForm.state.errors.length > 0}
            type="button"
            loading={passwordPending}
            onClick={handleUpdatePassword}
            className="bg-[#F7941D] hover:bg-amber-600 px-6 hover:cursor-pointer"
          >
            {t("admin.settings.password.update")}
          </Button>
          {/* <Modal
            open={open}
            setOpen={setOpen}
            title="Change Password"
            size="lg"
            footer={
              <div className="flex space-x-3 items-center">
                {timeLeft === 0 && (
                  <Button
                    disabled={timeLeft != 0}
                    onClick={() => [
                      sendOtpMutate(),
                      setResendCount((count) => count + 1),
                    ]}
                    variant="secondary"
                    className="  hover:bg-gray-700 bg-gray-800 hover:cursor-pointer text-white "
                  >
                    {t("admin.settings.password.resendOtp")}
                  </Button>
                )}
                <updatePasswordForm.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting]}
                  children={([canSubmit]) => (
                    <div className="flex  justify-end w-full ">
                      <Button
                        type="submit"
                        loading={passwordPending}
                        onClick={() => updatePasswordForm.handleSubmit()}
                        disabled={!canSubmit}
                        className="bg-[#F7941D] hover:bg-amber-600 px-6 hover:cursor-pointer "
                      >
                        {t("admin.settings.password.update")}
                      </Button>
                    </div>
                  )}
                />
              </div>
            }
          >
            <div className="flex flex-col">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  updatePasswordForm.handleSubmit();
                }}
              >
                <updatePasswordForm.Field
                  name="code"
                  children={(field) => (
                    <>
                      <InputComponent
                        label={t("admin.settings.password.modalLabel")}
                        type="text"
                        name="code"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className="pl-4 pr-10 py-8 bg-gray-100 border-none rounded-xl focus:outline-none focus:ring-0 focus:border-none"
                      />
                      <div className="mt-5 space-x-4">
                        <TimerDisplay secondsLeft={timeLeft} />
                      </div>
                    </>
                  )}
                />
              </form>
            </div>
          </Modal> */}
        </div>
      </div>
    </form>
  );
};

export default Password;
