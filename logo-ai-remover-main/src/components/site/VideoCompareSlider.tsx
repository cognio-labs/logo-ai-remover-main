import React, { useCallback, useEffect, useRef, useState } from "react";
import "./VideoCompareSlider.css";
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
  /** Keep playback controls below the picture so edge marks remain visible. */
  controlsOutside?: boolean;
  /** Initial aspect ratio if known beforehand (e.g. from parent component) */
  initialRatio?: number;
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
  controlsOutside = false,
  initialRatio = 0,
}: VideoCompareSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pictureRef = useRef<HTMLDivElement>(null);
  const beforeVideoRef = useRef<HTMLVideoElement>(null);
  const afterVideoRef = useRef<HTMLVideoElement>(null);
  const isDraggingSlider = useRef<boolean>(false);
  const syncLockRef = useRef<boolean>(false);

  // Slider position (0 - 100 percent)
  const [sliderPos, setSliderPos] = useState<number>(initialSliderPos);
  // View mode: split comparison slider, 100% clean video, or 100% original
  const [viewMode, setViewMode] = useState<"split" | "clean" | "original">("split");
  const showsOriginal = viewMode === "original" || (viewMode === "split" && sliderPos > 0);
  const showsProcessed = viewMode === "clean" || (viewMode === "split" && sliderPos < 100);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [fitMode, setFitMode] = useState<"cover" | "contain">(defaultFit);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const hideControlsTimer = useRef<number | null>(null);
  // Auto-detected video aspect ratio (width / height). Initialized with initialRatio if provided.
  const [metadataRatio, setMetadataRatio] = useState(0);
  const detectedRatio = metadataRatio || initialRatio;
  const [afterReady, setAfterReady] = useState<boolean>(false);
  const [afterError, setAfterError] = useState<boolean>(false);
  const [beforeError, setBeforeError] = useState<boolean>(false);

  const applyAudioMuteState = useCallback(
    (mode: "split" | "clean" | "original", muted: boolean) => {
      const v1 = beforeVideoRef.current;
      const v2 = afterVideoRef.current;
      if (mode === "clean") {
        if (v1) v1.muted = true;
        if (v2) v2.muted = muted;
      } else {
        if (v1) v1.muted = muted;
        if (v2) v2.muted = true;
      }
    },
    [],
  );

  useEffect(() => {
    setMetadataRatio(0);
    setViewMode("split");
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(Boolean(autoPlay));
    setAfterReady(false);
    setAfterError(false);
    setBeforeError(false);
  }, [beforeSrc, afterSrc, autoPlay]);

  useEffect(() => {
    setSliderPos(initialSliderPos);
  }, [beforeSrc, afterSrc, initialSliderPos]);

  // 1. Synchronized Play / Pause
  const togglePlay = useCallback(async () => {
    const v1 = beforeVideoRef.current;
    const v2 = afterVideoRef.current;
    const players = [beforeError ? null : v1, afterError ? null : v2].filter(
      (video): video is HTMLVideoElement => Boolean(video),
    );
    if (!players.length) return;

    if (players.every((video) => video.paused)) {
      try {
        if (players.every((video) => video.ended)) players.forEach((video) => { video.currentTime = 0; });
        await Promise.all(players.map((video) => video.play()));
        setIsPlaying(true);
      } catch (err) {
        players.forEach((video) => video.pause());
        setIsPlaying(false);
        console.warn("Video playback was interrupted:", err);
      }
    } else {
      players.forEach((video) => video.pause());
      setIsPlaying(false);
    }
  }, [afterError, beforeError]);

  // 2. Synchronized Timeline Seek
  const handleSeek = (newTime: number) => {
    const v1 = beforeVideoRef.current;
    const v2 = afterVideoRef.current;
    if (!v1 || !v2) return;

    const clamped = Math.max(0, Math.min(newTime, duration || newTime));
    for (const video of [v1, v2]) {
      if (Number.isFinite(video.duration)) video.currentTime = Math.min(clamped, video.duration);
    }
    setCurrentTime(clamped);
  };

  // 3. Synchronized Time Update & Drift Correction
  const handleTimeUpdate = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const v1 = beforeVideoRef.current;
    const v2 = afterVideoRef.current;
    if (!v1 || !v2) return;

    const lead = beforeError || (viewMode === "clean" && !afterError) ? v2 : v1;
    const follow = lead === v1 ? v2 : v1;
    if (event.currentTarget !== lead) return;

    setCurrentTime(lead.currentTime);
    if (lead.duration && !isNaN(lead.duration) && lead.duration !== duration) {
      setDuration(lead.duration);
    }

    // Bidirectional drift correction (keeps frames locked within 40ms)
    if (!syncLockRef.current && !follow.seeking && Number.isFinite(follow.duration) &&
        Math.abs(follow.currentTime - lead.currentTime) > 0.04) {
      syncLockRef.current = true;
      follow.currentTime = Math.min(lead.currentTime, follow.duration);
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
      v1.pause();
      v2.pause();
      setIsPlaying(false);
    }
  };

  // 5. Mute toggle (Original/Split play v1 audio; Clean mode plays processed v2 audio)
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    applyAudioMuteState(viewMode, nextMuted);
  };

  // 6. Fullscreen
  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen?.()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen?.()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
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
      const rect = pictureRef.current?.getBoundingClientRect();
      if (!rect?.width) return;
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
    } catch {
      // Pointer capture may already have been released by the browser.
    }
  };

  const handleDividerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 5;
    let next = sliderPos;
    if (e.key === "ArrowLeft") next -= step;
    else if (e.key === "ArrowRight") next += step;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 100;
    else return;
    e.preventDefault();
    next = Math.max(0, Math.min(100, next));
    setSliderPos(next);
    onPositionChange?.(next);
  };

  useEffect(() => {
    applyAudioMuteState(viewMode, isMuted);
  }, [viewMode, isMuted, beforeSrc, afterSrc, applyAudioMuteState]);

  // Auto-play synchronization on mount or source change
  useEffect(() => {
    const v1 = beforeVideoRef.current;
    const v2 = afterVideoRef.current;
    if (!v1 || !v2) return;

    if (autoPlay) {
      Promise.all([v1.play(), v2.play()])
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [beforeSrc, afterSrc, autoPlay]);

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label="Video comparison"
      className={`group relative overflow-hidden rounded-xl bg-[#0b0f0d] border-[3px] border-[#0b0f0d] shadow-[6px_6px_0px_#0b0f0d] select-none transition-all duration-200 ${
        detectedRatio > 0 && detectedRatio < 0.95
          ? "max-w-[380px] sm:max-w-[420px] mx-auto"
          : "w-full"
      } ${controlsOutside ? "" : aspectRatio} ${className}`}
      onPointerMove={handlePointerMove}
      onMouseLeave={() => {
        if (isPlaying && !isDraggingSlider.current) setShowControls(false);
      }}
    >
      <div
        ref={pictureRef}
        className={`relative w-full overflow-hidden mx-auto ${controlsOutside ? "" : "size-full"}`}
        style={
          controlsOutside && detectedRatio > 0
            ? {
                aspectRatio: `${detectedRatio}`,
                maxHeight: "80vh",
                maxWidth: `calc(80vh * ${detectedRatio})`,
              }
            : controlsOutside
              ? { aspectRatio: "16/9" }
              : {}
        }
      >
        {/* ============================================================== */}
        {/* 1. BOTTOM LAYER: BEFORE (WATERMARKED) VIDEO                     */}
        {/* ============================================================== */}
        <video
          key={beforeSrc}
          ref={beforeVideoRef}
          src={beforeSrc}
          playsInline
          muted={isMuted}
          loop={loop}
          autoPlay={autoPlay}
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            setDuration(v.duration || 0);
            if (v.videoWidth && v.videoHeight) {
              setMetadataRatio(v.videoWidth / v.videoHeight);
            }
          }}
          onError={() => setBeforeError(true)}
          onEnded={handleEnded}
          className={`absolute inset-0 size-full pointer-events-none transition-all duration-150 ${
            fitMode === "cover" ? "object-cover" : "object-contain"
          }`}
        />
        {beforeError && (
          <div className="absolute inset-0 grid place-items-center px-4 text-center text-xs font-bold text-rose-300">
            This browser cannot preview the original video. Select Processed to review the MP4.
          </div>
        )}

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
          className="pointer-events-none absolute inset-0 size-full overflow-hidden bg-[#091712] select-none transition-none"
          style={{
            clipPath:
              viewMode === "clean"
                ? "none"
                : viewMode === "original"
                  ? "inset(0 0 0 100%)"
                  : `inset(0 0 0 ${sliderPos}%)`,
          }}
        >
          <video
            key={afterSrc}
            ref={afterVideoRef}
            src={afterSrc}
            playsInline
            muted
            loop={loop}
            autoPlay={autoPlay}
            preload="auto"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={(event) => {
              const video = event.currentTarget;
              if (video.videoWidth && video.videoHeight) {
                setMetadataRatio((ratio) => ratio || video.videoWidth / video.videoHeight);
                setDuration((value) => value || video.duration);
              }
            }}
            onLoadedData={() => setAfterReady(true)}
            onCanPlay={() => setAfterReady(true)}
            onError={() => setAfterError(true)}
            onEnded={handleEnded}
            className={`size-full pointer-events-none transition-all duration-150 ${
              fitMode === "cover" ? "object-cover" : "object-contain"
            }`}
          />
          {!afterReady && !afterError && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#091712] text-xs font-bold text-[#d0f471]">
              Loading processed video...
            </div>
          )}
          {afterError && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#091712] px-4 text-center text-xs font-bold text-rose-300">
              Unable to decode the processed video preview in this browser. You can still download the MP4 below.
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* 3. INTERACTIVE SLIDER DIVIDER & CENTER CIRCULAR HANDLE          */}
        {/* ============================================================== */}
        {viewMode === "split" && (
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onKeyDown={handleDividerKeyDown}
            role="slider"
            tabIndex={0}
            aria-label="Before and after comparison position"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(sliderPos)}
            aria-valuetext={`${Math.round(sliderPos)} percent original, ${Math.round(100 - sliderPos)} percent processed`}
            aria-orientation="horizontal"
            className="absolute inset-y-0 z-20 w-12 -ml-6 cursor-ew-resize flex items-center justify-center touch-none group/divider focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#d0f471]"
            style={{ left: `${sliderPos}%` }}
            title="Drag left or right: Left is Original, Right is Clean"
          >
            {/* Sleek Vertical Divider Line */}
            <div className="h-full w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)] transition-colors group-hover/divider:bg-[#d0f471]" />

            {/* Circular Handle in the Middle with Orientation Label */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex size-10 sm:size-11 items-center justify-center rounded-full bg-white text-[#10241e] border-2 border-[#10241e] shadow-[0_8px_25px_rgba(0,0,0,0.5)] transition-transform duration-150 group-hover/divider:scale-110 active:scale-95">
              <ChevronsLeftRight className="size-5 text-[#10241e]" />
            </div>

            <div className="absolute top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/divider:opacity-100 transition-opacity pointer-events-none whitespace-nowrap rounded-md bg-black/90 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg border border-white/20">
              Original ◀ | ▶ Clean
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 4. SLEEK TOP CORNER BADGES (BEFORE & AFTER)                     */}
        {/* ============================================================== */}
        {/* Left Top: BEFORE Badge (only in split or original mode) */}
        {showsOriginal && (
          <div className="pointer-events-none absolute top-3.5 left-3.5 z-10 flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1 text-[11px] font-bold tracking-wider text-rose-300 uppercase backdrop-blur-md border border-rose-500/30 shadow-md">
            <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>{beforeLabel}</span>
          </div>
        )}

        {/* Right Top: AFTER Badge (only in split or clean mode) */}
        {showsProcessed && (
          <div className="pointer-events-none absolute top-3.5 right-3.5 z-10 flex items-center gap-1.5 rounded-full bg-[#10241e]/85 px-3 py-1 text-[11px] font-bold tracking-wider text-[#d0f471] uppercase backdrop-blur-md border border-[#d0f471]/30 shadow-md">
            <span className="size-1.5 rounded-full bg-[#d0f471]" />
            <span>{afterLabel}</span>
          </div>
        )}

        {/* Optional Custom Status Badge (e.g. Processing / Preview State) */}
        {statusBadge && (
          <div className="pointer-events-none absolute top-12 right-3.5 z-10">{statusBadge}</div>
        )}

        {/* ============================================================== */}
        {/* 5. CENTER CLICK-TO-PLAY OVERLAY (when paused)                   */}
        {/* ============================================================== */}
        {!isPlaying && (
          <div
            onClick={togglePlay}
            className="absolute inset-0 z-15 flex items-center justify-center cursor-pointer pointer-events-auto"
          >
            <button
              type="button"
              className={`flex size-14 sm:size-18 items-center justify-center rounded-full bg-[#10241e]/90 backdrop-blur-md text-[#d0f471] border border-[#d0f471]/40 shadow-[0_10px_35px_rgba(16,36,30,0.6)] transition-all hover:scale-110 active:scale-95 cursor-pointer ${
                viewMode === "split" && Math.abs(sliderPos - 50) < 15
                  ? "-translate-y-8 sm:-translate-y-10"
                  : ""
              }`}
              aria-label="Play video"
            >
              <Play className="size-7 sm:size-9 fill-[#d0f471] ml-1" />
            </button>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 6. BOTTOM CONTROL BAR (Play, Scrubber, Time, Mute, Fit, Full)   */}
      {/* ============================================================== */}
      <div
        className={`${controlsOutside ? "relative border-t border-white/15 bg-[#10241e] p-3 sm:p-4" : "absolute inset-x-0 bottom-0 z-25 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 sm:p-4 pt-8"} transition-opacity duration-300 ${
          controlsOutside || showControls || !isPlaying
            ? "opacity-100"
            : "opacity-0 pointer-events-none"
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
            className="video-compare-timeline"
            aria-label="Seek video position"
          />
        </div>

        {/* Controls Layout: Responsive 2-tier or single-line layout */}
        <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-2 text-white text-xs sm:text-sm">
          {/* Group 1: Play/Pause, Replay, Time */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={togglePlay}
              className="flex size-7 sm:size-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 transition-colors cursor-pointer text-white shrink-0"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="size-3.5 sm:size-4" />
              ) : (
                <Play className="size-3.5 sm:size-4 fill-white ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSeek(0)}
              className="flex size-7 sm:size-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 transition-colors cursor-pointer text-white shrink-0"
              title="Restart"
            >
              <RotateCcw className="size-3 sm:size-3.5" />
            </button>

            {/* Time Stamp */}
            <span className="font-mono text-[11px] sm:text-xs text-gray-300 font-medium whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Group 2: View Mode & Preset Positions (Centered, responsive) */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#161b18] border border-white/20 order-last min-[560px]:order-none mx-auto min-[560px]:mx-0">
            <button
              type="button"
              aria-pressed={viewMode === "original"}
              onClick={() => {
                setViewMode("original");
                setSliderPos(100);
                onPositionChange?.(100);
              }}
              className={`px-2 sm:px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-black transition-all cursor-pointer whitespace-nowrap ${
                viewMode === "original"
                  ? "bg-[#ff5c5c] text-white border border-black"
                  : "text-gray-200 hover:text-white"
              }`}
              title="Show Original Watermarked Video"
            >
              Original
            </button>

            <button
              type="button"
              aria-pressed={viewMode === "split"}
              onClick={() => {
                setViewMode("split");
                setSliderPos(50);
                onPositionChange?.(50);
              }}
              className={`px-2 sm:px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                viewMode === "split"
                  ? "bg-[#ffe500] !text-[#0b0f0d] border border-black"
                  : "text-gray-200 hover:text-white"
              }`}
              title="Split Comparison Slider (50/50)"
            >
              <SlidersHorizontal className={`size-3 ${viewMode === "split" ? "!text-[#0b0f0d]" : "text-gray-200"}`} />
              <span className={viewMode === "split" ? "!text-[#0b0f0d]" : "text-gray-200"}>
                Split<span className={`hidden sm:inline ${viewMode === "split" ? "!text-[#0b0f0d]" : ""}`}> (50%)</span>
              </span>
            </button>

            <button
              type="button"
              aria-pressed={viewMode === "clean"}
              onClick={() => {
                setViewMode("clean");
                setSliderPos(0);
                onPositionChange?.(0);
              }}
              className={`px-2 sm:px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                viewMode === "clean"
                  ? "bg-[#d0f471] !text-[#0b0f0d] border border-black"
                  : "text-gray-200 hover:text-white"
              }`}
              title="Show processed video"
            >
              <Sparkles className={`size-3 ${viewMode === "clean" ? "!text-[#0b0f0d]" : "text-gray-200"}`} />
              <span className={viewMode === "clean" ? "!text-[#0b0f0d]" : "text-gray-200"}>
                Processed
              </span>
            </button>
          </div>

          {/* Group 3: Object Fit, Mute, Fullscreen */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Fit mode toggle (Cover vs Contain) */}
            <button
              type="button"
              onClick={() => setFitMode((prev) => (prev === "cover" ? "contain" : "cover"))}
              className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[10px] sm:text-[11px] font-medium text-gray-200 transition-colors cursor-pointer whitespace-nowrap"
              title="Toggle Cover (Fill) vs Contain (Fit)"
            >
              <span>{fitMode === "cover" ? "Fill" : "Fit"}</span>
              <span className="hidden sm:inline"> ({fitMode === "cover" ? "Cover" : "Contain"})</span>
            </button>

            {/* Audio Mute/Unmute */}
            <button
              type="button"
              onClick={toggleMute}
              className="flex size-7 sm:size-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 transition-colors cursor-pointer text-white shrink-0"
              title={isMuted ? "Unmute audio" : "Mute audio"}
            >
              {isMuted ? (
                <VolumeX className="size-3.5 sm:size-4 text-gray-400" />
              ) : (
                <Volume2 className="size-3.5 sm:size-4 text-[#d0f471]" />
              )}
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex size-7 sm:size-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 transition-colors cursor-pointer text-white shrink-0"
              title="Toggle fullscreen"
            >
              {isFullscreen ? (
                <Minimize2 className="size-3.5 sm:size-4" />
              ) : (
                <Maximize2 className="size-3.5 sm:size-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
