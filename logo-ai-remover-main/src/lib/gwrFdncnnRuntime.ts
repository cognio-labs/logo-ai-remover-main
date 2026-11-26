/*
 * Shared FDnCNN ONNX (WebGPU / WASM), WatermarkEngine singleton cache,
 * automatic Gemini/Veo preset selection, and non-throttling task yield helpers.
 */

const ALLENK_FDNCNN_WASM_PATHS = Object.freeze({
  mjs: "/gwr-engine/onnxruntime/ort-wasm-simd-threaded.js",
  wasm: "/gwr-engine/onnxruntime/ort-wasm-simd-threaded.wasm",
});

const ALLENK_FDNCNN_WEBGPU_WASM_PATHS = Object.freeze({
  mjs: "/gwr-engine/onnxruntime/ort-wasm-simd-threaded.asyncify.mjs",
  wasm: "/gwr-engine/onnxruntime/ort-wasm-simd-threaded.asyncify.wasm",
});

const allenkFdncnnRuntimePromises = new Map<string, Promise<unknown>>();
let cachedWatermarkEnginePromise: Promise<unknown> | null = null;

function normalizePublicEngineUrl(url: string): string {
  if (url.startsWith("./models/")) {
    return `/gwr-engine/${url.slice(2)}`;
  }
  if (url.startsWith("./onnxruntime/")) {
    return `/gwr-engine/${url.slice(2)}`;
  }
  return url;
}

export function yieldToTask(): Promise<void> {
  if (typeof MessageChannel !== "undefined") {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => {
        channel.port1.close();
        channel.port2.close();
        resolve();
      };
      channel.port2.postMessage(null);
    });
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function createThrottledYieldToMainThread(minIntervalMs = 8): () => Promise<void> {
  let nextYieldAt = 0;
  return () => {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now < nextYieldAt) {
      return Promise.resolve();
    }
    nextYieldAt = now + minIntervalMs;
    return yieldToTask();
  };
}

export async function getCachedImageWatermarkEngine(): Promise<unknown> {
  if (!cachedWatermarkEnginePromise) {
    cachedWatermarkEnginePromise = (async () => {
      const { createWatermarkEngine } = await import("@/lib/gwr-engine/sdk/browser.js");
      return createWatermarkEngine();
    })().catch((error) => {
      cachedWatermarkEnginePromise = null;
      throw error;
    });
  }
  return cachedWatermarkEnginePromise;
}

export function getAllenkFdncnnTemporalReuseConfig(runtime: { executionProvider?: string } | null) {
  if (!runtime || runtime.executionProvider !== "wasm") {
    return null;
  }
  const hasThreadedWasm = Boolean(
    typeof globalThis !== "undefined" &&
      (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated &&
      typeof SharedArrayBuffer !== "undefined",
  );
  return {
    maxFrames: hasThreadedWasm ? 1 : 2,
    threshold: hasThreadedWasm ? 4.5 : 6.5,
  };
}

export function resolveDetectionAllenkFdncnnSigma(detection: {
  watermarkKind?: string;
  template?: { cleanup?: { runtimeFdncnnSigma?: number } };
} | null): number {
  if (detection?.watermarkKind === "veo-text" && Number.isFinite(detection.template?.cleanup?.runtimeFdncnnSigma)) {
    return detection.template!.cleanup!.runtimeFdncnnSigma!;
  }
  return 75;
}

export function resolveDetectionAllenkFdncnnPadding(
  detection: {
    watermarkKind?: string;
    template?: { cleanup?: { allenkFdncnnPadding?: number } };
    position?: unknown;
  } | null,
  runtimeProfile: { padding?: number } | null,
): number | undefined {
  if (detection?.watermarkKind === "veo-text" && Number.isFinite(detection.template?.cleanup?.allenkFdncnnPadding)) {
    return detection.template!.cleanup!.allenkFdncnnPadding;
  }
  return runtimeProfile?.padding;
}

type AllenkProfile = {
  id: string;
  modelUrl: string;
  inputShape: number[];
  outputShape: number[];
  padding?: number;
};

type AutoVideoPreset = {
  id: string;
  denoiseBackend: string;
  edgeDenoiseStrength: number;
  residualCleanupStrength: number;
  allowLowConfidence: boolean;
};

export async function loadAllenkFdncnnRuntime(
  runtimeProfile?: AllenkProfile | null,
  signal?: AbortSignal,
): Promise<unknown> {
  signal?.throwIfAborted();
  const { resolveAllenkFdncnnRuntimeProfile } = await import(
    "@/lib/gwr-engine/video/videoDenoiseRuntimePolicy.js"
  );
  const { createAllenkFdncnnOnnxRuntime } = await import(
    "@/lib/gwr-engine/core/allenkFdncnnOnnxRuntime.js"
  );

  const resolveProfile = resolveAllenkFdncnnRuntimeProfile as (
    pos?: unknown,
  ) => AllenkProfile;
  const createOnnxRuntime = createAllenkFdncnnOnnxRuntime as (
    opts: Record<string, unknown>,
  ) => Promise<unknown>;

  const profile = runtimeProfile || resolveProfile();
  if (!allenkFdncnnRuntimePromises.has(profile.id)) {
    const runtimePromise = (async () => {
      const response = await fetch(normalizePublicEngineUrl(profile.modelUrl), { signal });
      if (!response.ok) {
        throw new Error(`Failed to fetch FDnCNN model: ${response.status}`);
      }
      const modelBytes = new Uint8Array(await response.arrayBuffer());
      signal?.throwIfAborted();

      const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { gpu?: { requestAdapter?: () => Promise<unknown> } }) : null;
      if (nav?.gpu?.requestAdapter) {
        try {
          const adapter = await nav.gpu.requestAdapter();
          signal?.throwIfAborted();
          if (adapter) {
            const webgpuOrt = await import("gwr-onnxruntime-web/webgpu");
            signal?.throwIfAborted();
            return await createOnnxRuntime({
              ort: webgpuOrt,
              modelBytes,
              executionProvider: "webgpu",
              wasmPaths: ALLENK_FDNCNN_WEBGPU_WASM_PATHS,
              inputName: "fdncnn_input",
              outputName: "fdncnn_output",
              inputShape: profile.inputShape,
              outputShape: profile.outputShape,
            });
          }
        } catch (error) {
          if (signal?.aborted) throw error;
          console.warn("WebGPU FDnCNN initialization failed, falling back to WASM:", error);
        }
      }

      const wasmOrt = await import("gwr-onnxruntime-web");
      signal?.throwIfAborted();
      return await createOnnxRuntime({
        ort: wasmOrt,
        modelBytes,
        executionProvider: "wasm",
        wasmPaths: ALLENK_FDNCNN_WASM_PATHS,
        inputName: "fdncnn_input",
        outputName: "fdncnn_output",
        inputShape: profile.inputShape,
        outputShape: profile.outputShape,
      });
    })();

    allenkFdncnnRuntimePromises.set(profile.id, runtimePromise);
    runtimePromise.catch(() => {
      if (allenkFdncnnRuntimePromises.get(profile.id) === runtimePromise) {
        allenkFdncnnRuntimePromises.delete(profile.id);
      }
    });
  }

  return allenkFdncnnRuntimePromises.get(profile.id);
}

