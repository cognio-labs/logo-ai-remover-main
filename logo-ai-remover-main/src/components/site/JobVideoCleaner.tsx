"use client";

import { useUserStore } from "@/lib/userStore";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

const API_BASE = (
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : "http://localhost:5000"
).replace(/\/$/, "");

const ACCEPT = "video/mp4,video/quicktime,video/webm,video/*,.mp4,.mov,.webm,.avi,.mkv";

function fmt(t: number): string {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function JobVideoCleaner() {
  const [file, setFile] = useState<File | null>(null);
  const [origUrl, setOrigUrl] = useState<string | null>(null);
  const [cleanUrl, setCleanUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const [dragOver, setDragOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekValue, setSeekValue] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [statusMsg, setStatusMsg] = useState("Ready to process. Click Remove Watermark.");
  const [progress, setProgress] = useState(0);
  const [isError, setIsError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const origVideoRef = useRef<HTMLVideoElement>(null);
  const procVideoRef = useRef<HTMLVideoElement>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up object URLs and timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (origUrl) URL.revokeObjectURL(origUrl);
    };
  }, [origUrl]);

  // Load a video file
  const loadFile = (f: File) => {
    const ok = /\.(mp4|mov|webm|avi|mkv)$/i.test(f.name) || f.type.startsWith("video/");
    if (!ok) {
      toast.error("Please choose an MP4, WebM, MOV, AVI or MKV video.");
      return;
    }

    // Reset previous session
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (origUrl) URL.revokeObjectURL(origUrl);

    const url = URL.createObjectURL(f);
    setFile(f);
    setOrigUrl(url);
    setCleanUrl(null);
    setDownloadUrl(null);
    setJobId(null);
    setIsDone(false);
    setIsProcessing(false);
    setIsError(false);
    setProgress(0);
    setCurrentTime(0);
    setSeekValue(0);
    setIsPlaying(false);
    setStatusMsg("Reading video metadata...");
    toast.success(`Loaded "${f.name}". Ready for processing.`);
  };

  // Clipboard Paste Handler (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      const clipFiles = Array.from(e.clipboardData?.files || []);
      const vidFile = clipFiles.find((f) => f.type.startsWith("video/") || /\.(mp4|mov|webm|avi|mkv)$/i.test(f.name));
      if (vidFile) {
        e.preventDefault();
        loadFile(vidFile);
        return;
      }
      const items = Array.from(e.clipboardData?.items || []);
      const vidItem = items.find((it) => it.type.startsWith("video/"));
      if (vidItem) {
        const itemFile = vidItem.getAsFile();
        if (itemFile) {
          e.preventDefault();
          loadFile(itemFile);
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // Synchronized playback controls
  const playBoth = () => {
    const vO = origVideoRef.current;
    const vP = procVideoRef.current;
    if (vO) vO.play().catch(() => {});
    if (isDone && vP) vP.play().catch(() => {});
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

    // Keep processed video in sync with original
    const vP = procVideoRef.current;
    if (isDone && vP && Math.abs(vP.currentTime - vO.currentTime) > 0.25) {
      vP.currentTime = vO.currentTime;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setSeekValue(val);
    const dur = origVideoRef.current?.duration || 0;
    const targetTime = (val / 1000) * dur;
    if (origVideoRef.current) origVideoRef.current.currentTime = targetTime;
    if (isDone && procVideoRef.current) procVideoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const toggleMute = () => {
    if (origVideoRef.current) {
      origVideoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Reset State
  const resetState = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pauseBoth();
    if (origUrl) URL.revokeObjectURL(origUrl);
    setFile(null);
    setOrigUrl(null);
    setCleanUrl(null);
    setDownloadUrl(null);
    setJobId(null);
    setIsDone(false);
    setIsProcessing(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setSeekValue(0);
    setStatusMsg("Ready to process. Click Remove Watermark.");
    setIsError(false);
  };

  // Start Watermark Removal via Backend /api/upload
  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    setIsError(false);
    setStatusMsg("Uploading video...");
    setProgress(2);

    try {
      const fd = new FormData();
      fd.append("video", file);

      const res = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      const currentJobId = data.job_id;
      setJobId(currentJobId);

      // Start polling status
      pollTimerRef.current = setInterval(async () => {
        try {
          const sRes = await fetch(`${API_BASE}/api/status/${currentJobId}`);
          const sData = await sRes.json();
          if (sData.status === "error") {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setIsProcessing(false);
            setIsError(true);
            const err = sData.error || "Processing failed";
            setStatusMsg(err);
            toast.error(err);
            return;
          }

          setStatusMsg(sData.stage || "Processing...");
          setProgress(sData.progress || 0);

          if (sData.status === "done") {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            const resultUrl = `${API_BASE}/api/result/${currentJobId}`;
            const dlUrl = `${API_BASE}/api/download/${currentJobId}`;
            setCleanUrl(resultUrl);
            setDownloadUrl(dlUrl);
            setIsDone(true);
            setIsProcessing(false);
            setProgress(100);
            setStatusMsg("Done. Left is the original, right has the watermark removed.");
            toast.success("Watermark removed! Clean video is ready.");
            try {
              useUserStore.getState().addJob({
                file_name: file.name,
                file_type: "video",
                status: "completed",
                quality: "1080p Clean",
                credits_used: 1,
                file_url: origUrl || undefined,
                result_url: dlUrl,
              });
            } catch (jobErr) {
              console.error("Failed to add video job to history:", jobErr);
            }

            // Start synchronized playback
            setTimeout(() => {
              if (origVideoRef.current) origVideoRef.current.currentTime = 0;
              if (procVideoRef.current) procVideoRef.current.currentTime = 0;
              playBoth();
            }, 300);
          }
        } catch (pollErr: any) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setIsProcessing(false);
          setIsError(true);
          const msg = `Cannot reach server: ${pollErr.message}`;
          setStatusMsg(msg);
          toast.error(msg);
        }
      }, 1000);
    } catch (err: any) {
      setIsProcessing(false);
      setIsError(true);
      const msg = err.message || "Failed to upload video";
      setStatusMsg(msg);
      toast.error(msg);
    }
  };

  /* -------------------------------------------------------------------------- */
  /* STEP 1: UPLOAD BOX (MATCHING SCREENSHOT 3)                                 */
  /* -------------------------------------------------------------------------- */
  if (!origUrl || !file) {
    return (
      <div className="w-full">
        <div
          className={`relative flex min-h-[460px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-16 sm:py-20 text-center transition-all duration-300 ${
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
          {/* Animated Glowing Pink Cloud Icon */}
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

          

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#10241e] hover:bg-[#18362d] text-[#d0f471] px-8 py-3.5 text-base sm:text-lg font-bold rounded-2xl shadow-lg transition-all cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <UploadCloud className="size-4 mr-1" /> Browse Video
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
              className="inline-flex items-center gap-2 rounded-xl border border-[#10241e]/20 bg-[#f3f4ee] hover:bg-[#e9ece4] text-[#10241e] px-6 py-3.5 text-sm sm:text-base font-semibold rounded-2xl shadow-xs transition-all"
            >
              <Copy className="size-4 text-[#10241e]" />
              <span>Paste from Clipboard</span>
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-[#637069]">
            <ShieldCheck className="size-4 text-[#10241e]" />
            <span>Real frame-by-frame neural inpainting • 100% Private local processing</span>
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
  /* STEP 2: SIDE-BY-SIDE COMPARISON WORKSPACE (MATCHING SCREENSHOT 2)          */
  /* -------------------------------------------------------------------------- */
  return (
    <div className="w-full rounded-3xl border border-[#10241e]/15 bg-white p-6 sm:p-8 shadow-2xl rounded-3xl space-y-6">
      {/* 2-Pane Side-by-Side Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden border border-[#10241e]/15 bg-[#f3f4ee]">
        {/* Left Pane: Original */}
        <div className="relative aspect-video bg-[#0a0a0a] flex items-center justify-center">
          <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-lg bg-black/85 border border-[#333] text-white text-xs font-semibold">
            Original
          </span>
          <video
            ref={origVideoRef}
            src={origUrl}
            playsInline
            preload="auto"
            className="w-full h-full object-contain bg-black"
            onLoadedMetadata={() => {
              if (origVideoRef.current) {
                setDuration(origVideoRef.current.duration || 0);
              }
              setStatusMsg("Ready to process. Click Remove Watermark.");
            }}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
          />
        </div>

        {/* Right Pane: Processed */}
        <div className="relative aspect-video bg-[#0e0e0e] flex items-center justify-center border-t md:border-t-0 md:border-l border-[#262626]">
          <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-lg bg-black/85 border border-[#333] text-white text-xs font-semibold">
            Processed
          </span>

          {!isProcessing && !isDone && (
            <div className="text-center p-6 text-[#9ca3af]">
              <div className="text-base font-semibold text-white mb-1">Ready to process</div>
              <small className="block text-xs text-[#6b7280]">
                Preview and export run at the source resolution.
              </small>
            </div>
          )}

          {isProcessing && (
            <div className="text-center p-6 text-[#9ca3af]">
              <div className="w-8 h-8 rounded-full border-3 border-[#333] border-t-[#E11D48] animate-spin mx-auto mb-3" />
              <div className="text-sm font-semibold text-white">Processing. Keep this tab open.</div>
              <small className="block text-xs text-[#10241e] mt-1 font-mono">{progress}% complete</small>
            </div>
          )}

          {isDone && cleanUrl && (
            <video
              ref={procVideoRef}
              src={cleanUrl}
              playsInline
              preload="auto"
              muted
              className="w-full h-full object-contain bg-black"
            />
          )}
        </div>
      </div>

      {/* Synchronized Playback Control Bar */}
      <div className="flex items-center gap-3 px-3 py-2.5 bg-[#f3f4ee] rounded-2xl border border-[#10241e]/15 p-3">
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
          className="flex-1 accent-[#10241e] cursor-pointer h-1.5 bg-[#2a2a2a] rounded-lg"
          aria-label="Seek video"
        />

        <span className="min-w-[84px] text-right font-mono text-sm font-mono font-semibold text-[#10241e]">
          {fmt(currentTime)} / {fmt(duration)}
        </span>

        <button
          type="button"
          onClick={toggleMute}
          className="size-8 rounded-lg bg-[#202020] hover:bg-[#2a2a2a] text-[#9ca3af] hover:text-white flex items-center justify-center transition-all cursor-pointer"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="size-4 text-[#10241e]" /> : <Volume2 className="size-4" />}
        </button>
      </div>

      {/* Status & Progress Bar */}
      <div className="border border-[#10241e]/15 rounded-2xl p-4 sm:p-5 bg-[#f3f4ee]">
        <div className="flex items-center justify-between text-sm sm:text-base font-bold">
          <span className={`font-medium ${isError ? "text-rose-400" : isDone ? "text-emerald-400" : "text-[#10241e]"}`}>
            {statusMsg}
          </span>
          <span className="font-mono text-sm font-mono font-semibold text-[#10241e]">{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-[#242424] rounded-full overflow-hidden mt-2.5">
          <div
            className="h-full bg-[#10241e] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-[#333] bg-[#1e1e1e] hover:bg-[#262626] text-white px-4 py-2.5 text-sm sm:text-base font-bold font-semibold transition-all cursor-pointer disabled:opacity-50"
        >
          <Upload className="size-4 text-[#10241e]" />
          Choose another
        </button>

        <button
          type="button"
          disabled={isProcessing}
          onClick={resetState}
          className="inline-flex items-center gap-2 rounded-xl border border-[#333] bg-[#1e1e1e] hover:bg-[#262626] text-white px-4 py-2.5 text-sm sm:text-base font-bold font-semibold transition-all cursor-pointer disabled:opacity-50"
        >
          <RotateCcw className="size-4" />
          Reset
        </button>

        {!isDone ? (
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleProcess}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E11D48] to-[#FF2E63] hover:brightness-110 text-white px-6 py-2.5 text-sm sm:text-base font-bold font-bold shadow-lg shadow-rose-950/40 transition-all cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Removing Watermark...
              </>
            ) : (
              "Remove Watermark"
            )}
          </button>
        ) : (
          <a
            href={downloadUrl || "#"}
            download={`cleaned-${file.name}`}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E11D48] to-[#FF2E63] hover:brightness-110 text-white px-6 py-2.5 text-sm sm:text-base font-bold font-bold shadow-lg shadow-rose-950/40 transition-all cursor-pointer"
          >
            <Download className="size-4" />
            Download MP4
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
