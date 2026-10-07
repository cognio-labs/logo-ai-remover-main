import { createFileRoute } from "@tanstack/react-router";
import { ChangeEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeftRight, ArrowRight, Check, ChevronRight, Download, Feather, ImageUp, Layers3, LockKeyhole, RefreshCw, RotateCcw, ScanSearch, ShieldCheck, SlidersHorizontal, Sparkles, Upload, WandSparkles, Zap } from "lucide-react";
import { FeatureComparisonCard, type FeatureCardData } from "@/components/upscale/FeatureComparisonCard";
import { PinkScanLoader } from "@/components/site/PinkScanLoader";
import { HeroComparisonSlider } from "@/components/upscale/HeroComparisonSlider";
import { ImageUploader, type ImageFileMetadata } from "@/components/upscale/ImageUploader";
import { apiImageUrl, getImageResult, getImageStatus, upscaleImage } from "@/lib/imageApi";
import { getImageDimensions, formatBytes } from "@/lib/upscaleEngine";
import { useUserStore } from "@/lib/userStore";
import { toast } from "sonner";

export const MAX_SAFE_IMAGE_PIXELS = 100_000_000; // 100 Megapixels max safe output
export const MAX_SAFE_IMAGE_DIMENSION = 16_000; // 16,000 px max dimension on any axis

export function calculateMaxSafeDimensions(
  origW: number,
  origH: number,
  maxPixels: number = MAX_SAFE_IMAGE_PIXELS,
  maxDim: number = MAX_SAFE_IMAGE_DIMENSION
): { safeWidth: number; safeHeight: number; safeScale: number } {
  if (origW <= 0 || origH <= 0) return { safeWidth: 0, safeHeight: 0, safeScale: 1 };
  const sPixels = Math.sqrt(maxPixels / (origW * origH));
  const sW = maxDim / origW;
  const sH = maxDim / origH;
  const maxSafeScale = Math.min(sPixels, sW, sH);
  const safeWidth = Math.max(1, Math.round(origW * maxSafeScale));
  const safeHeight = Math.max(1, Math.round(origH * maxSafeScale));
  return { safeWidth, safeHeight, safeScale: Number(maxSafeScale.toFixed(2)) };
}

export const Route = createFileRoute("/upscale")({
  head: () => ({ meta: [{ title: "AI Upscaler — Bellix.us" }] }), component: UpscalePage,
});
type Scale = "2" | "4" | "8";
type Format = "PNG" | "JPG";
const PRESETS = [
  { name: "Studio Portrait", factor: "4", image: "/upscale/portrait.png" },
  { name: "Generative Art", factor: "8", image: "/upscale/artwork.png" },
  { name: "Vector & Logos", factor: "2", image: "/upscale/typography.png" },
] as const;
interface ShowcaseItem {
  id: string;
  category: string;
  title: string;
  statement: string;
  description: string;
  source: string;
  output: string;
  scale: string;
  result: string;
  beforeImage: string;
  afterImage: string;
  tone: string;
}

