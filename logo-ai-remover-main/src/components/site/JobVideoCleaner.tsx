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
  processGeminiVideoCanvasFallback,
  processGeminiVideoFfmpeg,
} from "@/lib/clearCornerEngine";

const ACCEPT = "video/mp4,video/quicktime,video/webm,video/*,.mp4,.mov,.webm,.avi,.mkv";

// Resolve API base URL from env with fallback to local backend port 5000
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || "").replace(
  /\/+$/,
  "",
);

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

  const [backendJobId, setBackendJobId] = useState<string | null>(null);
  const backendJobIdRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [dragOver, setDragOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekValue, setSeekValue] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Calibration settings (internal default values)
  const [alpha] = useState(0.3);
  const [sizePct] = useState(7.0);
  const [distancePct] = useState(4.0);
  const [enableEdgeBlur] = useState(true);

  // Video Dimensions
  const [dimensions, setDimensions] = useState({ width: 1280, height: 720 });

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

  // Helper to remove remote job files from server
  const deleteBackendJob = useCallback((jobId: string | null) => {
    if (!jobId || !API_BASE) return;
    try {
      fetch(`${API_BASE}/api/video/${jobId}`, {
        method: "DELETE",
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Ignore network errors on shutdown
    }
  }, []);

  // Cleanup timers and blob URLs
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
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
  const loadFile = (f: File) => {
    const ok = /\.(mp4|mov|webm|avi|mkv)$/i.test(f.name) || f.type.startsWith("video/");
    if (!ok) {
      toast.error("Please choose an MP4, WebM, MOV, AVI or MKV video.");
      return;
    }

    if (backendJobIdRef.current) {
      deleteBackendJob(backendJobIdRef.current);
      setBackendJobId(null);
      backendJobIdRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

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
    setStatusMsg("Ready to process.");
    toast.success(`Loaded "${f.name}". Ready to process.`);
  };

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
  }, []);

  // Synchronized Playback
  const playBoth = () => {
    const vO = origVideoRef.current;
    const vP = procVideoRef.current;
    if (vO) vO.play().catch(() => {});
    if (vP) vP.play().catch(() => {});
    setIsPlaying(true);
  };

  const pauseBoth = () => {
    const vO = origVideoRef.current;
    const vP = procVideoRef.current;
    if (vO) vO.pause();
    if (vP) vP.pause();
    setIsPlaying(false);
  };

  const togglePlay = () => {
    const vO = origVideoRef.current;
    if (!vO) return;
    if (vO.paused) {
      playBoth();
    } else {
      pauseBoth();
    }
  };

  const handleTimeUpdate = () => {
    const vO = origVideoRef.current;
    if (!vO) return;
    setCurrentTime(vO.currentTime);
    const dur = vO.duration || 0;
    if (dur > 0) {
      setSeekValue(Math.round((vO.currentTime / dur) * 1000));
    }

    const vP = procVideoRef.current;
    if (vP && Math.abs(vP.currentTime - vO.currentTime) > 0.25) {
      vP.currentTime = vO.currentTime;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setSeekValue(val);
    const dur = origVideoRef.current?.duration || 0;
    const targetTime = (val / 1000) * dur;
    if (origVideoRef.current) origVideoRef.current.currentTime = targetTime;
    if (procVideoRef.current) procVideoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const toggleMute = () => {
    if (origVideoRef.current) {
      origVideoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const resetState = () => {
    pauseBoth();
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (backendJobIdRef.current) {
      deleteBackendJob(backendJobIdRef.current);
      setBackendJobId(null);
      backendJobIdRef.current = null;
    }
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

  // Video Processing Dispatcher (Automatic backend execution with in-browser fallback)
  const handleProcess = async () => {
    if (!file || !origUrl) return;
    setIsProcessing(true);
    setIsError(false);
    setErrorDetails(null);
    setProgress(5);
    setStatusMsg("Preparing video processing...");

    if (backendJobIdRef.current) {
      deleteBackendJob(backendJobIdRef.current);
      setBackendJobId(null);
      backendJobIdRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // 1. Try Backend API first if available
    let backendProcessed = false;
    if (API_BASE) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("size_pct", String(sizePct));
        formData.append("dist_pct", String(distancePct));
        formData.append("alpha", String(alpha));

        const uploadRes = await fetch(`${API_BASE}/api/video/process`, {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          const jobId = uploadData.job_id;
          if (jobId) {
            setBackendJobId(jobId);
            backendJobIdRef.current = jobId;
            setStatusMsg("Removing watermark... 10%");
            setProgress(10);

            // Wait for backend processing via polling
            await new Promise<void>((resolve, reject) => {
              const pollTimer = setInterval(async () => {
                try {
                  const statusRes = await fetch(`${API_BASE}/api/video/status/${jobId}`);
                  if (!statusRes.ok) throw new Error("Status check failed");
                  const data = await statusRes.json();

                  if (data.state === "queued") {
                    setProgress(Math.max(10, data.progress || 10));
                  } else if (data.state === "processing") {
                    const currentProgress = Math.max(10, Math.min(98, data.progress || 15));
                    setProgress(currentProgress);
                    setStatusMsg(`Removing watermark... ${currentProgress}%`);
                  } else if (data.state === "done") {
                    clearInterval(pollTimer);
                    pollIntervalRef.current = null;
                    setProgress(100);
                    setStatusMsg("Finalizing clean video...");

                    const downloadUrlStr = `${API_BASE}/api/video/download/${jobId}`;
                    const videoBlobRes = await fetch(downloadUrlStr);
                    if (!videoBlobRes.ok) throw new Error("Download failed");
                    const blob = await videoBlobRes.blob();
                    const blobUrl = URL.createObjectURL(blob);

                    setOutputExt("mp4");
                    setCleanUrl(blobUrl);
                    setDownloadUrl(downloadUrlStr);
                    setIsDone(true);
                    setIsProcessing(false);
                    setStatusMsg("Video processed successfully!");
                    toast.success("Done! Clean video is ready.");
                    backendProcessed = true;

                    try {
                      useUserStore.getState().addJob({
                        file_name: file.name,
                        file_type: "video",
                        status: "completed",
                        quality: "Original HD",
                        credits_used: 1,
                        file_url: origUrl || undefined,
                        result_url: blobUrl,
                      });
                    } catch {
                      // Non-critical store update
                    }

                    setTimeout(() => {
                      if (origVideoRef.current) origVideoRef.current.currentTime = 0;
                      if (procVideoRef.current) procVideoRef.current.currentTime = 0;
                      playBoth();
                    }, 300);

                    resolve();
                  } else if (data.state === "error") {
                    clearInterval(pollTimer);
                    pollIntervalRef.current = null;
                    reject(new Error(data.error || "Server processing failed"));
                  }
                } catch (err) {
                  clearInterval(pollTimer);
                  pollIntervalRef.current = null;
                  reject(err);
                }
              }, 700);

              pollIntervalRef.current = pollTimer;
            });

            if (backendProcessed) return;
          }
        }
      } catch (backendErr) {
        console.warn("Backend unavailable, automatically processing in-browser:", backendErr);
      }
    }

    // 2. Automatic internal fallback to In-Browser processing
    try {
      setStatusMsg("Removing watermark... 15%");
      const v = origVideoRef.current;
      const w = v?.videoWidth || dimensions.width;
      const h = v?.videoHeight || dimensions.height;

      let cleanResult: { blob: Blob; url: string; ext: string } | null = null;
      try {
        cleanResult = await processGeminiVideoFfmpeg(
          file,
          w,
          h,
          {
            alpha,
            sizePct,
            distancePct,
            enableEdgeBlur,
          },
          (pct) => {
            const currentPct = Math.round(pct * 100);
            setProgress(currentPct);
            setStatusMsg(`Removing watermark... ${currentPct}%`);
          },
        );
      } catch (wasmErr) {
        console.warn("WASM engine fallback to Canvas:", wasmErr);
        cleanResult = await processGeminiVideoCanvasFallback(
          origUrl,
          w,
          h,
          {
            alpha,
            sizePct,
            distancePct,
          },
          (pct) => {
            const currentPct = Math.round(pct * 100);
            setProgress(currentPct);
            setStatusMsg(`Removing watermark... ${currentPct}%`);
          },
        );
      }

      if (cleanResult) {
        setOutputExt(cleanResult.ext);
        setCleanUrl(cleanResult.url);
        setDownloadUrl(cleanResult.url);
        setIsDone(true);
        setIsProcessing(false);
        setProgress(100);
        setStatusMsg("Video processed successfully!");
        toast.success("Done! Clean video is ready.");

        try {
          useUserStore.getState().addJob({
            file_name: file.name,
            file_type: "video",
            status: "completed",
            quality: "Original HD",
            credits_used: 1,
            file_url: origUrl || undefined,
            result_url: cleanResult.url,
          });
        } catch {
          // Non-critical store update
        }

        setTimeout(() => {
          if (origVideoRef.current) origVideoRef.current.currentTime = 0;
          if (procVideoRef.current) procVideoRef.current.currentTime = 0;
          playBoth();
        }, 300);
      }
    } catch (finalErr) {
      console.error("Video processing failure:", finalErr);
      setIsProcessing(false);
      setIsError(true);
      setErrorDetails("Unable to process this video. Please try again or upload a different file.");
      setStatusMsg("Processing failed");
      toast.error("Video processing failed. Please try again.");
    }
  };

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
            Drop your video here
          </h3>

          <p className="mt-3 text-sm sm:text-base text-[#637069] max-w-lg">
            Supports MP4, MOV, WebM, AVI & MKV up to 4K resolution. Preserves 100% original video resolution and audio.
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
            <span>AI Watermark Removal • Zero Quality Loss • Original HD Video</span>
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
  /* STEP 2: MINIMAL & PROFESSIONAL SIDE-BY-SIDE VIDEO WORKSPACE                */
  /* -------------------------------------------------------------------------- */
  return (
    <div className="w-full rounded-3xl border border-[#10241e]/15 bg-white p-6 sm:p-8 shadow-2xl space-y-6 text-left">
      {/* 2-Pane Side-by-Side Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden border border-[#10241e]/15 bg-[#f3f4ee]">
        {/* Left Pane: Original */}
        <div
          ref={paneRef}
          className="relative aspect-video bg-[#0a0a0a] flex items-center justify-center overflow-hidden"
        >
          <span className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full bg-black/85 border border-[#333] text-white text-xs font-bold tracking-wide">
            Original (Watermarked)
          </span>

          <video
            ref={origVideoRef}
            src={origUrl}
            playsInline
            preload="auto"
            className="w-full h-full object-contain bg-black"
            onLoadedMetadata={() => {
              if (origVideoRef.current) {
                const w = origVideoRef.current.videoWidth || 1280;
                const h = origVideoRef.current.videoHeight || 720;
                setDimensions({ width: w, height: h });
                setDuration(origVideoRef.current.duration || 0);
              }
            }}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
          />
        </div>

        {/* Right Pane: Processed Video OR Preview (Both initially show original video) */}
        <div className="relative aspect-video bg-[#0e0e0e] flex items-center justify-center border-t md:border-t-0 md:border-l border-[#262626] overflow-hidden">
          <span className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full bg-[#10241e]/90 border border-[#d0f471]/30 text-[#d0f471] text-xs font-bold tracking-wide flex items-center gap-1.5">
            <Sparkles className="size-3 text-[#d0f471]" />
            <span>{isDone ? "Clean Video Output" : "Clean Preview"}</span>
          </span>

          {/* Right Video Player: Uses origUrl until processing succeeds, then displays cleanUrl */}
          <video
            ref={procVideoRef}
            src={cleanUrl || origUrl}
            playsInline
            preload="auto"
            muted
            className="w-full h-full object-contain bg-black"
          />

          {/* Premium Circular Loading Animation (Displayed strictly during processing) */}
          {isProcessing && (
            <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center select-none transition-all duration-300">
              <div className="relative flex items-center justify-center mb-4">
                {/* Subtle soft-lime outer pulse */}
                <div className="absolute size-20 rounded-full bg-[#d0f471]/20 animate-ping" />
                {/* Premium dark-green circular pod matching Bellix branding */}
                <div className="size-16 rounded-full bg-[#10241e] border border-[#d0f471]/40 shadow-2xl flex items-center justify-center">
                  {/* Rotating ring spinner with soft-lime accent */}
                  <div className="size-9 rounded-full border-[3px] border-[#10241e] border-t-[#d0f471] border-r-[#d0f471]/70 animate-spin" />
                </div>
              </div>
              <span className="text-sm sm:text-base font-bold text-white tracking-wide animate-pulse">
                Removing Watermark...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Synchronized Playback Control Bar */}
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
            <span>{errorDetails || "Unable to process this video. Please try again or upload a different file."}</span>
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
          disabled={isProcessing}
          onClick={resetState}
          className="inline-flex items-center gap-2 rounded-xl border border-[#10241e]/20 bg-white hover:bg-[#f3f4ee] text-[#10241e] px-5 py-3 text-sm font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
        >
          <RotateCcw className="size-4" />
          Reset
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
            <span>Download Clean MP4</span>
          </a>
        )}
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
  );
}
