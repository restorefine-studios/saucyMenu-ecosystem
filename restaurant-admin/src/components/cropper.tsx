/* eslint-disable @typescript-eslint/no-explicit-any */
import MediaServices from "@/services/upload.service";
import { useMutation } from "@tanstack/react-query";
import React, { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { ImageIcon } from "lucide-react";

interface FileUploadProps {
  setKey: (key: string) => void;
  folder: string;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  type: "logo" | "banner";
}

export default function LogoUploader({
  setKey,
  folder,
  setOpen,
  type,
}: FileUploadProps) {
  const [image, setImage] = useState<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!image || !croppedAreaPixels) return;

    const croppedBlob = await getCroppedImg(
      URL.createObjectURL(image),
      croppedAreaPixels
    );

    const croppedFile = new File([croppedBlob], "logo.png", {
      type: "image/png",
    });

    const uploads = [
      { file: croppedFile, folder: folder }, // original
      // { file: compressedFile, folder: `thumbnails/${folder}` }, // thumbnail
    ];

    for (const { file, folder } of uploads) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      try {
        mutateUploadService(formData);
      } catch (error) {
        console.error(`Error uploading to ${folder}:`, error);
      }
    }
  };

  const uploadToMediaService = async (file: FormData) => {
    const res = await MediaServices.uploadImage(file);
    return res.data;
  };

  const { mutate: mutateUploadService, isPending } = useMutation({
    mutationFn: uploadToMediaService,
    onSuccess: (data) => {
      if (data?.success) {
        toast.success(data?.message);
        if (!data?.key?.startsWith("thumbnails")) {
          setKey(data?.key);
          setOpen(false);
        }
      } else {
        toast.warning(data?.message);
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? "Upload failed";
      toast.error(msg);
    },
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="hidden"
      />
      {!image && (
        <div
          onClick={handleUploadClick}
          className="relative flex flex-col items-center justify-center w-full min-h-[200px] rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 bg-muted/20 hover:bg-muted/40 transition-all duration-200 cursor-pointer group"
        >
          <div className="flex flex-col items-center justify-center gap-3 p-8">
            <div className="rounded-full bg-muted p-4 group-hover:bg-muted-foreground/10 transition-colors">
              <ImageIcon className="h-8 w-8 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                Click to upload
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or drag and drop your image here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {type === "logo" ? "Square image recommended" : "Banner image recommended"}
              </p>
            </div>
          </div>
        </div>
      )}

      {image && (
        <div
          className="crop-container"
          style={{ position: "relative", width: "100%", height: 300 }}
        >
          <Cropper
            image={URL.createObjectURL(image)}
            crop={crop}
            zoom={zoom}
            aspect={type === "banner" ? 21 / 9 : 1} // 1:1 aspect ratio for square logo
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape={type === "logo" ? "round" : "rect"} // Optional: round crop for logos
            showGrid={true} // Helps with alignment
            objectFit="contain" // or "cover" depending on your needs
          />
        </div>
      )}
      <div className="mt-5 flex justify-end">
        <Button loading={isPending} onClick={handleUpload}>
          Upload
        </Button>
      </div>
    </>
  );
}

function getCroppedImg(imageSrc: string, crop: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      canvas.width = crop.width;
      canvas.height = crop.height;

      ctx.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height
      );

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas is empty"));
      }, "image/png");
    };
    image.onerror = () => reject(new Error("Failed to load image"));
  });
}
