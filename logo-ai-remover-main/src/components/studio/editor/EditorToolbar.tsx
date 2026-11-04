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

  const tabs: { id: ActiveTab; label: string; icon: React.FC<{ className?: string; style?: React.CSSProperties }> }[] = [
    { id: "cutout", label: "Cutout", icon: Wand2 },
    { id: "background", label: "Background", icon: ImageIcon },
    { id: "effects", label: "Effects", icon: CircleDot },
    { id: "adjust", label: "Adjust", icon: SlidersHorizontal },
    { id: "design", label: "Design", icon: LayoutGrid },
  ];

  return (
    <div
      className="relative z-30 flex items-center justify-between px-3 sm:px-6 py-2.5 bg-white border-b border-gray-200 shadow-xs"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
    >
      {/* LEFT: Five Remove.bg / Canva-style Editing Tabs */}
      <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar">
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
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                isActive
                  ? "shadow-sm scale-102 border-[#2B4B3F]"
                  : "border-transparent hover:bg-gray-100"
              }`}
              style={
                isActive
                  ? { backgroundColor: "#10241E", color: "#d0f471", borderColor: "#2B4B3F" }
                  : { backgroundColor: "transparent", color: "#37433D" }
              }
            >
              <Icon
                className="size-3.5"
                style={{ color: isActive ? "#d0f471" : "#52645D" }}
              />
              <span style={{ color: isActive ? "#d0f471" : "#37433D" }} className="font-semibold">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* RIGHT: Controls (Compare, Undo, Redo, Download Dropdown) */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Divider */}
        <span className="hidden sm:inline-block h-5 w-[1px] bg-gray-200 mx-1" />

        {/* Before / After Split Compare */}
        <button
          type="button"
          onClick={() =>
            dispatch({ type: "SET_COMPARE", payload: !isCompareActive })
          }
          className={`size-8 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
            isCompareActive ? "border-[#2B4B3F]" : "border-gray-200 hover:bg-gray-100"
          }`}
          style={
            isCompareActive
              ? { backgroundColor: "#10241E", color: "#d0f471" }
              : { backgroundColor: "#FFFFFF", color: "#37433D" }
          }
          title="Hold or toggle to compare with original"
        >
          <Columns2 className="size-4" style={{ color: isCompareActive ? "#d0f471" : "#37433D" }} />
        </button>

        {/* Undo */}
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          className="size-8 rounded-full flex items-center justify-center border border-gray-200 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          style={{ backgroundColor: "#FFFFFF", color: "#37433D" }}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="size-4" style={{ color: "#37433D" }} />
        </button>

        {/* Redo */}
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          className="size-8 rounded-full flex items-center justify-center border border-gray-200 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          style={{ backgroundColor: "#FFFFFF", color: "#37433D" }}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="size-4" style={{ color: "#37433D" }} />
        </button>

        {/* DOWNLOAD BUTTON WITH EXACT REMOVE.BG POPUP DROPDOWN */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDownloadOpen(!downloadOpen)}
            className="flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer hover:scale-102 active:scale-98"
            style={{ backgroundColor: "#d0f471", color: "#071A13" }}
          >
            <span style={{ color: "#071A13" }} className="font-bold text-[#071A13]">
              Download
            </span>
            <ChevronDown
              className="size-3.5 text-[#071A13]"
              style={{ color: "#071A13", stroke: "#071A13" }}
            />
          </button>

          {/* EXACT REMOVE.BG DROPDOWN MENU */}
          {downloadOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white shadow-2xl border border-gray-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
            >
              {/* Option 1: Preview Free */}
              <button
                type="button"
                onClick={() => {
                  setDownloadOpen(false);
                  onDownload("preview");
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Eye className="size-4 text-emerald-600 group-hover:text-emerald-700 transition-colors" />
                  <div>
                    <div className="text-xs font-bold text-[#10241E]">Preview</div>
                    <div className="text-[11px] text-[#718278] font-mono">
                      408 × 612
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#10241E] border border-emerald-200">
                  Free
                </span>
              </button>

              <div className="my-1 border-t border-gray-100" />

              {/* Option 2: Max HD (Unlock) */}
              <button
                type="button"
                onClick={() => {
                  setDownloadOpen(false);
                  onDownload("max");
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Zap className="size-4 text-amber-500 fill-amber-500 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-bold text-[#10241E]">Max HD</div>
                    <div className="text-[11px] text-[#718278] font-mono">
                      4480 × 6720
                    </div>
                  </div>
                </div>
                <span
                  className="text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs"
                  style={{ backgroundColor: "#d0f471", color: "#071A13" }}
                >
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
