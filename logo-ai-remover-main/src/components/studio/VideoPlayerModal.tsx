import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  Sparkles,
  Download,
  Wand2,
  SlidersHorizontal,
  Layers,
  Check,
  Film,
  Copy,
} from "lucide-react";
import { CardItem } from "./VideoTemplatesSection";

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: CardItem | null;
  categoryName?: string;
}

export function VideoPlayerModal({
  isOpen,
  onClose,
  card,
  categoryName = "UGC Video Template",
}: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isHoveringSeek, setIsHoveringSeek] = useState<boolean>(false);
  const [hoverSeekTime, setHoverSeekTime] = useState<number>(0);
  const [hoverSeekPos, setHoverSeekPos] = useState<number>(0);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isPromptCopied, setIsPromptCopied] = useState<boolean>(false);

  // Auto-play and reset when card changes or modal opens
  useEffect(() => {
    if (!isOpen || !card) return;

    setIsPlaying(true);
    setCurrentTime(0);

    const timer = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            // If browser blocks autoplay with sound, fallback to muted autoplay
            if (videoRef.current) {
              videoRef.current.muted = true;
              setIsMuted(true);
              videoRef.current.play().catch(() => {});
            }
          });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [isOpen, card]);

  // Keyboard controls (Space = play/pause, M = mute, F = fullscreen, Esc = close)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        skipTime(-3);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        skipTime(3);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPlaying, isMuted, isFullscreen]);

  if (!isOpen || !card) return null;

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && volume === 0) {
      setVolume(0.8);
      videoRef.current.volume = 0.8;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      const shouldMute = val === 0;
      videoRef.current.muted = shouldMute;
      setIsMuted(shouldMute);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !videoRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = fraction * duration;
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleSeekMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    setHoverSeekPos(clickX);
    setHoverSeekTime(fraction * duration);
    setIsHoveringSeek(true);
  };

  const handleSpeedChange = () => {
    const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  const toggleLoop = () => {
    const nextLoop = !isLooping;
    setIsLooping(nextLoop);
    if (videoRef.current) {
      videoRef.current.loop = nextLoop;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return "00:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const isLandscape = card.ratio === "16:9" || card.title.toLowerCase().includes("speaker") || card.title.toLowerCase().includes("flask") || card.title.toLowerCase().includes("bottle");
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/85 backdrop-blur-xl animate-fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-5xl max-h-[92vh] bg-zinc-950/95 border border-zinc-800/90 rounded-2xl sm:rounded-3xl shadow-2xl shadow-rose-950/20 overflow-hidden flex flex-col animate-modal-in"
      >
        {/* ─── MODAL TOP HEADER ─── */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
              <Film className="size-3 shrink-0" />
              <span className="truncate">{categoryName}</span>
            </span>

            <span className="text-sm sm:text-base font-bold text-white truncate max-w-[220px] sm:max-w-md">
              {card.title}
            </span>

            {/* Ratio badge */}
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 text-[11px] font-medium text-zinc-300 border border-zinc-700">
              <Layers className="size-3 text-rose-400" />
              {isLandscape ? "16:9 Landscape" : "9:16 Portrait"}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="size-8 sm:size-9 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center border border-zinc-700 transition-colors cursor-pointer"
              title="Close modal (Esc)"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* ─── VIDEO SCREEN WORKSPACE ─── */}
        <div
          className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[340px] sm:min-h-[440px] md:min-h-[500px]"
          onMouseEnter={() => setShowControls(true)}
        >
          {/* Dual-layer background blur effect for landscape videos */}
          {isLandscape && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 blur-3xl scale-125">
              <video
                src={card.video}
                muted
                playsInline
                loop
                autoPlay
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Main Video Element */}
          <div
            className={`relative z-10 flex items-center justify-center cursor-pointer ${
              isLandscape
                ? "w-full max-w-4xl max-h-[70vh] aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl mx-auto"
                : "h-full max-h-[70vh] aspect-[9/16] rounded-xl overflow-hidden border border-white/10 shadow-2xl mx-auto"
            }`}
            onClick={togglePlayPause}
          >
            <video
              ref={videoRef}
              src={card.video}
              loop={isLooping}
              muted={isMuted}
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              className="w-full h-full object-contain bg-black"
            />

            {/* Centered big play icon when paused */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all">
                <div className="size-16 sm:size-20 rounded-full bg-rose-600/90 hover:bg-rose-600 text-white flex items-center justify-center shadow-2xl shadow-rose-600/50 scale-100 hover:scale-105 transition-transform">
                  <Play className="size-8 sm:size-9 ml-1 fill-white" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── CUSTOM CONTROLS & TIMELINE DOCK ─── */}
        <div className="bg-zinc-950/95 border-t border-zinc-800/80 px-4 sm:px-6 py-3 flex flex-col gap-2.5 shrink-0">
          {/* Progress / Seeker Bar */}
          <div
            ref={progressBarRef}
            onClick={handleSeekClick}
            onMouseMove={handleSeekMouseMove}
            onMouseLeave={() => setIsHoveringSeek(false)}
            className="group/track relative w-full h-3 flex items-center cursor-pointer"
          >
            {/* Background rail */}
            <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden group-hover/track:h-2 transition-all">
              {/* Active fill */}
              <div
                className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-rose-400 rounded-full relative"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Current scrubber handle */}
            <div
              className="absolute size-3.5 rounded-full bg-white shadow-md border-2 border-rose-500 pointer-events-none transform -translate-x-1/2 scale-0 group-hover/track:scale-100 transition-transform"
              style={{ left: `${progressPercent}%` }}
            />

            {/* Hover timestamp tooltip */}
            {isHoveringSeek && (
              <div
                className="absolute -top-7 transform -translate-x-1/2 px-2 py-0.5 rounded bg-zinc-800 text-white text-[11px] font-mono pointer-events-none shadow-md border border-zinc-700"
                style={{ left: `${hoverSeekPos}px` }}
              >
                {formatTime(hoverSeekTime)}
              </div>
            )}
          </div>

          {/* Controls button row */}
          <div className="flex items-center justify-between gap-3 text-zinc-300">
            {/* Left: Play/Pause, Rewind, Time, Volume */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={togglePlayPause}
                className="size-8 sm:size-9 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
                title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              >
                {isPlaying ? <Pause className="size-4 fill-zinc-950" /> : <Play className="size-4 ml-0.5 fill-zinc-950" />}
              </button>

              <button
                onClick={() => skipTime(-5)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer hidden sm:block"
                title="Rewind 5s"
              >
                <RotateCcw className="size-4" />
              </button>

              {/* Time display */}
              <div className="text-xs font-mono text-zinc-400 min-w-[85px]">
                <span className="text-white font-semibold">{formatTime(currentTime)}</span>
                <span className="mx-1 text-zinc-600">/</span>
                <span>{formatTime(duration)}</span>
              </div>

              {/* Volume Slider Dock */}
              <div className="group/vol flex items-center gap-1.5 ml-1">
                <button
                  onClick={toggleMute}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  title={isMuted ? "Unmute (M)" : "Mute (M)"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="size-4 text-rose-400" />
                  ) : (
                    <Volume2 className="size-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 sm:w-20 h-1 rounded-full accent-rose-500 bg-zinc-800 cursor-pointer hidden sm:block"
                  title="Volume"
                />
              </div>
            </div>

            {/* Right: Loop, Speed, Fullscreen, Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Speed toggle */}
              <button
                onClick={handleSpeedChange}
                className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 font-semibold transition-colors cursor-pointer"
                title="Playback Speed"
              >
                {playbackSpeed}x
              </button>

              {/* Loop toggle */}
              <button
                onClick={toggleLoop}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  isLooping
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
                title="Loop Video"
              >
                Loop
              </button>

              {/* Fullscreen toggle */}
              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer hidden sm:block"
                title="Toggle Fullscreen (F)"
              >
                {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
              </button>

              {/* Direct Download Button */}
              <a
                href={card.video}
                download={`${card.title.replace(/\s+/g, "_")}.mp4`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors cursor-pointer border border-zinc-700 ml-1"
                title="Download MP4"
              >
                <Download className="size-3.5" />
                <span className="hidden md:inline">Download</span>
              </a>

              {/* Primary Action Button */}
              <button
                onClick={() => {
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold shadow-md shadow-rose-950/40 transition-all cursor-pointer ml-1"
              >
                {isCopied ? (
                  <>
                    <Check className="size-3.5" />
                    <span>Loaded!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" />
                    <span>Use Template</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ─── DEDICATED AI VIDEO PROMPT SECTION ─── */}
        {card.prompt && (
          <div className="bg-zinc-900/90 border-t border-zinc-800/80 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0 pr-2">
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Sparkles className="size-3 text-rose-400" />
                <span>AI Generation Prompt</span>
              </span>
              <p className="text-xs sm:text-[13px] text-zinc-200 font-sans leading-relaxed selection:bg-rose-500/30">
                "{card.prompt}"
              </p>
            </div>
            <button
              onClick={() => {
                if (card.prompt) {
                  navigator.clipboard.writeText(card.prompt).then(() => {
                    setIsPromptCopied(true);
                    setTimeout(() => setIsPromptCopied(false), 2200);
                  }).catch(() => {});
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold border border-zinc-700 shrink-0 cursor-pointer active:scale-95 transition-all self-start sm:self-auto shadow-sm"
              title="Copy prompt to clipboard"
            >
              {isPromptCopied ? (
                <>
                  <Check className="size-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Prompt Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5 text-rose-300" />
                  <span>Copy prompt</span>
                </>
              )}
            </button>
          </div>
        )}


        {/* ─── BOTTOM KEYBOARD HINTS FOOTER ─── */}
        <div className="px-6 py-2 bg-zinc-900/40 border-t border-zinc-800/40 hidden sm:flex items-center justify-between text-[11px] text-zinc-500 font-medium">
          <div className="flex items-center gap-4">
            <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[10px]">Space</kbd> Play / Pause</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[10px]">M</kbd> Mute Audio</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[10px]">F</kbd> Fullscreen</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[10px]">Esc</kbd> Close</span>
          </div>

          <div className="text-zinc-400 flex items-center gap-2">
            <span>Dynamic Resolution: <strong>{isLandscape ? "1920 × 1080 (HD)" : "1080 × 1920 (4K)"}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
