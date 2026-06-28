/* eslint-disable @typescript-eslint/no-explicit-any */
import { FieldInfo, Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Mail, ArrowRight, Fingerprint } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePasskeySupported, passkeyIsRegistered, useLoginWithPasskey } from "@/hooks/usePasskey";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { AxiosError } from "axios";
import { authClient } from "@/lib/auth-client";
// import { useAtom } from "jotai";
// import { userAtom } from "@/atoms/user";

interface LoginValues {
  email: string;
  password: string;
  keepLoggedIn: boolean;
}

const loginSchema = z.object({
  email: z.string().email().min(1, { message: "Please enter a  valid email" }),
  password: z.string().min(1, { message: "Password is required" }),
  keepLoggedIn: z.boolean(),
});

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('error') === 'wrong_account') {
      toast.error('This account does not have restaurant admin access.')
    }
  }, []);
  const isPasskeySupported = usePasskeySupported();
  const passkeyReady = isPasskeySupported && passkeyIsRegistered();
  const { mutate: passkeyLogin, isPending: passkeyPending } = useLoginWithPasskey(() =>
    navigate("/admin/dashboard")
  );
  const { t } = useTranslation();
  // const [, setUser] = useAtom(userAtom);

  const { mutate, isPending } = useMutation({
    mutationFn: async (loginData: LoginValues) => {
      // const response = await axiosInstance.post(apiRoutes.login, loginData);
      const response = await authClient.signIn.email({
        email: loginData.email,
        password: loginData.password,
      });
      return response;
    },
    onSuccess: (res:any) => {
      const data = res.data;
      if (data) {
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        // Clear any dismissed status on successful login so that we ask the user again
        sessionStorage.removeItem("passkeyPromptDismissed");
        localStorage.removeItem("passkeyPromptDismissed");
        // setUser(data?.user);
        if(data?.user?.setupComplete) {
          navigate("/admin/dashboard");
        } else {
          navigate("/setup");
        }
      }else if(res.error){
        toast.error(res.error.message);
      }
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err?.response?.data?.message);
    },
  });

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      keepLoggedIn: false,
    } as LoginValues,
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: async ({ value }) => {
      mutate(value);
    },
  });

  return (
    <div className="mt-12 max-w-md mx-auto w-full">
      <h1 className="text-3xl font-inter  font-semibold mb-8 ">
        {t("auth.login.title.1")}

        <br />
        {t("auth.login.title.2")}
      </h1>

      {passkeyReady && (
        <div className="mb-6">
          <Button
            type="button"
            onClick={() => passkeyLogin()}
            disabled={passkeyPending}
            className="w-full py-8 bg-orange-400 hover:bg-orange-500 text-white rounded-xl flex items-center justify-center gap-2"
          >
            <Fingerprint className="h-5 w-5" />
            {passkeyPending ? "Verifying…" : "Use Face ID / Passkey"}
          </Button>
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or sign in with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <div className="space-y-6">
          <form.Field
            name="email"
            validators={{
              onSubmit: loginSchema.shape.email,
            }}
            children={(field) => (
              <div className="space-y-2">
                <Label>{t("auth.login.form.email.label")}</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={t("auth.login.form.email.placeholder")}
                    className="pl-4 pr-10 py-8 bg-gray-100 border-none rounded-xl"
                  />

                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                </div>
                <FieldInfo field={field} />
              </div>
            )}
          />
          <form.Field
            name="password"
            validators={{
              onSubmit: loginSchema.shape.password,
            }}
            children={(field) => (
              <div className="space-y-2">
                <Label>{t("auth.login.form.password.label")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder={t("auth.login.form.password.placeholder")}
                    className="pl-4 pr-10 py-8 bg-gray-100 border-none rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <FieldInfo field={field} />
              </div>
            )}
          />
          {/* <div className="flex items-center justify-between">
            <form.Field
              name="keepLoggedIn"
              children={(field) => (
                <label
                  htmlFor="keepLoggedIn"
                  className="gap-1 items-center flex "
                >
                  <input
                    type="checkbox"
                    id="keepLoggedIn"
                    name="keepLoggedIn"
                    checked={field.state.value}
                    onChange={(e) => field.handleChange(e.target.checked)}
                    className="space-x-2"
                  />
                  {t("auth.login.form.keepLoggedIn.label")}
                </label>
              )}
            />
            <Link to="#" className="text-sm text-blue-600 underline">
              {t("auth.login.form.forgotPassword")}
            </Link>
          </div> */}

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit]) => (
              <>
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full py-8 bg-orange-400 hover:bg-orange-500 hover:cursor-pointer text-white rounded-xl"
                  loading={isPending}
                >
                  {t("auth.login.form.submit")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}
          />
        </div>
      </form>
    </div>
  );
};

export default Login;
