import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Download,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { PinkButton } from "@/components/site/PinkButton";
import {
  apiUrl,
  cancelVideoJob,
  getVideoResult,
  getVideoStatus,
  processVideo,
  uploadVideo,
  type JobStatus,
  type ManualRegion,
  type VideoMetadata,
} from "@/lib/videoJobs";

type OriginalVideo = {
  jobId: string;
  url: string;
  fileName: string;
  metadata?: VideoMetadata;
};

type ProcessingJob = Pick<
  JobStatus,
  "jobId" | "status" | "progress" | "stage" | "message" | "processedFrames" | "totalFrames"
>;

type CleanedVideo = {
  jobId: string;
  url: string;
  fileName: string;
};

type PresetKey = "top-right" | "bottom-right" | "top-left" | "bottom-left";

const PRESETS: Record<PresetKey, { label: string; region: ManualRegion }> = {
  "top-right": {
    label: "Top Right",
    region: { x: 0.74, y: 0.01, width: 0.25, height: 0.24 },
  },
  "bottom-right": {
    label: "Bottom Right (Gemini)",
    region: { x: 0.76, y: 0.76, width: 0.22, height: 0.21 },
  },
  "top-left": {
    label: "Top Left",
    region: { x: 0.01, y: 0.01, width: 0.25, height: 0.24 },
  },
  "bottom-left": {
    label: "Bottom Left",
    region: { x: 0.01, y: 0.76, width: 0.22, height: 0.21 },
  },
};

const ACCEPT = ".mp4,.mov,.webm,.avi,.mpg,.mpeg,.mkv";
const STORAGE_KEY = "bellix-active-video-job";
const ACTIVE_STATUSES = new Set([
  "queued",
  "analyzing",
  "detecting",
  "tracking",
  "generating_preview",
  "processing",
  "encoding",
  "verifying",
  "validating",
]);

const cleanName = (name: string, quality?: string) => {
  const base = name.replace(/\.[^/.]+$/u, "");
  return quality ? `cleaned-${base}-${quality}.mp4` : `cleaned-${base}.mp4`;
};

