"use client";

import { useUserStore } from "@/lib/userStore";

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
} from "lucide-react";
import { toast } from "sonner";

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
 * High-fidelity edge-blend inpainting with Laplace/Poisson relaxation
 * and sensor grain matching. Leaves no plastic blur.
 */
function inpaintCanvas(g: CanvasRenderingContext2D, W: number, H: number, R: CornerRect): void {
  const rx = R.x,
    ry = R.y,
    rw = R.w,
    rh = R.h;
  const ex = Math.max(0, rx - 1),
    ey = Math.max(0, ry - 1);
  const ex2 = Math.min(W, rx + rw + 1),
    ey2 = Math.min(H, ry + rh + 1);
  const ew = ex2 - ex,
    eh = ey2 - ey;
  const ix = rx - ex,
    iy = ry - ey;

  const id = g.getImageData(ex, ey, ew, eh);
  const d = id.data;
  const mean = [0, 0, 0];
  let cnt = 0;

  for (let y = 0; y < eh; y++) {
    for (let x = 0; x < ew; x++) {
      if (x >= ix && x < ix + rw && y >= iy && y < iy + rh) continue;
      const p = (y * ew + x) * 4;
      mean[0] += d[p];
      mean[1] += d[p + 1];
      mean[2] += d[p + 2];
      cnt++;
    }
  }
  if (!cnt) return;
  mean[0] /= cnt;
  mean[1] /= cnt;
  mean[2] /= cnt;

  const hasL = ix >= 1,
    hasR = ix + rw < ew,
    hasT = iy >= 1,
    hasB = iy + rh < eh;

  function px(X: number, Y: number, ch: number) {
    return d[(Y * ew + X) * 4 + ch];
  }
  function L(t: number, ch: number) {
    return hasL ? px(ix - 1, iy + t, ch) : hasR ? px(ix + rw, iy + t, ch) : mean[ch];
  }
  function Rr(t: number, ch: number) {
    return hasR ? px(ix + rw, iy + t, ch) : hasL ? px(ix - 1, iy + t, ch) : mean[ch];
  }
  function T(u: number, ch: number) {
    return hasT ? px(ix + u, iy - 1, ch) : hasB ? px(ix + u, iy + rh, ch) : mean[ch];
  }
  function B(u: number, ch: number) {
    return hasB ? px(ix + u, iy + rh, ch) : hasT ? px(ix + u, iy - 1, ch) : mean[ch];
  }

  const v = new Float32Array(rw * rh * 3);
  const du = Math.max(1, rw - 1),
    dt = Math.max(1, rh - 1);

  for (let c = 0; c < 3; c++) {
    const TL = (T(0, c) + L(0, c)) / 2;
    const TR = (T(rw - 1, c) + Rr(0, c)) / 2;
    const BL = (B(0, c) + L(rh - 1, c)) / 2;
    const BR = (B(rw - 1, c) + Rr(rh - 1, c)) / 2;

    for (let y = 0; y < rh; y++) {
      for (let x = 0; x < rw; x++) {
        const u = x / du,
          t = y / dt;
        v[(y * rw + x) * 3 + c] =
          (1 - u) * L(y, c) +
          u * Rr(y, c) +
          (1 - t) * T(x, c) +
          t * B(x, c) -
          ((1 - u) * (1 - t) * TL +
            u * (1 - t) * TR +
            (1 - u) * t * BL +
            u * t * BR);
      }
    }
  }

  let a0 = 0,
    a1 = 0,
    a2 = 0,
    k = 0;
  function nb(nx: number, ny: number) {
    let j: number, X: number, Y: number;
    if (nx >= 0 && nx < rw && ny >= 0 && ny < rh) {
      j = (ny * rw + nx) * 3;
      a0 += v[j];
      a1 += v[j + 1];
      a2 += v[j + 2];
      k++;
    } else {
      X = ix + nx;
      Y = iy + ny;
      if (X >= 0 && X < ew && Y >= 0 && Y < eh) {
        j = (Y * ew + X) * 4;
        a0 += d[j];
        a1 += d[j + 1];
        a2 += d[j + 2];
        k++;
      }
    }
  }

  const iters = Math.min(60, Math.max(16, Math.round((rw + rh) / 6)));
  for (let it = 0; it < iters; it++) {
    for (let y = 0; y < rh; y++) {
      for (let x = 0; x < rw; x++) {
        a0 = a1 = a2 = 0;
        k = 0;
        nb(x - 1, y);
        nb(x + 1, y);
        nb(x, y - 1);
        nb(x, y + 1);
        if (k) {
          const i = (y * rw + x) * 3;
          v[i] = a0 / k;
          v[i + 1] = a1 / k;
          v[i + 2] = a2 / k;
        }
      }
    }
  }

  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const i2 = (y * rw + x) * 3;
      const q = ((iy + y) * ew + (ix + x)) * 4;
      const n = (Math.random() - 0.5) * 4; // Faint sensor grain
      d[q] = Math.max(0, Math.min(255, v[i2] + n));
      d[q + 1] = Math.max(0, Math.min(255, v[i2 + 1] + n));
      d[q + 2] = Math.max(0, Math.min(255, v[i2 + 2] + n));
    }
  }

  g.putImageData(id, ex, ey);
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDraggingSlider = useRef<boolean>(false);

  const currentItem = items[currentIndex] || null;

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

      // Inpaint corner
      let blob: Blob | null = null;
      {
        try {
          const rawBlob = await new Promise<Blob | null>((res) =>
            item.canvas.toBlob((b) => res(b), "image/png")
          );
          if (rawBlob) {
            const fd = new FormData();
            fd.append("image", rawBlob, "image.png");
            fd.append("box_pct", (sPct / 100).toString());
            fd.append("offset_pct", (mPct / 100).toString());
            fd.append("inpaint_mode", "ns");

            const apiHost =
              typeof window !== "undefined" && window.location.hostname === "localhost"
                ? "http://localhost:5000"
                : "https://watermark-backend-weld.vercel.app";
            const resp = await fetch(`${apiHost}/api/gemini-image/clean`, {
              method: "POST",
              body: fd,
            });
            if (!resp.ok) throw new Error(`Image processing failed (HTTP ${resp.status})`);
            const boxHeader = resp.headers.get("X-Box");
            if (boxHeader) {
              const [x, y, w, h] = boxHeader.split(",").map(Number);
              if ([x, y, w, h].every(Number.isFinite)) R = { x, y, w, h, g: Math.round((mPct / 100) * Math.min(W, H)) };
            }
            blob = await resp.blob();
            const tempImg = await createImageBitmap(blob);
            g.drawImage(tempImg, 0, 0);
            tempImg.close();
          }
        } catch (e) {
          throw e;
        }
      }
      if (!blob) throw new Error("Could not encode image for processing.");
      const afterURL = blob ? URL.createObjectURL(blob) : item.beforeURL;
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
      const validFiles = Array.from(fileList).filter((f) =>
        f.type.startsWith("image/")
      );
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
      toast.success(`${newItems.length} image(s) ready. Click Remove Gemini Logo to process.`);

    },
    [items.length]
  );

  const processPendingImages = useCallback(async () => {
    const pending = items.filter((item) => !item.afterURL || item.key !== `${sizePct}|${marginPct}`);
    if (!pending.length || isProcessing) return;

    setIsProcessing(true);
    try {
      for (const item of pending) {
        const processed = await processItem(item, sizePct, marginPct);
        setItems((prev) => prev.map((candidate) => (candidate.id === item.id ? processed : candidate)));
      }
      toast.success(`${pending.length} image(s) cleaned successfully.`);
    } catch (error) {
      console.error("Image processing failed:", error);
      toast.error(error instanceof Error ? error.message : "Image processing failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [items, isProcessing, processItem, sizePct, marginPct]);

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
  const downloadCleanImage = (item: ImageItem) => {
    if (!item.afterURL) return;
    const a = document.createElement("a");
    a.href = item.afterURL;
    const baseName = item.name.replace(/\.[^/.]+$/, "");
    a.download = `${baseName}_clean.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloaded ${baseName}_clean.png at full resolution!`);
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
    <div className="min-h-screen bg-[#f3f4ee] text-[#10241e] font-sans pb-28 selection:bg-[#d0f471] selection:text-[#091712]">
      {/* ── 1. HERO SECTION & VIEWFINDER DROPZONE ── */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6 lg:px-8 bg-transparent">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#10241e]/15 shadow-sm">
                <Sparkles className="size-4 text-[#10241e]" />
                <span className="text-xs sm:text-sm font-bold text-[#10241e] tracking-wider uppercase font-mono">
                  ClearCorner • Gemini image cleaner
                </span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#10241e] leading-[1.06]">
                Take the sparkle off your{" "}
                <span className="underline decoration-[#d0f471] decoration-wavy decoration-4">
                  Gemini images.
                </span>
              </h1>

              <p className="text-lg sm:text-2xl text-[#37433d] font-normal leading-relaxed max-w-xl">
                Drop in a picture, aim the box at the corner mark, and get a clean copy at the exact same resolution.
                Preview your image, then process it to remove the corner mark.
              </p>

              {/* 3 Value Points */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#10241e]/15 text-xs sm:text-sm font-semibold text-[#10241e] shadow-xs">
                  <CheckCircle2 className="size-4 text-[#10241e]" /> No sign-up required
                </span>
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#10241e]/15 text-xs sm:text-sm font-semibold text-[#10241e] shadow-xs">
                  <Layers className="size-4 text-[#10241e]" /> Batch process images
                </span>
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#10241e]/15 text-xs sm:text-sm font-semibold text-[#10241e] shadow-xs">
                  <ShieldCheck className="size-4 text-[#10241e]" /> Full 4K / 8K original size kept
                </span>
              </div>
            </div>

            {/* Right: Viewfinder Drop Box */}
            <div className="lg:col-span-6">
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
                onClick={() => { if (!currentItem && !isProcessing) fileInputRef.current?.click(); }}
                className={`relative min-h-[380px] sm:min-h-[420px] rounded-3xl border p-8 sm:p-10 flex flex-col items-center justify-center text-center transition-all duration-300 shadow-xl group ${
                  isDraggingOver
                    ? "border-[#10241e] bg-white shadow-2xl"
                    : currentItem?.afterURL
                      ? "border-[#10241e]/10 bg-white"
                      : "border-dashed border-[#10241e]/20 bg-white hover:border-[#10241e]"
                }`}
              >
                {/* Viewfinder brackets appear only while waiting for an upload. */}
                {!currentItem && !isProcessing && <div className="absolute inset-4 pointer-events-none border border-transparent">
                  <div className="absolute top-0 left-0 size-6 border-t-2 border-l-2 border-[#10241e]" />
                  <div className="absolute top-0 right-0 size-6 border-t-2 border-r-2 border-[#10241e]" />
                  <div className="absolute bottom-0 left-0 size-6 border-b-2 border-l-2 border-[#10241e]" />
                  <div className="absolute bottom-0 right-0 size-6 border-b-2 border-r-2 border-[#10241e]" />
                </div>}

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

                {isProcessing ? (
                  <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
                    <span className="size-14 rounded-full border-4 border-[#10241e]/20 border-t-[#10241e] animate-spin" />
                    <span className="text-lg font-bold text-[#10241e]">Removing Gemini logo...</span>
                  </div>
                ) : currentItem ? (
                  <div className="w-full flex justify-center mb-5">
                    <img src={currentItem.afterURL || currentItem.beforeURL} alt={currentItem.afterURL ? "Processed image at original aspect ratio" : "Uploaded image preview"}
                      width={currentItem.width} height={currentItem.height}
                      className="block w-auto h-auto max-h-[min(68vh,680px)] max-w-full object-contain" />
                  </div>
                ) : (
                  <span className="size-20 rounded-2xl bg-[#10241e] text-[#d0f471] flex items-center justify-center shadow-lg mb-5 group-hover:scale-105 transition-transform">
                    <Upload className="size-9" />
                  </span>
                )}

                {!isProcessing && <h3 className="text-2xl sm:text-3xl font-bold text-[#10241e] tracking-tight break-all">
                  {currentItem?.afterURL ? "Your clean image is ready" : currentItem ? currentItem.name : "Drop Gemini images here"}
                </h3>}

                <p className="text-base text-[#37433d] mt-2 max-w-sm leading-relaxed">
                  {currentItem ? `${currentItem.width} × ${currentItem.height} px · ${currentItem.afterURL ? "Processed image" : "Ready to process"}` : "or paste directly with "}
                  {!currentItem && <>
                  <kbd className="px-2 py-0.5 rounded bg-[#e9ece4] border border-[#10241e]/15 font-mono text-xs font-bold text-[#10241e]">
                    Ctrl+V
                  </kbd>{" "}
                  /{" "}
                  <kbd className="px-2 py-0.5 rounded bg-[#e9ece4] border border-[#10241e]/15 font-mono text-xs font-bold text-[#10241e]">
                    Cmd+V
                  </kbd></>}
                </p>

                {!isProcessing && <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="mt-6 px-7 py-3.5 rounded-full bg-[#10241e] !text-[#d0f471] font-bold text-base shadow-md hover:bg-[#18362d] transition-colors">
                  {currentItem ? "Choose another image" : "Choose Images (Multiple)"}
                </button>}

                <span className="mt-4 text-xs font-mono font-medium text-[#637069]">
                  {currentItem ? `${items.length} image(s) selected` : "PNG, JPG and WebP supported"}
                </span>
                {currentItem?.afterURL && <span className="mt-2 text-xs text-[#637069]">AI-generated image · edited</span>}
              </div>
              {currentItem?.afterURL && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={() => downloadCleanImage(currentItem)} className="flex-1 rounded-2xl bg-[#10241e] px-6 py-4 font-bold !text-[#d0f471] inline-flex items-center justify-center gap-2">
                    <Download className="size-5" /> Download Clean PNG
                  </button>
                  {items.filter((item) => item.afterURL).length > 1 && <button type="button" onClick={downloadAllImages} className="rounded-2xl bg-white px-5 py-4 font-bold text-[#10241e]">Download All</button>}
                </div>
              )}
              {items.some((item) => !item.afterURL || item.key !== `${sizePct}|${marginPct}`) && (
                <button type="button" disabled={isProcessing} onClick={processPendingImages}
                  className="mt-4 w-full rounded-2xl bg-[#10241e] px-6 py-4 font-bold !text-[#d0f471] disabled:opacity-50">
                  {isProcessing ? "Removing logo..." : "Remove Gemini Logo"}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

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
                    100% Inpainted
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
                Add it now and get a flawless, watermark-free export in under 3 seconds. 100% free with no sign-up.
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

