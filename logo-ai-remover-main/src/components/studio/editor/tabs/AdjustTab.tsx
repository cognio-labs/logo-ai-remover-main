import React from "react";
import { useEditor } from "../EditorContext";
import type { CropAspect } from "../types";
import {
  Sun,
  Contrast,
  Droplets,
  Gauge,
  Crop,
  Maximize2,
  RotateCcw,
} from "lucide-react";

const ASPECT_PRESETS: { id: CropAspect; label: string; ratio: string }[] = [
  { id: "free", label: "Original", ratio: "Auto" },
  { id: "1:1", label: "Square", ratio: "1:1 (Insta)" },
  { id: "4:5", label: "Portrait", ratio: "4:5 (Post)" },
  { id: "9:16", label: "Story", ratio: "9:16 (Reel)" },
  { id: "16:9", label: "Landscape", ratio: "16:9 (HD)" },
  { id: "3:2", label: "Classic", ratio: "3:2 (DSLR)" },
];

export function AdjustTab() {
  const { state, dispatch } = useEditor();
  const { adjust } = state;

  return (
    <div className="p-5 space-y-6 text-gray-800">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider mb-1">
            Color & Dimensions
          </h3>
          <p className="text-xs text-gray-500 font-normal">
            Fine-tune exposure, color balance, and canvas framing presets.
          </p>
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: "RESET_ADJUST" })}
          className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 cursor-pointer"
          title="Reset sliders"
        >
          <RotateCcw className="size-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* 1. COLOR & LIGHT SLIDERS */}
      <div className="space-y-4 p-4 bg-gray-50 rounded-2xl border border-gray-200/90">
        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
          Color &amp; Light
        </h4>

        {/* Brightness */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-gray-700 font-medium">
              <Sun className="size-3.5 text-amber-500" />
              <span>Brightness</span>
            </span>
            <span className="font-mono text-gray-500">{adjust.brightness}%</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={adjust.brightness}
            onChange={(e) =>
              dispatch({
                type: "SET_ADJUST",
                payload: { brightness: Number(e.target.value) },
              })
            }
            className="w-full accent-[#E11D48] cursor-pointer h-2 bg-gray-200 rounded-lg"
          />
        </div>

        {/* Contrast */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-gray-700 font-medium">
              <Contrast className="size-3.5 text-blue-500" />
              <span>Contrast</span>
            </span>
            <span className="font-mono text-gray-500">{adjust.contrast}%</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={adjust.contrast}
            onChange={(e) =>
              dispatch({
                type: "SET_ADJUST",
                payload: { contrast: Number(e.target.value) },
              })
            }
            className="w-full accent-[#E11D48] cursor-pointer h-2 bg-gray-200 rounded-lg"
          />
        </div>

        {/* Saturation */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-gray-700 font-medium">
              <Droplets className="size-3.5 text-rose-500" />
              <span>Saturation</span>
            </span>
            <span className="font-mono text-gray-500">{adjust.saturation}%</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={adjust.saturation}
            onChange={(e) =>
              dispatch({
                type: "SET_ADJUST",
                payload: { saturation: Number(e.target.value) },
              })
            }
            className="w-full accent-[#E11D48] cursor-pointer h-2 bg-gray-200 rounded-lg"
          />
        </div>

        {/* Exposure */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-gray-700 font-medium">
              <Gauge className="size-3.5 text-emerald-500" />
              <span>Exposure</span>
            </span>
            <span className="font-mono text-gray-500">{adjust.exposure}%</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={adjust.exposure}
            onChange={(e) =>
              dispatch({
                type: "SET_ADJUST",
                payload: { exposure: Number(e.target.value) },
              })
            }
            className="w-full accent-[#E11D48] cursor-pointer h-2 bg-gray-200 rounded-lg"
          />
        </div>
      </div>

      {/* 2. CROP & ASPECT RATIO PRESETS */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 uppercase tracking-wider">
          <Crop className="size-4 text-[#E11D48]" />
          <span>Crop &amp; Aspect Ratio</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {ASPECT_PRESETS.map((preset) => {
            const isSelected = adjust.cropAspect === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  dispatch({
                    type: "SET_ADJUST",
                    payload: { cropAspect: preset.id },
                  })
                }
                className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? "bg-rose-50 border-[#E11D48] text-rose-700 shadow-xs font-bold"
                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 text-xs font-medium"
                }`}
              >
                <div className="text-xs truncate">{preset.label}</div>
                <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                  {preset.ratio}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. EXPAND & BORDER STROKE */}
      <div className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-200/90">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold text-gray-900 uppercase tracking-wider">
            <Maximize2 className="size-4 text-purple-600" />
            <span>Canvas Border Outline</span>
          </span>
          <span className="font-mono text-xs text-gray-500">
            {adjust.borderWidth}px
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={20}
          value={adjust.borderWidth}
          onChange={(e) =>
            dispatch({
              type: "SET_ADJUST",
              payload: { borderWidth: Number(e.target.value) },
            })
          }
          className="w-full accent-purple-600 cursor-pointer h-2 bg-gray-200 rounded-lg"
        />

        {adjust.borderWidth > 0 && (
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-gray-600 font-medium">Border Color</span>
            <input
              type="color"
              value={adjust.borderColor}
              onChange={(e) =>
                dispatch({
                  type: "SET_ADJUST",
                  payload: { borderColor: e.target.value },
                })
              }
              className="size-6 rounded-full cursor-pointer border border-gray-300 p-0"
            />
          </div>
        )}
      </div>
    </div>
  );
}
