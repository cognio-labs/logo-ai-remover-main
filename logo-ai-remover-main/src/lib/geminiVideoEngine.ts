/**
 * Bellix adapter for GargantuaX/gemini-watermark-remover's browser video runtime.
 * Upstream project and AllenK restoration work are MIT licensed. The complete
 * notice is shipped with the runtime at /gwr-engine/LICENSE.txt.
 *
 * We deliberately use the packaged browser runtime instead of the package's
 * `./video` SDK export: that export is a Node/Playwright adapter, while the
 * packaged page is the actual WebCodecs + MediaBunny implementation.
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
  detection: string,
  signal?: AbortSignal,
): Promise<GeminiVideoResult["qualityAudit"]> {
  const position = detection.match(/位置\s*(\d+)\s*,\s*(\d+)/);
  const size = detection.match(/大小\s*(\d+)\s*x\s*(\d+)/i);
  if (!position || !size)
    return { status: "unavailable", sampledFrames: 0, changedPixelRatio: null };
  const rect: [number, number, number, number] = [
    Number(position[1]),
    Number(position[2]),
    Number(size[1]),
    Number(size[2]),
  ];
  try {
    const fractions = [0.01, 0.5, 0.95];
    const [before, after] = await Promise.all([
      sampleRegion(file, rect, fractions, signal),
      sampleRegion(blob, rect, fractions, signal),
    ]);
    let changed = 0;
    let pixels = 0;
    for (let frame = 0; frame < before.length; frame++) {
      for (let index = 0; index < before[frame].length; index += 4) {
        const delta =
          (Math.abs(before[frame][index] - after[frame][index]) +
            Math.abs(before[frame][index + 1] - after[frame][index + 1]) +
            Math.abs(before[frame][index + 2] - after[frame][index + 2])) /
          3;
        if (delta > 8) changed++;
        pixels++;
      }
    }
    const changedPixelRatio = pixels ? changed / pixels : 0;
    return {
      status: changedPixelRatio < 0.01 ? "unchanged" : "review-required",
      sampledFrames: fractions.length,
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

export type ProcessedFramePreview = {
  url: string;
  applied: boolean;
  decisionTier: string | null;
};

type EngineWindow = Window & {
  __gwrVideoCliProgress?: {
    phase?: string;
    progress?: number;
    processedFrames?: number;
    frameEstimate?: number;
    aiDenoiseFrames?: number;
    aiReuseFrames?: number;
  };
  __gwrVideoOverrideDenoiseBackend?: string;
  __gwrVideoOverrideAdaptiveAlpha?: boolean;
  __gwrVideoOverrideAllowLowConfidence?: boolean;
  __gwrVideoOverrideHighQualityCleanup?: boolean;
  __gwrVideoOverrideEdgeDenoiseStrength?: number;
  __gwrVideoOverrideResidualCleanupStrength?: number;
  __gwrVideoOverrideBitrate?: number;
  DataTransfer: typeof DataTransfer;
  File: typeof File;
  Event: typeof Event;
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function documentFor(frame: HTMLIFrameElement): Document {
  const doc = frame.contentDocument;
  if (!doc) throw new Error("The local video engine did not initialize.");
  return doc;
}

function windowFor(frame: HTMLIFrameElement): EngineWindow {
  const engineWindow = frame.contentWindow as EngineWindow | null;
  if (!engineWindow) throw new Error("The local video engine is unavailable.");
  return engineWindow;
}

async function waitUntil(
  predicate: () => boolean,
  timeoutMs: number,
  signal?: AbortSignal,
  timeoutMessage = "Local video processing timed out.",
): Promise<void> {
  const started = performance.now();
  while (!predicate()) {
    signal?.throwIfAborted();
    if (performance.now() - started > timeoutMs) {
      throw new Error(timeoutMessage);
    }
    await sleep(100);
  }
}

export function assertBrowserVideoSupport(): void {
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

  const { removeWatermarkFromImage } = await import("@pilio/gemini-watermark-remover/browser");
  const result = await removeWatermarkFromImage(source, { adaptiveMode: "auto" });
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

export async function waitForGeminiEngine(
  frame: HTMLIFrameElement,
  signal?: AbortSignal,
): Promise<void> {
  await waitUntil(
    () => {
      try {
        const doc = documentFor(frame);
        // The controls exist before the blocking video-app.js script has executed.
        // Sending the change event earlier loses the upload and later times out.
        return Boolean(
          doc.readyState === "complete" &&
          doc.getElementById("fileInput") &&
          doc.getElementById("processBtn"),
        );
      } catch {
        return false;
      }
    },
    45_000,
    signal,
    "The local video engine did not finish loading. Reload the page and try again.",
  );
}

export async function loadVideoIntoGeminiEngine(
  frame: HTMLIFrameElement,
  file: File,
  signal?: AbortSignal,
): Promise<void> {
  assertBrowserVideoSupport();
  await waitForGeminiEngine(frame, signal);
  signal?.throwIfAborted();

  const doc = documentFor(frame);
  const engineWindow = windowFor(frame);
  const input = doc.getElementById("fileInput") as HTMLInputElement | null;
  if (!input) throw new Error("The local engine file input is unavailable.");

  // MediaBunny intentionally checks `blob instanceof Blob`. A File created in
  // the parent React window fails that check inside an iframe, so recreate the
  // file in the engine realm before assigning it to the engine input.
  const bytes = await file.arrayBuffer();
  const engineFile = new engineWindow.File([bytes], file.name, {
    type: file.type,
    lastModified: file.lastModified,
  });
  const transfer = new engineWindow.DataTransfer();
  transfer.items.add(engineFile);
  input.files = transfer.files;
  input.dispatchEvent(new engineWindow.Event("change", { bubbles: true }));

  await waitUntil(
    () => {
      const video = doc.getElementById("originalVideo") as HTMLVideoElement | null;
      const status = doc.getElementById("status");
      if (status?.getAttribute("data-tone") === "error") {
        throw new Error(
          status.textContent?.trim() || "The local engine could not open this video.",
        );
      }
      return Boolean(video?.src && video.readyState >= HTMLMediaElement.HAVE_METADATA);
    },
    30_000,
    signal,
    "The local engine could not prepare this video. Check the file format and try again.",
  );
}

function mapProgress(engineWindow: EngineWindow, doc: Document): GeminiVideoProgress {
  const raw = engineWindow.__gwrVideoCliProgress;
  const upstreamPhase = raw?.phase;
  const progress = Math.max(0, Math.min(1, Number(raw?.progress) || 0));
  const processedFrames = Number.isFinite(raw?.processedFrames)
    ? Number(raw?.processedFrames)
    : null;
  const frameEstimate = Number.isFinite(raw?.frameEstimate) ? Number(raw?.frameEstimate) : null;

  if (!raw) {
    return {
      phase: "loading-model",
      progress: 0.02,
      processedFrames,
      frameEstimate,
      message: "Loading local cleanup model",
    };
  }
  if (upstreamPhase === "detect") {
    return {
      phase: "detecting",
      progress,
      processedFrames,
      frameEstimate,
      message: "Detecting supported Gemini/Veo watermark tracks",
    };
  }
  if (upstreamPhase === "export") {
    return {
      phase: progress > 0.94 ? "encoding" : "processing",
      progress,
      processedFrames,
      frameEstimate,
      message: "Cleaning and encoding your video",
    };
  }
  return {
    phase: "analyzing",
    progress,
    processedFrames,
    frameEstimate,
    message: "Analyzing your video",
  };
}

export async function processWithGeminiEngine(
  frame: HTMLIFrameElement,
  file: File,
  onProgress: (progress: GeminiVideoProgress) => void,
  signal?: AbortSignal,
): Promise<GeminiVideoResult> {
  await loadVideoIntoGeminiEngine(frame, file, signal);
  const doc = documentFor(frame);
  const engineWindow = windowFor(frame);

  // Reject weak detections instead of modifying unrelated image detail.
  engineWindow.__gwrVideoOverrideAllowLowConfidence = false;
  // Test adaptive reverse-alpha with restrained footprint cleanup; this aims
  // to avoid the visible halo without smearing nearby scene edges.
  engineWindow.__gwrVideoOverrideAdaptiveAlpha = true;
  engineWindow.__gwrVideoOverrideDenoiseBackend = "canvas-footprint-polish";
  engineWindow.__gwrVideoOverrideEdgeDenoiseStrength = 1;
  engineWindow.__gwrVideoOverrideResidualCleanupStrength = 1.2;
  engineWindow.__gwrVideoOverrideBitrate = 20_000_000;

  // Mirror direct input state into the iframe form
  try {
    const allowLowInput = doc.getElementById("allowLowConfidence") as HTMLInputElement | null;
    if (allowLowInput) allowLowInput.checked = false;
    const denoiseInput = doc.getElementById("denoiseBackend") as HTMLSelectElement | null;
    if (denoiseInput) {
      denoiseInput.value = "canvas-footprint-polish";
      denoiseInput.dispatchEvent(new engineWindow.Event("change", { bubbles: true }));
    }
    const edgeInput = doc.getElementById("edgeDenoiseStrength") as HTMLInputElement | null;
    if (edgeInput) edgeInput.value = "1";
    const residualInput = doc.getElementById("residualCleanup") as HTMLInputElement | null;
    if (residualInput) residualInput.value = "1.2";
    const bitrateInput = doc.getElementById("videoBitrateMbps") as HTMLInputElement | null;
    if (bitrateInput) {
      bitrateInput.value = "20";
      bitrateInput.dispatchEvent(new engineWindow.Event("input", { bubbles: true }));
    }
  } catch (syncErr) {
    console.warn("Could not sync internal controls:", syncErr);
  }

  const processButton = doc.getElementById("processBtn") as HTMLButtonElement | null;
  if (!processButton) throw new Error("The local engine process control is unavailable.");
  processButton.click();

  let lastProgress = -1;
  while (true) {
    signal?.throwIfAborted();
    const download = doc.getElementById("downloadBtn") as HTMLAnchorElement | null;
    const status = doc.getElementById("status");
    const tone = status?.getAttribute("data-tone");
    const progress = mapProgress(engineWindow, doc);
    if (progress.progress !== lastProgress || progress.processedFrames !== null) {
      onProgress(progress);
      lastProgress = progress.progress;
    }

    if (tone === "error") {
      throw new Error(
        status?.textContent?.trim() || "The local video engine could not process this clip.",
      );
    }
    if (download?.getAttribute("aria-disabled") === "false" && download.href) {
      onProgress({
        ...progress,
        phase: "validating",
        progress: 0.99,
        message: "Validating the exported MP4",
      });
      const blob = await fetch(download.href).then((response) => response.blob());
      if (!blob.size || !blob.type.includes("mp4")) {
        throw new Error("The local engine returned an invalid MP4 export.");
      }
      const finalRaw = engineWindow.__gwrVideoCliProgress;
      if (!finalRaw?.processedFrames || finalRaw.processedFrames < 1) {
        throw new Error("No video frames were exported.");
      }
      const [sourceShape, outputShape] = await Promise.all([
        readVideoShape(file, signal),
        readVideoShape(blob, signal),
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
      const detection = doc.getElementById("detection")?.textContent?.trim() || "";
      const qualityAudit = await auditExportRegion(file, blob, detection, signal);
      if (qualityAudit.status === "unchanged") {
        throw new Error(
          "The exported watermark region matches the original in sampled frames. No cleaned result was accepted.",
        );
      }
      console.info("[Gemini video export diagnostic]", {
        inputName: file.name,
        inputBytes: file.size,
        outputBytes: blob.size,
        detector: detection || "unavailable",
        processedFrames: finalRaw?.processedFrames ?? null,
        frameEstimate: finalRaw?.frameEstimate ?? null,
        outputUrl: download.href,
        status: status?.textContent?.trim() || "unavailable",
        qualityAudit,
      });
      return {
        blob,
        processedFrames: Number.isFinite(finalRaw?.processedFrames)
          ? Number(finalRaw?.processedFrames)
          : null,
        frameEstimate: Number.isFinite(finalRaw?.frameEstimate)
          ? Number(finalRaw?.frameEstimate)
          : null,
        status: status?.textContent?.trim() || "Completed",
        detection,
        qualityAudit,
      };
    }
    await sleep(120);
  }
}

export function cancelGeminiEngine(frame: HTMLIFrameElement | null): void {
  if (!frame?.contentDocument) return;
  (frame.contentDocument.getElementById("cancelBtn") as HTMLButtonElement | null)?.click();
}
