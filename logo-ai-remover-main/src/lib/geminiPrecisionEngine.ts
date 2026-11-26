/**
 * =============================================================================
 * geminiPrecisionEngine.ts — Precision Gemini Image Watermark Engine
 * =============================================================================
 * Powered by the calibrated multi-profile engine transferred from
 * `gemini-watermark-remover` (adaptive multi-candidate detection, 36-v2/48/96/
 * 20260520/outline profiles, contour repair, and multi-pass residual cleanup).
 * Processes images at their native resolution.
 * =============================================================================
 */

import { canUseWatermarkWorker, WatermarkWorkerClient } from "./gwr-engine/core/workerClient.js";
import { removeWatermarkFromImage, type WatermarkMeta } from "./gwr-engine/sdk/browser.js";
import { removeWatermarkFromImageDataSync } from "./gwr-engine/sdk/image-data.js";
import { getCachedImageWatermarkEngine } from "./gwrFdncnnRuntime";

let imageWorker: WatermarkWorkerClient | undefined;

export interface CleanResult {
  imageData: ImageData;
  box: { x: number; y: number; w: number; h: number };
  applied: boolean;
  confidence: number;
  template?: string;
  scale?: number;
}

function createImageDataCopy(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): ImageData {
  const copy = new Uint8ClampedArray(data);
  if (typeof ImageData !== "undefined") {
    return new ImageData(copy, width, height);
  }
  return { data: copy, width, height, colorSpace: "srgb" } as ImageData;
}

function mapPosition(
  pos: { x?: number; y?: number; width?: number; height?: number } | null | undefined,
): { x: number; y: number; w: number; h: number } {
  if (!pos || !Number.isFinite(pos.width) || !Number.isFinite(pos.height)) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }
  return {
    x: Math.max(0, Math.round(pos.x ?? 0)),
    y: Math.max(0, Math.round(pos.y ?? 0)),
    w: Math.max(0, Math.round(pos.width ?? 0)),
    h: Math.max(0, Math.round(pos.height ?? 0)),
  };
}

function mapConfidence(meta: WatermarkMeta | null, applied: boolean): number {
  const conf =
    meta?.detection?.adaptiveConfidence ??
    meta?.detection?.originalSpatialScore ??
    (applied ? 0.96 : 0);
  return Math.max(0, Math.min(1, Number(conf) || 0));
}

/**
 * Synchronous multi-profile Gemini watermark removal on an ImageData buffer.
 */
export function cleanGeminiWatermarkPrecisionSync(
  inputData: ImageData,
  _options: { minConfidence?: number } = {},
): CleanResult {
  const result = removeWatermarkFromImageDataSync(inputData, {
    adaptiveMode: "auto",
  });
  const meta = result?.meta;
  const applied = Boolean(meta?.applied);
  const box = applied
    ? mapPosition(meta?.position)
    : { x: 0, y: 0, w: 0, h: 0 };

  return {
    imageData: createImageDataCopy(
      applied ? result.imageData.data : inputData.data,
      inputData.width,
      inputData.height,
    ),
    box,
    applied,
    confidence: mapConfidence(meta, applied),
    template: meta?.config?.alphaVariant || (meta?.size ? String(meta.size) : undefined),
    scale: meta?.size ?? undefined,
  };
}

/**
 * Async helper that cleans an HTMLCanvasElement using the transferred
 * multi-profile browser engine first, with optional backend fallback.
 */
