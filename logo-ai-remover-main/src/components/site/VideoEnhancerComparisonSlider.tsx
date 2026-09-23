import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { Sparkles, Play, Pause, Volume2, VolumeX, CheckCircle2, Download } from "lucide-react";

interface VideoEnhancerComparisonSliderProps {
  originalSrc: string;
  enhancedSrc: string;
  originalLabel?: string;
  enhancedLabel?: string;
  onDownload?: () => void;
  downloadFilename?: string;
}

export function VideoEnhancerComparisonSlider({
  originalSrc,
  enhancedSrc,
  originalLabel = "Original",
  enhancedLabel = "Enhanced",
  onDownload,
  downloadFilename = "enhanced-video.mp4",
}: VideoEnhancerComparisonSliderProps) {
  const [pos, setPos] = useState(50);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const originalVideoRef = useRef<HTMLVideoElement>(null);
  const enhancedVideoRef = useRef<HTMLVideoElement>(null);
  const dragging = useRef(false);

  // Synchronize playback between both videos
  useEffect(() => {
    const vOriginal = originalVideoRef.current;
    const vEnhanced = enhancedVideoRef.current;
    if (!vOriginal || !vEnhanced) return;

    const syncTime = () => {
      if (Math.abs(vOriginal.currentTime - vEnhanced.currentTime) > 0.08) {
        vOriginal.currentTime = vEnhanced.currentTime;
      }
    };

    vEnhanced.addEventListener("timeupdate", syncTime);
    return () => {
      vEnhanced.removeEventListener("timeupdate", syncTime);
    };
  }, []);

  const handleMove = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setPos(x);
  }, []);

  const togglePlay = (e: MouseEvent) => {
    e.stopPropagation();
    const vOriginal = originalVideoRef.current;
    const vEnhanced = enhancedVideoRef.current;
    if (!vOriginal || !vEnhanced) return;

    if (vEnhanced.paused) {
      vOriginal.play().catch(() => {});
      vEnhanced.play().catch(() => {});
      setIsPlaying(true);
    } else {
      vOriginal.pause();
      vEnhanced.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e: MouseEvent) => {
    e.stopPropagation();
    const vOriginal = originalVideoRef.current;
    const vEnhanced = enhancedVideoRef.current;
    if (!vOriginal || !vEnhanced) return;
    const nextMuted = !vEnhanced.muted;
    vOriginal.muted = nextMuted;
    vEnhanced.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleDownload = (e: MouseEvent) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload();
      return;
    }
    const a = document.createElement("a");
    a.href = enhancedSrc;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="relative w-full select-none space-y-3">
      {/* Video Comparison Container */}
      <div
        ref={containerRef}
        className="relative aspect-video w-full cursor-ew-resize overflow-hidden rounded-3xl border border-[#FCE7EC] bg-black shadow-[0_20px_60px_-15px_rgba(225,29,72,0.25)] group"
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
        {/* Layer 1 (Bottom): Enhanced Video */}
        <video
          ref={enhancedVideoRef}
          src={enhancedSrc}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          className="size-full object-contain pointer-events-none"
        />

        {/* Layer 2 (Top): Original Video with Clip-Path */}
        <div
          className="absolute inset-0 pointer-events-none transition-none overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        >
          <video
            ref={originalVideoRef}
            src={originalSrc}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="size-full object-contain pointer-events-none"
          />
        </div>

        {/* AFTER SIDE: ENHANCED RESOLUTION BADGE */}
        <div
          className="absolute inset-0 pointer-events-none transition-none"
          style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
        >
          <div className="absolute bottom-5 right-5 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 text-green-700 text-xs font-bold border border-green-200 shadow-md backdrop-blur-md">
            <CheckCircle2 className="size-4 text-green-600" />
            <span>{enhancedLabel}</span>
          </div>
        </div>

        {/* VERTICAL SLIDER LINE & DRAG HANDLE */}
        <div
          className="absolute inset-y-0 w-1 bg-gradient-to-b from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] shadow-[0_0_12px_rgba(225,29,72,0.8)] z-30"
          style={{ left: `${pos}%` }}
        >
          <div className="absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-gradient-to-tr from-[#E11D48] to-[#FF4FA3] text-white shadow-[0_4px_20px_rgba(225,29,72,0.6)] group-hover:scale-110 active:scale-95 transition-transform cursor-ew-resize">
            <span className="text-sm font-semibold select-none tracking-tighter">⇄</span>
          </div>
        </div>

        {/* TOP LEFT BADGE: ORIGINAL */}
        <div className="absolute top-4 left-4 z-20 pointer-events-none">
          <span className="rounded-full border border-gray-200/80 bg-black/60 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-md shadow-xs flex items-center gap-2">
            <span>{originalLabel}</span>
          </span>
        </div>

        {/* TOP RIGHT BADGE: ENHANCED */}
        <div className="absolute top-4 right-4 z-20 pointer-events-none">
          <span className="rounded-full border border-[#FCE7EC] bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-[#E11D48] backdrop-blur-md shadow-xs flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-[#E11D48]" />
            <span>AI Super-Resolution</span>
          </span>
        </div>

        {/* CONTROLS OVERLAY */}
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
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#E11D48] to-[#FF4FA3] text-white text-xs font-bold hover:brightness-105 shadow-sm transition-all cursor-pointer"
            title="Download Enhanced Video"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Download Video</span>
          </button>
        </div>
      </div>

      {/* Helper text */}
      <div className="text-center text-xs font-semibold text-gray-500 flex items-center justify-center gap-2">
        <span className="text-[#E11D48] font-bold">⇄ Drag the slider:</span>
        <span>Left reveals the source video • Right reveals the neural AI-enhanced video</span>
      </div>
    </div>
  );
}
