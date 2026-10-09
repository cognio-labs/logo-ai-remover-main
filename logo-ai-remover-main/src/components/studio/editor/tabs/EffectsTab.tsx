import React, { useState } from "react";
import { useEditor } from "../EditorContext";
import { PHOTO_FILTERS } from "../backgroundData";
import { Sliders, SunMedium, Wand2, Sparkles, Check } from "lucide-react";

export function EffectsTab() {
  const { state, dispatch } = useEditor();
  const { background, shadow, activeFilter, cutoutImageUrl } = state;
  const [showFiltersModal, setShowFiltersModal] = useState(true);

  return (
    <div className="p-5 space-y-6 text-gray-800">
      <div>
        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider mb-1">
          Effects & Lighting
        </h3>
        <p className="text-xs text-gray-500 font-normal">
          Refine depth of field, realistic contact shadow, and color grading filters.
        </p>
      </div>

      {/* 1. BLUR BACKGROUND EFFECT */}
      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/90 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <SunMedium className="size-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900">Blur Background</h4>
              <p className="text-[11px] text-gray-500">Lens depth of field</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              dispatch({
                type: "SET_BACKGROUND",
                payload: {
                  blurEnabled: !background.blurEnabled,
                  blur: !background.blurEnabled ? Math.max(12, background.blur) : 0,
                },
              })
            }
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
              background.blurEnabled && background.blur > 0 ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                background.blurEnabled && background.blur > 0 ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {background.blurEnabled && (
          <div className="pt-2 space-y-2 border-t border-gray-200/60">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 font-medium">Blur Radius</span>
              <span className="font-mono text-gray-500">{background.blur}px</span>
            </div>
            <input
              type="range"
              min={1}
              max={40}
              value={background.blur}
              onChange={(e) =>
                dispatch({
                  type: "SET_BACKGROUND",
                  payload: { blur: Number(e.target.value), blurEnabled: true },
                })
              }
              className="w-full accent-blue-600 cursor-pointer h-2 bg-gray-200 rounded-lg"
            />
          </div>
        )}
      </div>

      {/* 2. DROP SHADOW ON CUTOUT */}
      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/90 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900">Subject Contact Shadow</h4>
              <p className="text-[11px] text-gray-500">Realistic ground lighting</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              dispatch({
                type: "SET_SHADOW",
                payload: { enabled: !shadow.enabled },
              })
            }
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
              shadow.enabled ? "bg-purple-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                shadow.enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {shadow.enabled && (
          <div className="pt-2 space-y-3 border-t border-gray-200/60">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 font-medium">Shadow Opacity</span>
                <span className="font-mono text-gray-500">
                  {Math.round(shadow.opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.05}
                value={shadow.opacity}
                onChange={(e) =>
                  dispatch({
                    type: "SET_SHADOW",
                    payload: { opacity: Number(e.target.value) },
                  })
                }
                className="w-full accent-purple-600 cursor-pointer h-2 bg-gray-200 rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 font-medium">Shadow Softness</span>
                <span className="font-mono text-gray-500">{shadow.blur}px</span>
              </div>
              <input
                type="range"
                min={2}
                max={40}
                value={shadow.blur}
                onChange={(e) =>
                  dispatch({
                    type: "SET_SHADOW",
                    payload: { blur: Number(e.target.value) },
                  })
                }
                className="w-full accent-purple-600 cursor-pointer h-2 bg-gray-200 rounded-lg"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. INSTAGRAM-STYLE PHOTO FILTERS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="size-4 text-[#E11D48]" />
            <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Photo Filters
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowFiltersModal(!showFiltersModal)}
            className="text-[11px] font-semibold text-[#E11D48] hover:underline cursor-pointer"
          >
            {showFiltersModal ? "Hide Filters" : "Open Filters"}
          </button>
        </div>

        {showFiltersModal && (
          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
            {PHOTO_FILTERS.map((f) => {
              const isSelected = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() =>
                    dispatch({ type: "SET_FILTER", payload: f.id })
                  }
                  className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "ring-2 ring-[#E11D48] border-[#E11D48] bg-rose-50/50 shadow-xs"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="size-10 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                    <img
                      src={cutoutImageUrl}
                      alt={f.name}
                      className="size-full object-cover"
                      style={{ filter: f.cssFilter }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {f.name}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {f.id === "none" ? "Default" : "Preset"}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="size-3.5 text-[#E11D48] shrink-0" strokeWidth={3} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
