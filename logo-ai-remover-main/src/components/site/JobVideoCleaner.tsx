"use client";

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
} from "lucide-react";
import { toast } from "sonner";
import {
  assertBrowserVideoSupport,
  cancelGeminiEngine,
  processWithGeminiEngine,
  type GeminiVideoProgress,
} from "@/lib/geminiVideoEngine";

const ACCEPT = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.mkv";

function fmt(t: number): string {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function JobVideoCleaner() {
  const [file, setFile] = useState<File | null>(null);
  const paneRef = useRef<HTMLDivElement>(null);

  const [origUrl, setOrigUrl] = useState<string | null>(null);
  const [cleanUrl, setCleanUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [outputExt, setOutputExt] = useState<string>("mp4");

  const engineFrameRef = useRef<HTMLIFrameElement>(null);
  const processingControllerRef = useRef<AbortController | null>(null);

  const [dragOver, setDragOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekValue, setSeekValue] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [statusMsg, setStatusMsg] = useState("Ready to process.");
  const [progress, setProgress] = useState(0);
  const [isError, setIsError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const origVideoRef = useRef<HTMLVideoElement>(null);
  const procVideoRef = useRef<HTMLVideoElement>(null);

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
      if (f.size > 100 * 1024 * 1024) {
        toast.error(
          "Browser mode supports files up to 100 MB. Use the local CLI for larger videos.",
        );
        return;
      }

      processingControllerRef.current?.abort();
      cancelGeminiEngine(engineFrameRef.current);

      if (origUrl) URL.revokeObjectURL(origUrl);
      if (cleanUrl) URL.revokeObjectURL(cleanUrl);

      const url = URL.createObjectURL(f);
      setFile(f);
      setOrigUrl(url);
      setCleanUrl(null);
      setDownloadUrl(null);
      setOutputExt("mp4");
      setIsDone(false);
      setIsProcessing(false);
      setIsError(false);
      setErrorDetails(null);
      setProgress(0);
      setCurrentTime(0);
      setSeekValue(0);
      setIsPlaying(false);
      setStatusMsg("Starting local watermark detectionâ€¦");
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
    const video = procVideoRef.current || origVideoRef.current;
    video?.play().catch(() => {});
    setIsPlaying(true);
  };

  const pauseBoth = () => {
    (procVideoRef.current || origVideoRef.current)?.pause();
    setIsPlaying(false);
  };

  const togglePlay = () => {
    const video = procVideoRef.current || origVideoRef.current;
    if (!video) return;
    if (video.paused) {
      playBoth();
    } else {
      pauseBoth();
    }
  };

  const handleTimeUpdate = () => {
    const video = procVideoRef.current || origVideoRef.current;
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
    const video = procVideoRef.current || origVideoRef.current;
    const dur = video?.duration || 0;
    const targetTime = (val / 1000) * dur;
    if (video) video.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const toggleMute = () => {
    const video = procVideoRef.current || origVideoRef.current;
    if (video) {
      video.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const resetState = () => {
    pauseBoth();
    processingControllerRef.current?.abort();
    processingControllerRef.current = null;
    cancelGeminiEngine(engineFrameRef.current);
    if (origUrl) URL.revokeObjectURL(origUrl);
    if (cleanUrl) URL.revokeObjectURL(cleanUrl);
    setFile(null);
    setOrigUrl(null);
    setCleanUrl(null);
    setDownloadUrl(null);
    setOutputExt("mp4");
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

  // Browser-local WebCodecs + MediaBunny processing via the official MIT runtime.
  const handleProcess = async () => {
    if (!file || !origUrl) return;
    const engineFrame = engineFrameRef.current;
    if (!engineFrame) {
      toast.error("The local video engine is still loading. Please try again.");
      return;
    }

    const controller = new AbortController();
    processingControllerRef.current?.abort();
    processingControllerRef.current = controller;
    setIsProcessing(true);
    setIsError(false);
    setErrorDetails(null);
    setProgress(1);
    setStatusMsg("Loading verified local engineâ€¦");

    try {
      assertBrowserVideoSupport();

      const result = await processWithGeminiEngine(
        engineFrame,
        file,
        (event: GeminiVideoProgress) => {
          if (controller.signal.aborted || processingControllerRef.current !== controller) return;
          setProgress(Math.min(99, Math.max(1, Math.round(event.progress * 100))));
          setStatusMsg(event.message);
        },
        controller.signal,
      );

      controller.signal.throwIfAborted();

      const blobUrl = URL.createObjectURL(result.blob);
      setOutputExt("mp4");
      setCleanUrl(blobUrl);
      setDownloadUrl(blobUrl);
      setIsDone(true);
      // Frame completion verifies export, not visual watermark removal.
      setProgress(99);
      setStatusMsg("Processing complete. Review the result before downloading.");
      toast.success("Video export is ready to review.");

      try {
        useUserStore.getState().addJob({
          file_name: file.name,
          file_type: "video",
          status: "completed",
          quality: "Original resolution",
          credits_used: 0,
          file_url: origUrl,
          result_url: blobUrl,
        });
      } catch {
        // Non-critical local history update.
      }

      setCurrentTime(0);
      setSeekValue(0);
      setIsPlaying(false);
    } catch (finalErr) {
      console.error("Video processing failure:", finalErr);
      if (controller.signal.aborted || processingControllerRef.current !== controller) return;
      setIsError(true);
      setErrorDetails(
        finalErr instanceof Error ? finalErr.message : "Unable to process this video locally.",
      );
      setStatusMsg("Processing failed");
      toast.error("Local video processing failed.");
    } finally {
      if (processingControllerRef.current === controller) {
        processingControllerRef.current = null;
        setIsProcessing(false);
      }
    }
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
            MP4, MOV, WebM or MKV Â· up to 100 MB. Processing starts automatically when selected.
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
            <span>
              Local reverse-alpha cleanup Â· output is re-encoded Â· original stays unchanged
            </span>
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
      {/* One player for the original, live scan, and processed result. */}
      <div className="overflow-hidden rounded-2xl border border-[#10241e]/15 bg-black">
        <div
          ref={paneRef}
          className="relative flex aspect-video items-center justify-center overflow-hidden bg-black"
        >
          <span className="absolute left-3 top-3 z-10 rounded-full bg-black/85 px-3 py-1 text-xs font-bold text-white">
            {isDone
              ? "Processed result"
              : isProcessing
                ? "Scanning original video"
                : "Original video"}
          </span>
          {isDone && cleanUrl ? (
            <video
              ref={procVideoRef}
              src={cleanUrl}
              playsInline
              preload="auto"
              className="h-full w-full cursor-pointer bg-black object-contain"
              onClick={togglePlay}
              onLoadedMetadata={() => setDuration(procVideoRef.current?.duration || 0)}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
            />
          ) : (
            <video
              ref={origVideoRef}
              src={origUrl}
              playsInline
              preload="auto"
              className="h-full w-full cursor-pointer bg-black object-contain"
              onClick={togglePlay}
              onLoadedMetadata={() => setDuration(origVideoRef.current?.duration || 0)}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
            />
          )}
          {isProcessing && (
            <div
              className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black p-6 text-center text-white"
              role="status"
              aria-live="polite"
            >
              <div className="mb-4 flex size-16 items-center justify-center rounded-full border border-[#d0f471]/50 bg-[#10241e]">
                <div className="size-9 animate-spin rounded-full border-[3px] border-transparent border-t-[#d0f471] motion-reduce:animate-none" />
              </div>
              <strong className="text-base sm:text-lg">Scanning and cleaning video</strong>
              <span className="mt-2 max-w-md text-sm text-white/80">{statusMsg}</span>
              <div className="mt-5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-[#d0f471] transition-[width] duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="mt-2 font-mono text-xs text-[#d0f471]">{progress}%</span>
            </div>
          )}
        </div>
      </div>
      {(isProcessing || isDone) && (
        <div className="rounded-2xl border border-[#10241e]/15 bg-[#f3f4ee] p-4">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-[#10241e]">
            <span>{statusMsg}</span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#10241e]/10">
            <div
              className="h-full rounded-full bg-[#10241e] transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          {isProcessing && (
            <p className="mt-2 text-xs text-[#637069]">
              Processing stays in this Chrome/Edge tab. Keep it open and in the foreground until
              export completes.
            </p>
          )}
        </div>
      )}

      {/* Playback Control Bar */}
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
          {isMuted ? <VolumeX className="size-4 text-[#10241e]" /> : <Volume2 className="size-4" />}
        </button>
      </div>

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
            onClick={() => void handleProcess()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
          >
            <RotateCcw className="size-3.5" />
            <span>Try Again</span>
          </button>
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
          {isProcessing ? "Cancel & Reset" : "Reset"}
        </button>

        {!isDone ? (
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => void handleProcess()}
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
            href={downloadUrl || "#"}
            download={`cleaned-${file.name.replace(/\.[^/.]+$/, "")}.${outputExt}`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#10241e] hover:bg-[#18362d] text-[#d0f471] px-8 py-3.5 text-sm sm:text-base font-bold shadow-xl transition-all cursor-pointer"
          >
            <Download className="size-4" />
            <span>Download Processed MP4</span>
          </a>
        )}
      </div>

      {isDone && (
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

      <iframe
        ref={engineFrameRef}
        src="/gwr-engine/video-preview.html?v=20261113_upstream_remove_sync"
        title="Local Gemini video processing engine"
        aria-hidden="true"
        tabIndex={-1}
        className="pointer-events-none fixed left-[-10000px] top-0 h-[720px] w-[1280px] opacity-[0.01]"
      />
    </div>
  );
}