const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    id: "portrait",
    category: "PEOPLE • SKIN • HAIR • DETAIL",
    title: "Professional Portrait",
    statement: "Recover natural facial detail.",
    description: "Recover natural facial detail and fine textures without making the image look artificial.",
    source: "512 × 512",
    output: "4096 × 4096",
    scale: "8",
    result: "Natural Detail",
    beforeImage: "/upscale/showcase/portrait_before.jpg",
    afterImage: "/upscale/showcase/portrait_after.jpg",
    tone: "from-[#fff5f7] to-[#fff9f5]",
  },
  {
    id: "creator",
    category: "PEOPLE • WORKSPACE • DETAIL",
    title: "Creator & Workspace",
    statement: "Bring clarity back to workspace.",
    description: "Bring clarity back to workspace photos, screens and small visual details.",
    source: "512 × 512",
    output: "4096 × 4096",
    scale: "8",
    result: "Crisp Detail",
    beforeImage: "/upscale/showcase/creator_before.jpg",
    afterImage: "/upscale/showcase/creator_after.jpg",
    tone: "from-[#f8f9ff] to-[#fff5f8]",
  },
  {
    id: "fashion",
    category: "FASHION • TEXTURE • PORTRAIT",
    title: "Fashion & Fabric",
    statement: "Recover fabric texture and fine weave.",
    description: "Recover fabric texture, hair detail and natural skin without an artificial look.",
    source: "1024 × 1024",
    output: "4096 × 4096",
    scale: "4",
    result: "Texture Recovery",
    beforeImage: "/upscale/showcase/fashion_before.jpg",
    afterImage: "/upscale/showcase/fashion_after.jpg",
    tone: "from-[#fff6fa] to-[#fdf8f5]",
  },
  {
    id: "product",
    category: "PRODUCT • MATERIAL • DETAIL",
    title: "Product Photography",
    statement: "Make every product feel studio-shot.",
    description: "Make product photography sharper and ready for professional e-commerce use.",
    source: "512 × 512",
    output: "4096 × 4096",
    scale: "8",
    result: "Studio Clarity",
    beforeImage: "/upscale/showcase/product_before.jpg",
    afterImage: "/upscale/showcase/product_after.jpg",
    tone: "from-[#f9f8f6] to-[#fff5f7]",
  },
  {
    id: "interior",
    category: "INTERIOR • MATERIAL • STRUCTURE",
    title: "Architecture & Interiors",
    statement: "Bring spaces back to photographic clarity.",
    description: "Restore architectural lines, furniture textures and natural lighting detail.",
    source: "1024 × 1024",
    output: "4096 × 4096",
    scale: "4",
    result: "True Detail",
    beforeImage: "/upscale/showcase/interior_before.jpg",
    afterImage: "/upscale/showcase/interior_after.jpg",
    tone: "from-[#fbf9f4] to-[#fdf6f2]",
  },
  {
    id: "travel",
    category: "LANDSCAPE • TEXTURE • DETAIL",
    title: "Travel & Nature",
    statement: "Bring distant textures & landscape back to life.",
    description: "Bring distant textures, landscape detail and natural depth back to life.",
    source: "800 × 800",
    output: "3200 × 3200",
    scale: "4",
    result: "Texture Recovery",
    beforeImage: "/upscale/showcase/travel_before.jpg",
    afterImage: "/upscale/showcase/travel_after.jpg",
    tone: "from-[#f2f8fa] to-[#fff7f5]",
  },
];
const FEATURE_CARDS: FeatureCardData[] = [
  {
    id: "sub-pixel",
    icon: ScanSearch,
    centerIcon: ArrowRight,
    title: "Sub-Pixel Reconstruction",
    description: "Rebuilds fine structures such as skin pores, fabric weave, hair and natural texture.",
    lowImage: "/upscale/card_subpixel_low.jpg",
    highImage: "/upscale/card_subpixel_high.jpg",
  },
  {
    id: "zero-plastic",
    icon: Feather,
    centerIcon: ArrowRight,
    title: "Zero-Plastic Finishing",
    description: "Avoids fake, oversmoothed cartoon looks. Enhances authentic high-frequency details.",
    lowImage: "/upscale/card_skin_low.jpg",
    highImage: "/upscale/card_skin_high.jpg",
  },
  {
    id: "natural-skin",
    icon: Sparkles,
    centerIcon: Sparkles,
    title: "Natural Skin Detail",
    description: "Restores pores, eyelashes and facial texture without creating waxy AI skin.",
    lowImage: "/upscale/card_skin_low.jpg",
    highImage: "/upscale/card_skin_high.jpg",
  },
  {
    id: "texture-recovery",
    icon: Layers3,
    centerIcon: ArrowRight,
    title: "Texture Recovery",
    description: "Recovers hair, fur, fabric, wood, foliage and other high-frequency detail.",
    lowImage: "/upscale/card_fabric_low.jpg",
    highImage: "/upscale/card_fabric_high.jpg",
  },
  {
    id: "crisp-typography",
    icon: ArrowLeftRight,
    centerIcon: ArrowLeftRight,
    title: "Crisp Typography",
    description: "Improves text, logos and graphic edges for noticeably cleaner visual assets.",
    lowImage: "/upscale/card_typography_low.jpg",
    highImage: "/upscale/card_typography_high.jpg",
  },
  {
    id: "smart-edge",
    icon: Zap,
    centerIcon: Zap,
    title: "Smart Edge Restoration",
    description: "Repairs compression damage and soft edges while keeping the image visually natural.",
    lowImage: "/upscale/card_edge_low.jpg",
    highImage: "/upscale/card_edge_high.jpg",
  },
];
const FAQS = [["How does Bellix.us upscale an image without making it look artificial?","Bellix.us focuses on rebuilding fine visual structures such as edges, textures and micro-detail instead of simply stretching existing pixels. The goal is a sharper result that still feels natural."],["Which upscale level should I choose: 2, 4 or 8?","Use 2 for already-good images that need extra resolution, 4 for most web and creative work, and 8 when starting from smaller images or when a much larger output is required."],["Will the aspect ratio of my image change?","No. Upscaling increases resolution while preserving the original image proportions unless you intentionally crop or resize it separately."],["Does it work with AI-generated images?","Yes. The enhancement workflow can be used with AI artwork, portraits, concept art, product images, illustrations and other generated visuals."],["Can it improve faces and skin without creating a plastic look?","The portrait enhancement mode should prioritize natural skin texture, eyelashes, hair and facial detail while avoiding excessive smoothing."],["Can Bellix.us enhance logos and typography?","Yes. Graphic-focused enhancement can improve text edges, logos, symbols and other high-contrast design elements."],["Which image formats are supported?","Support common formats such as PNG, JPG, JPEG, WebP and AVIF, with the exact size limit shown beside the uploader."],["Are uploaded images private?","Images are processed according to Bellix.us's privacy policy. Review the current policy for the applicable processing, storage and deletion practices before uploading sensitive material."]];

