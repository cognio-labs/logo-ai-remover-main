"use client";
import { emitToolEvent } from "@/lib/tool-events";

import { accountFetch } from "@/components/account/AccountPanel";
import { useUserStore } from "@/lib/userStore";
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
};

const ACCEPT = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.mkv";

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
  const accountRequestKey = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const [origUrl, setOrigUrl] = useState<string | null>(null);
  const [cleanUrl, setCleanUrl] = useState<string | null>(null);

  const processingControllerRef = useRef<AbortController | null>(null);

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
  const [cleanMode, setCleanMode] = useState<"clean" | "guaranteed">("clean");
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
    };
  }, []);

  useEffect(
    () => () => {
      if (origUrl) URL.revokeObjectURL(origUrl);
    },
    [origUrl],
  );

  useEffect(
    () => () => {
      if (cleanUrl) URL.revokeObjectURL(cleanUrl);
    },
    [cleanUrl],
  );

  // Load Video File
  const loadFile = useCallback(
    (f: File) => {
      const ok = /\.(mp4|mov|webm|mkv)$/i.test(f.name);
      if (!ok) {
        toast.error("Please choose an MP4, WebM, MOV or MKV video.");
        return;
      }
      if (f.size > 500 * 1024 * 1024) {
        toast.error("Choose a video smaller than 500 MB.");
        return;
      }

      processingControllerRef.current?.abort();
      processingControllerRef.current = null;
      selectionStart.current = null;

      if (origUrl) URL.revokeObjectURL(origUrl);
      if (cleanUrl) URL.revokeObjectURL(cleanUrl);

      const url = URL.createObjectURL(f);
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
    [cleanUrl, origUrl],
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
    if (origUrl) URL.revokeObjectURL(origUrl);
    if (cleanUrl) URL.revokeObjectURL(cleanUrl);
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

  const handleProcess = async (position?: Selection) => {
    if (!file || !origUrl || processingControllerRef.current) return;
    const controller = new AbortController();
    const { signal } = controller;
    processingControllerRef.current = controller;
    setIsProcessing(true);
    setIsError(false);
    setErrorDetails(null);
    setProgress(2);
    setStatusMsg("Connecting to the video worker");
    let workerOrigin: string | null = null;

    try {
      const config = await fetch("/api/video-worker", { signal, cache: "no-store" });
      const worker = await readWorkerResponse(config);
      if (!config.ok || !worker?.origin) {
        throw new Error(worker?.detail || "The video worker is unavailable.");
      }
      workerOrigin = worker.origin;

      const healthResponse = await accountFetch(`${workerOrigin}/health`, {
        signal,
        cache: "no-store",
      });
      const health = await readWorkerResponse(healthResponse);
      if (!healthResponse.ok || !health?.ok || health.ffmpeg !== true) {
        throw workerError(healthResponse, health, "The video worker is not ready");
      }

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
        await new Promise((resolve) => setTimeout(resolve, 750));
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
        if (status.state === "done") break;
        setProgress(Math.min(98, Math.max(5, status.progress || 0)));
        setStatusMsg(
          status.state === "queued"
            ? "Waiting for a processing slot"
            : "Restoring the watermark area",
        );
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
      setCleanUrl(URL.createObjectURL(blob));
      setManual(false);
      setIsDone(true);
      setProgress(100);
      setStatusMsg("Processing complete. Review the result before downloading.");
      emitToolEvent("processing_completed", "gemini-video-watermark-remover");
      toast.success("Video export is ready to review.");

      try {
        useUserStore.getState().addJob({
          file_name: file.name,
          file_type: "video",
          status: "completed",
          quality: "Original resolution",
          credits_used: 0,
          file_url: origUrl,
          result_url: "",
        });
      } catch {
        // The processed MP4 remains available if local history storage fails.
      }
      setCurrentTime(0);
      setSeekValue(0);
      setIsPlaying(false);
    } catch (error) {
      if (signal.aborted || processingControllerRef.current !== controller) return;
      const details =
        error instanceof TypeError && /fetch/i.test(error.message) && workerOrigin
          ? `The video worker at ${workerOrigin} could not be reached. Check that it is running and reachable, then try again.`
          : error instanceof Error
            ? error.message
            : "Unable to process this video.";
      setIsError(true);
      setErrorDetails(details);
      setStatusMsg("Processing failed");
      emitToolEvent("processing_failed", "gemini-video-watermark-remover");
      toast.error("Video processing failed.");
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
      <div className="w-full">
        <div
          className={`relative flex min-h-[440px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-16 sm:py-20 text-center transition-all duration-300 ${
            dragOver
              ? "border-[#10241e] bg-[#f9faf7] shadow-2xl scale-[1.01]"
              : "border-[#10241e]/20 bg-white hover:border-[#10241e] shadow-xl"
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
            <span className="flex size-24 items-center justify-center rounded-3xl bg-[#10241e] text-[#d0f471] shadow-[0_12px_32px_rgba(16,36,30,0.2)] transition-transform duration-300 hover:scale-105">
              <UploadCloud className="size-11 animate-pulse" />
            </span>
            <span className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-[#d0f471] border border-[#10241e]/20 text-[#091712] shadow-xs">
              <Film className="size-4" />
            </span>
          </div>

          <h3 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#10241e]">
            Drop a Gemini or Veo video
          </h3>

          <p className="mt-3 text-sm sm:text-base text-[#637069] max-w-lg">
            MP4, MOV, WebM or MKV up to 500 MB. Processing starts automatically when selected.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#10241e] hover:bg-[#18362d] text-[#d0f471] px-8 py-3.5 text-base sm:text-lg font-bold shadow-lg transition-all cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <UploadCloud className="size-5 mr-1" /> Browse Video
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
              className="inline-flex items-center gap-2 rounded-2xl border border-[#10241e]/20 bg-[#f3f4ee] hover:bg-[#e9ece4] text-[#10241e] px-6 py-3.5 text-sm sm:text-base font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Copy className="size-4 text-[#10241e]" />
              <span>Paste from Clipboard</span>
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs sm:text-sm font-medium text-[#637069]">
            <ShieldCheck className="size-4 text-[#10241e]" />
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
  return (
    <div className="w-full rounded-3xl border border-[#10241e]/15 bg-white p-6 sm:p-8 shadow-2xl space-y-6 text-left">
      {isDone && cleanUrl && !manual && (
        <div className="rounded-2xl border border-[#10241e]/15 bg-[#f3f4ee] px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#d0f471] text-[#10241e]">
              <CheckCircle2 className="size-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-[#10241e]">Your processed video is ready</h3>
              <p className="mt-1 text-sm text-[#4e5f55]">
                Drag the line to compare the same moment before and after cleanup. Play or scrub
                through the full clip to check the watermark area.
              </p>
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
          defaultFit="contain"
          autoPlay={false}
          loop={false}
          controlsOutside
          className="border-[#10241e]/15 shadow-none"
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#10241e]/15 bg-black">
          <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-[#10241e]">
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
                setVideoRatio(video.videoWidth / video.videoHeight);
                if (manual) video.currentTime = currentTime;
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
                className="absolute z-20 touch-none cursor-crosshair"
                style={{
                  width: `${Math.min(1, videoRatio / (16 / 9)) * 100}%`,
                  height: `${Math.min(1, 16 / 9 / videoRatio) * 100}%`,
                }}
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
        <div className="rounded-2xl border border-[#10241e]/15 bg-[#f3f4ee] p-4">
          <div
            role="status"
            className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-[#10241e]"
          >
            <span>{statusMsg}</span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Video cleanup progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="h-2 overflow-hidden rounded-full bg-[#10241e]/10"
          >
            <div
              className="h-full rounded-full bg-[#10241e] transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Playback Control Bar */}
      {(!isDone || manual) && (
        <div className="flex items-center gap-3 px-3 py-2.5 bg-[#f3f4ee] rounded-2xl border border-[#10241e]/15">
          <button
            type="button"
            onClick={togglePlay}
            className="size-11 rounded-full bg-[#10241e] hover:bg-[#18362d] text-[#d0f471] shadow-md flex items-center justify-center transition-all cursor-pointer shrink-0"
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
            className="flex-1 accent-[#10241e] cursor-pointer h-2 bg-gray-300 rounded-lg"
            aria-label="Seek video position"
          />

          <span className="min-w-[84px] text-right font-mono text-xs sm:text-sm font-semibold text-[#10241e]">
            {fmt(currentTime)} / {fmt(duration)}
          </span>

          <button
            type="button"
            onClick={toggleMute}
            className="size-8 rounded-lg bg-white border border-[#10241e]/15 text-[#10241e] hover:bg-[#e9ece4] flex items-center justify-center transition-all cursor-pointer"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX className="size-4 text-[#10241e]" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </button>
        </div>
      )}

      {/* Error Message Box (Clean, friendly, non-technical) */}
      {isError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-2.5 text-rose-800 text-sm font-semibold">
            <AlertTriangle className="size-4 text-rose-600 shrink-0" />
            <span>
              {errorDetails ||
                "Unable to process this video. Please try again or upload a different file."}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void handleProcess(manual ? (selection ?? undefined) : undefined)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
          >
            <RotateCcw className="size-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Removal Mode Selector: Clean (AI Fill) vs Guaranteed (100% Zero-Trace) */}
      {(!isDone || manual) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#f3f4ee] border border-[#10241e]/15 text-left">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#10241e] uppercase tracking-wider">Removal Mode</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                cleanMode === "guaranteed" ? "bg-[#d0f471] text-[#091712]" : "bg-[#10241e] text-white"
              }`}>
                {cleanMode === "guaranteed" ? "100% Trace-Free" : "Full Frame AI"}
              </span>
            </div>
            <p className="text-xs text-[#637069]">
              {cleanMode === "clean"
                ? "Full 100% frame preserved using neural inpainting. Best for wide scenes."
                : "Watermark completely removed by cropping 6-8% bottom-right & upscaling with Lanczos sharpness."}
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-[#10241e]/15 shadow-xs shrink-0 self-stretch sm:self-auto justify-center">
            <button
              type="button"
              onClick={() => setCleanMode("clean")}
              disabled={isProcessing}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                cleanMode === "clean"
                  ? "bg-[#10241e] text-[#d0f471] shadow-xs"
                  : "text-[#37433d] hover:text-[#10241e] hover:bg-gray-100"
              }`}
            >
              <Sparkles className="size-3.5" />
              <span>Clean (AI Fill)</span>
            </button>

            <button
              type="button"
              onClick={() => setCleanMode("guaranteed")}
              disabled={isProcessing}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                cleanMode === "guaranteed"
                  ? "bg-[#10241e] text-[#d0f471] shadow-xs"
                  : "text-[#37433d] hover:text-[#10241e] hover:bg-gray-100"
              }`}
            >
              <ShieldCheck className="size-3.5 text-[#d0f471]" />
              <span>Guaranteed</span>
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-[#10241e]/20 bg-white hover:bg-[#f3f4ee] text-[#10241e] px-5 py-3 text-sm font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
        >
          <Upload className="size-4 text-[#10241e]" />
          Choose Another Video
        </button>

        <button
          type="button"
          onClick={resetState}
          className="inline-flex items-center gap-2 rounded-xl border border-[#10241e]/20 bg-white hover:bg-[#f3f4ee] text-[#10241e] px-5 py-3 text-sm font-bold shadow-xs transition-all cursor-pointer"
        >
          <RotateCcw className="size-4" />
          Reset
        </button>

        <button
          type="button"
          onClick={toggleManual}
          disabled={isProcessing}
          aria-pressed={manual}
          className="inline-flex items-center gap-2 rounded-xl border border-[#10241e]/20 bg-white px-5 py-3 text-sm font-bold text-[#10241e] hover:bg-[#f3f4ee] disabled:opacity-50"
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
            onClick={() => void handleProcess(manual ? (selection ?? undefined) : undefined)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#10241e] hover:bg-[#18362d] text-[#d0f471] px-8 py-3.5 text-sm sm:text-base font-bold shadow-xl transition-all cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <span className="size-4 border-2 border-[#d0f471] border-t-transparent rounded-full animate-spin" />
                <span>Removing Watermark...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4 text-[#d0f471]" />
                <span>Remove Watermark</span>
              </>
            )}
          </button>
        ) : (
          <a
            href={cleanUrl || "#"}
            download={`cleaned-${file.name.replace(/\.[^/.]+$/, "")}.mp4`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#10241e] hover:bg-[#18362d] text-[#d0f471] px-8 py-3.5 text-sm sm:text-base font-bold shadow-xl transition-all cursor-pointer"
          >
            <Download className="size-4" />
            <span>Download Processed MP4</span>
          </a>
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
