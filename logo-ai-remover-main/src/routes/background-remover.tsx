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
import { PinkScanLoader } from "@/components/site/PinkScanLoader";
import { BackgroundRemoverTrustVideos } from "@/components/site/BackgroundRemoverTrustVideos";
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
    description:
      "Preserves individual wisps, curls, and transparent fringes without halos or jagged cuts.",
    originalImage: "/upscale/portrait.png",
    cutoutImage: "/upscale/portrait_cutout.png",
  },
  {
    id: "product",
    category: "E-COMMERCE & PRODUCTS",
    title: "Crisp Catalog Product Cutouts",
    description:
      "Amazon, Shopify, and eBay 100% pure white background compliant with razor-sharp contours.",
    originalImage: "/upscale/product.png",
    cutoutImage: "/upscale/product_cutout.png",
  },
  {
    id: "pet",
    category: "PETS & WILDLIFE",
    title: "Soft Fur, Feathers & Whiskers",
    description:
      "Handles intricate textures, soft fur, and whisker details without blurring or artificial lines.",
    originalImage: "/upscale/wildlife.png",
    cutoutImage: "/upscale/wildlife_cutout.png",
  },
  {
    id: "jewelry",
    category: "JEWELRY & REFLECTIONS",
    title: "Transparent Facets & Metal Edges",
    description:
      "Accurately isolates transparent gemstones, shiny metals, and fine filigree with edge clarity.",
    originalImage: "/upscale/jewelry.png",
    cutoutImage: "/upscale/jewelry_cutout.png",
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

  return (
    <div className="rounded-3xl border border-gray-200/80 bg-white shadow-xl shadow-gray-200/40 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-gray-300/80 flex flex-col">
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
        className="relative aspect-16/10 w-full overflow-hidden cursor-ew-resize select-none touch-none bg-[#f8fafc] focus:outline-none focus:ring-2 focus:ring-[#E11D48]/40"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* RIGHT / AFTER: Transparent Checkerboard Background */}
        <div
          className="absolute inset-0 size-full pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect width='12' height='12' fill='%23e2e8f0'/%3E%3Crect x='12' width='12' height='12' fill='%23f8fafc'/%3E%3Crect y='12' width='12' height='12' fill='%23f8fafc'/%3E%3Crect x='12' y='12' width='12' height='12' fill='%23e2e8f0'/%3E%3C/svg%3E")`,
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
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-950/80 text-white text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase backdrop-blur-md shadow-sm border border-white/10">
            ORIGINAL
          </span>
        </div>

        {/* Right Badge: TRANSPARENT PNG */}
        <div className="absolute top-3.5 right-3.5 z-20 pointer-events-none select-none">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#E11D48] text-white text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase backdrop-blur-md shadow-md border border-white/20">
            TRANSPARENT PNG
          </span>
        </div>

        {/* DIVIDER & ↔ HANDLE */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-[#E11D48] z-20 pointer-events-none shadow-[0_0_12px_rgba(225,29,72,0.8)]"
          style={{ left: `${position}%` }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-9 sm:size-10 rounded-full bg-[#E11D48] border-2 border-white shadow-xl flex items-center justify-center text-white ring-4 ring-black/10 select-none">
            <ChevronLeft className="size-3.5 -mr-0.5" />
            <ChevronRight className="size-3.5 -ml-0.5" />
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6 bg-white border-t border-gray-100 flex-1 flex flex-col justify-between">
        <div>
          <p className="text-[11px] font-semibold text-[#E11D48] uppercase tracking-widest">
            {category}
          </p>
          <h3 className="text-xl font-semibold text-gray-950 mt-1 tracking-tight">{title}</h3>
          <p className="text-sm text-gray-600 mt-1.5 leading-relaxed font-normal">{description}</p>
        </div>
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
          className="absolute inset-0 size-full pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect width='12' height='12' fill='%23e2e8f0'/%3E%3Crect x='12' width='12' height='12' fill='%23f8fafc'/%3E%3Crect y='12' width='12' height='12' fill='%23f8fafc'/%3E%3Crect x='12' y='12' width='12' height='12' fill='%23e2e8f0'/%3E%3C/svg%3E")`,
            backgroundSize: "20px 20px",
          }}
        />
      )}

      {/* After Cutout (Full Canvas) */}
      <img
        src={cutoutUrl}
        alt="AI Cutout"
        className="absolute inset-0 size-full object-contain pointer-events-none"
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
          className="absolute inset-0 size-full object-contain pointer-events-none"
        />
      </div>

      {/* Badges */}
      <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-gray-900/80 text-white text-[10px] font-medium backdrop-blur-md z-20 pointer-events-none">
        ORIGINAL
      </span>
      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-[#E11D48] text-white text-[10px] font-medium backdrop-blur-md shadow-xs z-20 pointer-events-none">
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
    <section className="py-20 sm:py-28 bg-white border-t border-gray-100/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* SECTION TITLE & SUBTITLE */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <h2 className="text-3xl sm:text-5xl font-normal text-gray-950 tracking-tight">
            See the Difference
          </h2>
          <p className="mt-3 text-base sm:text-lg text-gray-600 font-normal">
            Remove backgrounds in seconds. Create professional images for every purpose.
          </p>
        </div>

        {/* CATEGORY TABS */}
        <div className="flex items-center justify-center mb-10 sm:mb-14">
          <div className="inline-flex p-1.5 rounded-full bg-gray-100/80 border border-gray-200/60 max-w-full overflow-x-auto scrollbar-none gap-1 shadow-2xs">
            {SEE_DIFFERENCE_CATEGORIES.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
                    active
                      ? "bg-white text-gray-950 shadow-xs border border-gray-200/70"
                      : "text-gray-600 hover:text-gray-950 hover:bg-white/50"
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
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 transition-all duration-300 ${
            isTransitioning
              ? "opacity-30 translate-y-2 scale-[0.99]"
              : "opacity-100 translate-y-0 scale-100"
          }`}
        >
          {cards.map((card) => (
            <div
              key={card.label}
              className="group rounded-3xl border border-gray-200/80 bg-white p-3.5 sm:p-4 shadow-md shadow-gray-200/40 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Image Frame */}
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#f8fafc] border border-gray-100/90 flex items-center justify-center select-none">
                  {/* Subtle Checkerboard for Card 2 */}
                  {card.isTransparent && (
                    <div
                      className="absolute inset-0 size-full pointer-events-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect width='12' height='12' fill='%23e2e8f0'/%3E%3Crect x='12' width='12' height='12' fill='%23f8fafc'/%3E%3Crect y='12' width='12' height='12' fill='%23f8fafc'/%3E%3Crect x='12' y='12' width='12' height='12' fill='%23e2e8f0'/%3E%3C/svg%3E")`,
                        backgroundSize: "20px 20px",
                      }}
                    />
                  )}

                  <img
                    src={card.image}
                    alt={`${card.label} - ${current.subject}`}
                    className={`size-full transition-transform duration-500 group-hover:scale-104 select-none pointer-events-none ${
                      card.isTransparent ? "object-contain p-2 sm:p-3" : "object-cover"
                    }`}
                    loading="lazy"
                    decoding="async"
                  />

                  {/* Stage Number Badge */}
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-gray-900/80 text-white text-[10px] font-semibold tracking-wider backdrop-blur-md border border-white/10 shadow-xs">
                    {card.step}
                  </span>
                </div>

                {/* Card Title */}
                <h3 className="text-base sm:text-lg font-semibold text-gray-950 mt-4 tracking-tight">
                  {card.label}
                </h3>

                {/* Card Description */}
                <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
                  {card.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA BELOW SHOWCASE */}
        <div className="mt-12 sm:mt-16 text-center flex flex-col items-center justify-center">
          <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-widest mb-3">
            Try it yourself
          </p>
          <Link
            to="/background-remover/sample-images"
            className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#E11D48] hover:bg-[#BE123C] text-white font-medium text-sm shadow-lg shadow-rose-950/20 hover:shadow-xl hover:scale-102 active:scale-98 transition-all cursor-pointer"
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
  | "idle"
  | "uploading"
  | "processing"
  | "success"
  | "error";

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

