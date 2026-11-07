import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export type CornerSettings = { sizePct: number; distancePct: number; strengthPct: number };
let engine: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;
let assetUrls: string[] = [];

// Circular buffer for last 30 log lines
const MAX_LOG_LINES = 30;
const ffmpegLogs: string[] = [];

export function getRecentFfmpegLogs(): string[] {
  return [...ffmpegLogs];
}

function pushLog(msg: string) {
  ffmpegLogs.push(msg);
  if (ffmpegLogs.length > MAX_LOG_LINES) {
    ffmpegLogs.shift();
  }
}

async function localAsset(path: string, mime: string) {
  const url = await toBlobURL(path, mime);
  assetUrls.push(url);
  return url;
}

export async function getClearCornerEngine(onProgress: (value: number) => void) {
  if (engine?.loaded) {
    engine.on("progress", ({ progress }) => onProgress(Math.max(0, Math.min(1, progress))));
    return engine;
  }
  if (loading) return loading;
  loading = (async () => {
    const ffmpeg = new FFmpeg();
    ffmpeg.on("log", ({ message }) => {
      pushLog(message);
    });
    ffmpeg.on("progress", ({ progress }) => onProgress(Math.max(0, Math.min(1, progress))));
    await ffmpeg.load({
      coreURL: await localAsset("/ffmpeg/ffmpeg-core.js", "text/javascript"),
      wasmURL: await localAsset("/ffmpeg/ffmpeg-core.wasm", "application/wasm"),
      classWorkerURL: await localAsset("/ffmpeg/814.ffmpeg.js", "text/javascript"),
    });
    engine = ffmpeg;
    return ffmpeg;
  })();
  try { return await loading; } finally { loading = null; }
}

export function even(value: number) { return Math.max(2, Math.round(value / 2) * 2); }

/**
 * Ensures dimensions and crop box are clamped and strictly even numbers
 */
export function getHardenedCornerGeometry(width: number, height: number, sizePct: number, distancePct: number) {
  const W = Math.max(2, even(width));
  const H = Math.max(2, even(height));
  const shortSide = Math.min(W, H);
  let box = Math.max(12, even(Math.round((shortSide * sizePct) / 100)));
  box = Math.min(box, W, H);
  box = even(box);

  const distance = Math.round((shortSide * distancePct) / 100);
  let x = Math.round(W - distance - box);
  let y = Math.round(H - distance - box);

  x = Math.max(0, Math.min(W - box, x));
  y = Math.max(0, Math.min(H - box, y));

  x = even(x);
  y = even(y);

  return { box, x, y, W, H };
}

export function getCornerGeometry(width: number, height: number, settings: CornerSettings) {
  return getHardenedCornerGeometry(width, height, settings.sizePct, settings.distancePct);
}

export async function processClearCorner(
  file: File,
  width: number,
  height: number,
  settings: CornerSettings,
  onProgress: (value: number) => void
) {
  return processGeminiVideoFfmpeg(
    file,
    width,
    height,
    {
      alpha: (settings.strengthPct || 50) / 100,
      sizePct: settings.sizePct || 7,
      distancePct: settings.distancePct || 4,
    },
    onProgress
  );
}

/**
 * Filter string for FFmpeg video watermark unblending
 */
export function getGeminiFilterString(
  box: number,
  x: number,
  y: number,
  alpha: number,
  enableEdgeBlur = false
) {
  const c = (box / 2).toFixed(2);
  const radius = ((box / 2) * 1.05).toFixed(2);
  const aStr = Math.max(0.01, Math.min(0.99, alpha)).toFixed(4);
  const shape = `${aStr}*clip((1-pow(abs((X-${c})/${radius}),0.68)-pow(abs((Y-${c})/${radius}),0.68))*4,0,1)`;
  const expr = `clip((p(X,Y)-255*(${shape}))/(1-(${shape})),0,255)`;

  let vf = `split[a][b];[b]crop=${box}:${box}:${x}:${y},format=gbrp,geq=r='${expr}':g='${expr}':b='${expr}'[c];[a][c]overlay=${x}:${y},format=yuv420p`;
  if (enableEdgeBlur) {
    vf += `[raw];[raw]split[m][p];[p]crop=${box}:${box}:${x}:${y},boxblur=1:1[q];[m][q]overlay=${x}:${y}`;
  }
  return vf;
}

