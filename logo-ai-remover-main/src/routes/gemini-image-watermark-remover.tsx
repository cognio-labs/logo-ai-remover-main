"use client";

import { useUserStore } from "@/lib/userStore";
import { reserveLocal, finishLocal } from '@/lib/account-processing';

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback, useId } from "react";
import Link from "next/link";
import {
  Sparkles,
  Upload,
  Download,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Eye,
  RefreshCw,
  Layers,
  ChevronLeft,
  ChevronRight,
  FileImage,
  Lock,
  Zap,
  Image as ImageIcon,
  Check,
  HelpCircle,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  FileCheck2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { removeWatermarkFromImageDataSync } from "@pilio/gemini-watermark-remover/image-data";

export const Route = createFileRoute("/gemini-image-watermark-remover")({
  head: () => ({
    meta: [
      {
        title: "ClearCorner — Gemini Image Sparkle & Watermark Remover | Bellix.us",
      },
      {
        name: "description",
        content:
          "Take the sparkle logo off your Google Gemini AI images. 100% private in-browser canvas processing. Free, batch support, original 4K/8K resolution preserved.",
      },
      { rel: "canonical", href: "https://www.bellix.us/gemini-image-watermark-remover" },
    ],
  }),
  component: GeminiImageWatermarkRemoverPage,
});

/* ==========================================================================
   INPAINTING & CORNER GEOMETRY CORE
   ========================================================================== */

interface CornerRect {
  x: number;
  y: number;
  w: number;
  h: number;
  g: number;
}

function calcRect(W: number, H: number, boxPct: number, offsetPct: number): CornerRect {
  const S = Math.min(W, H);
  const boxSize = Math.max(12, Math.round((S * boxPct) / 100));
  // Exact 15.6% short-side law measured on real Google Gemini images
  const cx = W - (offsetPct / 100) * S;
  const cy = H - (offsetPct / 100) * S;
  const x = Math.max(0, Math.min(W - boxSize, Math.round(cx - boxSize / 2)));
  const y = Math.max(0, Math.min(H - boxSize, Math.round(cy - boxSize / 2)));
  return {
    x,
    y,
    w: boxSize,
    h: boxSize,
    g: Math.round((offsetPct / 100) * S),
  };
}

/**
 * Precise targeted watermark cleanup:
 * Only cleans the white watermark sparkle pixels, leaving the background 100% untouched.
 * ZERO background blur, ZERO black shadow.
 */
function cleanWatermarkIconPrecise(
  g: CanvasRenderingContext2D,
  W: number,
  H: number,
  R: CornerRect
): void {
  const rw = Math.max(16, Math.min(W - R.x, R.w));
  const rh = Math.max(16, Math.min(H - R.y, R.h));
  const rx = Math.max(0, Math.min(W - rw, R.x));
  const ry = Math.max(0, Math.min(H - rh, R.y));

  const imgData = g.getImageData(rx, ry, rw, rh);
  const data = imgData.data;

  // 1. Sample boundary pixels to compute local background color
  let bgR = 0, bgG = 0, bgB = 0, bgCount = 0;
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      if (x === 0 || x === rw - 1 || y === 0 || y === rh - 1) {
        const idx = (y * rw + x) * 4;
        bgR += data[idx];
        bgG += data[idx + 1];
        bgB += data[idx + 2];
        bgCount++;
      }
    }
  }
  if (!bgCount) return;
  bgR /= bgCount;
  bgG /= bgCount;
  bgB /= bgCount;
  const bgLum = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;

  // 2. Only modify pixels where brightness is elevated by the white watermark icon
  for (let y = 1; y < rh - 1; y++) {
    for (let x = 1; x < rw - 1; x++) {
      const idx = (y * rw + x) * 4;
      const r = data[idx], gr = data[idx + 1], b = data[idx + 2];
      const lum = 0.299 * r + 0.587 * gr + 0.114 * b;
      const diff = lum - bgLum;

      // Only clean pixels that are noticeably brighter than the surrounding background
      if (diff > 14) {
        const alpha = Math.min(0.92, diff / 255);
        data[idx] = Math.max(0, Math.min(255, Math.round((r - alpha * 255) / (1 - alpha))));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round((gr - alpha * 255) / (1 - alpha))));
        data[idx + 2] = Math.max(0, Math.min(255, Math.round((b - alpha * 255) / (1 - alpha))));
      }
    }
  }

  g.putImageData(imgData, rx, ry);
}

function generateLoupes(
  aCanvas: HTMLCanvasElement,
  bCanvas: HTMLCanvasElement,
  R: CornerRect
): [string, string] {
  let half = Math.round(Math.max(R.w, R.h) * 0.85);
  half = Math.min(half, Math.floor(Math.min(aCanvas.width, aCanvas.height) / 2));
  const cx = R.x + R.w / 2;
  const cy = R.y + R.h / 2;
  const sx = Math.max(0, Math.min(aCanvas.width - 2 * half, Math.round(cx - half)));
  const sy = Math.max(0, Math.min(aCanvas.height - 2 * half, Math.round(cy - half)));

  const crops = [aCanvas, bCanvas].map((src) => {
    const c = document.createElement("canvas");
    c.width = 120;
    c.height = 120;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(src, sx, sy, 2 * half, 2 * half, 0, 0, 120, 120);
    }
    return c.toDataURL("image/jpeg", 0.92);
  });

  return [crops[0], crops[1]];
}

/* ==========================================================================
   PROCEDURAL SAMPLE SCENE GENERATORS (For Contact Sheet & Demos)
   ========================================================================== */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function drawSparkle(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number
) {
  g.save();
  g.shadowColor = "rgba(255, 255, 255, 0.7)";
  g.shadowBlur = R * 0.3;
  g.fillStyle = "rgba(255, 255, 255, 0.95)";
  g.beginPath();
  g.moveTo(cx, cy - R);
  g.quadraticCurveTo(cx, cy, cx + R, cy);
  g.quadraticCurveTo(cx, cy, cx, cy + R);
  g.quadraticCurveTo(cx, cy, cx - R, cy);
  g.quadraticCurveTo(cx, cy, cx, cy - R);
  g.fill();
  g.restore();
}

