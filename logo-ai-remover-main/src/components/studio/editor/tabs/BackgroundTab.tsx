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
    <div className="p-5 space-y-5 text-gray-800" style={{ color: "#10241E" }}>
      <div>
        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider mb-1" style={{ color: "#10241E" }}>
          Backdrop & Environments
        </h3>
        <p className="text-xs text-gray-500 font-normal" style={{ color: "#52645D" }}>
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
              ? "shadow-sm border border-[#2B4B3F]"
              : "hover:bg-gray-200/60"
          }`}
          style={
            subTab === "magic"
              ? { backgroundColor: "#10241E", color: "#d0f471" }
              : { backgroundColor: "transparent", color: "#37433D" }
          }
        >
          <Sparkles className="size-3.5" style={{ color: subTab === "magic" ? "#d0f471" : "#52645D" }} />
          <span style={{ color: subTab === "magic" ? "#d0f471" : "#37433D" }} className="font-semibold">
            Magic ({MAGIC_BACKGROUNDS.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("photo")}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
            subTab === "photo"
              ? "shadow-sm border border-[#2B4B3F]"
              : "hover:bg-gray-200/60"
          }`}
          style={
            subTab === "photo"
              ? { backgroundColor: "#10241E", color: "#d0f471" }
              : { backgroundColor: "transparent", color: "#37433D" }
          }
        >
          <Camera className="size-3.5" style={{ color: subTab === "photo" ? "#d0f471" : "#52645D" }} />
          <span style={{ color: subTab === "photo" ? "#d0f471" : "#37433D" }} className="font-semibold">
            Photo ({PHOTO_BACKGROUNDS.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("color")}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
            subTab === "color"
              ? "shadow-sm border border-[#2B4B3F]"
              : "hover:bg-gray-200/60"
          }`}
          style={
            subTab === "color"
              ? { backgroundColor: "#10241E", color: "#d0f471" }
              : { backgroundColor: "transparent", color: "#37433D" }
          }
        >
          <Palette className="size-3.5" style={{ color: subTab === "color" ? "#d0f471" : "#52645D" }} />
          <span style={{ color: subTab === "color" ? "#d0f471" : "#37433D" }} className="font-semibold">
            Solid Color
          </span>
        </button>
      </div>

      {/* Quick Action: Transparent & Custom Upload */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={setTransparent}
          className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            background.type === "transparent"
              ? "border-[#2B4B3F] shadow-xs"
              : "border-gray-200 hover:bg-gray-50"
          }`}
          style={
            background.type === "transparent"
              ? { backgroundColor: "#10241E", color: "#d0f471", borderColor: "#2B4B3F" }
              : { backgroundColor: "#FFFFFF", color: "#37433D" }
          }
        >
          <Ban className="size-3.5" style={{ color: background.type === "transparent" ? "#d0f471" : "#52645D" }} />
          <span style={{ color: background.type === "transparent" ? "#d0f471" : "#37433D" }}>Transparent PNG</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 py-2 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[#10241E] text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
          style={{ backgroundColor: "#FFFFFF", color: "#10241E" }}
        >
          <Upload className="size-3.5 text-[#10241E]" />
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
          <div className="flex items-center justify-between text-xs text-gray-500" style={{ color: "#52645D" }}>
            <span>50+ High-Definition AI Backgrounds</span>
            <span className="font-mono text-[11px]">8K Photoreal</span>
          </div>
          <div className="grid grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1">
            {MAGIC_BACKGROUNDS.map((bg) => {
              const isSelected =
                background.type === "image" && background.value === bg.url;
              return (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: "SET_BACKGROUND",
                      payload: { type: "image", value: bg.url },
                    })
                  }
                  className={`group relative aspect-square rounded-xl overflow-hidden border transition-all cursor-pointer bg-gray-100 ${
                    isSelected
                      ? "ring-2 ring-[#10241E] border-[#10241E] shadow-md"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <img
                    src={bg.thumbnail || bg.thumb}
                    alt={bg.name}
                    loading="lazy"
                    crossOrigin="anonymous"
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 size-5 rounded-full bg-[#10241E] text-[#d0f471] flex items-center justify-center shadow-xs">
                      <Check className="size-3 text-[#d0f471]" strokeWidth={3} />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-[10px] text-white font-medium truncate text-left" style={{ color: "#FFFFFF" }}>
                      {bg.name}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PHOTO STUDIO SCENES (50+) */}
      {subTab === "photo" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500" style={{ color: "#52645D" }}>
            <span>50+ Real Photography Backdrops</span>
            <span className="font-mono text-[11px]">Unsplash Pro</span>
          </div>
          <div className="grid grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1">
            {PHOTO_BACKGROUNDS.map((bg) => {
              const isSelected =
                background.type === "image" && background.value === bg.url;
              return (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: "SET_BACKGROUND",
                      payload: { type: "image", value: bg.url },
                    })
                  }
                  className={`group relative aspect-square rounded-xl overflow-hidden border transition-all cursor-pointer bg-gray-100 ${
                    isSelected
                      ? "ring-2 ring-[#10241E] border-[#10241E] shadow-md"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <img
                    src={bg.thumbnail || bg.thumb}
                    alt={bg.name}
                    loading="lazy"
                    crossOrigin="anonymous"
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 size-5 rounded-full bg-[#10241E] text-[#d0f471] flex items-center justify-center shadow-xs">
                      <Check className="size-3 text-[#d0f471]" strokeWidth={3} />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-[10px] text-white font-medium truncate text-left" style={{ color: "#FFFFFF" }}>
                      {bg.name}
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
          <div className="flex items-center justify-between text-xs text-gray-500" style={{ color: "#52645D" }}>
            <span>25+ Studio Color Swatches</span>
            <label className="flex items-center gap-1.5 text-gray-700 font-medium cursor-pointer" style={{ color: "#10241E" }}>
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
                      ? "ring-2 ring-[#10241E] border-[#10241E] bg-emerald-50/50 shadow-xs"
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
                  <span className="text-[10px] font-medium truncate max-w-[55px]" style={{ color: "#10241E" }}>
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
            <span className="font-semibold text-gray-700 flex items-center gap-1.5" style={{ color: "#10241E" }}>
              <Sliders className="size-3.5 text-gray-500" />
              <span>Depth of Field (Blur)</span>
            </span>
            <span className="font-mono text-gray-500" style={{ color: "#52645D" }}>{background.blur}px</span>
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
            className="w-full accent-[#10241E] cursor-pointer h-2 bg-gray-200 rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
