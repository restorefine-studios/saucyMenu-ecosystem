import { ImageUpIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useMutation } from "@tanstack/react-query";
import MediaServices from "@/services/upload.service";
import { CropModal } from "./crop-modal";

interface FileUploadProps {
  setKey: (key: string) => void;
  folder: string;
  images?: string[];
  removeImage?: (index: number) => void;
  mediaUrl?: string;
  maxSizeMB?: number;
}

export function FileUpload({
  setKey,
  folder,
  images = [],
  removeImage,
  mediaUrl = "",
  maxSizeMB = 5,
}: FileUploadProps) {
  const maxSize = maxSizeMB * 1024 * 1024;
  const [previewForCrop, setPreviewForCrop] = useState<string | null>(null);
  // const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  // const [isUploading, setIsUploading] = useState(false);
  const [isCropOpen, setIsCropOpen] = useState(false);
  // const [isUploading, setIsUploading] = useState(false);

  const [
    { files, isDragging },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
    },
  ] = useFileUpload({
    accept: "image/*",
    maxSize,
    multiple: false,
  });

  // const handleUpload = async (file: File) => {
  //   if (file.size > maxSize) {
  //     toast.error(`File size is too large. Limit is ${maxSizeMB}mb`);
  //     return;
  //   }

  //   setIsUploading(true);
  //   try {
  //     const formData = new FormData();
  //     formData.append("file", file);
  //     formData.append("folder", folder);

  //     const response = await fetch("/api/upload", {
  //       method: "POST",
  //       body: formData,
  //     });

  //     if (!response.ok) {
  //       toast.error("Upload failed");
  //       return;
  //     }

  //     const data = await response.json();
  //     setKey(data.key || `image-${Date.now()}`);
  //     toast.success("Successfully uploaded");
  //   } catch (error) {
  //     console.error("Upload error:", error);
  //     toast.error("Something went wrong");
  //   } finally {
  //     setIsUploading(false);
  //   }
  // };

  // useEffect(() => {
  //   if (files.length > 0 && files[0]?.file instanceof File && !isUploading) {
  //     handleUpload(files[0].file);
  //   }
  // }, [files, isUploading]);

  // const previewUrl = files[0]?.preview || null;

  const uploadToMediaService = async (file: FormData) => {
    const res = await MediaServices.uploadImage(file);
    return res.data.data;
  };

  const { mutateAsync: mutateUploadService } = useMutation({
    mutationFn: uploadToMediaService,
    onSuccess: (data) => {
      if (data?.success) {
        // ✅ Only set the key if it's NOT a thumbnail
        if (!data?.key?.startsWith("thumbnails")) {
          setKey(data?.key);
        }
        console.log("image data:", data);
      } else {
        toast.warning(data?.message);
      }
    },
  });

  const handleUpload = async (file: File) => {
    if (file.size > 1024 * 1024 * 5) {
      toast.error("File size is too large. Limit is 5mb");
      return;
    }

    if (!file) return;

    // const compressedFile = await imageCompression(file, {
    //   maxWidthOrHeight: 512,
    //   useWebWorker: true,
    //   fileType: "image/webp", // optional: WebP is smaller
    //   alwaysKeepResolution: true, // optional: keeps the resolution of the original image
    // });

    const uploads = [
      { file: file, folder: folder }, // original
      // { file: compressedFile, folder: `thumbnails/${folder}` }, // thumbnail
    ];

    for (const { file, folder } of uploads) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      try {
        toast.promise(mutateUploadService(formData), {
          loading: "Uploading...",
          success: "Successfully uploaded",
          error: "Something went wrong",
        });
      } catch (error) {
        console.error(`Error uploading to ${folder}:`, error);
      }
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    await handleUpload(croppedFile);
    setPreviewForCrop(null);
    // setFileToUpload(null);
  };
  // Trigger upload when a file is dropped or selected
  useEffect(() => {
    if (files.length > 0 && files[0]?.file instanceof File && !isCropOpen) {
      const file = files[0].file;
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewForCrop(reader.result as string);
        // setFileToUpload(file);
        setIsCropOpen(true);
      };
      reader.readAsDataURL(file);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  // console.log(isCropOpen);

  const hasImages = images.length > 0 && !!removeImage;

  const uploadTile = (
    <div
      role="button"
      onClick={openFileDialog}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      data-dragging={isDragging || undefined}
      className={`border-border hover:bg-secondary/40 data-[dragging=true]:bg-secondary/60 data-[dragging=true]:border-foreground/40 has-[input:focus]:border-ring has-[input:focus]:ring-ring/50 relative flex items-center justify-center overflow-hidden rounded-lg border border-neutral transition-all duration-200 hover:cursor-pointer ${
        hasImages ? "w-32 lg:w-40 h-32 lg:h-40" : "w-full h-40 p-8"
      }`}
    >
      <input
        {...getInputProps()}
        className="sr-only"
        aria-label="Upload file"
      />
      <div className="flex flex-col items-center justify-center gap-2">
        <ImageUpIcon className="size-5 text-muted-foreground" />
        <span className="text-gray-600 text-xs font-semibold text-center">
          Click to Upload
        </span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-wrap gap-4">
        {hasImages &&
          images.map((url: string, i: number) => (
            <div
              key={i}
              className="relative w-32 lg:w-40 h-32 lg:h-40 border rounded-lg overflow-hidden group"
            >
              <img
                src={mediaUrl + url || "/placeholder.svg"}
                alt={`Uploaded ${i}`}
                className="w-full h-full object-cover rounded"
              />
              <button
                type="button"
                onClick={() => removeImage!(i)}
                className="absolute top-1 right-1 text-white rounded-full p-1 hover:cursor-pointer transition-all"
              >
                <Trash2 color="red" className="w-4 h-4 hover:w-5 hover:h-5" />
              </button>
            </div>
          ))}
        {uploadTile}
      </div>

      {previewForCrop && (
        <CropModal
          isOpen={isCropOpen}
          imageSrc={previewForCrop}
          onClose={() => {
            setIsCropOpen(false);
            setPreviewForCrop(null);
            // setFileToUpload(null);
          }}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
