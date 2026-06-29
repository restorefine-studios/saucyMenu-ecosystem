/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
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

  const handleCropAreaChange = (_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleUploadClick = async () => {
    if (!croppedAreaPixels) return;

    const image = new Image();
    image.src = imageSrc;

    image.onload = () => {
      const { width, height, x, y } = croppedAreaPixels;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            const croppedFile = new File([blob], "cropped-image.jpg", {
              type: "image/jpeg",
            });
            onCropComplete(croppedFile);
            onClose();
          }
        }, "image/jpeg");
      }
    };
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

        {/* Cropper container — plain div, NOT inside a portal */}
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
            onZoomChange={setZoom}
            cropShape="rect"
            showGrid
            objectFit="contain"
          />
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
            className="bg-[#F7941D] hover:bg-amber-600 text-white"
          >
            Upload
          </Button>
        </div>
      </div>
    </div>
  );
}
