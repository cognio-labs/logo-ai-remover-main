/**
 * Bellix adapter for GargantuaX/gemini-watermark-remover's browser video runtime.
 * Upstream project and AllenK restoration work are MIT licensed. The complete
 * notice is shipped with the runtime at /gwr-engine/LICENSE.txt.
 *
 * Runs removeGeminiVideoWatermark directly in-process via WebCodecs + MediaBunny,
 * eliminating the previous hidden iframe requirement and cross-realm File/Blob issues.
 */

export type GeminiVideoPhase =
  | "loading-model"
  | "analyzing"
  | "detecting"
  | "processing"
  | "encoding"
  | "validating"
  | "completed";

export type GeminiVideoProgress = {
  phase: GeminiVideoPhase;
  progress: number;
  processedFrames: number | null;
  frameEstimate: number | null;
  message: string;
};

export type GeminiVideoResult = {
  blob: Blob;
  processedFrames: number | null;
  frameEstimate: number | null;
  status: string;
  detection: string;
  qualityAudit: {
    status: "review-required" | "unchanged" | "unavailable";
    sampledFrames: number;
    changedPixelRatio: number | null;
  };
};

export type ProcessedFramePreview = {
  url: string;
  applied: boolean;
  decisionTier: string | null;
};

async function sampleRegion(
  blob: Blob,
  rect: [number, number, number, number],
  fractions: number[],
  signal?: AbortSignal,
): Promise<Uint8ClampedArray[]> {
  const url = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.src = url;
  const waitEvent = (name: string) =>
    new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(
        () => reject(new Error(`Video quality audit timed out waiting for ${name}.`)),
        15000,
      );
      video.addEventListener(
        name,
        () => {
          window.clearTimeout(timeout);
          resolve();
        },
        { once: true },
      );
      video.addEventListener(
        "error",
        () => {
          window.clearTimeout(timeout);
          reject(new Error("Could not decode a video for quality audit."));
        },
        { once: true },
      );
    });
  try {
    await waitEvent("loadedmetadata");
    const [x, y, width, height] = rect;
    if (
      x < 0 ||
      y < 0 ||
      width < 1 ||
      height < 1 ||
      x + width > video.videoWidth ||
      y + height > video.videoHeight
    ) {
      throw new Error("The detected watermark region falls outside the video frame.");
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas quality audit is unavailable.");
    const samples: Uint8ClampedArray[] = [];
    for (const fraction of fractions) {
      signal?.throwIfAborted();
      const seeked = waitEvent("seeked");
      video.currentTime = Math.min(Math.max(0, video.duration - 0.04), video.duration * fraction);
      await seeked;
      context.drawImage(video, x, y, width, height, 0, 0, width, height);
      samples.push(context.getImageData(0, 0, width, height).data);
    }
    return samples;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

async function auditExportRegion(
  file: File,
  blob: Blob,
  detectionOrRect:
    | string
    | [number, number, number, number]
    | { x: number; y: number; width: number; height: number }
    | null
    | undefined,
  signal?: AbortSignal,
): Promise<GeminiVideoResult["qualityAudit"]> {
  let rect: [number, number, number, number] | null = null;

  if (Array.isArray(detectionOrRect) && detectionOrRect.length === 4) {
    rect = [
      Math.round(detectionOrRect[0]),
      Math.round(detectionOrRect[1]),
      Math.round(detectionOrRect[2]),
      Math.round(detectionOrRect[3]),
    ];
  } else if (
    detectionOrRect &&
    typeof detectionOrRect === "object" &&
    "x" in detectionOrRect &&
    "y" in detectionOrRect &&
    "width" in detectionOrRect &&
    "height" in detectionOrRect
  ) {
    rect = [
      Math.round(detectionOrRect.x),
      Math.round(detectionOrRect.y),
      Math.round(detectionOrRect.width),
      Math.round(detectionOrRect.height),
    ];
  } else if (typeof detectionOrRect === "string") {
    const position = detectionOrRect.match(/位置\s*(\d+)\s*,\s*(\d+)/);
    const size = detectionOrRect.match(/大小\s*(\d+)\s*x\s*(\d+)/i);
    if (position && size) {
      rect = [Number(position[1]), Number(position[2]), Number(size[1]), Number(size[2])];
    }
  }

  if (!rect || rect[2] <= 0 || rect[3] <= 0) {
    return { status: "unavailable", sampledFrames: 0, changedPixelRatio: null };
  }

  try {
    const primaryFractions = [0.5];
    const [beforeMid, afterMid] = await Promise.all([
      sampleRegion(file, rect, primaryFractions, signal),
      sampleRegion(blob, rect, primaryFractions, signal),
    ]);
    const measureSamples = (beforeSamples: Uint8ClampedArray[], afterSamples: Uint8ClampedArray[]) => {
      let changed = 0;
      let pixels = 0;
      for (let frame = 0; frame < beforeSamples.length; frame++) {
        for (let index = 0; index < beforeSamples[frame].length; index += 4) {
          const delta =
            (Math.abs(beforeSamples[frame][index] - afterSamples[frame][index]) +
              Math.abs(beforeSamples[frame][index + 1] - afterSamples[frame][index + 1]) +
              Math.abs(beforeSamples[frame][index + 2] - afterSamples[frame][index + 2])) /
            3;
          if (delta > 8) changed++;
          pixels++;
        }
      }
      return { changed, pixels, ratio: pixels ? changed / pixels : 0 };
    };
    const midCheck = measureSamples(beforeMid, afterMid);
    if (midCheck.ratio >= 0.01) {
      return {
        status: "review-required",
        sampledFrames: 1,
        changedPixelRatio: midCheck.ratio,
      };
    }

    const tailFractions = [0.1, 0.9];
    const [beforeTail, afterTail] = await Promise.all([
      sampleRegion(file, rect, tailFractions, signal),
      sampleRegion(blob, rect, tailFractions, signal),
    ]);
    const tailCheck = measureSamples(beforeTail, afterTail);
    const totalPixels = midCheck.pixels + tailCheck.pixels;
    const changedPixelRatio = totalPixels ? (midCheck.changed + tailCheck.changed) / totalPixels : 0;
    return {
      status: changedPixelRatio < 0.01 ? "unchanged" : "review-required",
      sampledFrames: 3,
      changedPixelRatio,
    };
  } catch (error) {
    if (signal?.aborted) throw error;
    console.warn("Video quality audit could not decode sample frames:", error);
    return { status: "unavailable", sampledFrames: 0, changedPixelRatio: null };
  }
}

async function readVideoShape(
  blob: Blob,
  signal?: AbortSignal,
): Promise<{
  duration: number;
  width: number;
  height: number;
}> {
  const url = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.preload = "metadata";
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(
        () => finish(new Error("Video metadata timed out.")),
        15000,
      );
      const finish = (error?: Error) => {
        window.clearTimeout(timeout);
        video.removeEventListener("loadedmetadata", loaded);
        video.removeEventListener("error", failed);
        signal?.removeEventListener("abort", aborted);
        if (error) reject(error);
        else resolve();
      };
      const loaded = () => finish();
      const failed = () => finish(new Error("Exported video cannot be decoded."));
      const aborted = () => finish(new DOMException("Aborted", "AbortError"));
      video.addEventListener("loadedmetadata", loaded);
      video.addEventListener("error", failed);
      signal?.addEventListener("abort", aborted, { once: true });
      if (signal?.aborted) aborted();
      else video.src = url;
    });
    return { duration: video.duration, width: video.videoWidth, height: video.videoHeight };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

export function assertBrowserVideoSupport(): void {
  if (typeof window === "undefined") return;
  if (!("VideoDecoder" in window) || !("VideoEncoder" in window)) {
    throw new Error(
      "This local engine requires a current desktop version of Chrome or Edge with WebCodecs enabled.",
    );
  }
  if (typeof OffscreenCanvas === "undefined") {
    throw new Error(
      "This browser does not provide OffscreenCanvas, which is required for local frame processing.",
    );
  }
}

/** Build an honest processed-frame preview with the same upstream calibrated
 * image restoration engine. This never substitutes the original frame on the
 * processed side: when the detector rejects the frame, `applied` is false.
 */
export async function createProcessedFramePreview(
  video: HTMLVideoElement,
): Promise<ProcessedFramePreview> {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) throw new Error("Video metadata is not ready.");

  const source = document.createElement("canvas");
  source.width = width;
  source.height = height;
  const context = source.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas frame processing is unavailable.");
  context.drawImage(video, 0, 0, width, height);

  const { removeWatermarkFromImage } = await import("@/lib/gwr-engine/sdk/browser.js");
  const { getCachedImageWatermarkEngine } = await import("./gwrFdncnnRuntime");
  const engine = await getCachedImageWatermarkEngine();
  const result = await removeWatermarkFromImage(source, {
    adaptiveMode: "auto",
    engine: engine as never,
  });
  if (!result.meta?.applied) {
    return { url: "", applied: false, decisionTier: result.meta?.decisionTier || null };
  }

  const output = result.canvas as HTMLCanvasElement | OffscreenCanvas;
  const blob =
    "convertToBlob" in output
      ? await output.convertToBlob({ type: "image/png" })
      : await new Promise<Blob>((resolve, reject) => {
          (output as HTMLCanvasElement).toBlob(
            (value) =>
              value
                ? resolve(value)
                : reject(new Error("Could not create the processed-frame preview.")),
            "image/png",
          );
        });
  return {
    url: URL.createObjectURL(blob),
    applied: true,
    decisionTier: result.meta.decisionTier,
  };
}

