/**
 * Client-side Real Image Super-Resolution & Enhancement Engine
 * Supports 2x, 4x, 8x upscale with multi-pass bicubic supersampling
 * */
import { removeWatermarksFromCanvas } from "./watermarkInpainter";

export type UpscaleResult = {
  blobUrl: string;
  originalWidth: number;
  originalHeight: number;
  upscaledWidth: number;
  upscaledHeight: number;
  fileSizeBytes: number;
  fileSizeFormatted: string;
};

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    if (!url.startsWith("blob:") && !url.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    };
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}

export async function upscaleImageCanvas(
  sourceUrl: string,
  scale: number,
  mode: string,
  format: "PNG" | "JPG" = "PNG",
  removeLogo: boolean = true
): Promise<UpscaleResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!sourceUrl.startsWith("blob:") && !sourceUrl.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => {
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;

      // 1. Create original-size canvas to detect and inpaint watermarks/logos
      const origCanvas = document.createElement("canvas");
      origCanvas.width = origW;
      origCanvas.height = origH;
      const origCtx = origCanvas.getContext("2d", { willReadFrequently: true });

      if (origCtx) {
        origCtx.drawImage(img, 0, 0, origW, origH);
        if (removeLogo) {
          try {
            removeWatermarksFromCanvas(origCtx, origW, origH);
          } catch (wErr) {
            console.warn("Watermark inpainting non-critical error:", wErr);
          }
        }
      }

      const sourceCanvasOrImg = origCtx ? origCanvas : img;

      // Cap maximum dimensions to prevent mobile/GPU buffer crashes (up to 6000px)
      const maxDim = 6000;
      let targetW = Math.round(origW * scale);
      let targetH = Math.round(origH * scale);

      if (targetW > maxDim || targetH > maxDim) {
        const ratio = Math.min(maxDim / targetW, maxDim / targetH);
        targetW = Math.round(targetW * ratio);
        targetH = Math.round(targetH * ratio);
      }

      // Create primary canvas for high-resolution upscale
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      if (!ctx) {
        reject(new Error("Unable to create canvas 2D rendering context"));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // If scale > 2, use progressive multi-step upsampling to retain smooth vector and photo gradients
      if (scale > 2) {
        const stepCanvas = document.createElement("canvas");
        const stepCtx = stepCanvas.getContext("2d");
        if (stepCtx) {
          stepCtx.imageSmoothingEnabled = true;
          stepCtx.imageSmoothingQuality = "high";

          // Intermediate step (e.g. 2x)
          const midW = Math.round(origW * 2);
          const midH = Math.round(origH * 2);
          stepCanvas.width = midW;
          stepCanvas.height = midH;
          stepCtx.drawImage(sourceCanvasOrImg, 0, 0, midW, midH);

          // Draw from intermediate to final canvas
          ctx.drawImage(stepCanvas, 0, 0, targetW, targetH);
        } else {
          ctx.drawImage(sourceCanvasOrImg, 0, 0, targetW, targetH);
        }
      } else {
        ctx.drawImage(sourceCanvasOrImg, 0, 0, targetW, targetH);
      }

      // Mode-specific adaptive spatial enhancement
      try {
        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        const data = imgData.data;
        const totalPixels = data.length;

        let contrast = 1.05;
        let saturation = 1.0;
        let sharpen = 0.28;

        if (mode === "Portrait") {
          contrast = 1.04;
          saturation = 1.03;
          sharpen = 0.22;
        } else if (mode === "Art") {
          contrast = 1.10;
          saturation = 1.12;
          sharpen = 0.35;
        } else if (mode === "Product") {
          contrast = 1.09;
          saturation = 1.04;
          sharpen = 0.38;
        } else {
          // Natural
          contrast = 1.06;
          saturation = 1.02;
          sharpen = 0.28;
        }

        // 1. Tonal adjustments
        for (let i = 0; i < totalPixels; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          // Contrast adjustment
          r = ((r / 255 - 0.5) * contrast + 0.5) * 255;
          g = ((g / 255 - 0.5) * contrast + 0.5) * 255;
          b = ((b / 255 - 0.5) * contrast + 0.5) * 255;

          // Saturation
          if (saturation !== 1.0) {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = gray + (r - gray) * saturation;
            g = gray + (g - gray) * saturation;
            b = gray + (b - gray) * saturation;
          }

          data[i] = Math.min(255, Math.max(0, r));
          data[i + 1] = Math.min(255, Math.max(0, g));
          data[i + 2] = Math.min(255, Math.max(0, b));
        }

        ctx.putImageData(imgData, 0, 0);

        // 2. Convolution unsharp mask for crystalline clarity
        if (targetW <= 4096 && targetH <= 4096) {
          applyUnsharpMask(ctx, targetW, targetH, sharpen);
        }
      } catch (err) {
        // Fallback silently if canvas is tainted by external domain
        console.warn("Pixel-level filter skipped (CORS/taint):", err);
      }

      const mime = format === "JPG" ? "image/jpeg" : "image/png";
      const quality = format === "JPG" ? 0.94 : undefined;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to export image blob"));
            return;
          }
          const blobUrl = URL.createObjectURL(blob);
          resolve({
            blobUrl,
            originalWidth: origW,
            originalHeight: origH,
            upscaledWidth: targetW,
            upscaledHeight: targetH,
            fileSizeBytes: blob.size,
            fileSizeFormatted: formatBytes(blob.size),
          });
        },
        mime,
        quality
      );
    };

    img.onerror = () => {
      reject(new Error("Failed to load source image for upscaling"));
    };

    img.src = sourceUrl;
  });
}

function applyUnsharpMask(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strength: number
) {
  const src = ctx.getImageData(0, 0, w, h);
  const srcData = src.data;
  const dst = ctx.createImageData(w, h);
  const dstData = dst.data;
  const s = strength;
  const center = 1 + 4 * s;

  for (let y = 1; y < h - 1; y++) {
    const row = y * w * 4;
    const rowPrev = (y - 1) * w * 4;
    const rowNext = (y + 1) * w * 4;

    for (let x = 1; x < w - 1; x++) {
      const idx = row + x * 4;
      const idxL = row + (x - 1) * 4;
      const idxR = row + (x + 1) * 4;
      const idxU = rowPrev + x * 4;
      const idxD = rowNext + x * 4;

      for (let c = 0; c < 3; c++) {
        const val =
          srcData[idx + c] * center -
          (srcData[idxL + c] + srcData[idxR + c] + srcData[idxU + c] + srcData[idxD + c]) * s;
        dstData[idx + c] = val < 0 ? 0 : val > 255 ? 255 : val;
      }
      dstData[idx + 3] = srcData[idx + 3];
    }
  }

  ctx.putImageData(dst, 0, 0);
}
