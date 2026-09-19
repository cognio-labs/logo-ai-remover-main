import React from "react";

export interface MouseButtonProps {
  side: "left" | "right";
  isPressed: boolean;
  onPress: () => void;
  onRelease?: () => void;
  children?: React.ReactNode;
}

export function MouseButton({
  side,
  isPressed,
  onPress,
  onRelease,
  children,
}: MouseButtonProps) {
  const isLeft = side === "left";
  return (
    <button
      type="button"
      id={`mouse-btn-${side}`}
      aria-label={isLeft ? "Left mouse button" : "Right mouse button"}
      onMouseDown={onPress}
      onMouseUp={onRelease}
      onTouchStart={onPress}
      onTouchEnd={onRelease}
      onContextMenu={(e) => {
        if (!isLeft) {
          e.preventDefault();
          onPress();
        }
      }}
      className={`
        relative flex-1 h-full select-none cursor-pointer
        transition-all duration-100 ease-out flex flex-col items-center justify-start pt-3
        focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-[#E11D48]/40
        ${isLeft ? "rounded-tl-[36px]" : "rounded-tr-[36px]"}
        ${
          isPressed
            ? "bg-[#EAEAEA] shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)] translate-y-[1px]"
            : "hover:bg-[#F5F5F5] bg-transparent"
        }
      `}
    >
      <span className="text-[8px] sm:text-[9px] font-mono tracking-widest text-[#A3A3A3] uppercase opacity-70 group-hover:opacity-100">
        {isLeft ? "L" : "R"}
      </span>
      {children}
    </button>
  );
}