/**
 * Executes an FFmpeg command and throws an Error with last 5 log lines if return code is non-zero
 */
async function execFfmpegChecked(ffmpeg: FFmpeg, args: string[]): Promise<number> {
  const exitCode = await ffmpeg.exec(args);
  if (exitCode !== 0) {
    const recent = ffmpegLogs.slice(-5).join("\n");
    throw new Error(`FFmpeg exited with code ${exitCode}:\n${recent || "Unknown FFmpeg error"}`);
  }
  return exitCode;
}

/**
 * Hardened FFmpeg WASM Video Processing
 */
export async function processGeminiVideoFfmpeg(
  file: File,
  width: number,
  height: number,
  options: {
    alpha: number;
    sizePct: number;
    distancePct: number;
    enableEdgeBlur?: boolean;
  },
  onProgress: (pct: number) => void
): Promise<{ blob: Blob; url: string; ext: string }> {
  const ffmpeg = await getClearCornerEngine(onProgress);
  const { box, x, y } = getHardenedCornerGeometry(width, height, options.sizePct, options.distancePct);
  const vf = getGeminiFilterString(box, x, y, options.alpha, options.enableEdgeBlur);

  const inputExt = file.name.split(".").pop() || "mp4";
  const inputName = `in-${Date.now()}.${inputExt}`;

  // Write input with writeFile each run
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // Delete out.mp4 before every exec
  try { await ffmpeg.deleteFile("out.mp4"); } catch {}

  const baseArgs = [
    "-i", inputName,
    "-vf", vf,
    "-c:v", "libx264",
    "-crf", "16",
    "-preset", "veryfast",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
  ];

  let success = false;
  let lastError: Error | null = null;

  // Try 1: -c:a copy
  try {
    await execFfmpegChecked(ffmpeg, [...baseArgs, "-c:a", "copy", "out.mp4"]);
    success = true;
  } catch (err1: any) {
    lastError = err1;
    try { await ffmpeg.deleteFile("out.mp4"); } catch {}

    // Try 2: -c:a aac -b:a 192k
    try {
      await execFfmpegChecked(ffmpeg, [...baseArgs, "-c:a", "aac", "-b:a", "192k", "out.mp4"]);
      success = true;
    } catch (err2: any) {
      lastError = err2;
      try { await ffmpeg.deleteFile("out.mp4"); } catch {}

      // Try 3: -an (strip audio)
      try {
        await execFfmpegChecked(ffmpeg, [...baseArgs, "-an", "out.mp4"]);
        success = true;
      } catch (err3: any) {
        lastError = err3;
      }
    }
  }

  try { await ffmpeg.deleteFile(inputName); } catch {}

  if (!success) {
    throw lastError || new Error("FFmpeg encoding failed");
  }

  const data = await ffmpeg.readFile("out.mp4");
  try { await ffmpeg.deleteFile("out.mp4"); } catch {}

  const blob = new Blob([data as BlobPart], { type: "video/mp4" });
  return { blob, url: URL.createObjectURL(blob), ext: "mp4" };
}

/**
 * Live canvas frame unblend preview:
 * original = (pixel - a*255) / (1 - a)
 * where a = alpha * clamp((1 - |dx|^0.55 - |dy|^0.55) * 6, 0, 1)
 */