export async function resolveVideoCleanupPlan(
  detection: {
    isConfident?: boolean;
    watermarkKind?: string;
    position?: unknown;
    summary?: { best?: { meanConfidence?: number } };
    template?: { cleanup?: { runtimeFdncnnSigma?: number; allenkFdncnnPadding?: number } };
  } | null,
  metadata: unknown,
  signal?: AbortSignal,
) {
  const { VIDEO_DENOISE_BACKENDS } = await import("@/lib/gwr-engine/video/videoCleanupBackends.js");
  const { getAutomaticVideoPresetConfig } = await import("@/lib/gwr-engine/video/videoPresetPolicy.js");
  const { resolveAllenkFdncnnRuntimeProfile } = await import(
    "@/lib/gwr-engine/video/videoDenoiseRuntimePolicy.js"
  );

  const getAutoPreset = getAutomaticVideoPresetConfig as (
    det?: unknown,
    meta?: unknown,
  ) => AutoVideoPreset;
  const resolveProfile = resolveAllenkFdncnnRuntimeProfile as (
    pos?: unknown,
  ) => AllenkProfile;

  const preset = getAutoPreset(detection, metadata);
  const meanConfidence = detection?.summary?.best?.meanConfidence ?? 0;
  const useFastCleanup =
    Boolean(detection?.isConfident) &&
    detection?.watermarkKind !== "veo-text" &&
    meanConfidence >= 0.75;

  if (useFastCleanup || preset.denoiseBackend !== VIDEO_DENOISE_BACKENDS.ALLENK_FDNCNN_BROWSER_SPIKE) {
    return {
      presetId: preset.id,
      denoiseBackend: VIDEO_DENOISE_BACKENDS.CANVAS_FOOTPRINT_POLISH,
      edgeDenoiseStrength: useFastCleanup ? 1 : preset.edgeDenoiseStrength ?? 1,
      residualCleanupStrength: useFastCleanup ? 1.2 : preset.residualCleanupStrength ?? 1.2,
      allowLowConfidence: Boolean(preset.allowLowConfidence),
      allenkFdncnnRuntime: null,
      allenkFdncnnSigma: undefined,
      allenkFdncnnPadding: undefined,
      allenkFdncnnTemporalReuse: null,
    };
  }

  const runtimeProfile = resolveProfile(detection?.position);
  try {
    const allenkFdncnnRuntime = (await loadAllenkFdncnnRuntime(runtimeProfile, signal)) as {
      executionProvider?: string;
    } | null;
    signal?.throwIfAborted();
    return {
      presetId: preset.id,
      denoiseBackend: VIDEO_DENOISE_BACKENDS.ALLENK_FDNCNN_BROWSER_SPIKE,
      edgeDenoiseStrength: preset.edgeDenoiseStrength,
      residualCleanupStrength: preset.residualCleanupStrength,
      allowLowConfidence: Boolean(preset.allowLowConfidence),
      allenkFdncnnRuntime,
      allenkFdncnnSigma: resolveDetectionAllenkFdncnnSigma(detection),
      allenkFdncnnPadding: resolveDetectionAllenkFdncnnPadding(detection, runtimeProfile),
      allenkFdncnnTemporalReuse: getAllenkFdncnnTemporalReuseConfig(allenkFdncnnRuntime),
    };
  } catch (error) {
    if (signal?.aborted) throw error;
    console.warn("FDnCNN denoiser unavailable, using canvas footprint polish fallback:", error);
    return {
      presetId: preset.id,
      denoiseBackend: VIDEO_DENOISE_BACKENDS.CANVAS_FOOTPRINT_POLISH,
      edgeDenoiseStrength: 1,
      residualCleanupStrength: 1.2,
      allowLowConfidence: Boolean(preset.allowLowConfidence),
      allenkFdncnnRuntime: null,
      allenkFdncnnSigma: undefined,
      allenkFdncnnPadding: undefined,
      allenkFdncnnTemporalReuse: null,
    };
  }
}
