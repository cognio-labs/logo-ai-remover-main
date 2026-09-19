import { useState, useRef, PointerEvent } from "react";
import { ChevronLeft, ChevronRight, Sparkles, RefreshCw } from "lucide-react";

type Props = {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
  beforeDims?: { width: number; height: number } | null;
  afterDims?: { width: number; height: number } | null;
  scale?: string;
  onChangeImage?: () => void;
};

export function HeroComparisonSlider({
  beforeUrl,
  afterUrl,
  beforeLabel = "BEFORE",
  afterLabel = "AFTER 4K",
  beforeDims,
  afterDims,
  scale = "4",
  onChangeImage,
}: Props) {
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setPosition(percentage);
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      updatePosition(e.clientX);
    }
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
  };

  const beforeText = beforeDims && beforeDims.width > 0
    ? `${beforeLabel} · ${beforeDims.width}×${beforeDims.height}`
    : beforeLabel;

  const afterText = afterDims && afterDims.width > 0
    ? `${afterLabel} · ${afterDims.width}×${afterDims.height}`
    : `${afterLabel} · ${scale}× HD`;

  return (
    <div
      ref={containerRef}
      className="up-hero-slider-wrap"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* 1. After (Upscaled) Image - Base Layer */}
      <img
        src={afterUrl}
        alt="Upscaled result"
        className="up-hero-slider-img up-after-img"
        draggable={false}
      />

      {/* 2. Before (Original) Image - Clipped to left side */}
      <img
        src={beforeUrl}
        alt=""
        className="up-hero-slider-img up-before-img"
        style={{
          clipPath: `inset(0 ${100 - position}% 0 0)`,
        }}
        onError={(e) => {
          e.currentTarget.style.opacity = "0";
        }}
        draggable={false}
      />

      {/* Before Pill badge (Left) */}
      <span className="up-hero-pill up-pill-before">
        {beforeText}
      </span>

      {/* After Pill badge (Right) */}
      <span className="up-hero-pill up-pill-after">
        <Sparkles className="size-3 text-pink-300" />
        {afterText}
      </span>

      {/* Interactive Divider Line and Handle */}
      <div
        className="up-hero-slider-divider"
        style={{ left: `${position}%` }}
      >
        <div className={`up-hero-slider-handle ${isDragging ? "active" : ""}`}>
          <ChevronLeft className="size-3.5 -mr-1" />
          <ChevronRight className="size-3.5 -ml-1" />
        </div>
      </div>

      {/* Quick change button */}
      {onChangeImage && (
        <button
          type="button"
          className="up-hero-change-btn"
          onClick={(e) => {
            e.stopPropagation();
            onChangeImage();
          }}
          title="Upload or try another image"
        >
          <RefreshCw className="size-3" />
          <span>Change</span>
        </button>
      )}
    </div>
  );
}