function UpscaleComparisonSlider({
  beforeImage,
  afterImage,
  title,
}: {
  beforeImage: string;
  afterImage: string;
  title: string;
}) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updateFromClientX = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left;
    const pct = Math.max(3, Math.min(97, (x / rect.width) * 100));
    setPosition(pct);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateFromClientX(e.clientX);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      updateFromClientX(e.clientX);
    }
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="relative size-full overflow-hidden select-none touch-none cursor-ew-resize group/slider"
    >
      {/* 1. MASTER HIGH-RESOLUTION AFTER IMAGE (Full Frame) */}
      <img
        src={afterImage}
        alt={`${title} restored`}
        className="absolute inset-0 size-full object-cover select-none pointer-events-none"
        loading="lazy"
        decoding="async"
      />

      {/* 2. PROGRAMMATIC LOW-RES BEFORE IMAGE (Clipped by slider position) */}
      <div
        className="absolute inset-0 size-full overflow-hidden select-none pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img
          src={beforeImage}
          alt={`${title} low resolution`}
          className="absolute inset-0 size-full object-cover select-none pointer-events-none"
          loading="lazy"
          decoding="async"
        />
      </div>

      {/* 3. BEFORE / AFTER LABELS */}
      <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[9px] font-semibold text-white/95 uppercase tracking-wider pointer-events-none shadow-xs border border-white/10 z-10">
        BEFORE
      </span>
      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[9px] font-semibold text-white/95 uppercase tracking-wider pointer-events-none shadow-xs border border-white/10 z-10">
        AFTER
      </span>

      {/* 4. SUBTLE WATERMARK PILL */}
      <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[8.5px] font-medium text-white/80 tracking-wider pointer-events-none z-10 border border-white/10">
        AI PREVIEW
      </span>

      {/* 5. DRAGGABLE VERTICAL PINK DIVIDER & CIRCULAR HANDLE */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-[#f72568] -translate-x-1/2 pointer-events-none z-20 shadow-[0_0_8px_rgba(247,37,104,0.6)]"
        style={{ left: `${position}%` }}
      >
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 rounded-full bg-[#f72568] border-2 border-white shadow-md shadow-rose-950/20 flex items-center justify-center text-white transition-transform ${
            isDragging ? "scale-110 shadow-rose-500/50" : "group-hover/slider:scale-105"
          }`}
        >
          <ArrowLeftRight className="size-3.5 stroke-[2.5]" />
        </div>
      </div>
    </div>
  );
}

function UpscalePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileMetadata, setFileMetadata] = useState<ImageFileMetadata | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [scale, setScale] = useState<Scale>("4");
  const [mode, setMode] = useState("Natural");
  const [format, setFormat] = useState<Format>("PNG");
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{
    original: { width: number; height: number } | null;
    upscaled: { width: number; height: number } | null;
  }>({
    original: null,
    upscaled: null,
  });
  const [resultSize, setResultSize] = useState<string>("");
  const pollTimerRef = useRef<number | null>(null);
  const { addJob } = useUserStore();

  const origW = fileMetadata?.width || dimensions.original?.width || 0;
  const origH = fileMetadata?.height || dimensions.original?.height || 0;
  const scaleNum = parseInt(scale, 10) || 2;
  const targetW = origW * scaleNum;
  const targetH = origH * scaleNum;
  const targetPixels = targetW * targetH;

  const safeInfo = useMemo(() => {
    if (origW <= 0 || origH <= 0) {
      return {
        isExceeded: false,
        safeWidth: 0,
        safeHeight: 0,
        safeScale: 1,
        can2xFit: true,
        message: "",
      };
    }
    const isExceeded =
      targetPixels > MAX_SAFE_IMAGE_PIXELS ||
      targetW > MAX_SAFE_IMAGE_DIMENSION ||
      targetH > MAX_SAFE_IMAGE_DIMENSION;
    const { safeWidth, safeHeight, safeScale } = calculateMaxSafeDimensions(origW, origH);
    const can2xFit =
      origW * 2 * origH * 2 <= MAX_SAFE_IMAGE_PIXELS &&
      origW * 2 <= MAX_SAFE_IMAGE_DIMENSION &&
      origH * 2 <= MAX_SAFE_IMAGE_DIMENSION;

    const suggestion =
      scaleNum > 2 && can2xFit
        ? "Choose 2× or reduce the source/output dimensions."
        : "Reduce the source/output dimensions.";
    const message = `${scale}× output exceeds the maximum supported image size. ${suggestion}`;

    return {
      isExceeded,
      safeWidth,
      safeHeight,
      safeScale,
      can2xFit,
      message,
    };
  }, [origW, origH, targetPixels, targetW, targetH, scale, scaleNum]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    };
  }, []);

  const start = async () => {
    if (!uploadedFile) {
      toast.error("Please upload an image first.");
      return;
    }

    if (uploadedFile.size > 35 * 1024 * 1024) {
      toast.error("Image must be smaller than 35MB.");
      return;
    }

    if (safeInfo.isExceeded) {
      setErrorMsg(safeInfo.message);
      toast.error(safeInfo.message);
      return;
    }

    const normMode = mode.toLowerCase();
    const normFormat = format.toLowerCase();

    setRunning(true);
    setDone(false);
    setProgress(5);
    setStage("Preparing image...");
    setErrorMsg(null);
    setResultUrl(null);

    try {
      const resp = await upscaleImage(uploadedFile, scaleNum, normMode, normFormat);
      const activeJobId = resp.jobId;
      setJobId(activeJobId);

      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);

      pollTimerRef.current = window.setInterval(async () => {
        try {
          const status = await getImageStatus(activeJobId);
          setProgress(status.progress);
          setStage(status.stage);

          if (status.status === "completed") {
            if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
            const result = await getImageResult(activeJobId);
            setResultUrl(apiImageUrl(`${result.upscaledImageUrl}?v=${result.resultVersion}`));
            setDimensions({
              original: { width: result.metadata.originalWidth, height: result.metadata.originalHeight },
              upscaled: { width: result.metadata.upscaledWidth, height: result.metadata.upscaledHeight },
            });
            setResultSize(formatBytes(result.metadata.fileSizeBytes));
            setRunning(false);
            setDone(true);

            addJob({
              file_name: uploadedFile.name,
              file_type: "upscale",
              status: "completed",
              quality: `${scale}× / ${mode} (${result.metadata.upscaledWidth}×${result.metadata.upscaledHeight})`,
              credits_used: 1,
              processing_time: "Completed",
              file_url: previewUrl || "",
              result_url: apiImageUrl(result.upscaledImageUrl),
            });

            toast.success(
              `✦ Crystal-clear ${scale}× upscale complete! (${result.metadata.upscaledWidth}×${result.metadata.upscaledHeight}px)`
            );
          } else if (status.status === "failed") {
            if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
            setRunning(false);
            const err = status.error || "Image processing failed. Please try another image.";
            setErrorMsg(err);
            toast.error(err);
          }
        } catch (pollErr) {
          if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
          setRunning(false);
          const err = pollErr instanceof Error ? pollErr.message : "Error checking upscale status.";
          setErrorMsg(err);
          toast.error(err);
        }
      }, 750);
    } catch (err) {
      setRunning(false);
      const message = err instanceof Error ? err.message : "Failed to start image upscaling.";
      setErrorMsg(message);
      toast.error(message);
    }
  };

  const loadDemo = async (item: (typeof PRESETS)[number] = PRESETS[0]) => {
    try {
      toast.info(`Loading sample "${item.name}"...`);
      const response = await fetch(item.image);
      if (!response.ok) throw new Error("Sample asset file could not be loaded");
      const blob = await response.blob();
      const ext = item.image.endsWith(".jpg") ? "jpg" : "png";
      const fileName = `${item.name.toLowerCase().replaceAll(" ", "-")}.${ext}`;
      const file = new File([blob], fileName, { type: blob.type || (ext === "jpg" ? "image/jpeg" : "image/png") });

      const dims = await getImageDimensions(item.image);
      const meta: ImageFileMetadata = {
        name: fileName,
        sizeBytes: file.size,
        sizeFormatted: formatBytes(file.size),
        width: dims.width,
        height: dims.height,
        type: file.type,
      };

      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      if (resultUrl && resultUrl.startsWith("blob:")) {
        URL.revokeObjectURL(resultUrl);
      }

      setUploadedFile(file);
      setPreviewUrl(item.image);
      setFileMetadata(meta);
      setScale(item.factor as Scale);
      setDimensions({ original: dims, upscaled: null });
      setDone(false);
      setResultUrl(null);
      setJobId(null);
      setErrorMsg(null);
      toast.success(`Loaded sample "${item.name}" (${dims.width} × ${dims.height}px)`);
    } catch (err) {
      console.error("Failed to load sample:", err);
      toast.error("Failed to load sample asset.");
    }
  };

  const resetAll = () => {
    if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    if (resultUrl && resultUrl.startsWith("blob:")) {
      URL.revokeObjectURL(resultUrl);
    }
    setDone(false);
    setRunning(false);
    setResultUrl(null);
    setUploadedFile(null);
    setPreviewUrl(null);
    setFileMetadata(null);
    setJobId(null);
    setErrorMsg(null);
    setDimensions({ original: null, upscaled: null });
    setResultSize("");
  };

  const download = () => {
    if (!jobId || !done) return;
    const link = document.createElement("a");
    link.href = apiImageUrl(`/api/image/download/${encodeURIComponent(jobId)}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(
      `Downloading ${dimensions.upscaled ? `${dimensions.upscaled.width}×${dimensions.upscaled.height}px ` : ""}${format} master...`
    );
  };

  return (
    <main className="up-page">
      <section className="up-hero">
        <div className="up-shell">
          <div className="up-intro">
            <p className="up-eyebrow">AI IMAGE UPSCALER</p>
            <h1>Turn Low-Resolution Images Into <em>Crystal-Clear 4K &amp; 8K</em></h1>
            <p>Restore texture, recover fine details and upscale your images while keeping them natural, sharp and realistic.</p>
          </div>

          {/* Quick Demo Preset Pills */}
          <div className="up-presets">
            <span>TRY SAMPLES:</span>
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                className={fileMetadata?.name.includes(p.name.toLowerCase().replaceAll(" ", "-")) ? "active" : ""}
                onClick={() => loadDemo(p)}
              >
                <img src={p.image} alt={p.name} />
                <b>{p.name}</b>
                <i>{p.factor}×</i>
              </button>
            ))}
          </div>

          <div className="up-tool-card">
            <div className="up-tool-copy">
              <p className="up-eyebrow">AI IMAGE UPSCALER</p>
              <h2>Turn Low-Resolution Images Into <span>Crystal-Clear 4K &amp; 8K</span></h2>
              <p>Restore texture, recover fine details and upscale your images while keeping them natural, sharp and realistic.</p>
              <div className="up-trust">
                <span><Check /> No Watermark</span>
                <span><ShieldCheck /> Private Processing</span>
                <span><Sparkles /> Natural Detail</span>
                <span><ImageUp /> 4K &amp; 8K Ready</span>
              </div>
            </div>

            {/* Center Dynamic Area: Running Loader OR Comparison Slider OR ImageUploader with Visible Preview */}
            <div className="up-center-slot">
              {running ? (
                <div className="up-running-box">
                  <PinkScanLoader progress={progress} stage={stage} />
                </div>
              ) : done && previewUrl && resultUrl ? (
                <HeroComparisonSlider
                  beforeUrl={previewUrl}
                  afterUrl={resultUrl}
                  beforeDims={dimensions.original}
                  afterDims={dimensions.upscaled}
                  scale={scale}
                  onChangeImage={() => {
                    setDone(false);
                    setResultUrl(null);
                  }}
                />
              ) : (
                <ImageUploader
                  onImageSelected={(file, url, meta) => {
                    setUploadedFile(file);
                    setPreviewUrl(url);
                    setFileMetadata(meta);
                    setDimensions({
                      original: { width: meta.width, height: meta.height },
                      upscaled: null,
                    });
                    setDone(false);
                    setResultUrl(null);
                    setErrorMsg(null);

                    // If current scale exceeds safe limit, auto-switch to 2x if 2x fits
                    const curScale = parseInt(scale, 10) || 2;
                    const curPixels = meta.width * curScale * meta.height * curScale;
                    if (
                      curPixels > MAX_SAFE_IMAGE_PIXELS ||
                      meta.width * curScale > MAX_SAFE_IMAGE_DIMENSION ||
                      meta.height * curScale > MAX_SAFE_IMAGE_DIMENSION
                    ) {
                      const can2x =
                        meta.width * 2 * meta.height * 2 <= MAX_SAFE_IMAGE_PIXELS &&
                        meta.width * 2 <= MAX_SAFE_IMAGE_DIMENSION &&
                        meta.height * 2 <= MAX_SAFE_IMAGE_DIMENSION;
                      if (can2x && scale !== "2") {
                        setScale("2");
                        toast.info(`Large image (${meta.width}×${meta.height}px). Auto-switched to safe 2× scale.`);
                      }
                    }
                  }}
                  onImageRemoved={() => {
                    resetAll();
                  }}
                  isProcessing={running}
                  initialPreviewUrl={previewUrl}
                  initialMetadata={fileMetadata}
                />
              )}
            </div>

            <aside className="up-settings">
              <div>
                <p>UPSCALE SETTINGS</p>
                <label>Scale</label>
                <div className="up-option-row">
                  {(["2", "4", "8"] as Scale[]).map((x) => (
                    <button
                      key={x}
                      type="button"
                      onClick={() => {
                        setScale(x);
                        setErrorMsg(null);
                      }}
                      className={scale === x ? "selected" : ""}
                    >
                      {x}<small>×</small>
                    </button>
                  ))}
                </div>
                {fileMetadata && fileMetadata.width > 0 ? (
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-500">
                    <span className={safeInfo.isExceeded ? "text-rose-600 font-medium" : ""}>
                      Target: <b>{targetW.toLocaleString()} × {targetH.toLocaleString()} px</b>
                      {safeInfo.isExceeded && " (Exceeds Limit)"}
                    </span>
                    <span className={safeInfo.isExceeded ? "font-semibold text-rose-600" : "font-semibold text-[#E11D48]"}>
                      {scale}× {scale === "8" ? "8K" : scale === "4" ? "4K" : "HD"}
                    </span>
                  </div>
                ) : (
                  <div className="mt-1 text-[11px] text-gray-400">
                    Upload or select an image to preview target resolution
                  </div>
                )}

                {safeInfo.isExceeded && (
                  <div className="mt-2.5 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-700 shadow-sm space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="size-4 shrink-0 text-rose-500 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold text-rose-800 leading-snug">
                          {scale}× output exceeds the maximum supported image size. Choose 2× or reduce the source/output dimensions.
                        </p>
                        <p className="text-[11px] text-rose-600 leading-normal">
                          Target pixel count ({Math.round(targetPixels / 1_000_000)}M px) exceeds safe processing limit ({Math.round(MAX_SAFE_IMAGE_PIXELS / 1_000_000)}M px).
                        </p>
                        <p className="text-[11px] text-rose-700">
                          Max safe dimensions: <b>{safeInfo.safeWidth.toLocaleString()} × {safeInfo.safeHeight.toLocaleString()} px</b>
                        </p>
                      </div>
                    </div>
                    {safeInfo.can2xFit && scale !== "2" && (
                      <button
                        type="button"
                        onClick={() => {
                          setScale("2");
                          setErrorMsg(null);
                        }}
                        className="w-full rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 transition"
                      >
                        Choose 2× ({origW * 2} × {origH * 2} px — Safe)
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label>Enhancement mode</label>
                <div className="up-mode-grid">
                  {["Natural", "Portrait", "Art", "Product"].map((x) => (
                    <button
                      key={x}
                      type="button"
                      onClick={() => setMode(x)}
                      className={mode === x ? "selected" : ""}
                    >
                      {x}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label>Output</label>
                <div className="up-output">
                  {(["PNG", "JPG"] as Format[]).map((x) => (
                    <button
                      key={x}
                      type="button"
                      onClick={() => setFormat(x)}
                      className={format === x ? "selected" : ""}
                    >
                      {x}
                    </button>
                  ))}
                </div>
              </div>

              {errorMsg && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
                  {errorMsg}
                </div>
              )}

              {done && resultUrl ? (
                <>
                  <div className="up-result-meta">
                    <span><b>Original:</b> {dimensions.original?.width || 512} × {dimensions.original?.height || 512}</span>
                    <span><b>Upscaled:</b> {dimensions.upscaled?.width || 2048} × {dimensions.upscaled?.height || 2048} ({scale}× HD)</span>
                    <span><b>Output:</b> {format} · {resultSize || "Ultra HD"}</span>
                  </div>
                  <button
                    type="button"
                    className="up-start"
                    onClick={download}
                  >
                    <Download className="size-4" /> Download Upscaled Image ({scale}× {format})
                  </button>
                  <button
                    type="button"
                    className="up-reset-btn"
                    onClick={resetAll}
                  >
                    <RotateCcw className="size-3" /> Upscale Another Image
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="up-start"
                  disabled={running || !uploadedFile || safeInfo.isExceeded}
                  onClick={() => start()}
                >
                  <WandSparkles className="size-4" />{" "}
                  {running
                    ? "Upscaling Image…"
                    : safeInfo.isExceeded
                    ? "Safe Limit Exceeded"
                    : "Start Upscaling"}
                </button>
              )}
            </aside>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 bg-[#FFFBFD] border-t border-[#f5dce5]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <header className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <p className="text-[10px] font-semibold text-[#f72568] tracking-widest uppercase mb-2">
              REAL AI RESTORATION
            </p>
            <h2 className="text-3xl sm:text-5xl font-normal text-gray-950 tracking-tight leading-tight">
              See Every Detail Come Back to Life
            </h2>
            <p className="mt-3 text-base text-gray-600 font-normal leading-relaxed">
              Drag the interactive slider to reveal how Bellix.us restores texture, clarity and detail from low-quality images.
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-7">
            {SHOWCASE_ITEMS.map((item) => (
              <article
                key={item.id}
                className="group rounded-[26px] border border-[#f5dce5] bg-white shadow-lg shadow-gray-200/40 hover:shadow-xl hover:border-[#f5a5bd] hover:-translate-y-1 transition-all duration-300 overflow-hidden grid grid-cols-1 sm:grid-cols-[1.12fr_0.88fr] min-h-[350px]"
              >
                {/* LEFT: Before/After Comparison Slider */}
                <div className="relative w-full aspect-[4/3] sm:aspect-auto sm:min-h-[340px] md:min-h-[360px] bg-neutral-950 overflow-hidden select-none">
                  <UpscaleComparisonSlider
                    beforeImage={item.beforeImage}
                    afterImage={item.afterImage}
                    title={item.title}
                  />
                </div>

                {/* RIGHT: Information Panel */}
                <div
                  className={`p-5 sm:p-6 flex flex-col justify-between bg-gradient-to-br ${item.tone} border-t sm:border-t-0 sm:border-l border-[#f5dce5]/70`}
                >
                  <div className="space-y-3">
                    <p className="text-[9.5px] font-semibold text-[#f72568] tracking-widest uppercase">
                      {item.category}
                    </p>
                    <h3 className="text-lg sm:text-xl font-medium text-gray-950 tracking-tight leading-snug">
                      {item.title}
                    </h3>
                    <div className="rounded-xl bg-white/85 border border-rose-200/70 px-3.5 py-2 shadow-2xs">
                      <p className="text-xs font-medium text-[#e11252] leading-relaxed">
                        {item.statement}
                      </p>
                    </div>
                    <p className="text-xs text-gray-600 font-normal leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-4 space-y-3 mt-4 border-t border-[#f5dce5]/60">
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                      <div className="bg-white/85 border border-gray-200/60 rounded-xl p-2 text-center shadow-2xs">
                        <span className="text-[8.5px] uppercase font-semibold text-gray-400 block tracking-wider">
                          SOURCE
                        </span>
                        <span className="text-xs font-semibold text-gray-800">
                          {item.source}
                        </span>
                      </div>
                      <div className="bg-white/85 border border-gray-200/60 rounded-xl p-2 text-center shadow-2xs">
                        <span className="text-[8.5px] uppercase font-semibold text-gray-400 block tracking-wider">
                          OUTPUT
                        </span>
                        <span className="text-xs font-semibold text-gray-800">
                          {item.output}
                        </span>
                      </div>
                      <div className="bg-white/85 border border-gray-200/60 rounded-xl p-2 text-center shadow-2xs">
                        <span className="text-[8.5px] uppercase font-semibold text-gray-400 block tracking-wider">
                          UPSCALE
                        </span>
                        <span className="text-xs font-semibold text-gray-800">
                          {item.scale}×
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[11px] font-medium shadow-2xs">
                        <Check className="size-3 stroke-[2.5]" />
                        <span>{item.result}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="up-features">
        <div className="up-shell">
          <header className="up-section-heading">
            <p className="up-eyebrow">BUILT FOR REAL DETAIL</p>
            <h2>More Than More Pixels</h2>
            <p>Bellix.us reconstructs the visual information that ordinary resizing leaves behind.</p>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {FEATURE_CARDS.map(card => <FeatureComparisonCard key={card.id} card={card} />)}
          </div>
        </div>
      </section>

      <section className="up-trust-strip up-shell">
        <div>
          <h2>Made for Detail. Designed for Reality.</h2>
        </div>
        {[
          [ShieldCheck, "Natural-Looking Results", "No plastic oversmoothing"],
          [LockKeyhole, "Private Image Processing", "Your uploads remain protected"],
          [SlidersHorizontal, "Multiple Upscale Levels", "Choose 2, 4 or 8"],
          [Sparkles, "AI + Photography Ready", "Portraits, art, products and graphics"]
        ].map(([Icon, title, copy]) => {
          const I = Icon as typeof ShieldCheck;
          return (
            <article key={title as string}>
              <I />
              <span>
                <b>{title as string}</b>
                <small>{copy as string}</small>
              </span>
            </article>
          );
        })}
      </section>

      <section className="up-faq">
        <div className="up-shell">
          <header className="up-section-heading">
            <p className="up-eyebrow">UPSCALING FAQ</p>
            <h2>Everything You Want to Know</h2>
            <p>Quick answers about quality, resolution, privacy and how Bellix.us works.</p>
          </header>
          <div className="up-faq-list">
            {FAQS.map(([question, answer], idx) => {
              const isOpen = openFaq === idx;
              return (
                <article key={question} className="up-faq-item">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className={`up-faq-btn ${isOpen ? "open" : ""}`}
                    aria-expanded={isOpen}
                  >
                    <span>{question}</span>
                    <i>+</i>
                  </button>
                  {isOpen && (
                    <div className="up-faq-answer">
                      <p>{answer}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="up-final up-shell">
        <p className="up-eyebrow">READY TO SEE THE DIFFERENCE?</p>
        <h2>Give Your Image the Detail It Deserves.</h2>
        <p>Upload once. Compare instantly. Export in high resolution.</p>
        <div>
          <button className="up-primary" onClick={() => start()}>
            <WandSparkles /> Upscale My Image
          </button>
          <button className="up-secondary" onClick={() => loadDemo()}>
            Try a Demo <ArrowRight />
          </button>
        </div>
      </section>
    </main>
  );
}

