import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export type CornerSettings = { sizePct: number; distancePct: number; strengthPct: number };
let engine: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;
let assetUrls: string[] = [];

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

export function getCornerGeometry(width: number, height: number, settings: CornerSettings) {
  const shortSide = Math.min(width, height);
  const box = Math.min(even((settings.sizePct / 100) * shortSide), even(Math.min(width, height)));
  const distance = (settings.distancePct / 100) * shortSide;
  const x = Math.max(0, Math.min(width - box, even(width - distance - box)));
  const y = Math.max(0, Math.min(height - box, even(height - distance - box)));
  return { box, x, y };
}

export function getCornerFilter(width: number, height: number, settings: CornerSettings) {
  const { box, x, y } = getCornerGeometry(width, height, settings);
  const c = box / 2;
  const radius = (box / 2 * 0.95).toFixed(2);
  const alpha = (settings.strengthPct / 100).toFixed(4);
  const shape = `${alpha}*clip((1-pow(abs((X-${c})/${radius}),0.55)-pow(abs((Y-${c})/${radius}),0.55))*6,0,1)`;
  const expression = `clip((p(X,Y)-255*(${shape}))/(1-(${shape})),0,255)`;
  const filter = `split[a][b];[b]crop=${box}:${box}:${x}:${y},format=gbrp,geq=r='${expression}':g='${expression}':b='${expression}'[c];[a][c]overlay=${x}:${y},format=yuv420p`;
  return { filter, box, x, y };
}

export async function processClearCorner(file: File, width: number, height: number, settings: CornerSettings, onProgress: (value: number) => void) {
  const ffmpeg = await getClearCornerEngine(onProgress);
  const inputName = `input-${Date.now()}.${file.name.split(".").pop() || "mp4"}`;
  await ffmpeg.writeFile(inputName, await fetchFile(file));
  try { await ffmpeg.deleteFile("out.mp4"); } catch { /* first run */ }
  const { filter } = getCornerFilter(width, height, settings);
  const videoArgs = ["-i", inputName, "-vf", filter, "-c:v", "libx264", "-crf", "16", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-movflags", "+faststart"];
  try {
    await ffmpeg.exec([...videoArgs, "-c:a", "copy", "out.mp4"]);
  } catch (copyError) {
    try { await ffmpeg.deleteFile("out.mp4"); } catch { /* ignore */ }
    await ffmpeg.exec([...videoArgs, "-c:a", "aac", "-b:a", "192k", "out.mp4"]).catch(() => { throw copyError; });
  }
  const data = await ffmpeg.readFile("out.mp4");
  const blob = new Blob([data as BlobPart], { type: "video/mp4" });
  await ffmpeg.deleteFile(inputName);
  return { blob, url: URL.createObjectURL(blob) };
}

/* ==========================================================================
   EXACT ALPHA UNBLEND ENGINE: original = (watermarked − α·255) / (1 − α)
   ========================================================================== */

export interface GeminiUnblendOptions {
  alpha: number; // 0.40 - 0.70 (default: 0.55)
  sizePct: number; // default: 7.2
  distancePct: number; // default: 4.2
  enableEdgeBlur?: boolean; // default: true
}

/**
 * 1. Creates the Gemini 4-pointed sparkle canvas mask
 */
export function makeMask(
  w: number,
  h: number,
  cx: number,
  cy: number,
  size: number,
  alpha = 0.55
): string {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) return "";

  // Fill black background (#000)
  g.fillStyle = "#000000";
  g.fillRect(0, 0, w, h);

  // Sparkle fill color corresponds to alpha * 255
  const v = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  g.fillStyle = `rgb(${v},${v},${v})`;
  g.filter = "blur(0.7px)";

  // 4-pointed geometric sparkle curve
  const r = size / 2;
  const k = r * 0.12;

  g.beginPath();
  g.moveTo(cx, cy - r);
  g.quadraticCurveTo(cx + k, cy - k, cx + r, cy);
  g.quadraticCurveTo(cx + k, cy + k, cx, cy + r);
  g.quadraticCurveTo(cx - k, cy + k, cx - r, cy);
  g.quadraticCurveTo(cx - k, cy - k, cx, cy - r);
  g.closePath();
  g.fill();

  return c.toDataURL("image/png");
}

/**
 * Calculates logo center (cx, cy) and size in real video pixels
 */
export function getGeminiCoordinates(
  w: number,
  h: number,
  sizePct = 7.2,
  distancePct = 4.2
) {
  const shortSide = Math.min(w, h);
  const size = Math.max(12, even(Math.round((shortSide * sizePct) / 100)));
  const distance = Math.round((shortSide * distancePct) / 100);
  const cx = Math.max(size / 2, Math.min(w - size / 2, Math.round(w - distance - size / 2)));
  const cy = Math.max(size / 2, Math.min(h - size / 2, Math.round(h - distance - size / 2)));
  return { cx, cy, size, distance };
}

/**
 * Live canvas frame unblend preview for calibration:
 * original = (watermarked − α·255) / (1 − α)
 */