export function applyGeminiFrameUnblend(
  targetCtx: CanvasRenderingContext2D,
  videoEl: HTMLVideoElement,
  boxX: number,
  boxY: number,
  box: number,
  alpha: number
) {
  const W = targetCtx.canvas.width;
  const H = targetCtx.canvas.height;
  targetCtx.drawImage(videoEl, 0, 0, W, H);

  const radius = (box / 2) * 1.05;
  const boxHalf = box / 2;
  const p = 0.68;
  const xp = [0.00, 0.20, 0.85, 0.92, 0.97, 1.02, 1.07, 1.11];
  const fp = [0.304, 0.302, 0.294, 0.278, 0.185, 0.055, 0.012, 0.000];
  const alphaScale = alpha / 0.30;

  function getAlpha(d: number): number {
    if (d <= xp[0]) return fp[0] * alphaScale;
    if (d >= xp[xp.length - 1]) return 0;
    for (let k = 0; k < xp.length - 1; k++) {
      if (d >= xp[k] && d <= xp[k + 1]) {
        const t = (d - xp[k]) / (xp[k + 1] - xp[k]);
        return (fp[k] + t * (fp[k + 1] - fp[k])) * alphaScale;
      }
    }
    return 0;
  }

  const imgData = targetCtx.getImageData(boxX, boxY, box, box);
  const data = imgData.data;

  for (let by = 0; by < box; by++) {
    for (let bx = 0; bx < box; bx++) {
      const dx = Math.abs(bx - boxHalf) / radius;
      const dy = Math.abs(by - boxHalf) / radius;
      const dist = Math.pow(dx, p) + Math.pow(dy, p);
      const a = getAlpha(dist);
      if (a > 0.001) {
        const idx = (by * box + bx) * 4;
        const oneMinusA = 1 - a;
        const sub = a * 255;
        data[idx] = Math.max(0, Math.min(255, Math.round((data[idx] - sub) / oneMinusA)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round((data[idx + 1] - sub) / oneMinusA)));
        data[idx + 2] = Math.max(0, Math.min(255, Math.round((data[idx + 2] - sub) / oneMinusA)));
      }
    }
  }

  targetCtx.putImageData(imgData, boxX, boxY);
}

/**
 * Real-Time Canvas + MediaRecorder Video Processing Fallback
 * Needs NO ffmpeg filters - processes frame-by-frame with exact reverse alpha blending.
 */
