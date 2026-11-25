"use client";
import { emitToolEvent } from "@/lib/tool-events";

import { accountFetch } from "@/components/account/AccountPanel";
import { useUserStore } from "@/lib/userStore";
import { saveMediaBlob } from "@/lib/historyDb";
import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Copy,
  Download,
  Film,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Upload,
  UploadCloud,
  Volume2,
  VolumeX,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { VideoCompareSlider } from "@/components/site/VideoCompareSlider";
type Point = [number, number];
type Selection = [number, number, number, number];
type WorkerResponse = {
  detail?: string;
  error?: string;
  origin?: string;
  ok?: boolean;
  ffmpeg?: boolean;
  job_id?: string;
  job_token?: string;
  state?: string;
  progress?: number;
  stage?: string;
  frames_processed?: number;
  quality?: {
    frames_processed: number;
    decoded_frames_verified: number;
    total_frames: number;
    method?: string;
  };
  log_tail?: string[];
};

const ACCEPT = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.mkv,.avi,.m4v";

function fmt(t: number): string {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function readWorkerResponse(response: Response): Promise<WorkerResponse | null> {
  return (await response.json().catch(() => null)) as WorkerResponse | null;
}

function workerError(response: Response, payload: WorkerResponse | null, fallback: string): Error {
  return new Error(payload?.detail || payload?.error || `${fallback} (HTTP ${response.status}).`);
}

export function JobVideoCleaner() {
  const npmCommand = typeof navigator !== "undefined" && /Windows/i.test(navigator.userAgent)
    ? "npm.cmd"
    : "npm";
  const workerCommand = `${npmCommand} run worker`;
  const accountRequestKey = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const [origUrl, setOrigUrl] = useState<string | null>(null);
  const [cleanUrl, setCleanUrl] = useState<string | null>(null);
  const [resultNote, setResultNote] = useState<string | null>(null);

  const processingControllerRef = useRef<AbortController | null>(null);
  const origUrlRef = useRef<string | null>(null);
  const cleanUrlRef = useRef<string | null>(null);

  const [manual, setManual] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [videoRatio, setVideoRatio] = useState(0);
  const [previewError, setPreviewError] = useState(false);
  const selectionStart = useRef<Point | null>(null);

  const [dragOver, setDragOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekValue, setSeekValue] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [cleanMode, setCleanMode] = useState<"clean" | "crop">("clean");
  const [isDone, setIsDone] = useState(false);
  const [statusMsg, setStatusMsg] = useState("Ready to process.");
  const [progress, setProgress] = useState(0);
  const [isError, setIsError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const origVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      processingControllerRef.current?.abort();
      if (origUrlRef.current) {
        URL.revokeObjectURL(origUrlRef.current);
        origUrlRef.current = null;
      }
      if (cleanUrlRef.current) {
        URL.revokeObjectURL(cleanUrlRef.current);
        cleanUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!origUrl) return;
    const testVideo = document.createElement("video");
    testVideo.preload = "metadata";
    testVideo.src = origUrl;
    const onMeta = () => {
      if (testVideo.videoWidth && testVideo.videoHeight) {
        setVideoRatio(testVideo.videoWidth / testVideo.videoHeight);
        setDuration(testVideo.duration || 0);
      }
    };
    testVideo.addEventListener("loadedmetadata", onMeta);
    testVideo.addEventListener("loadeddata", onMeta);
    return () => {
      testVideo.removeEventListener("loadedmetadata", onMeta);
      testVideo.removeEventListener("loadeddata", onMeta);
    };
  }, [origUrl]);

  // Load Video File
  const loadFile = useCallback(
    (f: File) => {
      const ok = /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(f.name);
      if (!ok) {
        toast.error("Choose an MP4, MOV, WebM, MKV, AVI or M4V video.");
        return;
      }
      if (!f.size) {
        toast.error("This file is empty. Choose a video with footage.");
        return;
      }
      if (f.size > 500 * 1024 * 1024) {
        toast.error("Choose a video smaller than 500 MB.");
        return;
      }

      processingControllerRef.current?.abort();
      processingControllerRef.current = null;
      selectionStart.current = null;

      if (origUrlRef.current) URL.revokeObjectURL(origUrlRef.current);
      if (cleanUrlRef.current) URL.revokeObjectURL(cleanUrlRef.current);

      const url = URL.createObjectURL(f);
      origUrlRef.current = url;
      cleanUrlRef.current = null;
      setFile(f);
      accountRequestKey.current = crypto.randomUUID();
      setOrigUrl(url);
      setCleanUrl(null);
      setManual(false);
      setSelection(null);
      setVideoRatio(0);
      setPreviewError(false);
      setIsMuted(true);
      setIsDone(false);
      setIsProcessing(false);
      setIsError(false);
      setErrorDetails(null);
      setProgress(0);
      setCurrentTime(0);
      setSeekValue(0);
      setIsPlaying(false);
      setStatusMsg("Preparing video upload");
    },
    [],
  );

  // Clipboard Paste Handler (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }
      const clipFiles = Array.from(e.clipboardData?.files || []);
      const vidFile = clipFiles.find(
        (f) => f.type.startsWith("video/") || /\.(mp4|mov|webm|avi|mkv)$/i.test(f.name),
      );
      if (vidFile) {
        e.preventDefault();
        loadFile(vidFile);
        return;
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [loadFile]);

  // Synchronized Playback
  const playBoth = () => {
    const video = origVideoRef.current;
    video?.play().catch(() => {});
    setIsPlaying(true);
  };

  const pauseBoth = () => {
    origVideoRef.current?.pause();
    setIsPlaying(false);
  };

  const togglePlay = () => {
    const video = origVideoRef.current;
    if (!video) return;
    if (video.paused) {
      playBoth();
    } else {
      pauseBoth();
    }
  };

  const handleTimeUpdate = () => {
    const video = origVideoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    const dur = video.duration || 0;
    if (dur > 0) {
      setSeekValue(Math.round((video.currentTime / dur) * 1000));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setSeekValue(val);
    const video = origVideoRef.current;
    const dur = video?.duration || 0;
    const targetTime = (val / 1000) * dur;
    if (video) video.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const toggleMute = () => {
    const video = origVideoRef.current;
    if (video) {
      video.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const resetState = () => {
    pauseBoth();
    processingControllerRef.current?.abort();
    processingControllerRef.current = null;
    if (origUrlRef.current) URL.revokeObjectURL(origUrlRef.current);
    if (cleanUrlRef.current) URL.revokeObjectURL(cleanUrlRef.current);
    origUrlRef.current = null;
    cleanUrlRef.current = null;
    setFile(null);
    setOrigUrl(null);
    setCleanUrl(null);
    setManual(false);
    setSelection(null);
    setVideoRatio(0);
    setIsDone(false);
    setIsProcessing(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setSeekValue(0);
    setStatusMsg("Ready to process.");
    setIsError(false);
    setErrorDetails(null);
  };

  const handleCancel = () => {
    processingControllerRef.current?.abort();
    processingControllerRef.current = null;
    setIsProcessing(false);
    setProgress(0);
    setStatusMsg("Processing cancelled.");
    toast.info("Video processing cancelled.");
  };

  const handleProcess = async (position?: Selection) => {
    if (!file || !origUrl || processingControllerRef.current) return;
    const controller = new AbortController();
    const { signal } = controller;
    processingControllerRef.current = controller;
    if (cleanUrlRef.current) URL.revokeObjectURL(cleanUrlRef.current);
    cleanUrlRef.current = null;
    setCleanUrl(null);
    setResultNote(null);
    setIsDone(false);
    setIsProcessing(true);
    setIsError(false);
    setErrorDetails(null);
    setProgress(2);
    setStatusMsg("Connecting to the video worker");
    let workerOrigin: string | null = null;
    let checkingConnection = false;

    try {
      const config = await fetch("/api/video-worker", { signal, cache: "no-store" });
      const worker = await readWorkerResponse(config);
      if (!config.ok || !worker?.origin) {
        throw new Error(worker?.detail || "The video worker is unavailable.");
      }
      workerOrigin = worker.origin;

      checkingConnection = true;
      const healthResponse = await accountFetch(`${workerOrigin}/health`, {
        signal,
        cache: "no-store",
      });
      const health = await readWorkerResponse(healthResponse);
      if (!healthResponse.ok || !health?.ok || health.ffmpeg !== true) {
        throw workerError(healthResponse, health, "The video worker is not ready");
      }
      checkingConnection = false;

      setStatusMsg("Uploading video");
      const form = new FormData();
      form.append("file", file);
      form.append("request_key", accountRequestKey.current ?? crypto.randomUUID());
      form.append("mode", cleanMode);
      if (position) form.append("manual_box", JSON.stringify(position));
      const response = await accountFetch(`${workerOrigin}/api/video/process`, {
        method: "POST",
        body: form,
        signal,
      });
      const job = await readWorkerResponse(response);
      if (!response.ok || !job?.job_id) {
        throw workerError(response, job, "The worker could not accept the video");
      }
      if (!job.job_token)
        throw new Error("This worker requires the current video cleaner release.");

      const jobId = encodeURIComponent(job.job_id);
      const options = { signal, headers: { "X-Video-Job-Token": job.job_token } };
      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        signal.throwIfAborted();
        const statusResponse = await accountFetch(
          `${workerOrigin}/api/video/status/${jobId}`,
          options,
        );
        const status = await readWorkerResponse(statusResponse);
        if (!statusResponse.ok || !status) {
          throw workerError(statusResponse, status, "The worker could not retrieve this job");
        }
        if (status.state === "error") throw new Error(status.error || "Video processing failed.");
        if (status.state === "done") {
          const quality = status.quality;
          if (
            !quality ||
            quality.total_frames < 1 ||
            quality.frames_processed !== quality.total_frames ||
            quality.decoded_frames_verified !== quality.total_frames
          ) {
            throw new Error("The worker did not verify every export frame.");
          }
          if (quality.method === "calibrated-opaque-inpainting" || quality.method === "manual-box-inpainting") {
            setResultNote("The worker estimated covered pixels from nearby detail. Review the restored texture and edges.");
          }
          break;
        }
        setProgress(Math.min(99, Math.max(2, status.progress ?? 0)));
        setStatusMsg(status.stage || (status.state === "queued" ? "Waiting for the worker" : "Processing video"));
      }

      setProgress(99);
      setStatusMsg("Downloading processed MP4");
      const result = await accountFetch(`${workerOrigin}/api/video/download/${jobId}`, options);
      if (!result.ok) {
        throw workerError(
          result,
          await readWorkerResponse(result),
          "The worker could not download this MP4",
        );
      }
      const blob = await result.blob();
      signal.throwIfAborted();
      if (!blob.size) throw new Error("The worker returned an empty MP4.");
      if (blob.type !== "video/mp4") throw new Error("The worker returned an unexpected file type.");
      const cleanBlobUrl = URL.createObjectURL(blob);
      if (cleanUrlRef.current) URL.revokeObjectURL(cleanUrlRef.current);
      cleanUrlRef.current = cleanBlobUrl;
      setCleanUrl(cleanBlobUrl);
      setManual(false);
      setIsDone(true);
      setProgress(100);
      setStatusMsg("Processing complete. Review the result before downloading.");
      emitToolEvent("processing_completed", "gemini-video-watermark-remover");
      toast.success("Video export is ready to review.");

      try {
        const newJob = useUserStore.getState().addJob({
          file_name: file.name,
          file_type: "video",
          tool_name: "Gemini & Veo Video Cleaner",
          status: "completed",
          quality: "Original resolution MP4",
          credits_used: 0,
          file_url: origUrl,
          result_url: cleanBlobUrl,
        });
        saveMediaBlob(newJob.id, blob, "video/mp4");
      } catch {
        // The processed MP4 remains available if local history storage fails.
      }
      setCurrentTime(0);
      setSeekValue(0);
      setIsPlaying(false);
    } catch (error) {
      if (signal.aborted || processingControllerRef.current !== controller) return;
      const isConnectionError =
        checkingConnection && error instanceof TypeError && /fetch|network/i.test(error.message);

      const localWorker = workerOrigin?.startsWith("http://127.0.0.1");
      const details = isConnectionError
        ? localWorker
          ? `The video worker at ${workerOrigin} is unreachable. Start it with ${workerCommand} or ${npmCommand} run dev:all.`
          : "The video worker is unreachable. Try again in a moment."
        : error instanceof Error
          ? error.message
          : "Unable to process this video.";
      setIsError(true);
      setErrorDetails(details);
      setStatusMsg("Processing failed");
      emitToolEvent("processing_failed", "gemini-video-watermark-remover");
      toast.error(isConnectionError ? "Video worker is offline." : "Video processing failed.");
    } finally {
      if (processingControllerRef.current === controller) {
        processingControllerRef.current = null;
        setIsProcessing(false);
      }
    }
  };

  const selectionPoint = (event: React.PointerEvent<HTMLDivElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clamp = (value: number) => Math.max(0, Math.min(1, value));
    return [
      clamp((event.clientX - rect.left) / rect.width),
      clamp((event.clientY - rect.top) / rect.height),
    ];
  };

  const updateSelection = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!selectionStart.current) return;
    const [startX, startY] = selectionStart.current;
    const [x, y] = selectionPoint(event);
    setSelection([
      Math.min(startX, x),
      Math.min(startY, y),
      Math.abs(x - startX),
      Math.abs(y - startY),
    ]);
  };

  const toggleManual = () => {
    pauseBoth();
    setIsPlaying(false);
    setManual(!manual);
    setSelection(null);
    setIsError(false);
    setErrorDetails(null);
  };

  // A new selection starts processing; progress renders do not restart the job.
  useEffect(() => {
    if (file && origUrl) void handleProcess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, origUrl]);

  /* -------------------------------------------------------------------------- */
  /* STEP 1: UPLOAD BOX                                                         */
  /* -------------------------------------------------------------------------- */
  if (!origUrl || !file) {
    return (
      <div id="gemini-video-upload-card" tabIndex={-1} className="w-full">
        <div
          className={`relative flex min-h-[440px] cursor-pointer flex-col items-center justify-center rounded-xl border-[3px] px-6 py-14 sm:py-18 text-center transition-all duration-150 ${
            dragOver
              ? "border-[#0b0f0d] bg-[#d0f471] shadow-[8px_8px_0px_#0b0f0d] -translate-x-0.5 -translate-y-0.5"
              : "border-[#0b0f0d] bg-white hover:bg-[#fffef5] shadow-[7px_7px_0px_#0b0f0d]"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const dropped = e.dataTransfer.files[0];
            if (dropped) loadFile(dropped);
          }}
        >
          <div className="relative mb-2">
            <span className="flex size-22 items-center justify-center rounded-xl bg-[#d0f471] border-[2.5px] border-[#0b0f0d] text-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] transition-transform duration-200 hover:scale-105">
              <UploadCloud className="size-10 stroke-[2.3]" />
            </span>
            <span className="absolute -bottom-2 -right-2 flex size-9 items-center justify-center rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] text-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]">
              <Film className="size-4 stroke-[2.4]" />
            </span>
          </div>

          <h3 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#0b0f0d]">
            Drop a Gemini or Veo video
          </h3>

          <p className="mt-3 text-sm sm:text-base text-[#26302b] font-semibold max-w-lg">
            MP4, MOV, WebM or MKV up to 500 MB. Processing starts automatically when selected.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#d0f471] hover:bg-[#ffe500] border-2 border-[#0b0f0d] text-[#0b0f0d] px-7 py-3.5 text-base font-black shadow-[4px_4px_0px_#0b0f0d] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#0b0f0d] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <UploadCloud className="size-5 stroke-[2.4]" /> Browse Video
            </button>

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
                        const pasted = new File([blob], "clipboard-video.mp4", { type: vidType });
                        loadFile(pasted);
                        return;
                      }
                    }
                  }
                  toast.info("Press Ctrl+V to paste your video file from clipboard.");
                } catch {
                  toast.info("Press Ctrl+V to paste your video file from clipboard.");
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-[#0b0f0d] bg-white hover:bg-[#ffe500] text-[#0b0f0d] px-5 py-3.5 text-sm sm:text-base font-black shadow-[3px_3px_0px_#0b0f0d] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#0b0f0d] transition-all cursor-pointer"
            >
              <Copy className="size-4 text-[#0b0f0d] stroke-[2.4]" />
              <span>Paste from Clipboard</span>
            </button>
          </div>

          <div className="mt-6 inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-md bg-[#f7f5ee] border-2 border-[#0b0f0d] text-xs font-bold text-[#0b0f0d]">
            <ShieldCheck className="size-4 text-[#0b0f0d] stroke-[2.3]" />
            <span>Reverse-alpha cleanup with MP4 export</span>
          </div>

          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            accept={ACCEPT}
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) loadFile(selected);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* STEP 2: SINGLE VIDEO WORKSPACE                                              */
  /* -------------------------------------------------------------------------- */
  const isPortrait = videoRatio > 0 && videoRatio < 0.95;

  return (
    <div
      className={`w-full rounded-xl border-[3px] border-[#0b0f0d] bg-white p-5 sm:p-7 shadow-[7px_7px_0px_#0b0f0d] space-y-5 text-left transition-all duration-200 ${
        isPortrait ? "max-w-xl mx-auto" : "max-w-5xl mx-auto"
      }`}
    >
      {isDone && cleanUrl && !manual && (
        <div className="rounded-lg border-2 border-[#0b0f0d] bg-[#d0f471] px-5 py-4 shadow-[3px_3px_0px_#0b0f0d]">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md border-2 border-[#0b0f0d] bg-white text-[#0b0f0d]">
              <CheckCircle2 className="size-5 stroke-[2.5]" />
            </span>
            <div>
              <h3 className="text-lg font-black text-[#0b0f0d]">Your processed video is ready</h3>
              <p className="mt-1 text-sm font-semibold text-[#0b0f0d]">
                Drag the split slider or select Processed to review the exported video.
              </p>
              {resultNote && <p className="mt-1 text-sm text-[#0b0f0d]">{resultNote}</p>}
            </div>
          </div>
        </div>
      )}

      {isDone && cleanUrl && !manual ? (
        <VideoCompareSlider
          beforeSrc={origUrl}
          afterSrc={cleanUrl}
          beforeLabel="Original"
          afterLabel="Processed"
          initialRatio={videoRatio}
          defaultFit="contain"
          autoPlay={false}
          loop={false}
          controlsOutside
          className="border-[#10241e]/15 shadow-none"
        />
      ) : (
        <div
          className={`overflow-hidden rounded-2xl border border-[#10241e]/15 bg-[#091712] transition-all duration-300 ${
            isPortrait
              ? "max-w-[420px] mx-auto shadow-xl"
              : "w-full"
          }`}
        >
          <div
            className="relative flex items-center justify-center overflow-hidden bg-[#091712] mx-auto w-full"
            style={
              videoRatio > 0
                ? {
                    aspectRatio: `${videoRatio}`,
                    maxHeight: "75vh",
                    maxWidth: `calc(75vh * ${videoRatio})`,
                  }
                : { aspectRatio: "16/9" }
            }
          >
            <span className="absolute left-3 top-3 z-10 rounded-full bg-black/85 px-3 py-1 text-xs font-bold text-white">
              {isDone
                ? "Original video"
                : isProcessing
                  ? "Scanning original video"
                  : "Original video"}
            </span>
            <video
              ref={origVideoRef}
              src={origUrl}
              playsInline
              muted={isMuted}
              autoPlay={!manual}
              loop={isProcessing && !manual}
              preload="auto"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={() => setPreviewError(true)}
              className="h-full w-full cursor-pointer object-contain"
              onClick={togglePlay}
              onLoadedMetadata={(event) => {
                const video = event.currentTarget;
                setDuration(video.duration);
                if (video.videoWidth && video.videoHeight) {
                  setVideoRatio(video.videoWidth / video.videoHeight);
                }
                if (manual) video.currentTime = currentTime;
              }}
              onLoadedData={(event) => {
                const video = event.currentTarget;
                if (video.videoWidth && video.videoHeight && videoRatio === 0) {
                  setVideoRatio(video.videoWidth / video.videoHeight);
                }
              }}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
            />
            {previewError && (
              <p className="absolute px-5 text-center text-sm text-white">
                This browser cannot preview the original format. The worker can still process it.
              </p>
            )}
            {manual && videoRatio > 0 && !isProcessing && (
              <div
                className="absolute inset-0 z-20 touch-none cursor-crosshair"
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  selectionStart.current = selectionPoint(event);
                  updateSelection(event);
                }}
                onPointerMove={updateSelection}
                onPointerUp={(event) => {
                  updateSelection(event);
                  selectionStart.current = null;
                  accountRequestKey.current = crypto.randomUUID();
                }}
                onPointerCancel={() => {
                  selectionStart.current = null;
                  setSelection(null);
                }}
              >
                {selection && (
                  <div
                    className="pointer-events-none absolute border-2 border-[#d0f471] bg-[#d0f471]/15"
                    style={{
                      left: `${selection[0] * 100}%`,
                      top: `${selection[1] * 100}%`,
                      width: `${selection[2] * 100}%`,
                      height: `${selection[3] * 100}%`,
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {isProcessing && (
        <div className="rounded-xl border-[2.5px] border-[#0b0f0d] bg-[#f7f5ee] p-4 shadow-[4px_4px_0px_#0b0f0d]">
          <div
            role="status"
            className="mb-2 flex items-center justify-between gap-3 text-xs font-black text-[#0b0f0d]"
          >
            <span>{statusMsg}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono bg-[#ffe500] border border-[#0b0f0d] px-1.5 py-0.5 rounded">{progress}%</span>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded border border-[#0b0f0d] bg-white px-2 py-0.5 text-[11px] font-bold text-[#0b0f0d] hover:bg-[#ffdad6] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
          <div
            role="progressbar"
            aria-label="Video cleanup progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="h-3 overflow-hidden rounded-md border-2 border-[#0b0f0d] bg-white"
          >
            <div
              className="h-full bg-[#d0f471] transition-[width] duration-200 border-r-2 border-[#0b0f0d]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Playback Control Bar */}
      {(!isDone || manual) && (
        <div className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d]">
          <button
            type="button"
            onClick={togglePlay}
            className="size-10 rounded-lg bg-[#d0f471] hover:bg-[#ffe500] text-[#0b0f0d] border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d] flex items-center justify-center transition-all cursor-pointer shrink-0"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
          </button>

          <input
            type="range"
            min={0}
            max={1000}
            value={seekValue}
            onChange={handleSeek}
            className="flex-1 accent-[#0b0f0d] cursor-pointer h-2 bg-[#f7f5ee] rounded-lg"
            aria-label="Seek video position"
          />

          <span className="min-w-[84px] text-right font-mono text-xs sm:text-sm font-black text-[#0b0f0d]">
            {fmt(currentTime)} / {fmt(duration)}
          </span>

          <button
            type="button"
            onClick={toggleMute}
            className="size-8 rounded-lg bg-[#f7f5ee] border-2 border-[#0b0f0d] text-[#0b0f0d] hover:bg-[#ffe500] flex items-center justify-center transition-all cursor-pointer"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX className="size-4 text-[#0b0f0d]" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </button>
        </div>
      )}

      {/* Error Message Box (Clean, friendly, actionable) */}
      {isError && (
        <div className="rounded-xl border-[2.5px] border-[#0b0f0d] bg-[#ffdad6] p-4 sm:p-5 flex flex-col gap-3 text-left shadow-[4px_4px_0px_#0b0f0d]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-[#0b0f0d] text-sm font-bold">
              <AlertTriangle className="size-5 text-[#ff5c5c] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="block font-black text-[#0b0f0d] text-sm">
                  {errorDetails?.includes("npm run worker")
                    ? "Video Processing Worker Offline"
                    : "Processing Error"}
                </span>
                <span className="text-xs text-[#0b0f0d] font-medium block leading-relaxed">
                  {errorDetails ||
                    "Unable to process this video. Please try again or upload a different file."}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {errorDetails?.includes(workerCommand) && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(workerCommand);
                    toast.success("Worker command copied.");
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border-2 border-[#0b0f0d] hover:bg-[#ffe500] text-[#0b0f0d] text-xs font-mono font-bold transition-all cursor-pointer shadow-[2px_2px_0px_#0b0f0d]"
                  title="Copy command to clipboard"
                >
                  <Copy className="size-3.5" />
                  <span>Copy worker command</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  accountRequestKey.current = crypto.randomUUID();
                  void handleProcess(manual ? (selection ?? undefined) : undefined);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ff5c5c] hover:bg-[#ffe500] text-[#0b0f0d] border-2 border-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] text-xs font-black transition-all cursor-pointer shrink-0"
              >
                <RotateCcw className="size-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Removal mode */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#f7f5ee] border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] text-left">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[#0b0f0d] uppercase tracking-wider">Removal Mode</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded border border-[#0b0f0d] ${
                cleanMode === "crop" ? "bg-[#ffe500] text-[#0b0f0d]" : "bg-[#d0f471] text-[#0b0f0d]"
              }`}>
                {cleanMode === "crop" ? "Reframed export" : "Original framing"}
              </span>
            </div>
            <p className="text-xs text-[#1f2924] font-medium">
              {cleanMode === "clean"
                ? "Reconstruct pixels around the detected sparkle."
                : "Crop out a detected stationary sparkle and resize to the source dimensions."}
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-white border-2 border-[#0b0f0d] shrink-0 self-stretch sm:self-auto justify-center">
            <button
              type="button"
              onClick={() => setCleanMode("clean")}
              disabled={isProcessing}
              className={`px-3.5 py-1.5 rounded-md text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                cleanMode === "clean"
                  ? "bg-[#d0f471] text-[#0b0f0d] border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]"
                  : "text-[#0b0f0d] hover:bg-[#f7f5ee] border-2 border-transparent"
              }`}
            >
              <Sparkles className="size-3.5" />
              <span>Restore</span>
            </button>

            <button
              type="button"
              onClick={() => setCleanMode("crop")}
              disabled={isProcessing}
              className={`px-3.5 py-1.5 rounded-md text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                cleanMode === "crop"
                  ? "bg-[#ffe500] text-[#0b0f0d] border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]"
                  : "text-[#0b0f0d] hover:bg-[#f7f5ee] border-2 border-transparent"
              }`}
            >
              <ShieldCheck className="size-3.5 text-[#0b0f0d]" />
              <span>Crop and scale</span>
            </button>
          </div>
        </div>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-[#0b0f0d] bg-white hover:bg-[#ffe500] text-[#0b0f0d] px-5 py-2.5 text-sm font-black shadow-[3px_3px_0px_#0b0f0d] transition-all cursor-pointer disabled:opacity-50"
        >
          <Upload className="size-4 text-[#0b0f0d]" />
          Choose Another Video
        </button>

        <button
          type="button"
          onClick={resetState}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-[#0b0f0d] bg-white hover:bg-[#ffe500] text-[#0b0f0d] px-5 py-2.5 text-sm font-black shadow-[3px_3px_0px_#0b0f0d] transition-all cursor-pointer"
        >
          <RotateCcw className="size-4" />
          Reset
        </button>

        <button
          type="button"
          onClick={toggleManual}
          disabled={isProcessing}
          aria-pressed={manual}
          className={`inline-flex items-center gap-2 rounded-lg border-2 border-[#0b0f0d] px-5 py-2.5 text-sm font-black text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] disabled:opacity-50 cursor-pointer transition-all ${
            manual ? "bg-[#a8e6cf]" : "bg-white hover:bg-[#a8e6cf]"
          }`}
        >
          {manual ? "Close manual position" : "Manual position"}
        </button>

        {!isDone || manual ? (
          <button
            type="button"
            disabled={
              isProcessing ||
              (manual &&
                (!selection ||
                  selection[2] < 0.005 ||
                  selection[3] < 0.005 ||
                  selection[2] > 0.35 ||
                  selection[3] > 0.35))
            }
            onClick={() => {
              accountRequestKey.current = crypto.randomUUID();
              void handleProcess(manual ? (selection ?? undefined) : undefined);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#d0f471] hover:bg-[#ffe500] text-[#0b0f0d] border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] px-8 py-3 text-sm sm:text-base font-black uppercase tracking-wide transition-all cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <span className="size-4 border-2 border-[#0b0f0d] border-t-transparent rounded-full animate-spin" />
                <span>Removing Watermark...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4 text-[#0b0f0d]" />
                <span>Remove Watermark</span>
              </>
            )}
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => {
                accountRequestKey.current = crypto.randomUUID();
                void handleProcess();
              }}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-[#0b0f0d] bg-[#f7f5ee] hover:bg-[#ffe500] text-[#0b0f0d] px-5 py-2.5 text-sm font-black shadow-[3px_3px_0px_#0b0f0d] transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="size-4 text-[#0b0f0d]" />
              <span>Re-process</span>
            </button>
            <a
              href={cleanUrl || "#"}
              download={`cleaned-${file.name.replace(/\.[^/.]+$/, "")}.mp4`}
              className="inline-flex items-center gap-2 rounded-lg bg-[#d0f471] hover:bg-[#ffe500] text-[#0b0f0d] border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] px-8 py-3 text-sm sm:text-base font-black uppercase tracking-wide transition-all cursor-pointer"
            >
              <Download className="size-4" />
              <span>Download Processed MP4</span>
            </a>
          </>
        )}
      </div>

      {manual && !isProcessing && (
        <p className="text-xs text-[#637069]">
          Pause on a clear frame and drag a small box around the entire visible sparkle.
        </p>
      )}
      {isDone && !manual && (
        <p className="text-xs text-[#637069]">
          Review the full result before use. Removal quality depends on whether the detector
          recognizes the watermark.
        </p>
      )}

      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept={ACCEPT}
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) loadFile(selected);
          e.target.value = "";
        }}
      />
    </div>
  );
}
