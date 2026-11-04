import React, { useState, useRef, useEffect } from "react";
import { useEditor } from "./EditorContext";
import type { ActiveTab } from "./types";
import {
  Wand2,
  Image as ImageIcon,
  CircleDot,
  SlidersHorizontal,
  LayoutGrid,
  Columns2,
  Undo2,
  Redo2,
  ChevronDown,
  Eye,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export function EditorToolbar({
  onDownload,
}: {
  onDownload: (resolution: "preview" | "max") => void;
}) {
  const { state, dispatch, undo, redo } = useEditor();
  const { activeTab, isCompareActive, canUndo, canRedo } = state;
  const [downloadOpen, setDownloadOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDownloadOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleTabClick = (tab: ActiveTab) => {
    dispatch({ type: "SET_ACTIVE_TAB", payload: tab });
  };

  return (
    <div className="relative z-30 flex items-center justify-between px-3 sm:px-6 py-2.5 bg-[#151515] border-b border-[#303030] shadow-xs">
      {/* LEFT: Five Remove.bg / Canva-style Editing Tabs */}
      <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => handleTabClick("cutout")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "cutout"
              ? "bg-[#E11D48] text-white shadow-xs scale-102"
              : "text-[#C7C7C7] hover:text-white hover:bg-[#1C1C1C]"
          }`}
        >
          <Wand2 className="size-3.5" />
          <span>Cutout</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick("background")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "background"
              ? "bg-[#E11D48] text-white shadow-xs scale-102"
              : "text-[#C7C7C7] hover:text-white hover:bg-[#1C1C1C]"
          }`}
        >
          <ImageIcon className="size-3.5" />
          <span>Background</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick("effects")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "effects"
              ? "bg-[#E11D48] text-white shadow-xs scale-102"
              : "text-[#C7C7C7] hover:text-white hover:bg-[#1C1C1C]"
          }`}
        >
          <CircleDot className="size-3.5" />
          <span>Effects</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick("adjust")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "adjust"
              ? "bg-[#E11D48] text-white shadow-xs scale-102"
              : "text-[#C7C7C7] hover:text-white hover:bg-[#1C1C1C]"
          }`}
        >
          <SlidersHorizontal className="size-3.5" />
          <span>Adjust</span>
        </button>

        <button
          type="button"
          onClick={() => {
            handleTabClick("design");
            toast.info("Canva Design Studio bridge is connected.");
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "design"
              ? "bg-[#E11D48] text-white shadow-xs scale-102"
              : "text-[#C7C7C7] hover:text-white hover:bg-[#1C1C1C]"
          }`}
        >
          <LayoutGrid className="size-3.5" />
          <span>Design</span>
        </button>
      </div>

      {/* RIGHT: Controls (Compare, Undo, Redo, Download Dropdown) */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Divider */}
        <span className="hidden sm:inline-block h-5 w-[1px] bg-[#303030] mx-1" />

        {/* Before / After Split Compare */}
        <button
          type="button"
          onClick={() =>
            dispatch({ type: "SET_COMPARE", payload: !isCompareActive })
          }
          className={`size-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isCompareActive
              ? "bg-[#E11D48] text-white shadow-xs"
              : "text-[#8E8E8E] hover:bg-[#1C1C1C] hover:text-white"
          }`}
          title="Hold or toggle to compare with original"
        >
          <Columns2 className="size-4" />
        </button>

        {/* Undo */}
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          className="size-8 rounded-full flex items-center justify-center text-[#8E8E8E] hover:bg-[#1C1C1C] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="size-4" />
        </button>

        {/* Redo */}
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          className="size-8 rounded-full flex items-center justify-center text-[#8E8E8E] hover:bg-[#1C1C1C] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="size-4" />
        </button>

        {/* DOWNLOAD BUTTON WITH EXACT REMOVE.BG POPUP DROPDOWN */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDownloadOpen(!downloadOpen)}
            className="flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] hover:from-[#BE123C] hover:to-[#E11D48] text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-500/25 transition-all cursor-pointer hover:scale-102 active:scale-98"
          >
            <span>Download</span>
            <ChevronDown className="size-3.5" />
          </button>

          {/* EXACT REMOVE.BG DROPDOWN MENU */}
          {downloadOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[#1C1C1C] shadow-2xl border border-[#303030] p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Option 1: Preview Free */}
              <button
                type="button"
                onClick={() => {
                  setDownloadOpen(false);
                  onDownload("preview");
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#252525] transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Eye className="size-4 text-gray-500 group-hover:text-blue-600 transition-colors" />
                  <div>
                    <div className="text-xs font-bold text-white">Preview</div>
                    <div className="text-[11px] text-[#8E8E8E] font-mono">
                      408 × 612
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#151515] text-[#C7C7C7] border border-[#303030]">
                  Free
                </span>
              </button>

              <div className="my-1 border-t border-[#303030]" />

              {/* Option 2: Max HD (Unlock) */}
              <button
                type="button"
                onClick={() => {
                  setDownloadOpen(false);
                  onDownload("max");
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#252525] transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Zap className="size-4 text-amber-500 fill-amber-500 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-bold text-white">Max HD</div>
                    <div className="text-[11px] text-[#8E8E8E] font-mono">
                      4480 × 6720
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400 text-gray-950 shadow-xs">
                  Unlock
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