function BackgroundRemoverPage() {
  const [status, setStatus] = useState<BackgroundRemovalStatus>("idle");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [cutoutResult, setCutoutResult] = useState<CutoutResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Analyzing subject");
  const [inlineError, setInlineError] = useState<string | null>(null);
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const { user, deductCredit, addJob } = useUserStore();

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (sourceUrl && sourceUrl.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
      if (cutoutResult?.transparentBlobUrl?.startsWith("blob:"))
        URL.revokeObjectURL(cutoutResult.transparentBlobUrl);
      if (cutoutResult?.compositeBlobUrl?.startsWith("blob:"))
        URL.revokeObjectURL(cutoutResult.compositeBlobUrl);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Global Ctrl+V / Cmd+V paste support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      const items = Array.from(e.clipboardData?.items || []);
      const imgItem = items.find((item) => item.type.startsWith("image/"));
      if (imgItem) {
        const file = imgItem.getAsFile();
        if (file) {
          e.preventDefault();
          handleIncomingFile(file);
          toast.success("Pasted image from clipboard!");
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [bgType, solidColor, qualityMode]);

  // Validation & initialization
  const handleIncomingFile = (file: File) => {
    setInlineError(null);

    // MIME type check
    const validMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    ];
    const isImage =
      file.type.startsWith("image/") ||
      validMimes.includes(file.type.toLowerCase()) ||
      /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);

    if (!isImage) {
      setInlineError("Unsupported file format.");
      return;
    }

    // Size limit check (35MB)
    const MAX_SIZE_BYTES = 35 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      setInlineError("Image exceeds the 35MB limit.");
      return;
    }

    // Cleanup previous object URLs
    if (sourceUrl && sourceUrl.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    if (cutoutResult?.transparentBlobUrl?.startsWith("blob:"))
      URL.revokeObjectURL(cutoutResult.transparentBlobUrl);
    if (cutoutResult?.compositeBlobUrl?.startsWith("blob:"))
      URL.revokeObjectURL(cutoutResult.compositeBlobUrl);

    const objectUrl = URL.createObjectURL(file);
    setUploadedFile(file);
    setSourceUrl(objectUrl);
    setCutoutResult(null);
    setViewMode("after");

    executeRemoval(objectUrl, file);
  };

  const executeRemoval = async (imageUrl: string, file: File) => {
    // 100% Free AI Tool - Never block for credits
    try {
      deductCredit();
    } catch {}

    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setStatus("processing");
    setStage("Removing background...");

    try {
      const res = await removeImageBackground(
        imageUrl,
        bgType,
        solidColor,
        "luxury-studio",
      );

      // Instant transition (<1s) - immediately show clean transparent cutout
      setCutoutResult(res);
      setStatus("success");

      addJob({
        file_name: file.name,
        file_type: "background-remover",
        status: "completed",
        quality: `Transparent (${res.width}×${res.height})`,
        credits_used: 1,
        processing_time: res.processingTimeMs
          ? `${(res.processingTimeMs / 1000).toFixed(1)}s`
          : "0.8s",
        file_url: imageUrl,
        result_url: res.transparentBlobUrl,
      });

      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#E11D48", "#FF2E63", "#F59E0B", "#10B981"],
      });

      toast.success("Background removed successfully!");
    } catch (err: any) {
      if (err?.name === "AbortError") {
        console.log("Background removal was cancelled by user.");
        return;
      }
      console.error("Background removal error:", err);
      setStatus("error");
      const message = err instanceof Error ? err.message : "Failed to remove background. Please try again.";
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
    if (abortControllerRef.current) abortControllerRef.current.abort();

    if (sourceUrl && sourceUrl.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    if (cutoutResult?.transparentBlobUrl?.startsWith("blob:"))
      URL.revokeObjectURL(cutoutResult.transparentBlobUrl);
    if (cutoutResult?.compositeBlobUrl?.startsWith("blob:"))
      URL.revokeObjectURL(cutoutResult.compositeBlobUrl);

    setUploadedFile(null);
    setSourceUrl(null);
    setCutoutResult(null);
    setStatus("idle");
    setProgress(0);
    setInlineError(null);
    setViewMode("after");
  };

  const retryRemoval = () => {
    if (sourceUrl && uploadedFile) {
      executeRemoval(sourceUrl, uploadedFile);
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

  // Dedicated Canva integration handler
  const onEditInCanva = async () => {
    if (!cutoutResult) return;
    setIsCanvaLoading(true);
    try {
      let blobToShare: Blob | null = cutoutResult.transparentBlob || null;
      if (!blobToShare) {
        const resp = await fetch(cutoutResult.transparentBlobUrl);
        blobToShare = await resp.blob();
      }

      const fileName = formatCutoutFilename(uploadedFile?.name || "cutout", "png");
      const result = await handleEditInCanva(blobToShare, fileName);

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
    <main className="min-h-screen bg-transparent text-gray-900 font-sans selection:bg-[#FFE4E9] selection:text-[#E11D48]">
      {/* 1. HERO SECTION */}
      <section
        id="upload-studio-section"
        className="relative pt-12 pb-20 sm:pt-16 sm:pb-28 overflow-hidden bg-radial-[at_50%_0%] from-[#FFF0F5] via-white to-white"
      >
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
              Zero manual pen clipping. Zero green screens. Automatically isolate hair, fur, and
              complex product silhouettes with sub-pixel edge matting.
            </p>

            <div className="mt-5 flex items-center justify-center gap-3">
              <a
                href="#trust-showcase-section"
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 hover:bg-white text-gray-800 hover:text-[#E11D48] text-xs font-semibold border border-gray-200/90 shadow-2xs hover:shadow-xs transition-all hover:scale-102 cursor-pointer backdrop-blur-sm"
              >
                <Play className="size-3 text-[#E11D48] fill-[#E11D48]" />
                <span>Watch 3 Real-Time AI Proof Videos (60 FPS)</span>
                <ArrowRight className="size-3 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>

          {/* ============================================================== */}
          {/* STATE 1: UPLOAD SCREEN (Idle state with 2-column card)           */}
          {/* ============================================================== */}
          {status === "idle" && (
            <div className="rounded-3xl border border-gray-200/80 bg-white/95 backdrop-blur-xl shadow-2xl shadow-gray-200/60 p-5 sm:p-8 lg:p-10 max-w-5xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                {/* LEFT SIDE: Large Drag-and-Drop Area */}
                <div className="lg:col-span-7 flex flex-col justify-center">
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
                      if (file) handleIncomingFile(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`h-[390px] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-8 text-center cursor-pointer relative group ${
                      isDragging
                        ? "border-[#E11D48] bg-[#FFF5F7] ring-2 ring-[#E11D48]/20 scale-[1.01]"
                        : "border-gray-300/90 hover:border-[#E11D48] hover:bg-[#FFF9FA]/80 bg-[#FAFAFC]/60"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
                      className="hidden"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files?.[0];
                        if (file) handleIncomingFile(file);
                      }}
                    />

                    {/* Inline Error Alert if any */}
                    {inlineError && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-4 inset-x-4 mx-auto max-w-sm p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-2 shadow-xs z-10"
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="size-4 shrink-0 text-[#E11D48]" />
                          <span className="font-medium">{inlineError}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInlineError(null)}
                          className="text-rose-500 hover:text-rose-700 text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Pink/Red Circular Upload Icon Button */}
                    <span
                      className={`size-16 rounded-full bg-gradient-to-tr from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] text-white flex items-center justify-center shadow-lg shadow-[#E11D48]/30 mb-4 transition-transform group-hover:scale-110 ${
                        isDragging ? "scale-110 animate-bounce" : ""
                      }`}
                    >
                      <Upload className="size-8" />
                    </span>

                    <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
                      {isDragging ? "Drop image to upload" : "Drop your image here"}
                    </h3>

                    <p className="text-xs text-gray-500 mt-1.5 max-w-xs leading-relaxed font-normal">
                      PNG, JPG, WebP or HEIC · Up to 35MB · Paste (
                      <kbd className="font-sans px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-600 font-medium">
                        Ctrl+V
                      </kbd>
                      )
                    </p>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="mt-5 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#E11D48] to-[#FF2E63] hover:from-[#BE123C] hover:to-[#E11D48] text-white text-xs font-semibold shadow-md shadow-[#E11D48]/25 transition-all cursor-pointer flex items-center gap-2 hover:scale-102"
                    >
                      <Upload className="size-4" />
                      <span>Upload Image</span>
                    </button>

                    <span className="text-[11.5px] text-gray-400 mt-2 font-normal">
                      or click anywhere to browse
                    </span>
                  </div>
                </div>

                {/* RIGHT SIDE: Settings / Options Panel */}
                <div className="lg:col-span-5 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-gray-100 pt-6 lg:pt-0 lg:pl-8 space-y-6">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                      BACKGROUND OPTIONS
                    </h4>

                    {/* Mode Selector Tabs */}
                    <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-gray-100 border border-gray-200 text-xs font-medium text-gray-600 mb-5">
                      <button
                        type="button"
                        onClick={() => setBgType("transparent")}
                        className={`py-2 rounded-lg transition-all cursor-pointer ${
                          bgType === "transparent"
                            ? "bg-white text-gray-950 shadow-xs font-semibold"
                            : "hover:text-gray-900"
                        }`}
                      >
                        Transparent
                      </button>

                      <button
                        type="button"
                        onClick={() => setBgType("color")}
                        className={`py-2 rounded-lg transition-all cursor-pointer ${
                          bgType === "color"
                            ? "bg-white text-gray-950 shadow-xs font-semibold"
                            : "hover:text-gray-900"
                        }`}
                      >
                        Solid Color
                      </button>

                      <button
                        type="button"
                        disabled
                        className="py-2 rounded-lg opacity-60 cursor-not-allowed flex items-center justify-center gap-1 text-gray-400"
                        title="Studio Set is coming soon"
                      >
                        <span>Studio Set</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600 font-normal">
                          Soon
                        </span>
                      </button>
                    </div>

                    {/* Transparent Description Card */}
                    {bgType === "transparent" && (
                      <div className="rounded-xl p-4 bg-[#F8FAFC] border border-gray-200 text-xs space-y-2">
                        <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                          <span>32-Bit Transparent PNG</span>
                        </p>
                        <p className="text-gray-500 leading-relaxed font-normal">
                          Ready to drag straight into Figma, Photoshop, Canva, Illustrator, or web
                          code with true alpha transparency.
                        </p>
                      </div>
                    )}

                    {/* Solid Color Selector */}
                    {bgType === "color" && (
                      <div className="space-y-3">
                        <label className="text-xs font-medium text-gray-700">Choose Solid Color</label>
                        <div className="grid grid-cols-3 gap-2">
                          {SOLID_COLOR_PRESETS.slice(0, 6).map((c) => (
                            <button
                              key={c.hex}
                              type="button"
                              onClick={() => handleColorChange(c.hex)}
                              className={`p-2 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                                solidColor.toLowerCase() === c.hex.toLowerCase()
                                  ? "border-[#E11D48] bg-[#FFF5F7] ring-1 ring-[#E11D48]"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <span
                                className="size-5 rounded-md border border-black/10 shadow-2xs"
                                style={{ backgroundColor: c.hex }}
                              />
                              <span className="text-[11px] font-medium text-gray-900 leading-tight">
                                {c.name}
                              </span>
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 pt-1">
                          <input
                            type="color"
                            value={solidColor}
                            onChange={(e) => handleColorChange(e.target.value)}
                            className="size-8 rounded-lg cursor-pointer border border-gray-300 p-0.5 bg-white"
                          />
                          <span className="text-xs font-medium text-gray-600">
                            Custom Hex:{" "}
                            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-900 font-normal">
                              {solidColor}
                            </code>
                          </span>
                        </div>
                      </div>
                    )}

                    {/* AI Quality Engine */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                        <span className="font-semibold flex items-center gap-1.5 text-gray-700">
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
                            className={`py-2 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                              qualityMode === mode
                                ? "border-[#E11D48] bg-[#FFF5F7] text-[#E11D48] font-semibold"
                                : "border-gray-200 hover:border-gray-300 text-gray-700 font-normal"
                            }`}
                          >
                            {mode === "standard"
                              ? "Balanced"
                              : mode === "fast"
                                ? "Fast"
                                : "Ultra HD"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Bottom CTA */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3.5 px-5 rounded-full bg-gray-900 hover:bg-black text-white text-xs font-medium shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg"
                    >
                      <Upload className="size-4" />
                      <span>Choose An Image</span>
                    </button>

                    {/* Trust Micro-Indicators */}
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
          )}

          {/* ============================================================== */}
          {/* STATE 2 & 3: CLEAN STUDIO WORKSPACE (Loading & Cutout Result)   */}
          {/* ============================================================== */}
          {(status === "uploading" || status === "processing" || status === "success") && sourceUrl && (
            <div className="relative rounded-3xl overflow-hidden border border-gray-200/90 shadow-2xl bg-white flex flex-col max-w-4xl mx-auto w-full transition-all">
              {/* Landscape / No Clear Subject Banner */}
              {status === "success" && cutoutResult?.status === "no_clear_subject" && (
                <div className="m-4 sm:m-5 p-4 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-amber-950">
                        Landscape / Panoramic Scene Detected
                      </h4>
                      <p className="text-[11px] sm:text-xs text-amber-800 mt-0.5">
                        No isolated foreground subject found. Your original image is kept 100% intact so nothing is damaged.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleRemoveSkyOnly}
                      className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Zap className="size-3.5" />
                      <span>Remove Sky Only</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Header Info & Controls */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-white/90">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <FileImage className="size-4 text-[#E11D48]" />
                  <span className="font-semibold text-gray-800 truncate max-w-[200px] sm:max-w-xs">
                    {uploadedFile?.name || "cutout.png"}
                  </span>
                  {status === "processing" || status === "uploading" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-[#E11D48] text-[11px] font-medium ml-1">
                      <Loader2 className="size-3 animate-spin" />
                      <span>Removing background...</span>
                    </span>
                  ) : (
                    cutoutResult && (
                      <span className="text-gray-400 font-normal">
                        · {cutoutResult.width} × {cutoutResult.height}px · 32-bit PNG
                      </span>
                    )
                  )}
                </div>

                {/* Before / After Toggle (on success) OR Cancel (on processing) */}
                {status === "success" && cutoutResult ? (
                  <div className="flex items-center p-1 rounded-full bg-gray-100 border border-gray-200/80 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setViewMode("before")}
                      className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                        viewMode === "before"
                          ? "bg-white text-gray-900 shadow-xs font-semibold"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      Before
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("after")}
                      className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                        viewMode === "after"
                          ? "bg-white text-gray-900 shadow-xs font-semibold"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      After
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleCancelProcessing}
                    className="text-xs text-gray-400 hover:text-gray-700 transition-colors cursor-pointer underline underline-offset-4"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {/* Main Preview Frame */}
              <div
                className={`relative min-h-[380px] sm:min-h-[460px] max-h-[560px] flex items-center justify-center p-6 sm:p-10 select-none overflow-hidden ${
                  status === "processing" || status === "uploading" || viewMode === "before"
                    ? "bg-slate-50"
                    : bgType === "transparent"
                      ? "checkerboard-pattern"
                      : ""
                }`}
                style={
                  status === "success" && viewMode === "after" && bgType === "color"
                    ? { backgroundColor: solidColor }
                    : undefined
                }
              >
                {/* Clean In-Place Loading Spinner (Visible briefly <1s over the original image) */}
                {(status === "uploading" || status === "processing") && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-30 pointer-events-none">
                    <div className="size-14 sm:size-16 rounded-full bg-white shadow-xl border border-gray-100 flex items-center justify-center mb-3">
                      <Loader2 className="size-7 sm:size-8 text-[#E11D48] animate-spin" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900 tracking-tight">
                      Removing background...
                    </h4>
                    <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                      Creating transparent PNG
                    </p>
                  </div>
                )}

                {/* Floating "Edit in Canva" Button (near top-center of preview, on success) */}
                {status === "success" && cutoutResult && (
                  <button
                    type="button"
                    onClick={onEditInCanva}
                    disabled={isCanvaLoading}
                    className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-white text-gray-900 text-xs sm:text-sm font-medium shadow-md hover:shadow-xl border border-gray-200/80 flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer disabled:opacity-60"
                    title="Export transparent PNG to Canva editor"
                  >
                    <CanvaLogoIcon className="size-4" />
                    <span>{isCanvaLoading ? "Opening in Canva..." : "Edit in Canva"}</span>
                  </button>
                )}

                {/* Displayed Image */}
                {displayImage && (
                  <img
                    src={displayImage}
                    alt={viewMode === "before" ? "Original upload" : "Cutout result"}
                    className="max-h-[420px] max-w-full object-contain filter drop-shadow-md transition-all duration-300"
                  />
                )}

                {/* Bottom Disclaimer with soft gradient overlay (on success) */}
                {status === "success" && (
                  <div className="absolute inset-x-0 bottom-0 py-2.5 px-4 bg-gradient-to-t from-black/50 via-black/25 to-transparent flex items-center justify-center text-center pointer-events-auto z-20">
                    <p className="text-[11px] sm:text-xs text-white/95 drop-shadow-xs font-normal">
                      By sending your image to Canva you agree to{" "}
                      <a
                        href={CANVA_TERMS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium hover:text-white transition-colors"
                      >
                        Canva's Terms of Service
                      </a>
                      .
                    </p>
                  </div>
                )}
              </div>


              {/* If user selected Solid Color: show swatch palette */}
              {bgType === "color" && (
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-gray-700">Background Color:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBgType("transparent")}
                      className="px-2.5 py-1 rounded-full border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 text-xs font-medium cursor-pointer"
                    >
                      Transparent
                    </button>
                    {SOLID_COLOR_PRESETS.slice(0, 5).map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => handleColorChange(c.hex)}
                        className={`size-6 rounded-full border shadow-2xs transition-transform cursor-pointer ${
                          solidColor.toLowerCase() === c.hex.toLowerCase()
                            ? "scale-115 ring-2 ring-[#E11D48]"
                            : "border-black/10 hover:scale-105"
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                    <input
                      type="color"
                      value={solidColor}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="size-6 rounded-full cursor-pointer border border-gray-300 p-0"
                    />
                  </div>
                </div>
              )}

              {/* Bottom Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-t border-gray-100 bg-gray-50/50 rounded-b-3xl">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetToUpload}
                    className="px-5 py-2.5 rounded-full border border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-medium shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="size-3.5" />
                    <span>Upload Another Image</span>
                  </button>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={copyCutoutToClipboard}
                    className="px-4 py-2.5 rounded-full border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-medium shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Copy 32-bit PNG to clipboard"
                  >
                    <Copy className="size-3.5" />
                    <span>Copy Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={downloadTransparentPng}
                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] hover:from-[#BE123C] hover:to-[#E11D48] text-white text-xs sm:text-sm font-medium shadow-lg shadow-rose-500/25 transition-all flex items-center gap-2 cursor-pointer hover:scale-102 active:scale-98"
                  >
                    <Download className="size-4" />
                    <span>Download PNG</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STATE 4: ERROR SCREEN                                           */}
          {/* ============================================================== */}
          {status === "error" && (
            <div className="relative rounded-3xl overflow-hidden border border-rose-200 shadow-2xl bg-slate-950 flex items-center justify-center min-h-[460px] sm:min-h-[540px] max-w-4xl mx-auto w-full select-none">
              {sourceUrl && (
                <img
                  src={sourceUrl}
                  alt="Original upload"
                  className="max-h-[500px] max-w-full object-contain filter brightness-40 blur-xs"
                />
              )}

              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-2xl p-6 sm:p-8 text-center shadow-2xl border border-gray-100">
                  <span className="size-14 rounded-full bg-rose-50 text-[#E11D48] flex items-center justify-center mx-auto mb-4 border border-rose-100">
                    <AlertTriangle className="size-7" />
                  </span>

                  <h3 className="text-xl font-semibold text-gray-950 tracking-tight">
                    We couldn't remove this background.
                  </h3>

                  <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
                    {inlineError || "Please try again or upload another image."}
                  </p>

                  <div className="flex items-center justify-center gap-3 mt-6">
                    <button
                      type="button"
                      onClick={retryRemoval}
                      className="px-5 py-2.5 rounded-full bg-gray-900 hover:bg-black text-white text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="size-3.5" />
                      <span>Try Again</span>
                    </button>

                    <button
                      type="button"
                      onClick={resetToUpload}
                      className="px-5 py-2.5 rounded-full border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-medium transition-all cursor-pointer"
                    >
                      Upload Another
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

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
      <section className="py-20 sm:py-28 bg-[#FAFAFB] border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-xs font-semibold text-[#E11D48] uppercase tracking-widest mb-2">
              SUB-PIXEL AI MATTING QUALITY
            </p>
            <h2 className="text-3xl sm:text-5xl font-normal text-gray-950 tracking-tight">
              Stunning Results on Hair, Fur &amp; Complex Edges
            </h2>
            <p className="mt-3 text-base text-gray-600 font-normal">
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
              Whether you need 100% white backgrounds for your e-commerce store or transparent
              stickers for social media.
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
                    <p className="text-xs text-gray-600 mt-3 leading-relaxed font-normal">
                      {p.desc}
                    </p>
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
                Drag and drop your JPG, PNG, WebP or HEIC file, or press{" "}
                <kbd className="bg-gray-100 px-1 py-0.5 rounded border text-gray-700 font-normal">
                  Ctrl+V
                </kbd>{" "}
                from anywhere.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-8 border border-gray-200 shadow-sm text-center">
              <span className="size-14 mx-auto rounded-2xl bg-[#FFF1F4] text-[#E11D48] font-medium text-xl flex items-center justify-center mb-5">
                2
              </span>
              <h3 className="text-lg font-medium text-gray-900">AI Isolates Subject</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed font-normal">
                Our sub-pixel neural matting separates fine hair, jewelry, and products from
                distracting backdrops in under 5 seconds.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-8 border border-gray-200 shadow-sm text-center">
              <span className="size-14 mx-auto rounded-2xl bg-[#FFF1F4] text-[#E11D48] font-medium text-xl flex items-center justify-center mb-5">
                3
              </span>
              <h3 className="text-lg font-medium text-gray-900">Customize &amp; Download</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed font-normal">
                Export transparent 4K PNGs or instantly replace the background with Amazon-compliant
                Pure White, studio colors, or scenic backdrops.
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
                Power your web app, e-commerce backend, or mobile tool with our high-speed global
                endpoints. Zero infrastructure headache.
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
