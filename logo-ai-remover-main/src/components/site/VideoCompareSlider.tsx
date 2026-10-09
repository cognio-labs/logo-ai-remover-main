import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ChevronsLeftRight,
  Sparkles,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";

export type VideoCompareSliderProps = {
  /** The watermarked or original source URL (shown on left) */
  beforeSrc: string;
  /** The clean or AI-enhanced source URL (shown on right) */
  afterSrc: string;
  /** Left badge label, defaults to "BEFORE (WATERMARKED)" */
  beforeLabel?: string;
  /** Right badge label, defaults to "AFTER (CLEAN)" */
  afterLabel?: string;
  /** CSS aspect ratio class, e.g. "aspect-video" (16:9) or custom */
  aspectRatio?: string;
  className?: string;
  /** Autoplay videos on mount */
  autoPlay?: boolean;
  /** Loop videos continuously */
  loop?: boolean;
  /** Initial slider divider position in percent (0 to 100), defaults to 50 */
  initialSliderPos?: number;
  /** Default object fit mode for video frames */
  defaultFit?: "cover" | "contain";
  /** Optional pink watermark removal box on the before side */
  watermarkRegion?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  showWatermarkBox?: boolean;
  /** Custom badge or status indicator displayed on the clean/after side */
  statusBadge?: React.ReactNode;
  /** Callback fired when slider handle moves */
  onPositionChange?: (pos: number) => void;
};

function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Seamless "Before/After" Video Comparison Slider.
 * Overlays clean output on top of watermarked original with frame-synchronized
 * dual playback, CSS clip-path mask, draggable divider handle, and custom controls.
 */