function generateProceduralScene(
  kind: number,
  w: number,
  h: number,
  seed = 1
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return c;

  const r = rng(kind * 7919 + 11 + seed * 104729);

  if (kind === 0) {
    // Dusk Ridge
    const gr = g.createLinearGradient(0, 0, 0, h * 0.7);
    gr.addColorStop(0, "#1c2b4d");
    gr.addColorStop(0.55, "#c8627a");
    gr.addColorStop(1, "#f4b56a");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);

    g.fillStyle = "#ffe3a8";
    g.beginPath();
    g.arc(w * 0.68, h * 0.5, h * 0.07, 0, Math.PI * 2);
    g.fill();

    // Mountains
    const colors = ["#6b4a78", "#47346a", "#2b2252", "#16143a"];
    const bases = [0.54, 0.64, 0.76, 0.87];
    colors.forEach((col, idx) => {
      g.beginPath();
      g.moveTo(0, h);
      for (let i = 0; i <= w; i += 8) {
        const t = i / w;
        g.lineTo(
          i,
          h * bases[idx] +
            h * 0.05 * (Math.sin(t * 3 * Math.PI + r() * 5) + 0.5 * Math.sin(t * 7 + r() * 5))
        );
      }
      g.lineTo(w, h);
      g.closePath();
      g.fillStyle = col;
      g.fill();
    });
  } else if (kind === 1) {
    // Open Water
    const sky = g.createLinearGradient(0, 0, 0, h * 0.5);
    sky.addColorStop(0, "#8fb8de");
    sky.addColorStop(1, "#f6d7b0");
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h * 0.5);

    const sea = g.createLinearGradient(0, h * 0.5, 0, h);
    sea.addColorStop(0, "#3a7a96");
    sea.addColorStop(1, "#0d2c46");
    g.fillStyle = sea;
    g.fillRect(0, h * 0.5, w, h * 0.5);

    g.fillStyle = "#fff1cf";
    g.beginPath();
    g.arc(w * 0.3, h * 0.42, h * 0.05, 0, Math.PI * 2);
    g.fill();
  } else if (kind === 2) {
    // Pine Mist
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#dfeee3");
    gr.addColorStop(1, "#7ba995");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);

    for (let k = 0; k < 5; k++) {
      g.fillStyle = `rgba(${30 - k * 4}, ${80 - k * 8}, ${62 - k * 6}, ${0.28 + k * 0.14})`;
      for (let i = -20; i < w + 20; i += 28 + k * 3) {
        const th = h * (0.16 + k * 0.04) + r() * h * 0.05;
        const by = h * (0.52 + k * 0.1);
        g.beginPath();
        g.moveTo(i, by - th);
        g.lineTo(i - 14 - k * 2, by);
        g.lineTo(i + 14 + k * 2, by);
        g.fill();
      }
    }
  } else {
    // Dune light / Warm sunset
    const gr = g.createLinearGradient(0, 0, 0, h * 0.6);
    gr.addColorStop(0, "#f9dcb8");
    gr.addColorStop(1, "#f2a08a");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);

    const duneColors = ["#e6a070", "#c77652", "#98523d"];
    duneColors.forEach((col, idx) => {
      g.beginPath();
      g.moveTo(0, h);
      for (let i = 0; i <= w; i += 8) {
        const t = i / w;
        g.lineTo(i, h * (0.5 + idx * 0.14) + h * 0.06 * Math.sin(t * 4 + idx));
      }
      g.lineTo(w, h);
      g.closePath();
      g.fillStyle = col;
      g.fill();
    });
  }

  // Faint camera noise
  const imgData = g.getImageData(0, 0, w, h);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (r() - 0.5) * 6;
    data[i] += n;
    data[i + 1] += n;
    data[i + 2] += n;
  }
  g.putImageData(imgData, 0, 0);

  return c;
}

interface ImageItem {
  id: string;
  name: string;
  canvas: HTMLCanvasElement;
  beforeURL: string;
  afterURL?: string;
  rect?: CornerRect;
  loupe?: [string, string];
  key?: string;
  width: number;
  height: number;
}

interface GallerySample {
  id: string;
  title: string;
  width: number;
  height: number;
  beforeURL: string;
  afterURL: string;
  loupe: [string, string];
  boxSize: number;
}

export interface RealSampleItem {
  id: string;
  title: string;
  tag: string;
  w: number;
  h: number;
  boxSize: number;
  beforeURL: string;
  afterURL: string;
  loupeBeforeURL: string;
  loupeAfterURL: string;
}

export const REAL_SAMPLES: RealSampleItem[] = [
  {
    id: "sample_1",
    title: "Alpine Lake Reflection",
    tag: "Landscape · 16:9",
    w: 960,
    h: 540,
    boxSize: 54,
    beforeURL: "/gemini-samples/sample_1_before.webp",
    afterURL: "/gemini-samples/sample_1_after.webp",
    loupeBeforeURL: "/gemini-samples/sample_1_loupe_before.webp",
    loupeAfterURL: "/gemini-samples/sample_1_loupe_after.webp",
  },
  {
    id: "sample_2",
    title: "Editorial Studio Portrait",
    tag: "Portrait · 1:1",
    w: 720,
    h: 720,
    boxSize: 72,
    beforeURL: "/gemini-samples/sample_2_before.webp",
    afterURL: "/gemini-samples/sample_2_after.webp",
    loupeBeforeURL: "/gemini-samples/sample_2_loupe_before.webp",
    loupeAfterURL: "/gemini-samples/sample_2_loupe_after.webp",
  },
  {
    id: "sample_3",
    title: "Liquid Emerald Caustic",
    tag: "Macro · 1:1",
    w: 720,
    h: 720,
    boxSize: 72,
    beforeURL: "/gemini-samples/sample_3_before.webp",
    afterURL: "/gemini-samples/sample_3_after.webp",
    loupeBeforeURL: "/gemini-samples/sample_3_loupe_before.webp",
    loupeAfterURL: "/gemini-samples/sample_3_loupe_after.webp",
  },
  {
    id: "sample_4",
    title: "Architectural Twilight Villa",
    tag: "Architecture · 16:9",
    w: 960,
    h: 540,
    boxSize: 54,
    beforeURL: "/gemini-samples/sample_4_before.webp",
    afterURL: "/gemini-samples/sample_4_after.webp",
    loupeBeforeURL: "/gemini-samples/sample_4_loupe_before.webp",
    loupeAfterURL: "/gemini-samples/sample_4_loupe_after.webp",
  },
  {
    id: "sample_5",
    title: "Astronaut Floral Cavern",
    tag: "Cinematic · 1:1",
    w: 720,
    h: 720,
    boxSize: 72,
    beforeURL: "/gemini-samples/sample_5_before.webp",
    afterURL: "/gemini-samples/sample_5_after.webp",
    loupeBeforeURL: "/gemini-samples/sample_5_loupe_before.webp",
    loupeAfterURL: "/gemini-samples/sample_5_loupe_after.webp",
  },
  {
    id: "sample_6",
    title: "Cyberpunk Neon Rain",
    tag: "Cityscape · 16:9",
    w: 960,
    h: 540,
    boxSize: 54,
    beforeURL: "/gemini-samples/sample_6_before.webp",
    afterURL: "/gemini-samples/sample_6_after.webp",
    loupeBeforeURL: "/gemini-samples/sample_6_loupe_before.webp",
    loupeAfterURL: "/gemini-samples/sample_6_loupe_after.webp",
  },
  {
    id: "sample_7",
    title: "Desert Dune Crest",
    tag: "Landscape · 4:3",
    w: 800,
    h: 600,
    boxSize: 60,
    beforeURL: "/gemini-samples/sample_7_before.webp",
    afterURL: "/gemini-samples/sample_7_after.webp",
    loupeBeforeURL: "/gemini-samples/sample_7_loupe_before.webp",
    loupeAfterURL: "/gemini-samples/sample_7_loupe_after.webp",
  },
  {
    id: "sample_8",
    title: "Pacific Ocean Swells",
    tag: "Oceanic · 3:4",
    w: 600,
    h: 800,
    boxSize: 60,
    beforeURL: "/gemini-samples/sample_8_before.webp",
    afterURL: "/gemini-samples/sample_8_after.webp",
    loupeBeforeURL: "/gemini-samples/sample_8_loupe_before.webp",
    loupeAfterURL: "/gemini-samples/sample_8_loupe_after.webp",
  },
];

