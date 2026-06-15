import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet } from "lucide-react";
import { Modal } from "@/components/modal";
import apiRoutes from "@/apiRoutes";
import { axiosInstance } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Bulk = () => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { t } = useTranslation();

  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (
      droppedFile &&
      (droppedFile.type.includes("sheet") ||
        droppedFile.name.endsWith(".xlsx") ||
        droppedFile.name.endsWith(".xls"))
    ) {
      setFile(droppedFile);
    }
  };

  const handleBulkImport = async () => {
    const formData = new FormData();
    formData.append("file", file as File);
    const res = await axiosInstance.post(apiRoutes.bulkDishes, formData);
    return res.data;
  };

  const { mutate, isPending } = useMutation({
    mutationFn: handleBulkImport,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data?.message);
      } else {
        toast.error(data?.message);
      }
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err?.response?.data?.message);
    },
  });

  return (
    <div>
      <Button onClick={() => setOpen(true)}>
        {t("admin.menu.addDish.topSide.btn")}
      </Button>
      <Modal
        open={open}
        setOpen={setOpen}
        title={t("admin.menu.addDish.bulkUpload.title")}
        size="xl"
       
      >
        <div className="p-6">
          <div className="space-y-3" >
            <CardContent className="p-0">
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center space-y-4 transition-colors hover:border-muted-foreground/50"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">
                    {t("admin.menu.addDish.bulkUpload.uploadBox.upload")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("admin.menu.addDish.bulkUpload.uploadBox.dragAndDrop")}
                  </p>
                </div>
                <div>
                  <Label htmlFor="file-upload" className="grid place-items-center cursor-pointer">
                    <Input
                      ref={fileRef}
                      id="file-upload"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                    className="w-fit"
                      variant={"outline"}
                      onClick={() => fileRef.current?.click()}
                    >
                      {t("admin.menu.addDish.bulkUpload.uploadBox.btn")}
                    </Button>
                  </Label>
                </div>
              </div>

              {file && (
                <div className="mt-4 flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
            <Alert>
              <AlertTitle>
                {t("admin.menu.addDish.bulkUpload.instructions.title")}
              </AlertTitle>
              <AlertDescription>
                <ol>
                  <li>
                    {t("admin.menu.addDish.bulkUpload.instructions.1")}{" "}
                    <strong>
                      {t("admin.menu.addDish.bulkUpload.instructions.download")}
                    </strong>{" "}
                    {t("admin.menu.addDish.bulkUpload.instructions.2")}{" "}
                    <code>
                      {t("admin.menu.addDish.bulkUpload.instructions.xlsx")}
                    </code>{" "}
                    {t("admin.menu.addDish.bulkUpload.instructions.file")}
                  </li>
                  <li>{t("admin.menu.addDish.bulkUpload.instructions.3")}</li>
                  <li>
                    <strong>
                      {t(
                        "admin.menu.addDish.bulkUpload.instructions.important"
                      )}
                    </strong>{" "}
                    {t("admin.menu.addDish.bulkUpload.instructions.4")}
                  </li>
                  <li>
                    {t("admin.menu.addDish.bulkUpload.instructions.5")}
                    <strong>
                      {t("admin.menu.addDish.bulkUpload.instructions.comma")}
                    </strong>
                    {t("admin.menu.addDish.bulkUpload.instructions.forExample")}
                    <code>
                      {t("admin.menu.addDish.bulkUpload.instructions.rice")}
                    </code>
                  </li>
                </ol>
              </AlertDescription>
            </Alert>
            <div className="mt-5 flex flex-wrap items-center justify-self-end gap-x-1" >
 <Button asChild variant={"outline"} className=" bg-black text-white mt-0">
              <a href="/src/assets/dish-upload-template.xlsx" download>
                {t("admin.menu.addDish.bulkUpload.instructions.btn")}
              </a>
            </Button>
            <Button onClick={() => mutate()} loading={isPending}>
            {t("admin.menu.addDish.bulkUpload.uploadBtn")}
          </Button>
            </div>
           
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Bulk;
