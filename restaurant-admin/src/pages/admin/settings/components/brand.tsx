/* eslint-disable @typescript-eslint/no-explicit-any */
import apiRoutes from "@/apiRoutes";
import { Button } from "@/components/ui/button";
import { InputComponent } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSetup } from "@/hooks/useFetchData";
import { axiosInstance, mediaUrl } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { useAtom } from "jotai";
import { userAtom } from "@/atoms/user";
import { Modal } from "@/components/modal";
import { useState } from "react";
// import { FileUpload } from "@/components/file-upload";
import LogoUploader from "@/components/cropper";

interface Props {
  brand: {
    description: string | undefined;
    address?: string | undefined;
    image?: string | undefined;
    currencyId?: string | undefined;
  };
}

const customizeSchema = z.object({
  description: z.string().optional(),
  address: z.string().optional(),
  languageId: z.string().uuid().optional(),
  image: z.string().optional(),
  currencyId: z.string().uuid().optional(),
  bannerUrl: z.string().optional(),
});

const Brand = ({ brand }: Props) => {
  const { t, i18n } = useTranslation();
  type customizeValues = z.infer<typeof customizeSchema>;
  const { data: setupData } = useSetup();
  const [user, setUser] = useAtom(userAtom);

  const [open, setOpen] = useState(false);
  const [logoOpen, setLogoOpen] = useState(false);
  // const [, setUser] = useAtom(userAtom);

  // function signOut() {
  //   window.location.reload();
  //   setUser(null);
  //   redirect("/");
  // }

  const changeLang = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const form = useForm({
    defaultValues: {
      description: brand?.description ?? "",
      address: brand?.address ?? "",
      languageId: user?.languageId ?? "",
      image: brand?.image ?? "",
      currencyId: brand?.currencyId ?? "",
    } as customizeValues,
    validators: {
      onSubmit: customizeSchema,
    },
    onSubmit: async ({ value }) => {
      mutate(value);
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (formData: customizeValues) => {
      const changedLang = setupData?.data.languages.find(
        (lang) => lang.id === formData.languageId
      );
      if (changedLang) {
        changeLang(changedLang.code);
      }
      const response = await axiosInstance.put(
        apiRoutes.updatePersonalInfo,
        formData
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data?.message);
        setUser({
          ...(user as any),
          languageId: form.state.values.languageId,
          restaurant: {
            ...(user?.restaurant as any),
            currencies: setupData?.data.currencies.find(
              (currency) => currency.id === form.state.values.currencyId
            ),
          },
        });
        // window.location.reload();
        // form.reset();
        // signOut();
      } else {
        toast.error(data?.message);
      }
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err?.response?.data?.message);
    },
  });

  function getAfterFirstDash(input: string) {
    const index = input.indexOf("-");
    if (index === -1) return ""; // or return input if you want to keep it unchanged
    return input.slice(index + 1);
  }

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <div className="bg-white rounded-3xl p-6 md:p-10 w-full">
          <div className="mb-6 lg:mb-9">
            <h2 className="text-xl font-medium">
              {t("admin.settings.brand.title")}
            </h2>
            <p className="text-gray-500 text-xs">
              {t("admin.settings.brand.subtitle")}
            </p>
          </div>
          <div className="space-y-6">
            {/* Update Logo */}
            <form.Field
              name="image"
              children={(field) => (
                <div className="space-y-1">
                  <label
                    htmlFor="language"
                    className="block font-inter text-sm text-gray-600 font-medium"
                  >
                    {t("admin.settings.brand.form.logoLabel")}
                  </label>

                  <div
                    onClick={() => setLogoOpen(true)}
                    className="flex items-center gap-4 pl-4 pr-10 py-4 bg-gray-100 hover:bg-gray-200 border-none rounded-xl hover:cursor-pointer"
                  >
                    {field.state.value ? (
                      <>
                        <img
                          src={mediaUrl + field.state.value}
                          alt="Logo"
                          className="h-12 w-12 rounded-full object-cover shrink-0"
                        />
                        <p className="text-gray-600 text-sm">Click to change logo</p>
                      </>
                    ) : (
                      <p className="text-gray-500 text-sm">Click to upload logo</p>
                    )}
                  </div>
                  <Modal
                    open={logoOpen}
                    setOpen={setLogoOpen}
                    title=""
                    size="xl"
                  >
                    <LogoUploader
                      type="logo"
                      setKey={(value) => field.setValue(value)}
                      folder="SetupLogo"
                      setOpen={setLogoOpen}
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
                        <img src={mediaUrl + field.state.value} alt="Preview" />
                      </div>
                    </Modal>
                  )}
                </div>
              )}
            />
            {/* Update Banner */}
            <form.Field
              name="bannerUrl"
              children={(field) => (
                <div className="space-y-1">
                  <label
                    htmlFor="language"
                    className="block font-inter text-sm text-gray-600 font-medium"
                  >
                    {t("admin.settings.brand.form.bannerLabel")}
                  </label>

                  <div
                    onClick={() => setOpen(true)}
                    className="relative bg-gray-100 hover:bg-gray-200 border-none rounded-xl hover:cursor-pointer overflow-hidden"
                  >
                    {field.state.value ? (
                      <>
                        <img
                          src={mediaUrl + field.state.value}
                          alt="Banner"
                          className="w-full h-32 object-cover"
                        />
                        <p className="absolute bottom-2 right-3 text-white text-xs bg-black/40 px-2 py-0.5 rounded-full">
                          Click to change
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-500 text-sm pl-4 py-6">Click to upload banner</p>
                    )}
                  </div>
                  <Modal open={open} setOpen={setOpen} title="" size="xl">
                    {/* <FileUpload
                                  setKey={(value) => field.setValue(value)}
                                  folder="SetupLogo"
                                /> */}
                    <LogoUploader
                      type="banner"
                      setKey={(value) => field.setValue(value)}
                      folder="SetupBanner"
                      setOpen={setOpen}
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
                        <img src={mediaUrl + field.state.value} alt="Preview" />
                      </div>
                    </Modal>
                  )}
                </div>
              )}
            />
            <form.Field
              name="description"
              children={(field) => (
                <InputComponent
                  label={t("admin.settings.brand.form.sloganLabel")}
                  id="slogan"
                  name="slogan"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  type="text"
                  placeholder={t("admin.settings.brand.form.sloganPlaceholder")}
                  className="pl-4 pr-10 py-8 bg-gray-100 border-none rounded-xl"
                />
              )}
            />
            <form.Field
              name="address"
              children={(field) => (
                <InputComponent
                  label={t("admin.settings.brand.form.addressLabel")}
                  id="address"
                  name="address"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  type="text"
                  placeholder={t(
                    "admin.settings.brand.form.addressPlaceholder"
                  )}
                  className="pl-4 pr-10 py-8 bg-gray-100 border-none rounded-xl"
                />
              )}
            />

            <form.Field
              name="languageId"
              children={(field) => (
                <div className="space-y-1">
                  <label className="font-inter text-sm text-gray-600 font-medium">
                    {t("admin.settings.brand.form.languageLabel")}
                  </label>
                  <div className="relative">
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value)}
                    >
                      <SelectTrigger className="w-full py-8 bg-gray-100 border-none rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {setupData?.data.languages?.map((language) => (
                          <SelectItem key={language?.id} value={language?.id}>
                            {language?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <ChevronRight className="h-5 w-5 text-gray-400 rotate-90" />
                    </div>
                  </div>
                </div>
              )}
            />
            <form.Field
              name="currencyId"
              children={(field) => (
                <div className="space-y-1">
                  <label className="font-inter text-sm text-gray-600 font-medium">
                    {t("admin.settings.brand.form.currencyLabel")}
                  </label>
                  <div className="relative">
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value)}
                    >
                      <SelectTrigger className="w-full py-8 bg-gray-100 border-none rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {setupData?.data.currencies?.map((currency) => (
                          <SelectItem key={currency?.id} value={currency?.id}>
                            {currency?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <ChevronRight className="h-5 w-5 text-gray-400 rotate-90" />
                    </div>
                  </div>
                </div>
              )}
            />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <Button
              className="bg-transparent border text-black  hover:bg-gray-200 hover:cursor-pointer border-gray-200"
              type="button"
              onClick={() => form.reset()}
            >
              {t("admin.settings.brand.buttons.cancel")}
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={() => (
                <Button
                  loading={isPending}
                  type="submit"
                  className="bg-[#F7941D] hover:bg-amber-600 px-6 hover:cursor-pointer"
                >
                  {t("admin.settings.brand.buttons.update")}
                </Button>
              )}
            />
          </div>
        </div>
      </form>
    </>
  );
};

export default Brand;
