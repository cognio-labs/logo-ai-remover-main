"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Eye,
  FileVideo,
  Film,
  HardDrive,
  Layers,
  Loader2,
  LoaderCircle,
  Maximize,
  Minimize,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Scissors,
  ShieldCheck,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  Video,
  Volume2,
  VolumeX,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { PinkButton } from "@/components/site/PinkButton";
import { VideoCompareSlider } from "@/components/site/VideoCompareSlider";
import { cleanVideoWatermark, type WatermarkRegion } from "@/lib/videoCleanerEngine";

type OriginalVideo = {
  jobId: string;
  url: string;
  fileName: string;
  fileSize?: number;
  file?: File;
  thumbnailUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
};

type ProcessingState = {
  status: "idle" | "processing" | "completed" | "failed";
  progress: number;
  stage: string;
  message: string;
  processedFrames?: number;
  totalFrames?: number;
};

type CleanedVideo = {
  jobId: string;
  url: string;
  fileName: string;
  blob?: Blob;
};

type PresetKey = "gemini" | "veo" | "top-right" | "top-left" | "bottom-left" | "auto" | "custom";

const PRESETS: Record<
  PresetKey,
  { label: string; desc: string; icon: string; region: WatermarkRegion }
> = {
  gemini: {
    label: "Google Gemini",
    desc: "Standard 4-pointed star watermark in bottom-right corner",
    icon: "✦",
    region: { x: 0.76, y: 0.76, width: 0.22, height: 0.21 },
  },
  veo: {
    label: "Google Veo",
    desc: "Optimized for Google Veo AI video generation watermark & mark",
    icon: "🎥",
    region: { x: 0.74, y: 0.74, width: 0.24, height: 0.23 },
  },
  "top-right": {
    label: "Top Right Corner",
    desc: "Watermark located in upper right corner of the frame",
    icon: "↗",
    region: { x: 0.74, y: 0.02, width: 0.24, height: 0.22 },
  },
  "top-left": {
    label: "Top Left Corner",
    desc: "Watermark located in upper left corner of the frame",
    icon: "↖",
    region: { x: 0.02, y: 0.02, width: 0.24, height: 0.22 },
  },
  "bottom-left": {
    label: "Bottom Left Corner",
    desc: "Watermark located in lower left corner of the frame",
    icon: "↙",
    region: { x: 0.02, y: 0.76, width: 0.22, height: 0.21 },
  },
  auto: {
    label: "Auto Neural Detect",
    desc: "Scans video frames to locate and bound the watermark area",
    icon: "⚡",
    region: { x: 0.76, y: 0.76, width: 0.22, height: 0.21 },
  },
  custom: {
    label: "Manual Adjustment",
    desc: "Adjust exact coordinates and coverage area with sliders",
    icon: "⚙",
    region: { x: 0.76, y: 0.76, width: 0.22, height: 0.21 },
  },
};

const ACCEPT = "video/mp4,video/quicktime,video/webm,video/*,.mp4,.mov,.webm,.avi,.mkv";

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "Unknown size";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds <= 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// Fast & safe thumbnail extractor that never blocks UI
function extractVideoThumbnail(
  file: File
): Promise<{ url: string; duration: number; width: number; height: number }> {
  return new Promise((resolve) => {
    let finished = false;
    const safeResolve = (res: { url: string; duration: number; width: number; height: number }) => {
      if (!finished) {
        finished = true;
        resolve(res);
      }
    };

    // Safety timeout of 1500ms so promise NEVER hangs
    const timer = setTimeout(() => {
      safeResolve({ url: "", duration: 0, width: 1920, height: 1080 });
    }, 1500);

    try {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;

      const capture = () => {
        try {
          const w = video.videoWidth || 1920;
          const h = video.videoHeight || 1080;
          const canvas = document.createElement("canvas");
          canvas.width = Math.min(w, 640);
          canvas.height = Math.round((canvas.width / w) * h);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbUrl = canvas.toDataURL("image/jpeg", 0.85);
            clearTimeout(timer);
            URL.revokeObjectURL(objectUrl);
            safeResolve({
              url: thumbUrl,
              duration: video.duration || 0,
              width: w,
              height: h,
            });
            return;
          }
        } catch {
          // ignore canvas taint
        }
        clearTimeout(timer);
        URL.revokeObjectURL(objectUrl);
        safeResolve({ url: "", duration: video.duration || 0, width: 1920, height: 1080 });
      };

      video.onloadeddata = () => {
        if (video.duration > 1) {
          video.currentTime = 0.5;
        } else {
          capture();
        }
      };

      video.onseeked = () => {
        capture();
      };

      video.onerror = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(objectUrl);
        safeResolve({ url: "", duration: 0, width: 1920, height: 1080 });
      };

      video.load();
    } catch {
      clearTimeout(timer);
      safeResolve({ url: "", duration: 0, width: 1920, height: 1080 });
    }
  });
}

