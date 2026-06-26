import { InputComponent } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import setupImg from "@/assets/SetupImg.jpeg";
import { Button } from "@/components/ui/button";
import { useForm } from "@tanstack/react-form";

import { useSetup } from "@/hooks/useFetchData";
import apiRoutes from "../../../apiRoutes";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { axiosInstance, mediaUrl } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { Modal } from "@/components/modal";
import { useTranslation } from "react-i18next";
import LoadingSkeleton from "./components/loading-skeleton";
import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { userAtom } from "@/atoms/user";
import LogoUploader from "@/components/cropper";
import { authClient } from "@/lib/auth-client";

interface SetupValues {
  name: string;
  image: string;
  description: string;
  currencyId: string;
  languageId: string;
}

const setupSchema = z.object({
  name: z.string().min(3, { message: "Please enter a valid brand Name" }),
  image: z.string(),
  description: z
    .string()
    .min(3, { message: "Please enter the brand description " }),
  currencyId: z.string().min(1, "Please select a currency"),
  languageId: z.string().min(1, "Please select a currency"),
});

const Setup = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [, setUser] = useAtom(userAtom);

  const getSession = async () => {
    await authClient.getSession({
      fetchOptions:{
        onSuccess: (data) => {
          setUser(data?.data?.user);
        }
      }
    });

  };

  useEffect(() => {
    getSession();
  }, []);

  const { t, i18n } = useTranslation();

  const { mutate, isPending } = useMutation({
    mutationFn: async (setupData: SetupValues) => {
      const response = await axiosInstance.post(
        apiRoutes.createRestaurant,
        setupData
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success(data?.message);
        // setUser(data?.data);
        navigate("/admin/subscription");
      } else {
        toast.error(data?.message);
      }
    },
    onError: (err) => {
      console.log(err);
    },
  });

  const { data, isLoading } = useSetup();

  const form = useForm({
    defaultValues: {
      name: "",
      image: "",
      description: "",
      currencyId: "",
      languageId: "",
    } as SetupValues,
    validators: {
      onSubmit: setupSchema,
    },

    onSubmit: async ({ value }) => {
      const chosenLocale = data?.data.languages.find(
        (lang) => lang.id === value.languageId
      );
      i18n.changeLanguage(chosenLocale?.code);
      mutate(value);
    },
  });

  function getAfterFirstDash(input: string) {
    const index = input.indexOf("-");
    if (index === -1) return ""; // or return input if you want to keep it unchanged
    return input.slice(index + 1);
  }

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="flex flex-1 gap-8 flex-col md:flex-row md:px-10 px-5 mx-auto w-full ">
      {/* Left Side - Image */}
      <div className="w-2/5">
        <div className="rounded-3xl overflow-hidden">
          <img
            src={setupImg}
            alt="Countryside landscape"
            className="object-cover rounded-2xl md:h-[600px] md:w-[508px] h-0 w-0 "
          />
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full">
        <div className="mb-8">
          <span className="bg-black text-white px-6 py-3 rounded-full inline-block">
            {t("auth.setup.header")}
          </span>
        </div>

        <h1 className="text-3xl font-semibold mb-10">
          {t("auth.setup.title.1")}
          <br />
          {t("auth.setup.title.2")}
        </h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="grid md:grid-cols-2 gap-6 md:mb-0 mb-8">
            {/* Brand Name */}
            <form.Field
              name="name"
              children={(field) => (
                <div className="space-y-2">
                  <InputComponent
                    label={t("auth.setup.form.brandName.label")}
                    type="text"
                    id="brandName"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={t("auth.setup.form.brandName.placeholder")}
                    className="pl-4 pr-10 py-8 bg-gray-100 border-none rounded-xl"
                  />
                  {field.state.meta.errors ? (
                    <p className="text-sm text-red-500 mt-1">
                      {field.state.meta.errors.map((err) => (
                        <text className="">{err?.message}</text>
                      ))}
                    </p>
                  ) : null}
                </div>
              )}
            />

            {/* Update Logo */}
            <form.Field
              name="image"
              children={(field) => (
                <div className="space-y-1">
                  <label
                    htmlFor="language"
                    className="block font-inter text-sm text-gray-600 font-medium"
                  >
                    Upload Logo
                  </label>
                  <div className="flex items-center gap-3 ">
                    <div
                      onClick={() => setOpen(true)}
                      className="pl-4 pr-10 py-6 bg-gray-100 hover:bg-gray-200 border-none rounded-xl hover:cursor-pointer w-full "
                    >
                      <p className="text-gray-500 text-sm">
                        {field.state.value
                          ? getAfterFirstDash(field.state.value)
                          : "Click to upload logo"}
                      </p>
                    </div>
                    <Modal open={open} setOpen={setOpen} title="" size="xl">
                      {/* <FileUpload
                      setKey={(value) => field.setValue(value)}
                      folder="SetupLogo"
                    /> */}
                      <LogoUploader
                        setKey={(value) => field.setValue(value)}
                        folder="SetupLogo"
                        setOpen={setOpen}
                        type="logo"
                      />
                    </Modal>
                    {field.state.value && (
                      <Modal
                        trigger={
                          <span className="text-xs text-blue-400 cursor-pointer">
                            Preview
                          </span>
                        }
                        footer={
                          <Button
                            onClick={() => {
                              field.setValue("");
                              setOpen(false);
                            }}
                            variant={"destructive"}
                          >
                            Clear
                          </Button>
                        }
                      >
                        <div className="items-center justify-center flex">
                          <img
                            src={mediaUrl + field.state.value}
                            alt="Preview"
                          />
                        </div>
                      </Modal>
                    )}
                  </div>
                </div>
              )}
            />

            {/* Brand Slogan */}
            <form.Field
              name="description"
              children={(field) => (
                <div className="space-y-2">
                  <InputComponent
                    label={t("auth.setup.form.brandSlogan.label")}
                    type="text"
                    id="description"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={t("auth.setup.form.brandSlogan.placeholder")}
                    className="pl-4 pr-10 py-8 bg-gray-100 border-none rounded-xl"
                  />
                  {field.state.meta.errors ? (
                    <p className="text-sm text-red-500 mt-1">
                      {field.state.meta.errors.map((err) => (
                        <text className="">{err?.message}</text>
                      ))}
                    </p>
                  ) : null}
                </div>
              )}
            />

            {/* Default Currency */}
            <form.Field
              name="currencyId"
              children={(field) => (
                <div className="space-y-2">
                  <label
                    htmlFor="currencyId"
                    className="block font-inter text-sm text-gray-600 font-medium"
                  >
                    {t("auth.setup.form.currency.label")}
                  </label>
                  <div className="relative">
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value)}
                    >
                      <SelectTrigger className="w-full py-8 bg-gray-100 border-none rounded-xl">
                        <SelectValue
                          placeholder={t(
                            "auth.setup.form.currency.placeholder"
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {data?.data?.currencies?.map((currency) => (
                          <SelectItem key={currency.id} value={currency.id}>
                            ({currency.symbol}) {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <ChevronRight className="h-5 w-5 text-gray-400 rotate-90" />
                    </div>
                  </div>
                  {field.state.meta.errors ? (
                    <p className="text-sm text-red-500 mt-1">
                      {field.state.meta.errors.map((err) => (
                        <text className="">{err?.message}</text>
                      ))}
                    </p>
                  ) : null}
                </div>
              )}
            />

            {/* Default Language */}
            <form.Field
              name="languageId"
              children={(field) => (
                <div className="space-y-2">
                  <label
                    htmlFor="languageId"
                    className="block font-inter text-sm text-gray-600 font-medium"
                  >
                    {t("auth.setup.form.language.label")}
                  </label>

                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value)}
                  >
                    <SelectTrigger className="w-full py-8 bg-gray-100 border-none rounded-xl">
                      <SelectValue
                        placeholder={t("auth.setup.form.language.placeholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {data?.data?.languages?.map((language) => (
                        <SelectItem key={language.id} value={language.id}>
                          {language.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            />

            {/* Action Buttons */}
            <div className="flex flex-row space-x-5  items-end">
              <Button
                asChild
                variant="secondary"
                type="button"
                className="w-full py-8  hover:bg-gray-900 hover:cursor-pointer text-white rounded-xl"
              >
                <Link to="/">
                  <ArrowLeft className="ml-2 h-4 w-4" />{" "}
                  {t("auth.setup.form.back")}
                </Link>
              </Button>
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
                children={([canSubmit, isSubmitting]) => (
                  <>
                    {isSubmitting ? (
                      <Button
                        type="submit"
                        disabled={!canSubmit}
                        loading={isPending}
                        className="w-full py-8 bg-orange-400 hover:bg-orange-500 hover:cursor-pointer text-white rounded-xl"
                      >
                        loading...
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        loading={isPending}
                        disabled={!canSubmit}
                        className="w-full py-8 bg-orange-400 hover:bg-orange-500 hover:cursor-pointer text-white rounded-xl"
                      >
                        {t("auth.setup.form.submit")}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </>
                )}
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Setup;