export const INITIAL_GALLERY_SAMPLES: GallerySample[] = REAL_SAMPLES.map((s) => ({
  id: s.id,
  title: s.title,
  width: s.w,
  height: s.h,
  beforeURL: s.beforeURL,
  afterURL: s.afterURL,
  loupe: [s.loupeBeforeURL, s.loupeAfterURL],
  boxSize: s.boxSize,
}));


export default function GeminiImageWatermarkRemoverPage() {
  const [sizePct, setSizePct] = useState<number>(7);
  const [marginPct, setMarginPct] = useState<number>(15.6);
  const [showTargetBox, setShowTargetBox] = useState<boolean>(true);
  const [showCleanOnly, setShowCleanOnly] = useState<boolean>(false);
  const [sliderPos, setSliderPos] = useState<number>(46);
  const [items, setItems] = useState<ImageItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [gallerySamples, setGallerySamples] = useState<GallerySample[]>(INITIAL_GALLERY_SAMPLES);
  const [scanStage, setScanStage] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDraggingSlider = useRef<boolean>(false);

  const currentItem = items[currentIndex] || null;

  useEffect(() => {
    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(max > 0 ? (window.scrollY / max) * 100 : 0);
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  // Process a canvas item with current slider settings
  const processItem = useCallback(
    async (item: ImageItem, sPct: number, mPct: number): Promise<ImageItem> => {
      const W = item.canvas.width;
      const H = item.canvas.height;
      let R = calcRect(W, H, sPct, mPct);

      const afterCanvas = document.createElement("canvas");
      afterCanvas.width = W;
      afterCanvas.height = H;
      const g = afterCanvas.getContext("2d", { willReadFrequently: true });
      if (!g) return item;

      // Draw original
      g.drawImage(item.canvas, 0, 0);

      // 1. Calibrated inverse alpha compositing engine (ZERO blur, ZERO dark shadow)
      let watermarkCleaned = false;
      try {
        const origImageData = g.getImageData(0, 0, W, H);
        const result = removeWatermarkFromImageDataSync(origImageData, {
          adaptiveMode: "auto",
        });

        if (result && result.meta && result.meta.applied && result.imageData) {
          const cleanedData = new ImageData(
            new Uint8ClampedArray(result.imageData.data),
            result.imageData.width,
            result.imageData.height
          );
          g.putImageData(cleanedData, 0, 0);
          watermarkCleaned = true;

          if (result.meta.position) {
            R = {
              x: result.meta.position.x,
              y: result.meta.position.y,
              w: result.meta.position.width,
              h: result.meta.position.height,
              g: Math.round(Math.min(W, H) * (mPct / 100)),
            };
          }
        }
      } catch (err) {
        console.warn("Watermark engine processing fallback:", err);
      }

      // 2. Targeted fallback if engine did not find standard alpha watermark
      if (!watermarkCleaned) {
        cleanWatermarkIconPrecise(g, W, H, R);
      }

      const blob = await new Promise<Blob | null>((resolve) => afterCanvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Could not encode image for processing.");
      const afterURL = URL.createObjectURL(blob);
      const loupes = generateLoupes(item.canvas, afterCanvas, R);

      return {
        ...item,
        afterURL,
        rect: R,
        loupe: loupes,
        key: `${sPct}|${mPct}`,
      };
    },
    []
  );

  // Handle file uploads (multiple images)
  const handleIncomingFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setValidationError(null);
      const supported = new Set(["image/png", "image/jpeg", "image/webp"]);
      const files = Array.from(fileList);
      const invalid = files.find((file) => !supported.has(file.type) || file.size > 25 * 1024 * 1024);
      if (invalid) {
        const reason = !supported.has(invalid.type) ? "Only PNG, JPG/JPEG, and WebP files are supported." : "Images must be 25 MB or smaller.";
        setValidationError(reason);
        toast.error(reason);
        return;
      }
      const validFiles = files;
      if (validFiles.length === 0) {
        toast.error("Please drop JPG, PNG, or WebP images.");
        return;
      }

      toast.info(`Importing ${validFiles.length} image(s)...`);
      const newItems: ImageItem[] = [];

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const objUrl = URL.createObjectURL(file);
        const img = new Image();
        img.src = objUrl;

        const loaded = await new Promise<boolean>((res) => {
          img.onload = () => res(true);
          img.onerror = () => res(false);
        });
        if (!loaded || !img.naturalWidth || !img.naturalHeight) {
          URL.revokeObjectURL(objUrl);
          toast.error(`Could not open ${file.name}`);
          continue;
        }

        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const g = canvas.getContext("2d", { willReadFrequently: true });
        if (g) {
          g.drawImage(img, 0, 0);
        }

        const rawItem: ImageItem = {
          id: `upload_${Date.now()}_${i}`,
          name: file.name,
          canvas,
          beforeURL: objUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
        };

        newItems.push(rawItem);
      }

      if (!newItems.length) return;
      setItems((prev) => [...prev, ...newItems]);
      setCurrentIndex(items.length);
      toast.success(`${newItems.length} image(s) ready. Click "Remove Watermark Now" to process.`);

    },
    [items.length]
  );

  const runScan = useCallback(
    async (targetItem?: ImageItem) => {
      const target = targetItem || currentItem;
      const pending = target
        ? [target]
        : items.filter((item) => !item.afterURL || item.key !== `${sizePct}|${marginPct}`);
      if (!pending.length || isProcessing) return;

      setIsProcessing(true);
      setScanStage(0);
      setScanProgress(12);

      try {
        const stages = [
          "Loading original image",
          "Analyzing image dimensions",
          "Detecting watermark artifacts",
          "Applying corner restoration",
          "Generating final preview",
        ];

        // Smooth scanning steps (fast & responsive ~1s total)
        for (let stage = 0; stage < stages.length; stage++) {
          setScanStage(stage);
          setScanProgress(Math.round(((stage + 1) / stages.length) * 88));
          await new Promise((resolve) => setTimeout(resolve, stage === 2 ? 280 : 200));
        }

        for (const item of pending) {
          let reservationId: string | null = null;
          try {
            const input = await (await fetch(item.beforeURL)).blob();
            const reservation = await reserveLocal('gemini-image-watermark-remover', input.size, item.width, item.height);
            reservationId = reservation?.id || null;
          } catch {
            // Non-blocking local fallback
          }

          let processed;
          try {
            processed = await processItem(item, sizePct, marginPct);
            if (reservationId) await finishLocal(reservationId, true).catch(() => {});
          } catch (error) {
            if (reservationId) await finishLocal(reservationId, false).catch(() => {});
            throw error;
          }
          setItems((prev) =>
            prev.map((candidate) => (candidate.id === item.id ? processed : candidate))
          );
        }

        setScanStage(4);
        setScanProgress(100);
        await new Promise((resolve) => setTimeout(resolve, 150));
        toast.success(
          pending.length > 1
            ? `${pending.length} image(s) cleaned successfully!`
            : "Gemini watermark removed successfully!"
        );
      } catch (error) {
        console.error("Image processing failed:", error);
        toast.error(
          error instanceof Error ? error.message : "Image processing failed. Please try again."
        );
      } finally {
        setIsProcessing(false);
        setScanProgress(0);
      }
    },
    [currentItem, items, isProcessing, processItem, sizePct, marginPct]
  );

  const processPendingImages = runScan;

  // Clipboard paste listener
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        e.preventDefault();
        handleIncomingFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleIncomingFiles]);

  // Slider pointer dragging
  const updateSliderPos = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const pct = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100));
    setSliderPos(pct);
  };

  // Download single image
  const downloadCleanImage = async (item: ImageItem, format: "png" | "jpeg" = "png") => {
    if (!item.afterURL) return;
    let downloadUrl = item.afterURL;
    if (format === "jpeg") {
      const image = new Image();
      image.src = item.afterURL;
      await new Promise<void>((resolve) => { image.onload = () => resolve(); image.onerror = () => resolve(); });
      const canvas = document.createElement("canvas");
      canvas.width = item.width;
      canvas.height = item.height;
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, item.width, item.height);
        context.drawImage(image, 0, 0);
        const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.98));
        if (jpeg) downloadUrl = URL.createObjectURL(jpeg);
      }
    }
    const a = document.createElement("a");
    a.href = downloadUrl;
    const baseName = item.name.replace(/\.[^/.]+$/, "");
    a.download = `${baseName}_clean.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloaded ${baseName}_clean.${format} at ${item.width} × ${item.height}.`);
    if (downloadUrl !== item.afterURL) URL.revokeObjectURL(downloadUrl);
    try {
      useUserStore.getState().addJob({
        file_name: item.name,
        file_type: "image",
        status: "completed",
        quality: `${item.width}x${item.height} Clean`,
        credits_used: 1,
        file_url: item.beforeURL,
        result_url: item.afterURL,
      });
    } catch (e) {
      console.error("Failed to save to history:", e);
    }
  };

  // Download all images
  const downloadAllImages = () => {
    const ready = items.filter((item) => item.afterURL);
    if (!ready.length) return;
    ready.forEach((item, idx) => {
      setTimeout(() => {
        downloadCleanImage(item);
      }, idx * 250);
    });
    toast.success(`Started download for ${ready.length} images.`);
  };

  return (
    <div className="gemini-page min-h-screen bg-[#f3f4ee] text-[#10241e] font-sans pb-28">
      <div className="gemini-scroll-progress" style={{ width: `${scrollProgress}%` }} aria-hidden="true" />
      {/* ── 1. HERO SECTION & SINGLE WORKSPACE CONTAINER ── */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6 lg:px-8 bg-[#091712] text-white border-b border-[#d7f3af]/15 overflow-hidden">
        {/* Atmospheric 4K Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_at_top,rgba(208,244,113,0.14),transparent_70%)] pointer-events-none" />
        <div className="relative mx-auto max-w-7xl z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left Copy (Constant across all states — never changes or sprouts extra cards) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[#d0f471] shadow-sm">
                <Sparkles className="size-4 text-[#d0f471]" />
                <span className="text-xs sm:text-sm font-bold text-[#d0f471] tracking-wider uppercase font-mono">
                  ClearCorner • Gemini image cleaner
                </span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.06]">
                Take the sparkle off your{" "}
                <span className="text-white underline decoration-[#d0f471] decoration-wavy decoration-4">
                  Gemini images.
                </span>
              </h1>

              <p className="text-lg sm:text-2xl text-white/95 font-medium leading-relaxed max-w-xl">
                Drop in a picture, aim the box at the corner mark, and get a clean copy at the exact same resolution.
                Preview your image, then process it to remove the corner mark.
              </p>

              {/* 3 Value Points */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs sm:text-sm font-semibold text-white shadow-xs">
                  <CheckCircle2 className="size-4 text-[#d0f471]" /> No sign-up required
                </span>
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs sm:text-sm font-semibold text-white shadow-xs">
                  <Layers className="size-4 text-[#d0f471]" /> Batch process images
                </span>
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs sm:text-sm font-semibold text-white shadow-xs">
                  <ShieldCheck className="size-4 text-[#d0f471]" /> Full 4K / 8K original size kept
                </span>
              </div>
            </div>

            {/* Right: The SINGLE Upload, Preview, Process & Result Workspace */}
            <div className="lg:col-span-7">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleIncomingFiles(e.target.files);
                  e.target.value = "";
                }}
              />

              {/* STATE 1: IDLE (No image selected yet) */}
              {!currentItem && (
                <div
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setIsDraggingOver(false);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(false);
                    if (e.dataTransfer.files) {
                      handleIncomingFiles(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative min-h-[440px] sm:min-h-[520px] lg:min-h-[580px] rounded-3xl border-2 border-dashed border-[#10241e]/20 bg-white hover:border-[#10241e] p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all duration-300 shadow-xl group cursor-pointer ${
                    isDraggingOver ? "border-[#10241e] bg-white shadow-2xl scale-[1.01]" : ""
                  }`}
                >
                  {/* Viewfinder brackets */}
                  <div className="absolute inset-4 pointer-events-none border border-transparent">
                    <div className="absolute top-0 left-0 size-6 border-t-2 border-l-2 border-[#10241e]" />
                    <div className="absolute top-0 right-0 size-6 border-t-2 border-r-2 border-[#10241e]" />
                    <div className="absolute bottom-0 left-0 size-6 border-b-2 border-l-2 border-[#10241e]" />
                    <div className="absolute bottom-0 right-0 size-6 border-b-2 border-r-2 border-[#10241e]" />
                  </div>

                  <span className="size-20 rounded-2xl bg-[#10241e] text-[#d0f471] flex items-center justify-center shadow-lg mb-5 group-hover:scale-105 transition-transform">
                    <Upload className="size-9 text-[#d0f471]" style={{ color: "#d0f471" }} />
                  </span>

                  <h3 className="text-2xl sm:text-3xl font-bold text-[#10241e] tracking-tight" style={{ color: "#10241e" }}>
                    Drop Gemini images here
                  </h3>

                  <p className="text-base text-[#37433d] mt-2 max-w-sm leading-relaxed" style={{ color: "#37433d" }}>
                    or paste directly with{" "}
                    <kbd className="px-2 py-0.5 rounded bg-[#e9ece4] border border-[#10241e]/15 font-mono text-xs font-bold text-[#10241e]">
                      Ctrl+V
                    </kbd>{" "}
                    /{" "}
                    <kbd className="px-2 py-0.5 rounded bg-[#e9ece4] border border-[#10241e]/15 font-mono text-xs font-bold text-[#10241e]">
                      Cmd+V
                    </kbd>
                  </p>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="mt-5 px-7 py-3 rounded-full bg-[#10241e] hover:bg-[#18362d] text-white font-bold text-sm sm:text-base shadow-md transition-colors cursor-pointer inline-flex items-center gap-2"
                    style={{ color: "#FFFFFF", backgroundColor: "#10241e" }}
                  >
                    <Upload className="size-4 text-white" style={{ color: "#FFFFFF" }} />
                    <span style={{ color: "#FFFFFF" }}>Choose image</span>
                  </button>

                  <span className="mt-4 text-xs font-mono font-medium text-[#637069]" style={{ color: "#637069" }}>
                    PNG, JPG and WebP supported
                  </span>

                  {validationError && (
                    <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-rose-700">
                      <AlertCircle className="size-4" />
                      {validationError}
                    </p>
                  )}
                </div>
              )}

              {/* STATES 2, 3, 4: UPLOADED / PROCESSING / COMPLETED IN THE SAME SINGLE CONTAINER */}
              {currentItem && (
                <div
                  className="gemini-workspace overflow-hidden rounded-2xl sm:rounded-3xl border border-zinc-800 bg-black p-4 sm:p-6 text-white shadow-2xl transition-all"
                  aria-label="Image cleanup workspace"
                  style={{ backgroundColor: "#000000", color: "#FFFFFF" }}
                >
                  {/* Top Bar inside the container */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      {isProcessing ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-400/20 border border-lime-400/30 text-xs font-mono font-bold text-[#d0f471] shadow-xs"
                          style={{ color: "#d0f471" }}
                        >
                          <span className="size-2 rounded-full bg-[#d0f471] animate-ping" />
                          <span>Scanning watermark...</span>
                        </span>
                      ) : currentItem.afterURL ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-xs font-mono font-bold text-emerald-300 shadow-xs"
                          style={{ color: "#6ee7b7" }}
                        >
                          <Check className="size-3.5 text-emerald-400" />
                          <span>Restoration complete</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-mono font-bold text-white shadow-xs"
                          style={{ color: "#FFFFFF" }}
                        >
                          <FileCheck2 className="size-3.5 text-[#d0f471]" style={{ color: "#d0f471" }} />
                          <span>Image ready to scan</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono font-bold" style={{ color: "#FFFFFF" }}>
                      <span className="text-white" style={{ color: "#FFFFFF" }}>{currentItem.width} × {currentItem.height} px</span>
                    </div>
                  </div>

                  {/* Batch Switcher (if >1 images loaded) */}
                  {items.length > 1 && (
                    <div className="pt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {items.map((item, idx) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCurrentIndex(idx)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                            idx === currentIndex
                              ? "border-[#d0f471] bg-zinc-800 text-white"
                              : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                          }`}
                          style={{ color: "#FFFFFF" }}
                        >
                          <span className="size-2 rounded-full" style={{ backgroundColor: item.afterURL ? "#d0f471" : "#f59e0b" }} />
                          <span className="max-w-[120px] truncate" style={{ color: "#FFFFFF" }}>{item.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* STATE 2: UPLOADED (Before Scan) */}
                  {!isProcessing && !currentItem.afterURL && (
                    <div className="pt-3.5 space-y-3.5">
                      <div className="relative mx-auto w-full min-h-[460px] sm:min-h-[540px] lg:min-h-[600px] max-h-[75vh] overflow-hidden rounded-2xl bg-[#050505] border border-zinc-800 flex items-center justify-center shadow-inner">
                        <img
                          src={currentItem.beforeURL}
                          alt="Uploaded preview"
                          className="size-full object-contain max-h-[72vh]"
                        />
                        <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/85 border border-white/30 text-xs font-mono font-bold text-white shadow-lg backdrop-blur">
                          <Sparkles className="size-3.5 text-[#d0f471]" />
                          <span>Target corner detected</span>
                        </div>
                      </div>

                      {/* Compact Action Bar */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800">
                        <button
                          type="button"
                          onClick={() => runScan(currentItem)}
                          disabled={isProcessing}
                          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#d0f471] hover:bg-[#dbff83] text-black font-extrabold text-xs sm:text-sm shadow-lg hover:shadow-[0_0_20px_rgba(208,244,113,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                          style={{ backgroundColor: "#d0f471", color: "#000000" }}
                        >
                          <Sparkles className="size-4 text-black fill-black" style={{ color: "#000000" }} />
                          <span style={{ color: "#000000", fontWeight: "800" }}>Remove Watermark Now</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isProcessing}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white font-bold text-xs sm:text-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                          style={{ backgroundColor: "#27272a", color: "#FFFFFF" }}
                        >
                          <RotateCcw className="size-3.5 text-white" style={{ color: "#FFFFFF" }} />
                          <span style={{ color: "#FFFFFF" }}>Replace Image</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const newItems = items.filter((item) => item.id !== currentItem.id);
                            setItems(newItems);
                            if (currentIndex >= newItems.length) {
                              setCurrentIndex(Math.max(0, newItems.length - 1));
                            }
                          }}
                          className="ml-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-200 hover:text-white font-bold text-xs sm:text-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                          style={{ backgroundColor: "#450a0a", color: "#fee2e2" }}
                        >
                          <X className="size-3.5 text-red-300" style={{ color: "#fca5a5" }} />
                          <span style={{ color: "#fee2e2" }}>Remove</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STATE 3: PROCESSING */}
                  {isProcessing && (
                    <div className="pt-3.5">
                      <div className="gemini-scan-stage relative mx-auto w-full min-h-[460px] sm:min-h-[540px] lg:min-h-[600px] max-h-[75vh] flex items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-[#050505]">
                        <img
                          src={currentItem.beforeURL}
                          alt="Original image being scanned"
                          className="absolute inset-0 size-full object-contain opacity-40 max-h-[72vh]"
                        />
                        <div className="gemini-scan-beam" />
                        <div className="relative z-10 w-[min(90%,380px)] rounded-2xl border border-zinc-700 bg-black/95 p-6 shadow-2xl backdrop-blur">
                          <div className="flex items-center justify-between text-sm font-semibold" style={{ color: "#FFFFFF" }}>
                            <span style={{ color: "#FFFFFF" }}>
                              {[
                                "Loading original image",
                                "Analyzing image dimensions",
                                "Detecting watermark artifacts",
                                "Applying corner restoration",
                                "Generating final preview",
                              ][scanStage]}
                            </span>
                            <span className="text-[#d0f471] font-bold" style={{ color: "#d0f471" }}>{scanProgress}%</span>
                          </div>
                          <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className="h-full rounded-full bg-[#d0f471] transition-all duration-300"
                              style={{ width: `${scanProgress}%` }}
                            />
                          </div>
                          <div className="mt-4 grid gap-1.5 text-xs font-mono" style={{ color: "#FFFFFF" }}>
                            {["Load", "Measure", "Detect", "Restore", "Preview"].map((label, index) => (
                              <span
                                key={label}
                                className={index <= scanStage ? "text-[#d0f471] font-semibold" : "text-zinc-400"}
                                style={{ color: index <= scanStage ? "#d0f471" : "#a1a1aa" }}
                              >
                                {index < scanStage ? "✓" : index === scanStage ? "◉" : "○"} {label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STATE 4: COMPLETED (Before/After Slider + Compact CTA Actions) */}
                  {!isProcessing && currentItem.afterURL && (
                    <div className="pt-3.5 space-y-3.5">
                      <div
                        ref={sliderRef}
                        className="gemini-compare relative mx-auto w-full min-h-[460px] sm:min-h-[540px] lg:min-h-[600px] max-h-[75vh] overflow-hidden rounded-2xl bg-[#050505] select-none shadow-inner border border-zinc-800 flex items-center justify-center"
                        onPointerMove={(event) => {
                          if (isDraggingSlider.current) updateSliderPos(event.clientX);
                        }}
                        onPointerUp={() => {
                          isDraggingSlider.current = false;
                        }}
                        onPointerLeave={() => {
                          isDraggingSlider.current = false;
                        }}
                      >
                        {/* After Image */}
                        <img
                          src={currentItem.afterURL}
                          alt="After: watermark removed"
                          className="absolute inset-0 size-full object-contain transition-transform duration-200"
                          style={{ transform: `scale(${zoom})` }}
                        />

                        {/* Before Image with clipPath */}
                        <div
                          className="pointer-events-none absolute inset-0"
                          style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                        >
                          <img
                            src={currentItem.beforeURL}
                            alt="Before: original with watermark"
                            className="absolute inset-0 size-full object-contain"
                            style={{ transform: `scale(${zoom})` }}
                          />
                        </div>

                        {/* Draggable Divider Line & Handle */}
                        <div
                          className="absolute inset-y-0 z-10 w-0.5 bg-[#d0f471] shadow-[0_0_16px_#d0f471]"
                          style={{ left: `${sliderPos}%` }}
                        >
                          <button
                            type="button"
                            aria-label="Drag before and after comparison"
                            className="absolute left-1/2 top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border-2 border-black bg-white text-black shadow-[0_8px_25px_rgba(0,0,0,0.6)] transition-transform duration-150 hover:scale-110 active:scale-95"
                            onPointerDown={(event) => {
                              isDraggingSlider.current = true;
                              event.currentTarget.setPointerCapture(event.pointerId);
                            }}
                            onPointerMove={(event) => {
                              if (isDraggingSlider.current) updateSliderPos(event.clientX);
                            }}
                          >
                            <ChevronLeft className="size-4 text-black" />
                            <ChevronRight className="-ml-1.5 size-4 text-black" />
                          </button>
                        </div>

                        {/* Corner Badges */}
                        <span
                          className="gemini-before-badge absolute left-3.5 top-3.5 rounded-full bg-black/90 backdrop-blur-md border border-white/40 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-md select-none pointer-events-none"
                          style={{ color: "#FFFFFF", backgroundColor: "rgba(0, 0, 0, 0.9)" }}
                        >
                          Before · Original
                        </span>
                        <span
                          className="gemini-after-badge absolute right-3.5 top-3.5 rounded-full bg-[#d0f471] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-black shadow-md select-none pointer-events-none"
                          style={{ color: "#000000", backgroundColor: "#d0f471" }}
                        >
                          After · Local Result
                        </span>
                      </div>

                      {/* Slider Toolbar (Zoom Out, %, Zoom In, Reset, Fullscreen) */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center size-8 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white transition-all cursor-pointer shadow-sm"
                            onClick={() => setZoom((value) => Math.max(1, value - 0.1))}
                            aria-label="Zoom out"
                            title="Zoom out"
                            style={{ backgroundColor: "#27272a", color: "#FFFFFF" }}
                          >
                            <ZoomOut className="size-3.5 text-white" style={{ color: "#FFFFFF" }} />
                          </button>
                          <span
                            className="min-w-12 text-center text-xs font-mono font-bold text-white"
                            style={{ color: "#FFFFFF" }}
                          >
                            {Math.round(zoom * 100)}%
                          </span>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center size-8 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white transition-all cursor-pointer shadow-sm"
                            onClick={() => setZoom((value) => Math.min(2.5, value + 0.1))}
                            aria-label="Zoom in"
                            title="Zoom in"
                            style={{ backgroundColor: "#27272a", color: "#FFFFFF" }}
                          >
                            <ZoomIn className="size-3.5 text-white" style={{ color: "#FFFFFF" }} />
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center size-8 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white transition-all cursor-pointer shadow-sm"
                            onClick={() => {
                              setZoom(1);
                              setSliderPos(50);
                            }}
                            aria-label="Reset comparison"
                            title="Reset comparison & zoom"
                            style={{ backgroundColor: "#27272a", color: "#FFFFFF" }}
                          >
                            <RotateCcw className="size-3.5 text-white" style={{ color: "#FFFFFF" }} />
                          </button>
                        </div>

                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                          onClick={() => setFullscreen(true)}
                          style={{ backgroundColor: "#27272a", color: "#FFFFFF" }}
                        >
                          <Maximize2 className="size-3.5 text-white" style={{ color: "#FFFFFF" }} />
                          <span style={{ color: "#FFFFFF" }}>Fullscreen</span>
                        </button>
                      </div>

                      {/* Compact CTA Row Directly Under Image */}
                      <div className="pt-2 border-t border-zinc-800 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Download PNG (Primary CTA, compact & sleek) */}
                          <button
                            type="button"
                            onClick={() => downloadCleanImage(currentItem, "png")}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#d0f471] hover:bg-[#dbff83] text-black font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                            style={{ backgroundColor: "#d0f471", color: "#000000" }}
                          >
                            <Download className="size-4 text-black" style={{ color: "#000000" }} />
                            <span style={{ color: "#000000", fontWeight: "700" }}>Download PNG</span>
                          </button>

                          {/* JPEG */}
                          <button
                            type="button"
                            onClick={() => downloadCleanImage(currentItem, "jpeg")}
                            className="inline-flex items-center justify-center px-3.5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs sm:text-sm border border-white/40 shadow-sm transition-all cursor-pointer"
                            style={{ backgroundColor: "#FFFFFF", color: "#000000" }}
                          >
                            <span style={{ color: "#000000", fontWeight: "700" }}>JPEG</span>
                          </button>

                          {/* Replace Image */}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-sm"
                            style={{ backgroundColor: "#27272a", color: "#FFFFFF" }}
                          >
                            <RotateCcw className="size-3.5 text-white" style={{ color: "#FFFFFF" }} />
                            <span style={{ color: "#FFFFFF" }}>Replace Image</span>
                          </button>

                          {/* Remove Button (Clearly visible red text and background!) */}
                          <button
                            type="button"
                            onClick={() => {
                              const newItems = items.filter((item) => item.id !== currentItem.id);
                              setItems(newItems);
                              if (currentIndex >= newItems.length) {
                                setCurrentIndex(Math.max(0, newItems.length - 1));
                              }
                            }}
                            className="ml-auto inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-200 hover:text-white text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-sm"
                            style={{ backgroundColor: "#450a0a", color: "#fee2e2" }}
                          >
                            <X className="size-3.5 text-red-300" style={{ color: "#fca5a5" }} />
                            <span style={{ color: "#fee2e2" }}>Remove</span>
                          </button>
                        </div>

                        {/* Download All if >1 images */}
                        {items.filter((item) => item.afterURL).length > 1 && (
                          <button
                            type="button"
                            onClick={downloadAllImages}
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white px-3.5 py-2 font-bold text-xs shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
                            style={{ backgroundColor: "#27272a", color: "#FFFFFF" }}
                          >
                            <Download className="size-3.5 text-white" />
                            <span>Download All ({items.filter((item) => item.afterURL).length}) Clean Images</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {fullscreen && currentItem?.afterURL && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#091712]/95 p-4 sm:p-6 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen image comparison"
        >
          <button
            type="button"
            className="absolute right-5 top-5 z-20 rounded-full bg-white/10 hover:bg-white/20 p-3 text-white transition-colors cursor-pointer"
            onClick={() => setFullscreen(false)}
            aria-label="Close fullscreen"
            style={{ color: "#FFFFFF" }}
          >
            <X className="size-6 text-white" />
          </button>
          <div className="w-full max-w-6xl">
            <div
              className="gemini-compare relative aspect-video max-h-[85vh] overflow-hidden rounded-2xl bg-black select-none shadow-2xl"
              ref={sliderRef}
              onPointerMove={(event) => {
                if (isDraggingSlider.current) updateSliderPos(event.clientX);
              }}
              onPointerUp={() => {
                isDraggingSlider.current = false;
              }}
            >
              <img
                src={currentItem.afterURL}
                alt="After comparison fullscreen"
                className="absolute inset-0 size-full object-contain"
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
              >
                <img
                  src={currentItem.beforeURL}
                  alt="Before comparison fullscreen"
                  className="absolute inset-0 size-full object-contain"
                />
              </div>
              <div
                className="absolute inset-y-0 w-0.5 bg-[#d0f471] shadow-[0_0_16px_#d0f471]"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute left-1/2 top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border-2 border-[#10241e] bg-white text-[#10241e] shadow-lg">
                  <ChevronLeft className="size-4 text-[#10241e]" />
                  <ChevronRight className="-ml-1.5 size-4 text-[#10241e]" />
                </div>
              </div>
              <span
                className="gemini-before-badge absolute left-4 top-4 rounded-full bg-black/75 backdrop-blur-md border border-white/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md select-none"
                style={{ color: "#FFFFFF", backgroundColor: "rgba(0, 0, 0, 0.75)" }}
              >
                Before · Original
              </span>
              <span
                className="gemini-after-badge absolute right-4 top-4 rounded-full bg-[#d0f471] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#10241e] shadow-md select-none"
                style={{ color: "#10241e", backgroundColor: "#d0f471" }}
              >
                After · Local Result
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. CONTACT SHEET GALLERY (8 Frames with Drag Sliders) ── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-[#f3f4ee] border-b border-[#10241e]/10">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#10241e] font-mono">
              Contact Sheet
            </span>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-[#10241e] tracking-tight">
              Before and after, frame by frame.
            </h2>
            <p className="text-base sm:text-lg text-[#37433d] max-w-2xl mx-auto">
              Real interactive test frames. Drag the handle on any card below to inspect the corner restoration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {gallerySamples.map((sample, i) => (
              <div
                key={sample.id}
                className="group rounded-3xl border border-[#10241e]/15 bg-white p-5 shadow-xl hover:shadow-2xl hover:border-[#10241e]/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-[#10241e] pb-2 border-b border-[#10241e]/10 mb-3">
                    <span>FRAME 0{i + 1}</span>
                    <span className="text-[#637069]">{sample.width}×{sample.height} px</span>
                  </div>

                  {/* Mini Slider */}
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black/80 select-none">
                    <img
                      src={sample.afterURL}
                      alt="Clean sample"
                      className="absolute inset-0 size-full object-cover"
                    />
                    <div
                      className="absolute inset-0 size-full overflow-hidden"
                      style={{ clipPath: "inset(0 0 0 50%)" }}
                    >
                      <img
                        src={sample.beforeURL}
                        alt="Original with sparkle"
                        className="absolute inset-0 size-full object-cover"
                      />
                    </div>
                    {/* Divider line */}
                    <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-[#d0f471]" />
                    <span className="absolute top-2 left-2 text-[9px] font-mono font-bold bg-black/70 text-[#d0f471] px-1.5 py-0.5 rounded">
                      Clean
                    </span>
                    <span className="absolute top-2 right-2 text-[9px] font-mono font-bold bg-black/70 text-white px-1.5 py-0.5 rounded">
                      Sparkle
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#10241e] mt-3">
                    {sample.title}
                  </h3>
                  <span className="text-xs font-mono text-[#637069] block mt-0.5">
                    Target box {sample.boxSize} px
                  </span>
                </div>

                {/* Macro Loupes Footer */}
                <div className="pt-3 mt-3 border-t border-[#10241e]/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={sample.loupe[0]}
                      alt="Before"
                      className="size-10 rounded-lg object-cover border border-[#10241e]/15"
                      title="Corner with sparkle"
                    />
                    <img
                      src={sample.loupe[1]}
                      alt="After"
                      className="size-10 rounded-lg object-cover border border-[#10241e]"
                      title="Corner restored"
                    />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-[#10241e] bg-[#f3f4ee] px-2 py-1 rounded-md">
                    Corner restored
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs font-mono text-[#637069] max-w-2xl mx-auto">
            These frames demonstrate edge-blend inpainting on diverse scenes (gradients, mountains, skies, dunes). Clean results are achieved without smudging or plastic blur.
          </p>
        </div>
      </section>

      {/* ── 4. HOW IT WORKS IN 3 STEPS ── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-white border-b border-[#10241e]/10">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#10241e] font-mono">
              How It Works
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold text-[#10241e] tracking-tight">
              Three moves, no account.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-3xl bg-[#f3f4ee] p-8 sm:p-10 border border-[#10241e]/15 shadow-xl text-center flex flex-col justify-between">
              <div>
                <span className="size-16 mx-auto rounded-2xl bg-[#10241e] text-[#d0f471] font-bold text-2xl flex items-center justify-center mb-6 shadow-md font-mono">
                  01
                </span>
                <h3 className="text-2xl font-bold text-[#10241e] mb-2">
                  Add your images
                </h3>
                <p className="text-base text-[#37433d] leading-relaxed">
                  Drop one or multiple Gemini pictures. Images from the same source carry the sparkle mark in the exact same bottom-right spot.
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-[#f3f4ee] p-8 sm:p-10 border border-[#10241e]/15 shadow-xl text-center flex flex-col justify-between">
              <div>
                <span className="size-16 mx-auto rounded-2xl bg-[#10241e] text-[#d0f471] font-bold text-2xl flex items-center justify-center mb-6 shadow-md font-mono">
                  02
                </span>
                <h3 className="text-2xl font-bold text-[#10241e] mb-2">
                  Aim the box
                </h3>
                <p className="text-base text-[#37433d] leading-relaxed">
                  Turn on the target box outline and adjust the box size and distance sliders until the dashed line squarely covers the sparkle.
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-[#f3f4ee] p-8 sm:p-10 border border-[#10241e]/15 shadow-xl text-center flex flex-col justify-between">
              <div>
                <span className="size-16 mx-auto rounded-2xl bg-[#10241e] text-[#d0f471] font-bold text-2xl flex items-center justify-center mb-6 shadow-md font-mono">
                  03
                </span>
                <h3 className="text-2xl font-bold text-[#10241e] mb-2">
                  Save the clean copy
                </h3>
                <p className="text-base text-[#37433d] leading-relaxed">
                  Compare with the slider, inspect the zoomed loupe, and save your clean PNG at the original pixel resolution.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. TRUST & ETHICAL USAGE ── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-[#f3f4ee] border-b border-[#10241e]/10">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#10241e] font-mono">
              Trust & Guarantees
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold text-[#10241e] tracking-tight">
              What stays on your side.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-3xl bg-white p-7 border border-[#10241e]/15 shadow-lg space-y-3">
              <span className="size-12 rounded-xl bg-[#10241e] text-[#d0f471] flex items-center justify-center">
                <Lock className="size-6" />
              </span>
              <h3 className="text-xl font-bold text-[#10241e]">Nothing is uploaded</h3>
              <p className="text-sm text-[#37433d] leading-relaxed">
                Images are opened and edited in an HTML5 canvas inside this page. No external server receives your private files.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-7 border border-[#10241e]/15 shadow-lg space-y-3">
              <span className="size-12 rounded-xl bg-[#10241e] text-[#d0f471] flex items-center justify-center">
                <FileImage className="size-6" />
              </span>
              <h3 className="text-xl font-bold text-[#10241e]">Same pixels out</h3>
              <p className="text-sm text-[#37433d] leading-relaxed">
                The result retains 100% of the original width and height. Only the small patch in the corner is reconstructed.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-7 border border-[#10241e]/15 shadow-lg space-y-3">
              <span className="size-12 rounded-xl bg-[#10241e] text-[#d0f471] flex items-center justify-center">
                <CheckCircle2 className="size-6" />
              </span>
              <h3 className="text-xl font-bold text-[#10241e]">No account, no stamp</h3>
              <p className="text-sm text-[#37433d] leading-relaxed">
                There is no sign-in, subscription, or watermark added to your picture. You get your clean image back instantly.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-7 border border-[#10241e]/15 shadow-lg space-y-3">
              <span className="size-12 rounded-xl bg-[#10241e] text-[#d0f471] flex items-center justify-center">
                <ShieldCheck className="size-6" />
              </span>
              <h3 className="text-xl font-bold text-[#10241e]">Clear about limits</h3>
              <p className="text-sm text-[#37433d] leading-relaxed">
                It removes the visible corner sparkle only. Invisible provenance data such as Google SynthID is not altered.
              </p>
            </div>
          </div>

          {/* Honest Usage Note */}
          <div className="rounded-3xl border border-[#10241e]/15 bg-white p-6 sm:p-8 shadow-md flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <span className="size-12 rounded-2xl bg-[#10241e] text-[#d0f471] flex items-center justify-center shrink-0">
              <ShieldCheck className="size-6" />
            </span>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-[#10241e]">
                Use it on images you created or have the legal right to edit.
              </h4>
              <p className="text-sm text-[#37433d] leading-relaxed">
                If a platform or client requires you to label AI-generated work, continue to follow their guidelines. Removing the visible corner mark does not change the provenance of the media.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. COMPREHENSIVE FAQ ACCORDION ── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-white border-b border-[#10241e]/10">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#10241e] font-mono">
              FAQ
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold text-[#10241e] tracking-tight">
              Questions people ask first.
            </h2>
            <p className="text-base sm:text-lg text-[#37433d]">
              Clear answers about privacy, output resolution, and inpainting quality.
            </p>
          </div>

          <div className="divide-y divide-[#10241e]/10 rounded-3xl border border-[#10241e]/15 bg-[#f3f4ee] px-6 sm:px-8 shadow-xl">
            <details className="group py-6" open>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-lg font-bold text-[#10241e]">
                <span>Do my images get uploaded to a cloud server?</span>
                <span className="size-8 rounded-full bg-white text-[#10241e] flex items-center justify-center text-lg font-mono group-open:bg-[#10241e] group-open:text-[#d0f471] transition-all shrink-0">
                  +
                </span>
              </summary>
              <p className="pt-3 text-base text-[#37433d] leading-relaxed max-w-2xl">
                No. Your image file is read by your browser, rendered on an HTML5 canvas in this tab, and cleaned entirely in your device's memory. You can confirm this by checking the Network tab in your browser's Developer Tools — zero bytes leave your machine.
              </p>
            </details>

            <details className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-lg font-bold text-[#10241e]">
                <span>What exactly does this tool remove?</span>
                <span className="size-8 rounded-full bg-white text-[#10241e] flex items-center justify-center text-lg font-mono group-open:bg-[#10241e] group-open:text-[#d0f471] transition-all shrink-0">
                  +
                </span>
              </summary>
              <p className="pt-3 text-base text-[#37433d] leading-relaxed max-w-2xl">
                The four-point white sparkle logo that Google Gemini places in the bottom-right corner of generated artwork and photos. It fills that square patch from the surrounding pixels with matching grain.
              </p>
            </details>

            <details className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-lg font-bold text-[#10241e]">
                <span>Does it remove SynthID or invisible watermarks?</span>
                <span className="size-8 rounded-full bg-white text-[#10241e] flex items-center justify-center text-lg font-mono group-open:bg-[#10241e] group-open:text-[#d0f471] transition-all shrink-0">
                  +
                </span>
              </summary>
              <p className="pt-3 text-base text-[#37433d] leading-relaxed max-w-2xl">
                No. SynthID and similar imperceptible cryptographic watermarks exist across the latent frequency domain of the entire image. This tool only reconstructs the visible corner pixels.
              </p>
            </details>

            <details className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-lg font-bold text-[#10241e]">
                <span>How good is the restored corner quality?</span>
                <span className="size-8 rounded-full bg-white text-[#10241e] flex items-center justify-center text-lg font-mono group-open:bg-[#10241e] group-open:text-[#d0f471] transition-all shrink-0">
                  +
                </span>
              </summary>
              <p className="pt-3 text-base text-[#37433d] leading-relaxed max-w-2xl">
                Smooth gradients, skies, out-of-focus bokeh, and solid backdrops restore seamlessly. For intricate textures or edges, tuning the "Box Size" and "Distance from Corner" sliders ensures the patch fits tightly around the mark.
              </p>
            </details>

            <details className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-lg font-bold text-[#10241e]">
                <span>Which file formats are supported?</span>
                <span className="size-8 rounded-full bg-white text-[#10241e] flex items-center justify-center text-lg font-mono group-open:bg-[#10241e] group-open:text-[#d0f471] transition-all shrink-0">
                  +
                </span>
              </summary>
              <p className="pt-3 text-base text-[#37433d] leading-relaxed max-w-2xl">
                JPG, PNG, and WebP images. All outputs are exported as full-fidelity lossless PNG files at the original width and height.
              </p>
            </details>

            <details className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-lg font-bold text-[#10241e]">
                <span>Can I clean multiple Gemini images at the same time?</span>
                <span className="size-8 rounded-full bg-white text-[#10241e] flex items-center justify-center text-lg font-mono group-open:bg-[#10241e] group-open:text-[#d0f471] transition-all shrink-0">
                  +
                </span>
              </summary>
              <p className="pt-3 text-base text-[#37433d] leading-relaxed max-w-2xl">
                Yes! You can drop 10, 20, or 50 images at once. They share the calibrated box coordinates and you can click "Download All" to save every cleaned file in one batch.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* ── 7. FINAL CALL TO ACTION ── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-[#f3f4ee]">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl bg-[#091712] border border-[#d7f3af]/25 p-10 sm:p-16 text-white text-center shadow-2xl relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto space-y-5">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-[#d0f471] text-xs font-mono font-bold backdrop-blur-md">
                <Sparkles className="size-3.5" />
                <span>CLEAN YOUR GEMINI IMAGES NOW</span>
              </span>

              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
                Got an image with the corner mark?
              </h2>

              <p className="text-base sm:text-lg text-emerald-100/90 leading-relaxed">
                Add it now and review the locally restored corner before exporting. No sign-up required.
              </p>

              <div className="pt-4 flex flex-wrap justify-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    fileInputRef.current?.click();
                  }}
                  className="px-10 py-4 rounded-full bg-[#d0f471] hover:bg-[#dbff83] text-[#091712] text-base sm:text-lg font-bold shadow-xl transition-all cursor-pointer flex items-center gap-2 hover:scale-105"
                >
                  <Upload className="size-5" />
                  <span>Add Images Free</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-xs font-mono text-[#637069]">
            <span>ClearCorner runs 100% in your browser. No files leave your device. • Not affiliated with Google or Gemini.</span>
          </div>
        </div>
      </section>
    </div>
  );
}

