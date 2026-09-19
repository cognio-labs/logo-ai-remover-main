import React, { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, Play, Pause, Volume2, VolumeX, CheckCircle2, Download } from "lucide-react";
import { toast } from "sonner";

interface VideoBeforeAfterSliderProps {
  cleanVideoSrc?: string;
  watermarkedVideoSrc?: string;
  videoSrc?: string;
  logoText?: string;
}

export function VideoBeforeAfterSlider({
  cleanVideoSrc = "/hero-clean-video.mp4",
  watermarkedVideoSrc = "/hero-original-video.mp4",
  videoSrc,
  logoText = "Gemini AI",
}: VideoBeforeAfterSliderProps) {
  const finalCleanSrc = cleanVideoSrc || videoSrc || "/hero-clean-video.mp4";
  const finalWatermarkedSrc = watermarkedVideoSrc || "/hero-original-video.mp4";

  const [pos, setPos] = useState(50);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const cleanVideoRef = useRef<HTMLVideoElement>(null);
  const wmVideoRef = useRef<HTMLVideoElement>(null);
  const dragging = useRef(false);

  // Synchronize playback between both videos
  useEffect(() => {
    const vClean = cleanVideoRef.current;
    const vWm = wmVideoRef.current;
    if (!vClean || !vWm) return;

    const syncTime = () => {
      if (Math.abs(vWm.currentTime - vClean.currentTime) > 0.08) {
        vWm.currentTime = vClean.currentTime;
      }
    };

    vClean.addEventListener("timeupdate", syncTime);
    return () => {
      vClean.removeEventListener("timeupdate", syncTime);
    };
  }, []);

  const handleMove = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setPos(x);
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const vClean = cleanVideoRef.current;
    const vWm = wmVideoRef.current;
    if (!vClean || !vWm) return;

    if (vClean.paused) {
      vClean.play().catch(() => {});
      vWm.play().catch(() => {});
      setIsPlaying(true);
    } else {
      vClean.pause();
      vWm.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const vClean = cleanVideoRef.current;
    const vWm = wmVideoRef.current;
    if (!vClean || !vWm) return;
    const nextMuted = !vClean.muted;
    vClean.muted = nextMuted;
    vWm.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleDownloadClean = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement("a");
    a.href = finalCleanSrc;
    a.download = "pixelrefine_mountain_lake_clean_1080p.mp4";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Downloading 8-second 1080p clean video!");
  };

  return (
    <div className="relative w-full select-none">
      {/* Main Video Comparison Container */}
      <div
        ref={containerRef}
        className="relative aspect-video w-full cursor-ew-resize overflow-hidden rounded-3xl border border-[#FCE7EC] bg-black shadow-[0_20px_60px_-15px_rgba(225,29,72,0.22)] group"
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          handleMove(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragging.current) handleMove(e.clientX);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
      >
        {/* Layer 1 (Bottom): Clean Watermark-Free 1080p Video */}
        <video
          ref={cleanVideoRef}
          src={finalCleanSrc}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          className="size-full object-cover pointer-events-none"
        />

        {/* Layer 2 (Top): Original Video with Gemini AI Watermark & Center Watermark */}
        <div
          className="absolute inset-0 pointer-events-none transition-none overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        >
          <video
            ref={wmVideoRef}
            src={finalWatermarkedSrc}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="size-full object-cover pointer-events-none"
          />
        </div>

        {/* AFTER SIDE: CLEAN INDICATION BADGE */}
        <div
          className="absolute inset-0 pointer-events-none transition-none"
          style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
        >
          <div className="absolute bottom-5 right-5 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 text-green-700 text-xs font-bold border border-green-200 shadow-md backdrop-blur-md">
            <CheckCircle2 className="size-4 text-green-600" />
            <span>AI Watermarks Erased • 1080p Full HD</span>
          </div>
        </div>

        {/* VERTICAL RED SLIDER LINE & CIRCULAR DRAG HANDLE */}
        <div
          className="absolute inset-y-0 w-1 bg-gradient-to-b from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] shadow-[0_0_12px_rgba(225,29,72,0.8)] z-30"
          style={{ left: `${pos}%` }}
        >
          {/* Round handle in the middle */}
          <div className="absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-gradient-to-tr from-[#E11D48] to-[#FF4FA3] text-white shadow-[0_4px_20px_rgba(225,29,72,0.6)] group-hover:scale-110 active:scale-95 transition-transform cursor-ew-resize">
            <span className="text-sm font-semibold select-none tracking-tighter">⇄</span>
          </div>
        </div>

        {/* TOP BADGES */}
        <div className="absolute top-4 left-4 z-20 pointer-events-none">
          <span className="rounded-full border border-gray-200/80 bg-white/90 px-3.5 py-1.5 text-xs font-bold text-gray-800 backdrop-blur-md shadow-xs flex items-center gap-2">
            <img src="/gemini-logo.png" alt="Gemini" className="size-4 object-contain" />
            <span>Original (Gemini Logo)</span>
          </span>
        </div>

        <div className="absolute top-4 right-4 z-20 pointer-events-none">
          <span className="rounded-full border border-[#FCE7EC] bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-[#E11D48] backdrop-blur-md shadow-xs flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-[#E11D48]" />
            <span>Cleaned (Logo Erased)</span>
          </span>
        </div>

        {/* TOP CENTER CONTROLS (Play/Pause, Mute & Direct Download) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs font-bold backdrop-blur-md transition-colors cursor-pointer border border-white/20 shadow-sm"
          >
            {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5 ml-0.5" />}
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>

          <button
            onClick={toggleMute}
            className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors cursor-pointer border border-white/20 shadow-sm"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
          </button>

          <button
            onClick={handleDownloadClean}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#E11D48] to-[#FF4FA3] text-white text-xs font-bold hover:brightness-105 shadow-sm transition-all cursor-pointer"
            title="Download Clean Video"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Download Clean</span>
          </button>
        </div>
      </div>

      {/* Helper text below card */}
      <div className="mt-3 text-center text-xs font-semibold text-gray-500 flex items-center justify-center gap-2">
        <span className="text-[#E11D48] font-bold">⇄ Drag the red line:</span>
        <span>Left shows video with Gemini logo • Right reveals pristine video with logo removed</span>
      </div>
    </div>
  );
}
