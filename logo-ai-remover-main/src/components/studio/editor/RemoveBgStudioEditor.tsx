import React from "react";
import { EditorProvider, useEditor } from "./EditorContext";
import { EditorToolbar } from "./EditorToolbar";
import { EditorCanvas } from "./EditorCanvas";
import { CutoutTab } from "./tabs/CutoutTab";
import { BackgroundTab } from "./tabs/BackgroundTab";
import { EffectsTab } from "./tabs/EffectsTab";
import { AdjustTab } from "./tabs/AdjustTab";
import { TextTab } from "./tabs/TextTab";
import { X, RefreshCw, Sparkles, ExternalLink, Download, Plus, ChevronUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useUserStore } from "@/lib/userStore";
import { createThumbnailDataUrl, saveMediaBlob } from "@/lib/historyDb";
import { ProcessingDots } from "@/components/ui/ProcessingDots";
import { ResultComparison } from "../ResultComparison";

const LIGHT_CHECKERBOARD = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect width='12' height='12' fill='%23ffffff'/%3E%3Crect x='12' width='12' height='12' fill='%23f1f5f9'/%3E%3Crect y='12' width='12' height='12' fill='%23f1f5f9'/%3E%3Crect x='12' y='12' width='12' height='12' fill='%23ffffff'/%3E%3C/svg%3E")`;

function CanvaLogoIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="canva-gradient-studio" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00C4CC" />
          <stop offset="50%" stopColor="#0074E4" />
          <stop offset="100%" stopColor="#7D2AE8" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#canva-gradient-studio)" />
      <path
        d="M15 13.6c-.7.8-1.7 1.2-2.8 1.2-2.1 0-3.6-1.4-3.6-3.6 0-2.2 1.5-3.8 3.7-3.8 1 0 1.8.3 2.5.9l-.9 1.1c-.5-.4-1.1-.7-1.7-.7-1.3 0-2.2 2.4-2.2 2.4s.9 2.4 2.2 2.4c.7 0 1.3-.3 1.8-.7l1 1.1z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export interface StudioHistoryItem {
  id: string;
  originalUrl: string;
  cutoutUrl: string;
  fileName: string;
  dimensions?: { width: number; height: number };
}

export interface RemoveBgStudioEditorProps {
  originalImageUrl: string;
  cutoutImageUrl: string;
  onReset: () => void;
  onEditInCanva?: () => void;
  isCanvaLoading?: boolean;
  historyItems?: StudioHistoryItem[];
  activeItemId?: string;
  onSelectHistoryItem?: (id: string) => void;
  onDeleteHistoryItem?: (id: string) => void;
  onUploadMore?: () => void;
  onSelectMode?: (mode: "text" | "object" | "custom") => void;
}

