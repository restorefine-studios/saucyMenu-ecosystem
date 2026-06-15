import { useState, useRef } from "react";
import QRCode from "react-qr-code";
import { Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

interface QRCodeSettingsProps {
  restaurantId: string;
  restaurantName: string;
  slug?: string;
}

export default function QRCodeSettings({
  restaurantId,
  restaurantName,
  slug,
}: QRCodeSettingsProps) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const { t } = useTranslation();

  const menuUrl = slug
    ? `https://menu.saucymenu.com/r/${slug}`
    : `https://menu.saucymenu.com?id=${restaurantId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(menuUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const downloadQRCode = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    // Create a canvas to convert SVG to image
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    // Set canvas size
    canvas.width = 512;
    canvas.height = 512;

    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      // Fill white background
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }

      // Download the image
      canvas.toBlob((blob) => {
        if (blob) {
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = downloadUrl;
          link.download = `${restaurantName
            .replace(/\s+/g, "-")
            .toLowerCase()}-menu-qr.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);
        }
      }, "image/png");

      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle> {t("admin.settings.qrCode.header.title")}</CardTitle>
          <CardDescription>
            {t("admin.settings.qrCode.header.subTitle")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* QR Code Display */}
          <div className="flex flex-col items-center space-y-4">
            <div
              ref={qrRef}
              className="p-4 bg-white rounded-lg border-2 border-gray-200 shadow-sm"
            >
              <QRCode
                value={menuUrl}
                size={200}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox="0 0 256 256"
              />
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                {t("admin.settings.qrCode.body.qrCodeTitle")}
              </p>
              <p className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded">
                {restaurantName}
              </p>
            </div>
          </div>

          {/* Menu URL */}
          <div className="space-y-2">
            <Label htmlFor="menu-url">
              {t("admin.settings.qrCode.body.menuUrl")}
            </Label>
            <div className="flex space-x-2">
              <Input
                id="menu-url"
                value={menuUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                onClick={copyToClipboard}
                variant="outline"
                size="icon"
                className="shrink-0 bg-transparent"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {copied && (
              <p className="text-sm text-green-600">
                {t("admin.settings.qrCode.body.copied")}
              </p>
            )}
          </div>

          {/* Download Button */}
          <div className="flex justify-center">
            <Button onClick={downloadQRCode} className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              {t("admin.settings.qrCode.button")}
            </Button>
          </div>

          {/* Usage Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">
              {t("admin.settings.qrCode.footer.title")}
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>{t("admin.settings.qrCode.footer.step1")}</li>
              <li>{t("admin.settings.qrCode.footer.step2")}</li>
              <li>{t("admin.settings.qrCode.footer.step3")}</li>
              <li>{t("admin.settings.qrCode.footer.step4")}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