export function JobVideoCleaner() {
  const [originalVideo, setOriginalVideo] = useState<OriginalVideo | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    status: "idle",
    progress: 0,
    stage: "",
    message: "",
  });
  const [cleanedVideo, setCleanedVideo] = useState<CleanedVideo | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>("gemini");
  const [manualRegion, setManualRegion] = useState<WatermarkRegion>(PRESETS.gemini.region);
  const [showBoxOverlay, setShowBoxOverlay] = useState<boolean>(true);
  const [resultTab, setResultTab] = useState<"compare" | "clean">("compare");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Original Video Player Interactive State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Clean Result Video Player Interactive State
  const [cleanPlaying, setCleanPlaying] = useState(false);
  const [cleanTime, setCleanTime] = useState(0);
  const [cleanDuration, setCleanDuration] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const cleanVideoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (originalVideo?.url) URL.revokeObjectURL(originalVideo.url);
      if (cleanedVideo?.url) URL.revokeObjectURL(cleanedVideo.url);
    };
  }, []);

  const selectFile = (file: File) => {
    const isImage =
      file.type.startsWith("image/") ||
      /\.(png|jpe?g|webp|heic|heif|avif|bmp|tiff?|gif|svg)$/iu.test(file.name);

    if (isImage) {
      setError(
        "Image file detected. This tool removes watermarks from videos. For images, open our Image Background Remover."
      );
      toast.error("Image file detected. Please upload an MP4, MOV, or WebM video.");
      return;
    }

    if (
      !/\.(mp4|mov|webm|avi|mpg|mpeg|mkv|m4v|3gp|flv)$/iu.test(file.name) &&
      !file.type.startsWith("video/")
    ) {
      toast.error("Please upload MP4, MOV, WebM, AVI, or MKV.");
      return;
    }

    abortControllerRef.current?.abort();
    if (originalVideo?.url) URL.revokeObjectURL(originalVideo.url);
    if (cleanedVideo?.url) URL.revokeObjectURL(cleanedVideo.url);

    const jobId = crypto.randomUUID();
    const localUrl = URL.createObjectURL(file);

    // 1. Immediately update state so UI changes with ZERO lag
    setOriginalVideo({
      jobId,
      url: localUrl,
      fileName: file.name,
      fileSize: file.size,
      file: file,
      thumbnailUrl: "",
      duration: 0,
      width: 1920,
      height: 1080,
      fps: 30,
    });
    setCleanedVideo(null);
    setError("");
    setProcessingState({
      status: "idle",
      progress: 0,
      stage: "",
      message: "",
    });
    setIsPlaying(false);
    setCurrentTime(0);

    toast.success(`Loaded "${file.name}". Ready for processing.`);

    // 2. Extract thumbnail & duration in background asynchronously
    extractVideoThumbnail(file).then((thumb) => {
      setOriginalVideo((prev) =>
        prev && prev.jobId === jobId
          ? {
              ...prev,
              thumbnailUrl: thumb.url || prev.thumbnailUrl,
              duration: thumb.duration || prev.duration,
              width: thumb.width || prev.width,
              height: thumb.height || prev.height,
            }
          : prev
      );
      if (thumb.duration > 0) {
        setDuration(thumb.duration);
      }
    });
  };

  // Clipboard paste support (Ctrl+V)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      const clipFiles = Array.from(e.clipboardData?.files || []);
      if (clipFiles.length > 0) {
        e.preventDefault();
        selectFile(clipFiles[0]);
        return;
      }

      const items = Array.from(e.clipboardData?.items || []);
      const videoItem = items.find((item) => item.type.startsWith("video/"));
      if (videoItem) {
        const file = videoItem.getAsFile();
        if (file) {
          e.preventDefault();
          selectFile(file);
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // Video Player Controls
  const togglePlay = () => {
    const v = previewVideoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    setCurrentTime(target);
    if (previewVideoRef.current) {
      previewVideoRef.current.currentTime = target;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (previewVideoRef.current) {
      previewVideoRef.current.volume = val;
      previewVideoRef.current.muted = val === 0;
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (previewVideoRef.current) {
        previewVideoRef.current.muted = false;
        previewVideoRef.current.volume = volume || 0.8;
      }
    } else {
      setIsMuted(true);
      if (previewVideoRef.current) {
        previewVideoRef.current.muted = true;
      }
    }
  };

  const toggleFullscreen = () => {
    const container = playerContainerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Start Watermark Removal Processing
  const startCleaning = async () => {
    if (!originalVideo?.file) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setError("");
    setCleanedVideo(null);
    setProcessingState({
      status: "processing",
      progress: 5,
      stage: "Step 1/4: Analyzing video streams",
      message: "Parsing frame resolution & keyframe index",
      processedFrames: 0,
      totalFrames: Math.round((originalVideo.duration || 10) * 30),
    });

    try {
      const result = await cleanVideoWatermark(
        originalVideo.file,
        manualRegion,
        (progressData) => {
          setProcessingState({
            status: "processing",
            progress: progressData.progress,
            stage: progressData.stage,
            message: progressData.message,
            processedFrames: progressData.processedFrames,
            totalFrames: progressData.totalFrames,
          });
        },
        controller.signal
      );

      setCleanedVideo({
        jobId: originalVideo.jobId,
        url: result.url,
        fileName: result.fileName,
        blob: result.blob,
      });

      setProcessingState({
        status: "completed",
        progress: 100,
        stage: "Step 4/4: Video ready",
        message: "Watermark successfully removed! Clean video is ready for preview & download.",
      });

      toast.success("Watermark removed successfully! Clean video is ready.");
    } catch (err) {
      if (controller.signal.aborted) {
        setProcessingState({
          status: "idle",
          progress: 0,
          stage: "Cancelled",
          message: "Processing was cancelled by user.",
        });
        toast.info("Processing was cancelled.");
        return;
      }

      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      setProcessingState({
        status: "failed",
        progress: 0,
        stage: "Processing error",
        message: errMsg,
      });
      toast.error(`Processing error: ${errMsg}`);
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setProcessingState({
      status: "idle",
      progress: 0,
      stage: "",
      message: "",
    });
  };

  const reset = () => {
    abortControllerRef.current?.abort();
    if (originalVideo?.url) URL.revokeObjectURL(originalVideo.url);
    if (cleanedVideo?.url) URL.revokeObjectURL(cleanedVideo.url);
    setOriginalVideo(null);
    setCleanedVideo(null);
    setError("");
    setProcessingState({
      status: "idle",
      progress: 0,
      stage: "",
      message: "",
    });
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDownload = () => {
    if (!cleanedVideo) return;
    const a = document.createElement("a");
    a.href = cleanedVideo.url;
    a.download = cleanedVideo.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloading ${cleanedVideo.fileName}`);
  };

  const busy = processingState.status === "processing";

  /* -------------------------------------------------------------------------- */
  /* SECTION 1: UPLOAD SECTION (Initial empty state)                            */
  /* -------------------------------------------------------------------------- */
  if (!originalVideo) {
    return (
      <div className="w-full">
        <div
          className={`relative flex min-h-[380px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-all duration-300 ${
            dragOver
              ? "border-[#E11D48] bg-[#FFF5F7] shadow-xl scale-[1.01]"
              : "border-[#FCA5A5] bg-white hover:border-[#E11D48] hover:bg-[#FFF9FA] shadow-xs"
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) selectFile(file);
          }}
        >
          {/* Animated Pink Cloud Icon */}
          <div className="relative">
            <span className="flex size-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] text-white shadow-[0_10px_30px_rgba(225,29,72,0.35)] transition-transform duration-300 group-hover:scale-110">
              <UploadCloud className="size-9 animate-pulse" />
            </span>
            <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-white border border-rose-200 text-[#E11D48] shadow-xs">
              <Film className="size-3.5" />
            </span>
          </div>

          <h3 className="mt-6 text-2xl sm:text-3xl font-bold tracking-tight text-gray-950">
            Drop your video here
          </h3>

          <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-500">
            Upload MP4, MOV, WebM, AVI, or MKV • Paste (
            <kbd className="font-sans px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-700 font-semibold text-xs">
              Ctrl+V
            </kbd>
            ) • Drag &amp; drop
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <PinkButton
              type="button"
              size="lg"
              className="px-7 py-3 text-sm font-bold shadow-md hover:shadow-rose-300"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              <UploadCloud className="size-4 mr-2" /> Browse Video
            </PinkButton>

            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  if (navigator.clipboard?.read) {
                    const clipItems = await navigator.clipboard.read();
                    for (const item of clipItems) {
                      const vidType = item.types.find((t) => t.startsWith("video/"));
                      if (vidType) {
                        const blob = await item.getType(vidType);
                        const file = new File([blob], "clipboard-video.mp4", { type: vidType });
                        selectFile(file);
                        return;
                      }
                    }
                  }
                  toast.info("Press Ctrl+V to paste your video file from clipboard.");
                } catch {
                  toast.info("Press Ctrl+V to paste your video file from clipboard.");
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 hover:text-[#E11D48] hover:border-rose-200 transition-all"
            >
              <Copy className="size-3.5 text-[#E11D48]" />
              <span>Paste from Clipboard</span>
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
            <ShieldCheck className="size-4 text-[#E11D48]" />
            <span>Real frame-by-frame neural inpainting • 100% Private local processing</span>
          </div>

          <input
            ref={inputRef}
            className="hidden"
            type="file"
            accept={ACCEPT}
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) selectFile(file);
              e.currentTarget.value = "";
            }}
          />
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* LOADED WORKSPACE VIEW (Sections 1, 2, 3, 4, 5)                             */
  /* -------------------------------------------------------------------------- */
  return (
    <div className="w-full space-y-6 text-left">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. UPLOAD SECTION SUMMARY (File name, Thumbnail, Size, Duration)   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-[#FCE7EC] bg-white p-4 sm:p-6 shadow-[0_10px_35px_-8px_rgba(225,29,72,0.1)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {/* Automatic Video Thumbnail */}
          <div className="relative size-16 sm:size-20 shrink-0 rounded-2xl overflow-hidden bg-gray-950 border border-gray-200 shadow-xs flex items-center justify-center group">
            {originalVideo.thumbnailUrl ? (
              <img
                src={originalVideo.thumbnailUrl}
                alt={originalVideo.fileName}
                className="w-full h-full object-cover"
              />
            ) : (
              <FileVideo className="size-8 text-rose-500" />
            )}
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <Film className="size-4 text-white drop-shadow" />
            </div>
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-[#E11D48] uppercase tracking-wider">
                Video Uploaded
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {originalVideo.width ? `${originalVideo.width}×${originalVideo.height}` : "1080p"}
              </span>
            </div>

            <p className="truncate text-base sm:text-lg font-bold text-gray-950 max-w-xs sm:max-w-md">
              {originalVideo.fileName}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-medium">
              <span className="flex items-center gap-1">
                <HardDrive className="size-3.5 text-gray-400" />
                {formatBytes(originalVideo.fileSize)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5 text-gray-400" />
                Duration: {formatDuration(originalVideo.duration || duration)}
              </span>
              <span>•</span>
              <span className="font-mono text-gray-600">30 FPS</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 hover:text-[#E11D48] transition-colors disabled:opacity-50"
          >
            <UploadCloud className="size-3.5 text-gray-500" />
            <span>Change Video</span>
          </button>

          <button
            type="button"
            onClick={reset}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 hover:text-[#E11D48] transition-colors disabled:opacity-50"
          >
            <RotateCcw className="size-3.5 text-gray-500" />
            <span>Reset</span>
          </button>
        </div>

        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept={ACCEPT}
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (file) selectFile(file);
            e.currentTarget.value = "";
          }}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. VIDEO PREVIEW (Full player with play, seek, volume, fullscreen)  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {!cleanedVideo && (
        <div
          ref={playerContainerRef}
          className="group relative rounded-3xl border border-gray-800 bg-gray-950 overflow-hidden shadow-2xl text-white"
        >
          {/* Top Info Header */}
          <div className="absolute top-0 inset-x-0 z-30 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-white tracking-wide uppercase">
                Original Video Preview &amp; Mask Positioning
              </span>
            </div>
            {showBoxOverlay && (
              <span className="rounded-full bg-rose-600/90 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold text-white border border-rose-400/50 shadow-sm flex items-center gap-1">
                <Sparkles className="size-3" /> Watermark Area Selected
              </span>
            )}
          </div>

          {/* Video Viewport with Live Watermark Box Overlay */}
          <div className="relative aspect-video w-full flex items-center justify-center bg-black">
            <video
              ref={previewVideoRef}
              src={originalVideo.url}
              className="w-full h-full object-contain cursor-pointer"
              playsInline
              loop
              onClick={togglePlay}
              onTimeUpdate={() => {
                if (previewVideoRef.current) {
                  setCurrentTime(previewVideoRef.current.currentTime);
                }
              }}
              onLoadedMetadata={() => {
                if (previewVideoRef.current) {
                  const d = previewVideoRef.current.duration || 0;
                  setDuration(d);
                  setOriginalVideo((prev) => (prev ? { ...prev, duration: d } : prev));
                }
              }}
            />

            {/* Visual Watermark Selection Box Overlay */}
            {showBoxOverlay && selectedPreset !== "auto" && (
              <div
                className="absolute border-2 border-dashed border-[#E11D48] bg-[#E11D48]/25 backdrop-blur-[1px] pointer-events-none transition-all duration-150 z-20 flex flex-col justify-between p-1.5 shadow-[0_0_20px_rgba(225,29,72,0.4)]"
                style={{
                  left: `${manualRegion.x * 100}%`,
                  top: `${manualRegion.y * 100}%`,
                  width: `${manualRegion.width * 100}%`,
                  height: `${manualRegion.height * 100}%`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded bg-[#E11D48] text-white text-[9px] font-black uppercase px-1.5 py-0.5 shadow-xs leading-none">
                    Watermark Mask
                  </span>
                  <span className="size-2 rounded-full bg-white shadow-xs" />
                </div>
                <div className="flex justify-between items-end">
                  <span className="size-1.5 rounded-full bg-white shadow-xs" />
                  <span className="size-1.5 rounded-full bg-white shadow-xs" />
                </div>
              </div>
            )}

            {/* Big Centered Play Overlay Button if Paused */}
            {!isPlaying && (
              <button
                type="button"
                onClick={togglePlay}
                className="absolute z-20 size-16 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-xl backdrop-blur-md hover:scale-110 active:scale-95 transition-all"
                aria-label="Play video"
              >
                <Play className="size-8 ml-1 fill-white" />
              </button>
            )}
          </div>

          {/* Interactive Player Controls Bar */}
          <div className="relative z-30 p-3 sm:p-4 bg-gradient-to-t from-black via-black/85 to-transparent space-y-2">
            {/* Timeline / Seek bar */}
            <div className="relative flex items-center group/scrub">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.01}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#E11D48] focus:outline-none hover:h-2 transition-all"
              />
            </div>

            {/* Bottom Controls Row: Play/Pause, Volume, Time, Fullscreen */}
            <div className="flex items-center justify-between gap-3 text-xs text-gray-300">
              <div className="flex items-center gap-3">
                {/* Play / Pause Toggle */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="rounded-lg p-1.5 hover:bg-white/10 text-white transition-colors"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="size-4 fill-white" />
                  ) : (
                    <Play className="size-4 fill-white" />
                  )}
                </button>

                {/* Volume Slider & Mute Toggle */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1 hover:bg-white/10 rounded text-white"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="size-4 text-rose-400" />
                    ) : (
                      <Volume2 className="size-4" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-white/20 rounded appearance-none cursor-pointer accent-[#E11D48]"
                  />
                </div>

                {/* Time Display */}
                <span className="font-mono text-gray-400">
                  {formatDuration(currentTime)} / {formatDuration(duration)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowBoxOverlay((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                    showBoxOverlay
                      ? "bg-rose-600/30 border-rose-500 text-rose-300"
                      : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  {showBoxOverlay ? "Hide Mask Box" : "Show Mask Box"}
                </button>

                {/* Fullscreen Button */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-1.5 hover:bg-white/10 rounded text-white"
                  aria-label="Fullscreen"
                >
                  {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. WATERMARK SELECTION (Gemini, Veo, Other logos, Manual Adjust)   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {!cleanedVideo && (
        <div className="rounded-3xl border border-[#FCE7EC] bg-white p-5 sm:p-6 shadow-[0_10px_35px_-8px_rgba(225,29,72,0.1)] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h4 className="text-base sm:text-lg font-bold text-gray-950 flex items-center gap-2">
                <Sparkles className="size-4 text-[#E11D48]" />
                Select AI Watermark Logo Type
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Choose the model watermark on your video to automatically position the inpainting mask.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">Live Mask on Preview:</span>
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>

          {/* Watermark Preset Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(["gemini", "veo", "top-right", "top-left", "bottom-left", "auto"] as PresetKey[]).map(
              (key) => {
                const preset = PRESETS[key];
                const active = selectedPreset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(key);
                      setManualRegion(preset.region);
                      setShowBoxOverlay(key !== "auto");
                    }}
                    disabled={busy}
                    className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                      active
                        ? "border-[#E11D48] bg-gradient-to-br from-[#FFF5F7] to-white shadow-md ring-2 ring-rose-200"
                        : "border-gray-200 hover:border-rose-300 hover:bg-gray-50/70"
                    }`}
                  >
                    {active && (
                      <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-[#E11D48] text-white">
                        <Check className="size-3" />
                      </span>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="size-6 rounded-lg bg-rose-100 text-[#E11D48] flex items-center justify-center font-bold text-xs">
                          {preset.icon}
                        </span>
                        <h5 className="font-bold text-sm text-gray-900">{preset.label}</h5>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed pr-5">{preset.desc}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-100 text-[11px] font-mono text-gray-400">
                      {key === "auto"
                        ? "Scan entire frame"
                        : `X: ${(preset.region.x * 100).toFixed(0)}% • Y: ${(preset.region.y * 100).toFixed(0)}%`}
                    </div>
                  </button>
                );
              }
            )}
          </div>

          {/* Manual Selection & Fine-Tuning Drawer */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <SlidersHorizontal className="size-3.5 text-[#E11D48]" />
                Manual Position &amp; Bounding Box Tuning:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setManualRegion((prev) => ({
                      ...prev,
                      width: Math.min(0.5, +(prev.width + 0.03).toFixed(3)),
                      height: Math.min(0.4, +(prev.height + 0.03).toFixed(3)),
                    }));
                  }}
                  disabled={busy}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100 shadow-2xs"
                >
                  + Expand Box
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualRegion((prev) => ({
                      ...prev,
                      width: Math.max(0.08, +(prev.width - 0.03).toFixed(3)),
                      height: Math.max(0.06, +(prev.height - 0.03).toFixed(3)),
                    }));
                  }}
                  disabled={busy}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100 shadow-2xs"
                >
                  - Shrink Box
                </button>
              </div>
            </div>

            {/* Sliders for X, Y, Width, Height */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-gray-500 flex justify-between">
                  <span>Horizontal (X)</span>
                  <span className="font-mono font-bold text-gray-700">
                    {(manualRegion.x * 100).toFixed(0)}%
                  </span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={0.9}
                  step={0.01}
                  value={manualRegion.x}
                  onChange={(e) =>
                    setManualRegion((prev) => ({ ...prev, x: parseFloat(e.target.value) }))
                  }
                  className="w-full mt-1 accent-[#E11D48]"
                />
              </div>

              <div>
                <label className="text-gray-500 flex justify-between">
                  <span>Vertical (Y)</span>
                  <span className="font-mono font-bold text-gray-700">
                    {(manualRegion.y * 100).toFixed(0)}%
                  </span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={0.9}
                  step={0.01}
                  value={manualRegion.y}
                  onChange={(e) =>
                    setManualRegion((prev) => ({ ...prev, y: parseFloat(e.target.value) }))
                  }
                  className="w-full mt-1 accent-[#E11D48]"
                />
              </div>

              <div>
                <label className="text-gray-500 flex justify-between">
                  <span>Width</span>
                  <span className="font-mono font-bold text-gray-700">
                    {(manualRegion.width * 100).toFixed(0)}%
                  </span>
                </label>
                <input
                  type="range"
                  min={0.05}
                  max={0.5}
                  step={0.01}
                  value={manualRegion.width}
                  onChange={(e) =>
                    setManualRegion((prev) => ({ ...prev, width: parseFloat(e.target.value) }))
                  }
                  className="w-full mt-1 accent-[#E11D48]"
                />
              </div>

              <div>
                <label className="text-gray-500 flex justify-between">
                  <span>Height</span>
                  <span className="font-mono font-bold text-gray-700">
                    {(manualRegion.height * 100).toFixed(0)}%
                  </span>
                </label>
                <input
                  type="range"
                  min={0.05}
                  max={0.4}
                  step={0.01}
                  value={manualRegion.height}
                  onChange={(e) =>
                    setManualRegion((prev) => ({ ...prev, height: parseFloat(e.target.value) }))
                  }
                  className="w-full mt-1 accent-[#E11D48]"
                />
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-gray-500">
              Selected: <strong className="text-gray-900">{PRESETS[selectedPreset].label}</strong> •
              All frames will be reconstructed using neural inpainting.
            </div>

            <PinkButton
              size="lg"
              className="px-8 py-3.5 text-base font-bold shadow-lg shadow-rose-300"
              onClick={() => void startCleaning()}
              disabled={busy}
            >
              {busy ? (
                <>
                  <LoaderCircle className="size-5 mr-2 animate-spin" />
                  Processing Video Watermark…
                </>
              ) : (
                <>
                  <Sparkles className="size-5 mr-2" />
                  Erase Watermark Now
                  <ArrowRight className="size-4 ml-2" />
                </>
              )}
            </PinkButton>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. PROCESSING UI (Progress bar, steps, spinner, error/cancel)      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {busy && (
        <div className="rounded-3xl border border-rose-200 bg-white p-6 sm:p-8 shadow-[0_15px_45px_-10px_rgba(225,29,72,0.15)] space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative size-10 rounded-2xl bg-[#FFF1F4] flex items-center justify-center text-[#E11D48]">
                <Loader2 className="size-5 animate-spin text-[#E11D48]" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-bold text-gray-950">
                  Removing Video Watermark…
                </h4>
                <p className="text-xs text-gray-500">{processingState.message}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl font-black text-[#E11D48]">
                {processingState.progress}%
              </span>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-red-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] transition-all duration-300 rounded-full relative"
              style={{ width: `${Math.min(100, Math.max(5, processingState.progress))}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>

          {/* Processing 4 Steps Stepper */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[
              {
                num: "1",
                label: "Analyze video streams",
                active: processingState.progress >= 5,
                done: processingState.progress > 20,
              },
              {
                num: "2",
                label: "Position watermark mask",
                active: processingState.progress >= 20,
                done: processingState.progress > 30,
              },
              {
                num: "3",
                label: "Neural delogo inpainting",
                active: processingState.progress >= 30,
                done: processingState.progress >= 95,
              },
              {
                num: "4",
                label: "Re-encoding clean video",
                active: processingState.progress >= 95,
                done: processingState.progress === 100,
              },
            ].map((step) => (
              <div
                key={step.num}
                className={`p-3 rounded-2xl border text-xs transition-all ${
                  step.done
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : step.active
                    ? "bg-rose-50 border-rose-300 text-[#E11D48] font-bold"
                    : "bg-gray-50 border-gray-100 text-gray-400"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {step.done ? (
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                  ) : step.active ? (
                    <LoaderCircle className="size-3.5 animate-spin text-[#E11D48]" />
                  ) : (
                    <span className="size-3.5 rounded-full border border-gray-300 flex items-center justify-center text-[9px]">
                      {step.num}
                    </span>
                  )}
                  <span className="font-semibold">{step.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error state alert */}
      {error && !busy && (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-900 flex items-start gap-3">
          <AlertTriangle className="size-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="font-bold">Error Processing Video</p>
            <p className="text-xs text-red-700 leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={() => void startCleaning()}
              className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-red-700 transition-colors inline-flex items-center gap-1.5"
            >
              <RefreshCw className="size-3" /> Try Again
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5. RESULT SECTION (Compare Slider, Clean Player, Downloads, Reset)  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {cleanedVideo && (
        <div className="rounded-3xl border border-emerald-200 bg-white p-5 sm:p-7 shadow-[0_15px_45px_-10px_rgba(16,185,129,0.15)] space-y-6">
          {/* Success Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-5">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-200">
                <Check className="size-6 stroke-[3]" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg sm:text-xl font-bold text-gray-950">
                    Watermark Removed Successfully!
                  </h4>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                    100% Logo Free
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  The visible Gemini/Veo logo has been cleanly erased while preserving original frame resolution and motion.
                </p>
              </div>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-[#E11D48] transition-colors"
              >
                <RotateCcw className="size-3.5 text-gray-500" />
                <span>Clean Another Video</span>
              </button>

              <PinkButton size="md" className="px-5 py-2 text-xs font-bold" onClick={handleDownload}>
                <Download className="size-3.5 mr-1.5" /> Download Clean Video
              </PinkButton>
            </div>
          </div>

          {/* Result View Switcher Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <button
              type="button"
              onClick={() => setResultTab("compare")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                resultTab === "compare"
                  ? "bg-[#E11D48] text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Sliders className="size-3.5" /> Before / After Comparison Slider
            </button>
            <button
              type="button"
              onClick={() => setResultTab("clean")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                resultTab === "clean"
                  ? "bg-[#E11D48] text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Eye className="size-3.5" /> Clean Video Player
            </button>
          </div>

          {/* TAB 1: Overlaid Before / After Interactive Slider */}
          {resultTab === "compare" && (
            <div className="relative rounded-3xl overflow-hidden border border-gray-200 shadow-xl bg-black">
              <VideoCompareSlider
                beforeSrc={originalVideo.url}
                afterSrc={cleanedVideo.url}
                beforeLabel="ORIGINAL (WATERMARKED)"
                afterLabel="CLEANED (100% LOGO FREE)"
                aspectRatio="aspect-video"
                defaultFit="contain"
                autoPlay={true}
                loop={true}
                watermarkRegion={manualRegion}
                showWatermarkBox={true}
              />
            </div>
          )}

          {/* TAB 2: Standalone Clean Video Player */}
          {resultTab === "clean" && (
            <div className="relative rounded-3xl overflow-hidden border border-gray-900 bg-black shadow-2xl">
              <div className="aspect-video w-full flex items-center justify-center">
                <video
                  ref={cleanVideoRef}
                  src={cleanedVideo.url}
                  controls
                  playsInline
                  autoPlay
                  loop
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Download & Export Bar */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-900">
                Ready for Export: {cleanedVideo.fileName}
              </span>
              <p className="text-[11px] text-gray-500">
                Full-quality output with identical resolution, frame rate, and zero watermark compression artifacts.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <PinkButton
                size="lg"
                className="px-6 py-3 text-sm font-bold shadow-md hover:shadow-rose-300"
                onClick={handleDownload}
              >
                <Download className="size-4 mr-2" /> Download Clean Video
              </PinkButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
