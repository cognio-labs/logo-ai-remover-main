import React, { useState } from "react";
import { useEditor } from "../EditorContext";
import {
  Eraser,
  Paintbrush,
  Sparkles,
  RotateCcw,
  Eye,
  FileText,
  Loader2,
  CheckCircle2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

export function CutoutTab({
  onSelectMode,
}: {
  onSelectMode?: (mode: "text" | "object" | "custom") => void;
}) {
  const { state, dispatch } = useEditor();
  const { brush } = state;
  return (
    <div className="p-4 space-y-5 text-[#10241E]">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#10241E]">
            Refine your cutout
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#10241E] border border-emerald-200">
            MANUAL CONTROL
          </span>
        </div>
        <p className="text-xs text-[#52645D] leading-relaxed">
          Refine subject boundaries with the manual brush, or remove unwanted text, watermarks, and
          objects.
        </p>
      </div>

      {/* 3-Mode Text & Graphics Engine */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#10241E]">Text &amp; Subject Mode</span>
          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            AI MATTING
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-2xl border border-gray-200">
          <button
            type="button"
            onClick={() => toast.success("Auto Mode active: Preserves thumbnail & banner titles, strips distant watermarks.")}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm border border-[#2B4B3F] bg-[#10241E] text-[#d0f471]"
          >
            <span>Auto</span>
            <span className="text-[9px] font-normal opacity-80">Smart Title</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (onSelectMode) onSelectMode("text");
              else toast.info("Subject Only Mode: Strips text, badges, and background logos.");
            }}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer bg-white text-[#52645D] hover:text-[#10241E] border border-gray-200"
          >
            <span>Subject Only</span>
            <span className="text-[9px] font-normal opacity-80">Clean Body</span>
          </button>
          <button
            type="button"
            onClick={() => toast.success("Keep Text Mode active: Retains sharp typographic edges on all text and graphics.")}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer bg-white text-[#52645D] hover:text-[#10241E] border border-gray-200"
          >
            <span>Keep Text</span>
            <span className="text-[9px] font-normal opacity-80">Logos &amp; Text</span>
          </button>
        </div>
      </div>

      <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
        <p className="text-xs text-slate-600">
          Want to remove an isolated object or specific text sticker? Select below:
        </p>
        {onSelectMode &&
          (["text", "object", "custom"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onSelectMode(mode)}
              className="w-full py-2 text-xs border border-slate-200 bg-white hover:bg-slate-50 rounded-xl font-semibold text-slate-700 cursor-pointer transition-colors"
            >
              {mode === "custom"
                ? "Smart Custom Selection"
                : mode === "text"
                  ? "Select Text Area to Inpaint"
                  : "Select Unwanted Object to Inpaint"}
            </button>
          ))}
      </div>

      {/* Mode Switcher: Erase vs Restore */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-[#10241E]">Manual Precision Brush</label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl border border-gray-200">
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_BRUSH_MODE", payload: "erase" })}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              brush.mode === "erase"
                ? "shadow-sm border border-[#2B4B3F] bg-[#10241E] text-white"
                : "bg-transparent text-[#52645D] hover:text-[#10241E]"
            }`}
          >
            <Eraser className="size-3.5" />
            <span>Erase Area</span>
          </button>

          <button
            type="button"
            onClick={() => dispatch({ type: "SET_BRUSH_MODE", payload: "restore" })}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              brush.mode === "restore"
                ? "shadow-sm border border-[#2B4B3F] bg-[#10241E] text-[#d0f471]"
                : "bg-transparent text-[#52645D] hover:text-[#10241E]"
            }`}
          >
            <Paintbrush className="size-3.5" />
            <span>Restore Edge</span>
          </button>
        </div>
      </div>

      {/* Brush Size Slider */}
      <label className="block text-xs text-slate-700">
        Selection shape
        <select
          aria-label="Cutout selection shape"
          value={brush.shape || "brush"}
          onChange={(e) =>
            dispatch({
              type: "SET_BRUSH_SHAPE",
              payload: e.target.value as "brush" | "rectangle" | "lasso",
            })
          }
          className="block w-full mt-2 p-2 border rounded-xl bg-white"
        >
          <option value="brush">Brush</option>
          <option value="rectangle">Rectangle</option>
          <option value="lasso">Lasso</option>
        </select>
      </label>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#10241E]">Brush Size</span>
          <span className="font-mono text-[#52645D]">{brush.size}px</span>
        </div>
        <input
          type="range"
          min={5}
          max={100}
          value={brush.size}
          onChange={(e) => dispatch({ type: "SET_BRUSH_SIZE", payload: Number(e.target.value) })}
          className="w-full accent-[#10241E] cursor-pointer h-2 bg-gray-200 rounded-lg"
        />
        <div className="flex justify-between text-[10px] text-gray-400 font-mono">
          <span>5px (Fine hair)</span>
          <span>50px</span>
          <span>100px (Broad)</span>
        </div>
      </div>

      {/* Magic Soft edge brush Toggle */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-200/90">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-xl bg-[#10241E] text-[#d0f471] flex items-center justify-center shadow-xs">
            <Sparkles className="size-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#10241E]">Soft edge brush</h4>
            <p className="text-[10px] text-[#52645D]">Soft brush falloff</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: "TOGGLE_MAGIC_BRUSH" })}
          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
            brush.magicBrush ? "bg-[#10241E]" : "bg-gray-300"
          }`}
        >
          <span
            className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
              brush.magicBrush ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Reset Cutout Mask Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => dispatch({ type: "RESET_ALL" })}
          className="w-full py-2 px-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-[#10241E] text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <RotateCcw className="size-3.5" />
          <span>Reset Edits</span>
        </button>
      </div>
    </div>
  );
}