export function applyGeminiFrameUnblend(
  targetCtx: CanvasRenderingContext2D,
  videoEl: HTMLVideoElement,
  cx: number,
  cy: number,
  size: number,
  alpha: number
) {
  const w = targetCtx.canvas.width;
  const h = targetCtx.canvas.height;
  targetCtx.drawImage(videoEl, 0, 0, w, h);

  const r = size / 2;
  const k = r * 0.12;
  const pad = Math.round(size * 0.3);
  const W = Math.min(w, Math.round(size + pad * 2));
  const H = Math.min(h, Math.round(size + pad * 2));
  const X = Math.max(0, Math.min(w - W, Math.round(cx - W / 2)));
  const Y = Math.max(0, Math.min(h - H, Math.round(cy - H / 2)));

  // Offscreen star mask
  const mCanvas = document.createElement("canvas");
  mCanvas.width = W;
  mCanvas.height = H;
  const mg = mCanvas.getContext("2d");
  if (!mg) return;

  mg.fillStyle = "#000000";
  mg.fillRect(0, 0, W, H);
  const v = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  mg.fillStyle = `rgb(${v},${v},${v})`;
  mg.filter = "blur(0.7px)";

  const localCx = cx - X;
  const localCy = cy - Y;
  mg.beginPath();
  mg.moveTo(localCx, localCy - r);
  mg.quadraticCurveTo(localCx + k, localCy - k, localCx + r, localCy);
  mg.quadraticCurveTo(localCx + k, localCy + k, localCx, localCy + r);
  mg.quadraticCurveTo(localCx - k, localCy + k, localCx - r, localCy);
  mg.quadraticCurveTo(localCx - k, localCy - k, localCx, localCy - r);
  mg.closePath();
  mg.fill();

  const mData = mg.getImageData(0, 0, W, H).data;
  const imgData = targetCtx.getImageData(X, Y, W, H);
  const d = imgData.data;

  for (let i = 0; i < d.length; i += 4) {
    const B = mData[i];
    if (B > 0) {
      const denom = Math.max(1, 255 - B);
      d[i] = Math.max(0, Math.min(255, Math.round((255 * (d[i] - B)) / denom)));
      d[i + 1] = Math.max(0, Math.min(255, Math.round((255 * (d[i + 1] - B)) / denom)));
      d[i + 2] = Math.max(0, Math.min(255, Math.round((255 * (d[i + 2] - B)) / denom)));
    }
  }

  targetCtx.putImageData(imgData, X, Y);
}

/**
 * 2. Full In-Browser FFmpeg.wasm execution using the exact specified pipeline:
 * [a][b]blend=all_expr='255*(A-B)/max(255-B,1)':shortest=1,format=yuv420p[out]
 */
export async function processGeminiVideoWithMask(
  file: File,
  width: number,
  height: number,
  options: GeminiUnblendOptions,
  onProgress: (value: number) => void
) {
  const ffmpeg = await getClearCornerEngine(onProgress);

  const { cx, cy, size } = getGeminiCoordinates(width, height, options.sizePct, options.distancePct);
  const maskDataUrl = makeMask(width, height, cx, cy, size, options.alpha);

  const inputExt = file.name.split(".").pop() || "mp4";
  const inputName = `in-${Date.now()}.${inputExt}`;

  await ffmpeg.writeFile(inputName, await fetchFile(file));
  await ffmpeg.writeFile("mask.png", await fetchFile(maskDataUrl));

  try { await ffmpeg.deleteFile("out.mp4"); } catch {}

  let filterComplex =
    "[0:v]format=gbrp[a];[1:v]format=gbrp[b];" +
    "[a][b]blend=all_expr='255*(A-B)/max(255-B,1)':shortest=1,format=yuv420p[out]";

  if (options.enableEdgeBlur) {
    const W = Math.max(2, even(Math.round(size * 1.3)));
    const H = Math.max(2, even(Math.round(size * 1.3)));
    const X = Math.max(0, Math.min(width - W, even(Math.round(cx - W / 2))));
    const Y = Math.max(0, Math.min(height - H, even(Math.round(cy - H / 2))));
    filterComplex =
      "[0:v]format=gbrp[a];[1:v]format=gbrp[b];" +
      `[a][b]blend=all_expr='255*(A-B)/max(255-B,1)':shortest=1,format=yuv420p[m];` +
      `[m]split[orig][p];[p]crop=${W}:${H}:${X}:${Y},boxblur=1:1[q];[orig][q]overlay=${X}:${Y}[out]`;
  }

  const baseArgs = [
    "-i", inputName,
    "-loop", "1", "-i", "mask.png",
    "-filter_complex", filterComplex,
    "-map", "[out]", "-map", "0:a?",
    "-c:v", "libx264", "-crf", "14", "-preset", "medium",
    "-movflags", "+faststart"
  ];

  try {
    await ffmpeg.exec([...baseArgs, "-c:a", "copy", "out.mp4"]);
  } catch (copyError) {
    try { await ffmpeg.deleteFile("out.mp4"); } catch {}
    await ffmpeg.exec([...baseArgs, "-c:a", "aac", "-b:a", "192k", "out.mp4"]).catch(() => {
      throw copyError;
    });
  }

  const data = await ffmpeg.readFile("out.mp4");
  const blob = new Blob([data as BlobPart], { type: "video/mp4" });

  try { await ffmpeg.deleteFile(inputName); } catch {}
  try { await ffmpeg.deleteFile("mask.png"); } catch {}
  try { await ffmpeg.deleteFile("out.mp4"); } catch {}

  return { blob, url: URL.createObjectURL(blob) };
}
