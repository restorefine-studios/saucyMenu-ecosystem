/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import Cropper from "react-easy-crop";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const handleCropAreaChange = (_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleUploadClick = async () => {
    if (!croppedAreaPixels) return;

    try {
      const canvas = document.createElement("canvas");
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = imageSrc;

      image.onload = () => {
        const { width, height, x, y } = croppedAreaPixels;

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
    } catch (error) {
      console.error("Crop error:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop Image</DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-96 bg-neutral-900 rounded-lg" style={{ overflow: 'visible' }}>
          <Cropper
            key={imageSrc}
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onCropAreaChange={handleCropAreaChange}
            onZoomChange={setZoom}
            cropShape="rect"
            showGrid
            objectFit="contain"
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Zoom</label>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleUploadClick}>Upload</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
