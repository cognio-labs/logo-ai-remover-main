import React from "react";
import { Command, Volume2, VolumeX, Sparkles } from "lucide-react";

export interface KeyboardHeaderProps {
  lastAction: string;
  soundOn: boolean;
  onToggleSound: () => void;
  onExecutePrimary?: () => void;
}

export function KeyboardHeader({
  lastAction,
  soundOn,
  onToggleSound,
  onExecutePrimary,
}: KeyboardHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3 sm:px-6 pb-4 border-b border-[#E5E5E5] text-xs">
      {/* Left: Premium Header with Brand Dot */}
      <div className="flex items-center gap-3">
        <span className="size-2 rounded-full bg-[#E11D48] shadow-[0_0_8px_rgba(225,29,72,0.4)]" />
        <div className="flex flex-col text-left leading-tight">
          <span className="font-sans font-semibold text-[#171717] tracking-wider uppercase text-xs sm:text-sm">
            PIXELREFINE STUDIO
          </span>
          <span className="font-mono text-[9px] sm:text-[10px] text-[#737373] tracking-widest uppercase">
            INTERACTIVE CONTROLS
          </span>
        </div>

        {/* Dynamic Action Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] text-[#171717] font-mono text-[10px]">
          <Sparkles className="size-3 text-[#E11D48]" />
          <span className="text-[#525252] truncate max-w-[220px]">{lastAction}</span>
        </div>
      </div>

      {/* Right: Mac Command Action & Sound Toggle */}
      <div className="flex items-center gap-2.5">
        {/* [⌘ ENTER] Execute Neural AI Action Badge */}
        <button
          type="button"
          onClick={onExecutePrimary}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFFFF] hover:bg-[#FFF5F7] border border-[#E5E5E5] hover:border-[#E11D48]/50 text-[#171717] hover:text-[#E11D48] font-sans font-semibold text-[10px] sm:text-xs shadow-xs transition-all cursor-pointer group"
          title="Press Command + Enter or click to execute AI inpaint"
        >
          <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#F5F5F5] group-hover:bg-[#FFE4E9] border border-[#E5E5E5] text-[9px] font-mono text-[#525252] group-hover:text-[#E11D48]">
            <Command className="size-2.5" />
            <span>ENTER</span>
          </kbd>
          <span className="hidden sm:inline">Execute Neural AI</span>
        </button>

        {/* Sound Toggle (Lucide Icons, No Emoji) */}
        <button
          type="button"
          onClick={onToggleSound}
          aria-label={soundOn ? "Mute acoustics" : "Enable tactile sound"}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] sm:text-xs font-semibold transition-all cursor-pointer shadow-xs ${
            soundOn
              ? "bg-[#FFFFFF] border-[#E11D48]/40 text-[#E11D48] hover:bg-[#FFF5F7]"
              : "bg-[#FAFAFA] border-[#E5E5E5] text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5]"
          }`}
        >
          {soundOn ? (
            <Volume2 className="size-3.5 text-[#E11D48]" />
          ) : (
            <VolumeX className="size-3.5 text-[#737373]" />
          )}
          <span>{soundOn ? "Sound: ON" : "Sound: OFF"}</span>
        </button>
      </div>
    </div>
  );
}
