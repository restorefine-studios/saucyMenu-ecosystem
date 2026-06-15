import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { InputComponent, FieldInfo } from "@/components/ui/input";

import TimerDisplay from "@/pages/auth/verify-otp/components/TimerDisplay";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";

interface Props {
  defaultEmail: string | undefined;
}

const updateInformationSchema = z.object({
  email: z
    .string()
    .min(1, "Please enter an email")
    .email("Please enter a valid email"),
  code: z.string().min(4, "Please enter the verification code"),
});

type UpdateInformationValues = z.infer<typeof updateInformationSchema>;

const OTP_DURATION_SECONDS = 300;

const Email = ({ defaultEmail }: Props) => {
  const [open, setOpen] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const { t } = useTranslation();

  const handleChangeEmailRequest = async (values: UpdateInformationValues) => {
    return await authClient.emailOtp.changeEmail({
      newEmail: values.email,
      otp: values.code,
    });
  };

  const { mutate: changeEmailMutate, isPending: changeEmailPending } =
    useMutation({
      mutationFn: handleChangeEmailRequest,
      onSuccess: (data) => {
        if (data.data) {
          toast.success(
            t("admin.settings.email.changeSuccess") ??
              "Email changed successfully",
          );
          formRef.current?.setFieldValue("code", "");
          setOpen(false);
        } else if (data.error) {
          toast.error(data.error.message);
        }
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const formRef = useRef<{
    setFieldValue: (name: "email" | "code", value: string) => void;
  } | null>(null);
  const personalInformationForm = useForm({
    defaultValues: {
      email: defaultEmail ?? "",
      code: "",
    } as UpdateInformationValues,
    validators: {
      onSubmit: updateInformationSchema,
    },
    onSubmit: async ({ value }) => {
      changeEmailMutate(value);
    },
  });
  formRef.current = { setFieldValue: personalInformationForm.setFieldValue };

  // Run timer only when modal is open and time left > 0
  useEffect(() => {
    if (!open || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [open, timeLeft, resendCount]);

  const handleSendOtp = async () => {
    return await authClient.emailOtp.requestEmailChange({
      newEmail: personalInformationForm.state.values.email,
    });
  };

  const { mutate: sendOtpMutate, isPending: sendOtpPending } = useMutation({
    mutationFn: handleSendOtp,
    onSuccess: (data) => {
      if (data.data) {
        toast.success(
          t("admin.settings.email.otpSent") ?? "Verification code sent",
        );
        setOpen(true);
        setTimeLeft(OTP_DURATION_SECONDS);
        setResendCount((c) => c + 1);
      } else if (data.error) {
        toast.error(data.error.message);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isEmailFilled = !!personalInformationForm.state.values.email?.trim();
  const isCodeFilled = !!personalInformationForm.state.values.code?.trim();
  const canResend = timeLeft === 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        personalInformationForm.handleSubmit();
      }}
    >
      <div className="rounded-3xl bg-white p-6 md:p-10 w-full">
        <div className="mb-6 lg:mb-9">
          <h2 className="text-xl font-medium">
            {t("admin.settings.email.title")}
          </h2>
          <p className="text-gray-500 text-xs">
            {t("admin.settings.email.subtitle")}
          </p>
        </div>

        <div className="space-y-6">
          <personalInformationForm.Field
            name="email"
            children={(field) => (
              <div className="space-y-1.5">
                <InputComponent
                  id="email"
                  type="email"
                  name="email"
                  label={t("admin.settings.email.updateEmail")}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="name@example.com"
                  className="h-12 px-4 rounded-xl bg-muted border border-input focus:ring-2 focus:ring-[#F7941D]/20 focus:border-[#F7941D]"
                />
                <FieldInfo field={field} />
              </div>
            )}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-6">
          <Button
            type="button"
            loading={sendOtpPending}
            onClick={() => sendOtpMutate()}
            disabled={!isEmailFilled}
            className="bg-[#F7941D] hover:bg-amber-600 px-6 text-white"
          >
            {sendOtpPending
              ? (t("admin.settings.email.sending") ?? "Sending…")
              : (t("admin.settings.email.sendCode") ??
                t("admin.settings.email.update"))}
          </Button>
          <Modal
            open={open}
            setOpen={setOpen}
            title={t("admin.settings.email.modalTitle") ?? "Verify your email"}
            description={
              t("admin.settings.email.modalDescription") ??
              "Enter the verification code we sent to your new email address."
            }
            size="lg"
            footer={
              <div className="flex flex-wrap items-center justify-end gap-3 w-full">
                {canResend && (
                  <Button
                    type="button"
                    disabled={sendOtpPending}
                    loading={sendOtpPending}
                    onClick={() => {
                      sendOtpMutate(undefined, {
                        onSuccess: () => {
                          setTimeLeft(OTP_DURATION_SECONDS);
                          setResendCount((c) => c + 1);
                        },
                      });
                    }}
                    variant="secondary"
                    className="bg-gray-800 text-white hover:bg-gray-700"
                  >
                    {t("admin.settings.email.resendOtp")}
                  </Button>
                )}
                {!canResend && (
                  <span className="text-muted-foreground text-sm tabular-nums">
                    <TimerDisplay secondsLeft={timeLeft} />{" "}
                    {t("admin.settings.email.resendIn") ??
                      "until you can resend"}
                  </span>
                )}
                <Button
                  type="submit"
                  onClick={(e) => {
                    e.preventDefault();
                    personalInformationForm.handleSubmit();
                  }}
                  loading={changeEmailPending}
                  disabled={!isCodeFilled}
                  className="bg-[#F7941D] hover:bg-amber-600 px-6 text-white"
                >
                  {t("admin.settings.email.confirm") ??
                    t("admin.settings.email.update")}
                </Button>
              </div>
            }
          >
            <div className="flex flex-col gap-4 py-2">
              <form
                id="verify-email-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  personalInformationForm.handleSubmit();
                }}
              >
                <personalInformationForm.Field
                  name="code"
                  children={(field) => (
                    <div className="space-y-1.5">
                      <InputComponent
                        label={t("admin.settings.email.modalLabel")}
                        type="text"
                        name="code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="000000"
                        maxLength={6}
                        value={field.state.value}
                        onChange={(e) =>
                          field.handleChange(
                            e.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        className="h-12 px-4 rounded-xl bg-muted border border-input focus:ring-2 focus:ring-[#F7941D]/20 focus:border-[#F7941D] text-center text-lg tracking-widest"
                      />
                      <FieldInfo field={field} />
                      {timeLeft > 0 && (
                        <p className="text-muted-foreground text-sm">
                          <TimerDisplay secondsLeft={timeLeft} />{" "}
                          {t("admin.settings.email.expires") ??
                            "until code expires"}
                        </p>
                      )}
                    </div>
                  )}
                />
              </form>
            </div>
          </Modal>
        </div>
      </div>
    </form>
  );
};

export default Email;
