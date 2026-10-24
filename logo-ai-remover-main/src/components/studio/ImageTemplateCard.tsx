import React, { useState, useEffect, useRef } from "react";
import {
  Wand2,
  Volume2,
  VolumeX,
  Play,
  Layers,
  Sparkles,
  Eye,
  Maximize2,
  Copy,
  Check,
} from "lucide-react";
import { CardItem } from "./VideoTemplatesSection";

interface ImageTemplateCardProps {
  card: CardItem;
  categoryName: string;
  onSelect: (card: CardItem) => void;
}

export function ImageTemplateCard({
  card,
  categoryName,
  onSelect,
}: ImageTemplateCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isLandscape, setIsLandscape] = useState<boolean>(
    card.ratio === "16:9" ||
      card.title.toLowerCase().includes("speaker") ||
      card.title.toLowerCase().includes("flask") ||
      card.title.toLowerCase().includes("bottle")
  );

  // Intelligent Intersection Observer: Only load and play video when near/in viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          const video = videoRef.current;
          const bgVideo = bgVideoRef.current;
          if (video) {
            video.muted = true;
            video.play().then(() => setIsPlaying(true)).catch(() => {});
          }
          if (bgVideo && isLandscape) {
            bgVideo.muted = true;
            bgVideo.play().catch(() => {});
          }
        } else {
          // Pause when far out of view to save CPU and battery
          const video = videoRef.current;
          const bgVideo = bgVideoRef.current;
          if (video) video.pause();
          if (bgVideo) bgVideo.pause();
          setIsPlaying(false);
        }
      },
      { rootMargin: "350px 0px", threshold: 0.05 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [isLandscape, card.video]);

  // Auto-detect video dimensions when metadata loads
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const w = videoRef.current.videoWidth;
      const h = videoRef.current.videoHeight;
      if (w && h) {
        setIsLandscape(w > h || card.ratio === "16:9");
      }
      if (isVisible) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current && isVisible) {
      videoRef.current.play().catch(() => {});
    }
    if (bgVideoRef.current && isLandscape && isVisible) {
      bgVideoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current && isVisible) {
      videoRef.current.play().catch(() => {});
    }
    if (bgVideoRef.current && isLandscape && isVisible) {
      bgVideoRef.current.play().catch(() => {});
    }
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  };

  const handleCopyPrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (card.prompt) {
      navigator.clipboard.writeText(card.prompt).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2200);
      }).catch(() => {});
    }
  };

  const handleCardClick = () => {
    onSelect(card);
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
      className="group relative shrink-0 w-[205px] sm:w-[235px] md:w-[265px] lg:w-[285px] xl:w-[300px] rounded-2xl sm:rounded-3xl bg-zinc-950 border border-zinc-800 hover:border-rose-500/80 overflow-hidden cursor-pointer snap-start transition-all duration-300 hover:shadow-2xl hover:shadow-rose-950/30 hover:-translate-y-2 select-none"
    >
      {/* ─── CARD ASPECT RATIO CONTAINER (Sleek Portrait ~ 3:4.7) ─── */}
      <div className="relative aspect-[3/4.7] w-full bg-zinc-950 overflow-hidden flex flex-col justify-center">
        {/* ─── CASE A: LANDSCAPE VIDEO AUTO-ADAPTATION (DUAL LAYER REAL VIDEO) ─── */}
        {isLandscape ? (
          <>
            {/* Layer 1: Ambient Blurred Background (Real video playing, ZERO image) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none scale-150 blur-2xl opacity-45 brightness-75 transition-opacity duration-300">
              {isVisible && (
                <video
                  ref={bgVideoRef}
                  src={card.video}
                  loop
                  muted
                  autoPlay
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Subtle dark overlay over blurred background */}
            <div className="absolute inset-0 bg-black/35 pointer-events-none" />

            {/* Layer 2: Centered Crisp 16:9 Video (Uncropped, Full product visible, Pure video) */}
            <div className="relative z-10 w-full px-2.5 my-auto pointer-events-none">
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-black">
                {isVisible ? (
                  <video
                    ref={videoRef}
                    src={card.video}
                    loop
                    muted={isMuted}
                    autoPlay
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={handleLoadedMetadata}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-900" />
                )}
              </div>
            </div>
          </>
        ) : (
          /* ─── CASE B: PORTRAIT VIDEO (9:16 Full-Bleed Real Video, ZERO image) ─── */
          isVisible ? (
            <video
              ref={videoRef}
              src={card.video}
              loop
              muted={isMuted}
              autoPlay
              playsInline
              preload="metadata"
              onLoadedMetadata={handleLoadedMetadata}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-zinc-900 animate-pulse" />
          )
        )}

        {/* ─── TOP LEFT: ANIMATED LIVE INDICATOR & AI BADGE ─── */}
        <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-semibold border border-white/20 shadow-md">
            <span className="size-1.5 rounded-full bg-rose-500 animate-pulse-glow" />
            <span className="tracking-wide">AI UGC</span>
          </span>

          {isLandscape && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600/80 backdrop-blur-md text-white text-[9px] font-bold border border-blue-400/30 shadow-sm animate-badge-float">
              <Layers className="size-2.5" />
              <span>16:9 Adapt</span>
            </span>
          )}
        </div>

        {/* ─── TOP RIGHT: SOUND TOGGLE & CUSTOM BADGES ─── */}
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
          {/* Quick Sound Toggle Button on Hover */}
          <button
            onClick={toggleSound}
            aria-label={isMuted ? "Unmute preview" : "Mute preview"}
            className={`size-7 rounded-full flex items-center justify-center backdrop-blur-md border transition-all cursor-pointer ${
              isMuted
                ? "bg-black/60 text-zinc-300 border-white/20 hover:bg-black/90 hover:text-white"
                : "bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-600/50 scale-105"
            }`}
          >
            {isMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
          </button>

          {/* Badges e.g. "NEW", "MY UPLOAD", "HOT" */}
          {card.badge && (
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider text-white shadow-md animate-badge-float ${
                card.badgeType === "blue"
                  ? "bg-blue-600 border border-blue-400/30"
                  : card.badgeType === "orange"
                  ? "bg-amber-600 border border-amber-400/30"
                  : "bg-gradient-to-r from-pink-600 via-rose-600 to-rose-500 border border-rose-400/30"
              }`}
            >
              {card.badge}
            </span>
          )}
        </div>

        {/* ─── BOTTOM GRADIENT SCRIM & ANIMATED TYPOGRAPHY + COPY PROMPT BUTTON ─── */}
        <div className="absolute inset-x-0 bottom-0 pt-20 pb-3 px-3 sm:px-3.5 bg-gradient-to-t from-black/95 via-black/65 to-transparent flex flex-col justify-end pointer-events-none z-20">
          {/* Dynamic Animated Headline */}
          <span className="!text-xs sm:!text-[13px] md:!text-[14px] !font-bold !text-white !leading-snug drop-shadow-md line-clamp-1 block group-hover:text-rose-200 transition-colors">
            {card.title}
          </span>

          {/* Tag Row: Views Count & Copy Prompt Quick Action */}
          <div className="flex items-center justify-between gap-1.5 mt-1.5 pointer-events-auto">
            <div className="flex items-center gap-1.5 text-[10px]">
              {card.views && (
                <span className="inline-flex items-center gap-1 text-zinc-300 font-medium">
                  <Eye className="size-2.5 text-zinc-400" />
                  <span>{card.views}</span>
                </span>
              )}
              <span className="text-zinc-600">•</span>
              <span className="text-rose-300/90 font-semibold">
                {isLandscape ? "16:9 HD" : "9:16 4K"}
              </span>
            </div>

            {/* Direct Copy Prompt Button on Card */}
            {card.prompt && (
              <button
                onClick={handleCopyPrompt}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/25 text-white text-[10px] font-semibold border border-white/20 backdrop-blur-md shadow-xs active:scale-95 transition-all cursor-pointer"
                title="Copy prompt"
              >
                {isCopied ? (
                  <>
                    <Check className="size-2.5 text-emerald-400" />
                    <span className="text-emerald-300">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-2.5 text-rose-300" />
                    <span>Copy prompt</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ─── HOVER GLOW OVERLAY & "USE TEMPLATE" FLOATING BUTTON ─── */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none flex items-center justify-center p-3 z-30">
          <div className="translate-y-2 group-hover:translate-y-0 transition-transform duration-200 flex flex-col items-center gap-2 pointer-events-auto">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/95 text-zinc-950 text-xs font-bold shadow-2xl backdrop-blur-md border border-white/40 hover:bg-white cursor-pointer">
              <Wand2 className="size-3.5 text-rose-600 shrink-0" />
              <span>Preview & Use</span>
            </span>

            {card.prompt && (
              <button
                onClick={handleCopyPrompt}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 hover:bg-black text-white text-[11px] font-semibold border border-white/30 backdrop-blur-md shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="size-3 text-emerald-400" />
                    <span className="text-emerald-300">Prompt Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3 text-rose-300" />
                    <span>Copy prompt</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