export function VideoCompareSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "BEFORE (WATERMARKED)",
  afterLabel = "AFTER (CLEAN)",
  aspectRatio = "aspect-video",
  className = "",
  autoPlay = false,
  loop = true,
  initialSliderPos = 50,
  defaultFit = "cover",
  watermarkRegion,
  showWatermarkBox = false,
  statusBadge,
  onPositionChange,
}: VideoCompareSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const beforeVideoRef = useRef<HTMLVideoElement>(null);
  const afterVideoRef = useRef<HTMLVideoElement>(null);
  const isDraggingSlider = useRef<boolean>(false);
  const syncLockRef = useRef<boolean>(false);

  // Slider position (0 - 100 percent)
  const [sliderPos, setSliderPos] = useState<number>(initialSliderPos);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [fitMode, setFitMode] = useState<"cover" | "contain">(defaultFit);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const hideControlsTimer = useRef<number | null>(null);

  // 1. Synchronized Play / Pause
  const togglePlay = useCallback(async () => {
    const v1 = beforeVideoRef.current;
    const v2 = afterVideoRef.current;
    if (!v1 || !v2) return;

    if (v1.paused) {
      try {
        // Guarantee synchronization before starting
        if (Math.abs(v2.currentTime - v1.currentTime) > 0.04) {
          v2.currentTime = v1.currentTime;
        }
        await Promise.all([v1.play(), v2.play()]);
        setIsPlaying(true);
      } catch (err) {
        console.warn("Video playback was interrupted:", err);
      }
    } else {
      v1.pause();
      v2.pause();
      setIsPlaying(false);
    }
  }, []);

  // 2. Synchronized Timeline Seek
  const handleSeek = (newTime: number) => {
    const v1 = beforeVideoRef.current;
    const v2 = afterVideoRef.current;
    if (!v1 || !v2) return;

    v1.currentTime = newTime;
    v2.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // 3. Synchronized Time Update & Drift Correction
  const handleTimeUpdate = () => {
    const v1 = beforeVideoRef.current;
    const v2 = afterVideoRef.current;
    if (!v1 || !v2) return;

    setCurrentTime(v1.currentTime);
    if (v1.duration && !isNaN(v1.duration) && v1.duration !== duration) {
      setDuration(v1.duration);
    }

    // Bidirectional drift correction (keeps frames locked within 40ms)
    if (!syncLockRef.current && Math.abs(v2.currentTime - v1.currentTime) > 0.04) {
      syncLockRef.current = true;
      v2.currentTime = v1.currentTime;
      requestAnimationFrame(() => {
        syncLockRef.current = false;
      });
    }
  };

  // 4. Reset & Loop
  const handleEnded = () => {
    const v1 = beforeVideoRef.current;
    const v2 = afterVideoRef.current;
    if (!v1 || !v2) return;

    if (loop) {
      v1.currentTime = 0;
      v2.currentTime = 0;
      void v1.play();
      void v2.play();
    } else {
      setIsPlaying(false);
    }
  };

  // 5. Mute toggle (Only v1 plays sound to prevent dual-audio phasing)
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (beforeVideoRef.current) {
      beforeVideoRef.current.muted = nextMuted;
    }
    if (afterVideoRef.current) {
      afterVideoRef.current.muted = true; // Always muted
    }
  };

  // 6. Fullscreen
  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Listen to fullscreen exit via Esc
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // 7. Draggable Slider Pointer Events
  const updatePosition = useCallback(
    (clientX: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPos(percent);
      onPositionChange?.(percent);
    },
    [onPositionChange],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingSlider.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingSlider.current) {
      updatePosition(e.clientX);
    }
    // Reveal control bar on mouse movement
    setShowControls(true);
    if (hideControlsTimer.current) window.clearTimeout(hideControlsTimer.current);
    if (isPlaying) {
      hideControlsTimer.current = window.setTimeout(() => {
        if (!isDraggingSlider.current) setShowControls(false);
      }, 2500);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingSlider.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Auto-play synchronization on mount or source change
  useEffect(() => {
    const v1 = beforeVideoRef.current;
    const v2 = afterVideoRef.current;
    if (!v1 || !v2) return;

    v1.muted = isMuted;
    v2.muted = true; // V2 always muted to prevent audio echo

    if (autoPlay) {
      Promise.all([v1.play(), v2.play()])
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [beforeSrc, afterSrc, autoPlay, isMuted]);

  return (
    <div
      ref={containerRef}
      className={`group relative w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-black border border-gray-900 shadow-2xl select-none ${aspectRatio} ${className}`}
      onPointerMove={handlePointerMove}
      onMouseLeave={() => {
        if (isPlaying && !isDraggingSlider.current) setShowControls(false);
      }}
    >
      {/* ============================================================== */}
      {/* 1. BOTTOM LAYER: BEFORE (WATERMARKED) VIDEO                     */}
      {/* ============================================================== */}
      <video
        ref={beforeVideoRef}
        src={beforeSrc}
        playsInline
        muted={isMuted}
        loop={loop}
        autoPlay={autoPlay}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onEnded={handleEnded}
        className={`absolute inset-0 size-full pointer-events-none transition-all duration-150 ${
          fitMode === "cover" ? "object-cover" : "object-contain"
        }`}
      />

      {/* Optional Watermark Box Overlay on Before Side (erased as handle moves) */}
      {showWatermarkBox && watermarkRegion && (
        <div
          className="pointer-events-none absolute inset-0 z-10 transition-none"
          style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
        >
          <div
            className="absolute rounded-xl border-2 border-dashed border-rose-500 bg-rose-500/25 shadow-[0_0_20px_rgba(244,63,94,0.45)] transition-all"
            style={{
              left: `${watermarkRegion.x * 100}%`,
              top: `${watermarkRegion.y * 100}%`,
              width: `${watermarkRegion.width * 100}%`,
              height: `${watermarkRegion.height * 100}%`,
            }}
          >
            <div className="absolute -top-7 right-0 rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase shadow-md flex items-center gap-1 whitespace-nowrap">
              <Sparkles className="size-2.5" />
              <span>Watermark Target</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. TOP LAYER: AFTER (CLEAN) VIDEO CLIPPED BY SLIDER             */}
      {/* ============================================================== */}
      <div
        className="pointer-events-none absolute inset-0 size-full overflow-hidden select-none transition-none"
        style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
      >
        <video
          ref={afterVideoRef}
          src={afterSrc}
          playsInline
          muted
          loop={loop}
          autoPlay={autoPlay}
          preload="auto"
          className={`size-full pointer-events-none transition-all duration-150 ${
            fitMode === "cover" ? "object-cover" : "object-contain"
          }`}
        />
      </div>

      {/* ============================================================== */}
      {/* 3. INTERACTIVE SLIDER DIVIDER & CENTER CIRCULAR HANDLE          */}
      {/* ============================================================== */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="absolute inset-y-0 z-20 w-12 -ml-6 cursor-ew-resize flex items-center justify-center touch-none group/divider"
        style={{ left: `${sliderPos}%` }}
        title="Drag left or right to compare Before and After"
      >
        {/* Sleek Vertical Divider Line */}
        <div className="h-full w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)] transition-colors group-hover/divider:bg-[#E11D48]" />

        {/* Circular Handle in the Middle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex size-10 sm:size-11 items-center justify-center rounded-full bg-white text-gray-900 border-2 border-[#E11D48] shadow-[0_8px_25px_rgba(0,0,0,0.5)] transition-transform duration-150 group-hover/divider:scale-110 active:scale-95">
          <ChevronsLeftRight className="size-5 text-[#E11D48]" />
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. SLEEK TOP CORNER BADGES (BEFORE & AFTER)                     */}
      {/* ============================================================== */}
      {/* Left Top: BEFORE Badge */}
      <div className="pointer-events-none absolute top-3.5 left-3.5 z-10 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-[11px] font-bold tracking-wider text-rose-300 uppercase backdrop-blur-md border border-rose-500/30 shadow-md">
        <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
        <span>{beforeLabel}</span>
      </div>

      {/* Right Top: AFTER Badge */}
      <div className="pointer-events-none absolute top-3.5 right-3.5 z-10 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-[11px] font-bold tracking-wider text-emerald-300 uppercase backdrop-blur-md border border-emerald-500/30 shadow-md">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        <span>{afterLabel}</span>
      </div>

      {/* Optional Custom Status Badge (e.g. Processing / Preview State) */}
      {statusBadge && (
        <div className="pointer-events-none absolute top-12 right-3.5 z-10">
          {statusBadge}
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. CENTER CLICK-TO-PLAY OVERLAY (when paused)                   */}
      {/* ============================================================== */}
      {!isPlaying && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 z-15 flex items-center justify-center bg-black/25 cursor-pointer backdrop-blur-[1px] transition-all"
        >
          <button
            type="button"
            className="flex size-16 sm:size-20 items-center justify-center rounded-full bg-gradient-to-tr from-[#E11D48] to-[#FF4FA3] text-white shadow-[0_10px_35px_rgba(225,29,72,0.5)] transition-transform hover:scale-110 active:scale-95 cursor-pointer"
            aria-label="Play video"
          >
            <Play className="size-8 sm:size-10 fill-white ml-1" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. BOTTOM CONTROL BAR (Play, Scrubber, Time, Mute, Fit, Full)   */}
      {/* ============================================================== */}
      <div
        className={`absolute inset-x-0 bottom-0 z-25 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 sm:p-4 pt-8 transition-opacity duration-300 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Timeline Scrubber */}
        <div className="relative mb-2.5 flex items-center group/scrubber cursor-pointer">
          <input
            type="range"
            min={0}
            max={duration || 10}
            step={0.01}
            value={currentTime}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            className="w-full h-1.5 sm:h-2 rounded-full appearance-none bg-white/20 accent-[#E11D48] cursor-pointer hover:h-2.5 transition-all focus:outline-hidden"
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between text-white text-xs sm:text-sm">
          {/* Left: Play/Pause, Replay, Time */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="flex size-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 transition-colors cursor-pointer text-white"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 fill-white ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() => handleSeek(0)}
              className="flex size-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 transition-colors cursor-pointer text-white"
              title="Restart"
            >
              <RotateCcw className="size-3.5" />
            </button>

            {/* Time Stamp */}
            <span className="font-mono text-xs text-gray-300 font-medium">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Center: Quick 50% Reset */}
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSliderPos(50);
                onPositionChange?.(50);
              }}
              className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-gray-200 transition-colors cursor-pointer flex items-center gap-1"
              title="Reset slider to 50% center"
            >
              <SlidersHorizontal className="size-3 text-[#E11D48]" />
              <span>Center 50%</span>
            </button>
          </div>

          {/* Right: Object Fit, Mute, Fullscreen */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Fit mode toggle (Cover vs Contain) */}
            <button
              type="button"
              onClick={() => setFitMode((prev) => (prev === "cover" ? "contain" : "cover"))}
              className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[11px] font-medium text-gray-300 transition-colors cursor-pointer"
              title="Toggle Cover (Fill) vs Contain (Fit)"
            >
              {fitMode === "cover" ? "Fill (Cover)" : "Fit (Contain)"}
            </button>

            {/* Audio Mute/Unmute */}
            <button
              type="button"
              onClick={toggleMute}
              className="flex size-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 transition-colors cursor-pointer text-white"
              title={isMuted ? "Unmute audio" : "Mute audio"}
            >
              {isMuted ? <VolumeX className="size-4 text-gray-400" /> : <Volume2 className="size-4 text-rose-400" />}
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex size-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 transition-colors cursor-pointer text-white"
              title="Toggle fullscreen"
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
