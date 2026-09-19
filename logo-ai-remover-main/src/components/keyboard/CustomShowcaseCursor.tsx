import React from "react";

export interface ClickRipple {
  id: number;
  x: number;
  y: number;
}

export interface CustomShowcaseCursorProps {
  cursorPos: { x: number; y: number } | null;
  ripples: ClickRipple[];
}

export function CustomShowcaseCursor({
  cursorPos,
  ripples,
}: CustomShowcaseCursorProps) {
  return (
    <>
      {/* Tiny Click Ripples */}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full pointer-events-none z-30 border border-[#E11D48]/60 bg-[#E11D48]/10 animate-ping"
          style={{
            left: r.x - 12,
            top: r.y - 12,
            width: 24,
            height: 24,
            animationDuration: "500ms",
          }}
        />
      ))}

      {/* Floating Virtual Pointer inside Showcase Area (pointer-events-none) */}
      {cursorPos && (
        <div
          className="absolute pointer-events-none z-40 transition-transform duration-75 ease-out hidden sm:block"
          style={{
            left: cursorPos.x,
            top: cursorPos.y,
            transform: "translate(-2px, -2px)",
          }}
        >
          {/* Mac-style minimalist cursor dot / pointer */}
          <div className="relative">
            <svg
              className="w-4 h-4 text-[#171717] drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]"
              viewBox="0 0 24 24"
              fill="none"
            >
              <polygon
                points="3,2 3,20 8,15 13,22 16,20 11,13 19,13"
                fill="#FFFFFF"
                stroke="#171717"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      )}
    </>
  );
}
