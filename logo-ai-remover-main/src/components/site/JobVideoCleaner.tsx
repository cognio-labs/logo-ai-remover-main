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
  Sliders,
  Sparkles,
  Eye,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import {
  applyGeminiFrameUnblend,
  getGeminiCoordinates,
  processGeminiVideoWithMask,
} from "@/lib/clearCornerEngine";

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

  const [dragOver, setDragOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekValue, setSeekValue] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Calibration Settings
  const [alpha, setAlpha] = useState(0.55); // 0.40 to 0.70
  const [sizePct, setSizePct] = useState(7.2); // 3% to 15%
  const [distancePct, setDistancePct] = useState(4.2); // 1% to 12%
  const [enableEdgeBlur, setEnableEdgeBlur] = useState(true);
  const [showTargetBox, setShowTargetBox] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Video Dimensions
  const [dimensions, setDimensions] = useState({ width: 1280, height: 720 });

  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [statusMsg, setStatusMsg] = useState("Ready to process. Calibrate alpha & export.");
  const [progress, setProgress] = useState(0);
  const [isError, setIsError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const origVideoRef = useRef<HTMLVideoElement>(null);
  const procVideoRef = useRef<HTMLVideoElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (origUrl) URL.revokeObjectURL(origUrl);
      if (cleanUrl) URL.revokeObjectURL(cleanUrl);
    };
  }, [origUrl, cleanUrl]);

  // Update Live Preview Canvas with frame unblending
  const updateLivePreview = useCallback(() => {
    const video = origVideoRef.current;
    const canvas = previewCanvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const w = video.videoWidth || dimensions.width;
    const h = video.videoHeight || dimensions.height;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const coords = getGeminiCoordinates(w, h, sizePct, distancePct);
    applyGeminiFrameUnblend(ctx, video, coords.cx, coords.cy, coords.size, alpha);
  }, [alpha, sizePct, distancePct, dimensions]);

  // Trigger preview update on calibration change
  useEffect(() => {
    if (!isDone && origVideoRef.current) {
      updateLivePreview();
    }
  }, [alpha, sizePct, distancePct, isDone, updateLivePreview]);

  // Load Video File
  const loadFile = (f: File) => {
    const ok = /\.(mp4|mov|webm|avi|mkv)$/i.test(f.name) || f.type.startsWith("video/");
    if (!ok) {
      toast.error("Please choose an MP4, WebM, MOV, AVI or MKV video.");
      return;
    }

    if (origUrl) URL.revokeObjectURL(origUrl);
    if (cleanUrl) URL.revokeObjectURL(cleanUrl);

    const url = URL.createObjectURL(f);
    setFile(f);
    setOrigUrl(url);
    setCleanUrl(null);
    setDownloadUrl(null);
    setIsDone(false);
    setIsProcessing(false);
    setIsError(false);
    setProgress(0);
    setCurrentTime(0);
    setSeekValue(0);
    setIsPlaying(false);
    setStatusMsg("Calibrate alpha strength on the preview frame, then export.");
    toast.success(`Loaded "${f.name}". Ready for in-browser cleanup.`);
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
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // Synchronized Playback
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
    if (isDone && vP) vP.pause();
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

  const resetState = () => {
    pauseBoth();
    if (origUrl) URL.revokeObjectURL(origUrl);
    if (cleanUrl) URL.revokeObjectURL(cleanUrl);
    setFile(null);
    setOrigUrl(null);
    setCleanUrl(null);
    setDownloadUrl(null);
    setIsDone(false);
    setIsProcessing(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setSeekValue(0);
    setStatusMsg("Ready to process.");
    setIsError(false);
  };

  // In-Browser Watermark Removal via FFmpeg.wasm (No Server / No Failed to Fetch)
  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    setIsError(false);
    setStatusMsg("Loading in-browser neural engine...");
    setProgress(2);

    try {
      const v = origVideoRef.current;
      const w = v?.videoWidth || dimensions.width;
      const h = v?.videoHeight || dimensions.height;

      setStatusMsg("Processing video frames with mathematical unblending...");

      const result = await processGeminiVideoWithMask(
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
          setProgress(Math.round(pct * 100));
          setStatusMsg(`Rendering clean frames... ${Math.round(pct * 100)}%`);
        }
      );

      setCleanUrl(result.url);
      setDownloadUrl(result.url);
      setIsDone(true);
      setIsProcessing(false);
      setProgress(100);
      setStatusMsg("Watermark removed successfully with zero quality loss!");
      toast.success("Done! Clean HD MP4 is ready.");

      try {
        useUserStore.getState().addJob({
          file_name: file.name,
          file_type: "video",
          status: "completed",
          quality: "Original HD",
          credits_used: 1,
          file_url: origUrl || undefined,
          result_url: result.url,
        });
      } catch (jobErr) {
        console.error("Failed to add video job to history:", jobErr);
      }

      // Synchronize playback
      setTimeout(() => {
        if (origVideoRef.current) origVideoRef.current.currentTime = 0;
        if (procVideoRef.current) procVideoRef.current.currentTime = 0;
        playBoth();
      }, 300);
    } catch (err: any) {
      setIsProcessing(false);
      setIsError(true);
      const msg = err.message || "In-browser video processing failed";
      setStatusMsg(`Error: ${msg}`);
      toast.error(msg);
    }
  };

  // Calculate coordinates for visual target overlay box
  const targetCoords = getGeminiCoordinates(dimensions.width, dimensions.height, sizePct, distancePct);
  const targetStyle = {
    width: `${(targetCoords.size / dimensions.width) * 100}%`,
    height: `${(targetCoords.size / dimensions.height) * 100}%`,
    left: `${((targetCoords.cx - targetCoords.size / 2) / dimensions.width) * 100}%`,
    top: `${((targetCoords.cy - targetCoords.size / 2) / dimensions.height) * 100}%`,
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
          {/* Animated Glowing Cloud Icon */}
          <div className="relative mb-2">
            <span className="flex size-24 items-center justify-center rounded-3xl bg-[#10241e] text-[#d0f471] shadow-[0_12px_32px_rgba(16,36,30,0.2)] transition-transform duration-300 hover:scale-105">
              <UploadCloud className="size-11 animate-pulse" />
            </span>
            <span className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-[#d0f471] border border-[#10241e]/20 text-[#091712] shadow-xs">
              <Film className="size-4" />
            </span>
          </div>

          <h3 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#10241e]">
            Drop your Gemini video here
          </h3>

          <p className="mt-3 text-sm sm:text-base text-[#637069] max-w-lg">
            Supports MP4, MOV, WebM, AVI & MKV up to 4K resolution. Runs 100% locally in your browser with zero server upload.
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
              className="inline-flex items-center gap-2 rounded-2xl border border-[#10241e]/20 bg-[#f3f4ee] hover:bg-[#e9ece4] text-[#10241e] px-6 py-3.5 text-sm sm:text-base font-semibold shadow-xs transition-all"
            >
              <Copy className="size-4 text-[#10241e]" />
              <span>Paste from Clipboard</span>
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs sm:text-sm font-medium text-[#637069]">
            <ShieldCheck className="size-4 text-[#10241e]" />
            <span>Mathematical Alpha Unblending • Zero Quality Loss • 100% In-Browser</span>
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
  /* STEP 2: SIDE-BY-SIDE VIDEO WORKSPACE WITH REAL-TIME CALIBRATION            */
  /* -------------------------------------------------------------------------- */
  return (
    <div className="w-full rounded-3xl border border-[#10241e]/15 bg-white p-6 sm:p-8 shadow-2xl space-y-6 text-left">
      {/* 2-Pane Side-by-Side Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden border border-[#10241e]/15 bg-[#f3f4ee]">
        {/* Left Pane: Original */}
        <div className="relative aspect-video bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
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
                setTimeout(updateLivePreview, 150);
              }
            }}
            onSeeked={updateLivePreview}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
          />

          {/* Visual Target Box Indicator */}
          {showTargetBox && !isDone && (
            <div
              className="absolute border-2 border-dashed border-[#d0f471] pointer-events-none rounded-lg transition-all"
              style={targetStyle}
            >
              <span className="absolute -top-5 right-0 bg-[#d0f471] text-[#10241e] text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow-xs whitespace-nowrap">
                ✦ Logo Target
              </span>
            </div>
          )}
        </div>

        {/* Right Pane: Processed Video OR Live Frame Preview */}
        <div className="relative aspect-video bg-[#0e0e0e] flex items-center justify-center border-t md:border-t-0 md:border-l border-[#262626] overflow-hidden">
          <span className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full bg-[#10241e]/90 border border-[#d0f471]/30 text-[#d0f471] text-xs font-bold tracking-wide flex items-center gap-1.5">
            <Sparkles className="size-3 text-[#d0f471]" />
            <span>{isDone ? "Clean Video Output" : "Live Frame 1 Calibration Preview"}</span>
          </span>

          {/* 1. Live Calibration Preview Canvas (shown before full video export) */}
          {!isDone && (
            <canvas
              ref={previewCanvasRef}
              className="w-full h-full object-contain bg-black"
            />
          )}

          {/* 2. Processing Spinner Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 z-20 bg-black/85 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-[#d0f471] animate-spin mb-4" />
              <div className="text-base font-bold text-white mb-1">Processing in your browser</div>
              <p className="text-xs text-[#a0af9f] font-mono">{progress}% complete • keep tab open</p>
              <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-[#d0f471] transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* 3. Final Rendered Video Player */}
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

      {/* Calibration Controls Bar: original = (watermarked − α·255) / (1 − α) */}
      {!isDone && (
        <div className="rounded-2xl border border-[#10241e]/15 bg-[#f3f4ee] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#10241e]/10 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="size-4 text-[#10241e]" />
              <span className="font-bold text-sm text-[#10241e]">Live Alpha Calibration</span>
              <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-[#10241e]/15 font-semibold text-[#10241e]">
                α = {alpha.toFixed(2)} ({Math.round(alpha * 100)}%)
              </span>
            </div>
            <div className="text-xs text-[#52645d] font-medium">
              Formula: <code className="bg-white px-1.5 py-0.5 rounded border border-[#10241e]/10 text-[11px] font-mono text-[#10241e]">original = (watermark - α·255) / (1 - α)</code>
            </div>
          </div>

          {/* Alpha Calibration Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[#37433d]">
              <span className="font-medium">Alpha Blending Strength (0.40 – 0.70)</span>
              <span className="font-mono text-[#10241e] font-bold">{alpha.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.40}
              max={0.70}
              step={0.01}
              value={alpha}
              disabled={isProcessing}
              onChange={(e) => setAlpha(Number(e.target.value))}
              className="w-full accent-[#10241e] cursor-pointer h-2.5 bg-gray-300 rounded-lg"
            />
            {/* Real-time calibration tips */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="bg-white/80 p-2 rounded-xl border border-[#10241e]/10 text-[#37433d]">
                <b className="text-[#10241e]">White star visible?</b> Slide right (increase α)
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-[#10241e]/10 text-[#37433d]">
                <b className="text-[#10241e]">Dark star forming?</b> Slide left (decrease α)
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-[#10241e]/10 text-[#10241e] font-semibold flex items-center gap-1">
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                <span>Star disappears? Click Remove Watermark!</span>
              </div>
            </div>
          </div>

          {/* Toggle Advanced Position & Size */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-bold text-[#10241e] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>{showAdvanced ? "Hide Fine-Tuning" : "Fine-tune Logo Position & Edge Blur"}</span>
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 mt-3 border-t border-[#10241e]/10">
                <label className="text-xs text-[#37433d] space-y-1 block">
                  <div className="flex justify-between font-semibold">
                    <span>Logo Size</span>
                    <span className="font-mono">{sizePct}%</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={14}
                    step={0.2}
                    value={sizePct}
                    onChange={(e) => setSizePct(Number(e.target.value))}
                    className="w-full accent-[#10241e] cursor-pointer h-1.5 bg-gray-300 rounded"
                  />
                </label>

                <label className="text-xs text-[#37433d] space-y-1 block">
                  <div className="flex justify-between font-semibold">
                    <span>Edge Distance</span>
                    <span className="font-mono">{distancePct}%</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={0.2}
                    value={distancePct}
                    onChange={(e) => setDistancePct(Number(e.target.value))}
                    className="w-full accent-[#10241e] cursor-pointer h-1.5 bg-gray-300 rounded"
                  />
                </label>

                <div className="flex flex-col justify-center gap-1.5 pt-2 sm:pt-0">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#10241e] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableEdgeBlur}
                      onChange={(e) => setEnableEdgeBlur(e.target.checked)}
                      className="accent-[#10241e] size-4 rounded cursor-pointer"
                    />
                    <span>1px Edge De-ghosting Blur</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#10241e] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showTargetBox}
                      onChange={(e) => setShowTargetBox(e.target.checked)}
                      className="accent-[#10241e] size-4 rounded cursor-pointer"
                    />
                    <span>Show Target Box on Video</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status & Progress */}
      <div className="border border-[#10241e]/15 rounded-2xl p-4 sm:p-5 bg-[#f3f4ee]">
        <div className="flex items-center justify-between text-sm sm:text-base font-bold">
          <span className={`font-semibold ${isError ? "text-rose-600" : isDone ? "text-emerald-700" : "text-[#10241e]"}`}>
            {statusMsg}
          </span>
          <span className="font-mono text-sm font-bold text-[#10241e]">{progress}%</span>
        </div>
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mt-2.5">
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
          className="inline-flex items-center gap-2 rounded-xl border border-[#10241e]/20 bg-white hover:bg-[#f3f4ee] text-[#10241e] px-5 py-3 text-sm font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
        >
          <Upload className="size-4 text-[#10241e]" />
          Choose another
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
            onClick={handleProcess}
            className="inline-flex items-center gap-2 rounded-xl bg-[#10241e] hover:bg-[#18362d] text-[#d0f471] px-8 py-3 text-sm sm:text-base font-bold shadow-xl transition-all cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <span className="size-4 border-2 border-[#d0f471] border-t-transparent rounded-full animate-spin" />
                Removing Watermark ({progress}%)...
              </>
            ) : (
              <>
                <Sparkles className="size-4 text-[#d0f471]" />
                <span>Remove Watermark (In-Browser HD)</span>
              </>
            )}
          </button>
        ) : (
          <a
            href={downloadUrl || "#"}
            download={`cleaned-${file.name}`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#10241e] hover:bg-[#18362d] text-[#d0f471] px-8 py-3 text-sm sm:text-base font-bold shadow-xl transition-all cursor-pointer"
          >
            <Download className="size-4" />
            Download Clean MP4 (Original HD)
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
