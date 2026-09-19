import type { FFmpeg } from "@ffmpeg/ffmpeg";

export type MaskRect = { x: number; y: number; w: number; h: number };

const CORE_BASE = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";
let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoading: Promise<FFmpeg> | null = null;

export async function getLocalFfmpeg(onLog?: (message: string) => void) {
  if (ffmpegInstance?.loaded) return ffmpegInstance;
  if (ffmpegLoading) return ffmpegLoading;
  ffmpegLoading = (async () => {
    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
      import("@ffmpeg/ffmpeg"),
      import("@ffmpeg/util"),
    ]);
    const ffmpeg = new FFmpeg();
    onLog?.("Loading the local FFmpeg engine…");
    await ffmpeg.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();
  try {
    return await ffmpegLoading;
  } finally {
    ffmpegLoading = null;
  }
}

export function terminateLocalFfmpeg() {
  ffmpegInstance?.terminate();
  ffmpegInstance = null;
  ffmpegLoading = null;
}

export function even(value: number, minimum = 0) {
  return Math.max(minimum, Math.round(value / 2) * 2);
}

export function paddedMask(mask: MaskRect, padding: number, width: number, height: number) {
  const p = Math.max(0, padding);
  const x = even(Math.max(0, mask.x - p));
  const y = even(Math.max(0, mask.y - p));
  let w = even(Math.min(width - x, mask.w + p * 2), 2);
  let h = even(Math.min(height - y, mask.h + p * 2), 2);
  if (x + w > width) w = even(width - x, 2);
  if (y + h > height) h = even(height - y, 2);
  return { x, y, w, h };
}

export const delogoFilter = (mask: MaskRect) =>
  `delogo=x=${mask.x}:y=${mask.y}:w=${mask.w}:h=${mask.h}`;

export function commandLine(args: string[]) {
  return `ffmpeg ${args
    .map((arg) => (/\s|["']/u.test(arg) ? `"${arg.replaceAll('"', '\\"')}"` : arg))
    .join(" ")}`;
}

export const outputName = (originalName: string, extension: string) =>
  `${originalName.replace(/\.[^.]+$/u, "")}_clean.${extension}`;
