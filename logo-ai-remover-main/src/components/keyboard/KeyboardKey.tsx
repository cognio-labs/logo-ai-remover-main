import React from "react";
import { type KeyConfig } from "./keyboardLayout";

export interface KeyboardKeyProps {
  config: KeyConfig;
  isPressed: boolean;
  onPress: (config: KeyConfig) => void;
}

export function KeyboardKey({ config, isPressed, onPress }: KeyboardKeyProps) {
  const {
    code,
    label,
    sub,
    macSymbol,
    width = "w-7 sm:w-8 md:w-9.5",
    isSpecial = false,
    isAccent = false,
    ariaLabel,
  } = config;

  return (
    <button
      type="button"
      id={`key-${code}`}
      aria-label={ariaLabel || `${label} key`}
      aria-pressed={isPressed}
      onClick={() => onPress(config)}
      className={`
        relative group select-none flex flex-col items-center justify-center
        h-8 sm:h-9 md:h-10 ${width} rounded-md sm:rounded-lg text-center
        transition-all duration-100 ease-out cursor-pointer
        focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#E11D48]/60
        ${
          isPressed
            ? "translate-y-[2px] bg-[#E7E7E7] border-[#D4D4D4] shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)]"
            : isAccent
            ? "bg-[#FFFFFF] hover:bg-[#FFF5F7] border border-[#E11D48]/40 shadow-[0_1px_3px_rgba(225,29,72,0.12),0_2px_5px_rgba(0,0,0,0.06),inset_0_-1px_0_rgba(225,29,72,0.1)] hover:border-[#E11D48]/70 hover:shadow-[0_2px_6px_rgba(225,29,72,0.18)]"
            : isSpecial
            ? "bg-[#FAFAFA] hover:bg-[#F1F1F1] border border-[#E5E5E5] text-[#525252] shadow-[0_1px_2px_rgba(0,0,0,0.05),0_2px_4px_rgba(0,0,0,0.03),inset_0_-1px_0_rgba(0,0,0,0.04)]"
            : "bg-[#FFFFFF] hover:bg-[#F1F1F1] border border-[#E5E5E5] text-[#171717] shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_4px_rgba(0,0,0,0.04),inset_0_-1px_0_rgba(0,0,0,0.05)] hover:border-[#D4D4D4]"
        }
      `}
    >
      {/* Top Mac symbol or sub-character */}
      <div className="flex items-center gap-0.5 leading-none">
        {sub && (
          <span className="text-[7px] sm:text-[8px] font-mono text-[#737373] leading-none mb-0.5">
            {sub}
          </span>
        )}
        {macSymbol && (
          <span className={`text-[8px] sm:text-[9px] font-mono leading-none ${isAccent ? "text-[#E11D48]" : "text-[#737373]"}`}>
            {macSymbol}
          </span>
        )}
      </div>

      {/* Primary Key Label */}
      <span
        className={`font-sans font-semibold tracking-tight leading-none ${
          isAccent
            ? "text-[9px] sm:text-[11px] text-[#E11D48] font-bold"
            : isSpecial
            ? "text-[8px] sm:text-[10px] text-[#525252]"
            : "text-[9px] sm:text-[11px] text-[#171717]"
        }`}
      >
        {label}
      </span>

      {/* Subtle indicator dot for active accelerator keys */}
      {isAccent && (
        <span
          className={`absolute bottom-0.5 size-1 rounded-full transition-opacity ${
            isPressed ? "bg-[#E11D48] opacity-100" : "bg-[#E11D48]/40 opacity-70 group-hover:opacity-100"
          }`}
        />
      )}
    </button>
  );
}
