import { useForm } from "@tanstack/react-form";

import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useResetPassword } from "@/hooks/useMutations";
import { LoadingSubmitButton } from "@/components/LoadingSubmitButton";
import { EmailInputField } from "@/components/EmailInputField";

export interface ResetValues {
  email: string;
}

const resetSchema = z.object({
  email: z.string().email().min(1, { message: "Please enter your email" }),
});

const Reset = ({ onNext }: any) => {
  const { t } = useTranslation();

  const { mutate, isPending } = useResetPassword(onNext);

  const form = useForm({
    defaultValues: {
      email: "",
    } as ResetValues,
    validators: {
      onSubmit: resetSchema,
    },
    onSubmit: async ({ value }) => {
      localStorage.setItem("resetEmail", value.email);
      mutate(value);
    },
  });
  return (
    <div className="mt-12 max-w-md mx-auto w-full flex flex-col justify-between  h-full">
      <div>
        <h1 className="text-3xl font-inter  font-semibold mb-8 ">
          {t("auth.reset.title.1")}
          <br />
          {t("auth.reset.title.2")}
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
            name="email"
            children={(field) => (
              <EmailInputField
                field={field}
                label={t("auth.login.form.email.label")}
                placeholder={t("auth.login.form.email.placeholder")}
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

export default Reset;