export async function cleanGeminiWatermarkPrecision(
  canvas: HTMLCanvasElement,
  options: { sourceFile?: File; preferBackend?: boolean } = {},
): Promise<{
  canvas: HTMLCanvasElement;
  processedBlob?: Blob;
  box: { x: number; y: number; w: number; h: number };
  applied: boolean;
  confidence: number;
}> {
  const W = canvas.width;
  const H = canvas.height;

  if (options.sourceFile && canUseWatermarkWorker() && typeof OffscreenCanvas !== "undefined") {
    try {
      imageWorker ??= new WatermarkWorkerClient({
        workerUrl: "/gwr-engine/workers/watermark-worker.js",
      });
      const { blob, meta } = await imageWorker.processBlob(options.sourceFile, {
        adaptiveMode: "auto",
      });
      if (!meta?.applied) {
        return { canvas, box: mapPosition(null), applied: false, confidence: 0 };
      }
      const image = await createImageBitmap(blob);
      try {
        if (image.width !== W || image.height !== H) throw new Error("Image dimensions changed.");
        const output = document.createElement("canvas");
        output.width = W;
        output.height = H;
        const context = output.getContext("2d");
        if (!context) throw new Error("Could not get 2D canvas context.");
        context.drawImage(image, 0, 0);
        return {
          canvas: output,
          processedBlob: blob,
          box: mapPosition(meta.position),
          applied: true,
          confidence: mapConfidence(meta, true),
        };
      } finally {
        image.close();
      }
    } catch {
      // Use the same calibrated engine on the main thread if the worker fails.
    }
  }

  try {
    const engine = await getCachedImageWatermarkEngine();
    const result = await removeWatermarkFromImage(canvas, {
      adaptiveMode: "auto",
      engine: engine as never,
    });
    const meta = result?.meta;
    const applied = Boolean(meta?.applied);
    const outCanvas = document.createElement("canvas");
    outCanvas.width = W;
    outCanvas.height = H;
    const outCtx = outCanvas.getContext("2d");
    if (outCtx) {
      outCtx.drawImage(
        (applied ? result.canvas : canvas) as CanvasImageSource,
        0,
        0,
      );
    }
    return {
      canvas: outCanvas,
      box: applied ? mapPosition(meta?.position) : { x: 0, y: 0, w: 0, h: 0 },
      applied,
      confidence: mapConfidence(meta, applied),
    };
  } catch (err) {
    if (options.preferBackend === false) {
      throw err;
    }
  }

  // Fallback to Python backend if client canvas runtime errored
  {
    try {
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, "image/png"),
      );
      if (blob) {
        const formData = new FormData();
        formData.append("file", blob, "image.png");
        const response = await fetch("/api/gemini-image/clean", {
          method: "POST",
          body: formData,
          signal: AbortSignal.timeout(6000),
        });
        if (response.ok) {
          const resBlob = await response.blob();
          const img = new Image();
          const url = URL.createObjectURL(resBlob);
          const loaded = await new Promise<boolean>((resolve) => {
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
          });
          if (loaded) {
            const outCanvas = document.createElement("canvas");
            outCanvas.width = W;
            outCanvas.height = H;
            const ctx = outCanvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              URL.revokeObjectURL(url);
              const xBox =
                response.headers.get("X-Box") || response.headers.get("x-box");
              const xApplied =
                response.headers.get("X-Applied") ||
                response.headers.get("x-applied");
              let box = { x: 0, y: 0, w: 0, h: 0 };
              if (xBox) {
                const parts = xBox.split(",").map(Number);
                if (parts.length === 4) {
                  box = { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
                }
              }
              const wasApplied = xApplied !== "false" && box.w > 0 && box.h > 0;
              return {
                canvas: outCanvas,
                box,
                applied: wasApplied,
                confidence: wasApplied ? 0.99 : 0,
              };
            }
          }
          URL.revokeObjectURL(url);
        }
      }
    } catch {
      // Fall through to sync engine
    }
  }

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get 2D canvas context.");
  const origData = ctx.getImageData(0, 0, W, H);
  const syncResult = cleanGeminiWatermarkPrecisionSync(origData);
  const outCanvas = document.createElement("canvas");
  outCanvas.width = W;
  outCanvas.height = H;
  const outCtx = outCanvas.getContext("2d");
  if (outCtx) {
    outCtx.putImageData(syncResult.imageData, 0, 0);
  }
  return {
    canvas: outCanvas,
    box: syncResult.box,
    applied: syncResult.applied,
    confidence: syncResult.confidence,
  };
}
