import React from "react";
import { EditorProvider, useEditor } from "./EditorContext";
import { EditorToolbar } from "./EditorToolbar";
import { EditorCanvas } from "./EditorCanvas";
import { CutoutTab } from "./tabs/CutoutTab";
import { BackgroundTab } from "./tabs/BackgroundTab";
import { EffectsTab } from "./tabs/EffectsTab";
import { AdjustTab } from "./tabs/AdjustTab";
import { X, RefreshCw, Sparkles, ExternalLink, Download } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useUserStore } from "@/lib/userStore";

interface RemoveBgStudioEditorProps {
  originalImageUrl: string;
  cutoutImageUrl: string;
  onReset: () => void;
  onEditInCanva?: () => void;
  isCanvaLoading?: boolean;
}

function InnerEditor({
  onReset,
  onEditInCanva,
  isCanvaLoading,
}: {
  onReset: () => void;
  onEditInCanva?: () => void;
  isCanvaLoading?: boolean;
}) {
  const { state, dispatch } = useEditor();
  const { activeTab, cutoutImageUrl, background } = state;

  // Handle Export of Final Canvas
  const handleDownload = (resolution: "preview" | "max") => {
    // Find canvas element
    const canvas = document.querySelector("canvas");
    if (!canvas) {
      toast.error("Canvas element not ready for export");
      return;
    }

    try {
      const dataUrl = canvas.toDataURL("image/png");
      const fileName = `bellix_clean_bg_${Date.now()}.png`;

      // Save to project history
      try {
        useUserStore.getState().addJob({
          file_name: fileName,
          file_type: "background-remover",
          file_url: dataUrl,
          result_url: dataUrl,
          status: "completed",
          quality: resolution === "max" ? "4K UHD" : "Standard HD",
          credits_used: 1,
          processing_time: "1.2s",
        });
      } catch (e) {
        console.warn("Failed to save to history:", e);
      }

      if (resolution === "preview") {
        // Create scaled 408 x 612 preview
        const previewCanvas = document.createElement("canvas");
        previewCanvas.width = 408;
        previewCanvas.height = 612;
        const pCtx = previewCanvas.getContext("2d");
        if (pCtx) {
          pCtx.drawImage(canvas, 0, 0, 408, 612);
          const link = document.createElement("a");
          link.href = previewCanvas.toDataURL("image/png");
          link.download = `bellix-preview-${Date.now()}.png`;
          link.click();
          toast.success("Free preview downloaded (408×612)");
        }
      } else {
        // High-res Max export directly from full resolution canvas
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = fileName;
        link.click();

        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#d0f471", "#10241E", "#10B981", "#22C55E"],
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
    }
  };

  return (
    <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-200/90 shadow-xl bg-[#F8FAFC] flex flex-col max-w-4xl mx-auto w-full transition-all">
      {/* 1. TOP TOOLBAR (remove.bg style tabs & download dropdown) */}
      <EditorToolbar onDownload={handleDownload} />

      {/* 2. MAIN WORKSPACE WITH CANVAS & DYNAMIC SIDEBAR */}
      <div className="relative flex flex-col lg:flex-row min-h-[360px] sm:min-h-[420px] overflow-hidden">
        {/* CENTER: Main Canvas Area */}
        <div className="flex-1 relative flex items-center justify-center bg-[#0D0D0D] overflow-hidden min-h-[300px] sm:min-h-[380px]">
          <EditorCanvas />

          {/* Floating Action: Edit in Canva (Optional) */}
          {onEditInCanva && (
            <button
              type="button"
              onClick={onEditInCanva}
              disabled={isCanvaLoading}
              className="absolute top-3 left-3 z-20 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-md border border-[#2B4B3F] flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md"
              style={{ backgroundColor: "#10241E", color: "#FFFFFF" }}
            >
              <ExternalLink className="size-3 text-[#d0f471]" style={{ color: "#d0f471", stroke: "#d0f471" }} />
              <span style={{ color: "#FFFFFF" }} className="font-semibold text-white">
                {isCanvaLoading ? "Opening..." : "Edit in Canva"}
              </span>
            </button>
          )}
        </div>

        {/* SIDEBAR: Opens smoothly when an active tab is selected */}
        {activeTab && (
          <aside
            className="w-full lg:w-[320px] bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col justify-between shrink-0 animate-in slide-in-from-right-4 duration-200 z-20 shadow-lg"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
          >
            {/* Header of Sidebar */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50"
              style={{ backgroundColor: "#F9FAFB", borderColor: "#E5E7EB" }}
            >
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#10241E" }}>
                {activeTab === "cutout"
                  ? "Cutout & Erase Tools"
                  : activeTab === "background"
                  ? "Backdrops & Scenes"
                  : activeTab === "effects"
                  ? "Depth & Lighting Effects"
                  : activeTab === "adjust"
                  ? "Adjustments & Framing"
                  : "Design & Integrations"}
              </span>
              <button
                type="button"
                onClick={() => dispatch({ type: "SET_ACTIVE_TAB", payload: null })}
                className="size-6 rounded-full flex items-center justify-center text-[#52645D] hover:text-[#10241E] hover:bg-gray-200 transition-colors cursor-pointer"
                title="Close panel"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Sidebar Tab Content */}
            <div className="flex-1 overflow-y-auto max-h-[340px] sm:max-h-[380px]">
              {activeTab === "cutout" && <CutoutTab />}
              {activeTab === "background" && <BackgroundTab />}
              {activeTab === "effects" && <EffectsTab />}
              {activeTab === "adjust" && <AdjustTab />}
              {activeTab === "design" && (
                <div className="p-5 text-center space-y-3">
                  <div className="size-12 rounded-xl bg-gradient-to-tr from-[#00C4CC] to-[#7D2AE8] text-white flex items-center justify-center mx-auto shadow-md">
                    <Sparkles className="size-6" />
                  </div>
                  <h4 className="text-sm font-bold text-[#10241E]" style={{ color: "#10241E" }}>
                    Export directly to Canva
                  </h4>
                  <p className="text-xs text-[#52645D] leading-relaxed font-normal" style={{ color: "#52645D" }}>
                    Transform this cutout into banners, social media posts, presentations, and product listings in one click.
                  </p>
                  {onEditInCanva && (
                    <button
                      type="button"
                      onClick={onEditInCanva}
                      className="w-full py-2.5 px-4 rounded-full text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                      style={{ backgroundColor: "#10241E", color: "#FFFFFF" }}
                    >
                      <ExternalLink className="size-3.5 text-[#d0f471]" />
                      <span style={{ color: "#FFFFFF" }}>Launch Canva Editor</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions inside Sidebar */}
            <div
              className="p-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-2"
              style={{ backgroundColor: "#F9FAFB", borderColor: "#E5E7EB" }}
            >
              <button
                type="button"
                onClick={() => dispatch({ type: "SET_ACTIVE_TAB", payload: null })}
                className="py-1.5 px-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: "#FFFFFF", color: "#10241E" }}
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => handleDownload("max")}
                className="py-1.5 px-4 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                style={{ backgroundColor: "#d0f471", color: "#071A13" }}
              >
                <Download className="size-3 text-[#071A13]" style={{ color: "#071A13", stroke: "#071A13" }} />
                <span style={{ color: "#071A13" }} className="font-bold">Save Image</span>
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* 3. BOTTOM FOOTER CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-3.5 border-t border-gray-200 bg-white" style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}>
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2 rounded-full border border-[#2B4B3F] bg-[#10241E] hover:bg-[#18362D] text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          style={{ backgroundColor: "#10241E", color: "#FFFFFF" }}
        >
          <RefreshCw className="size-3.5 text-[#d0f471]" style={{ color: "#d0f471", stroke: "#d0f471" }} />
          <span style={{ color: "#FFFFFF" }} className="font-semibold text-white">
            Upload Another Image
          </span>
        </button>

        <div className="flex items-center gap-2.5">
          <span className="text-xs text-[#52645D] font-mono font-medium hidden sm:inline" style={{ color: "#52645D" }}>
            32-Bit RGBA · True Alpha
          </span>
          <button
            type="button"
            onClick={() => handleDownload("max")}
            className="px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer hover:scale-102 active:scale-98"
            style={{ backgroundColor: "#d0f471", color: "#071A13" }}
          >
            <Download className="size-4 text-[#071A13]" style={{ color: "#071A13", stroke: "#071A13" }} />
            <span style={{ color: "#071A13" }} className="font-bold text-[#071A13]">
              Download PNG
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function RemoveBgStudioEditor(props: RemoveBgStudioEditorProps) {
  return (
    <EditorProvider
      originalUrl={props.originalImageUrl}
      cutoutUrl={props.cutoutImageUrl}
    >
      <InnerEditor {...props} />
    </EditorProvider>
  );
}
