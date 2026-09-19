import React from "react";

export interface HotkeyItem {
  key: string;
  label: string;
  actionId: string;
  tooltip: string;
}

export const HOTKEY_ITEMS: HotkeyItem[] = [
  {
    key: "U",
    label: "8K Upscale",
    actionId: "u",
    tooltip: "Upscale low-res image/video frames to 8K clarity",
  },
  {
    key: "V",
    label: "Video AI",
    actionId: "v",
    tooltip: "Remove Gemini/Sora/Veo watermarks from video",
  },
  {
    key: "P",
    label: "PDF Cleaner",
    actionId: "p",
    tooltip: "Erase stamps, annotations & signatures from PDFs",
  },
  {
    key: "SPACE",
    label: "Instant Inpaint",
    actionId: "space",
    tooltip: "Trigger immediate neural clean on active selection",
  },
];

export interface HotkeyBarProps {
  onSelectHotkey?: (actionId: string) => void;
}

export function HotkeyBar({ onSelectHotkey }: HotkeyBarProps) {
  return (
    <div className="mt-5 pt-4 border-t border-[#E5E5E5] flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 text-xs">
      <span className="font-mono font-bold text-[#737373] uppercase tracking-wider text-[10px]">
        HOTKEYS:
      </span>

      {HOTKEY_ITEMS.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelectHotkey?.(item.actionId)}
          title={item.tooltip}
          className="group relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFFFFF] hover:bg-[#FFF5F7] border border-[#E5E5E5] hover:border-[#E11D48]/50 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_rgba(225,29,72,0.12)] hover:-translate-y-0.5 transition-all duration-150 cursor-pointer text-left"
        >
          {/* Key badge */}
          <kbd className="px-1.5 py-0.5 rounded bg-[#F5F5F5] group-hover:bg-[#FFE4E9] border border-[#E5E5E5] group-hover:border-[#E11D48]/30 font-mono font-bold text-[10px] text-[#171717] group-hover:text-[#E11D48] transition-colors shadow-2xs">
            {item.key}
          </kbd>

          {/* Label */}
          <span className="font-sans font-medium text-[11px] text-[#525252] group-hover:text-[#171717] transition-colors">
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}
