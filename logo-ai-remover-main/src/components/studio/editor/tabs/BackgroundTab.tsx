import React, { useState, useRef } from "react";
import { useEditor } from "../EditorContext";
import {
  MAGIC_BACKGROUNDS,
  PHOTO_BACKGROUNDS,
  COLOR_SWATCHES,
} from "../backgroundData";
import type { BackgroundSubTab } from "../types";
import {
  Sparkles,
  Camera,
  Palette,
  Upload,
  Ban,
  Check,
  Sliders,
} from "lucide-react";

export function BackgroundTab() {
  const { state, dispatch } = useEditor();
  const { background } = state;
  const [subTab, setSubTab] = useState<BackgroundSubTab>("magic");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    dispatch({
      type: "SET_BACKGROUND",
      payload: { type: "image", value: url },
    });
  };

  const setTransparent = () => {
    dispatch({
      type: "SET_BACKGROUND",
      payload: { type: "transparent", value: "" },
    });
  };

  return (
    <div className="p-5 space-y-5 text-gray-800">
      <div>
        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider mb-1">
          Backdrop & Environments
        </h3>
        <p className="text-xs text-gray-500 font-normal">
          Pick an AI creative scene, authentic photography, or solid studio backdrop.
        </p>
      </div>

      {/* Sub-Tab Navigation Pills */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-2xl border border-gray-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setSubTab("magic")}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
            subTab === "magic"
              ? "bg-white text-gray-950 shadow-xs border border-gray-200/80"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <Sparkles className="size-3.5 text-rose-500" />
          <span>Magic ({MAGIC_BACKGROUNDS.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("photo")}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
            subTab === "photo"
              ? "bg-white text-gray-950 shadow-xs border border-gray-200/80"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <Camera className="size-3.5 text-blue-500" />
          <span>Photo ({PHOTO_BACKGROUNDS.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("color")}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
            subTab === "color"
              ? "bg-white text-gray-950 shadow-xs border border-gray-200/80"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <Palette className="size-3.5 text-emerald-500" />
          <span>Color ({COLOR_SWATCHES.length})</span>
        </button>
      </div>

      {/* Quick Action: Transparent & Custom Upload */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={setTransparent}
          className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            background.type === "transparent"
              ? "bg-rose-50 border-rose-300 text-rose-700 shadow-xs"
              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Ban className="size-3.5" />
          <span>Transparent PNG</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 py-2 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
        >
          <Upload className="size-3.5 text-[#E11D48]" />
          <span>Upload Image</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCustomUpload}
        />
      </div>

      {/* SUB-TAB 1: MAGIC BACKGROUNDS GRID (50+) */}
      {subTab === "magic" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>50+ AI & Studio Aesthetics</span>
            <span className="text-[11px] text-gray-400 font-mono">1600px UHD</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1 select-none">
            {MAGIC_BACKGROUNDS.map((item) => {
              const isSelected =
                background.type === "image" && background.value === item.url;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: "SET_BACKGROUND",
                      payload: { type: "image", value: item.url },
                    })
                  }
                  className={`group relative aspect-4/3 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                    isSelected
                      ? "ring-2 ring-[#E11D48] border-[#E11D48] scale-98 shadow-md"
                      : "border-gray-200 hover:border-gray-400 hover:scale-102"
                  }`}
                  title={item.name}
                >
                  <img
                    src={item.thumbnail}
                    alt={item.name}
                    loading="lazy"
                    className="size-full object-cover transition-transform group-hover:scale-110"
                  />
                  {isSelected && (
                    <span className="absolute top-1 right-1 size-5 rounded-full bg-[#E11D48] text-white flex items-center justify-center shadow-xs">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 py-1 px-1.5 bg-black/60 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[9px] text-white truncate font-medium">
                      {item.name}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PHOTOGRAPHIC BACKGROUNDS GRID (30+) */}
      {subTab === "photo" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>30+ Commercial Photography Scenes</span>
            <span className="text-[11px] text-gray-400 font-mono">Natural Light</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1 select-none">
            {PHOTO_BACKGROUNDS.map((item) => {
              const isSelected =
                background.type === "image" && background.value === item.url;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: "SET_BACKGROUND",
                      payload: { type: "image", value: item.url },
                    })
                  }
                  className={`group relative aspect-4/3 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                    isSelected
                      ? "ring-2 ring-[#E11D48] border-[#E11D48] scale-98 shadow-md"
                      : "border-gray-200 hover:border-gray-400 hover:scale-102"
                  }`}
                  title={item.name}
                >
                  <img
                    src={item.thumbnail}
                    alt={item.name}
                    loading="lazy"
                    className="size-full object-cover transition-transform group-hover:scale-110"
                  />
                  {isSelected && (
                    <span className="absolute top-1 right-1 size-5 rounded-full bg-[#E11D48] text-white flex items-center justify-center shadow-xs">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 py-1 px-1.5 bg-black/60 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[9px] text-white truncate font-medium">
                      {item.name}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SOLID COLOR SWATCHES (25+) */}
      {subTab === "color" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>25+ Studio Color Swatches</span>
            <label className="flex items-center gap-1.5 text-gray-700 font-medium cursor-pointer">
              <span>Custom</span>
              <input
                type="color"
                value={background.type === "color" ? background.value : "#ffffff"}
                onChange={(e) =>
                  dispatch({
                    type: "SET_BACKGROUND",
                    payload: { type: "color", value: e.target.value },
                  })
                }
                className="size-5 rounded-full border border-gray-300 p-0 cursor-pointer"
              />
            </label>
          </div>
          <div className="grid grid-cols-4 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
            {COLOR_SWATCHES.map((color) => {
              const isSelected =
                background.type === "color" &&
                background.value.toLowerCase() === color.hex.toLowerCase();
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: "SET_BACKGROUND",
                      payload: { type: "color", value: color.hex },
                    })
                  }
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "ring-2 ring-[#E11D48] border-[#E11D48] bg-rose-50/40 shadow-xs"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                  title={color.name}
                >
                  <span
                    className="size-8 rounded-full border border-black/10 shadow-xs flex items-center justify-center transition-transform hover:scale-105"
                    style={{ backgroundColor: color.hex }}
                  >
                    {isSelected && (
                      <Check
                        className={`size-3.5 ${
                          color.hex === "#FFFFFF" || color.hex === "#FEFCE8" || color.hex === "#ECFDF5"
                            ? "text-gray-900"
                            : "text-white"
                        }`}
                        strokeWidth={3}
                      />
                    )}
                  </span>
                  <span className="text-[10px] text-gray-700 font-medium truncate max-w-[55px]">
                    {color.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Blur Background Control (Applicable when image or color is selected) */}
      {background.type !== "transparent" && (
        <div className="pt-3 border-t border-gray-100 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-700 flex items-center gap-1.5">
              <Sliders className="size-3.5 text-gray-500" />
              <span>Depth of Field (Blur)</span>
            </span>
            <span className="font-mono text-gray-500">{background.blur}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={35}
            value={background.blur}
            onChange={(e) =>
              dispatch({
                type: "SET_BACKGROUND",
                payload: {
                  blur: Number(e.target.value),
                  blurEnabled: Number(e.target.value) > 0,
                },
              })
            }
            className="w-full accent-[#E11D48] cursor-pointer h-2 bg-gray-200 rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