export async function processWithGeminiEngine(
  first: File | HTMLIFrameElement | null,
  second?: File | ((progress: GeminiVideoProgress) => void),
  third?: ((progress: GeminiVideoProgress) => void) | AbortSignal,
  fourth?: AbortSignal | ((blob: Blob) => void),
  fifth?: (blob: Blob) => void,
): Promise<GeminiVideoResult> {
  assertBrowserVideoSupport();

  let file: File;
  let onProgress: (progress: GeminiVideoProgress) => void;
  let signal: AbortSignal | undefined;
  let onFramePreview: ((blob: Blob) => void) | undefined;

  if (first instanceof File) {
    file = first;
    onProgress = typeof second === "function" ? second : () => {};
    signal = third instanceof AbortSignal ? third : undefined;
    onFramePreview = typeof fourth === "function" ? fourth : undefined;
  } else {
    // Legacy signature compatibility: (frame, file, onProgress, signal, onFramePreview)
    if (!(second instanceof File)) {
      throw new Error("A video File must be provided to processWithGeminiEngine.");
    }
    file = second;
    onProgress = typeof third === "function" ? third : () => {};
    signal = fourth instanceof AbortSignal ? fourth : undefined;
    onFramePreview = typeof fifth === "function" ? fifth : undefined;
  }

  signal?.throwIfAborted();

  onProgress({
    phase: "loading-model",
    progress: 0.02,
    processedFrames: null,
    frameEstimate: null,
    message: "Initializing video engine...",
  });

  const {
    detectGeminiVideoWatermark,
    removeGeminiVideoWatermark,
  } = await import("@/lib/gwr-engine/video/videoExport.js");
  const {
    createThrottledYieldToMainThread,
    resolveVideoCleanupPlan,
  } = await import("./gwrFdncnnRuntime");

  signal?.throwIfAborted();

  onProgress({
    phase: "detecting",
    progress: 0.05,
    processedFrames: null,
    frameEstimate: null,
    message: "Scanning video for watermark...",
  });

  const yieldToMainThread = createThrottledYieldToMainThread(8);
  const detected = await detectGeminiVideoWatermark(file, {
    signal,
    fastDetection: true,
    sampleCount: 12,
    yieldToMainThread,
    onProgress: (info: { progress?: number }) => {
      signal?.throwIfAborted();
      const raw = typeof info.progress === "number" ? Math.max(0, Math.min(1, info.progress)) : 0;
      onProgress({
        phase: "detecting",
        progress: 0.05 + raw * 0.1,
        processedFrames: null,
        frameEstimate: null,
        message: "Scanning video for watermark...",
      });
    },
  });

  signal?.throwIfAborted();
  const cleanupPlan = await resolveVideoCleanupPlan(
    detected?.detection,
    detected?.metadata,
    signal,
  );
  signal?.throwIfAborted();

  let lastProgress = 0.15;
  let lastProgressAt = 0;

  const result = await removeGeminiVideoWatermark(file, {
    signal,
    detection: detected,
    fastDetection: true,
    denoiseBackend: cleanupPlan.denoiseBackend,
    edgeDenoiseStrength: cleanupPlan.edgeDenoiseStrength,
    residualCleanupStrength: cleanupPlan.residualCleanupStrength,
    allenkFdncnnRuntime: cleanupPlan.allenkFdncnnRuntime,
    allenkFdncnnSigma: cleanupPlan.allenkFdncnnSigma,
    allenkFdncnnPadding: cleanupPlan.allenkFdncnnPadding,
    allenkFdncnnTemporalReuse: cleanupPlan.allenkFdncnnTemporalReuse,
    fastEncoding: true,
    requireAudioPreserved: true,
    allowLowConfidence: cleanupPlan.allowLowConfidence,
    yieldToMainThread,
    onFramePreview: (blob: Blob) => {
      if (!signal?.aborted) {
        onFramePreview?.(blob);
      }
    },
    onProgress: (info: {
      phase?: string;
      progress?: number;
      processedFrames?: number;
      frameEstimate?: number;
    }) => {
      signal?.throwIfAborted();
      const rawProgress =
        typeof info.progress === "number" ? Math.max(0, Math.min(1, info.progress)) : 0;
      const processedFrames =
        typeof info.processedFrames === "number" ? info.processedFrames : null;
      const frameEstimate =
        typeof info.frameEstimate === "number" ? info.frameEstimate : null;

      let phase: GeminiVideoPhase = "processing";
      let message = "Removing watermark...";

      if (info.phase === "detect") {
        phase = "detecting";
        message = "Scanning video for watermark...";
      } else if (info.phase === "export") {
        if (rawProgress > 0.94) {
          phase = "encoding";
          message = "Finalizing video export...";
        } else {
          phase = "processing";
          message =
            frameEstimate && processedFrames
              ? `Processing frame ${processedFrames} of ${frameEstimate}...`
              : "Removing watermark...";
        }
      }

      if (rawProgress !== lastProgress || processedFrames !== null) {
        const now = typeof performance !== "undefined" ? performance.now() : Date.now();
        if (phase === "processing" && rawProgress < 0.99 && now - lastProgressAt < 90) {
          return;
        }
        lastProgressAt = now;
        lastProgress = rawProgress;
        onProgress({
          phase,
          progress: rawProgress,
          processedFrames,
          frameEstimate,
          message,
        });
      }
    },
  });

  signal?.throwIfAborted();

  const blob: Blob = result.blob;
  if (!blob || !blob.size || !blob.type.includes("mp4")) {
    throw new Error("The video engine returned an invalid MP4 export.");
  }

  const processedFrames =
    typeof result.processedFrames === "number" ? result.processedFrames : null;
  const frameEstimate =
    typeof result.metadata?.frameCountEstimate === "number"
      ? result.metadata.frameCountEstimate
      : processedFrames;

  if (!processedFrames || processedFrames < 1) {
    throw new Error("No video frames were exported.");
  }

  onProgress({
    phase: "validating",
    progress: 0.99,
    processedFrames,
    frameEstimate,
    message: "Validating exported MP4...",
  });

  const detectionPos = result.detection?.position;
  const detectionStr = detectionPos
    ? `位置 ${Math.round(detectionPos.x)}, ${Math.round(detectionPos.y)} 大小 ${Math.round(detectionPos.width)}x${Math.round(detectionPos.height)} (${result.detection?.candidate?.name || result.detection?.watermarkKind || "Gemini"})`
    : result.detection?.watermarkKind || "Detected";

  const hasDetectedShape =
    typeof result.metadata?.width === "number" &&
    result.metadata.width > 0 &&
    typeof result.metadata?.height === "number" &&
    result.metadata.height > 0 &&
    Number.isFinite(result.metadata?.duration);

  const [sourceShape, outputShape, qualityAudit] = await Promise.all([
    hasDetectedShape
      ? Promise.resolve({
          duration: result.metadata.duration,
          width: result.metadata.width,
          height: result.metadata.height,
        })
      : readVideoShape(file, signal),
    readVideoShape(blob, signal),
    auditExportRegion(file, blob, detectionPos || detectionStr, signal),
  ]);

  if (
    !Number.isFinite(sourceShape.duration) ||
    !Number.isFinite(outputShape.duration) ||
    outputShape.duration <= 0 ||
    outputShape.width !== sourceShape.width ||
    outputShape.height !== sourceShape.height ||
    Math.abs(outputShape.duration - sourceShape.duration) >
      Math.max(0.25, sourceShape.duration * 0.01)
  ) {
    throw new Error("Export duration or dimensions do not match the original video.");
  }

  if (qualityAudit.status === "unchanged") {
    throw new Error(
      "The exported watermark region matches the original in sampled frames. No cleaned result was accepted.",
    );
  }

  return {
    blob,
    processedFrames,
    frameEstimate,
    status: "Completed",
    detection: detectionStr,
    qualityAudit,
  };
}

export function cancelGeminiEngine(_frame?: HTMLIFrameElement | null): void {
  // Direct WebCodecs execution uses AbortSignal directly. Kept for backwards compatibility.
}

export async function waitForGeminiEngine(
  _frame?: HTMLIFrameElement | null,
  _signal?: AbortSignal,
): Promise<void> {
  assertBrowserVideoSupport();
}

export async function loadVideoIntoGeminiEngine(
  _frame: HTMLIFrameElement | null,
  _file: File,
  _signal?: AbortSignal,
): Promise<void> {
  assertBrowserVideoSupport();
}
