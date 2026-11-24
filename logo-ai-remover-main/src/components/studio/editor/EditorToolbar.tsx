import React, { useState, useRef, useEffect } from "react";
import { useEditor } from "./EditorContext";
import type { ActiveTab } from "./types";
import {
  Wand2,
  Image as ImageIcon,
  CircleDot,
  SlidersHorizontal,
  LayoutGrid,
  Type,
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

  // Global keyboard shortcuts (Ctrl+Z / Cmd+Z for Undo, Ctrl+Y / Cmd+Shift+Z for Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        if (canRedo) redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  const handleTabClick = (tab: ActiveTab) => {
    dispatch({ type: "SET_ACTIVE_TAB", payload: tab });
  };

  const tabs: { id: ActiveTab; label: string; icon: React.FC<{ className?: string; style?: React.CSSProperties }> }[] = [
    { id: "cutout", label: "Cutout", icon: Wand2 },
    { id: "background", label: "Background", icon: ImageIcon },
    { id: "effects", label: "Effects", icon: CircleDot },
    { id: "adjust", label: "Adjust", icon: SlidersHorizontal },
    { id: "design", label: "Design", icon: LayoutGrid },
  ];

  return (
    <div
      className="relative z-30 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 px-3 sm:px-5 py-2 bg-white rounded-2xl sm:rounded-full border border-slate-200/90 shadow-md w-full max-w-4xl lg:max-w-5xl mx-auto"
    >
      {/* 1. TABS: Five Remove.bg / Canva-style Editing Tabs */}
      <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5 touch-pan-x w-full sm:w-auto min-w-0 justify-start">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                handleTabClick(tab.id);
                if (tab.id === "design") {
                  toast.info("Canva Design Studio bridge is connected.");
                }
              }}
              className={`shrink-0 flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                isActive
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "border-transparent bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon
                className="size-3.5 shrink-0"
              />
              <span className="font-semibold text-xs tracking-tight whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. CONTROLS: Compare, Undo, Redo, Download Dropdown */}
      <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 border-t sm:border-t-0 border-slate-100 pt-1.5 sm:pt-0">
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Before / After Split Compare */}
          <button
            type="button"
            onClick={() =>
              dispatch({ type: "SET_COMPARE", payload: !isCompareActive })
            }
            className={`size-8 sm:size-9 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
              isCompareActive
                ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs"
            }`}
            title="Hold or toggle to compare with original"
          >
            <Columns2 className="size-3.5 sm:size-4" />
          </button>

          {/* Undo (Left Curved Arrow) */}
          <button
            type="button"
            onClick={() => {
              if (canUndo) {
                undo();
                toast.success("Action undone");
              } else {
                toast.info("No edits to undo yet. Make an edit or change background first!");
              }
            }}
            className={`size-8 sm:size-9 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
              canUndo
                ? "bg-slate-900 border-slate-900 text-white hover:scale-105 shadow-xs"
                : "bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 shadow-2xs"
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="size-3.5 sm:size-4" />
          </button>

          {/* Redo (Right Curved Arrow) */}
          <button
            type="button"
            onClick={() => {
              if (canRedo) {
                redo();
                toast.success("Action redone");
              } else {
                toast.info("No edits to redo.");
              }
            }}
            className={`size-8 sm:size-9 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
              canRedo
                ? "bg-slate-900 border-slate-900 text-white hover:scale-105 shadow-xs"
                : "bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 shadow-2xs"
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="size-3.5 sm:size-4" />
          </button>
        </div>

        {/* DOWNLOAD BUTTON MATCHING SCREENSHOT 4 (BLUE PILL WITH CHEVRON DOWN) */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDownloadOpen(!downloadOpen)}
            className="flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer hover:scale-102 active:scale-98 bg-[#0070F3] hover:bg-[#0060df] text-white shrink-0"
          >
            <span className="font-bold text-white whitespace-nowrap">
              Download
            </span>
            <ChevronDown
              className="size-3.5 text-white stroke-[2.5]"
            />
          </button>

          {/* EXACT REMOVE.BG DROPDOWN MENU */}
          {downloadOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              {/* Option 1: Preview Free */}
              <button
                type="button"
                onClick={() => {
                  setDownloadOpen(false);
                  onDownload("preview");
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Eye className="size-4 text-emerald-600 group-hover:text-emerald-700 transition-colors" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Preview</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      408 × 612
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Free
                </span>
              </button>

              <div className="my-1 border-t border-slate-100" />

              {/* Option 2: Max HD (Unlock) */}
              <button
                type="button"
                onClick={() => {
                  setDownloadOpen(false);
                  onDownload("max");
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Zap className="size-4 text-amber-500 fill-amber-500 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Max HD</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Original 4K / UHD
                    </div>
                  </div>
                </div>
                <span
                  className="text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs bg-emerald-600 text-white"
                >
                  Best Quality
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
