import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clipboard,
  Download,
  Image as ImageIcon,
  LoaderCircle,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Square,
  UploadCloud,
  WandSparkles,
  X,
} from "lucide-react";
import { fetchFile } from "@ffmpeg/util";
import { toast } from "sonner";
import { PinkButton } from "./PinkButton";
import {
  commandLine,
  delogoFilter,
  even,
  getLocalFfmpeg,
  outputName,
  paddedMask,
  terminateLocalFfmpeg,
  type MaskRect,
} from "@/lib/localFfmpeg";

type MediaKind = "video" | "image";
type Status = "idle" | "loading" | "preview" | "exporting" | "done" | "error";
const ACCEPT = ".mp4,.webm,.mov,.mkv,.png,.jpg,.jpeg,.webp";

const extension = (file: File) =>
  file.name.split(".").pop()?.toLowerCase().replace("jpeg", "jpg") || "bin";
const formatTime = (seconds: number) =>
  Number.isFinite(seconds)
    ? `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0")}`
    : "0:00";
const objectUrl = (data: Uint8Array | string, mime: string) => {
  const body = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return URL.createObjectURL(new Blob([body.slice().buffer], { type: mime }));
};
const download = (url: string, name: string) => {
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export function LocalMediaCleaner({
  demoUrl = "/gemini-example-before.mp4",
  demoName = "Google_Veo_Underwater_Sample.mp4",
}: {
  demoUrl?: string;
  demoName?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [kind, setKind] = useState<MediaKind>("video");
  const [size, setSize] = useState({ width: 1920, height: 1080 });
  const [mask, setMask] = useState<MaskRect>({ x: 1700, y: 900, w: 120, h: 120 });
  const [padding, setPadding] = useState(8);
  const [status, setStatus] = useState<Status>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [jpgUrl, setJpgUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fps, setFps] = useState(30);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [downloadQueued, setDownloadQueued] = useState(false);
  const [cliOpen, setCliOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [viewSize, setViewSize] = useState({ width: 1, height: 1 });

  const inputRef = useRef<HTMLInputElement>(null);
  const originalVideoRef = useRef<HTMLVideoElement>(null);
  const processedVideoRef = useRef<HTMLVideoElement>(null);
  const originalImageRef = useRef<HTMLImageElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const runIdRef = useRef(0);
  const urlsRef = useRef<Array<string | null>>([]);
  const dragRef = useRef<null | {
    mode: "move" | "resize";
    clientX: number;
    clientY: number;
    mask: MaskRect;
  }>(null);

  const busy = status === "loading" || status === "exporting";
  const isJpg = !!file && /\.jpe?g$/iu.test(file.name);
  const resultUrl = outputUrl || previewUrl;
  const totalFrames = Math.max(1, Math.round(duration * fps));
  const completeFrames =
    status === "done" ? totalFrames : Math.min(totalFrames, Math.round(progress * totalFrames));
  const finalMask = useMemo(
    () => paddedMask(mask, padding, size.width, size.height),
    [mask, padding, size],
  );
  urlsRef.current = [sourceUrl, previewUrl, outputUrl, jpgUrl];

  const addLog = (message: string) => {
    console.info(`[Local cleanup] ${message}`);
    setLogs((current) => [...current.slice(-299), message]);
  };
  const clearResults = () => {
    [previewUrl, outputUrl, jpgUrl].forEach((url) => url && URL.revokeObjectURL(url));
    setPreviewUrl(null);
    setOutputUrl(null);
    setJpgUrl(null);
    setError("");
    setProgress(0);
    setDownloadQueued(false);
  };
  const reset = () => {
    runIdRef.current += 1;
    if (busy) terminateLocalFfmpeg();
    clearResults();
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSourceUrl(null);
    setFile(null);
    setStatus("idle");
    setLogs([]);
    setCurrentTime(0);
    setPlaying(false);
  };

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      setViewSize({ width: rect.width, height: rect.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [sourceUrl]);

  useEffect(
    () => () => {
      runIdRef.current += 1;
      urlsRef.current.forEach((url) => url && URL.revokeObjectURL(url));
      terminateLocalFfmpeg();
    },
    [],
  );

  useEffect(() => {
    if (status === "done" && downloadQueued && outputUrl && file) {
      download(outputUrl, outputName(file.name, kind === "video" ? "mp4" : "png"));
      setDownloadQueued(false);
      toast.success("HD file is ready and downloading.");
    }
  }, [status, downloadQueued, outputUrl, file, kind]);

  const loadFile = async (nextFile: File) => {
    const ext = extension(nextFile);
    const nextKind: MediaKind = /^(png|jpe?g|webp)$/iu.test(ext) ? "image" : "video";
    if (!/^(mp4|webm|mov|mkv|png|jpe?g|webp)$/iu.test(ext)) {
      toast.error("Use MP4, WebM, MOV, MKV, PNG, JPG, or WebP.");
      return;
    }
    if (nextFile.size > 500 * 1024 * 1024) {
      toast.warning(
        "This file is over 500 MB. Browser memory may be limited; the CLI guide is safer.",
      );
    }
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    clearResults();
    const url = URL.createObjectURL(nextFile);
    setFile(nextFile);
    setSourceUrl(url);
    setKind(nextKind);
    setStatus("idle");
    setLogs([]);
    try {
      const metadata = await new Promise<{ width: number; height: number; duration: number }>(
        (resolve, reject) => {
          if (nextKind === "image") {
            const image = new Image();
            image.onload = () =>
              resolve({ width: image.naturalWidth, height: image.naturalHeight, duration: 0 });
            image.onerror = () => reject(new Error("The image could not be decoded."));
            image.src = url;
          } else {
            const video = document.createElement("video");
            video.preload = "metadata";
            video.onloadedmetadata = () =>
              resolve({
                width: video.videoWidth,
                height: video.videoHeight,
                duration: video.duration,
              });
            video.onerror = () =>
              reject(new Error("The video could not be decoded by this browser."));
            video.src = url;
          }
        },
      );
      setSize({ width: metadata.width, height: metadata.height });
      setDuration(metadata.duration);
      const shortSide = Math.min(metadata.width, metadata.height);
      const box = even(shortSide * 0.09, 12);
      const margin = even(shortSide * 0.03);
      setMask({
        x: even(Math.max(0, metadata.width - box - margin)),
        y: even(Math.max(0, metadata.height - box - margin)),
        w: box,
        h: box,
      });
      toast.success(`Loaded "${nextFile.name}". Drag the box over the logo.`);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not read this file.");
      setStatus("error");
    }
  };

  const loadDemo = async () => {
    try {
      const response = await fetch(demoUrl);
      if (!response.ok) throw new Error();
      await loadFile(new File([await response.blob()], demoName, { type: "video/mp4" }));
    } catch {
      toast.error("Could not load the demo. Choose a local file instead.");
    }
  };

  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const pasted = [...(event.clipboardData?.files || [])][0];
      if (pasted) {
        event.preventDefault();
        void loadFile(pasted);
      }
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  });

  const autoDetect = async () => {
    if (!sourceUrl) return;
    addLog("Auto-detect: sampling for a small, static high-contrast region.");
    const sampleWidth = 180;
    const sampleHeight = Math.max(80, Math.round((sampleWidth * size.height) / size.width));
    const canvas = document.createElement("canvas");
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    const frames: Uint8ClampedArray[] = [];
    try {
      if (kind === "image") {
        const image = originalImageRef.current;
        if (!image) return;
        context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
        frames.push(context.getImageData(0, 0, sampleWidth, sampleHeight).data);
      } else {
        const video = document.createElement("video");
        video.muted = true;
        video.preload = "auto";
        video.src = sourceUrl;
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject(new Error("Could not sample video frames."));
        });
        const count = Math.min(12, Math.max(3, Math.round(duration * 2)));
        for (let index = 0; index < count; index += 1) {
          video.currentTime = duration ? (duration * index) / Math.max(1, count - 1) : 0;
          await new Promise<void>((resolve) => {
            video.onseeked = () => resolve();
          });
          context.drawImage(video, 0, 0, sampleWidth, sampleHeight);
          frames.push(context.getImageData(0, 0, sampleWidth, sampleHeight).data);
        }
        video.removeAttribute("src");
        video.load();
      }
      const patchSize = Math.max(8, Math.round(Math.min(sampleWidth, sampleHeight) * 0.1));
      let best = { score: -Infinity, x: sampleWidth - patchSize, y: sampleHeight - patchSize };
      const step = Math.max(3, Math.round(patchSize / 3));
      for (let y = 0; y <= sampleHeight - patchSize; y += step) {
        for (let x = 0; x <= sampleWidth - patchSize; x += step) {
          let temporal = 0;
          let contrast = 0;
          let points = 0;
          for (let py = y; py < y + patchSize; py += 2) {
            for (let px = x; px < x + patchSize; px += 2) {
              const offset = (py * sampleWidth + px) * 4;
              const values = frames.map(
                (frame) => (frame[offset] + frame[offset + 1] + frame[offset + 2]) / 3,
              );
              const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
              temporal +=
                values.reduce((sum, value) => sum + Math.abs(value - mean), 0) / values.length;
              if (px + 2 < sampleWidth) {
                contrast += Math.abs(
                  mean -
                    (frames[0][offset + 8] + frames[0][offset + 9] + frames[0][offset + 10]) / 3,
                );
              }
              points += 1;
            }
          }
          const edgeDistance = Math.min(
            x,
            y,
            sampleWidth - x - patchSize,
            sampleHeight - y - patchSize,
          );
          const edgeBonus = 1 + Math.max(0, patchSize * 1.5 - edgeDistance) / (patchSize * 3);
          const score = ((contrast / points) * edgeBonus) / (1 + temporal / points);
          if (score > best.score) best = { score, x, y };
        }
      }
      const scaleX = size.width / sampleWidth;
      const scaleY = size.height / sampleHeight;
      const extra = patchSize * 0.1;
      setMask({
        x: even(Math.max(0, (best.x - extra) * scaleX)),
        y: even(Math.max(0, (best.y - extra) * scaleY)),
        w: even(Math.min(size.width, (patchSize + extra * 2) * scaleX), 12),
        h: even(Math.min(size.height, (patchSize + extra * 2) * scaleY), 12),
      });
      toast.success("Best-effort logo area selected. Adjust the box if needed.");
    } catch (problem) {
      addLog(`Auto-detect failed: ${problem instanceof Error ? problem.message : String(problem)}`);
      toast.error("Auto-detect could not confirm the logo. Place the box manually.");
    }
  };

  const runCommand = async (ffmpeg: Awaited<ReturnType<typeof getLocalFfmpeg>>, args: string[]) => {
    addLog(`$ ${commandLine(args)}`);
    const exitCode = await ffmpeg.exec(args);
    if (exitCode !== 0) throw new Error(`FFmpeg exited with code ${exitCode}.`);
  };

  const startCleanup = async () => {
    if (!file) return;
    clearResults();
    const runId = ++runIdRef.current;
    setStatus("loading");
    setLogs([]);
    setError("");
    setProgress(0);
    let ffmpeg: Awaited<ReturnType<typeof getLocalFfmpeg>> | null = null;
    let inputName = "";
    const made: string[] = [];
    const logHandler = ({ message }: { message: string }) => {
      addLog(message);
      const fpsMatch = message.match(/,\s*(\d+(?:\.\d+)?)\s+fps(?:,|\s)/u);
      if (fpsMatch) setFps(Number(fpsMatch[1]));
      const durationMatch = message.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/u);
      if (durationMatch) {
        setDuration(
          Number(durationMatch[1]) * 3600 +
            Number(durationMatch[2]) * 60 +
            Number(durationMatch[3]),
        );
      }
    };
    const progressHandler = ({ progress: value }: { progress: number }) => {
      if (Number.isFinite(value)) setProgress(Math.max(0, Math.min(1, value)));
    };
    try {
      ffmpeg = await getLocalFfmpeg(addLog);
      if (runId !== runIdRef.current) return;
      ffmpeg.on("log", logHandler);
      ffmpeg.on("progress", progressHandler);
      inputName = `input.${extension(file)}`;
      await ffmpeg.writeFile(inputName, await fetchFile(file));
      addLog(`Input: ${file.name} (${size.width}×${size.height})`);

      const previewHeight = kind === "video" ? 480 : Math.min(480, size.height);
      const previewScale = previewHeight / size.height;
      const previewMask = {
        x: even(finalMask.x * previewScale),
        y: even(finalMask.y * previewScale),
        w: even(finalMask.w * previewScale, 2),
        h: even(finalMask.h * previewScale, 2),
      };

      if (kind === "video") {
        const preview = "preview.mp4";
        await runCommand(ffmpeg, [
          "-y",
          "-i",
          inputName,
          "-vf",
          `scale=-2:${previewHeight},${delogoFilter(previewMask)}`,
          "-c:v",
          "libx264",
          "-crf",
          "23",
          "-preset",
          "veryfast",
          "-pix_fmt",
          "yuv420p",
          "-an",
          "-movflags",
          "+faststart",
          preview,
        ]);
        made.push(preview);
        const previewResult = objectUrl(await ffmpeg.readFile(preview), "video/mp4");
        if (runId !== runIdRef.current) {
          URL.revokeObjectURL(previewResult);
          return;
        }
        setPreviewUrl(previewResult);
        setStatus("preview");
        setProgress(0);
        addLog("Fast preview ready. Starting full-resolution export.");

        const output = "output.mp4";
        const baseArgs = [
          "-y",
          "-i",
          inputName,
          "-vf",
          delogoFilter(finalMask),
          "-c:v",
          "libx264",
          "-crf",
          "14",
          "-preset",
          "medium",
          "-pix_fmt",
          "yuv420p",
        ];
        setStatus("exporting");
        try {
          await runCommand(ffmpeg, [
            ...baseArgs,
            "-c:a",
            "copy",
            "-movflags",
            "+faststart",
            output,
          ]);
        } catch (copyProblem) {
          addLog(
            `Audio copy failed; retrying AAC: ${copyProblem instanceof Error ? copyProblem.message : String(copyProblem)}`,
          );
          try {
            await ffmpeg.deleteFile(output);
          } catch {}
          await runCommand(ffmpeg, [
            ...baseArgs,
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-movflags",
            "+faststart",
            output,
          ]);
        }
        made.push(output);
        const fullResult = objectUrl(await ffmpeg.readFile(output), "video/mp4");
        if (runId !== runIdRef.current) {
          URL.revokeObjectURL(fullResult);
          return;
        }
        setOutputUrl(fullResult);
      } else {
        const preview = "preview.png";
        await runCommand(ffmpeg, [
          "-y",
          "-i",
          inputName,
          "-vf",
          `scale=-2:${previewHeight},${delogoFilter(previewMask)}`,
          "-frames:v",
          "1",
          preview,
        ]);
        made.push(preview);
        setPreviewUrl(objectUrl(await ffmpeg.readFile(preview), "image/png"));
        setStatus("exporting");
        setProgress(0);
        const output = "output.png";
        await runCommand(ffmpeg, [
          "-y",
          "-i",
          inputName,
          "-vf",
          delogoFilter(finalMask),
          "-frames:v",
          "1",
          output,
        ]);
        made.push(output);
        setOutputUrl(objectUrl(await ffmpeg.readFile(output), "image/png"));
        if (isJpg) {
          const jpg = "output.jpg";
          await runCommand(ffmpeg, [
            "-y",
            "-i",
            inputName,
            "-vf",
            delogoFilter(finalMask),
            "-frames:v",
            "1",
            "-q:v",
            "2",
            jpg,
          ]);
          made.push(jpg);
          setJpgUrl(objectUrl(await ffmpeg.readFile(jpg), "image/jpeg"));
        }
      }
      if (runId === runIdRef.current) {
        setProgress(1);
        setStatus("done");
        toast.success("Local cleanup complete. Full-quality file is ready.");
      }
    } catch (problem) {
      if (runId !== runIdRef.current) return;
      const message = problem instanceof Error ? problem.message : String(problem);
      addLog(`ERROR: ${message}`);
      setError(
        message.includes("SharedArrayBuffer")
          ? "The local engine could not start. Try current Chrome or Edge."
          : `Cleanup failed: ${message}`,
      );
      setStatus("error");
    } finally {
      if (ffmpeg) {
        ffmpeg.off("log", logHandler);
        ffmpeg.off("progress", progressHandler);
        for (const name of [inputName, ...made]) {
          if (name) {
            try {
              await ffmpeg.deleteFile(name);
            } catch {}
          }
        }
      }
    }
  };

  const cancel = () => {
    runIdRef.current += 1;
    terminateLocalFfmpeg();
    setStatus(previewUrl ? "preview" : "idle");
    setProgress(0);
    addLog("Processing cancelled by user.");
    toast.message("Export cancelled.");
  };
  const requestDownload = (format: "mp4" | "png" | "jpg") => {
    if (!file) return;
    const url = format === "jpg" ? jpgUrl : outputUrl;
    if (!url || status !== "done") {
      setDownloadQueued(true);
      toast.message("Preparing HD file… It will download automatically when ready.");
      return;
    }
    download(url, outputName(file.name, format));
  };

  const bounds = useMemo(() => {
    const containerRatio = viewSize.width / viewSize.height;
    const sourceRatio = size.width / size.height;
    if (containerRatio > sourceRatio) {
      const height = viewSize.height;
      const width = height * sourceRatio;
      return { left: (viewSize.width - width) / 2, top: 0, width, height };
    }
    const width = viewSize.width;
    const height = width / sourceRatio;
    return { left: 0, top: (viewSize.height - height) / 2, width, height };
  }, [viewSize, size]);
  const boxStyle = {
    left: bounds.left + (mask.x / size.width) * bounds.width,
    top: bounds.top + (mask.y / size.height) * bounds.height,
    width: (mask.w / size.width) * bounds.width,
    height: (mask.h / size.height) * bounds.height,
  };
  const moveBox = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = ((event.clientX - drag.clientX) / bounds.width) * size.width;
    const dy = ((event.clientY - drag.clientY) / bounds.height) * size.height;
    if (drag.mode === "move") {
      setMask({
        ...drag.mask,
        x: even(Math.min(size.width - drag.mask.w, Math.max(0, drag.mask.x + dx))),
        y: even(Math.min(size.height - drag.mask.h, Math.max(0, drag.mask.y + dy))),
      });
    } else {
      setMask({
        ...drag.mask,
        w: even(Math.min(size.width - drag.mask.x, Math.max(12, drag.mask.w + dx)), 12),
        h: even(Math.min(size.height - drag.mask.y, Math.max(12, drag.mask.h + dy)), 12),
      });
    }
  };
  const beginDrag = (event: React.PointerEvent, mode: "move" | "resize") => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { mode, clientX: event.clientX, clientY: event.clientY, mask };
  };
  const togglePlayback = async () => {
    const original = originalVideoRef.current;
    const processed = processedVideoRef.current;
    if (!original) return;
    if (playing) {
      original.pause();
      processed?.pause();
      setPlaying(false);
    } else {
      await original.play().catch(() => undefined);
      await processed?.play().catch(() => undefined);
      setPlaying(true);
    }
  };
  const seek = (value: number) => {
    setCurrentTime(value);
    if (originalVideoRef.current) originalVideoRef.current.currentTime = value;
    if (processedVideoRef.current) processedVideoRef.current.currentTime = value;
  };
  const cliArgs = file
    ? kind === "video"
      ? [
          "-i",
          file.name,
          "-vf",
          delogoFilter(finalMask),
          "-c:v",
          "libx264",
          "-crf",
          "14",
          "-preset",
          "medium",
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "copy",
          "-movflags",
          "+faststart",
          outputName(file.name, "mp4"),
        ]
      : [
          "-i",
          file.name,
          "-vf",
          delogoFilter(finalMask),
          "-frames:v",
          "1",
          outputName(file.name, "png"),
        ]
    : [];

  if (!file || !sourceUrl) {
    return (
      <div
        className={`relative flex min-h-[400px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-colors ${dragOver ? "border-[#E11D48] bg-[#FFF5F7]" : "border-[#FCA5A5] bg-white hover:bg-[#FFF9FA]"}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const dropped = event.dataTransfer.files[0];
          if (dropped) void loadFile(dropped);
        }}
      >
        <span className="flex size-18 items-center justify-center rounded-3xl bg-gradient-to-tr from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] text-white shadow-[0_8px_25px_rgba(225,29,72,0.35)]">
          <UploadCloud className="size-8" />
        </span>
        <h3 className="mt-5 text-2xl font-semibold tracking-tight text-gray-950">
          Drop your video or image here
        </h3>
        <p className="mt-1.5 max-w-xl text-sm font-normal leading-relaxed text-gray-500">
          MP4, WebM, MOV, MKV, PNG, JPG, or WebP • Local processing • Drag &amp; drop or paste
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <PinkButton
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              inputRef.current?.click();
            }}
          >
            <UploadCloud className="size-4" /> Upload media
          </PinkButton>
          <PinkButton
            type="button"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              void loadDemo();
            }}
          >
            <Sparkles className="size-4" /> Try demo sample
          </PinkButton>
        </div>
        <p className="mt-6 text-xs font-normal text-gray-400">
          Your file stays in this browser and is never uploaded.
        </p>
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept={ACCEPT}
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (selected) void loadFile(selected);
            event.currentTarget.value = "";
          }}
        />
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#FCE7EC] bg-white p-3 text-left shadow-[0_15px_45px_-10px_rgba(225,29,72,0.14)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-950">{file.name}</p>
          <p className="mt-0.5 text-xs font-normal text-gray-500">
            {size.width} × {size.height}
            {kind === "video" ? ` • ${formatTime(duration)}` : ""} • processed locally
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw className="size-3.5" /> Choose another
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <X className="size-3.5" /> Reset
          </button>
          <input
            ref={inputRef}
            className="hidden"
            type="file"
            accept={ACCEPT}
            onChange={(event) => {
              const selected = event.target.files?.[0];
              if (selected) void loadFile(selected);
              event.currentTarget.value = "";
            }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 overflow-hidden rounded-2xl border border-gray-200 md:grid-cols-2 md:divide-x">
        <div className="border-b border-gray-200 p-3 md:border-b-0">
          <div className="mb-2 flex items-center justify-between">
            <span className="rounded-lg bg-gray-950 px-2.5 py-1 text-[11px] font-semibold text-white">
              Original
            </span>
            <span className="text-[11px] font-normal text-gray-400">
              Place box over the full logo
            </span>
          </div>
          <div
            ref={stageRef}
            className="relative aspect-video w-full touch-none overflow-hidden rounded-xl bg-black"
            onPointerMove={moveBox}
            onPointerUp={() => {
              dragRef.current = null;
            }}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
          >
            {kind === "video" ? (
              <video
                ref={originalVideoRef}
                src={sourceUrl}
                playsInline
                onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
                onTimeUpdate={(event) => {
                  const time = event.currentTarget.currentTime;
                  setCurrentTime(time);
                  const processed = processedVideoRef.current;
                  if (processed && Math.abs(processed.currentTime - time) > 0.1)
                    processed.currentTime = time;
                }}
                onEnded={() => setPlaying(false)}
                className="size-full object-contain"
              />
            ) : (
              <img
                ref={originalImageRef}
                src={sourceUrl}
                alt="Original upload"
                className="size-full object-contain"
              />
            )}
            <div
              role="group"
              aria-label="Logo removal area"
              style={boxStyle}
              className="absolute z-10 cursor-move border-2 border-[#FF2E63] bg-[#FF2E63]/12 shadow-[0_0_0_1px_white,0_0_18px_rgba(225,29,72,0.45)]"
              onPointerDown={(event) => beginDrag(event, "move")}
            >
              <span className="absolute -top-6 left-0 rounded bg-[#E11D48] px-1.5 py-0.5 text-[9px] font-semibold text-white">
                Logo area
              </span>
              <button
                type="button"
                aria-label="Resize logo area"
                className="absolute -bottom-2 -right-2 size-4 cursor-nwse-resize rounded-sm border-2 border-white bg-[#E11D48]"
                onPointerDown={(event) => beginDrag(event, "resize")}
              />
            </div>
          </div>
        </div>

        <div className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="rounded-lg bg-gray-950 px-2.5 py-1 text-[11px] font-semibold text-white">
              Processed
            </span>
            {status === "done" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                <CheckCircle2 className="size-3.5" /> Full quality ready
              </span>
            )}
          </div>
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
            {resultUrl ? (
              kind === "video" ? (
                <video
                  ref={processedVideoRef}
                  src={resultUrl}
                  muted
                  playsInline
                  className="size-full object-contain"
                />
              ) : (
                <img src={resultUrl} alt="Processed result" className="size-full object-contain" />
              )
            ) : (
              <div className="flex size-full flex-col items-center justify-center px-6 text-center text-gray-400">
                {busy ? (
                  <LoaderCircle className="mb-2 size-7 animate-spin text-[#E11D48]" />
                ) : (
                  <WandSparkles className="mb-2 size-7 text-[#FF4FA3]" />
                )}
                <p className="text-xs font-normal">
                  {busy ? "Creating a real local preview…" : "Ready to process"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {kind === "video" && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5">
          <button
            type="button"
            onClick={() => void togglePlayback()}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-900 hover:bg-gray-50"
            aria-label={playing ? "Pause both videos" : "Play both videos"}
          >
            {playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
          </button>
          <input
            aria-label="Video position"
            type="range"
            min={0}
            max={duration || 0}
            step="0.01"
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => seek(Number(event.target.value))}
            className="h-1.5 min-w-0 flex-1 accent-[#E11D48]"
          />
          <span className="w-24 text-right font-mono text-[11px] text-gray-500">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="mask-padding" className="text-xs font-medium text-gray-700">
              Padding: {padding}px
            </label>
            <button
              type="button"
              onClick={() => void autoDetect()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#E11D48] disabled:opacity-50"
            >
              <WandSparkles className="size-3.5" /> Auto-detect logo
            </button>
          </div>
          <input
            id="mask-padding"
            type="range"
            min={0}
            max={40}
            value={padding}
            onChange={(event) => setPadding(Number(event.target.value))}
            disabled={busy}
            className="mt-2 h-1.5 w-full accent-[#E11D48]"
          />
          <p className="mt-1 text-[11px] font-normal text-gray-400">
            Source pixels: x {finalMask.x}, y {finalMask.y}, w {finalMask.w}, h {finalMask.h}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCliOpen(true)}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Open CLI guide
          </button>
          {!busy ? (
            <PinkButton type="button" onClick={() => void startCleanup()}>
              <Sparkles className="size-4" /> {status === "error" ? "Retry" : "Start local cleanup"}
            </PinkButton>
          ) : (
            <button
              type="button"
              onClick={cancel}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-700"
            >
              <Square className="size-3.5 fill-current" /> Cancel
            </button>
          )}
        </div>
      </div>

      {(["loading", "exporting", "preview", "done"] as Status[]).includes(status) && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-4 text-xs">
            <span className="font-medium text-gray-700">
              {status === "loading"
                ? "Loading local engine…"
                : kind === "video"
                  ? `Exporting HD ${completeFrames} / ${totalFrames} frames (${Math.round((completeFrames / totalFrames) * 100)}%)`
                  : status === "done"
                    ? "Original-resolution image ready"
                    : `Exporting original image (${Math.round(progress * 100)}%)`}
            </span>
            <span className="font-mono text-[11px] text-gray-500">
              {Math.round(progress * 100)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#E11D48] to-[#FF4FA3] transition-[width]"
              style={{ width: `${status === "done" ? 100 : progress * 100}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void startCleanup()}
            className="mt-2 text-xs font-semibold underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-disabled={status !== "done"}
          onClick={() => requestDownload(kind === "video" ? "mp4" : "png")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors ${status === "done" ? "bg-[#E11D48] text-white hover:bg-[#BE123C]" : "cursor-wait bg-gray-200 text-gray-500"}`}
        >
          <Download className="size-4" /> {kind === "video" ? "Download MP4" : "Download PNG"}
        </button>
        {kind === "image" && isJpg && (
          <button
            type="button"
            aria-disabled={status !== "done"}
            onClick={() => requestDownload("jpg")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold ${status === "done" ? "border border-[#E11D48] bg-white text-[#E11D48]" : "cursor-wait bg-gray-200 text-gray-500"}`}
          >
            <ImageIcon className="size-4" /> Download JPG (quality 95)
          </button>
        )}
        {downloadQueued && status !== "done" && (
          <span className="text-xs font-medium text-gray-500">Preparing HD file…</span>
        )}
      </div>

      <details className="mt-4 rounded-xl border border-gray-200 bg-white">
        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-gray-600">
          Show log
        </summary>
        <pre className="max-h-52 overflow-auto border-t border-gray-100 bg-gray-950 p-3 text-[10px] leading-relaxed text-gray-200">
          {logs.length ? logs.join("\n") : "FFmpeg commands and logs will appear here."}
        </pre>
      </details>

      {cliOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setCliOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-950">Native FFmpeg command</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Use this for very large files. Values match the current box and padding.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCliOpen(false)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
              >
                <X className="size-4" />
              </button>
            </div>
            <pre className="mt-4 overflow-auto rounded-xl bg-gray-950 p-4 text-xs leading-relaxed text-gray-100">
              {commandLine(cliArgs)}
            </pre>
            <div className="mt-4 flex justify-end">
              <PinkButton
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(commandLine(cliArgs));
                  toast.success("Command copied.");
                }}
              >
                <Clipboard className="size-4" /> Copy command
              </PinkButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
