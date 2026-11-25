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
  FileImage,
} from "lucide-react";
import { toast } from "sonner";

export function EditorToolbar({
  onDownload,
}: {
  onDownload: (resolution: "preview" | "max" | "jpg-white" | "jpg-black") => void;
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

  const tabs: {
    id: ActiveTab;
    label: string;
    icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  }[] = [
    { id: "cutout", label: "Cutout", icon: Wand2 },
    { id: "background", label: "Background", icon: ImageIcon },
    { id: "effects", label: "Effects", icon: CircleDot },
    { id: "adjust", label: "Adjust", icon: SlidersHorizontal },
    { id: "design", label: "Design", icon: LayoutGrid },
  ];

  return (
    <div className="relative z-30 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-4 px-3 sm:px-4 py-2 bg-white rounded-xl border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] w-full max-w-4xl lg:max-w-5xl mx-auto">
      {/* 1. TABS: Five Remove.bg / Canva-style Editing Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5 touch-pan-x w-full sm:w-auto min-w-0 justify-start">
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
              className={`shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap border-2 ${
                isActive
                  ? "bg-[#d0f471] text-[#0b0f0d] border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]"
                  : "border-transparent bg-transparent text-[#0b0f0d] hover:bg-[#f7f5ee] hover:border-[#0b0f0d]"
              }`}
            >
              <Icon className="size-3.5 shrink-0" />
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
            onClick={() => dispatch({ type: "SET_COMPARE", payload: !isCompareActive })}
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

        {/* DOWNLOAD BUTTON MATCHING USER SCREENSHOT (Vibrant Blue Pill with Chevron) */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDownloadOpen(!downloadOpen)}
            className="flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-black uppercase tracking-wide border-2 border-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] transition-all cursor-pointer hover:bg-[#ffe500] active:translate-x-[1px] active:translate-y-[1px] bg-[#d0f471] text-[#0b0f0d] shrink-0"
          >
            <span className="font-black text-[#0b0f0d] whitespace-nowrap">Download</span>
            <ChevronDown className="size-3.5 text-[#0b0f0d] stroke-[2.5]" />
          </button>

          {/* REMOVE.BG / PHOTOROOM STYLE EXPORT OPTIONS */}
          {downloadOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-white shadow-[6px_6px_0px_#0b0f0d] border-[2.5px] border-[#0b0f0d] p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
              {/* Option 1: Transparent PNG (Lossless Alpha) */}
              <button
                type="button"
                onClick={() => {
                  setDownloadOpen(false);
                  onDownload("max");
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Zap className="size-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">PNG (Transparent)</div>
                    <div className="text-[11px] text-slate-500 font-mono">32-Bit RGBA · True Alpha</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Recommended
                </span>
              </button>

              {/* Option 2: Solid White JPG (Amazon / eCommerce) */}
              <button
                type="button"
                onClick={() => {
                  setDownloadOpen(false);
                  onDownload("jpg-white");
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="size-4 rounded-full border border-slate-300 bg-white shadow-2xs" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">JPG (White BG)</div>
                    <div className="text-[11px] text-slate-500 font-mono">Shopify · Amazon Studio</div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  JPG
                </span>
              </button>

              {/* Option 3: Solid Black JPG (Pro Dark) */}
              <button
                type="button"
                onClick={() => {
                  setDownloadOpen(false);
                  onDownload("jpg-black");
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="size-4 rounded-full border border-slate-700 bg-slate-900 shadow-2xs" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">JPG (Dark BG)</div>
                    <div className="text-[11px] text-slate-500 font-mono">Pro Charcoal Backdrop</div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  JPG
                </span>
              </button>

              <div className="my-1 border-t border-slate-100" />

              {/* Option 4: Free Low-Res Preview */}
              <button
                type="button"
                onClick={() => {
                  setDownloadOpen(false);
                  onDownload("preview");
                }}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Eye className="size-4 text-slate-500 group-hover:text-slate-700 transition-colors" />
                  <div>
                    <div className="text-xs font-semibold text-slate-700">Preview Quality</div>
                    <div className="text-[10px] text-slate-400 font-mono">Fast Web Preview</div>
                  </div>
                </div>
                <span className="text-[10px] font-medium text-slate-500">Free</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
