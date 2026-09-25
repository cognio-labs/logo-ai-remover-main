import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, ChangeEvent, PointerEvent } from "react";
import {
  Sparkles,
  Upload,
  Download,
  CheckCircle2,
  RefreshCw,
  Copy,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Zap,
  Layers,
  ShoppingBag,
  UserCheck,
  Camera,
  Code2,
  Check,
  Eye,
  FileImage,
  Sliders,
  SplitSquareVertical,
  Paintbrush,
  Palette,
  CircleDot,
  Layout,
  Undo2,
  Redo2,
  Plus,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { PinkScanLoader } from "@/components/site/PinkScanLoader";
import {
  removeImageBackground,
  recompositeCutout,
  SOLID_COLOR_PRESETS,
  BACKDROP_PRESETS,
  type BackgroundType,
  type CutoutResult,
} from "@/lib/backgroundRemoverEngine";
import { getDownloadUrl, type QualityMode, type ExportFormat } from "@/lib/backgroundApi";
import { useUserStore } from "@/lib/userStore";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export const Route = createFileRoute("/background-remover")({
  head: () => ({
    meta: [
      { title: "Free AI Background Remover — 100% Automatically in 5 Seconds | Bellix.us" },
      {
        name: "description",
        content:
          "Remove image backgrounds online 100% automatically with AI. Isolate flyaway hair, pet fur, and e-commerce products with sub-pixel edge matting. Download transparent 4K PNGs or replace backgrounds instantly.",
      },
    ],
  }),
  component: BackgroundRemoverPage,
});

const DEMO_PRESETS = [
  {
    name: "Studio Portrait",
    badge: "Flyaway Hair",
    image: "/upscale/portrait.png",
    category: "Portraits",
  },
  {
    name: "E-Commerce Sneaker",
    badge: "Amazon / Shopify",
    image: "/upscale/product.png",
    category: "Products",
  },
  {
    name: "Wildlife & Fur",
    badge: "Soft Whiskers",
    image: "/upscale/wildlife.png",
    category: "Animals",
  },
  {
    name: "Architecture & Space",
    badge: "Clean Edges",
    image: "/upscale/interior.png",
    category: "Objects",
  },
];

const SHOWCASE_ITEMS = [
  {
    id: "hair",
    category: "FINE HAIR & PORTRAITS",
    title: "Zero Flyaway Hair Loss",
    description: "Preserves individual wisps, curls, and transparent fringes without halos or jagged cuts.",
    image: "/upscale/portrait.png",
  },
  {
    id: "product",
    category: "E-COMMERCE & PRODUCTS",
    title: "Crisp Catalog Product Cutouts",
    description: "Amazon, Shopify, and eBay 100% pure white background compliant with razor-sharp contours.",
    image: "/upscale/product.png",
  },
  {
    id: "pet",
    category: "PETS & WILDLIFE",
    title: "Soft Fur, Feathers & Whiskers",
    description: "Handles intricate textures, soft fur, and whisker details without blurring or artificial lines.",
    image: "/upscale/wildlife.png",
  },
  {
    id: "vehicle",
    category: "VEHICLES & GLASS",
    title: "Transparent Glass & Reflections",
    description: "Detects transparent windshields, metallic reflections, and wheel spokes accurately.",
    image: "/upscale/product.png",
  },
];

const PERSONAS = [
  {
    icon: UserCheck,
    title: "Individuals & Creators",
    subtitle: "Avatars, Stickers & Socials",
    desc: "Create professional LinkedIn profile headshots, transparent WhatsApp/iMessage stickers, and eye-catching YouTube thumbnail cutouts in seconds.",
    bullets: ["One-click profile photo background blur", "Transparent PNG for stickers and memes", "Instant creator cutouts for banners"],
    color: "from-[#FFF1F4] to-[#FFE4E9]",
    accent: "#E11D48",
  },
  {
    icon: ShoppingBag,
    title: "E-Commerce & Marketplaces",
    subtitle: "Amazon, Shopify & eBay",
    desc: "100% pure white background compliance for Amazon, Google Shopping, and Shopify. Increase conversion rates with studio-grade product presentations.",
    bullets: ["Batch background removal for catalogs", "Pure white (#FFFFFF) export in 1 click", "Crisp jewelry, sneaker & apparel edges"],
    color: "from-[#F0FDF4] to-[#DCFCE7]",
    accent: "#16A34A",
  },
  {
    icon: Camera,
    title: "Photographers & Studios",
    subtitle: "Retouching 10x Faster",
    desc: "Replace tedious Photoshop pen-tool clipping paths. Speed up client deliveries by processing dozens of portraits and weddings automatically.",
    bullets: ["Sub-pixel hair and veil edge matting", "Replace backdrop with luxury studio sets", "Preserves original 4K/8K resolution"],
    color: "from-[#EFF6FF] to-[#DBEAFE]",
    accent: "#2563EB",
  },
  {
    icon: Layers,
    title: "Marketers & Designers",
    subtitle: "Pitch Decks & Ad Campaigns",
    desc: "Drop isolated subjects straight into Figma, Canva, or Photoshop. Build high-converting social media creatives and promotional posters effortlessly.",
    bullets: ["Transparent PNG with drag-and-drop", "Custom brand color background swap", "Pixel-perfect composition ready"],
    color: "from-[#FAF5FF] to-[#F3E8FF]",
    accent: "#9333EA",
  },
  {
    icon: Code2,
    title: "Developers & Enterprise",
    subtitle: "High-Throughput REST API",
    desc: "Integrate automatic background removal directly into your SaaS, e-commerce platform, or mobile app with our fast, reliable REST API.",
    bullets: ["Sub-second processing response time", "99.9% uptime SLA with global endpoints", "SDKs for Python, Node.js, cURL & PHP"],
    color: "from-[#FFF7ED] to-[#FFEDD5]",
    accent: "#EA580C",
  },
];

const FAQS = [
  {
    q: "How does the AI remove backgrounds automatically?",
    a: "Bellix.us uses deep convolutional segmentation networks and sub-pixel alpha matting. The model identifies the primary subject (person, product, animal, or car) and isolates it from the background pixels with fine-edge precision, preserving hair, fur, and semi-transparent areas.",
  },
  {
    q: "What image formats and file sizes are supported?",
    a: "We support PNG, JPEG/JPG, WebP, GIF, AVIF, and HEIC files up to 35MB in size. Output cutouts are exported as pristine transparent 32-bit PNGs or high-quality JPEGs with your selected background color.",
  },
  {
    q: "Can it handle complex hair, pet fur, and transparent glass?",
    a: "Yes! Unlike basic clipping tools that leave harsh jagged edges, our sub-pixel edge matting algorithm analyzes semi-transparent boundary pixels to preserve flyaway hair strands, animal whiskers, veil fabric, and transparent glass reflections.",
  },
  {
    q: "Is the output compliant with Amazon and Shopify requirements?",
    a: "Absolutely. Amazon, eBay, and Google Shopping mandate pure white backgrounds (RGB 255, 255, 255) for main product images. You can select 'Pure White' in our palette with one click to get 100% marketplace-compliant catalog photos.",
  },
  {
    q: "Can I replace the background with my own color or studio backdrops?",
    a: "Yes. In the control panel, you can choose between a Transparent PNG, preset solid colors (Pure White, Studio Charcoal, Blush Rose), a custom hex color picker, or pre-rendered luxury studio and scenic backdrops.",
  },
  {
    q: "Will the resolution or quality of my image be reduced?",
    a: "No. Bellix.us processes and outputs images at their full original resolution up to 4K and 8K. Your subject retains 100% of its original clarity and texture.",
  },
  {
    q: "Are my uploaded photos kept private and secure?",
    a: "Yes. All processing is executed securely in isolated memory containers with end-to-end encryption. Your files are automatically purged after processing and are never stored permanently or used for AI model training.",
  },
  {
    q: "Can I use the cutouts for commercial projects and clients?",
    a: "Yes! All cutouts and edited images generated through Bellix.us are 100% royalty-free for commercial use, client deliverables, marketing materials, and e-commerce listings.",
  },
  {
    q: "Is there a developer API available for batch automation?",
    a: "Yes. We offer a high-performance REST API with sub-second response times. You can automate background removal in Python, Node.js, PHP, or cURL with a simple API key.",
  },
  {
    q: "Does it work on mobile phones and tablets?",
    a: "Yes. The tool runs directly inside modern mobile browsers (iOS Safari, Android Chrome, Edge) without requiring any app installations.",
  },
];

const CODE_SNIPPETS = {
  curl: `curl -X POST https://api.bellix.ai/v1/background/remove \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -F "image=@portrait.jpg" \\
  -F "export_format=png" \\
  -F "bg_type=transparent" \\
  -o "cutout.png"`,
  python: `import requests

url = "https://api.bellix.ai/v1/background/remove"
headers = {"X-API-Key": "YOUR_API_KEY"}
files = {"image": open("portrait.jpg", "rb")}
data = {"export_format": "png", "bg_type": "transparent"}

response = requests.post(url, headers=headers, files=files, data=data)

with open("cutout.png", "wb") as f:
    f.write(response.content)
print("✓ Background removed with 100% precision!")`,
  javascript: `import fs from "node:fs";

const formData = new FormData();
formData.append("image", new Blob([fs.readFileSync("portrait.jpg")]));
formData.append("export_format", "png");
formData.append("bg_type", "transparent");

const response = await fetch("https://api.bellix.ai/v1/background/remove", {
  method: "POST",
  headers: { "X-API-Key": "YOUR_API_KEY" },
  body: formData,
});

const buffer = await response.arrayBuffer();
fs.writeFileSync("cutout.png", Buffer.from(buffer));
console.log("✓ Cutout saved successfully!");`,
  php: `<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://api.bellix.ai/v1/background/remove');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['X-API-Key: YOUR_API_KEY']);
curl_setopt($ch, CURLOPT_POSTFIELDS, [
    'image' => new CURLFile('portrait.jpg'),
    'export_format' => 'png',
    'bg_type' => 'transparent'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$result = curl_exec($ch);
file_put_contents('cutout.png', $result);
curl_close($ch);
?>`,
};

function ShowcaseSlider({ image, title, category, description }: { image: string; title: string; category: string; description: string }) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePos = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
    setPosition(pct);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePos(e.clientX);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      updatePos(e.clientX);
    }
  };

  return (
    <div className="rounded-3xl border border-gray-200/80 bg-white shadow-xl shadow-gray-200/40 overflow-hidden">
      <div
        ref={containerRef}
        className="relative aspect-4/3 w-full overflow-hidden cursor-ew-resize select-none touch-none bg-[#f8fafc]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      >
        {/* Transparent Checkerboard Pattern Background Layer */}
        <div
          className="absolute inset-0 size-full"
          style={{
            backgroundImage: `linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
              linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
              linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)`,
            backgroundSize: "16px 16px",
            backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
          }}
        />

        {/* After (Transparent Cutout) */}
        <img
          src={image}
          alt={`${title} cutout`}
          className="absolute inset-0 size-full object-contain pointer-events-none filter drop-shadow-md"
        />

        {/* Before (Original Image) - Clipped to left */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ width: `${position}%` }}
        >
          <img
            src={image}
            alt={`${title} original`}
            className="absolute inset-0 h-full max-w-none object-cover"
            style={{ width: "100%", minWidth: "100%" }}
          />
        </div>

        {/* Badges */}
        <span className="absolute top-3.5 left-3.5 z-10 px-2.5 py-1 rounded-full bg-gray-900/85 text-white text-[10px] font-medium tracking-wider backdrop-blur-md">
          ORIGINAL
        </span>
        <span className="absolute top-3.5 right-3.5 z-10 px-2.5 py-1 rounded-full bg-[#E11D48] text-white text-[10px] font-medium tracking-wider shadow-md backdrop-blur-md">
          TRANSPARENT PNG
        </span>

        {/* Divider Handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-[#E11D48] z-20 pointer-events-none shadow-[0_0_12px_rgba(225,29,72,0.8)]"
          style={{ left: `${position}%` }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 rounded-full bg-[#E11D48] border-2 border-white shadow-lg flex items-center justify-center text-white">
            <ChevronLeft className="size-3.5 -mr-1" />
            <ChevronRight className="size-3.5 -ml-1" />
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6 bg-white border-t border-gray-100">
        <p className="text-[10px] font-medium text-[#E11D48] uppercase tracking-widest">{category}</p>
        <h3 className="text-lg font-medium text-gray-900 mt-1">{title}</h3>
        <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function WorkspaceSplitSlider({
  originalUrl,
  cutoutUrl,
  bgType,
}: {
  originalUrl: string;
  cutoutUrl: string;
  bgType: BackgroundType;
}) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePos = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
    setPosition(pct);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePos(e.clientX);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      updatePos(e.clientX);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-4/3 sm:h-[350px] w-full rounded-2xl overflow-hidden border border-gray-200 shadow-inner flex items-center justify-center select-none cursor-ew-resize touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
    >
      {/* Checkerboard Pattern for Transparent */}
      {bgType === "transparent" && (
        <div
          className="absolute inset-0 size-full"
          style={{
            backgroundImage: `linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
              linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
              linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)`,
            backgroundSize: "16px 16px",
            backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
          }}
        />
      )}

      {/* After Cutout (Full Canvas) */}
      <img
        src={cutoutUrl}
        alt="AI Cutout"
        className="absolute inset-0 size-full object-contain pointer-events-none filter drop-shadow-md"
      />

      {/* Before Original (Clipped to left side) */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ width: `${position}%` }}
      >
        <img
          src={originalUrl}
          alt="Original"
          className="absolute inset-0 h-full max-w-none object-contain"
          style={{ width: "100%", minWidth: "100%" }}
        />
      </div>

      {/* Badges */}
      <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-gray-900/80 text-white text-[10px] font-medium backdrop-blur-md">
        ORIGINAL
      </span>
      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-[#E11D48] text-white text-[10px] font-medium backdrop-blur-md shadow-xs">
        {bgType === "transparent" ? "TRANSPARENT" : "CLEANED"}
      </span>

      {/* Divider */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-[#E11D48] z-20 pointer-events-none shadow-[0_0_10px_rgba(225,29,72,0.8)]"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-7 rounded-full bg-[#E11D48] border-2 border-white shadow-md flex items-center justify-center text-white">
          <ChevronLeft className="size-3 -mr-0.5" />
          <ChevronRight className="size-3 -ml-0.5" />
        </div>
      </div>
    </div>
  );
}

function BackgroundRemoverPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [cutoutResult, setCutoutResult] = useState<CutoutResult | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Background customization state
  const [bgType, setBgType] = useState<BackgroundType>("transparent");
  const [solidColor, setSolidColor] = useState("#FFFFFF");
  const [backdropId, setBackdropId] = useState("luxury-studio");
  const [showOriginal, setShowOriginal] = useState(false);
  const [useSplitView, setUseSplitView] = useState(false);
  const [activeTab, setActiveTab] = useState<"cutout" | "background" | "effects" | "adjust" | "design">("cutout");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(false);
  const [qualityMode, setQualityMode] = useState<QualityMode>("standard");
  const [downloadFormat, setDownloadFormat] = useState<ExportFormat>("png");

  // Code snippet tabs & FAQ accordion
  const [activeCodeTab, setActiveCodeTab] = useState<keyof typeof CODE_SNIPPETS>("curl");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, deductCredit, addJob } = useUserStore();

  useEffect(() => {
    return () => {
      if (sourceUrl && sourceUrl.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
      if (cutoutResult?.transparentBlobUrl.startsWith("blob:")) URL.revokeObjectURL(cutoutResult.transparentBlobUrl);
      if (cutoutResult?.compositeBlobUrl.startsWith("blob:")) URL.revokeObjectURL(cutoutResult.compositeBlobUrl);
    };
  }, []);

  // Global Ctrl+V image paste listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      const items = Array.from(e.clipboardData?.items || []);
      const imgItem = items.find((item) => item.type.startsWith("image/"));
      if (imgItem) {
        const file = imgItem.getAsFile();
        if (file) {
          e.preventDefault();
          processFile(file);
          toast.success("Pasted image from clipboard!");
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [bgType, solidColor, backdropId, qualityMode]);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WebP, HEIC).");
      return;
    }
    if (file.size > 35 * 1024 * 1024) {
      toast.error("File size exceeds 35MB limit.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setUploadedFile(file);
    setSourceUrl(objectUrl);
    setCutoutResult(null);
    executeRemoval(objectUrl, file.name);
  };

  const loadDemo = (preset: (typeof DEMO_PRESETS)[0]) => {
    setUploadedFile(null);
    setSourceUrl(preset.image);
    setCutoutResult(null);
    toast.info(`Loading sample "${preset.name}"...`);
    executeRemoval(preset.image, `${preset.name.toLowerCase().replaceAll(" ", "-")}.png`);
  };

  const executeRemoval = async (url: string, fileName: string) => {
    if (user.credits <= 0 || !deductCredit()) {
      toast.error("Insufficient credits. Please upgrade or wait for the daily reset.");
      return;
    }

    setRunning(true);
    setProgress(5);
    setStage("Initializing neural segmentation...");

    try {
      const res = await removeImageBackground(
        url,
        bgType,
        solidColor,
        backdropId,
        (currentStage, currentProgress) => {
          setStage(currentStage);
          setProgress(currentProgress);
        }
      );

      setCutoutResult(res);
      setRunning(false);

      addJob({
        file_name: fileName,
        file_type: "background-remover",
        status: "completed",
        quality: `Transparent (${res.width}×${res.height})`,
        credits_used: 1,
        processing_time: res.processingTimeMs ? `${(res.processingTimeMs / 1000).toFixed(1)}s` : "2.4s",
        file_url: url,
        result_url: res.transparentBlobUrl,
      });

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#E11D48", "#FF2E63", "#FF4FA3", "#38BDF8"],
      });

      toast.success("✦ Background removed! Download transparent PNG or customize.");
    } catch (err) {
      console.error("Background removal error:", err);
      setRunning(false);
      toast.error("Processing failed. Please try another image.");
    }
  };

  // Live re-compositing when user switches background colors or backdrops
  const updateBackgroundStyle = async (newType: BackgroundType, color?: string, backdrop?: string) => {
    setBgType(newType);
    if (color) setSolidColor(color);
    if (backdrop) setBackdropId(backdrop);

    if (!sourceUrl || !cutoutResult) return;

    try {
      const activeColor = color || solidColor;
      const activeBackdrop = backdrop || backdropId;

      if (cutoutResult.jobId) {
        const recomputed = await recompositeCutout(cutoutResult.jobId, newType, activeColor, activeBackdrop);
        setCutoutResult((prev) =>
          prev
            ? {
                ...prev,
                compositeBlobUrl: recomputed.compositeBlobUrl,
                fileSizeFormatted: recomputed.sizeFormatted,
              }
            : null
        );
      } else {
        const updated = await removeImageBackground(sourceUrl, newType, activeColor, activeBackdrop);
        setCutoutResult(updated);
      }
    } catch (err) {
      console.warn("Re-composite error:", err);
    }
  };

  const downloadResult = () => {
    if (!cutoutResult) return;
    const base = (uploadedFile?.name || "image").replace(/\.[^/.]+$/, "");
    const isTrans = bgType === "transparent";
    const selectedFormat = isTrans ? "png" : downloadFormat;

    if (cutoutResult.jobId) {
      // Direct backend download with correct headers
      const downloadUrl = getDownloadUrl(cutoutResult.jobId, selectedFormat);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `bellix-${base}-${isTrans ? "cutout" : bgType}.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const a = document.createElement("a");
      a.href = isTrans ? cutoutResult.transparentBlobUrl : cutoutResult.compositeBlobUrl;
      a.download = `bellix-${base}-${isTrans ? "cutout" : bgType}.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    toast.success(`Downloaded ${cutoutResult.width}×${cutoutResult.height}px ${isTrans ? "Transparent PNG" : "HD image"}!`);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("API snippet copied to clipboard!");
  };

  const resetAll = () => {
    setUploadedFile(null);
    setSourceUrl(null);
    setCutoutResult(null);
    setRunning(false);
    setProgress(0);
    setBgType("transparent");
    setUseSplitView(false);
  };

  const activeCutoutDisplay =
    bgType === "transparent" ? cutoutResult?.transparentBlobUrl : cutoutResult?.compositeBlobUrl;

  if (sourceUrl) {
    return (
      <main className="min-h-[calc(100vh-70px)] bg-[#F8FAFC] text-gray-900 font-sans flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none relative">
        {/* Hidden File Input for uploading more */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
          }}
        />

        {/* 1. TOP FLOATING TOOLBAR PILL (Screenshot 4 Matching) */}
        <div className="w-full flex flex-col items-center gap-3 z-30">
          <div className="w-full max-w-4xl bg-white/95 backdrop-blur-xl border border-gray-200/80 shadow-[0_10px_35px_-8px_rgba(0,0,0,0.08)] rounded-full px-4 sm:px-6 py-2 flex items-center justify-between gap-2">
            {/* Left Category Tabs */}
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              <button
                type="button"
                onClick={() => setActiveTab("cutout")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "cutout" ? "bg-[#FFF1F4] text-[#E11D48] shadow-2xs" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Paintbrush className="size-3.5" />
                <span>Cutout</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("background")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "background" ? "bg-[#FFF1F4] text-[#E11D48] shadow-2xs" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Palette className="size-3.5" />
                <span>Background</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("effects")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "effects" ? "bg-[#FFF1F4] text-[#E11D48] shadow-2xs" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <CircleDot className="size-3.5" />
                <span>Effects</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("adjust")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "adjust" ? "bg-[#FFF1F4] text-[#E11D48] shadow-2xs" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Sliders className="size-3.5" />
                <span>Adjust</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("design")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "design" ? "bg-[#FFF1F4] text-[#E11D48] shadow-2xs" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Layout className="size-3.5" />
                <span>Design</span>
              </button>
            </div>

            {/* Divider */}
            <div className="h-5 w-px bg-gray-200 shrink-0" />

            {/* Right Tools: Split, Undo, Redo, Download */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setUseSplitView(!useSplitView)}
                title="Toggle Before/After Split Slider"
                className={`flex size-8 items-center justify-center rounded-full transition-colors cursor-pointer ${
                  useSplitView ? "bg-[#FFF1F4] text-[#E11D48]" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <SplitSquareVertical className="size-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setBgType("transparent");
                  setBrightness(100);
                  setContrast(100);
                  setSaturation(100);
                  toast.info("Reset adjustments");
                }}
                title="Undo adjustments"
                className="flex size-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <Undo2 className="size-4" />
              </button>

              <button
                type="button"
                title="Redo"
                className="flex size-8 items-center justify-center rounded-full text-gray-300 transition-colors cursor-not-allowed"
                disabled
              >
                <Redo2 className="size-4" />
              </button>

              {/* Download Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={downloadResult}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition-all cursor-pointer"
                >
                  <span>Download</span>
                  <ChevronDown className="size-3 text-gray-500" />
                </button>
              </div>
            </div>
          </div>

          {/* Sub-tool panels */}
          {activeTab === "background" && (
            <div className="w-full max-w-xl bg-white/95 backdrop-blur-xl border border-gray-200 shadow-md rounded-2xl p-3 flex flex-wrap items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1">
              <button
                type="button"
                onClick={() => updateBackgroundStyle("transparent")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  bgType === "transparent" ? "bg-gray-900 text-white shadow-xs" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Checkerboard Transparent
              </button>
              <button
                type="button"
                onClick={() => updateBackgroundStyle("color", "#FFFFFF")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  bgType === "color" && solidColor === "#FFFFFF" ? "border-[#E11D48] bg-[#FFF5F7] text-[#E11D48]" : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                Pure White
              </button>
              {SOLID_COLOR_PRESETS.slice(1, 5).map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => updateBackgroundStyle("color", c.hex)}
                  className={`size-6 rounded-full border border-black/10 transition-transform ${
                    bgType === "color" && solidColor === c.hex ? "scale-125 ring-2 ring-[#E11D48]" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
              {BACKDROP_PRESETS.slice(0, 3).map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => updateBackgroundStyle("backdrop", undefined, b.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                    bgType === "backdrop" && backdropId === b.id ? "border-[#E11D48] text-[#E11D48] bg-rose-50" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}

          {activeTab === "adjust" && (
            <div className="w-full max-w-lg bg-white/95 backdrop-blur-xl border border-gray-200 shadow-md rounded-2xl p-4 grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-1 text-xs">
              <div>
                <label className="text-[11px] font-medium text-gray-600 block mb-1">Brightness ({brightness}%)</label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-[#E11D48]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-600 block mb-1">Contrast ({contrast}%)</label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-[#E11D48]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-600 block mb-1">Saturation ({saturation}%)</label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                  className="w-full accent-[#E11D48]"
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. CENTER CANVAS STAGE (Screenshot 4 Matching) */}
        <div className="my-auto py-6 flex flex-col items-center justify-center relative w-full">
          {running ? (
            <div className="relative aspect-square max-w-[440px] w-full rounded-3xl bg-white border border-gray-200 shadow-xl flex flex-col items-center justify-center p-8">
              <img
                src={sourceUrl}
                alt="Source Preview"
                className="size-full object-contain opacity-35 blur-xs rounded-2xl"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/75 backdrop-blur-xs rounded-3xl">
                <Loader2 className="size-10 text-[#E11D48] animate-spin mb-3" />
                <span className="text-sm font-semibold text-gray-900">{stage || "Removing background..."}</span>
                <span className="text-xs text-gray-500 mt-1 font-mono">{progress}% completed</span>
              </div>
            </div>
          ) : useSplitView && activeCutoutDisplay ? (
            <div className="w-full max-w-2xl">
              <WorkspaceSplitSlider
                originalUrl={sourceUrl}
                cutoutUrl={activeCutoutDisplay}
                bgType={bgType}
              />
            </div>
          ) : (
            <div className="relative aspect-square max-w-[460px] w-full rounded-3xl overflow-hidden border border-gray-200/80 bg-white shadow-[0_20px_50px_-15px_rgba(0,0,0,0.12)] flex items-center justify-center p-4">
              {bgType === "transparent" && (
                <div
                  className="absolute inset-0 size-full pointer-events-none"
                  style={{
                    backgroundImage: `linear-gradient(45deg, #f1f5f9 25%, transparent 25%),
                      linear-gradient(-45deg, #f1f5f9 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, #f1f5f9 75%),
                      linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)`,
                    backgroundSize: "20px 20px",
                    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                  }}
                />
              )}
              <img
                src={showOriginal ? sourceUrl : activeCutoutDisplay || sourceUrl}
                alt="Cutout Preview"
                style={{
                  filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                }}
                className="relative max-h-full max-w-full object-contain rounded-2xl filter drop-shadow-md transition-all duration-200"
              />
              <button
                type="button"
                onMouseDown={() => setShowOriginal(true)}
                onMouseUp={() => setShowOriginal(false)}
                onTouchStart={() => setShowOriginal(true)}
                onTouchEnd={() => setShowOriginal(false)}
                className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-gray-950/75 text-white text-[11px] font-medium backdrop-blur-md cursor-pointer hover:bg-black transition-colors flex items-center gap-1.5 shadow-md"
              >
                <Eye className="size-3" />
                <span>{showOriginal ? "Showing Original" : "Hold for Original"}</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. BOTTOM THUMBNAILS NAVIGATION BAR (Screenshot 4 Matching) */}
        <div className="w-full flex items-center justify-center gap-3 pt-4 z-20">
          {/* Plus Button to Upload New Image */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex size-14 items-center justify-center rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Upload another image"
          >
            <Plus className="size-6" />
          </button>

          {/* Active Image Thumbnail with Blue Ring and Loading Spinner */}
          <div
            className="relative size-14 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-md bg-white ring-2 ring-blue-400/50 cursor-pointer"
            title="Current active image"
          >
            <img
              src={sourceUrl}
              alt="Active asset"
              className="size-full object-cover"
            />
            {running && (
              <div className="absolute inset-0 bg-black/45 flex items-center justify-center backdrop-blur-2xs">
                <Loader2 className="size-6 text-white animate-spin" />
              </div>
            )}
          </div>

          {/* Exit Editor Button */}
          <button
            type="button"
            onClick={resetAll}
            className="ml-2 text-xs text-gray-400 hover:text-red-500 font-medium transition-colors cursor-pointer"
          >
            Exit Editor
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-gray-900 font-sans selection:bg-[#FFE4E9] selection:text-[#E11D48]">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-20 sm:pt-16 sm:pb-28 overflow-hidden bg-radial-[at_50%_0%] from-[#FFF0F5] via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Title & Pitch */}
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFF1F4] border border-[#FCE7EC] text-xs font-medium text-[#E11D48] mb-4 shadow-xs">
              <Sparkles className="size-3.5 text-[#E11D48]" />
              <span>100% AUTOMATIC &amp; FREE BACKGROUND REMOVER</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-normal text-gray-950 tracking-tight leading-[1.08]">
              Remove Image Backgrounds{" "}
              <span className="bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] bg-clip-text text-transparent font-medium">
                in 5 Seconds Free
              </span>
            </h1>

            <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto font-normal">
              Zero manual pen clipping. Zero green screens. Automatically isolate hair, fur, and complex product silhouettes with sub-pixel edge matting.
            </p>

            {/* Quick Preset Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider mr-1">
                TRY SAMPLES:
              </span>
              {DEMO_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => loadDemo(p)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:border-[#E11D48] hover:bg-[#FFF5F7] text-xs font-medium text-gray-800 transition-all cursor-pointer shadow-2xs"
                >
                  <img src={p.image} alt={p.name} className="size-4 rounded-full object-cover" />
                  <span>{p.name}</span>
                  <span className="text-[10px] font-medium text-[#E11D48] bg-[#FFE4E9] px-1.5 py-0.5 rounded-md">
                    {p.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. INTERACTIVE WORKSPACE CARD */}
          <div className="rounded-3xl border border-gray-200/80 bg-white/95 backdrop-blur-xl shadow-2xl shadow-gray-200/60 p-5 sm:p-8 lg:p-10 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* LEFT / CENTER WORKSPACE (Dropzone OR Cutout Preview) */}
              <div className="lg:col-span-7 flex flex-col justify-center">
                {running ? (
                  <div className="h-[380px] rounded-2xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                    <PinkScanLoader progress={progress} stage={stage} />
                  </div>
                ) : cutoutResult && sourceUrl ? (
                  /* STATE: CUTOUT RESULT PREVIEW */
                  <div className="flex flex-col h-full space-y-3">
                    <div className="flex items-center justify-between text-xs text-gray-600 px-1">
                      <span className="font-medium flex items-center gap-1.5 text-gray-800">
                        <FileImage className="size-4 text-[#E11D48]" />
                        <span>{uploadedFile?.name || "cutout-transparent.png"}</span>
                        <span className="text-gray-400 font-normal">
                          · {cutoutResult.width} × {cutoutResult.height}px · {cutoutResult.fileSizeFormatted}
                        </span>
                      </span>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setUseSplitView(!useSplitView)}
                          className={`font-medium flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors cursor-pointer ${
                            useSplitView ? "bg-[#FFE4E9] text-[#E11D48]" : "text-gray-600 hover:text-gray-900 bg-gray-100"
                          }`}
                          title="Toggle Before/After Split Slider"
                        >
                          <SplitSquareVertical className="size-3.5" />
                          <span>{useSplitView ? "Single View" : "Split View"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={resetAll}
                          className="font-medium text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Upload another image"
                        >
                          <RefreshCw className="size-3.5" />
                          <span>Upload New</span>
                        </button>
                      </div>
                    </div>

                    {/* The Canvas Frame */}
                    {useSplitView && activeCutoutDisplay ? (
                      <WorkspaceSplitSlider
                        originalUrl={sourceUrl}
                        cutoutUrl={activeCutoutDisplay}
                        bgType={bgType}
                      />
                    ) : (
                      <div className="relative aspect-4/3 sm:h-[350px] w-full rounded-2xl overflow-hidden border border-gray-200 shadow-inner flex items-center justify-center select-none bg-slate-50">
                        {/* Checkerboard Pattern for Transparent */}
                        {bgType === "transparent" && (
                          <div
                            className="absolute inset-0 size-full"
                            style={{
                              backgroundImage: `linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
                                linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
                                linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
                                linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)`,
                              backgroundSize: "16px 16px",
                              backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                            }}
                          />
                        )}

                        {/* Displayed Cutout */}
                        <img
                          src={showOriginal ? sourceUrl : activeCutoutDisplay}
                          alt="Cutout result"
                          className="relative max-h-full max-w-full object-contain filter drop-shadow-md transition-all"
                        />

                        {/* Hold to See Original Toggle Button */}
                        <button
                          type="button"
                          onMouseDown={() => setShowOriginal(true)}
                          onMouseUp={() => setShowOriginal(false)}
                          onTouchStart={() => setShowOriginal(true)}
                          onTouchEnd={() => setShowOriginal(false)}
                          className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-gray-900/80 hover:bg-gray-950 text-white text-xs font-medium backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <Eye className="size-3.5" />
                          <span>{showOriginal ? "Showing Original" : "Hold for Original"}</span>
                        </button>

                        {/* Badge indicator */}
                        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-[10px] font-medium uppercase tracking-wider backdrop-blur-md shadow-xs">
                          {showOriginal ? "Original Image" : bgType === "transparent" ? "Transparent PNG" : "Background Applied"}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* STATE: EMPTY DROPZONE */
                  <div
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) processFile(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`h-[380px] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-8 text-center cursor-pointer ${
                      isDragging
                        ? "border-[#E11D48] bg-[#FFF5F7] scale-[1.01]"
                        : "border-gray-300 hover:border-[#E11D48] hover:bg-[#FFF9FA]"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                      className="hidden"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files?.[0];
                        if (file) processFile(file);
                      }}
                    />

                    <span className="size-16 rounded-3xl bg-gradient-to-tr from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] text-white flex items-center justify-center shadow-lg shadow-[#E11D48]/30 mb-5 transition-transform hover:scale-110">
                      <Upload className="size-8" />
                    </span>

                    <h3 className="text-xl font-medium text-gray-900 tracking-tight">
                      Drop your image here
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed font-normal">
                      PNG, JPG, WebP or HEIC · Up to 35MB · Paste (<kbd className="font-sans px-1 py-0.5 rounded bg-gray-100 border text-gray-600 font-normal">Ctrl+V</kbd>)
                    </p>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="mt-5 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#E11D48] to-[#FF2E63] hover:from-[#BE123C] hover:to-[#E11D48] text-white text-xs font-medium shadow-md shadow-[#E11D48]/30 transition-all cursor-pointer flex items-center gap-2"
                    >
                      <Upload className="size-4" />
                      <span>Upload Image</span>
                    </button>

                    <span className="text-[11px] text-gray-400 mt-2 font-normal">or click anywhere to browse</span>
                  </div>
                )}
              </div>

              {/* RIGHT / SETTINGS & BACKGROUND REPLACEMENT PANEL */}
              <div className="lg:col-span-5 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-gray-100 pt-6 lg:pt-0 lg:pl-8 space-y-6">
                <div>
                  <h4 className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
                    BACKGROUND OPTIONS
                  </h4>

                  {/* Mode Selector */}
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-gray-100 border border-gray-200 text-xs font-medium text-gray-600 mb-5">
                    <button
                      type="button"
                      onClick={() => updateBackgroundStyle("transparent")}
                      className={`py-2 rounded-lg transition-all ${
                        bgType === "transparent" ? "bg-white text-gray-950 shadow-xs" : "hover:text-gray-900"
                      }`}
                    >
                      Transparent
                    </button>
                    <button
                      type="button"
                      onClick={() => updateBackgroundStyle("color")}
                      className={`py-2 rounded-lg transition-all ${
                        bgType === "color" ? "bg-white text-gray-950 shadow-xs" : "hover:text-gray-900"
                      }`}
                    >
                      Solid Color
                    </button>
                    <button
                      type="button"
                      onClick={() => updateBackgroundStyle("backdrop")}
                      className={`py-2 rounded-lg transition-all ${
                        bgType === "backdrop" ? "bg-white text-gray-950 shadow-xs" : "hover:text-gray-900"
                      }`}
                    >
                      Studio Set
                    </button>
                  </div>

                  {/* CONTROLS PER MODE */}
                  {bgType === "transparent" && (
                    <div className="rounded-xl p-4 bg-[#F8FAFC] border border-gray-200 text-xs space-y-2">
                      <p className="font-medium text-gray-800 flex items-center gap-1.5">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        <span>32-Bit Transparent PNG</span>
                      </p>
                      <p className="text-gray-500 leading-relaxed font-normal">
                        Ready to drag straight into Figma, Photoshop, Canva, Illustrator, or web code with true alpha transparency.
                      </p>
                    </div>
                  )}

                  {bgType === "color" && (
                    <div className="space-y-3">
                      <label className="text-xs font-medium text-gray-700">Choose Solid Color</label>
                      <div className="grid grid-cols-3 gap-2">
                        {SOLID_COLOR_PRESETS.map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => updateBackgroundStyle("color", c.hex)}
                            className={`p-2 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                              solidColor.toLowerCase() === c.hex.toLowerCase()
                                ? "border-[#E11D48] bg-[#FFF5F7] ring-1 ring-[#E11D48]"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <span
                              className="size-5 rounded-md border border-black/10 shadow-2xs"
                              style={{ backgroundColor: c.hex }}
                            />
                            <span className="text-[11px] font-medium text-gray-900 leading-tight">{c.name}</span>
                            <span className="text-[9px] text-gray-400 font-normal">{c.badge}</span>
                          </button>
                        ))}
                      </div>

                      {/* Custom Color Input */}
                      <div className="flex items-center gap-3 pt-2">
                        <input
                          type="color"
                          value={solidColor}
                          onChange={(e) => updateBackgroundStyle("color", e.target.value)}
                          className="size-8 rounded-lg cursor-pointer border border-gray-300 p-0.5 bg-white"
                        />
                        <span className="text-xs font-medium text-gray-600">
                          Custom Hex: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-900 font-normal">{solidColor}</code>
                        </span>
                      </div>
                    </div>
                  )}

                  {bgType === "backdrop" && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-700">Select Studio Backdrop</label>
                      <div className="grid grid-cols-2 gap-2 max-h-[190px] overflow-y-auto pr-1">
                        {BACKDROP_PRESETS.map((bp) => (
                          <button
                            key={bp.id}
                            type="button"
                            onClick={() => updateBackgroundStyle("backdrop", undefined, bp.id)}
                            className={`p-2 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                              backdropId === bp.id
                                ? "border-[#E11D48] bg-[#FFF5F7] ring-1 ring-[#E11D48]"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <span
                              className="size-8 rounded-lg shrink-0 shadow-2xs"
                              style={{
                                background: `linear-gradient(135deg, ${bp.gradient[0]}, ${bp.gradient[2]})`,
                              }}
                            />
                            <div>
                              <p className="text-xs font-medium text-gray-900 leading-tight">{bp.name}</p>
                              <p className="text-[10px] text-gray-400 font-normal">{bp.category}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quality & Processing Options */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                      <span className="font-medium flex items-center gap-1.5">
                        <Sliders className="size-3.5 text-[#E11D48]" />
                        <span>AI Quality Engine</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-xs font-medium text-gray-600">
                      {(["standard", "fast", "ultra_hd"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setQualityMode(mode)}
                          className={`py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                            qualityMode === mode
                              ? "border-[#E11D48] bg-[#FFF5F7] text-[#E11D48] font-medium"
                              : "border-gray-200 hover:border-gray-300 text-gray-700 font-normal"
                          }`}
                        >
                          {mode === "standard" ? "Balanced" : mode === "fast" ? "Fast" : "Ultra HD"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTONS & METRICS */}
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  {cutoutResult ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={downloadResult}
                        className="flex-1 py-3.5 px-5 rounded-full bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] hover:from-[#BE123C] hover:to-[#E11D48] text-white text-xs font-medium shadow-lg shadow-[#E11D48]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Download className="size-4" />
                        <span>Download {bgType === "transparent" ? "Transparent PNG" : "HD Result"}</span>
                      </button>

                      {bgType !== "transparent" && (
                        <select
                          value={downloadFormat}
                          onChange={(e) => setDownloadFormat(e.target.value as ExportFormat)}
                          className="py-3 px-3 rounded-full border border-gray-200 text-xs font-medium bg-white text-gray-800 cursor-pointer shadow-xs focus:ring-1 focus:ring-[#E11D48]"
                        >
                          <option value="png">PNG</option>
                          <option value="jpg">JPG</option>
                          <option value="webp">WebP</option>
                        </select>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3.5 px-5 rounded-full bg-gray-900 hover:bg-black text-white text-xs font-medium shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Upload className="size-4" />
                      <span>Choose An Image</span>
                    </button>
                  )}

                  {/* Trust Micro-Bullets */}
                  <div className="grid grid-cols-2 gap-2 text-[10.5px] font-normal text-gray-500 pt-1">
                    <span className="flex items-center gap-1.5">
                      <Check className="size-3 text-emerald-500 shrink-0" />
                      <span>Zero Quality Loss</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="size-3 text-[#E11D48] shrink-0" />
                      <span>Private &amp; Encrypted</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Zap className="size-3 text-amber-500 shrink-0" />
                      <span>Sub-Pixel AI Matting</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ShoppingBag className="size-3 text-blue-500 shrink-0" />
                      <span>Amazon 100% White</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. BEFORE / AFTER QUALITY SHOWCASE */}
      <section className="py-20 sm:py-28 bg-[#FAFAFB] border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-xs font-medium text-[#E11D48] uppercase tracking-widest mb-2">
              SUB-PIXEL AI MATTING QUALITY
            </p>
            <h2 className="text-3xl sm:text-5xl font-normal text-gray-950 tracking-tight">
              Stunning Results on Hair, Fur &amp; Complex Edges
            </h2>
            <p className="mt-3 text-base text-gray-600 font-normal">
              Slide to inspect how our neural matting isolates difficult strands and textures without halos or jagged cutouts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {SHOWCASE_ITEMS.map((item) => (
              <ShowcaseSlider
                key={item.id}
                image={item.image}
                title={item.title}
                category={item.category}
                description={item.description}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 4. WORKFLOW & PERSONA SECTION */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-xs font-medium text-[#E11D48] uppercase tracking-widest mb-2">
              BUILT FOR EVERY WORKFLOW
            </p>
            <h2 className="text-3xl sm:text-5xl font-normal text-gray-950 tracking-tight">
              One Tool. Endless Possibilities.
            </h2>
            <p className="mt-3 text-base text-gray-600 font-normal">
              Whether you need 100% white backgrounds for your e-commerce store or transparent stickers for social media.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PERSONAS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="rounded-3xl border border-gray-200/90 bg-white p-7 shadow-lg shadow-gray-100/70 flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all"
                >
                  <div>
                    <span
                      className={`size-12 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center mb-5`}
                      style={{ color: p.accent }}
                    >
                      <Icon className="size-6" />
                    </span>
                    <h3 className="text-xl font-medium text-gray-900">{p.title}</h3>
                    <p className="text-xs font-medium text-[#E11D48] mt-0.5">{p.subtitle}</p>
                    <p className="text-xs text-gray-600 mt-3 leading-relaxed font-normal">{p.desc}</p>
                  </div>

                  <ul className="mt-6 pt-5 border-t border-gray-100 space-y-2 text-xs text-gray-600">
                    {p.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                        <span className="font-normal">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS IN 3 STEPS */}
      <section className="py-20 sm:py-28 bg-[#FFF9FA] border-y border-[#FFE4E9]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-xs font-medium text-[#E11D48] uppercase tracking-widest mb-2">
              EFFORTLESS 3-STEP PIPELINE
            </p>
            <h2 className="text-3xl sm:text-5xl font-normal text-gray-950 tracking-tight">
              Remove Backgrounds in 3 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-3xl bg-white p-8 border border-gray-200 shadow-sm text-center">
              <span className="size-14 mx-auto rounded-2xl bg-[#FFF1F4] text-[#E11D48] font-medium text-xl flex items-center justify-center mb-5">
                1
              </span>
              <h3 className="text-lg font-medium text-gray-900">Upload or Paste Image</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed font-normal">
                Drag and drop your JPG, PNG, WebP or HEIC file, or press <kbd className="bg-gray-100 px-1 py-0.5 rounded border text-gray-700 font-normal">Ctrl+V</kbd> from anywhere.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-8 border border-gray-200 shadow-sm text-center">
              <span className="size-14 mx-auto rounded-2xl bg-[#FFF1F4] text-[#E11D48] font-medium text-xl flex items-center justify-center mb-5">
                2
              </span>
              <h3 className="text-lg font-medium text-gray-900">AI Isolates Subject</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed font-normal">
                Our sub-pixel neural matting separates fine hair, jewelry, and products from distracting backdrops in under 5 seconds.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-8 border border-gray-200 shadow-sm text-center">
              <span className="size-14 mx-auto rounded-2xl bg-[#FFF1F4] text-[#E11D48] font-medium text-xl flex items-center justify-center mb-5">
                3
              </span>
              <h3 className="text-lg font-medium text-gray-900">Customize &amp; Download</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed font-normal">
                Export transparent 4K PNGs or instantly replace the background with Amazon-compliant Pure White, studio colors, or scenic backdrops.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. DEVELOPER API CODE SECTION */}
      <section className="py-20 sm:py-28 bg-gray-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#FF4FA3] text-xs font-medium border border-white/15">
                <Code2 className="size-3.5" />
                <span>REST API INTEGRATION</span>
              </span>
              <h2 className="text-3xl sm:text-5xl font-normal tracking-tight leading-tight">
                Integrate Background Removal in 1 Line of Code
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed font-normal">
                Power your web app, e-commerce backend, or mobile tool with our high-speed global endpoints. Zero infrastructure headache.
              </p>
              <div className="pt-2 flex flex-wrap gap-4 text-xs text-gray-400 font-normal">
                <span className="flex items-center gap-1.5">
                  <Check className="size-4 text-emerald-400" /> &lt;800ms Latency
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="size-4 text-emerald-400" /> 99.9% Uptime SLA
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="size-4 text-emerald-400" /> 4K Cutout Support
                </span>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-3xl border border-gray-800 bg-gray-900 shadow-2xl overflow-hidden">
                {/* Code Tabs Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800 bg-gray-950/60">
                  <div className="flex gap-2">
                    {(["curl", "python", "javascript", "php"] as const).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setActiveCodeTab(lang)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase transition-all ${
                          activeCodeTab === lang
                            ? "bg-[#E11D48] text-white shadow-xs"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => copyCode(CODE_SNIPPETS[activeCodeTab])}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <Copy className="size-3.5" />
                    <span>Copy Code</span>
                  </button>
                </div>

                {/* Code Body */}
                <pre className="p-5 sm:p-6 text-xs sm:text-sm font-mono text-pink-200 overflow-x-auto leading-relaxed">
                  <code>{CODE_SNIPPETS[activeCodeTab]}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. COMPREHENSIVE FAQ SECTION */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-medium text-[#E11D48] uppercase tracking-widest mb-2">
              FREQUENTLY ASKED QUESTIONS
            </p>
            <h2 className="text-3xl sm:text-5xl font-normal text-gray-950 tracking-tight">
              Everything You Need to Know
            </h2>
          </div>

          <div className="divide-y divide-gray-200 border-y border-gray-200">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q} className="py-5">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full text-left flex items-center justify-between gap-4 cursor-pointer group"
                  >
                    <span className="text-base sm:text-lg font-medium text-gray-900 group-hover:text-[#E11D48] transition-colors">
                      {item.q}
                    </span>
                    <span className="size-7 rounded-full bg-gray-100 group-hover:bg-[#FFE4E9] group-hover:text-[#E11D48] flex items-center justify-center font-medium text-sm text-gray-600 transition-all shrink-0">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen && (
                    <p className="mt-3 text-sm text-gray-600 leading-relaxed pr-6 animate-in fade-in duration-200 font-normal">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. HIGH-CONVERTING FINAL CTA */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-white to-[#FFF5F7]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] p-8 sm:p-14 text-white text-center shadow-2xl shadow-[#E11D48]/30 relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-medium backdrop-blur-md">
                <Sparkles className="size-3.5" />
                <span>TRY IT TODAY 100% FREE</span>
              </span>

              <h2 className="text-3xl sm:text-5xl font-normal tracking-tight leading-tight">
                Make Every Image Ready to Use in 5 Seconds.
              </h2>

              <p className="text-sm sm:text-base text-white/90 max-w-lg mx-auto leading-relaxed font-normal">
                Join thousands of designers, e-commerce sellers, and photographers saving hours of manual cutout work every day.
              </p>

              <div className="pt-4 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    fileInputRef.current?.click();
                  }}
                  className="px-8 py-3.5 rounded-full bg-white hover:bg-gray-50 text-[#E11D48] text-xs sm:text-sm font-medium shadow-lg transition-all cursor-pointer flex items-center gap-2"
                >
                  <Upload className="size-4" />
                  <span>Upload Image Free</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
