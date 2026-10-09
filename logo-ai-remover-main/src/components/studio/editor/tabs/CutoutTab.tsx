import React from "react";
import { useEditor } from "../EditorContext";
import { Eraser, Paintbrush, Sparkles, RotateCcw, Eye } from "lucide-react";

export function CutoutTab() {
  const { state, dispatch } = useEditor();
  const { brush, cutoutImageUrl } = state;

  return (
    <div className="p-5 space-y-6 text-gray-800">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider">
            Magic Cutout Brush
          </h3>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-[#E11D48] border border-rose-100">
            PRO MATTE
          </span>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed font-normal">
          Click and drag directly on the canvas to erase unwanted details or restore missed edges.
        </p>
      </div>

      {/* Mode Switcher: Erase vs Restore */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-700">Brush Mode</label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl border border-gray-200">
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_BRUSH_MODE", payload: "erase" })}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              brush.mode === "erase"
                ? "bg-white text-rose-600 shadow-sm border border-gray-200/80"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Eraser className="size-4" />
            <span>Erase</span>
          </button>

          <button
            type="button"
            onClick={() => dispatch({ type: "SET_BRUSH_MODE", payload: "restore" })}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              brush.mode === "restore"
                ? "bg-white text-emerald-600 shadow-sm border border-gray-200/80"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Paintbrush className="size-4" />
            <span>Restore</span>
          </button>
        </div>
      </div>

      {/* Brush Size Slider */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-gray-700">Brush Size</span>
          <span className="font-mono text-gray-500 font-medium">{brush.size}px</span>
        </div>
        <input
          type="range"
          min={5}
          max={100}
          value={brush.size}
          onChange={(e) =>
            dispatch({ type: "SET_BRUSH_SIZE", payload: Number(e.target.value) })
          }
          className="w-full accent-[#E11D48] cursor-pointer h-2 bg-gray-200 rounded-lg"
        />
        <div className="flex justify-between text-[10px] text-gray-400 font-mono">
          <span>5px (Fine)</span>
          <span>50px</span>
          <span>100px (Broad)</span>
        </div>
      </div>

      {/* Magic Brush Toggle */}
      <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-200/90">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-gradient-to-tr from-[#E11D48] to-[#FF2E63] text-white flex items-center justify-center shadow-xs">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Edge Snapping</h4>
            <p className="text-[11px] text-gray-500">Auto-detect boundaries</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: "TOGGLE_MAGIC_BRUSH" })}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            brush.magicBrush ? "bg-[#E11D48]" : "bg-gray-300"
          }`}
        >
          <span
            className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              brush.magicBrush ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Cutout Thumbnail Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
          <span>Current Cutout</span>
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <Eye className="size-3" />
            <span>Isolated Alpha</span>
          </span>
        </div>
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-gray-200 checkerboard-pattern flex items-center justify-center shadow-inner">
          <img
            src={cutoutImageUrl}
            alt="Cutout Thumbnail"
            className="max-h-full max-w-full object-contain p-2 filter drop-shadow-sm"
          />
        </div>
      </div>

      {/* Reset Cutout Mask Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => dispatch({ type: "RESET_ALL" })}
          className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <RotateCcw className="size-3.5" />
          <span>Reset to Original Cutout</span>
        </button>
      </div>
    </div>
  );
}
