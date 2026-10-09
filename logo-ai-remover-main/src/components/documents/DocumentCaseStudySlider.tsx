import React, { useState, useRef, useCallback } from "react";
import { CheckCircle2, ChevronsLeftRight, AlertCircle } from "lucide-react";

interface DocumentCaseStudySliderProps {
  title: string;
  beforeUrl: string;
  afterUrl: string;
  fallbackBeforeJpg: string;
  fallbackAfterJpg: string;
  watermarkText?: string;
  initialPosition?: number;
}

export function DocumentCaseStudySlider({
  title,
  beforeUrl,
  afterUrl,
  fallbackBeforeJpg,
  fallbackAfterJpg,
  watermarkText = "WATERMARKED",
  initialPosition = 50,
}: DocumentCaseStudySliderProps) {
  const [position, setPosition] = useState<number>(initialPosition);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0) return;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = Math.round((x / rect.width) * 100);
    setPosition(percentage);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if pointer capture already released
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPosition((prev) => Math.max(0, prev - 5));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setPosition((prev) => Math.min(100, prev + 5));
    } else if (e.key === "Home") {
      e.preventDefault();
      setPosition(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setPosition(100);
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="slider"
      aria-label={`Interactive Before and After slider for ${title}`}
      aria-valuenow={position}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`relative aspect-[16/10] w-full rounded-2xl overflow-hidden select-none bg-slate-900 border border-gray-200/90 shadow-md transition-shadow group touch-none cursor-ew-resize focus:outline-none focus:ring-2 focus:ring-[#E11D48] ${
        isDragging ? "ring-2 ring-[#E11D48]" : "hover:shadow-lg"
      }`}
    >
      {/* 1. LAYER UNDERNEATH: AFTER (Clean 100% HD Document) */}
      <picture className="absolute inset-0 size-full pointer-events-none">
        <source srcSet={afterUrl} type="image/webp" />
        <img
          src={fallbackAfterJpg}
          alt={`Restored ${title} - 100% clean`}
          loading="lazy"
          decoding="async"
          width={1600}
          height={1000}
          className="absolute inset-0 size-full object-cover object-top select-none pointer-events-none"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = fallbackAfterJpg;
          }}
        />
      </picture>

      {/* After Badge (Top Right) */}
      <div className="absolute top-3 right-3 z-10 pointer-events-none flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/95 text-white text-[10px] sm:text-xs font-bold tracking-wide shadow-md backdrop-blur-xs border border-white/20">
        <CheckCircle2 className="size-3 sm:size-3.5 text-emerald-200 shrink-0" />
        <span>AFTER (100% CLEAN)</span>
      </div>

      {/* 2. TOP LAYER: BEFORE (Watermarked Document) with Hardware-Accelerated Clip-Path */}
      <div
        className="absolute inset-0 size-full pointer-events-none"
        style={{
          clipPath: `inset(0 ${100 - position}% 0 0)`,
          WebkitClipPath: `inset(0 ${100 - position}% 0 0)`,
        }}
      >
        <picture className="absolute inset-0 size-full pointer-events-none">
          <source srcSet={beforeUrl} type="image/webp" />
          <img
            src={fallbackBeforeJpg}
            alt={`Original ${title} with watermark`}
            loading="lazy"
            decoding="async"
            width={1600}
            height={1000}
            className="absolute inset-0 size-full object-cover object-top select-none pointer-events-none"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = fallbackBeforeJpg;
            }}
          />
        </picture>

        {/* Before Badge (Top Left) */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/95 text-white text-[10px] sm:text-xs font-bold tracking-wide shadow-md backdrop-blur-xs border border-white/20">
          <AlertCircle className="size-3 sm:size-3.5 text-rose-200 shrink-0" />
          <span className="truncate max-w-[150px] sm:max-w-[200px]">
            BEFORE ({watermarkText})
          </span>
        </div>
      </div>

      {/* 3. VERTICAL DIVIDER LINE */}
      <div
        className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.6)] z-20 pointer-events-none transition-none"
        style={{ left: `${position}%` }}
      >
        <div className="absolute inset-y-0 -left-px w-1 bg-gradient-to-b from-[#E11D48] via-white to-[#E11D48] opacity-80" />
      </div>

      {/* 4. CENTRAL DRAGGABLE HANDLE */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 size-9 sm:size-10 rounded-full bg-white text-gray-900 border-2 border-[#E11D48] shadow-2xl flex items-center justify-center transition-transform pointer-events-none select-none ${
          isDragging ? "scale-115 ring-4 ring-[#E11D48]/30" : "group-hover:scale-110"
        }`}
        style={{ left: `${position}%` }}
      >
        <ChevronsLeftRight className="size-4 sm:size-5 text-[#E11D48]" />
      </div>

      {/* Drag Hint on Bottom Center */}
      <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none z-10">
        <span className="text-[10px] font-semibold text-white/90 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/15 opacity-0 group-hover:opacity-100 transition-opacity">
          Drag left / right to compare
        </span>
      </div>
    </div>
  );
}
