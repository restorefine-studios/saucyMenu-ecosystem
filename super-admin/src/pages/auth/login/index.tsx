/* eslint-disable @typescript-eslint/no-explicit-any */
import { FieldInfo, Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Mail, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { AxiosError } from "axios";
import { userAtom } from "@/atoms/user";
import { authClient } from "@/lib/auth-client";

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
  const [showPassword, setShowPassword] = useState(false);
  const [, setUser] = useAtom(userAtom);
  const { t } = useTranslation();

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('error') === 'wrong_account') {
      toast.error('This account does not have super-admin access.')
    }
  }, []);

  const { mutate, isPending } = useMutation({
    // mutationFn: async (loginData: LoginValues) => {
    //   const response = await axiosInstance.post(apiRoutes.login, loginData);
    //   return response.data;
    // },
    mutationFn: async (loginData: LoginValues) => {
      const response = await authClient.signIn.email({
        email: loginData.email,
        password: loginData.password,
      })
      return response;
    },
    onSuccess: (data) => {
      if (data?.data) {
        if ((data.data as any).token) {
          localStorage.setItem("token", (data.data as any).token);
        }
        setUser(data?.data.user as any);

        navigate("/admin/dashboard");
        toast.success('Login successful');
      } else if (data?.error) {
        toast.error(data?.error.message);
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

  const navigate = useNavigate();
  return (
    <div className="mt-12 max-w-md mx-auto w-full">
      <h1 className="text-3xl font-inter  font-semibold mb-8 ">
        {t("auth.login.title.1")}

        <br />
        {t("auth.login.title.2")}
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
                  loading={isPending}
                  className="w-full py-8 bg-orange-400 hover:bg-orange-500 hover:cursor-pointer text-white rounded-xl"
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