export function JobVideoCleaner() {
  const [originalVideo, setOriginalVideo] = useState<OriginalVideo | null>(null);
  const [processingJob, setProcessingJob] = useState<ProcessingJob | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [cleanedVideo, setCleanedVideo] = useState<CleanedVideo | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey | "auto">("auto");
  const [manualRegion, setManualRegion] = useState<ManualRegion>(PRESETS["top-right"].region);
  const [showBoxOverlay, setShowBoxOverlay] = useState<boolean>(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const activeJobRef = useRef<string | null>(null);
  const localUrlRef = useRef<string | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);

  const originalVideoRef = useRef<HTMLVideoElement>(null);
  const rightVideoRef = useRef<HTMLVideoElement>(null);
  const isSyncingRef = useRef<boolean>(false);

  const assertCurrentJob = useCallback((jobId: string) => {
    if (activeJobRef.current !== jobId) {
      throw new Error("A stale response was rejected because it belongs to another video job.");
    }
  }, []);

  // Section G Compliant Bidirectional Video Sync
  const syncVideos = (source: HTMLVideoElement, target: HTMLVideoElement) => {
    if (isSyncingRef.current) return;
    if (Math.abs(target.currentTime - source.currentTime) > 0.06) {
      isSyncingRef.current = true;
      target.currentTime = source.currentTime;
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    }
  };

  const handleLeftTimeUpdate = () => {
    const left = originalVideoRef.current;
    const right = rightVideoRef.current;
    if (left && right) syncVideos(left, right);
  };

  const handleRightTimeUpdate = () => {
    const left = originalVideoRef.current;
    const right = rightVideoRef.current;
    if (left && right) syncVideos(right, left);
  };

  const handleLeftPlay = () => {
    rightVideoRef.current?.play().catch(() => {});
  };

  const handleRightPlay = () => {
    originalVideoRef.current?.play().catch(() => {});
  };

  const handleLeftPause = () => {
    rightVideoRef.current?.pause();
  };

  const handleRightPause = () => {
    originalVideoRef.current?.pause();
  };

  const applyCompletedResult = useCallback(
    async (jobId: string, fileName: string) => {
      try {
        const result = await getVideoResult(jobId);
        assertCurrentJob(result.jobId);
        setCleanedVideo({
          jobId: result.jobId,
          fileName: cleanName(fileName),
          url: apiUrl(
            `${result.cleanedVideoUrl}?job=${encodeURIComponent(jobId)}&v=${result.resultVersion}`,
          ),
        });
        setProcessingJob({
          jobId,
          status: "completed",
          progress: 100,
          stage: "Complete",
          message: "Watermark successfully removed. Video is ready for download.",
        });
      } catch (problem) {
        setError(problem instanceof Error ? problem.message : String(problem));
      }
    },
    [assertCurrentJob],
  );

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const stored = JSON.parse(saved) as {
        jobId: string;
        fileName: string;
        metadata?: VideoMetadata;
      };
      activeJobRef.current = stored.jobId;
      setOriginalVideo({
        ...stored,
        url: apiUrl(`/api/video-watermark/original/${stored.jobId}?job=${stored.jobId}`),
      });
      void getVideoStatus(stored.jobId)
        .then(async (status) => {
          assertCurrentJob(status.jobId);
          setProcessingJob(status);
          if (status.hasPreview && (status.previewUrl || status.preview_url)) {
            setPreviewVideoUrl(apiUrl(status.previewUrl || status.preview_url || ""));
          }
          if (status.status === "completed") {
            await applyCompletedResult(stored.jobId, stored.fileName);
          }
        })
        .catch(() => localStorage.removeItem(STORAGE_KEY));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [applyCompletedResult, assertCurrentJob]);

  // Section E & J Compliant Status Polling Effect
  useEffect(() => {
    const jobId = processingJob?.jobId;
    const isJobActive = processingJob ? ACTIVE_STATUSES.has(processingJob.status) : false;
    if (!jobId || !isJobActive) return;

    let isSubscribed = true;
    let isPollingTick = false;

    const timer = window.setInterval(async () => {
      if (isPollingTick || !isSubscribed) return;
      isPollingTick = true;
      try {
        const status = await getVideoStatus(jobId);
        if (!isSubscribed) return;
        assertCurrentJob(status.jobId);
        setProcessingJob(status);

        // Update preview URL as soon as backend signals real preview is ready
        const pUrl = status.previewUrl || status.preview_url;
        if (status.hasPreview && pUrl) {
          const freshPreviewUrl = apiUrl(`${pUrl}?t=${Date.now()}`);
          setPreviewVideoUrl((prev) => (prev ? prev : freshPreviewUrl));
        }

        if (status.status === "completed") {
          window.clearInterval(timer);
          await applyCompletedResult(status.jobId, originalVideo?.fileName || "video.mp4");
          if (isSubscribed) {
            toast.success("Watermark removal completed! Clean video is ready.");
          }
        } else if (status.status === "failed") {
          window.clearInterval(timer);
          if (isSubscribed) {
            setCleanedVideo(null);
            setError(
              status.error ||
                "Video processing could not be completed. Your original video is unmodified.",
            );
          }
        } else if (status.status === "cancelled") {
          window.clearInterval(timer);
          if (isSubscribed) {
            toast.info("Processing was cancelled.");
          }
        }
      } catch (problem) {
        if (isSubscribed) {
          setError(problem instanceof Error ? problem.message : String(problem));
        }
      } finally {
        isPollingTick = false;
      }
    }, 1000);

    return () => {
      isSubscribed = false;
      window.clearInterval(timer);
    };
  }, [
    applyCompletedResult,
    assertCurrentJob,
    originalVideo?.fileName,
    processingJob?.jobId,
    Boolean(processingJob && ACTIVE_STATUSES.has(processingJob.status)),
  ]);

  useEffect(
    () => () => {
      uploadAbortRef.current?.abort();
      if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current);
    },
    [],
  );

  const selectFile = async (file: File) => {
    // Check if user accidentally selected/pasted an image
    const isImage =
      file.type.startsWith("image/") ||
      /\.(png|jpe?g|webp|heic|heif|avif|bmp|tiff?|gif|svg)$/iu.test(file.name);

    if (isImage) {
      setError(
        "Image file detected. This tool removes watermarks from videos. For images, open our Image Background Remover or Image Cleaner.",
      );
      toast.error(
        "Image file detected. Please upload an MP4, MOV, or WebM video, or switch to Image Background Remover.",
        {
          action: {
            label: "Open Image Remover",
            onClick: () => {
              window.location.href = "/background-remover";
            },
          },
          duration: 8000,
        },
      );
      return;
    }

    if (
      !/\.(mp4|mov|webm|avi|mpg|mpeg|mkv|m4v|3gp|flv)$/iu.test(file.name) &&
      !file.type.startsWith("video/")
    ) {
      toast.error("Please upload MP4, MOV, WebM, AVI, or MKV.");
      return;
    }
    uploadAbortRef.current?.abort();
    if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current);
    const controller = new AbortController();
    uploadAbortRef.current = controller;
    const jobId = crypto.randomUUID();
    const localUrl = URL.createObjectURL(file);
    localUrlRef.current = localUrl;
    activeJobRef.current = jobId;
    setOriginalVideo({ jobId, url: localUrl, fileName: file.name });
    setCleanedVideo(null);
    setPreviewVideoUrl(null);
    setError("");
    setProcessingJob({
      jobId,
      status: "uploading",
      progress: 0,
      stage: "Uploading video...",
      message: "Validating format and container streams",
    });

    try {
      const uploaded = await uploadVideo(file, jobId, controller.signal);
      assertCurrentJob(uploaded.jobId || uploaded.job_id || jobId);
      const metadata: VideoMetadata = uploaded.metadata || {
        width: uploaded.width || 1920,
        height: uploaded.height || 1080,
        fps: uploaded.fps || 30,
        duration: uploaded.duration || 10,
        frameCount: 300,
        hasAudio: true,
      };
      const original = { jobId, url: localUrl, fileName: file.name, metadata };
      setOriginalVideo(original);
      setProcessingJob({
        jobId,
        status: "uploaded",
        progress: 5,
        stage: "Ready to analyze",
        message: "Ready to detect and remove watermarks",
        totalFrames: metadata.frameCount,
        processedFrames: 0,
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ jobId, fileName: file.name, metadata }));
      toast.success(`Loaded "${file.name}". Ready for processing.`);
    } catch (problem) {
      if (!controller.signal.aborted) {
        const errorMsg = problem instanceof Error ? problem.message : String(problem);
        setError(errorMsg);
        setProcessingJob((current) =>
          current
            ? { ...current, status: "failed", stage: "Upload failed", message: errorMsg }
            : null,
        );
      }
    }
  };

  // Global Ctrl+V / Cmd+V paste listener & drop guard for Video Cleaner
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      // 1. Files from clipboard (Ctrl+C from File Explorer)
      const clipFiles = Array.from(e.clipboardData?.files || []);
      if (clipFiles.length > 0) {
        e.preventDefault();
        void selectFile(clipFiles[0]);
        return;
      }

      // 2. Video items from clipboard
      const items = Array.from(e.clipboardData?.items || []);
      const videoItem = items.find((item) => item.type.startsWith("video/"));
      if (videoItem) {
        const file = videoItem.getAsFile();
        if (file) {
          e.preventDefault();
          void selectFile(file);
          return;
        }
      }

      // Also check image items to guide user
      const imgItem = items.find((item) => item.type.startsWith("image/"));
      if (imgItem) {
        const file = imgItem.getAsFile();
        if (file) {
          e.preventDefault();
          void selectFile(file);
          return;
        }
      }

      // 3. Pasted video URLs
      const pastedText = e.clipboardData?.getData("text/plain")?.trim();
      if (pastedText && /^https?:\/\/.*\.(mp4|mov|webm|mkv|avi|m4v)(\?.*)?$/i.test(pastedText)) {
        e.preventDefault();
        toast.info("Downloading video from URL...");
        try {
          const res = await fetch(pastedText);
          const blob = await res.blob();
          const cleanName = pastedText.split("?")[0].split("/").pop() || "pasted-video.mp4";
          const file = new File([blob], cleanName, { type: blob.type || "video/mp4" });
          void selectFile(file);
        } catch {
          toast.error("Could not fetch video from link due to web CORS security.");
        }
      }
    };

    const preventWindowDrop = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener("paste", handlePaste);
    window.addEventListener("dragover", preventWindowDrop);
    window.addEventListener("drop", preventWindowDrop);

    return () => {
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener("dragover", preventWindowDrop);
      window.removeEventListener("drop", preventWindowDrop);
    };
  }, []);

  const startCleaning = async () => {
    if (!originalVideo || processingJob?.status === "uploading") return;
    setError("");
    setCleanedVideo(null);
    setPreviewVideoUrl(null);
    setProcessingJob({
      jobId: originalVideo.jobId,
      status: "queued",
      progress: 6,
      stage: "Analyzing video...",
      message: "Worker is starting frame inspection",
      totalFrames: originalVideo.metadata?.frameCount ?? 0,
      processedFrames: 0,
    });
    try {
      const response = await processVideo(
        originalVideo.jobId,
        selectedPreset === "auto" ? null : manualRegion,
      );
      assertCurrentJob(response.jobId);
    } catch (problem) {
      setProcessingJob((current) =>
        current
          ? { ...current, status: "failed", progress: 0, stage: "Processing failed" }
          : current,
      );
      setError(problem instanceof Error ? problem.message : String(problem));
    }
  };

  const handleCancel = async () => {
    if (!originalVideo || !processingJob) return;
    try {
      await cancelVideoJob(originalVideo.jobId);
      setProcessingJob((current) =>
        current
          ? {
              ...current,
              status: "cancelled",
              progress: 0,
              stage: "Cancelled",
              message: "Processing was cancelled by user.",
            }
          : null,
      );
      setCleanedVideo(null);
      setPreviewVideoUrl(null);
      toast.info("Processing cancelled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const reset = () => {
    uploadAbortRef.current?.abort();
    if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current);
    localUrlRef.current = null;
    activeJobRef.current = null;
    localStorage.removeItem(STORAGE_KEY);
    setOriginalVideo(null);
    setProcessingJob(null);
    setCleanedVideo(null);
    setPreviewVideoUrl(null);
    setError("");
  };

  const downloadCleaned = async (quality?: "720p" | "1080p" | "4k") => {
    if (!originalVideo || !cleanedVideo || cleanedVideo.jobId !== originalVideo.jobId) {
      setError("The cleaned result does not belong to the current upload.");
      return;
    }
    try {
      const query = quality ? `/${quality}` : "";
      const downloadEndpoint = apiUrl(
        `/api/video-watermark/download/${encodeURIComponent(originalVideo.jobId)}${query}`,
      );
      const response = await fetch(downloadEndpoint, { cache: "no-store" });
      if (!response.ok) throw new Error("Cleaned video could not be downloaded. Please retry.");
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = cleanName(originalVideo.fileName, quality);
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : String(problem));
    }
  };

  if (!originalVideo) {
    return (
      <div
        className={`relative flex min-h-[370px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragOver
            ? "border-[#E11D48] bg-[#FFF5F7]"
            : "border-[#FCA5A5] bg-white hover:bg-[#FFF9FA]"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const file = event.dataTransfer.files[0];
          if (file) {
            void selectFile(file);
            return;
          }
          const uri =
            event.dataTransfer.getData("text/uri-list") ||
            event.dataTransfer.getData("text/plain");
          if (uri && /^https?:\/\/.*\.(mp4|mov|webm|mkv|avi)(\?.*)?$/i.test(uri.trim())) {
            toast.info("Downloading video from URL...");
            fetch(uri.trim())
              .then((res) => res.blob())
              .then((blob) => {
                const cleanName = uri.trim().split("?")[0].split("/").pop() || "video.mp4";
                void selectFile(new File([blob], cleanName, { type: blob.type || "video/mp4" }));
              })
              .catch(() => toast.error("Could not fetch video from web link."));
          }
        }}
      >
        <span className="flex size-18 items-center justify-center rounded-3xl bg-gradient-to-tr from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] text-white shadow-[0_8px_25px_rgba(225,29,72,0.35)]">
          <UploadCloud className="size-8" />
        </span>
        <h3 className="mt-5 text-2xl font-semibold tracking-tight text-gray-950">
          Drop your video here
        </h3>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-gray-500">
          Upload MP4, MOV, WebM, AVI, or MKV • Paste (
          <kbd className="font-sans px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-600 font-medium">
            Ctrl+V
          </kbd>
          ) • Drag &amp; drop
        </p>
        <PinkButton
          type="button"
          className="mt-6"
          onClick={(event) => {
            event.stopPropagation();
            inputRef.current?.click();
          }}
        >
          <UploadCloud className="size-4" /> Upload Video
        </PinkButton>

        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={async (event) => {
              event.stopPropagation();
              try {
                if (navigator.clipboard?.read) {
                  const clipItems = await navigator.clipboard.read();
                  for (const item of clipItems) {
                    const vidType = item.types.find((t) => t.startsWith("video/"));
                    if (vidType) {
                      const blob = await item.getType(vidType);
                      const file = new File([blob], "pasted-video.mp4", { type: vidType });
                      void selectFile(file);
                      return;
                    }
                  }
                }
                toast.info("Press Ctrl+V to paste your video from clipboard.");
              } catch {
                toast.info("Press Ctrl+V to paste your video from clipboard.");
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#E11D48] transition-colors underline underline-offset-4 cursor-pointer"
          >
            <Copy className="size-3 text-[#E11D48]" />
            <span>Paste from Clipboard (Ctrl+V)</span>
          </button>
        </div>

        <p className="mt-5 inline-flex items-center gap-2 text-xs text-gray-400">
          <ShieldCheck className="size-3.5 text-[#E11D48]" />
          Every upload is stored in its own isolated processing job
        </p>
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept={ACCEPT}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void selectFile(file);
            event.currentTarget.value = "";
          }}
        />
      </div>
    );
  }

  const busy = processingJob ? ACTIVE_STATUSES.has(processingJob.status) : false;
  const metadata = originalVideo.metadata;

  // Determine what video source to show in the RIGHT preview card:
  // 1. If final completed video exists: show cleanedVideo.url
  // 2. Else if real preview video exists: show previewVideoUrl
  // 3. Otherwise: show originalVideo.url (THE EXACT SAME UPLOADED SOURCE VIDEO)
  const rightVideoSource = cleanedVideo?.url || previewVideoUrl || originalVideo.url;
  const isRightShowingCleaned = Boolean(cleanedVideo);
  const isRightShowingPreview = Boolean(!cleanedVideo && previewVideoUrl);

  // Section U Compliant Top Stage Formatter
  const getStageHeader = () => {
    if (!processingJob) return "Ready to analyze";
    switch (processingJob.status) {
      case "uploading":
        return "Uploading video...";
      case "uploaded":
        return "Ready to analyze";
      case "queued":
        return "Queued for processing...";
      case "analyzing":
        return "Analyzing video...";
      case "detecting":
        return "Detecting watermark...";
      case "generating_preview":
      case "tracking":
        return "Preparing cleaned preview...";
      case "processing":
        return "Processing video...";
      case "encoding":
        return "Encoding output...";
      case "validating":
        return "Validating cleaned video...";
      case "completed":
        return "Ready";
      case "failed":
        return "Processing failed";
      case "cancelled":
        return "Processing cancelled";
      default:
        return processingJob.stage || "Processing video...";
    }
  };

  // Section E Compliant Right Card Badge (Never says READY prematurely)
  const renderRightCardBadge = () => {
    if (isRightShowingCleaned) {
      return (
        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
          100% CLEANED
        </span>
      );
    }
    if (isRightShowingPreview) {
      return (
        <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-600">
          LIVE PREVIEW
        </span>
      );
    }
    if (busy) {
      return (
        <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-600 animate-pulse">
          PROCESSING…
        </span>
      );
    }
    if (processingJob?.status === "failed") {
      return (
        <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">
          FAILED
        </span>
      );
    }
    if (processingJob?.status === "uploaded") {
      return (
        <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">
          READY TO CLEAN
        </span>
      );
    }
    return (
      <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-500">
        AWAITING START
      </span>
    );
  };

  return (
    <div className="rounded-3xl border border-[#FCE7EC] bg-white p-4 text-left shadow-[0_20px_50px_-10px_rgba(225,29,72,0.14)] sm:p-6 lg:p-7">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-gray-950">{originalVideo.fileName}</p>
          <p className="mt-0.5 text-xs text-gray-500 font-mono">
            {metadata
              ? `${metadata.width} × ${metadata.height} • ${metadata.fps.toFixed(1)} FPS • ${metadata.duration.toFixed(1)}s`
              : processingJob?.status === "uploading"
                ? "Uploading video file..."
                : error
                  ? "Upload failed"
                  : "Verifying container…"}
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="size-3.5 text-gray-500" /> Change Video
        </button>
      </div>

      {/* Watermark Position Selector Toolbar */}
      {!cleanedVideo && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-[#FFF8FA] p-3 sm:px-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5 mr-1">
              <Sparkles className="size-3.5 text-rose-600" /> Detection mode:
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedPreset("auto");
                setShowBoxOverlay(false);
              }}
              disabled={busy}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedPreset === "auto"
                  ? "bg-rose-600 text-white shadow-xs ring-2 ring-rose-300"
                  : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              ✦ Auto Detect
            </button>
            {(["top-right", "bottom-right", "top-left", "bottom-left"] as PresetKey[]).map(
              (key) => {
                const isSelected = selectedPreset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(key);
                      setManualRegion(PRESETS[key].region);
                      setShowBoxOverlay(true);
                    }}
                    disabled={busy}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-rose-600 text-white shadow-xs ring-2 ring-rose-300"
                        : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {key === "top-right" && "↗️ Top Right"}
                    {key === "bottom-right" && "↘️ Bottom Right"}
                    {key === "top-left" && "↖️ Top Left"}
                    {key === "bottom-left" && "↙️ Bottom Left"}
                  </button>
                );
              },
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
              <span className="text-[11px] text-gray-400">Box size:</span>
              <button
                type="button"
                onClick={() => {
                  setManualRegion((prev) => ({
                    ...prev,
                    width: Math.min(0.48, +(prev.width + 0.04).toFixed(3)),
                    height: Math.min(0.4, +(prev.height + 0.04).toFixed(3)),
                    x: prev.x > 0.5 ? Math.max(0.52, +(prev.x - 0.04).toFixed(3)) : prev.x,
                  }));
                }}
                disabled={busy}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors shadow-2xs"
              >
                + Expand
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualRegion((prev) => ({
                    ...prev,
                    width: Math.max(0.12, +(prev.width - 0.04).toFixed(3)),
                    height: Math.max(0.1, +(prev.height - 0.04).toFixed(3)),
                    x: prev.x > 0.5 ? Math.min(0.88, +(prev.x + 0.04).toFixed(3)) : prev.x,
                  }));
                }}
                disabled={busy}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors shadow-2xs"
              >
                - Shrink
              </button>
            </div>

            <label className="flex items-center gap-1.5 text-xs text-gray-600 font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showBoxOverlay && selectedPreset !== "auto"}
                onChange={(e) => setShowBoxOverlay(e.target.checked)}
                disabled={selectedPreset === "auto"}
                className="rounded text-rose-600 focus:ring-rose-500"
              />
              <span>Show Pink Box</span>
            </label>
          </div>
        </div>
      )}

      {/* Two-Card Side-by-Side Video Layout (Left: Original, Right: Cleaned/Preview) */}
      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Card: Original Video */}
        <section className="flex flex-col">
          <div className="mb-2 flex h-6 items-center justify-between shrink-0">
            <p className="flex items-center gap-2 text-xs font-bold text-gray-900">
              <span className="size-2 rounded-full bg-rose-500" /> 1. Original (With Watermark)
            </p>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">
                ORIGINAL
              </span>
              {metadata && (
                <span className="text-[11px] font-mono text-gray-400">
                  {metadata.width}×{metadata.height}
                </span>
              )}
            </div>
          </div>
          <div className="relative flex flex-1 w-full min-h-[380px] sm:min-h-[460px] md:min-h-[500px] lg:min-h-[540px] items-center justify-center overflow-hidden rounded-2xl bg-black shadow-lg border border-gray-900">
            {showBoxOverlay && selectedPreset !== "auto" && !cleanedVideo && (
              <div
                className="pointer-events-none absolute z-10 rounded-xl border-2 border-dashed border-rose-500 bg-rose-500/25 shadow-[0_0_20px_rgba(244,63,94,0.45)] transition-all duration-150"
                style={{
                  left: `${manualRegion.x * 100}%`,
                  top: `${manualRegion.y * 100}%`,
                  width: `${manualRegion.width * 100}%`,
                  height: `${manualRegion.height * 100}%`,
                }}
              >
                <div className="absolute -top-7 right-0 rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase shadow-md flex items-center gap-1 whitespace-nowrap">
                  <Sparkles className="size-2.5" />
                  <span>
                    Removal Area ({Math.round(manualRegion.width * 100)}% ×{" "}
                    {Math.round(manualRegion.height * 100)}%)
                  </span>
                </div>
              </div>
            )}
            <video
              ref={originalVideoRef}
              src={originalVideo.url}
              controls
              autoPlay={false}
              muted={false}
              loop
              playsInline
              preload="metadata"
              onTimeUpdate={handleLeftTimeUpdate}
              onPlay={handleLeftPlay}
              onPause={handleLeftPause}
              onSeeking={handleLeftTimeUpdate}
              onSeeked={handleLeftTimeUpdate}
              className="h-full w-full max-h-[640px] object-contain"
            />
          </div>
        </section>

        {/* Right Card: Cleaned Output (Starts with SAME original video, then updates to real preview/clean) */}
        <section className="flex flex-col">
          <div className="mb-2 flex h-6 items-center justify-between shrink-0">
            <p className="flex items-center gap-2 text-xs font-bold text-gray-900">
              <span className="size-2 rounded-full bg-emerald-500" /> 2. AI Cleaned (Result)
            </p>
            <div className="flex items-center gap-2">
              {renderRightCardBadge()}
              {metadata && (
                <span className="text-[11px] font-mono text-gray-400">
                  {metadata.width}×{metadata.height}
                </span>
              )}
            </div>
          </div>
          <div className="relative flex flex-1 w-full min-h-[380px] sm:min-h-[460px] md:min-h-[500px] lg:min-h-[540px] items-center justify-center overflow-hidden rounded-2xl bg-black shadow-lg border border-gray-900">
            {/* Status Overlay Badge - live processing & error alerts */}
            {isRightShowingPreview ? (
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-950/85 px-3 py-1.5 text-xs font-semibold text-blue-300 shadow-lg backdrop-blur-md">
                <Sparkles className="size-3.5 text-blue-400" />
                <span>Cleaned Preview (Live Processing)</span>
              </div>
            ) : busy ? (
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2 rounded-full border border-gray-700 bg-black/80 px-3 py-1.5 text-xs font-medium text-gray-200 shadow-lg backdrop-blur-md">
                <LoaderCircle className="size-3.5 animate-spin text-white" />
                <span>Preparing cleaned preview…</span>
              </div>
            ) : processingJob?.status === "failed" ? (
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2 rounded-full border border-red-500/40 bg-red-950/85 px-3 py-1.5 text-xs font-medium text-red-300 shadow-lg backdrop-blur-md">
                <XCircle className="size-3.5 text-red-400" />
                <span>Processing failed. Original unmodified.</span>
              </div>
            ) : null}

            {/* Video Player: Shows same original video until preview or cleaned output is generated */}
            <video
              ref={rightVideoRef}
              key={rightVideoSource}
              src={rightVideoSource}
              controls
              autoPlay={false}
              muted
              loop
              playsInline
              preload="metadata"
              onTimeUpdate={handleRightTimeUpdate}
              onPlay={handleRightPlay}
              onPause={handleRightPause}
              onSeeking={handleRightTimeUpdate}
              onSeeked={handleRightTimeUpdate}
              className="h-full w-full max-h-[640px] object-contain"
            />
          </div>
        </section>
      </div>

      {/* Progress Bar & Status - moved BELOW videos */}
      {processingJob && (busy || processingJob.status === "completed") && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Subtle 18px Monochrome Status Icon */}
              <span className="flex size-6 items-center justify-center rounded-md bg-gray-900 text-white shrink-0">
                {busy ? (
                  <LoaderCircle className="size-3.5 animate-spin text-white" />
                ) : (
                  <CheckCircle2 className="size-3.5 text-emerald-400" />
                )}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-900">
                    {getStageHeader()}
                  </p>
                  {processingJob.processedFrames !== undefined &&
                    processingJob.totalFrames &&
                    processingJob.totalFrames > 0 && (
                      <span className="text-[11px] font-mono text-gray-500">
                        ({processingJob.processedFrames} / {processingJob.totalFrames} frames)
                      </span>
                    )}
                </div>
                <p className="truncate text-xs text-gray-500 mt-0.5">{processingJob.message}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono text-xs font-bold text-gray-900">
                {processingJob.progress}%
              </span>
              {busy && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Thin, 4px professional progress bar */}
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-gray-900 transition-[width] duration-300 ease-out"
              style={{ width: `${Math.max(2, processingJob.progress)}%` }}
            />
          </div>
        </div>
      )}

      {/* Error alert if processing fails */}
      {error && (
        <div
          role="alert"
          className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <XCircle className="size-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Section M Compliant Action Buttons */}
      <div className="mt-5 border-t border-gray-100 pt-4 flex flex-wrap items-center justify-between gap-4">
        {!cleanedVideo && (
          <div className="flex items-center gap-3">
            {processingJob?.status === "failed" ? (
              <PinkButton type="button" onClick={() => void startCleaning()} disabled={busy}>
                <RefreshCw className="size-4" /> Try Again
              </PinkButton>
            ) : (
              <PinkButton
                type="button"
                onClick={() => void startCleaning()}
                disabled={busy || processingJob?.status === "uploading" || !metadata}
              >
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {busy ? "Processing Video…" : "Clean Video Watermark"}
              </PinkButton>
            )}
            <span className="text-xs text-gray-500">
              Source resolution preserved{metadata ? ` (${metadata.width}×${metadata.height})` : ""}
              .
            </span>
          </div>
        )}

        {cleanedVideo && (
          <div className="flex flex-col gap-2 w-full">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5 mr-1">
                <Download className="size-3.5 text-gray-900" /> Download Clean Video:
              </span>
              <button
                type="button"
                onClick={() => downloadCleaned("720p")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-900 shadow-xs hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all"
              >
                <span>720p MP4</span>
              </button>
              <button
                type="button"
                onClick={() => downloadCleaned("1080p")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-900 bg-gray-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-black active:scale-95 transition-all"
              >
                <span>1080p HD</span>
              </button>
              <button
                type="button"
                onClick={() => downloadCleaned("4k")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-600 bg-gradient-to-r from-[#E11D48] to-[#FF4FA3] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:opacity-90 active:scale-95 transition-all"
              >
                <Sparkles className="size-3 text-white" />
                <span>4K Master</span>
              </button>
            </div>
            {metadata && (
              <p className="text-[11px] text-gray-500">
                Source resolution: {metadata.width}×{metadata.height}.{" "}
                {metadata.height < 2160
                  ? "Source resolution limits maximum detail."
                  : "Full native 4K preserved."}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
