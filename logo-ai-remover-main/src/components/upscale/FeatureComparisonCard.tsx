import React, { useState, useRef, useCallback } from "react";
import type { LucideIcon } from "lucide-react";

export interface FeatureCardData {
  id: string;
  icon: LucideIcon;
  centerIcon: LucideIcon;
  title: string;
  description: string;
  lowImage: string;
  highImage: string;
}

export interface FeatureComparisonCardProps {
  card: FeatureCardData;
  className?: string;
}

export function FeatureComparisonCard({ card, className = "" }: FeatureComparisonCardProps) {
  const [split, setSplit] = useState(50);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const updateSplit = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left;
    const pct = Math.max(6, Math.min(94, (x / rect.width) * 100));
    setSplit(pct);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateSplit(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current || isHovered) {
      updateSplit(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const Icon = card.icon;
  const CenterIcon = card.centerIcon;

  return (
    <div
      className={`group relative flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-3.5 sm:p-4 rounded-2xl bg-white border border-[#F3DFE7] shadow-[0_4px_24px_rgba(247,37,104,0.04)] hover:border-pink-300 hover:shadow-[0_12px_32px_rgba(247,37,104,0.12)] transition-all duration-300 ${className}`}
    >
      {/* Left: Interactive Low vs High Comparison Thumbnail */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          isDraggingRef.current = false;
        }}
        className="relative w-full sm:w-[130px] md:w-[138px] aspect-square shrink-0 rounded-xl overflow-hidden select-none cursor-ew-resize border border-gray-100/80 bg-gray-100 shadow-sm touch-none"
        title="Slide or hover to compare Low Resolution vs AI 4K Upscale"
      >
        {/* High Resolution Image (After - Base layer) */}
        <img
          src={card.highImage}
          alt={`${card.title} High Resolution`}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          loading="lazy"
        />

        {/* Low Resolution Image (Before - Clipped layer on left) */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
        >
          <img
            src={card.lowImage}
            alt={`${card.title} Low Resolution`}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            loading="lazy"
          />
        </div>

        {/* Before Badge */}
        <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-xs text-white text-[9px] font-medium tracking-wide shadow-sm pointer-events-none">
          Before
        </span>

        {/* After Badge */}
        <span className="absolute bottom-2 right-2 z-10 px-2 py-0.5 rounded-md bg-[#4F46E5]/90 backdrop-blur-xs text-white text-[9px] font-medium tracking-wide shadow-sm pointer-events-none">
          After
        </span>

        {/* Draggable Divider Line & Circular Center Handle */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-white pointer-events-none shadow-[0_0_8px_rgba(0,0,0,0.45)] z-20"
          style={{ left: `${split}%`, transform: "translateX(-50%)" }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-6 sm:size-7 rounded-full bg-white shadow-md border border-gray-200/90 flex items-center justify-center text-gray-700 transition-transform group-hover:scale-105">
            <CenterIcon className="size-3 sm:size-3.5 text-gray-800 shrink-0" />
          </div>
        </div>
      </div>

      {/* Right: Icon, Title & Copy */}
      <div className="flex flex-col justify-center min-w-0 flex-1 py-1">
        <div className="size-8 rounded-xl bg-[#FFF0F5] text-[#F72568] flex items-center justify-center border border-pink-100/90 mb-2 shrink-0 group-hover:scale-105 group-hover:bg-[#FFE5EE] transition-all">
          <Icon className="size-4 shrink-0" />
        </div>
        <h3 className="text-[13px] sm:text-[14px] font-semibold text-[#071126] tracking-tight leading-snug group-hover:text-[#F72568] transition-colors">
          {card.title}
        </h3>
        <p className="text-[11px] sm:text-[11.5px] text-[#556176] leading-relaxed mt-1 font-normal line-clamp-3">
          {card.description}
        </p>
      </div>
    </div>
  );
}

export default FeatureComparisonCard;