export function processGeminiVideoCanvasFallback(
  videoSourceUrl: string,
  width: number,
  height: number,
  options: {
    alpha: number;
    sizePct: number;
    distancePct: number;
  },
  onProgress: (progress: number, message: string) => void
): Promise<{ blob: Blob; url: string; ext: string }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = videoSourceUrl;
    video.crossOrigin = "anonymous";
    video.playsInline = true;
    video.preload = "auto";

    const { box, x: boxX, y: boxY, W, H } = getHardenedCornerGeometry(
      width,
      height,
      options.sizePct,
      options.distancePct
    );

    const radius = (box / 2) * 1.05;
    const boxHalf = box / 2;
    const p = 0.68;
    const xp = [0.00, 0.20, 0.85, 0.92, 0.97, 1.02, 1.07, 1.11];
    const fp = [0.304, 0.302, 0.294, 0.278, 0.185, 0.055, 0.012, 0.000];
    const alphaScale = options.alpha / 0.30;

    function getTableAlpha(d: number): number {
      if (d <= xp[0]) return fp[0] * alphaScale;
      if (d >= xp[xp.length - 1]) return 0;
      for (let k = 0; k < xp.length - 1; k++) {
        if (d >= xp[k] && d <= xp[k + 1]) {
          const t = (d - xp[k]) / (xp[k + 1] - xp[k]);
          return (fp[k] + t * (fp[k + 1] - fp[k])) * alphaScale;
        }
      }
      return 0;
    }

    // Precompute alpha lookup table for the [box x box] region
    const alphaTable = new Float32Array(box * box);
    for (let by = 0; by < box; by++) {
      for (let bx = 0; bx < box; bx++) {
        const dx = Math.abs(bx - boxHalf) / radius;
        const dy = Math.abs(by - boxHalf) / radius;
        const dist = Math.pow(dx, p) + Math.pow(dy, p);
        alphaTable[by * box + bx] = getTableAlpha(dist);
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      return reject(new Error("Could not initialize 2D canvas context for video fallback"));
    }

    // Audio routing via AudioContext -> MediaStreamDestination (silent, not connected to speakers)
    let audioCtx: AudioContext | null = null;
    let audioTrack: MediaStreamTrack | null = null;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
        const source = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        const tracks = dest.stream.getAudioTracks();
        if (tracks.length > 0) {
          audioTrack = tracks[0];
        }
      }
    } catch (aErr) {
      console.warn("AudioContext setup warning (processing will proceed):", aErr);
    }

    const fps = 30;
    const stream = canvas.captureStream(fps);
    if (audioTrack) {
      stream.addTrack(audioTrack);
    }

    let mimeType = "video/webm";
    let ext = "webm";

    if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")) {
      mimeType = "video/mp4;codecs=avc1";
      ext = "mp4";
    } else if (MediaRecorder.isTypeSupported("video/mp4")) {
      mimeType = "video/mp4";
      ext = "mp4";
    } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
      mimeType = "video/webm;codecs=vp9";
      ext = "webm";
    }

    // Bitrate: W * H * fps * 0.15 (capped at 40 Mbps)
    const bitsPerSecond = Math.min(40_000_000, Math.max(2_500_000, Math.round(W * H * fps * 0.15)));

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitsPerSecond });
    } catch {
      recorder = new MediaRecorder(stream);
      mimeType = recorder.mimeType || "video/webm";
      ext = mimeType.includes("mp4") ? "mp4" : "webm";
    }

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    let isDoneProcessing = false;
    let animId: number | null = null;
    let vfcId: number | null = null;

    const cleanup = () => {
      isDoneProcessing = true;
      if (vfcId !== null && "cancelVideoFrameCallback" in video) {
        (video as any).cancelVideoFrameCallback(vfcId);
      }
      if (animId !== null) {
        cancelAnimationFrame(animId);
      }
      video.pause();
      video.src = "";
      if (audioCtx && audioCtx.state !== "closed") {
        audioCtx.close().catch(() => {});
      }
    };

    recorder.onstop = () => {
      cleanup();
      const outputBlob = new Blob(chunks, { type: mimeType });
      const outputUrl = URL.createObjectURL(outputBlob);
      resolve({ blob: outputBlob, url: outputUrl, ext });
    };

    recorder.onerror = (e: any) => {
      cleanup();
      reject(new Error(e.error?.message || "MediaRecorder processing error"));
    };

    const renderFrame = () => {
      if (isDoneProcessing) return;

      ctx.drawImage(video, 0, 0, W, H);

      const imgData = ctx.getImageData(boxX, boxY, box, box);
      const data = imgData.data;

      for (let i = 0; i < alphaTable.length; i++) {
        const a = alphaTable[i];
        if (a > 0.001) {
          const idx = i * 4;
          const oneMinusA = 1 - a;
          const sub = a * 255;
          data[idx] = Math.max(0, Math.min(255, Math.round((data[idx] - sub) / oneMinusA)));
          data[idx + 1] = Math.max(0, Math.min(255, Math.round((data[idx + 1] - sub) / oneMinusA)));
          data[idx + 2] = Math.max(0, Math.min(255, Math.round((data[idx + 2] - sub) / oneMinusA)));
        }
      }

      ctx.putImageData(imgData, boxX, boxY);

      if (video.duration && video.duration > 0) {
        const prog = Math.min(0.99, video.currentTime / video.duration);
        onProgress(prog, `Processing at real-time speed... ${Math.round(prog * 100)}%`);
      }

      if ("requestVideoFrameCallback" in video) {
        vfcId = (video as any).requestVideoFrameCallback(renderFrame);
      } else {
        animId = requestAnimationFrame(renderFrame);
      }
    };

    video.onloadedmetadata = () => {
      video.currentTime = 0;
    };

    video.onseeked = () => {
      try {
        recorder.start(100);
        video.play().then(() => {
          if ("requestVideoFrameCallback" in video) {
            vfcId = (video as any).requestVideoFrameCallback(renderFrame);
          } else {
            animId = requestAnimationFrame(renderFrame);
          }
        }).catch(reject);
      } catch (recErr) {
        reject(recErr);
      }
    };

    video.onended = () => {
      onProgress(1, "Finalizing clean video export...");
      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, 250);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Failed to load video element for canvas recording"));
    };
  });
}