function InnerEditor({
  onReset,
  onEditInCanva,
  isCanvaLoading,
  historyItems,
  activeItemId,
  onSelectHistoryItem,
  onDeleteHistoryItem,
  onUploadMore,
  onSelectMode,
}: {
  onReset: () => void;
  onEditInCanva?: () => void;
  isCanvaLoading?: boolean;
  historyItems?: StudioHistoryItem[];
  activeItemId?: string;
  onSelectHistoryItem?: (id: string) => void;
  onDeleteHistoryItem?: (id: string) => void;
  onUploadMore?: () => void;
  onSelectMode?: (mode: "text" | "object" | "custom") => void;
}) {
  const { state, dispatch } = useEditor();
  const { activeTab, cutoutImageUrl } = state;

  // Handle Export of Final Canvas
  const handleDownload = (resolution: "preview" | "max" | "jpg-white" | "jpg-black" = "max") => {
    // Deselect any active text gizmos for pristine export
    dispatch({ type: "SELECT_TEXT_LAYER", payload: null });

    // Find canvas element
    const canvas = document.querySelector<HTMLCanvasElement>(
      "canvas[data-background-editor-canvas]",
    );
    if (!canvas) {
      toast.error("Canvas element not ready for export");
      return;
    }

    try {
      canvas.dispatchEvent(new Event("bellix:render-export"));
      const dataUrl = canvas.toDataURL("image/png");
      const fileName = `bellix_clean_bg_${Date.now()}.png`;

      // Save to project history with compact thumbnail and IndexedDB blob
      try {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const thumbUrl = await createThumbnailDataUrl(blob, 320, 0.8);
          const newJob = useUserStore.getState().addJob({
            file_name: fileName,
            file_type: "background-remover",
            tool_name: "AI Background Remover Studio",
            thumbnail_url: thumbUrl,
            status: "completed",
            quality: resolution === "max" ? "4K UHD" : "Standard HD",
            credits_used: 1,
            processing_time: "1.2s",
          });
          saveMediaBlob(newJob.id, blob);
        }, "image/png");
      } catch (e) {
        console.warn("Failed to save to history:", e);
      }

      if (resolution === "jpg-white" || resolution === "jpg-black") {
        const solidCanvas = document.createElement("canvas");
        solidCanvas.width = canvas.width;
        solidCanvas.height = canvas.height;
        const sCtx = solidCanvas.getContext("2d");
        if (sCtx) {
          sCtx.fillStyle = resolution === "jpg-white" ? "#FFFFFF" : "#111827";
          sCtx.fillRect(0, 0, solidCanvas.width, solidCanvas.height);
          sCtx.drawImage(canvas, 0, 0);
          const link = document.createElement("a");
          link.href = solidCanvas.toDataURL("image/jpeg", 0.95);
          link.download = `bellix-${resolution === "jpg-white" ? "white" : "dark"}-${Date.now()}.jpg`;
          link.click();
          toast.success(`Exported solid ${resolution === "jpg-white" ? "white" : "dark"} JPG!`);
        }
      } else if (resolution === "preview") {
        // Create scaled 408 x 612 preview
        const previewCanvas = document.createElement("canvas");
        const scale = Math.min(1, 612 / Math.max(canvas.width, canvas.height));
        previewCanvas.width = Math.max(1, Math.round(canvas.width * scale));
        previewCanvas.height = Math.max(1, Math.round(canvas.height * scale));
        const pCtx = previewCanvas.getContext("2d");
        if (pCtx) {
          pCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
          const link = document.createElement("a");
          link.href = previewCanvas.toDataURL("image/png");
          link.download = `bellix-preview-${Date.now()}.png`;
          link.click();
          toast.success(`Preview downloaded (${previewCanvas.width}×${previewCanvas.height})`);
        }
      } else {
        // High-res Max export directly from full resolution canvas
        const link = document.createElement("a");
        // Preserve exact backend PNG bytes (including RGB under soft alpha)
        // when no editor changes have been made.
        link.href = state.canUndo ? dataUrl : cutoutImageUrl;
        link.download = fileName;
        link.click();

        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#22C55E", "#10B981", "#16A34A", "#0F172A"],
        });

        toast.success("Full Max HD PNG downloaded successfully!");
      }
    } catch (err) {
      console.error("Export error:", err);
      // Fallback: download direct cutout URL
      const link = document.createElement("a");
      link.href = cutoutImageUrl;
      link.download = "cutout.png";
      link.click();
      toast.info("Downloaded cutout PNG.");
    } finally {
      canvas.dispatchEvent(new Event("bellix:render-preview"));
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto space-y-6 transition-all">
      {/* 1. TOP TOOLBAR (Floating pill matching Screenshot 4) */}
      <EditorToolbar onDownload={handleDownload} />

      {/* 2. MAIN PREVIEW CARD (Neo-Brutalism Studio Frame) */}
      <div className="relative rounded-xl overflow-hidden border-[3px] border-[#0b0f0d] shadow-[7px_7px_0px_#0b0f0d] bg-white flex flex-col lg:flex-row w-full max-w-3xl lg:max-w-4xl mx-auto transition-all">
        {/* CENTER: Main Canvas Area with clean light background */}
        <div className="flex-1 relative flex items-center justify-center bg-[#f7f5ee] overflow-hidden min-h-[340px] sm:min-h-[440px] p-4 sm:p-6">
          <EditorCanvas />

          {/* Floating Action: Edit in Canva */}
          {onEditInCanva && (
            <div className="absolute top-3.5 inset-x-0 mx-auto w-fit z-20">
              <button
                type="button"
                onClick={onEditInCanva}
                disabled={isCanvaLoading}
                className="px-4 py-1.5 rounded-md text-xs font-black shadow-[3px_3px_0px_#0b0f0d] border-2 border-[#0b0f0d] bg-white text-[#0b0f0d] hover:bg-[#ffe500] flex items-center gap-2 transition-all cursor-pointer"
              >
                <CanvaLogoIcon className="size-4" />
                <span>{isCanvaLoading ? "Opening..." : "Edit in Canva"}</span>
              </button>
            </div>
          )}

          {/* Canva Disclaimer */}
          {onEditInCanva && (
            <div className="absolute bottom-2.5 inset-x-0 mx-auto w-fit z-20 pointer-events-auto">
              <span className="px-2 py-0.5 rounded bg-white/90 border border-[#0b0f0d]/20 text-[11px] text-[#26302b] font-semibold">
                By sending your image to Canva you agree to{" "}
                <a
                  href="https://www.canva.com/policies/terms-of-use/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-[#0b0f0d] transition-colors"
                >
                  Canva's Terms of Service
                </a>
                .
              </span>
            </div>
          )}
        </div>

        {/* SIDEBAR: Opens smoothly when an active tab is selected */}
        {activeTab && (
          <aside className="w-full lg:w-[320px] bg-white border-t-[3px] lg:border-t-0 lg:border-l-[3px] border-[#0b0f0d] flex flex-col justify-between shrink-0 animate-in slide-in-from-right-4 duration-200 z-20">
            {/* Header of Sidebar */}
            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[#0b0f0d] bg-[#ffe500]">
              <span className="text-xs font-black uppercase tracking-wider text-[#0b0f0d] font-mono">
                {activeTab === "cutout"
                  ? "Cutout & Erase Tools"
                  : activeTab === "background"
                    ? "Backdrops & Scenes"
                    : activeTab === "effects"
                      ? "Depth & Lighting Effects"
                      : activeTab === "adjust"
                        ? "Adjustments & Framing"
                        : activeTab === "text"
                          ? "Headings & Typography"
                          : "Design & Integrations"}
              </span>
              <button
                type="button"
                onClick={() => dispatch({ type: "SET_ACTIVE_TAB", payload: null })}
                className="size-6 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 transition-colors cursor-pointer"
                title="Close panel"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Sidebar Tab Content */}
            <div className="flex-1 overflow-y-auto max-h-[340px] sm:max-h-[380px]">
              {activeTab === "cutout" && <CutoutTab onSelectMode={onSelectMode} />}
              {activeTab === "background" && <BackgroundTab />}
              {activeTab === "effects" && <EffectsTab />}
              {activeTab === "adjust" && <AdjustTab />}
              {activeTab === "text" && <TextTab />}
              {activeTab === "design" && (
                <div className="p-5 text-center space-y-3">
                  <div className="size-12 rounded-xl bg-gradient-to-tr from-[#00C4CC] to-[#7D2AE8] text-white flex items-center justify-center mx-auto shadow-md">
                    <Sparkles className="size-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Export directly to Canva</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    Transform this cutout into banners, social media posts, presentations, and
                    product listings in one click.
                  </p>
                  {onEditInCanva && (
                    <button
                      type="button"
                      onClick={onEditInCanva}
                      disabled={isCanvaLoading}
                      className="w-full py-2.5 px-4 rounded-full text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white"
                    >
                      {isCanvaLoading ? (
                        <>
                          <span>Preparing Canva session</span>
                          <ProcessingDots color="#FFFFFF" gap="3px" size="4px" />
                        </>
                      ) : (
                        <>
                          <CanvaLogoIcon className="size-4" />
                          <span>Launch Canva Editor</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions inside Sidebar */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => dispatch({ type: "SET_ACTIVE_TAB", payload: null })}
                className="py-1.5 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-800 cursor-pointer"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => handleDownload("max")}
                className="py-1.5 px-4 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Download className="size-3 text-white" />
                <span className="font-bold text-white">Save Image</span>
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* 3. MULTI-IMAGE THUMBNAIL TRAY WITH PERMANENT DELETE BUTTONS */}
      {historyItems && historyItems.length > 0 && (
        <div className="py-2 px-4 flex items-center justify-center gap-3.5 flex-wrap">
          <button
            type="button"
            onClick={onUploadMore}
            className="size-12 sm:size-13 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200/80 flex items-center justify-center shadow-xs transition-colors cursor-pointer shrink-0"
            title="Upload another image"
          >
            <Plus className="size-5" />
          </button>
          {historyItems.map((item) => {
            const isActive = item.id === activeItemId;
            return (
              <div key={item.id} className="relative group shrink-0">
                <button
                  type="button"
                  onClick={() => onSelectHistoryItem?.(item.id)}
                  className={`relative size-12 sm:size-13 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                    isActive
                      ? "border-emerald-500 ring-4 ring-emerald-500/20 shadow-md"
                      : "border-slate-200/80 hover:border-slate-400 opacity-70 hover:opacity-100"
                  }`}
                  style={{
                    backgroundImage: LIGHT_CHECKERBOARD,
                    backgroundSize: "12px 12px",
                  }}
                  title={item.fileName}
                >
                  <img
                    src={item.cutoutUrl || item.originalUrl}
                    alt={item.fileName}
                    className="w-full h-full object-contain p-0.5"
                  />
                  {isActive && (
                    <div className="absolute top-0 inset-x-0 mx-auto w-fit bg-emerald-500 text-white rounded-b-sm px-1.5 py-0.5 shadow-xs">
                      <ChevronUp className="size-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>

                {/* Permanent Delete Button on Thumbnail */}
                {onDeleteHistoryItem && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteHistoryItem(item.id);
                    }}
                    className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-slate-900 hover:bg-rose-600 text-white flex items-center justify-center shadow-md transition-all hover:scale-110 z-20 cursor-pointer border border-white"
                    title={`Delete ${item.fileName}`}
                  >
                    <X className="size-2.5 stroke-[2.5]" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. BOTTOM ACTION ROW (Fully responsive across Phone, Tablet, Laptop, PC) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 w-full max-w-3xl lg:max-w-4xl mx-auto">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onReset}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="size-4 text-slate-600" />
            <span>Upload Another</span>
          </button>

          {activeItemId && onDeleteHistoryItem && (
            <button
              type="button"
              onClick={() => onDeleteHistoryItem(activeItemId)}
              className="px-4 py-2.5 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs sm:text-sm font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="Delete this image"
            >
              <Trash2 className="size-3.5 text-rose-600" />
              <span>Delete</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-mono font-medium hidden md:inline">
            32-Bit RGBA · True Alpha
          </span>
          <button
            type="button"
            onClick={() => handleDownload("max")}
            className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-102 active:scale-98 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Download className="size-4 text-white" />
            <span className="font-bold text-white">Download PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function RemoveBgStudioEditor(props: RemoveBgStudioEditorProps) {
  return (
    <EditorProvider
      key={`${props.originalImageUrl}|${props.cutoutImageUrl}`}
      originalUrl={props.originalImageUrl}
      cutoutUrl={props.cutoutImageUrl}
    >
      <InnerEditor {...props} />
    </EditorProvider>
  );
}
