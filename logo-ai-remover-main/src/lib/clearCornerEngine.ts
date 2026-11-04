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
  if (engine?.loaded) return engine;
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
