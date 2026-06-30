// Utilities for preparing user-selected images so the browser can display them
// in the cropper. The main pitfall is HEIC/HEIF (iPhone photos): most browsers
// cannot render these in an <img>, which left react-easy-crop showing a black
// box. We convert HEIC -> JPEG in the browser before cropping, and verify any
// other file actually decodes so callers can show a clear error instead of a
// silent black canvas.

const HEIC_RE = /(heic|heif)/i;

export function isHeic(file: File): boolean {
  return HEIC_RE.test(file.type) || HEIC_RE.test(file.name);
}

/** Resolves true if the browser can decode the blob URL as an image. */
export function canDecodeImage(objectUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 0 && img.naturalHeight > 0);
    img.onerror = () => resolve(false);
    img.src = objectUrl;
  });
}

/**
 * Returns a File the browser is guaranteed able to display, converting HEIC/HEIF
 * to JPEG when needed. Throws if the image cannot be decoded (e.g. corrupt or an
 * unsupported format) so the caller can surface a helpful message.
 */
export async function ensureDecodableImage(file: File): Promise<File> {
  if (isHeic(file)) {
    // Lazily load the (heavy) converter only when a HEIC file is actually picked.
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9,
    });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    const name = file.name.replace(/\.(heic|heif)$/i, ".jpg") || "image.jpg";
    return new File([blob], name, { type: "image/jpeg" });
  }

  // Not HEIC: confirm the browser can actually decode it before handing it to
  // the cropper, otherwise we'd get a black canvas with no feedback.
  const url = URL.createObjectURL(file);
  try {
    const ok = await canDecodeImage(url);
    if (!ok) {
      throw new Error("This image could not be opened. Please upload a JPG or PNG.");
    }
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Shrinks an image for upload — caps the largest dimension and re-encodes as
 * JPEG so menu/logo photos stay sharp but small. Lazily loads the compressor so
 * it's not in the initial bundle. Falls back to the original file on failure.
 */
export async function compressImage(
  file: File,
  opts: {
    maxWidthOrHeight?: number;
    maxSizeMB?: number;
    quality?: number;
    /** Use "image/png" to preserve transparency (e.g. logos). Default JPEG. */
    fileType?: "image/jpeg" | "image/png";
  } = {}
): Promise<File> {
  try {
    const { default: imageCompression } = await import("browser-image-compression");
    const fileType = opts.fileType ?? "image/jpeg";
    const compressed = await imageCompression(file, {
      maxSizeMB: opts.maxSizeMB ?? 1,
      maxWidthOrHeight: opts.maxWidthOrHeight ?? 1600,
      initialQuality: opts.quality ?? 0.85,
      useWebWorker: true,
      fileType,
    });
    const ext = fileType === "image/png" ? ".png" : ".jpg";
    const name = file.name.replace(/\.[^.]+$/, "") + ext;
    return new File([compressed], name, { type: fileType });
  } catch (err) {
    console.error("Image compression failed, uploading original:", err);
    return file;
  }
}
