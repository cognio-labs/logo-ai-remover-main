import React, { useState } from "react";

export interface MouseWheelProps {
  onScroll?: (deltaY: number) => void;
  ariaLabel?: string;
}

export function MouseWheel({ onScroll, ariaLabel = "Mouse scroll wheel" }: MouseWheelProps) {
  const [rotation, setRotation] = useState(0);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY;
    setRotation((prev) => prev + (delta > 0 ? 30 : -30));
    onScroll?.(delta);
  };

  return (
    <div
      role="slider"
      aria-label={ariaLabel}
      aria-valuenow={rotation}
      tabIndex={0}
      onWheel={handleWheel}
      onClick={() => {
        setRotation((prev) => prev + 30);
        onScroll?.(50);
      }}
      className="relative z-10 w-4.5 h-11 rounded-full bg-[#EAEAEA] border border-[#D4D4D4] shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_1px_1px_rgba(255,255,255,0.8)] cursor-ns-resize flex items-center justify-center overflow-hidden hover:bg-[#E0E0E0] transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-[#E11D48]"
      title="Scroll or click wheel"
    >
      {/* Ribbed track texture that rotates with scroll */}
      <div
        className="w-full h-20 flex flex-col justify-around items-center transition-transform duration-100 pointer-events-none"
        style={{ transform: `translateY(${-((rotation % 360) / 10)}px)` }}
      >
        <span className="w-2.5 h-[1.5px] bg-[#B0B0B0] rounded-full shrink-0" />
        <span className="w-2.5 h-[1.5px] bg-[#9A9A9A] rounded-full shrink-0" />
        <span className="w-2.5 h-[1.5px] bg-[#B0B0B0] rounded-full shrink-0" />
        <span className="w-2.5 h-[1.5px] bg-[#9A9A9A] rounded-full shrink-0" />
        <span className="w-2.5 h-[1.5px] bg-[#B0B0B0] rounded-full shrink-0" />
      </div>
    </div>
  );
}
