"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect, ChangeEvent, PointerEvent } from "react";
import {
  Sparkles,
  ArrowRight,
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
  AlertTriangle,
  Play,
} from "lucide-react";
import { BackgroundProcessing } from "@/components/studio/BackgroundProcessing";
import { SelectionStudio, type EditingMode } from "@/components/studio/SelectionStudio";
import { PinkScanLoader } from "@/components/site/PinkScanLoader";
import { ProcessingDots } from "@/components/ui/ProcessingDots";
import { BackgroundRemoverTrustVideos } from "@/components/site/BackgroundRemoverTrustVideos";
import { HowItWorksGuide } from "@/components/site/HowItWorksGuide";
import { howItWorksGuides } from "@/data/howItWorksGuides";
import {
  removeImageBackground,
  recompositeCutout,
  SOLID_COLOR_PRESETS,
  BACKDROP_PRESETS,
  type BackgroundType,
  type CutoutResult,
} from "@/lib/backgroundRemoverEngine";
import { getDownloadUrl, type QualityMode, type ExportFormat } from "@/lib/backgroundApi";
import { handleEditInCanva, CANVA_TERMS_URL } from "@/lib/canvaIntegration";
import { useUserStore } from "@/lib/userStore";
import { reserveLocal, finishLocal } from "@/lib/account-processing";
import { createThumbnailDataUrl, saveMediaBlob } from "@/lib/historyDb";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { RemoveBgStudioEditor } from "@/components/studio/editor/RemoveBgStudioEditor";

