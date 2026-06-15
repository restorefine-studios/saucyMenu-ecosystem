/* eslint-disable @typescript-eslint/no-explicit-any */

import { useForm } from "@tanstack/react-form";

import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import OtpInputBlock from "./components/OtpInputBlock";
import TimerDisplay from "./components/TimerDisplay";
import { useVerifyOtp } from "@/hooks/useMutations";
import { LoadingSubmitButton } from "@/components/LoadingSubmitButton";

export interface OtpResetValues {
  code: string;
}

const VerifyOtp = ({ onNext }: any) => {
  const [timeLeft, setTimeLeft] = useState(300);
  const [resendCount] = useState(0);

  const { t } = useTranslation();

  const resetEmail = localStorage.getItem("resetEmail");

  const { mutate, isPending } = useVerifyOtp(onNext);

  // const handleResendOtp = async () => {
  //   try {
  //     const response = await axiosInstance.post(apiRoutes.resendOtp);

  //     if (response.data.success) {
  //       toast.success("A new OTP has been sent to your email.");
  //       setResendCount((count) => count + 1);
  //     } else {
  //       toast.error(response.data.message || "Failed to resend OTP.");
  //     }
  //   } catch (error: any) {
  //     toast.error(error?.response?.data?.message || "Something went wrong.");
  //   }
  // };

  const form = useForm({
    defaultValues: {
      code: "",
    } as OtpResetValues,
    onSubmit: async ({ value }) => {
      const payload = {
        ...value,
        email: resetEmail,
      };
      mutate(payload);
      localStorage.setItem("resetOtp", value.code);
    },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [resendCount]);

  return (
    <div className="mt-12 max-w-md mx-auto w-full flex flex-col justify-between  h-full">
      <div>
        <h1 className="text-3xl font-inter  font-semibold mb-8 ">
          {t("auth.enterOtp.title.1")}
          <br />
          {t("auth.enterOtp.title.2")}
        </h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <div className="space-y-6">
          {/* code */}
          <form.Field
            name="code"
            children={(field) => (
              <>
                <OtpInputBlock
                  value={field.state.value}
                  onChange={field.handleChange}
                />
                <TimerDisplay secondsLeft={timeLeft} />
              </>
            )}
          />

          <div className="flex flex-row space-x-5 mt-5">
            {/* <Button
              disabled={timeLeft != 0}
              onClick={handleResendOtp}
              variant="secondary"
              className="w-full py-8  hover:bg-gray-900 hover:cursor-pointer text-white rounded-xl"
            >
              {t("auth.enterOtp.form.resendCode")}
            </Button> */}
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
        </div>
      </form>
    </div>
  );
};

export default VerifyOtp;
