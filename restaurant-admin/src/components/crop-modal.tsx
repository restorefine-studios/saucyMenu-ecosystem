/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import { Button } from "@/components/ui/button";
import "react-easy-crop/react-easy-crop.css";

interface CropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedFile: File) => void;
  aspect?: number;
}

export function CropModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  aspect = 1,
}: CropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  // Track whether the image actually decoded. Callers convert HEIC and validate
  // before opening this modal, but this is a safety net so an undecodable image
  // shows a message instead of a silent black canvas (the old failure mode).
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    setStatus("loading");
    if (!imageSrc) return;
    // Give the cropper a moment to load; if it never reports a media size,
    // surface an error rather than leaving the box black forever.
    const timer = setTimeout(() => {
      setStatus((s) => (s === "loading" ? "error" : s));
    }, 8000);
    return () => clearTimeout(timer);
  }, [imageSrc]);

  const handleCropAreaChange = (_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleUploadClick = async () => {
    if (!croppedAreaPixels) return;

    const { width, height, x, y } = croppedAreaPixels;

    try {
      const file = await new Promise<File>((resolve, reject) => {
        const image = new Image();
        // onload MUST be assigned before src so it still fires when the browser
        // serves the image from its in-memory cache (it already loaded it once
        // for the cropper). Otherwise the upload silently does nothing.
        image.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("No canvas context"));
            return;
          }
          ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob)
              resolve(new File([blob], "cropped-image.jpg", { type: "image/jpeg" }));
            else reject(new Error("Canvas is empty"));
          }, "image/jpeg");
        };
        image.onerror = () => reject(new Error("Failed to load image"));
        image.src = imageSrc;
      });
      onCropComplete(file);
      onClose();
    } catch (err) {
      console.error("Crop error:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Crop Image</h2>

        <div
          style={{
            position: "relative",
            width: "100%",
            height: 380,
            background: "#171717",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <Cropper
            key={imageSrc}
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onCropComplete={handleCropAreaChange}
            onMediaLoaded={() => setStatus("ready")}
            onZoomChange={setZoom}
            cropShape="rect"
            showGrid
            objectFit="contain"
          />

          {status !== "ready" && (
            <div className="absolute inset-0 flex items-center justify-center text-center px-6 text-sm text-white/80 pointer-events-none">
              {status === "loading"
                ? "Loading image…"
                : "This image couldn't be displayed. Please cancel and try a JPG or PNG."}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number.parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleUploadClick}
            disabled={status !== "ready"}
            className="bg-[#F7941D] hover:bg-amber-600 text-white disabled:opacity-50"
          >
            Upload
          </Button>
        </div>
      </div>
    </div>
  );
}