export const Route = createFileRoute("/background-remover")({
  head: () => ({
    meta: [
      { title: "AI Background Remover — Remove Image Background Online Free | Bellix.us" },
      {
        name: "description",
        content:
          "Remove image backgrounds online in seconds with AI. Get clean, transparent PNG cutouts for portraits, products, pets, and more. No signup required — upload and download instantly.",
      },
      { rel: "canonical", href: "https://www.bellix.us/background-remover" },
      { property: "og:url", content: "https://www.bellix.us/background-remover" },
      {
        property: "og:title",
        content: "AI Background Remover — Remove Image Background Online Free",
      },
      {
        property: "og:description",
        content:
          "Remove image backgrounds automatically with AI. Get clean transparent PNGs for portraits, products, and more. Free to use.",
      },
      { property: "og:image", content: "https://www.bellix.us/og-image.jpg" },
      { property: "og:image:secure_url", content: "https://www.bellix.us/og-image.jpg" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Bellix.us — AI Background Remover" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "AI Background Remover — Remove Image Background Online Free",
      },
      {
        name: "twitter:description",
        content:
          "Remove image backgrounds automatically with AI. Get clean transparent PNGs for portraits, products, and more.",
      },
      { name: "twitter:image", content: "https://www.bellix.us/og-image.jpg" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "AI Background Remover",
          url: "https://www.bellix.us/background-remover",
          applicationCategory: "ImageEditor",
          operatingSystem: "Web",
          description:
            "Remove image backgrounds automatically with AI. Supports portraits, products, pets, and complex edges. Download transparent PNG cutouts.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          provider: { "@type": "Organization", name: "Bellix.us", url: "https://www.bellix.us/" },
        }),
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
    id: "cars",
    category: "AUTOMOTIVE & COMPLEX REFLECTIONS",
    title: "Exotic Supercar Silhouette",
    description:
      "Preserves aerodynamic curves, glossy tinted glass reflections, alloy spokes, and ground contact shadows.",
    originalImage: "/showcase/cars_original.jpg",
    cutoutImage: "/showcase/cars_transparent.png",
  },
  {
    id: "shoes",
    category: "E-COMMERCE & STREETWEAR",
    title: "High-Top Sneaker Edge Isolation",
    description:
      "Razor-sharp contours through rubber soles, shoelaces, and micro-textures ready for Amazon & Shopify.",
    originalImage: "/showcase/shoes_original.jpg",
    cutoutImage: "/showcase/shoes_transparent.png",
  },
  {
    id: "people",
    category: "FINE HAIR & STUDIO PORTRAITS",
    title: "Studio Model Hair Matting",
    description:
      "Micro-strand isolation capturing every flowing hair wisp and delicate edge without halos or jagged cuts.",
    originalImage: "/showcase/people_original.jpg",
    cutoutImage: "/showcase/people_transparent.png",
  },
  {
    id: "animals",
    category: "PETS & ULTRA-SOFT FUR",
    title: "Fluffy Pet Fur & Whisker Details",
    description:
      "Zero plastic blur on fine animal fur, whisker tips, and ear fluff over clean transparent PNG export.",
    originalImage: "/showcase/animals_original.jpg",
    cutoutImage: "/showcase/animals_transparent.png",
  },
];

const PERSONAS = [
  {
    icon: UserCheck,
    title: "Individuals & Creators",
    subtitle: "Avatars, Stickers & Socials",
    desc: "Create professional LinkedIn profile headshots, transparent WhatsApp/iMessage stickers, and eye-catching YouTube thumbnail cutouts in seconds.",
    bullets: [
      "One-click profile photo background blur",
      "Transparent PNG for stickers and memes",
      "Instant creator cutouts for banners",
    ],
    color: "from-[#FFF1F4] to-[#FFE4E9]",
    accent: "#E11D48",
  },
  {
    icon: ShoppingBag,
    title: "E-Commerce & Marketplaces",
    subtitle: "Amazon, Shopify & eBay",
    desc: "100% pure white background compliance for Amazon, Google Shopping, and Shopify. Increase conversion rates with studio-grade product presentations.",
    bullets: [
      "Batch background removal for catalogs",
      "Pure white (#FFFFFF) export in 1 click",
      "Crisp jewelry, sneaker & apparel edges",
    ],
    color: "from-[#F0FDF4] to-[#DCFCE7]",
    accent: "#16A34A",
  },
  {
    icon: Camera,
    title: "Photographers & Studios",
    subtitle: "Retouching 10x Faster",
    desc: "Replace tedious Photoshop pen-tool clipping paths. Speed up client deliveries by processing dozens of portraits and weddings automatically.",
    bullets: [
      "Sub-pixel hair and veil edge matting",
      "Replace backdrop with luxury studio sets",
      "Preserves original 4K/8K resolution",
    ],
    color: "from-[#EFF6FF] to-[#DBEAFE]",
    accent: "#2563EB",
  },
  {
    icon: Layers,
    title: "Marketers & Designers",
    subtitle: "Pitch Decks & Ad Campaigns",
    desc: "Drop isolated subjects straight into Figma, Canva, or Photoshop. Build high-converting social media creatives and promotional posters effortlessly.",
    bullets: [
      "Transparent PNG with drag-and-drop",
      "Custom brand color background swap",
      "Pixel-perfect composition ready",
    ],
    color: "from-[#FAF5FF] to-[#F3E8FF]",
    accent: "#9333EA",
  },
  {
    icon: Code2,
    title: "Developers & Enterprise",
    subtitle: "High-Throughput REST API",
    desc: "Integrate automatic background removal directly into your SaaS, e-commerce platform, or mobile app with our fast, reliable REST API.",
    bullets: [
      "Sub-second processing response time",
      "99.9% uptime SLA with global endpoints",
      "SDKs for Python, Node.js, cURL & PHP",
    ],
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

export const LIGHT_CHECKERBOARD = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect width='12' height='12' fill='%23ffffff'/%3E%3Crect x='12' width='12' height='12' fill='%23f1f5f9'/%3E%3Crect y='12' width='12' height='12' fill='%23f1f5f9'/%3E%3Crect x='12' y='12' width='12' height='12' fill='%23ffffff'/%3E%3C/svg%3E")`;

function ShowcaseSlider({
  originalImage,
  cutoutImage,
  title,
  category,
  description,
}: {
  originalImage: string;
  cutoutImage: string;
  title: string;
  category: string;
  description: string;
}) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const updatePos = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setPosition(pct);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePos(e.clientX);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current || e.currentTarget.hasPointerCapture(e.pointerId)) {
      updatePos(e.clientX);
    }
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // noop
    }
  };

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    if (e.touches[0]) updatePos(e.touches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isDraggingRef.current && e.touches[0]) {
      updatePos(e.touches[0].clientX);
    }
  };

  const onTouchEnd = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="rounded-xl border-[3px] border-[#0b0f0d] bg-white shadow-[6px_6px_0px_#0b0f0d] overflow-hidden transition-all duration-150 hover:translate-y-[-2px] flex flex-col">
      <div
        ref={containerRef}
        role="slider"
        aria-label={`${title} comparison`}
        aria-valuenow={Math.round(position)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setPosition((p) => Math.max(0, p - 5));
          if (e.key === "ArrowRight") setPosition((p) => Math.min(100, p + 5));
        }}
        className="relative aspect-16/10 w-full overflow-hidden cursor-ew-resize select-none touch-none bg-[#f7f5ee] focus:outline-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {/* RIGHT / AFTER: Transparent Checkerboard Background */}
        <div
          className="absolute inset-0 size-full pointer-events-none"
          style={{
            backgroundImage: LIGHT_CHECKERBOARD,
            backgroundSize: "20px 20px",
          }}
        />

        {/* AFTER LAYER: Actual Transparent PNG Cutout */}
        <img
          src={cutoutImage}
          alt={`${title} cutout`}
          className="absolute inset-0 size-full object-cover select-none pointer-events-none"
          decoding="async"
        />

        {/* BEFORE LAYER: Original Image (Clipped from right edge based on position) */}
        <div
          className="absolute inset-0 size-full overflow-hidden pointer-events-none select-none"
          style={{
            clipPath: `inset(0 calc(100% - ${position}%) 0 0)`,
            WebkitClipPath: `inset(0 calc(100% - ${position}%) 0 0)`,
          }}
        >
          <img
            src={originalImage}
            alt={`${title} original`}
            className="absolute inset-0 size-full object-cover select-none pointer-events-none"
            decoding="async"
          />
        </div>

        {/* BADGES */}
        {/* Left Badge: ORIGINAL */}
        <div className="absolute top-3.5 left-3.5 z-20 pointer-events-none select-none">
          <span className="inline-flex items-center px-3 py-1 rounded-md bg-white text-[#0b0f0d] text-xs font-black tracking-wider uppercase shadow-[2px_2px_0px_#0b0f0d] border-2 border-[#0b0f0d]">
            ORIGINAL
          </span>
        </div>

        {/* Right Badge: TRANSPARENT PNG */}
        <div className="absolute top-3.5 right-3.5 z-20 pointer-events-none select-none">
          <span className="inline-flex items-center px-3 py-1 rounded-md bg-[#d0f471] text-[#0b0f0d] text-xs font-black tracking-wider uppercase shadow-[2px_2px_0px_#0b0f0d] border-2 border-[#0b0f0d]">
            TRANSPARENT PNG
          </span>
        </div>

        {/* DIVIDER & ↔ HANDLE */}
        <div
          className="absolute top-0 bottom-0 w-[3px] bg-[#0b0f0d] z-20 pointer-events-none"
          style={{ left: `${position}%` }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-11 sm:size-12 rounded-lg bg-[#d0f471] border-[2.5px] border-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] flex items-center justify-center text-[#0b0f0d] select-none">
            <ChevronLeft className="size-4 -mr-0.5" />
            <ChevronRight className="size-4 -ml-0.5" />
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 bg-white border-t-[3px] border-[#0b0f0d] flex-1 flex flex-col justify-between">
        <div>
          <p className="inline-block px-2.5 py-0.5 rounded bg-[#ffe500] border border-[#0b0f0d] text-xs font-black text-[#0b0f0d] uppercase tracking-wider font-mono">
            {category}
          </p>
          <h3 className="text-2xl sm:text-3xl font-black text-[#0b0f0d] mt-3 tracking-tight">
            {title}
          </h3>
          <p className="text-base sm:text-lg text-[#1f2924] mt-2 leading-relaxed font-medium">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function WorkspaceSplitSlider({
  originalUrl,
  cutoutUrl,
  bgType,
  dimensions,
}: {
  originalUrl: string;
  cutoutUrl: string;
  bgType: BackgroundType;
  dimensions?: { width: number; height: number; aspectRatio: string } | null;
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

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches[0]) updatePos(e.touches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches[0]) updatePos(e.touches[0].clientX);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center select-none cursor-ew-resize touch-none mx-auto bg-slate-100"
      style={{
        aspectRatio: dimensions ? dimensions.aspectRatio : "4 / 3",
        maxHeight: "min(65vh, 480px)",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
    >
      {/* Checkerboard Pattern for Transparent */}
      {bgType === "transparent" && (
        <div
          className="absolute inset-0 size-full pointer-events-none"
          style={{
            backgroundImage: LIGHT_CHECKERBOARD,
            backgroundSize: "20px 20px",
          }}
        />
      )}

      {/* After Cutout (Full Canvas) */}
      <img
        src={cutoutUrl}
        alt="AI Cutout"
        className="absolute inset-0 size-full object-contain pointer-events-none select-none"
      />

      {/* Before Original (Clipped to left side without distortion) */}
      <div
        className="absolute inset-0 size-full overflow-hidden pointer-events-none select-none"
        style={{
          clipPath: `inset(0 calc(100% - ${position}%) 0 0)`,
          WebkitClipPath: `inset(0 calc(100% - ${position}%) 0 0)`,
        }}
      >
        <img
          src={originalUrl}
          alt="Original"
          className="absolute inset-0 size-full object-contain pointer-events-none select-none"
        />
      </div>

      {/* Badges */}
      <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-900/80 text-white text-xs font-bold backdrop-blur-md z-20 pointer-events-none">
        ORIGINAL
      </span>
      <span className="absolute top-3 right-3 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold backdrop-blur-md shadow-xs z-20 pointer-events-none">
        {bgType === "transparent" ? "TRANSPARENT" : "CLEANED"}
      </span>

      {/* Divider */}
      <div
        className="absolute top-0 bottom-0 w-[3px] bg-emerald-500 z-20 pointer-events-none shadow-[0_0_10px_rgba(34,197,94,0.8)]"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 rounded-full bg-white border-2 border-emerald-500 shadow-md flex items-center justify-center text-emerald-700">
          <ChevronLeft className="size-3.5 -mr-0.5" />
          <ChevronRight className="size-3.5 -ml-0.5" />
        </div>
      </div>
    </div>
  );
}

type ShowcaseCategory = "people" | "products" | "shoes" | "animals" | "cars" | "graphics";

const SEE_DIFFERENCE_CATEGORIES: { id: ShowcaseCategory; label: string }[] = [
  { id: "people", label: "People" },
  { id: "products", label: "Products" },
  { id: "shoes", label: "Shoes" },
  { id: "animals", label: "Animals" },
  { id: "cars", label: "Cars" },
  { id: "graphics", label: "Graphics" },
];

const SEE_DIFFERENCE_DATA: Record<
  ShowcaseCategory,
  {
    subject: string;
    original: string;
    transparent: string;
    newBg: string;
    collage: string;
    descriptions: {
      original: string;
      transparent: string;
      newBg: string;
      collage: string;
    };
  }
> = {
  shoes: {
    subject: "Designer Sneaker",
    original: "/showcase/shoes_original.jpg",
    transparent: "/showcase/shoes_transparent.png",
    newBg: "/showcase/shoes_new_bg.jpg",
    collage: "/showcase/shoes_collage.jpg",
    descriptions: {
      original: "Commercial studio photograph with concrete floor & studio lighting",
      transparent: "100% transparent PNG with razor-sharp sole, stitch & lace edges",
      newBg: "Composited into luxury gradient studio with realistic contact shadow",
      collage: "Four distinct environments: Minimal, Dark, Urban & Creative Pop",
    },
  },
  people: {
    subject: "Fashion Model Portrait",
    original: "/showcase/people_original.jpg",
    transparent: "/showcase/people_transparent.png",
    newBg: "/showcase/people_new_bg.jpg",
    collage: "/showcase/people_collage.jpg",
    descriptions: {
      original: "Editorial fashion portrait with tailored coat & natural lighting",
      transparent: "Flyaway hair wisps and fine coat contours isolated seamlessly",
      newBg: "Placed into modern architectural studio with directional light",
      collage: "Four distinct backdrops for lookbooks, social & advertising",
    },
  },
  products: {
    subject: "AURA Luxury Fragrance",
    original: "/showcase/products_original.jpg",
    transparent: "/showcase/products_transparent.png",
    newBg: "/showcase/products_new_bg.jpg",
    collage: "/showcase/products_collage.jpg",
    descriptions: {
      original: "E-commerce catalog photo with stone pedestal & botanical branch",
      transparent: "Stone & foliage removed, frosted glass & metallic cap preserved",
      newBg: "Clean e-commerce hero shot with ambient studio soft lighting",
      collage: "Multiple high-converting advertising scenes in seconds",
    },
  },
  animals: {
    subject: "Playful Golden Beagle",
    original: "/showcase/animals_original.jpg",
    transparent: "/showcase/animals_transparent.png",
    newBg: "/showcase/animals_new_bg.jpg",
    collage: "/showcase/animals_collage.jpg",
    descriptions: {
      original: "Natural outdoor portrait with soft background blur & greenery",
      transparent: "Individual whiskers, fur fringes & ear contours cleanly isolated",
      newBg: "Studio pet portrait with gentle floor contact shadow",
      collage: "Fun, commercial & editorial backgrounds for print and digital",
    },
  },
  cars: {
    subject: "White Roadster Supercar",
    original: "/showcase/cars_original.jpg",
    transparent: "/showcase/cars_transparent.png",
    newBg: "/showcase/cars_new_bg.jpg",
    collage: "/showcase/cars_collage.jpg",
    descriptions: {
      original: "Commercial showroom photograph with ceiling fixtures & columns",
      transparent: "Showroom removed, aerodynamic body & tinted glass isolated",
      newBg: "Clean dealership showroom banner with realistic ground shadow",
      collage: "Creative ad variants for social, web banners & brochures",
    },
  },
  graphics: {
    subject: "3D Glassmorphic Cube",
    original: "/showcase/graphics_original.jpg",
    transparent: "/showcase/graphics_transparent.png",
    newBg: "/showcase/graphics_new_bg.jpg",
    collage: "/showcase/graphics_collage.jpg",
    descriptions: {
      original: "3D render with off-white textured backdrop and subtle shadows",
      transparent: "Crisp vector-sharp edges with translucent glass preserved",
      newBg: "Floating branding icon with modern soft ambient glow",
      collage: "Versatile marketing assets ready for any background palette",
    },
  },
};

function SeeTheDifferenceShowcase() {
  const [activeCategory, setActiveCategory] = useState<ShowcaseCategory>("shoes");
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleSelectCategory = (cat: ShowcaseCategory) => {
    if (cat === activeCategory) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveCategory(cat);
      setIsTransitioning(false);
    }, 180);
  };

  const current = SEE_DIFFERENCE_DATA[activeCategory];

  const cards = [
    {
      label: "Original",
      step: "01",
      image: current.original,
      isTransparent: false,
      desc: current.descriptions.original,
    },
    {
      label: "Transparent background",
      step: "02",
      image: current.transparent,
      isTransparent: true,
      desc: current.descriptions.transparent,
    },
    {
      label: "New background",
      step: "03",
      image: current.newBg,
      isTransparent: false,
      desc: current.descriptions.newBg,
    },
    {
      label: "Endless possibilities",
      step: "04",
      image: current.collage,
      isTransparent: false,
      desc: current.descriptions.collage,
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-[#f7f5ee] border-t-[3px] border-[#0b0f0d]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* SECTION TITLE & SUBTITLE */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0b0f0d] tracking-tight">
            See the Difference
          </h2>
          <p className="mt-3 text-base sm:text-lg text-[#1f2924] font-medium">
            Remove backgrounds in seconds. Create professional images for every purpose.
          </p>
        </div>

        {/* CATEGORY TABS */}
        <div className="flex items-center justify-center mb-10 sm:mb-14">
          <div className="inline-flex p-1.5 rounded-xl bg-white border-[2.5px] border-[#0b0f0d] max-w-full overflow-x-auto scrollbar-none gap-1.5 shadow-[4px_4px_0px_#0b0f0d]">
            {SEE_DIFFERENCE_CATEGORIES.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-black transition-all duration-150 cursor-pointer whitespace-nowrap border-2 ${active
                    ? "bg-[#d0f471] text-[#0b0f0d] border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]"
                    : "border-transparent text-[#0b0f0d] hover:bg-[#f7f5ee]"
                    }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 CARDS IN ONE HORIZONTAL ROW */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 transition-all duration-300 ${isTransitioning
            ? "opacity-30 translate-y-2 scale-[0.99]"
            : "opacity-100 translate-y-0 scale-100"
            }`}
        >
          {cards.map((card) => (
            <div
              key={card.label}
              className="group rounded-xl border-[2.5px] border-[#0b0f0d] bg-white p-5 sm:p-6 shadow-[5px_5px_0px_#0b0f0d] hover:-translate-y-1 transition-all duration-150 flex flex-col justify-between"
            >
              <div>
                {/* Image Frame */}
                <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-[#f7f5ee] border-2 border-[#0b0f0d] flex items-center justify-center select-none">
                  {/* Subtle Checkerboard for Card 2 */}
                  {card.isTransparent && (
                    <div
                      className="absolute inset-0 size-full pointer-events-none"
                      style={{
                        backgroundImage: LIGHT_CHECKERBOARD,
                        backgroundSize: "20px 20px",
                      }}
                    />
                  )}

                  <img
                    src={card.image}
                    alt={`${card.label} - ${current.subject}`}
                    className={`size-full transition-transform duration-500 group-hover:scale-104 select-none pointer-events-none ${card.isTransparent ? "object-contain p-2 sm:p-3" : "object-cover"
                      }`}
                    loading="lazy"
                    decoding="async"
                  />

                  {/* Stage Number Badge */}
                  <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-md bg-[#ffe500] text-[#0b0f0d] text-xs font-black tracking-wider border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]">
                    {card.step}
                  </span>
                </div>

                {/* Card Title */}
                <h3 className="text-xl sm:text-2xl font-black text-[#0b0f0d] mt-4 tracking-tight">
                  {card.label}
                </h3>

                {/* Card Description */}
                <p className="text-sm sm:text-base text-[#1f2924] font-medium mt-2 leading-relaxed">
                  {card.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA BELOW SHOWCASE */}
        <div className="mt-12 sm:mt-16 text-center flex flex-col items-center justify-center">
          <p className="text-xs sm:text-sm font-black text-[#0b0f0d] uppercase tracking-widest mb-3">
            Try it yourself
          </p>
          <Link
            to="/background-remover/sample-images"
            className="group inline-flex items-center gap-2.5 rounded-xl bg-[#d0f471] hover:bg-[#ffe500] text-[#0b0f0d] font-black text-base px-8 py-4 border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] transition-all cursor-pointer"
          >
            <span>See more samples</span>
            <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export type BackgroundRemovalStatus =
  "idle" | "uploading" | "processing" | "revealing" | "selecting" | "success" | "error";

function CanvaLogoIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="canva-gradient-icon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00C4CC" />
          <stop offset="50%" stopColor="#0074E4" />
          <stop offset="100%" stopColor="#7D2AE8" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#canva-gradient-icon)" />
      <path
        d="M15 13.6c-.7.8-1.7 1.2-2.8 1.2-2.1 0-3.6-1.4-3.6-3.6 0-2.2 1.5-3.8 3.7-3.8 1 0 1.8.3 2.5.9l-.9 1.1c-.5-.4-1.1-.7-1.7-.7-1.3 0-2.2 2.4-2.2 2.4s.9 2.4 2.2 2.4c.7 0 1.3-.3 1.8-.7l1 1.1z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

function formatCutoutFilename(originalName: string, ext: string = "png"): string {
  const cleanBase = originalName
    .replace(/\.[^/.]+$/, "")
    .replace(/[^\w\s\-_]/gi, "")
    .trim()
    .replaceAll(/\s+/g, "-")
    .toLowerCase();

  return `bellix-background-removed-${cleanBase || "cutout"}.${ext}`;
}

export interface ImageDimensions {
  width: number;
  height: number;
  orientation: "landscape" | "portrait" | "square";
  aspectRatio: string;
}

export interface ProcessedSessionItem {
  id: string;
  file: File;
  originalUrl: string;
  cutoutResult: CutoutResult;
  dimensions: ImageDimensions;
  timestamp: number;
}

function formatBytes(bytes: number, decimals: number = 1): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

type InlineErrorState =
  | {
    message: string;
    action?: {
      label: string;
      to: string;
    };
  }
  | string
  | null;

// Helper to safely fetch an image from a URL, Base64 data URL, or Blob URL
async function fetchImageFromUrl(url: string): Promise<File | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network response was not ok");
    const blob = await res.blob();
    if (!blob.type.startsWith("image/") && blob.type !== "application/octet-stream") {
      return null;
    }
    const cleanUrl = url.split("?")[0].split("#")[0];
    let filename = cleanUrl.split("/").pop() || "pasted-image.png";
    if (!filename.includes(".")) {
      filename += ".png";
    }
    return new File([blob], filename, {
      type: blob.type.startsWith("image/") ? blob.type : "image/png",
    });
  } catch (err) {
    console.warn("Failed to fetch image directly from URL:", err);
    return null;
  }
}

// Convert unusual image types (BMP, TIFF, AVIF, JFIF, SVG, ICO) to clean PNG for the AI engine
async function normalizeImageFile(file: File): Promise<File> {
  const isSpecialFormat =
    /\.(bmp|tiff?|jfif|svg|avif|ico)$/i.test(file.name) ||
    ["image/bmp", "image/tiff", "image/svg+xml", "image/x-icon", "image/avif"].includes(file.type);

  if (!isSpecialFormat) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0);
      const convertedBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (convertedBlob) {
        const newName = file.name.replace(/\.[^/.]+$/, "") + ".png";
        return new File([convertedBlob], newName, { type: "image/png" });
      }
    }
  } catch (err) {
    console.warn("Image canvas normalization fallback:", err);
  }
  return file;
}

export default function BackgroundRemoverPage() {
  const [editingMode, setEditingMode] = useState<EditingMode>("background");
  const [selectionPurpose, setSelectionPurpose] = useState<"inpaint" | "foreground">("inpaint");
  const [preserveExistingAlpha, setPreserveExistingAlpha] = useState(true);
  const ownedUrls = useRef(new Set<string>());
  const [status, setStatus] = useState<BackgroundRemovalStatus>("idle");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [cutoutResult, setCutoutResult] = useState<CutoutResult | null>(null);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [sessionHistory, setSessionHistory] = useState<ProcessedSessionItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Analyzing subject");
  const [inlineError, setInlineError] = useState<InlineErrorState>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Background customization state
  const [bgType, setBgType] = useState<BackgroundType>("transparent");
  const [solidColor, setSolidColor] = useState("#FFFFFF");
  const [qualityMode, setQualityMode] = useState<QualityMode>("standard");
  const [viewMode, setViewMode] = useState<"after" | "before">("after");
  const [isCanvaLoading, setIsCanvaLoading] = useState(false);

  // Code snippet tabs & FAQ accordion
  const [activeCodeTab, setActiveCodeTab] = useState<keyof typeof CODE_SNIPPETS>("curl");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestVersion = useRef(0);
  const uploadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { user, deductCredit, addJob } = useUserStore();

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      for (const url of ownedUrls.current) URL.revokeObjectURL(url);
      if (sourceUrl && sourceUrl.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
      if (cutoutResult?.transparentBlobUrl?.startsWith("blob:"))
        URL.revokeObjectURL(cutoutResult.transparentBlobUrl);
      if (cutoutResult?.compositeBlobUrl?.startsWith("blob:"))
        URL.revokeObjectURL(cutoutResult.compositeBlobUrl);
      requestVersion.current++;
      if (uploadTimer.current) clearTimeout(uploadTimer.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Validation & initialization
  const handleIncomingFile = async (rawFile: File) => {
    const version = ++requestVersion.current;
    abortControllerRef.current?.abort();
    if (uploadTimer.current) clearTimeout(uploadTimer.current);
    setInlineError(null);

    // 1. Check if user accidentally uploaded/pasted a video
    const isVideo =
      rawFile.type.startsWith("video/") ||
      /\.(mp4|mov|webm|avi|mpg|mpeg|mkv|m4v|3gp|flv)$/i.test(rawFile.name);

    if (isVideo) {
      setInlineError({
        message: `Video file detected ("${rawFile.name || "video"}"). Background Remover is for photos & images.`,
        action: {
          label: "Open Video Remover",
          to: "/gemini-video-watermark-remover",
        },
      });
      return;
    }

    // 2. Check if user accidentally uploaded/pasted a PDF
    const isPdf = rawFile.type.includes("pdf") || /\.pdf$/i.test(rawFile.name);

    if (isPdf) {
      setInlineError({
        message: `PDF document detected ("${rawFile.name || "document"}"). Background remover supports image formats (PNG, JPG, WebP).`,
      });
      return;
    }

    // 3. MIME type & extension check
    const validMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
      "image/avif",
      "image/bmp",
      "image/tiff",
      "image/gif",
      "image/svg+xml",
      "image/x-icon",
      "image/jfif",
    ];
    const isImage =
      rawFile.type.startsWith("image/") ||
      validMimes.includes(rawFile.type.toLowerCase()) ||
      /\.(jpe?g|png|webp|heic|heif|avif|bmp|tiff?|gif|svg|jfif|ico)$/i.test(rawFile.name);

    if (!isImage) {
      setInlineError({
        message: "Unsupported file format. Please upload PNG, JPG, WebP, AVIF, HEIC, or BMP.",
      });
      return;
    }

    // Size limit check (35MB)
    const MAX_SIZE_BYTES = 35 * 1024 * 1024;
    if (rawFile.size > MAX_SIZE_BYTES) {
      setInlineError({
        message: "Image exceeds the 35MB limit. Please upload a smaller photo.",
      });
      return;
    }

    // Normalize image format (converts BMP/TIFF/AVIF to PNG for universal engine compatibility)
    const file = await normalizeImageFile(rawFile);

    if (version !== requestVersion.current) return;

    const objectUrl = URL.createObjectURL(file);
    ownedUrls.current.add(objectUrl);

    // Automatic dimension and orientation detection
    let detectedDims: ImageDimensions = {
      width: 800,
      height: 600,
      orientation: "landscape",
      aspectRatio: "4 / 3",
    };
    try {
      const probe = new Image();
      await new Promise<void>((resolve, reject) => {
        probe.onload = () => {
          const w = probe.naturalWidth || 800;
          const h = probe.naturalHeight || 600;
          if (w * h > 32_000_000) {
            reject(new Error("Image exceeds the 32 megapixel processing limit."));
            return;
          }
          const orientation: "landscape" | "portrait" | "square" =
            w > h ? "landscape" : h > w ? "portrait" : "square";
          detectedDims = {
            width: w,
            height: h,
            orientation,
            aspectRatio: `${w} / ${h}`,
          };
          resolve();
        };
        probe.onerror = () =>
          reject(new Error("This image could not be decoded. Please try a PNG, JPG or WebP file."));
        probe.src = objectUrl;
      });
    } catch (e) {
      URL.revokeObjectURL(objectUrl);
      setInlineError(e instanceof Error ? e.message : "Could not decode this image.");
      return;
    }

    if (version !== requestVersion.current) {
      URL.revokeObjectURL(objectUrl);
      return;
    }
    setUploadedFile(file);
    setSourceUrl(objectUrl);
    setImageDimensions(detectedDims);
    setCutoutResult(null);
    setViewMode("after");

    // Step 1: Upload Complete State (Show immediate preview with file specs)
    setStatus(editingMode === "background" ? "uploading" : "selecting");
    setStage("Upload complete — initializing AI...");
    setProgress(10);

    // Step 2: Smooth transition to AI Processing (Scanning line)
    if (editingMode !== "background") return;
    uploadTimer.current = setTimeout(() => {
      if (version === requestVersion.current) executeRemoval(objectUrl, file, detectedDims);
    }, 350);
  };

  // Globalpaste support & global drag-and-drop window guard
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      // 1. Check clipboard files (Ctrl+C from Windows Explorer or Mac Finder)
      const clipFiles = Array.from(e.clipboardData?.files || []);
      if (clipFiles.length > 0) {
        const targetFile = clipFiles[0];
        e.preventDefault();
        await handleIncomingFile(targetFile);
        toast.success("Pasted file from clipboard!");
        return;
      }

      // 2. Check clipboard items (Right-click "Copy Image", screenshots, Snipping tool)
      const items = Array.from(e.clipboardData?.items || []);
      const imgItem = items.find((item) => item.type.startsWith("image/"));
      if (imgItem) {
        const file = imgItem.getAsFile();
        if (file) {
          e.preventDefault();
          await handleIncomingFile(file);
          toast.success("Pasted image from clipboard!");
          return;
        }
      }

      // 3. Check for video item in clipboard items
      const videoItem = items.find((item) => item.type.startsWith("video/"));
      if (videoItem) {
        const file = videoItem.getAsFile();
        if (file) {
          e.preventDefault();
          await handleIncomingFile(file);
          return;
        }
      }

      // 4. Check for Image URL or plain text in clipboard (Copy Image Address, direct image links)
      const pastedText = e.clipboardData?.getData("text/plain")?.trim();
      if (pastedText) {
        if (
          pastedText.startsWith("data:image/") ||
          /^https?:\/\/.*\.(png|jpe?g|webp|avif|gif|svg|bmp)(\?.*)?$/i.test(pastedText) ||
          (pastedText.startsWith("http") &&
            (pastedText.includes("unsplash.com") ||
              pastedText.includes("cloudinary") ||
              pastedText.includes("images") ||
              pastedText.includes("cdn")))
        ) {
          e.preventDefault();
          toast.info("Loading image from URL...");
          const fileFromUrl = await fetchImageFromUrl(pastedText);
          if (fileFromUrl) {
            await handleIncomingFile(fileFromUrl);
            toast.success("Loaded image from link!");
            return;
          } else {
            setInlineError({
              message:
                "Could not load image directly from that link due to web security. Try right-clicking the image > 'Copy Image' > Ctrl+V here.",
            });
            return;
          }
        }
      }

      // 5. Check for HTML containing <img> (when copying images or rich web selections)
      const pastedHtml = e.clipboardData?.getData("text/html");
      if (pastedHtml) {
        const match = pastedHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (match && match[1]) {
          const src = match[1];
          e.preventDefault();
          toast.info("Extracting image from clipboard...");
          const fileFromUrl = await fetchImageFromUrl(src);
          if (fileFromUrl) {
            await handleIncomingFile(fileFromUrl);
            toast.success("Loaded image from clipboard!");
            return;
          }
        }
      }
    };

    const preventWindowDrop = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener("paste", handlePaste);
    window.addEventListener("dragover", preventWindowDrop);
    window.addEventListener("drop", preventWindowDrop);

    return () => {
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener("dragover", preventWindowDrop);
      window.removeEventListener("drop", preventWindowDrop);
    };
  }, [
    bgType,
    solidColor,
    qualityMode,
    sourceUrl,
    cutoutResult,
    editingMode,
    preserveExistingAlpha,
  ]);

  // Smoothly center the studio editor in viewport on success
  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => {
        const el = document.getElementById("studio-editor-viewport");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const executeRemoval = async (imageUrl: string, file: File, dims?: ImageDimensions) => {
    let accountJob: string | undefined;

    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const version = requestVersion.current;

    setStatus("processing");
    setProgress(15);
    setStage("Preparing image...");

    try {
      const reservation = await reserveLocal("background-remover", file.size).catch(() => null);
      accountJob = reservation?.id || undefined;
      controller.signal.throwIfAborted();
      const res = await removeImageBackground(
        imageUrl,
        bgType,
        solidColor,
        "luxury-studio",
        (nextStage) => {
          if (controller.signal.aborted || version !== requestVersion.current) return;
          setStage(
            nextStage.includes("Preparing image")
              ? "Preparing image..."
              : nextStage.includes("PNG") || nextStage === "Ready"
                ? "Preparing transparent result..."
                : "Analyzing image...",
          );
        },
        preserveExistingAlpha ? "auto" : "portrait",
        controller.signal,
      );

      controller.signal.throwIfAborted();
      if (version !== requestVersion.current) return;
      if (dims && (res.width !== dims.width || res.height !== dims.height)) {
        throw new Error("The result dimensions differ from your original. Please retry.");
      }
      if (accountJob) await finishLocal(accountJob, true).catch(() => { });
      controller.signal.throwIfAborted();
      setCutoutResult(res);
      ownedUrls.current.add(res.transparentBlobUrl);
      ownedUrls.current.add(res.compositeBlobUrl);
      setStage("Preparing transparent result...");
      setStatus("revealing");

      const finalDims = dims ||
        imageDimensions || {
        width: res.width,
        height: res.height,
        orientation: res.width > res.height ? "landscape" : "portrait",
        aspectRatio: `${res.width} / ${res.height}`,
      };
      setImageDimensions(finalDims);

      const newItem: ProcessedSessionItem = {
        id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        file,
        originalUrl: imageUrl,
        cutoutResult: res,
        dimensions: finalDims,
        timestamp: Date.now(),
      };
      setSessionHistory((prev) => [newItem, ...prev]);
      setActiveItemId(newItem.id);

      let thumbUrl = "";
      try {
        thumbUrl = await createThumbnailDataUrl(
          res.transparentBlob || res.transparentBlobUrl,
          320,
          0.8,
        );
      } catch (e) {
        console.warn("Thumbnail generation error:", e);
      }

      if (controller.signal.aborted || version !== requestVersion.current) return;
      const newJob = addJob({
        file_name: file.name,
        file_type: "background-remover",
        tool_name: "AI Background Remover",
        status: "completed",
        quality: `Transparent (${res.width}×${res.height})`,
        credits_used: 1,
        processing_time: res.processingTimeMs
          ? `${(res.processingTimeMs / 1000).toFixed(1)}s`
          : "0.8s",
        file_url: imageUrl,
        result_url: res.transparentBlobUrl,
        thumbnail_url: thumbUrl,
      });

      if (res.transparentBlob) {
        saveMediaBlob(newJob.id, res.transparentBlob);
      }
    } catch (err: unknown) {
      if (accountJob) await finishLocal(accountJob, false).catch(() => { });
      if (
        controller.signal.aborted ||
        version !== requestVersion.current ||
        (err instanceof Error && err.name === "AbortError")
      ) {
        console.log("Background removal was cancelled by user.");
        return;
      }
      console.error("Background removal error:", err);
      setStatus("error");
      const message =
        err instanceof Error ? err.message : "Failed to remove background. Please try again.";
      setInlineError(message);
      toast.error(message);
    }
  };

  const handleCancelProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    resetToUpload();
  };

  const handleRemoveSkyOnly = async () => {
    if (!uploadedFile) return;
    setStatus("processing");
    setProgress(35);
    setStage("Isolating landscape terrain and removing sky...");
    try {
      const formData = new FormData();
      formData.append("job_id", cutoutResult?.jobId || "sky_job");
      formData.append("action", "remove_sky");
      formData.append("image", uploadedFile);
      formData.append("sync", "true");

      const res = await fetch("/api/remove-bg", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data && (data.download_url || data.result_url)) {
        const urlToFetch = data.download_url || data.result_url;
        const dlRes = await fetch(urlToFetch);
        const b = await dlRes.blob();
        const url = URL.createObjectURL(b);
        setCutoutResult((prev) =>
          prev
            ? {
              ...prev,
              transparentBlobUrl: url,
              compositeBlobUrl: url,
              status: "ok",
              warnings: ["Sky removed successfully."],
            }
            : null,
        );
        setStatus("success");
        toast.success("Sky removed successfully from landscape!");
      } else {
        throw new Error(data.detail || "Sky isolation failed");
      }
    } catch (err) {
      console.error("Sky removal failed:", err);
      toast.error("Could not isolate sky. Reverting to original view.");
      setStatus("success");
    }
  };

  const resetToUpload = () => {
    requestVersion.current++;
    if (uploadTimer.current) clearTimeout(uploadTimer.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    // Session history owns its URLs until the session is closed.

    setUploadedFile(null);
    setSourceUrl(null);
    setCutoutResult(null);
    setImageDimensions(null);
    setStatus("idle");
    setProgress(0);
    setInlineError(null);
    setViewMode("after");
  };

  const handleSelectHistoryItem = (id: string) => {
    const item = sessionHistory.find((i) => i.id === id);
    if (item) {
      setActiveItemId(item.id);
      setUploadedFile(item.file);
      setSourceUrl(item.originalUrl);
      setCutoutResult(item.cutoutResult);
      setImageDimensions(item.dimensions);
      setViewMode("after");
    }
  };

  const handleDeleteHistoryItem = (id: string) => {
    setSessionHistory((prev) => {
      const remaining = prev.filter((i) => i.id !== id);
      if (activeItemId === id) {
        if (remaining.length > 0) {
          const nextItem = remaining[remaining.length - 1];
          setActiveItemId(nextItem.id);
          setUploadedFile(nextItem.file);
          setSourceUrl(nextItem.originalUrl);
          setCutoutResult(nextItem.cutoutResult);
          setImageDimensions(nextItem.dimensions);
          setViewMode("after");
        } else {
          resetToUpload();
        }
      }
      return remaining;
    });
    toast.success("Image removed from session");
  };

  const retryRemoval = () => {
    if (sourceUrl && uploadedFile) {
      executeRemoval(sourceUrl, uploadedFile, imageDimensions || undefined);
    } else {
      resetToUpload();
    }
  };

  // Download transparent PNG with pattern: bellix-background-removed-[original-file-name].png
  const downloadTransparentPng = () => {
    if (!cutoutResult) return;
    const originalName = uploadedFile?.name || "image";
    const downloadFilename = formatCutoutFilename(originalName, "png");

    const link = document.createElement("a");
    link.href =
      bgType === "transparent" ? cutoutResult.transparentBlobUrl : cutoutResult.compositeBlobUrl;
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Downloaded ${downloadFilename}`);
  };

  // Copy transparent PNG directly to system clipboard
  const copyCutoutToClipboard = async () => {
    if (!cutoutResult) return;
    try {
      let blobToCopy: Blob | null = cutoutResult.transparentBlob || null;
      if (!blobToCopy) {
        const resp = await fetch(cutoutResult.transparentBlobUrl);
        blobToCopy = await resp.blob();
      }

      if (blobToCopy && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blobToCopy,
          }),
        ]);
        toast.success("Transparent PNG copied to clipboard!");
      } else {
        throw new Error("Clipboard API not supported");
      }
    } catch (clipErr) {
      console.warn("Failed to copy image to clipboard:", clipErr);
      toast.error("Could not copy directly. Please use Download PNG.");
    }
  };

  // Dedicated Canva integration handler (pre-opens window to bypass popup blockers)
  const onEditInCanva = async () => {
    if (!cutoutResult) return;
    const canvaWindow = typeof window !== "undefined" ? window.open("https://www.canva.com/", "_blank", "noopener,noreferrer") : null;
    setIsCanvaLoading(true);
    try {
      let blobToShare: Blob | null = cutoutResult.transparentBlob || null;
      if (!blobToShare) {
        const resp = await fetch(cutoutResult.transparentBlobUrl);
        blobToShare = await resp.blob();
      }

      const fileName = formatCutoutFilename(uploadedFile?.name || "cutout", "png");
      const result = await handleEditInCanva(blobToShare, fileName, undefined, canvaWindow);

      if (result.success) {
        toast.success(result.message, { duration: 6000 });
      }
    } catch (canvaErr) {
      console.error("Canva launch error:", canvaErr);
      toast.error("Could not launch Canva. Transparent PNG downloaded instead.");
      downloadTransparentPng();
    } finally {
      setIsCanvaLoading(false);
    }
  };

  // Re-composite when switching solid colors
  const handleColorChange = async (colorHex: string) => {
    setSolidColor(colorHex);
    setBgType("color");
    if (!cutoutResult?.jobId) return;
    try {
      const recomputed = await recompositeCutout(
        cutoutResult.jobId,
        "color",
        colorHex,
        "luxury-studio",
      );
      setCutoutResult((prev) =>
        prev
          ? {
            ...prev,
            compositeBlobUrl: recomputed.compositeBlobUrl,
            fileSizeFormatted: recomputed.sizeFormatted,
          }
          : null,
      );
    } catch (e) {
      console.warn("Recomposite error:", e);
    }
  };

  const handleDropArea = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    // 1. Direct file drop from desktop / local filesystem
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleIncomingFile(file);
      return;
    }

    // 2. Dragged from web page / browser tab (Google Images, Pinterest, another tab)
    const uri = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    const html = e.dataTransfer.getData("text/html");
    let targetUrl = uri?.trim();

    if (!targetUrl && html) {
      const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match && match[1]) targetUrl = match[1];
    }

    if (targetUrl && (targetUrl.startsWith("http") || targetUrl.startsWith("data:image/"))) {
      toast.info("Loading dragged image from web...");
      const fileFromUrl = await fetchImageFromUrl(targetUrl);
      if (fileFromUrl) {
        await handleIncomingFile(fileFromUrl);
        toast.success("Loaded image successfully!");
      } else {
        setInlineError({
          message:
            "Could not load image directly from that link due to web security. Try right-clicking the image > 'Copy Image' > Ctrl+V here.",
        });
      }
    }
  };

  const handleClipboardButtonClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard?.read) {
        const clipItems = await navigator.clipboard.read();
        for (const item of clipItems) {
          const imageType = item.types.find((t) => t.startsWith("image/"));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], "pasted-image.png", { type: imageType });
            await handleIncomingFile(file);
            toast.success("Loaded image from clipboard!");
            return;
          }
        }
      }
      if (navigator.clipboard?.readText) {
        const text = (await navigator.clipboard.readText()).trim();
        if (text.startsWith("http") || text.startsWith("data:image/")) {
          toast.info("Loading image from URL...");
          const fileFromUrl = await fetchImageFromUrl(text);
          if (fileFromUrl) {
            await handleIncomingFile(fileFromUrl);
            toast.success("Loaded image from link!");
            return;
          }
        }
      }
      toast.info("Press Ctrl+V to paste your image directly.");
    } catch {
      toast.info("Press Ctrl+V to paste your image directly.");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("API snippet copied to clipboard!");
  };

  const displayImage =
    viewMode === "before" || !cutoutResult
      ? sourceUrl
      : bgType === "transparent"
        ? cutoutResult?.transparentBlobUrl
        : cutoutResult?.compositeBlobUrl;

  return (
    <main className="min-h-screen bg-[#f7f5ee] text-[#0b0f0d] font-sans pb-24">
      {/* 1. HERO SECTION */}
      <section
        id="upload-studio-section"
        className="relative pt-12 pb-20 sm:pt-16 sm:pb-24 overflow-hidden bg-white text-[#0b0f0d] border-b-[3px] border-[#0b0f0d]"
      >
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          {/* ============================================================== */}
          {/* STATE 1: IDLE HERO (2-COLUMN: Left Heading Copy, Right Upload)  */}
          {/* ============================================================== */}
          {status === "idle" && (
            <div className="flex flex-wrap justify-center gap-2.5 mb-6" aria-label="Editing mode">
              {(
                [
                  ["background", "Background Remover"],
                  ["text", "Text Remover"],
                  ["object", "Object Remover"],
                  ["custom", "Smart Custom Edit"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={editingMode === mode}
                  onClick={() => setEditingMode(mode)}
                  className={`rounded-md border-2 border-[#0b0f0d] px-4 py-2 text-xs sm:text-sm font-black transition-all cursor-pointer ${
                    editingMode === mode
                      ? "bg-[#d0f471] text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]"
                      : "bg-white text-[#0b0f0d] hover:bg-[#ffe500] shadow-[2px_2px_0px_#0b0f0d]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {status === "idle" && editingMode === "background" && (
            <label className="flex justify-center items-center gap-2 text-xs font-bold text-[#26302b] mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={preserveExistingAlpha}
                onChange={(e) => setPreserveExistingAlpha(e.target.checked)}
                className="accent-[#0b0f0d] size-4"
              />
              Preserve existing PNG transparency. Uncheck to compute a new selection.
            </label>
          )}
          {status === "idle" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              {/* Left Copy (lg:col-span-5) */}
              <div className="lg:col-span-5 space-y-6 text-left">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]">
                  <Sparkles className="size-4 text-[#0b0f0d] stroke-[2.5]" />
                  <span className="text-xs sm:text-sm font-black text-[#0b0f0d] tracking-wider uppercase font-mono">
                    Bellix Image Editing Studio
                  </span>
                </div>

                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-[#0b0f0d] leading-[1.04]">
                  {editingMode === "background"
                    ? "A clean cutout. Your image, preserved."
                    : editingMode === "text"
                      ? "Remove exactly the text you select."
                      : editingMode === "object"
                        ? "Select an object. Repair its background."
                        : "Describe your edit. Confirm the selection."}
                </h1>

                <p className="text-lg sm:text-xl text-[#26302b] font-semibold leading-relaxed max-w-xl">
                  Upload your image, inspect the real result, and refine exactly what you want to
                  keep.
                </p>

                {/* 3 Value Points */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#d0f471] border-2 border-[#0b0f0d] text-xs sm:text-sm font-black text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]">
                    <CheckCircle2 className="size-4 text-[#0b0f0d] stroke-[2.5]" /> No sign-up required
                  </span>
                  <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-white border-2 border-[#0b0f0d] text-xs sm:text-sm font-black text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]">
                    <ShieldCheck className="size-4 text-[#0b0f0d] stroke-[2.5]" /> Original image retained for editing
                  </span>
                  <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#a8e6cf] border-2 border-[#0b0f0d] text-xs sm:text-sm font-black text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]">
                    <Zap className="size-4 text-[#0b0f0d] stroke-[2.5]" /> Sub-pixel AI matting
                  </span>
                </div>
                <div className="pt-2">
                  <Link
                    href="/gemini-image-watermark-remover"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#f7f5ee] hover:bg-[#ffe500] text-[#0b0f0d] text-xs sm:text-sm font-black border-2 border-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] transition-all cursor-pointer"
                  >
                    <Play className="size-3.5 text-[#0b0f0d] fill-[#0b0f0d]" />
                    <span>remove gemini logo only 3 sec (60 FPS)</span>
                    <ArrowRight className="size-3.5 text-[#0b0f0d]" />
                  </Link>
                </div>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white hover:bg-[#d0f471] border-2 border-[#0b0f0d] text-sm font-black text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]"
                >
                  <span>See how it works</span>
                  <ArrowRight className="size-4 stroke-[2.5]" />
                </a>
              </div>

              {/* Right: Upload Dropzone Card (lg:col-span-7) */}
              <div className="lg:col-span-7 w-full">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/heic,image/heif,image/avif,image/bmp,image/tiff,image/gif,image/svg+xml,image/*"
                  className="hidden"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0];
                    if (file) handleIncomingFile(file);
                    e.target.value = "";
                  }}
                />

                <div
                  id="background-upload-card"
                  tabIndex={-1}
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
                  onDrop={handleDropArea}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative min-h-[440px] sm:min-h-[500px] lg:min-h-[540px] rounded-xl border-[3px] border-[#0b0f0d] p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all duration-150 group cursor-pointer ${
                    isDragging
                      ? "bg-[#d0f471] shadow-[9px_9px_0px_#0b0f0d] -translate-x-0.5 -translate-y-0.5"
                      : "bg-white hover:bg-[#fffef5] shadow-[7px_7px_0px_#0b0f0d]"
                  }`}
                >
                  {/* Viewfinder brackets */}
                  <div className="absolute inset-4 pointer-events-none">
                    <div className="absolute top-0 left-0 size-6 border-t-[3px] border-l-[3px] border-[#0b0f0d]" />
                    <div className="absolute top-0 right-0 size-6 border-t-[3px] border-r-[3px] border-[#0b0f0d]" />
                    <div className="absolute bottom-0 left-0 size-6 border-b-[3px] border-l-[3px] border-[#0b0f0d]" />
                    <div className="absolute bottom-0 right-0 size-6 border-b-[3px] border-r-[3px] border-[#0b0f0d]" />
                  </div>

                  {/* Inline Error Alert if any */}
                  {inlineError && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-4 inset-x-4 mx-auto max-w-md p-3.5 rounded-lg bg-[#ff5c5c] border-2 border-[#0b0f0d] text-white text-xs flex items-center justify-between gap-2 shadow-[4px_4px_0px_#0b0f0d] z-20"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="size-4 shrink-0 text-white" />
                        <span className="font-bold text-left leading-relaxed">
                          {typeof inlineError === "string" ? inlineError : inlineError.message}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInlineError(null)}
                        className="text-white hover:text-[#ffe500] text-xs font-black px-1.5 py-0.5 rounded cursor-pointer"
                        aria-label="Dismiss alert"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <span className="size-20 rounded-xl bg-[#d0f471] text-[#0b0f0d] border-[2.5px] border-[#0b0f0d] flex items-center justify-center shadow-[4px_4px_0px_#0b0f0d] mb-5 group-hover:scale-105 transition-transform">
                    <Upload className="size-9 text-[#0b0f0d] stroke-[2.4]" />
                  </span>

                  <h3 className="text-2xl sm:text-3xl font-black text-[#0b0f0d] tracking-tight">
                    Drop image here
                  </h3>

                  <p className="text-base text-[#26302b] font-semibold mt-2 max-w-sm leading-relaxed">
                    <kbd className="px-2 py-0.5 rounded bg-[#ffe500] border-2 border-[#0b0f0d] font-mono text-xs font-black text-[#0b0f0d]">
                      Ctrl+V
                    </kbd>{" "}
                    /{" "}
                    <kbd className="px-2 py-0.5 rounded bg-[#ffe500] border-2 border-[#0b0f0d] font-mono text-xs font-black text-[#0b0f0d]">
                      Cmd+V
                    </kbd>
                  </p>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="mt-5 px-7 py-3 rounded-lg bg-[#d0f471] hover:bg-[#ffe500] text-[#0b0f0d] font-black text-sm sm:text-base border-2 border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#0b0f0d] transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <Upload className="size-4 text-[#0b0f0d] stroke-[2.5]" />
                    <span>Choose image</span>
                  </button>

                  <span className="mt-5 px-3 py-1 rounded bg-[#f7f5ee] border-2 border-[#0b0f0d] text-xs font-mono font-bold text-[#0b0f0d]">
                    PNG, JPG, WebP and AVIF supported
                  </span>

                  {/* Sample images */}
                  <div className="mt-6 pt-5 border-t-2 border-[#0b0f0d] w-full max-w-sm">
                    <p className="text-xs text-[#0b0f0d] font-black uppercase tracking-wider mb-3 font-mono">
                      No image? Try one of these:
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      {SHOWCASE_ITEMS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const res = await fetch(item.originalImage);
                              const b = await res.blob();
                              const f = new File([b], `${item.id}.jpg`, { type: "image/jpeg" });
                              await handleIncomingFile(f);
                            } catch {
                              toast.error("Could not load sample");
                            }
                          }}
                          className="group/thumb relative size-12 rounded-lg overflow-hidden border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d] hover:scale-105 transition-all cursor-pointer"
                          title={`Try ${item.title}`}
                        >
                          <img
                            src={item.originalImage}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Compact header for active/processing/result state */}
          {status !== "idle" && (
            <div className="text-center max-w-3xl mx-auto mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] text-xs sm:text-sm font-black text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] font-mono uppercase">
                <Sparkles className="size-3.5 text-[#0b0f0d]" />
                <span>AI Background Remover Studio</span>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STATE 2: UPLOAD COMPLETE & AI SCANNING ANIMATION               */}
          {/* ============================================================== */}
          {status === "selecting" && sourceUrl && imageDimensions && (
            <SelectionStudio
              original={sourceUrl}
              width={imageDimensions.width}
              height={imageDimensions.height}
              mode={editingMode}
              purpose={selectionPurpose}
              onBackground={() => {
                if (uploadedFile) executeRemoval(sourceUrl, uploadedFile, imageDimensions);
              }}
              onCancel={resetToUpload}
              onResult={(blob) => {
                const url = URL.createObjectURL(blob);
                ownedUrls.current.add(url);
                setCutoutResult({
                  transparentBlobUrl: url,
                  compositeBlobUrl: url,
                  transparentBlob: blob,
                  width: imageDimensions.width,
                  height: imageDimensions.height,
                  fileSizeBytes: blob.size,
                  fileSizeFormatted: formatBytes(blob.size),
                  isRealAi: false,
                  status: selectionPurpose === "foreground" ? "manual-cutout" : "completed",
                });
                setStatus("success");
              }}
            />
          )}
          {(status === "uploading" || status === "processing" || status === "revealing") &&
            sourceUrl &&
            imageDimensions && (
              <BackgroundProcessing
                key={sourceUrl}
                original={sourceUrl}
                result={status === "revealing" ? cutoutResult?.transparentBlobUrl : undefined}
                width={imageDimensions.width}
                height={imageDimensions.height}
                fileName={uploadedFile?.name || "image.png"}
                stage={status === "uploading" ? "Preparing image..." : stage}
                onCancel={handleCancelProcessing}
                onComplete={() => {
                  if (!abortControllerRef.current?.signal.aborted) setStatus("success");
                }}
              />
            )}

          {/* ============================================================== */}
          {/* STATE 3: FULL-FEATURED REMOVE.BG / CANVA STUDIO IMAGE EDITOR  */}
          {/* ============================================================== */}
          {status === "success" && cutoutResult && sourceUrl && (
            <div id="studio-editor-viewport" className="w-full scroll-mt-24 sm:scroll-mt-28 py-1">
              <div
                role="status"
                className="max-w-4xl mx-auto mb-5 px-5 py-4 rounded-xl border-2 border-[#0b0f0d] bg-[#d0f471] text-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d]"
              >
                <p className="font-black flex items-center gap-2 text-[#0b0f0d]">
                  <CheckCircle2 className="size-4 text-[#0b0f0d] stroke-[2.5]" />
                  {cutoutResult.status === "manual-cutout"
                    ? "Manual Cutout Ready"
                    : editingMode !== "background"
                      ? "Selected Removal Completed"
                      : cutoutResult.isRealAi === false
                        ? "Existing Transparency Preserved"
                        : "Background Removed Successfully"}
                </p>
                <p className="text-xs font-semibold text-[#0b0f0d] mt-1.5">
                  Inspect all subjects and fine edges. Open Cutout to restore missing areas or erase
                  remaining background.
                </p>
              </div>
              <RemoveBgStudioEditor
                onSelectMode={(mode) => {
                  setEditingMode(mode);
                  setSelectionPurpose("inpaint");
                  setStatus("selecting");
                }}
                originalImageUrl={sourceUrl}
                cutoutImageUrl={cutoutResult.transparentBlobUrl}
                onReset={resetToUpload}
                onEditInCanva={onEditInCanva}
                isCanvaLoading={isCanvaLoading}
                historyItems={sessionHistory.map((item) => ({
                  id: item.id,
                  originalUrl: item.originalUrl,
                  cutoutUrl: item.cutoutResult.transparentBlobUrl,
                  fileName: item.file.name,
                  dimensions: { width: item.dimensions.width, height: item.dimensions.height },
                }))}
                activeItemId={activeItemId || undefined}
                onSelectHistoryItem={handleSelectHistoryItem}
                onDeleteHistoryItem={handleDeleteHistoryItem}
                onUploadMore={() => fileInputRef.current?.click()}
              />
            </div>
          )}

          {/* ============================================================== */}
          {/* STATE 4: ERROR SCREEN                                           */}
          {/* ============================================================== */}
          {status === "error" && (
            <div className="relative rounded-xl overflow-hidden border-[3px] border-[#0b0f0d] shadow-[7px_7px_0px_#0b0f0d] bg-white flex items-center justify-center min-h-[400px] sm:min-h-[480px] max-w-4xl mx-auto w-full select-none p-6">
              <div className="max-w-md w-full rounded-xl p-6 sm:p-8 text-center bg-[#f7f5ee] border-2 border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d]">
                <span className="size-14 rounded-lg flex items-center justify-center mx-auto mb-4 bg-[#ff5c5c] border-2 border-[#0b0f0d] text-white shadow-[2px_2px_0px_#0b0f0d]">
                  <AlertTriangle className="size-7 text-white" />
                </span>

                <h3 className="text-xl font-black tracking-tight mb-2 text-[#0b0f0d]">
                  We couldn't remove this background
                </h3>

                <p className="text-xs sm:text-sm font-medium leading-relaxed mb-6 text-[#26302b]">
                  {typeof inlineError === "string"
                    ? inlineError
                    : inlineError?.message || "Please try again or upload another image."}
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={retryRemoval}
                    className="px-6 py-2.5 rounded-lg text-xs sm:text-sm font-black border-2 border-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] transition-all cursor-pointer flex items-center gap-2 bg-[#d0f471] hover:bg-[#ffe500] text-[#0b0f0d]"
                  >
                    <RefreshCw className="size-4" />
                    <span>Try Again</span>
                  </button>

                  <button
                    type="button"
                    onClick={resetToUpload}
                    className="px-5 py-2.5 rounded-lg border-2 border-[#0b0f0d] bg-white hover:bg-[#ffe500] text-xs sm:text-sm font-black text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] transition-all cursor-pointer"
                  >
                    <span>Upload Another</span>
                  </button>
                </div>
                {sourceUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectionPurpose("foreground");
                      setStatus("selecting");
                    }}
                    className="mt-4 text-sm font-black text-[#0b0f0d] underline"
                  >
                    Select the foreground manually
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <HowItWorksGuide guide={howItWorksGuides.en.background} />

      {/* 2. REAL-TIME AI MATTING TRUST VIDEOS (3 REAL-TIME SHOWCASES) */}
      <BackgroundRemoverTrustVideos
        onUploadClick={() => {
          const el = document.getElementById("upload-studio-section");
          if (el) el.scrollIntoView({ behavior: "smooth" });
          fileInputRef.current?.click();
        }}
      />

      {/* 3. SEE THE DIFFERENCE SHOWCASE */}
      <SeeTheDifferenceShowcase />

      {/* 3. BEFORE / AFTER QUALITY SHOWCASE */}
      <section className="py-20 sm:py-24 bg-[#f7f5ee] border-y-[3px] border-[#0b0f0d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="inline-block px-3 py-1 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d] text-xs font-black text-[#0b0f0d] uppercase tracking-widest mb-3 font-mono">
              SUB-PIXEL AI MATTING QUALITY
            </span>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0b0f0d] tracking-tight">
              Stunning Results on Hair, Fur &amp; Complex Edges
            </h2>
            <p className="mt-3 text-base text-[#26302b] font-medium">
              Drag the interactive slider to inspect the actual transparent cutout over the
              professional checkerboard pattern.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {SHOWCASE_ITEMS.map((item) => (
              <ShowcaseSlider
                key={item.id}
                originalImage={item.originalImage}
                cutoutImage={item.cutoutImage}
                title={item.title}
                category={item.category}
                description={item.description}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 4. WORKFLOW & PERSONA SECTION */}
      <section className="py-20 sm:py-24 bg-white border-b-[3px] border-[#0b0f0d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="inline-block px-3 py-1 rounded-md bg-[#a8e6cf] border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d] text-xs font-black text-[#0b0f0d] uppercase tracking-widest mb-3 font-mono">
              BUILT FOR EVERY WORKFLOW
            </span>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0b0f0d] tracking-tight">
              One Tool. Endless Possibilities.
            </h2>
            <p className="mt-3 text-base text-[#26302b] font-medium">
              Whether you need 100% white backgrounds for your e-commerce store or transparent
              stickers for social media.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PERSONAS.map((p, idx) => {
              const Icon = p.icon;
              const badgeBgs = ["bg-[#d0f471]", "bg-[#ffe500]", "bg-[#a8e6cf]", "bg-[#bae6fd]", "bg-[#fecdd3]", "bg-[#fde68a]"];
              const badgeBg = badgeBgs[idx % badgeBgs.length];
              return (
                <div
                  key={p.title}
                  className="rounded-xl border-[2.5px] border-[#0b0f0d] bg-white p-7 sm:p-8 shadow-[5px_5px_0px_#0b0f0d] flex flex-col justify-between hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0px_#0b0f0d] transition-all"
                >
                  <div>
                    <span
                      className={`size-12 rounded-lg ${badgeBg} border-2 border-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] text-[#0b0f0d] flex items-center justify-center mb-5`}
                    >
                      <Icon className="size-6 stroke-[2.3]" />
                    </span>
                    <h3 className="text-2xl font-black text-[#0b0f0d]">{p.title}</h3>
                    <p className="text-sm font-black text-[#0b0f0d] mt-1 font-mono">{p.subtitle}</p>
                    <p className="text-sm sm:text-base text-[#26302b] mt-3 leading-relaxed font-medium">
                      {p.desc}
                    </p>
                  </div>

                  <ul className="mt-6 pt-5 border-t-2 border-[#0b0f0d] space-y-2 text-xs text-[#0b0f0d] font-bold">
                    {p.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-[#0b0f0d] shrink-0 stroke-[2.5]" />
                        <span>{b}</span>
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
      <section className="py-20 sm:py-24 bg-[#f7f5ee] border-b-[3px] border-[#0b0f0d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block px-3 py-1 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d] text-xs font-black text-[#0b0f0d] uppercase tracking-widest mb-3 font-mono">
              EFFORTLESS 3-STEP PIPELINE
            </span>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0b0f0d] tracking-tight">
              Remove Backgrounds in 3 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl bg-[#d0f471] p-8 border-[2.5px] border-[#0b0f0d] shadow-[5px_5px_0px_#0b0f0d] text-center">
              <span className="size-16 mx-auto rounded-lg bg-white border-2 border-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] text-[#0b0f0d] font-black text-2xl flex items-center justify-center mb-6 font-mono">
                1
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-[#0b0f0d]">
                Upload or Paste Image
              </h3>
              <p className="text-sm sm:text-base text-[#0b0f0d] mt-3 leading-relaxed font-semibold">
                Drag and drop your JPG, PNG, WebP or HEIC file, or press{" "}
                <kbd className="bg-white px-1.5 py-0.5 rounded border-2 border-[#0b0f0d] text-[#0b0f0d] font-mono text-xs font-black">
                  Ctrl+V
                </kbd>{" "}
                from anywhere.
              </p>
            </div>

            <div className="rounded-xl bg-[#ffe500] p-8 border-[2.5px] border-[#0b0f0d] shadow-[5px_5px_0px_#0b0f0d] text-center">
              <span className="size-16 mx-auto rounded-lg bg-white border-2 border-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] text-[#0b0f0d] font-black text-2xl flex items-center justify-center mb-6 font-mono">
                2
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-[#0b0f0d]">AI Isolates Subject</h3>
              <p className="text-sm sm:text-base text-[#0b0f0d] mt-3 leading-relaxed font-semibold">
                Our sub-pixel neural matting separates fine hair, jewelry, and products from
                distracting backdrops in under 5 seconds.
              </p>
            </div>

            <div className="rounded-xl bg-[#a8e6cf] p-8 border-[2.5px] border-[#0b0f0d] shadow-[5px_5px_0px_#0b0f0d] text-center">
              <span className="size-16 mx-auto rounded-lg bg-white border-2 border-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] text-[#0b0f0d] font-black text-2xl flex items-center justify-center mb-6 font-mono">
                3
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-[#0b0f0d]">
                Customize &amp; Download
              </h3>
              <p className="text-sm sm:text-base text-[#0b0f0d] mt-3 leading-relaxed font-semibold">
                Export transparent 4K PNGs or instantly replace the background with Amazon-compliant
                Pure White, studio colors, or scenic backdrops.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. DEVELOPER API CODE SECTION */}
      <section className="py-20 sm:py-24 bg-[#0b0f0d] text-white border-b-[3px] border-[#0b0f0d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#ffe500] text-[#0b0f0d] text-xs font-black border-2 border-white font-mono">
                <Code2 className="size-3.5" />
                <span>REST API INTEGRATION</span>
              </span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-white">
                Integrate Background Removal in 1 Line of Code
              </h2>
              <p className="text-sm text-zinc-200 leading-relaxed font-medium">
                Power your web app, e-commerce backend, or mobile tool with our high-speed global
                endpoints. Zero infrastructure headache.
              </p>
              <div className="pt-2 flex flex-wrap gap-4 text-xs text-white font-bold">
                <span className="flex items-center gap-1.5">
                  <Check className="size-4 text-[#d0f471]" /> &lt;800ms Latency
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="size-4 text-[#d0f471]" /> 99.9% Uptime SLA
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="size-4 text-[#d0f471]" /> 4K Cutout Support
                </span>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-xl border-[2.5px] border-[#d0f471] bg-[#161b18] shadow-[6px_6px_0px_#d0f471] overflow-hidden">
                {/* Code Tabs Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b-2 border-[#d0f471]/30 bg-[#0b0f0d]">
                  <div className="flex flex-wrap gap-2">
                    {(["curl", "python", "javascript", "php"] as const).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setActiveCodeTab(lang)}
                        className={`px-3 py-1.5 rounded-md text-xs font-black uppercase border-2 transition-all cursor-pointer ${
                          activeCodeTab === lang
                            ? "bg-[#d0f471] text-[#0b0f0d] border-[#d0f471]"
                            : "text-white border-zinc-700 hover:border-[#d0f471]"
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => copyCode(CODE_SNIPPETS[activeCodeTab])}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-[#ffe500] text-white hover:text-[#0b0f0d] text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Copy className="size-3.5" />
                    <span>Copy Code</span>
                  </button>
                </div>

                {/* Code Body */}
                <pre className="p-5 sm:p-6 text-xs sm:text-sm font-mono text-[#d0f471] overflow-x-auto leading-relaxed">
                  <code>{CODE_SNIPPETS[activeCodeTab]}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. COMPREHENSIVE FAQ SECTION */}
      <section className="py-20 sm:py-24 bg-white border-b-[3px] border-[#0b0f0d]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block px-3 py-1 rounded-md bg-[#d0f471] border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d] text-xs font-black text-[#0b0f0d] uppercase tracking-widest mb-3 font-mono">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0b0f0d] tracking-tight">
              Everything You Need to Know
            </h2>
          </div>

          <div className="divide-y-2 divide-[#0b0f0d] rounded-xl border-[2.5px] border-[#0b0f0d] bg-[#f7f5ee] px-6 sm:px-8 shadow-[6px_6px_0px_#0b0f0d]">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q} className="py-5">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full text-left flex items-center justify-between gap-4 cursor-pointer group"
                  >
                    <span className="text-base sm:text-xl font-black text-[#0b0f0d]">
                      {item.q}
                    </span>
                    <span className={`size-8 rounded-md border-2 border-[#0b0f0d] flex items-center justify-center font-black text-base text-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d] transition-all shrink-0 ${isOpen ? "bg-[#d0f471]" : "bg-white group-hover:bg-[#ffe500]"}`}>
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen && (
                    <p className="mt-3 text-base text-[#26302b] leading-relaxed pr-6 animate-in fade-in duration-200 font-medium">
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
      <section className="py-16 sm:py-24 bg-[#f7f5ee]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl bg-[#ffe500] border-[3px] border-[#0b0f0d] p-8 sm:p-14 text-[#0b0f0d] text-center shadow-[7px_7px_0px_#0b0f0d] relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white text-[#0b0f0d] text-xs font-black border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d] font-mono">
                <Sparkles className="size-3.5" />
                <span>TRY IT TODAY 100% FREE</span>
              </span>

              <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-[#0b0f0d]">
                Make Every Image Ready to Use in 5 Seconds.
              </h2>

              <p className="text-sm sm:text-base text-[#0b0f0d] max-w-lg mx-auto leading-relaxed font-semibold">
                Join thousands of designers, e-commerce sellers, and photographers saving hours of
                manual cutout work every day.
              </p>

              <div className="pt-4 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    fileInputRef.current?.click();
                  }}
                  className="px-8 py-3.5 rounded-lg bg-[#d0f471] hover:bg-white text-[#0b0f0d] text-base sm:text-lg font-black border-[2.5px] border-[#0b0f0d] shadow-[5px_5px_0px_#0b0f0d] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0px_#0b0f0d] transition-all cursor-pointer flex items-center gap-2"
                >
                  <Upload className="size-5 stroke-[2.5]" />
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
