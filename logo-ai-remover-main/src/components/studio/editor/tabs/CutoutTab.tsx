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

export function CutoutTab() {
  const { state, dispatch } = useEditor();
  const { brush, cutoutImageUrl, originalImageUrl } = state;
  const [isRemovingText, setIsRemovingText] = useState(false);

  const handleRemoveText = async (preset?: "auto" | "top" | "bottom") => {
    setIsRemovingText(true);
    const toastId = toast.loading("Analyzing and inpainting text overlays...");

    try {
      // Use original image to remove text cleanly
      const fetchResp = await fetch(originalImageUrl || cutoutImageUrl);
      const imgBlob = await fetchResp.blob();

      const formData = new FormData();
      formData.append("image", imgBlob, "image.png");

      if (preset === "top") {
        // Top 20% of image
        formData.append("boxes", JSON.stringify([[0.05, 0.02, 0.90, 0.18]]));
      } else if (preset === "bottom") {
        // Bottom 20% of image
        formData.append("boxes", JSON.stringify([[0.05, 0.80, 0.90, 0.18]]));
      } else {
        formData.append("auto_detect", "true");
      }

      const resp = await fetch("/api/remove-text", {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) {
        throw new Error("Text removal backend request failed");
      }

      const cleanedBlob = await resp.blob();
      const cleanedUrl = URL.createObjectURL(cleanedBlob);

      // Now run background removal on the de-texted image or update the cutout
      const removeBgFormData = new FormData();
      removeBgFormData.append("image", cleanedBlob, "detexted.png");

      const bgResp = await fetch("/api/remove-bg", {
        method: "POST",
        body: removeBgFormData,
      });

      if (bgResp.ok) {
        const newCutoutBlob = await bgResp.blob();
        const newCutoutUrl = URL.createObjectURL(newCutoutBlob);
        dispatch({ type: "SET_CUTOUT_IMAGE", payload: newCutoutUrl });

        // Update the mask canvas to load the newly cleaned cutout
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const mCanvas = document.createElement("canvas");
          mCanvas.width = img.naturalWidth;
          mCanvas.height = img.naturalHeight;
          const ctx = mCanvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            dispatch({ type: "SET_MASK_CANVAS", payload: mCanvas });
          }
        };
        img.src = newCutoutUrl;
        toast.success("Text removed and subject re-isolated successfully!", { id: toastId });
      } else {
        // Fallback: update cutout with cleaned image directly
        dispatch({ type: "SET_CUTOUT_IMAGE", payload: cleanedUrl });
        toast.success("Text and objects removed cleanly!", { id: toastId });
      }
    } catch (err: any) {
      console.error("Remove text error:", err);
      toast.error(err.message || "Failed to remove text. Please verify the worker is running.", {
        id: toastId,
      });
    } finally {
      setIsRemovingText(false);
    }
  };

  return (
    <div className="p-4 space-y-5 text-[#10241E]">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#10241E]">
            Cutout & Inpainting
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#10241E] border border-emerald-200">
            DUAL ENGINE
          </span>
        </div>
        <p className="text-xs text-[#52645D] leading-relaxed">
          Refine subject boundaries with the manual brush, or remove unwanted text, watermarks, and objects.
        </p>
      </div>

      {/* AI Text & Object Removal Section */}
      <div className="p-3.5 bg-gradient-to-br from-emerald-50/60 to-gray-50 rounded-2xl border border-emerald-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-[#10241E] text-[#d0f471] flex items-center justify-center shadow-xs">
              <FileText className="size-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#10241E]">Text & Object Removal</h4>
              <p className="text-[10px] text-[#52645D]">Auto-detect & inpaint text</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={isRemovingText}
          onClick={() => handleRemoveText("auto")}
          className="w-full py-2 px-3 rounded-xl bg-[#10241E] hover:bg-[#18362D] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-60"
        >
          {isRemovingText ? (
            <Loader2 className="size-3.5 animate-spin text-[#d0f471]" />
          ) : (
            <Wand2 className="size-3.5 text-[#d0f471]" />
          )}
          <span>{isRemovingText ? "Inpainting Text..." : "Auto-Detect & Remove Text"}</span>
        </button>

        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <button
            type="button"
            disabled={isRemovingText}
            onClick={() => handleRemoveText("top")}
            className="py-1.5 px-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-[11px] font-semibold text-[#10241E] text-center transition-colors cursor-pointer"
          >
            Header / Top Text
          </button>
          <button
            type="button"
            disabled={isRemovingText}
            onClick={() => handleRemoveText("bottom")}
            className="py-1.5 px-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-[11px] font-semibold text-[#10241E] text-center transition-colors cursor-pointer"
          >
            Footer / Captions
          </button>
        </div>
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
          onChange={(e) =>
            dispatch({ type: "SET_BRUSH_SIZE", payload: Number(e.target.value) })
          }
          className="w-full accent-[#10241E] cursor-pointer h-2 bg-gray-200 rounded-lg"
        />
        <div className="flex justify-between text-[10px] text-gray-400 font-mono">
          <span>5px (Fine hair)</span>
          <span>50px</span>
          <span>100px (Broad)</span>
        </div>
      </div>

      {/* Magic Edge Snapping Toggle */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-200/90">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-xl bg-[#10241E] text-[#d0f471] flex items-center justify-center shadow-xs">
            <Sparkles className="size-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#10241E]">Edge Snapping</h4>
            <p className="text-[10px] text-[#52645D]">Auto-matting along boundaries</p>
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
